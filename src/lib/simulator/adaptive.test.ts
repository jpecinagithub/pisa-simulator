// ─── adaptive.test.ts ────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import {
  buildAdaptivePlan,
  buildNextStage,
  routeStage,
  TEST_MODE_SPECS,
  STAGE_CONFIG,
  DOMAIN_MINIMUMS,
} from './adaptive';
import type { Domain } from '../../types/oecd';
import type { PisaQuestion, PisaUnit, TestMode } from '../../types/simulator';

// ─── Fixture bank: 3 domains × 3 bands × 3 units × 4 questions = 108 items ───
const BAND_DIFFICULTY = { easy: -1.5, medium: 0, hard: 1.5 } as const;

function fixtureQuestion(id: string, domain: Domain, difficulty: number): PisaQuestion {
  return {
    id,
    domain,
    competency: `${domain}.employing`,
    difficulty,
    discrimination: 1,
    level: 3,
    type: 'single-choice',
    prompt: { en: `Prompt ${id}`, es: `Enunciado ${id}` },
    options: [
      { en: 'A', es: 'A' },
      { en: 'B', es: 'B' },
      { en: 'C', es: 'C' },
      { en: 'D', es: 'D' },
    ],
    correctAnswer: 0,
    maxPoints: 1,
    explanation: { en: 'Why', es: 'Por qué' },
    estimatedMinutes: 2,
  };
}

function fixtureBank(): PisaUnit[] {
  const units: PisaUnit[] = [];
  const domains: Domain[] = ['math', 'reading', 'science'];
  for (const domain of domains) {
    for (const band of ['easy', 'medium', 'hard'] as const) {
      for (let u = 0; u < 3; u++) {
        const unitId = `T-${domain}-${band}-${u}`;
        units.push({
          id: unitId,
          domain,
          title: { en: unitId, es: unitId },
          stimuli: [],
          questions: [0, 1, 2, 3].map((k) =>
            fixtureQuestion(`${unitId}-Q${k}`, domain, BAND_DIFFICULTY[band]),
          ),
        });
      }
    }
  }
  return units;
}

const byId = (units: PisaUnit[]) => {
  const map = new Map<string, PisaQuestion>();
  for (const u of units) for (const q of u.questions) map.set(q.id, q);
  return map;
};

function countDomains(ids: string[], units: PisaUnit[]): Record<Domain, number> {
  const map = byId(units);
  const counts: Record<Domain, number> = { math: 0, reading: 0, science: 0 };
  for (const id of ids) {
    const q = map.get(id);
    if (q) counts[q.domain] += 1;
  }
  return counts;
}

/** Simulate the full runner flow: stage 1 + routed follow-up stages. */
function simulateFullTest(mode: TestMode, units: PisaUnit[], seed: number) {
  const { stages } = STAGE_CONFIG[mode];
  const first = buildAdaptivePlan(mode, units, seed);
  let plan = [...first.plan];
  const unitOf = { ...first.unitOf };
  const used = new Set(plan);
  // Simulate a strong test taker: all correct → routed to hard bands.
  for (let stage = 2; stage <= stages; stage++) {
    const size = plan.length / (stage - 1);
    const next = buildNextStage(stage, size, size, used, {
      mode,
      domainCounts: countDomains(plan, units),
      units,
      seed: seed + stage,
    });
    plan.push(...next.questionIds);
    Object.assign(unitOf, next.unitOf);
    for (const id of next.questionIds) used.add(id);
  }
  return { plan, unitOf };
}

describe('routeStage', () => {
  it.each([
    [100, 100, 'hard'],
    [75, 100, 'hard'],
    [74, 100, 'medium'],
    [40, 100, 'medium'],
    [39, 100, 'easy'],
    [0, 100, 'easy'],
    [0, 0, 'easy'],
  ])('routeStage(%i, %i) → %s', (correct, total, band) => {
    expect(routeStage(correct, total)).toBe(band);
  });
});

describe('TEST_MODE_SPECS', () => {
  it('declares questions and minutes per mode', () => {
    expect(TEST_MODE_SPECS.quick).toEqual({ questions: 18, minutes: 25 });
    expect(TEST_MODE_SPECS.standard).toEqual({ questions: 36, minutes: 60 });
    expect(TEST_MODE_SPECS.full).toEqual({ questions: 64, minutes: 120 });
  });
});

describe('buildAdaptivePlan (stage 1)', () => {
  const units = fixtureBank();
  it.each([
    ['quick', 6],
    ['standard', 12],
    ['full', 16],
  ] as const)('mode %s builds a stage-1 plan of %i questions', (mode, size) => {
    const { plan, unitOf } = buildAdaptivePlan(mode, units, 42);
    expect(plan).toHaveLength(size);
    expect(Object.keys(unitOf)).toHaveLength(size);
    for (const id of plan) expect(unitOf[id]).toBeTruthy();
  });

  it('stage 1 uses the medium band and balances domains', () => {
    const map = byId(units);
    const { plan } = buildAdaptivePlan('standard', units, 7);
    for (const id of plan) {
      const b = map.get(id)!.difficulty;
      expect(b).toBeGreaterThanOrEqual(-0.75);
      expect(b).toBeLessThanOrEqual(0.75);
    }
    const counts = countDomains(plan, units);
    expect(counts.math).toBe(4);
    expect(counts.reading).toBe(4);
    expect(counts.science).toBe(4);
  });

  it('keeps each unit’s questions contiguous within a stage', () => {
    const { plan, unitOf } = buildAdaptivePlan('standard', units, 11);
    const positions = new Map<string, number[]>();
    plan.forEach((id, idx) => {
      const u = unitOf[id];
      if (!positions.has(u)) positions.set(u, []);
      positions.get(u)!.push(idx);
    });
    for (const idxs of positions.values()) {
      const min = Math.min(...idxs);
      const max = Math.max(...idxs);
      expect(max - min + 1).toBe(idxs.length);
    }
  });
});

describe('buildNextStage', () => {
  const units = fixtureBank();
  const map = byId(units);

  it('routes to the hard band after a strong stage', () => {
    const stage1 = buildAdaptivePlan('quick', units, 3);
    const next = buildNextStage(2, 6, 6, new Set(stage1.plan), {
      mode: 'quick',
      domainCounts: countDomains(stage1.plan, units),
      units,
      seed: 99,
    });
    expect(next.questionIds).toHaveLength(6);
    for (const id of next.questionIds) {
      const b = map.get(id)!.difficulty;
      expect(b).toBeGreaterThanOrEqual(0.5);
      expect(b).toBeLessThanOrEqual(2.2);
    }
  });

  it('routes to the easy band after a weak stage', () => {
    const stage1 = buildAdaptivePlan('quick', units, 3);
    const next = buildNextStage(2, 1, 6, new Set(stage1.plan), {
      mode: 'quick',
      domainCounts: countDomains(stage1.plan, units),
      units,
      seed: 99,
    });
    for (const id of next.questionIds) {
      const b = map.get(id)!.difficulty;
      expect(b).toBeGreaterThanOrEqual(-2.2);
      expect(b).toBeLessThanOrEqual(-0.5);
    }
  });

  it('never repeats a question from earlier stages', () => {
    const stage1 = buildAdaptivePlan('quick', units, 5);
    const next = buildNextStage(2, 3, 6, new Set(stage1.plan), {
      mode: 'quick',
      units,
      seed: 5,
    });
    for (const id of next.questionIds) {
      expect(stage1.plan).not.toContain(id);
    }
  });
});

describe('full adaptive flow (runner simulation)', () => {
  const units = fixtureBank();
  it.each([
    ['quick', 18],
    ['standard', 36],
    ['full', 64],
  ] as const)('mode %s completes %i questions total', (mode, total) => {
    const { plan, unitOf } = simulateFullTest(mode, units, 1234);
    expect(plan).toHaveLength(total);
    expect(new Set(plan).size).toBe(total); // no repeats
    expect(Object.keys(unitOf)).toHaveLength(total);
  });

  it.each(['quick', 'standard', 'full'] as const)(
    'mode %s meets whole-test domain minimums',
    (mode) => {
      const { plan } = simulateFullTest(mode, units, 777);
      const counts = countDomains(plan, units);
      const min = DOMAIN_MINIMUMS[mode];
      expect(counts.math).toBeGreaterThanOrEqual(min);
      expect(counts.reading).toBeGreaterThanOrEqual(min);
      expect(counts.science).toBeGreaterThanOrEqual(min);
    },
  );
});
