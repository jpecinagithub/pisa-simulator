import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  },
  configurable: true, writable: true,
});
const reloadMock = vi.fn();
Object.defineProperty(globalThis, 'window', {
  value: { location: { reload: reloadMock } },
  configurable: true, writable: true,
});

import { withChunkRetry } from './lazyWithRetry';

beforeEach(() => { store.clear(); reloadMock.mockClear(); });

describe('withChunkRetry', () => {
  it('resolves normally when the import succeeds', async () => {
    await expect(withChunkRetry(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads once on chunk failure, then throws if it fails again within the cooldown', async () => {
    const failing = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module'));
    // First failure triggers a reload and never settles; race it against a timeout.
    const pending = withChunkRetry(failing);
    const raced = await Promise.race([pending.then(() => 'settled'), new Promise((r) => setTimeout(() => r('timeout'), 200))]);
    expect(raced).toBe('timeout');
    expect(reloadMock).toHaveBeenCalledTimes(1);
    // Immediate second failure -> throws without another reload.
    await expect(withChunkRetry(failing)).rejects.toThrow(TypeError);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('allows another reload after the cooldown expires', async () => {
    const failing = () => Promise.reject(new Error('x'));
    store.set('pisa-simulator:chunk-reload-at', String(Date.now() - 61_000));
    const pending = withChunkRetry(failing);
    await Promise.race([pending.then(() => 'settled'), new Promise((r) => setTimeout(() => r('timeout'), 200))]);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
