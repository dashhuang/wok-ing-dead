// Boot failures: which module failed while the page was starting, and why.
// game.js notes every module that threw (whether it fell back to a stand-in or stopped the
// page) and reports them once, at the end of boot or on the error screen. Sent on its own,
// not inside a run: a page that cannot start never begins one.
import { readDevice } from "./device.js";
import {
  isTestSession,
  playerId,
  telemetryEnabled,
  telemetryStorage,
} from "./player.js";

const MAX = 12;
const errors = [];
const seen = new WeakSet();
let reported = false;

// One line, printable ASCII, no host names or query strings (the asset path is kept: it says
// which file failed).
export function describeError(err) {
  let s =
    err && typeof err === "object" && err.message
      ? (err.name && err.name !== "Error" ? err.name + ": " : "") + err.message
      : String(err);
  return s
    .split("\n")[0]
    .replace(/https?:\/\/[^\s/"'`]+/g, "")
    .replace(/\?[^\s"'`]*/g, "")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

// module: a short lower-case name ("enemies", "phonebatch"). The same error object is noted
// once, so a required module that stops the page is not counted again as "boot".
export function noteBootError(module, err) {
  if (err && typeof err === "object") {
    if (seen.has(err)) return;
    seen.add(err);
  }
  if (errors.length < MAX) errors.push({ module, message: describeError(err) });
}

export function bootErrors() {
  return errors.map((e) => ({ ...e }));
}

export function reportBoot(G, { fatal = false } = {}) {
  if (reported || !errors.length || !telemetryEnabled()) return;
  reported = true;
  let device;
  try {
    device = readDevice(G || {});
  } catch {}
  const body = {
    kind: "boot",
    schema: 1,
    bootId: crypto.randomUUID(),
    playerId: playerId(telemetryStorage()),
    release: __GAME_RELEASE__,
    test: isTestSession(G?.params),
    fatal,
    quality: G?.quality?.key || G?.quality?.name || "unknown",
    errors: bootErrors(),
    device,
  };
  try {
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
