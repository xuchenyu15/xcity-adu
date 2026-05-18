using System.Collections.Concurrent;
using System.Text.Json.Nodes;

namespace XBuildApi.Lookup;

/// <summary>
/// 通过 Overpass 查询 OpenStreetMap 的建筑轮廓，并返回 GeoJSON FeatureCollection。
/// 结果会做短时间内存缓存。
/// </summary>
public sealed class OsmBuildingsService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly Microsoft.Extensions.Logging.ILogger<OsmBuildingsService> _logger;
    private readonly ConcurrentDictionary<string, (DateTimeOffset ts, JsonObject data)> _cache = new();

    /// <summary>
    /// 创建服务。
    /// </summary>
    public OsmBuildingsService(IHttpClientFactory httpFactory, Microsoft.Extensions.Logging.ILogger<OsmBuildingsService> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
    }

    /// <summary>
    /// 在给定 bbox（minLon, minLat, maxLon, maxLat）内查询建筑 polygon。
    /// bbox 过大、查询失败或超时都会返回空的 FeatureCollection。
    /// </summary>
    public async Task<JsonObject> QueryAsync(double[] bbox, CancellationToken requestAborted)
    {
        var key = BboxCacheKey(bbox);
        if (_cache.TryGetValue(key, out var cached) && (DateTimeOffset.UtcNow - cached.ts) < TimeSpan.FromMinutes(10))
            return cached.data;

        if (bbox.Length < 4) return EmptyFc();
        var large = (bbox[2] - bbox[0]) > 0.03 || (bbox[3] - bbox[1]) > 0.03;

        _logger.LogInformation("建筑轮廓查询 bbox={Bbox}", key);

        var endpoints = new[]
        {
            "https://overpass-api.de/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"
        };

        string q;
        if (!large)
        {
            q = $"[out:json][timeout:8];(way[\"building\"]({bbox[1].ToString(System.Globalization.CultureInfo.InvariantCulture)},{bbox[0].ToString(System.Globalization.CultureInfo.InvariantCulture)},{bbox[3].ToString(System.Globalization.CultureInfo.InvariantCulture)},{bbox[2].ToString(System.Globalization.CultureInfo.InvariantCulture)});relation[\"building\"]({bbox[1].ToString(System.Globalization.CultureInfo.InvariantCulture)},{bbox[0].ToString(System.Globalization.CultureInfo.InvariantCulture)},{bbox[3].ToString(System.Globalization.CultureInfo.InvariantCulture)},{bbox[2].ToString(System.Globalization.CultureInfo.InvariantCulture)}););out geom tags;";
        }
        else
        {
            var centerLon = (bbox[0] + bbox[2]) / 2d;
            var centerLat = (bbox[1] + bbox[3]) / 2d;
            var latRad = centerLat * Math.PI / 180d;
            var widthM = (bbox[2] - bbox[0]) * 111320d * Math.Cos(latRad);
            var heightM = (bbox[3] - bbox[1]) * 110540d;
            var radiusM = (int)Math.Round(Math.Clamp(Math.Sqrt(widthM * widthM + heightM * heightM) / 2d + 50d, 200d, 650d));
            _logger.LogInformation("建筑轮廓 bbox 过大，回退为 around 查询 radiusM={RadiusM} center={CenterLon},{CenterLat}", radiusM, centerLon, centerLat);
            q = $"[out:json][timeout:8];(way[\"building\"](around:{radiusM},{centerLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{centerLon.ToString(System.Globalization.CultureInfo.InvariantCulture)});relation[\"building\"](around:{radiusM},{centerLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{centerLon.ToString(System.Globalization.CultureInfo.InvariantCulture)}););out geom tags;";
        }

        foreach (var ep in endpoints)
        {
            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(requestAborted);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(18.0));
                var http = _httpFactory.CreateClient("overpass");
                _logger.LogInformation("建筑轮廓上游请求 url={Url}", ep);
                using var req = new HttpRequestMessage(HttpMethod.Post, ep)
                {
                    Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["data"] = q })
                };
                req.Headers.Accept.ParseAdd("application/json");
                using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);
                _logger.LogInformation("建筑轮廓上游响应 status={StatusCode} url={Url}", (int)resp.StatusCode, ep);
                if (!resp.IsSuccessStatusCode) continue;
                var rtext = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
                _logger.LogInformation("建筑轮廓上游返回 len={Len} body={Body}", rtext.Length, Truncate(rtext, 8000));
                var data = JsonNode.Parse(rtext) as JsonObject;
                var elements = data?["elements"] as JsonArray;

                var feats = new JsonArray();
                if (elements != null)
                {
                    foreach (var el in elements)
                    {
                        var t = el?["type"]?.GetValue<string>() ?? "";
                        if (t != "way" && t != "relation") continue;
                        var geom = el?["geometry"] as JsonArray;
                        if (geom is null || geom.Count < 4) continue;

                        var coords = new JsonArray();
                        double? firstLon = null;
                        double? firstLat = null;
                        foreach (var p in geom)
                        {
                            var lon = p!["lon"]!.GetValue<double>();
                            var lat = p!["lat"]!.GetValue<double>();
                            firstLon ??= lon;
                            firstLat ??= lat;
                            coords.Add(new JsonArray(lon, lat));
                        }

                        if (firstLon.HasValue && firstLat.HasValue && coords.Count > 0)
                        {
                            var last = coords[coords.Count - 1] as JsonArray;
                            var lastLon = last?[0]?.GetValue<double>();
                            var lastLat = last?[1]?.GetValue<double>();
                            if (!lastLon.HasValue || !lastLat.HasValue ||
                                Math.Abs(firstLon.Value - lastLon.Value) > 1e-12 ||
                                Math.Abs(firstLat.Value - lastLat.Value) > 1e-12)
                            {
                                coords.Add(new JsonArray(firstLon.Value, firstLat.Value));
                            }
                        }

                        var poly = new JsonObject
                        {
                            ["type"] = "Feature",
                            ["geometry"] = new JsonObject
                            {
                                ["type"] = "Polygon",
                                ["coordinates"] = new JsonArray { coords }
                            },
                            ["properties"] = (el?["tags"] as JsonObject)?.DeepClone() as JsonObject ?? new JsonObject()
                        };
                        feats.Add(poly);
                    }
                }

                var fc = new JsonObject { ["type"] = "FeatureCollection", ["features"] = feats };
                _logger.LogInformation("建筑轮廓解析完成 features={Count} bbox={Bbox}", feats.Count, key);
                _cache[key] = (DateTimeOffset.UtcNow, fc);
                return fc;
            }
            catch (OperationCanceledException) when (!requestAborted.IsCancellationRequested)
            {
                _logger.LogInformation("建筑轮廓查询上游超时 url={Url}", ep);
                continue;
            }
            catch (Exception ex)
            {
                _logger.LogInformation(ex, "建筑轮廓查询解析失败 url={Url}", ep);
            }
        }

        return EmptyFc();
    }

    private static JsonObject EmptyFc() => new JsonObject { ["type"] = "FeatureCollection", ["features"] = new JsonArray() };

    private static bool PointsEqual(JsonArray a, JsonArray b)
    {
        return Math.Abs(a[0]!.GetValue<double>() - b[0]!.GetValue<double>()) < 1e-12 &&
               Math.Abs(a[1]!.GetValue<double>() - b[1]!.GetValue<double>()) < 1e-12;
    }

    private static string BboxCacheKey(double[] bbox)
    {
        static double R(double v) => Math.Round(v, 5);
        return $"{R(bbox[0])},{R(bbox[1])},{R(bbox[2])},{R(bbox[3])}";
    }

    private static string Truncate(string s, int maxLen)
    {
        if (string.IsNullOrEmpty(s)) return s;
        if (s.Length <= maxLen) return s;
        return s.Substring(0, maxLen);
    }
}
