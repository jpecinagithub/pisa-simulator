// ─── IRT-inspired scoring primitives ────────────────────────────────────────
// Simplified 2PL item-response model with a standard-normal (MAP) prior:
//   P(correct) = 1 / (1 + exp(-a·(theta - b)))
// Ability theta is estimated by Newton–Raphson on the log-posterior, then
// mapped to the familiar ~500 ± 100 reporting scale.
//
// NOTE (2026-10-05, SIM-UI agent): reconstructed after an accidental
// overwrite during parallel development. Behavior is pinned by
// scoring.test.ts in this directory and by report.ts (imports
// estimateTheta, scoreFromTheta, confidenceRange, levelFromScore, IrtItem
// from './scoring'); SIM-CORE should review.

export interface IrtItem {
  /** discrimination a (≈ 0.4 … 2.0) */
  a: number;
  /** difficulty b (≈ -3 … +3) */
  b: number;
  correct: boolean;
}

const THETA_MIN = -4;
const THETA_MAX = 4;

function logistic(x: number): number {
  // Numerically stable sigmoid.
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/**
 * MAP estimate of ability theta under a standard-normal prior.
 * Bounded to [-4, 4]; returns ~0 when there are no items.
 */
export function estimateTheta(items: IrtItem[]): number {
  let theta = 0;
  for (let iter = 0; iter < 50; iter++) {
    let grad = -theta; // log-prior derivative
    let hess = -1; // log-prior second derivative
    for (const item of items) {
      const p = logistic(item.a * (theta - item.b));
      grad += item.a * ((item.correct ? 1 : 0) - p);
      hess -= item.a * item.a * p * (1 - p);
    }
    if (hess === 0) break;
    const step = grad / hess;
    theta -= step;
    if (theta < THETA_MIN) theta = THETA_MIN;
    if (theta > THETA_MAX) theta = THETA_MAX;
    if (Math.abs(step) < 1e-8) break;
  }
  return Math.min(THETA_MAX, Math.max(THETA_MIN, theta));
}

/** Map theta to the reporting scale (≈500, SD≈100), clamped to [200, 800]. */
export function scoreFromTheta(theta: number): number {
  return Math.min(800, Math.max(200, Math.round(500 + 100 * theta)));
}

/** PISA-style proficiency level cutoffs on the reporting scale. */
export function levelFromScore(score: number): number {
  if (score < 420) return 1;
  if (score < 482) return 2;
  if (score < 545) return 3;
  if (score < 607) return 4;
  if (score < 669) return 5;
  return 6;
}

/**
 * Indicative uncertainty range for a theta estimate: ±1.96·SE mapped to the
 * reporting scale, where SE comes from test information plus the MAP prior
 * precision. Shorter tests → wider ranges. Always ordered within [200, 800].
 */
export function confidenceRange(items: IrtItem[], theta: number): [number, number] {
  let info = 1; // MAP prior precision
  for (const item of items) {
    const p = logistic(item.a * (theta - item.b));
    info += item.a * item.a * p * (1 - p);
  }
  const se = 1 / Math.sqrt(info);
  const lo = scoreFromTheta(theta - 1.96 * se);
  const hi = scoreFromTheta(theta + 1.96 * se);
  return [Math.min(lo, hi), Math.max(lo, hi)];
}
