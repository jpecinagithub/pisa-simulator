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

// Best-effort in-memory rate limit (per serverless instance).
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const window = hits.get(ip) ?? [];
  const recent = window.filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent.slice(-20));
  return recent.length > 10;
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
    if (rateLimited(ip)) {
      return Response.json({ error: 'Too many requests' }, { status: 429, headers });
    }

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
      // duplicate session_id → already published
      return Response.json({ error: 'Result already published' }, { status: 409, headers });
    }
    return Response.json({ ok: true }, { headers });
  } catch (err) {
    console.error('leaderboard submit failed', err);
    return Response.json({ error: 'Submission failed' }, { status: 500, headers });
  }
}
