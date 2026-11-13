// A street stove: an oil drum with a burner in it, a wok as wide as a table on top and a
// gas bottle beside it. Three of them stand where a run can light
// them (run.js); lighting one fills the street with wok hei and brings the dead to it.
//
// Geometry and animation only: the caller supplies the materials (the two stages are lit
// differently) and decides what to do with the light.
//
// States, set through userData.setState (the game's objective code calls it with the first
// three, run.js with the rest):
//   "live"    cold: nothing burns
//   "cutting" being lit: the burner catches and sputters
//   "cut"     lit and left to itself: a low flame
//   "toss"    the wok is off the stove, in the cook's hands: the burner head shows, with a
//             bed of fire on it and a jet standing over it (run.js adds the flames that
//             leave it, as particles)
//   "cook"    the wok is back with the dish in it: flames come up round the outside of it
//             and over its rim
//   "due"     it wants tossing again: they stand taller and gutter
//   "ready"   the dish is done and waits to be packed: a low flame under it
//   "served"  the same low flame, the wok empty

/**
 * mats: { steel, dark, darkOpen (double-sided, for the inside of the wok), paint (the gas
 *         bottle), flame (the glow of the burner) }
 * Returns { group, light: { gain, off }, setState, update(dt) }: write light.gain / light.off
 * to whatever lamp the stage gives the stove.
 */
export function buildStove(THREE, mats, rnd = Math.random) {
  const g = new THREE.Group();
  g.name = "stove";
  const mesh = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    const glow = mat === mats.flame;
    m.castShadow = !glow;
    m.receiveShadow = !glow;
    g.add(m);
    return m;
  };
  // the drum, its rim, the door the fire shows through
  mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.78, 18),
    mats.steel,
    0,
    0.39,
    0,
  );
  mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.05, 18), mats.dark, 0, 0.8, 0);
  mesh(new THREE.BoxGeometry(0.3, 0.24, 0.04), mats.dark, 0, 0.3, 0.335);
  const door = mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.02),
    mats.flame,
    0,
    0.3,
    0.36,
  );
  // the wok: the lower half of a sphere, seen from inside as well
  const wok = mesh(
    new THREE.SphereGeometry(
      0.52,
      22,
      10,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    mats.darkOpen,
    0,
    1.08,
    0,
  );
  wok.scale.y = 0.5;
  // a Cantonese wok: two ears and no handle (it is lifted with a towel)
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.012, 6, 10, Math.PI),
      mats.dark,
    );
    ear.position.set(sx * 0.53, 0, 0);
    ear.rotation.set(-0.5 * sx, Math.PI / 2, 0);
    ear.scale.y = 2; // (the wok's own squash, undone)
    ear.castShadow = ear.receiveShadow = true;
    wok.add(ear);
  }
  // What is in it while a dish is on: a heap of fried rice. A low mound, lumpy all over (a
  // smooth dome of this yellow is the yolk of an egg).
  const heap = new THREE.SphereGeometry(
    0.27,
    22,
    7,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  {
    const at = heap.attributes.position;
    const bump = (i) => Math.abs(Math.sin(i * 127.1) * 43758.5453) % 1;
    for (let i = 0; i < at.count; i++) {
      // (the rim of the mound stays where it is: it lies on the wok)
      const up = at.getY(i) / 0.27;
      const k = 1 + (bump(i * 3 + 1) - 0.45) * 0.7 * up;
      const w = 0.86 + 0.28 * bump(i * 5 + 2);
      at.setXYZ(i, at.getX(i) * w, at.getY(i) * k, at.getZ(i) * w);
    }
    heap.computeVertexNormals();
  }
  const dish = new THREE.Mesh(heap, mats.paint);
  dish.position.y = -0.4;
  dish.scale.y = 0.55;
  dish.castShadow = false;
  dish.receiveShadow = true;
  dish.visible = false;
  wok.add(dish);
  // the gas bottle
  mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.46, 12),
    mats.paint,
    -0.5,
    0.23,
    0.1,
  );
  mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 0.1, 10),
    mats.paint,
    -0.5,
    0.51,
    0.1,
  );
  mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8),
    mats.dark,
    -0.5,
    0.6,
    0.1,
  );
  // the burner head the wok sits on: two rings of jets and the bars that carry the wok
  for (const [r, t] of [
    [0.25, 0.028],
    [0.12, 0.022],
  ]) {
    const ringHead = mesh(
      new THREE.TorusGeometry(r, t, 6, 20),
      mats.dark,
      0,
      0.795,
      0,
    );
    ringHead.rotation.x = Math.PI / 2;
  }
  for (const a of [0, Math.PI / 2])
    mesh(
      new THREE.BoxGeometry(0.62, 0.03, 0.035),
      mats.dark,
      0,
      0.795,
      0,
    ).rotation.y = a + Math.PI / 4;
  // the bed of fire on it, seen from above once the wok is off
  const bedMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: FLAME.vertex,
    fragmentShader: BED,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.33, 24), bedMat);
  bed.position.set(0, 0.83, 0);
  bed.rotation.x = -Math.PI / 2;
  bed.castShadow = bed.receiveShadow = false;
  bed.renderOrder = 3;
  bed.visible = false;
  g.add(bed);
  // Fire. The band that shows in the gap between the drum and the wok: it has to stay
  // outside the wok and under it (the wok's skin is 0.89 up at this radius), or it shows
  // through the bottom of the bowl.
  const ring = mesh(
    new THREE.CylinderGeometry(0.375, 0.345, 0.06, 18, 1, true),
    mats.flame,
    0,
    0.853,
    0,
  );
  // What a burner does to a wok that is on it: the flames come out of that gap, run up the
  // outside of the bowl and stand over its rim, all round. A skirt that follows the wok a
  // little way off its skin, drawn by CURTAIN. Nothing burns inside the wok.
  const curtainMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: FLAME.vertex,
    fragmentShader: CURTAIN,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const curtain = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.365, 0.83],
        [0.44, 0.9],
        [0.505, 0.98],
        [0.55, 1.08],
        [0.572, 1.18],
        [0.58, 1.28],
        [0.575, 1.37],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      36,
    ),
    curtainMat,
  );
  curtain.castShadow = curtain.receiveShadow = false;
  curtain.renderOrder = 4;
  curtain.visible = false;
  g.add(curtain);
  // The jet of the open burner, once the wok is off it: upright sheets through one axis,
  // drawn by FLAME.
  const fire = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uJet: { value: 0 },
    },
    vertexShader: FLAME.vertex,
    fragmentShader: FLAME.fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sheet = new THREE.PlaneGeometry(1.15, 1.5);
  sheet.translate(0, 0.75, 0);
  const tongues = [0, 1, 2, 3, 4, 5].map((i) => {
    const m = new THREE.Mesh(sheet, fire);
    m.position.set(0, 0.98, 0);
    m.rotation.y = (i * Math.PI) / 3 + (i > 2 ? Math.PI / 6 : 0);
    m.castShadow = m.receiveShadow = false;
    m.renderOrder = 4;
    g.add(m);
    return m;
  });

  const light = { gain: 0, off: true };
  let state = "live";
  let t = rnd() * 6;
  let heat = 0; // 0 cold … 1 a dish is on, eased
  let jet = 0; // 0 … 1 the wok is off and the burner is open, eased
  // Something else to stand in the wok as its dish (run.js hands in the very heap the cook
  // tosses, so that what fries is what was tossed): made for a bowl of radius one with its
  // lowest point at the origin. null gives the mound drawn here back.
  let guest = null;
  function setDish(node) {
    if (guest && guest.parent === g) g.remove(guest);
    guest = node || null;
    if (guest) {
      g.add(guest);
      guest.position.set(0, 0.826, 0);
      guest.rotation.set(0, 0, 0);
      guest.scale.setScalar(0.52);
    }
    setState(state);
  }
  function setState(s) {
    state = s;
    const lit = s !== "live";
    light.off = !lit;
    wok.visible = s !== "toss";
    const served = s === "cook" || s === "due" || s === "ready";
    dish.visible = served && !guest;
    if (guest) guest.visible = served;
  }
  function update(dt) {
    t += dt;
    const want =
      state === "cook" || state === "toss"
        ? 1
        : state === "due"
          ? 1.25 + 0.2 * Math.sin(t * 11)
          : state === "live"
            ? 0
            : state === "cutting"
              ? 0.3
              : 0.25;
    heat += (want - heat) * Math.min(1, dt * (want > heat ? 2.2 : 1.2));
    const flick = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7.3 + 1);
    // being lit: it catches and goes out again
    const catching =
      state === "cutting" ? (Math.sin(t * 23) > -0.2 ? 1 : 0) : 1;
    const low = heat > 0.02 ? catching : 0;
    door.visible = low > 0;
    // (the band of flame under the wok: with the wok off, the bed and the jet are the fire)
    ring.visible = low > 0 && state !== "toss";
    // the open burner: the bed shows, the sheets draw in to a jet from the burner head
    jet += ((state === "toss" ? 1 : 0) - jet) * Math.min(1, dt * 7);
    bed.visible = state === "toss" && heat > 0.05;
    bedMat.uniforms.uTime.value = t;
    bedMat.uniforms.uHeat.value = Math.min(1, heat) * jet;
    fire.uniforms.uJet.value = jet;
    ring.scale.set(1, 0.6 + 0.4 * flick, 1);
    // nothing over the rim until a dish is on; the low flame stays under the wok
    const over = Math.max(0, (heat - 0.3) / 0.7);
    fire.uniforms.uTime.value = t;
    fire.uniforms.uHeat.value = Math.min(1.4, over);
    // round the wok: low while it only keeps warm, over the rim while a dish is frying
    curtain.visible = state !== "toss" && state !== "live" && heat > 0.04;
    curtainMat.uniforms.uTime.value = t;
    curtainMat.uniforms.uHeat.value = Math.min(1.12, heat) * catching;
    tongues.forEach((m) => {
      m.visible = jet > 0.05 && over > 0.02;
      // (the jet: from the burner head, a third as wide and little over half as tall)
      m.position.y = 0.98 - 0.14 * jet;
      m.scale.set(1 - 0.5 * jet, 1 - 0.3 * jet, 1);
    });
    light.gain =
      low * (0.25 + 0.75 * heat) * (0.7 + 0.3 * flick) * (1 + 0.35 * jet);
  }
  setState("live");
  update(0);
  // The ironwork that never moves or hides may be merged with the street on phones
  // (phonebatch.js); the door's fire, the wok, the burner ring and the flames stay their own.
  const live = new Set([door, wok, bed, ring, curtain, ...tongues]);
  for (const c of g.children)
    if (c.isMesh && !live.has(c)) c.userData.batch = true;
  g.userData.setState = setState;
  g.userData.setDish = setDish;
  return { group: g, light, setState, setDish, update };
}

// The flame: a sheet that is brightest and widest at the bottom, torn by noise that climbs.
const FLAME = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragment: /* glsl */ `
    uniform float uTime;
    uniform float uHeat;
    uniform float uJet;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y);
    }
    void main() {
      float x = (vUv.x - 0.5) * 2.0;
      // how tall the fire stands follows the heat
      float y = vUv.y / mix(0.35, 1.0, uHeat);
      float n = noise(vec2(x * 2.6, y * 2.4 - uTime * 2.6)) * 0.65
              + noise(vec2(x * 5.5 + 3.0, y * 5.0 - uTime * 4.3)) * 0.35;
      float lean = (n - 0.5) * 0.55 * y;
      float width = 0.9 * (1.0 - y * 0.8) + 0.05;
      float body = smoothstep(width, width * 0.15, abs(x + lean));
      body *= smoothstep(1.0, 0.25 + 0.5 * n, y);
      body *= smoothstep(0.0, 0.06, vUv.y);
      if (body < 0.004) discard;
      vec3 hot = vec3(1.0, 0.66, 0.2);
      vec3 mid = vec3(1.0, 0.3, 0.03);
      vec3 cool = vec3(0.7, 0.1, 0.01);
      vec3 col = mix(cool, mid, smoothstep(0.0, 0.5, body));
      col = mix(col, hot, smoothstep(0.45, 1.0, body) * (1.0 - y * 0.6));
      // an open burner under pressure burns blue at the root
      vec3 root = vec3(0.16, 0.42, 1.0);
      col = mix(col, root, uJet * smoothstep(0.3, 0.02, y) * smoothstep(0.2, 0.7, body));
      // (six sheets stand in the jet where three stand in the wok: each is dimmer for it)
      gl_FragColor = vec4(col * body * (0.7 + 0.8 * uHeat) * mix(1.0, 0.7, uJet), body);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

// The burner seen from above with nothing on it: rings of jets, blue where the gas leaves
// them and yellow where it has caught, licking in towards the middle.
const BED = /* glsl */ `
  uniform float uTime;
  uniform float uHeat;
  varying vec2 vUv;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y);
  }
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    // broad tongues that run inwards and turn slowly
    float n = noise(vec2(a * 1.6 + uTime * 0.9, r * 2.6 + uTime * 2.4)) * 0.65
            + noise(vec2(a * 4.0 - uTime * 1.7, r * 5.0 + uTime * 4.0)) * 0.35;
    float body = smoothstep(1.0, 0.55, r) * (0.5 + 0.5 * n);
    // the two rings of jets: a row of blue points each
    float ring = smoothstep(0.1, 0.0, abs(r - 0.76)) * (0.55 + 0.45 * sin(a * 22.0))
               + smoothstep(0.09, 0.0, abs(r - 0.36)) * (0.55 + 0.45 * sin(a * 12.0 + 1.0));
    ring = clamp(ring, 0.0, 1.0);
    float lit = max(body, ring) * uHeat;
    if (lit < 0.004) discard;
    vec3 blue = vec3(0.12, 0.36, 1.0);
    vec3 hot = vec3(1.0, 0.7, 0.24);
    vec3 mid = vec3(1.0, 0.3, 0.03);
    vec3 col = mix(mid, hot, smoothstep(0.35, 0.85, n) * (1.0 - r * 0.6));
    col = mix(col, blue, ring * 0.9);
    gl_FragColor = vec4(col * lit * 1.5, min(1.0, lit));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// Flames round the outside of a wok: tongues of different heights side by side, torn by
// noise that climbs. uv.x runs round the wok (the noise is taken on the circle itself, so
// there is no seam), uv.y from the gap under it (0) to a forearm over its rim (1); the rim
// is half-way.
const CURTAIN = /* glsl */ `
  uniform float uTime;
  uniform float uHeat;
  varying vec2 vUv;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y);
  }
  void main() {
    float a = vUv.x * 6.2831853;
    vec2 c = vec2(cos(a), sin(a));
    float y = vUv.y;
    // how high the fire stands at this place round the wok: a few tall tongues, lower between
    float n = noise(c * 3.1 + vec2(uTime * 0.7, -uTime * 0.5)) * 0.6
            + noise(c * 7.3 + vec2(-uTime * 1.3, uTime * 1.1)) * 0.4;
    // (the rim is half-way up the skirt: at full heat every tongue clears it, the tall ones
    // by a hand's breadth or two; the fire is on the outside of the bowl, not over the dish)
    float top = (0.5 + 0.55 * n) * uHeat;
    float body = smoothstep(top, top * 0.25, y) * smoothstep(1.0, 0.82, y);
    // torn by what climbs through it
    float tear = noise(c * 9.0 + vec2(y * 7.0 - uTime * 3.6, y * 5.0 - uTime * 2.9));
    body *= smoothstep(0.1, 0.55, tear + (1.0 - y / max(top, 0.01)) * 0.75);
    body *= smoothstep(0.0, 0.05, y);
    if (body < 0.004) discard;
    vec3 hot = vec3(1.0, 0.68, 0.22);
    vec3 mid = vec3(1.0, 0.3, 0.03);
    vec3 cool = vec3(0.7, 0.1, 0.01);
    vec3 col = mix(cool, mid, smoothstep(0.0, 0.5, body));
    col = mix(col, hot, smoothstep(0.5, 1.0, body) * (1.0 - y));
    // blue where it leaves the burner, under the wok
    col = mix(col, vec3(0.16, 0.42, 1.0), smoothstep(0.12, 0.0, y) * 0.7);
    gl_FragColor = vec4(col * body * 1.35, body);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
