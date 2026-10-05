// ─── grading.test.ts ─────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { gradeResponse } from './grading';
import type { PisaQuestion } from '../../types/simulator';

function baseQuestion(overrides: Partial<PisaQuestion> = {}): PisaQuestion {
  return {
    id: 'T-001',
    domain: 'math',
    competency: 'math.employing',
    difficulty: 0,
    discrimination: 1,
    level: 3,
    type: 'single-choice',
    prompt: { en: 'Prompt', es: 'Enunciado' },
    options: [
      { en: 'A', es: 'A' },
      { en: 'B', es: 'B' },
      { en: 'C', es: 'C' },
    ],
    correctAnswer: 1,
    maxPoints: 2,
    explanation: { en: 'Why', es: 'Por qué' },
    estimatedMinutes: 2,
    ...overrides,
  };
}

describe('gradeResponse', () => {
  it('returns 0 for null (unanswered) on every type', () => {
    for (const type of ['single-choice', 'multiple-choice', 'numeric', 'short-response'] as const) {
      const q = baseQuestion({ type });
      expect(gradeResponse(q, null)).toBe(0);
    }
  });

  it('single-choice: exact index match earns full points', () => {
    const q = baseQuestion({ type: 'single-choice', correctAnswer: 1, maxPoints: 2 });
    expect(gradeResponse(q, 1)).toBe(2);
    expect(gradeResponse(q, 0)).toBe(0);
    expect(gradeResponse(q, 2)).toBe(0);
  });

  it('multiple-choice: exact set match, order-insensitive, earns full points', () => {
    const q = baseQuestion({ type: 'multiple-choice', correctAnswer: [0, 2], maxPoints: 3 });
    expect(gradeResponse(q, [2, 0])).toBe(3);
    expect(gradeResponse(q, [0, 2])).toBe(3);
    expect(gradeResponse(q, [0])).toBe(0); // subset
    expect(gradeResponse(q, [0, 1, 2])).toBe(0); // superset
    expect(gradeResponse(q, [0, 1])).toBe(0); // wrong set
    expect(gradeResponse(q, 0)).toBe(0); // wrong shape
  });

  it('numeric: ±2% tolerance around the correct value', () => {
    const q = baseQuestion({ type: 'numeric', correctAnswer: 100, maxPoints: 1 });
    expect(gradeResponse(q, 100)).toBe(1);
    expect(gradeResponse(q, 102)).toBe(1); // boundary inclusive
    expect(gradeResponse(q, 98)).toBe(1);
    expect(gradeResponse(q, 101.5)).toBe(1);
    expect(gradeResponse(q, 102.01)).toBe(0);
    expect(gradeResponse(q, 97.9)).toBe(0);
    expect(gradeResponse(q, 'abc')).toBe(0);
  });

  it('numeric: ±0.5 absolute tolerance when the correct answer is 0', () => {
    const q = baseQuestion({ type: 'numeric', correctAnswer: 0, maxPoints: 1 });
    expect(gradeResponse(q, 0.4)).toBe(1);
    expect(gradeResponse(q, -0.5)).toBe(1);
    expect(gradeResponse(q, 0.51)).toBe(0);
  });

  it('short-response: case/whitespace/punctuation-insensitive match', () => {
    const q = baseQuestion({ type: 'short-response', correctAnswer: 'Paris', maxPoints: 1 });
    expect(gradeResponse(q, 'Paris')).toBe(1);
    expect(gradeResponse(q, 'paris')).toBe(1);
    expect(gradeResponse(q, '  PARIS! ')).toBe(1);
    expect(gradeResponse(q, 'Pa-ris.')).toBe(1);
    expect(gradeResponse(q, 'Lyon')).toBe(0);
    expect(gradeResponse(q, '')).toBe(0);
    expect(gradeResponse(q, 1)).toBe(0);
  });
});
