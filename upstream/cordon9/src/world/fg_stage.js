var LIGHT_K2 = 13;
var EMIT2 = /^(lamp|neon|led|em)(?!.*[BF]$)/;
var NOCAST2 = /^(decal|mark|emit|em|glassT|win|signLit|signFLit|black|lamp|neon|led)/;
function createStage(G4, mats, o = {}) {
  const R4 = G4.render, POOL2 = o.pool || 12, cell = o.cell || 24, x0 = o.x0 ?? -48, z0 = o.z0 ?? -60, nx = o.nx || 4, nz = o.nz || 5, groundY2 = o.groundY || (() => 0), MK = o.marks;
  const W = { colliders: [], insts: [], lights: [], flares: [], keys: [], spawns: [], pickups: [], fires: [], meshes: [], blink: {}, name: o.name || "stage" };
  const chunks = /* @__PURE__ */ new Map(), v = new Vector3(), d = new Vector3(), byProp = {}, st = { tris: 0, count: 0 };
  const regionOf = (x, z) => clamp2(Math.floor((x - x0) / cell), 0, nx - 1) + clamp2(Math.floor((z - z0) / cell), 0, nz - 1) * nx;
  const emitCol = (name) => {
    const c = mats[name].color;
    return [c.r, c.g, c.b];
  };
  function addGeo(name, g2, region) {
    let k = name;
    if (EMIT2.test(name)) {
      const c = emitCol(name), n = g2.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = c[0];
        arr[i * 3 + 1] = c[1];
        arr[i * 3 + 2] = c[2];
      }
      g2.setAttribute("color", new BufferAttribute(arr, 3));
      k = "emit";
    }
    const key = k + "|" + region;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(g2);
  }
  function put(prop, x, z, yaw = 0, o2 = {}) {
    const y = o2.y ?? groundY2(x, z), M = mat4({ p: [x, y, z], r: o2.rot || [0, yaw, 0] }), reg = o2.region ?? regionOf(x, z);
    for (const [k, arr] of prop.B.map) for (const g2 of arr) {
      const c = g2.clone();
      c.applyMatrix4(M);
      addGeo(k, c, reg);
    }
    st.tris += prop.tris;
    st.count++;
    byProp[prop.name] = (byProp[prop.name] || 0) + prop.tris;
    const ii = W.insts.push({ prop, M, inv: M.clone().invert() }) - 1;
    if (!o2.noCol) for (const c of prop.cols) {
      if (c.c[1] < -0.5) continue;
      v.set(c.c[0], c.c[1], c.c[2]).applyMatrix4(M);
      W.colliders.push({ ...c, c: [v.x, v.y, v.z], yaw: c.yaw + yaw, prop: prop.name, inst: ii });
    }
    if (!o2.noGlow) for (const g2 of prop.glows) {
      v.set(g2.p[0], g2.p[1], g2.p[2]).applyMatrix4(M);
      const e = { ...g2, p: [v.x, v.y, v.z] };
      if (g2.dir) {
        d.set(g2.dir[0], g2.dir[1], g2.dir[2]).transformDirection(M);
        e.dir = [d.x, d.y, d.z];
      }
      if (g2.kind === "key") W.keys.push(e);
      else if (g2.kind === "flare") W.flares.push(e);
      else W.lights.push(e);
    }
    if (prop.sockets.fire) {
      v.set(...prop.sockets.fire).applyMatrix4(M);
      W.fires.push([v.x, v.y, v.z]);
    }
    return { prop, M, at: (p) => {
      v.set(p[0], p[1], p[2]).applyMatrix4(M);
      return [v.x, v.y, v.z];
    } };
  }
  const markProp = (name, w, h, rot2 = 0) => proto("gm" + name + w + h + rot2, () => {
    const P3 = new Prop("gmark", 1);
    P3.quad("mark", w, h, MK.rect(name), { r: [-H, 0, rot2] });
    P3.cols.push({ c: [0, -1, 0], h: [0, 0, 0], yaw: 0 });
    return P3.finish({ grime: 0 });
  });
  const mark = (name, x, z, w, h = w, rot2 = 0) => put(markProp(name, w, h, Math.round(rot2 * 10) / 10), x, z, 0, { y: groundY2(x, z) + 8e-3 + st.count % 7 * 5e-4, noCol: true });
  const wall2 = (min, max, f3 = {}) => W.colliders.push({ c: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], h: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2], yaw: f3.yaw || 0, surface: f3.surface || "concrete", bulletOnly: !!f3.bulletOnly, playerOnly: !!f3.playerOnly, noBullet: !!f3.noBullet, noNav: !!f3.noNav, soft: !!f3.soft, prop: f3.tag || "wall", inst: -1 });
  const lamp2 = (p, col, power, dist, x = {}) => W.lights.push({ kind: "fill", p, col, power, dist, ...x });
  function finalize(ground, keySpec) {
    const root = new Group();
    root.name = "stage";
    let meshes = 0, mtris = 0;
    mats.emit = mats.emit || new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    for (const [key, arr] of chunks) {
      const name = key.split("|")[0], mat = mats[name];
      if (!mat) throw new Error('stage: no material "' + name + '"');
      const g2 = merge(arr);
      g2.computeBoundingSphere();
      g2.computeBoundingBox();
      const me = new Mesh(g2, mat);
      me.name = key;
      me.castShadow = !NOCAST2.test(name);
      me.receiveShadow = !EMIT2.test(name) && name !== "emit";
      if (mat.transparent) me.renderOrder = name === "glassT" ? 4 : 2;
      me.matrixAutoUpdate = false;
      root.add(me);
      meshes++;
      mtris += triCount(g2);
      W.meshes.push(me);
    }
    R4.scene.add(root);
    chunks.clear();
    keySpec.slice(0, 2).forEach((k, i) => R4.setKey(i, { pos: k.p, target: k.target, color: new Color(k.col[0], k.col[1], k.col[2]), intensity: k.intensity, angle: k.angle ?? 0.74, penumbra: k.penumbra ?? 0.6, size: k.size ?? 0.6 }));
    const pool = [];
    for (let i = 0; i < POOL2; i++) {
      const L = new PointLight(16777215, 0, 10, 2);
      L.layers.enableAll();
      R4.scene.add(L);
      pool.push(L);
    }
    for (const L of W.lights) {
      L.pos = new Vector3(...L.p);
      L.color = new Color(L.col[0], L.col[1], L.col[2]);
      L.seed = Math.abs(Math.sin(L.p[0] * 12.9 + L.p[2] * 78.2)) * 43758 % 1;
      L.k = 1;
    }
    const fl = W.flares, fg = new BufferGeometry(), fp = new Float32Array(fl.length * 3), fc = new Float32Array(fl.length * 3), fs = new Float32Array(fl.length * 2);
    fl.forEach((f3, i) => {
      fp.set(f3.p, i * 3);
      fc.set(f3.col, i * 3);
      fs[i * 2] = f3.size || 1;
      fs[i * 2 + 1] = f3.blink ? 1 : f3.flick ? 2 : 0;
    });
    fg.setAttribute("position", new BufferAttribute(fp, 3));
    fg.setAttribute("color", new BufferAttribute(fc, 3));
    fg.setAttribute("fs", new BufferAttribute(fs, 2));
    fg.boundingSphere = new Sphere(new Vector3(), 600);
    const flareMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      uniforms: { uScale: { value: 600 }, uTime: { value: 0 }, uFlick: { value: 1 } },
      vertexShader: "attribute vec2 fs; varying vec3 vC; uniform float uScale, uTime, uFlick; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = -mv.z; gl_PointSize = clamp(fs.x * uScale / d, 2.0, 220.0); float bl = fs.y > 1.5 ? uFlick : mix(1.0, step(0.5, fract(uTime * 0.8 + position.x * 0.13)), fs.y); vC = color * bl * clamp(d / 3.0, 0.0, 1.0); }",
      fragmentShader: "varying vec3 vC; void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p); float a = exp(-r * r * 7.0) * 0.9 + exp(-r * 2.6) * 0.16 + exp(-abs(p.y) * 22.0) * exp(-abs(p.x) * 2.2) * 0.35; a *= smoothstep(1.0, 0.7, r); gl_FragColor = vec4(vC * a * 0.12, 1.0); }",
      vertexColors: true
    });
    const flares = new Points(fg, flareMat);
    flares.frustumCulled = false;
    flares.renderOrder = 6;
    R4.scene.add(flares);
    for (const n of ["emAmberB", "emRedB", "emBlueB", "emWhiteB"]) W.blink[n] = { mat: mats[n], base: mats[n].color.clone(), k: 1 };
    const order = W.lights.map((_, i) => i), size = new Vector2(), glowV = [], NG = 6;
    for (let i = 0; i < NG; i++) glowV.push({ pos: new Vector3(), col: new Vector3() });
    const flick = keySpec.map((k) => k.flicker || 0), baseI = keySpec.map((k) => k.intensity);
    W.keyK = [1, 1];
    W.update = (dt, t, cam) => {
      const ph = t * 1.7 % 1;
      W.blink.emRedB.k = ph < 0.5 ? Math.floor(ph * 12) % 2 ? 1 : 0.25 : 0.02;
      W.blink.emBlueB.k = ph >= 0.5 ? Math.floor(ph * 12) % 2 ? 1 : 0.25 : 0.02;
      W.blink.emAmberB.k = t * 1.1 % 1 < 0.5 ? 1 : 0.03;
      W.blink.emWhiteB.k = t * 2.3 % 1 < 0.08 ? 1 : 0.02;
      for (const n in W.blink) {
        const b = W.blink[n];
        b.mat.color.copy(b.base).multiplyScalar(b.k);
      }
      for (let i = 0; i < Math.min(2, keySpec.length); i++) {
        let k = 1;
        if (flick[i]) {
          const slow = vnoise(t * 0.23 + i * 7.1, 3.3, 0.5), fast = vnoise(t * 11, i * 5.7, 1.5);
          k = slow > 0.62 ? fast > 0.42 ? 1 : 0.18 : 0.92 + 0.08 * fast;
        }
        W.keyK[i] = k;
        R4.keys[i].intensity = baseI[i] * k;
      }
      flareMat.uniforms.uFlick.value = W.keyK[1];
      if (mats.lampFloodF) {
        if (!W.floodBase) W.floodBase = mats.lampFloodF.color.clone();
        mats.lampFloodF.color.copy(W.floodBase).multiplyScalar(W.keyK[1]);
      }
      {
        const n = vnoise(t * 7.3, 4.1, 0.5), m = vnoise(t * 0.31, 9.2, 2.5);
        W.tubeK = m > 0.6 ? n > 0.5 ? 1 : 0.08 : 0.85 + 0.15 * n;
        if (mats.lampTubeF) {
          if (!W.tubeBase) W.tubeBase = mats.lampTubeF.color.clone();
          mats.lampTubeF.color.copy(W.tubeBase).multiplyScalar(W.tubeK);
        }
      }
      for (const L of W.lights) {
        let k = 1;
        if (L.kind === "blink") k = W.blink[L.mat] ? W.blink[L.mat].k : 1;
        if (L.flicker) {
          const n = vnoise(t * (5 + L.flicker * 4) + L.seed * 50, L.seed * 9, 0.5);
          k *= L.flicker >= 2 ? 0.55 + 0.6 * n : n > 0.34 / Math.max(0.5, L.flicker) ? 1 : 0.12;
        }
        if (L.key != null) k *= W.keyK[L.key];
        if (L.tube) k *= W.tubeK;
        L.k = k;
        L.d2 = L.pos.distanceToSquared(cam) / ((L.pri || 1) * (L.pri || 1));
      }
      order.sort((i, j) => W.lights[i].d2 - W.lights[j].d2);
      const lim = order.length > POOL2 ? Math.sqrt(W.lights[order[POOL2]].d2) : 1e9;
      for (let i = 0; i < POOL2; i++) {
        const P3 = pool[i], L = W.lights[order[i]];
        if (!L) {
          P3.intensity = 0;
          continue;
        }
        const dd = Math.sqrt(L.d2), fade = clamp2((lim - dd) / (lim * 0.2 + 0.01));
        P3.position.copy(L.pos);
        P3.color.copy(L.color);
        P3.distance = L.dist || 9;
        P3.intensity = (L.power || 6) * LIGHT_K2 * L.k * fade;
        if (i < NG) {
          glowV[i].pos.copy(L.pos);
          glowV[i].col.set(L.color.r, L.color.g, L.color.b).multiplyScalar(P3.intensity * 0.35);
        }
      }
      R4.glows.length = 0;
      for (let i = 0; i < Math.min(NG, order.length); i++) R4.glows.push(glowV[i]);
      R4.renderer.getDrawingBufferSize(size);
      flareMat.uniforms.uScale.value = size.y * 0.5;
      flareMat.uniforms.uTime.value = t;
      if (ground && ground.tick) ground.tick(t);
    };
    W.root = root;
    W.pool = pool;
    W.flareMesh = flares;
    W.ground = ground;
    W.stats = { props: st.count, propTris: st.tris, meshes, tris: mtris + (ground ? ground.tris : 0), lights: W.lights.length, flares: fl.length, colliders: W.colliders.length, top: Object.entries(byProp).sort((x, y) => y[1] - x[1]).slice(0, 16).map(([n, t]) => n + ":" + Math.round(t / 1e3) + "k").join(" ") };
    return W;
  }
  return { W, put, mark, wall: wall2, lamp: lamp2, addGeo, regionOf, finalize, st, byProp };
}

