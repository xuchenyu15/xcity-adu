using System.Collections.Concurrent;
using Microsoft.Data.Sqlite;

namespace XBuildApi.Submissions;

public sealed record Submission(
    string Id, string? Email, string? Address, string? Zip,
    string? Goal, string? FinancialPath, int? RentEstimate,
    bool? Feasible, string? Zoning, string? LotArea, int? ExistingUnits, string? RecommendedAdu,
    double? Lat, double? Lng,
    DateTime CreatedAt, DateTime UpdatedAt);

// SQLite-backed store. Keeps an in-memory ConcurrentDictionary mirror for fast,
// lock-free reads (and the same merge-by-address semantics as before), and
// persists every write to a SQLite file so owner submissions survive Railway
// restarts/redeploys.
//
// Durability note: Railway's container filesystem is ephemeral. To persist
// across restarts, attach a Railway Volume and mount it (e.g. at /data); the
// store writes there when DB_DIR=/data (or when /data exists). Without a volume
// the code still works correctly — the data just resets on redeploy, same as
// the old in-memory store.
public sealed class SubmissionStore
{
    private readonly ConcurrentDictionary<string, Submission> _items = new();
    private readonly string _dbPath;
    private readonly string _connString;
    private readonly object _writeLock = new();

    public SubmissionStore(IConfiguration cfg, IHostEnvironment env)
    {
        var dir =
            cfg["Submissions:DbDir"]
            ?? Environment.GetEnvironmentVariable("DB_DIR")
            ?? (Directory.Exists("/data") ? "/data" : Path.Combine(env.ContentRootPath, "App_Data"));

        try { Directory.CreateDirectory(dir); }
        catch { dir = Path.Combine(env.ContentRootPath, "App_Data"); Directory.CreateDirectory(dir); }

        _dbPath = Path.Combine(dir, "submissions.db");
        _connString = new SqliteConnectionStringBuilder { DataSource = _dbPath }.ToString();

        InitSchema();
        LoadAll();
    }

    private SqliteConnection Open()
    {
        var c = new SqliteConnection(_connString);
        c.Open();
        return c;
    }

    private void InitSchema()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS submissions (
    Key TEXT PRIMARY KEY,
    Id TEXT NOT NULL,
    Email TEXT, Address TEXT, Zip TEXT,
    Goal TEXT, FinancialPath TEXT, RentEstimate INTEGER,
    Feasible INTEGER, Zoning TEXT, LotArea TEXT, ExistingUnits INTEGER, RecommendedAdu TEXT,
    Lat REAL, Lng REAL,
    CreatedAt TEXT NOT NULL, UpdatedAt TEXT NOT NULL
);";
        cmd.ExecuteNonQuery();
    }

    private void LoadAll()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT Key,Id,Email,Address,Zip,Goal,FinancialPath,RentEstimate,Feasible,Zoning,LotArea,ExistingUnits,RecommendedAdu,Lat,Lng,CreatedAt,UpdatedAt FROM submissions";
        using var r = cmd.ExecuteReader();
        while (r.Read())
        {
            var key = r.GetString(0);
            _items[key] = new Submission(
                r.GetString(1),
                r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.IsDBNull(4) ? null : r.GetString(4),
                r.IsDBNull(5) ? null : r.GetString(5),
                r.IsDBNull(6) ? null : r.GetString(6),
                r.IsDBNull(7) ? (int?)null : r.GetInt32(7),
                r.IsDBNull(8) ? (bool?)null : r.GetInt32(8) != 0,
                r.IsDBNull(9) ? null : r.GetString(9),
                r.IsDBNull(10) ? null : r.GetString(10),
                r.IsDBNull(11) ? (int?)null : r.GetInt32(11),
                r.IsDBNull(12) ? null : r.GetString(12),
                r.IsDBNull(13) ? (double?)null : r.GetDouble(13),
                r.IsDBNull(14) ? (double?)null : r.GetDouble(14),
                DateTime.Parse(r.GetString(15), null, System.Globalization.DateTimeStyles.RoundtripKind),
                DateTime.Parse(r.GetString(16), null, System.Globalization.DateTimeStyles.RoundtripKind));
        }
    }

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

        Persist(key, merged);
        return merged;
    }

    private void Persist(string key, Submission s)
    {
        try
        {
            lock (_writeLock)
            {
                using var c = Open();
                using var cmd = c.CreateCommand();
                cmd.CommandText = @"
INSERT INTO submissions
 (Key,Id,Email,Address,Zip,Goal,FinancialPath,RentEstimate,Feasible,Zoning,LotArea,ExistingUnits,RecommendedAdu,Lat,Lng,CreatedAt,UpdatedAt)
VALUES
 ($Key,$Id,$Email,$Address,$Zip,$Goal,$FinancialPath,$RentEstimate,$Feasible,$Zoning,$LotArea,$ExistingUnits,$RecommendedAdu,$Lat,$Lng,$CreatedAt,$UpdatedAt)
ON CONFLICT(Key) DO UPDATE SET
 Id=excluded.Id, Email=excluded.Email, Address=excluded.Address, Zip=excluded.Zip,
 Goal=excluded.Goal, FinancialPath=excluded.FinancialPath, RentEstimate=excluded.RentEstimate,
 Feasible=excluded.Feasible, Zoning=excluded.Zoning, LotArea=excluded.LotArea,
 ExistingUnits=excluded.ExistingUnits, RecommendedAdu=excluded.RecommendedAdu,
 Lat=excluded.Lat, Lng=excluded.Lng, UpdatedAt=excluded.UpdatedAt;";
                void P(string n, object? v) => cmd.Parameters.AddWithValue(n, v ?? DBNull.Value);
                P("$Key", key);
                P("$Id", s.Id);
                P("$Email", s.Email);
                P("$Address", s.Address);
                P("$Zip", s.Zip);
                P("$Goal", s.Goal);
                P("$FinancialPath", s.FinancialPath);
                P("$RentEstimate", s.RentEstimate);
                P("$Feasible", s.Feasible is bool b ? (b ? 1 : 0) : (object?)null);
                P("$Zoning", s.Zoning);
                P("$LotArea", s.LotArea);
                P("$ExistingUnits", s.ExistingUnits);
                P("$RecommendedAdu", s.RecommendedAdu);
                P("$Lat", s.Lat);
                P("$Lng", s.Lng);
                P("$CreatedAt", s.CreatedAt.ToString("o"));
                P("$UpdatedAt", s.UpdatedAt.ToString("o"));
                cmd.ExecuteNonQuery();
            }
        }
        catch
        {
            // Persistence is best-effort; the in-memory mirror still serves reads
            // this session even if the disk write fails (e.g. read-only FS).
        }
    }

    public IReadOnlyList<Submission> All() => _items.Values.OrderByDescending(s => s.UpdatedAt).ToList();
}
