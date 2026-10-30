export type FeatureAction = 'read' | 'create' | 'edit' | 'delete';

export const FEATURES = {
  Menu: { id: 'a1000000-0000-0000-0000-000000000001', code: 'Menu' },
  Categories: { id: 'a1000000-0000-0000-0000-000000000002', code: 'Categories' },
  Tables: { id: 'a1000000-0000-0000-0000-000000000003', code: 'Tables' },
  Orders: { id: 'a1000000-0000-0000-0000-000000000004', code: 'Orders' },
  Invoices: { id: 'a1000000-0000-0000-0000-000000000005', code: 'Invoices' },
  Users: { id: 'a1000000-0000-0000-0000-000000000006', code: 'Users' },
  Roles: { id: 'a1000000-0000-0000-0000-000000000007', code: 'Roles' },
  AiAgent: { id: 'a1000000-0000-0000-0000-000000000008', code: 'AiAgent' },
  DataAnalyst: { id: 'a1000000-0000-0000-0000-000000000009', code: 'DataAnalyst' },
  Chatbot: { id: 'a1000000-0000-0000-0000-00000000000a', code: 'Chatbot' },
  Notifications: { id: 'a1000000-0000-0000-0000-00000000000b', code: 'Notifications' },
  PaymentMethods: { id: 'a1000000-0000-0000-0000-00000000000c', code: 'PaymentMethods' },
  PaymentStatuses: { id: 'a1000000-0000-0000-0000-00000000000d', code: 'PaymentStatuses' },
  NfcTags: { id: 'a1000000-0000-0000-0000-00000000000e', code: 'NfcTags' },
  Settings: { id: 'a1000000-0000-0000-0000-00000000000f', code: 'Settings' },
  Subscription: { id: 'a1000000-0000-0000-0000-000000000010', code: 'Subscription' },
  Employees: { id: 'a1000000-0000-0000-0000-000000000011', code: 'Employees' },
  Departments: { id: 'a1000000-0000-0000-0000-000000000012', code: 'Departments' },
  JobTitles: { id: 'a1000000-0000-0000-0000-000000000013', code: 'JobTitles' },
  LeaveManagement: { id: 'a1000000-0000-0000-0000-000000000014', code: 'LeaveManagement' },
  Attendance: { id: 'a1000000-0000-0000-0000-000000000015', code: 'Attendance' },
  Payroll: { id: 'a1000000-0000-0000-0000-000000000016', code: 'Payroll' },
  AuditLog: { id: 'a1000000-0000-0000-0000-000000000017', code: 'AuditLog' },
  HRGeneralSettings: { id: 'a1000000-0000-0000-0000-000000000018', code: 'HRGeneralSettings' },
} as const;

export type FeatureCode = keyof typeof FEATURES;

export function isFeatureCode(value: string): value is FeatureCode {
  return Object.prototype.hasOwnProperty.call(FEATURES, value);
}
