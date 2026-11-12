// Things lying in the street during a run: ammunition packs (four kinds, told apart by
// colour), red envelopes, weapon cases, and the lamp on a stocked supply crate. Visuals only; run.js decides when they appear and who gets them.
// Every kind is a handful of instanced meshes created up front, so nothing new is compiled
// (and no light is added) once the level is ready.

const PACK_MAX = 14; // per kind of ammunition
const ENVELOPE_MAX = 8;
const CASE_MAX = 6;
const LAMP_MAX = 8;
// lamp colour of each kind of ammunition (the same hues the HUD uses)
export const AMMO_COLOR = {
  bullets: [0.16, 0.61, 0.48],
  heavy: [0.66, 0.13, 0.07],
  fuel: [0.7, 0.42, 0.06],
  parts: [0.2, 0.36, 0.78],
};

export function createPickups(G) {
  const T = G.THREE;
  const root = new T.Group();
  root.name = "pickups";
  G.scene.add(root);

  const lit = (hex, rough = 0.75, metal = 0.05) =>
    new T.MeshStandardMaterial({
      color: hex,
      roughness: rough,
      metalness: metal,
    });
  // Unlit colour, so it reads as a lamp. The night street is exposed for very dim light:
  // values around 0.5 already look fully lit, and anything near 1 burns out to white.
  // The docks are in evening daylight and the eye adapts to it: the same values there are
  // close to black, so everything unlit is raised by GAIN for that stage (setGain).
  const glows = []; // [material, r, g, b] as written for the night street
  let gain = 1;
  const lamp = (r, g, b) => {
    const m = new T.MeshBasicMaterial({ color: 0xffffff, fog: false });
    m.color.setRGB(r * gain, g * gain, b * gain);
    glows.push([m, r, g, b]);
    return m;
  };
  const beamMat = () => {
    const m = new T.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
      fog: false,
    });
    m.color.setScalar(gain);
    glows.push([m, 1, 1, 1]);
    return m;
  };
  const setGain = (g) => {
    gain = g;
    for (const [m, r, gr, b] of glows) m.color.setRGB(r * g, gr * g, b * g);
  };

  // box centred on (x, y, z)
  const box = (w, h, d, x = 0, y = 0, z = 0) =>
    new T.BoxGeometry(w, h, d).translate(x, y, z);
  // two crossed vertical quads fading out towards the top
  function beam(width, height, r, g, b, y0 = 0) {
    const pos = [];
    const col = [];
    const idx = [];
    for (let k = 0; k < 2; k++) {
      const dx = k === 0 ? width / 2 : 0;
      const dz = k === 0 ? 0 : width / 2;
      const base = pos.length / 3;
      pos.push(-dx, y0, -dz, dx, y0, dz, dx, y0 + height, dz);
      pos.push(-dx, y0 + height, -dz);
      col.push(r, g, b, r, g, b, 0, 0, 0, 0, 0, 0);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    return geo;
  }

  const hidden = new T.Matrix4().makeScale(0, 0, 0);
  const mat4 = new T.Matrix4();
  const quat = new T.Quaternion();
  const vPos = new T.Vector3();
  const vScale = new T.Vector3();
  const UP = new T.Vector3(0, 1, 0);

  // A set of instanced meshes that share one transform per item.
  // (the street's own code turns layer 2 on for the main camera; the docks' does not)
  G.camera.layers.enable(2);
  function makeSet(name, max, parts) {
    const meshes = parts.map(([geo, material, opts = {}]) => {
      const mesh = new T.InstancedMesh(geo, material, max);
      mesh.name = "pickup-" + name;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.layers.set(2); // main view only, not the wet-street reflection
      if (opts.order) mesh.renderOrder = opts.order;
      for (let i = 0; i < max; i++) mesh.setMatrixAt(i, hidden);
      mesh.instanceMatrix.needsUpdate = true;
      root.add(mesh);
      return mesh;
    });
    return {
      max,
      meshes,
      place(i, x, y, z, yaw, scale) {
        quat.setFromAxisAngle(UP, yaw);
        mat4.compose(vPos.set(x, y, z), quat, vScale.set(scale, scale, scale));
        for (const m of meshes) m.setMatrixAt(i, mat4);
      },
      hide(i) {
        for (const m of meshes) m.setMatrixAt(i, hidden);
      },
      flush() {
        for (const m of meshes) m.instanceMatrix.needsUpdate = true;
      },
    };
  }

  // ammunition pack: an olive tin with a band lit in the colour of its kind
  const tin = lit(0x39452b, 0.7, 0.2);
  const tinGeo = box(0.34, 0.2, 0.2);
  const bandGeo = box(0.345, 0.045, 0.205, 0, 0.03, 0);
  const packSets = {};
  const freePacks = {};
  for (const [kind, c] of Object.entries(AMMO_COLOR)) {
    packSets[kind] = makeSet("pack-" + kind, PACK_MAX, [
      [tinGeo, tin],
      [bandGeo, lamp(c[0], c[1], c[2])],
      [
        beam(0.3, 1.7, c[0] * 0.1, c[1] * 0.1, c[2] * 0.1, 0.12),
        beamMat(),
        { order: 5 },
      ],
    ]);
    freePacks[kind] = [];
    for (let i = PACK_MAX - 1; i >= 0; i--) freePacks[kind].push(i);
  }
  // red envelope: lucky money with a gold seal
  const envSet = makeSet("envelope", ENVELOPE_MAX, [
    [box(0.3, 0.44, 0.03), lamp(0.54, 0.05, 0.026)],
    [box(0.13, 0.13, 0.04, 0, 0.05, 0), lamp(0.77, 0.51, 0.14)],
    [beam(0.4, 6.5, 0.16, 0.05, 0.012, 0.2), beamMat(), { order: 5 }],
  ]);
  // weapon case: a long dark box with a brass catch, somewhere off the main street
  const caseSet = makeSet("case", CASE_MAX, [
    [box(0.86, 0.16, 0.3), lit(0x1c2126, 0.55, 0.4)],
    [box(0.87, 0.03, 0.31, 0, 0.02, 0), lamp(0.62, 0.42, 0.12)],
    [beam(0.42, 7, 0.085, 0.058, 0.014, 0.1), beamMat(), { order: 5 }],
  ]);
  // lamp on a stocked crate, in the colour of what it holds
  const stripGeo = box(0.5, 0.035, 0.16, 0, 0.02, 0);
  const lampSets = {};
  for (const [kind, c] of Object.entries(AMMO_COLOR))
    lampSets[kind] = makeSet("lamp-" + kind, LAMP_MAX, [
      [stripGeo, lamp(c[0], c[1] * 1.1, c[2] * 1.1)],
      [
        beam(0.4, 7.5, c[0] * 0.075, c[1] * 0.075, c[2] * 0.075, 0.05),
        beamMat(),
        { order: 5 },
      ],
    ]);
  // the same crate, empty: a dull amber strip so it still reads as "one of ours"
  const emptySet = makeSet("lamp-empty", LAMP_MAX, [
    [stripGeo, lamp(0.1, 0.09, 0.08)],
  ]);

  const packs = []; // { i, pos, age, life, kind, amount }
  const envelopes = []; // { i, pos, age }
  const cases = []; // { i, pos, age, seen }
  const lamps = []; // { i, site, kind, stocked }
  const freeEnv = [];
  const freeCase = [];
  for (let i = ENVELOPE_MAX - 1; i >= 0; i--) freeEnv.push(i);
  for (let i = CASE_MAX - 1; i >= 0; i--) freeCase.push(i);
  const flushPacks = () => {
    for (const s of Object.values(packSets)) s.flush();
  };
  const hideLamp = (l) => {
    lampSets[l.kind].hide(l.i);
    emptySet.hide(l.i);
  };
  let clock = 0;

  const api = {
    root,
    packs,
    envelopes,
    cases,
    lamps,
    setGain,
    get gain() {
      return gain;
    },
    reset() {
      for (const p of packs) {
        packSets[p.kind].hide(p.i);
        freePacks[p.kind].push(p.i);
      }
      for (const e of envelopes) {
        envSet.hide(e.i);
        freeEnv.push(e.i);
      }
      for (const c of cases) {
        caseSet.hide(c.i);
        freeCase.push(c.i);
      }
      for (const l of lamps) hideLamp(l);
      packs.length = envelopes.length = cases.length = lamps.length = 0;
      flushPacks();
      envSet.flush();
      caseSet.flush();
      for (const s of Object.values(lampSets)) s.flush();
      emptySet.flush();
    },
    // pos: ground position. The oldest pack of that kind makes room when its pool is full.
    addPack(pos, data = {}) {
      const kind = packSets[data.kind] ? data.kind : "bullets";
      const free = freePacks[kind];
      if (!free.length) {
        const old = packs.find((p) => p.kind === kind);
        if (old) api.removePack(old);
      }
      if (!free.length) return null;
      const p = {
        i: free.pop(),
        pos: pos.clone(),
        age: 0,
        life: data.life ?? 40,
        kind,
        amount: data.amount ?? 0,
        phase: Math.random() * 6.28,
      };
      packs.push(p);
      return p;
    },
    removePack(p) {
      const k = packs.indexOf(p);
      if (k < 0) return;
      packs.splice(k, 1);
      packSets[p.kind].hide(p.i);
      packSets[p.kind].flush();
      freePacks[p.kind].push(p.i);
    },
    addCase(pos) {
      if (!freeCase.length) return null;
      const c = {
        i: freeCase.pop(),
        pos: pos.clone(),
        age: 0,
        seen: false,
        yaw: Math.random() * 6.28,
      };
      cases.push(c);
      caseSet.place(c.i, c.pos.x, c.pos.y + 0.09, c.pos.z, c.yaw, 1);
      caseSet.flush();
      return c;
    },
    removeCase(c) {
      const k = cases.indexOf(c);
      if (k < 0) return;
      cases.splice(k, 1);
      caseSet.hide(c.i);
      caseSet.flush();
      freeCase.push(c.i);
    },
    addEnvelope(pos) {
      if (!freeEnv.length && envelopes.length) api.removeEnvelope(envelopes[0]);
      if (!freeEnv.length) return null;
      const e = {
        i: freeEnv.pop(),
        pos: pos.clone(),
        age: 0,
        phase: Math.random() * 6.28,
      };
      envelopes.push(e);
      return e;
    },
    removeEnvelope(e) {
      const k = envelopes.indexOf(e);
      if (k < 0) return;
      envelopes.splice(k, 1);
      envSet.hide(e.i);
      freeEnv.push(e.i);
    },
    // list: [{ site: { pos, yaw, top }, kind }] ; all start stocked
    setLamps(list) {
      for (const l of lamps) hideLamp(l);
      lamps.length = 0;
      list.slice(0, LAMP_MAX).forEach((c, i) => {
        lamps.push({
          i,
          site: c.site,
          kind: lampSets[c.kind] ? c.kind : "bullets",
          stocked: true,
        });
      });
      api.refreshLamps();
    },
    refreshLamps() {
      for (const l of lamps) {
        const s = l.site;
        const lit = lampSets[l.kind];
        const on = l.stocked ? lit : emptySet;
        const off = l.stocked ? emptySet : lit;
        on.place(l.i, s.pos.x, s.top, s.pos.z, s.yaw || 0, 1);
        off.hide(l.i);
      }
      for (const s of Object.values(lampSets)) s.flush();
      emptySet.flush();
    },
    // dt in world time (slows with the rest of the street)
    update(dt) {
      clock += dt;
      for (const p of packs) {
        p.age += dt;
        const left = p.life - p.age;
        // last seconds: blink so it reads as "about to go"
        const blink = left < 8 ? 0.55 + 0.45 * Math.sin(clock * 11) : 1;
        const grow = Math.min(1, p.age * 5);
        packSets[p.kind].place(
          p.i,
          p.pos.x,
          p.pos.y + 0.34 + Math.sin(clock * 2.3 + p.phase) * 0.05,
          p.pos.z,
          clock * 1.3 + p.phase,
          grow * blink * 1.4,
        );
      }
      for (const e of envelopes) {
        e.age += dt;
        const grow = Math.min(1, e.age * 4);
        envSet.place(
          e.i,
          e.pos.x,
          e.pos.y + 0.62 + Math.sin(clock * 1.9 + e.phase) * 0.07,
          e.pos.z,
          clock * 1.7 + e.phase,
          grow * 1.25,
        );
      }
      if (packs.length) flushPacks();
      if (envelopes.length) envSet.flush();
    },
  };
  // removals leave a hidden matrix behind: push it even when the list is now empty
  const flushAfter = (fn, set) =>
    function (...a) {
      const r = fn.apply(api, a);
      set.flush();
      return r;
    };
  api.removeEnvelope = flushAfter(api.removeEnvelope, envSet);
  return api;
}
