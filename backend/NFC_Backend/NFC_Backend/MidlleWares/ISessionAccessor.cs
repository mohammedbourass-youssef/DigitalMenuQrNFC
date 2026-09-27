public record SessionInfo(Guid Id, Guid TenantId, Guid TableId, DateTime ExpiresAt);

public interface ISessionAccessor
{
    SessionInfo? Current { get; set; }
}

public sealed class SessionAccessor : ISessionAccessor
{
    public SessionInfo? Current { get; set; }
}

// Mark endpoints that create/init a session (they can't require one yet)
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class NeedSessionAttribute : Attribute;