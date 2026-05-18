using System.Text;
using System.Text.Json;

namespace XBuildApi.Site;

/// <summary>
/// 基于 Overpass API 的道路查询服务。
/// </summary>
/// <remarks>
/// - 输入 bbox 为经纬度（minLon,minLat,maxLon,maxLat）。
/// - 输出为 GeoJSON FeatureCollection，geometry 为 LineString（坐标为 [lon,lat]）。
/// - 内部会在多个 Overpass endpoint 间轮询，尽可能提高可用性。
/// </remarks>
public sealed class OverpassRoadService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<OverpassRoadService> _logger;

    /// <summary>
    /// 创建道路查询服务。
    /// </summary>
    /// <param name="httpFactory">HttpClient 工厂（需注册名为 <c>overpass</c> 的 client）。</param>
    /// <param name="logger">日志。</param>
    public OverpassRoadService(IHttpClientFactory httpFactory, ILogger<OverpassRoadService> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
    }

    /// <summary>
    /// 查询 bbox 内的道路并转换为标准 GeoJSON。
    /// </summary>
    /// <param name="bboxLonLat">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>道路 GeoJSON FeatureCollection；失败时返回空集合。</returns>
    public async Task<GeoJsonFeatureCollection> QueryRoadsGeoJsonAsync(double[] bboxLonLat, CancellationToken cancellationToken)
    {
        if (bboxLonLat.Length < 4) return EmptyFc();
        var minLon = bboxLonLat[0];
        var minLat = bboxLonLat[1];
        var maxLon = bboxLonLat[2];
        var maxLat = bboxLonLat[3];
        if (!double.IsFinite(minLon) || !double.IsFinite(minLat) || !double.IsFinite(maxLon) || !double.IsFinite(maxLat))
            return EmptyFc();

        var endpoints = new[]
        {
            "https://overpass-api.de/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"
        };

        var query =
            "[out:json][timeout:25];" +
            $"(way[\"highway\"]({minLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{minLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLon.ToString(System.Globalization.CultureInfo.InvariantCulture)}););" +
            "out body;>;out skel qt;";

        foreach (var endpoint in endpoints)
        {
            try
            {
                var http = _httpFactory.CreateClient("overpass");
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(25));

                using var req = new HttpRequestMessage(HttpMethod.Post, endpoint);
                req.Content = new StringContent(query, Encoding.UTF8, "text/plain");
                _logger.LogInformation("Overpass roads 请求 endpoint={Endpoint}", endpoint);

                using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseContentRead, timeoutCts.Token);
                if (!resp.IsSuccessStatusCode) continue;

                var text = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
                if (string.IsNullOrWhiteSpace(text)) continue;

                using var doc = JsonDocument.Parse(text);
                return ToGeoJson(doc.RootElement);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
            }
        }

        return EmptyFc();
    }

    /// <summary>
    /// 构造空 FeatureCollection。
    /// </summary>
    private static GeoJsonFeatureCollection EmptyFc() => new()
    {
        Type = "FeatureCollection",
        Features = new List<GeoJsonFeature>()
    };

    /// <summary>
    /// 将 Overpass JSON 输出转换为 GeoJSON FeatureCollection（LineString）。
    /// </summary>
    /// <param name="overpass">Overpass API 返回的 JSON 根节点。</param>
    /// <returns>标准 GeoJSON FeatureCollection。</returns>
    private static GeoJsonFeatureCollection ToGeoJson(JsonElement overpass)
    {
        if (!overpass.TryGetProperty("elements", out var elements) || elements.ValueKind != JsonValueKind.Array)
            return EmptyFc();

        var nodes = new Dictionary<long, (double lon, double lat)>();
        var ways = new List<JsonElement>();

        foreach (var el in elements.EnumerateArray())
        {
            if (!el.TryGetProperty("type", out var typeEl)) continue;
            var type = typeEl.GetString() ?? "";
            if (type == "node")
            {
                var id = el.TryGetProperty("id", out var idEl) ? idEl.GetInt64() : 0;
                var lat = el.TryGetProperty("lat", out var latEl) ? latEl.GetDouble() : double.NaN;
                var lon = el.TryGetProperty("lon", out var lonEl) ? lonEl.GetDouble() : double.NaN;
                if (id != 0 && double.IsFinite(lat) && double.IsFinite(lon))
                    nodes[id] = (lon, lat);
            }
            else if (type == "way")
            {
                ways.Add(el);
            }
        }

        var features = new List<GeoJsonFeature>();
        foreach (var way in ways)
        {
            if (!way.TryGetProperty("nodes", out var nodeIds) || nodeIds.ValueKind != JsonValueKind.Array) continue;

            var coordsList = new List<double[]>();
            foreach (var nidNode in nodeIds.EnumerateArray())
            {
                if (nidNode.ValueKind != JsonValueKind.Number) continue;
                var nid = nidNode.GetInt64();
                if (nid == 0) continue;
                if (!nodes.TryGetValue(nid, out var p)) continue;
                coordsList.Add(new[] { p.lon, p.lat });
            }

            if (coordsList.Count < 2) continue;

            var propsDict = new Dictionary<string, object?>();
            if (way.TryGetProperty("tags", out var tags) && tags.ValueKind == JsonValueKind.Object)
            {
                if (tags.TryGetProperty("name", out var name)) propsDict["name"] = name.GetString();
                if (tags.TryGetProperty("highway", out var highway)) propsDict["highway"] = highway.GetString();
                if (tags.TryGetProperty("surface", out var surface)) propsDict["surface"] = surface.GetString();
            }

            var feature = new GeoJsonFeature
            {
                Type = "Feature",
                Geometry = new GeoJsonGeometry
                {
                    Type = "LineString",
                    Coordinates = JsonSerializer.SerializeToElement(coordsList)
                },
                Properties = JsonSerializer.SerializeToElement(propsDict)
            };
            features.Add(feature);
        }

        return new GeoJsonFeatureCollection { Type = "FeatureCollection", Features = features };
    }
}
