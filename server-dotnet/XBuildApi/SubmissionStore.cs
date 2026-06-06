using System.Collections.Concurrent;

namespace XBuildApi.Submissions;

public sealed record Submission(
    string Id, string? Email, string? Address, string? Zip,
    string? Goal, string? FinancialPath, int? RentEstimate,
    bool? Feasible, string? Zoning, string? LotArea, int? ExistingUnits, string? RecommendedAdu,
    DateTime CreatedAt);

public sealed class SubmissionStore
{
    private readonly ConcurrentDictionary<string, Submission> _items = new();

    public Submission Add(
        string? email, string? address, string? zip, string? goal, string? path, int? rent,
        bool? feasible, string? zoning, string? lotArea, int? existingUnits, string? recAdu)
    {
        var s = new Submission(
            Guid.NewGuid().ToString("N")[..12],
            email, address, zip, goal, path, rent,
            feasible, zoning, lotArea, existingUnits, recAdu, DateTime.UtcNow);
        _items[s.Id] = s;
        return s;
    }

    public IReadOnlyList<Submission> All() => _items.Values.OrderByDescending(s => s.CreatedAt).ToList();
}
