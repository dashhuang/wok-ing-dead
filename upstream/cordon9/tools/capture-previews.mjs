// Screenshots CORDON 9 showcases with headless Chrome over CDP.
// node capture-previews.mjs <cordon9.html> <outDir> [name-filter]
import { spawn } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";
const [html, outDir, only] = process.argv.slice(2);
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROPS = "barriers fence booth tower tent poles cars ambo bus bld clutter street traffic fstand fpress fmast fheli fhall fblock fbus ftruck ftent fmed fsport fcamp fserv fnature fback fschool ffar ffence".split(" ");
const SHOTS = [
  ["title", ""],
  ...["v01", "v02", "v03", "v04", "v05", "v06", "v07", "v08", "v09", "v10", "v11", "v12", "over", "puddle", "east", "tent", "pharm", "bags", "bags2", "bags3", "door1", "taxi", "taxi2"].map((p) => ["map-halsey-" + p, "show=arena&map=halsey&pose=" + p]),
  ...["f01", "f02", "f03", "f04", "f05", "f06"].map((p) => ["map-field-" + p, "show=arena&map=field&pose=" + p]),
  ["weapon-rifle", "show=weapon"],
  ["weapon-pistol", "show=weapon&gun=pistol"],
  ["weapon-viewmodel", "show=view"],
  ["hands", "show=hand"],
  ["zombie-walker", "show=zombie&ztype=walker"],
  ["zombie-walker-seed2", "show=zombie&ztype=walker&zseed=2"],
  ["zombie-runner", "show=zombie&ztype=runner"],
  ["zombie-brute", "show=zombie&ztype=brute"],
  ["zombie-lods", "show=zombie&lodrow=1&zpose=lod"],
  ["kit", "show=kit"],
  ["drone", "show=drone"],
  ...PROPS.map((s) => ["props-" + s, "show=props&set=" + s]),
].filter(([n]) => !only || n.includes(only));
fs.mkdirSync(outDir, { recursive: true });
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "c9prof-"));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--no-first-run",
  "--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--window-size=1600,900", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver; for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
const results = [];
for (const [name, q] of SHOTS) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  const url = "file://" + path.resolve(html) + "?q=high&noaudio=1&settle=40" + (q ? "&" + q : "");
  const t0 = Date.now();
  await send("Page.navigate", { url });
  let st = null;
  while (Date.now() - t0 < 240000) { await sleep(1000); st = await ev("JSON.stringify({r:!!window.__ready,f:window.__fatal||null,n:window.__frames||0})"); if (st && JSON.parse(st).r) break; }
  await sleep(2500);
  const s = JSON.parse(st || "{}");
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 86 });
  if (shot.result) fs.writeFileSync(path.join(outDir, name + ".jpg"), Buffer.from(shot.result.data, "base64"));
  results.push({ name, query: q, ok: !!s.r && !s.f, fatal: s.f, seconds: Math.round((Date.now() - t0) / 1000) });
  console.log(name, s.r ? "ready" : "TIMEOUT", s.f ? "FATAL " + String(s.f).slice(0, 160) : "", Math.round((Date.now() - t0) / 1000) + "s");
  ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
}
const gone = new Promise((r) => chrome.once("exit", r)); chrome.kill(); await gone; await sleep(500);
try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
// with a filter, update matching entries in the existing record instead of replacing it
const rec = path.join(outDir, "_capture.json");
let all = results;
if (only && fs.existsSync(rec)) {
  const byName = new Map(results.map((r) => [r.name, r]));
  all = JSON.parse(fs.readFileSync(rec, "utf8")).map((r) => byName.get(r.name) || r);
  for (const r of results) if (!all.some((x) => x.name === r.name)) all.push(r);
}
fs.writeFileSync(rec, JSON.stringify(all, null, 1) + "\n");
