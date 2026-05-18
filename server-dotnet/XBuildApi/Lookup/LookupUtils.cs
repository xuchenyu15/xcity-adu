using System.Text.Json.Nodes;

namespace XBuildApi.Lookup;

/// <summary>
/// lookup 相关的通用工具方法（用于标准化字符串、提取州/路名、脱敏等）。
/// </summary>
public static class LookupUtils
{
    /// <summary>
    /// 对 URL 中的 token 进行脱敏（用于安全日志）。
    /// </summary>
    public static string RedactToken(string url)
    {
        string RedactQueryValue(string input, string key)
        {
            var idx = input.IndexOf(key, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return input;
            var start = idx + key.Length;
            var end = input.IndexOf('&', start);
            if (end < 0) end = input.Length;
            return input.Substring(0, start) + "REDACTED" + input.Substring(end);
        }

        var s = url;
        s = RedactQueryValue(s, "token=");
        s = RedactQueryValue(s, "api_key=");
        s = RedactQueryValue(s, "key=");
        return s;
    }

    /// <summary>
    /// 从自由格式地址字符串中尽力解析州缩写（US 两位字母）。
    /// 解析失败返回空字符串。
    /// </summary>
    public static string ExtractState(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return "";

        var known = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
        };

        var matches = System.Text.RegularExpressions.Regex.Matches(address, @"(?:,|\s)\s*([A-Z]{2})\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        for (var i = matches.Count - 1; i >= 0; i--)
        {
            var m = matches[i];
            if (!m.Success) continue;
            var abbr = (m.Groups[1].Value ?? "").Trim().ToUpperInvariant();
            if (known.Contains(abbr)) return abbr;
        }

        var n = address.Trim();
        var full = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Alabama"] = "AL",
            ["Alaska"] = "AK",
            ["Arizona"] = "AZ",
            ["Arkansas"] = "AR",
            ["California"] = "CA",
            ["Colorado"] = "CO",
            ["Connecticut"] = "CT",
            ["Delaware"] = "DE",
            ["Florida"] = "FL",
            ["Georgia"] = "GA",
            ["Hawaii"] = "HI",
            ["Idaho"] = "ID",
            ["Illinois"] = "IL",
            ["Indiana"] = "IN",
            ["Iowa"] = "IA",
            ["Kansas"] = "KS",
            ["Kentucky"] = "KY",
            ["Louisiana"] = "LA",
            ["Maine"] = "ME",
            ["Maryland"] = "MD",
            ["Massachusetts"] = "MA",
            ["Michigan"] = "MI",
            ["Minnesota"] = "MN",
            ["Mississippi"] = "MS",
            ["Missouri"] = "MO",
            ["Montana"] = "MT",
            ["Nebraska"] = "NE",
            ["Nevada"] = "NV",
            ["New Hampshire"] = "NH",
            ["New Jersey"] = "NJ",
            ["New Mexico"] = "NM",
            ["New York"] = "NY",
            ["North Carolina"] = "NC",
            ["North Dakota"] = "ND",
            ["Ohio"] = "OH",
            ["Oklahoma"] = "OK",
            ["Oregon"] = "OR",
            ["Pennsylvania"] = "PA",
            ["Rhode Island"] = "RI",
            ["South Carolina"] = "SC",
            ["South Dakota"] = "SD",
            ["Tennessee"] = "TN",
            ["Texas"] = "TX",
            ["Utah"] = "UT",
            ["Vermont"] = "VT",
            ["Virginia"] = "VA",
            ["Washington"] = "WA",
            ["West Virginia"] = "WV",
            ["Wisconsin"] = "WI",
            ["Wyoming"] = "WY",
            ["District of Columbia"] = "DC"
        };

        foreach (var kv in full)
        {
            if (n.IndexOf(kv.Key, StringComparison.OrdinalIgnoreCase) >= 0) return kv.Value;
        }

        return "";
    }

    /// <summary>
    /// 将字符串转换为简易 Title Case（用于 UI 展示）。
    /// </summary>
    public static string ToTitleCase(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var parts = s.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p =>
        {
            var lower = p.ToLowerInvariant();
            return lower.Length == 0 ? lower : char.ToUpperInvariant(lower[0]) + lower.Substring(1);
        }));
    }

    /// <summary>
    /// 从单行地址中提取路名展示文本：
    /// 去掉开头门牌号，并做 Title Case 处理。
    /// </summary>
    public static string ExtractStreetNameFromSingleLine(string singleLine)
    {
        if (string.IsNullOrWhiteSpace(singleLine)) return "";
        var first = singleLine.Split(',')[0].Trim();
        first = System.Text.RegularExpressions.Regex.Replace(first, @"^\s*\d+\s*", "");
        return ToTitleCase(first);
    }

    /// <summary>
    /// 从 Regrid 的 <c>parcel.properties.fields</c> 结构中尝试读取路名。
    /// 缺失则返回空字符串。
    /// </summary>
    public static string TryGetStreetNameFromParcel(JsonObject parcel)
    {
        try
        {
            var f = parcel["properties"]?["fields"] as JsonObject;
            var addstr = f?["saddstr"]?.GetValue<string>();
            var sttyp = f?["saddsttyp"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(addstr)) return "";
            var baseName = ToTitleCase(addstr);
            if (string.IsNullOrWhiteSpace(sttyp)) return baseName;
            return $"{baseName} {ToTitleCase(sttyp)}".Trim();
        }
        catch
        {
            return "";
        }
    }
}
