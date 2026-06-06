using Microsoft.AspNetCore.Mvc;
using XBuildApi.Submissions;

namespace XBuildApi.Controllers;

[ApiController]
[Route("api/submissions")]
public sealed class SubmissionsController : ControllerBase
{
    private readonly SubmissionStore _store;
    public SubmissionsController(SubmissionStore store) => _store = store;

    public sealed class SubmissionInput
    {
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? Zip { get; set; }
        public string? Goal { get; set; }
        public string? FinancialPath { get; set; }
        public int? RentEstimate { get; set; }
    }

    // Owner funnel posts here when an address-based session is created.
    [HttpPost]
    public IActionResult Post([FromBody] SubmissionInput input)
    {
        if (input is null || (string.IsNullOrWhiteSpace(input.Address) && string.IsNullOrWhiteSpace(input.Email)))
            return BadRequest(new { code = 400, msg = "address or email required" });
        var s = _store.Add(input.Email, input.Address, input.Zip, input.Goal, input.FinancialPath, input.RentEstimate);
        return Ok(new { code = 200, id = s.Id });
    }

    // Admin reads the aggregated list.
    [HttpGet]
    public IActionResult Get() => Ok(new { code = 200, submissions = _store.All() });
}
