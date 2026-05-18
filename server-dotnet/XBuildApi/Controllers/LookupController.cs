using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using NetTopologySuite.Operation.Buffer;
using NetTopologySuite.Operation.Distance;
using System.Globalization;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using XBuildApi.Lookup;
using XBuildApi.Site;

namespace XBuildApi.Controllers;

/// <summary>
/// 地块查询接口（新逻辑）。
/// </summary>
/// <remarks>
/// 该 Controller 不做旧接口兼容，直接返回新的强类型数据结构：
/// - subject：目标地块与其建筑轮廓
/// - nearby：附近地块/建筑/道路
/// - computed：退尺/车库通道/可建区/ADU fits 等计算结果
/// </remarks>
[ApiController]
public sealed class LookupController : ControllerBase
{
    private readonly ILogger<LookupController> _logger;
    private readonly SiteRegionResolver _regions;
    private readonly IConfiguration _cfg;
    private readonly IHttpClientFactory _httpFactory;

    /// <summary>
    /// 把角度归一化到 (-180, 180]（度）。
    /// </summary>
    /// <param name="deg">角度（度）。</param>
    /// <returns>归一化后的角度（度）。</returns>
    private static double NormalizeDeg(double deg)
    {
        if (!double.IsFinite(deg)) return 0;
        deg %= 360d;
        if (deg <= -180d) deg += 360d;
        if (deg > 180d) deg -= 360d;
        return deg;
    }

    /// <summary>
    /// 创建查询接口。
    /// </summary>
    /// <param name="regions">地区适配器解析器。</param>
    /// <param name="cfg">应用配置（用于 AI/外部数据源开关与上游配置）。</param>
    /// <param name="httpFactory">HttpClient 工厂（用于 AI/外部数据源请求）。</param>
    /// <param name="logger">日志。</param>
    public LookupController(
        SiteRegionResolver regions,
        IConfiguration cfg,
        IHttpClientFactory httpFactory,
        ILogger<LookupController> logger)
    {
        _logger = logger;
        _regions = regions;
        _cfg = cfg;
        _httpFactory = httpFactory;
    }

    /// <summary>
    /// 地块查询主入口：按地址与语言返回目标地块、附近要素以及后端计算结果。
    /// </summary>
    /// <param name="req">请求体（address/lang）。</param>
    /// <returns>
    /// 200：<see cref="SiteLookupResponse"/>（新结构）
    /// 400：参数错误
    /// 404：地区不支持或未找到地块
    /// 499：客户端取消
    /// 5xx：服务内部错误
    /// </returns>
    [HttpPost("/api/lookup")]
    [Produces("application/json")]
    public async Task<IActionResult> LookupAsync([FromBody] SiteLookupRequest req)
    {
        var address = (req?.Address ?? "").Trim();
        var lang = NormalizeLang(req?.Lang);
        if (string.IsNullOrWhiteSpace(address))
            return BadRequest(new { detail = Msg(lang, "地址不能为空", "Address cannot be empty") });

        try
        {
            return Ok(await RunPipelineAsync(address, lang, HttpContext.RequestAborted));
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499);
        }
        catch (LookupProviderException ex)
        {
            return StatusCode(ex.StatusCode, new { detail = Msg(lang, ex.Message, ex.Message) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lookup pipeline 异常 address={Address}", address);
            return StatusCode(StatusCodes.Status500InternalServerError, new { detail = Msg(lang, "服务器内部错误", "Internal server error") });
        }
    }

    /// <summary>
    /// 执行查询流水线：region 选择 -> subject 抓取 -> nearby 抓取 -> plan 计算 -> computed 组装。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <param name="lang">语言（<c>zh</c>/<c>en</c>）。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>新的响应结构。</returns>
    private async Task<SiteLookupResponse> RunPipelineAsync(string address, string lang, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        var adapter = _regions.Resolve(address);
        if (adapter is null)
            throw new LookupProviderException(404, Msg(lang, "当前地址所属地区暂不支持", "Region not supported"));

        _logger.LogInformation("Lookup pipeline 开始 address={Address} lang={Lang} region={Region}", address, lang, adapter.Name);

        var subject = await adapter.FetchSubjectAsync(address, cancellationToken);
        _logger.LogInformation("Lookup pipeline step=FetchSubject elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        if (subject is null)
            throw new LookupProviderException(404, Msg(lang, "未找到对应地块", "Parcel not found"));

        var subjectBuildingsFiltered = FilterSubjectBuildings(subject.Parcel, subject.Buildings);
        var subjectForPlan = new SiteSubjectData
        {
            Provider = subject.Provider,
            City = subject.City,
            State = subject.State,
            Lat = subject.Lat,
            Lon = subject.Lon,
            StreetName = subject.StreetName,
            Parcel = subject.Parcel,
            Buildings = subjectBuildingsFiltered,
            ParcelBbox = subject.ParcelBbox
        };

        var nearby = await adapter.FetchNearbyAsync(subject, cancellationToken);
        _logger.LogInformation("Lookup pipeline step=FetchNearby elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        var nearbyBuildingsFiltered = FilterNearbyBuildings(subject.Parcel, nearby.Buildings);
        var (subjectBuildingsDeduped, nearbyBuildingsDeduped) = DedupBuildings(subjectBuildingsFiltered, nearbyBuildingsFiltered);
        nearby = new SiteNearbyData
        {
            Parcels = nearby.Parcels,
            Roads = nearby.Roads,
            Buildings = nearbyBuildingsDeduped
        };
        var plan = await adapter.BuildPlanAsync(subjectForPlan, cancellationToken);
        _logger.LogInformation("Lookup pipeline step=BuildPlan elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);

        var rotationDeg = ComputeRotationDegFromNearbyRoads(
            subject.Parcel,
            nearby.Roads,
            subject.StreetName ?? "",
            -plan.RotationDeg,
            _logger);
        var computed = ComputeComputed(subject, plan, adapter.Policy, rotationDeg, _logger);
        _logger.LogInformation("Lookup pipeline step=ComputeComputed elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);

        LookupAiParcelInfo? aiParcelInfo = null;
        var enableAi = _cfg.GetValue<bool?>("Ai:Enabled") ?? false;
        if (enableAi)
        {
            try
            {
                var parcelJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Parcel)) as JsonObject ?? new JsonObject();
                var buildingsJson = JsonNode.Parse(GeoJsonStd.ToJson(subjectBuildingsDeduped)) as JsonObject ?? new JsonObject();
                var aiTimeoutSec = _cfg.GetValue<int?>("Ai:LookupTimeoutSeconds") ?? 6;
                using var aiCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                aiCts.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(aiTimeoutSec, 0, 30)));

                var r = await LookupAiParcelInfoHelper.TryGetAsync(
                    _cfg,
                    _httpFactory,
                    address,
                    subject.City,
                    subject.State,
                    parcelJson,
                    buildingsJson,
                    plan,
                    aiCts.Token,
                    _logger);
                aiParcelInfo = r.Info;
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("AI 地块信息超时，已跳过 address={Address}", address);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI 地块信息失败，已跳过 address={Address}", address);
            }
            _logger.LogInformation("Lookup pipeline step=AiParcelInfo elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        }
        else
        {
            aiParcelInfo = LookupAiParcelInfoHelper.BuildFallbackOnly(plan);
            _logger.LogInformation("AI 地块信息已禁用 address={Address}", address);
            _logger.LogInformation("Lookup pipeline step=AiParcelInfo(skipped) elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        }

        return new SiteLookupResponse
        {
            Request = new SiteRequestInfo { Address = address, Lang = lang },
            Region = new SiteRegionInfo
            {
                Provider = subject.Provider,
                City = subject.City,
                State = subject.State,
                Lat = subject.Lat,
                Lon = subject.Lon,
                StreetName = subject.StreetName ?? ""
            },
            SubjectParcel = subject.Parcel,
            SubjectBuildings = subjectBuildingsDeduped,
            NearbyParcels = nearby.Parcels,
            NearbyBuildings = nearby.Buildings,
            NearbyRoads = nearby.Roads,
            Computed = computed,
            ParcelInfo = new SiteParcelInfo { LotAreaSqft = ComputePolygonAreaSqft(plan.Lot.Polygon) },
            AiParcelInfo = aiParcelInfo
        };
    }

    /// <summary>
    /// 将 plan 与地区策略合成为前端易用的 computed 结构。
    /// </summary>
    /// <param name="subject">目标地块数据（用于未来扩展，当前仅为上下文保留）。</param>
    /// <param name="plan">统一 plan（英尺局部坐标系）。</param>
    /// <param name="policy">地区策略参数。</param>
    /// <param name="rotationDeg">
    /// 地图层旋转角（度）。
    /// 该值已按屏幕坐标系约定（Y 轴向下）输出，前端可直接用于 SVG 的 <c>rotate()</c>。
    /// </param>
    /// <returns>计算结果汇总。</returns>
    private static SiteComputed ComputeComputed(SiteSubjectData subject, LookupPlan plan, RegionPolicy policy, double rotationDeg, ILogger logger)
    {
        var sw = Stopwatch.StartNew();
        var setbacks = ComputeSetbacks(plan, policy);
        logger.LogInformation("ComputeComputed step=Setbacks elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);

        var subjectStructures = new List<SiteStructure>();
        var nearbyStructures = new List<SiteStructure>();
        foreach (var s in plan.Structures)
        {
            var poly = s.PolygonFt is null || s.PolygonFt.Count < 3
                ? RectToPolygon(s.RectFt.XFt, s.RectFt.YFt, s.RectFt.WFt, s.RectFt.HFt)
                : new SitePolygonFt { Points = s.PolygonFt.Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList() };

            var mapped = new SiteStructure
            {
                Role = s.Role,
                PolygonFt = poly,
                AreaSqft = s.AreaSqft
            };

            if (!string.IsNullOrWhiteSpace(s.Role))
                subjectStructures.Add(mapped);
            else
                nearbyStructures.Add(mapped);
        }

        var buildablePoly = plan.BuildablePolygon is null
            ? RectToPolygon(plan.BuildableZone.XFt, plan.BuildableZone.YFt, plan.BuildableZone.WFt, plan.BuildableZone.HFt)
            : new SitePolygonFt
            {
                Points = plan.BuildablePolygon.Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList()
            };
        if (plan.BuildableRings is not null && plan.BuildableRings.Count > 0)
        {
            var outer = plan.BuildableRings[0];
            buildablePoly = new SitePolygonFt
            {
                Points = outer.Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList(),
                Holes = plan.BuildableRings.Count <= 1
                    ? null
                    : plan.BuildableRings
                        .Skip(1)
                        .Select(r => r.Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList())
                        .ToList()
            };
        }
        if (buildablePoly.Points.Count < 3)
            buildablePoly = RectToPolygon(plan.BuildableZone.XFt, plan.BuildableZone.YFt, plan.BuildableZone.WFt, plan.BuildableZone.HFt);
        logger.LogInformation("ComputeComputed step=BuildablePoly elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);

        var driveway = ComputeDrivewayCorridor(plan, setbacks);
        logger.LogInformation("ComputeComputed step=Driveway elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        var fits = ComputeAduFits(buildablePoly, policy.AduModuleSizesFt);
        logger.LogInformation("ComputeComputed step=AduFits elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        var rulerLines = ComputeRulerLines(plan.Lot.Polygon, buildablePoly, plan.Structures);
        logger.LogInformation("ComputeComputed step=RulerLines elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        var buildableArea = TryConvertBuildableFtToGeoJson(subject.Parcel, plan, buildablePoly);
        logger.LogInformation("ComputeComputed step=BuildableGeoJson elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        var aduPlacementArea = TryConvertAduPlacementAreaFtToGeoJson(subject.Parcel, plan, buildablePoly);
        logger.LogInformation("ComputeComputed step=AduPlacementGeoJson elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);
        var deltaDeg = NormalizeDeg(rotationDeg - (-plan.RotationDeg));
        var flipSetbackLabels = Math.Abs(deltaDeg) > 135d;
        var cutouts = TryConvertCutoutsFtToGeoJson(subject.Parcel, plan, plan.CutoutsFt, flipSetbackLabels);
        logger.LogInformation("ComputeComputed step=CutoutsGeoJson elapsedMs={ElapsedMs}", sw.ElapsedMilliseconds);

        if (!plan.CanFitAdu)
        {
            fits = fits.Select(f => new SiteAduFit { W = f.W, H = f.H, CanFit = false }).ToList();
            aduPlacementArea = null;
        }

        return new SiteComputed
        {
            RotationDeg = rotationDeg,
            RulerLinesFt = rulerLines,
            SetbacksFt = setbacks,
            SubjectStructures = subjectStructures,
            NearbyStructures = nearbyStructures,
            DrivewayCorridorFt = driveway,
            BuildablePolygonFt = buildablePoly,
            BuildableArea = buildableArea,
            AduPlacementArea = aduPlacementArea,
            Cutouts = cutouts,
            AduFits = fits
        };
    }

    /// <summary>
    /// 生成“ADU 可放置中心点区域”（AduPlacementArea）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 目标：满足“ADU 整体任何部分都不能超出可建区域（而不仅仅检查四个角）”的约束。
    /// </para>
    /// <para>
    /// 做法：在 plan 英尺坐标系下，把真实可建区域几何做一次内缩（buffer -r）。
    /// 其中 r 取默认模块（<see cref="LookupPlan.Module"/>）外接圆半径：<c>r = 0.5 * sqrt(w^2 + h^2)</c>（单位：ft）。
    /// 这样当 ADU 允许任意角度旋转时，只要 ADU 的中心点落在该内缩区域内，就能保证整块 ADU 都在可建区内。
    /// </para>
    /// <para>
    /// 坐标系约定：
    /// - 输入几何：plan 英尺坐标系（与 <see cref="LookupPlan.BuildableRings"/> / <see cref="LookupPlan.BuildableMultiRings"/> 一致）
    /// - 输出几何：GeoJSON 经纬度（lon/lat），通过 <see cref="LookupPlan.Transform"/> 反变换生成
    /// </para>
    /// <para>
    /// 注意：这里的“整体不越界”针对“可建区域边界”，不包含“不得与建筑相交”等额外规则；建筑/通道等已在 buildable 生成阶段被扣除。
    /// </para>
    /// </remarks>
    /// <param name="subjectParcel">目标地块 GeoJSON Feature（用于将结果裁剪在地块范围内）。</param>
    /// <param name="plan">统一 plan（含 transform 与默认模块尺寸）。</param>
    /// <param name="buildableFt">可建区域多边形（plan 英尺坐标系）。</param>
    /// <returns>GeoJSON Polygon/MultiPolygon；失败或为空则返回 null。</returns>
    private static GeoJsonFeature? TryConvertAduPlacementAreaFtToGeoJson(
        GeoJsonFeature subjectParcel,
        LookupPlan plan,
        SitePolygonFt buildableFt)
    {
        try
        {
            if (plan.Transform is null) return null;
            if (plan.Module is null) return null;

            var w = plan.Module.WFt;
            var h = plan.Module.HFt;
            if (!double.IsFinite(w) || !double.IsFinite(h) || w <= 0 || h <= 0) return null;

            var r = 0.5d * Math.Sqrt(w * w + h * h);
            if (!double.IsFinite(r) || r <= 0) return null;

            const double ftPerM = 3.280839895013123;
            var gf = GeometryFactory.Default;

            static (double lon, double lat) MercatorToLonLat(double x, double y)
            {
                const double rLocal = 6378137d;
                var lon = (x / rLocal) * 180d / Math.PI;
                var lat = (2d * Math.Atan(Math.Exp(y / rLocal)) - Math.PI / 2d) * 180d / Math.PI;
                return (lon, lat);
            }

            static (double x, double y) Rotate(double x, double y, double angleRad)
            {
                var c = Math.Cos(angleRad);
                var s = Math.Sin(angleRad);
                return (x * c - y * s, x * s + y * c);
            }

            static Coordinate[]? ToClosedFtCoords(List<SitePointFt> ring)
            {
                if (ring.Count < 3) return null;
                var coords = new List<Coordinate>(ring.Count + 1);
                foreach (var p in ring)
                {
                    if (!double.IsFinite(p.X) || !double.IsFinite(p.Y)) continue;
                    coords.Add(new Coordinate(p.X, p.Y));
                }
                if (coords.Count < 3) return null;
                if (!coords[0].Equals2D(coords[^1]))
                    coords.Add(new Coordinate(coords[0]));
                return coords.Count < 4 ? null : coords.ToArray();
            }

            Polygon? TryCreateFtPolygon(List<SitePointFt> outer, List<List<SitePointFt>>? holes)
            {
                var shellCoords = ToClosedFtCoords(outer);
                if (shellCoords is null) return null;
                var shell = gf.CreateLinearRing(shellCoords);
                var holeRings = new List<LinearRing>();
                if (holes is not null)
                {
                    foreach (var h0 in holes)
                    {
                        var hc = ToClosedFtCoords(h0);
                        if (hc is null) continue;
                        holeRings.Add(gf.CreateLinearRing(hc));
                    }
                }
                var poly = gf.CreatePolygon(shell, holeRings.Count == 0 ? null : holeRings.ToArray());
                if (poly.IsValid) return poly;
                var fixedGeom = poly.Buffer(0);
                return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
            }

            Geometry? buildableFtGeom = null;
            if (plan.BuildableMultiRings is not null && plan.BuildableMultiRings.Count > 0)
            {
                var polys = new List<Polygon>();
                foreach (var poly in plan.BuildableMultiRings)
                {
                    if (poly.Count == 0) continue;
                    var outer = poly[0].Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList();
                    var holes = poly.Count <= 1
                        ? null
                        : poly.Skip(1).Select(r => r.Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList()).ToList();
                    var p0 = TryCreateFtPolygon(outer, holes);
                    if (p0 is not null && !p0.IsEmpty) polys.Add(p0);
                }
                if (polys.Count == 1) buildableFtGeom = polys[0];
                else if (polys.Count > 1) buildableFtGeom = gf.CreateGeometryCollection(polys.Cast<Geometry>().ToArray()).Union();
            }
            else
            {
                buildableFtGeom = TryCreateFtPolygon(buildableFt.Points, buildableFt.Holes);
            }

            if (buildableFtGeom is null || buildableFtGeom.IsEmpty) return null;

            var bufferParams = new BufferParameters
            {
                JoinStyle = JoinStyle.Mitre,
                EndCapStyle = EndCapStyle.Square,
                QuadrantSegments = 1,
                MitreLimit = 50d
            };
            var inset = BufferOp.Buffer(buildableFtGeom, -r, bufferParams);
            if (inset is null || inset.IsEmpty) return null;

            List<double[]> MapRingFt(Coordinate[] coordsFt)
            {
                var outPts = new List<double[]>();
                foreach (var c in coordsFt)
                {
                    if (!double.IsFinite(c.X) || !double.IsFinite(c.Y)) continue;
                    var rotX = plan.Transform.MinRotX + (c.X / ftPerM);
                    var rotY = plan.Transform.MaxRotY - (c.Y / ftPerM);
                    var (relX, relY) = Rotate(rotX, rotY, -plan.Transform.AngleRad);
                    var mx = plan.Transform.CenterMercX + relX;
                    var my = plan.Transform.CenterMercY + relY;
                    var (lon, lat) = MercatorToLonLat(mx, my);
                    if (!double.IsFinite(lon) || !double.IsFinite(lat)) continue;
                    outPts.Add(new[] { lon, lat });
                }
                if (outPts.Count >= 3)
                {
                    var a0 = outPts[0];
                    var a1 = outPts[^1];
                    if (Math.Abs(a0[0] - a1[0]) > 1e-12 || Math.Abs(a0[1] - a1[1]) > 1e-12)
                        outPts.Add(new[] { a0[0], a0[1] });
                }
                return outPts;
            }

            static IEnumerable<Polygon> ExtractPolys(Geometry g)
            {
                if (g.IsEmpty) yield break;
                if (g is Polygon p) { yield return p; yield break; }
                if (g is MultiPolygon mp)
                {
                    for (var i = 0; i < mp.NumGeometries; i++)
                        if (mp.GetGeometryN(i) is Polygon pp && !pp.IsEmpty) yield return pp;
                    yield break;
                }
                for (var i = 0; i < g.NumGeometries; i++)
                {
                    foreach (var p0 in ExtractPolys(g.GetGeometryN(i))) yield return p0;
                }
            }

            var polysLonLat = new List<List<List<double[]>>>();
            foreach (var p in ExtractPolys(inset).Where(p => p.Area > 1e-6))
            {
                var rings = new List<List<double[]>>();
                var outer = MapRingFt(p.ExteriorRing.Coordinates);
                if (outer.Count < 4) continue;
                rings.Add(outer);
                for (var i = 0; i < p.NumInteriorRings; i++)
                {
                    var hr = MapRingFt(p.GetInteriorRingN(i).Coordinates);
                    if (hr.Count >= 4) rings.Add(hr);
                }
                polysLonLat.Add(rings);
            }
            if (polysLonLat.Count == 0) return null;

            var isMulti = polysLonLat.Count > 1;
            var coords = System.Text.Json.JsonSerializer.SerializeToElement<object>(isMulti ? polysLonLat : polysLonLat[0]);
            return new GeoJsonFeature
            {
                Geometry = new GeoJsonGeometry { Type = isMulti ? "MultiPolygon" : "Polygon", Coordinates = coords },
                Properties = System.Text.Json.JsonSerializer.SerializeToElement(new Dictionary<string, object?> { ["kind"] = "adu-placement-area" })
            };
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 将 plan 中记录的“被抠掉区域”（英尺坐标系）转换为 GeoJSON FeatureCollection（经纬度坐标系），用于前端叠加调试。
    /// </summary>
    /// <param name="subjectParcel">目标地块 GeoJSON Feature（用于可选裁剪）。</param>
    /// <param name="plan">统一 plan（含 transform）。</param>
    /// <param name="cutoutsFt">抠掉区域列表（英尺坐标系）。</param>
    /// <param name="flipSetbackLabels">
    /// 是否将“前/后/左/右退界”的标签做 180° 翻转修正（仅影响调试 cutouts 的 reason/label，不改变几何）。
    /// 当 plan 的朝向推断与地图层旋转（<paramref name="plan"/> vs computed.rotationDeg）存在约 180° 差异时，
    /// 若不修正，前端会出现“地块/建筑朝向正确，但 cutouts 的 front/rear、left/right 语义反了”的观感。
    /// </param>
    /// <returns>GeoJSON FeatureCollection（每个 feature 对应一个抠掉片区）；无数据则返回 null。</returns>
    private static GeoJsonFeatureCollection? TryConvertCutoutsFtToGeoJson(
        GeoJsonFeature subjectParcel,
        LookupPlan plan,
        List<LookupCutoutArea>? cutoutsFt,
        bool flipSetbackLabels)
    {
        if (cutoutsFt is null || cutoutsFt.Count == 0) return null;
        if (plan.Transform is null) return null;

        try
        {
            const double ftPerM = 3.280839895013123;
            var gf = GeometryFactory.Default;

            static (double lon, double lat) MercatorToLonLat(double x, double y)
            {
                const double rLocal = 6378137d;
                var lon = (x / rLocal) * 180d / Math.PI;
                var lat = (2d * Math.Atan(Math.Exp(y / rLocal)) - Math.PI / 2d) * 180d / Math.PI;
                return (lon, lat);
            }

            static (double x, double y) Rotate(double x, double y, double angleRad)
            {
                var c = Math.Cos(angleRad);
                var s = Math.Sin(angleRad);
                return (x * c - y * s, x * s + y * c);
            }

            static Coordinate[]? ToClosedCoords(List<double[]> ring)
            {
                if (ring.Count < 3) return null;
                var coords = new List<Coordinate>(ring.Count + 1);
                foreach (var p in ring)
                {
                    if (p.Length < 2) continue;
                    var x = p[0];
                    var y = p[1];
                    if (!double.IsFinite(x) || !double.IsFinite(y)) continue;
                    if (coords.Count > 0)
                    {
                        var prev = coords[^1];
                        if (Math.Abs(prev.X - x) < 1e-12 && Math.Abs(prev.Y - y) < 1e-12) continue;
                    }
                    coords.Add(new Coordinate(x, y));
                }
                if (coords.Count < 3) return null;
                if (!coords[0].Equals2D(coords[^1]))
                    coords.Add(new Coordinate(coords[0]));
                return coords.Count < 4 ? null : coords.ToArray();
            }

            Polygon? TryCreatePolygonFromRings(List<List<double[]>> ringsLonLat)
            {
                if (ringsLonLat.Count == 0) return null;
                var shellCoords = ToClosedCoords(ringsLonLat[0]);
                if (shellCoords is null) return null;
                LinearRing shell;
                try
                {
                    shell = gf.CreateLinearRing(shellCoords);
                }
                catch (ArgumentException)
                {
                    return null;
                }
                var holes = new List<LinearRing>();
                for (var i = 1; i < ringsLonLat.Count; i++)
                {
                    var holeCoords = ToClosedCoords(ringsLonLat[i]);
                    if (holeCoords is null) continue;
                    try
                    {
                        holes.Add(gf.CreateLinearRing(holeCoords));
                    }
                    catch (ArgumentException)
                    {
                        continue;
                    }
                }
                var poly = gf.CreatePolygon(shell, holes.Count == 0 ? null : holes.ToArray());
                if (poly.IsValid) return poly;
                var fixedGeom = poly.Buffer(0);
                return fixedGeom switch
                {
                    Polygon p => p,
                    MultiPolygon mp => mp.Geometries.OfType<Polygon>().OrderByDescending(x => x.Area).FirstOrDefault(),
                    _ => null
                };
            }

            Polygon? TryCreateLargestParcelPolygon(GeoJsonFeature parcel)
            {
                var coords = parcel.Geometry.Coordinates;
                if (coords.ValueKind != JsonValueKind.Array) return null;

                static List<double[]> ReadRing(JsonElement ring)
                {
                    var outPts = new List<double[]>();
                    if (ring.ValueKind != JsonValueKind.Array) return outPts;
                    foreach (var p in ring.EnumerateArray())
                    {
                        if (p.ValueKind != JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                        var lon = p[0].GetDouble();
                        var lat = p[1].GetDouble();
                        if (!double.IsFinite(lon) || !double.IsFinite(lat)) continue;
                        outPts.Add(new[] { lon, lat });
                    }
                    return outPts;
                }

                static double RingAreaAbs(List<double[]> ring)
                {
                    if (ring.Count < 3) return 0;
                    double a2 = 0;
                    for (var i = 0; i < ring.Count - 1; i++)
                        a2 += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
                    return Math.Abs(a2) / 2d;
                }

                List<double[]>? best = null;
                var bestArea = 0d;
                if (string.Equals(parcel.Geometry.Type, "Polygon", StringComparison.OrdinalIgnoreCase))
                {
                    if (coords.GetArrayLength() == 0) return null;
                    best = ReadRing(coords[0]);
                }
                else if (string.Equals(parcel.Geometry.Type, "MultiPolygon", StringComparison.OrdinalIgnoreCase))
                {
                    foreach (var poly in coords.EnumerateArray())
                    {
                        if (poly.ValueKind != JsonValueKind.Array || poly.GetArrayLength() == 0) continue;
                        var ring0 = ReadRing(poly[0]);
                        var a = RingAreaAbs(ring0);
                        if (a > bestArea)
                        {
                            bestArea = a;
                            best = ring0;
                        }
                    }
                }
                if (best is null) return null;
                return TryCreatePolygonFromRings(new List<List<double[]>> { best });
            }

            var parcelPoly = TryCreateLargestParcelPolygon(subjectParcel);

            List<double[]> MapRingFt(List<FtPoint> pts)
            {
                var outPts = new List<double[]>();
                foreach (var p in pts)
                {
                    if (!double.IsFinite(p.XFt) || !double.IsFinite(p.YFt)) continue;
                    var rotX = plan.Transform.MinRotX + (p.XFt / ftPerM);
                    var rotY = plan.Transform.MaxRotY - (p.YFt / ftPerM);
                    var (relX, relY) = Rotate(rotX, rotY, -plan.Transform.AngleRad);
                    var mercX = plan.Transform.CenterMercX + relX;
                    var mercY = plan.Transform.CenterMercY + relY;
                    var (lon, lat) = MercatorToLonLat(mercX, mercY);
                    outPts.Add(new[] { lon, lat });
                }
                if (outPts.Count >= 3)
                {
                    var a0 = outPts[0];
                    var a1 = outPts[^1];
                    if (Math.Abs(a0[0] - a1[0]) > 1e-9 || Math.Abs(a0[1] - a1[1]) > 1e-9)
                        outPts.Add(new[] { a0[0], a0[1] });
                }
                return outPts;
            }

            var features = new List<GeoJsonFeature>();
            foreach (var cut in cutoutsFt)
            {
                if (cut.MultiRings.Count == 0) continue;
                var reason = cut.Reason;
                var labelZh = cut.LabelZh;
                var labelEn = cut.LabelEn;
                if (flipSetbackLabels)
                {
                    if (string.Equals(reason, "setback-front", StringComparison.Ordinal))
                    {
                        reason = "setback-rear";
                        labelZh = "后退界";
                        labelEn = "Rear setback";
                    }
                    else if (string.Equals(reason, "setback-rear", StringComparison.Ordinal))
                    {
                        reason = "setback-front";
                        labelZh = "前院/前退界";
                        labelEn = "Front yard / front setback";
                    }
                    else if (string.Equals(reason, "setback-side-left", StringComparison.Ordinal))
                    {
                        reason = "setback-side-right";
                        labelZh = "右侧退界";
                        labelEn = "Right side setback";
                    }
                    else if (string.Equals(reason, "setback-side-right", StringComparison.Ordinal))
                    {
                        reason = "setback-side-left";
                        labelZh = "左侧退界";
                        labelEn = "Left side setback";
                    }
                }

                foreach (var poly in cut.MultiRings)
                {
                    if (poly.Count == 0) continue;
                    var ringsLonLat = new List<List<double[]>>();
                    foreach (var ring in poly)
                    {
                        if (ring.Count < 3) continue;
                        var mapped = MapRingFt(ring);
                        if (mapped.Count >= 4) ringsLonLat.Add(mapped);
                    }
                    if (ringsLonLat.Count == 0) continue;

                    static IEnumerable<Polygon> ExtractPolygons(Geometry g)
                    {
                        if (g.IsEmpty) yield break;
                        if (g is Polygon p) { yield return p; yield break; }
                        if (g is MultiPolygon mp)
                        {
                            for (var i = 0; i < mp.NumGeometries; i++)
                                if (mp.GetGeometryN(i) is Polygon pp && !pp.IsEmpty) yield return pp;
                            yield break;
                        }
                        if (g is GeometryCollection gc)
                        {
                            for (var i = 0; i < gc.NumGeometries; i++)
                            {
                                var sub = gc.GetGeometryN(i);
                                if (sub is null || sub.IsEmpty) continue;
                                if (ReferenceEquals(sub, g)) continue;
                                foreach (var p0 in ExtractPolygons(sub)) yield return p0;
                            }
                            yield break;
                        }
                        if (g.NumGeometries == 1 && ReferenceEquals(g.GetGeometryN(0), g))
                            yield break;
                        for (var i = 0; i < g.NumGeometries; i++)
                        {
                            var sub = g.GetGeometryN(i);
                            if (sub is null || sub.IsEmpty) continue;
                            if (ReferenceEquals(sub, g)) continue;
                            foreach (var p0 in ExtractPolygons(sub)) yield return p0;
                        }
                    }

                    var props = new Dictionary<string, object?>
                    {
                        ["reason"] = reason,
                        ["labelZh"] = labelZh,
                        ["labelEn"] = labelEn
                    };

                    if (parcelPoly is null)
                    {
                        var coords = System.Text.Json.JsonSerializer.SerializeToElement<object>(ringsLonLat);
                        features.Add(new GeoJsonFeature
                        {
                            Geometry = new GeoJsonGeometry { Type = "Polygon", Coordinates = coords },
                            Properties = System.Text.Json.JsonSerializer.SerializeToElement(props)
                        });
                        continue;
                    }

                    var polyLonLat = TryCreatePolygonFromRings(ringsLonLat);
                    if (polyLonLat is null || polyLonLat.IsEmpty)
                    {
                        var coords = System.Text.Json.JsonSerializer.SerializeToElement<object>(ringsLonLat);
                        features.Add(new GeoJsonFeature
                        {
                            Geometry = new GeoJsonGeometry { Type = "Polygon", Coordinates = coords },
                            Properties = System.Text.Json.JsonSerializer.SerializeToElement(props)
                        });
                        continue;
                    }

                    Geometry clipped;
                    try
                    {
                        clipped = polyLonLat.Intersection(parcelPoly);
                    }
                    catch
                    {
                        clipped = polyLonLat;
                    }
                    if (!clipped.IsValid) clipped = clipped.Buffer(0);

                    var clippedPolys = ExtractPolygons(clipped).Where(p => p.Area > 1e-9).ToList();
                    if (clippedPolys.Count == 0)
                    {
                        var coords = System.Text.Json.JsonSerializer.SerializeToElement<object>(ringsLonLat);
                        features.Add(new GeoJsonFeature
                        {
                            Geometry = new GeoJsonGeometry { Type = "Polygon", Coordinates = coords },
                            Properties = System.Text.Json.JsonSerializer.SerializeToElement(props)
                        });
                        continue;
                    }

                    foreach (var p in clippedPolys)
                    {
                        var outRings = new List<List<double[]>>();
                        outRings.Add(p.ExteriorRing.Coordinates.Select(c => new[] { c.X, c.Y }).ToList());
                        for (var i = 0; i < p.NumInteriorRings; i++)
                            outRings.Add(p.GetInteriorRingN(i).Coordinates.Select(c => new[] { c.X, c.Y }).ToList());

                        var coords = System.Text.Json.JsonSerializer.SerializeToElement<object>(outRings);
                        features.Add(new GeoJsonFeature
                        {
                            Geometry = new GeoJsonGeometry { Type = "Polygon", Coordinates = coords },
                            Properties = System.Text.Json.JsonSerializer.SerializeToElement(props)
                        });
                    }
                }
            }

            return features.Count == 0
                ? null
                : new GeoJsonFeatureCollection { Type = "FeatureCollection", Features = features };
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 将 plan 英尺坐标系下的可建多边形（含洞）转换为 GeoJSON（经纬度）。
    /// </summary>
    /// <remarks>
    /// 该转换依赖 <see cref="LookupPlan.Transform"/> 提供的反变换参数。
    /// 失败时返回 null（前端可回退到不显示可建区）。
    /// </remarks>
    private static GeoJsonFeature? TryConvertBuildableFtToGeoJson(GeoJsonFeature subjectParcel, LookupPlan plan, SitePolygonFt buildableFt)
    {
        try
        {
            const double ftPerM = 3.280839895013123;
            var gf = GeometryFactory.Default;

            static (double lon, double lat) MercatorToLonLat(double x, double y)
            {
                const double rLocal = 6378137d;
                var lon = (x / rLocal) * 180d / Math.PI;
                var lat = (2d * Math.Atan(Math.Exp(y / rLocal)) - Math.PI / 2d) * 180d / Math.PI;
                return (lon, lat);
            }

            static (double x, double y) Rotate(double x, double y, double angleRad)
            {
                var c = Math.Cos(angleRad);
                var s = Math.Sin(angleRad);
                return (x * c - y * s, x * s + y * c);
            }

            static Polygon? ExtractLargestPolygon(Geometry geom)
            {
                if (geom.IsEmpty) return null;
                if (geom is Polygon p) return p;
                if (geom is MultiPolygon mp)
                    return mp.Geometries.OfType<Polygon>().OrderByDescending(x => x.Area).FirstOrDefault();
                return geom.NumGeometries > 0
                    ? Enumerable.Range(0, geom.NumGeometries)
                        .Select(i => ExtractLargestPolygon(geom.GetGeometryN(i)))
                        .Where(p0 => p0 is not null)
                        .OrderByDescending(p0 => p0!.Area)
                        .FirstOrDefault()
                    : null;
            }

            static Coordinate[]? ToClosedCoords(List<double[]> ring)
            {
                if (ring.Count < 3) return null;
                var coords = new List<Coordinate>(ring.Count + 1);
                foreach (var p in ring)
                {
                    if (p.Length < 2) continue;
                    var x = p[0];
                    var y = p[1];
                    if (!double.IsFinite(x) || !double.IsFinite(y)) continue;
                    coords.Add(new Coordinate(x, y));
                }
                if (coords.Count < 3) return null;
                if (!coords[0].Equals2D(coords[^1]))
                    coords.Add(new Coordinate(coords[0]));
                if (coords.Count < 4) return null;
                return coords.ToArray();
            }

            Polygon? TryCreatePolygonFromRings(List<List<double[]>> ringsLonLat)
            {
                if (ringsLonLat.Count == 0) return null;
                var shellCoords = ToClosedCoords(ringsLonLat[0]);
                if (shellCoords is null) return null;
                var shell = gf.CreateLinearRing(shellCoords);
                var holes = new List<LinearRing>();
                for (var i = 1; i < ringsLonLat.Count; i++)
                {
                    var holeCoords = ToClosedCoords(ringsLonLat[i]);
                    if (holeCoords is null) continue;
                    holes.Add(gf.CreateLinearRing(holeCoords));
                }
                var poly = gf.CreatePolygon(shell, holes.Count == 0 ? null : holes.ToArray());
                if (poly.IsValid) return poly;
                var fixedGeom = poly.Buffer(0);
                return ExtractLargestPolygon(fixedGeom);
            }

            Polygon? TryCreateLargestParcelPolygon(GeoJsonFeature parcel)
            {
                var coords = parcel.Geometry.Coordinates;
                if (coords.ValueKind != JsonValueKind.Array) return null;

                static List<double[]> ReadRing(JsonElement ring)
                {
                    var outPts = new List<double[]>();
                    if (ring.ValueKind != JsonValueKind.Array) return outPts;
                    foreach (var p in ring.EnumerateArray())
                    {
                        if (p.ValueKind != JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                        var lon = p[0].GetDouble();
                        var lat = p[1].GetDouble();
                        if (!double.IsFinite(lon) || !double.IsFinite(lat)) continue;
                        outPts.Add(new[] { lon, lat });
                    }
                    return outPts;
                }

                static double RingAreaAbs(List<double[]> ring)
                {
                    if (ring.Count < 3) return 0;
                    double a2 = 0;
                    for (var i = 0; i < ring.Count - 1; i++)
                        a2 += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
                    return Math.Abs(a2) / 2d;
                }

                List<double[]>? best = null;
                var bestArea = 0d;

                if (string.Equals(parcel.Geometry.Type, "Polygon", StringComparison.OrdinalIgnoreCase))
                {
                    if (coords.GetArrayLength() == 0) return null;
                    var ring0 = ReadRing(coords[0]);
                    best = ring0;
                }
                else if (string.Equals(parcel.Geometry.Type, "MultiPolygon", StringComparison.OrdinalIgnoreCase))
                {
                    foreach (var poly in coords.EnumerateArray())
                    {
                        if (poly.ValueKind != JsonValueKind.Array || poly.GetArrayLength() == 0) continue;
                        var ring0 = ReadRing(poly[0]);
                        var a = RingAreaAbs(ring0);
                        if (a > bestArea)
                        {
                            bestArea = a;
                            best = ring0;
                        }
                    }
                }

                if (best is null) return null;
                var polyNts = TryCreatePolygonFromRings(new List<List<double[]>> { best });
                return polyNts;
            }

            List<double[]> MapRing(List<SitePointFt> pts)
            {
                var outPts = new List<double[]>();
                foreach (var p in pts)
                {
                    if (!double.IsFinite(p.X) || !double.IsFinite(p.Y)) continue;
                    var rotX = plan.Transform.MinRotX + (p.X / ftPerM);
                    var rotY = plan.Transform.MaxRotY - (p.Y / ftPerM);
                    var (relX, relY) = Rotate(rotX, rotY, -plan.Transform.AngleRad);
                    var mx = plan.Transform.CenterMercX + relX;
                    var my = plan.Transform.CenterMercY + relY;
                    var (lon, lat) = MercatorToLonLat(mx, my);
                    if (!double.IsFinite(lon) || !double.IsFinite(lat)) continue;
                    outPts.Add(new[] { lon, lat });
                }

                if (outPts.Count >= 3)
                {
                    var first = outPts[0];
                    var last = outPts[^1];
                    if (Math.Abs(first[0] - last[0]) > 1e-12 || Math.Abs(first[1] - last[1]) > 1e-12)
                        outPts.Add(new[] { first[0], first[1] });
                }
                return outPts;
            }

            List<List<List<double[]>>> polygonsLonLat = new();
            if (plan.BuildableMultiRings is not null && plan.BuildableMultiRings.Count > 0)
            {
                foreach (var poly in plan.BuildableMultiRings)
                {
                    if (poly.Count == 0) continue;
                    var ringsLonLat = new List<List<double[]>>();
                    foreach (var ringFt in poly)
                    {
                        if (ringFt is null || ringFt.Count < 3) continue;
                        var ring = MapRing(ringFt.Select(p => new SitePointFt { X = p.XFt, Y = p.YFt }).ToList());
                        if (ring.Count >= 4) ringsLonLat.Add(ring);
                    }
                    if (ringsLonLat.Count > 0) polygonsLonLat.Add(ringsLonLat);
                }
            }
            else
            {
                var ringsLonLat = new List<List<double[]>>();
                var outer = MapRing(buildableFt.Points);
                if (outer.Count < 4) return null;
                ringsLonLat.Add(outer);

                if (buildableFt.Holes is not null)
                {
                    foreach (var hole in buildableFt.Holes)
                    {
                        if (hole.Count < 3) continue;
                        var hr = MapRing(hole);
                        if (hr.Count >= 4) ringsLonLat.Add(hr);
                    }
                }
                polygonsLonLat.Add(ringsLonLat);
            }

            var parcelPoly = TryCreateLargestParcelPolygon(subjectParcel);
            var buildableGeoms = polygonsLonLat
                .Select(r => TryCreatePolygonFromRings(r))
                .Where(p => p is not null && !p.IsEmpty)
                .Cast<Polygon>()
                .Select(p => (Geometry)p)
                .ToList();
            Geometry? buildableGeomLonLat = buildableGeoms.Count switch
            {
                0 => null,
                1 => buildableGeoms[0],
                _ => gf.CreateGeometryCollection(buildableGeoms.ToArray()).Union()
            };

            if (parcelPoly is not null && buildableGeomLonLat is not null && !parcelPoly.IsEmpty && !buildableGeomLonLat.IsEmpty)
            {
                Geometry clipped = buildableGeomLonLat.Intersection(parcelPoly);
                if (!clipped.IsValid) clipped = clipped.Buffer(0);
                var polys = new List<Polygon>();
                void AddPolys(Geometry g)
                {
                    if (g.IsEmpty) return;
                    if (g is Polygon p) { polys.Add(p); return; }
                    if (g is MultiPolygon mp)
                    {
                        for (var i = 0; i < mp.NumGeometries; i++)
                            if (mp.GetGeometryN(i) is Polygon pp && !pp.IsEmpty) polys.Add(pp);
                        return;
                    }
                    for (var i = 0; i < g.NumGeometries; i++) AddPolys(g.GetGeometryN(i));
                }
                AddPolys(clipped);
                polys = polys.Where(p => p.Area > 1e-9).OrderByDescending(p => p.Area).ToList();
                if (polys.Count == 0) return null;

                polygonsLonLat = new List<List<List<double[]>>>();
                foreach (var p in polys)
                {
                    var rings = new List<List<double[]>>();
                    rings.Add(p.ExteriorRing.Coordinates.Select(c => new[] { c.X, c.Y }).ToList());
                    for (var i = 0; i < p.NumInteriorRings; i++)
                        rings.Add(p.GetInteriorRingN(i).Coordinates.Select(c => new[] { c.X, c.Y }).ToList());
                    polygonsLonLat.Add(rings);
                }
            }

            var isMulti = polygonsLonLat.Count > 1;
            var coords = System.Text.Json.JsonSerializer.SerializeToElement<object>(isMulti ? polygonsLonLat : polygonsLonLat[0]);
            return new GeoJsonFeature
            {
                Geometry = new GeoJsonGeometry { Type = isMulti ? "MultiPolygon" : "Polygon", Coordinates = coords },
                Properties = System.Text.Json.JsonSerializer.SerializeToElement(new Dictionary<string, object?> { ["kind"] = "buildable-area" })
            };
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 过滤 nearbyBuildings：剔除落在目标地块（subject parcel）内部的建筑。
    /// </summary>
    /// <remarks>
    /// 背景：
    /// nearbyBuildings 的查询 bbox 会覆盖目标地块，因此上游（Overpass / 城市数据）经常把目标地块内的建筑也返回进来，
    /// 造成同一建筑同时出现在 <c>subjectBuildings</c> 与 <c>nearbyBuildings</c>，前端渲染时就会出现“重复建筑轮廓”。
    ///
    /// 判定策略：
    /// - 将 subjectParcel 与 building geometry 解析为多边形（必要时 buffer(0) 修复无效几何）。
    /// - 取 building polygon 的质心（centroid），若 subjectParcel covers(centroid) 则认为该建筑属于 subject，应从 nearby 剔除。
    ///
    /// 说明：
    /// - 这里使用 centroid 判定是为了速度与鲁棒性（避免复杂的 polygon/polygon 覆盖判断）。
    /// - 若遇到极端凹多边形导致 centroid 落在外部的情况，可能会漏剔除；后续可按需升级为 covers(polygon)。
    /// </remarks>
    /// <param name="subjectParcel">目标地块 GeoJSON Feature（Polygon/MultiPolygon）。</param>
    /// <param name="nearbyBuildings">附近建筑 GeoJSON FeatureCollection（Polygon/MultiPolygon）。</param>
    /// <returns>过滤后的附近建筑集合。</returns>
    private static GeoJsonFeatureCollection FilterNearbyBuildings(GeoJsonFeature subjectParcel, GeoJsonFeatureCollection nearbyBuildings)
    {
        static Polygon? TryCreateLargestPolygon(GeoJsonFeature feature)
        {
            if (feature.Geometry.Coordinates.ValueKind != JsonValueKind.Array) return null;
            var gf = GeometryFactory.Default;

            static List<Coordinate>? ReadRing(JsonElement ring)
            {
                if (ring.ValueKind != JsonValueKind.Array) return null;
                var coords = new List<Coordinate>();
                foreach (var p in ring.EnumerateArray())
                {
                    if (p.ValueKind != JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                    var lon = p[0].GetDouble();
                    var lat = p[1].GetDouble();
                    if (!double.IsFinite(lon) || !double.IsFinite(lat)) continue;
                    coords.Add(new Coordinate(lon, lat));
                }
                if (coords.Count < 3) return null;
                if (!coords[0].Equals2D(coords[^1]))
                    coords.Add(new Coordinate(coords[0]));
                if (coords.Count < 4) return null;
                return coords;
            }

            static double RingAreaAbs(List<Coordinate> ring)
            {
                if (ring.Count < 4) return 0;
                double a = 0;
                for (var i = 0; i < ring.Count - 1; i++)
                    a += ring[i].X * ring[i + 1].Y - ring[i + 1].X * ring[i].Y;
                return Math.Abs(a) / 2d;
            }

            if (string.Equals(feature.Geometry.Type, "Polygon", StringComparison.OrdinalIgnoreCase))
            {
                var rings = feature.Geometry.Coordinates;
                if (rings.GetArrayLength() == 0) return null;
                var outer = ReadRing(rings[0]);
                if (outer is null) return null;
                var poly = gf.CreatePolygon(gf.CreateLinearRing(outer.ToArray()));
                if (!poly.IsValid)
                {
                    var fixedGeom = poly.Buffer(0);
                    return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
                }
                return poly;
            }

            if (string.Equals(feature.Geometry.Type, "MultiPolygon", StringComparison.OrdinalIgnoreCase))
            {
                var polys = feature.Geometry.Coordinates;
                Polygon? best = null;
                var bestArea = 0d;
                foreach (var polyEl in polys.EnumerateArray())
                {
                    if (polyEl.ValueKind != JsonValueKind.Array || polyEl.GetArrayLength() == 0) continue;
                    var outer = ReadRing(polyEl[0]);
                    if (outer is null) continue;
                    var cand = gf.CreatePolygon(gf.CreateLinearRing(outer.ToArray()));
                    var area = RingAreaAbs(outer);
                    if (area <= bestArea) continue;
                    bestArea = area;
                    best = cand;
                }
                if (best is null) return null;
                if (!best.IsValid)
                {
                    var fixedGeom = best.Buffer(0);
                    return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
                }
                return best;
            }

            return null;
        }

        var parcelPoly = TryCreateLargestPolygon(subjectParcel);
        if (parcelPoly is null || parcelPoly.IsEmpty) return nearbyBuildings;

        var kept = new List<GeoJsonFeature>();
        for (var i = 0; i < nearbyBuildings.Features.Count; i++)
        {
            var f = nearbyBuildings.Features[i];
            var bPoly = TryCreateLargestPolygon(f);
            if (bPoly is null || bPoly.IsEmpty)
            {
                kept.Add(f);
                continue;
            }

            var c = bPoly.Centroid;
            if (c is null || c.IsEmpty)
            {
                kept.Add(f);
                continue;
            }

            if (!parcelPoly.Covers(c))
                kept.Add(f);
        }

        return new GeoJsonFeatureCollection { Features = kept };
    }

    /// <summary>
    /// 过滤 subjectBuildings：只保留确实位于目标地块（subject parcel）内部的建筑。
    /// </summary>
    /// <remarks>
    /// 背景：
    /// subjectBuildings 的来源可能是按 bbox 或按邻域查询得到的“建筑集合”，并不保证每条 feature 都属于目标地块。
    /// 例如会出现隔壁门牌号（邻居）的建筑混入 subjectBuildings，导致：
    /// - 前端把邻居建筑当成“地块内建筑”显示；
    /// - plan 构建阶段把邻居房子误识别为主屋/车库，影响 buildable zone 与距离计算。
    ///
    /// 判定策略：
    /// - 同样使用 centroid 判定：若 subjectParcel covers(centroid) 则保留，否则丢弃。
    /// </remarks>
    /// <param name="subjectParcel">目标地块 GeoJSON Feature（Polygon/MultiPolygon）。</param>
    /// <param name="subjectBuildings">目标地块建筑集合（可能混入邻居建筑）。</param>
    /// <returns>过滤后的 subjectBuildings（只含地块内部建筑）。</returns>
    private static GeoJsonFeatureCollection FilterSubjectBuildings(GeoJsonFeature subjectParcel, GeoJsonFeatureCollection subjectBuildings)
    {
        static Polygon? TryCreateLargestPolygon(GeoJsonFeature feature)
        {
            if (feature.Geometry.Coordinates.ValueKind != JsonValueKind.Array) return null;
            var gf = GeometryFactory.Default;

            static List<Coordinate>? ReadRing(JsonElement ring)
            {
                if (ring.ValueKind != JsonValueKind.Array) return null;
                var coords = new List<Coordinate>();
                foreach (var p in ring.EnumerateArray())
                {
                    if (p.ValueKind != JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                    var lon = p[0].GetDouble();
                    var lat = p[1].GetDouble();
                    if (!double.IsFinite(lon) || !double.IsFinite(lat)) continue;
                    coords.Add(new Coordinate(lon, lat));
                }
                if (coords.Count < 3) return null;
                if (!coords[0].Equals2D(coords[^1]))
                    coords.Add(new Coordinate(coords[0]));
                if (coords.Count < 4) return null;
                return coords;
            }

            static double RingAreaAbs(List<Coordinate> ring)
            {
                if (ring.Count < 4) return 0;
                double a = 0;
                for (var i = 0; i < ring.Count - 1; i++)
                    a += ring[i].X * ring[i + 1].Y - ring[i + 1].X * ring[i].Y;
                return Math.Abs(a) / 2d;
            }

            if (string.Equals(feature.Geometry.Type, "Polygon", StringComparison.OrdinalIgnoreCase))
            {
                var rings = feature.Geometry.Coordinates;
                if (rings.GetArrayLength() == 0) return null;
                var outer = ReadRing(rings[0]);
                if (outer is null) return null;
                var poly = gf.CreatePolygon(gf.CreateLinearRing(outer.ToArray()));
                if (!poly.IsValid)
                {
                    var fixedGeom = poly.Buffer(0);
                    return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
                }
                return poly;
            }

            if (string.Equals(feature.Geometry.Type, "MultiPolygon", StringComparison.OrdinalIgnoreCase))
            {
                var polys = feature.Geometry.Coordinates;
                Polygon? best = null;
                var bestArea = 0d;
                foreach (var polyEl in polys.EnumerateArray())
                {
                    if (polyEl.ValueKind != JsonValueKind.Array || polyEl.GetArrayLength() == 0) continue;
                    var outer = ReadRing(polyEl[0]);
                    if (outer is null) continue;
                    var cand = gf.CreatePolygon(gf.CreateLinearRing(outer.ToArray()));
                    var area = RingAreaAbs(outer);
                    if (area <= bestArea) continue;
                    bestArea = area;
                    best = cand;
                }
                if (best is null) return null;
                if (!best.IsValid)
                {
                    var fixedGeom = best.Buffer(0);
                    return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
                }
                return best;
            }

            return null;
        }

        var parcelPoly = TryCreateLargestPolygon(subjectParcel);
        if (parcelPoly is null || parcelPoly.IsEmpty) return subjectBuildings;

        var kept = new List<GeoJsonFeature>();
        for (var i = 0; i < subjectBuildings.Features.Count; i++)
        {
            var f = subjectBuildings.Features[i];
            var bPoly = TryCreateLargestPolygon(f);
            if (bPoly is null || bPoly.IsEmpty)
                continue;

            var c = bPoly.Centroid;
            if (c is null || c.IsEmpty)
                continue;

            if (parcelPoly.Covers(c))
                kept.Add(f);
        }

        return new GeoJsonFeatureCollection { Features = kept };
    }

    /// <summary>
    /// 对 subjectBuildings 与 nearbyBuildings 做几何去重，避免前端渲染重复建筑轮廓。
    /// </summary>
    /// <remarks>
    /// 去重基于“几何坐标的归一化字符串”：
    /// - Key = geometry.type + normalized coordinates
    /// - 坐标归一化到 7 位小数，以抵御不同数据源/序列化导致的微小浮点差异
    ///
    /// 去重顺序：
    /// - 先把 subjectBuildings 去重并加入全局 seen 集合（subject 优先保留）
    /// - 再把 nearbyBuildings 中 key 已出现的剔除（防止 subject/nearby 重复）
    ///
    /// 说明：
    /// - 这是“强去重”：如果两个 feature 的几何完全一致（或归一化后一致）就会合并。
    /// - 若未来需要保留同几何但不同属性的 feature，可改为把 properties 某些字段也纳入 key。
    /// </remarks>
    /// <param name="subjectBuildings">目标地块建筑集合。</param>
    /// <param name="nearbyBuildings">附近建筑集合。</param>
    /// <returns>去重后的 (subject, nearby)。</returns>
    private static (GeoJsonFeatureCollection subject, GeoJsonFeatureCollection nearby) DedupBuildings(
        GeoJsonFeatureCollection subjectBuildings,
        GeoJsonFeatureCollection nearbyBuildings)
    {
        static string GeometryKey(GeoJsonFeature f)
        {
            var sb = new StringBuilder();
            sb.Append((f.Geometry.Type ?? "").Trim().ToLowerInvariant());
            sb.Append('|');
            AppendNormalizedCoordinates(sb, f.Geometry.Coordinates);
            return sb.ToString();
        }

        static void AppendNormalizedCoordinates(StringBuilder sb, JsonElement el)
        {
            if (el.ValueKind != JsonValueKind.Array)
            {
                sb.Append("n");
                return;
            }

            var len = el.GetArrayLength();
            if (len >= 2 &&
                el[0].ValueKind == JsonValueKind.Number &&
                el[1].ValueKind == JsonValueKind.Number)
            {
                var x = el[0].GetDouble();
                var y = el[1].GetDouble();
                if (!double.IsFinite(x) || !double.IsFinite(y))
                {
                    sb.Append("nan");
                    return;
                }

                sb.Append('p');
                sb.Append(Math.Round(x, 7).ToString("0.#######", CultureInfo.InvariantCulture));
                sb.Append(',');
                sb.Append(Math.Round(y, 7).ToString("0.#######", CultureInfo.InvariantCulture));
                return;
            }

            sb.Append('[');
            for (var i = 0; i < len; i++)
            {
                if (i > 0) sb.Append(';');
                AppendNormalizedCoordinates(sb, el[i]);
            }
            sb.Append(']');
        }

        var subjectOut = new List<GeoJsonFeature>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var f in subjectBuildings.Features)
        {
            var k = GeometryKey(f);
            if (!seen.Add(k)) continue;
            subjectOut.Add(f);
        }

        var nearbyOut = new List<GeoJsonFeature>();
        foreach (var f in nearbyBuildings.Features)
        {
            var k = GeometryKey(f);
            if (!seen.Add(k)) continue;
            nearbyOut.Add(f);
        }

        return (new GeoJsonFeatureCollection { Features = subjectOut }, new GeoJsonFeatureCollection { Features = nearbyOut });
    }

    /// <summary>
    /// 从 <c>nearbyRoads</c> 中选出“地址对应道路”，计算让该道路在画布中水平且位于地块上方的旋转角（度）。
    /// </summary>
    /// <remarks>
    /// 目标：
    /// - 前端不再二次推断角度，直接使用后端输出的 rotationDeg 对地图层做 <c>rotate()</c>。
    /// - “保持地块面前的路水平”：优先使用 front road（与 <paramref name="streetName"/> 匹配）在地块附近的线段方向。
    ///
    /// 算法概要：
    /// 1) 将道路几何与地块点投影到 WebMercator（米）。
    /// 2) 在匹配道路（或 fallback 到最近道路）中，找到离地块中心最近的线段，并取该线段方向作为“临路切线方向”。
    ///    说明：临路边可能是弧线/折线，此处按“最近点处的切线”对齐，让临路边在该处严格水平。
    /// 3) 令 rotationDeg = -atan2(dy, dx)（屏幕坐标系约定，Y 轴向下），使该临路切线旋转后严格水平。
    /// 4) 将角度规约到“无方向轴角”（把相差 180° 的线段方向视为同一方向），避免因上游坐标点序反向导致角度跳变。
    /// 5) 通过“道路最近点相对地块中心的向量”判断道路是否落在下方；若在下方则 +180° 翻转，确保前院朝上（带 1m 容差以避免抖动）。
    ///
    /// 说明：
    /// - 这里使用 nearbyRoads（即前端实际渲染的数据源）来计算角度，避免出现“后端用另一条线段算角度导致前端蓝线仍倾斜”的问题。
    /// </remarks>
    /// <param name="parcel">目标地块 GeoJSON Feature（Polygon/MultiPolygon）。</param>
    /// <param name="roads">附近道路 GeoJSON FeatureCollection（LineString/MultiLineString）。</param>
    /// <param name="streetName">地址解析得到的路名，用于匹配目标道路。</param>
    /// <param name="fallbackRotationDeg">无法计算时的回退角度（通常来自 plan）。</param>
    /// <returns>可直接用于前端 rotate() 的角度（度）。</returns>
    private static double ComputeRotationDegFromNearbyRoads(
        GeoJsonFeature parcel,
        GeoJsonFeatureCollection roads,
        string streetName,
        double fallbackRotationDeg,
        ILogger? logger = null)
    {
        static string NormalizeRoadName(string? s)
        {
            var raw = (s ?? "").Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(raw)) return "";
            var cleaned = new string(raw.Select(ch => char.IsLetterOrDigit(ch) || char.IsWhiteSpace(ch) ? ch : ' ').ToArray());
            cleaned = string.Join(" ", cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
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
            return cleaned.Trim();
        }

        static bool IsRoadNameMatch(string target, string candidate)
        {
            var t = NormalizeRoadName(target);
            var w = NormalizeRoadName(candidate);
            if (string.IsNullOrWhiteSpace(t) || string.IsNullOrWhiteSpace(w)) return false;
            if (w == t || w.Contains(t) || t.Contains(w)) return true;
            var tTokens = t.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var wTokens = w.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (tTokens.Length == 0 || wTokens.Length == 0) return false;
            var tSet = tTokens.ToHashSet(StringComparer.Ordinal);
            var wSet = wTokens.ToHashSet(StringComparer.Ordinal);
            var inter = tSet.Intersect(wSet, StringComparer.Ordinal).Count();
            var minCount = Math.Min(tSet.Count, wSet.Count);
            return inter >= minCount;
        }

        static (double x, double y) LonLatToMercator(double lon, double lat)
        {
            var r = 6378137d;
            var x = r * (lon * Math.PI / 180d);
            var latRad = Math.Clamp(lat, -85d, 85d) * Math.PI / 180d;
            var y = r * Math.Log(Math.Tan(Math.PI / 4d + latRad / 2d));
            return (x, y);
        }

        static string? TryGetRoadLabel(System.Text.Json.JsonElement props)
        {
            if (props.ValueKind != System.Text.Json.JsonValueKind.Object) return null;
            if (props.TryGetProperty("name", out var name) && name.ValueKind == System.Text.Json.JsonValueKind.String)
                return name.GetString();
            if (props.TryGetProperty("ref", out var rf) && rf.ValueKind == System.Text.Json.JsonValueKind.String)
                return rf.GetString();
            return null;
        }

        static List<(double lon, double lat)>? TryGetParcelOuterRing(GeoJsonFeature parcel)
        {
            var coords = parcel.Geometry.Coordinates;
            if (coords.ValueKind != System.Text.Json.JsonValueKind.Array) return null;

            if (string.Equals(parcel.Geometry.Type, "Polygon", StringComparison.OrdinalIgnoreCase))
            {
                if (coords.GetArrayLength() == 0) return null;
                var ring = coords[0];
                if (ring.ValueKind != System.Text.Json.JsonValueKind.Array) return null;
                var pts = new List<(double lon, double lat)>();
                foreach (var p in ring.EnumerateArray())
                {
                    if (p.ValueKind != System.Text.Json.JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                    var lon = p[0].GetDouble();
                    var lat = p[1].GetDouble();
                    pts.Add((lon, lat));
                }
                return pts.Count >= 3 ? pts : null;
            }

            if (string.Equals(parcel.Geometry.Type, "MultiPolygon", StringComparison.OrdinalIgnoreCase))
            {
                if (coords.GetArrayLength() == 0) return null;
                var poly0 = coords[0];
                if (poly0.ValueKind != System.Text.Json.JsonValueKind.Array || poly0.GetArrayLength() == 0) return null;
                var ring = poly0[0];
                if (ring.ValueKind != System.Text.Json.JsonValueKind.Array) return null;
                var pts = new List<(double lon, double lat)>();
                foreach (var p in ring.EnumerateArray())
                {
                    if (p.ValueKind != System.Text.Json.JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                    var lon = p[0].GetDouble();
                    var lat = p[1].GetDouble();
                    pts.Add((lon, lat));
                }
                return pts.Count >= 3 ? pts : null;
            }

            return null;
        }

        static IEnumerable<List<(double lon, double lat)>> EnumerateLines(GeoJsonGeometry geom)
        {
            var coords = geom.Coordinates;
            if (coords.ValueKind != System.Text.Json.JsonValueKind.Array) yield break;

            if (string.Equals(geom.Type, "LineString", StringComparison.OrdinalIgnoreCase))
            {
                var pts = new List<(double lon, double lat)>();
                foreach (var p in coords.EnumerateArray())
                {
                    if (p.ValueKind != System.Text.Json.JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                    pts.Add((p[0].GetDouble(), p[1].GetDouble()));
                }
                if (pts.Count >= 2) yield return pts;
                yield break;
            }

            if (string.Equals(geom.Type, "MultiLineString", StringComparison.OrdinalIgnoreCase))
            {
                foreach (var line in coords.EnumerateArray())
                {
                    if (line.ValueKind != System.Text.Json.JsonValueKind.Array) continue;
                    var pts = new List<(double lon, double lat)>();
                    foreach (var p in line.EnumerateArray())
                    {
                        if (p.ValueKind != System.Text.Json.JsonValueKind.Array || p.GetArrayLength() < 2) continue;
                        pts.Add((p[0].GetDouble(), p[1].GetDouble()));
                    }
                    if (pts.Count >= 2) yield return pts;
                }
            }
        }

        static double NormalizeDeg(double deg)
        {
            if (!double.IsFinite(deg)) return 0;
            deg %= 360d;
            if (deg <= -180d) deg += 360d;
            if (deg > 180d) deg -= 360d;
            return deg;
        }

        static double SnapRightAngleDeg(double deg)
        {
            deg = NormalizeDeg(deg);
            var snapped = Math.Round(deg / 90d) * 90d;
            return NormalizeDeg(snapped);
        }

        var ring0 = TryGetParcelOuterRing(parcel);
        if (ring0 is null) return SnapRightAngleDeg(fallbackRotationDeg);

        var merc = ring0.Select(p => LonLatToMercator(p.lon, p.lat)).ToList();
        if (merc.Count == 0) return SnapRightAngleDeg(fallbackRotationDeg);
        var centerX = merc.Average(p => p.x);
        var centerY = merc.Average(p => p.y);

        (double dx, double dy, double projX, double projY, string label)? bestMatch = null;
        var bestMatchDist2 = double.PositiveInfinity;
        (double dx, double dy, double projX, double projY, string label)? bestAny = null;
        var bestAnyDist2 = double.PositiveInfinity;

        foreach (var f in roads.Features)
        {
            var label = TryGetRoadLabel(f.Properties) ?? "";
            var isMatch = IsRoadNameMatch(streetName, label);

            foreach (var line in EnumerateLines(f.Geometry))
            {
                for (var i = 0; i < line.Count - 1; i++)
                {
                    var a = LonLatToMercator(line[i].lon, line[i].lat);
                    var b = LonLatToMercator(line[i + 1].lon, line[i + 1].lat);
                    var x1 = a.x - centerX;
                    var y1 = a.y - centerY;
                    var x2 = b.x - centerX;
                    var y2 = b.y - centerY;

                    var sdx = x2 - x1;
                    var sdy = y2 - y1;
                    var segLen2 = sdx * sdx + sdy * sdy;
                    if (segLen2 < 1e-9) continue;

                    var t = Math.Clamp(-(x1 * sdx + y1 * sdy) / segLen2, 0d, 1d);
                    var px = x1 + t * sdx;
                    var py = y1 + t * sdy;
                    var dist2 = px * px + py * py;

                    if (dist2 < bestAnyDist2)
                    {
                        bestAnyDist2 = dist2;
                        bestAny = (sdx, sdy, px + centerX, py + centerY, label);
                    }
                    if (isMatch && dist2 < bestMatchDist2)
                    {
                        bestMatchDist2 = dist2;
                        bestMatch = (sdx, sdy, px + centerX, py + centerY, label);
                    }
                }
            }
        }

        var best = bestMatch ?? bestAny;
        if (best is null) return SnapRightAngleDeg(fallbackRotationDeg);

        var dx = best.Value.dx;
        var dy = best.Value.dy;
        var len = Math.Sqrt(dx * dx + dy * dy);
        if (len < 1e-9) return SnapRightAngleDeg(fallbackRotationDeg);

        // 这里 best(dx,dy) 是“道路最近线段”的方向向量（WebMercator 米坐标，基于 nearbyRoads）。
        // 目标：输出一个 rotationDeg，让前端把地图层 rotate(rotationDeg) 后，“前院临路边”严格水平。
        //
        // 关键：道路可能是弧线/折线，因此不能用全局道路方向。这里用“道路最近点附近的地块边界切线”：
        // - 先找到道路最近点 best.projX/best.projY；
        // - 再在地块外环上找离该点最近的一条边（线段），取这条边的方向作为“前院临路边切线方向”；
        // - 将这条切线旋到水平（rotationDeg = -thetaDeg）。
        //
        // 说明：如果临路边本身是弧线，那么只能保证“最近点处的切线”严格水平，弧线其它位置仍会有局部斜率。
        static double DistPointToSeg2(double px, double py, double ax, double ay, double bx, double by, out double t)
        {
            var vx = bx - ax;
            var vy = by - ay;
            var vv = vx * vx + vy * vy;
            if (vv < 1e-12)
            {
                t = 0d;
                var dx0 = px - ax;
                var dy0 = py - ay;
                return dx0 * dx0 + dy0 * dy0;
            }
            var wx = px - ax;
            var wy = py - ay;
            t = (wx * vx + wy * vy) / vv;
            t = Math.Clamp(t, 0d, 1d);
            var cx = ax + vx * t;
            var cy = ay + vy * t;
            var dx1 = px - cx;
            var dy1 = py - cy;
            return dx1 * dx1 + dy1 * dy1;
        }

        var roadProjX = best.Value.projX;
        var roadProjY = best.Value.projY;
        var bestEdgeDist2 = double.PositiveInfinity;
        var bestEdgeDx = dx;
        var bestEdgeDy = dy;
        if (merc.Count >= 2)
        {
            var n = merc.Count;
            if (n >= 2)
            {
                var last = merc[^1];
                var first = merc[0];
                if (Math.Abs(last.x - first.x) < 1e-6 && Math.Abs(last.y - first.y) < 1e-6)
                    n -= 1;
            }

            if (n < 2)
            {
                // degenerate parcel ring; keep fallback (road segment)
            }
            else
            for (var i = 0; i < n; i++)
            {
                var a = merc[i];
                var b = merc[(i + 1) % n];
                var segDx = b.x - a.x;
                var segDy = b.y - a.y;
                var segLen2 = segDx * segDx + segDy * segDy;
                if (segLen2 < 1e-9) continue;
                var d2 = DistPointToSeg2(roadProjX, roadProjY, a.x, a.y, b.x, b.y, out _);
                if (d2 < bestEdgeDist2)
                {
                    bestEdgeDist2 = d2;
                    bestEdgeDx = segDx;
                    bestEdgeDy = segDy;
                }
            }
        }

        var edgeScreenDx = bestEdgeDx;
        var edgeScreenDy = -bestEdgeDy;
        if (edgeScreenDx < 0 || (Math.Abs(edgeScreenDx) < 1e-9 && edgeScreenDy < 0))
        {
            edgeScreenDx = -edgeScreenDx;
            edgeScreenDy = -edgeScreenDy;
        }

        var thetaDeg = NormalizeDeg(Math.Atan2(edgeScreenDy, edgeScreenDx) * 180d / Math.PI);
        if (thetaDeg > 90d) thetaDeg -= 180d;
        if (thetaDeg <= -90d) thetaDeg += 180d;

        var rotationDeg = NormalizeDeg(-thetaDeg);

        // “前院朝上”校正：
        // best.projX/projY 是道路最近点（Mercator），centerX/centerY 是地块中心（Mercator）。
        // 将“道路最近点相对地块中心”的向量旋转到当前 rotationDeg 下的屏幕坐标，
        // 若该向量在屏幕坐标的 Y 分量为正（即道路在地块下方，给 1m 容差），则 +180° 翻转。
        var vx = best.Value.projX - centerX;
        var vy = best.Value.projY - centerY;
        var vxs = vx;
        var vys = -vy;
        var rad = rotationDeg * Math.PI / 180d;
        var c = Math.Cos(rad);
        var s = Math.Sin(rad);
        var ry = vxs * s + vys * c;
        if (ry > 1.0)
            rotationDeg = NormalizeDeg(rotationDeg + 180d);

        if (Math.Abs(rotationDeg) < 1e-9) rotationDeg = 0d;
        logger?.LogInformation(
            "RotationDeg computed streetName={StreetName} chosenRoad={RoadLabel} usedMatch={UsedMatch} roadDistM={RoadDistM:0.###} parcelEdgeDistM={ParcelEdgeDistM:0.###} rotationDeg={RotationDeg:0.###}",
            streetName,
            best.Value.label,
            bestMatch is not null,
            Math.Sqrt((bestMatch is not null) ? bestMatchDist2 : bestAnyDist2),
            double.IsFinite(bestEdgeDist2) ? Math.Sqrt(bestEdgeDist2) : -1d,
            rotationDeg);
        return rotationDeg;
    }

    private static List<SiteMeasureLineFt> ComputeRulerLines(
        List<FtPoint> lotPolygonFt,
        SitePolygonFt buildablePolygonFt,
        List<LookupStructure> structuresFt)
    {
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

            if (poly.IsValid) return poly;
            var fixedGeom = poly.Buffer(0);
            return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
        }

        static LinearRing? TryCreateLinearRing(GeometryFactory gf, IReadOnlyList<(double x, double y)> ring)
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

            try
            {
                return gf.CreateLinearRing(coords);
            }
            catch (ArgumentException)
            {
                return null;
            }
        }

        static Polygon? TryCreatePolygonFromSitePolygon(GeometryFactory gf, SitePolygonFt poly)
        {
            if (poly.Points.Count < 3) return null;
            var shell = TryCreatePolygon(gf, poly.Points.Select(p => (x: p.X, y: p.Y)).ToList());
            if (shell is null || shell.IsEmpty) return null;

            if (poly.Holes is null || poly.Holes.Count == 0) return shell;

            var holes = new List<LinearRing>();
            foreach (var holePts in poly.Holes)
            {
                if (holePts.Count < 3) continue;
                var ring = holePts.Select(p => (x: p.X, y: p.Y)).ToList();
                var lr = TryCreateLinearRing(gf, ring);
                if (lr is not null && !lr.IsEmpty) holes.Add(lr);
            }

            if (holes.Count == 0) return shell;

            var rebuilt = gf.CreatePolygon(shell.Shell, holes.ToArray());
            if (rebuilt.IsValid) return rebuilt;
            var fixedGeom = rebuilt.Buffer(0);
            return fixedGeom as Polygon ?? (fixedGeom is MultiPolygon mp ? mp.Geometries.OfType<Polygon>().OrderByDescending(p => p.Area).FirstOrDefault() : null);
        }

        static Polygon? TryCreatePolygonFromFtPoints(GeometryFactory gf, IReadOnlyList<FtPoint> ring)
        {
            if (ring.Count < 3) return null;
            return TryCreatePolygon(gf, ring.Select(p => (x: p.XFt, y: p.YFt)).ToList());
        }

        static SiteMeasureLineFt? NearestLine(string kind, Geometry a, Geometry b)
        {
            if (a.IsEmpty || b.IsEmpty) return null;
            var pts = DistanceOp.NearestPoints(a, b);
            if (pts is null || pts.Length < 2) return null;
            var d = pts[0].Distance(pts[1]);
            if (!double.IsFinite(d)) return null;

            return new SiteMeasureLineFt
            {
                Kind = kind,
                A = new SitePointFt { X = pts[0].X, Y = pts[0].Y },
                B = new SitePointFt { X = pts[1].X, Y = pts[1].Y },
                DistanceFt = d
            };
        }

        var gf = GeometryFactory.Default;
        var lotPoly = TryCreatePolygonFromFtPoints(gf, lotPolygonFt);
        var buildablePoly = TryCreatePolygonFromSitePolygon(gf, buildablePolygonFt);
        if (lotPoly is null || buildablePoly is null || lotPoly.IsEmpty || buildablePoly.IsEmpty)
            return new List<SiteMeasureLineFt>();

        static IReadOnlyList<FtPoint> RectToFtPolygon(FtRect r)
        {
            return new List<FtPoint>
            {
                new FtPoint { XFt = r.XFt, YFt = r.YFt },
                new FtPoint { XFt = r.XFt + r.WFt, YFt = r.YFt },
                new FtPoint { XFt = r.XFt + r.WFt, YFt = r.YFt + r.HFt },
                new FtPoint { XFt = r.XFt, YFt = r.YFt + r.HFt }
            };
        }

        static Polygon? TryCreateStructurePolygon(GeometryFactory gf, LookupStructure s)
        {
            if (s.PolygonFt is not null && s.PolygonFt.Count >= 3)
                return TryCreatePolygonFromFtPoints(gf, s.PolygonFt);
            return TryCreatePolygonFromFtPoints(gf, RectToFtPolygon(s.RectFt));
        }

        var house = structuresFt.FirstOrDefault(s => string.Equals(s.Role, "house", StringComparison.OrdinalIgnoreCase));
        var garage = structuresFt.FirstOrDefault(s => string.Equals(s.Role, "garage", StringComparison.OrdinalIgnoreCase));
        if (house is not null || garage is not null)
        {
            var outLines = new List<SiteMeasureLineFt>();

            if (house is not null)
            {
                var housePoly = TryCreateStructurePolygon(gf, house);
                var houseLine = housePoly is null ? null : NearestLine("buildable-to-house-min", buildablePoly, housePoly);
                if (houseLine is not null) outLines.Add(houseLine);
            }

            if (garage is not null)
            {
                var garagePoly = TryCreateStructurePolygon(gf, garage);
                var garageLine = garagePoly is null ? null : NearestLine("buildable-to-garage-min", buildablePoly, garagePoly);
                if (garageLine is not null) outLines.Add(garageLine);
            }

            if (outLines.Count > 0) return outLines;
        }

        var minLine = NearestLine("buildable-to-lot-min", buildablePoly, lotPoly);
        if (minLine is null) return new List<SiteMeasureLineFt>();

        var maxLine = FindMaxDistanceLine(buildablePoly, lotPoly);
        if (maxLine is null) return new List<SiteMeasureLineFt> { minLine };

        const double sameEpsFt = 0.10;
        if (Math.Abs(maxLine.DistanceFt - minLine.DistanceFt) <= sameEpsFt)
            return new List<SiteMeasureLineFt> { minLine };

        return minLine.DistanceFt <= maxLine.DistanceFt
            ? new List<SiteMeasureLineFt> { minLine, maxLine }
            : new List<SiteMeasureLineFt> { maxLine, minLine };

        static SiteMeasureLineFt? FindMaxDistanceLine(Polygon buildable, Polygon lot)
        {
            var boundary = lot.Boundary;
            if (boundary.IsEmpty) return null;

            var coords = buildable.ExteriorRing.Coordinates;
            if (coords.Length < 2) return null;

            var bestDist = double.NegativeInfinity;
            Coordinate? bestA = null;
            Coordinate? bestB = null;
            var gf = GeometryFactory.Default;

            void Consider(Coordinate c)
            {
                var p = gf.CreatePoint(c);
                var pts = DistanceOp.NearestPoints(p, boundary);
                if (pts is null || pts.Length < 2) return;
                var d = pts[0].Distance(pts[1]);
                if (!double.IsFinite(d)) return;
                if (d > bestDist)
                {
                    bestDist = d;
                    bestA = pts[0];
                    bestB = pts[1];
                }
            }

            for (var i = 0; i < coords.Length - 1; i++)
            {
                var a = coords[i];
                var b = coords[i + 1];
                Consider(a);
                Consider(new Coordinate((a.X + b.X) / 2d, (a.Y + b.Y) / 2d));
            }

            if (!double.IsFinite(bestDist) || bestA is null || bestB is null) return null;
            return new SiteMeasureLineFt
            {
                Kind = "buildable-to-lot-max",
                A = new SitePointFt { X = bestA.X, Y = bestA.Y },
                B = new SitePointFt { X = bestB.X, Y = bestB.Y },
                DistanceFt = bestDist
            };
        }
    }

    /// <summary>
    /// 计算英尺坐标系多边形的面积（平方英尺）。
    /// </summary>
    /// <param name="polyFt">多边形点序列（不要求闭合）。</param>
    /// <returns>面积（平方英尺）；点数不足返回 null。</returns>
    private static double? ComputePolygonAreaSqft(List<FtPoint> polyFt)
    {
        if (polyFt.Count < 3) return null;
        var a = 0d;
        for (var i = 0; i < polyFt.Count; i++)
        {
            var j = (i + 1) % polyFt.Count;
            a += polyFt[i].XFt * polyFt[j].YFt - polyFt[j].XFt * polyFt[i].YFt;
        }
        return Math.Abs(a / 2d);
    }

    /// <summary>
    /// 将轴对齐矩形转换为矩形多边形（不闭合）。
    /// </summary>
    /// <param name="x">左上角 X（英尺坐标系）。</param>
    /// <param name="y">左上角 Y（英尺坐标系）。</param>
    /// <param name="w">宽度（英尺）。</param>
    /// <param name="h">高度（英尺）。</param>
    /// <returns>四点多边形（按顺时针/逆时针顺序输出均可；这里为顺时针）。</returns>
    private static SitePolygonFt RectToPolygon(double x, double y, double w, double h)
    {
        var x0 = x;
        var y0 = y;
        var x1 = x + w;
        var y1 = y + h;

        return new SitePolygonFt
        {
            Points = new List<SitePointFt>
            {
                new SitePointFt { X = x0, Y = y0 },
                new SitePointFt { X = x1, Y = y0 },
                new SitePointFt { X = x1, Y = y1 },
                new SitePointFt { X = x0, Y = y1 }
            }
        };
    }

    /// <summary>
    /// 获取退尺/主屋间距（单位：英尺）。
    /// </summary>
    /// <remarks>
    /// 退尺属于“法规/策略参数”，不应该从几何计算结果反推。
    ///
    /// 之前这里尝试从 <see cref="LookupPlan.MeasureLines"/> 中读取（例如 <c>setback-rear</c>），但 plan 的 measureLines
    /// 实际测量的是“当前 buildablePolygon 与边界/障碍的最短距离”，当 buildablePolygon 被障碍切碎、只剩前部一块时，
    /// 该距离会变得很大（例如出现 100+ ft），导致 computed.setbacksFt 显示异常且不稳定。
    ///
    /// 因此这里固定使用地区策略默认值；几何相关的距离展示请使用 computed.rulerLinesFt。
    /// </remarks>
    /// <param name="plan">统一 plan。</param>
    /// <param name="policy">地区默认策略。</param>
    /// <returns>退尺与间距（英尺）。</returns>
    private static SiteSetbacks ComputeSetbacks(LookupPlan plan, RegionPolicy policy)
    {
        return new SiteSetbacks
        {
            Front = policy.DefaultFrontSetbackFt,
            Rear = policy.DefaultRearSetbackFt,
            SideLeft = policy.DefaultSideSetbackFt,
            SideRight = policy.DefaultSideSetbackFt,
            HouseSep = policy.DefaultHouseSepFt
        };
    }

    /// <summary>
    /// 计算车库到道路的通道走廊多边形（若存在车库）。
    /// </summary>
    /// <remarks>
    /// 当前规则：
    /// - 以 <see cref="SiteSetbacks"/> 约束得到纵向可用带（allowedTop..allowedBottom）。
    /// - 根据车库中心在左右半区选择通道靠左或靠右。
    /// - 通道默认宽度 10ft。
    /// </remarks>
    /// <param name="plan">统一 plan。</param>
    /// <param name="setbacks">退尺与间距（英尺）。</param>
    /// <returns>通道多边形；无车库或无可用带则返回 null。</returns>
    private static SitePolygonFt? ComputeDrivewayCorridor(LookupPlan plan, SiteSetbacks setbacks)
    {
        var lotW = plan.Lot.WidthFt;
        var lotH = plan.Lot.HeightFt;

        var house = plan.Structures.FirstOrDefault(s => string.Equals(s.Role, "house", StringComparison.OrdinalIgnoreCase));
        var garage = plan.Structures.FirstOrDefault(s => string.Equals(s.Role, "garage", StringComparison.OrdinalIgnoreCase));
        if (garage is null) return null;

        var houseBottomY = house is null ? 0 : (house.RectFt.YFt + house.RectFt.HFt);
        var allowedLeft = setbacks.SideLeft;
        var allowedRight = lotW - setbacks.SideRight;
        var allowedTop = house is null ? setbacks.Front : Math.Max(setbacks.Front, houseBottomY + setbacks.HouseSep);
        var allowedBottom = lotH - setbacks.Rear;

        if (allowedRight <= allowedLeft) return null;
        allowedTop = Math.Clamp(allowedTop, 0, lotH);
        allowedBottom = Math.Clamp(allowedBottom, 0, lotH);
        if (allowedBottom <= allowedTop) return null;

        var drivewayWidthFt = 10d;
        var garageCx = garage.RectFt.XFt + garage.RectFt.WFt / 2d;
        var drivewayLeft = garageCx < lotW / 2d;
        var x0 = drivewayLeft ? allowedLeft : Math.Max(allowedLeft, allowedRight - drivewayWidthFt);
        var x1 = drivewayLeft ? Math.Min(allowedRight, allowedLeft + drivewayWidthFt) : allowedRight;
        if (x1 <= x0) return null;
        var y1 = Math.Max(allowedTop, garage.RectFt.YFt);
        if (y1 <= allowedTop) return null;

        return new SitePolygonFt
        {
            Points = new List<SitePointFt>
            {
                new SitePointFt { X = x0, Y = allowedTop },
                new SitePointFt { X = x1, Y = allowedTop },
                new SitePointFt { X = x1, Y = y1 },
                new SitePointFt { X = x0, Y = y1 }
            }
        };
    }

    /// <summary>
    /// 根据可建区包围盒判断各 ADU 尺寸是否可放下（允许旋转）。
    /// </summary>
    /// <param name="buildablePoly">可建区多边形（英尺坐标系）。</param>
    /// <param name="sizes">需要评估的尺寸列表（英尺）。</param>
    /// <returns>每个尺寸的可放置性。</returns>
    private static List<SiteAduFit> ComputeAduFits(SitePolygonFt buildablePoly, List<(double w, double h)> sizes)
    {
        var minX = double.PositiveInfinity;
        var minY = double.PositiveInfinity;
        var maxX = double.NegativeInfinity;
        var maxY = double.NegativeInfinity;

        foreach (var p in buildablePoly.Points)
        {
            if (!double.IsFinite(p.X) || !double.IsFinite(p.Y)) continue;
            minX = Math.Min(minX, p.X);
            minY = Math.Min(minY, p.Y);
            maxX = Math.Max(maxX, p.X);
            maxY = Math.Max(maxY, p.Y);
        }

        var zoneW = (!double.IsFinite(minX) || !double.IsFinite(maxX)) ? 0 : Math.Max(0, maxX - minX);
        var zoneH = (!double.IsFinite(minY) || !double.IsFinite(maxY)) ? 0 : Math.Max(0, maxY - minY);

        static bool Fits(double w0, double h0, double a, double b) =>
            (w0 >= a && h0 >= b) || (w0 >= b && h0 >= a);

        var outFits = new List<SiteAduFit>();
        foreach (var (w, h) in sizes)
        {
            outFits.Add(new SiteAduFit { W = w, H = h, CanFit = Fits(zoneW, zoneH, w, h) });
        }
        return outFits;
    }

    /// <summary>
    /// 归一化语言参数为 <c>zh</c> 或 <c>en</c>。
    /// </summary>
    /// <param name="lang">输入语言。</param>
    /// <returns>归一化后的语言。</returns>
    private static string NormalizeLang(string? lang)
    {
        var v = (lang ?? "").Trim().ToLowerInvariant();
        if (v == "zh" || v == "zh-cn" || v == "cn") return "zh";
        return "en";
    }

    /// <summary>
    /// 按语言选择中文/英文文案。
    /// </summary>
    /// <param name="lang">语言（<c>zh</c>/<c>en</c>）。</param>
    /// <param name="zh">中文文案。</param>
    /// <param name="en">英文文案。</param>
    /// <returns>匹配语言的文案。</returns>
    private static string Msg(string lang, string zh, string en) => lang == "zh" ? zh : en;
}
