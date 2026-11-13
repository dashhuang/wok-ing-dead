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
//   "toss"    the wok is off the stove, in the cook's hands: the open burner roars
//   "cook"    the wok is back with the dish in it: flames over its rim
//   "due"     it wants tossing again: the flames stand taller and gutter
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
  // what is in it while a dish is on: a heap of fried rice
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    mats.paint,
  );
  dish.position.y = -0.4;
  dish.scale.y = 0.75;
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
  // fire: the ring under the wok, and what comes over the rim when a dish is on
  const ring = mesh(
    new THREE.CylinderGeometry(0.3, 0.2, 0.16, 14, 1, true),
    mats.flame,
    0,
    0.9,
    0,
  );
  // the flames over the wok: three upright sheets through one axis, drawn by FLAME
  const fire = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } },
    vertexShader: FLAME.vertex,
    fragmentShader: FLAME.fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sheet = new THREE.PlaneGeometry(1.15, 1.5);
  sheet.translate(0, 0.75, 0);
  const tongues = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(sheet, fire);
    m.position.set(0, 0.98, 0);
    m.rotation.y = (i * Math.PI) / 3;
    m.castShadow = m.receiveShadow = false;
    m.renderOrder = 4;
    g.add(m);
    return m;
  });

  const light = { gain: 0, off: true };
  let state = "live";
  let t = rnd() * 6;
  let heat = 0; // 0 cold … 1 a dish is on, eased
  function setState(s) {
    state = s;
    const lit = s !== "live";
    light.off = !lit;
    wok.visible = s !== "toss";
    dish.visible = s === "cook" || s === "due" || s === "ready";
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
    ring.visible = door.visible = low > 0;
    ring.scale.set(1, 0.6 + 0.6 * flick, 1);
    // nothing over the rim until a dish is on; the low flame stays under the wok
    const over = Math.max(0, (heat - 0.3) / 0.7);
    fire.uniforms.uTime.value = t;
    fire.uniforms.uHeat.value = Math.min(1.4, over);
    for (const m of tongues) m.visible = over > 0.02;
    light.gain = low * (0.25 + 0.75 * heat) * (0.7 + 0.3 * flick);
  }
  setState("live");
  update(0);
  g.userData.setState = setState;
  return { group: g, light, setState, update };
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
      gl_FragColor = vec4(col * body * (0.7 + 0.8 * uHeat), body);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
