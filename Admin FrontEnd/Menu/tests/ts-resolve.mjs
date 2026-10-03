/**
 * Test-run bootstrap: registers the module resolution hooks and provides the
 * minimal browser globals that app modules touch at import time.
 *
 * `lib/tenant.ts` evaluates `window.location.hostname` while being imported, and
 * `lib/storage.ts` reads `window.localStorage`. Node has neither, so a bare
 * `import` of anything in that chain throws. These stubs are deliberately inert —
 * storage always misses and the location is a fixed localhost — so tests stay
 * hermetic and no real data is touched.
 *
 * Registered via `--import ./tests/ts-resolve.mjs` in the `test` script.
 */
import { register } from 'node:module';

register('./ts-resolve-hooks.mjs', import.meta.url);

if (typeof globalThis.window === 'undefined') {
  const store = new Map();
  globalThis.location = { hostname: 'localhost', search: '', href: 'http://localhost/' };
  // Alias to globalThis so `window.setTimeout` etc. resolve to the real ones.
  globalThis.window = globalThis;
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  globalThis.window.localStorage = globalThis.localStorage;
}
