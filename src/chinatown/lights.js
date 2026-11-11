// Local lighting. The level registers every neon sign, lamp, shop window and lantern as an
// emitter; a small fixed set of point lights is handed to whichever emitters matter most to
// the camera right now and cross-faded, so the light count (and shader set) never changes.
import * as THREE from "three";

const GAIN = 11; // emitter power -> candela

export function createLights(ctx) {
  const G = ctx.G;
  const count = { low: 4, medium: 7, high: 10, ultra: 12, test: 8 }[G.quality.name] || 8;
  const pool = [];
  for (let i = 0; i < count; i++) {
    const light = new THREE.PointLight(0xffffff, 0, 10, 2);
    light.castShadow = false;
    light.layers.enable(1); // also lights the first-person weapon
    G.scene.add(light);
    pool.push({ light, emitter: null, level: 0, target: 0 });
  }
  // weapon light: a cool cone from the rifle so whatever is in front of the barrel reads
  // against the dark street. It rides the camera and does not touch the first-person model.
  const torch = new THREE.SpotLight(0xdfe9ff, 0, 34, 0.36, 0.55, 1.5);
  torch.castShadow = false;
  torch.position.set(0.16, -0.14, 0.1);
  torch.target.position.set(0.02, -0.05, -1);
  G.camera.add(torch, torch.target);
  let torchLevel = 0;
  const emitters = ctx.emitters;
  for (const e of emitters) prepare(e);
  function prepare(e) {
    e.v = new THREE.Vector3(e.pos[0], e.pos[1], e.pos[2]);
    e.c = new THREE.Color(e.color);
    e.gain = 1;
    e.phase = Math.random() * 100;
    e.slot = null;
    return e;
  }
  const cam = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  let tick = 0;
  let clock = 0;

  function choose() {
    G.camera.getWorldPosition(cam);
    G.camera.getWorldDirection(fwd);
    for (const e of emitters) {
      const dx = e.v.x - cam.x, dy = e.v.y - cam.y, dz = e.v.z - cam.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const d = Math.sqrt(d2);
      // lights ahead of the camera matter more than lights behind it
      const ahead = d > 0.5 ? (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d : 1;
      let s = (e.power * e.range * (e.dynamic ? 2 : 1)) / (d2 + 30);
      s *= 0.45 + 0.55 * Math.max(0, ahead + 0.35);
      if (d > e.range * 4.5) s *= 0.15;
      if (e.off) s = 0;
      if (e.slot) s *= 1.3; // hysteresis: keep what is already lit
      e.score = s;
    }
    const ranked = emitters.slice().sort((a, b) => b.score - a.score).slice(0, pool.length);
    const keep = new Set(ranked.filter((e) => e.score > 0));
    for (const p of pool) if (p.emitter && !keep.has(p.emitter)) p.target = 0;
    for (const e of keep) {
      if (e.slot) {
        e.slot.target = 1;
        continue;
      }
      const free = pool.find((p) => !p.emitter);
      if (!free) continue;
      free.emitter = e;
      free.level = 0;
      free.target = 1;
      e.slot = free;
      free.light.position.copy(e.v);
      free.light.color.copy(e.c);
      free.light.distance = e.range;
    }
  }

  function flicker(e, t) {
    if (!e.flicker) return 1;
    if (e.flicker === 3) return ctx.neonFlicker ?? 1; // in step with the faulty sign material
    const x = t + e.phase;
    if (e.flicker === 1) {
      // neon with a tired transformer: steady, then a stutter
      const gate = Math.sin(x * 0.7) + Math.sin(x * 1.9 + 1.3);
      return gate > 1.55 ? (Math.sin(x * 61) > 0 ? 1 : 0.25) : 1;
    }
    // loose bulb
    return 0.72 + 0.28 * Math.sin(x * 9) * Math.sin(x * 3.7) + (Math.sin(x * 43) > 0.92 ? -0.5 : 0);
  }

  choose();
  return {
    pool,
    emitters,
    add(e) {
      emitters.push(prepare(e));
      return e;
    },
    torch,
    update(dt) {
      clock += dt;
      // on while a mission is running, off for the title fly-through
      const on = G.game && (G.game.state === "playing" || G.game.state === "intro" || G.game.state === "paused") && G.player && G.player.alive !== false ? 1 : 0;
      torchLevel += (on - torchLevel) * Math.min(1, dt * 4);
      torch.intensity = 36 * torchLevel * (0.97 + 0.03 * Math.sin(clock * 23));
      tick -= dt;
      if (tick <= 0) {
        tick = 0.15;
        choose();
      }
      for (const p of pool) {
        const e = p.emitter;
        if (!e) continue;
        p.level += (p.target - p.level) * Math.min(1, dt * 5);
        if (p.target === 0 && p.level < 0.02) {
          p.light.intensity = 0;
          e.slot = null;
          p.emitter = null;
          continue;
        }
        if (e.dynamic) {
          p.light.position.copy(e.v);
          p.light.color.copy(e.c);
        }
        p.light.intensity = e.power * GAIN * p.level * e.gain * flicker(e, clock);
      }
    },
  };
}
