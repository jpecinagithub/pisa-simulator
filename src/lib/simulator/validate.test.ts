// ─── validate.test.ts ────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { validateBank } from './validate';
import type { PisaQuestion, PisaUnit } from '../../types/simulator';

function question(id: string, overrides: Partial<PisaQuestion> = {}): PisaQuestion {
  return {
    id,
    domain: 'math',
    competency: 'math.employing',
    difficulty: 0,
    discrimination: 1,
    level: 3,
    type: 'single-choice',
    prompt: { en: `Prompt ${id}`, es: `Enunciado ${id}` },
    options: [
      { en: 'A', es: 'A' },
      { en: 'B', es: 'B' },
      { en: 'C', es: 'C' },
    ],
    correctAnswer: 0,
    maxPoints: 1,
    explanation: { en: 'Why', es: 'Por qué' },
    estimatedMinutes: 2,
    ...overrides,
  };
}

function unit(id: string, questions: PisaQuestion[]): PisaUnit {
  return {
    id,
    domain: 'math',
    title: { en: id, es: id },
    stimuli: [],
    questions,
  };
}

describe('validateBank', () => {
  it('reports a clean bank with no problems', () => {
    const diag = validateBank([unit('U-1', [question('Q-1'), question('Q-2')])]);
    expect(diag.totalQuestions).toBe(2);
    expect(diag.byDomain).toEqual({ math: 2 });
    expect(diag.byLevel).toEqual({ '3': 2 });
    expect(diag.missingEn).toEqual([]);
    expect(diag.missingEs).toEqual([]);
    expect(diag.invalidAnswers).toEqual([]);
    expect(diag.duplicateIds).toEqual([]);
    expect(diag.badDifficulty).toEqual([]);
    expect(diag.badCompetency).toEqual([]);
  });

  it('detects duplicate question ids and unit ids', () => {
    const diag = validateBank([
      unit('U-DUP', [question('Q-DUP')]),
      unit('U-DUP', [question('Q-DUP'), question('Q-OTHER')]),
    ]);
    expect(diag.duplicateIds).toContain('Q-DUP');
    expect(diag.duplicateIds).toContain('U-DUP');
    expect(diag.duplicateIds).not.toContain('Q-OTHER');
  });

  it('detects missing translations', () => {
    const diag = validateBank([
      unit('U-1', [
        question('Q-NO-ES', { prompt: { en: 'Prompt', es: '   ' } }),
        question('Q-NO-EN', {
          explanation: { en: '', es: 'Explicación' },
          options: [{ en: '', es: 'A' }],
        }),
      ]),
    ]);
    expect(diag.missingEs).toContain('Q-NO-ES');
    expect(diag.missingEn).toContain('Q-NO-EN');
    expect(diag.missingEn).not.toContain('Q-NO-ES');
  });

  it('detects invalid answers per question type', () => {
    const diag = validateBank([
      unit('U-1', [
        // single-choice: index out of range
        question('Q-BAD-SINGLE', { correctAnswer: 7 }),
        // multiple-choice: empty selection
        question('Q-BAD-MULTI', { type: 'multiple-choice', correctAnswer: [] }),
        // numeric: non-numeric accepted value
        question('Q-BAD-NUM', { type: 'numeric', correctAnswer: 'x' as unknown as number }),
        // short-response: empty accepted string
        question('Q-BAD-SHORT', { type: 'short-response', correctAnswer: '  ' }),
        // choice type without options
        question('Q-NO-OPTS', { options: undefined }),
      ]),
    ]);
    for (const id of ['Q-BAD-SINGLE', 'Q-BAD-MULTI', 'Q-BAD-NUM', 'Q-BAD-SHORT', 'Q-NO-OPTS']) {
      expect(diag.invalidAnswers).toContain(id);
    }
  });

  it('detects out-of-range difficulty, discrimination and unknown competencies', () => {
    const diag = validateBank([
      unit('U-1', [
        question('Q-BAD-DIFF', { difficulty: 5 }),
        question('Q-BAD-DISC', { discrimination: 0 }),
        question('Q-BAD-COMP', { competency: 'math.bogus' }),
        question('Q-BAD-LEVEL', { level: 9 as unknown as 1 }),
      ]),
    ]);
    expect(diag.badDifficulty).toContain('Q-BAD-DIFF');
    expect(diag.invalidAnswers).toContain('Q-BAD-DISC');
    expect(diag.invalidAnswers).toContain('Q-BAD-LEVEL');
    expect(diag.badCompetency).toContain('Q-BAD-COMP');
  });
});
