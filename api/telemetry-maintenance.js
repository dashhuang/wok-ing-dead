import { timingSafeEqual } from "node:crypto";
import { database } from "../server/telemetry/db.js";
import { noCache } from "../server/telemetry/http.js";
export default async function handler(req, res) {
  noCache(res);
  if (req.method !== "GET") return res.status(405).end();
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`);
  const actual = Buffer.from(req.headers.authorization || "");
  if (
    !process.env.CRON_SECRET ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  )
    return res.status(401).end();
  try {
    const sql = database();
    await sql`DELETE FROM play_samples WHERE received_at < now()-interval '30 days'`;
    await sql`DELETE FROM play_runs WHERE first_seen < now()-interval '90 days'`;
    await sql`DELETE FROM play_limits WHERE minute < ${Math.floor(Date.now() / 60000) - 1440}`;
    return res.status(204).end();
  } catch {
    return res.status(503).end();
  }
}
