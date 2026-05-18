using System.Text.Json.Nodes;
using System.Net;
using System.Net.Http;
using Microsoft.Extensions.Configuration;

namespace XBuildApi.Lookup.Providers;

/// <summary>
/// Seattle 官方地址查询 Provider：
/// 先用 City of Seattle ArcGIS Geocoder 定位，再用 King County parcel 图层获取地块 geometry。
/// 建筑轮廓统一使用 OSM（Overpass）作为一致的数据来源。
/// </summary>
public sealed class SeattleOfficialLookupProvider : ILookupProvider
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly OsmBuildingsService _osmBuildings;
    private readonly Microsoft.Extensions.Logging.ILogger<SeattleOfficialLookupProvider> _logger;
    private readonly IConfiguration _cfg;

    /// <summary>
    /// 创建 Provider。
    /// </summary>
    public SeattleOfficialLookupProvider(IHttpClientFactory httpFactory, OsmBuildingsService osmBuildings, Microsoft.Extensions.Logging.ILogger<SeattleOfficialLookupProvider> logger, IConfiguration cfg)
    {
        _httpFactory = httpFactory;
        _osmBuildings = osmBuildings;
        _logger = logger;
        _cfg = cfg;
    }

    /// <inheritdoc />
    public string ProviderName => "seattle-official";

    /// <inheritdoc />
    public int Priority => 100;

    /// <inheritdoc />
    public bool CanHandle(string address, string state)
    {
        if (!string.Equals(state?.Trim(), "WA", StringComparison.OrdinalIgnoreCase)) return false;
        if (address.IndexOf("Seattle", StringComparison.OrdinalIgnoreCase) >= 0) return true;
        if (System.Text.RegularExpressions.Regex.IsMatch(address, @"\b981\d{2}\b")) return true;
        return false;
    }

    /// <inheritdoc />
    public async Task<LookupProviderResult?> LookupAsync(string address, string state, CancellationToken cancellationToken)
    {
        var http = _httpFactory.CreateClient("arcgis");
        // 先用 AddressPoints（门牌地址优先），再回退 CommonPlaces（POI）。
        var geocodeUrls = new[]
        {
            "https://gisdata.seattle.gov/cosgis/rest/services/locators/AddressPoints/GeocodeServer/findAddressCandidates"
            + $"?f=pjson&SingleLine={Uri.EscapeDataString(address)}&maxLocations=5&outSR=4326&outFields=*",
            "https://gisdata.seattle.gov/cosgis/rest/services/locators/CommonPlaces/GeocodeServer/findAddressCandidates"
            + $"?f=pjson&SingleLine={Uri.EscapeDataString(address)}&maxLocations=5&outSR=4326&outFields=*"
        };

        JsonObject? cand = null;
        foreach (var geocodeUrl in geocodeUrls)
        {
            _logger.LogInformation("西雅图官方地理编码请求 url={Url}", geocodeUrl);
            using var geoResp = await SendGetWithRetryAsync(http, geocodeUrl, cancellationToken);
            _logger.LogInformation("西雅图官方地理编码响应 status={StatusCode}", (int)geoResp.StatusCode);
            if (!geoResp.IsSuccessStatusCode) continue;
            var geoText = await geoResp.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("西雅图官方地理编码返回 len={Len} body={Body}", geoText.Length, Truncate(geoText, 8000));
            var geoDoc = JsonNode.Parse(geoText) as JsonObject;
            var candidates = geoDoc?["candidates"] as JsonArray;
            if (candidates is null || candidates.Count == 0) continue;

            JsonObject? best = null;
            foreach (var c in candidates)
            {
                if (c is not JsonObject co) continue;
                var score = co["score"]?.GetValue<double>() ?? 0d;
                var addrType = co["attributes"]?["Addr_type"]?.GetValue<string>() ?? "";
                if (addrType.Equals("POI", StringComparison.OrdinalIgnoreCase) && score < 90) continue;
                if (best is null || score > (best["score"]?.GetValue<double>() ?? 0d))
                    best = co;
            }

            cand = best ?? (candidates[0] as JsonObject);
            if (cand != null) break;
        }
        if (cand is null) return null;

        var loc = cand["location"] as JsonObject;
        if (loc is null) return null;
        var lon = loc["x"]?.GetValue<double>() ?? double.NaN;
        var lat = loc["y"]?.GetValue<double>() ?? double.NaN;
        if (!double.IsFinite(lon) || !double.IsFinite(lat)) return null;

        var matchedAddr = cand["address"]?.GetValue<string>() ?? address;
        var streetName = LookupUtils.ExtractStreetNameFromSingleLine(matchedAddr);
        var city = "";
        var st = "WA";
        if (cand["attributes"] is JsonObject attrs)
        {
            city = attrs["City"]?.GetValue<string>() ?? attrs["CITY"]?.GetValue<string>() ?? city;
            st = attrs["Region"]?.GetValue<string>() ?? attrs["REGION"]?.GetValue<string>() ?? st;
        }
        city = (city ?? "").Trim();
        st = (st ?? "WA").Trim().ToUpperInvariant();

        var templates = new[]
        {
            "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_area/FeatureServer/439/query?f=geojson&geometryType=esriGeometryPoint&inSR=4326&geometry={0},{1}&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=1"
        };

        JsonObject? feat0 = null;
        JsonObject? geom = null;
        JsonObject? rawProps = null;
        var usedParcelUrl = "";

        foreach (var tpl in templates.Where(t => !string.IsNullOrWhiteSpace(t)))
        {
            var parcelUrl = string.Format(System.Globalization.CultureInfo.InvariantCulture, tpl.Trim(), lon, lat);
            _logger.LogInformation("地块查询请求 url={Url}", parcelUrl);
            using var parcelResp = await SendGetWithRetryAsync(http, parcelUrl, cancellationToken);
            _logger.LogInformation("地块查询响应 status={StatusCode}", (int)parcelResp.StatusCode);
            if (!parcelResp.IsSuccessStatusCode) continue;
            var parcelText = await parcelResp.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("地块查询返回 len={Len} body={Body}", parcelText.Length, Truncate(parcelText, 8000));

            var parcelDoc = JsonNode.Parse(parcelText) as JsonObject;
            var feats = parcelDoc?["features"] as JsonArray;
            if (feats is null || feats.Count == 0) continue;
            var f0 = feats[0] as JsonObject;
            var g0 = f0?["geometry"] as JsonObject;
            var p0 = f0?["properties"] as JsonObject;
            if (f0 is null || g0 is null) continue;

            feat0 = f0;
            geom = g0;
            rawProps = p0 ?? new JsonObject();
            usedParcelUrl = parcelUrl;
            break;
        }

        if (feat0 is null || geom is null)
            return null;

        if (!string.IsNullOrWhiteSpace(usedParcelUrl))
            _logger.LogInformation("地块查询选用数据源 url={Url}", usedParcelUrl);

        rawProps ??= new JsonObject();
        var pid = "";
        try
        {
            pid =
                rawProps["PIN"]?.GetValue<string>()
                ?? rawProps["pin"]?.GetValue<string>()
                ?? rawProps["PARCELNR"]?.GetValue<string>()
                ?? rawProps["parcelnumb"]?.GetValue<string>()
                ?? "";
            if (string.IsNullOrWhiteSpace(pid))
            {
                var major = rawProps["MAJOR"]?.GetValue<string>() ?? rawProps["major"]?.GetValue<string>() ?? "";
                var minor = rawProps["MINOR"]?.GetValue<string>() ?? rawProps["minor"]?.GetValue<string>() ?? "";
                if (!string.IsNullOrWhiteSpace(major) || !string.IsNullOrWhiteSpace(minor))
                    pid = $"{major}{minor}";
            }
        }
        catch
        {
            pid = "";
        }
        pid = (pid ?? "").Trim();

        var fields = new JsonObject
        {
            ["ll_uuid"] = string.IsNullOrWhiteSpace(pid) ? $"kc:{lon:F6},{lat:F6}" : $"kc:{pid}",
            ["parcelnumb"] = pid,
            ["apn"] = pid,
            ["scity"] = string.IsNullOrWhiteSpace(city) ? "Seattle" : city,
            ["sstate"] = st,
            ["saddstr"] = streetName,
            ["saddsttyp"] = ""
        };
        var props = rawProps.DeepClone() as JsonObject ?? new JsonObject();
        props["fields"] = fields;
        props["formatted_address"] = matchedAddr;

        var parcelFeature = new JsonObject
        {
            ["type"] = "Feature",
            ["geometry"] = geom.DeepClone(),
            ["properties"] = props
        };

        var bbox = GeoJsonUtils.BboxFromPolygon(geom);
        var buildings = await _osmBuildings.QueryAsync(bbox, cancellationToken);

        return new LookupProviderResult
        {
            Provider = ProviderName,
            Parcel = parcelFeature,
            Buildings = buildings,
            StreetName = streetName,
            City = string.IsNullOrWhiteSpace(city) ? "Seattle" : city,
            State = st,
            Lat = lat,
            Lon = lon
        };
    }

    private static string Truncate(string s, int maxLen)
    {
        if (string.IsNullOrEmpty(s)) return s;
        if (s.Length <= maxLen) return s;
        return s.Substring(0, maxLen);
    }

    private async Task<HttpResponseMessage> SendGetWithRetryAsync(HttpClient http, string url, CancellationToken cancellationToken)
    {
        var defaultTimeoutSeconds = _cfg.GetValue<int?>("SeattleOfficial:TimeoutSeconds")
                                 ?? _cfg.GetValue<int?>("Seattle:TimeoutSeconds")
                                 ?? 45;
        defaultTimeoutSeconds = Math.Clamp(defaultTimeoutSeconds, 5, 180);

        var kingCountyTimeoutSeconds = _cfg.GetValue<int?>("SeattleOfficial:KingCountyTimeoutSeconds")
                                    ?? _cfg.GetValue<int?>("Seattle:KingCountyTimeoutSeconds")
                                    ?? 12;
        kingCountyTimeoutSeconds = Math.Clamp(kingCountyTimeoutSeconds, 3, 60);

        var timeoutSeconds = url.IndexOf("gisdata.kingcounty.gov", StringComparison.OrdinalIgnoreCase) >= 0
            ? kingCountyTimeoutSeconds
            : defaultTimeoutSeconds;

        var retryCount = _cfg.GetValue<int?>("SeattleOfficial:RetryCount")
                         ?? _cfg.GetValue<int?>("Seattle:RetryCount")
                         ?? 2;
        retryCount = Math.Clamp(retryCount, 1, 3);

        var delaysMs = retryCount switch
        {
            1 => new[] { 0 },
            2 => new[] { 0, 1000 },
            _ => new[] { 0, 1000, 3000 }
        };

        Exception? last = null;
        for (var attempt = 0; attempt < delaysMs.Length; attempt++)
        {
            if (delaysMs[attempt] > 0)
                await Task.Delay(delaysMs[attempt], cancellationToken);

            try
            {
                using var attemptCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                attemptCts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));
                using var req = new HttpRequestMessage(HttpMethod.Get, url)
                {
                    Version = HttpVersion.Version11,
                    VersionPolicy = HttpVersionPolicy.RequestVersionOrLower
                };
                req.Headers.Accept.ParseAdd("application/json");

                var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, attemptCts.Token);
                if ((int)resp.StatusCode >= 500 && attempt < delaysMs.Length - 1)
                {
                    _logger.LogWarning("上游返回 5xx，将重试 attempt={Attempt} status={StatusCode} url={Url}", attempt + 1, (int)resp.StatusCode, url);
                    resp.Dispose();
                    continue;
                }
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                last = ex;
                _logger.LogWarning(ex, "上游请求超时，将重试 attempt={Attempt} url={Url}", attempt + 1, url);
                if (attempt == delaysMs.Length - 1) throw;
            }
            catch (HttpRequestException ex)
            {
                last = ex;
                _logger.LogWarning(ex, "上游 HTTPS/网络请求异常，将重试 attempt={Attempt} url={Url}", attempt + 1, url);
                if (attempt == delaysMs.Length - 1) throw;
            }
        }
        throw new HttpRequestException("上游请求失败", last);
    }
}
