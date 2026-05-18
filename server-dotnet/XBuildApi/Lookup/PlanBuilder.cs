using System.Diagnostics;
using System.Text.Json.Nodes;
using NetTopologySuite.Geometries;
using NetTopologySuite.Geometries.Utilities;
using NetTopologySuite.Geometries.Prepared;
using NetTopologySuite.Operation.Buffer;
using NetTopologySuite.Operation.Distance;
using NetTopologySuite.Precision;

namespace XBuildApi.Lookup;

/// <summary>
/// 从地块 geometry + 建筑轮廓数据构建前端可用的 plan。
/// 输出会统一到英尺坐标系，并对齐街道方向，计算 buildable zone 等衍生字段。
/// </summary>
public sealed class PlanBuilder
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly Microsoft.Extensions.Logging.ILogger<PlanBuilder> _logger;

    /// <summary>
    /// 创建 PlanBuilder。
    /// </summary>
    public PlanBuilder(IHttpClientFactory httpFactory, Microsoft.Extensions.Logging.ILogger<PlanBuilder> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
    }

    /// <summary>
    /// 构建前端使用的 plan（地块 polygon、structures、buildable zone 等）。
    /// </summary>
    /// <param name="parcelFeature">目标地块 GeoJSON Feature（JsonNode 形式）。</param>
    /// <param name="buildingsFc">目标地块建筑集合 GeoJSON FeatureCollection（JsonObject 形式）。</param>
    /// <param name="siteStreetName">地址解析得到的路名（用于匹配道路并推断朝向）。</param>
    /// <param name="frontSetbackFt">前院退尺（英尺）。</param>
    /// <param name="rearSetbackFt">后院退尺（英尺）。</param>
    /// <param name="sideSetbackFt">侧院退尺（英尺）。</param>
    /// <param name="houseSepFt">ADU 与主屋的最小分隔距离（英尺）。</param>
    /// <param name="requestAborted">取消/超时。</param>
    public async Task<LookupPlan?> BuildAsync(
        JsonNode parcelFeature,
        JsonObject buildingsFc,
        string? siteStreetName,
        double frontSetbackFt,
        double rearSetbackFt,
        double sideSetbackFt,
        double houseSepFt,
        CancellationToken requestAborted)
    {
        var geom = parcelFeature?["geometry"];
        var lotRing = GeoJsonUtils.ExtractOuterRingLonLat(geom);
        if (lotRing.Count < 4)
            throw new LookupProviderException(502, $"Parcel geometry 无法解析为 Polygon/MultiPolygon 外环：type={(geom?["type"]?.GetValue<string>() ?? "")}");

        var lotMerc = lotRing.Select(p => LonLatToMercator(p.lon, p.lat)).ToList();
        var cx = lotMerc.Average(p => p.x);
        var cy = lotMerc.Average(p => p.y);
        var lotRel = lotMerc.Select(p => (x: p.x - cx, y: p.y - cy)).ToList();

        var angleRad = 0d;
        var nearestRoad = await QueryNearestRoadSegment(lotRing.Average(p => p.lat), lotRing.Average(p => p.lon), cx, cy, siteStreetName, requestAborted);
        if (nearestRoad != null)
        {
            var dx = nearestRoad.Value.dx;
            var dy = nearestRoad.Value.dy;
            var len = Math.Sqrt(dx * dx + dy * dy);
            if (len > 1e-9)
            {
                var ux = dx / len;
                var uy = dy / len;

                var nx = -uy;
                var ny = ux;

                var vx = cx - nearestRoad.Value.closestX;
                var vy = cy - nearestRoad.Value.closestY;
                if (nx * vx + ny * vy < 0)
                {
                    nx = -nx;
                    ny = -ny;
                }

                angleRad = Math.PI / 2d - Math.Atan2(ny, nx);
            }
        }
        else
        {
            double maxLen2 = 0;
            double bestDx = 1, bestDy = 0;
            for (int i = 0; i < lotRel.Count; i++)
            {
                var p1 = lotRel[i];
                var p2 = lotRel[(i + 1) % lotRel.Count];
                var ldx = p2.x - p1.x;
                var ldy = p2.y - p1.y;
                var len2 = ldx * ldx + ldy * ldy;
                if (len2 > maxLen2)
                {
                    maxLen2 = len2;
                    bestDx = ldx;
                    bestDy = ldy;
                }
            }
            angleRad = -Math.Atan2(bestDy, bestDx) + Math.PI / 2;
        }

        var rotatedLot = lotRel.Select(p => Rotate(p.x, p.y, angleRad)).ToList();

        if (nearestRoad == null && buildingsFc["features"] is JsonArray bFeats && bFeats.Count > 0)
        {
            var hRing = GeoJsonUtils.ExtractLargestOuterRingLonLat(bFeats[0]?["geometry"]);
            if (hRing.Count >= 4)
            {
                var hPts = hRing
                    .Select(p => LonLatToMercator(p.lon, p.lat))
                    .Select(p => (x: p.x - cx, y: p.y - cy))
                    .Select(p => Rotate(p.x, p.y, angleRad))
                    .ToList();
                var hCenterY = hPts.Average(p => p.y);
                if (hCenterY < 0)
                {
                    angleRad += Math.PI;
                    rotatedLot = lotRel.Select(p => Rotate(p.x, p.y, angleRad)).ToList();
                }
            }
        }

        var ftPerM = 3.280839895013123;
        double minX = rotatedLot.Min(p => p.x);
        double maxX = rotatedLot.Max(p => p.x);
        double minY = rotatedLot.Min(p => p.y);
        double maxY = rotatedLot.Max(p => p.y);
        double widthFt = (maxX - minX) * ftPerM;
        double heightFt = (maxY - minY) * ftPerM;

        var lotPolygon = new List<FtPoint>();
        var lotPolyFt = new List<(double x, double y)>();
        foreach (var p in rotatedLot)
        {
            var xFt = (p.x - minX) * ftPerM;
            var yFt = (maxY - p.y) * ftPerM;
            lotPolygon.Add(new FtPoint { XFt = xFt, YFt = yFt });
            lotPolyFt.Add((xFt, yFt));
        }

        var gf = GeometryFactory.Default;
        static Polygon? ExtractLargestPolygon(Geometry geom)
        {
            if (geom.IsEmpty) return null;
            if (geom is Polygon p) return p;
            if (geom is MultiPolygon mp)
            {
                Polygon? best = null;
                var bestArea = 0d;
                for (var i = 0; i < mp.NumGeometries; i++)
                {
                    if (mp.GetGeometryN(i) is not Polygon cand) continue;
                    if (cand.Area > bestArea)
                    {
                        bestArea = cand.Area;
                        best = cand;
                    }
                }
                return best;
            }
            if (geom is GeometryCollection gc)
            {
                Polygon? best = null;
                var bestArea = 0d;
                for (var i = 0; i < gc.NumGeometries; i++)
                {
                    var cand = ExtractLargestPolygon(gc.GetGeometryN(i));
                    if (cand is null) continue;
                    if (cand.Area > bestArea)
                    {
                        bestArea = cand.Area;
                        best = cand;
                    }
                }
                return best;
            }
            return null;
        }

        static Polygon? TryCreatePolygon(GeometryFactory gf, IReadOnlyList<(double x, double y)> ring)
        {
            if (ring.Count < 3) return null;
            var last = ring[^1];
            var first = ring[0];
            var alreadyClosed = Math.Abs(last.x - first.x) < 1e-6 && Math.Abs(last.y - first.y) < 1e-6;
            var coords = new Coordinate[ring.Count + (alreadyClosed ? 0 : 1)];
            for (var i = 0; i < ring.Count; i++)
                coords[i] = new Coordinate(ring[i].x, ring[i].y);
            if (!alreadyClosed)
                coords[^1] = new Coordinate(first.x, first.y);
            if (coords.Length < 4) return null;
            var poly = gf.CreatePolygon(gf.CreateLinearRing(coords));
            if (!poly.IsValid)
            {
                var fixedGeom = poly.Buffer(0);
                return ExtractLargestPolygon(fixedGeom);
            }
            return poly;
        }

        static Polygon? TryCreatePolygonFromFtPoints(GeometryFactory gf, IReadOnlyList<FtPoint> ring)
        {
            if (ring.Count < 3) return null;
            var last = ring[^1];
            var first = ring[0];
            var alreadyClosed = Math.Abs(last.XFt - first.XFt) < 1e-6 && Math.Abs(last.YFt - first.YFt) < 1e-6;
            var coords = new Coordinate[ring.Count + (alreadyClosed ? 0 : 1)];
            for (var i = 0; i < ring.Count; i++)
                coords[i] = new Coordinate(ring[i].XFt, ring[i].YFt);
            if (!alreadyClosed)
                coords[^1] = new Coordinate(first.XFt, first.YFt);
            if (coords.Length < 4) return null;
            var poly = gf.CreatePolygon(gf.CreateLinearRing(coords));
            if (!poly.IsValid)
            {
                var fixedGeom = poly.Buffer(0);
                return ExtractLargestPolygon(fixedGeom);
            }
            return poly;
        }

        var lotPolyNts = TryCreatePolygon(gf, lotPolyFt);
        const double MinBuildingInsideRatio = 0.80;

        static string? InferStructureRoleHint(JsonObject? props)
        {
            string? GetStr(string key)
            {
                if (props is null) return null;
                if (props[key] is null) return null;
                var s = (props[key]?.ToString() ?? "").Trim().Trim('"');
                return string.IsNullOrWhiteSpace(s) ? null : s;
            }

            var building = (GetStr("building") ?? GetStr("BUILDING") ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(building))
            {
                var b = building.ToLowerInvariant();
                if (b.Contains("garage") || b.Contains("carport")) return "garage";
                if (b.Contains("house") || b.Contains("residential") || b.Contains("apartments") || b.Contains("dwelling") || b.Contains("detached")) return "house";
            }

            var desc = (GetStr("type") ?? GetStr("TYPE") ?? GetStr("use") ?? GetStr("USE") ?? GetStr("class") ?? GetStr("CLASS") ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(desc))
            {
                var d = desc.ToLowerInvariant();
                if (d.Contains("garage") || d.Contains("carport")) return "garage";
                if (d.Contains("house") || d.Contains("residential") || d.Contains("dwelling") || d.Contains("single") || d.Contains("multi")) return "house";
            }

            return null;
        }

        static int PickIndexByHint(List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)> list, Func<string, bool> match, int? excludeIndex = null)
        {
            var best = -1;
            var bestArea = -1d;
            for (var i = 0; i < list.Count; i++)
            {
                if (excludeIndex.HasValue && excludeIndex.Value == i) continue;
                var h = (list[i].hint ?? "").Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(h)) continue;
                if (!match(h)) continue;
                if (list[i].area > bestArea)
                {
                    bestArea = list[i].area;
                    best = i;
                }
            }
            return best;
        }

        var structures = new List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)>();
        var contextStructures = new List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)>();
        if (buildingsFc["features"] is JsonArray feats)
        {
            _logger.LogInformation("建筑轮廓输入 features={Count}", feats.Count);
            foreach (var f in feats)
            {
                var g = f?["geometry"];
                var ring = GeoJsonUtils.ExtractLargestOuterRingLonLat(g);
                if (ring.Count < 4) continue;

                var pts = ring
                    .Select(p => LonLatToMercator(p.lon, p.lat))
                    .Select(p => (x: p.x - cx, y: p.y - cy))
                    .Select(p => Rotate(p.x, p.y, angleRad))
                    .ToList();

                var bMinX = pts.Min(p => p.x);
                var bMaxX = pts.Max(p => p.x);
                var bMinY = pts.Min(p => p.y);
                var bMaxY = pts.Max(p => p.y);

                var cX = pts.Average(p => p.x);
                var cY = pts.Average(p => p.y);
                var cXFt = (cX - minX) * ftPerM;
                var cYFt = (maxY - cY) * ftPerM;
                var polyFt = new List<FtPoint>();
                foreach (var p in pts)
                {
                    var pxFt = (p.x - minX) * ftPerM;
                    var pyFt = (maxY - p.y) * ftPerM;
                    polyFt.Add(new FtPoint { XFt = pxFt, YFt = pyFt });
                }
                if (polyFt.Count > 1)
                {
                    var a0 = polyFt[0];
                    var a1 = polyFt[^1];
                    if (Math.Abs(a0.XFt - a1.XFt) < 1e-6 && Math.Abs(a0.YFt - a1.YFt) < 1e-6)
                        polyFt.RemoveAt(polyFt.Count - 1);
                }

                var centroidInside = PointInPolygon(lotPolyFt, cXFt, cYFt);
                var overlapRatio = 0d;
                var hasOverlapRatio = false;
                if (lotPolyNts is not null)
                {
                    try
                    {
                        var bPoly = TryCreatePolygonFromFtPoints(gf, polyFt);
                        if (bPoly is not null && bPoly.Area > 1e-6)
                        {
                            var interArea = bPoly.Intersection(lotPolyNts).Area;
                            overlapRatio = interArea / bPoly.Area;
                            hasOverlapRatio = true;
                        }
                    }
                    catch
                    {
                    }
                }
                var allVertsInside = polyFt.All(pp => PointInPolygon(lotPolyFt, pp.XFt, pp.YFt));
                var isOnParcel = centroidInside && (hasOverlapRatio ? overlapRatio >= MinBuildingInsideRatio : allVertsInside);

                var xFtRaw = (bMinX - minX) * ftPerM;
                var yFtRaw = (maxY - bMaxY) * ftPerM;
                var wFt = (bMaxX - bMinX) * ftPerM;
                var hFt = (bMaxY - bMinY) * ftPerM;
                var xFt = xFtRaw;
                var yFt = yFtRaw;

                var area = Math.Abs(PolygonArea(pts)) * ftPerM * ftPerM;
                var structure = new LookupStructure
                {
                    RectFt = new FtRect { XFt = xFt, YFt = yFt, WFt = wFt, HFt = hFt },
                    PolygonFt = polyFt,
                    AreaSqft = area
                };
                if (isOnParcel)
                {
                    var hint = InferStructureRoleHint(f?["properties"] as JsonObject);
                    structures.Add((area, structure, polyFt, hint));
                }
                else
                {
                    contextStructures.Add((area, structure, polyFt, null));
                }
            }
        }
        else
        {
            _logger.LogInformation("建筑轮廓输入 features=0");
        }

        if (contextStructures.Count > 20)
        {
            contextStructures.Sort((a, b) => b.area.CompareTo(a.area));
            contextStructures = contextStructures.Take(20).ToList();
        }

        static (double x, double y) RectCenter(FtRect r) => (r.XFt + r.WFt / 2d, r.YFt + r.HFt / 2d);
        static bool IsDuplicate((double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint) a, (double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint) b)
        {
            var (ax, ay) = RectCenter(a.structure.RectFt);
            var (bx, by) = RectCenter(b.structure.RectFt);
            if (Math.Abs(ax - bx) > 2.0) return false;
            if (Math.Abs(ay - by) > 2.0) return false;
            var maxA = Math.Max(1.0, Math.Max(a.area, b.area));
            if (Math.Abs(a.area - b.area) / maxA > 0.08) return false;
            return true;
        }

        if (structures.Count > 1)
        {
            var deduped = new List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)>();
            foreach (var s in structures)
            {
                var merged = false;
                for (var i = 0; i < deduped.Count; i++)
                {
                    if (!IsDuplicate(deduped[i], s)) continue;
                    var keep = deduped[i].area >= s.area ? deduped[i] : s;
                    var hint = !string.IsNullOrWhiteSpace(keep.hint) ? keep.hint : (!string.IsNullOrWhiteSpace(deduped[i].hint) ? deduped[i].hint : s.hint);
                    deduped[i] = (keep.area, keep.structure, keep.polygonFt, hint);
                    merged = true;
                    break;
                }
                if (!merged) deduped.Add(s);
            }
            structures = deduped;
        }

        static double RectArea(FtRect r) => Math.Max(0, r.WFt) * Math.Max(0, r.HFt);
        static double RectIntersectionArea(FtRect a, FtRect b)
        {
            var left = Math.Max(a.XFt, b.XFt);
            var right = Math.Min(a.XFt + a.WFt, b.XFt + b.WFt);
            var top = Math.Max(a.YFt, b.YFt);
            var bottom = Math.Min(a.YFt + a.HFt, b.YFt + b.HFt);
            var w = right - left;
            var h = bottom - top;
            if (w <= 0 || h <= 0) return 0;
            return w * h;
        }

        if (structures.Count > 1)
        {
            structures.Sort((a, b) => b.area.CompareTo(a.area));
            var nms = new List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)>();
            foreach (var s in structures)
            {
                var sRect = s.structure.RectFt;
                var sRectArea = RectArea(sRect);
                if (sRectArea <= 1e-6)
                {
                    nms.Add(s);
                    continue;
                }

                var skip = false;
                for (var i = 0; i < nms.Count; i++)
                {
                    var kRect = nms[i].structure.RectFt;
                    var kRectArea = RectArea(kRect);
                    if (kRectArea <= 1e-6) continue;
                    var inter = RectIntersectionArea(sRect, kRect);
                    if (inter <= 0) continue;

                    var overlapSmall = inter / Math.Min(sRectArea, kRectArea);
                    if (overlapSmall >= 0.75)
                    {
                        skip = true;
                        break;
                    }
                }

                if (!skip) nms.Add(s);
            }
            structures = nms;
        }

        structures.Sort((a, b) => b.area.CompareTo(a.area));
        var houseIdx = PickIndexByHint(structures, h => h == "house");
        if (houseIdx < 0)
        {
            for (var i = 0; i < structures.Count; i++)
            {
                if (structures[i].hint != "garage")
                {
                    houseIdx = i;
                    break;
                }
            }
            if (houseIdx < 0 && structures.Count > 0) houseIdx = 0;
        }

        var shouldFlip180 = false;
        if (nearestRoad != null)
        {
            var (roadRx, roadRy) = Rotate(nearestRoad.Value.closestX - cx, nearestRoad.Value.closestY - cy, angleRad);
            var roadYFt = (maxY - roadRy) * ftPerM;
            shouldFlip180 = roadYFt > heightFt / 2d;
        }
        else if (houseIdx >= 0 && houseIdx < structures.Count)
        {
            var houseRect = structures[houseIdx].structure.RectFt;
            var houseCy = houseRect.YFt + houseRect.HFt / 2d;
            shouldFlip180 = houseCy > heightFt / 2d;
        }

        if (shouldFlip180)
        {
            angleRad += Math.PI;

            lotPolygon = lotPolygon
                .Select(p => new FtPoint { XFt = widthFt - p.XFt, YFt = heightFt - p.YFt })
                .ToList();
            lotPolyFt = lotPolyFt
                .Select(p => (x: widthFt - p.x, y: heightFt - p.y))
                .ToList();

            var oldMinX = minX;
            var oldMaxX = maxX;
            var oldMinY = minY;
            var oldMaxY = maxY;
            minX = -oldMaxX;
            maxX = -oldMinX;
            minY = -oldMaxY;
            maxY = -oldMinY;

            static FtRect FlipRect180(FtRect r, double w, double h)
            {
                return new FtRect
                {
                    XFt = w - r.XFt - r.WFt,
                    YFt = h - r.YFt - r.HFt,
                    WFt = r.WFt,
                    HFt = r.HFt
                };
            }

            static List<FtPoint> FlipPoly180(List<FtPoint> poly, double w, double h)
            {
                var outPoly = new List<FtPoint>(poly.Count);
                for (var i = 0; i < poly.Count; i++)
                    outPoly.Add(new FtPoint { XFt = w - poly[i].XFt, YFt = h - poly[i].YFt });
                return outPoly;
            }

            var flipped = new List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)>(structures.Count);
            for (var i = 0; i < structures.Count; i++)
            {
                var poly = FlipPoly180(structures[i].polygonFt, widthFt, heightFt);
                var old = structures[i].structure;
                var s = new LookupStructure
                {
                    RectFt = FlipRect180(old.RectFt, widthFt, heightFt),
                    PolygonFt = poly,
                    AreaSqft = old.AreaSqft
                };
                flipped.Add((structures[i].area, s, poly, structures[i].hint));
            }
            structures = flipped;

            var flippedCtx = new List<(double area, LookupStructure structure, List<FtPoint> polygonFt, string? hint)>(contextStructures.Count);
            for (var i = 0; i < contextStructures.Count; i++)
            {
                var poly = FlipPoly180(contextStructures[i].polygonFt, widthFt, heightFt);
                var old = contextStructures[i].structure;
                var s = new LookupStructure
                {
                    RectFt = FlipRect180(old.RectFt, widthFt, heightFt),
                    PolygonFt = poly,
                    AreaSqft = old.AreaSqft
                };
                flippedCtx.Add((contextStructures[i].area, s, poly, contextStructures[i].hint));
            }
            contextStructures = flippedCtx;
        }

        var garageIdx = PickIndexByHint(structures, h => h == "garage", houseIdx);
        if (garageIdx < 0 && houseIdx >= 0 && houseIdx < structures.Count)
        {
            var houseArea = structures[houseIdx].area;
            var houseRect = structures[houseIdx].structure.RectFt;
            var houseCy = houseRect.YFt + houseRect.HFt / 2d;
            var best = -1;
            var bestGarageArea = -1d;
            for (var i = 0; i < structures.Count; i++)
            {
                if (i == houseIdx) continue;
                var a = structures[i].area;
                if (a <= 0) continue;
                if (houseArea > 0 && a > houseArea * 0.85) continue;
                var r = structures[i].structure.RectFt;
                var candCy = r.YFt + r.HFt / 2d;
                if (candCy <= houseCy + 1.0) continue;
                if (a > bestGarageArea)
                {
                    bestGarageArea = a;
                    best = i;
                }
            }
            if (best >= 0)
            {
                garageIdx = best;
            }
            else
            {
                best = -1;
                bestGarageArea = -1d;
                for (var i = 0; i < structures.Count; i++)
                {
                    if (i == houseIdx) continue;
                    var a = structures[i].area;
                    if (a <= 0) continue;
                    if (houseArea > 0 && a > houseArea * 0.85) continue;
                    if (a > bestGarageArea)
                    {
                        bestGarageArea = a;
                        best = i;
                    }
                }
                garageIdx = best;
            }
        }

        if (houseIdx >= 0 && garageIdx >= 0 && houseIdx < structures.Count && garageIdx < structures.Count)
        {
            var houseRect = structures[houseIdx].structure.RectFt;
            var garageRect = structures[garageIdx].structure.RectFt;
            var houseA = RectArea(houseRect);
            var garageA = RectArea(garageRect);
            if (houseA > 1e-6 && garageA > 1e-6)
            {
                var inter = RectIntersectionArea(houseRect, garageRect);
                if (inter / Math.Min(houseA, garageA) >= 0.75)
                    garageIdx = -1;
            }
        }

        var drivewayGarageIdx = garageIdx;
        if (drivewayGarageIdx < 0 && houseIdx >= 0 && houseIdx < structures.Count)
        {
            var best = -1;
            var bestCy = double.NegativeInfinity;
            for (var i = 0; i < structures.Count; i++)
            {
                if (i == houseIdx) continue;
                var r = structures[i].structure.RectFt;
                var candCy = r.YFt + r.HFt / 2d;
                if (!double.IsFinite(candCy)) continue;
                if (candCy > bestCy)
                {
                    bestCy = candCy;
                    best = i;
                }
            }
            if (best >= 0) drivewayGarageIdx = best;
        }

        var structuresOut = new List<LookupStructure>();
        for (var i = 0; i < structures.Count; i++)
        {
            var src = structures[i].structure;
            var role = i == houseIdx ? "house" : (i == garageIdx ? "garage" : null);
            structuresOut.Add(new LookupStructure
            {
                Role = role,
                RectFt = src.RectFt,
                PolygonFt = src.PolygonFt ?? structures[i].polygonFt,
                AreaSqft = src.AreaSqft
            });
        }
        var structuresCount = structures.Count;
        for (var i = 0; i < contextStructures.Count; i++)
        {
            var src = contextStructures[i].structure;
            structuresOut.Add(new LookupStructure
            {
                Role = null,
                RectFt = src.RectFt,
                PolygonFt = src.PolygonFt ?? contextStructures[i].polygonFt,
                AreaSqft = src.AreaSqft
            });
        }

        var allowedLeft = sideSetbackFt;
        var allowedRight = widthFt - sideSetbackFt;
        var allowedTop = frontSetbackFt;
        var allowedBottom = heightFt - rearSetbackFt;

        if (allowedRight < allowedLeft)
            return new LookupPlan
            {
                Unit = "ft",
                RotationDeg = angleRad * 180d / Math.PI,
                Lot = new LookupLot { WidthFt = widthFt, HeightFt = heightFt, Polygon = lotPolygon },
                Structures = structuresOut,
                StructuresCount = structuresCount,
                BuildableZone = new FtRect { XFt = 0, YFt = 0, WFt = 0, HFt = 0 },
                Module = new LookupModule { WFt = 16.0, HFt = 37.5 },
                ModuleFits = new List<LookupModuleFit>
                {
                    new LookupModuleFit { WFt = 16.0, HFt = 37.5, CanFit = false },
                },
                MeasureLines = new List<LookupMeasureLine>(),
                Transform = new LookupPlanTransform
                {
                    CenterMercX = cx,
                    CenterMercY = cy,
                    MinRotX = minX,
                    MaxRotY = maxY,
                    AngleRad = angleRad
                },
                CanFitAdu = false
            };

        allowedTop = Math.Clamp(allowedTop, 0, heightFt);
        allowedBottom = Math.Clamp(allowedBottom, 0, heightFt);
        if (allowedBottom <= allowedTop)
            return new LookupPlan
            {
                Unit = "ft",
                RotationDeg = angleRad * 180d / Math.PI,
                Lot = new LookupLot { WidthFt = widthFt, HeightFt = heightFt, Polygon = lotPolygon },
                Structures = structuresOut,
                StructuresCount = structuresCount,
                BuildableZone = new FtRect { XFt = 0, YFt = 0, WFt = 0, HFt = 0 },
                Module = new LookupModule { WFt = 16.0, HFt = 37.5 },
                ModuleFits = new List<LookupModuleFit>
                {
                    new LookupModuleFit { WFt = 16.0, HFt = 37.5, CanFit = false },
                },
                MeasureLines = new List<LookupMeasureLine>(),
                Transform = new LookupPlanTransform
                {
                    CenterMercX = cx,
                    CenterMercY = cy,
                    MinRotX = minX,
                    MaxRotY = maxY,
                    AngleRad = angleRad
                },
                CanFitAdu = false
            };

        var measureLines = new List<LookupMeasureLine>();
        var obstacles = structures.Take(12).Select(s => s.structure.RectFt).ToList();
        var obstaclePolygons = structures.Take(12).Select(s => s.polygonFt).Where(p => p.Count >= 3).ToList();
        var obstaclesWithKind = new List<(string kind, List<FtPoint> polygonFt)>();
        for (var i = 0; i < structures.Count && i < 12; i++)
        {
            var poly = structures[i].polygonFt;
            if (poly.Count < 3) continue;
            var kind = i == houseIdx ? "house" : (i == garageIdx ? "garage" : "structure");
            obstaclesWithKind.Add((kind, poly));
        }

        {
            if (obstacles.Count > 0)
            {
                var minLeftFt = double.PositiveInfinity;
                var maxRightFt = double.NegativeInfinity;
                var minTopFt = double.PositiveInfinity;
                var maxBottomFt = double.NegativeInfinity;
                for (var i = 0; i < obstacles.Count; i++)
                {
                    var r = obstacles[i];
                    if (double.IsFinite(r.YFt)) minTopFt = Math.Min(minTopFt, r.YFt);
                    var bottom = r.YFt + r.HFt;
                    if (!double.IsFinite(bottom)) continue;
                    if (bottom > maxBottomFt) maxBottomFt = bottom;
                }

                if (houseIdx >= 0 && houseIdx < obstacles.Count)
                {
                    var hr = obstacles[houseIdx];
                    if (double.IsFinite(hr.XFt)) minLeftFt = Math.Min(minLeftFt, hr.XFt);
                    var right = hr.XFt + hr.WFt;
                    if (double.IsFinite(right)) maxRightFt = Math.Max(maxRightFt, right);
                }

                {
                    var changed = false;

                    var hasFrontSetbackFt = double.IsFinite(frontSetbackFt) && frontSetbackFt > 0;
                    if (hasFrontSetbackFt && double.IsFinite(minTopFt) && minTopFt < allowedTop - 1e-6)
                    {
                        var newAllowedTop = Math.Floor(minTopFt);
                        newAllowedTop = Math.Clamp(newAllowedTop, 0, heightFt);
                        if (newAllowedTop < allowedTop - 1e-6)
                        {
                            allowedTop = newAllowedTop;
                            changed = true;
                        }
                    }

                    if (double.IsFinite(minLeftFt) && minLeftFt < allowedLeft - 1e-6)
                    {
                        var newAllowedLeft = Math.Floor(minLeftFt);
                        newAllowedLeft = Math.Clamp(newAllowedLeft, 0, widthFt);
                        if (newAllowedLeft < allowedLeft - 1e-6)
                        {
                            allowedLeft = newAllowedLeft;
                            changed = true;
                        }
                    }

                    if (double.IsFinite(maxRightFt) && maxRightFt > allowedRight + 1e-6)
                    {
                        var newAllowedRight = Math.Ceiling(maxRightFt);
                        newAllowedRight = Math.Clamp(newAllowedRight, 0, widthFt);
                        if (newAllowedRight > allowedRight + 1e-6)
                        {
                            allowedRight = newAllowedRight;
                            changed = true;
                        }
                    }

                    var hasRearSetbackFt = double.IsFinite(rearSetbackFt) && rearSetbackFt > 0;
                    if (hasRearSetbackFt && double.IsFinite(maxBottomFt))
                    {
                        var rearSetbackLineFt = heightFt - rearSetbackFt;
                        if (maxBottomFt > rearSetbackLineFt + 1e-6)
                        {
                            var newAllowedBottom = Math.Ceiling(maxBottomFt);
                            newAllowedBottom = Math.Clamp(newAllowedBottom, 0, heightFt);
                            if (newAllowedBottom > allowedBottom + 1e-6)
                            {
                                allowedBottom = newAllowedBottom;
                                changed = true;
                            }
                        }
                    }

                    if (changed)
                    {
                        _logger.LogInformation(
                            "Setbacks overridden by existing structures (side uses house only). allowedLeft={AllowedLeft:0.###} allowedRight={AllowedRight:0.###} allowedTop={AllowedTop:0.###} allowedBottom={AllowedBottom:0.###} minLeft={MinLeft:0.###} maxRight={MaxRight:0.###} minTop={MinTop:0.###} maxBottom={MaxBottom:0.###}",
                            allowedLeft,
                            allowedRight,
                            allowedTop,
                            allowedBottom,
                            double.IsFinite(minLeftFt) ? minLeftFt : -1d,
                            double.IsFinite(maxRightFt) ? maxRightFt : -1d,
                            double.IsFinite(minTopFt) ? minTopFt : -1d,
                            double.IsFinite(maxBottomFt) ? maxBottomFt : -1d);
                    }
                }
            }
        }
        _logger.LogInformation("可建区域输入统计 structures={StructuresCount} obstaclePolygons={ObstaclePolygonsCount}", structures.Count, obstaclePolygons.Count);
        if (drivewayGarageIdx >= 0 && drivewayGarageIdx < structures.Count)
        {
            // 将 plan 英尺坐标系中的 FtPoint ring 转为 NTS Polygon。
            // 用于在“车库通道”计算中，把地块/建筑轮廓视为可做差集与 buffer 的几何对象。
            Polygon? TryCreatePolygonFromFtPointsDriveway(GeometryFactory gf, IReadOnlyList<FtPoint> ring)
            {
                if (ring.Count < 3) return null;
                var coords = new List<Coordinate>(ring.Count + 1);
                foreach (var p in ring)
                {
                    if (!double.IsFinite(p.XFt) || !double.IsFinite(p.YFt)) continue;
                    coords.Add(new Coordinate(p.XFt, p.YFt));
                }
                if (coords.Count < 3) return null;
                if (!coords[0].Equals2D(coords[^1])) coords.Add(new Coordinate(coords[0]));
                if (coords.Count < 4) return null;
                var poly = gf.CreatePolygon(gf.CreateLinearRing(coords.ToArray()));
                if (poly.IsValid) return poly;
                var fixedGeom = poly.Buffer(0);
                return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
            }

            // 计算“车库到前院带”的 10ft 连续通道（允许曲线）：
            // - 先在 freeSpace（地块减去建筑障碍）上做 5ft 的内缩（保证 10ft 宽能通过）
            // - 再在内缩后的可通行域上用网格 A* 搜索连通路径
            // - 最后对路径做 5ft buffer 得到走廊 polygon，并裁剪回地块内
            List<FtPoint>? TryComputeDrivewayCorridorPolygonFt()
            {
                List<FtPoint>? TryAt(double halfW)
                {
                    var gf = GeometryFactory.Default;
                    var lotRing = lotPolyFt.Select(p => new FtPoint { XFt = p.x, YFt = p.y }).ToList();
                    var lotPoly = TryCreatePolygonFromFtPointsDriveway(gf, lotRing);
                    if (lotPoly is null || lotPoly.IsEmpty) return null;

                    var obsPolys = new List<Geometry>();
                    foreach (var (kind, polyFt) in obstaclesWithKind)
                    {
                        if (string.Equals(kind, "driveway", StringComparison.OrdinalIgnoreCase)) continue;
                        var p0 = TryCreatePolygonFromFtPointsDriveway(gf, polyFt);
                        if (p0 is null || p0.IsEmpty) continue;
                        obsPolys.Add(p0);
                    }
                    var obstaclesUnion = obsPolys.Count == 0 ? null : gf.CreateGeometryCollection(obsPolys.ToArray()).Union();
                    var freeSpace = obstaclesUnion is null ? (Geometry)lotPoly : lotPoly.Difference(obstaclesUnion);
                    if (!freeSpace.IsValid) freeSpace = freeSpace.Buffer(0);
                    if (freeSpace.IsEmpty) return null;

                    var bufferParams = new BufferParameters
                    {
                        JoinStyle = JoinStyle.Mitre,
                        EndCapStyle = EndCapStyle.Square,
                        QuadrantSegments = 1,
                        MitreLimit = 50d
                    };
                    var freeEroded = BufferOp.Buffer(freeSpace, -halfW, bufferParams);
                    if (freeEroded is null || freeEroded.IsEmpty) return null;

                    var garagePolyFt = structures[drivewayGarageIdx].polygonFt;
                    var garagePoly = TryCreatePolygonFromFtPointsDriveway(gf, garagePolyFt);
                    if (garagePoly is null || garagePoly.IsEmpty) return null;

                    var goalBandH = Math.Max(2d, halfW);
                    var goalY0 = allowedTop;
                    var goalY1 = Math.Min(allowedBottom, allowedTop + goalBandH);
                    if (goalY1 <= goalY0 + 1e-6) return null;
                    var frontGoalBand = gf.ToGeometry(new Envelope(0, widthFt, goalY0, goalY1));
                    var targetRegion = freeEroded.Intersection(frontGoalBand);
                    if (!targetRegion.IsValid) targetRegion = targetRegion.Buffer(0);
                    if (targetRegion.IsEmpty) return null;

                    var env = freeEroded.EnvelopeInternal;
                    var step = 1d;
                    var nx = Math.Max(2, (int)Math.Ceiling((env.MaxX - env.MinX) / step) + 1);
                    var ny = Math.Max(2, (int)Math.Ceiling((env.MaxY - env.MinY) / step) + 1);
                    if (nx * ny > 200_000) return null;

                    var inside = new bool[nx * ny];
                    var allowedBand = gf.ToGeometry(new Envelope(allowedLeft, allowedRight, allowedTop, allowedBottom));
                    var inAllowed = new bool[nx * ny];
                    var lotBoundary = lotPoly.Boundary;
                    var distToLotEdgeFt = new double[nx * ny];
                    for (var iy = 0; iy < ny; iy++)
                    {
                        var y = env.MinY + iy * step;
                        for (var ix = 0; ix < nx; ix++)
                        {
                            var x = env.MinX + ix * step;
                            var pt = gf.CreatePoint(new Coordinate(x, y));
                            var idx = ix + iy * nx;
                            if (freeEroded.Covers(pt))
                            {
                                inside[idx] = true;
                                distToLotEdgeFt[idx] = lotBoundary.Distance(pt);
                            }
                            if (allowedBand.Covers(pt)) inAllowed[idx] = true;
                        }
                    }

                int FindNearestInside(Coordinate c)
                {
                    var ix0 = (int)Math.Round((c.X - env.MinX) / step);
                    var iy0 = (int)Math.Round((c.Y - env.MinY) / step);
                    ix0 = Math.Clamp(ix0, 0, nx - 1);
                    iy0 = Math.Clamp(iy0, 0, ny - 1);
                    var bestIdx = -1;
                    var bestDist2 = double.PositiveInfinity;

                    void TryPick(int ix, int iy)
                    {
                        if (ix < 0 || ix >= nx || iy < 0 || iy >= ny) return;
                        var idx = ix + iy * nx;
                        if (!inside[idx]) return;
                        var x = env.MinX + ix * step;
                        var y = env.MinY + iy * step;
                        var dx = x - c.X;
                        var dy = y - c.Y;
                        var d2 = dx * dx + dy * dy;
                        if (d2 < bestDist2)
                        {
                            bestDist2 = d2;
                            bestIdx = idx;
                        }
                    }

                    var maxR = Math.Max(nx, ny);
                    for (var r = 0; r <= maxR; r++)
                    {
                        if (r == 0)
                        {
                            TryPick(ix0, iy0);
                        }
                        else
                        {
                            var yTop = iy0 - r;
                            var yBot = iy0 + r;
                            for (var dx = -r; dx <= r; dx++)
                            {
                                var x = ix0 + dx;
                                TryPick(x, yTop);
                                TryPick(x, yBot);
                            }

                            var xLeft = ix0 - r;
                            var xRight = ix0 + r;
                            for (var dy = -r + 1; dy <= r - 1; dy++)
                            {
                                var y = iy0 + dy;
                                TryPick(xLeft, y);
                                TryPick(xRight, y);
                            }
                        }

                        if (bestIdx >= 0)
                        {
                            var nextR = (r + 1) * step;
                            if (bestDist2 <= nextR * nextR) break;
                        }
                    }

                    return bestIdx;
                }

                static Geometry? ClipX(Geometry g, double x0, double x1, double y0, double y1, GeometryFactory gf)
                {
                    var clip = gf.ToGeometry(new Envelope(x0, x1, y0, y1));
                    var r = g.Intersection(clip);
                    if (!r.IsValid) r = r.Buffer(0);
                    return r.IsEmpty ? null : r;
                }

                var midX = widthFt / 2d;

                var startCandidates = new List<(Coordinate coord, bool isLeft, double sideDistFt)>();
                var garageEnv = garagePoly.EnvelopeInternal;
                var exitBand = Math.Max(10d, halfW * 2d);

                Geometry? leftExit = null;
                Geometry? rightExit = null;

                if (garageEnv.MinX > 0 + 1e-6)
                {
                    var x0 = Math.Max(0d, garageEnv.MinX - exitBand);
                    var x1 = Math.Min(widthFt, garageEnv.MinX);
                    if (x1 > x0 + 1e-6)
                        leftExit = freeEroded.Intersection(gf.ToGeometry(new Envelope(x0, x1, garageEnv.MinY, garageEnv.MaxY)));
                }
                if (garageEnv.MaxX < widthFt - 1e-6)
                {
                    var x0 = Math.Max(0d, garageEnv.MaxX);
                    var x1 = Math.Min(widthFt, garageEnv.MaxX + exitBand);
                    if (x1 > x0 + 1e-6)
                        rightExit = freeEroded.Intersection(gf.ToGeometry(new Envelope(x0, x1, garageEnv.MinY, garageEnv.MaxY)));
                }

                if (leftExit is not null && !leftExit.IsEmpty)
                {
                    if (!leftExit.IsValid) leftExit = leftExit.Buffer(0);
                    if (!leftExit.IsEmpty)
                    {
                        var nearOnFree = DistanceOp.NearestPoints(garagePoly, leftExit)[1];
                        var d = garagePoly.Distance(gf.CreatePoint(nearOnFree));
                        var midY = (garageEnv.MinY + garageEnv.MaxY) / 2d;
                        var start = new Coordinate(Math.Max(0d, garageEnv.MinX - halfW), midY);
                        startCandidates.Add((start, true, d));
                    }
                }
                if (rightExit is not null && !rightExit.IsEmpty)
                {
                    if (!rightExit.IsValid) rightExit = rightExit.Buffer(0);
                    if (!rightExit.IsEmpty)
                    {
                        var nearOnFree = DistanceOp.NearestPoints(garagePoly, rightExit)[1];
                        var d = garagePoly.Distance(gf.CreatePoint(nearOnFree));
                        var midY = (garageEnv.MinY + garageEnv.MaxY) / 2d;
                        var start = new Coordinate(Math.Min(widthFt, garageEnv.MaxX + halfW), midY);
                        startCandidates.Add((start, false, d));
                    }
                }

                if (startCandidates.Count == 0)
                {
                    var leftFree = ClipX(freeEroded, 0, midX, env.MinY, env.MaxY, gf);
                    var rightFree = ClipX(freeEroded, midX, widthFt, env.MinY, env.MaxY, gf);
                    if (leftFree is not null)
                    {
                        var nearOnFree = DistanceOp.NearestPoints(garagePoly, leftFree)[1];
                        var d = garagePoly.Distance(gf.CreatePoint(nearOnFree));
                        var midY = (garageEnv.MinY + garageEnv.MaxY) / 2d;
                        var start = new Coordinate(Math.Max(0d, garageEnv.MinX - halfW), midY);
                        startCandidates.Add((start, true, d));
                    }
                    if (rightFree is not null)
                    {
                        var nearOnFree = DistanceOp.NearestPoints(garagePoly, rightFree)[1];
                        var d = garagePoly.Distance(gf.CreatePoint(nearOnFree));
                        var midY = (garageEnv.MinY + garageEnv.MaxY) / 2d;
                        var start = new Coordinate(Math.Min(widthFt, garageEnv.MaxX + halfW), midY);
                        startCandidates.Add((start, false, d));
                    }
                    if (startCandidates.Count == 0)
                    {
                        var nearOnFree = DistanceOp.NearestPoints(garagePoly, freeEroded)[1];
                        var d = garagePoly.Distance(gf.CreatePoint(nearOnFree));
                        var isLeft = garagePoly.Centroid.X < midX;
                        var midY = (garageEnv.MinY + garageEnv.MaxY) / 2d;
                        var start = isLeft
                            ? new Coordinate(Math.Max(0d, garageEnv.MinX - halfW), midY)
                            : new Coordinate(Math.Min(widthFt, garageEnv.MaxX + halfW), midY);
                        startCandidates.Add((start, isLeft, d));
                    }
                }

                var leftTarget = ClipX(targetRegion, 0, midX, goalY0, goalY1, gf);
                var rightTarget = ClipX(targetRegion, midX, widthFt, goalY0, goalY1, gf);
                var goalYc = (goalY0 + goalY1) / 2d;
                var preferRightExit = false;
                if (startCandidates.Count >= 2)
                {
                    var leftD = startCandidates.Where(c => c.isLeft).Select(c => c.sideDistFt).DefaultIfEmpty(double.PositiveInfinity).Min();
                    var rightD = startCandidates.Where(c => !c.isLeft).Select(c => c.sideDistFt).DefaultIfEmpty(double.PositiveInfinity).Min();
                    if (double.IsFinite(leftD) && double.IsFinite(rightD))
                        preferRightExit = rightD + 1.5 < leftD;
                }

                var allowedPenalty = 6d;
                var edgePenaltyPerFt = 0.25d;
                var edgePenaltyMaxFt = 40d;
                var turnPenalty = 2.0d;

                (List<int> path, double cost)? TryFindPath(int start, int goal, int nx, int ny, double step)
                {
                    var goalX = goal % nx;
                    var goalY = goal / nx;

                    double HeuristicToGoal(int idx)
                    {
                        var ax = idx % nx;
                        var ay = idx / nx;
                        var dx0 = (ax - goalX) * step;
                        var dy0 = (ay - goalY) * step;
                        return Math.Sqrt(dx0 * dx0 + dy0 * dy0);
                    }

                    var open = new PriorityQueue<int, double>();
                    var cameFromState = new int[nx * ny * 4];
                    Array.Fill(cameFromState, -1);
                    var gScore = new double[nx * ny * 4];
                    Array.Fill(gScore, double.PositiveInfinity);

                    static int State(int idx, int dir) => idx * 4 + dir;
                    static int IdxOfState(int s) => s / 4;
                    static int DirOfState(int s) => s % 4;

                    var dirs = new (int dx, int dy)[]
                    {
                        (1, 0),
                        (-1, 0),
                        (0, 1),
                        (0, -1)
                    };

                    for (var d = 0; d < 4; d++)
                    {
                        var s0 = State(start, d);
                        gScore[s0] = 0;
                        open.Enqueue(s0, HeuristicToGoal(start));
                    }

                    while (open.Count > 0)
                    {
                        var currentState = open.Dequeue();
                        var currentIdx = IdxOfState(currentState);
                        var currentDir = DirOfState(currentState);
                        if (currentIdx == goal) break;
                        var cx0 = currentIdx % nx;
                        var cy0 = currentIdx / nx;
                        var baseG = gScore[currentState];
                        for (var i = 0; i < dirs.Length; i++)
                        {
                            var nx0 = cx0 + dirs[i].dx;
                            var ny0 = cy0 + dirs[i].dy;
                            if (nx0 < 0 || nx0 >= nx || ny0 < 0 || ny0 >= ny) continue;
                            var ni = nx0 + ny0 * nx;
                            if (!inside[ni]) continue;
                            var penalty = inAllowed[ni] ? allowedPenalty : 0d;
                            var edgePenalty = Math.Min(edgePenaltyMaxFt, distToLotEdgeFt[ni]) * edgePenaltyPerFt;
                            var turn = i == currentDir ? 0d : turnPenalty;
                            var tentative = baseG + (1d * step) + penalty + edgePenalty + turn;
                            var nextState = State(ni, i);
                            if (tentative >= gScore[nextState]) continue;
                            cameFromState[nextState] = currentState;
                            gScore[nextState] = tentative;
                            open.Enqueue(nextState, tentative + HeuristicToGoal(ni));
                        }
                    }

                    var bestGoalState = -1;
                    var bestGoalCost = double.PositiveInfinity;
                    for (var d = 0; d < 4; d++)
                    {
                        var s = State(goal, d);
                        if (gScore[s] < bestGoalCost)
                        {
                            bestGoalCost = gScore[s];
                            bestGoalState = s;
                        }
                    }
                    if (bestGoalState < 0 || !double.IsFinite(bestGoalCost) || bestGoalCost == double.PositiveInfinity) return null;

                    var pathIdx = new List<int>();
                    var curState = bestGoalState;
                    pathIdx.Add(IdxOfState(curState));
                    while (IdxOfState(curState) != start)
                    {
                        curState = cameFromState[curState];
                        if (curState < 0) break;
                        pathIdx.Add(IdxOfState(curState));
                    }
                    if (pathIdx.Count < 2) return null;
                    pathIdx.Reverse();
                    return (pathIdx, bestGoalCost);
                }

                List<int>? bestPath = null;
                var bestCost = double.PositiveInfinity;
                var bestPairAligned = false;
                Coordinate? bestStartCoord = null;
                Coordinate? bestGoalCoord = null;
                var bestStartIsLeft = false;
                foreach (var (sCoord, sLeft, _) in startCandidates)
                {
                    var sidePenalty = preferRightExit ? (sLeft ? 80d : 0d) : 0d;
                    var sIdx = FindNearestInside(sCoord);
                    if (sIdx < 0) continue;

                    Geometry? gGeom = sLeft ? leftTarget : rightTarget;
                    var gLeft = sLeft;
                    if (gGeom is null)
                    {
                        gGeom = sLeft ? rightTarget : leftTarget;
                        gLeft = !sLeft;
                    }
                    if (gGeom is null) gGeom = targetRegion;

                    var goalX = Math.Clamp(sCoord.X, Math.Clamp(allowedLeft + halfW, 0, widthFt), Math.Clamp(allowedRight - halfW, 0, widthFt));
                    var gCoord = DistanceOp.NearestPoints(gf.CreatePoint(new Coordinate(goalX, goalYc)), gGeom)[1];

                    {
                        var gIdx = FindNearestInside(gCoord);
                        if (gIdx < 0) continue;
                        var r = TryFindPath(sIdx, gIdx, nx, ny, step);
                        if (r is null) continue;
                        var aligned = sLeft == gLeft;
                        var totalCost = r.Value.cost + sidePenalty;
                        if (totalCost < bestCost - 1e-6 || (Math.Abs(totalCost - bestCost) <= 1e-6 && aligned && !bestPairAligned))
                        {
                            bestCost = totalCost;
                            bestPath = r.Value.path;
                            bestPairAligned = aligned;
                            bestStartCoord = sCoord;
                            bestGoalCoord = gCoord;
                            bestStartIsLeft = sLeft;
                        }
                    }
                }
                if (bestPath is null) return null;

                var coordsPath = new Coordinate[bestPath.Count];
                for (var i = 0; i < bestPath.Count; i++)
                {
                    var idx = bestPath[i];
                    var ix = idx % nx;
                    var iy = idx / nx;
                    coordsPath[i] = new Coordinate(env.MinX + ix * step, env.MinY + iy * step);
                }
                if (bestStartCoord is not null) coordsPath[0] = bestStartCoord;
                if (bestGoalCoord is not null) coordsPath[^1] = bestGoalCoord;
                Array.Reverse(coordsPath);

                (Coordinate a, Coordinate b)? TryPickGarageExitEdge(bool isLeft)
                {
                    var ring = garagePoly.ExteriorRing.Coordinates;
                    if (ring.Length < 4) return null;
                    var n = ring.Length - 1;
                    var bestDist = double.PositiveInfinity;
                    var bestLen = -1d;
                    (Coordinate a, Coordinate b)? best = null;
                    for (var i = 0; i < n; i++)
                    {
                        var a0 = ring[i];
                        var b0 = ring[(i + 1) % n];
                        var len = a0.Distance(b0);
                        if (!double.IsFinite(len) || len < 1e-6) continue;
                        var midX0 = (a0.X + b0.X) / 2d;
                        var dist = isLeft ? Math.Abs(midX0 - garageEnv.MinX) : Math.Abs(midX0 - garageEnv.MaxX);
                        if (dist < bestDist - 1e-6 || (Math.Abs(dist - bestDist) <= 1e-6 && len > bestLen))
                        {
                            bestDist = dist;
                            bestLen = len;
                            best = (a0, b0);
                        }
                    }
                    return best;
                }

                (double tx, double ty, double nx, double ny)? TryGetExitFrame(Coordinate a, Coordinate b)
                {
                    var vx = b.X - a.X;
                    var vy = b.Y - a.Y;
                    var nLen = Math.Sqrt(vx * vx + vy * vy);
                    if (nLen < 1e-9) return null;

                    var tx0 = vx / nLen;
                    var ty0 = vy / nLen;
                    var nx0 = -vy / nLen;
                    var ny0 = vx / nLen;
                    var mid = new Coordinate((a.X + b.X) / 2d, (a.Y + b.Y) / 2d);
                    var test = gf.CreatePoint(new Coordinate(mid.X + nx0 * 0.25, mid.Y + ny0 * 0.25));
                    if (garagePoly.Covers(test))
                    {
                        nx0 = -nx0;
                        ny0 = -ny0;
                    }
                    return (tx0, ty0, nx0, ny0);
                }

                Geometry MakeExitHalfPlaneClip(Coordinate a, Coordinate b)
                {
                    var f = TryGetExitFrame(a, b);
                    if (f is null)
                        return gf.ToGeometry(new Envelope(env.MinX - 1, env.MaxX + 1, env.MinY - 1, env.MaxY + 1));

                    var tx0 = f.Value.tx;
                    var ty0 = f.Value.ty;
                    var nx0 = f.Value.nx;
                    var ny0 = f.Value.ny;
                    var mid = new Coordinate((a.X + b.X) / 2d, (a.Y + b.Y) / 2d);

                    var ext = Math.Max(lotPoly.EnvelopeInternal.Width, lotPoly.EnvelopeInternal.Height) * 5d + 50d;
                    var insidePad = 1e-3;
                    var p1 = new Coordinate(mid.X - tx0 * ext - nx0 * insidePad, mid.Y - ty0 * ext - ny0 * insidePad);
                    var p2 = new Coordinate(mid.X + tx0 * ext - nx0 * insidePad, mid.Y + ty0 * ext - ny0 * insidePad);
                    var p3 = new Coordinate(mid.X + tx0 * ext + nx0 * ext, mid.Y + ty0 * ext + ny0 * ext);
                    var p4 = new Coordinate(mid.X - tx0 * ext + nx0 * ext, mid.Y - ty0 * ext + ny0 * ext);
                    return gf.CreatePolygon(new[] { p1, p2, p3, p4, p1 });
                }

                var line = gf.CreateLineString(coordsPath);
                var exitEdge = TryPickGarageExitEdge(bestStartIsLeft);
                var frontWiden = freeSpace.Intersection(frontGoalBand);
                if (!frontWiden.IsValid) frontWiden = frontWiden.Buffer(0);
                if (frontWiden.IsEmpty) frontWiden = null;

                Geometry BuildCorridor(double hw)
                {
                    var corridor0 = BufferOp.Buffer(line, hw, bufferParams);
                    if (!corridor0.IsValid) corridor0 = corridor0.Buffer(0);
                    if (corridor0.IsEmpty) return corridor0;

                    if (exitEdge is not null)
                    {
                        var clip = MakeExitHalfPlaneClip(exitEdge.Value.a, exitEdge.Value.b);
                        corridor0 = corridor0.Intersection(clip);
                        if (!corridor0.IsValid) corridor0 = corridor0.Buffer(0);
                        if (corridor0.IsEmpty) return corridor0;
                    }

                    var apronW = hw * 2d;
                    Geometry garageApron;
                    if (exitEdge is not null)
                    {
                        var a = exitEdge.Value.a;
                        var b = exitEdge.Value.b;
                        var f = TryGetExitFrame(a, b);
                        if (f is null)
                        {
                            var edgeLine = gf.CreateLineString(new[] { a, b });
                            var apronRaw = BufferOp.Buffer(edgeLine, apronW, bufferParams);
                            var clip = MakeExitHalfPlaneClip(a, b);
                            garageApron = apronRaw.Intersection(clip);
                        }
                        else
                        {
                            var nx0 = f.Value.nx;
                            var ny0 = f.Value.ny;
                            var c = new Coordinate(b.X + nx0 * apronW, b.Y + ny0 * apronW);
                            var d = new Coordinate(a.X + nx0 * apronW, a.Y + ny0 * apronW);
                            garageApron = gf.CreatePolygon(new[] { a, b, c, d, a });
                        }
                    }
                    else
                    {
                        garageApron = bestStartIsLeft
                            ? (Geometry)gf.ToGeometry(new Envelope(Math.Max(0d, garageEnv.MinX - apronW), garageEnv.MinX + 1e-6, garageEnv.MinY, garageEnv.MaxY))
                            : (Geometry)gf.ToGeometry(new Envelope(garageEnv.MaxX - 1e-6, Math.Min(widthFt, garageEnv.MaxX + apronW), garageEnv.MinY, garageEnv.MaxY));
                    }
                    if (!garageApron.IsValid) garageApron = garageApron.Buffer(0);
                    if (!garageApron.IsEmpty) corridor0 = corridor0.Union(garageApron);

                    if (frontWiden is not null) corridor0 = corridor0.Union(frontWiden);
                    corridor0 = corridor0.Intersection(freeSpace);
                    if (!corridor0.IsValid) corridor0 = corridor0.Buffer(0);
                    corridor0 = corridor0.Intersection(lotPoly);
                    if (!corridor0.IsValid) corridor0 = corridor0.Buffer(0);
                    return corridor0;
                }

                var wideHalfW = 5d;
                var wide = BuildCorridor(wideHalfW);
                var corridor = wide;
                if (halfW < wideHalfW - 1e-9)
                {
                    var narrow = BuildCorridor(halfW);
                    if (corridor.IsEmpty) corridor = narrow;
                    else if (!narrow.IsEmpty) corridor = corridor.Union(narrow);
                }
                if (!corridor.IsValid) corridor = corridor.Buffer(0);
                if (corridor.IsEmpty) return null;

                Polygon? best = null;
                var bestArea = 0d;
                foreach (var p in (corridor is Polygon pp ? new[] { pp } : corridor is MultiPolygon mp ? mp.Geometries.OfType<Polygon>() : Enumerable.Empty<Polygon>()))
                {
                    if (p.IsEmpty) continue;
                    if (p.Area > bestArea)
                    {
                        bestArea = p.Area;
                        best = p;
                    }
                }
                if (best is null) return null;

                var ring = best.ExteriorRing.Coordinates.ToList();
                if (ring.Count > 1 && ring[0].Equals2D(ring[^1])) ring.RemoveAt(ring.Count - 1);
                if (ring.Count < 3) return null;
                return ring.Select(c => new FtPoint { XFt = c.X, YFt = c.Y }).ToList();
            }

                for (var halfW = 5d; halfW >= 1d - 1e-9; halfW -= 0.5d)
                {
                    var poly = TryAt(halfW);
                    if (poly is not null && poly.Count >= 3) return poly;
                }
                return null;
            }

            var drivewayPoly = TryComputeDrivewayCorridorPolygonFt();
            if (drivewayPoly is not null && drivewayPoly.Count >= 3)
            {
                obstaclePolygons.Add(drivewayPoly);
                obstaclesWithKind.Add(("driveway", drivewayPoly));

                var driveMinX = drivewayPoly.Min(p => p.XFt);
                var driveMaxX = drivewayPoly.Max(p => p.XFt);
                var driveMinY = drivewayPoly.Min(p => p.YFt);
                var driveMaxY = drivewayPoly.Max(p => p.YFt);
                if (double.IsFinite(driveMinX) && double.IsFinite(driveMaxX) && double.IsFinite(driveMinY) && double.IsFinite(driveMaxY))
                {
                    obstacles.Add(new FtRect { XFt = driveMinX, YFt = driveMinY, WFt = Math.Max(0, driveMaxX - driveMinX), HFt = Math.Max(0, driveMaxY - driveMinY) });
                }
            }
        }
        var cutoutsGeoms = new List<(string reason, string labelZh, string labelEn, Geometry geom)>();
        var buildableGeom = ComputeBuildableGeometry(
            lotPolyFt,
            allowedLeft,
            allowedRight,
            allowedTop,
            allowedBottom,
            obstaclesWithKind,
            houseSepFt,
            16d,
            cutoutsGeoms,
            msg => _logger.LogInformation("{Msg}", msg));
        List<(double x, double y)>? aiPolyFt = null;
        List<List<(double x, double y)>>? aiRingsFt = null;
        List<List<List<(double x, double y)>>>? aiMultiRingsFt = null;
        if (buildableGeom is not null && !buildableGeom.IsEmpty)
        {
            static List<(double x, double y)> RingToFt(Coordinate[] coords)
            {
                var ring = coords.Select(c => (x: c.X, y: c.Y)).ToList();
                if (ring.Count > 1)
                {
                    var a0 = ring[0];
                    var a1 = ring[^1];
                    if (Math.Abs(a0.x - a1.x) < 1e-6 && Math.Abs(a0.y - a1.y) < 1e-6)
                        ring.RemoveAt(ring.Count - 1);
                }
                return ring.Count >= 3 ? ring : new List<(double x, double y)>();
            }

            static List<Polygon> ExtractPolygons(Geometry g)
            {
                var outPolys = new List<Polygon>();
                if (g.IsEmpty) return outPolys;
                if (g is Polygon p)
                {
                    outPolys.Add(p);
                    return outPolys;
                }
                if (g is MultiPolygon mp)
                {
                    for (var i = 0; i < mp.NumGeometries; i++)
                    {
                        if (mp.GetGeometryN(i) is Polygon pp && !pp.IsEmpty)
                            outPolys.Add(pp);
                    }
                    return outPolys;
                }
                for (var i = 0; i < g.NumGeometries; i++)
                {
                    var sub = g.GetGeometryN(i);
                    outPolys.AddRange(ExtractPolygons(sub));
                }
                return outPolys;
            }

            var polys = ExtractPolygons(buildableGeom);
            if (polys.Count > 0)
            {
                polys.Sort((a, b) => b.Area.CompareTo(a.Area));
                var best = polys[0];

                var outer = RingToFt(best.ExteriorRing.Coordinates);
                if (outer.Count >= 3)
                {
                    aiPolyFt = outer;
                    aiRingsFt = new List<List<(double x, double y)>> { outer };
                    for (var i = 0; i < best.NumInteriorRings; i++)
                    {
                        var hole = RingToFt(best.GetInteriorRingN(i).Coordinates);
                        if (hole.Count >= 3) aiRingsFt.Add(hole);
                    }
                }

                aiMultiRingsFt = new List<List<List<(double x, double y)>>>();
                foreach (var poly in polys)
                {
                    var rings = new List<List<(double x, double y)>>();
                    var o = RingToFt(poly.ExteriorRing.Coordinates);
                    if (o.Count < 3) continue;
                    rings.Add(o);
                    for (var i = 0; i < poly.NumInteriorRings; i++)
                    {
                        var h = RingToFt(poly.GetInteriorRingN(i).Coordinates);
                        if (h.Count >= 3) rings.Add(h);
                    }
                    if (rings.Count > 0) aiMultiRingsFt.Add(rings);
                }
                if (aiMultiRingsFt.Count == 0) aiMultiRingsFt = null;
            }
        }

        static List<List<List<FtPoint>>> GeometryToMultiRingsFt(Geometry g)
        {
            static List<(double x, double y)> RingToFt(Coordinate[] coords)
            {
                var ring = coords.Select(c => (x: c.X, y: c.Y)).ToList();
                if (ring.Count > 1)
                {
                    var a0 = ring[0];
                    var a1 = ring[^1];
                    if (Math.Abs(a0.x - a1.x) < 1e-6 && Math.Abs(a0.y - a1.y) < 1e-6)
                        ring.RemoveAt(ring.Count - 1);
                }
                return ring.Count >= 3 ? ring : new List<(double x, double y)>();
            }

            static List<Polygon> ExtractPolygons(Geometry geom)
            {
                var outPolys = new List<Polygon>();
                if (geom.IsEmpty) return outPolys;

                var visited = new HashSet<Geometry>(ReferenceEqualityComparer.Instance);
                var stack = new Stack<Geometry>();
                stack.Push(geom);

                while (stack.Count > 0)
                {
                    var cur = stack.Pop();
                    if (cur is null || cur.IsEmpty) continue;
                    if (!visited.Add(cur)) continue;

                    if (cur is Polygon p)
                    {
                        outPolys.Add(p);
                        continue;
                    }

                    if (cur is MultiPolygon mp)
                    {
                        for (var i = 0; i < mp.NumGeometries; i++)
                        {
                            if (mp.GetGeometryN(i) is Polygon pp && !pp.IsEmpty) outPolys.Add(pp);
                        }
                        continue;
                    }

                    var n = cur.NumGeometries;
                    if (n <= 0) continue;
                    if (n == 1)
                    {
                        var sub = cur.GetGeometryN(0);
                        if (ReferenceEquals(sub, cur)) continue;
                        stack.Push(sub);
                        continue;
                    }

                    for (var i = 0; i < n; i++)
                    {
                        var sub = cur.GetGeometryN(i);
                        if (sub is null) continue;
                        if (ReferenceEquals(sub, cur)) continue;
                        stack.Push(sub);
                    }
                }

                return outPolys;
            }

            var polys = ExtractPolygons(g).Where(p => !p.IsEmpty && p.Area > 1e-6).ToList();
            var outMulti = new List<List<List<FtPoint>>>();
            foreach (var poly in polys)
            {
                var rings = new List<List<FtPoint>>();
                var outer = RingToFt(poly.ExteriorRing.Coordinates);
                if (outer.Count < 3) continue;
                rings.Add(outer.Select(p => new FtPoint { XFt = p.x, YFt = p.y }).ToList());
                for (var i = 0; i < poly.NumInteriorRings; i++)
                {
                    var hole = RingToFt(poly.GetInteriorRingN(i).Coordinates);
                    if (hole.Count < 3) continue;
                    rings.Add(hole.Select(p => new FtPoint { XFt = p.x, YFt = p.y }).ToList());
                }
                outMulti.Add(rings);
            }
            return outMulti;
        }

        var cutoutsFt = cutoutsGeoms.Count == 0
            ? null
            : cutoutsGeoms
                .Select(c => new LookupCutoutArea
                {
                    Reason = c.reason,
                    LabelZh = c.labelZh,
                    LabelEn = c.labelEn,
                    MultiRings = GeometryToMultiRingsFt(c.geom)
                })
                .Where(c => c.MultiRings.Count > 0)
                .ToList();
        measureLines = ComputeMeasureLines(lotPolyFt, aiPolyFt, obstaclesWithKind, sideSetbackFt, rearSetbackFt, houseSepFt);

        var edgesX = new SortedSet<double> { allowedLeft, allowedRight };
        var edgesY = new SortedSet<double> { allowedTop, allowedBottom };

        if (buildableGeom is not null && !buildableGeom.IsEmpty)
        {
            void AddCoords(Coordinate[] coords)
            {
                for (var i = 0; i < coords.Length; i++)
                {
                    edgesX.Add(Math.Clamp(coords[i].X, allowedLeft, allowedRight));
                    edgesY.Add(Math.Clamp(coords[i].Y, allowedTop, allowedBottom));
                }
            }
            if (buildableGeom is Polygon bp)
            {
                AddCoords(bp.ExteriorRing.Coordinates);
                for (var i = 0; i < bp.NumInteriorRings; i++)
                    AddCoords(bp.GetInteriorRingN(i).Coordinates);
            }
            else if (buildableGeom is MultiPolygon bmp)
            {
                for (var pi = 0; pi < bmp.NumGeometries; pi++)
                {
                    if (bmp.GetGeometryN(pi) is not Polygon p || p.IsEmpty) continue;
                    AddCoords(p.ExteriorRing.Coordinates);
                    for (var i = 0; i < p.NumInteriorRings; i++)
                        AddCoords(p.GetInteriorRingN(i).Coordinates);
                }
            }
            else
            {
                for (var gi = 0; gi < buildableGeom.NumGeometries; gi++)
                {
                    if (buildableGeom.GetGeometryN(gi) is not Polygon p || p.IsEmpty) continue;
                    AddCoords(p.ExteriorRing.Coordinates);
                    for (var i = 0; i < p.NumInteriorRings; i++)
                        AddCoords(p.GetInteriorRingN(i).Coordinates);
                }
            }
        }
        else
        {
            foreach (var r in obstacles)
            {
                edgesX.Add(Math.Clamp(r.XFt, allowedLeft, allowedRight));
                edgesX.Add(Math.Clamp(r.XFt + r.WFt, allowedLeft, allowedRight));
                edgesY.Add(Math.Clamp(r.YFt, allowedTop, allowedBottom));
                edgesY.Add(Math.Clamp(r.YFt + r.HFt, allowedTop, allowedBottom));
            }
        }

        var xs = edgesX.ToList();
        var ys = edgesY.ToList();

        static List<double> ReduceAxisCandidates(List<double> values, double snapFt, int maxCount, double min, double max)
        {
            if (values.Count == 0) return values;
            var snapped = values
                .Select(v => Math.Clamp(Math.Round(v / snapFt) * snapFt, min, max))
                .Distinct()
                .OrderBy(v => v)
                .ToList();

            if (snapped.Count <= maxCount) return snapped;

            var reduced = new List<double>(maxCount);
            for (var i = 0; i < maxCount; i++)
            {
                var t = (double)i / (maxCount - 1);
                var idx = (int)Math.Round(t * (snapped.Count - 1));
                reduced.Add(snapped[idx]);
            }
            return reduced.Distinct().OrderBy(v => v).ToList();
        }

        xs = ReduceAxisCandidates(xs, 2d, 36, allowedLeft, allowedRight);
        ys = ReduceAxisCandidates(ys, 2d, 36, allowedTop, allowedBottom);

        var bestArea = 0d;
        var bestRect = new FtRect { XFt = 0, YFt = 0, WFt = 0, HFt = 0 };

        static bool Intersects(FtRect a, FtRect b)
        {
            return a.XFt < b.XFt + b.WFt &&
                   a.XFt + a.WFt > b.XFt &&
                   a.YFt < b.YFt + b.HFt &&
                   a.YFt + a.HFt > b.YFt;
        }
        LookupAduPlacement? suggestedPlacement = null;

        var zoneSw = Stopwatch.StartNew();
        for (var xi = 0; xi < xs.Count - 1; xi++)
        {
            for (var xj = xi + 1; xj < xs.Count; xj++)
            {
                var left = xs[xi];
                var right = xs[xj];
                var w = right - left;
                if (w <= 0) continue;
                if (w * (allowedBottom - allowedTop) <= bestArea) continue;

                for (var yi = 0; yi < ys.Count - 1; yi++)
                {
                    for (var yj = yi + 1; yj < ys.Count; yj++)
                    {
                        var top = ys[yi];
                        var bottom = ys[yj];
                        var h = bottom - top;
                        if (h <= 0) continue;
                        if (w * h <= bestArea) continue;

                        var cand = new FtRect { XFt = left, YFt = top, WFt = w, HFt = h };
                        if (buildableGeom is not null && !buildableGeom.IsEmpty)
                        {
                            var rectGeom = gf.ToGeometry(new Envelope(
                                cand.XFt,
                                cand.XFt + cand.WFt,
                                cand.YFt,
                                cand.YFt + cand.HFt));
                            if (!buildableGeom.Covers(rectGeom))
                                continue;
                        }
                        else if (aiPolyFt is not null)
                        {
                            var p0 = (x: cand.XFt, y: cand.YFt);
                            var p1 = (x: cand.XFt + cand.WFt, y: cand.YFt);
                            var p2 = (x: cand.XFt + cand.WFt, y: cand.YFt + cand.HFt);
                            var p3 = (x: cand.XFt, y: cand.YFt + cand.HFt);
                            if (!PointInPolygon(aiPolyFt, p0.x, p0.y) ||
                                !PointInPolygon(aiPolyFt, p1.x, p1.y) ||
                                !PointInPolygon(aiPolyFt, p2.x, p2.y) ||
                                !PointInPolygon(aiPolyFt, p3.x, p3.y))
                                continue;
                        }
                        var ok = true;
                        if (buildableGeom is null || buildableGeom.IsEmpty)
                        {
                            foreach (var o in obstacles)
                            {
                                if (Intersects(cand, o))
                                {
                                    ok = false;
                                    break;
                                }
                            }
                        }
                        if (!ok) continue;

                        var area = w * h;
                        if (area > bestArea)
                        {
                            bestArea = area;
                            bestRect = cand;
                        }
                    }
                }
            }
        }
        _logger.LogInformation("BuildableZone search done elapsedMs={ElapsedMs} xs={Xs} ys={Ys} bestArea={BestArea:0.###}", zoneSw.ElapsedMilliseconds, xs.Count, ys.Count, bestArea);

        var buildableZone = bestRect;

        static bool Fits(FtRect zone, double a, double b)
        {
            return (zone.WFt >= a && zone.HFt >= b) || (zone.WFt >= b && zone.HFt >= a);
        }

        var moduleFits = new List<LookupModuleFit>
        {
            new LookupModuleFit { WFt = 16.0, HFt = 37.5, CanFit = Fits(buildableZone, 16.0, 37.5) },
            new LookupModuleFit { WFt = 32.0, HFt = 37.5, CanFit = Fits(buildableZone, 32.0, 37.5) },
        };

        static bool CanFitRectAnyRotation(Geometry g, double w, double h)
        {
            if (g.IsEmpty) return false;
            if (!g.IsValid) g = g.Buffer(0);
            if (g.IsEmpty) return false;

            var env = g.EnvelopeInternal;
            var halfW = w / 2d;
            var halfH = h / 2d;
            var sampleStep = 2d;

            static List<(double x, double y)> RectOffsets(double halfW, double halfH, double step)
            {
                var pts = new List<(double x, double y)>();
                var nx = Math.Max(1, (int)Math.Ceiling((2d * halfW) / step));
                var ny = Math.Max(1, (int)Math.Ceiling((2d * halfH) / step));
                var sx = (2d * halfW) / nx;
                var sy = (2d * halfH) / ny;

                for (var i = 0; i <= nx; i++)
                {
                    var x = -halfW + i * sx;
                    pts.Add((x, -halfH));
                    pts.Add((x, halfH));
                }
                for (var j = 1; j < ny; j++)
                {
                    var y = -halfH + j * sy;
                    pts.Add((-halfW, y));
                    pts.Add((halfW, y));
                }

                pts.Add((0, 0));
                pts.Add((halfW * 0.5, 0));
                pts.Add((-halfW * 0.5, 0));
                pts.Add((0, halfH * 0.5));
                pts.Add((0, -halfH * 0.5));

                return pts.Distinct().ToList();
            }

            var baseOffsets = RectOffsets(halfW, halfH, sampleStep);
            var gf = GeometryFactory.Default;
            var prep = PreparedGeometryFactory.Prepare(g);

            var centerStep = 2d;
            var anglesDeg = new[] { 0d, 10d, 20d, 30d, 40d, 50d, 60d, 70d, 80d, 90d };
            foreach (var deg in anglesDeg)
            {
                var rad = deg * Math.PI / 180d;
                var c = Math.Cos(rad);
                var s = Math.Sin(rad);
                var offsets = baseOffsets
                    .Select(o => (dx: o.x * c - o.y * s, dy: o.x * s + o.y * c))
                    .ToList();

                var halfSpanX = Math.Abs(halfW * c) + Math.Abs(halfH * s);
                var halfSpanY = Math.Abs(halfW * s) + Math.Abs(halfH * c);
                if (!double.IsFinite(halfSpanX) || !double.IsFinite(halfSpanY) || halfSpanX <= 0 || halfSpanY <= 0) continue;

                var minX = env.MinX + halfSpanX;
                var maxX = env.MaxX - halfSpanX;
                var minY = env.MinY + halfSpanY;
                var maxY = env.MaxY - halfSpanY;
                if (minX > maxX || minY > maxY) continue;

                for (var y = minY; y <= maxY; y += centerStep)
                {
                    for (var x = minX; x <= maxX; x += centerStep)
                    {
                        var ok = true;
                        for (var i = 0; i < offsets.Count; i++)
                        {
                            var p = gf.CreatePoint(new Coordinate(x + offsets[i].dx, y + offsets[i].dy));
                            if (!prep.Covers(p)) { ok = false; break; }
                        }
                        if (ok) return true;
                    }
                }
            }
            return false;
        }

        if (buildableGeom is not null && !buildableGeom.IsEmpty)
        {
            moduleFits = new List<LookupModuleFit>
            {
                new LookupModuleFit { WFt = 16.0, HFt = 37.5, CanFit = CanFitRectAnyRotation(buildableGeom, 16d, 37.5d) },
                new LookupModuleFit { WFt = 32.0, HFt = 37.5, CanFit = CanFitRectAnyRotation(buildableGeom, 32d, 37.5d) },
            };
        }

        var canFitAdu = moduleFits.Any(x => x.CanFit);

        return new LookupPlan
        {
            Unit = "ft",
            RotationDeg = angleRad * 180d / Math.PI,
            Lot = new LookupLot { WidthFt = widthFt, HeightFt = heightFt, Polygon = lotPolygon },
            Structures = structuresOut,
            StructuresCount = structuresCount,
            BuildableZone = buildableZone,
            BuildablePolygon = aiPolyFt is null ? null : aiPolyFt.Select(p => new FtPoint { XFt = p.x, YFt = p.y }).ToList(),
            BuildableRings = aiRingsFt is null
                ? null
                : aiRingsFt.Select(r => r.Select(p => new FtPoint { XFt = p.x, YFt = p.y }).ToList()).ToList(),
            BuildableMultiRings = aiMultiRingsFt is null
                ? null
                : aiMultiRingsFt
                    .Select(poly => poly
                        .Select(r => r.Select(p => new FtPoint { XFt = p.x, YFt = p.y }).ToList())
                        .ToList())
                    .ToList(),
            CutoutsFt = cutoutsFt,
            Transform = new LookupPlanTransform
            {
                CenterMercX = cx,
                CenterMercY = cy,
                MinRotX = minX,
                MaxRotY = maxY,
                AngleRad = angleRad
            },
            Module = new LookupModule { WFt = 16.0, HFt = 37.5 },
            ModuleFits = moduleFits,
            SuggestedAduPlacement = suggestedPlacement,
            MeasureLines = measureLines,
            CanFitAdu = canFitAdu
        };
    }

    private static (double x, double y) LonLatToMercator(double lon, double lat)
    {
        var r = 6378137d;
        var x = r * (lon * Math.PI / 180d);
        var y = r * Math.Log(Math.Tan(Math.PI / 4d + (lat * Math.PI / 180d) / 2d));
        return (x, y);
    }

    private static (double x, double y) Rotate(double x, double y, double angleRad)
    {
        var c = Math.Cos(angleRad);
        var s = Math.Sin(angleRad);
        return (x * c - y * s, x * s + y * c);
    }

    private static double PolygonArea(List<(double x, double y)> pts)
    {
        if (pts.Count < 3) return 0d;
        var a = 0d;
        for (var i = 0; i < pts.Count; i++)
        {
            var j = (i + 1) % pts.Count;
            a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        }
        return a / 2d;
    }

    private static bool PointInPolygon(List<(double x, double y)> poly, double x, double y)
    {
        if (poly.Count < 3) return false;
        for (int i = 0, j = poly.Count - 1; i < poly.Count; j = i++)
        {
            var a = poly[j];
            var b = poly[i];
            var vx = b.x - a.x;
            var vy = b.y - a.y;
            var wx = x - a.x;
            var wy = y - a.y;
            var cross = vx * wy - vy * wx;
            if (Math.Abs(cross) <= 1e-6)
            {
                var dot = wx * vx + wy * vy;
                if (dot >= -1e-6)
                {
                    var len2 = vx * vx + vy * vy;
                    if (dot <= len2 + 1e-6) return true;
                }
            }
        }
        var inside = false;
        for (int i = 0, j = poly.Count - 1; i < poly.Count; j = i++)
        {
            var xi = poly[i].x;
            var yi = poly[i].y;
            var xj = poly[j].x;
            var yj = poly[j].y;

            var intersect = ((yi > y) != (yj > y)) &&
                            (x < (xj - xi) * (y - yi) / ((yj - yi) + 1e-12) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    private static bool PolygonsIntersect(List<(double x, double y)> a, List<(double x, double y)> b)
    {
        if (a.Count < 3 || b.Count < 3) return false;

        for (var i = 0; i < a.Count; i++)
        {
            var a1 = a[i];
            var a2 = a[(i + 1) % a.Count];
            for (var j = 0; j < b.Count; j++)
            {
                var b1 = b[j];
                var b2 = b[(j + 1) % b.Count];
                if (SegmentsIntersect(a1, a2, b1, b2)) return true;
            }
        }

        if (PointInPolygon(a, b[0].x, b[0].y)) return true;
        if (PointInPolygon(b, a[0].x, a[0].y)) return true;
        return false;
    }

    private static bool SegmentsIntersect((double x, double y) p1, (double x, double y) p2, (double x, double y) q1, (double x, double y) q2)
    {
        static double Orient((double x, double y) a, (double x, double y) b, (double x, double y) c)
        {
            return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        }

        static bool OnSegment((double x, double y) a, (double x, double y) b, (double x, double y) p)
        {
            return p.x >= Math.Min(a.x, b.x) - 1e-9 &&
                   p.x <= Math.Max(a.x, b.x) + 1e-9 &&
                   p.y >= Math.Min(a.y, b.y) - 1e-9 &&
                   p.y <= Math.Max(a.y, b.y) + 1e-9;
        }

        var o1 = Orient(p1, p2, q1);
        var o2 = Orient(p1, p2, q2);
        var o3 = Orient(q1, q2, p1);
        var o4 = Orient(q1, q2, p2);

        if ((o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0))
            return true;

        if (Math.Abs(o1) < 1e-9 && OnSegment(p1, p2, q1)) return true;
        if (Math.Abs(o2) < 1e-9 && OnSegment(p1, p2, q2)) return true;
        if (Math.Abs(o3) < 1e-9 && OnSegment(q1, q2, p1)) return true;
        if (Math.Abs(o4) < 1e-9 && OnSegment(q1, q2, p2)) return true;

        return false;
    }

    private static double PolygonDistance(List<(double x, double y)> a, List<(double x, double y)> b)
    {
        if (a.Count < 2 || b.Count < 2) return double.PositiveInfinity;
        var best = double.PositiveInfinity;
        for (var i = 0; i < a.Count; i++)
        {
            var a1 = a[i];
            var a2 = a[(i + 1) % a.Count];
            for (var j = 0; j < b.Count; j++)
            {
                var b1 = b[j];
                var b2 = b[(j + 1) % b.Count];
                var d = SegmentDistance(a1, a2, b1, b2);
                if (d < best) best = d;
                if (best <= 0) return 0;
            }
        }
        return best;
    }

    private static double PolygonDistanceToSegments(List<(double x, double y)> a, List<((double x, double y) a, (double x, double y) b)> segs)
    {
        if (a.Count < 2 || segs.Count == 0) return double.PositiveInfinity;
        var best = double.PositiveInfinity;
        for (var i = 0; i < a.Count; i++)
        {
            var a1 = a[i];
            var a2 = a[(i + 1) % a.Count];
            foreach (var (s1, s2) in segs)
            {
                var d = SegmentDistance(a1, a2, s1, s2);
                if (d < best) best = d;
                if (best <= 0) return 0;
            }
        }
        return best;
    }

    private static double SegmentDistance((double x, double y) p1, (double x, double y) p2, (double x, double y) q1, (double x, double y) q2)
    {
        if (SegmentsIntersect(p1, p2, q1, q2)) return 0;
        var d1 = PointToSegmentDistance(p1, q1, q2);
        var d2 = PointToSegmentDistance(p2, q1, q2);
        var d3 = PointToSegmentDistance(q1, p1, p2);
        var d4 = PointToSegmentDistance(q2, p1, p2);
        return Math.Min(Math.Min(d1, d2), Math.Min(d3, d4));
    }

    private static double PointToSegmentDistance((double x, double y) p, (double x, double y) a, (double x, double y) b)
    {
        var vx = b.x - a.x;
        var vy = b.y - a.y;
        var wx = p.x - a.x;
        var wy = p.y - a.y;
        var c1 = vx * wx + vy * wy;
        if (c1 <= 0) return Math.Sqrt(wx * wx + wy * wy);
        var c2 = vx * vx + vy * vy;
        if (c2 <= c1)
        {
            var dx = p.x - b.x;
            var dy = p.y - b.y;
            return Math.Sqrt(dx * dx + dy * dy);
        }
        var t = c1 / c2;
        var px = a.x + t * vx;
        var py = a.y + t * vy;
        var ex = p.x - px;
        var ey = p.y - py;
        return Math.Sqrt(ex * ex + ey * ey);
    }

    private static double Clamp(double v, double min, double max)
    {
        if (v < min) return min;
        if (v > max) return max;
        return v;
    }

    /// <summary>
    /// 计算真实可建区域几何（plan 英尺坐标系）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 核心思想：从地块 polygon 开始，按规则逐步扣除不可建区域，剩余即为可建区域（可为 MultiPolygon，且可能包含洞）。
    /// </para>
    /// <para>
    /// 扣除顺序（与 cutouts 记录保持一致）：
    /// 1) 退界：前院/后退界/左右侧退界（按 allowedTop/allowedBottom 与 sideSetbackFt）
    /// 2) 障碍：主屋（含 houseSepFt 外扩）、车库、车库通道、其他已有建筑
    /// 3) 狭窄清理：对结果做开运算（buffer(-r) 再 buffer(+r)）以移除 &lt;minClearWidthFt 的狭窄区域，且用 Mitre join 避免圆角
    /// </para>
    /// <para>
    /// 同时会把每一步实际从可建区里扣掉的片段记录到 <paramref name="cutouts"/>，
    /// 便于前端用半透明叠加方式排查“为什么可建区缺一块/位置不对”。
    /// </para>
    /// </remarks>
    /// <param name="lotPolyFt">地块外环（英尺坐标系，点不要求闭合）。</param>
    /// <param name="sideSetbackFt">左右退界（英尺）。</param>
    /// <param name="allowedTop">前院退界后的可用上边界（英尺，Y 向下）。</param>
    /// <param name="allowedBottom">后退界后的可用下边界（英尺，Y 向下）。</param>
    /// <param name="obstaclesWithKind">需要从可建区扣除的障碍多边形（主屋/车库/通道/其他建筑；英尺坐标系）。</param>
    /// <param name="houseSepFt">主屋外扩距离（英尺）。</param>
    /// <param name="minClearWidthFt">最小净宽（英尺；用于狭窄区域清理）。</param>
    /// <param name="cutouts">输出参数：记录每一步扣除掉的几何片段（NTS Geometry，英尺坐标系）。</param>
    /// <returns>最终可建区域 Geometry（可能为 Polygon/MultiPolygon/GeometryCollection）；无可建区则返回 null。</returns>
    private static Geometry? ComputeBuildableGeometry(
        List<(double x, double y)> lotPolyFt,
        double allowedLeft,
        double allowedRight,
        double allowedTop,
        double allowedBottom,
        List<(string kind, List<FtPoint> polygonFt)> obstaclesWithKind,
        double houseSepFt,
        double minClearWidthFt,
        List<(string reason, string labelZh, string labelEn, Geometry geom)> cutouts,
        Action<string>? trace = null)
    {
        if (lotPolyFt.Count < 3) return null;

        var widthFt = lotPolyFt.Max(p => p.x);
        var heightFt = lotPolyFt.Max(p => p.y);
        var left = allowedLeft;
        var right = allowedRight;

        if (!(right > left)) return null;
        if (!(allowedBottom > allowedTop)) return null;

        var gf = GeometryFactory.Default;

        static Polygon? TryCreatePolygon(GeometryFactory gf, IReadOnlyList<(double x, double y)> ring)
        {
            if (ring.Count < 3) return null;

            var pts = ring;
            var last = pts[^1];
            var first = pts[0];
            var alreadyClosed = Math.Abs(last.x - first.x) < 1e-6 && Math.Abs(last.y - first.y) < 1e-6;

            var coords = new Coordinate[pts.Count + (alreadyClosed ? 0 : 1)];
            for (var i = 0; i < pts.Count; i++)
                coords[i] = new Coordinate(pts[i].x, pts[i].y);
            if (!alreadyClosed)
                coords[^1] = new Coordinate(first.x, first.y);

            if (coords.Length < 4) return null;
            var poly = gf.CreatePolygon(gf.CreateLinearRing(coords));
            if (!poly.IsValid)
            {
                var fixedGeom = poly.Buffer(0);
                return ExtractLargestPolygon(fixedGeom);
            }
            return poly;
        }

        static Polygon? TryCreatePolygonFromFtPoints(GeometryFactory gf, IReadOnlyList<FtPoint> ring)
        {
            if (ring.Count < 3) return null;

            var last = ring[^1];
            var first = ring[0];
            var alreadyClosed = Math.Abs(last.XFt - first.XFt) < 1e-6 && Math.Abs(last.YFt - first.YFt) < 1e-6;

            var coords = new Coordinate[ring.Count + (alreadyClosed ? 0 : 1)];
            for (var i = 0; i < ring.Count; i++)
                coords[i] = new Coordinate(ring[i].XFt, ring[i].YFt);
            if (!alreadyClosed)
                coords[^1] = new Coordinate(first.XFt, first.YFt);

            if (coords.Length < 4) return null;
            var poly = gf.CreatePolygon(gf.CreateLinearRing(coords));
            if (!poly.IsValid)
            {
                var fixedGeom = poly.Buffer(0);
                return ExtractLargestPolygon(fixedGeom);
            }
            return poly;
        }

        static Polygon? ExtractLargestPolygon(Geometry geom)
        {
            if (geom.IsEmpty) return null;
            if (geom is Polygon p) return p;

            Polygon? best = null;
            var bestArea = 0d;
            for (var i = 0; i < geom.NumGeometries; i++)
            {
                var g = geom.GetGeometryN(i);
                var cand = g as Polygon;
                if (cand is null && g is MultiPolygon mp)
                {
                    for (var j = 0; j < mp.NumGeometries; j++)
                    {
                        var sub = mp.GetGeometryN(j) as Polygon;
                        if (sub is null) continue;
                        if (sub.Area > bestArea)
                        {
                            bestArea = sub.Area;
                            best = sub;
                        }
                    }
                    continue;
                }

                if (cand is null) continue;
                if (cand.Area > bestArea)
                {
                    bestArea = cand.Area;
                    best = cand;
                }
            }
            return best;
        }

        var lotGeom = TryCreatePolygon(gf, lotPolyFt);
        if (lotGeom is null) return null;

        var sw = Stopwatch.StartNew();
        void Trace(string step, Geometry? g)
        {
            if (trace is null) return;
            var ms = sw.ElapsedMilliseconds;
            if (g is null)
            {
                trace($"[Buildable] {step} @ {ms}ms: null");
                return;
            }
            var env = g.EnvelopeInternal;
            var envText = double.IsFinite(env.MinX) && double.IsFinite(env.MinY) && double.IsFinite(env.MaxX) && double.IsFinite(env.MaxY)
                ? $"env=({env.MinX:0.###},{env.MinY:0.###})-({env.MaxX:0.###},{env.MaxY:0.###})"
                : "env=(nan)";
            trace($"[Buildable] {step} @ {ms}ms: empty={g.IsEmpty} area={g.Area:0.###} geoms={g.NumGeometries} {envText}");
        }
        Trace("lot", lotGeom);

        void AddCutout(string reason, string labelZh, string labelEn, Geometry? geom)
        {
            if (geom is null || geom.IsEmpty) return;
            if (!geom.IsValid) geom = geom.Buffer(0);
            if (geom.IsEmpty) return;
            if (geom.Area <= 1e-6) return;
            cutouts.Add((reason, labelZh, labelEn, geom));
        }

        Geometry Fix(Geometry g)
        {
            if (!g.IsValid) g = g.Buffer(0);
            return g;
        }

        Geometry Reduce(Geometry g)
        {
            var pm = new PrecisionModel(1000d);
            var reducer = new GeometryPrecisionReducer(pm) { RemoveCollapsedComponents = true };
            var r = reducer.Reduce(g);
            return r.IsValid ? r : r.Buffer(0);
        }

        Geometry SafeIntersection(Geometry a, Geometry b)
        {
            try { return a.Intersection(b); }
            catch (TopologyException)
            {
                a = Fix(a);
                b = Fix(b);
                try { return a.Intersection(b); }
                catch (TopologyException)
                {
                    a = Reduce(a);
                    b = Reduce(b);
                    try { return a.Intersection(b); }
                    catch (TopologyException)
                    {
                        return GeometryFactory.Default.CreateGeometryCollection(Array.Empty<Geometry>());
                    }
                }
            }
        }

        Geometry SafeDifference(Geometry a, Geometry b)
        {
            try { return a.Difference(b); }
            catch (TopologyException)
            {
                a = Fix(a);
                b = Fix(b);
                try { return a.Difference(b); }
                catch (TopologyException)
                {
                    a = Reduce(a);
                    b = Reduce(b);
                    try { return a.Difference(b); }
                    catch (TopologyException)
                    {
                        return a;
                    }
                }
            }
        }

        Geometry SafeUnion(Geometry a, Geometry b)
        {
            if (a.IsEmpty) return b;
            if (b.IsEmpty) return a;

            Geometry NormalizeOperand(Geometry g)
            {
                if (g.IsEmpty) return g;
                if (g is GeometryCollection && g is not MultiPolygon && g is not MultiLineString && g is not MultiPoint)
                {
                    try { return g.Union(); }
                    catch { return g; }
                }
                return g;
            }

            Geometry Union2(Geometry x, Geometry y)
            {
                x = NormalizeOperand(x);
                y = NormalizeOperand(y);
                return x.Union(y);
            }

            try { return Union2(a, b); }
            catch (Exception ex) when (ex is TopologyException || ex is ArgumentException)
            {
                a = Fix(a);
                b = Fix(b);
                try { return Union2(a, b); }
                catch (Exception ex2) when (ex2 is TopologyException || ex2 is ArgumentException)
                {
                    a = Reduce(a);
                    b = Reduce(b);
                    try { return Union2(a, b); }
                    catch (Exception ex3) when (ex3 is TopologyException || ex3 is ArgumentException)
                    {
                        return a;
                    }
                }
            }
        }

        var lotEnv = lotGeom.EnvelopeInternal;
        var frontDist = Math.Max(0d, allowedTop - lotEnv.MinY);
        var rearDist = Math.Max(0d, lotEnv.MaxY - allowedBottom);
        var leftDist = Math.Max(0d, left - lotEnv.MinX);
        var rightDist = Math.Max(0d, lotEnv.MaxX - right);

        var ext = Math.Max(lotEnv.Width, lotEnv.Height) * 5d + 50d;
        var ring = lotGeom.ExteriorRing.Coordinates;
        var nEdges = Math.Max(0, ring.Length - 1);

        Geometry buildable = lotGeom;
        Geometry? frontCut = null;
        Geometry? rearCut = null;
        Geometry? leftCut = null;
        Geometry? rightCut = null;

        Geometry ClipHalfPlane(Coordinate a, Coordinate b, double inwardOffset, double tx, double ty, double nx, double ny)
        {
            var a2 = new Coordinate(a.X + nx * inwardOffset, a.Y + ny * inwardOffset);
            var b2 = new Coordinate(b.X + nx * inwardOffset, b.Y + ny * inwardOffset);
            var p1 = new Coordinate(a2.X - tx * ext, a2.Y - ty * ext);
            var p2 = new Coordinate(b2.X + tx * ext, b2.Y + ty * ext);
            var p3 = new Coordinate(p2.X + nx * ext, p2.Y + ny * ext);
            var p4 = new Coordinate(p1.X + nx * ext, p1.Y + ny * ext);
            return gf.CreatePolygon(new[] { p1, p2, p3, p4, p1 });
        }

        Geometry HalfPlane(Coordinate a, Coordinate b, double tx, double ty, double nx, double ny)
        {
            var p1 = new Coordinate(a.X - tx * ext, a.Y - ty * ext);
            var p2 = new Coordinate(b.X + tx * ext, b.Y + ty * ext);
            var p3 = new Coordinate(p2.X + nx * ext, p2.Y + ny * ext);
            var p4 = new Coordinate(p1.X + nx * ext, p1.Y + ny * ext);
            return gf.CreatePolygon(new[] { p1, p2, p3, p4, p1 });
        }

        Geometry BandBetween(Coordinate a, Coordinate b, double inwardOffset, double tx, double ty, double nx, double ny)
        {
            var inside0 = ClipHalfPlane(a, b, 0d, tx, ty, nx, ny);
            var inside1 = ClipHalfPlane(a, b, inwardOffset, tx, ty, nx, ny);
            var g0 = SafeIntersection(lotGeom, inside0);
            var g1 = SafeIntersection(lotGeom, inside1);
            var band = SafeDifference(g0, g1);
            return band;
        }

        var rearEdgeLen = 0d;
        var rearTx = 1d;
        var rearTy = 0d;

        for (var i = 0; i < nEdges; i++)
        {
            var a = ring[i];
            var b = ring[(i + 1) % nEdges];
            var vx = b.X - a.X;
            var vy = b.Y - a.Y;
            var len = Math.Sqrt(vx * vx + vy * vy);
            if (!double.IsFinite(len) || len < 1e-9) continue;

            var tx = vx / len;
            var ty = vy / len;
            var nx = -ty;
            var ny = tx;
            var mid = new Coordinate((a.X + b.X) / 2d, (a.Y + b.Y) / 2d);
            var test = gf.CreatePoint(new Coordinate(mid.X + nx * 0.25, mid.Y + ny * 0.25));
            if (!lotGeom.Covers(test))
            {
                nx = -nx;
                ny = -ny;
            }

            double dist;
            Geometry? bucket;
            if (Math.Abs(nx) >= Math.Abs(ny))
            {
                if (nx > 0)
                {
                    dist = leftDist;
                    bucket = leftCut;
                }
                else
                {
                    dist = rightDist;
                    bucket = rightCut;
                }
            }
            else
            {
                if (ny > 0)
                {
                    dist = frontDist;
                    bucket = frontCut;
                }
                else
                {
                    dist = rearDist;
                    bucket = rearCut;
                }
            }

            var isRearEdge = Math.Abs(nx) < Math.Abs(ny) && ny <= 0;
            if (isRearEdge && len > rearEdgeLen)
            {
                rearEdgeLen = len;
                rearTx = tx;
                rearTy = ty;
            }

            if (dist <= 1e-9) continue;

            var clip = ClipHalfPlane(a, b, dist, tx, ty, nx, ny);
            buildable = SafeIntersection(buildable, clip);
            if (buildable.IsEmpty) break;
            if (i % 8 == 0) Trace($"setback-clip edge={i}", buildable);

            var band = BandBetween(a, b, dist, tx, ty, nx, ny);
            if (band.IsEmpty) continue;
            if (Math.Abs(nx) >= Math.Abs(ny))
            {
                if (nx > 0) leftCut = leftCut is null ? band : SafeUnion(leftCut, band);
                else rightCut = rightCut is null ? band : SafeUnion(rightCut, band);
            }
            else
            {
                if (ny > 0) frontCut = frontCut is null ? band : SafeUnion(frontCut, band);
                else rearCut = rearCut is null ? band : SafeUnion(rearCut, band);
            }
        }

        if (!buildable.IsValid) buildable = buildable.Buffer(0);
        if (buildable.IsEmpty || buildable.Area <= 1e-6)
        {
            var clip = gf.ToGeometry(new Envelope(left, right, allowedTop, allowedBottom));
            buildable = SafeIntersection(lotGeom, clip);
            Trace("setback-fallback-envelope", buildable);

            frontCut = null;
            rearCut = null;
            leftCut = null;
            rightCut = null;

            if (allowedTop > lotEnv.MinY + 1e-6)
                frontCut = SafeIntersection(lotGeom, gf.ToGeometry(new Envelope(lotEnv.MinX, lotEnv.MaxX, lotEnv.MinY, allowedTop)));
            if (allowedBottom < lotEnv.MaxY - 1e-6)
                rearCut = SafeIntersection(lotGeom, gf.ToGeometry(new Envelope(lotEnv.MinX, lotEnv.MaxX, allowedBottom, lotEnv.MaxY)));
            if (left > lotEnv.MinX + 1e-6)
                leftCut = SafeIntersection(lotGeom, gf.ToGeometry(new Envelope(lotEnv.MinX, left, allowedTop, allowedBottom)));
            if (right < lotEnv.MaxX - 1e-6)
                rightCut = SafeIntersection(lotGeom, gf.ToGeometry(new Envelope(right, lotEnv.MaxX, allowedTop, allowedBottom)));
        }

        AddCutout("setback-front", "前院/前退界", "Front yard / front setback", frontCut);
        AddCutout("setback-rear", "后退界", "Rear setback", rearCut);
        AddCutout("setback-side-left", "左侧退界", "Left side setback", leftCut);
        AddCutout("setback-side-right", "右侧退界", "Right side setback", rightCut);
        Trace("after-setbacks", buildable);

        {
            var houseFt = obstaclesWithKind.FirstOrDefault(o => string.Equals(o.kind, "house", StringComparison.OrdinalIgnoreCase)).polygonFt;
            if (houseFt is not null && houseFt.Count >= 3)
            {
                var housePoly = TryCreatePolygonFromFtPoints(gf, houseFt);
                if (housePoly is not null && !housePoly.IsEmpty)
                {
                    var sep = Math.Max(0d, houseSepFt);
                    Geometry frontOfHouseBandNew = GeometryFactory.Default.CreateGeometryCollection(Array.Empty<Geometry>());
                    Geometry behindHouseHalfPlane = GeometryFactory.Default.CreateGeometryCollection(Array.Empty<Geometry>());

                    try
                    {
                        if (rearEdgeLen > 1e-6)
                        {
                            var lotTx = rearTx;
                            var lotTy = rearTy;
                            var lotLen = Math.Sqrt(lotTx * lotTx + lotTy * lotTy);
                            if (double.IsFinite(lotLen) && lotLen > 1e-9)
                            {
                                lotTx /= lotLen;
                                lotTy /= lotLen;
                                var lotNx = -lotTy;
                                var lotNy = lotTx;
                                var lotNLen = Math.Sqrt(lotNx * lotNx + lotNy * lotNy);
                                if (double.IsFinite(lotNLen) && lotNLen > 1e-9)
                                {
                                    lotNx /= lotNLen;
                                    lotNy /= lotNLen;
                                    if (lotNy < 0) { lotNx = -lotNx; lotNy = -lotNy; }

                                    var houseRing = housePoly.ExteriorRing.Coordinates;
                                    if (houseRing.Length >= 2)
                                    {
                                        var bestPar = -1d;
                                        var bestMidY = double.NegativeInfinity;
                                        var bestA = houseRing[0];
                                        var bestB = houseRing[1];
                                        var bestTx = 1d;
                                        var bestTy = 0d;

                                        for (var i = 0; i < houseRing.Length - 1; i++)
                                        {
                                            var a = houseRing[i];
                                            var b = houseRing[i + 1];
                                            var vx = b.X - a.X;
                                            var vy = b.Y - a.Y;
                                            var len = Math.Sqrt(vx * vx + vy * vy);
                                            if (!double.IsFinite(len) || len < 1e-6) continue;
                                            var tx = vx / len;
                                            var ty = vy / len;
                                            var par = Math.Abs(tx * lotTx + ty * lotTy);
                                            var midY = (a.Y + b.Y) / 2d;
                                            if (par > bestPar + 1e-6 || (Math.Abs(par - bestPar) <= 1e-6 && midY > bestMidY))
                                            {
                                                bestPar = par;
                                                bestMidY = midY;
                                                bestA = a;
                                                bestB = b;
                                                bestTx = tx;
                                                bestTy = ty;
                                            }
                                        }

                                        if (bestPar >= 0.6 && double.IsFinite(bestMidY))
                                        {
                                            var nx = -bestTy;
                                            var ny = bestTx;
                                            var nLen = Math.Sqrt(nx * nx + ny * ny);
                                            if (double.IsFinite(nLen) && nLen > 1e-9)
                                            {
                                                nx /= nLen;
                                                ny /= nLen;
                                                if (nx * lotNx + ny * lotNy < 0) { nx = -nx; ny = -ny; }

                                                var bestProj = double.NegativeInfinity;
                                                for (var i = 0; i < houseRing.Length; i++)
                                                {
                                                    var p = houseRing[i];
                                                    var proj = p.X * nx + p.Y * ny;
                                                    if (proj > bestProj) bestProj = proj;
                                                }

                                                if (double.IsFinite(bestProj))
                                                {
                                                    var k = bestProj + sep;
                                                    var p0 = bestA;
                                                    var p0Proj = p0.X * nx + p0.Y * ny;
                                                    var shift = k - p0Proj;
                                                    var q = new Coordinate(p0.X + nx * shift, p0.Y + ny * shift);

                                                    var aOff = new Coordinate(q.X - bestTx, q.Y - bestTy);
                                                    var bOff = new Coordinate(q.X + bestTx, q.Y + bestTy);
                                                    var frontHp = HalfPlane(aOff, bOff, bestTx, bestTy, -nx, -ny);
                                                    var rearHp = HalfPlane(aOff, bOff, bestTx, bestTy, nx, ny);
                                                    frontOfHouseBandNew = SafeIntersection(lotGeom, frontHp);
                                                    behindHouseHalfPlane = rearHp;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch
                    {
                    }

                    Geometry frontOfHouseBandOld = GeometryFactory.Default.CreateGeometryCollection(Array.Empty<Geometry>());
                    var yMax = Math.Min(allowedBottom, housePoly.EnvelopeInternal.MaxY + sep);
                    if (yMax > allowedTop + 1e-6)
                    {
                        frontOfHouseBandOld = SafeIntersection(lotGeom, gf.ToGeometry(new Envelope(lotEnv.MinX, lotEnv.MaxX, allowedTop, yMax)));
                    }

                    var frontOfHouseBand = frontOfHouseBandNew.IsEmpty ? frontOfHouseBandOld : frontOfHouseBandNew;
                    if (!frontOfHouseBand.IsEmpty)
                        AddCutout("front-of-house", "主屋后沿之前", "In front of house rear edge", frontOfHouseBand);

                    if (!(behindHouseHalfPlane is GeometryCollection gc && gc.NumGeometries == 0))
                    {
                        var nextBuildable = SafeIntersection(buildable, behindHouseHalfPlane);
                        if (!nextBuildable.IsEmpty)
                        {
                            buildable = nextBuildable;
                            Trace("after-front-of-house", buildable);
                        }
                    }
                }
            }
        }

        foreach (var (kind, polyFt) in obstaclesWithKind)
        {
            if (polyFt.Count < 3) continue;
            var obstacle = TryCreatePolygonFromFtPoints(gf, polyFt);
            if (obstacle is null || obstacle.IsEmpty) continue;

            var buffer =
                string.Equals(kind, "house", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(kind, "garage", StringComparison.OrdinalIgnoreCase)
                    ? houseSepFt
                    : 0d;
            Geometry expanded;
            if (buffer > 0)
            {
                var bp = new BufferParameters
                {
                    QuadrantSegments = 1,
                    JoinStyle = JoinStyle.Mitre,
                    MitreLimit = 2.0,
                    EndCapStyle = EndCapStyle.Square
                };
                expanded = BufferOp.Buffer(obstacle, buffer, bp);
            }
            else
            {
                expanded = obstacle;
            }
            if (!expanded.IsValid) expanded = expanded.Buffer(0);

            var removed = SafeIntersection(buildable, expanded);
            if (string.Equals(kind, "house", StringComparison.OrdinalIgnoreCase))
                AddCutout("existing-house", buffer > 0 ? "主屋+间距" : "主屋", buffer > 0 ? "Existing house + separation" : "Existing house", removed);
            else if (string.Equals(kind, "garage", StringComparison.OrdinalIgnoreCase))
                AddCutout("existing-garage", buffer > 0 ? "车库+间距" : "车库", buffer > 0 ? "Garage + separation" : "Garage", removed);
            else if (string.Equals(kind, "driveway", StringComparison.OrdinalIgnoreCase))
                AddCutout("driveway-10ft", "车库通道10ft", "10ft driveway corridor", SafeIntersection(lotGeom, expanded));
            else
                AddCutout("existing-structure", "已有建筑", "Existing structure", removed);

            buildable = SafeDifference(buildable, expanded);
            if (buildable.IsEmpty) break;
            if (!buildable.IsValid) buildable = buildable.Buffer(0);
            Trace($"after-obstacle {kind}", buildable);
        }

        if (buildable.IsEmpty) return null;
        Trace("after-obstacles", buildable);

        var enableNarrowCut = true;
        var minWidth = Math.Max(0d, minClearWidthFt);
        if (enableNarrowCut && minWidth > 1e-9)
        {
            var narrowSw = Stopwatch.StartNew();
            var r = minWidth / 2d;
            var bp = new BufferParameters
            {
                QuadrantSegments = 1,
                JoinStyle = JoinStyle.Mitre,
                MitreLimit = 2.0,
                EndCapStyle = EndCapStyle.Square
            };

            var baseGeom = buildable;
            if (!baseGeom.IsValid) baseGeom = baseGeom.Buffer(0);

            var eroded = BufferOp.Buffer(baseGeom, -r, bp);
            if (!eroded.IsValid) eroded = eroded.Buffer(0);

            if (!eroded.IsEmpty)
            {
                var opened = BufferOp.Buffer(eroded, r, bp);
                if (!opened.IsValid) opened = opened.Buffer(0);
                opened = opened.Intersection(baseGeom);
                if (!opened.IsValid) opened = opened.Buffer(0);

                if (!opened.IsEmpty && opened.Area > 1e-6)
                {
                    var removed = baseGeom.Difference(opened);
                    if (!removed.IsValid) removed = removed.Buffer(0);
                    if (!removed.IsEmpty)
                        AddCutout("narrow-<16ft", $"狭窄<{minWidth:0.#}ft", $"Narrow <{minWidth:0.#}ft", removed);
                    buildable = opened;
                }
            }

            trace?.Invoke($"[Buildable] narrow-<16ft opening(minWidth={minWidth:0.#}) elapsedMs={narrowSw.ElapsedMilliseconds} area={buildable.Area:0.###}");
        }

        var enableAduFitCut = false;
        if (enableAduFitCut)
        {
            static Geometry Translate(Geometry g, double dx, double dy)
                => AffineTransformation.TranslationInstance(dx, dy).Transform(g);

            static (double dx, double dy) RotateOffset((double ox, double oy) o, double rad)
            {
                var c = Math.Cos(rad);
                var s = Math.Sin(rad);
                return (o.ox * c - o.oy * s, o.ox * s + o.oy * c);
            }

            var baseGeom = buildable;
            if (!baseGeom.IsValid) baseGeom = baseGeom.Buffer(0);
            if (!baseGeom.IsEmpty)
            {
                var swAdu = Stopwatch.StartNew();
                const double wFt = 16d;
                const double hFt = 37.5d;
                var halfW = wFt / 2d;
                var halfH = hFt / 2d;
                var offsetsLocal = new List<(double ox, double oy)>
                {
                    (-halfW, 0d), (halfW, 0d),
                    (0d, -halfH), (0d, halfH),
                    (-halfW, -halfH), (-halfW, halfH),
                    (halfW, -halfH), (halfW, halfH)
                };

                var anglesDeg = new[] { 0d, 15d, 30d, 45d, 60d, 75d, 90d };
                Geometry? coverageAll = null;
                foreach (var deg in anglesDeg)
                {
                    var rad = deg * Math.PI / 180d;
                    var offsets = offsetsLocal.Select(o => RotateOffset(o, rad)).ToList();

                    Geometry eroded = baseGeom;
                    foreach (var (dx, dy) in offsets)
                    {
                        var shifted = Translate(baseGeom, -dx, -dy);
                        eroded = eroded.Intersection(shifted);
                        if (!eroded.IsValid) eroded = eroded.Buffer(0);
                        if (eroded.IsEmpty) break;
                    }
                    if (eroded.IsEmpty) continue;

                    Geometry opened = eroded;
                    foreach (var (dx, dy) in offsets)
                    {
                        opened = opened.Union(Translate(eroded, dx, dy));
                        if (!opened.IsValid) opened = opened.Buffer(0);
                    }

                    opened = opened.Intersection(baseGeom);
                    if (!opened.IsValid) opened = opened.Buffer(0);
                    if (opened.IsEmpty) continue;

                    coverageAll = coverageAll is null ? opened : coverageAll.Union(opened);
                    if (coverageAll is not null && !coverageAll.IsValid) coverageAll = coverageAll.Buffer(0);
                }

                if (coverageAll is not null && !coverageAll.IsEmpty && coverageAll.Area > 1e-6)
                {
                    var removed = baseGeom.Difference(coverageAll);
                    if (!removed.IsValid) removed = removed.Buffer(0);
                    if (!removed.IsEmpty)
                        AddCutout("adu-unplaceable-37.5x16", "放不下37.5×16", "Cannot fit 37.5×16", removed);
                    buildable = coverageAll;
                }

                trace?.Invoke($"[Buildable] adu-fit-cut(37.5x16 anyrot≈) elapsedMs={swAdu.ElapsedMilliseconds} area={buildable.Area:0.###}");
            }
        }

        if (!buildable.IsValid) buildable = buildable.Buffer(0);
        if (buildable.IsEmpty) return null;
        return buildable;
    }

    private static List<LookupMeasureLine> ComputeMeasureLines(
        List<(double x, double y)> lotPolyFt,
        List<(double x, double y)>? buildablePolyFt,
        List<(string kind, List<FtPoint> polygonFt)> obstaclesWithKind,
        double sideSetbackFt,
        double rearSetbackFt,
        double houseSepFt)
    {
        _ = sideSetbackFt;
        _ = rearSetbackFt;
        _ = houseSepFt;

        var outLines = new List<LookupMeasureLine>();
        if (lotPolyFt.Count < 3) return outLines;
        if (buildablePolyFt is null || buildablePolyFt.Count < 3) return outLines;

        var gf = GeometryFactory.Default;

        static Polygon? TryCreatePolygon(GeometryFactory gf, IReadOnlyList<(double x, double y)> ring)
        {
            if (ring.Count < 3) return null;

            static bool Finite(double v) => double.IsFinite(v);
            var cleaned = new List<(double x, double y)>(ring.Count);
            for (var i = 0; i < ring.Count; i++)
            {
                var p = ring[i];
                if (!Finite(p.x) || !Finite(p.y)) continue;
                if (cleaned.Count > 0)
                {
                    var prev = cleaned[^1];
                    if (Math.Abs(prev.x - p.x) < 1e-6 && Math.Abs(prev.y - p.y) < 1e-6) continue;
                }
                cleaned.Add(p);
            }
            if (cleaned.Count < 3) return null;

            var first = cleaned[0];
            var last = cleaned[^1];
            var alreadyClosed = Math.Abs(last.x - first.x) < 1e-6 && Math.Abs(last.y - first.y) < 1e-6;
            if (alreadyClosed && cleaned.Count > 1)
                cleaned.RemoveAt(cleaned.Count - 1);
            if (cleaned.Count < 3) return null;

            var coords = new Coordinate[cleaned.Count + 1];
            for (var i = 0; i < cleaned.Count; i++)
                coords[i] = new Coordinate(cleaned[i].x, cleaned[i].y);
            coords[^1] = new Coordinate(first.x, first.y);

            if (coords.Length < 4) return null;
            Polygon poly;
            try
            {
                poly = gf.CreatePolygon(gf.CreateLinearRing(coords));
            }
            catch (ArgumentException)
            {
                return null;
            }
            if (!poly.IsValid)
            {
                var fixedGeom = poly.Buffer(0);
                return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
            }
            return poly;
        }

        static Polygon? TryCreatePolygonFromFtPoints(GeometryFactory gf, IReadOnlyList<FtPoint> ring)
        {
            if (ring.Count < 3) return null;

            static bool Finite(double v) => double.IsFinite(v);
            var cleaned = new List<FtPoint>(ring.Count);
            for (var i = 0; i < ring.Count; i++)
            {
                var p = ring[i];
                if (!Finite(p.XFt) || !Finite(p.YFt)) continue;
                if (cleaned.Count > 0)
                {
                    var prev = cleaned[^1];
                    if (Math.Abs(prev.XFt - p.XFt) < 1e-6 && Math.Abs(prev.YFt - p.YFt) < 1e-6) continue;
                }
                cleaned.Add(p);
            }
            if (cleaned.Count < 3) return null;

            var first = cleaned[0];
            var last = cleaned[^1];
            var alreadyClosed = Math.Abs(last.XFt - first.XFt) < 1e-6 && Math.Abs(last.YFt - first.YFt) < 1e-6;
            if (alreadyClosed && cleaned.Count > 1)
                cleaned.RemoveAt(cleaned.Count - 1);
            if (cleaned.Count < 3) return null;

            var coords = new Coordinate[cleaned.Count + 1];
            for (var i = 0; i < cleaned.Count; i++)
                coords[i] = new Coordinate(cleaned[i].XFt, cleaned[i].YFt);
            coords[^1] = new Coordinate(first.XFt, first.YFt);

            if (coords.Length < 4) return null;
            Polygon poly;
            try
            {
                poly = gf.CreatePolygon(gf.CreateLinearRing(coords));
            }
            catch (ArgumentException)
            {
                return null;
            }
            if (!poly.IsValid)
            {
                var fixedGeom = poly.Buffer(0);
                return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
            }
            return poly;
        }

        static void AddLine(List<LookupMeasureLine> outLines, string kind, Geometry a, Geometry b)
        {
            if (a.IsEmpty || b.IsEmpty) return;
            var pts = DistanceOp.NearestPoints(a, b);
            if (pts is null || pts.Length < 2) return;
            var d = pts[0].Distance(pts[1]);
            if (!double.IsFinite(d)) return;

            outLines.Add(new LookupMeasureLine
            {
                Kind = kind,
                A = new FtPoint { XFt = pts[0].X, YFt = pts[0].Y },
                B = new FtPoint { XFt = pts[1].X, YFt = pts[1].Y },
                DistanceFt = d
            });
        }

        var buildableGeom = TryCreatePolygon(gf, buildablePolyFt);
        if (buildableGeom is null || buildableGeom.IsEmpty) return outLines;

        var widthFt = lotPolyFt.Max(p => p.x);
        var heightFt = lotPolyFt.Max(p => p.y);

        var leftBoundary = gf.CreateLineString(new[] { new Coordinate(0, 0), new Coordinate(0, heightFt) });
        var rightBoundary = gf.CreateLineString(new[] { new Coordinate(widthFt, 0), new Coordinate(widthFt, heightFt) });
        var rearBoundary = gf.CreateLineString(new[] { new Coordinate(0, heightFt), new Coordinate(widthFt, heightFt) });

        AddLine(outLines, "setback-side-left", buildableGeom, leftBoundary);
        AddLine(outLines, "setback-side-right", buildableGeom, rightBoundary);
        AddLine(outLines, "setback-rear", buildableGeom, rearBoundary);

        foreach (var (kind, polyFt) in obstaclesWithKind)
        {
            if (!string.Equals(kind, "house", StringComparison.OrdinalIgnoreCase)) continue;
            var house = TryCreatePolygonFromFtPoints(gf, polyFt);
            if (house is null || house.IsEmpty) break;
            AddLine(outLines, "house-sep", buildableGeom, house);
            break;
        }

        foreach (var (kind, polyFt) in obstaclesWithKind)
        {
            if (!string.Equals(kind, "driveway", StringComparison.OrdinalIgnoreCase)) continue;
            var driveway = TryCreatePolygonFromFtPoints(gf, polyFt);
            if (driveway is null || driveway.IsEmpty) break;
            AddLine(outLines, "driveway-clear", buildableGeom, driveway);
            break;
        }

        return outLines;
    }

    private async Task<(double dx, double dy, double closestX, double closestY)?> QueryNearestRoadSegment(
        double lat,
        double lon,
        double centerMx,
        double centerMy,
        string? siteStreetName,
        CancellationToken requestAborted)
    {
        var endpoints = new[]
        {
            "https://overpass-api.de/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"
        };

        static string NormalizeRoadName(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var cleaned = new string(s.Trim().ToLowerInvariant().Where(ch => char.IsLetterOrDigit(ch) || char.IsWhiteSpace(ch)).ToArray());
            cleaned = string.Join(" ", cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries));
            cleaned = cleaned
                .Replace("northwest", "nw")
                .Replace("northeast", "ne")
                .Replace("southwest", "sw")
                .Replace("southeast", "se")
                .Replace("north", "n")
                .Replace("south", "s")
                .Replace("east", "e")
                .Replace("west", "w")
                .Replace(" street", " st")
                .Replace(" avenue", " ave")
                .Replace(" road", " rd")
                .Replace(" boulevard", " blvd")
                .Replace(" drive", " dr")
                .Replace(" lane", " ln")
                .Replace(" court", " ct")
                .Replace(" place", " pl")
                .Replace(" terrace", " ter")
                .Replace(" highway", " hwy")
                .Replace(" parkway", " pkwy");
            return cleaned;
        }
        static HashSet<string> ToRoadTokens(string normalized)
        {
            if (string.IsNullOrWhiteSpace(normalized)) return new HashSet<string>(StringComparer.Ordinal);
            return normalized
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToHashSet(StringComparer.Ordinal);
        }
        static bool IsRoadNameMatch(string targetStreet, string wayName)
        {
            if (string.IsNullOrWhiteSpace(targetStreet) || string.IsNullOrWhiteSpace(wayName)) return false;
            if (wayName == targetStreet || wayName.Contains(targetStreet) || targetStreet.Contains(wayName)) return true;

            // Handle token order differences like "SW 45th Ave" vs "45th Ave SW".
            var tTokens = ToRoadTokens(targetStreet);
            var wTokens = ToRoadTokens(wayName);
            if (tTokens.Count == 0 || wTokens.Count == 0) return false;

            var inter = tTokens.Intersect(wTokens, StringComparer.Ordinal).Count();
            var minCount = Math.Min(tTokens.Count, wTokens.Count);
            return inter >= minCount;
        }

        var targetStreet = NormalizeRoadName(siteStreetName);
        var q = $"[out:json][timeout:8];(way[\"highway\"](around:220,{lat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{lon.ToString(System.Globalization.CultureInfo.InvariantCulture)}););out tags geom;";
        foreach (var ep in endpoints)
        {
            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(requestAborted);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(2.5));
                var http = _httpFactory.CreateClient("overpass-fast");
                _logger.LogInformation("道路查询上游请求 url={Url} lat={Lat} lon={Lon}", ep, lat, lon);
                using var req = new HttpRequestMessage(HttpMethod.Post, ep)
                {
                    Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["data"] = q })
                };
                req.Headers.Accept.ParseAdd("application/json");
                using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);
                _logger.LogInformation("道路查询上游响应 status={StatusCode} url={Url}", (int)resp.StatusCode, ep);
                if (!resp.IsSuccessStatusCode) continue;
                var text = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
                _logger.LogInformation("道路查询上游返回 len={Len} body={Body}", text.Length, Truncate(text, 8000));
                var data = JsonNode.Parse(text) as JsonObject;
                var elements = data?["elements"] as JsonArray;
                if (elements is null) return null;

                var bestDist2 = double.PositiveInfinity;
                (double dx, double dy, double px, double py)? best = null;
                var bestMatchDist2 = double.PositiveInfinity;
                (double dx, double dy, double px, double py)? bestMatch = null;

                foreach (var el in elements)
                {
                    if (el?["type"]?.GetValue<string>() != "way") continue;
                    if (el?["geometry"] is not JsonArray geom || geom.Count < 2) continue;
                    var wayName = NormalizeRoadName(el?["tags"]?["name"]?.GetValue<string>());
                    if (string.IsNullOrWhiteSpace(wayName))
                        wayName = NormalizeRoadName(el?["tags"]?["ref"]?.GetValue<string>());
                    var isMatch = IsRoadNameMatch(targetStreet, wayName);

                    for (var i = 0; i < geom.Count - 1; i++)
                    {
                        var p1 = geom[i];
                        var p2 = geom[i + 1];
                        if (p1 is null || p2 is null) continue;

                        var lon1 = p1["lon"]!.GetValue<double>();
                        var lat1 = p1["lat"]!.GetValue<double>();
                        var lon2 = p2["lon"]!.GetValue<double>();
                        var lat2 = p2["lat"]!.GetValue<double>();
                        var (x1, y1) = LonLatToMercator(lon1, lat1);
                        var (x2, y2) = LonLatToMercator(lon2, lat2);

                        x1 -= centerMx; y1 -= centerMy;
                        x2 -= centerMx; y2 -= centerMy;

                        var dx = x2 - x1;
                        var dy = y2 - y1;
                        var segLen2 = dx * dx + dy * dy;
                        if (segLen2 < 1e-9) continue;
                        var t = Math.Clamp(-(x1 * dx + y1 * dy) / segLen2, 0d, 1d);
                        var px = x1 + t * dx;
                        var py = y1 + t * dy;
                        var dist2 = px * px + py * py;
                        if (dist2 < bestDist2)
                        {
                            bestDist2 = dist2;
                            best = (dx, dy, px + centerMx, py + centerMy);
                        }
                        if (isMatch && dist2 < bestMatchDist2)
                        {
                            bestMatchDist2 = dist2;
                            bestMatch = (dx, dy, px + centerMx, py + centerMy);
                        }
                    }
                }

                if (bestMatch != null)
                    return (bestMatch.Value.dx, bestMatch.Value.dy, bestMatch.Value.px, bestMatch.Value.py);
                if (best != null)
                    return (best.Value.dx, best.Value.dy, best.Value.px, best.Value.py);
            }
            catch (OperationCanceledException)
            {
                continue;
            }
            catch
            {
                continue;
            }
        }

        return null;
    }

    private static string Truncate(string s, int maxLen)
    {
        if (string.IsNullOrEmpty(s)) return s;
        if (s.Length <= maxLen) return s;
        return s.Substring(0, maxLen);
    }
}

