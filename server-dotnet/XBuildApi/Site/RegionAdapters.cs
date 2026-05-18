using System.Text.Json;
using System.Text.Json.Nodes;
using XBuildApi.Lookup;
using XBuildApi.Lookup.Providers;

namespace XBuildApi.Site;

/// <summary>
/// 地区适配器解析器：从已注册的 <see cref="ISiteRegionAdapter"/> 列表中选出能处理当前地址的 adapter。
/// </summary>
public sealed class SiteRegionResolver
{
    private readonly IReadOnlyList<ISiteRegionAdapter> _adapters;

    /// <summary>
    /// 创建解析器。
    /// </summary>
    /// <param name="adapters">已注册的地区适配器集合。</param>
    public SiteRegionResolver(IEnumerable<ISiteRegionAdapter> adapters)
    {
        _adapters = adapters.ToList();
    }

    /// <summary>
    /// 为地址选择一个可处理的地区适配器。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <returns>匹配到的 adapter；未匹配到则返回 null。</returns>
    public ISiteRegionAdapter? Resolve(string address)
    {
        foreach (var a in _adapters)
        {
            if (a.CanHandle(address)) return a;
        }
        return null;
    }
}

/// <summary>
/// 西雅图（WA）地区适配器：使用 Seattle 官方地址/地块数据源，并组合附近要素（地块/建筑/道路）。
/// </summary>
public sealed class SeattleRegionAdapter : ISiteRegionAdapter
{
    private readonly SeattleOfficialLookupProvider _provider;
    private readonly OsmBuildingsService _osm;
    private readonly IHttpClientFactory _httpFactory;
    private readonly OverpassRoadService _roads;
    private readonly PlanBuilder _planBuilder;
    private readonly ILogger<SeattleRegionAdapter> _logger;

    /// <summary>
    /// 创建西雅图地区适配器。
    /// </summary>
    /// <param name="provider">Seattle 官方地块查询 provider。</param>
    /// <param name="osm">OSM 建筑查询服务（Overpass）。</param>
    /// <param name="httpFactory">HttpClient 工厂（需注册 <c>arcgis</c> client）。</param>
    /// <param name="roads">Overpass 道路查询服务。</param>
    /// <param name="planBuilder">统一 plan 计算器（英尺局部坐标系）。</param>
    /// <param name="logger">日志。</param>
    public SeattleRegionAdapter(
        SeattleOfficialLookupProvider provider,
        OsmBuildingsService osm,
        IHttpClientFactory httpFactory,
        OverpassRoadService roads,
        PlanBuilder planBuilder,
        ILogger<SeattleRegionAdapter> logger)
    {
        _provider = provider;
        _osm = osm;
        _httpFactory = httpFactory;
        _roads = roads;
        _planBuilder = planBuilder;
        _logger = logger;
    }

    /// <summary>
    /// 地区标识。
    /// </summary>
    public string Name => "seattle";

    /// <summary>
    /// 西雅图地区默认策略参数。
    /// </summary>
    public RegionPolicy Policy => new()
    {
        DefaultFrontSetbackFt = 20,
        DefaultRearSetbackFt = 20,
        DefaultSideSetbackFt = 5,
        DefaultHouseSepFt = 5,
        AduModuleSizesFt = new List<(double w, double h)>
        {
            (16, 37.5),
            (32, 37.5),
            (16, 45),
            (16, 52.5)
        },
        NearbyPadDegrees = 0.0012
    };

    /// <summary>
    /// 仅处理 WA 地址。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <returns>WA 返回 true。</returns>
    public bool CanHandle(string address) => LookupUtils.ExtractState(address) == "WA";

    /// <summary>
    /// 获取目标地块与建筑集合，并计算目标地块 bbox。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>目标数据；找不到地块返回 null。</returns>
    public async Task<SiteSubjectData?> FetchSubjectAsync(string address, CancellationToken cancellationToken)
    {
        var state = LookupUtils.ExtractState(address);
        var r = await _provider.LookupAsync(address, state, cancellationToken);
        if (r is null) return null;

        var parcel = GeoJsonStd.ParseFeature(r.Parcel.ToJsonString());
        var buildings = GeoJsonStd.ParseFeatureCollection(r.Buildings.ToJsonString());
        var bbox = GeoBbox.FromGeometry(parcel.Geometry);

        return new SiteSubjectData
        {
            Provider = r.Provider,
            City = (r.City ?? "").Trim(),
            State = (r.State ?? state ?? "").Trim().ToUpperInvariant(),
            Lat = r.Lat,
            Lon = r.Lon,
            StreetName = r.StreetName,
            Parcel = parcel,
            Buildings = buildings,
            ParcelBbox = bbox
        };
    }

    /// <summary>
    /// 查询附近地块/建筑/道路。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近要素集合。</returns>
    public async Task<SiteNearbyData> FetchNearbyAsync(SiteSubjectData subject, CancellationToken cancellationToken)
    {
        var bbox = PadBbox(subject.ParcelBbox, Policy.NearbyPadDegrees);
        var parcels = await QueryNearbyParcelsAsync(bbox, cancellationToken);
        GeoJsonFeatureCollection buildings;
        GeoJsonFeatureCollection roads;
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(12));
            buildings = GeoJsonStd.ParseFeatureCollection((await _osm.QueryAsync(bbox, timeoutCts.Token)).ToJsonString());
        }
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(12));
            roads = await _roads.QueryRoadsGeoJsonAsync(bbox, timeoutCts.Token);
        }
        return new SiteNearbyData { Parcels = parcels, Buildings = buildings, Roads = roads };
    }

    /// <summary>
    /// 统一 plan 计算（英尺局部坐标系）。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>计算后的 plan。</returns>
    public async Task<LookupPlan> BuildPlanAsync(SiteSubjectData subject, CancellationToken cancellationToken)
    {
        var parcelJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Parcel)) as JsonObject ?? new JsonObject();
        var buildingsJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Buildings)) as JsonObject ?? new JsonObject();
        var plan = await _planBuilder.BuildAsync(
            parcelJson,
            buildingsJson,
            subject.StreetName,
            Policy.DefaultFrontSetbackFt,
            Policy.DefaultRearSetbackFt,
            Policy.DefaultSideSetbackFt,
            Policy.DefaultHouseSepFt,
            cancellationToken);
        if (plan is null) throw new LookupProviderException(502, "Plan 计算失败");
        return plan;
    }

    /// <summary>
    /// 查询 bbox 内附近地块（KingCounty parcel 图层）。
    /// </summary>
    /// <param name="bboxLonLat">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近地块 FeatureCollection。</returns>
    private async Task<GeoJsonFeatureCollection> QueryNearbyParcelsAsync(double[] bboxLonLat, CancellationToken cancellationToken)
    {
        try
        {
            var minLon = bboxLonLat[0];
            var minLat = bboxLonLat[1];
            var maxLon = bboxLonLat[2];
            var maxLat = bboxLonLat[3];

            var url =
                "https://gisdata.kingcounty.gov/arcgis/rest/services/OpenDataPortal/property__parcel_area/FeatureServer/439/query"
                + $"?f=geojson&geometryType=esriGeometryEnvelope&inSR=4326&geometry={minLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{minLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLat.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
                + "&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=200";

            var http = _httpFactory.CreateClient("arcgis");
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(12));

            _logger.LogInformation("Nearby parcels (KingCounty) 请求 url={Url}", url);
            using var resp = await http.GetAsync(url, timeoutCts.Token);
            if (!resp.IsSuccessStatusCode) return EmptyFc();
            var text = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
            using var doc = JsonDocument.Parse(text);
            return GeoJsonStd.ParseFeatureCollection(doc.RootElement);
        }
        catch
        {
            return EmptyFc();
        }
    }

    /// <summary>
    /// 对 bbox 做简单扩展（用于 nearby 查询）。
    /// </summary>
    /// <param name="bbox">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="pad">扩展量（度）。</param>
    /// <returns>扩展后的 bbox。</returns>
    private static double[] PadBbox(double[] bbox, double pad)
    {
        if (bbox.Length < 4) return bbox;
        return new[] { bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad };
    }

    /// <summary>
    /// 空 FeatureCollection。
    /// </summary>
    private static GeoJsonFeatureCollection EmptyFc() => new() { Type = "FeatureCollection", Features = new List<GeoJsonFeature>() };
}

/// <summary>
/// 纽约（NY）地区适配器：使用纽约官方地块 provider，并组合附近要素（地块/建筑/道路）。
/// </summary>
public sealed class NewYorkRegionAdapter : ISiteRegionAdapter
{
    private readonly NewYorkOfficialLookupProvider _provider;
    private readonly OsmBuildingsService _osm;
    private readonly IHttpClientFactory _httpFactory;
    private readonly OverpassRoadService _roads;
    private readonly PlanBuilder _planBuilder;

    /// <summary>
    /// 创建纽约地区适配器。
    /// </summary>
    /// <param name="provider">NY 官方地块查询 provider。</param>
    /// <param name="osm">OSM 建筑查询服务。</param>
    /// <param name="httpFactory">HttpClient 工厂（需注册 <c>arcgis</c> client）。</param>
    /// <param name="roads">Overpass 道路查询服务。</param>
    /// <param name="planBuilder">统一 plan 计算器。</param>
    public NewYorkRegionAdapter(
        NewYorkOfficialLookupProvider provider,
        OsmBuildingsService osm,
        IHttpClientFactory httpFactory,
        OverpassRoadService roads,
        PlanBuilder planBuilder)
    {
        _provider = provider;
        _osm = osm;
        _httpFactory = httpFactory;
        _roads = roads;
        _planBuilder = planBuilder;
    }

    /// <summary>
    /// 地区标识。
    /// </summary>
    public string Name => "newyork";

    /// <summary>
    /// 纽约地区默认策略参数。
    /// </summary>
    public RegionPolicy Policy => new()
    {
        DefaultFrontSetbackFt = 20,
        DefaultRearSetbackFt = 20,
        DefaultSideSetbackFt = 5,
        DefaultHouseSepFt = 5,
        AduModuleSizesFt = new List<(double w, double h)>
        {
            (16, 37.5),
            (32, 37.5),
            (16, 45),
            (16, 52.5)
        },
        NearbyPadDegrees = 0.0012
    };

    /// <summary>
    /// 仅处理 NY 地址。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <returns>NY 返回 true。</returns>
    public bool CanHandle(string address) => LookupUtils.ExtractState(address) == "NY";

    /// <summary>
    /// 获取目标地块与建筑集合，并计算 bbox。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>目标数据；找不到地块返回 null。</returns>
    public async Task<SiteSubjectData?> FetchSubjectAsync(string address, CancellationToken cancellationToken)
    {
        var state = LookupUtils.ExtractState(address);
        var r = await _provider.LookupAsync(address, state, cancellationToken);
        if (r is null) return null;
        var parcel = GeoJsonStd.ParseFeature(r.Parcel.ToJsonString());
        var buildings = GeoJsonStd.ParseFeatureCollection(r.Buildings.ToJsonString());
        var bbox = GeoBbox.FromGeometry(parcel.Geometry);
        return new SiteSubjectData
        {
            Provider = r.Provider,
            City = (r.City ?? "").Trim(),
            State = (r.State ?? state ?? "").Trim().ToUpperInvariant(),
            Lat = r.Lat,
            Lon = r.Lon,
            StreetName = r.StreetName,
            Parcel = parcel,
            Buildings = buildings,
            ParcelBbox = bbox
        };
    }

    /// <summary>
    /// 查询附近地块/建筑/道路。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近要素集合。</returns>
    public async Task<SiteNearbyData> FetchNearbyAsync(SiteSubjectData subject, CancellationToken cancellationToken)
    {
        var bbox = PadBbox(subject.ParcelBbox, Policy.NearbyPadDegrees);
        var parcels = await QueryNearbyParcelsAsync(bbox, cancellationToken);
        var buildings = GeoJsonStd.ParseFeatureCollection((await _osm.QueryAsync(bbox, cancellationToken)).ToJsonString());
        var roads = await _roads.QueryRoadsGeoJsonAsync(bbox, cancellationToken);
        return new SiteNearbyData { Parcels = parcels, Buildings = buildings, Roads = roads };
    }

    /// <summary>
    /// 统一 plan 计算（英尺局部坐标系）。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>计算后的 plan。</returns>
    public async Task<LookupPlan> BuildPlanAsync(SiteSubjectData subject, CancellationToken cancellationToken)
    {
        var parcelJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Parcel)) as JsonObject ?? new JsonObject();
        var buildingsJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Buildings)) as JsonObject ?? new JsonObject();
        var plan = await _planBuilder.BuildAsync(
            parcelJson,
            buildingsJson,
            subject.StreetName,
            Policy.DefaultFrontSetbackFt,
            Policy.DefaultRearSetbackFt,
            Policy.DefaultSideSetbackFt,
            Policy.DefaultHouseSepFt,
            cancellationToken);
        if (plan is null) throw new LookupProviderException(502, "Plan 计算失败");
        return plan;
    }

    /// <summary>
    /// 查询 bbox 内附近地块（NY 税务地块公开图层）。
    /// </summary>
    /// <param name="bboxLonLat">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近地块 FeatureCollection。</returns>
    private async Task<GeoJsonFeatureCollection> QueryNearbyParcelsAsync(double[] bboxLonLat, CancellationToken cancellationToken)
    {
        try
        {
            var minLon = bboxLonLat[0];
            var minLat = bboxLonLat[1];
            var maxLon = bboxLonLat[2];
            var maxLat = bboxLonLat[3];

            var url =
                "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/1/query"
                + $"?f=geojson&geometryType=esriGeometryEnvelope&inSR=4326&geometry={minLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{minLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLat.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
                + "&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=200";

            var http = _httpFactory.CreateClient("arcgis");
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(12));
            using var resp = await http.GetAsync(url, timeoutCts.Token);
            if (!resp.IsSuccessStatusCode) return EmptyFc();
            var text = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
            using var doc = JsonDocument.Parse(text);
            return GeoJsonStd.ParseFeatureCollection(doc.RootElement);
        }
        catch
        {
            return EmptyFc();
        }
    }

    /// <summary>
    /// 对 bbox 做简单扩展（用于 nearby 查询）。
    /// </summary>
    /// <param name="bbox">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="pad">扩展量（度）。</param>
    /// <returns>扩展后的 bbox。</returns>
    private static double[] PadBbox(double[] bbox, double pad)
    {
        if (bbox.Length < 4) return bbox;
        return new[] { bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad };
    }

    /// <summary>
    /// 空 FeatureCollection。
    /// </summary>
    private static GeoJsonFeatureCollection EmptyFc() => new() { Type = "FeatureCollection", Features = new List<GeoJsonFeature>() };
}

/// <summary>
/// 新泽西（NJ）地区适配器：使用 NJ 官方地块 provider，并组合附近要素（地块/建筑/道路）。
/// </summary>
public sealed class NewJerseyRegionAdapter : ISiteRegionAdapter
{
    private readonly NewJerseyOfficialLookupProvider _provider;
    private readonly OsmBuildingsService _osm;
    private readonly IHttpClientFactory _httpFactory;
    private readonly OverpassRoadService _roads;
    private readonly PlanBuilder _planBuilder;

    /// <summary>
    /// 创建新泽西地区适配器。
    /// </summary>
    /// <param name="provider">NJ 官方地块查询 provider。</param>
    /// <param name="osm">OSM 建筑查询服务。</param>
    /// <param name="httpFactory">HttpClient 工厂（需注册 <c>arcgis</c> client）。</param>
    /// <param name="roads">Overpass 道路查询服务。</param>
    /// <param name="planBuilder">统一 plan 计算器。</param>
    public NewJerseyRegionAdapter(
        NewJerseyOfficialLookupProvider provider,
        OsmBuildingsService osm,
        IHttpClientFactory httpFactory,
        OverpassRoadService roads,
        PlanBuilder planBuilder)
    {
        _provider = provider;
        _osm = osm;
        _httpFactory = httpFactory;
        _roads = roads;
        _planBuilder = planBuilder;
    }

    /// <summary>
    /// 地区标识。
    /// </summary>
    public string Name => "newjersey";

    /// <summary>
    /// 新泽西地区默认策略参数。
    /// </summary>
    public RegionPolicy Policy => new()
    {
        DefaultFrontSetbackFt = 20,
        DefaultRearSetbackFt = 20,
        DefaultSideSetbackFt = 5,
        DefaultHouseSepFt = 5,
        AduModuleSizesFt = new List<(double w, double h)>
        {
            (16, 37.5),
            (32, 37.5),
            (16, 45),
            (16, 52.5)
        },
        NearbyPadDegrees = 0.0012
    };

    /// <summary>
    /// 仅处理 NJ 地址。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <returns>NJ 返回 true。</returns>
    public bool CanHandle(string address) => LookupUtils.ExtractState(address) == "NJ";

    /// <summary>
    /// 获取目标地块与建筑集合，并计算 bbox。
    /// </summary>
    /// <param name="address">单行地址。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>目标数据；找不到地块返回 null。</returns>
    public async Task<SiteSubjectData?> FetchSubjectAsync(string address, CancellationToken cancellationToken)
    {
        var state = LookupUtils.ExtractState(address);
        var r = await _provider.LookupAsync(address, state, cancellationToken);
        if (r is null) return null;
        var parcel = GeoJsonStd.ParseFeature(r.Parcel.ToJsonString());
        var buildings = GeoJsonStd.ParseFeatureCollection(r.Buildings.ToJsonString());
        var bbox = GeoBbox.FromGeometry(parcel.Geometry);
        return new SiteSubjectData
        {
            Provider = r.Provider,
            City = (r.City ?? "").Trim(),
            State = (r.State ?? state ?? "").Trim().ToUpperInvariant(),
            Lat = r.Lat,
            Lon = r.Lon,
            StreetName = r.StreetName,
            Parcel = parcel,
            Buildings = buildings,
            ParcelBbox = bbox
        };
    }

    /// <summary>
    /// 查询附近地块/建筑/道路。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近要素集合。</returns>
    public async Task<SiteNearbyData> FetchNearbyAsync(SiteSubjectData subject, CancellationToken cancellationToken)
    {
        var bbox = PadBbox(subject.ParcelBbox, Policy.NearbyPadDegrees);
        var parcels = await QueryNearbyParcelsAsync(bbox, cancellationToken);
        var buildings = GeoJsonStd.ParseFeatureCollection((await _osm.QueryAsync(bbox, cancellationToken)).ToJsonString());
        var roads = await _roads.QueryRoadsGeoJsonAsync(bbox, cancellationToken);
        return new SiteNearbyData { Parcels = parcels, Buildings = buildings, Roads = roads };
    }

    /// <summary>
    /// 统一 plan 计算（英尺局部坐标系）。
    /// </summary>
    /// <param name="subject">目标地块数据。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>计算后的 plan。</returns>
    public async Task<LookupPlan> BuildPlanAsync(SiteSubjectData subject, CancellationToken cancellationToken)
    {
        var parcelJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Parcel)) as JsonObject ?? new JsonObject();
        var buildingsJson = JsonNode.Parse(GeoJsonStd.ToJson(subject.Buildings)) as JsonObject ?? new JsonObject();
        var plan = await _planBuilder.BuildAsync(
            parcelJson,
            buildingsJson,
            subject.StreetName,
            Policy.DefaultFrontSetbackFt,
            Policy.DefaultRearSetbackFt,
            Policy.DefaultSideSetbackFt,
            Policy.DefaultHouseSepFt,
            cancellationToken);
        if (plan is null) throw new LookupProviderException(502, "Plan 计算失败");
        return plan;
    }

    /// <summary>
    /// 查询 bbox 内附近地块（NJ cadastral 图层）。
    /// </summary>
    /// <param name="bboxLonLat">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="cancellationToken">取消/超时。</param>
    /// <returns>附近地块 FeatureCollection。</returns>
    private async Task<GeoJsonFeatureCollection> QueryNearbyParcelsAsync(double[] bboxLonLat, CancellationToken cancellationToken)
    {
        try
        {
            var minLon = bboxLonLat[0];
            var minLat = bboxLonLat[1];
            var maxLon = bboxLonLat[2];
            var maxLat = bboxLonLat[3];

            var url =
                "https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0/query"
                + $"?f=geojson&geometryType=esriGeometryEnvelope&inSR=4326&geometry={minLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{minLat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLon.ToString(System.Globalization.CultureInfo.InvariantCulture)},{maxLat.ToString(System.Globalization.CultureInfo.InvariantCulture)}"
                + "&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=200";

            var http = _httpFactory.CreateClient("arcgis");
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(12));
            using var resp = await http.GetAsync(url, timeoutCts.Token);
            if (!resp.IsSuccessStatusCode) return EmptyFc();
            var text = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
            using var doc = JsonDocument.Parse(text);
            return GeoJsonStd.ParseFeatureCollection(doc.RootElement);
        }
        catch
        {
            return EmptyFc();
        }
    }

    /// <summary>
    /// 对 bbox 做简单扩展（用于 nearby 查询）。
    /// </summary>
    /// <param name="bbox">经纬度 bbox（minLon,minLat,maxLon,maxLat）。</param>
    /// <param name="pad">扩展量（度）。</param>
    /// <returns>扩展后的 bbox。</returns>
    private static double[] PadBbox(double[] bbox, double pad)
    {
        if (bbox.Length < 4) return bbox;
        return new[] { bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad };
    }

    /// <summary>
    /// 空 FeatureCollection。
    /// </summary>
    private static GeoJsonFeatureCollection EmptyFc() => new() { Type = "FeatureCollection", Features = new List<GeoJsonFeature>() };
}

/// <summary>
/// GeoJSON 几何 bbox 计算工具。
/// </summary>
static class GeoBbox
{
    /// <summary>
    /// 从 GeoJSON Geometry 计算经纬度 bbox。
    /// </summary>
    /// <param name="geometry">GeoJSON geometry。</param>
    /// <returns>经纬度 bbox（minLon,minLat,maxLon,maxLat）。若无法计算则返回 0 值 bbox。</returns>
    public static double[] FromGeometry(GeoJsonGeometry geometry)
    {
        if (geometry.Coordinates.ValueKind != JsonValueKind.Array)
            return new[] { 0d, 0d, 0d, 0d };

        var minLon = double.PositiveInfinity;
        var minLat = double.PositiveInfinity;
        var maxLon = double.NegativeInfinity;
        var maxLat = double.NegativeInfinity;

        void Walk(JsonElement el)
        {
            if (el.ValueKind != JsonValueKind.Array) return;
            if (el.GetArrayLength() == 0) return;

            var first = el[0];
            if (first.ValueKind == JsonValueKind.Number && el.GetArrayLength() >= 2)
            {
                var lon = el[0].GetDouble();
                var lat = el[1].GetDouble();
                if (double.IsFinite(lon) && double.IsFinite(lat))
                {
                    minLon = Math.Min(minLon, lon);
                    minLat = Math.Min(minLat, lat);
                    maxLon = Math.Max(maxLon, lon);
                    maxLat = Math.Max(maxLat, lat);
                }
                return;
            }

            foreach (var child in el.EnumerateArray())
                Walk(child);
        }

        Walk(geometry.Coordinates);
        if (!double.IsFinite(minLon) || !double.IsFinite(minLat) || !double.IsFinite(maxLon) || !double.IsFinite(maxLat))
            return new[] { 0d, 0d, 0d, 0d };

        return new[] { minLon, minLat, maxLon, maxLat };
    }
}
