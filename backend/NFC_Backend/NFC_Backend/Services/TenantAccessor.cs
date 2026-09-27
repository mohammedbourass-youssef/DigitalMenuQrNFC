namespace NFC_Backend.Services
{
    public sealed class TenantAccessor : ITenantAccessor
    {
        public TenantInfo? Current { get; set; }
    }
}
