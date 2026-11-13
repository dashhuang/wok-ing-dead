import { createTransport } from "./transport.js";
import { readDevice } from "./device.js";
import { createFrameStats } from "./perf.js";

import { AMMO_TYPES } from "../chinatown/loadout.js";

const KEY = "wokingdead.telemetry.player.v1";
const round = (v) => Math.round((Number.isFinite(v) ? v : 0) * 100) / 100;

export function createTelemetry(G) {
  const noop = { start() {}, finish() {} };
  if (
    import.meta.env.MODE !== "production" ||
    import.meta.env.VITE_TELEMETRY_ENABLED === "0"
  )
    return noop;
  if (!globalThis.crypto?.randomUUID || location.protocol === "file:")
    return noop;
  let storage;
  try {
    storage = localStorage;
  } catch {}
  let playerId;
  try {
    playerId = storage?.getItem(KEY);
  } catch {}
  if (!/^[0-9a-f-]{36}$/.test(playerId || "")) {
    playerId = crypto.randomUUID();
    try {
      storage?.setItem(KEY, playerId);
    } catch {}
  }
  const transport = createTransport({
    storage,
    send: async (body) => {
      const r = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      });
      return r.ok
        ? "ok"
        : [400, 403, 413].includes(r.status)
          ? "drop"
          : "retry";
    },
  });
  let run = null;
  let lastTick = performance.now();
  let state = G.game.state;
  let device = {};
  try {
    device = readDevice(G);
  } catch {}
  let frames = null;
  let qualityStart = "unknown";
  let autoDrops = 0;
  const inPlay = () =>
    run && state === "playing" && !document.hidden && !G.run?.picking;
  const current = () =>
    (G.game.run.mode === "mission" ? G.run?.loadout?.cur : null) ||
    G.weapon?.current ||
    "pistol";
  const use = (id = current()) =>
    (run.weaponUse[id] ||= { seconds: 0, killsWhileHeld: 0, spent: 0 });
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(2, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    if (inPlay()) {
      run.activeSeconds += dt;
      use().seconds += dt;
      let scale;
      let zombies;
      try {
        scale = G.render?.stats?.().scale;
        zombies = G.enemies?.aliveCount?.();
      } catch {}
      frames?.sample(dt, scale, zombies);
    }
  };
  // Frame pacing seen by the page: the gap between animation frames while in play.
  let lastFrame = 0;
  const onFrame = (t) => {
    if (frames && inPlay()) {
      if (lastFrame) frames.frame(t - lastFrame);
      lastFrame = t;
    } else lastFrame = 0;
    requestAnimationFrame(onFrame);
  };
  if (typeof requestAnimationFrame === "function")
    requestAnimationFrame(onFrame);
  const perf = () => {
    let res = "";
    try {
      const r = G.render?.stats?.().res;
      if (r) res = `${Math.round(r[0])}x${Math.round(r[1])}`;
    } catch {}
    return { ...frames.summary(), qualityStart, autoDrops, res };
  };
  function capture(outcome = "active") {
    if (!run) return null;
    tick();
    const S = G.game.run.mode === "mission" ? G.run?.state : null;
    const L = S && G.run?.loadout;
    const snapshot = {
      ...run,
      seq: ++run.seq,
      outcome,
      duration: round(G.game.run.time),
      activeSeconds: round(run.activeSeconds),
      quality: G.quality?.key || G.quality?.name || "unknown",
      input: G.input.touch
        ? "touch"
        : G.input.device === "pad"
          ? "pad"
          : "mouse",
      level: S?.level || 0,
      sirens: G.game.run.cut || 0,
      waves: G.game.run.wavesCleared || 0,
      bossSeen: !!S?.bossSeen,
      bossDead: !!S?.bossDead,
      health: round(G.player.health),
      weapons: L
        ? L.owned().map((id) => {
            const it = L.item(id);
            return { id, level: it.level, branch: it.branch || "base" };
          })
        : (G.weapon?.slots || []).map((slot) => ({
            id: slot.id,
            level: 1,
            branch: "base",
          })),
      spice: { ...S?.spice },
      ammoReceived: { ...run.ammoReceived },
      ammo: L
        ? Object.fromEntries(AMMO_TYPES.map((t) => [t, round(L.have(t))]))
        : {},
      weaponUse: Object.fromEntries(
        Object.entries(run.weaponUse).map(([id, v]) => [
          id,
          {
            seconds: round(v.seconds),
            killsWhileHeld: v.killsWhileHeld,
            spent: round(v.spent),
          },
        ]),
      ),
      choices: run.choices.map((c) => ({ ...c })),
      device: { ...device },
      perf: perf(),
    };
    transport.put(snapshot);
    return snapshot;
  }
  function flush() {
    capture();
    void transport.flush();
  }
  const api = {
    start() {
      if (run) api.finish("restart");
      const params = G.params || {};
      run = {
        schema: 1,
        runId: crypto.randomUUID(),
        playerId,
        seq: 0,
        startedAt: Date.now(),
        release: __GAME_RELEASE__,
        stage: G.stage || "street",
        mode: G.game.run.mode,
        difficulty: G.game.difficulty,
        difficultyChanged: false,
        test:
          !!navigator.webdriver ||
          ["range", "bench", "autostart", "w", "unlock", "cam", "shot"].some(
            (k) => params[k] != null,
          ),
        activeSeconds: 0,
        kills: 0,
        damageTaken: 0,
        weaponUse: {},
        ammoReceived: {},
        choices: [],
      };
      frames = createFrameStats();
      qualityStart = G.quality?.key || G.quality?.name || "unknown";
      autoDrops = 0;
      lastFrame = 0;
      lastTick = performance.now();
      flush();
    },
    finish(outcome) {
      if (!run) return;
      capture(outcome);
      run = null;
      void transport.flush();
    },
  };
  G.events.on("game:state", (e) => {
    tick();
    state = e.state;
    if (state === "dead") api.finish("dead");
    else if (state === "complete") api.finish("complete");
    else if (state === "title") api.finish("quit");
  });
  G.events.on("quality:auto", () => {
    if (run) autoDrops++;
  });
  G.events.on("game:difficulty", (e) => {
    if (run && e.difficulty !== run.difficulty) run.difficultyChanged = true;
  });
  G.events.on("enemy:killed", () => {
    if (run) {
      run.kills++;
      use().killsWhileHeld++;
    }
  });
  G.events.on("player:hit", (e) => {
    if (run) run.damageTaken += Math.max(0, e.amount || 0);
  });
  G.events.on("weapon:fire", (e) => {
    if (run) use(e.weapon).spent++;
  });
  G.events.on("telemetry:spent", (e) => {
    if (run) use(e.weapon).spent += e.amount;
  });
  G.events.on("telemetry:ammo", (e) => {
    if (run)
      run.ammoReceived[e.type] = (run.ammoReceived[e.type] || 0) + e.amount;
  });
  G.events.on("run:pick", (e) => {
    if (!run || run.choices.length >= 128) return;
    run.choices.push({
      at: round(G.game.run.time),
      kind: e.card.kind,
      id: e.card.id || e.card.kind,
      branch: e.card.branch || "base",
      level: e.card.level || 1,
      offered: (e.offered || []).map((c) => c.id || c.kind),
    });
  });
  // Visibility is only a checkpoint: a suspended mobile tab can come back later.
  document.addEventListener("visibilitychange", flush);
  addEventListener("pagehide", () => {
    capture();
    transport.beacon((p) =>
      navigator.sendBeacon(
        "/api/telemetry",
        new Blob([JSON.stringify(p)], { type: "application/json" }),
      ),
    );
  });
  addEventListener("online", () => void transport.flush());
  setInterval(tick, 1000);
  setInterval(flush, 30000);
  void transport.flush();
  return api;
}
