// ─── scoring.test.ts ─────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import {
  confidenceRange,
  estimateTheta,
  levelFromScore,
  scoreFromTheta,
  type IrtItem,
} from './scoring';

function items(n: number, correct: boolean[], a = 1, b = 0): IrtItem[] {
  return Array.from({ length: n }, (_, i) => ({
    a,
    b,
    correct: correct[i % correct.length],
  }));
}

describe('estimateTheta', () => {
  it('is monotone: all-correct > mixed > all-wrong', () => {
    const hi = estimateTheta(items(20, [true]));
    const mid = estimateTheta(items(20, [true, false]));
    const lo = estimateTheta(items(20, [false]));
    expect(hi).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(lo);
  });

  it('stays bounded for extreme patterns (MAP prior)', () => {
    const hi = estimateTheta(items(60, [true], 2, -2));
    const lo = estimateTheta(items(60, [false], 2, 2));
    expect(hi).toBeLessThanOrEqual(4);
    expect(lo).toBeGreaterThanOrEqual(-4);
    expect(Number.isFinite(hi)).toBe(true);
    expect(Number.isFinite(lo)).toBe(true);
  });

  it('returns ~0 with no items (prior only)', () => {
    expect(estimateTheta([])).toBeCloseTo(0, 6);
  });

  it('more correct responses → higher theta', () => {
    const more = estimateTheta(items(10, [true, true, true, true, false]));
    const fewer = estimateTheta(items(10, [true, false, false, false, false]));
    expect(more).toBeGreaterThan(fewer);
  });

  it('all-correct on harder items → higher theta than on easier items', () => {
    const hard = estimateTheta(items(10, [true], 1, 1.5));
    const easy = estimateTheta(items(10, [true], 1, -1.5));
    expect(hard).toBeGreaterThan(easy);
  });
});

describe('scoreFromTheta', () => {
  it('maps theta 0 to 500', () => {
    expect(scoreFromTheta(0)).toBe(500);
  });

  it('scales ~100 points per theta unit and clamps to [200, 800]', () => {
    expect(scoreFromTheta(1)).toBe(600);
    expect(scoreFromTheta(-1)).toBe(400);
    expect(scoreFromTheta(4)).toBe(800);
    expect(scoreFromTheta(-4)).toBe(200);
    expect(scoreFromTheta(10)).toBe(800);
    expect(scoreFromTheta(-10)).toBe(200);
  });
});

describe('levelFromScore', () => {
  it.each([
    [300, 1],
    [419, 1],
    [420, 2],
    [481, 2],
    [482, 3],
    [544, 3],
    [545, 4],
    [606, 4],
    [607, 5],
    [668, 5],
    [669, 6],
    [800, 6],
  ])('score %i → level %i', (score, level) => {
    expect(levelFromScore(score)).toBe(level);
  });
});

describe('confidenceRange', () => {
  it('is wider for shorter tests and always ordered within [200, 800]', () => {
    const theta = 0.5;
    const short = items(10, [true, false]);
    const long = items(60, [true, false]);
    const [sLo, sHi] = confidenceRange(short, theta);
    const [lLo, lHi] = confidenceRange(long, theta);
    expect(sLo).toBeLessThan(sHi);
    expect(lLo).toBeLessThan(lHi);
    expect(sHi - sLo).toBeGreaterThan(lHi - lLo);
    for (const v of [sLo, sHi, lLo, lHi]) {
      expect(v).toBeGreaterThanOrEqual(200);
      expect(v).toBeLessThanOrEqual(800);
    }
  });

  it('handles an empty item set without collapsing', () => {
    const [lo, hi] = confidenceRange([], 0);
    expect(lo).toBeLessThan(hi);
    expect(lo).toBeGreaterThanOrEqual(200);
    expect(hi).toBeLessThanOrEqual(800);
  });
});
