// Leaderboard client — talks to the Vercel serverless API.
// Never sends: participant answers, report details, or any personal data
// beyond the explicitly consented name + score + mode.
import type { TestMode, TestResult } from '../types/simulator';

export interface BoardEntry {
  name: string;
  mode: TestMode;
  score: number;
  created_at: string;
}

const PUBLIC_SALT = 'pisa-simulator-v1';

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === 'string' && e.length > 0) return e;
  }
  return fallback;
}

/** GET /api/leaderboard?mode — top 25 for one test mode. Throws on failure. */
export async function fetchBoard(mode: TestMode): Promise<BoardEntry[]> {
  let res: Response;
  try {
    res = await fetch(`/api/leaderboard?mode=${encodeURIComponent(mode)}`, {
      cache: 'no-store',
    });
  } catch {
    throw new Error('network');
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(errorMessage(data, 'Unable to load leaderboard'));
  }
  const entries = (data as { entries?: unknown }).entries;
  return Array.isArray(entries) ? (entries as BoardEntry[]) : [];
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * POST /api/leaderboard-submit — publishes a consented result.
 * The proof checksum must match api/leaderboard-submit.ts exactly:
 *   sha256("pisa-simulator-v1|sessionId|mode|score|name")
 * with name trimmed and score an integer in [200, 800].
 */
export async function submitScore(result: TestResult): Promise<void> {
  const name = result.participantName.trim();
  const score = Math.min(800, Math.max(200, Math.round(result.overall)));
  const payload = `${PUBLIC_SALT}|${result.sessionId}|${result.testMode}|${score}|${name}`;
  const proof = await sha256Hex(payload);

  let res: Response;
  try {
    res = await fetch('/api/leaderboard-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mode: result.testMode,
        score,
        sessionId: result.sessionId,
        proof,
      }),
    });
  } catch {
    throw new Error('network');
  }
  if (res.status === 409) throw new Error('duplicate');
  if (res.status === 429) throw new Error('rate_limited');
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(errorMessage(data, 'Submission failed'));
  }
}
