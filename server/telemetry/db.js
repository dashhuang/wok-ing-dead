import { neon } from "@neondatabase/serverless";
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  return neon(process.env.DATABASE_URL);
}
// Atomic revision check: duplicates/out-of-order retries cannot resurrect a finished run.
export async function saveSnapshot(sql, p, environment) {
  const body = JSON.stringify(p);
  return sql`WITH accepted AS (
    INSERT INTO play_runs (run_id, player_id, seq, environment, payload)
    VALUES (${p.runId}::uuid, ${p.playerId}::uuid, ${p.seq}, ${environment}, ${body}::jsonb)
    ON CONFLICT (run_id) DO UPDATE SET seq = EXCLUDED.seq,
      payload = EXCLUDED.payload, last_seen = now()
    WHERE play_runs.player_id = EXCLUDED.player_id
      AND play_runs.seq < EXCLUDED.seq
      AND play_runs.payload->>'outcome' = 'active'
    RETURNING run_id
  ) INSERT INTO play_samples (run_id, seq, payload)
    SELECT run_id, ${p.seq}, ${body}::jsonb FROM accepted
    ON CONFLICT DO NOTHING`;
}

// One row per page load; a retried request with the same id is ignored.
export async function saveBootFailure(sql, p, environment) {
  return sql`INSERT INTO play_boot_failures (boot_id, player_id, environment, payload)
    VALUES (${p.bootId}::uuid, ${p.playerId}::uuid, ${environment}, ${JSON.stringify(p)}::jsonb)
    ON CONFLICT (boot_id) DO NOTHING`;
}
