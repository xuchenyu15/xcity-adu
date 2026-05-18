using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace XBuildApi.Lookup;

/// <summary>
/// 标识本次查询的上游数据提供方（例如 Regrid、城市官方 GIS 等）。
/// </summary>
public sealed class LookupSource
{
    /// <summary>
    /// Provider 的标识字符串（前端与日志使用的稳定值）。
    /// </summary>
    public required string Provider { get; init; }
}

/// <summary>
/// 前端直接需要的“站点”标准化字段（路名、城市州、经纬度等）。
/// </summary>
public sealed class LookupSite
{
    /// <summary>
    /// 用于前端展示的路名（例如 “164th Place”）。
    /// </summary>
    public required string StreetName { get; init; }

    /// <summary>
    /// 城市名称（用于 eligibility 与 UI 展示）。
    /// </summary>
    public required string City { get; init; }

    /// <summary>
    /// 州缩写（例如 “WA”“TX”，用于 eligibility 流程）。
    /// </summary>
    public required string State { get; init; }

    /// <summary>
    /// 纬度（WGS84）。
    /// </summary>
    public double? Lat { get; init; }

    /// <summary>
    /// 经度（WGS84）。
    /// </summary>
    public double? Lon { get; init; }
}

/// <summary>
/// 面向前端渲染的精简视图模型（来自 plan + site 的聚合结果）。
/// 目的：屏蔽不同 Provider 返回格式的差异，保持前端字段稳定。
/// </summary>
public sealed class LookupView
{
    /// <summary>
    /// 计划坐标系统的单位（当前为 “ft”）。
    /// </summary>
    public required string Unit { get; init; }

    /// <summary>
    /// 路名（同 <see cref="LookupSite.StreetName"/>，便于前端直接从 view 读取）。
    /// </summary>
    public required string StreetName { get; init; }

    /// <summary>
    /// 地块信息（含地块宽高与轮廓 polygon，单位为英尺）。
    /// </summary>
    public required LookupLot Lot { get; init; }

    /// <summary>
    /// 可建区域（envelope），单位为英尺。
    /// </summary>
    public required FtRect BuildableZone { get; init; }

    public List<FtPoint>? BuildablePolygon { get; init; }

    public List<LookupModuleFit>? ModuleFits { get; init; }

    public LookupAduPlacement? SuggestedAduPlacement { get; init; }

    public List<LookupMeasureLine>? MeasureLines { get; init; }

    /// <summary>
    /// 已有建筑物（从 buildings 轮廓计算得到的矩形包围框），单位为英尺。
    /// </summary>
    public required List<LookupStructure> Structures { get; init; }

    /// <summary>
    /// 为了对齐街道方向所应用的旋转角（度）。
    /// </summary>
    public required double RotationDeg { get; init; }

    /// <summary>
    /// 默认模块是否能放进可建区域。
    /// </summary>
    public required bool CanFitAdu { get; init; }
}

/// <summary>
/// eligibility 元信息（供前端流程状态机使用）。
/// </summary>
public sealed class LookupEligibility
{
    /// <summary>
    /// 州缩写（大写）。
    /// </summary>
    public required string State { get; init; }

    /// <summary>
    /// 城市名称。
    /// </summary>
    public required string City { get; init; }

    /// <summary>
    /// 地址查询完成后，前端应该跳转到的下一步状态。
    /// </summary>
    public required string NextState { get; init; }
}

public sealed class LookupBilingualText
{
    public required string Zh { get; init; }
    public required string En { get; init; }
}

public sealed class LookupAiParcelInfo
{
    public required LookupBilingualText Zoning { get; init; }
    public required bool ZoningIsLikely { get; init; }
    public required LookupBilingualText LotArea { get; init; }
    public required LookupBilingualText LotDimensions { get; init; }
    public required LookupBilingualText HeightLimit { get; init; }
    public required LookupBilingualText ExistingUnits { get; init; }
    public required LookupBilingualText UtilityAccess { get; init; }
    public required LookupBilingualText Setbacks { get; init; }
}

/// <summary>
/// <c>/api/lookup</c> 的标准返回结构。
/// </summary>
public sealed class LookupResponse
{
    /// <summary>
    /// 本次查询输入的地址字符串。
    /// </summary>
    public required string Address { get; init; }

    /// <summary>
    /// 数据来源。
    /// </summary>
    public required LookupSource Source { get; init; }

    /// <summary>
    /// 标准化的站点信息（路名、城市州、经纬度等）。
    /// </summary>
    public required LookupSite Site { get; init; }

    /// <summary>
    /// 面向前端渲染的精简视图模型（来自 plan + site 的聚合结果）。
    /// </summary>
    public required LookupView View { get; init; }

    /// <summary>
    /// 计算 plan 所使用的原始地块数据（GeoJSON Feature，来自 provider）。
    /// 仅用于调试/复现/后续扩展；前端常规渲染建议使用 <see cref="View"/> 或 <see cref="Plan"/>.
    /// </summary>
    public required JsonObject Parcel { get; init; }

    /// <summary>
    /// 计算 plan 所使用的原始建筑轮廓数据（GeoJSON FeatureCollection，来自 provider 或 OSM）。
    /// 仅用于调试/复现/后续扩展；前端常规渲染建议使用 <see cref="View"/> 或 <see cref="Plan"/>.
    /// </summary>
    public required JsonObject Buildings { get; init; }

    /// <summary>
    /// 后端计算得到的 plan（前端渲染/交互主数据）。
    /// </summary>
    public LookupPlan? Plan { get; init; }

    /// <summary>
    /// eligibility 元信息。
    /// </summary>
    public required LookupEligibility Eligibility { get; init; }

    public LookupAiParcelInfo? AiParcelInfo { get; init; }
}

/// <summary>
/// 单个 Provider 输出的标准化结果（用于后续构建 plan）。
/// </summary>
public sealed class LookupProviderResult
{
    /// <summary>
    /// Provider 的标识字符串。
    /// </summary>
    public required string Provider { get; init; }

    /// <summary>
    /// Parcel feature (GeoJSON Feature). Must include <c>geometry</c>.
    /// </summary>
    public required JsonObject Parcel { get; init; }

    /// <summary>
    /// Buildings feature collection (GeoJSON FeatureCollection). Must exist even if empty.
    /// </summary>
    public required JsonObject Buildings { get; init; }

    /// <summary>
    /// Provider 给出的路名覆盖值（如果更权威/更准确则返回；否则可以为空）。
    /// </summary>
    public string? StreetName { get; init; }

    /// <summary>
    /// Provider 给出的城市覆盖值（可为空）。
    /// </summary>
    public string? City { get; init; }

    /// <summary>
    /// Provider 给出的州缩写覆盖值（可为空）。
    /// </summary>
    public string? State { get; init; }

    /// <summary>
    /// Provider 给出的纬度覆盖值（可为空）。
    /// </summary>
    public double? Lat { get; init; }

    /// <summary>
    /// Provider 给出的经度（可为空）。
    /// </summary>
    public double? Lon { get; init; }
}

/// <summary>
/// Provider 层抛出的业务异常，用于返回指定 HTTP 状态码与错误信息给客户端。
/// </summary>
public sealed class LookupProviderException : Exception
{
    /// <summary>
    /// 要返回给客户端的 HTTP 状态码。
    /// </summary>
    public int StatusCode { get; }

    /// <summary>
    /// 创建一个包含 HTTP 状态码与客户端可读错误信息的异常。
    /// </summary>
    public LookupProviderException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

/// <summary>
/// 英尺坐标点（plan/渲染使用）。
/// </summary>
public sealed class FtPoint
{
    /// <summary>
    /// X 坐标（英尺）。
    /// </summary>
    public required double XFt { get; init; }

    /// <summary>
    /// Y 坐标（英尺）。
    /// </summary>
    public required double YFt { get; init; }
}

/// <summary>
/// 英尺坐标系下的矩形（左上角 + 宽高）。
/// </summary>
public sealed class FtRect
{
    /// <summary>
    /// 左上角 X（英尺）。
    /// </summary>
    public required double XFt { get; init; }

    /// <summary>
    /// 左上角 Y（英尺）。
    /// </summary>
    public required double YFt { get; init; }

    /// <summary>
    /// 宽度（英尺）。
    /// </summary>
    public required double WFt { get; init; }

    /// <summary>
    /// 高度（英尺）。
    /// </summary>
    public required double HFt { get; init; }
}

/// <summary>
/// 地块信息（plan 生成后的英尺坐标系）。
/// </summary>
public sealed class LookupLot
{
    /// <summary>
    /// 地块宽度（英尺）。
    /// </summary>
    public required double WidthFt { get; init; }

    /// <summary>
    /// 地块高度（英尺）。
    /// </summary>
    public required double HeightFt { get; init; }

    /// <summary>
    /// 地块轮廓多边形（英尺坐标系，闭合与否由渲染端自行处理）。
    /// </summary>
    public required List<FtPoint> Polygon { get; init; }
}

/// <summary>
/// 已有建筑结构（房屋/车库等）的标准化结果。
/// </summary>
public sealed class LookupStructure
{
    /// <summary>
    /// 结构角色（例如 “house”“garage”）。
    /// </summary>
    public string? Role { get; init; }

    /// <summary>
    /// 结构的矩形包围框（英尺）。
    /// </summary>
    public required FtRect RectFt { get; init; }

    public List<FtPoint>? PolygonFt { get; init; }

    /// <summary>
    /// 结构的估算面积（平方英尺）。
    /// </summary>
    public required double AreaSqft { get; init; }
}

/// <summary>
/// 默认模块尺寸（用于 canFitAdu 判断）。
/// </summary>
public sealed class LookupModule
{
    /// <summary>
    /// 宽度（英尺）。
    /// </summary>
    public required double WFt { get; init; }

    /// <summary>
    /// 深度/高度（英尺，平面维度）。
    /// </summary>
    public required double HFt { get; init; }
}

public sealed class LookupModuleFit
{
    public required double WFt { get; init; }
    public required double HFt { get; init; }
    public required bool CanFit { get; init; }
}

public sealed class LookupAduPlacement
{
    public required double CxFt { get; init; }
    public required double CyFt { get; init; }
    public required double RotationDeg { get; init; }
}

public sealed class LookupMeasureLine
{
    public required FtPoint A { get; init; }
    public required FtPoint B { get; init; }
    public required double DistanceFt { get; init; }
    public string? Kind { get; init; }
}

/// <summary>
/// plan 英尺坐标系与地理坐标（WebMercator / lon-lat）之间的转换参数。
/// </summary>
/// <remarks>
/// <para>
/// 该结构用于把 plan 中的英尺多边形（例如 buildable rings）稳定地映射回 GeoJSON，经纬度绘制到地图上。
/// </para>
/// <para>
/// 约定：
/// - plan 生成时：lon/lat -> WebMercator(m) -> 以地块中心为原点做相对坐标 -> 旋转 angleRad -> 再映射到英尺坐标
/// - 反变换时：英尺坐标 -> 旋转坐标(m) -> 逆旋转 -> 加回中心 -> WebMercator -> lon/lat
/// </para>
/// </remarks>
public sealed class LookupPlanTransform
{
    /// <summary>
    /// 地块中心点 WebMercator X（米）。
    /// </summary>
    public required double CenterMercX { get; init; }

    /// <summary>
    /// 地块中心点 WebMercator Y（米）。
    /// </summary>
    public required double CenterMercY { get; init; }

    /// <summary>
    /// 旋转后的相对坐标系中，X 的最小值（米）。
    /// </summary>
    public required double MinRotX { get; init; }

    /// <summary>
    /// 旋转后的相对坐标系中，Y 的最大值（米）。
    /// </summary>
    public required double MaxRotY { get; init; }

    /// <summary>
    /// plan 生成时应用的旋转角（弧度）。
    /// </summary>
    public required double AngleRad { get; init; }
}

/// <summary>
/// 后端计算得到的 plan（前端渲染/交互主数据）。
/// </summary>
public sealed class LookupPlan
{
    /// <summary>
    /// 单位（当前为 “ft”）。
    /// </summary>
    public required string Unit { get; init; }

    /// <summary>
    /// plan 的旋转角（度）。
    /// </summary>
    public required double RotationDeg { get; init; }

    /// <summary>
    /// 地块信息（英尺坐标系）。
    /// </summary>
    public required LookupLot Lot { get; init; }

    /// <summary>
    /// 已有结构列表（英尺坐标系的 rect）。
    /// </summary>
    public required List<LookupStructure> Structures { get; init; }

    /// <summary>
    /// 已有结构总数（去重/过滤后），可能大于 Structures 列表长度（Structures 可能被截断用于前端展示）。
    /// </summary>
    public int? StructuresCount { get; init; }

    /// <summary>
    /// 可建区域（envelope，英尺坐标系 rect）。
    /// </summary>
    [JsonIgnore]
    public required FtRect BuildableZone { get; init; }

    public List<FtPoint>? BuildablePolygon { get; init; }

    /// <summary>
    /// 可建区域多边形的 ring 列表（英尺坐标系）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 用于表达“从地块中扣除前院/周界退尺/已有建筑/车道通道”等约束后的真实可建形状。
    /// 仅输出单个 Polygon 的 rings：
    /// </para>
    /// <list type="bullet">
    /// <item><description>第 0 个 ring：外环（外边界）</description></item>
    /// <item><description>第 1..N 个 ring：内环（洞；被排除区域）</description></item>
    /// </list>
    /// <para>
    /// 说明：<see cref="BuildablePolygon"/> 仅为外环的兼容输出；渲染/几何判断应优先使用 <see cref="BuildableRings"/>。
    /// </para>
    /// </remarks>
    public List<List<FtPoint>>? BuildableRings { get; init; }

    /// <summary>
    /// 可建区域 MultiPolygon 的 rings 列表（英尺坐标系）。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 当扣除障碍（主屋/车库/通道/退尺）后，可建区域可能被分割为多个不相连的片区。
    /// 为避免仅保留“最大一块”导致前端看到可建区缺一截，这里输出 MultiPolygon 结构：
    /// </para>
    /// <list type="bullet">
    /// <item><description>第 1 层：每个可建片区（polygon）</description></item>
    /// <item><description>第 2 层：该片区的 rings（第 0 个为外环，其余为洞）</description></item>
    /// <item><description>第 3 层：ring 点序列（英尺坐标系）</description></item>
    /// </list>
    /// <para>
    /// 说明：<see cref="BuildableRings"/> 仍保留为“最大片区”的兼容输出；渲染/约束判断优先使用该字段（或 computed.buildableArea）。
    /// </para>
    /// </remarks>
    public List<List<List<FtPoint>>>? BuildableMultiRings { get; init; }

    /// <summary>
    /// 可建区域计算过程中“被抠掉的区域”（英尺坐标系），用于调试可建区为何缺失/偏移。
    /// </summary>
    /// <remarks>
    /// <para>
    /// 该字段仅用于可视化调试：后端会在可建区域计算的关键步骤（前院/周界退尺/已有建筑/车库通道/狭窄区域清理）记录被排除的几何片区，
    /// 并附带原因标识与中英文标签，前端可用半透明颜色叠加绘制并在片区中心显示说明文字。
    /// </para>
    /// </remarks>
    public List<LookupCutoutArea>? CutoutsFt { get; init; }

    /// <summary>
    /// plan 坐标变换参数（用于把英尺多边形映射回 GeoJSON 经纬度）。
    /// </summary>
    public required LookupPlanTransform Transform { get; init; }

    /// <summary>
    /// 默认模块尺寸（用于适配判断）。
    /// </summary>
    public required LookupModule Module { get; init; }

    public List<LookupModuleFit>? ModuleFits { get; init; }

    public LookupAduPlacement? SuggestedAduPlacement { get; init; }

    public List<LookupMeasureLine>? MeasureLines { get; init; }

    /// <summary>
    /// 默认模块是否可放入可建区域。
    /// </summary>
    public required bool CanFitAdu { get; init; }
}

/// <summary>
/// 可建区域计算过程中被排除（抠出）的区域片段（英尺坐标系）。
/// </summary>
public sealed class LookupCutoutArea
{
    /// <summary>
    /// 原因代码（稳定字段，便于前端按类型着色/筛选）。
    /// </summary>
    public required string Reason { get; init; }

    /// <summary>
    /// 中文标签（用于在片区中心显示）。
    /// </summary>
    public required string LabelZh { get; init; }

    /// <summary>
    /// 英文标签（用于在片区中心显示）。
    /// </summary>
    public required string LabelEn { get; init; }

    /// <summary>
    /// MultiPolygon rings（英尺坐标系）。
    /// </summary>
    /// <remarks>
    /// 三层列表结构与 <see cref="LookupPlan.BuildableMultiRings"/> 一致：
    /// 第 1 层为 polygon 片区，第 2 层为 rings（0=外环，其余为洞），第 3 层为 ring 点序列。
    /// </remarks>
    public required List<List<List<FtPoint>>> MultiRings { get; init; }
}
