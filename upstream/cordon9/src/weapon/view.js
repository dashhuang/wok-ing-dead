var ATLAS = null;
var weaponDecals = () => ATLAS || (ATLAS = weaponAtlas());
function weaponMaterials(M) {
  const metalWet = { beads: 0.5, nrm: 0.7, wet: 0.06, wetRough: 0.72, macro: 0.07, macroScale: 9, streaks: 0.4 };
  return {
    gun: M.surface("w-gun", "gunmetal", { ...metalWet, wear: 0.26, wearCol: [0.3, 0.3, 0.31], wearRough: 0.34 }),
    ano: M.surface("w-ano", "anodized", { ...metalWet, wear: 0.3, wearCol: [0.42, 0.42, 0.44], wearRough: 0.36 }),
    poly: M.surface("w-poly", "polymer", { beads: 0.9, wet: 0.12, wetRough: 0.68, macro: 0.07, macroScale: 9, wear: 0.4, wearCol: [0.09, 0.088, 0.085], wearMetal: 0, wearRough: 0.42, dirt: 0.5 }),
    rubber: M.surface("w-rubber", "rubber", { beads: 0.6, wet: 0.15, wetRough: 0.72, macroScale: 9 }),
    bare: M.surface("w-bare", "steel", { beads: 0.8, wet: 0.04, wetRough: 0.8, macro: 0.06, macroScale: 9 }),
    mag: M.surface("w-mag", "paint", { bake: { p: [0.3, 0.75, 0, 0], key: "paint-mag" }, scale: 1 / 0.2, ...metalWet, wear: 0.46, wearCol: [0.26, 0.26, 0.26], wearRough: 0.38 }),
    brass: M.surface("w-brass", "brass", { wet: 0.02, macro: 0.05, macroScale: 20 }),
    copper: M.surface("w-copper", "brass", { color: new Color(1, 0.5, 0.36), wet: 0.02, macro: 0.05, macroScale: 20 }),
    // optic glass: nearly clear so the target reads through it at night; the coating only shows as a faint tinted reflection
    glassF: new MeshStandardMaterial({ color: new Color(0.6, 0.2, 0.08), metalness: 1, roughness: 0.05, transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false, envMapIntensity: 0.9 }),
    glassR: new MeshStandardMaterial({ color: new Color(0.05, 0.1, 0.11), metalness: 1, roughness: 0.05, transparent: true, opacity: 0.05, side: DoubleSide, depthWrite: false, envMapIntensity: 0.7 }),
    liner: new MeshStandardMaterial({ color: new Color(6e-3, 6e-3, 7e-3), metalness: 0, roughness: 0.95, envMapIntensity: 0.15, side: DoubleSide }),
    decal: decalMaterial(weaponDecals().tex, { rough: 0.55 }),
    dot: new MeshBasicMaterial({ color: new Color(22, 1, 0.5), toneMapped: false, transparent: true, depthWrite: false }),
    trit: new MeshBasicMaterial({ color: new Color(0.5, 2.6, 0.9), toneMapped: false })
  };
}
function createRifle(G4, { layer = LAYER_VIEW } = {}) {
  const t0 = performance.now(), parts = buildRifle({ rect: weaponDecals().rect }), mats = WMATS || (WMATS = weaponMaterials(G4.mats));
  const root = new Group();
  root.name = "rifle";
  const out = { root, RIFLE, stats: {}, mats };
  let total = 0;
  for (const k of ["body", "mag", "bolt", "trig", "sel"]) {
    const st = parts[k].stats();
    out.stats[k] = st;
    total += st.total;
    const grp = parts[k].build(mats, { layer });
    grp.name = k;
    out[k] = grp;
    root.add(grp);
    for (const me of grp.children) {
      me.frustumCulled = false;
      if (me.material.transparent) {
        me.castShadow = false;
        me.renderOrder = me.material === mats.dot ? 6 : me.material === mats.decal ? 2 : 5;
      }
    }
  }
  out.stats.total = total;
  out.stats.buildMs = Math.round(performance.now() - t0);
  return out;
}
var WMATS = null;
function createPistol(G4, { layer = LAYER_VIEW } = {}) {
  const t0 = performance.now(), parts = buildPistol({ rect: weaponDecals().rect }), mats = WMATS || (WMATS = weaponMaterials(G4.mats));
  const root = new Group();
  root.name = "pistol";
  const out = { root, PISTOL, stats: {}, mats };
  let total = 0;
  for (const k of ["body", "slide", "mag", "trig"]) {
    const st = parts[k].stats();
    out.stats[k] = st;
    total += st.total;
    const grp = parts[k].build(mats, { layer });
    grp.name = k;
    out[k] = grp;
    root.add(grp);
    for (const me of grp.children) {
      me.frustumCulled = false;
      if (me.material.transparent) {
        me.castShadow = false;
        me.renderOrder = me.material === mats.decal ? 2 : 5;
      }
    }
  }
  out.stats.total = total;
  out.stats.buildMs = Math.round(performance.now() - t0);
  return out;
}
function handMaterials(M) {
  return {
    glove: M.surface("h-glove", "butyl", { wet: 0.1, wetRough: 0.5, beads: 0.45, macro: 0.05, macroScale: 12, nrm: 0.9, dirt: 0.55, dirtCol: [1.9, 1.85, 1.7], wear: 0.3, wearCol: [0.035, 0.035, 0.036], wearMetal: 0, wearRough: 0.34 }),
    sleeve: M.surface("h-sleeve", "cloth", { bake: { p: [64, 0, 0, 0.02], key: "cloth-coated" }, rough: 0.56, wet: 0.2, wetRough: 0.6, beads: 1, macro: 0.16, macroScale: 6, nrm: 0.45, dirt: 0.8, dirtCol: [0.36, 0.33, 0.28], wear: 0.25, wearCol: [0.42, 0.33, 0.1], wearMetal: 0, wearRough: 0.4 }),
    tape: M.surface("h-tape", "cloth", { bake: { p: [90, 0, 0, 0], key: "cloth-tape" }, rough: 0.6, wet: 0.2, wetRough: 0.6, beads: 0.8, macro: 0.12, macroScale: 10, nrm: 0.5 }),
    strap: M.surface("h-strap", "cloth", { bake: { p: [30, 0, 0, 0.2], key: "cloth-web" }, wet: 0.5, wetRough: 0.8, macroScale: 12, nrm: 1.3 }),
    hard: M.surface("w-poly", "polymer", {}),
    metal: M.surface("w-bare", "steel", {}),
    decal: decalMaterial(weaponDecals().tex, { rough: 0.25 })
  };
}
function createHands(G4, { layer = LAYER_VIEW, sides = ["right", "left"], grips } = {}) {
  const parts = buildHands({ rect: weaponDecals().rect, sides, grips }), mats = handMaterials(G4.mats), out = { stats: {} };
  for (const k of sides) {
    out.stats[k] = parts[k].stats();
    const grp = parts[k].build(mats, { layer });
    grp.name = k + "Hand";
    for (const me of grp.children) {
      me.frustumCulled = false;
      if (me.material.transparent) {
        me.castShadow = false;
        me.renderOrder = 2;
      }
    }
    out[k] = grp;
  }
  return out;
}

