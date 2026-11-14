import { createHmac } from "node:crypto";
import { parseBoot, parseSnapshot } from "../server/telemetry/schema.js";
import {
  database,
  saveBootFailure,
  saveSnapshot,
} from "../server/telemetry/db.js";
import { noCache } from "../server/telemetry/http.js";

export default async function handler(req, res) {
  noCache(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const origins = (
    process.env.TELEMETRY_ORIGINS || "https://wok-ing-dead.vercel.app"
  ).split(",");
  if (!origins.includes(req.headers.origin)) return res.status(403).end();
  if (!req.headers["content-type"]?.startsWith("application/json"))
    return res.status(400).end();
  let p;
  try {
    const raw =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 24576) return res.status(413).end();
    const body = typeof req.body === "string" ? JSON.parse(raw) : req.body;
    // a boot report (src/telemetry/boot.js) or a run snapshot
    p = body?.kind === "boot" ? parseBoot(body) : parseSnapshot(body);
  } catch {
    return res.status(400).end();
  }
  if (!process.env.DATABASE_URL || !process.env.TELEMETRY_ADMIN_TOKEN)
    return res.status(503).end();
  try {
    const sql = database();
    // Vercel supplies this header. Never store the address itself; salt changes daily.
    const minute = Math.floor(Date.now() / 60000);
    const address =
      req.headers["x-vercel-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown";
    const bucket = createHmac("sha256", process.env.TELEMETRY_ADMIN_TOKEN)
      .update(`${Math.floor(minute / 1440)}:${address}`)
      .digest("hex");
    const [rate] = await sql`INSERT INTO play_limits (bucket, minute, requests)
      VALUES (${bucket}, ${minute}, 1) ON CONFLICT (bucket, minute)
      DO UPDATE SET requests = play_limits.requests + 1 RETURNING requests`;
    if (rate.requests > 120) {
      res.setHeader("Retry-After", "60");
      return res.status(429).end();
    }
    const environment = process.env.VERCEL_ENV || "development";
    p.test ||= environment !== "production" || p.release === "local";
    if (p.kind === "boot") await saveBootFailure(sql, p, environment);
    else await saveSnapshot(sql, p, environment);
    return res.status(204).end();
  } catch {
    console.error("[telemetry] storage unavailable");
    return res.status(503).end();
  }
}
