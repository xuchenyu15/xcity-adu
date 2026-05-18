using System.Text.Json.Nodes;

namespace XBuildApi.Lookup;

/// <summary>
/// GeoJSON 读取辅助方法（基于 <see cref="JsonNode"/>）。
/// </summary>
public static class GeoJsonUtils
{
    /// <summary>
    /// 从 GeoJSON Polygon/MultiPolygon geometry 提取外环坐标点（lon/lat）。
    /// </summary>
    public static List<(double lon, double lat)> ExtractOuterRingLonLat(JsonNode? geom)
    {
        var res = new List<(double lon, double lat)>();
        var type = geom?["type"]?.GetValue<string>() ?? "";
        if (type.Equals("Polygon", StringComparison.OrdinalIgnoreCase))
        {
            if (geom?["coordinates"] is JsonArray coords && coords.Count > 0 && coords[0] is JsonArray ring)
            {
                foreach (var pt in ring)
                {
                    if (pt is not JsonArray a || a.Count < 2) continue;
                    res.Add((a[0]!.GetValue<double>(), a[1]!.GetValue<double>()));
                }
            }
            return res;
        }

        if (type.Equals("MultiPolygon", StringComparison.OrdinalIgnoreCase))
        {
            if (geom?["coordinates"] is JsonArray coords && coords.Count > 0 &&
                coords[0] is JsonArray poly && poly.Count > 0 &&
                poly[0] is JsonArray ring)
            {
                foreach (var pt in ring)
                {
                    if (pt is not JsonArray a || a.Count < 2) continue;
                    res.Add((a[0]!.GetValue<double>(), a[1]!.GetValue<double>()));
                }
            }
        }

        return res;
    }

    /// <summary>
    /// 从 GeoJSON Polygon/MultiPolygon geometry 提取“点数最多”的外环（用于 MultiPolygon）。
    /// </summary>
    public static List<(double lon, double lat)> ExtractLargestOuterRingLonLat(JsonNode? geom)
    {
        var type = geom?["type"]?.GetValue<string>() ?? "";
        if (type.Equals("Polygon", StringComparison.OrdinalIgnoreCase))
            return ExtractOuterRingLonLat(geom);

        if (type.Equals("MultiPolygon", StringComparison.OrdinalIgnoreCase))
        {
            var best = new List<(double lon, double lat)>();
            var bestCount = 0;
            if (geom?["coordinates"] is JsonArray polys)
            {
                foreach (var polyNode in polys)
                {
                    if (polyNode is not JsonArray poly || poly.Count == 0) continue;
                    if (poly[0] is not JsonArray ring) continue;
                    var tmp = new List<(double lon, double lat)>();
                    foreach (var pt in ring)
                    {
                        if (pt is not JsonArray a || a.Count < 2) continue;
                        tmp.Add((a[0]!.GetValue<double>(), a[1]!.GetValue<double>()));
                    }
                    if (tmp.Count > bestCount)
                    {
                        best = tmp;
                        bestCount = tmp.Count;
                    }
                }
            }
            return best;
        }

        return new List<(double lon, double lat)>();
    }

    /// <summary>
    /// 计算 GeoJSON Polygon/MultiPolygon 的 bbox（minLon, minLat, maxLon, maxLat）。
    /// </summary>
    public static double[] BboxFromPolygon(JsonNode? geom)
    {
        var ring = ExtractLargestOuterRingLonLat(geom);
        if (ring.Count == 0) return new[] { 0d, 0d, 0d, 0d };
        var minLon = ring.Min(p => p.lon);
        var maxLon = ring.Max(p => p.lon);
        var minLat = ring.Min(p => p.lat);
        var maxLat = ring.Max(p => p.lat);
        return new[] { minLon, minLat, maxLon, maxLat };
    }

    /// <summary>
    /// 通过对外环坐标取平均，估算 Feature 的中心点（lon/lat）。
    /// geometry 缺失或无效时返回 null。
    /// </summary>
    public static (double lon, double lat)? TryGetFeatureCentroidLonLat(JsonObject feature)
    {
        try
        {
            var ring = ExtractLargestOuterRingLonLat(feature["geometry"]);
            if (ring.Count < 3) return null;
            var lon = ring.Average(p => p.lon);
            var lat = ring.Average(p => p.lat);
            if (!double.IsFinite(lon) || !double.IsFinite(lat)) return null;
            return (lon, lat);
        }
        catch
        {
            return null;
        }
    }
}
