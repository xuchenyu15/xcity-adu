using System.Collections.Concurrent;

namespace XBuildApi.Submissions;

public sealed record Submission(
    string Id, string? Email, string? Address, string? Zip,
    string? Goal, string? FinancialPath, int? RentEstimate,
    bool? Feasible, string? Zoning, string? LotArea, int? ExistingUnits, string? RecommendedAdu,
    double? Lat, double? Lng,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed class SubmissionStore
{
    // Keyed by normalized address (fallback email) so repeat submissions of the
    // same address merge into one row instead of duplicating.
    private readonly ConcurrentDictionary<string, Submission> _items = new();

    private static string KeyOf(string? address, string? email) =>
        !string.IsNullOrWhiteSpace(address)
            ? string.Join(" ", address.Trim().ToLowerInvariant().Split((char[]?)null, System.StringSplitOptions.RemoveEmptyEntries))
            : (email ?? Guid.NewGuid().ToString("N")).Trim().ToLowerInvariant();

    public Submission Add(
        string? email, string? address, string? zip, string? goal, string? path, int? rent,
        bool? feasible, string? zoning, string? lotArea, int? existingUnits, string? recAdu,
        double? lat, double? lng)
    {
        var key = KeyOf(address, email);
        var now = DateTime.UtcNow;
        var merged = _items.AddOrUpdate(
            key,
            _ => new Submission(Guid.NewGuid().ToString("N")[..12], email, address, zip, goal, path, rent,
                feasible, zoning, lotArea, existingUnits, recAdu, lat, lng, now, now),
            (_, old) => old with
            {
                // keep first id + createdAt; prefer newest non-null values
                Email = email ?? old.Email,
                Address = address ?? old.Address,
                Zip = zip ?? old.Zip,
                Goal = goal ?? old.Goal,
                FinancialPath = path ?? old.FinancialPath,
                RentEstimate = rent ?? old.RentEstimate,
                Feasible = feasible ?? old.Feasible,
                Zoning = zoning ?? old.Zoning,
                LotArea = lotArea ?? old.LotArea,
                ExistingUnits = existingUnits ?? old.ExistingUnits,
                RecommendedAdu = recAdu ?? old.RecommendedAdu,
                Lat = lat ?? old.Lat,
                Lng = lng ?? old.Lng,
                UpdatedAt = now,
            });
        return merged;
    }

    public IReadOnlyList<Submission> All() => _items.Values.OrderByDescending(s => s.UpdatedAt).ToList();
}
