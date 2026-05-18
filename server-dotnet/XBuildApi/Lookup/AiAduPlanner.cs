using System.Net.Http.Headers;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace XBuildApi.Lookup;

public sealed class AiAduPlanner
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _cfg;
    private readonly ILogger<AiAduPlanner> _logger;

    private sealed record Upstream(
        string Provider,
        string BaseUrl,
        string Model,
        string? ApiKey,
        string AuthHeader,
        string? AuthScheme);

    public AiAduPlanner(IHttpClientFactory httpFactory, IConfiguration cfg, ILogger<AiAduPlanner> logger)
    {
        _httpFactory = httpFactory;
        _cfg = cfg;
        _logger = logger;
    }

    public sealed class AiBuildableResult
    {
        public List<FtPoint>? BuildablePolygon { get; init; }
        public FtRect? BuildableRect { get; init; }
        public LookupAduPlacement? SuggestedAduPlacement { get; init; }
        public List<LookupMeasureLine>? MeasureLines { get; init; }
    }

    public async Task<AiBuildableResult?> TryComputeBuildableAsync(
        List<FtPoint> lotPolygonFt,
        List<(string kind, List<FtPoint> polygonFt)> obstaclesFt,
        double sideSetbackFt,
        double rearSetbackFt,
        double houseSepFt,
        double moduleShortFt,
        double moduleLongFt,
        string? validationHint,
        CancellationToken cancellationToken)
    {
        var enabled = _cfg.GetValue<bool?>("AI:Enabled") ?? false;
        if (!enabled)
        {
            _logger.LogInformation("AI 未启用 enabled=false");
            return null;
        }

        var timeoutSeconds = _cfg.GetValue<int?>("AI:TimeoutSeconds") ?? 240;
        timeoutSeconds = Math.Clamp(timeoutSeconds, 5, 900);

        var http = _httpFactory.CreateClient("ai");
        var upstream = ResolveUpstream();
        if (upstream is null)
        {
            _logger.LogWarning("AI 上游未配置");
            return null;
        }
        if (!IsUsable(upstream))
        {
            _logger.LogWarning("AI 上游不可用：缺少配置 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            return null;
        }

        try
        {
            _logger.LogInformation(
                "AI 计算可建区域：provider={Provider} model={Model} url={Url} obstacles={Count} timeoutSeconds={TimeoutSeconds}",
                upstream.Provider,
                upstream.Model,
                RedactSecrets(upstream.BaseUrl),
                obstaclesFt.Count,
                timeoutSeconds);

            var reqPayload = BuildRequest(upstream, lotPolygonFt, obstaclesFt, sideSetbackFt, rearSetbackFt, houseSepFt, moduleShortFt, moduleLongFt, validationHint);
            var body = reqPayload.ToJsonString(new JsonSerializerOptions
            {
                WriteIndented = false,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });

            using var req = new HttpRequestMessage(HttpMethod.Post, upstream.BaseUrl);
            ApplyAuth(req, upstream);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            _logger.LogInformation("AI 上游请求 url={Url} body={Body}", RedactSecrets(upstream.BaseUrl), body);

            using var reqCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            reqCts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));
            using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, reqCts.Token);
            var respText = await resp.Content.ReadAsStringAsync(reqCts.Token);
            _logger.LogInformation("AI 上游响应 status={StatusCode} body={Body}", (int)resp.StatusCode, NormalizeJsonForLog(respText));
            if (!resp.IsSuccessStatusCode)
                throw ToLookupProviderException(upstream, resp.StatusCode, respText);

            var parsed = TryParseResultFromChatResponse(respText);
            if (parsed is null)
                throw new LookupProviderException(502, $"AI 返回格式无法解析 provider={upstream.Provider} model={upstream.Model}");

            return parsed;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("AI 上游超时 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            throw new LookupProviderException(504, $"AI 上游请求超时（{timeoutSeconds}s） provider={upstream.Provider} model={upstream.Model}");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI 上游请求失败 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            throw new LookupProviderException(502, $"AI 上游请求失败 provider={upstream.Provider} model={upstream.Model} msg={ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI 上游解析/处理失败 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            throw;
        }
    }

    public async Task<FtRect?> TryComputeBuildableZoneAsync(
        double allowedLeftFt,
        double allowedTopFt,
        double allowedRightFt,
        double allowedBottomFt,
        List<FtRect> obstaclesFt,
        double moduleShortFt,
        double moduleLongFt,
        CancellationToken cancellationToken)
    {
        var enabled = _cfg.GetValue<bool?>("AI:Enabled") ?? false;
        if (!enabled)
        {
            _logger.LogInformation("AI 未启用 enabled=false");
            return null;
        }

        var timeoutSeconds = _cfg.GetValue<int?>("AI:TimeoutSeconds") ?? 240;
        timeoutSeconds = Math.Clamp(timeoutSeconds, 5, 900);

        var http = _httpFactory.CreateClient("ai");
        var upstream = ResolveUpstream();
        if (upstream is null)
        {
            _logger.LogWarning("AI 上游未配置");
            return null;
        }
        if (!IsUsable(upstream))
        {
            _logger.LogWarning("AI 上游不可用：缺少配置 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            return null;
        }

        try
        {
            _logger.LogInformation(
                "AI 计算 buildableZone：provider={Provider} model={Model} url={Url} obstacles={Count} timeoutSeconds={TimeoutSeconds}",
                upstream.Provider,
                upstream.Model,
                RedactSecrets(upstream.BaseUrl),
                obstaclesFt.Count,
                timeoutSeconds);

            var reqPayload = BuildRequest(upstream.Model, allowedLeftFt, allowedTopFt, allowedRightFt, allowedBottomFt, obstaclesFt, moduleShortFt, moduleLongFt);
            var body = reqPayload.ToJsonString(new JsonSerializerOptions
            {
                WriteIndented = false,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });

            using var req = new HttpRequestMessage(HttpMethod.Post, upstream.BaseUrl);
            ApplyAuth(req, upstream);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

            _logger.LogInformation("AI 上游请求 url={Url} body={Body}", RedactSecrets(upstream.BaseUrl), body);

            using var reqCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            reqCts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));
            using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, reqCts.Token);
            var respText = await resp.Content.ReadAsStringAsync(reqCts.Token);
            _logger.LogInformation("AI 上游响应 status={StatusCode} body={Body}", (int)resp.StatusCode, NormalizeJsonForLog(respText));
            if (!resp.IsSuccessStatusCode)
                throw ToLookupProviderException(upstream, resp.StatusCode, respText);

            var parsed = TryParseRectFromChatResponse(respText);
            if (parsed is null)
                throw new LookupProviderException(502, $"AI 返回格式无法解析 provider={upstream.Provider} model={upstream.Model}");

            return parsed;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("AI 上游超时 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            throw new LookupProviderException(504, $"AI 上游请求超时（{timeoutSeconds}s） provider={upstream.Provider} model={upstream.Model}");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI 上游请求失败 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            throw new LookupProviderException(502, $"AI 上游请求失败 provider={upstream.Provider} model={upstream.Model} msg={ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI 上游解析/处理失败 provider={Provider} url={Url}", upstream.Provider, RedactSecrets(upstream.BaseUrl));
            throw;
        }
    }

    private static LookupProviderException ToLookupProviderException(Upstream upstream, System.Net.HttpStatusCode statusCode, string respText)
    {
        var upstreamStatus = (int)statusCode;
        var (code, msg) = TryParseOpenAiError(respText);
        var detail = string.IsNullOrWhiteSpace(msg) ? "AI 上游返回错误" : msg.Trim();

        if (upstreamStatus == 429)
            return new LookupProviderException(429, $"AI 上游额度/限流（429 {code}）provider={upstream.Provider} model={upstream.Model} msg={detail}");
        if (upstreamStatus == 401 || upstreamStatus == 403)
            return new LookupProviderException(502, $"AI 上游鉴权失败（{upstreamStatus} {code}）provider={upstream.Provider} model={upstream.Model} msg={detail}");
        if (upstreamStatus >= 400 && upstreamStatus < 500)
            return new LookupProviderException(502, $"AI 上游请求错误（{upstreamStatus} {code}）provider={upstream.Provider} model={upstream.Model} msg={detail}");
        return new LookupProviderException(502, $"AI 上游服务错误（{upstreamStatus} {code}）provider={upstream.Provider} model={upstream.Model} msg={detail}");
    }

    private static (string code, string message) TryParseOpenAiError(string respText)
    {
        try
        {
            var root = JsonNode.Parse(respText) as JsonObject;
            var err = root?["error"] as JsonObject;
            var message = err?["message"]?.GetValue<string>() ?? "";
            var code = err?["code"]?.GetValue<string>() ?? err?["type"]?.GetValue<string>() ?? "";
            return (code ?? "", message ?? "");
        }
        catch
        {
            return ("", "");
        }
    }

    private Upstream? ResolveUpstream()
    {
        var defaultProvider = (_cfg["AI:DefaultProvider"] ?? "").Trim();
        var list = new List<Upstream>();
        AddUpstreamsFromSection(list, _cfg.GetSection("AI:Upstreams"));
        if (list.Count == 0) return null;
        if (string.IsNullOrWhiteSpace(defaultProvider))
        {
            if (list.Count == 1) return list[0];
            return null;
        }

        return list.FirstOrDefault(u => u.Provider.Equals(defaultProvider, StringComparison.OrdinalIgnoreCase));
    }

    private void AddUpstreamsFromSection(List<Upstream> list, IConfigurationSection section)
    {
        foreach (var child in section.GetChildren())
        {
            var provider = (child["Provider"] ?? "").Trim();
            var baseUrl = (child["BaseUrl"] ?? "").Trim();
            var model = (child["Model"] ?? "").Trim();
            var authHeader = (child["AuthHeader"] ?? "Authorization").Trim();
            var authScheme = (child["AuthScheme"] ?? "Bearer").Trim();

            var apiKey = child["ApiKey"];

            if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(baseUrl)) continue;
            if (string.IsNullOrWhiteSpace(model)) model = "gpt-4o-mini";
            if (string.IsNullOrWhiteSpace(authHeader)) authHeader = "Authorization";
            if (string.IsNullOrWhiteSpace(authScheme)) authScheme = null;

            list.Add(new Upstream(provider, baseUrl, model, apiKey, authHeader, authScheme));
        }
    }

    private static bool IsUsable(Upstream upstream)
    {
        if (string.IsNullOrWhiteSpace(upstream.BaseUrl)) return false;
        if (string.IsNullOrWhiteSpace(upstream.AuthHeader)) return false;
        if (upstream.AuthHeader.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(upstream.ApiKey) && !string.IsNullOrWhiteSpace(upstream.AuthScheme))
                return true;
            return string.IsNullOrWhiteSpace(upstream.ApiKey);
        }
        return true;
    }

    private static void ApplyAuth(HttpRequestMessage req, Upstream upstream)
    {
        if (string.IsNullOrWhiteSpace(upstream.ApiKey)) return;

        if (upstream.AuthHeader.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
        {
            var scheme = string.IsNullOrWhiteSpace(upstream.AuthScheme) ? "Bearer" : upstream.AuthScheme;
            req.Headers.Authorization = new AuthenticationHeaderValue(scheme, upstream.ApiKey);
            return;
        }

        var val = string.IsNullOrWhiteSpace(upstream.AuthScheme)
            ? upstream.ApiKey
            : $"{upstream.AuthScheme} {upstream.ApiKey}";
        req.Headers.TryAddWithoutValidation(upstream.AuthHeader, val);
    }

    private static JsonObject BuildRequest(
        string model,
        double left,
        double top,
        double right,
        double bottom,
        List<FtRect> obstacles,
        double moduleShort,
        double moduleLong)
    {
        var obstaclesArr = new JsonArray();
        foreach (var o in obstacles)
        {
            obstaclesArr.Add(new JsonObject
            {
                ["xFt"] = o.XFt,
                ["yFt"] = o.YFt,
                ["wFt"] = o.WFt,
                ["hFt"] = o.HFt
            });
        }

        var input = new JsonObject
        {
            ["allowed"] = new JsonObject
            {
                ["leftFt"] = left,
                ["topFt"] = top,
                ["rightFt"] = right,
                ["bottomFt"] = bottom
            },
            ["obstacles"] = obstaclesArr,
            ["module"] = new JsonObject
            {
                ["shortFt"] = moduleShort,
                ["longFt"] = moduleLong
            }
        };

        var sys = "你是一个几何约束求解器。请根据输入的 allowed 矩形范围与 obstacles 矩形障碍，输出一个不与任意 obstacle 相交、且完全落在 allowed 内的最大面积矩形（buildableZone）。只输出 JSON：{\"xFt\":number,\"yFt\":number,\"wFt\":number,\"hFt\":number}。不要输出任何其他文本。";
        var user = input.ToJsonString(new JsonSerializerOptions { WriteIndented = false });

        return new JsonObject
        {
            ["model"] = model,
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = sys },
                new JsonObject { ["role"] = "user", ["content"] = user }
            },
            ["temperature"] = 0
        };
    }

    private static JsonObject BuildRequest(
        Upstream upstream,
        List<FtPoint> lotPolygon,
        List<(string kind, List<FtPoint> polygonFt)> obstacles,
        double sideSetbackFt,
        double rearSetbackFt,
        double houseSepFt,
        double moduleShort,
        double moduleLong,
        string? validationHint)
    {
        var lotArr = new JsonArray();
        foreach (var p in lotPolygon)
        {
            lotArr.Add(new JsonObject { ["xFt"] = p.XFt, ["yFt"] = p.YFt });
        }

        var obstaclesArr = new JsonArray();
        foreach (var (kind, poly) in obstacles)
        {
            var ring = new JsonArray();
            foreach (var p in poly)
            {
                ring.Add(new JsonObject { ["xFt"] = p.XFt, ["yFt"] = p.YFt });
            }
            obstaclesArr.Add(new JsonObject
            {
                ["kind"] = kind,
                ["polygon"] = ring
            });
        }

        var input = new JsonObject
        {
            ["lotPolygon"] = lotArr,
            ["obstacles"] = obstaclesArr,
            ["constraints"] = new JsonObject
            {
                ["sideSetbackFt"] = sideSetbackFt,
                ["rearSetbackFt"] = rearSetbackFt,
                ["houseSepFt"] = houseSepFt
            },
            ["module"] = new JsonObject
            {
                ["shortFt"] = moduleShort,
                ["longFt"] = moduleLong
            }
        };

        var sys = "你是一个几何约束求解器。坐标单位为英尺，坐标系方向：x 向右，y 向下（前院在 y 小，后院在 y 大）。输入给出 lotPolygon（地块边界多边形）、obstacles（障碍多边形列表，带 kind，例如 house/garage/driveway 等）、constraints（sideSetbackFt/rearSetbackFt/houseSepFt）、module（默认 ADU 模块尺寸 shortFt/longFt）。\n\n几何约束：\n- ADU 模块是一个矩形（宽=shortFt，高=longFt），可以绕中心点旋转任意角度 rotationDeg。\n- 模块矩形必须完全位于 lotPolygon 内。\n- 模块矩形必须与 obstacles 中每个 polygon 不相交。\n- sideSetbackFt：模块矩形与 lotPolygon 边界的最小距离必须 >= sideSetbackFt。\n- rearSetbackFt：模块矩形与 lotPolygon 边界中“后院方向（+y）”对应边界的最小距离必须 >= rearSetbackFt。\n- houseSepFt：若 obstacles 中存在 kind=house，则模块矩形与该 house polygon 的最小距离必须 >= houseSepFt。\n\n输出要求：\n1) buildablePolygon：可建区域多边形（不自交）。必须位于 lotPolygon 内，并且必须避开所有 obstacles（不能包含 house/driveway 等障碍）。不要直接照抄 lotPolygon。\n2) suggestedAduPlacement：推荐一个满足全部约束的放置位置 {cxFt,cyFt,rotationDeg}。\n3) measureLines：距离线数组。对以下 kind，distanceFt 必须分别等于输入 constraints 中对应值（误差<=0.1ft）：\n- side-left/side-right：distanceFt == sideSetbackFt\n- rear：distanceFt == rearSetbackFt\n- house-sep：distanceFt == houseSepFt\n并且 distanceFt 需等于 |a-b| 欧氏距离（误差<=0.1ft）。\n\n只输出 JSON：{\"buildablePolygon\":[{\"xFt\":number,\"yFt\":number},...],\"suggestedAduPlacement\":{\"cxFt\":number,\"cyFt\":number,\"rotationDeg\":number},\"measureLines\":[{\"kind\":string,\"a\":{\"xFt\":number,\"yFt\":number},\"b\":{\"xFt\":number,\"yFt\":number},\"distanceFt\":number},...] }。不要输出任何其他文本。";
        var user = input.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });

        var messages = new JsonArray
        {
            new JsonObject { ["role"] = "system", ["content"] = sys },
            new JsonObject { ["role"] = "user", ["content"] = user }
        };
        if (!string.IsNullOrWhiteSpace(validationHint))
        {
            messages.Add(new JsonObject
            {
                ["role"] = "user",
                ["content"] = $"上一次输出无效，原因：{validationHint}。请严格修正并只输出 JSON。"
            });
        }

        var payload = new JsonObject
        {
            ["model"] = upstream.Model,
            ["messages"] = messages,
            ["temperature"] = 0
        };

        if (upstream.Provider.Equals("openai", StringComparison.OrdinalIgnoreCase))
        {
            payload["response_format"] = new JsonObject { ["type"] = "json_object" };
        }

        return payload;
    }

    private static FtRect? TryParseRectFromChatResponse(string respText)
    {
        try
        {
            var content = ExtractContent(respText);
            if (string.IsNullOrWhiteSpace(content)) return null;
            var node = JsonNode.Parse(content) as JsonObject;
            if (node is null) return null;
            var x = node["xFt"]?.GetValue<double>() ?? double.NaN;
            var y = node["yFt"]?.GetValue<double>() ?? double.NaN;
            var w = node["wFt"]?.GetValue<double>() ?? double.NaN;
            var h = node["hFt"]?.GetValue<double>() ?? double.NaN;
            if (!double.IsFinite(x) || !double.IsFinite(y) || !double.IsFinite(w) || !double.IsFinite(h)) return null;
            if (w <= 0 || h <= 0) return null;
            return new FtRect { XFt = x, YFt = y, WFt = w, HFt = h };
        }
        catch
        {
            return null;
        }
    }

    private static AiBuildableResult? TryParseResultFromChatResponse(string respText)
    {
        try
        {
            var content = ExtractContent(respText);
            if (string.IsNullOrWhiteSpace(content)) return null;
            var node = JsonNode.Parse(content) as JsonObject;
            if (node is null) return null;

            List<FtPoint>? poly = null;
            if (node["buildablePolygon"] is JsonArray arr && arr.Count >= 3)
            {
                var pts = new List<FtPoint>();
                foreach (var p in arr)
                {
                    var x = p?["xFt"]?.GetValue<double>() ?? double.NaN;
                    var y = p?["yFt"]?.GetValue<double>() ?? double.NaN;
                    if (!double.IsFinite(x) || !double.IsFinite(y)) return null;
                    pts.Add(new FtPoint { XFt = x, YFt = y });
                }
                poly = pts;
            }

            LookupAduPlacement? placement = null;
            if (node["suggestedAduPlacement"] is JsonObject sp)
            {
                var cx = sp["cxFt"]?.GetValue<double>() ?? double.NaN;
                var cy = sp["cyFt"]?.GetValue<double>() ?? double.NaN;
                var rot = sp["rotationDeg"]?.GetValue<double>() ?? double.NaN;
                if (double.IsFinite(cx) && double.IsFinite(cy) && double.IsFinite(rot))
                {
                    placement = new LookupAduPlacement { CxFt = cx, CyFt = cy, RotationDeg = rot };
                }
            }

            List<LookupMeasureLine>? measureLines = null;
            if (node["measureLines"] is JsonArray mlArr && mlArr.Count > 0)
            {
                var lines = new List<LookupMeasureLine>();
                foreach (var ln in mlArr)
                {
                    var kind = ln?["kind"]?.GetValue<string>();
                    var ax = ln?["a"]?["xFt"]?.GetValue<double>() ?? double.NaN;
                    var ay = ln?["a"]?["yFt"]?.GetValue<double>() ?? double.NaN;
                    var bx = ln?["b"]?["xFt"]?.GetValue<double>() ?? double.NaN;
                    var by = ln?["b"]?["yFt"]?.GetValue<double>() ?? double.NaN;
                    var dist = ln?["distanceFt"]?.GetValue<double>() ?? double.NaN;
                    if (!double.IsFinite(ax) || !double.IsFinite(ay) || !double.IsFinite(bx) || !double.IsFinite(by) || !double.IsFinite(dist))
                        continue;
                    lines.Add(new LookupMeasureLine
                    {
                        Kind = kind,
                        A = new FtPoint { XFt = ax, YFt = ay },
                        B = new FtPoint { XFt = bx, YFt = by },
                        DistanceFt = dist
                    });
                }
                if (lines.Count > 0) measureLines = lines;
            }

            FtRect? rect = null;
            if (node["xFt"] != null && node["yFt"] != null && node["wFt"] != null && node["hFt"] != null)
            {
                var x = node["xFt"]?.GetValue<double>() ?? double.NaN;
                var y = node["yFt"]?.GetValue<double>() ?? double.NaN;
                var w = node["wFt"]?.GetValue<double>() ?? double.NaN;
                var h = node["hFt"]?.GetValue<double>() ?? double.NaN;
                if (double.IsFinite(x) && double.IsFinite(y) && double.IsFinite(w) && double.IsFinite(h) && w > 0 && h > 0)
                    rect = new FtRect { XFt = x, YFt = y, WFt = w, HFt = h };
            }

            if (poly is null && rect is null && placement is null && measureLines is null) return null;
            return new AiBuildableResult { BuildablePolygon = poly, BuildableRect = rect, SuggestedAduPlacement = placement, MeasureLines = measureLines };
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractContent(string respText)
    {
        try
        {
            var root = JsonNode.Parse(respText) as JsonObject;
            return root?["choices"]?[0]?["message"]?["content"]?.GetValue<string>()
                   ?? root?["choices"]?[0]?["text"]?.GetValue<string>()
                   ?? root?["reply"]?.GetValue<string>()
                   ?? root?["output"]?.GetValue<string>();
        }
        catch
        {
            return null;
        }
    }

    private static string NormalizeJsonForLog(string text)
    {
        try
        {
            var node = JsonNode.Parse(text);
            return node?.ToJsonString(new JsonSerializerOptions
            {
                WriteIndented = false,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            }) ?? text;
        }
        catch
        {
            return text;
        }
    }

    private static string RedactSecrets(string url)
    {
        string RedactQueryValue(string input, string key)
        {
            var idx = input.IndexOf(key, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return input;
            var start = idx + key.Length;
            var end = input.IndexOf('&', start);
            if (end < 0) end = input.Length;
            return input.Substring(0, start) + "REDACTED" + input.Substring(end);
        }

        var s = url;
        s = RedactQueryValue(s, "token=");
        s = RedactQueryValue(s, "api_key=");
        s = RedactQueryValue(s, "key=");
        return s;
    }
}
