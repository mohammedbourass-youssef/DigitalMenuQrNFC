import type { FeatureAction, FeatureCode } from '@/features/catalog';

export interface FeatureRouteDefinition {
  path: string;
  feature: FeatureCode;
  action: FeatureAction;
}

export const FEATURE_ROUTES: readonly FeatureRouteDefinition[] = [
  { path: '/menu-items', feature: 'Menu', action: 'read' },
  { path: '/categories', feature: 'Categories', action: 'read' },
  { path: '/tables', feature: 'Tables', action: 'read' },
  { path: '/orders', feature: 'Orders', action: 'read' },
  { path: '/payments/invoices', feature: 'Invoices', action: 'read' },
  { path: '/payments/methods', feature: 'PaymentMethods', action: 'read' },
  { path: '/payments/payment-status', feature: 'PaymentStatuses', action: 'read' },
  { path: '/nfc-tags', feature: 'NfcTags', action: 'read' },
  { path: '/settings/system-preferences', feature: 'Settings', action: 'read' },
  { path: '/settings/restaurant-information', feature: 'Settings', action: 'read' },
  { path: '/settings/upgrade', feature: 'Subscription', action: 'read' },
  { path: '/hr/employees', feature: 'Employees', action: 'read' },
  { path: '/hr/departments', feature: 'Departments', action: 'read' },
  { path: '/hr/job-titles', feature: 'JobTitles', action: 'read' },
  { path: '/hr/leave', feature: 'LeaveManagement', action: 'read' },
  { path: '/hr/attendance', feature: 'Attendance', action: 'read' },
  { path: '/hr/payroll', feature: 'Payroll', action: 'read' },
  { path: '/hr/audit-log', feature: 'AuditLog', action: 'read' },
  { path: '/hr/settings', feature: 'HRGeneralSettings', action: 'read' },
  { path: '/hr/users', feature: 'Users', action: 'read' },
  { path: '/hr/roles', feature: 'Roles', action: 'read' },
];

const ROUTES_BY_LENGTH = [...FEATURE_ROUTES].sort(
  (left, right) => right.path.length - left.path.length
);

export function featureForPath(pathname: string): FeatureRouteDefinition | undefined {
  return ROUTES_BY_LENGTH.find(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`)
  );
}
