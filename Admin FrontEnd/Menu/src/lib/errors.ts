export class TenantNotFoundError extends Error {
  readonly type = 'tenant_not_found' as const;

  constructor() {
    super('Restaurant not found');
    this.name = 'TenantNotFoundError';
  }
}

export class InvalidTableError extends Error {
  readonly type = 'invalid_table' as const;

  constructor() {
    super('Invalid table token');
    this.name = 'InvalidTableError';
  }
}

export class ApiError extends Error {
  readonly type = 'api' as const;
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message = `Request failed (${status})`, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  readonly type = 'network' as const;

  constructor(message = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * The stored session is missing, unknown or expired, so a `[NeedSession]`
 * endpoint rejected the request. Raised for 400/404/410, which the session
 * middleware uses for session problems and the controller uses for
 * tenant/category problems — both bodies are shaped `{ error }`, so they are
 * treated uniformly rather than being distinguished by origin.
 */
export class SessionExpiredError extends Error {
  readonly type = 'session_expired' as const;
  readonly status: number;

  constructor(status: number, message = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
    this.status = status;
  }
}