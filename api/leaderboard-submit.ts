// POST /api/leaderboard-submit
// Body: { name, mode, score, sessionId, proof }
// Server-side validation: shape, ranges, plausibility, duplicates, rate limit.
// `proof` is an HMAC-style checksum the client computes over a canonical
// payload with a public salt — it stops casual tampering, not determined
// attackers; impossible scores are rejected by range checks regardless.

import { createHash, randomUUID } from 'node:crypto';

const MODES = ['full', 'standard', 'quick'] as const;
const PUBLIC_SALT = 'pisa-simulator-v1';
const MIN_SCORE = 200;
const MAX_SCORE = 800;

// Best-effort in-memory rate limits (per serverless instance).
// Two buckets: a generous per-IP budget so a whole classroom behind one NAT
// never locks itself out, plus a tight per-session budget (one assessment
// session only needs a couple of publish attempts).
const hitsByIp = new Map<string, number[]>();
const hitsBySession = new Map<string, number[]>();

function countRecent(hits: Map<string, number[]>, key: string, windowMs: number, maxKeep: number): number {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent.slice(-maxKeep));
  return recent.length;
}

function rateLimited(ip: string, sessionId: string): boolean {
  if (countRecent(hitsByIp, ip, 60_000, 240) > 120) return true;
  if (countRecent(hitsBySession, sessionId, 60_000, 10) > 5) return true;
  return false;
}

function validUUID(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

export default async function handler(req: Request): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  }
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    const body = (await req.json()) as Record<string, unknown>;
    const { name, mode, score, sessionId, proof } = body;

    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 40) {
      return Response.json({ error: 'Invalid name' }, { status: 400, headers });
    }
    if (!(MODES as readonly string[]).includes(mode as string)) {
      return Response.json({ error: 'Invalid mode' }, { status: 400, headers });
    }
    if (typeof score !== 'number' || !Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
      return Response.json({ error: 'Impossible score rejected' }, { status: 400, headers });
    }
    if (!validUUID(sessionId)) {
      return Response.json({ error: 'Invalid session' }, { status: 400, headers });
    }
    if (rateLimited(ip, sessionId)) {
      return Response.json({ error: 'Too many requests' }, { status: 429, headers });
    }

    // Checksum: sha256(salt | sessionId | mode | score | name)
    const expected = createHash('sha256')
      .update(`${PUBLIC_SALT}|${sessionId}|${mode}|${score}|${name.trim()}`)
      .digest('hex');
    if (proof !== expected) {
      return Response.json({ error: 'Integrity check failed' }, { status: 400, headers });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return Response.json({ error: 'Leaderboard unavailable' }, { status: 503, headers });
    }
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);
    const id = randomUUID();
    try {
      await sql`
        INSERT INTO leaderboard_entries (id, name, mode, score, session_id)
        VALUES (${id}, ${name.trim()}, ${mode as string}, ${score}, ${sessionId as string})
      `;
    } catch (e) {
      // Unique violation on session_id -> already published. Any other error
      // (connection loss, timeouts) is a genuine failure, not a duplicate.
      const code = (e as { code?: unknown } | null)?.code;
      if (code === '23505') {
        return Response.json({ error: 'Result already published' }, { status: 409, headers });
      }
      console.error('leaderboard insert failed', e);
      return Response.json({ error: 'Submission failed' }, { status: 500, headers });
    }
    return Response.json({ ok: true }, { headers });
  } catch (err) {
    console.error('leaderboard submit failed', err);
    return Response.json({ error: 'Submission failed' }, { status: 500, headers });
  }
}
