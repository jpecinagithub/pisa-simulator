// ─── Simulator contracts ────────────────────────────────────────────────────
// Everything under src/data/simulator/ is SIMULATOR-GENERATED DATA (original
// items written for this platform). It must never be mixed with OECD data.

import type { Domain } from './oecd';

export type LocalizedText = { en: string; es: string };

export type StimulusKind = 'text' | 'table' | 'list' | 'callout';

export interface PisaStimulus {
  kind: StimulusKind;
  /** paragraphs for text/callout */
  text?: LocalizedText;
  /** table headers */
  headers?: LocalizedText[];
  /** table body — language-neutral strings (numbers, short labels via LocalizedText not supported in cells; keep cells numeric or use en/es joined with " / ") */
  rows?: string[][];
  /** bullet items */
  items?: LocalizedText[];
  /** optional caption under the stimulus */
  caption?: LocalizedText;
}

export type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'numeric'
  | 'short-response';

export interface PisaQuestion {
  /** globally unique, e.g. "MATH-014" */
  id: string;
  domain: Domain;
  /** competency key, e.g. "math.formulating" — resolved to localized labels via i18n */
  competency: string;
  contentCategory?: string;
  context?: string;
  /** IRT difficulty parameter b (≈ -3 … +3). NEVER shown to the test taker. */
  difficulty: number;
  /** IRT discrimination parameter a (≈ 0.4 … 2.0) */
  discrimination: number;
  /** PISA-style proficiency level 1–6. NEVER shown during the test. */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  type: QuestionType;
  prompt: LocalizedText;
  /** for choice types; index-based answers */
  options?: LocalizedText[];
  /**
   * single-choice: option index (number)
   * multiple-choice: array of option indices (number[])
   * numeric: accepted number (tolerance ±2% unless specified in prompt)
   * short-response: accepted answer string (case/whitespace/punctuation-insensitive match)
   */
  correctAnswer: number | number[] | string;
  maxPoints: number;
  explanation: LocalizedText;
  /** estimated minutes for pacing/adaptive planning */
  estimatedMinutes: number;
}

export interface PisaUnit {
  /** globally unique, e.g. "MATH-U07" */
  id: string;
  domain: Domain;
  title: LocalizedText;
  intro?: LocalizedText;
  stimuli: PisaStimulus[];
  questions: PisaQuestion[];
}

export type TestMode = 'quick' | 'standard' | 'full';

export interface TestModeSpec {
  mode: TestMode;
  questionCount: number;
  minutes: number;
  label: LocalizedText;
  description: LocalizedText;
}

export interface TestResponse {
  questionId: string;
  /** raw user answer in the same shape as correctAnswer */
  answer: number | number[] | string | null;
  flagged: boolean;
  timeSpentSeconds: number;
  /** null = unanswered */
  points: number | null;
}

export interface TestSession {
  sessionId: string;
  participantName: string;
  language: 'en' | 'es';
  testMode: TestMode;
  /** ordered question ids (units may be interleaved per adaptive plan) */
  plan: string[];
  /** unit id per question, for stimulus grouping */
  unitOf: Record<string, string>;
  responses: Record<string, TestResponse>;
  currentIndex: number;
  startedAt: number;
  /** epoch ms when the countdown ends */
  endsAt: number;
  finishedAt: number | null;
  stage: number;
}

export interface DomainScore {
  domain: Domain;
  /** estimated PISA-style score (≈500 ± 100 scale) */
  score: number;
  /** indicative uncertainty range [lo, hi] */
  range: [number, number];
  /** estimated proficiency level 1–6 (may be "below1" / "above6" edges) */
  level: number;
  answered: number;
  correct: number;
  /** per-competency accuracy 0–1 */
  competencies: Record<string, number>;
}

export interface TestResult {
  sessionId: string;
  participantName: string;
  language: 'en' | 'es';
  testMode: TestMode;
  dateISO: string;
  domains: Record<Domain, DomainScore>;
  overall: number;
  overallRange: [number, number];
  totalAnswered: number;
  totalQuestions: number;
  totalTimeSeconds: number;
  strongest: Domain;
  weakest: Domain;
}
