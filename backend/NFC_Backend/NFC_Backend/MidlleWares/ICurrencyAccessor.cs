namespace NFC_Backend.MidlleWares
{
    public interface ICurrencyAccessor
    {
        string Current { get; set; }
    }

    public sealed class CurrencyAccessor : ICurrencyAccessor
    {
        public string Current { get; set; } = "USD";
    }

}
