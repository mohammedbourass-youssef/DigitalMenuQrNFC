using NFC_Backend.Domain.Constants;

namespace NFC_Backend.MidlleWares
{
    public sealed class CurrencyMiddleware(RequestDelegate next)
    {
        private const string HeaderName = "X-Currency";
        private const string DefaultCurrency = "USD";

        private static readonly HashSet<string> Supported =
            new(clsSupportedCurrencies.All, StringComparer.OrdinalIgnoreCase);

        public async Task InvokeAsync(HttpContext ctx, ICurrencyAccessor currencyAccessor)
        {
            var currency = Resolve(ctx);
            currencyAccessor.Current = currency;
            ctx.Response.Headers[HeaderName] = currency;
            await next(ctx);
        }

        private static string Resolve(HttpContext ctx)
        {
            // 1. Header: X-Currency: MAD
            var fromHeader = Normalize(ctx.Request.Headers[HeaderName].ToString());
            if (fromHeader is not null) return fromHeader;

            // 2. Optional: query string ?currency=EUR
            var fromQuery = Normalize(ctx.Request.Query["currency"].ToString());
            if (fromQuery is not null) return fromQuery;

            // 3. Default
            return Supported.Contains(DefaultCurrency) ? DefaultCurrency : clsSupportedCurrencies.All[0];
        }

        private static string? Normalize(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            var code = raw.Trim().ToUpperInvariant();
            return Supported.Contains(code) ? code : null;
        }
    }
}
