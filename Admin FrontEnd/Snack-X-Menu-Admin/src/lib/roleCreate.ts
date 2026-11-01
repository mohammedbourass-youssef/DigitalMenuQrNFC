import type {
  CreateRoleRequest,
  RolePermissionEntry,
  RolePermissionState,
} from '@/types/role';
import type { RoleMatrixFeature } from '@/lib/roles';

export interface BuildCreateRoleRequestInput {
  name: string;
  description: string;
  rows: readonly RoleMatrixFeature[];
  state: RolePermissionState;
}

export interface RoleCreateFieldErrors {
  name?: string;
  description?: string;
  permissions?: string;
}

export type RoleCreateErrorKind =
  | 'validation'
  | 'limit'
  | 'forbidden'
  | 'duplicate-name'
  | 'invalid-permissions'
  | 'role-not-found'
  | 'tenant-not-found'
  | 'plan-not-found'
  | 'conflict'
  | 'unauthorized'
  | 'server'
  | 'network'
  | 'unknown';

export interface RoleCreateErrorInfo {
  kind: RoleCreateErrorKind;
  status: number | null;
  message: string;
  fieldErrors: RoleCreateFieldErrors;
}

interface ErrorResponseData {
  error?: unknown;
  message?: unknown;
  title?: unknown;
  errors?: unknown;
  field?: unknown;
  code?: unknown;
}

function readFieldKey(value: unknown): keyof RoleCreateFieldErrors | null {
  if (typeof value !== 'string') return null;

  const key = value.split('.')[0].split('[')[0].toLowerCase();
  if (key === 'name') return 'name';
  if (key === 'descriptions' || key === 'description') return 'description';
  if (key === 'tablerole' || key === 'permissions') return 'permissions';
  return null;
}

export function buildCreateRoleRequest({
  name,
  description,
  rows,
  state,
}: BuildCreateRoleRequestInput): CreateRoleRequest {
  const tableRole: RolePermissionEntry[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const featureId = row.id.trim();
    const key = featureId.toLowerCase();
    if (!featureId || seen.has(key)) continue;

    const flags = state[key];
    if (!flags) continue;

    const hasAny = flags.read || flags.add || flags.edit || flags.delete;
    if (!hasAny) continue;

    seen.add(key);
    tableRole.push({
      featureId,
      roleCanRead: flags.read || flags.add || flags.edit || flags.delete,
      roleCanAdd: flags.add,
      roleCanEdit: flags.edit,
      roleCanRemove: flags.delete,
    });
  }

  const trimmedDescription = description.trim();

  return {
    name: name.trim(),
    descriptions: trimmedDescription ? trimmedDescription : null,
    tableRole,
  };
}

export function readCreatedRoleId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as { id?: unknown }).id;
  return typeof id === 'string' && id.trim() ? id : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readFirstError(value: unknown): string | null {
  if (typeof value === 'string') return readString(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = readString(entry);
      if (message) return message;
    }
  }
  return null;
}

function readFieldErrors(errors: unknown): RoleCreateFieldErrors {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {};

  const result: RoleCreateFieldErrors = {};

  for (const [rawKey, value] of Object.entries(errors)) {
    const message = readFirstError(value);
    if (!message) continue;

    const key = readFieldKey(rawKey);
    if (key) result[key] ??= message;
  }

  return result;
}

export function parseRoleCreateError(error: unknown): RoleCreateErrorInfo {
  const response = (
    error as { response?: { status?: unknown; data?: unknown } } | null | undefined
  )?.response;

  const status =
    response && typeof response.status === 'number' ? response.status : null;
  const data =
    response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? (response.data as ErrorResponseData)
      : undefined;

  const fieldErrors = readFieldErrors(data?.errors);
  const directField = readFieldKey(data?.field);
  const code = readString(data?.code);
  const message =
    readString(data?.error) ??
    readString(data?.message) ??
    readString(data?.title) ??
    fieldErrors.name ??
    fieldErrors.description ??
    fieldErrors.permissions ??
    '';

  if (directField && message) {
    fieldErrors[directField] ??= message;
  }

  if (status === null) {
    return { kind: 'network', status, message, fieldErrors };
  }

  if (status === 400) {
    const kind: RoleCreateErrorKind =
      code === 'INVALID_PERMISSIONS' || code === 'FEATURE_NOT_AVAILABLE'
        ? 'invalid-permissions'
        : 'validation';
    return { kind, status, message, fieldErrors };
  }

  if (status === 401) {
    return { kind: 'unauthorized', status, message, fieldErrors };
  }

  if (status === 403) {
    const kind = code === 'ROLE_LIMIT_REACHED' || /limit/i.test(message)
      ? 'limit'
      : 'forbidden';
    return { kind, status, message, fieldErrors };
  }

  if (status === 404) {
    const kind: RoleCreateErrorKind =
      code === 'ROLE_NOT_FOUND' || /role.*not found/i.test(message)
        ? 'role-not-found'
        : /plan/i.test(message)
          ? 'plan-not-found'
          : 'tenant-not-found';
    return { kind, status, message, fieldErrors };
  }

  if (status === 409) {
    const lower = message.toLowerCase();
    let kind: RoleCreateErrorKind = 'conflict';

    if (code === 'ROLE_LIMIT_REACHED' || lower.includes('limit')) kind = 'limit';
    else if (code === 'ROLE_NAME_EXISTS' || (lower.includes('name') && /exist|duplicate/.test(lower))) {
      kind = 'duplicate-name';
    } else if (lower.includes('permission') && lower.includes('invalid')) {
      kind = 'invalid-permissions';
    }

    return { kind, status, message, fieldErrors };
  }

  if (status >= 500) {
    return { kind: 'server', status, message, fieldErrors };
  }

  return { kind: 'unknown', status, message, fieldErrors };
}
