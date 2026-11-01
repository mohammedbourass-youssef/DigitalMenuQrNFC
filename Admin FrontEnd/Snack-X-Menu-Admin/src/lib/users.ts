import type {
  UserListItem,
  UserSortDirection,
  UserSortKey,
  UserStatusFilter,
  UserVerificationFilter,
} from "@/types/user";

export function getSystemRoleKey(systemRole: string): string {
  switch (systemRole.toLowerCase()) {
    case "tenantowner":
      return "users.systemRoles.tenantOwner";
    case "tenantstaff":
      return "users.systemRoles.tenantStaff";
    case "superadmin":
      return "users.systemRoles.superAdmin";
    default:
      return "";
  }
}

export function getUserRoleNames(user: UserListItem): string[] {
  return user.roleNames.filter((name) => name.trim().length > 0);
}

export function searchUsers(users: UserListItem[], query: string): UserListItem[] {
  const term = query.trim().toLowerCase();
  if (!term) return users;

  return users.filter((user) => {
    const haystack = [
      user.fullName,
      user.email,
      user.systemRole,
      ...user.roleNames,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

export function filterUsers(
  users: UserListItem[],
  status: UserStatusFilter,
  verification: UserVerificationFilter
): UserListItem[] {
  return users.filter((user) => {
    if (status === "active" && !user.isActive) return false;
    if (status === "inactive" && user.isActive) return false;
    if (verification === "verified" && !user.emailConfirmed) return false;
    if (verification === "unverified" && user.emailConfirmed) return false;
    return true;
  });
}

function timestamp(value: string | null): number | null {
  if (!value) return null;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function sortUsers(
  users: UserListItem[],
  key: UserSortKey,
  direction: UserSortDirection,
  locale: string
): UserListItem[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...users].sort((left, right) => {
    if (key === "name") {
      return (
        factor *
        left.fullName.localeCompare(right.fullName, locale || "en", {
          sensitivity: "base",
        })
      );
    }

    const leftTime = timestamp(
      key === "lastLogin" ? left.lastLoginAt : left.createdAtUTC
    );
    const rightTime = timestamp(
      key === "lastLogin" ? right.lastLoginAt : right.createdAtUTC
    );

    if (leftTime === null && rightTime === null) {
      return left.fullName.localeCompare(right.fullName, locale || "en", {
        sensitivity: "base",
      });
    }
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;

    return factor * (leftTime - rightTime);
  });
}

export function paginateUsers(
  users: UserListItem[],
  page: number,
  pageSize: number
): { items: UserListItem[]; page: number; pageCount: number; from: number; to: number; total: number } {
  const total = users.length;
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * safePageSize;
  const items = users.slice(start, start + safePageSize);

  return {
    items,
    page: safePage,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + items.length,
    total,
  };
}
