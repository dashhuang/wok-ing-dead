function createMaterials({ renderer, quality, noise: noise2 }) {
  const base = Math.min(quality.tex || 1024, 1024);
  GLOBAL.coat = quality.coat !== false;
  const sets = /* @__PURE__ */ new Map(), log = [];
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  GLOBAL.tNoise.value = noise2;
  function tex(buf2, w, h, srgb) {
    const t = new DataTexture(buf2, w, h, RGBAFormat, UnsignedByteType);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.magFilter = LinearFilter;
    t.minFilter = LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = aniso;
    t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    t.needsUpdate = true;
    return t;
  }
  const queue = createBakeQueue({ renderer, tex, split: !!quality.bakeSplit, log });
  const flush = (step2 = null, label2 = "Baking surfaces") => queue.flush(step2 ? (n, total) => step2(label2 + " " + n + " / " + total) : null);
  function bake(name, { p = null, seed = 0, key = null, res = null } = {}) {
    const id = key || name;
    if (sets.has(id)) return sets.get(id);
    const rc = RECIPES[name];
    if (!rc) throw new Error("unknown recipe " + name);
    const size = Math.max(64, Math.round(base * (res || rc.res || 1)));
    const out = queue.add({ id, rc, size, p, seed });
    sets.set(id, out);
    return out;
  }
  const surfaces = /* @__PURE__ */ new Map();
  function surface(key, setName, opts = {}) {
    if (surfaces.has(key)) return surfaces.get(key);
    const set = bake(setName, opts.bake || {});
    const m = makeSurface(set, opts);
    m.name = key;
    surfaces.set(key, m);
    return m;
  }
  return { bake, surface, flush, get pending() {
    return queue.pending;
  }, split: queue.split, get: (k) => surfaces.get(k), sets, log, update(dt, t) {
    GLOBAL.uTime.value = t;
  }, setWet(w) {
    GLOBAL.uWet.value = w;
  }, stats() {
    let mb = 0;
    for (const s of sets.values()) mb += s.size * s.size * 4 * 3 * 1.333 / 1048576;
    return { sets: sets.size, surfaces: surfaces.size, textureMBEstimate: +mb.toFixed(1) };
  } };
}

