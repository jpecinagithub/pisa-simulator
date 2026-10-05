// ─── Result construction ─────────────────────────────────────────────────────
// Builds the personal TestResult from a finished TestSession: per-domain
// 2PL theta estimates mapped to the reporting scale, uncertainty ranges,
// proficiency levels, per-competency accuracy, and aggregate indicators.
// Pure function — no DOM, no network.

import type { Domain } from '../../types/oecd';
import type { DomainScore, TestResult, TestSession } from '../../types/simulator';
import { getQuestionById } from './bank';
import {
  confidenceRange,
  estimateTheta,
  levelFromScore,
  scoreFromTheta,
  type IrtItem,
} from './scoring';

const DOMAINS: Domain[] = ['math', 'reading', 'science'];

/** A response counts as correct when it earned at least half the max points. */
function isCorrect(points: number, maxPoints: number): boolean {
  return points >= maxPoints * 0.5;
}

function buildDomainScore(domain: Domain, session: TestSession): DomainScore {
  const items: IrtItem[] = [];
  let answered = 0;
  let correct = 0;
  const earnedByCompetency: Record<string, number> = {};
  const maxByCompetency: Record<string, number> = {};

  for (const questionId of session.plan) {
    const question = getQuestionById(questionId);
    if (!question || question.domain !== domain) continue;
    const response = session.responses[questionId];
    if (!response || response.points === null || response.points === undefined) continue;
    answered += 1;
    const points = Math.max(0, response.points);
    if (isCorrect(points, question.maxPoints)) correct += 1;
    items.push({
      a: question.discrimination,
      b: question.difficulty,
      correct: isCorrect(points, question.maxPoints),
    });
    earnedByCompetency[question.competency] =
      (earnedByCompetency[question.competency] ?? 0) + points;
    maxByCompetency[question.competency] =
      (maxByCompetency[question.competency] ?? 0) + question.maxPoints;
  }

  const theta = estimateTheta(items);
  const score = scoreFromTheta(theta);
  const range = confidenceRange(items, theta);

  const competencies: Record<string, number> = {};
  for (const key of Object.keys(maxByCompetency)) {
    const max = maxByCompetency[key];
    competencies[key] = max > 0 ? earnedByCompetency[key] / max : 0;
  }

  return {
    domain,
    score,
    range,
    level: levelFromScore(score),
    answered,
    correct,
    competencies,
  };
}

/** Build the full personal report from a (finished) test session. */
export function buildResult(session: TestSession): TestResult {
  const domains = {
    math: buildDomainScore('math', session),
    reading: buildDomainScore('reading', session),
    science: buildDomainScore('science', session),
  } satisfies Record<Domain, DomainScore>;

  const scores = DOMAINS.map((d) => domains[d].score);
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const overallRange: [number, number] = [
    Math.min(...DOMAINS.map((d) => domains[d].range[0])),
    Math.max(...DOMAINS.map((d) => domains[d].range[1])),
  ];

  let totalAnswered = 0;
  let totalTimeSeconds = 0;
  for (const d of DOMAINS) totalAnswered += domains[d].answered;
  for (const response of Object.values(session.responses)) {
    totalTimeSeconds += response.timeSpentSeconds ?? 0;
  }

  let strongest: Domain = 'math';
  let weakest: Domain = 'math';
  for (const d of DOMAINS) {
    if (domains[d].score > domains[strongest].score) strongest = d;
    if (domains[d].score < domains[weakest].score) weakest = d;
  }

  return {
    sessionId: session.sessionId,
    participantName: session.participantName,
    language: session.language,
    testMode: session.testMode,
    dateISO: new Date(session.finishedAt ?? Date.now()).toISOString(),
    domains,
    overall,
    overallRange,
    totalAnswered,
    totalQuestions: session.plan.length,
    totalTimeSeconds: Math.round(totalTimeSeconds),
    strongest,
    weakest,
  };
}
