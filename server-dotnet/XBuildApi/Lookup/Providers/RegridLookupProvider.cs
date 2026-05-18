using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace XBuildApi.Lookup.Providers;

/// <summary>
/// 基于 Regrid API 的地址查询 Provider。
/// 输出包含地块 geometry 与可匹配的建筑轮廓（如有）。
/// </summary>
public sealed class RegridLookupProvider : ILookupProvider
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _cfg;
    private readonly ILogger<RegridLookupProvider> _logger;

    /// <summary>
    /// 创建 Provider。
    /// </summary>
    public RegridLookupProvider(IHttpClientFactory httpFactory, IConfiguration cfg, ILogger<RegridLookupProvider> logger)
    {
        _httpFactory = httpFactory;
        _cfg = cfg;
        _logger = logger;
    }

    /// <inheritdoc />
    public string ProviderName => "regrid";

    /// <inheritdoc />
    public int Priority => 0;

    /// <inheritdoc />
    public bool CanHandle(string address, string state) => true;

    /// <inheritdoc />
    public async Task<LookupProviderResult?> LookupAsync(string address, string state, CancellationToken cancellationToken)
    {
        var token = _cfg["Regrid:Token"];
        if (string.IsNullOrWhiteSpace(token))
            token = Environment.GetEnvironmentVariable("REGRID_TOKEN");
        if (string.IsNullOrWhiteSpace(token))
            throw new LookupProviderException(501, "需要配置 REGRID_TOKEN");

        var http = _httpFactory.CreateClient("regrid");
        var path = string.IsNullOrWhiteSpace(state) ? "" : $"&path=%2Fus%2F{state.ToLowerInvariant()}";
        var url = $"https://app.regrid.com/api/v2/parcels/address?query={Uri.EscapeDataString(address)}{path}&token={Uri.EscapeDataString(token)}&limit=5&return_matched_buildings=true&return_geometry=true&return_custom=false";
        _logger.LogInformation("地块数据源上游请求 url={Url}", LookupUtils.RedactToken(url));

        using var resp = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var text = await resp.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogInformation("地块数据源上游响应 status={Status} body={Body}", (int)resp.StatusCode, Truncate(text, 8000));
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("地块数据源上游错误 status={Status} body={Body}", (int)resp.StatusCode, Truncate(text, 8000));
            var detail = text;
            try
            {
                var errJson = JsonNode.Parse(text);
                detail = errJson?["detail"]?.GetValue<string>()
                         ?? errJson?["message"]?.GetValue<string>()
                         ?? errJson?["error"]?.GetValue<string>()
                         ?? text;
            }
            catch
            {
            }
            throw new LookupProviderException((int)resp.StatusCode, detail);
        }

        var doc = JsonNode.Parse(text);
        var status = doc?["status"]?.GetValue<string>();
        if (!string.IsNullOrWhiteSpace(status) && status.Equals("error", StringComparison.OrdinalIgnoreCase))
        {
            var msg = doc?["message"]?.GetValue<string>() ?? "Regrid 返回错误";
            throw new LookupProviderException(502, msg);
        }

        var parcels = doc?["parcels"]?["features"] as JsonArray;
        if (parcels is null || parcels.Count == 0)
            return null;

        var parcel = parcels[0] as JsonObject;
        if (parcel is null)
            return null;

        JsonObject buildings = new JsonObject { ["type"] = "FeatureCollection", ["features"] = new JsonArray() };
        try
        {
            if (doc?["buildings"] is JsonObject topB &&
                topB["type"]?.GetValue<string>() == "FeatureCollection" &&
                topB["features"] is JsonArray tf && tf.Count > 0)
            {
                buildings = topB;
            }
        }
        catch
        {
        }

        if (parcel["properties"] is JsonObject props)
        {
            props.Remove("matched_buildings");
        }

        var city = "";
        var st = state;
        try
        {
            if (parcel["properties"] is JsonObject p)
            {
                city = p["scity"]?.GetValue<string>()
                       ?? (p["fields"]?["scity"]?.GetValue<string>())
                       ?? city;
                st = p["sstate"]?.GetValue<string>()
                     ?? (p["fields"]?["sstate"]?.GetValue<string>())
                     ?? st;
            }
        }
        catch
        {
        }

        return new LookupProviderResult
        {
            Provider = ProviderName,
            Parcel = parcel,
            Buildings = buildings,
            StreetName = LookupUtils.TryGetStreetNameFromParcel(parcel),
            City = city,
            State = st
        };
    }

    private static string Truncate(string s, int maxLen)
    {
        if (string.IsNullOrEmpty(s)) return s;
        if (s.Length <= maxLen) return s;
        return s.Substring(0, maxLen);
    }
}
