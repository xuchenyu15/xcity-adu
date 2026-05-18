using System.Text.Json;
using XBuildApi.Lookup;

namespace XBuildApi.Site;

/// <summary>
/// 标准 GeoJSON FeatureCollection。
/// </summary>
/// <remarks>
/// - <see cref="Type"/> 固定为 <c>FeatureCollection</c>。
/// - <see cref="Features"/> 为 GeoJSON Feature 列表。
/// - 本项目内所有经纬度坐标遵循 GeoJSON 约定：<c>[lon, lat]</c>（经度在前，纬度在后）。
/// </remarks>
public sealed class GeoJsonFeatureCollection
{
    /// <summary>
    /// GeoJSON 类型标识，固定为 <c>FeatureCollection</c>。
    /// </summary>
    public string Type { get; init; } = "FeatureCollection";

    /// <summary>
    /// GeoJSON Feature 列表。
    /// </summary>
    public required List<GeoJsonFeature> Features { get; init; }
}

/// <summary>
/// 标准 GeoJSON Feature。
/// </summary>
public sealed class GeoJsonFeature
{
    /// <summary>
    /// GeoJSON 类型标识，固定为 <c>Feature</c>。
    /// </summary>
    public string Type { get; init; } = "Feature";

    /// <summary>
    /// 几何对象（Geometry）。
    /// </summary>
    public required GeoJsonGeometry Geometry { get; init; }

    /// <summary>
    /// 属性对象（Properties），保持为原始 JSON。
    /// </summary>
    public JsonElement Properties { get; init; }
}

/// <summary>
/// 标准 GeoJSON Geometry。
/// </summary>
/// <remarks>
/// <see cref="Coordinates"/> 的结构取决于 <see cref="Type"/>：
/// - <c>Point</c>：<c>[lon, lat]</c>
/// - <c>LineString</c>：<c>[[lon, lat], ...]</c>
/// - <c>Polygon</c>：<c>[[[lon, lat], ...]]</c>（外环及可选内环）
/// - <c>MultiPolygon</c>：<c>[[[[lon, lat], ...]], ...]</c>
/// </remarks>
public sealed class GeoJsonGeometry
{
    /// <summary>
    /// GeoJSON 几何类型（例如 <c>Polygon</c>、<c>LineString</c>）。
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// GeoJSON 坐标数组，保持为原始 JSON。
    /// </summary>
    public required JsonElement Coordinates { get; init; }
}

/// <summary>
/// GeoJSON 的轻量标准化工具：把任意 JSON 文本或 <see cref="JsonElement"/> 解析成强类型实体。
/// </summary>
public static class GeoJsonStd
{
    private static readonly JsonSerializerOptions _geoJsonJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// 解析 GeoJSON FeatureCollection 文本。
    /// </summary>
    /// <param name="json">包含 <c>{ "type": "FeatureCollection", ... }</c> 的 JSON 文本。</param>
    /// <returns>解析后的 FeatureCollection；若输入不是 FeatureCollection，则返回空集合。</returns>
    public static GeoJsonFeatureCollection ParseFeatureCollection(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return ParseFeatureCollection(doc.RootElement);
    }

    /// <summary>
    /// 解析 GeoJSON Feature 文本。
    /// </summary>
    /// <param name="json">包含 <c>{ "type": "Feature", ... }</c> 的 JSON 文本。</param>
    /// <returns>解析后的 Feature；若字段缺失，则对应字段回退为空值。</returns>
    public static GeoJsonFeature ParseFeature(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return ParseFeature(doc.RootElement);
    }

    /// <summary>
    /// 解析 GeoJSON FeatureCollection 的根节点。
    /// </summary>
    /// <param name="root">根节点 JSON。</param>
    /// <returns>解析后的 FeatureCollection；若输入不是 FeatureCollection，则返回空集合。</returns>
    public static GeoJsonFeatureCollection ParseFeatureCollection(JsonElement root)
    {
        var type = root.TryGetProperty("type", out var t) ? (t.GetString() ?? "") : "";
        if (!string.Equals(type, "FeatureCollection", StringComparison.OrdinalIgnoreCase))
            return new GeoJsonFeatureCollection { Features = new List<GeoJsonFeature>() };

        var features = new List<GeoJsonFeature>();
        if (root.TryGetProperty("features", out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            foreach (var f in arr.EnumerateArray())
            {
                features.Add(ParseFeature(f));
            }
        }

        return new GeoJsonFeatureCollection { Type = "FeatureCollection", Features = features };
    }

    /// <summary>
    /// 解析 GeoJSON Feature 的根节点。
    /// </summary>
    /// <param name="root">Feature 的 JSON 根节点。</param>
    /// <returns>强类型 Feature；几何与属性字段尽可能保留原始内容。</returns>
    public static GeoJsonFeature ParseFeature(JsonElement root)
    {
        var geomEl = root.TryGetProperty("geometry", out var g) ? g : default;
        var propsEl = root.TryGetProperty("properties", out var p) ? p : default;

        var geomType = geomEl.ValueKind == JsonValueKind.Object && geomEl.TryGetProperty("type", out var gt)
            ? (gt.GetString() ?? "")
            : "";

        var coords = geomEl.ValueKind == JsonValueKind.Object && geomEl.TryGetProperty("coordinates", out var c)
            ? c.Clone()
            : JsonSerializer.SerializeToElement(Array.Empty<object>());

        var props = propsEl.ValueKind == JsonValueKind.Object
            ? propsEl.Clone()
            : JsonSerializer.SerializeToElement(new Dictionary<string, object?>());

        return new GeoJsonFeature
        {
            Type = "Feature",
            Geometry = new GeoJsonGeometry { Type = geomType, Coordinates = coords },
            Properties = props
        };
    }

    /// <summary>
    /// 将 FeatureCollection 序列化为 JSON 文本。
    /// </summary>
    /// <param name="fc">FeatureCollection 实体。</param>
    /// <returns>JSON 文本。</returns>
    public static string ToJson(GeoJsonFeatureCollection fc) => JsonSerializer.Serialize(fc, _geoJsonJsonOptions);

    /// <summary>
    /// 将 Feature 序列化为 JSON 文本。
    /// </summary>
    /// <param name="f">Feature 实体。</param>
    /// <returns>JSON 文本。</returns>
    public static string ToJson(GeoJsonFeature f) => JsonSerializer.Serialize(f, _geoJsonJsonOptions);
}

/// <summary>
/// 地块查询请求体（新接口）。
/// </summary>
public sealed class SiteLookupRequest
{
    /// <summary>
    /// 单行地址（必填）。
    /// </summary>
    public required string Address { get; init; }

    /// <summary>
    /// 语言（可选）：<c>zh</c>/<c>en</c>（大小写不敏感）。
    /// </summary>
    public string? Lang { get; init; }
}

/// <summary>
/// 地块查询响应体（新接口）。
/// </summary>
public sealed class SiteLookupResponse
{
    /// <summary>
    /// 本次请求信息（回显 address/lang）。
    /// </summary>
    public required SiteRequestInfo Request { get; init; }

    /// <summary>
    /// 解析出的地区与数据源信息。
    /// </summary>
    public required SiteRegionInfo Region { get; init; }

    /// <summary>
    /// 目标地块（subject parcel）GeoJSON Feature。
    /// </summary>
    public required GeoJsonFeature SubjectParcel { get; init; }

    /// <summary>
    /// 目标地块的建筑轮廓（subject buildings）GeoJSON FeatureCollection。
    /// </summary>
    public required GeoJsonFeatureCollection SubjectBuildings { get; init; }

    /// <summary>
    /// 附近地块集合（nearby parcels）GeoJSON FeatureCollection。
    /// </summary>
    public required GeoJsonFeatureCollection NearbyParcels { get; init; }

    /// <summary>
    /// 附近建筑集合（nearby buildings）GeoJSON FeatureCollection。
    /// </summary>
    public required GeoJsonFeatureCollection NearbyBuildings { get; init; }

    /// <summary>
    /// 附近道路集合（nearby roads）GeoJSON FeatureCollection（LineString）。
    /// </summary>
    public required GeoJsonFeatureCollection NearbyRoads { get; init; }

    /// <summary>
    /// 后端计算结果（退尺、可建区、ADU 可放置性等）。
    /// </summary>
    public required SiteComputed Computed { get; init; }

    /// <summary>
    /// 地块属性信息（可选）：分区、限高、面积、公用设施接入等。
    /// </summary>
    /// <remarks>
    /// 该信息通常来自额外的 zoning/utility 数据源或 AI 推断，可能为空。
    /// </remarks>
    public SiteParcelInfo? ParcelInfo { get; init; }

    /// <summary>
    /// AI/规则推断得到的地块关键信息（可选）：zoning、lot area、lot dimensions、existing units、utility access 等。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 前端当前的 “Zoning / Lot Area / Lot Dimensions / Existing Units / Utility Access” 信息面板使用该字段渲染。
    /// </para>
    /// <para>
    /// 若未配置 AI 上游或解析失败，后端会返回基于 plan 的保底值（例如 lot area、lot dimensions、existing units）。
    /// </para>
    /// </remarks>
    public LookupAiParcelInfo? AiParcelInfo { get; init; }
}

/// <summary>
/// 请求信息（用于响应回显）。
/// </summary>
public sealed class SiteRequestInfo
{
    /// <summary>
    /// 单行地址。
    /// </summary>
    public required string Address { get; init; }

    /// <summary>
    /// 语言（<c>zh</c>/<c>en</c>）。
    /// </summary>
    public required string Lang { get; init; }
}

/// <summary>
/// 地区与地理位置相关信息（由 region adapter 解析/推断）。
/// </summary>
public sealed class SiteRegionInfo
{
    /// <summary>
    /// 上游数据源标识（例如 <c>seattle-official</c>、<c>ny-official</c>）。
    /// </summary>
    public required string Provider { get; init; }

    /// <summary>
    /// 城市名称（如可获取）。
    /// </summary>
    public required string City { get; init; }

    /// <summary>
    /// 州缩写（例如 <c>WA</c>/<c>NY</c>/<c>NJ</c>）。
    /// </summary>
    public required string State { get; init; }

    /// <summary>
    /// 地块中心点纬度（可选）。
    /// </summary>
    public double? Lat { get; init; }

    /// <summary>
    /// 地块中心点经度（可选）。
    /// </summary>
    public double? Lon { get; init; }

    /// <summary>
    /// 地址对应的路名（用于道路匹配/朝向推断与前端 “Street” 文案展示）。
    /// </summary>
    /// <remarks>
    /// 若上游无法解析路名，返回空字符串。
    /// </remarks>
    public required string StreetName { get; init; }
}

/// <summary>
/// 后端计算结果汇总。
/// </summary>
public sealed class SiteComputed
{
    /// <summary>
    /// 为了满足“前院朝上”的前端显示约定，地图层需要应用的旋转角（单位：度）。
    /// </summary>
    /// <remarks>
    /// 当前角度由后端根据地址对应道路的 LineString 与地块中心位置关系推断得到。
    /// 为了便于前端直接使用，该角度已按屏幕坐标系（Y 轴向下）约定输出：
    /// 前端在 SVG/Canvas 中可直接按该角度对地图层做 rotate()。
    /// </remarks>
    public required double RotationDeg { get; init; }

    /// <summary>
    /// 前端标尺线信息（单位：英尺坐标系）。
    /// </summary>
    /// <remarks>
    /// 用于展示“可建区域与地块边界/建筑物之间的距离”等。
    /// 通常仅返回最窄/最宽距离；若存在主屋等参考建筑，则优先返回可建区到该建筑的最小距离。
    /// </remarks>
    public required List<SiteMeasureLineFt> RulerLinesFt { get; init; }

    /// <summary>
    /// 退尺与结构间距（单位：英尺）。
    /// </summary>
    public required SiteSetbacks SetbacksFt { get; init; }

    /// <summary>
    /// 目标地块内的结构（例如主屋/车库；单位：英尺坐标系）。
    /// </summary>
    public required List<SiteStructure> SubjectStructures { get; init; }

    /// <summary>
    /// 附近结构（非目标地块；用于上下文展示/比对；单位：英尺坐标系）。
    /// </summary>
    public required List<SiteStructure> NearbyStructures { get; init; }

    /// <summary>
    /// 车库到道路的通道走廊多边形（可选；单位：英尺坐标系）。
    /// </summary>
    public SitePolygonFt? DrivewayCorridorFt { get; init; }

    /// <summary>
    /// 可建设区域多边形（单位：英尺坐标系）。
    /// </summary>
    /// <remarks>
    /// 该多边形用于表达真实可建区域边界（相较于包围盒更精确）。
    /// 如果后端无法给出真实形状，至少会回退为矩形多边形（来自内部 envelope 计算结果）。
    /// </remarks>
    public required SitePolygonFt BuildablePolygonFt { get; init; }

    /// <summary>
    /// 可建设区域（GeoJSON；经纬度坐标系）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 用于在前端地图（lon/lat）上直接渲染真实可建区域轮廓（含洞）。
    /// </para>
    /// <para>
    /// 注意：该字段与 <see cref="BuildablePolygonFt"/> 表达的是同一形状，但坐标系不同：
    /// - <see cref="BuildablePolygonFt"/>：plan 英尺坐标系（用于几何计算/标尺线等）
    /// - <see cref="BuildableArea"/>：GeoJSON 经纬度坐标系（用于地图渲染）
    /// </para>
    /// </remarks>
    public GeoJsonFeature? BuildableArea { get; init; }

    /// <summary>
    /// 适用于指定 ADU 模块（默认 16ft×37.5ft）放置的“中心点可落区”（GeoJSON；经纬度坐标系）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 这是在真实可建区域上做一次“内缩”后的结果：只有当 ADU 的中心点落在该区域内时，才保证 ADU 整体（任意旋转）不会越出可建边界。
    /// </para>
    /// <para>
    /// 前端用途：
    /// - 默认放置位置的搜索范围
    /// - 拖动约束（确保 ADU 整体不越界）
    /// </para>
    /// </remarks>
    public GeoJsonFeature? AduPlacementArea { get; init; }

    /// <summary>
    /// 可建区域计算过程中被排除（抠出）的区域集合（GeoJSON；经纬度坐标系；调试用）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 该字段用于排查“可建区域为何缺失/为何位置不对”等问题：后端会把前院、周界退尺、已有建筑、车库通道、狭窄区域清理等步骤抠掉的几何片段
    /// 以 GeoJSON FeatureCollection 形式返回，前端可以用半透明颜色叠加绘制，并在每个片区中心显示原因文字。
    /// </para>
    /// <para>
    /// 说明：该字段为临时调试用途，后续可能移除或改名；业务逻辑请以 <see cref="BuildableArea"/> / <see cref="BuildablePolygonFt"/> 为准。
    /// </para>
    /// </remarks>
    public GeoJsonFeatureCollection? Cutouts { get; init; }

    /// <summary>
    /// 不同 ADU 模块尺寸的可放置性判断结果（单位：英尺）。
    /// </summary>
    public required List<SiteAduFit> AduFits { get; init; }
}

/// <summary>
/// 标尺线：用于前端以“起点-终点-距离”形式展示某条约束距离。
/// </summary>
public sealed class SiteMeasureLineFt
{
    /// <summary>
    /// 标尺类型（用于前端标签/样式区分）。
    /// </summary>
    public required string Kind { get; init; }

    /// <summary>
    /// 起点（英尺坐标系）。
    /// </summary>
    public required SitePointFt A { get; init; }

    /// <summary>
    /// 终点（英尺坐标系）。
    /// </summary>
    public required SitePointFt B { get; init; }

    /// <summary>
    /// 距离（英尺）。
    /// </summary>
    public required double DistanceFt { get; init; }
}

/// <summary>
/// 地块属性信息（分区、限高、面积、公用设施接入等）。
/// </summary>
public sealed class SiteParcelInfo
{
    /// <summary>
    /// Zoning 类型（例如分区代码/名称；可选）。
    /// </summary>
    public string? Zoning { get; init; }

    /// <summary>
    /// 建筑限制高度（可选；单位：英尺）。
    /// </summary>
    public double? HeightLimitFt { get; init; }

    /// <summary>
    /// 地块面积（可选；单位：平方英尺）。
    /// </summary>
    public double? LotAreaSqft { get; init; }

    /// <summary>
    /// 公共设施接入情况（可选；如 water/sewer/power/gas 的综合描述）。
    /// </summary>
    public string? UtilityAccess { get; init; }
}

/// <summary>
/// 退尺/间距参数（单位：英尺）。
/// </summary>
public sealed class SiteSetbacks
{
    /// <summary>
    /// 前院退尺（沿临街侧）。
    /// </summary>
    public required double Front { get; init; }

    /// <summary>
    /// 后院退尺（沿背街侧）。
    /// </summary>
    public required double Rear { get; init; }

    /// <summary>
    /// 左侧退尺。
    /// </summary>
    public required double SideLeft { get; init; }

    /// <summary>
    /// 右侧退尺。
    /// </summary>
    public required double SideRight { get; init; }

    /// <summary>
    /// ADU 与主屋的最小分隔距离（若适用）。
    /// </summary>
    public required double HouseSep { get; init; }
}

/// <summary>
/// 结构信息（多边形；单位：英尺坐标系）。
/// </summary>
public sealed class SiteStructure
{
    /// <summary>
    /// 结构角色（可选）：例如 <c>house</c>/<c>garage</c>。
    /// </summary>
    public string? Role { get; init; }

    /// <summary>
    /// 结构的多边形轮廓（单位：英尺）。
    /// </summary>
    public required SitePolygonFt PolygonFt { get; init; }

    /// <summary>
    /// 结构面积（可选；单位：平方英尺）。
    /// </summary>
    public double? AreaSqft { get; init; }
}

/// <summary>
/// 以英尺为单位的多边形（点序列）。
/// </summary>
public sealed class SitePolygonFt
{
    /// <summary>
    /// 多边形点序列（不要求闭合；即首尾点可不相同）。
    /// </summary>
    public required List<SitePointFt> Points { get; init; }

    /// <summary>
    /// 多边形内环（洞），可选。
    /// </summary>
    /// <remarks>
    /// 典型用途：在表达“可建区域”时，将被排除的区域（例如已存在建筑、车道通道等）表示为洞，避免前端误以为这些区域仍可建设。
    /// 每个内环同样为点序列（不要求闭合）。
    /// </remarks>
    public List<List<SitePointFt>>? Holes { get; init; }
}

/// <summary>
/// 以英尺为单位的点。
/// </summary>
public sealed class SitePointFt
{
    /// <summary>
    /// X（英尺）。
    /// </summary>
    public required double X { get; init; }

    /// <summary>
    /// Y（英尺）。
    /// </summary>
    public required double Y { get; init; }
}

/// <summary>
/// 指定 ADU 尺寸在可建设区域中是否可放下的判断结果。
/// </summary>
public sealed class SiteAduFit
{
    /// <summary>
    /// 模块宽度（英尺）。
    /// </summary>
    public required double W { get; init; }

    /// <summary>
    /// 模块高度（英尺）。
    /// </summary>
    public required double H { get; init; }

    /// <summary>
    /// 是否能在当前可建区域（或其包围盒）内放置（允许旋转）。
    /// </summary>
    public required bool CanFit { get; init; }
}
