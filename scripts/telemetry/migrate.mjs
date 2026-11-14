import { database } from "../../server/telemetry/db.js";
const sql = database();
await sql`CREATE TABLE IF NOT EXISTS play_runs (
  run_id uuid PRIMARY KEY, player_id uuid NOT NULL, seq integer NOT NULL,
  environment text NOT NULL, first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL
)`;
await sql`CREATE INDEX IF NOT EXISTS play_runs_first_seen ON play_runs(first_seen)`;
await sql`CREATE TABLE IF NOT EXISTS play_samples (
  run_id uuid NOT NULL REFERENCES play_runs(run_id) ON DELETE CASCADE,
  seq integer NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL, PRIMARY KEY(run_id,seq)
)`;
await sql`CREATE INDEX IF NOT EXISTS play_samples_received_at ON play_samples(received_at)`;
await sql`CREATE TABLE IF NOT EXISTS play_limits (
  bucket text NOT NULL, minute bigint NOT NULL, requests integer NOT NULL,
  PRIMARY KEY(bucket,minute)
)`;
await sql`CREATE TABLE IF NOT EXISTS play_boot_failures (
  boot_id uuid PRIMARY KEY, player_id uuid NOT NULL, environment text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL
)`;
await sql`CREATE INDEX IF NOT EXISTS play_boot_failures_received_at ON play_boot_failures(received_at)`;
await sql`CREATE OR REPLACE VIEW play_run_results AS
  SELECT *, CASE WHEN payload->>'outcome'='active' AND last_seen < now()-interval '5 minutes'
  THEN 'interrupted' ELSE payload->>'outcome' END AS outcome FROM play_runs`;
console.log("Telemetry schema ready");
