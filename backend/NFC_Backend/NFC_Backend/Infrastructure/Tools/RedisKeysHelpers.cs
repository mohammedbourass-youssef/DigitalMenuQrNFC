namespace NFC_Backend.Infrastructure.Tools
{
    public static class RedisKeysHelpers
    {

        public static string PlanKey(int id) => $"plan:{id}";

        public static string QuotaKey(Guid tenantId) => $"quota:{tenantId}";
    }
}