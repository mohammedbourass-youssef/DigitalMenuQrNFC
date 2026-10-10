import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal path router.
 *
 * The app has exactly two screens (menu and order tracking) and no routing
 * dependency, so this replaces react-router rather than adding it. It covers
 * what is actually needed: read the current path, push a new one, and react to
 * back/forward.
 *
 * Deployment note: `/order` is a client-side path, so the static host needs an
 * SPA fallback rule rewriting unknown paths to `index.html`. Vite's dev server
 * does this by default.
 */

export type Route = '/' | '/order' | '/ticket';

function currentPath(): string {
  // `base` is injected by Vite so the app also works when served from a
  // sub-path; without it a `/menu/order` deployment would read `/order`.
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const path = window.location.pathname;
  const stripped = base && path.startsWith(base) ? path.slice(base.length) : path;
  const normalized = stripped === '' ? '/' : stripped.replace(/\/+$/, '') || '/';
  return normalized;
}

function isRoute(value: string): value is Route {
  return value === '/' || value === '/order';
}

export function navigate(to: Route, opts: { replace?: boolean } = {}): void {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const url = `${base}${to === '/' ? '/' : to}`;
  if (opts.replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
  // `popstate` does not fire for programmatic navigation, so listeners are
  // notified explicitly. Same-window only, which is all this app needs.
  window.dispatchEvent(new Event('app:navigate'));
}

/** Current route. Unknown paths are reported as `/` so the menu always renders. */
export function useRoute(): { route: Route; navigate: (to: Route, opts?: { replace?: boolean }) => void } {
  const [path, setPath] = useState<Route>(() => {
    const initial = currentPath();
    return isRoute(initial) ? initial : '/';
  });

  useEffect(() => {
    const sync = () => {
      const next = currentPath();
      setPath(isRoute(next) ? next : '/');
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('app:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('app:navigate', sync);
    };
  }, []);

  // An unknown path means the app was deep-linked somewhere invalid; normalise
  // the URL so a refresh doesn't re-enter that state.
  useEffect(() => {
    if (isRoute(currentPath())) return;
    navigate('/', { replace: true });
  }, []);

  const go = useCallback((to: Route, opts?: { replace?: boolean }) => navigate(to, opts), []);

  return { route: path, navigate: go };
}