// Endpoint permission audit: scans every controller action via reflection and prints
// Controller | Action | Verb | Route | Auth | HasPermission.
// Exits with code 1 when a non-anonymous endpoint has no [HasPermission] and is not
// on the explicit allow-list below.
//
// Usage:  dotnet run --project backend/NFC_Backend/EndpointReport
//         (add -p:UseAppHost=false if the API is currently running and locks the exe)

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using NFC_Backend.Controllers;
using NFC_Backend.MidlleWares;
using System.Reflection;
using System.Text;

var asm = typeof(AuthController).Assembly;

var controllers = asm.GetTypes()
    .Where(t => !t.IsAbstract && typeof(ControllerBase).IsAssignableFrom(t))
    .OrderBy(t => t.Name, StringComparer.OrdinalIgnoreCase)
    .ToList();

// Endpoints intentionally left without [HasPermission].
var allowList = new HashSet<(string Controller, string Action)>
{
    // auth / session (any caller or any authenticated user)
    ("AuthController", "Register"),
    ("AuthController", "Login"),
    ("AuthController", "Logout"),
    ("AuthController", "Refresh"),
    ("AuthController", "Me"),
    // self-service / email confirmation
    ("UsersController", "GetMyProfile"),
    ("UsersController", "UpdateMyProfile"),
    ("UsersController", "RequestVerification"),
    ("UsersController", "VerifyEmail"),
    // permission catalog for the current user (would be circular to protect)
    ("PermissionsController", "GetMyPermissions"),
    // feature catalog (no matching feature code - needs decision)
    ("FeaturesController", "GetAll"),
};

var rows = new List<Row>();

foreach (var controller in controllers)
{
    var controllerName = controller.Name;
    var className = controllerName.EndsWith("Controller", StringComparison.Ordinal)
        ? controllerName[..^"Controller".Length]
        : controllerName;

    var controllerRoute = controller.GetCustomAttribute<RouteAttribute>()?.Template;
    var classAllowAnonymous = controller.GetCustomAttribute<AllowAnonymousAttribute>(inherit: true) is not null;
    var classAuthorize = controller.GetCustomAttribute<AuthorizeAttribute>(inherit: true);
    var classPermissions = controller.GetCustomAttributes<HasPermissionAttribute>(inherit: true);

    foreach (var method in controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
    {
        var verb = method.GetCustomAttributes<HttpMethodAttribute>(inherit: false).FirstOrDefault();
        if (verb is null) continue;

        var httpVerbs = string.Join("/", verb.HttpMethods);
        var template = verb.Template;

        var methodAllowAnonymous = method.GetCustomAttribute<AllowAnonymousAttribute>() is not null;
        var methodAuthorize = method.GetCustomAttribute<AuthorizeAttribute>();
        var methodPermissions = method.GetCustomAttributes<HasPermissionAttribute>();

        var route = BuildRoute(controllerRoute, template, className, method.Name);
        var anonymous = classAllowAnonymous || methodAllowAnonymous;
        var authorize = methodAuthorize ?? classAuthorize;
        var auth = anonymous
            ? "AllowAnonymous"
            : authorize is null
                ? "-"
                : string.IsNullOrEmpty(authorize.Roles) ? "Authorize" : $"Authorize(Roles={authorize.Roles})";

        var permissions = classPermissions.Concat(methodPermissions)
            .Select(p => $"{p.Feature}:{p.action}")
            .ToList();

        var violation = !anonymous && permissions.Count == 0 && !allowList.Contains((controllerName, method.Name));

        rows.Add(new Row(controllerName, method.Name, httpVerbs, route, auth,
            permissions.Count == 0 ? "-" : string.Join(", ", permissions), violation));
    }
}

var sb = new StringBuilder();
sb.AppendLine();
sb.AppendLine($"{"CONTROLLER",-30} {"ACTION",-28} {"VERB",-12} {"ROUTE",-42} {"AUTH",-32} HASPERMISSION");
sb.AppendLine(new string('-', 190));

foreach (var r in rows.OrderBy(r => r.Controller, StringComparer.OrdinalIgnoreCase).ThenBy(r => r.Action, StringComparer.OrdinalIgnoreCase))
{
    sb.Append($"{r.Controller,-30} {r.Action,-28} {r.Verb,-12} {r.Route,-42} {r.Auth,-32} {r.Permissions}");
    if (r.Violation) sb.Append("   << NO [HasPermission] AND NOT ALLOW-LISTED");
    sb.AppendLine();
}

sb.AppendLine();
var flagged = rows.Where(r => r.Violation).ToList();
sb.AppendLine($"Endpoints: {rows.Count} | with [HasPermission]: {rows.Count(r => r.Permissions != "-")} | AllowAnonymous: {rows.Count(r => r.Auth == "AllowAnonymous")} | flagged: {flagged.Count}");

if (flagged.Count > 0)
{
    sb.AppendLine();
    sb.AppendLine("Flagged (review / add to allow-list or annotate):");
    foreach (var r in flagged)
        sb.AppendLine($"  - {r.Controller}.{r.Action}  [{r.Verb} {r.Route}]");
}

Console.WriteLine(sb.ToString());
return flagged.Count == 0 ? 0 : 1;

static string BuildRoute(string? controllerRoute, string? actionTemplate, string className, string actionName)
{
    var area = string.Empty;
    var template = actionTemplate;

    if (template is not null && (template.StartsWith("~/") || template.StartsWith('/')))
    {
        area = template.TrimStart('~');
        return "/" + area.TrimStart('/');
    }

    var prefix = controllerRoute ?? "[action]";
    prefix = prefix.Replace("[controller]", className).Replace("[action]", actionName);
    prefix = "/" + prefix.TrimStart('~', '/');

    return string.IsNullOrWhiteSpace(template) ? prefix : $"{prefix.TrimEnd('/')}/{template.TrimStart('/')}";
}

internal sealed record Row(string Controller, string Action, string Verb, string Route, string Auth, string Permissions, bool Violation);
