# Feature Catalog

Permanent catalog of tenant-admin features. Every feature has one fixed GUID and one fixed code. The same GUID and code are used by:

- Backend EF Core `HasData` (`Features` and `PlanFeatures`) via `NFC_Backend.Domain.Constants.FeatureIds` / `FeatureCodes`.
- Frontend typed constants in `src/features/catalog.ts`.

Treat the GUID and code as permanent identifiers. Do not renumber or reuse them. If a module is retired, keep the row and change its status instead.

## Assumptions

1. The ten IDs listed by the product specification are canonical. They were not previously present in the C# seed, so this catalog adds them unchanged.
2. Newly discovered modules use the next GUID suffix in the approved sequence, starting at `...000b`.
3. Existing plan placements are preserved exactly: Free = 1, Pro = 2, Professional = 3.
4. Plan placement for new features is a proposal pending product confirmation. The catalog records the current proposal so backend and frontend stay aligned.
5. A feature is `Available` only when the module has a usable frontend flow and, where applicable, a real backend endpoint. Placeholder pages are `ComingSoon`.
6. `ComingSoon` and `UnderMaintenance` describe availability. They do not replace plan or role checks. Access requires the plan to include the feature and the user's role to grant the action.
7. `Notifications` is a cross-cutting module (SignalR + TopBar), not a page. It gets a feature row but no route.
8. Platform-owner administration (tenant management, plan management, SuperAdmin-only endpoints) is outside the tenant feature catalog and is not seeded here.
9. `GET /api/permissions/me` returns the current user's plan, roles, and per-feature permissions. The frontend permission adapter still fails open until it is switched to this endpoint; it must not invent permission data.
10. Default tenant roles are not created during registration yet. Onboarding currently creates the tenant and a `TenantOwner` user only. Role/UserRole seeding is documented as follow-up work, not part of this catalog seed.

## Plan abbreviations

| Abbreviation | Meaning |
| --- | --- |
| Free | Plan 1 (`free`) |
| Pro | Plan 2 (`pro`) |
| Pro+ | Plan 2 and Plan 3 |
| Professional | Plan 3 (`professional`) |
| All | Free, Pro, and Professional |

## Canonical catalog

| Code | GUID | Name | Frontend route / page | Backend source | Status | Plans |
| --- | --- | --- | --- | --- | --- | --- |
| `Menu` | `a1000000-0000-0000-0000-000000000001` | Menu | `/menu-items`, `/menu-items/new`, `/menu-items/:menuId/images`, `/menu-items/:menuId/translations`, `/menu-items/:menuId/edit` | `MenuItemsController` | Available | Free |
| `Categories` | `a1000000-0000-0000-0000-000000000002` | Categories | `/categories`, `/categories/:categoryId` | `CateogriesController` | Available | Free |
| `Tables` | `a1000000-0000-0000-0000-000000000003` | Tables | `/tables` | `TablesController` | Available | Free |
| `Orders` | `a1000000-0000-0000-0000-000000000004` | Orders | `/orders`, `/orders/status-settings`, `/orders/history` | `OrdersController` | Available | Free |
| `Invoices` | `a1000000-0000-0000-0000-000000000005` | Invoices | `/payments/invoices` (`PaymentsPlaceholder`) | `InvoicesController` | ComingSoon | Pro |
| `Users` | `a1000000-0000-0000-0000-000000000006` | Users | `/hr/users` (`PlaceholderPage`) | `UsersController` (self/profile endpoints only today) | ComingSoon | Free |
| `Roles` | `a1000000-0000-0000-0000-000000000007` | Roles | `/hr/roles` (`PlaceholderPage`) | Access-control entities exist; no roles CRUD controller | ComingSoon | Pro |
| `AiAgent` | `a1000000-0000-0000-0000-000000000008` | AI Agent | No page | None | ComingSoon | Pro |
| `DataAnalyst` | `a1000000-0000-0000-0000-000000000009` | Data Analyst | No page | None | ComingSoon | Professional |
| `Chatbot` | `a1000000-0000-0000-0000-00000000000a` | Chatbot | No page | None | ComingSoon | Professional |
| `Notifications` | `a1000000-0000-0000-0000-00000000000b` | Notifications | No route; `NotificationContext` + `TopBar` + SignalR | `NotificationHub` / notification hub helpers | Available | All |
| `PaymentMethods` | `a1000000-0000-0000-0000-00000000000c` | Payment Methods | `/payments/methods` | `PaymentMethodsController` | Available | Pro+ |
| `PaymentStatuses` | `a1000000-0000-0000-0000-00000000000d` | Payment Statuses | `/payments/payment-status` (placeholder) | `AdminPaymentStatusesController` | ComingSoon | Pro+ |
| `NfcTags` | `a1000000-0000-0000-0000-00000000000e` | NFC Tags | `/nfc-tags` (hardcoded `nfcService`) | None | ComingSoon | Pro+ |
| `Settings` | `a1000000-0000-0000-0000-00000000000f` | Settings | `/settings/system-preferences`, `/settings/restaurant-information` | `RestaurantsController` | Available | All |
| `Subscription` | `a1000000-0000-0000-0000-000000000010` | Subscription | `/settings/upgrade` | `PlansController` | Available | All |
| `Employees` | `a1000000-0000-0000-0000-000000000011` | Employees | `/hr/employees` (`PlaceholderPage`) | None | ComingSoon | All |
| `Departments` | `a1000000-0000-0000-0000-000000000012` | Departments | `/hr/departments` (`PlaceholderPage`) | None | ComingSoon | All |
| `JobTitles` | `a1000000-0000-0000-0000-000000000013` | Job Titles | `/hr/job-titles` (`PlaceholderPage`) | None | ComingSoon | All |
| `LeaveManagement` | `a1000000-0000-0000-0000-000000000014` | Leave Management | `/hr/leave` (`PlaceholderPage`) | None | ComingSoon | Pro+ |
| `Attendance` | `a1000000-0000-0000-0000-000000000015` | Attendance | `/hr/attendance` (`PlaceholderPage`) | None | ComingSoon | Pro+ |
| `Payroll` | `a1000000-0000-0000-0000-000000000016` | Payroll | `/hr/payroll` (`PlaceholderPage`) | None | ComingSoon | Pro+ |
| `AuditLog` | `a1000000-0000-0000-0000-000000000017` | Audit Log | `/hr/audit-log` (`PlaceholderPage`) | None | ComingSoon | Professional |
| `HRGeneralSettings` | `a1000000-0000-0000-0000-000000000018` | HR General Settings | `/hr/settings` (`PlaceholderPage`) | None | ComingSoon | Professional |

### Status rationale

- `Invoices` stays `ComingSoon` because the frontend route renders `PaymentsPlaceholder`, even though a backend controller exists.
- `PaymentStatuses` stays `ComingSoon` because the page is a placeholder, even though `AdminPaymentStatusesController` exists.
- `NfcTags` stays `ComingSoon` because `nfcService` returns a hardcoded array and there is no backend module.
- `Users`, `Roles`, and all HR submodules stay `ComingSoon` because their pages are `PlaceholderPage` stubs.
- `Notifications` is `Available` because the SignalR notification module and TopBar flow exist, even though it has no dedicated page.
- `Subscription` is `Available` for read/upgrade discovery. Plan purchase actions remain placeholders where the API is not ready.

## Plan mapping

### Existing rows

- Free (`PlanId = 1`): `Menu`, `Categories`, `Tables`, `Orders`, `Users`.
- Pro (`PlanId = 2`): Free rows plus `Invoices`, `Roles`, `AiAgent`.
- Professional (`PlanId = 3`): all ten original features.

### Proposed rows for new features

- All plans: `Notifications`, `Settings`, `Subscription`, `Employees`, `Departments`, `JobTitles`.
- Pro and Professional: `PaymentMethods`, `PaymentStatuses`, `NfcTags`, `LeaveManagement`, `Attendance`, `Payroll`.
- Professional only: `AuditLog`, `HRGeneralSettings`.

`Subscription` is intentionally available on Free so a Free tenant can reach the upgrade page.

## Route-to-feature map

The frontend route map should use longest-prefix matching. A route without a matching feature is authenticated but not feature-gated. Route guards require `read`; page-level `add` / `edit` / `delete` checks use the permission context directly or the `Can` wrapper.

| Path prefix | Feature | Guard action |
| --- | --- | --- |
| `/menu-items` | `Menu` | `read` |
| `/categories` | `Categories` | `read` |
| `/tables` | `Tables` | `read` |
| `/orders` | `Orders` | `read` |
| `/payments/invoices` | `Invoices` | `read` |
| `/payments/methods` | `PaymentMethods` | `read` |
| `/payments/payment-status` | `PaymentStatuses` | `read` |
| `/nfc-tags` | `NfcTags` | `read` |
| `/settings/system-preferences` | `Settings` | `read` |
| `/settings/restaurant-information` | `Settings` | `read` |
| `/settings/upgrade` | `Subscription` | `read` |
| `/hr/employees` | `Employees` | `read` |
| `/hr/departments` | `Departments` | `read` |
| `/hr/job-titles` | `JobTitles` | `read` |
| `/hr/leave` | `LeaveManagement` | `read` |
| `/hr/attendance` | `Attendance` | `read` |
| `/hr/payroll` | `Payroll` | `read` |
| `/hr/audit-log` | `AuditLog` | `read` |
| `/hr/settings` | `HRGeneralSettings` | `read` |
| `/hr/users` | `Users` | `read` |
| `/hr/roles` | `Roles` | `read` |

### Authenticated but not feature-gated

- `/` Dashboard.
- `/settings` layout and `/settings/user-information` self-profile page.
- `/hr/my-permissions` self-discovery page.
- `/payments/coming-soon` redirect.
- `/login`, `/register`, `/confirm-email`.
- Not-found route.

The `/settings` and `/hr` layouts must stay ungated so their child routes can redirect or resolve normally. Guard the child paths, not the layout.

## Backend integration

- `NFC_Backend.Domain.Constants.FeatureIds` and `FeatureCodes` define the catalog.
- Access-control entity configuration lives in `AppDbContext.OnModelCreating`.
- `SeedAccessControl(ModelBuilder)` seeds `Feature` and `PlanFeature` `HasData` rows only.
- `Role` and `RolePermission` are not seeded. Tenant roles and grants belong to tenant onboarding and role management.
- `GET /api/features` is authenticated and returns `Id`, `Code`, `Name`, and `Status`. It is reference data, not a permission mutation endpoint.
- `GET /api/permissions/me` is authenticated. It resolves the tenant plan, the user's assigned roles, and every feature with `IsInPlan` plus `CanRead` / `CanAdd` / `CanEdit` / `CanDelete`. `TenantOwner` and `SuperAdmin` receive every action for in-plan features; staff receive the union of their role grants. Features outside the plan always return no actions.
- Migration `20261028173502_AddAccessControl` creates the access-control tables and adds the catalog/plan rows.
- The migration was not applied; `dotnet ef database update` remains outside this task.

## Frontend integration

- `src/features/catalog.ts` defines `FEATURES` and `FeatureCode`.
- `src/features/routes.ts` defines the route-to-feature map and `featureForPath`.
- `PermissionsContext` exposes `can(feature, action)`, and `Can` wraps permission-gated UI.
- The context reads a single `MeAccessResponse` adapter type. It is still fed `null`, so `can()` returns `true` (fail open) and existing tenants are not locked out.
- `src/pages/hr/DiscoverMyPermissions.tsx` consumes `GET /api/permissions/me` through `useMyPermissions` and shows a plan upgrade CTA for every feature not included in the tenant plan.
- Sidebar links and group children are filtered through `can(feature, 'read')`. Auth-only links stay visible.
- Raw feature GUIDs stay in `catalog.ts`; pages and route definitions use `FeatureCode` only.

## Consistency check

Run:

```bash
npm run check:features
```

The check fails when the backend and frontend catalogs diverge, including mismatched GUIDs, mismatched codes, duplicate identifiers, or missing entries.

Also run `npm run typecheck` and `npm run build` for the frontend, and `dotnet build NFC_Backend.sln` for the backend.

## Follow-up work outside this catalog task

- Switch `PermissionsContext` from fail-open to `GET /api/permissions/me` (via `useMyPermissions` or an app-level query) once tenant role data exists.
- Add default tenant role templates (Owner, Manager, Cashier) and create tenant `Role` / `TenantUserRole` rows during onboarding.
- Replace placeholder pages as modules become real, then update `Feature.Status` without changing GUIDs or codes.
