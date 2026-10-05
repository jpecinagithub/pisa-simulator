// ─── Question-bank access ───────────────────────────────────────────────────
// Thin indexed access over the SIMULATOR-GENERATED DATA units
// (src/data/simulator/units/*). Owned by SIM-CORE.

import type { PisaQuestion, PisaUnit } from '../../types/simulator';
import { MATH_UNITS } from '../../data/simulator/units/math';
import { READING_UNITS } from '../../data/simulator/units/reading';
import { SCIENCE_UNITS } from '../../data/simulator/units/science';

const UNITS: PisaUnit[] = [...MATH_UNITS, ...READING_UNITS, ...SCIENCE_UNITS];

const byUnitId = new Map<string, PisaUnit>();
const byQuestionId = new Map<string, PisaQuestion>();
const unitOfQuestion = new Map<string, PisaUnit>();
for (const unit of UNITS) {
  if (!byUnitId.has(unit.id)) byUnitId.set(unit.id, unit);
  for (const q of unit.questions) {
    if (!byQuestionId.has(q.id)) byQuestionId.set(q.id, q);
    if (!unitOfQuestion.has(q.id)) unitOfQuestion.set(q.id, unit);
  }
}

/** All units in the simulator bank (stable order: math, reading, science). */
export function getAllUnits(): PisaUnit[] {
  return UNITS;
}

/** Question by global id, or undefined when unknown. */
export function getQuestionById(id: string): PisaQuestion | undefined {
  return byQuestionId.get(id);
}

/** The unit a question belongs to, or undefined when unknown. */
export function getUnitOfQuestion(id: string): PisaUnit | undefined {
  return unitOfQuestion.get(id);
}

/** Unit by global id (e.g. "MATH-U07"), or undefined when unknown. */
export function getUnitById(id: string): PisaUnit | undefined {
  return byUnitId.get(id);
}
