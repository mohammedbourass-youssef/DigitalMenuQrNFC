export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  systemRole: string;
  roleNames: string[];
  isActive: boolean;
  emailConfirmed: boolean;
  lastLoginAt: string | null;
  createdAtUTC: string;
}

export interface PagedUserList {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export type UserStatusFilter = "all" | "active" | "inactive";

export type UserVerificationFilter = "all" | "verified" | "unverified";

export type UserSortKey = "name" | "lastLogin" | "createdAt";

export type UserSortDirection = "asc" | "desc";

export interface UserListRequest {
  search?: string;
  status?: UserStatusFilter;
  verification?: UserVerificationFilter;
  sortKey?: UserSortKey;
  sortDirection?: UserSortDirection;
  page?: number;
  pageSize?: number;
}

export interface TenantRole {
  id: string;
  name: string;
  description: string;
}

export interface CreateTenantUserRequest {
  fullName: string;
  email: string;
  password?: string;
  roleId: string;
}

export interface CreateTenantUserResponse {
  id: string;
  temporaryPassword?: string;
}
