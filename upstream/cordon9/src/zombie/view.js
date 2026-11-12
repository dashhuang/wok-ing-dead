function eyeMaterial() {
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.17, metalness: 0, envMapIntensity: 0.4 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n{ float cxLum = dot(vColor.rgb, vec3(0.3, 0.55, 0.15)); totalEmissiveRadiance += vColor.rgb * smoothstep(0.2, 0.3, cxLum) * 0.006; }\n#endif");
  };
  m.customProgramCacheKey = () => "cx-eye";
  return m;
}
function tipFade(m) {
  const f3 = m.onBeforeCompile, k = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    f3(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\n{ float cxIgn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (vCxMask.x > 0.03 + 0.97 * cxIgn) discard; }");
  };
  m.customProgramCacheKey = () => k + "-tip";
  return m;
}
function zombieMaterials(M) {
  const D = DoubleSide, cl8 = (key, p, o = {}) => M.surface("z-" + key, "cloth", { bake: { p, key: "cloth-" + key }, side: D, wet: 0.78, wetRough: 0.6, macro: 0.12, macroScale: 4, dirt: 0.55, dirtCol: [0.3, 0.26, 0.22], blood: 0.88, bloodCol: [0.17, 8e-3, 6e-3], bloodWet: [0.62, 0.16, 1], ...o });
  const skin = { wet: 0.2, wetRough: 0.5, macro: 0.12, macroScale: 6, dirt: 0.85, dirtCol: [0.32, 0.24, 0.22], nrm: 1.2, beads: 0.45, blood: 1, bloodCol: [0.26, 0.011, 8e-3], bloodWet: [1, 0.09, 1.15] };
  return {
    skin: M.surface("z-skin", "zskin", skin),
    skinD: M.surface("z-skinD", "zskin", { ...skin, side: D, beads: 0 }),
    eye: eyeMaterial(),
    bone: M.surface("z-bone", "bone", { wet: 0.25, wetRough: 0.5, macroScale: 20 }),
    hair: tipFade(M.surface("z-hair", "hair", { color: new Color(0.05, 0.038, 0.03), side: D, rough: 1.3, wet: 0.12, wetRough: 0.8, macro: 0.3, macroScale: 14, nrm: 2 })),
    pants: cl8("twill", [46, 0, 1, 0.3], { wrinkle: [15, 25e-4, 0.15] }),
    shirt: cl8("shirt", [84, 0, 0, 0.12], { nrm: 0.7, wetRough: 0.5, wrinkle: [21, 12e-4, 0.14] }),
    jacket: cl8("wool", [38, 0, 1, 0.55], { nrm: 1.2, wrinkle: [13, 16e-4, 0.16] }),
    leather: M.surface("z-leather", "leather", { wet: 0.4, wetRough: 0.45, beads: 0.6, macroScale: 8, wear: 0.5, wearCol: [0.2, 0.15, 0.1], wearMetal: 0, wearRough: 0.6 }),
    metal: M.surface("w-bare", "steel", {}),
    rubber: M.surface("z-rubber", "rubber", { wet: 0.3, macroScale: 9 }),
    gore: M.surface("z-gore", "gore", { wet: 0.7, wetRough: 0.3, macro: 0.15, macroScale: 20, nrm: 1.4, dirt: 0.45, dirtCol: [0.25, 0.1, 0.1], coat: 0.85, coatRough: 0.12 })
    // raw flesh keeps a film of fluid: a clear coat gives it the sharp highlight
  };
}
var CACHE = /* @__PURE__ */ new Map();
function zombieGeometry(type, seed, lod) {
  const key = type + ":" + seed + ":" + lod;
  if (CACHE.has(key)) return CACHE.get(key);
  const z = buildZombie({ type, seed, lod }), geos = {};
  for (const [k, arr] of z.bucket.map) {
    const g2 = merge(arr);
    g2.computeBoundingSphere();
    geos[k] = g2;
  }
  const out = { geos, joints: z.joints, stats: z.bucket.stats(), wounds: z.wounds };
  CACHE.set(key, out);
  return out;
}
var NEAR = 1;
function createZombie(G4, { type = "walker", seed = 1, lods = [0], layer = 0 } = {}) {
  const near = G4.params && G4.params.znear != null ? +G4.params.znear : NEAR;
  lods = lods.map((l) => Math.max(l, near));
  const mats = G4.zmats || (G4.zmats = zombieMaterials(G4.mats)), base = zombieGeometry(type, seed, lods[0]), Z = createRig(base.joints, type, seed);
  Z.lods = lods.map((l) => {
    const zg = zombieGeometry(type, seed, l), grp = new Group();
    grp.name = "lod" + l;
    for (const [k, g2] of Object.entries(zg.geos)) {
      const me = new SkinnedMesh(g2, mats[k]);
      if (!mats[k]) throw new Error("no zombie material " + k);
      me.name = k;
      me.castShadow = true;
      me.receiveShadow = true;
      me.frustumCulled = false;
      me.layers.set(layer);
      me.bind(Z.skeleton, new Matrix4());
      grp.add(me);
    }
    Z.root.add(grp);
    return { group: grp, stats: zg.stats };
  });
  Z.setLod = (i) => Z.lods.forEach((l, k) => {
    l.group.visible = k === i;
  });
  Z.setLod(0);
  Z.stats = base.stats;
  return Z;
}

