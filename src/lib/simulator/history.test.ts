import { beforeEach, describe, expect, it } from 'vitest';
import type { TestResult } from '../../types/simulator';
// Minimal localStorage shim for the node test environment.
const backing = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => {
      backing.set(k, String(v));
    },
    removeItem: (k: string) => {
      backing.delete(k);
    },
    clear: () => backing.clear(),
  } as Storage,
  configurable: true,
  writable: true,
});import {
  MAX_HISTORY_ENTRIES,
  appendReportHistory,
  clearReportHistory,
  listReportHistory,
  removeReportHistory,
} from './history';

function fakeResult(id: string, overall = 500): TestResult {
  return {
    sessionId: id,
    participantName: 'Tester',
    language: 'en',
    testMode: 'quick',
    dateISO: new Date().toISOString(),
    domains: {
      math: { domain: 'math', score: overall, range: [470, 530], level: 3, answered: 6, correct: 3, competencies: {} },
      reading: { domain: 'reading', score: overall, range: [470, 530], level: 3, answered: 6, correct: 3, competencies: {} },
      science: { domain: 'science', score: overall, range: [470, 530], level: 3, answered: 6, correct: 3, competencies: {} },
    },
    overall,
    overallRange: [470, 530],
    totalAnswered: 18,
    totalQuestions: 18,
    totalTimeSeconds: 600,
    strongest: 'math',
    weakest: 'reading',
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('report history', () => {
  it('starts empty and appends newest-first', () => {
    expect(listReportHistory()).toEqual([]);
    appendReportHistory(fakeResult('a', 480));
    appendReportHistory(fakeResult('b', 520));
    const list = listReportHistory();
    expect(list.map((r) => r.sessionId)).toEqual(['b', 'a']);
    expect(list[0].overall).toBe(520);
  });

  it('replaces an entry with the same session id instead of duplicating', () => {
    appendReportHistory(fakeResult('a', 480));
    appendReportHistory(fakeResult('a', 510));
    const list = listReportHistory();
    expect(list).toHaveLength(1);
    expect(list[0].overall).toBe(510);
  });

  it('caps the history at MAX_HISTORY_ENTRIES', () => {
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) appendReportHistory(fakeResult(`s${i}`));
    const list = listReportHistory();
    expect(list).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(list[0].sessionId).toBe(`s${MAX_HISTORY_ENTRIES + 4}`);
  });

  it('removes a single entry and clears everything', () => {
    appendReportHistory(fakeResult('a'));
    appendReportHistory(fakeResult('b'));
    expect(removeReportHistory('a').map((r) => r.sessionId)).toEqual(['b']);
    clearReportHistory();
    expect(listReportHistory()).toEqual([]);
  });

  it('ignores corrupt or invalid stored payloads', () => {
    localStorage.setItem('pisa-simulator:report-history:v1', 'not-json{');
    expect(listReportHistory()).toEqual([]);
    localStorage.setItem('pisa-simulator:report-history:v1', JSON.stringify([{ nope: true }]));
    expect(listReportHistory()).toEqual([]);
  });
});
