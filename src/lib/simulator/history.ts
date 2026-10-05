// ─── Report history ─────────────────────────────────────────────────────────
// Per-browser history of finished PISA-style reports. Each finished assessment
// appends its TestResult (fully JSON-serializable) so the user can revisit
// past reports, view them again, or re-download their PDFs.
// Newest first. Bounded to avoid exhausting localStorage quota.

import type { TestResult } from '../../types/simulator';

const HISTORY_KEY = 'pisa-simulator:report-history:v1';
export const MAX_HISTORY_ENTRIES = 10;

function isValidResult(value: unknown): value is TestResult {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  const domains = r.domains as Record<string, unknown> | undefined;
  return (
    typeof r.sessionId === 'string' &&
    r.sessionId.length > 0 &&
    typeof r.participantName === 'string' &&
    (r.language === 'en' || r.language === 'es') &&
    (r.testMode === 'quick' || r.testMode === 'standard' || r.testMode === 'full') &&
    typeof r.dateISO === 'string' &&
    typeof domains === 'object' &&
    domains !== null &&
    typeof r.overall === 'number'
  );
}

/** All saved reports, newest first. Never throws. */
export function listReportHistory(): TestResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidResult).slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function persist(entries: TestResult[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
  } catch {
    /* storage unavailable — history simply won't persist */
  }
}

/** Prepend a finished report; replaces any entry with the same session id. */
export function appendReportHistory(result: TestResult): TestResult[] {
  const entries = listReportHistory().filter((e) => e.sessionId !== result.sessionId);
  entries.unshift(result);
  persist(entries);
  return entries.slice(0, MAX_HISTORY_ENTRIES);
}

/** Remove one report from the history. */
export function removeReportHistory(sessionId: string): TestResult[] {
  const entries = listReportHistory().filter((e) => e.sessionId !== sessionId);
  persist(entries);
  return entries;
}

/** Clear the whole history. */
export function clearReportHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
