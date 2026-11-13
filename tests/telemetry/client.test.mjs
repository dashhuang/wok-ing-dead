import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as settle } from "node:timers/promises";
import { createServer } from "vite";
import { parseSnapshot } from "../../server/telemetry/schema.js";

test("actual client module distinguishes holdout weapons, difficulty changes and final snapshots", async () => {
  const vite = await createServer({
    mode: "production",
    server: { middlewareMode: true, hmr: false },
  });
  const names = [
    "location",
    "document",
    "navigator",
    "localStorage",
    "addEventListener",
    "setInterval",
    "fetch",
  ];
  const saved = Object.fromEntries(
    names.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  try {
    const { createTelemetry } = await vite.ssrLoadModule(
      "/src/telemetry/index.js",
    );
    const records = [];
    const store = new Map();
    const doc = new EventTarget();
    doc.hidden = false;
    const replacements = {
      location: { protocol: "https:" },
      document: doc,
      navigator: { webdriver: true, sendBeacon: () => true },
      localStorage: {
        getItem: (k) => store.get(k),
        setItem: (k, v) => store.set(k, v),
      },
      addEventListener: () => {},
      setInterval: () => 0,
      fetch: async (_url, options) => {
        records.push(parseSnapshot(JSON.parse(options.body)));
        return { ok: true, status: 204 };
      },
    };
    for (const [k, v] of Object.entries(replacements))
      Object.defineProperty(globalThis, k, {
        configurable: true,
        writable: true,
        value: v,
      });
    for (const mode of ["mission", "holdout"]) {
      const listeners = new Map();
      const G = {
        params: {},
        stage: "street",
        quality: { name: "low" },
        input: {},
        player: { health: 100 },
        game: { state: "playing", difficulty: "hard", run: { mode, time: 0 } },
        weapon: {
          current: "rifle",
          slots: [{ id: "rifle" }, { id: "pistol" }],
        },
        run: {
          state: {},
          loadout: {
            cur: "pistol",
            owned: () => ["pistol"],
            item: () => ({ level: 1, branch: "base" }),
            have: () => 10,
          },
        },
        events: {
          on: (name, fn) => {
            listeners.set(name, fn);
          },
        },
      };
      const client = createTelemetry(G);
      client.start();
      await settle(0);
      listeners.get("enemy:killed")();
      G.game.difficulty = "brutal";
      listeners.get("game:difficulty")({ difficulty: "brutal" });
      client.finish("dead");
      await settle(0);
      const final = records.at(-1);
      assert.equal(final.outcome, "dead");
      assert.equal(final.device.os, "other");
      assert.equal(final.perf.qualityStart, "low");
      assert.equal(final.difficulty, "hard");
      assert.equal(final.difficultyChanged, true);
      assert.equal(
        final.weaponUse[mode === "mission" ? "pistol" : "rifle"].killsWhileHeld,
        1,
      );
      assert.deepEqual(
        final.weapons.map((w) => w.id),
        mode === "mission" ? ["pistol"] : ["rifle", "pistol"],
      );
    }
    assert.equal(new Set(records.map((p) => p.runId)).size, 2);
  } finally {
    for (const k of names) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    }
    await vite.close();
  }
});
