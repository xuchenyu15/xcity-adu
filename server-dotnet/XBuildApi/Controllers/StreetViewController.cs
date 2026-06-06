using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;

namespace XBuildApi.Controllers;

// Proxies Mapillary (open, free street-level imagery) so the access token stays
// a runtime backend env var (MAPILLARY_TOKEN) — no frontend rebuild needed,
// same pattern as GEOCODE_API_KEY. Returns the nearest street image thumbnail
// for a lat/lng, used by the admin Owner Submissions photo column to judge the
// main-house color for finish recommendations.
[ApiController]
[Route("api/streetview")]
public sealed class StreetViewController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _cfg;
    private readonly ILogger<StreetViewController> _logger;

    public StreetViewController(IHttpClientFactory httpFactory, IConfiguration cfg, ILogger<StreetViewController> logger)
    {
        _httpFactory = httpFactory;
        _cfg = cfg;
        _logger = logger;
    }

    // GET /api/streetview?lat=&lng=
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] double lat, [FromQuery] double lng, CancellationToken ct)
    {
        var token = _cfg["Mapillary:Token"] ?? Environment.GetEnvironmentVariable("MAPILLARY_TOKEN");
        if (string.IsNullOrWhiteSpace(token))
            return Ok(new { code = 200, source = "disabled", url = (string?)null });
        if (lat == 0 && lng == 0)
            return Ok(new { code = 200, source = "mapillary", url = (string?)null });

        // Mapillary drive-by coverage is sparse on residential streets, so a fixed
        // tiny box usually returns nothing. Grow the search box until we find an
        // image. A medium box over a *dense* tile can return a transient
        // "reduce the amount of data" 500 (throttle/overload) — we just treat any
        // non-success as "try the next radius" rather than failing the request.
        var radii = new[] { 0.0006, 0.0012, 0.0020 }; // ~65m, ~130m, ~220m
        string? thumb = null;

        var http = _httpFactory.CreateClient("arcgis");
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(12));

        foreach (var d in radii)
        {
            var bbox = $"{lng - d},{lat - d},{lng + d},{lat + d}";
            var url = $"https://graph.mapillary.com/images?access_token={Uri.EscapeDataString(token)}&fields=id,thumb_1024_url,thumb_256_url&bbox={Uri.EscapeDataString(bbox)}&limit=1";
            try
            {
                using var resp = await http.GetAsync(url, cts.Token);
                var text = await resp.Content.ReadAsStringAsync(cts.Token);
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Mapillary {Status} (d={Radius}): {Body}", (int)resp.StatusCode, d, text.Length > 200 ? text[..200] : text);
                    continue; // throttle / dense tile — widen and retry
                }
                var node = JsonNode.Parse(text)?["data"]?[0];
                var t = node?["thumb_1024_url"]?.GetValue<string>() ?? node?["thumb_256_url"]?.GetValue<string>();
                if (!string.IsNullOrEmpty(t)) { thumb = t; break; }
                // 200 but empty: no coverage at this radius — widen.
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _logger.LogWarning(ex, "Mapillary lookup failed (d={Radius})", d); }
        }

        return Ok(new { code = 200, source = "mapillary", url = thumb });
    }
}
