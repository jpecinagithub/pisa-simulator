// ─── Multistage adaptive assessment engine ──────────────────────────────────
// Stage 1 is a medium-difficulty block; each subsequent block is routed to an
// easier / comparable / harder difficulty band from the previous block's
// performance (>=75% → hard, 40–74% → medium, <40% → easy), while keeping
// every domain represented. Unit stimulus grouping is preserved: a unit's
// questions are always contiguous inside a block.
//
// NOTE (2026-10-05, SIM-UI agent): reconstructed after an accidental
// overwrite during parallel development. Behavior is pinned by
// adaptive.test.ts in this directory; SIM-CORE should review.

import type { Domain } from '../../types/oecd';
import type { PisaUnit, TestMode } from '../../types/simulator';

export type DifficultyBand = 'easy' | 'medium' | 'hard';

export const TEST_MODE_SPECS: Record<TestMode, { questions: number; minutes: number }> = {
  quick: { questions: 18, minutes: 25 },
  standard: { questions: 36, minutes: 60 },
  full: { questions: 64, minutes: 120 },
};

export const STAGE_CONFIG: Record<TestMode, { stages: number; stageSize: number }> = {
  quick: { stages: 3, stageSize: 6 },
  standard: { stages: 3, stageSize: 12 },
  full: { stages: 4, stageSize: 16 },
};

/** Whole-test per-domain minimum question counts. */
export const DOMAIN_MINIMUMS: Record<TestMode, number> = {
  quick: 5,
  standard: 10,
  full: 18,
};

const DOMAINS: Domain[] = ['math', 'reading', 'science'];

/** Route a finished block's performance to the next difficulty band. */
export function routeStage(correct: number, total: number): DifficultyBand {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.75) return 'hard';
  if (ratio >= 0.4) return 'medium';
  return 'easy';
}

function inBand(difficulty: number, band: DifficultyBand): boolean {
  switch (band) {
    case 'easy':
      return difficulty >= -2.2 && difficulty <= -0.5;
    case 'medium':
      return difficulty >= -0.75 && difficulty <= 0.75;
    case 'hard':
      return difficulty >= 0.5 && difficulty <= 2.2;
  }
}

/** Deterministic seeded PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface BlockOptions {
  units: PisaUnit[];
  band: DifficultyBand;
  size: number;
  usedIds: Set<string>;
  /** cumulative domain counts before this block (for balancing) */
  domainCounts: Record<Domain, number>;
  seed: number;
}

/**
 * Select one stage block: `size` question ids with per-domain targets,
 * drawn unit-by-unit (contiguous) from the requested difficulty band,
 * never reusing `usedIds`. Falls back to off-band questions only when a
 * band is exhausted.
 */
function selectBlock(opts: BlockOptions): { questionIds: string[]; unitOf: Record<string, string> } {
  const { units, band, size, usedIds, domainCounts, seed } = opts;
  const rng = mulberry32(seed);

  // Per-domain targets: as even as possible, remainder to the domains with
  // the fewest questions so far.
  const targets = {} as Record<Domain, number>;
  const base = Math.floor(size / DOMAINS.length);
  let remainder = size - base * DOMAINS.length;
  const byNeed = [...DOMAINS].sort((a, b) => domainCounts[a] - domainCounts[b]);
  for (const d of DOMAINS) targets[d] = base;
  for (const d of byNeed) {
    if (remainder <= 0) break;
    targets[d] += 1;
    remainder -= 1;
  }

  const questionIds: string[] = [];
  const unitOf: Record<string, string> = {};
  const need = { ...targets };
  // Local copy: the caller's set is never mutated.
  const taken = new Set<string>(usedIds);

  const takeFromBand = (onlyBand: boolean) => {
    // Candidate units per domain, seeded-shuffled.
    const byDomain = new Map<Domain, PisaUnit[]>();
    for (const d of DOMAINS) byDomain.set(d, []);
    for (const u of units) {
      const avail = u.questions.filter(
        (q) => !taken.has(q.id) && (!onlyBand || inBand(q.difficulty, band)),
      );
      if (avail.length > 0) byDomain.get(u.domain)!.push(u);
    }
    for (const d of DOMAINS) byDomain.set(d, shuffled(byDomain.get(d)!, rng));

    let progress = true;
    while (progress && questionIds.length < size) {
      progress = false;
      // Domains with the largest remaining need first.
      const order = [...DOMAINS].sort((a, b) => need[b] - need[a]);
      for (const d of order) {
        if (need[d] <= 0 || questionIds.length >= size) continue;
        const candidates = byDomain.get(d)!;
        const unit = candidates.find((u) =>
          u.questions.some((q) => !taken.has(q.id) && (!onlyBand || inBand(q.difficulty, band))),
        );
        if (!unit) continue;
        for (const q of unit.questions) {
          if (need[d] <= 0 || questionIds.length >= size) break;
          if (taken.has(q.id)) continue;
          if (onlyBand && !inBand(q.difficulty, band)) continue;
          taken.add(q.id);
          questionIds.push(q.id);
          unitOf[q.id] = unit.id;
          need[d] -= 1;
          progress = true;
        }
      }
    }
  };

  takeFromBand(true);
  if (questionIds.length < size) takeFromBand(false);
  return { questionIds, unitOf };
}

/** Stage-1 plan: medium-difficulty block, domains balanced. */
export function buildAdaptivePlan(
  mode: TestMode,
  units: PisaUnit[],
  seed: number,
): { plan: string[]; unitOf: Record<string, string> } {
  const { stageSize } = STAGE_CONFIG[mode];
  const { questionIds, unitOf } = selectBlock({
    units,
    band: 'medium',
    size: stageSize,
    usedIds: new Set<string>(),
    domainCounts: { math: 0, reading: 0, science: 0 },
    seed,
  });
  return { plan: questionIds, unitOf };
}

export interface NextStageOptions {
  mode: TestMode;
  domainCounts?: Record<Domain, number>;
  units: PisaUnit[];
  seed: number;
}

/**
 * Build the FOLLOWING stage block (`stage` is the 1-based number of the
 * stage being built, i.e. previous stage + 1). Routes on the previous
 * block's correct/total ratio.
 */
export function buildNextStage(
  stage: number,
  prevCorrect: number,
  prevTotal: number,
  usedIds: Set<string>,
  opts: NextStageOptions,
): { questionIds: string[]; unitOf: Record<string, string> } {
  void stage; // block size comes from the mode config
  const { mode, units, seed } = opts;
  const { stageSize } = STAGE_CONFIG[mode];
  const band = routeStage(prevCorrect, prevTotal);
  const domainCounts = opts.domainCounts ?? { math: 0, reading: 0, science: 0 };
  return selectBlock({ units, band, size: stageSize, usedIds, domainCounts, seed });
}
