using System.Collections.Concurrent;

namespace XBuildApi.Submissions;

public sealed record Submission(
    string Id,
    string? Email,
    string? Address,
    string? Zip,
    string? Goal,           // invest / personal / unsure
    string? FinancialPath,  // freeBuild / buyout
    int? RentEstimate,
    DateTime CreatedAt);

// In-memory store of owner submissions aggregated from the funnel.
// Prototype: process-local. Swap for a DB (table "submissions") for production.
public sealed class SubmissionStore
{
    private readonly ConcurrentDictionary<string, Submission> _items = new();

    public Submission Add(string? email, string? address, string? zip, string? goal, string? path, int? rent)
    {
        var s = new Submission(
            Guid.NewGuid().ToString("N")[..12],
            email, address, zip, goal, path, rent, DateTime.UtcNow);
        _items[s.Id] = s;
        return s;
    }

    public IReadOnlyList<Submission> All() =>
        _items.Values.OrderByDescending(s => s.CreatedAt).ToList();
}
