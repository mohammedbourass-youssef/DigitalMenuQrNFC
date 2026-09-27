/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Root domain used to resolve the tenant from the hostname. */
  readonly VITE_BASE_DOMAIN: string
  /** Base URL of the tenant API (must be set, see src/lib/api.ts). */
  readonly VITE_API_URL: string
  /** Fallback tenant slug, development only. */
  readonly VITE_DEV_TENANT: string
  /** When "true", serve data from the built-in mock instead of the API. */
  readonly VITE_USE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}