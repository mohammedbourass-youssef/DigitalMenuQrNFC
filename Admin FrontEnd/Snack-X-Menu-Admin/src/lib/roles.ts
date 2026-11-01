import { FEATURES } from '../features/catalog.ts';
import type { FeaturePermission } from '@/types/permissions';
import type {
  RoleItem,
  RolePermissionAction,
  RolePermissionEntry,
  RolePermissionFlags,
  RolePermissionPayload,
  RolePermissionState,
  RoleSortDirection,
  RoleSortKey,
  RoleTypeFilter,
  UpdateRolePayload,
} from '@/types/role';

export const EMPTY_ROLE_PERMISSIONS: RolePermissionFlags = {
  read: false,
  add: false,
  edit: false,
  delete: false,
};

export const FULL_ROLE_PERMISSIONS: RolePermissionFlags = {
  read: true,
  add: true,
  edit: true,
  delete: true,
};

export interface RolePermissionCounts {
  read: number;
  add: number;
  edit: number;
  delete: number;
  total: number;
}

const FEATURE_CODE_BY_ID = new Map(
  Object.values(FEATURES).map((feature) => [feature.id.toLowerCase(), feature.code])
);

export function humanizeFeatureCode(code: string): string {
  return code
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}

export function featureNameById(featureId: string, names?: ReadonlyMap<string, string>): string {
  const normalized = featureId.toLowerCase();
  const known = names?.get(normalized);
  if (known) return known;

  const code = FEATURE_CODE_BY_ID.get(normalized);
  return code ? humanizeFeatureCode(code) : featureId;
}

export interface RoleMatrixFeature {
  id: string;
  name: string;
}

export function buildRoleMatrixFeatures(
  features: FeaturePermission[],
  state: RolePermissionState,
  names?: ReadonlyMap<string, string>
): RoleMatrixFeature[] {
  const seen = new Set<string>();
  const rows: RoleMatrixFeature[] = [];

  for (const feature of features) {
    if (!feature.isInPlan) continue;
    const id = feature.id.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      name: feature.name || humanizeFeatureCode(feature.code),
    });
  }

  for (const id of Object.keys(state)) {
    if (seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    rows.push({ id: id.toLowerCase(), name: featureNameById(id, names) });
  }

  return rows.sort((left, right) => left.name.localeCompare(right.name));
}

export function buildPermissionPayload(
  rows: RoleMatrixFeature[],
  state: RolePermissionState
): RolePermissionPayload[] {
  return rows
    .map((row) => {
      const flags = state[row.id] ?? EMPTY_ROLE_PERMISSIONS;
      return {
        featureId: row.id,
        canRead: flags.read,
        canAdd: flags.add,
        canEdit: flags.edit,
        canDelete: flags.delete,
      };
    })
    .filter(
      (permission) =>
        permission.canRead ||
        permission.canAdd ||
        permission.canEdit ||
        permission.canDelete
    );
}

export interface BuildUpdateRoleRequestInput {
  id: string;
  name: string;
  description: string;
  rows: RoleMatrixFeature[];
  state: RolePermissionState;
}

export function buildUpdateRoleRequest({
  id,
  name,
  description,
  rows,
  state,
}: BuildUpdateRoleRequestInput): UpdateRolePayload {
  return {
    id: id.trim(),
    name: name.trim(),
    description: description.trim(),
    permissions: buildPermissionPayload(rows, state),
  };
}

export function permissionFlagsFromEntry(entry: RolePermissionEntry): RolePermissionFlags {
  return {
    read: entry.roleCanRead,
    add: entry.roleCanAdd,
    edit: entry.roleCanEdit,
    delete: entry.roleCanRemove,
  };
}

export function permissionStateFromRole(role: RoleItem | null): RolePermissionState {
  if (!role) return {};

  const state: RolePermissionState = {};
  for (const entry of role.rolePermissions ?? []) {
    state[entry.featureId.toLowerCase()] = permissionFlagsFromEntry(entry);
  }
  return state;
}

export function getRolePermissionCounts(role: RoleItem): RolePermissionCounts {
  const counts: RolePermissionCounts = { read: 0, add: 0, edit: 0, delete: 0, total: 0 };

  for (const entry of role.rolePermissions ?? []) {
    if (entry.roleCanRead) counts.read += 1;
    if (entry.roleCanAdd) counts.add += 1;
    if (entry.roleCanEdit) counts.edit += 1;
    if (entry.roleCanRemove) counts.delete += 1;
    if (entry.roleCanRead || entry.roleCanAdd || entry.roleCanEdit || entry.roleCanRemove) {
      counts.total += 1;
    }
  }

  return counts;
}

export function filterRoles(
  roles: RoleItem[],
  query: string,
  names?: ReadonlyMap<string, string>
): RoleItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return roles;

  return roles.filter((role) => {
    const haystack = [
      role.name,
      role.description ?? '',
      ...(role.rolePermissions ?? []).map((entry) => featureNameById(entry.featureId, names)),
    ]
      .join(' ')
      .toLocaleLowerCase();

    return haystack.includes(needle);
  });
}

export function searchRolesByName(roles: RoleItem[], query: string): RoleItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return roles;

  return roles.filter((role) => role.name.toLocaleLowerCase().includes(needle));
}

export function filterRolesByType(roles: RoleItem[], filter: RoleTypeFilter): RoleItem[] {
  if (filter === 'all') return roles;
  return roles.filter((role) => (filter === 'system' ? role.isSystem : !role.isSystem));
}

export function filterMatrixFeatures(
  rows: RoleMatrixFeature[],
  query: string
): RoleMatrixFeature[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.name.toLocaleLowerCase().includes(needle));
}

export function hasAnyPermission(
  state: RolePermissionState,
  featureId: string
): boolean {
  const flags = state[featureId.toLowerCase()];
  if (!flags) return false;
  return flags.read || flags.add || flags.edit || flags.delete;
}

export function countEnabledPermissions(
  state: RolePermissionState,
  featureIds?: readonly string[]
): number {
  if (featureIds) {
    return featureIds.reduce((total, featureId) => {
      const flags = state[featureId.toLowerCase()];
      if (!flags) return total;
      return (
        total +
        Number(flags.read) +
        Number(flags.add) +
        Number(flags.edit) +
        Number(flags.delete)
      );
    }, 0);
  }

  return Object.values(state).reduce(
    (total, flags) =>
      total +
      Number(flags.read) +
      Number(flags.add) +
      Number(flags.edit) +
      Number(flags.delete),
    0
  );
}

export function countPermissionedFeatures(
  state: RolePermissionState,
  featureIds?: readonly string[]
): number {
  const ids = featureIds ?? Object.keys(state);
  return ids.reduce(
    (total, featureId) => total + Number(hasAnyPermission(state, featureId)),
    0
  );
}

export function serializePermissionState(state: RolePermissionState): string {
  return Object.keys(state)
    .sort()
    .map((featureId) => {
      const flags = state[featureId] ?? EMPTY_ROLE_PERMISSIONS;
      if (!flags.read && !flags.add && !flags.edit && !flags.delete) return [];
      return [
        featureId,
        flags.read ? '1' : '0',
        flags.add ? '1' : '0',
        flags.edit ? '1' : '0',
        flags.delete ? '1' : '0',
      ];
    })
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.join(':'))
    .join('|');
}

export function findRoleInList(roles: RoleItem[], id: string | undefined): RoleItem | null {
  if (!id) return null;
  return roles.find((role) => role.id === id) ?? null;
}

export interface RoleNeighbors {
  index: number;
  total: number;
  previous: RoleItem | null;
  next: RoleItem | null;
}

export function getRoleNeighbors(
  roles: RoleItem[],
  id: string | undefined,
  locale = 'en'
): RoleNeighbors {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const ordered = [...roles].sort((left, right) => collator.compare(left.name, right.name));
  const index = id ? ordered.findIndex((role) => role.id === id) : -1;

  return {
    index,
    total: ordered.length,
    previous: index > 0 ? ordered[index - 1] : null,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

export function sortRoles(
  roles: RoleItem[],
  key: RoleSortKey,
  direction: RoleSortDirection,
  locale = 'en'
): RoleItem[] {
  const factor = direction === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

  return [...roles].sort((left, right) => {
    if (key === 'users') {
      return (left.totalUsersInThisRole - right.totalUsersInThisRole) * factor;
    }

    if (key === 'createdAt') {
      return (timestamp(left.createdAtUTC) - timestamp(right.createdAtUTC)) * factor;
    }

    return collator.compare(left.name, right.name) * factor;
  });
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export interface RolePage {
  items: RoleItem[];
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
}

export function paginateRoles(roles: RoleItem[], page: number, pageSize: number): RolePage {
  const total = roles.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  const items = roles.slice(start, start + pageSize);

  return {
    items,
    page: current,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    total,
  };
}

export function isActionSelected(
  state: RolePermissionState,
  featureId: string,
  action: RolePermissionAction
): boolean {
  return state[featureId.toLowerCase()]?.[action] ?? false;
}

export function togglePermissionAction(
  state: RolePermissionState,
  featureId: string,
  action: RolePermissionAction,
  checked: boolean
): RolePermissionState {
  const id = featureId.toLowerCase();
  const current = state[id] ?? EMPTY_ROLE_PERMISSIONS;

  if (action === 'read') {
    return {
      ...state,
      [id]: checked ? { ...current, read: true } : { ...EMPTY_ROLE_PERMISSIONS },
    };
  }

  return {
    ...state,
    [id]: {
      ...current,
      [action]: checked,
      read: checked ? true : current.read,
    },
  };
}

export function toggleAllFeaturePermissions(
  state: RolePermissionState,
  featureId: string,
  checked: boolean
): RolePermissionState {
  const id = featureId.toLowerCase();
  return {
    ...state,
    [id]: checked ? { ...FULL_ROLE_PERMISSIONS } : { ...EMPTY_ROLE_PERMISSIONS },
  };
}
