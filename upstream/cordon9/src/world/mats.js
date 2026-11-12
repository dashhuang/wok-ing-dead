var ATL = null;
var worldAtlases = () => ATL || (ATL = { signs: signAtlas(), marks: markAtlas(), windows: windowAtlas() });
var em = (r, g2, b, k = 1) => new MeshBasicMaterial({ color: new Color(r * k, g2 * k, b * k), toneMapped: false });
function worldMaterials(G4) {
  if (G4.wmats) return G4.wmats;
  const M = G4.mats, A = worldAtlases(), D = DoubleSide;
  const paintO = { wet: 0.1, wetRough: 0.55, beads: 0.7, macro: 0.1, macroScale: 1.4, wear: 0.25, wearCol: [0.3, 0.29, 0.28], wearRough: 0.5, wearMetal: 0.8, dirt: 0.85, dirtCol: [0.34, 0.3, 0.25] };
  const signMat = (o) => {
    const m = new MeshStandardMaterial({ map: A.signs.tex, roughness: 0.5, metalness: 0, alphaTest: 0.5, side: D, ...o });
    return m;
  };
  const mats = {
    concrete: M.surface("w-concrete", "concrete", { wetCoat: 0.55, wet: 0.6, wetRough: 0.5, macro: 0.16, macroScale: 0.5, wear: 0.5, wearCol: [0.62, 0.6, 0.56], wearMetal: 0, wearRough: 0.9, dirt: 0.9, dirtCol: [0.3, 0.27, 0.23] }),
    asphalt: M.surface("w-asphalt", "asphalt", { wetCoat: 0.6, wet: 0.7, wetRough: 0.35, macro: 0.14, macroScale: 0.4 }),
    pavers: M.surface("w-pavers", "pavers", { wetCoat: 0.65, wet: 0.65, wetRough: 0.32, macro: 0.14, macroScale: 0.5, dirt: 0.8, dirtCol: [0.3, 0.28, 0.24] }),
    brick: M.surface("w-brick", "brick", { wetCoat: 0.5, wet: 0.45, wetRough: 0.6, macro: 0.16, macroScale: 0.45, streaks: 0.9, dirt: 0.9, dirtCol: [0.28, 0.24, 0.2] }),
    stucco: M.surface("w-stucco", "stucco", { wetCoat: 0.45, wet: 0.4, wetRough: 0.6, macro: 0.12, macroScale: 0.5, streaks: 0.9, dirt: 0.9, dirtCol: [0.32, 0.28, 0.23] }),
    tile: M.surface("w-tile", "tile", { wetCoat: 0.8, wet: 0.05, wetRough: 0.7, beads: 0.8, macro: 0.05, macroScale: 1, dirt: 0.8 }),
    galv: M.surface("w-galv", "galv", { wetCoat: 0.5, wet: 0.06, wetRough: 0.7, beads: 0.8, macro: 0.08, macroScale: 1.5, dirt: 0.8, dirtCol: [0.3, 0.26, 0.2] }),
    steel: M.surface("w-steel", "steel", { wetCoat: 0.5, wet: 0.05, wetRough: 0.75, beads: 0.7, macro: 0.1, macroScale: 3, dirt: 0.8 }),
    paint: M.surface("w-paint", "paint", { wetCoat: 0.75, bake: { p: [0.16, 0.7, 0, 0], key: "paint-world" }, scale: 1 / 0.8, ...paintO }),
    paintOld: M.surface("w-paintOld", "paint", { wetCoat: 0.6, bake: { p: [0.6, 0.15, 0, 0], key: "paint-old" }, scale: 1 / 0.7, ...paintO, wear: 0.8 }),
    rust: M.surface("w-rust", "rust", { wet: 0.3, wetRough: 0.7, macro: 0.14, macroScale: 1.6, dirt: 0.7 }),
    plastic: M.surface("w-plastic", "plastic", { wetCoat: 0.7, wet: 0.06, wetRough: 0.6, beads: 0.9, macro: 0.08, macroScale: 2, wear: 0, wearCol: [0.75, 0.74, 0.72], wearMetal: 0, wearRough: 0.7, dirt: 0.9, dirtCol: [0.33, 0.3, 0.26] }),
    rubber: M.surface("w-rubberW", "rubber", { wetCoat: 0.4, wet: 0.25, wetRough: 0.6, beads: 0.3, macro: 0.1, macroScale: 3, dirt: 0.9, dirtCol: [0.5, 0.46, 0.4] }),
    wood: M.surface("w-wood", "wood", { wetCoat: 0.5, wet: 0.55, wetRough: 0.55, macro: 0.12, macroScale: 1.5, dirt: 0.8 }),
    tarp: M.surface("w-tarp", "cloth", { wetCoat: 0.7, bake: { p: [70, 10, 0, 0.02], key: "cloth-tarp" }, side: D, rough: 0.5, wet: 0.2, wetRough: 0.55, beads: 1, macro: 0.14, macroScale: 1.2, nrm: 0.6, dirt: 0.9, dirtCol: [0.36, 0.33, 0.28] }),
    burlap: M.surface("w-burlap", "cloth", { bake: { p: [22, 0, 0, 0.7], key: "cloth-burlap" }, wet: 0.6, wetRough: 0.8, macro: 0.16, macroScale: 3, nrm: 1.5, dirt: 0.9, dirtCol: [0.3, 0.26, 0.2] }),
    canvas: M.surface("w-canvas", "cloth", { wetCoat: 0.45, bake: { p: [44, 0, 1, 0.25], key: "cloth-canvas" }, side: D, wet: 0.55, wetRough: 0.7, macro: 0.14, macroScale: 2, nrm: 1, dirt: 0.9 }),
    carpaint: M.surface("w-carpaint", "carpaint", { coat: 1, coatRough: 0.05, wetCoat: 0.2, wet: 0.04, wetRough: 0.7, beads: 1, macro: 0.05, macroScale: 1.2, wear: 0, wearCol: [0.4, 0.4, 0.41], wearRough: 0.4, wearMetal: 0.9, dirt: 1, dirtCol: [0.3, 0.27, 0.22] }),
    trim: M.surface("w-trim", "polymer", { wetCoat: 0.5, wet: 0.1, wetRough: 0.6, beads: 0.8, macro: 0.08, macroScale: 3, dirt: 0.9, dirtCol: [1.6, 1.5, 1.35] }),
    chrome: M.surface("w-chrome", "steel", { color: new Color(1.5, 1.5, 1.55), rough: 0.45, wet: 0.02, beads: 0.8, macro: 0.06, macroScale: 4, dirt: 0.9 }),
    glass: M.surface("w-glass", "glass", { wet: 0, wetRough: 0.9, beads: 1, macro: 0.05, macroScale: 1, dirt: 0.5, env: 1.6 }),
    glassT: (() => {
      const m = M.surface("w-glassT", "glass", { wet: 0, wetRough: 0.9, beads: 1, macro: 0.05, macroScale: 1, dirt: 0.5, env: 1.6, side: D });
      m.transparent = true;
      m.opacity = 0.62;
      m.depthWrite = false;
      return m;
    })(),
    black: new MeshStandardMaterial({ color: 197379, roughness: 0.95, metalness: 0 }),
    sign: signMat({}),
    signFlat: signMat({ roughness: 0.75 }),
    decal: new MeshStandardMaterial({ map: A.signs.tex, transparent: true, depthWrite: false, roughness: 0.8, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    mark: new MeshStandardMaterial({ map: A.marks.tex, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    win: new MeshBasicMaterial({ map: A.windows.tex, color: new Color(2.2, 2, 1.8), toneMapped: false }),
    winFar: new MeshBasicMaterial({ map: A.windows.tex, color: new Color(1.3, 1.2, 1.1), toneMapped: false, fog: false }),
    lampCool: em(0.86, 0.93, 1, 11),
    lampWarm: em(1, 0.6, 0.24, 9),
    lampDim: em(1, 0.85, 0.65, 3),
    neonG: em(0.1, 1, 0.35, 7),
    neonR: em(1, 0.08, 0.1, 7),
    neonP: em(1, 0.15, 0.7, 6),
    neonB: em(0.15, 0.55, 1, 7),
    neonY: em(1, 0.75, 0.15, 6),
    emRed: em(1, 0.06, 0.03, 5),
    emAmber: em(1, 0.45, 0.04, 6),
    emBlue: em(0.1, 0.25, 1, 9),
    emWhite: em(1, 0.97, 0.9, 4),
    ledGreen: em(0.1, 1, 0.2, 2.5),
    ledRed: em(1, 0.05, 0.03, 2.5),
    emAmberB: em(1, 0.45, 0.04, 4.5),
    emRedB: em(1, 0.05, 0.03, 9),
    emBlueB: em(0.08, 0.22, 1, 11),
    emWhiteB: em(1, 0.97, 0.9, 6),
    signLit: new MeshBasicMaterial({ map: A.signs.tex, color: new Color(0.62, 0.6, 0.55), toneMapped: false, alphaTest: 0.5 })
  };
  mats.mesh = chainlinkMaterial();
  mats.razor = mats.galv;
  G4.wmats = mats;
  G4.watlas = A;
  return mats;
}
function chainlinkMaterial() {
  const S4 = 256, cv = document.createElement("canvas");
  cv.width = cv.height = S4;
  const c = cv.getContext("2d");
  c.clearRect(0, 0, S4, S4);
  const n = 4, cell = S4 / n;
  c.lineCap = "round";
  for (const [lw, col] of [[7.5, "#3a3d40"], [5, "#8c9196"], [1.8, "#c9cdd1"]]) {
    c.strokeStyle = col;
    c.lineWidth = lw;
    for (let i = -n; i < n * 2; i++) {
      c.beginPath();
      c.moveTo(i * cell, 0);
      c.lineTo(i * cell + S4, S4);
      c.stroke();
      c.beginPath();
      c.moveTo(i * cell + S4, 0);
      c.lineTo(i * cell, S4);
      c.stroke();
    }
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(1 / 0.26, 1 / 0.26);
  return new MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: DoubleSide, metalness: 0.85, roughness: 0.45, envMapIntensity: 1.2 });
}

