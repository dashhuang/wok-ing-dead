// One random id per browser, shared by play records and boot reports so they can be joined.
const KEY = "wokingdead.telemetry.player.v1";

export function telemetryStorage() {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

export function playerId(storage = telemetryStorage()) {
  let id;
  try {
    id = storage?.getItem(KEY);
  } catch {}
  if (!/^[0-9a-f-]{36}$/.test(id || "")) {
    id = crypto.randomUUID();
    try {
      storage?.setItem(KEY, id);
    } catch {}
  }
  return id;
}

// Production pages served over http(s) only: not the dev server, not the single-file build.
export function telemetryEnabled() {
  return (
    import.meta.env.MODE === "production" &&
    import.meta.env.VITE_TELEMETRY_ENABLED !== "0" &&
    !!globalThis.crypto?.randomUUID &&
    globalThis.location?.protocol !== "file:"
  );
}

// Firing range, debug parameters and automated browsers never count as real play.
const TEST_PARAMS = [
  "range",
  "bench",
  "autostart",
  "w",
  "unlock",
  "cam",
  "shot",
];
export function isTestSession(params = {}) {
  return (
    !!globalThis.navigator?.webdriver ||
    TEST_PARAMS.some((k) => params[k] != null)
  );
}
