import { timingSafeEqual } from "node:crypto";
export function authorized(req) {
  const token = process.env.TELEMETRY_ADMIN_TOKEN;
  if (!token || token.length < 32) return false;
  const actual = Buffer.from(req.headers.authorization || "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function noCache(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
