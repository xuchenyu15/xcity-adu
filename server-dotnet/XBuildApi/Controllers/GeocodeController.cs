using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using XBuildApi.Lookup;

namespace XBuildApi.Controllers;

/// <summary>
/// 地址地理编码接口（Geocoding）。
/// 将用户输入的地址字符串转换为经纬度（lat/lon），并输出一个用于前端显示的简易投影坐标（x/y）。
/// </summary>
[ApiController]
public sealed class GeocodeController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _cfg;
    private readonly ILogger<GeocodeController> _logger;

    public GeocodeController(IHttpClientFactory httpFactory, IConfiguration cfg, ILogger<GeocodeController> logger)
    {
        _httpFactory = httpFactory;
        _cfg = cfg;
        _logger = logger;
    }

    /// <summary>
    /// 地理编码：根据地址字符串返回经纬度与投影坐标。
    /// </summary>
    /// <remarks>
    /// 上游使用 geocode.maps.co（需要 API Key）。若缺少 API Key 返回 501。
    /// x/y 为用于前端地图定位的线性投影坐标，锚点与夹取范围可通过配置 MapProjection:* 调整。
    /// </remarks>
    /// <param name="address">完整地址字符串（必填）。</param>
    /// <returns>
    /// - 200：{ code=200, msg="success", data={ lat, lon, x, y, city, state, ... } }
    /// - 400：{ detail="Address cannot be empty" }
    /// - 404：{ code=404, msg="Unable to geocode..." }
    /// - 501：{ code=501, msg="Missing geocode API key" }
    /// - 502：{ code=502, msg="Geocoding service unavailable..." }
    /// - 504：{ code=504, msg="Geocoding service timeout..." }
    /// </returns>
    [HttpGet("/api/geocode")]
    [Produces("application/json")]
    public async Task<IActionResult> GeocodeAsync([FromQuery] string address)
    {
        if (string.IsNullOrWhiteSpace(address))
            return BadRequest(new { detail = "Address cannot be empty" });

        try
        {
            _logger.LogInformation("地理编码请求 address={Address}", address);

            var apiKey = _cfg["geocode:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                apiKey = Environment.GetEnvironmentVariable("GEOCODE_API_KEY");
            if (string.IsNullOrWhiteSpace(apiKey))
                return StatusCode(StatusCodes.Status501NotImplemented, new { code = 501, msg = "Missing geocode API key" });

            var url = $"https://geocode.maps.co/search?q={Uri.EscapeDataString(address)}&api_key={Uri.EscapeDataString(apiKey)}";
            _logger.LogInformation("地理编码上游请求 url={Url}", LookupUtils.RedactToken(url));

            var http = _httpFactory.CreateClient("arcgis");
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

            using var resp = await http.GetAsync(url, timeoutCts.Token);
            _logger.LogInformation("地理编码上游响应 status={StatusCode}", (int)resp.StatusCode);

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("地理编码上游返回非成功状态码 status={StatusCode}", (int)resp.StatusCode);
                return StatusCode(StatusCodes.Status502BadGateway, new { code = 502, msg = "Geocoding service unavailable. Please try again later." });
            }

            var text = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
            _logger.LogInformation("地理编码上游返回 len={Len} body={Body}", text.Length, LogText.Truncate(text, 4000));

            var arr = JsonNode.Parse(text) as JsonArray;
            if (arr is null || arr.Count <= 0)
            {
                _logger.LogWarning("地理编码未找到结果 address={Address}", address);
                return NotFound(new { code = 404, msg = "Unable to geocode the provided address. Please try a different address." });
            }

            var first = arr[0] as JsonObject;
            if (first is null)
                return NotFound(new { code = 404, msg = "Unable to geocode the provided address. Please try a different address." });

            var latStr = first["lat"]?.GetValue<string>();
            var lonStr = first["lon"]?.GetValue<string>();
            var placeClass = first["class"]?.GetValue<string>() ?? "";
            var placeType = first["type"]?.GetValue<string>() ?? "";
            var addressType = first["addresstype"]?.GetValue<string>() ?? "";

            var displayName = first["display_name"]?.GetValue<string>() ?? address;
            var addrNode = first["address"];
            var parsedCity = addrNode?["city"]?.GetValue<string>()
                          ?? addrNode?["town"]?.GetValue<string>()
                          ?? addrNode?["village"]?.GetValue<string>()
                          ?? addrNode?["hamlet"]?.GetValue<string>()
                          ?? "";

            var isoState = addrNode?["ISO3166-2-lvl4"]?.GetValue<string>() ?? "";
            var stateName = addrNode?["state"]?.GetValue<string>() ?? "";
            var parsedState = "";
            if (!string.IsNullOrWhiteSpace(isoState) && isoState.StartsWith("US-", StringComparison.OrdinalIgnoreCase))
            {
                parsedState = isoState.Substring(3).Trim().ToUpperInvariant();
            }
            else
            {
                parsedState = LookupUtils.ExtractState(displayName);
                if (string.IsNullOrWhiteSpace(parsedState) && !string.IsNullOrWhiteSpace(stateName))
                    parsedState = LookupUtils.ExtractState(stateName);
            }

            if (string.IsNullOrWhiteSpace(parsedCity))
            {
                var parts = displayName.Split(',');
                parsedCity = parts.Length >= 3 ? parts[1].Trim() : (parts.FirstOrDefault()?.Trim() ?? "");
            }

            if (!double.TryParse(latStr, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lat) ||
                !double.TryParse(lonStr, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lon))
            {
                return NotFound(new { code = 404, msg = "Unable to geocode the provided address. Please try a different address." });
            }

            var xA = 1.35;
            var xB = 175.5;
            var yA = -2.25;
            var yB = 128.5;
            var clampMin = _cfg.GetValue<double?>("MapProjection:Clamp:Min") ?? 2;
            var clampMax = _cfg.GetValue<double?>("MapProjection:Clamp:Max") ?? 98;

            try
            {
                var anchors = _cfg.GetSection("MapProjection:Anchors").GetChildren().ToList();
                if (anchors.Count >= 2)
                {
                    var a1 = anchors[0];
                    var a2 = anchors[1];

                    if (double.TryParse(a1["Lon"], out var lon1) &&
                        double.TryParse(a1["X"], out var x1) &&
                        double.TryParse(a2["Lon"], out var lon2) &&
                        double.TryParse(a2["X"], out var x2) &&
                        Math.Abs(lon2 - lon1) > 1e-9)
                    {
                        xA = (x2 - x1) / (lon2 - lon1);
                        xB = x1 - xA * lon1;
                    }

                    if (double.TryParse(a1["Lat"], out var lat1) &&
                        double.TryParse(a1["Y"], out var y1) &&
                        double.TryParse(a2["Lat"], out var lat2) &&
                        double.TryParse(a2["Y"], out var y2) &&
                        Math.Abs(lat2 - lat1) > 1e-9)
                    {
                        yA = (y2 - y1) / (lat2 - lat1);
                        yB = y1 - yA * lat1;
                    }
                }
            }
            catch
            {
            }

            var x = xA * lon + xB;
            var y = yA * lat + yB;
            x = Math.Clamp(x, clampMin, clampMax);
            y = Math.Clamp(y, clampMin, clampMax);

            var shortName = (!string.IsNullOrWhiteSpace(parsedCity) && !string.IsNullOrWhiteSpace(parsedState))
                ? $"{parsedCity}, {parsedState}"
                : displayName;

            var result = new
            {
                code = 200,
                msg = "success",
                data = new
                {
                    address,
                    state = parsedState,
                    city = parsedCity,
                    @class = placeClass,
                    type = placeType,
                    addresstype = addressType,
                    lat,
                    lon,
                    x,
                    y,
                    name = shortName
                }
            };

            _logger.LogInformation("地理编码返回 body={Body}", LogText.Truncate(LogText.Json(result), 4000));
            return Ok(result);
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("地理编码请求超时 address={Address}", address);
            return StatusCode(StatusCodes.Status504GatewayTimeout, new { code = 504, msg = "Geocoding service timeout. Please try again later." });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "地理编码请求失败 address={Address}", address);
            return StatusCode(StatusCodes.Status502BadGateway, new { code = 502, msg = "Geocoding service unavailable. Please try again later." });
        }
    }

    [HttpGet("/api/suggest")]
    [Produces("application/json")]
    public async Task<IActionResult> SuggestAsync([FromQuery] string query, [FromQuery] int? limit = null)
    {
        var q = (query ?? "").Trim();
        var max = Math.Clamp(limit ?? 6, 1, 10);
        if (q.Length < 2)
            return Ok(new { suggestions = Array.Empty<object>() });

        var hasLeadingHouseNumber = Regex.IsMatch(q, @"^\s*\d{1,7}\b");
        var streetLike =
            Regex.IsMatch(q, @"\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|pl|place|ct|court)\b", RegexOptions.IgnoreCase);
        var wantsHouseNumberResults = hasLeadingHouseNumber || streetLike;

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(6));

            var http = _httpFactory.CreateClient("arcgis");
            var overpassFast = _httpFactory.CreateClient("overpass-fast");

            if (!hasLeadingHouseNumber && streetLike)
            {
                var expanded = await TrySuggestHouseNumbersViaOverpassAsync(http, overpassFast, q, max, timeoutCts.Token);
                if (expanded.Count > 0)
                    return Ok(new { suggestions = expanded });
            }

            var isLikelySeattle =
                Regex.IsMatch(q, @"\bseattle\b", RegexOptions.IgnoreCase) ||
                Regex.IsMatch(q, @"\b981\d{2}\b", RegexOptions.IgnoreCase);
            if (isLikelySeattle)
            {
                var seattleSuggest = await TrySuggestSeattleSuggestAsync(http, q, max, wantsHouseNumberResults, timeoutCts.Token);
                if (seattleSuggest.Count > 0)
                    return Ok(new { suggestions = seattleSuggest });

                var seattle = await TrySuggestSeattleAsync(http, q, max, wantsHouseNumberResults, timeoutCts.Token);
                if (seattle.Count > 0)
                    return Ok(new { suggestions = seattle });
            }

            var osm = await TrySuggestNominatimAsync(http, q, max, wantsHouseNumberResults, timeoutCts.Token);
            return Ok(new { suggestions = osm });
        }
        catch (TaskCanceledException)
        {
            return Ok(new { suggestions = Array.Empty<object>() });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "地址建议请求失败 query={Query}", q);
            return Ok(new { suggestions = Array.Empty<object>() });
        }
    }

    private async Task<List<object>> TrySuggestHouseNumbersViaOverpassAsync(HttpClient http, HttpClient overpassFast, string q, int max, CancellationToken ct)
    {
        var outList = new List<object>();

        static string? ExtractZipFromText(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            var m = Regex.Match(s, @"\b\d{5}(?:-\d{4})?\b");
            return m.Success ? m.Value : null;
        }

        static string BuildSubtitle(string city, string stateCode, string zip)
        {
            var left = "";
            if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(stateCode)) left = $"{city}, {stateCode}";
            else if (!string.IsNullOrWhiteSpace(city)) left = city;
            else if (!string.IsNullOrWhiteSpace(stateCode)) left = stateCode;
            if (string.IsNullOrWhiteSpace(left)) return zip;
            return string.IsNullOrWhiteSpace(zip) ? left : $"{left} {zip}";
        }

        static string EscapeOverpassRegex(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var escaped = Regex.Escape(s);
            escaped = escaped.Replace("\"", "\\\"");
            return escaped;
        }

        async Task<List<string>> QueryHouseNumbersAsync(double lat, double lon, string road, CancellationToken token)
        {
            var housenumbers = new List<string>();
            var endpoints = new[]
            {
                "https://overpass-api.de/api/interpreter",
                "https://lz4.overpass-api.de/api/interpreter",
                "https://overpass.kumi.systems/api/interpreter"
            };

            var latStr = lat.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var lonStr = lon.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var roadRx = EscapeOverpassRegex(road);
            if (string.IsNullOrWhiteSpace(roadRx)) return housenumbers;

            var query =
                "[out:json][timeout:4];(" +
                $"node(around:600,{latStr},{lonStr})[\"addr:housenumber\"][\"addr:street\"~\"(?i){roadRx}\"];" +
                $"way(around:600,{latStr},{lonStr})[\"addr:housenumber\"][\"addr:street\"~\"(?i){roadRx}\"];" +
                ");out tags 60;";

            foreach (var ep in endpoints)
            {
                try
                {
                    using var tcs = CancellationTokenSource.CreateLinkedTokenSource(token);
                    tcs.CancelAfter(TimeSpan.FromSeconds(3.5));
                    using var req = new HttpRequestMessage(HttpMethod.Post, ep)
                    {
                        Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["data"] = query })
                    };
                    req.Headers.Accept.ParseAdd("application/json");
                    using var resp = await overpassFast.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, tcs.Token);
                    if (!resp.IsSuccessStatusCode) continue;
                    var text = await resp.Content.ReadAsStringAsync(tcs.Token);
                    if (string.IsNullOrWhiteSpace(text)) continue;
                    var root = JsonNode.Parse(text) as JsonObject;
                    var elements = root?["elements"] as JsonArray;
                    if (elements is null) continue;

                    var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var el in elements)
                    {
                        var tags = el?["tags"] as JsonObject;
                        var hn = tags?["addr:housenumber"]?.GetValue<string>()?.Trim() ?? "";
                        if (string.IsNullOrWhiteSpace(hn)) continue;
                        if (set.Add(hn)) housenumbers.Add(hn);
                    }
                    break;
                }
                catch
                {
                }
            }

            housenumbers.Sort((a, b) =>
            {
                static int HeadInt(string s)
                {
                    var m = Regex.Match(s ?? "", @"^\d+");
                    return m.Success && int.TryParse(m.Value, out var v) ? v : int.MaxValue;
                }
                var ai = HeadInt(a);
                var bi = HeadInt(b);
                var c = ai.CompareTo(bi);
                return c != 0 ? c : string.CompareOrdinal(a, b);
            });

            return housenumbers;
        }

        var url =
            "https://nominatim.openstreetmap.org/search"
            + $"?format=jsonv2&addressdetails=1&limit=3&countrycodes=us&q={Uri.EscapeDataString(q)}";

        using var resp = await http.GetAsync(url, ct);
        if (!resp.IsSuccessStatusCode) return outList;
        var text0 = await resp.Content.ReadAsStringAsync(ct);
        var arr = JsonNode.Parse(text0) as JsonArray;
        if (arr is null || arr.Count <= 0) return outList;

        for (var i = 0; i < arr.Count && outList.Count < max; i++)
        {
            if (arr[i] is not JsonObject o) continue;
            var latStr = o["lat"]?.GetValue<string>() ?? "";
            var lonStr = o["lon"]?.GetValue<string>() ?? "";
            if (!double.TryParse(latStr, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lat) ||
                !double.TryParse(lonStr, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var lon))
                continue;

            var addr = o["address"] as JsonObject;
            var road = addr?["road"]?.GetValue<string>()?.Trim()
                    ?? addr?["pedestrian"]?.GetValue<string>()?.Trim()
                    ?? addr?["footway"]?.GetValue<string>()?.Trim()
                    ?? "";
            if (string.IsNullOrWhiteSpace(road)) continue;

            var city = addr?["city"]?.GetValue<string>()?.Trim()
                       ?? addr?["town"]?.GetValue<string>()?.Trim()
                       ?? addr?["village"]?.GetValue<string>()?.Trim()
                       ?? addr?["hamlet"]?.GetValue<string>()?.Trim()
                       ?? "";

            var stateIso = addr?["ISO3166-2-lvl4"]?.GetValue<string>()?.Trim() ?? "";
            var stateName = addr?["state"]?.GetValue<string>()?.Trim() ?? "";
            var stateCode = "";
            if (!string.IsNullOrWhiteSpace(stateIso) && stateIso.StartsWith("US-", StringComparison.OrdinalIgnoreCase))
                stateCode = stateIso.Substring(3).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(stateCode))
                stateCode = LookupUtils.ExtractState(stateName) ?? "";

            var zip = addr?["postcode"]?.GetValue<string>()?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(zip))
                zip = ExtractZipFromText(o["display_name"]?.GetValue<string>() ?? "") ?? "";

            var subtitle = BuildSubtitle(city, stateCode, zip);
            var housenumbers = await QueryHouseNumbersAsync(lat, lon, road, ct);
            if (housenumbers.Count <= 0) continue;

            for (var j = 0; j < housenumbers.Count && outList.Count < max; j++)
            {
                var hn = housenumbers[j];
                var streetLine = $"{hn} {road}";
                var singleLine = string.IsNullOrWhiteSpace(subtitle) ? streetLine : $"{streetLine}, {subtitle}";
                outList.Add(new { address = singleLine, title = streetLine, subtitle, source = "overpass" });
            }
        }

        return outList;
    }

    private async Task<List<object>> TrySuggestSeattleSuggestAsync(HttpClient http, string q, int max, bool requiresHouseNumber, CancellationToken ct)
    {
        var outList = new List<object>();

        var url =
            "https://gisdata.seattle.gov/cosgis/rest/services/locators/AddressPoints/GeocodeServer/suggest"
            + $"?f=pjson&text={Uri.EscapeDataString(q)}&maxSuggestions={max}&category=Address";

        using var resp = await http.GetAsync(url, ct);
        if (!resp.IsSuccessStatusCode) return outList;

        var text = await resp.Content.ReadAsStringAsync(ct);
        var root = JsonNode.Parse(text) as JsonObject;
        var suggestions = root?["suggestions"] as JsonArray;
        if (suggestions is null || suggestions.Count <= 0) return outList;

        static string? ExtractZip(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            var m = Regex.Match(s, @"\b\d{5}(?:-\d{4})?\b");
            return m.Success ? m.Value : null;
        }

        static string BuildSubtitleFromText(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var parts = s.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToList();
            if (parts.Count <= 1) return "";
            var city = parts.Count >= 2 ? parts[1] : "";
            var stateCode = "";
            var zip = ExtractZip(s) ?? "";

            stateCode = LookupUtils.ExtractState(s) ?? "";
            if (string.IsNullOrWhiteSpace(stateCode) && parts.Count >= 3)
                stateCode = LookupUtils.ExtractState(parts[2]) ?? "";

            var left = "";
            if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(stateCode)) left = $"{city}, {stateCode}";
            else if (!string.IsNullOrWhiteSpace(city)) left = city;
            else if (!string.IsNullOrWhiteSpace(stateCode)) left = stateCode;
            if (string.IsNullOrWhiteSpace(left)) return zip;
            return string.IsNullOrWhiteSpace(zip) ? left : $"{left} {zip}";
        }

        for (var i = 0; i < suggestions.Count && outList.Count < max; i++)
        {
            if (suggestions[i] is not JsonObject s) continue;
            var t = s["text"]?.GetValue<string>()?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(t)) continue;

            var streetLine = t.Split(',').FirstOrDefault()?.Trim() ?? t;
            if (requiresHouseNumber)
            {
                var first = streetLine.TrimStart().FirstOrDefault();
                if (!char.IsDigit(first)) continue;
            }

            var subtitle = BuildSubtitleFromText(t);
            var singleLine = string.IsNullOrWhiteSpace(subtitle) ? streetLine : $"{streetLine}, {subtitle}";

            outList.Add(new
            {
                address = singleLine,
                title = streetLine,
                subtitle,
                source = "seattle-suggest"
            });
        }

        return outList;
    }

    private async Task<List<object>> TrySuggestSeattleAsync(HttpClient http, string q, int max, bool requiresHouseNumber, CancellationToken ct)
    {
        var outList = new List<object>();

        var geocodeUrl =
            "https://gisdata.seattle.gov/cosgis/rest/services/locators/AddressPoints/GeocodeServer/findAddressCandidates"
            + $"?f=pjson&SingleLine={Uri.EscapeDataString(q)}&maxLocations={max}&outSR=4326&outFields=*";

        using var resp = await http.GetAsync(geocodeUrl, ct);
        if (!resp.IsSuccessStatusCode) return outList;

        var text = await resp.Content.ReadAsStringAsync(ct);
        var root = JsonNode.Parse(text) as JsonObject;
        var cands = root?["candidates"] as JsonArray;
        if (cands is null || cands.Count <= 0) return outList;

        static string? ExtractZip(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            var m = Regex.Match(s, @"\b\d{5}(?:-\d{4})?\b");
            return m.Success ? m.Value : null;
        }

        static string BuildSubtitle(string city, string stateCode, string zip)
        {
            var left = "";
            if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(stateCode)) left = $"{city}, {stateCode}";
            else if (!string.IsNullOrWhiteSpace(city)) left = city;
            else if (!string.IsNullOrWhiteSpace(stateCode)) left = stateCode;
            if (string.IsNullOrWhiteSpace(left)) return zip;
            return string.IsNullOrWhiteSpace(zip) ? left : $"{left} {zip}";
        }

        for (var i = 0; i < cands.Count && outList.Count < max; i++)
        {
            if (cands[i] is not JsonObject c) continue;
            var addr = c["address"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(addr)) continue;

            var streetLine = addr.Split(',').FirstOrDefault()?.Trim() ?? addr;

            if (requiresHouseNumber)
            {
                var first = streetLine.TrimStart().FirstOrDefault();
                if (!char.IsDigit(first)) continue;
            }

            var attr = c["attributes"] as JsonObject;
            var city = attr?["City"]?.GetValue<string>()?.Trim() ?? "";
            var region = attr?["Region"]?.GetValue<string>()?.Trim() ?? "";
            var postal = attr?["Postal"]?.GetValue<string>()?.Trim()
                      ?? attr?["ZIP"]?.GetValue<string>()?.Trim()
                      ?? attr?["Zip"]?.GetValue<string>()?.Trim()
                      ?? "";

            if (string.IsNullOrWhiteSpace(city))
            {
                var parts = addr.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToList();
                if (parts.Count >= 2) city = parts[1];
            }

            var stateCode = "";
            if (!string.IsNullOrWhiteSpace(region))
            {
                stateCode = region.Length == 2 ? region.ToUpperInvariant() : (LookupUtils.ExtractState(region) ?? "");
            }
            if (string.IsNullOrWhiteSpace(stateCode))
            {
                stateCode = LookupUtils.ExtractState(addr) ?? "";
            }

            var zip = "";
            if (!string.IsNullOrWhiteSpace(postal) && Regex.IsMatch(postal, @"^\d{5}(-\d{4})?$")) zip = postal;
            else zip = ExtractZip(addr) ?? "";

            var subtitle = BuildSubtitle(city, stateCode, zip);
            var singleLine = $"{streetLine}, {subtitle}".Trim().TrimEnd(',');

            outList.Add(new
            {
                address = singleLine,
                title = streetLine,
                subtitle,
                source = "seattle"
            });
        }

        return outList;
    }

    private async Task<List<object>> TrySuggestNominatimAsync(HttpClient http, string q, int max, bool requiresHouseNumber, CancellationToken ct)
    {
        var outList = new List<object>();
        var url =
            "https://nominatim.openstreetmap.org/search"
            + $"?format=jsonv2&addressdetails=1&limit={max}&countrycodes=us&q={Uri.EscapeDataString(q)}";

        using var resp = await http.GetAsync(url, ct);
        if (!resp.IsSuccessStatusCode) return outList;

        var text = await resp.Content.ReadAsStringAsync(ct);
        var arr = JsonNode.Parse(text) as JsonArray;
        if (arr is null || arr.Count <= 0) return outList;

        static string BuildSubtitle(string city, string stateCode, string zip)
        {
            var left = "";
            if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(stateCode)) left = $"{city}, {stateCode}";
            else if (!string.IsNullOrWhiteSpace(city)) left = city;
            else if (!string.IsNullOrWhiteSpace(stateCode)) left = stateCode;
            if (string.IsNullOrWhiteSpace(left)) return zip;
            return string.IsNullOrWhiteSpace(zip) ? left : $"{left} {zip}";
        }

        for (var i = 0; i < arr.Count && outList.Count < max; i++)
        {
            if (arr[i] is not JsonObject o) continue;
            var display = o["display_name"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(display)) continue;

            var addr = o["address"] as JsonObject;
            var hn = addr?["house_number"]?.GetValue<string>()?.Trim() ?? "";
            if (requiresHouseNumber)
            {
                if (string.IsNullOrWhiteSpace(hn)) continue;
            }
            var road = addr?["road"]?.GetValue<string>()?.Trim()
                    ?? addr?["pedestrian"]?.GetValue<string>()?.Trim()
                    ?? addr?["footway"]?.GetValue<string>()?.Trim()
                    ?? "";
            var streetLine = !string.IsNullOrWhiteSpace(hn) && !string.IsNullOrWhiteSpace(road) ? $"{hn} {road}" : (o["name"]?.GetValue<string>()?.Trim() ?? "");
            if (string.IsNullOrWhiteSpace(streetLine))
                streetLine = display.Split(',').FirstOrDefault()?.Trim() ?? display;

            var city = addr?["city"]?.GetValue<string>()?.Trim()
                       ?? addr?["town"]?.GetValue<string>()?.Trim()
                       ?? addr?["village"]?.GetValue<string>()?.Trim()
                       ?? addr?["hamlet"]?.GetValue<string>()?.Trim()
                       ?? "";
            var stateIso = addr?["ISO3166-2-lvl4"]?.GetValue<string>()?.Trim() ?? "";
            var stateName = addr?["state"]?.GetValue<string>()?.Trim() ?? "";
            var stateCode = "";
            if (!string.IsNullOrWhiteSpace(stateIso) && stateIso.StartsWith("US-", StringComparison.OrdinalIgnoreCase))
                stateCode = stateIso.Substring(3).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(stateCode))
                stateCode = LookupUtils.ExtractState(stateName) ?? LookupUtils.ExtractState(display) ?? "";

            var zip = addr?["postcode"]?.GetValue<string>()?.Trim() ?? "";
            var subtitle = BuildSubtitle(city, stateCode, zip);
            var singleLine = $"{streetLine}, {subtitle}".Trim().TrimEnd(',');

            outList.Add(new
            {
                address = singleLine,
                title = streetLine,
                subtitle,
                source = "osm"
            });
        }

        return outList;
    }
}
