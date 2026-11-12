var tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
var BLANK = [2155905152, 4278241535, 4294934656];
function createBakeQueue({ renderer, tex, split, log }) {
  const gl = renderer.getContext(), pending = [], targets = /* @__PURE__ */ new Map();
  const tri = new BufferGeometry();
  tri.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mesh = new Mesh(tri, null);
  mesh.frustumCulled = false;
  const sc2 = new Scene();
  sc2.add(mesh);
  const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let failure = null;
  function target(size) {
    let rt = targets.get(size);
    if (!rt) {
      rt = new WebGLRenderTarget(size, size, { count: split ? 1 : 3, type: UnsignedByteType, format: RGBAFormat, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false });
      targets.set(size, rt);
    }
    return rt;
  }
  function bound(size, fn) {
    const prevRT = renderer.getRenderTarget(), prevAuto = renderer.autoClear;
    try {
      renderer.autoClear = false;
      renderer.setRenderTarget(target(size));
      fn(target(size));
    } finally {
      renderer.setRenderTarget(prevRT);
      renderer.autoClear = prevAuto;
    }
  }
  function add({ id, rc, size, p, seed }) {
    const bufs = BLANK.map((c) => {
      const b = new Uint8Array(size * size * 4);
      new Uint32Array(b.buffer).fill(c);
      return b;
    });
    const frag = (LIB + rc.glsl + MAIN).replace(/\bsmoothstep\(/g, "ss(");
    const pp = p || rc.p || [0, 0, 0, 0];
    const mats = (split ? [0, 1, 2] : [-1]).map((pass) => {
      const m = new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: BAKE_VERT, fragmentShader: frag, depthTest: false, depthWrite: false, defines: pass < 0 ? {} : { BAKE_PASS: pass }, uniforms: { uSeed: { value: seed + 1 }, uTexel: { value: 1 / size }, uBump: { value: (rc.bump || 4) * (size / 1024) }, uP: { value: new Vector4(pp[0], pp[1], pp[2], pp[3]) }, uZero: { value: 0 } } });
      m.name = "bake-" + id + (pass < 0 ? "" : "-" + pass);
      return m;
    });
    const out = { name: id, size, tile: rc.tile, alb: tex(bufs[0], size, size, true), orm: tex(bufs[1], size, size, false), nrm: tex(bufs[2], size, size, false) };
    try {
      bound(size, () => {
        for (const m of mats) {
          mesh.material = m;
          renderer.compile(sc2, cam);
        }
      });
    } catch (e) {
      console.warn("[bake] early compile failed for " + id + ": " + (e.message || e));
    }
    pending.push({ id, size, bufs, mats, out, t0: performance.now() });
    return out;
  }
  function run(job) {
    const { size, bufs, mats, out } = job, t1 = performance.now();
    const nb2 = bufs[2];
    nb2[3] = 0;
    nb2[nb2.length - 1] = 0;
    try {
      bound(size, (rt) => {
        mats.forEach((m, i) => {
          mesh.material = m;
          renderer.render(sc2, cam);
          if (split) renderer.readRenderTargetPixels(rt, 0, 0, size, size, bufs[i]);
        });
        if (!split) for (let i = 0; i < 3; i++) renderer.readRenderTargetPixels(rt, 0, 0, size, size, bufs[i], void 0, i);
      });
    } finally {
      for (const m of mats) m.dispose();
    }
    if (gl.isContextLost() || nb2[3] !== 255 || nb2[nb2.length - 1] !== 255) {
      bufs.forEach((b, i) => new Uint32Array(b.buffer).fill(BLANK[i]));
      failure = 'surface bake "' + job.id + '" read back nothing: the graphics context was lost during loading';
    }
    for (const t of [out.alb, out.orm, out.nrm]) t.needsUpdate = true;
    log.push([job.id, size, Math.round(performance.now() - t1), Math.round(performance.now() - job.t0)]);
  }
  async function flush(onStep = null) {
    let n = 0;
    const total = pending.length;
    while (pending.length && !failure) {
      const job = pending[0];
      if (!await programsReady(renderer, job.mats)) {
        failure = 'the graphics context was lost while surface "' + job.id + '" was compiling';
        break;
      }
      run(job);
      pending.shift();
      n++;
      if (onStep) await onStep(n, Math.max(total, n), job.id);
      else await tick();
    }
    if (!pending.length || failure) {
      for (const rt of targets.values()) rt.dispose();
      targets.clear();
    }
    if (failure) throw new Error(failure);
    return n;
  }
  return { add, flush, get pending() {
    return pending.length;
  }, get failure() {
    return failure;
  }, split };
}

