import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  KeyRound,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wallet,
} from 'lucide-react';

import AttendancePage from '@/pages/hr/Attendance';
import AuditLogPage from '@/pages/hr/AuditLog';
import DepartmentsPage from '@/pages/hr/Departments';
import DiscoverMyPermissionsPage from '@/pages/hr/DiscoverMyPermissions';
import EmployeesPage from '@/pages/hr/Employees';
import HRGeneralSettingsPage from '@/pages/hr/HRGeneralSettings';
import JobTitlesPage from '@/pages/hr/JobTitles';
import LeaveManagementPage from '@/pages/hr/LeaveManagement';
import PayrollPage from '@/pages/hr/Payroll';
import RolesPage from '@/pages/hr/Roles';
import UsersPage from '@/pages/hr/Users';

export interface HrPageDefinition {
  path: string;
  title: string;
  labelKey: string;
  icon: LucideIcon;
  component: ComponentType;
}

/** Single source of truth for HR routes and sidebar items. */
export const HR_PAGE_CONFIG: HrPageDefinition[] = [
  { path: '/hr/employees', title: 'Employees', labelKey: 'sidebar.hrEmployees', icon: Users, component: EmployeesPage },
  { path: '/hr/users', title: 'Users', labelKey: 'sidebar.hrUsers', icon: UserRoundCog, component: UsersPage },
  { path: '/hr/roles', title: 'Roles', labelKey: 'sidebar.hrRoles', icon: ShieldCheck, component: RolesPage },
  { path: '/hr/my-permissions', title: 'Discover My Permissions', labelKey: 'sidebar.hrMyPermissions', icon: KeyRound, component: DiscoverMyPermissionsPage },
  { path: '/hr/departments', title: 'Departments', labelKey: 'sidebar.hrDepartments', icon: Building2, component: DepartmentsPage },
  { path: '/hr/job-titles', title: 'Job Titles', labelKey: 'sidebar.hrJobTitles', icon: BriefcaseBusiness, component: JobTitlesPage },
  { path: '/hr/leave', title: 'Leave Management', labelKey: 'sidebar.hrLeave', icon: CalendarDays, component: LeaveManagementPage },
  { path: '/hr/attendance', title: 'Attendance', labelKey: 'sidebar.hrAttendance', icon: Clock3, component: AttendancePage },
  { path: '/hr/payroll', title: 'Payroll', labelKey: 'sidebar.hrPayroll', icon: Wallet, component: PayrollPage },
  { path: '/hr/audit-log', title: 'Audit Log', labelKey: 'sidebar.hrAuditLog', icon: ScrollText, component: AuditLogPage },
  { path: '/hr/settings', title: 'HR General Settings', labelKey: 'sidebar.hrGeneralSettings', icon: Settings2, component: HRGeneralSettingsPage },
];

export const HR_SETTINGS_GROUP = {
  type: 'group' as const,
  labelKey: 'sidebar.hrSettings',
  defaultLabel: 'HR Settings',
  icon: Activity,
  children: HR_PAGE_CONFIG.map(({ path, title, labelKey, icon }) => ({
    href: path,
    labelKey,
    defaultLabel: title,
    icon,
    end: true,
  })),
};
