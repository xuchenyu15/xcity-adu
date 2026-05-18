namespace XBuildApi.Lookup.Providers;

/// <summary>
/// 地址查询 Provider 的统一接口（Regrid、城市官方 GIS 等）。
/// Provider 负责把“地块 + 建筑轮廓”转换成统一结构，供后续 plan 构建使用。
/// </summary>
public interface ILookupProvider
{
    /// <summary>
    /// Provider 的稳定标识（用于 <c>source.provider</c>）。
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// 优先级，数值越大越先尝试。
    /// </summary>
    int Priority { get; }

    /// <summary>
    /// 判断该 Provider 是否适用于当前地址（例如 Seattle 官方 Provider 只处理 WA/Seattle）。
    /// </summary>
    bool CanHandle(string address, string state);

    /// <summary>
    /// 执行查询，返回统一的 ProviderResult（含 Parcel/Buildings 与可选的路名/城市州/经纬度覆盖值）。
    /// 返回 null 表示该 Provider 无法解析当前地址（允许后续 provider 回退）。
    /// 对于需要直接返回给客户端的错误，抛出 <see cref="XBuildApi.Lookup.LookupProviderException"/>。
    /// </summary>
    Task<XBuildApi.Lookup.LookupProviderResult?> LookupAsync(string address, string state, CancellationToken cancellationToken);
}
