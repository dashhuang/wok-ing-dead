var WORLD_FOV = 74;
var VIEW_FOV = 54;
var LAYER_WORLD = 0;
var LAYER_VIEW = 1;
var QUALITY = {
  shot: { name: "shot", scale: 1, msaa: 4, shadow: 2048, tex: 1024, volSteps: 28, cone: 8, aoTaps: 14, shadowTaps: 28, search: 16 },
  low: { name: "low", scale: 0.7, msaa: 0, shadow: 1024, tex: 256, volSteps: 10, cone: 3, aoTaps: 6, shadowTaps: 8, search: 6, shadowBilinear: false, coat: false },
  medium: { name: "medium", scale: 0.85, msaa: 2, shadow: 2048, tex: 512, volSteps: 14, cone: 5, aoTaps: 8, shadowTaps: 12, search: 8, shadowBilinear: false },
  high: { name: "high", scale: 1, msaa: 4, shadow: 2048, tex: 1024, volSteps: 20, cone: 6, aoTaps: 12, shadowTaps: 16, search: 8 },
  ultra: { name: "ultra", scale: 1, msaa: 4, shadow: 4096, tex: 2048, volSteps: 32, cone: 8, aoTaps: 16, shadowTaps: 24, search: 12 }
};
var SPOT_NEAR = 0.5;
var SPOT_FAR = 80;
var stockShadowChunk = null;
function hardShadows() {
  const key = "shadowmap_pars_fragment";
  if (stockShadowChunk === null) stockShadowChunk = ShaderChunk[key];
  ShaderChunk[key] = lod0(stockShadowChunk);
  return false;
}
function patchShadows(q) {
  const key = "shadowmap_pars_fragment";
  if (stockShadowChunk === null) stockShadowChunk = ShaderChunk[key];
  const src = stockShadowChunk, a = src.indexOf("float getShadow("), c = src.indexOf("vec2 cubeToUV");
  let b = src.lastIndexOf("// cubeToUV()", c);
  if (b < a) b = c;
  if (a < 0 || c < 0 || b < a) {
    console.warn("[render] shadow chunk layout unexpected; keeping stock filtering");
    return false;
  }
  ShaderChunk[key] = src.slice(0, a) + lod0(softShadowChunk({ taps: q.shadowTaps, search: q.search, near: SPOT_NEAR, far: SPOT_FAR, bilinear: q.shadowBilinear !== false })) + "\n	" + src.slice(b);
  return true;
}
function noiseTex() {
  const d = new Uint8Array(256 * 256 * 4);
  let t = 2654435769;
  const r = () => {
    t ^= t << 13;
    t >>>= 0;
    t ^= t >>> 17;
    t ^= t << 5;
    t >>>= 0;
    return t / 4294967296;
  };
  for (let i = 0; i < 65536; i++) {
    d[i * 4] = r() * 256;
    d[i * 4 + 2] = r() * 256;
    d[i * 4 + 3] = r() * 256;
  }
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) d[(y * 256 + x) * 4 + 1] = d[((y + 17 & 255) * 256 + (x + 37 & 255)) * 4];
  const tex = new DataTexture(d, 256, 256, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
var SKY_PRESETS = {
  // wet night over a quarantined city: sodium glow on the cloud base, near-black zenith
  night: { show: 5.5, zen: [35e-4, 5e-3, 9e-3], hor: [0.012, 0.014, 0.02], glow: [0.085, 0.045, 0.02], glowDir: [0.3, 0.1, -1], lo: [6e-3, 7e-3, 0.011], hi: [0.03, 0.026, 0.024], cover: 0.75, card: [0, 0, 0], cardDir: [0, 1, 0] },
  // cold wet night: no sodium on the cloud base, a dim blue-grey horizon, so the sky and everything it lights sits on the blue side
  cold: { show: 4.2, zen: [22e-4, 42e-4, 95e-4], hor: [8e-3, 0.0125, 0.022], glow: [0.026, 0.034, 0.05], glowDir: [0.3, 0.1, -1], lo: [45e-4, 65e-4, 0.012], hi: [0.02, 0.025, 0.034], cover: 0.8, card: [0, 0, 0], cardDir: [0, 1, 0] },
  // neutral overcast studio for like-for-like asset comparison frames
  studio: { zen: [0.16, 0.2, 0.27], hor: [0.5, 0.5, 0.5], glow: [0.35, 0.27, 0.18], glowDir: [0.9, 0.2, 0.35], lo: [0.1, 0.12, 0.15], hi: [0.55, 0.55, 0.56], cover: 0.6, card: [3.2, 2.9, 2.5], cardDir: [0.75, 0.55, 0.36] }
};
function createPipeline({ canvas, quality, params = {} }) {
  const q = quality;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0, 1);
  const gl = renderer.getContext();
  const shaderErrors = [];
  renderer.debug.onShaderError = (g2, prog, vs, fs) => {
    let log = "";
    try {
      log = (g2.getShaderInfoLog(fs) || "") + " | " + (g2.getShaderInfoLog(vs) || "") + " | " + (g2.getProgramInfoLog(prog) || "");
    } catch {
    }
    let src = "";
    try {
      const m = /ERROR: \d+:(\d+)/.exec(log);
      if (m) {
        const lines = (g2.getShaderSource(/0:\d+/.test(g2.getShaderInfoLog(fs) || "") ? fs : vs) || "").split("\n");
        const n = +m[1];
        src = lines.slice(Math.max(0, n - 3), n + 1).join("\n");
      }
    } catch {
    }
    if (log === " |  | ") log = "link failed with no compiler message" + (g2.isContextLost() ? " (graphics context is lost)" : " (usual sign of a lost graphics context)");
    shaderErrors.push(log.slice(0, 500));
    console.error("[shader] " + log.slice(0, 700) + "\n" + src.slice(0, 500));
  };
  const softShadows = q.hardShadows ? hardShadows() : patchShadows(q);
  if (q.hardShadows) renderer.shadowMap.type = BasicShadowMap;
  const floatRT = !!renderer.extensions.get("EXT_color_buffer_float");
  if (!floatRT) console.warn("[render] EXT_color_buffer_float missing: HDR targets may fail");
  const scene = new Scene();
  const camera = new PerspectiveCamera(+(params.fov || WORLD_FOV), 16 / 9, 0.08, 600);
  camera.layers.set(LAYER_WORLD);
  scene.add(camera);
  const viewCamera = new PerspectiveCamera(VIEW_FOV, 16 / 9, 0.012, 6);
  viewCamera.layers.set(LAYER_VIEW);
  viewCamera.matrixAutoUpdate = false;
  viewCamera.matrixWorldAutoUpdate = false;
  const tNoise = noiseTex();
  const skyU = { tNoise: { value: tNoise }, uTime: { value: 0 }, uEnv: { value: 0 }, uShow: { value: 1 }, uFlash: { value: 0 }, uCover: { value: 0.7 }, uZen: { value: new Color() }, uHor: { value: new Color() }, uGlow: { value: new Color() }, uGlowDir: { value: new Vector3(0, 0, -1) }, uCloudLo: { value: new Color() }, uCloudHi: { value: new Color() }, uFlashDir: { value: new Vector3(0.4, 0.5, -0.7).normalize() }, uCard: { value: new Color(0, 0, 0) }, uCardDir: { value: new Vector3(0, 1, 0) } };
  const skyMat = new ShaderMaterial({ name: "cx-sky", side: BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false, uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: lod0(SKY_FRAG) });
  const skyGeo = new BoxGeometry(2, 2, 2);
  const sky = new Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1e3;
  sky.matrixAutoUpdate = false;
  sky.layers.set(LAYER_WORLD);
  scene.add(sky);
  const pmrem = new PMREMGenerator(renderer);
  let envRT = null;
  function setSky(name) {
    const p = SKY_PRESETS[name] || SKY_PRESETS.night;
    skyU.uZen.value.setRGB(...p.zen);
    skyU.uHor.value.setRGB(...p.hor);
    skyU.uGlow.value.setRGB(...p.glow);
    skyU.uGlowDir.value.set(...p.glowDir).normalize();
    skyU.uCloudLo.value.setRGB(...p.lo);
    skyU.uCloudHi.value.setRGB(...p.hi);
    skyU.uCover.value = p.cover;
    skyU.uCard.value.setRGB(...p.card);
    skyU.uCardDir.value.set(...p.cardDir).normalize();
    skyU.uShow.value = p.show ?? 1;
    api.skyName = name;
  }
  function bakeEnvFromSky(extra = null) {
    const es3 = new Scene();
    const m = skyMat.clone();
    m.uniforms.tNoise.value = tNoise;
    m.uniforms.uEnv.value = 1;
    for (const k of ["uZen", "uHor", "uGlow", "uGlowDir", "uCloudLo", "uCloudHi", "uCard", "uCardDir"]) m.uniforms[k].value.copy(skyU[k].value);
    m.uniforms.uCover.value = skyU.uCover.value;
    const me = new Mesh(skyGeo, m);
    me.frustumCulled = false;
    es3.add(me);
    if (extra) es3.add(extra);
    const rt = pmrem.fromScene(es3, 0, 0.1, 100);
    m.dispose();
    if (envRT) envRT.dispose();
    envRT = rt;
    scene.environment = rt.texture;
    api.env = rt.texture;
    renderer.setRenderTarget(null);
    return rt.texture;
  }
  function bakeEnvFromScene(pos, size = 256) {
    api.envFrom = [pos.clone(), size];
    api.envDeferred = !!(api.pendingBakes && api.pendingBakes());
    if (api.envDeferred) return null;
    const crt = new WebGLCubeRenderTarget(size, { type: HalfFloatType, generateMipmaps: false });
    const cc = new CubeCamera(0.2, 300, crt);
    cc.position.copy(pos);
    cc.layers.set(LAYER_WORLD);
    scene.add(cc);
    const prevEnv = scene.environment, show = skyU.uShow.value;
    renderer.shadowMap.needsUpdate = true;
    skyU.uShow.value = 1;
    cc.update(renderer, scene);
    scene.remove(cc);
    skyU.uShow.value = show;
    const rt = pmrem.fromCubemap(crt.texture);
    crt.dispose();
    if (envRT) envRT.dispose();
    envRT = rt;
    scene.environment = rt.texture;
    api.env = rt.texture;
    renderer.setRenderTarget(null);
    return rt.texture;
  }
  const keys = [];
  for (let i = 0; i < 2; i++) {
    const L = new SpotLight(16777215, 0, 0, 0.6, 0.5, 2);
    L.layers.enableAll();
    L.castShadow = true;
    L.shadow.mapSize.set(q.shadow, q.shadow);
    L.shadow.camera.near = SPOT_NEAR;
    L.shadow.camera.far = SPOT_FAR;
    L.shadow.bias = -12e-5;
    L.shadow.normalBias = 0.012;
    L.shadow.radius = 1;
    L.userData.size = 0.5;
    L.position.set(0, 10, 0);
    L.target.position.set(0, 0, 0);
    scene.add(L, L.target);
    keys.push(L);
  }
  function setKey(i, { pos, target, color = 16777215, intensity = 1e3, angle = 0.6, penumbra = 0.5, size = 0.5, shadow = true }) {
    const L = keys[i];
    L.position.set(...pos);
    L.target.position.set(...target);
    L.color.set(color);
    L.intensity = intensity;
    L.angle = angle;
    L.penumbra = penumbra;
    L.userData.size = size;
    L.userData.shadow = shadow;
    L.shadow.radius = size / (2 * Math.tan(angle));
    L.shadow.intensity = shadow ? 1 : 0;
    L.updateMatrixWorld();
    L.target.updateMatrixWorld();
  }
  const fills = [];
  for (let i = 0; i < 6; i++) {
    const L = new PointLight(16777215, 0, 12, 2);
    L.layers.enableAll();
    L.userData.glow = 0;
    scene.add(L);
    fills.push(L);
  }
  const viewLight = new PointLight(12570854, 0, 1.6, 1.4);
  viewLight.position.set(0.25, 0.22, 0.1);
  viewLight.layers.enableAll();
  camera.add(viewLight);
  const HF = HalfFloatType;
  const mk = (w, h, o = {}) => new WebGLRenderTarget(w, h, { type: HF, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false, ...o });
  let W = 4, H2 = 4, hw = 2, hh = 2;
  const T3 = { hdr: null, hdr2: null, z: null, aoA: null, aoB: null, volA: null, volB: null, bloom: [], bloomUp: [], streakA: null, streakB: null, ldr: null };
  const adapt = [mk(1, 1, { minFilter: NearestFilter, magFilter: NearestFilter }), mk(1, 1, { minFilter: NearestFilter, magFilter: NearestFilter })];
  let adaptI = 0, adaptInit = false;
  const BLOOM_N = 6;
  function allocate(w, h) {
    for (const k of Object.keys(T3)) {
      const v = T3[k];
      if (Array.isArray(v)) {
        v.forEach((t) => t.dispose());
        T3[k] = [];
      } else if (v) {
        if (v.depthTexture) v.depthTexture.dispose();
        v.dispose();
        T3[k] = null;
      }
    }
    W = w;
    H2 = h;
    hw = Math.max(2, w >> 1);
    hh = Math.max(2, h >> 1);
    const dt = new DepthTexture(w, h);
    dt.type = UnsignedIntType;
    dt.minFilter = dt.magFilter = NearestFilter;
    T3.hdr = new WebGLRenderTarget(w, h, { type: HF, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, samples: q.msaa, depthBuffer: true, stencilBuffer: false, depthTexture: dt, generateMipmaps: false });
    T3.hdr2 = mk(w, h);
    T3.z = new WebGLRenderTarget(hw, hh, { type: floatRT ? FloatType : HF, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false, generateMipmaps: false });
    T3.aoA = mk(hw, hh, { type: UnsignedByteType });
    T3.aoB = mk(hw, hh, { type: UnsignedByteType });
    T3.volA = mk(hw, hh);
    T3.volB = mk(hw, hh);
    let bw = w, bh = h;
    for (let i = 0; i < BLOOM_N; i++) {
      bw = Math.max(2, bw >> 1);
      bh = Math.max(2, bh >> 1);
      T3.bloom.push(mk(bw, bh));
      T3.bloomUp.push(mk(bw, bh));
    }
    T3.streakA = mk(Math.max(2, w >> 2), Math.max(2, h >> 2));
    T3.streakB = mk(Math.max(2, w >> 2), Math.max(2, h >> 2));
    T3.ldr = mk(w, h, { type: UnsignedByteType });
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewCamera.aspect = w / h;
    viewCamera.updateProjectionMatrix();
  }
  const fsGeo = new BufferGeometry();
  fsGeo.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  fsGeo.setAttribute("uv", new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const fsMesh = new Mesh(fsGeo, null);
  fsMesh.frustumCulled = false;
  const fsScene = new Scene();
  fsScene.add(fsMesh);
  const fsCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = (frag, uniforms, defines = {}) => new ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: lod0(frag), uniforms, defines, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
  const U = (o) => {
    const r = {};
    for (const k in o) r[k] = { value: o[k] };
    return r;
  };
  const v2 = () => new Vector2(), v32 = () => new Vector3(), v4 = () => new Vector4(0, 0, 0, 0), NCONE2 = 16;
  const M = {
    z: mat(DEPTH_HALF, U({ tDepth: null, uNear: 0.08, uFar: 600 })),
    ao: mat(AO_FRAG, U({ tZ: null, uTan: v2(), uTexel: v2(), uRadius: 0.55, uPower: 1.5, uAspect: 1 }), { AO_TAPS: q.aoTaps }),
    blur: mat(BILATERAL, U({ tSrc: null, tZ: null, uDir: v2() })),
    vol: mat(VOL_FRAG, U({ tZ: null, tShadow0: null, tShadow1: null, uCamWorld: new Matrix4(), uShadowM: [new Matrix4(), new Matrix4()], uCamPos: v32(), uAmb: new Color(0.02, 0.022, 0.03), uHazeCol: new Color(0.03, 0.025, 0.02), uKeyPos: [v32(), v32()], uKeyDir: [v32(), v32()], uKeyCol: [v32(), v32()], uKeyCone: [new Vector4(), new Vector4()], uGlowPos: Array.from({ length: 8 }, v32), uGlowCol: Array.from({ length: 8 }, v32), uTan: v2(), uMaxDist: 48, uSigma: 0.03, uHaze: 0.35, uFarZ: 600, uTime: 0, uG: 0.72, tNoise, uConePos: Array.from({ length: NCONE2 }, v4), uConeDir: Array.from({ length: NCONE2 }, v4), uConeCol: Array.from({ length: NCONE2 }, v4), uFogP: new Vector4(6, 0.35, 0, 0.11), uWind: new Vector3(0.05, -0.012, 0.03) }), { VOL_STEPS: q.volSteps, CONE_SAMPLES: q.cone || 5 }),
    comp: mat(COMPOSITE, U({ tColor: null, tDepth: null, tZ: null, tAO: null, tVol: null, uHalf: v2(), uNear: 0.08, uFar: 600, uAoOn: 1, uVolOn: 1, uAoK: 0.9, uExpo: 1, uAoLit: 0.7 })),
    down: mat(BLOOM_DOWN, U({ tSrc: null, uTexel: v2(), uFirst: 0 })),
    up: mat(BLOOM_UP, U({ tLow: null, tHigh: null, uTexel: v2(), uMix: 0.6 })),
    streak: mat(STREAK, U({ tSrc: null, uDir: v2(), uThr: 1.5 })),
    adapt: mat(ADAPT, U({ tPrev: null, tLum: null, uRate: 0.05 })),
    grade: mat(GRADE, U({ tScene: null, tBloom: null, tStreak: null, tAdapt: null, tDepth: null, uExposure: 1, uKey: 0.12, uMinE: 0.25, uMaxE: 6, uAuto: 1, uBloom: 0.07, uStreak: 0.06, uAspect: 1, uVignette: 0.32, uCA: 12e-4, uDamage: 0, uLowHp: 0, uFlash: 0, uFade: 0, uSat: 1.02, uTime: 0, uContrast: 0.22, uShadowTint: new Color(0.93, 0.99, 1.07), uHighTint: new Color(1.04, 1, 0.95), uToe: 1.33, uVib: 0, uTintPivot: 0.6, uLift: new Color(0, 0, 0) })),
    final: mat(FINAL, U({ tSrc: null, uTexel: v2(), uSharp: 0.55, uGrain: 0.03, uTime: 0, uFxaa: 1 }))
  };
  function pass(m, target) {
    fsMesh.material = m;
    renderer.setRenderTarget(target);
    renderer.render(fsScene, fsCam);
  }
  const prepasses = [];
  const post = { damage: 0, lowHp: 0, flash: 0, fade: 0, ads: 0 };
  const tune = { ao: true, vol: true, bloom: true, fxaa: true, viewFill: 1.25, autoExposure: true, adaptRate: 2 };
  let time = 0, frames = 0;
  const _dir = v32(), _m2 = new Matrix4();
  function resize() {
    const cw = Math.max(2, Math.floor((canvas.clientWidth || window.innerWidth) * (window.devicePixelRatio > 1.5 && !params.shot ? 1 : 1) * q.scale));
    const ch = Math.max(2, Math.floor((canvas.clientHeight || window.innerHeight) * q.scale));
    if (cw === W && ch === H2) return;
    renderer.setSize(cw, ch, false);
    allocate(cw, ch);
    adaptInit = false;
  }
  function frame2(dt) {
    resize();
    renderer.info.reset();
    time += dt;
    frames++;
    skyU.uTime.value = time;
    camera.updateMatrixWorld(true);
    viewCamera.matrixWorld.copy(camera.matrixWorld);
    viewCamera.matrixWorldInverse.copy(viewCamera.matrixWorld).invert();
    for (let i = 0; i < keys.length; i++) {
      keys[i].shadow.autoUpdate = !api.stagger;
      if (api.stagger) keys[i].shadow.needsUpdate = frames < 4 || frames % keys.length === i;
    }
    for (const p of prepasses) {
      try {
        p(renderer, scene, camera, dt);
      } catch (e) {
        if (!p.err) {
          p.err = 1;
          console.error("[render] prepass failed: " + (e.stack || e));
        }
      }
    }
    renderer.setRenderTarget(T3.hdr);
    renderer.clear(true, true, false);
    renderer.shadowMap.needsUpdate = !api.shadowFresh;
    api.shadowFresh = false;
    renderer.render(scene, camera);
    gl.depthRange(0, +VIEW_DEPTH);
    const envI = scene.environmentIntensity;
    try {
      scene.environmentIntensity = envI * tune.viewFill;
      renderer.setRenderTarget(T3.hdr);
      renderer.render(scene, viewCamera);
    } finally {
      gl.depthRange(0, 1);
      scene.environmentIntensity = envI;
    }
    renderer.setRenderTarget(null);
    const depth = T3.hdr.depthTexture, tan = Math.tan(camera.fov * Math.PI / 360);
    M.z.uniforms.tDepth.value = depth;
    M.z.uniforms.uNear.value = camera.near;
    M.z.uniforms.uFar.value = camera.far;
    pass(M.z, T3.z);
    if (tune.ao) {
      const u = M.ao.uniforms;
      u.tZ.value = T3.z.texture;
      u.uTan.value.set(tan * camera.aspect, tan);
      u.uTexel.value.set(1 / hw, 1 / hh);
      u.uAspect.value = camera.aspect;
      pass(M.ao, T3.aoA);
      const b = M.blur.uniforms;
      b.tZ.value = T3.z.texture;
      b.tSrc.value = T3.aoA.texture;
      b.uDir.value.set(1 / hw, 0);
      pass(M.blur, T3.aoB);
      b.tSrc.value = T3.aoB.texture;
      b.uDir.value.set(0, 1 / hh);
      pass(M.blur, T3.aoA);
    }
    if (tune.vol) {
      const u = M.vol.uniforms;
      u.tZ.value = T3.z.texture;
      u.uCamWorld.value.copy(camera.matrixWorld);
      u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      u.uTan.value.set(tan * camera.aspect, tan);
      u.uFarZ.value = camera.far;
      u.uTime.value = time;
      for (let i = 0; i < 2; i++) {
        const L = keys[i], on = L.intensity > 0;
        u.uKeyPos.value[i].setFromMatrixPosition(L.matrixWorld);
        _dir.setFromMatrixPosition(L.target.matrixWorld).sub(u.uKeyPos.value[i]).normalize();
        u.uKeyDir.value[i].copy(_dir);
        u.uKeyCol.value[i].set(L.color.r, L.color.g, L.color.b).multiplyScalar(L.intensity);
        const hasMap = !!(L.shadow.map && L.shadow.map.texture) && L.userData.shadow !== false;
        u.uKeyCone.value[i].set(Math.cos(L.angle), Math.cos(L.angle * (1 - L.penumbra)), hasMap ? 1 : 0, on ? 1 : 0);
        if (hasMap) {
          u["tShadow" + i].value = L.shadow.map.texture;
          u.uShadowM.value[i].copy(L.shadow.matrix);
        }
      }
      let g2 = 0;
      for (const L of fills) {
        if (g2 >= 8) break;
        if (L.intensity > 0 && L.userData.glow > 0) {
          u.uGlowPos.value[g2].setFromMatrixPosition(L.matrixWorld);
          u.uGlowCol.value[g2].set(L.color.r, L.color.g, L.color.b).multiplyScalar(L.intensity * L.userData.glow);
          g2++;
        }
      }
      for (const e of api.glows) {
        if (g2 >= 8) break;
        u.uGlowPos.value[g2].copy(e.pos);
        u.uGlowCol.value[g2].copy(e.col);
        g2++;
      }
      for (; g2 < 8; g2++) u.uGlowCol.value[g2].set(0, 0, 0);
      for (let i = 0; i < NCONE2; i++) {
        const c = api.cones[i];
        if (!c) {
          u.uConeCol.value[i].set(0, 0, 0, 0);
          continue;
        }
        u.uConePos.value[i].set(c.pos.x, c.pos.y, c.pos.z, c.range);
        u.uConeDir.value[i].set(c.dir.x, c.dir.y, c.dir.z, c.cosO);
        u.uConeCol.value[i].set(c.col.x, c.col.y, c.col.z, c.cosI);
      }
      pass(M.vol, T3.volA);
      const b = M.blur.uniforms;
      b.tZ.value = T3.z.texture;
      b.tSrc.value = T3.volA.texture;
      b.uDir.value.set(1 / hw, 0);
      pass(M.blur, T3.volB);
      b.tSrc.value = T3.volB.texture;
      b.uDir.value.set(0, 1 / hh);
      pass(M.blur, T3.volA);
    }
    {
      const u = M.comp.uniforms;
      u.tColor.value = T3.hdr.texture;
      u.tDepth.value = depth;
      u.tZ.value = T3.z.texture;
      u.tAO.value = T3.aoA.texture;
      u.tVol.value = T3.volA.texture;
      u.uHalf.value.set(hw, hh);
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uAoOn.value = tune.ao ? 1 : 0;
      u.uVolOn.value = tune.vol ? 1 : 0;
      u.uExpo.value = api.exposure * 6;
      pass(M.comp, T3.hdr2);
    }
    let src = T3.hdr2;
    for (let i = 0; i < BLOOM_N; i++) {
      const u = M.down.uniforms;
      u.tSrc.value = src.texture;
      u.uTexel.value.set(1 / src.width, 1 / src.height);
      u.uFirst.value = i === 0 ? 1 : 0;
      pass(M.down, T3.bloom[i]);
      src = T3.bloom[i];
    }
    let low = T3.bloom[BLOOM_N - 1];
    for (let i = BLOOM_N - 2; i >= 0; i--) {
      const u = M.up.uniforms;
      u.tLow.value = low.texture;
      u.tHigh.value = T3.bloom[i].texture;
      u.uTexel.value.set(1 / low.width, 1 / low.height);
      u.uMix.value = 0.55;
      pass(M.up, T3.bloomUp[i]);
      low = T3.bloomUp[i];
    }
    {
      const u = M.streak.uniforms;
      u.tSrc.value = T3.bloom[1].texture;
      u.uDir.value.set(2.2 / T3.streakA.width, 0);
      pass(M.streak, T3.streakA);
      u.tSrc.value = T3.streakA.texture;
      u.uThr.value = 0;
      u.uDir.value.set(5 / T3.streakA.width, 0);
      pass(M.streak, T3.streakB);
      u.uThr.value = api.streakThreshold;
    }
    {
      const u = M.adapt.uniforms, prev = adapt[adaptI], next = adapt[1 - adaptI];
      u.tPrev.value = prev.texture;
      u.tLum.value = T3.bloom[3].texture;
      u.uRate.value = adaptInit ? 1 - Math.exp(-dt * tune.adaptRate) : 1;
      pass(M.adapt, next);
      adaptI = 1 - adaptI;
      adaptInit = true;
    }
    {
      const u = M.grade.uniforms;
      u.tScene.value = T3.hdr2.texture;
      u.tBloom.value = low.texture;
      u.tStreak.value = T3.streakB.texture;
      u.tAdapt.value = adapt[adaptI].texture;
      u.tDepth.value = depth;
      u.uExposure.value = api.exposure;
      u.uAuto.value = tune.autoExposure ? 1 : 0;
      u.uAspect.value = camera.aspect;
      u.uDamage.value = post.damage;
      u.uLowHp.value = post.lowHp;
      u.uFlash.value = post.flash;
      u.uFade.value = post.fade;
      u.uTime.value = time;
      u.uBloom.value = tune.bloom ? api.bloom : 0;
      pass(M.grade, T3.ldr);
    }
    {
      const u = M.final.uniforms;
      u.tSrc.value = T3.ldr.texture;
      u.uTexel.value.set(1 / W, 1 / H2);
      u.uTime.value = time;
      u.uFxaa.value = tune.fxaa ? 1 : 0;
      pass(M.final, null);
    }
    if (shaderErrors.length && !api.reported) {
      api.reported = true;
      console.error("[render] " + shaderErrors.length + " shader error(s)");
    }
  }
  const api = {
    renderer,
    scene,
    camera,
    viewCamera,
    sky,
    keys,
    fills,
    viewLight,
    setKey,
    setSky,
    bakeEnvFromSky,
    bakeEnvFromScene,
    prepasses,
    post,
    tune,
    M,
    T: () => T3,
    glows: [],
    cones: [],
    stagger: false,
    exposure: 1,
    bloom: 0.07,
    streakThreshold: 1.5,
    env: null,
    skyName: "night",
    softShadows,
    shaderErrors,
    quality: q,
    tNoise,
    frame: frame2,
    resize,
    get time() {
      return time;
    },
    // review only: the adapted scene luminance and the exposure the grade derives from it (reads one half-float pixel back)
    lum() {
      const b = new Uint16Array(4);
      renderer.readRenderTargetPixels(adapt[adaptI], 0, 0, 1, 1, b);
      const h = b[0], e = h >> 10 & 31, f3 = h & 1023, v = e === 0 ? f3 * 2 ** -24 : (1 + f3 / 1024) * 2 ** (e - 15), u = M.grade.uniforms;
      return { lum: +v.toFixed(4), ex: +(api.exposure * Math.min(u.uMaxE.value, Math.max(u.uMinE.value, Math.pow(u.uKey.value / Math.max(v, 1e-4), 0.8)))).toFixed(2) };
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, programs: i.programs ? i.programs.length : 0, res: [W, H2], frames, softShadows, shaderErrors: shaderErrors.length };
    }
  };
  api.warm = async () => {
    resize();
    const prev = renderer.getRenderTarget(), all = /* @__PURE__ */ new Set();
    let ok = true;
    try {
      renderer.setRenderTarget(T3.hdr);
      for (const m of renderer.compile(scene, camera)) all.add(m);
      for (const k of Object.keys(M)) {
        fsMesh.material = M[k];
        renderer.setRenderTarget(k === "final" ? null : T3.hdr2);
        for (const m of renderer.compile(fsScene, fsCam)) all.add(m);
      }
      renderer.setRenderTarget(prev);
      ok = await programsReady(renderer, all);
    } catch (e) {
      console.warn("[render] warm-up failed, programs will compile on first use: " + (e.message || e));
    } finally {
      renderer.setRenderTarget(prev);
    }
    return ok;
  };
  api.recover = () => {
    adaptInit = false;
    bakeEnvFromSky();
    if (api.envFrom) bakeEnvFromScene(...api.envFrom);
    renderer.shadowMap.needsUpdate = true;
    api.reported = false;
  };
  setSky(params.sky || "night");
  resize();
  return api;
}

