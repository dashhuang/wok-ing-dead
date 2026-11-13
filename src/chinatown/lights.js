// Local lighting. The level registers every neon sign, lamp, shop window and lantern as an
// emitter; a small fixed set of point lights is handed to whichever emitters matter most to
// the camera right now and cross-faded, so the light count (and shader set) never changes.
import * as THREE from "three";
import { STREET, HALO_MAX, GLOW, bakeGlow } from "./streetfx.js";
import { pickLook } from "./look.js";

const GAIN = 11; // emitter power -> candela

export function createLights(ctx) {
  const G = ctx.G;
  const count =
    { low: 3, medium: 5, high: 8, ultra: 11, test: 6 }[G.quality.name] || 6;
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
  const fx = pickLook(G.params).fx;

  // ---- the pools every lamp and sign leaves on the ground, baked once (see streetfx.js) ----
  if (fx.glow > 0) {
    const data = bakeGlow(emitters, G.physics.boxes, GAIN);
    const tex = new THREE.DataTexture(data, GLOW.res, GLOW.res);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    STREET.glowTex.value = tex;
    // the fewer real lights a preset has, the nearer the baked pools have to take over
    const near = count <= 3 ? 4 : count <= 5 ? 6 : 8;
    STREET.glowFade.value = [near, near * 3, fx.glowNear, fx.glow];
  }
  STREET.haloK.value = fx.halo;
  STREET.rainLit.value = fx.rainLit;

  // ---- halos and lit rain: the lights the fog pass and the rain shader are told about ----
  // Slots work like the point-light pool: an emitter keeps its slot while it ranks, and fades
  // in and out, so nothing pops when the list changes.
  const HALOS =
    fx.halo > 0 || fx.rainLit > 0
      ? { low: 6, medium: 10 }[G.quality.name] || HALO_MAX
      : 0;
  const halos = [];
  for (let i = 0; i < HALOS; i++)
    halos.push({ emitter: null, level: 0, target: 0 });
  const haloRank = new Array(HALOS);
  STREET.haloN.value = HALOS;
  function chooseHalos() {
    let n = 0;
    for (const e of emitters) {
      const dx = e.v.x - cam.x,
        dy = e.v.y - cam.y,
        dz = e.v.z - cam.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const d = Math.sqrt(d2);
      const ahead = d > 0.5 ? (dx * fwd.x + dy * fwd.y + dz * fwd.z) / d : 1;
      let s = (e.power * e.range) / (d2 + 60);
      s *= 0.3 + 0.7 * Math.max(0, ahead + 0.3);
      if (e.off || d > 110) s = 0;
      if (e.halo) s *= 1.3;
      e.hscore = s;
      if (!(s > 0)) continue;
      let i = n < HALOS ? n++ : HALOS;
      if (i === HALOS && s <= haloRank[i - 1].hscore) continue;
      if (i === HALOS) i--;
      while (i > 0 && haloRank[i - 1].hscore < s) {
        haloRank[i] = haloRank[i - 1];
        i--;
      }
      haloRank[i] = e;
    }
    for (const e of emitters) e.hkeep = false;
    for (let i = 0; i < n; i++) haloRank[i].hkeep = true;
    for (const h of halos) if (h.emitter && !h.emitter.hkeep) h.target = 0;
    for (let i = 0; i < n; i++) {
      const e = haloRank[i];
      if (e.halo) {
        e.halo.target = 1;
        continue;
      }
      const free = halos.find((h) => !h.emitter);
      if (!free) continue;
      free.emitter = e;
      free.level = 0;
      free.target = 1;
      e.halo = free;
    }
  }
  function updateHalos(dt) {
    const pos = STREET.haloPos.value,
      col = STREET.haloCol.value;
    for (let i = 0; i < HALOS; i++) {
      const h = halos[i],
        e = h.emitter;
      let k = 0;
      if (e) {
        h.level += (h.target - h.level) * Math.min(1, dt * 4);
        if (h.target === 0 && h.level < 0.02) {
          e.halo = null;
          h.emitter = null;
        } else {
          k = e.power * GAIN * h.level * e.gain * flicker(e, clock);
          pos[i * 4] = e.v.x;
          pos[i * 4 + 1] = e.v.y;
          pos[i * 4 + 2] = e.v.z;
          pos[i * 4 + 3] = e.range;
          col[i * 3] = e.c.r * k;
          col[i * 3 + 1] = e.c.g * k;
          col[i * 3 + 2] = e.c.b * k;
        }
      }
      if (!k) col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
    }
  }
  function prepare(e) {
    e.v = new THREE.Vector3(e.pos[0], e.pos[1], e.pos[2]);
    e.c = new THREE.Color(e.color);
    e.gain = 1;
    e.phase = Math.random() * 100;
    e.slot = null;
    e.halo = null;
    return e;
  }
  const cam = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const ranked = new Array(count);
  let tick = 0;
  let clock = 0;

  function choose() {
    G.camera.getWorldPosition(cam);
    G.camera.getWorldDirection(fwd);
    for (const e of emitters) {
      const dx = e.v.x - cam.x,
        dy = e.v.y - cam.y,
        dz = e.v.z - cam.z;
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
    // top pool.length by score: a partial insertion into a reused array (no sort, no garbage)
    let n = 0;
    for (const e of emitters) {
      if (!(e.score > 0)) continue;
      let i = n < pool.length ? n++ : pool.length;
      if (i === pool.length && e.score <= ranked[i - 1].score) continue;
      if (i === pool.length) i--;
      while (i > 0 && ranked[i - 1].score < e.score) {
        ranked[i] = ranked[i - 1];
        i--;
      }
      ranked[i] = e;
    }
    for (const e of emitters) e.keep = false;
    for (let i = 0; i < n; i++) ranked[i].keep = true;
    for (const p of pool) if (p.emitter && !p.emitter.keep) p.target = 0;
    for (let i = 0; i < n; i++) {
      const e = ranked[i];
      if (e.slot) {
        e.slot.target = 1;
        continue;
      }
      let free = null;
      for (const p of pool)
        if (!p.emitter) {
          free = p;
          break;
        }
      if (!free) continue;
      free.emitter = e;
      free.level = 0;
      free.target = 1;
      e.slot = free;
      free.light.position.copy(e.v);
      free.light.color.copy(e.c);
      free.light.distance = e.range;
    }
    if (HALOS) chooseHalos();
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
    return (
      0.72 +
      0.28 * Math.sin(x * 9) * Math.sin(x * 3.7) +
      (Math.sin(x * 43) > 0.92 ? -0.5 : 0)
    );
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
      const on =
        G.game &&
        (G.game.state === "playing" ||
          G.game.state === "intro" ||
          G.game.state === "paused") &&
        G.player &&
        G.player.alive !== false
          ? 1
          : 0;
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
        p.light.intensity =
          e.power * GAIN * p.level * e.gain * flicker(e, clock);
      }
      if (HALOS) updateHalos(dt);
    },
  };
}
