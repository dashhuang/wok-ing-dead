import { dishHot } from "./runflow.js";

// Music-only thresholds: never change spawning, enemy AI or game balance.
export function musicPressure(G, fallback = 0) {
  if (!G?.enemies?.list || !G.player?.pos) return fallback;
  const p = G.player.pos;
  let crowd = 0;
  for (const z of G.enemies.list) {
    if (!z.alive || z.passive || z.mode !== "engage") continue;
    const distance = Math.hypot(z.pos.x - p.x, z.pos.z - p.z);
    if (distance < 28) crowd += distance < 8 ? 1.5 : 1;
  }
  const run = G.run?.active ? G.run.state : null;
  return Math.min(
    1,
    Math.max(
      crowd / 8,
      run?.boss?.alive ? 1 : 0,
      dishHot(run?.cook) ? 0.85 : 0,
    ),
  );
}

export function createMusicDirector() {
  let mood = "normal";
  let high = 0;
  let low = 0;
  let held = 0;
  return {
    reset() {
      mood = "normal";
      high = low = held = 0;
    },
    update(dt, pressure, state) {
      if (state === "paused") return mood;
      if (state !== "playing") {
        this.reset();
        return mood;
      }
      held += dt;
      high = pressure >= 0.7 ? high + dt : 0;
      low = pressure <= 0.35 ? low + dt : 0;
      if (mood === "normal" && high >= 1.5) {
        mood = "horde";
        held = low = 0;
      } else if (mood === "horde" && low >= 8 && held >= 12) {
        mood = "normal";
        held = high = 0;
      }
      return mood;
    },
  };
}
