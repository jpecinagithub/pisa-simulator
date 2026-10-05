// ─── session.test.ts ─────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, loadSession, saveSession } from './session';
import type { TestSession } from '../../types/simulator';

// Minimal localStorage shim for the node test environment.
const backing = new Map<string, string>();
const shim = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => {
    backing.set(k, String(v));
  },
  removeItem: (k: string) => {
    backing.delete(k);
  },
  clear: () => backing.clear(),
  get length() {
    return backing.size;
  },
  key: (i: number) => [...backing.keys()][i] ?? null,
} as Storage;
Object.defineProperty(globalThis, 'localStorage', {
  value: shim,
  configurable: true,
  writable: true,
});

function baseSession(overrides: Partial<TestSession> = {}): TestSession {
  const now = Date.now();
  return {
    sessionId: 'sess-1',
    participantName: 'Jon',
    language: 'en',
    testMode: 'quick',
    plan: ['MATH-001', 'READ-001'],
    unitOf: { 'MATH-001': 'MATH-U01', 'READ-001': 'READ-U01' },
    responses: {
      'MATH-001': {
        questionId: 'MATH-001',
        answer: 1,
        flagged: false,
        timeSpentSeconds: 42,
        points: 1,
      },
    },
    currentIndex: 1,
    startedAt: now,
    endsAt: now + 25 * 60 * 1000,
    finishedAt: null,
    stage: 1,
    ...overrides,
  };
}

describe('session persistence', () => {
  beforeEach(() => backing.clear());

  it('round-trips a session through save/load', () => {
    const session = baseSession();
    saveSession(session);
    expect(loadSession()).toEqual(session);
  });

  it('returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    backing.set('pisa-simulator:session:v1', 'not-json{{{');
    expect(loadSession()).toBeNull();
  });

  it('returns null for a wrong-shaped payload', () => {
    backing.set('pisa-simulator:session:v1', JSON.stringify({ foo: 1 }));
    expect(loadSession()).toBeNull();
  });

  it('returns null for a finished session', () => {
    saveSession(baseSession({ finishedAt: Date.now() }));
    expect(loadSession()).toBeNull();
  });

  it('returns null for a session older than 24h', () => {
    saveSession(baseSession({ startedAt: Date.now() - 25 * 60 * 60 * 1000 }));
    expect(loadSession()).toBeNull();
  });

  it('clearSession discards the snapshot', () => {
    saveSession(baseSession());
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
