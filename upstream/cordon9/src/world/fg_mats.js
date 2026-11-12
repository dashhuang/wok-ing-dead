var em2 = (r, g2, b, k = 1) => new MeshBasicMaterial({ color: new Color(r * k, g2 * k, b * k), toneMapped: false });
function fieldMaterials(G4) {
  if (G4.fmats) return G4.fmats;
  const base = worldMaterials(G4), M = G4.mats, D = DoubleSide, A = fieldAtlas(), F2 = foliageSheet();
  const paintO = { wet: 0.1, wetRough: 0.55, beads: 0.7, macro: 0.1, macroScale: 1.4, wear: 0.25, wearCol: [0.3, 0.29, 0.28], wearRough: 0.5, wearMetal: 0.8, dirt: 0.85, dirtCol: [0.34, 0.3, 0.25] };
  const mats = Object.assign(/* @__PURE__ */ Object.create(null), base, {
    turf: M.surface("f-turfS", "turf", { wet: 0.5, wetRough: 0.5, macro: 0.2, macroScale: 0.3, dirt: 0.6, dirtCol: [0.2, 0.16, 0.1] }),
    mud: M.surface("f-mudS", "mud", { wet: 0.9, wetRough: 0.25, macro: 0.2, macroScale: 0.4 }),
    gravel: M.surface("f-gravel", "gravel", { wet: 0.6, wetRough: 0.45, macro: 0.16, macroScale: 0.5, dirt: 0.7, dirtCol: [0.22, 0.19, 0.15] }),
    block: M.surface("f-block", "block", { wet: 0.35, wetRough: 0.55, macro: 0.14, macroScale: 0.4, streaks: 0.9, dirt: 0.9, dirtCol: [0.26, 0.24, 0.2] }),
    court: M.surface("f-court", "court", { wet: 0, wetRough: 1, macro: 0.08, macroScale: 0.3, dirt: 0.5, dirtCol: [0.2, 0.17, 0.13], env: 1.3 }),
    bark: M.surface("f-bark", "bark", { wet: 0.6, wetRough: 0.6, macro: 0.2, macroScale: 1.2, dirt: 0.4 }),
    // wet PVC tent skin and olive canvas: the same cloth bake as map 1's tarp at other weaves, tinted by vertex colour
    pvc: M.surface("f-pvc", "cloth", { bake: { p: [90, 6, 0, 0.02], key: "cloth-pvc" }, side: D, rough: 0.34, wet: 0.3, wetRough: 0.5, beads: 1, macro: 0.12, macroScale: 0.9, nrm: 0.45, dirt: 0.9, dirtCol: [0.3, 0.29, 0.24] }),
    // moulded bin plastic: its own bake (recipes_field.js) with even roughness. Map 1's plastic has chalky patches that read as camouflage on a dark bin
    hdpe: M.surface("f-hdpe", "hdpe", { wetCoat: 0.6, wet: 0.15, wetRough: 0.6, beads: 0.9, macro: 0.05, macroScale: 2, dirt: 0.5, dirtCol: [0.3, 0.28, 0.24] }),
    // military paint: flat, chipped to primer
    milpaint: M.surface("f-milpaint", "paint", { bake: { p: [0.14, 0.9, 0, 0], key: "paint-mil" }, scale: 1 / 0.9, ...paintO, wear: 0.55, wearCol: [0.42, 0.4, 0.34], wearMetal: 0.5, rough: 1.25 }),
    signF: new MeshStandardMaterial({ map: A.tex, roughness: 0.42, metalness: 0, alphaTest: 0.5, side: D }),
    decalF: new MeshStandardMaterial({ map: A.tex, transparent: true, depthWrite: false, roughness: 0.8, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    signFLit: new MeshBasicMaterial({ map: A.tex, color: new Color(2.6, 2.6, 2.6), toneMapped: false, blending: AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    foliage: new MeshStandardMaterial({ map: F2.tex, alphaTest: 0.5, side: D, roughness: 0.92, metalness: 0, vertexColors: true, envMapIntensity: 0.18 }),
    meshNet: new MeshStandardMaterial({ map: netTexture(), alphaTest: 0.45, side: D, roughness: 0.8, metalness: 0 }),
    meshWeld: new MeshStandardMaterial({ map: weldTexture(), alphaTest: 0.4, side: D, roughness: 0.38, metalness: 0.5, envMapIntensity: 1.2 }),
    // stadium lamps are metal halide: cool white with a green cast. One bucket per circuit so a dead or failing mast can be dimmed
    lampFlood: em2(0.8, 0.95, 1, 16),
    lampFloodF: em2(0.8, 0.95, 1, 16),
    lampHall: em2(0.86, 0.96, 1, 9),
    lampCyan: em2(0.5, 0.9, 1, 7),
    lampTube: em2(0.82, 0.92, 1, 6),
    lampTubeF: em2(0.82, 0.92, 1, 6),
    emGreen: em2(0.1, 1, 0.35, 4),
    emCab: em2(1, 0.62, 0.3, 2.2)
  });
  mats.meshNet.map.repeat.set(1 / 0.12, 1 / 0.12);
  mats.meshWeld.map.repeat.set(1 / 0.2, 1 / 0.6);
  G4.fmats = mats;
  G4.fatlas = { signs: A, foliage: F2, marks: worldAtlases().marks };
  return mats;
}

