// ─── Test-session persistence ───────────────────────────────────────────────
// localStorage snapshot of the in-progress assessment (refresh protection).
// Finished sessions, corrupt payloads and sessions older than 24h are
// treated as absent.
//
// NOTE (2026-10-05, SIM-UI agent): reconstructed after an accidental
// overwrite during parallel development. Behavior is pinned by
// session.test.ts in this directory (storage key 'pisa-simulator:session:v1').

import type { TestSession } from '../../types/simulator';

const STORAGE_KEY = 'pisa-simulator:session:v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isValidSession(value: unknown): value is TestSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.sessionId === 'string' &&
    s.sessionId.length > 0 &&
    typeof s.participantName === 'string' &&
    (s.language === 'en' || s.language === 'es') &&
    (s.testMode === 'quick' || s.testMode === 'standard' || s.testMode === 'full') &&
    Array.isArray(s.plan) &&
    typeof s.unitOf === 'object' &&
    s.unitOf !== null &&
    typeof s.responses === 'object' &&
    s.responses !== null &&
    typeof s.currentIndex === 'number' &&
    typeof s.startedAt === 'number' &&
    typeof s.endsAt === 'number' &&
    (s.finishedAt === null || typeof s.finishedAt === 'number') &&
    typeof s.stage === 'number'
  );
}

export function saveSession(session: TestSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — the test simply won't survive a reload */
  }
}

export function loadSession(): TestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSession(parsed)) return null;
    if (parsed.finishedAt) return null;
    if (Date.now() - parsed.startedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
