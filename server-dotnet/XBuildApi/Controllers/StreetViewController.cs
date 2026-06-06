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

        const double d = 0.0006; // ~65m box
        var bbox = $"{lng - d},{lat - d},{lng + d},{lat + d}";
        var url = $"https://graph.mapillary.com/images?access_token={Uri.EscapeDataString(token)}&fields=id,thumb_1024_url,thumb_256_url&bbox={Uri.EscapeDataString(bbox)}&limit=1";

        try
        {
            var http = _httpFactory.CreateClient("arcgis");
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(12));
            using var resp = await http.GetAsync(url, cts.Token);
            var text = await resp.Content.ReadAsStringAsync(cts.Token);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Mapillary {Status}: {Body}", (int)resp.StatusCode, text.Length > 300 ? text[..300] : text);
                return Ok(new { code = 200, source = "mapillary", url = (string?)null });
            }
            var node = JsonNode.Parse(text)?["data"]?[0];
            var thumb = node?["thumb_1024_url"]?.GetValue<string>() ?? node?["thumb_256_url"]?.GetValue<string>();
            return Ok(new { code = 200, source = "mapillary", url = thumb });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Mapillary lookup failed");
            return Ok(new { code = 200, source = "mapillary", url = (string?)null });
        }
    }
}
