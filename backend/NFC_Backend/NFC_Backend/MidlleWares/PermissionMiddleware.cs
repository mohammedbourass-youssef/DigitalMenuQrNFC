using NFC_Backend.Domain.Constants;
using NFC_Backend.Repos.Interfaces;
using System.Security.Claims;

namespace NFC_Backend.MidlleWares
{
    public enum EnPermissionActions
    {
        ALL,
        READ,
        WRITE,
        DELETE,
        UPDATE
    }

    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
    public sealed class HasPermissionAttribute : Attribute
    {
        public string Feature { get; }
        public EnPermissionActions action { get; }
        public HasPermissionAttribute(string Feature , EnPermissionActions actions)
        {
            this.Feature = Feature;
            this.action = actions;  
        }
    }
    public sealed class PermissionMiddleware
    {
        private readonly RequestDelegate _next;
        public PermissionMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context, IPermissionRepo permissionService)
        {
            var endpoint = context.GetEndpoint();

            var required = endpoint?.Metadata.GetOrderedMetadata<HasPermissionAttribute>();

            if (required is null || required.Count == 0)
            {
                await _next(context);
                return;
            }

            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            var userPermissions = await permissionService.GetPermissionsAsync(Guid.Parse(userId));
            var allowed = required.All(a => userPermissions.Contains((a.Feature, a.action)));

            if (!allowed)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

            await _next(context);
        }
    }
}
