using XBuildApi.Lookup;

namespace XBuildApi.Site;

/// <summary>
/// 某个州/城市的策略参数集合。
/// </summary>
/// <remarks>
/// 该策略用于把“地区差异”从计算流程中解耦出来，做到同一套流水线可在不同地区复用。
/// </remarks>
public sealed class RegionPolicy
{
    /// <summary>
    /// 默认前院退尺（英尺）。
    /// </summary>
    public required double DefaultFrontSetbackFt { get; init; }

    /// <summary>
    /// 默认后院退尺（英尺）。
    /// </summary>
    public required double DefaultRearSetbackFt { get; init; }

    /// <summary>
    /// 默认侧院退尺（英尺）。
    /// </summary>
    public required double DefaultSideSetbackFt { get; init; }

    /// <summary>
    /// 默认主屋间距（英尺），用于从主屋外扩保留距离。
    /// </summary>
    public required double DefaultHouseSepFt { get; init; }

    /// <summary>
    /// 需要判断可放置性的 ADU 模块尺寸列表（英尺）。
    /// </summary>
    public required List<(double w, double h)> AduModuleSizesFt { get; init; }

    /// <summary>
    /// 用于查询“附近要素”的经纬度 bbox 扩展量（度）。
    /// </summary>
    /// <remarks>
    /// 该值越大，查询范围越大，返回数据越多，耗时越长。
    /// </remarks>
    public required double NearbyPadDegrees { get; init; }
}

/// <summary>
/// 目标地址（subject）的基础数据：地块、建筑、地理信息与查询 bbox。
/// </summary>
public sealed class SiteSubjectData
{
    /// <summary>
    /// 上游数据源标识（例如 <c>seattle-official</c>）。
    /// </summary>
    public required string Provider { get; init; }

    /// <summary>
    /// 城市名（如可获取）。
    /// </summary>
    public required string City { get; init; }

    /// <summary>
    /// 州缩写（例如 <c>WA</c>）。
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
    /// 街道名（可选），用于道路匹配/朝向推断等。
    /// </summary>
    public string? StreetName { get; init; }

    /// <summary>
    /// 目标地块 GeoJSON Feature。
    /// </summary>
    public required GeoJsonFeature Parcel { get; init; }

    /// <summary>
    /// 目标地块建筑轮廓 GeoJSON FeatureCollection。
    /// </summary>
    public required GeoJsonFeatureCollection Buildings { get; init; }

    /// <summary>
    /// 目标地块几何的 bbox（经纬度，顺序：minLon,minLat,maxLon,maxLat）。
    /// </summary>
    public required double[] ParcelBbox { get; init; }
}

/// <summary>
/// 附近数据集合：附近地块、附近建筑、附近道路。
/// </summary>
public sealed class SiteNearbyData
{
    /// <summary>
    /// 附近地块 GeoJSON FeatureCollection。
    /// </summary>
    public required GeoJsonFeatureCollection Parcels { get; init; }

    /// <summary>
    /// 附近建筑 GeoJSON FeatureCollection。
    /// </summary>
    public required GeoJsonFeatureCollection Buildings { get; init; }

    /// <summary>
    /// 附近道路 GeoJSON FeatureCollection（通常为 LineString）。
    /// </summary>
    public required GeoJsonFeatureCollection Roads { get; init; }
}

/// <summary>
/// 地区适配器：封装某个州/城市的“数据源选择 + 规则参数 + 必要的地区特化逻辑”。
/// </summary>
/// <remarks>
/// 统一流水线依赖该接口获取：
/// - subject：目标地块/建筑
/// - nearby：附近地块/建筑/道路
/// - plan：统一的地块局部坐标系计算结果（可建区、结构角色等）
/// </remarks>
public interface ISiteRegionAdapter
{
    /// <summary>
    /// 地区标识（稳定字符串），用于日志与调试。
    /// </summary>
    string Name { get; }

    /// <summary>
    /// 该地区的默认策略参数。
    /// </summary>
    RegionPolicy Policy { get; }

    /// <summary>
    /// 判断该 adapter 是否能处理此地址。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <returns>能处理则返回 true。</returns>
    bool CanHandle(string address);

    /// <summary>
    /// 获取目标地块与其建筑轮廓，并补全城市/州/经纬度/街道名等信息。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>找不到地块则返回 null；其余错误以异常方式抛出。</returns>
    Task<SiteSubjectData?> FetchSubjectAsync(string address, CancellationToken cancellationToken);

    /// <summary>
    /// 基于目标地块 bbox 查询附近地块/建筑/道路。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近数据集合。</returns>
    Task<SiteNearbyData> FetchNearbyAsync(SiteSubjectData subject, CancellationToken cancellationToken);

    /// <summary>
    /// 基于目标地块与建筑，构建统一的计算 plan（英尺局部坐标系）。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>统一 plan。</returns>
    Task<LookupPlan> BuildPlanAsync(SiteSubjectData subject, CancellationToken cancellationToken);
}
