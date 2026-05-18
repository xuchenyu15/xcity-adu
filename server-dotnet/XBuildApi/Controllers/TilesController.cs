using Microsoft.AspNetCore.Mvc;

namespace XBuildApi.Controllers;

/// <summary>
/// 地图瓦片代理接口。
/// 主要用于前端在不直接访问 OSM 瓦片域名的情况下拉取 PNG 瓦片（可统一 CORS/缓存策略）。
/// </summary>
[ApiController]
public sealed class TilesController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<TilesController> _logger;

    public TilesController(IHttpClientFactory httpFactory, ILogger<TilesController> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
    }

    /// <summary>
    /// 代理 OpenStreetMap PNG 瓦片。
    /// </summary>
    /// <remarks>
    /// - 只允许 z=0..19；x/y 为非负整数。
    /// - 后端会轮询多个 OSM Host 以提高可用性。
    /// - 成功时设置 Cache-Control=public,max-age=86400。
    /// </remarks>
    /// <param name="z">缩放级别（0..19）。</param>
    /// <param name="x">瓦片 X 坐标。</param>
    /// <param name="y">瓦片 Y 坐标。</param>
    /// <returns>
    /// - 200：image/png
    /// - 404：参数不合法
    /// - 502：上游不可用/全部 Host 失败
    /// </returns>
    [HttpGet("/api/tiles/osm/{z:int}/{x:int}/{y:int}.png")]
    [Produces("image/png")]
    public async Task<IActionResult> GetOsmTileAsync([FromRoute] int z, [FromRoute] int x, [FromRoute] int y)
    {
        if (z < 0 || z > 19 || x < 0 || y < 0)
            return NotFound();

        var http = _httpFactory.CreateClient("tiles");
        var hosts = new[]
        {
            "https://tile.openstreetmap.org",
            "https://a.tile.openstreetmap.org",
            "https://b.tile.openstreetmap.org",
            "https://c.tile.openstreetmap.org"
        };

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(4));

        foreach (var host in hosts)
        {
            try
            {
                var url = $"{host}/{z}/{x}/{y}.png";
                _logger.LogInformation("地图瓦片上游请求 url={Url}", url);

                using var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.Accept.ParseAdd("image/png");

                using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);
                _logger.LogInformation("地图瓦片上游响应 status={StatusCode} url={Url}", (int)resp.StatusCode, url);
                if (!resp.IsSuccessStatusCode) continue;

                var bytes = await resp.Content.ReadAsByteArrayAsync(timeoutCts.Token);
                Response.Headers.CacheControl = "public, max-age=86400";
                return File(bytes, "image/png");
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
            }
        }

        return StatusCode(StatusCodes.Status502BadGateway);
    }
}

