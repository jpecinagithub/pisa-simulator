// Lazy route imports with resilience against stale deployments.
//
// When a new version is deployed while the user has an older index.html cached
// (browser HTTP cache or the PWA service worker precache), React.lazy chunk
// URLs can point at files that no longer exist in the live deployment. The
// import then rejects with "Failed to fetch dynamically imported module".
//
// The standard recovery is a single hard reload: it fetches a fresh index.html
// (and lets an updated service worker take over), after which the new chunk
// URLs resolve. The reload is rate-limited via sessionStorage so a genuinely
// missing chunk surfaces the error instead of looping forever.
import { lazy } from 'react';
import type { ComponentType } from 'react';

const RELOAD_KEY = 'pisa-simulator:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

/**
 * Wraps a dynamic import with stale-deployment recovery. Exported for tests.
 */
export function withChunkRetry<T>(importFn: () => Promise<T>): Promise<T> {
  return importFn().catch((err: unknown) => {
    let lastReload = 0;
    try {
      lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    } catch {
      /* storage unavailable — fall through to throwing */
    }
    if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      window.location.reload();
      // Never resolves; the reload takes over from here.
      return new Promise<T>(() => {});
    }
    throw err;
  });
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(() => withChunkRetry(importFn));
}
