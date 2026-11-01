export interface RolePermissionEntry {
  featureId: string;
  roleCanAdd: boolean;
  roleCanRemove: boolean;
  roleCanEdit: boolean;
  roleCanRead: boolean;
}

export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAtUTC: string;
  totalUsersInThisRole: number;
  rolePermissions: RolePermissionEntry[];
}

export type RolePermissionAction = 'read' | 'add' | 'edit' | 'delete';

export type RolePermissionFlags = Record<RolePermissionAction, boolean>;

export type RolePermissionState = Record<string, RolePermissionFlags>;

export interface RolePermissionPayload {
  featureId: string;
  canRead: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CreateRolePayload {
  name: string;
  description: string;
  permissions: RolePermissionPayload[];
}

export interface CreateRoleRequest {
  name: string;
  descriptions: string | null;
  tableRole: RolePermissionEntry[];
}

export interface CreateRoleResponse {
  id: string;
}

export interface UpdateRolePayload extends CreateRolePayload {
  id: string;
}

export interface RoleFormValues {
  name: string;
  description: string;
  permissions: RolePermissionPayload[];
}

export type RoleSortKey = 'name' | 'users' | 'createdAt';

export type RoleSortDirection = 'asc' | 'desc';

export type RoleTypeFilter = 'all' | 'system' | 'custom';

export interface RoleMutationResponse {
  id?: string;
  roleId?: string;
  message?: string;
}
