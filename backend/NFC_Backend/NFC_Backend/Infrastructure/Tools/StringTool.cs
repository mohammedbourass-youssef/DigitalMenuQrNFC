using NFC_Backend.Domain.Entities;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NFC_Backend.Infrastructure.Tools
{
    public static class StringTool
    {
        public static string SlugifyRestaurantName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Restaurant name cannot be empty.", nameof(name));

            // 1. Normalize accented characters (é, è, à → e, e, a) — important for French/Arabic-transliterated names
            var normalized = name.Normalize(NormalizationForm.FormD);
            var withoutDiacritics = new string(normalized
                .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                .ToArray());

            // 2. Lowercase
            var lower = withoutDiacritics.ToLowerInvariant();

            // 3. Replace anything that's not a-z, 0-9, or space/hyphen with nothing
            var cleaned = Regex.Replace(lower, @"[^a-z0-9\s-]", "");

            // 4. Collapse whitespace/underscores into single hyphens
            var slug = Regex.Replace(cleaned, @"[\s_]+", "-");

            // 5. Collapse multiple hyphens into one, trim leading/trailing hyphens
            slug = Regex.Replace(slug, @"-+", "-").Trim('-');

            if (string.IsNullOrEmpty(slug))
                throw new ArgumentException("Restaurant name produced an empty subdomain.", nameof(name));

            return slug;
        }
        
        public static string CreateBucketName(string DomaineName)
        {
           return $"tenant-{DomaineName}";
        }
    }
}
