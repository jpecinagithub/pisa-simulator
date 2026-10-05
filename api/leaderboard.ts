// GET /api/leaderboard?mode=full|standard|quick
// Returns the top 25 simulator scores for a test mode.
// Requires DATABASE_URL (Neon Postgres). Table: leaderboard_entries
//   (id uuid pk, name text, mode text, score int, created_at timestamptz,
//    session_id text unique)

interface Entry {
  name: string;
  mode: string;
  score: number;
  created_at: string;
}

const MODES = ['full', 'standard', 'quick'] as const;

export default async function handler(req: Request): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') ?? 'full';
    if (!(MODES as readonly string[]).includes(mode)) {
      return Response.json({ error: 'Invalid mode' }, { status: 400, headers });
    }
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return Response.json({ error: 'Leaderboard unavailable', entries: [] }, { status: 503, headers });
    }
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);
    const rows = (await sql`
      SELECT name, mode, score, created_at FROM leaderboard_entries
      WHERE mode = ${mode}
      ORDER BY score DESC, created_at ASC
      LIMIT 25
    `) as unknown as Entry[];
    return Response.json({ entries: rows }, { headers });
  } catch (err) {
    console.error('leaderboard GET failed', err);
    return Response.json({ error: 'Unable to load leaderboard', entries: [] }, { status: 500, headers });
  }
}
