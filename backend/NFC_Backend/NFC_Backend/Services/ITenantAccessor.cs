namespace NFC_Backend.Services
{
    public sealed record TenantInfo(Guid Id, string Slug, string Name);

    public interface ITenantAccessor
    {
        TenantInfo? Current { get; set; }
    }

  
}
