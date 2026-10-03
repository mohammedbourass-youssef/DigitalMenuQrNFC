
using NFC_Backend.Domain.Constants;

namespace NFC_Backend.MidlleWares
{
    public sealed class LanguageMiddleware(RequestDelegate next)
    {
        private const string HeaderName = "X-Lang";
        private const string DefaultLang = "en";

        private static readonly HashSet<string> Supported =
            new(TranslationLanguages.All, StringComparer.OrdinalIgnoreCase);

        public async Task InvokeAsync(HttpContext ctx, ILanguageAccessor languageAccessor)
        {
            var lang = Resolve(ctx);
            languageAccessor.Current = lang;
            ctx.Response.Headers.ContentLanguage = lang;
            await next(ctx);
        }

        private static string Resolve(HttpContext ctx)
        {
            var fromHeader = Normalize(ctx.Request.Headers[HeaderName].ToString());
            if (fromHeader is not null) return fromHeader;

            var accepted = ctx.Request.GetTypedHeaders().AcceptLanguage
                .OrderByDescending(x => x.Quality ?? 1)
                .Select(x => Normalize(x.Value.Value));
            foreach (var l in accepted)
                if (l is not null) return l;

            return Supported.Contains(DefaultLang) ? DefaultLang : TranslationLanguages.All[0];
        }

        private static string? Normalize(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var code = raw.Trim().Split('-', '_', ',', ';')[0].ToLowerInvariant();
            return Supported.Contains(code) ? code : null;
        }
    }
}
