// ─── leaderboard-submit load test ──────────────────────────────────────────
// Simulates the "50 simultaneous users" scenario: 50 concurrent submissions
// from the SAME public IP (e.g. a classroom behind one NAT), each with a
// distinct session. None may be rate-limited (429); all must settle without
// hanging or unhandled errors. A second block verifies per-session abuse
// protection still kicks in.
//
// The database is unreachable on purpose (127.0.0.1:1 refuses fast): the
// point is handler concurrency behavior, not Neon itself. Expected status
// for valid payloads is therefore 500 (DB unreachable), never 429/hang.
import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/db';

vi.spyOn(console, 'error').mockImplementation(() => {});

const submit = (await import('./leaderboard-submit')).default;
const board = (await import('./leaderboard')).default;

const SALT = 'pisa-simulator-v1';

function signedBody(sessionId: string, name: string, mode = 'quick', score = 512) {
  const proof = createHash('sha256')
    .update(`${SALT}|${sessionId}|${mode}|${score}|${name}`)
    .digest('hex');
  return { name, mode, score, sessionId, proof };
}

function post(body: unknown, ip = '203.0.113.7'): Request {
  return new Request('https://app.example/api/leaderboard-submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('leaderboard under concurrent load', () => {
  it('50 simultaneous submissions from one IP: all settle, none rate-limited', async () => {
    const bodies = Array.from({ length: 50 }, (_, i) =>
      signedBody(randomUUID(), `Student ${i + 1}`),
    );
    const results = await Promise.all(
      bodies.map(async (b) => {
        const res = await submit(post(b));
        return res.status;
      }),
    );
    expect(results).toHaveLength(50);
    // DB unreachable -> 500 for every valid payload; 429 would mean the
    // classroom got locked out by the rate limiter.
    expect(results.every((s) => s === 500)).toBe(true);
    expect(results.filter((s) => s === 429)).toHaveLength(0);
  }, 60_000);

  it('per-session abuse protection: 6 rapid retries of one session get throttled', async () => {
    const sessionId = randomUUID();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await submit(post(signedBody(sessionId, 'Spammer')));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 500)).toBe(true);
    expect(statuses[5]).toBe(429);
  }, 30_000);

  it('invalid payloads are rejected fast without touching the limiter', async () => {
    const bad = await submit(post({ name: '', mode: 'quick', score: 512, sessionId: randomUUID(), proof: 'x' }));
    expect(bad.status).toBe(400);
    const badScore = await submit(
      post(signedBody(randomUUID(), 'Cheater', 'quick', 9999)),
    );
    expect(badScore.status).toBe(400);
  });

  it('leaderboard GET stays read-only and settles under concurrency', async () => {
    const reqs = Array.from(
      { length: 25 },
      () => new Request('https://app.example/api/leaderboard?mode=quick'),
    );
    const statuses = await Promise.all(reqs.map(async (r) => (await board(r)).status));
    expect(statuses.every((s) => s === 500)).toBe(true); // DB unreachable, handled
  }, 30_000);
});
