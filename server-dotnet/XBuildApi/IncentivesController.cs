using Microsoft.AspNetCore.Mvc;
using XBuildApi.Incentives;

namespace XBuildApi.Controllers;

[ApiController]
[Route("api/incentives")]
public sealed class IncentivesController : ControllerBase
{
    private readonly IncentiveResearchService _research;

    public IncentivesController(IncentiveResearchService research) => _research = research;

    // GET /api/incentives?state=&county=&city=&zip=
    // Returns AI-researched financial incentives for jurisdictions not in the
    // curated frontend table. Returns an empty list (source=disabled) when no
    // AI upstream/key is configured, so the UI degrades gracefully.
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? state, [FromQuery] string? county,
        [FromQuery] string? city, [FromQuery] string? zip, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(state) && string.IsNullOrWhiteSpace(zip))
            return Ok(new { code = 200, source = "none", programs = Array.Empty<object>() });
        if (!_research.Enabled)
            return Ok(new { code = 200, source = "disabled", programs = Array.Empty<object>() });

        var json = await _research.ResearchAsync(state ?? "", county, city, zip, ct);
        return Content($"{{\"code\":200,\"source\":\"ai\",\"programs\":{json}}}", "application/json");
    }
}
