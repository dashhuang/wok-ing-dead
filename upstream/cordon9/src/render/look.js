var LOOKS = {
  // the first release: clear air, sodium street, exposure aimed at a bright mid grey. Kept for before/after frames (?look=classic).
  classic: {
    sky: "night",
    env: 1,
    spec: 1,
    keyK: 1,
    beam: 0,
    lampK: 13,
    viewLight: 1,
    viewFill: 1.25,
    fog: { sigma: 65e-4, amb: [0.02, 0.022, 0.03], hazeCol: [0.03, 0.025, 0.02], haze: 0.35, maxDist: 48, height: 6, floor: 0.35, wisp: 0, wispScale: 0.11, g: 0.72 },
    grade: { key: 0.11, minE: 0.25, maxE: 6, bloom: 0.07, streak: 0.06, contrast: 0.22, sat: 1.02, vib: 0, toe: 1.33, pivot: 0.6, shadowTint: [0.93, 0.99, 1.07], highTint: [1.04, 1, 0.95], vignette: 0.32, lift: [0, 0, 0] },
    road: [0.5, 0, 1, 0],
    wet: {},
    ao: [0.9, 0.7, 0.55, 1.5]
  },
  // cold wet fog: half the ambient fill, twice the reflection, thick blue-grey air with a cone under every lamp, exposure about a stop
  // and a third lower so lamp pools and wet highlights carry the picture, blue shadows against warm accents.
  cold: {
    sky: "cold",
    env: 0.5,
    spec: 2.1,
    keyK: 1.2,
    beam: 1.8,
    lampK: 13,
    viewLight: 2.1,
    viewFill: 2.6,
    fog: { sigma: 0.026, amb: [0.036, 0.062, 0.115], hazeCol: [0.02, 0.03, 0.05], haze: 0.6, maxDist: 60, height: 9, floor: 0.3, wisp: 0.55, wispScale: 0.085, g: 0.7 },
    grade: { key: 0.055, minE: 0.11, maxE: 5, bloom: 0.11, streak: 0.09, contrast: 0.34, sat: 1, vib: 0.22, toe: 1.5, pivot: 0.5, shadowTint: [0.8, 0.96, 1.22], highTint: [1.04, 1, 0.95], vignette: 0.38, lift: [9e-4, 22e-4, 68e-4] },
    road: [0.3, 0.12, 0.9, 0],
    ao: [1, 0.45, 0.75, 1.7],
    wet: {
      asphalt: { wetRough: 0.24 },
      pavers: { wetRough: 0.22 },
      concrete: { wetRough: 0.34 },
      brick: { wetRough: 0.45 },
      stucco: { wetRough: 0.5 },
      wood: { wetRough: 0.4 },
      carpaint: { rough: 0.85 },
      paint: { rough: 0.9 },
      steel: { rough: 0.75 },
      galv: { rough: 0.75 },
      chrome: { rough: 0.3 },
      plastic: { rough: 0.8 },
      glass: { env: 2.2 },
      glassT: { env: 2.2 }
    }
  }
};
var NCONE = 16;
var WETKEY = { wet: "x", wetRough: "y", beads: "z", streaks: "w" };
function createLook(G4, W, name = G4.params.look || "cold") {
  const R4 = G4.render, L = LOOKS[name] || LOOKS.cold, P3 = G4.params, vol = R4.M.vol.uniforms, gr = R4.M.grade.uniforms, f3 = L.fog, g2 = L.grade;
  R4.setSky(L.sky);
  R4.bakeEnvFromSky();
  R4.scene.environmentIntensity = +(P3.env || L.env);
  GLOBAL.uSpec.value = +(P3.spec || L.spec);
  for (const k of R4.keys) k.intensity *= L.keyK;
  R4.tune.viewFill = L.viewFill;
  vol.uSigma.value = +(P3.sigma || f3.sigma);
  vol.uAmb.value.setRGB(...f3.amb);
  vol.uHazeCol.value.setRGB(...f3.hazeCol);
  vol.uHaze.value = f3.haze;
  vol.uMaxDist.value = f3.maxDist;
  vol.uG.value = f3.g;
  vol.uFogP.value.set(f3.height, f3.floor, f3.wisp, f3.wispScale);
  R4.M.comp.uniforms.uAoK.value = L.ao[0];
  R4.M.comp.uniforms.uAoLit.value = L.ao[1];
  R4.M.ao.uniforms.uRadius.value = L.ao[2];
  R4.M.ao.uniforms.uPower.value = L.ao[3];
  gr.uKey.value = +(P3.key || g2.key);
  gr.uMinE.value = g2.minE;
  gr.uMaxE.value = g2.maxE;
  R4.bloom = g2.bloom;
  gr.uStreak.value = g2.streak;
  gr.uContrast.value = g2.contrast;
  gr.uSat.value = g2.sat;
  gr.uVib.value = g2.vib;
  gr.uToe.value = g2.toe;
  gr.uTintPivot.value = g2.pivot;
  gr.uShadowTint.value.setRGB(...g2.shadowTint);
  gr.uHighTint.value.setRGB(...g2.highTint);
  gr.uVignette.value = g2.vignette;
  gr.uLift.value.setRGB(...g2.lift);
  const mats = G4.wmats || {};
  for (const n in L.wet) {
    const m = mats[n], o = L.wet[n];
    if (!m) continue;
    const u = m.userData.u;
    for (const k in o) {
      if (WETKEY[k] && u) u.uWetP.value[WETKEY[k]] = o[k];
      else if (k === "rough") m.roughness *= o[k];
      else if (k === "metal") m.metalness = o[k];
      else if (k === "env") m.envMapIntensity = o[k];
    }
  }
  const road = W.ground && W.ground.mat && W.ground.mat.userData.road;
  if (road && road.uGLook) road.uGLook.value.set(...L.road);
  const src = [];
  for (const l of W.lights || []) {
    if (!l.dir || !l.cone) continue;
    const dir = new Vector3(l.dir[0], l.dir[1], l.dir[2]).normalize(), pos = new Vector3(l.p[0], l.p[1], l.p[2]).addScaledVector(dir, -(l.back || 0));
    src.push({ l, pos, dir, cosO: Math.cos(l.cone), cosI: Math.cos(l.cone * (1 - (l.soft ?? 0.45))), range: (l.reach || (l.dist || 9) * 1.6) + (l.back || 0), beam: l.beam ?? 1, s: 0 });
  }
  const slots = Array.from({ length: NCONE }, () => ({ pos: new Vector3(), dir: new Vector3(), col: new Vector3(), range: 1, cosO: 0, cosI: 0 }));
  const spots = [], fwd = new Vector3(), v = new Vector3();
  const addSpot = (light, o = {}) => {
    spots.push({ light, beam: o.beam ?? 1, range: o.range || 30 });
  };
  function update(cam) {
    R4.cones.length = 0;
    if (!L.beam) return;
    let n = 0;
    for (const e of spots) {
      const li = e.light;
      if (!(li.intensity > 0.01) || n >= NCONE) continue;
      const s = slots[n++];
      li.getWorldPosition(s.pos);
      li.target.getWorldPosition(s.dir).sub(s.pos).normalize();
      const I = li.intensity * e.beam * L.beam;
      s.col.set(li.color.r * I, li.color.g * I, li.color.b * I);
      s.range = e.range;
      s.cosO = Math.cos(li.angle);
      s.cosI = Math.cos(li.angle * (1 - li.penumbra * 0.8));
      R4.cones.push(s);
    }
    R4.camera.getWorldDirection(fwd);
    for (const c of src) {
      const k = c.l.k ?? 1, d2 = c.pos.distanceToSquared(cam);
      v.copy(c.pos).sub(cam);
      const ahead = v.dot(fwd) > -c.range ? 1 : 0.2;
      c.s = (c.l.power || 6) * k * c.beam * ahead / (d2 + 40);
    }
    src.sort((a, b) => b.s - a.s);
    const room = NCONE - n, lim = src.length > room ? src[room].s : 0;
    for (let i = 0; i < Math.min(room, src.length); i++) {
      const c = src[i], col = c.l.color || { r: c.l.col[0], g: c.l.col[1], b: c.l.col[2] }, fade = lim > 0 ? Math.min(1, (c.s - lim) / (lim * 0.35)) : 1, I = (c.l.power || 6) * L.lampK * (c.l.k ?? 1) * c.beam * L.beam * fade;
      if (I <= 0) continue;
      const s = slots[n++];
      s.pos.copy(c.pos);
      s.dir.copy(c.dir);
      s.col.set(col.r * I, col.g * I, col.b * I);
      s.range = c.range;
      s.cosO = c.cosO;
      s.cosI = c.cosI;
      R4.cones.push(s);
    }
  }
  R4.prepasses.push((renderer, scene, camera) => update(camera.position));
  return { name: LOOKS[name] ? name : "cold", def: L, update, addSpot, cones: src };
}

