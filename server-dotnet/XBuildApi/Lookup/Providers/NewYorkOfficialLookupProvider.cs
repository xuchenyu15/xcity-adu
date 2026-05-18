using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;

namespace XBuildApi.Lookup.Providers;

public sealed class NewYorkOfficialLookupProvider : ILookupProvider
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly OsmBuildingsService _osmBuildings;
    private readonly Microsoft.Extensions.Logging.ILogger<NewYorkOfficialLookupProvider> _logger;

    public NewYorkOfficialLookupProvider(IHttpClientFactory httpFactory, OsmBuildingsService osmBuildings, Microsoft.Extensions.Logging.ILogger<NewYorkOfficialLookupProvider> logger)
    {
        _httpFactory = httpFactory;
        _osmBuildings = osmBuildings;
        _logger = logger;
    }

    public string ProviderName => "ny-official";
    public int Priority => 80;

    public bool CanHandle(string address, string state)
    {
        return string.Equals(state?.Trim(), "NY", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<LookupProviderResult?> LookupAsync(string address, string state, CancellationToken cancellationToken)
    {
        var http = _httpFactory.CreateClient("arcgis");
        var geocodeUrl =
            "https://gisservices.its.ny.gov/arcgis/rest/services/CompositePointLocator/GeocodeServer/findAddressCandidates"
            + $"?f=pjson&SingleLine={Uri.EscapeDataString(address)}&maxLocations=5&outSR=4326&outFields=*";

        _logger.LogInformation("纽约官方地理编码请求 url={Url}", geocodeUrl);
        using var geoResp = await SendGetWithRetryAsync(http, geocodeUrl, cancellationToken);
        _logger.LogInformation("纽约官方地理编码响应 status={StatusCode}", (int)geoResp.StatusCode);
        if (!geoResp.IsSuccessStatusCode) return null;

        var geoText = await geoResp.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogInformation("纽约官方地理编码返回 len={Len} body={Body}", geoText.Length, Truncate(geoText, 8000));
        var geoDoc = JsonNode.Parse(geoText) as JsonObject;
        var candidates = geoDoc?["candidates"] as JsonArray;
        if (candidates is null || candidates.Count == 0) return null;

        JsonObject? cand = null;
        foreach (var c in candidates)
        {
            if (c is not JsonObject co) continue;
            var score = co["score"]?.GetValue<double>() ?? 0d;
            if (cand is null || score > (cand["score"]?.GetValue<double>() ?? 0d))
                cand = co;
        }
        cand ??= candidates[0] as JsonObject;
        if (cand is null) return null;

        var loc = cand["location"] as JsonObject;
        if (loc is null) return null;
        var lon = loc["x"]?.GetValue<double>() ?? double.NaN;
        var lat = loc["y"]?.GetValue<double>() ?? double.NaN;
        if (!double.IsFinite(lon) || !double.IsFinite(lat)) return null;

        var matchedAddr = cand["address"]?.GetValue<string>() ?? address;
        var streetName = LookupUtils.ExtractStreetNameFromSingleLine(matchedAddr);
        var city = "";
        var st = "NY";
        if (cand["attributes"] is JsonObject attrs)
        {
            city = attrs["City"]?.GetValue<string>() ?? attrs["CITY"]?.GetValue<string>() ?? city;
            st = attrs["State"]?.GetValue<string>() ?? attrs["STATE"]?.GetValue<string>() ?? attrs["Region"]?.GetValue<string>() ?? st;
        }
        city = (city ?? "").Trim();
        st = (st ?? "NY").Trim().ToUpperInvariant();

        var parcelUrl = string.Format(
            System.Globalization.CultureInfo.InvariantCulture,
            "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/1/query?f=geojson&geometryType=esriGeometryPoint&inSR=4326&geometry={0},{1}&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=1",
            lon,
            lat);

        _logger.LogInformation("地块查询请求 url={Url}", parcelUrl);
        using var parcelResp = await SendGetWithRetryAsync(http, parcelUrl, cancellationToken);
        _logger.LogInformation("地块查询响应 status={StatusCode}", (int)parcelResp.StatusCode);
        if (!parcelResp.IsSuccessStatusCode) return null;

        var parcelText = await parcelResp.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogInformation("地块查询返回 len={Len} body={Body}", parcelText.Length, Truncate(parcelText, 8000));
        var parcelDoc = JsonNode.Parse(parcelText) as JsonObject;
        var feats = parcelDoc?["features"] as JsonArray;
        if (feats is null || feats.Count == 0) return null;

        var f0 = feats[0] as JsonObject;
        var geom = f0?["geometry"] as JsonObject;
        var rawProps = f0?["properties"] as JsonObject ?? new JsonObject();
        if (f0 is null || geom is null) return null;

        var pid = "";
        try
        {
            pid = rawProps["PRINT_KEY"]?.GetValue<string>()
                  ?? rawProps["print_key"]?.GetValue<string>()
                  ?? rawProps["SBL"]?.GetValue<string>()
                  ?? rawProps["sbl"]?.GetValue<string>()
                  ?? rawProps["SWIS_PRINT_KEY_ID"]?.GetValue<string>()
                  ?? rawProps["SWIS_SBL_ID"]?.GetValue<string>()
                  ?? "";
        }
        catch
        {
            pid = "";
        }
        pid = (pid ?? "").Trim();

        if (string.IsNullOrWhiteSpace(city))
        {
            try
            {
                city = rawProps["CITYTOWN_NAME"]?.GetValue<string>() ?? city;
            }
            catch
            {
            }
            city = (city ?? "").Trim();
        }

        var fields = new JsonObject
        {
            ["ll_uuid"] = string.IsNullOrWhiteSpace(pid) ? $"nys:{lon:F6},{lat:F6}" : $"nys:{pid}",
            ["parcelnumb"] = pid,
            ["apn"] = pid,
            ["scity"] = city,
            ["sstate"] = "NY",
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
            City = city,
            State = "NY",
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
        var timeoutSeconds = 45;
        var delaysMs = new[] { 0, 1000, 3000 };

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
