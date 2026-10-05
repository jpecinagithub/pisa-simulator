// ─── Question-bank validation ────────────────────────────────────────────────
// Zod-based structural checks plus semantic diagnostics over the simulator
// question bank (SIMULATOR-GENERATED DATA). Used by the admin/data section
// and by the build to warn on invalid items. Pure functions, no DOM.

import { z } from 'zod';
import type { PisaUnit } from '../../types/simulator';

export interface BankDiagnostics {
  totalQuestions: number;
  byDomain: Record<string, number>;
  byLevel: Record<string, number>;
  /** question ids missing an English prompt/option/explanation */
  missingEn: string[];
  /** question ids missing a Spanish prompt/option/explanation */
  missingEs: string[];
  /** question ids with an invalid/absent answer or scoring metadata */
  invalidAnswers: string[];
  /** duplicated question ids and unit ids */
  duplicateIds: string[];
  /** question ids with difficulty outside [-3, 3] */
  badDifficulty: string[];
  /** question ids with an unknown competency key */
  badCompetency: string[];
}

/** Competency keys the engine knows how to label and aggregate. */
export const KNOWN_COMPETENCIES: ReadonlySet<string> = new Set([
  'math.reasoning',
  'math.formulating',
  'math.employing',
  'math.interpreting',
  'reading.locate',
  'reading.understand',
  'reading.integrate',
  'reading.evaluate',
  'reading.reflect',
  'science.explain',
  'science.enquiry',
  'science.evidence',
  'science.evaluate',
]);

const LocalizedTextSchema = z.object({
  en: z.string(),
  es: z.string(),
});

const QuestionShapeSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(['math', 'reading', 'science']),
  competency: z.string().min(1),
  difficulty: z.number(),
  discrimination: z.number(),
  level: z.number().int(),
  type: z.enum(['single-choice', 'multiple-choice', 'numeric', 'short-response']),
  prompt: LocalizedTextSchema,
  options: z.array(LocalizedTextSchema).optional(),
  correctAnswer: z.union([z.number(), z.array(z.number()), z.string()]),
  maxPoints: z.number(),
  explanation: LocalizedTextSchema,
  estimatedMinutes: z.number(),
});

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushUnique(list: string[], id: string): void {
  if (!list.includes(id)) list.push(id);
}

/**
 * Run all bank checks and return per-category diagnostics. An empty list in
 * every problem category means the bank is clean.
 */
export function validateBank(units: PisaUnit[]): BankDiagnostics {
  const diag: BankDiagnostics = {
    totalQuestions: 0,
    byDomain: {},
    byLevel: {},
    missingEn: [],
    missingEs: [],
    invalidAnswers: [],
    duplicateIds: [],
    badDifficulty: [],
    badCompetency: [],
  };

  const seenUnitIds = new Set<string>();
  const seenQuestionIds = new Set<string>();

  for (const unit of units) {
    if (typeof unit.id === 'string' && unit.id.length > 0) {
      if (seenUnitIds.has(unit.id)) pushUnique(diag.duplicateIds, unit.id);
      else seenUnitIds.add(unit.id);
    }
    for (const q of unit.questions ?? []) {
      diag.totalQuestions += 1;
      const id = typeof q.id === 'string' ? q.id : '(missing-id)';

      if (seenQuestionIds.has(id)) pushUnique(diag.duplicateIds, id);
      else seenQuestionIds.add(id);

      // 1. Structural shape via zod.
      const shape = QuestionShapeSchema.safeParse(q);
      if (!shape.success) {
        pushUnique(diag.invalidAnswers, id);
        continue; // semantic checks below need a sane shape
      }

      diag.byDomain[q.domain] = (diag.byDomain[q.domain] ?? 0) + 1;
      diag.byLevel[String(q.level)] = (diag.byLevel[String(q.level)] ?? 0) + 1;

      // 2. Translations.
      const enOk =
        hasText(q.prompt.en) &&
        hasText(q.explanation.en) &&
        (q.options ?? []).every((o) => hasText(o.en));
      const esOk =
        hasText(q.prompt.es) &&
        hasText(q.explanation.es) &&
        (q.options ?? []).every((o) => hasText(o.es));
      if (!enOk) pushUnique(diag.missingEn, id);
      if (!esOk) pushUnique(diag.missingEs, id);

      // 3. Difficulty / discrimination / level ranges.
      if (!Number.isFinite(q.difficulty) || q.difficulty < -3 || q.difficulty > 3) {
        pushUnique(diag.badDifficulty, id);
      }
      if (
        !Number.isFinite(q.discrimination) ||
        q.discrimination <= 0 ||
        q.discrimination > 2.5
      ) {
        pushUnique(diag.invalidAnswers, id);
      }
      if (q.level < 1 || q.level > 6) pushUnique(diag.invalidAnswers, id);
      if (!Number.isFinite(q.maxPoints) || q.maxPoints <= 0) {
        pushUnique(diag.invalidAnswers, id);
      }

      // 4. Competency key.
      if (!KNOWN_COMPETENCIES.has(q.competency)) pushUnique(diag.badCompetency, id);

      // 5. Answer consistency with the question type.
      const options = q.options ?? [];
      let answerOk = false;
      switch (q.type) {
        case 'single-choice':
          answerOk =
            options.length > 0 &&
            typeof q.correctAnswer === 'number' &&
            Number.isInteger(q.correctAnswer) &&
            q.correctAnswer >= 0 &&
            q.correctAnswer < options.length;
          break;
        case 'multiple-choice':
          answerOk =
            options.length > 0 &&
            Array.isArray(q.correctAnswer) &&
            q.correctAnswer.length > 0 &&
            q.correctAnswer.every(
              (v) => Number.isInteger(v) && v >= 0 && v < options.length,
            ) &&
            new Set(q.correctAnswer).size === q.correctAnswer.length;
          break;
        case 'numeric':
          answerOk = typeof q.correctAnswer === 'number' && Number.isFinite(q.correctAnswer);
          break;
        case 'short-response':
          answerOk = typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0;
          break;
      }
      if (!answerOk) pushUnique(diag.invalidAnswers, id);
    }
  }

  return diag;
}
