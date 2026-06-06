using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace XBuildApi.Incentives;

// AI research layer for ADU incentives in jurisdictions not yet in the curated
// frontend table. Calls an OpenAI-compatible chat/completions upstream (same
// AI:Upstreams config used by the buildable-area planner), asks for structured
// program cards with official .gov URLs, caches results, and labels everything
// as AI-sourced so the curated table stays authoritative.
public sealed class IncentiveResearchService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _cfg;
    private readonly ILogger<IncentiveResearchService> _logger;
    private static readonly ConcurrentDictionary<string, (DateTime at, string json)> _cache = new();
    private static readonly TimeSpan CacheTtl = TimeSpan.FromDays(7);

    public IncentiveResearchService(IHttpClientFactory httpFactory, IConfiguration cfg, ILogger<IncentiveResearchService> logger)
    {
        _httpFactory = httpFactory;
        _cfg = cfg;
        _logger = logger;
    }

    public bool Enabled => (_cfg.GetValue<bool?>("AI:Enabled") ?? false) && ResolveUpstream() is not null;

    public async Task<string> ResearchAsync(string state, string? county, string? city, string? zip, CancellationToken ct)
    {
        var key = $"{state}|{county}|{city}|{zip}".ToLowerInvariant();
        if (_cache.TryGetValue(key, out var hit) && DateTime.UtcNow - hit.at < CacheTtl)
            return hit.json;

        var upstream = ResolveUpstream();
        if (upstream is null) return "[]";

        var place = string.Join(", ", new[] { city, county is null ? null : county + " County", string.IsNullOrWhiteSpace(state) ? null : state }
            .Where(s => !string.IsNullOrWhiteSpace(s)));
        var prompt =
            "You are a housing-policy researcher. List currently active financial incentives that put money in a homeowner's " +
            $"pocket or directly cut their out-of-pocket cost to build/operate an Accessory Dwelling Unit (ADU/DADU) at: {place}" +
            $"{(string.IsNullOrWhiteSpace(zip) ? "" : $" (ZIP {zip})")}.\n" +
            "Only money/savings programs: grants, rebates, permit/impact fee waivers, forgivable or low-interest loans, tax " +
            "exemptions. Do NOT include general laws, design programs, or rental-voucher strategies. Only include programs you " +
            "are confident are real and current; prefer ones with an official .gov page. Return STRICT JSON: an array of objects " +
            "with keys: title, source, amount, tag, description, actionItems (array of short strings), url. Max 4 items. JSON only.";

        var reqBody = new JsonObject
        {
            ["model"] = upstream.Value.model,
            ["temperature"] = 0.1,
            ["messages"] = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = "You return only valid JSON. No markdown fences." },
                new JsonObject { ["role"] = "user", ["content"] = prompt },
            },
        };

        try
        {
            var http = _httpFactory.CreateClient("ai");
            using var req = new HttpRequestMessage(HttpMethod.Post, upstream.Value.baseUrl.TrimEnd('/') + "/chat/completions");
            req.Content = new StringContent(reqBody.ToJsonString(), Encoding.UTF8, "application/json");
            if (!string.IsNullOrWhiteSpace(upstream.Value.apiKey))
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", upstream.Value.apiKey);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_cfg.GetValue<int?>("AI:TimeoutSeconds") ?? 60));

            using var resp = await http.SendAsync(req, cts.Token);
            var text = await resp.Content.ReadAsStringAsync(cts.Token);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Incentive AI upstream {Status}: {Body}", (int)resp.StatusCode, Truncate(text, 400));
                return "[]";
            }

            var content = JsonNode.Parse(text)?["choices"]?[0]?["message"]?["content"]?.GetValue<string>() ?? "[]";
            content = StripFences(content).Trim();
            var arr = JsonNode.Parse(content) as JsonArray ?? new JsonArray();
            var json = arr.ToJsonString();
            _cache[key] = (DateTime.UtcNow, json);
            return json;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Incentive AI research failed for {Place}", place);
            return "[]";
        }
    }

    private static string StripFences(string s)
    {
        s = s.Trim();
        if (s.StartsWith("```"))
        {
            var nl = s.IndexOf('\n');
            if (nl >= 0) s = s[(nl + 1)..];
            if (s.EndsWith("```")) s = s[..^3];
        }
        return s;
    }

    private static string Truncate(string s, int n) => string.IsNullOrEmpty(s) || s.Length <= n ? s : s[..n];

    private (string provider, string baseUrl, string model, string? apiKey)? ResolveUpstream()
    {
        var defaultProvider = (_cfg["AI:DefaultProvider"] ?? "").Trim();
        var section = _cfg.GetSection("AI:Upstreams");
        var list = new List<(string provider, string baseUrl, string model, string? apiKey)>();
        foreach (var child in section.GetChildren())
        {
            var provider = (child["Provider"] ?? "").Trim();
            var baseUrl = (child["BaseUrl"] ?? "").Trim();
            var model = (child["Model"] ?? "").Trim();
            var apiKey = child["ApiKey"];
            if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(baseUrl)) continue;
            if (string.IsNullOrWhiteSpace(model)) model = "gpt-4o-mini";
            list.Add((provider, baseUrl, model, apiKey));
        }
        if (list.Count == 0) return null;
        if (string.IsNullOrWhiteSpace(defaultProvider)) return list[0];
        var match = list.FirstOrDefault(u => u.provider.Equals(defaultProvider, StringComparison.OrdinalIgnoreCase));
        return string.IsNullOrWhiteSpace(match.provider) ? list[0] : match;
    }
}
