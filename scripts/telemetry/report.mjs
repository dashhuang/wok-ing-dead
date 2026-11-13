const token = process.env.TELEMETRY_ADMIN_TOKEN;
if (!token || token === "[SENSITIVE]")
  throw new Error("Set TELEMETRY_ADMIN_TOKEN locally");
const url = new URL(
  "/api/telemetry-summary",
  process.env.TELEMETRY_SITE || "https://wok-ing-dead.vercel.app",
);
url.searchParams.set("days", process.argv[2] || "7");
if (process.argv[3]) url.searchParams.set("release", process.argv[3]);
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(15000),
});
if (!res.ok) throw new Error(`Report request failed: ${res.status}`);
console.log(JSON.stringify(await res.json(), null, 2));
