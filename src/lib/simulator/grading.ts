// ─── Response grading ───────────────────────────────────────────────────────
// Deterministic all-or-nothing scoring rules per question type.
//
// NOTE (2026-10-05, SIM-UI agent): reconstructed after an accidental
// overwrite during parallel development. Behavior is pinned by
// grading.test.ts in this directory; SIM-CORE should review.

import type { PisaQuestion } from '../../types/simulator';

/** Lowercase, strip diacritics, drop everything but a–z0–9. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Grade one response. Returns earned points (full maxPoints or 0 — the bank
 * uses all-or-nothing scoring). `null` (unanswered) always scores 0.
 */
export function gradeResponse(
  q: PisaQuestion,
  answer: number | number[] | string | null,
): number {
  if (answer === null || answer === undefined) return 0;

  switch (q.type) {
    case 'single-choice': {
      return typeof answer === 'number' && answer === q.correctAnswer ? q.maxPoints : 0;
    }
    case 'multiple-choice': {
      if (!Array.isArray(answer) || !Array.isArray(q.correctAnswer)) return 0;
      const a = [...answer].sort((x, y) => x - y);
      const c = [...q.correctAnswer].sort((x, y) => x - y);
      const exact = a.length === c.length && a.every((v, i) => v === c[i]);
      return exact ? q.maxPoints : 0;
    }
    case 'numeric': {
      if (typeof answer !== 'number' || !Number.isFinite(answer)) return 0;
      if (typeof q.correctAnswer !== 'number') return 0;
      const expected = q.correctAnswer;
      // ±2% tolerance (inclusive); ±0.5 absolute when the answer is 0.
      const tol = expected === 0 ? 0.5 : Math.abs(expected) * 0.02;
      return Math.abs(answer - expected) <= tol + 1e-9 ? q.maxPoints : 0;
    }
    case 'short-response': {
      if (typeof answer !== 'string' || typeof q.correctAnswer !== 'string') return 0;
      const norm = normalize(answer);
      if (norm.length === 0) return 0;
      return norm === normalize(q.correctAnswer) ? q.maxPoints : 0;
    }
    default:
      return 0;
  }
}
