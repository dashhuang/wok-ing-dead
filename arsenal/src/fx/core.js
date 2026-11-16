// Effects runtime: sprite particles, ribbons (tracers, trails, lightning), melee swipes, ground
// decals, pooled flash lights, tumbling casings and camera shake. Everything is drawn in HDR so
// the stage's bloom picks up whatever exceeds paper white.
import * as THREE from "three";

// ---------------------------------------------------------------- helpers
const _c = new THREE.Color();
/** sRGB hex -> linear [r, g, b] scaled by `k` (HDR brightness). */
export function C(hex, k = 1) {
  _c.set(hex);
  return [_c.r * k, _c.g * k, _c.b * k];
}
export const rand = (a = 1, b) =>
  b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const srand = (a = 1) => (Math.random() * 2 - 1) * a;
export function randDir(out = new THREE.Vector3()) {
  const u = Math.random() * 2 - 1,
    t = Math.random() * Math.PI * 2,
    s = Math.sqrt(1 - u * u);
  return out.set(s * Math.cos(t), u, s * Math.sin(t));
}
/** Random direction inside a cone of half-angle `angle` around `dir`. */
export function coneDir(dir, angle, out = new THREE.Vector3()) {
  const z = 1 - Math.random() * (1 - Math.cos(angle));
  const r = Math.sqrt(1 - z * z),
    t = Math.random() * Math.PI * 2;
  const up = Math.abs(dir.y) < 0.99 ? _up.set(0, 1, 0) : _up.set(1, 0, 0);
  _t1.crossVectors(up, dir).normalize();
  _t2.crossVectors(dir, _t1);
  return out
    .copy(dir)
    .multiplyScalar(z)
    .addScaledVector(_t1, r * Math.cos(t))
    .addScaledVector(_t2, r * Math.sin(t));
}
const _up = new THREE.Vector3(),
  _t1 = new THREE.Vector3(),
  _t2 = new THREE.Vector3();

function noiseTexture(size = 128) {
  // tiling fbm, RG = two decorrelated fields
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const field = (seed) => {
    const out = new Float32Array(size * size);
    let amp = 0.5,
      tot = 0;
    for (let o = 0; o < 4; o++) {
      const cells = 4 << o;
      const L = new Float32Array(cells * cells);
      let s = (seed + o * 101) >>> 0;
      for (let i = 0; i < L.length; i++)
        L[i] = (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const fx = (x / size) * cells,
            fy = (y / size) * cells;
          const x0 = fx | 0,
            y0 = fy | 0,
            tx = fx - x0,
            ty = fy - y0;
          const sx = tx * tx * (3 - 2 * tx),
            sy = ty * ty * (3 - 2 * ty);
          const x1 = (x0 + 1) % cells,
            y1 = (y0 + 1) % cells;
          const a = L[y0 * cells + x0],
            b = L[y0 * cells + x1],
            cc = L[y1 * cells + x0],
            d = L[y1 * cells + x1];
          out[y * size + x] +=
            (a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy) *
            amp;
        }
      tot += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  };
  const a = field(7),
    b = field(91);
  for (let i = 0; i < size * size; i++) {
    img.data[i * 4] = a[i] * 255;
    img.data[i * 4 + 1] = b[i] * 255;
    img.data[i * 4 + 2] = Math.abs(a[i] - b[i]) * 510;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------------------------------------------------------------- particles
// Sprite kinds (the `type` of a particle)
export const P = {
  GLOW: 0,
  STREAK: 1,
  SMOKE: 2,
  FLAME: 3,
  RING: 4,
  STAR: 5,
  SHARD: 6,
  DROP: 7,
  PAPER: 8,
  SPARK: 9, // a hard little point of fire that flickers on and off as it dies
};
const STRIDE = 32;
// per particle: 0 px 1 py 2 pz 3 vx 4 vy 5 vz 6 age 7 life 8 s0 9 s1 10 rot 11 rv 12-14 c0 15-17 c1
//               18 alpha 19 drag 20 grav 21 type 22 stretch 23 seed 24 fadeIn 25 fadePow 26 ground 27 turb
//               28 trail rate 29 trail owed 30 trail life 31 trail size

const PVERT = /* glsl */ `
attribute vec4 aA; attribute vec4 aB; attribute vec4 aC; attribute vec4 aD;
varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying float vFog;
uniform float uFog;
void main() {
  vec4 mv = viewMatrix * vec4(aA.xyz, 1.0);
  vec2 corner = position.xy;
  vec2 off;
  if (aB.w > 0.0) {
    vec3 vv = (viewMatrix * vec4(aB.xyz, 0.0)).xyz;
    float l = length(vv);
    vec2 dir = l > 1e-5 ? normalize(vv.xy + vec2(1e-6, 0.0)) : vec2(0.0, 1.0);
    float inPlane = l > 1e-5 ? length(vv.xy) / l : 0.0;
    vec2 side = vec2(dir.y, -dir.x); // keeps the quad's winding (the other perpendicular mirrors it and it gets culled)
    off = side * corner.x * aA.w + dir * corner.y * aA.w * mix(1.0, aB.w, inPlane);
  } else {
    float c = cos(aD.x), s = sin(aD.x);
    off = vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c) * aA.w;
  }
  mv.xy += off;
  gl_Position = projectionMatrix * mv;
  vUv = corner; vCol = aC; vMisc = aD;
  float d = length(mv.xyz);
  vFog = exp(-uFog * uFog * d * d);
}`;
const PFRAG = /* glsl */ `
varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying float vFog;
uniform sampler2D uNoise; uniform float uAdd;
void main() {
  float type = vMisc.y, seed = vMisc.z, age = vMisc.w;
  float d = length(vUv);
  float shape = 0.0;
  vec3 col = vCol.rgb;
  if (type < 0.5) {            // soft glow
    shape = exp(-d * d * 5.0) * smoothstep(1.0, 0.55, d);
  } else if (type < 1.5) {     // streak: hot head, tapering tail (vUv.y = +1 at the head)
    float w = 1.0 - abs(vUv.x);
    float along = vUv.y * 0.5 + 0.5;
    shape = pow(w, 2.5) * smoothstep(0.0, 0.85, along) * smoothstep(1.0, 0.92, along);
    shape += pow(w, 8.0) * along * 0.8;
  } else if (type < 2.5) {     // smoke: soft body eaten away by noise as it ages
    vec2 nuv = vUv * 0.22 + vec2(seed * 7.3, seed * 3.1);
    // the fbm sits in a narrow band around 0.5: stretch it to 0..1 so the erosion spans the whole life
    float n = clamp((texture2D(uNoise, nuv).r - 0.28) * 2.3, 0.0, 1.0);
    float n2 = clamp((texture2D(uNoise, nuv * 2.7 + 0.31).g - 0.28) * 2.3, 0.0, 1.0);
    float body = smoothstep(1.0, 0.2, d + (n - 0.5) * 0.7);
    float cut = age * 1.1 - 0.2;
    shape = body * smoothstep(cut, cut + 0.35, n * 0.55 + n2 * 0.45);
    col *= 0.75 + n2 * 0.5;
  } else if (type < 3.5) {     // flame: sharper erosion, noise scrolls upward, hot core
    vec2 nuv = vUv * 0.3 + vec2(seed * 5.7, seed * 9.1 - age * 0.55);
    float n = clamp((texture2D(uNoise, nuv).r - 0.28) * 2.3, 0.0, 1.0);
    float n2 = clamp((texture2D(uNoise, nuv * 2.1 + 0.17).g - 0.28) * 2.3, 0.0, 1.0);
    float body = smoothstep(1.0, 0.0, d * (1.0 + max(0.0, -vUv.y) * 0.35) + (n - 0.5) * 0.6);
    float cut = age * 1.15 - 0.2;
    float f = n * 0.6 + n2 * 0.4;
    shape = body * smoothstep(cut, cut + 0.3, f);
    col *= 0.5 + 1.0 * smoothstep(cut + 0.1, cut + 0.6, f) * body;
  } else if (type < 4.5) {     // ring
    float th = mix(0.22, 0.05, age);
    shape = smoothstep(th, 0.0, abs(d - (1.0 - th))) * smoothstep(1.0, 0.96, d);
  } else if (type < 5.5) {     // star flare
    vec2 a = abs(vUv);
    shape = exp(-d * d * 9.0) + exp(-a.y * 26.0) * pow(1.0 - a.x, 3.0) * 0.9 + exp(-a.x * 26.0) * pow(1.0 - a.y, 3.0) * 0.9;
    shape *= smoothstep(1.0, 0.8, max(a.x, a.y));
  } else if (type < 6.5) {     // shard: hard-edged sliver
    shape = step(abs(vUv.x) * 1.0 + abs(vUv.y) * 0.55, 0.62);
    col *= 0.7 + 0.5 * step(0.0, vUv.x + vUv.y * 0.3);
  } else if (type < 7.5) {     // droplet
    shape = smoothstep(1.0, 0.72, d);
    col *= 0.7 + 0.6 * smoothstep(0.9, 0.0, length(vUv - vec2(-0.3, 0.35)));
  } else if (type < 8.5) {     // paper scrap
    shape = step(max(abs(vUv.x) * 1.5, abs(vUv.y)), 0.8);
    col *= 0.8 + 0.35 * vUv.y;
  } else {                     // spark: a point of fire, steady at first, then guttering
    float beat = fract(seed * 17.0 + age * (5.0 + seed * 11.0));
    float gutter = mix(1.0, step(0.45, beat), smoothstep(0.25, 0.6, age));
    shape = (exp(-d * d * 16.0) + 0.3 * exp(-d * d * 3.5)) * smoothstep(1.0, 0.7, d) * (0.25 + 0.75 * gutter);
  }
  float a = shape * vCol.a * vFog;
  if (a < 0.003) discard;
  if (uAdd > 0.5) gl_FragColor = vec4(col * a, 1.0);
  else gl_FragColor = vec4(col, a);
}`;

// what a shed spark is made of (one object, filled in and handed to emit each time)
const TRAIL = {
  pos: { x: 0, y: 0, z: 0 },
  vel: { x: 0, y: 0, z: 0 },
  life: 0.3,
  size: [0.01, 0.004],
  color: [
    [1, 1, 1],
    [1, 1, 1],
  ],
  alpha: 0.9,
  drag: 2.6,
  gravity: 1.2,
  type: 1,
  stretch: 0,
  fadeIn: 0,
  fadePow: 1.25,
  ground: true,
};
const EMBER = [1.5, 0.4, 0.05];

class Particles {
  constructor(capacity, additive, noise) {
    this.cap = capacity;
    // how much of the sparks asked for by `trail` are really shed (see createFx: less when
    // the pool is filling up, and on the low quality preset)
    this.trailScale = 1;
    this.data = new Float32Array(capacity * STRIDE);
    this.alive = new Uint8Array(capacity);
    this.head = 0;
    this.count = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
        3,
      ),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.buf = ["aA", "aB", "aC", "aD"].map((n) => {
      const at = new THREE.InstancedBufferAttribute(
        new Float32Array(capacity * 4),
        4,
      );
      at.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(n, at);
      return at;
    });
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: PVERT,
      fragmentShader: PFRAG,
      uniforms: {
        uNoise: { value: noise },
        uAdd: { value: additive ? 1 : 0 },
        uFog: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 20 : 10;
  }
  /**
   * emit({ pos, vel, life, size: [start, end] | n, color: [r,g,b] | [[...],[...]], alpha, drag, gravity,
   *        type, stretch, rot, spin, fadeIn, fadePow, ground, turb, trail })
   * trail: { rate, life, size }: the particle sheds sparks as it flies (a firework star, a
   * burning fragment): `rate` a second, each living about `life` seconds and `size` across.
   * They are left where they were shed, in the particle's colour at that moment, drawn as
   * dashes end to end while it is fast (so the trail is a line, not a row of dots), and as
   * guttering points once it has slowed.
   */
  emit(o) {
    const i = this.head;
    this.head = (this.head + 1) % this.cap;
    this.alive[i] = 1;
    const d = this.data,
      k = i * STRIDE;
    const p = o.pos,
      v = o.vel;
    d[k] = p.x;
    d[k + 1] = p.y;
    d[k + 2] = p.z;
    d[k + 3] = v ? v.x : 0;
    d[k + 4] = v ? v.y : 0;
    d[k + 5] = v ? v.z : 0;
    d[k + 6] = 0;
    d[k + 7] = o.life ?? 0.5;
    const s = o.size ?? 0.1;
    d[k + 8] = Array.isArray(s) ? s[0] : s;
    d[k + 9] = Array.isArray(s) ? s[1] : s;
    d[k + 10] = o.rot ?? Math.random() * 6.283;
    d[k + 11] = o.spin ?? 0;
    const c = o.color || [1, 1, 1];
    const c0 = Array.isArray(c[0]) ? c[0] : c,
      c1 = Array.isArray(c[0]) ? c[1] : c;
    d[k + 12] = c0[0];
    d[k + 13] = c0[1];
    d[k + 14] = c0[2];
    d[k + 15] = c1[0];
    d[k + 16] = c1[1];
    d[k + 17] = c1[2];
    d[k + 18] = o.alpha ?? 1;
    d[k + 19] = o.drag ?? 0;
    d[k + 20] = o.gravity ?? 0;
    d[k + 21] = o.type ?? 0;
    d[k + 22] = o.stretch ?? 0;
    d[k + 23] = Math.random();
    d[k + 24] = o.fadeIn ?? 0.06;
    d[k + 25] = o.fadePow ?? 1.5;
    d[k + 26] = o.ground ? 1 : 0;
    d[k + 27] = o.turb ?? 0;
    const tr = o.trail;
    d[k + 28] = tr ? tr.rate : 0;
    d[k + 29] = tr ? Math.random() : 0;
    d[k + 30] = tr ? tr.life : 0;
    d[k + 31] = tr ? tr.size : 0;
  }
  // n sparks shed by the particle at k over the step it has just taken
  shed(k, n, dt, f) {
    const d = this.data;
    const T = TRAIL;
    const vx = d[k + 3],
      vy = d[k + 4],
      vz = d[k + 5];
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const size = d[k + 31];
    // how much of the path each spark has to cover, as a dash twice (size x stretch) long
    const reach = (speed * dt) / n;
    // (below about two metres a second the dashes would be dots anyway: guttering points then)
    const dash = reach > size * 2.4;
    for (let j = 0; j < n; j++) {
      const back = ((j + Math.random()) / n) * dt;
      T.pos.x = d[k] - vx * back;
      T.pos.y = d[k + 1] - vy * back;
      T.pos.z = d[k + 2] - vz * back;
      // (a little of the star's own motion: it gives the dash its direction, and the
      // embers drift on the way the star was going)
      const j0 = dash ? 0.05 : 0.22;
      T.vel.x = vx * 0.06 + (Math.random() - 0.5) * j0;
      T.vel.y = vy * 0.06 + (Math.random() - 0.5) * j0;
      T.vel.z = vz * 0.06 + (Math.random() - 0.5) * j0;
      T.life = d[k + 30] * (0.55 + 0.7 * Math.random());
      T.size[0] = size;
      T.size[1] = size * 0.4;
      for (let c = 0; c < 3; c++) {
        const now = d[k + 12 + c] + (d[k + 15 + c] - d[k + 12 + c]) * f;
        T.color[0][c] = now;
        // burning down: the colour goes out of it and what is left is a dull orange
        T.color[1][c] = now * 0.45 + EMBER[c] * 0.6;
      }
      T.type = dash ? P.STREAK : P.SPARK;
      T.stretch = dash ? Math.min(40, (reach / (2 * size)) * 1.25) : 0;
      T.gravity = dash ? 1.1 : 1.8;
      this.emit(T);
    }
  }
  update(dt, t) {
    const d = this.data;
    const [A, B, Cc, D] = this.buf;
    let n = 0;
    for (let i = 0; i < this.cap; i++) {
      if (!this.alive[i]) continue;
      const k = i * STRIDE;
      const age = (d[k + 6] += dt);
      const life = d[k + 7];
      if (age >= life) {
        this.alive[i] = 0;
        continue;
      }
      const f = age / life;
      const drag = Math.exp(-d[k + 19] * dt);
      d[k + 3] *= drag;
      d[k + 4] = d[k + 4] * drag - d[k + 20] * dt;
      d[k + 5] *= drag;
      const tb = d[k + 27];
      if (tb > 0) {
        const s = d[k + 23] * 40;
        d[k + 3] += Math.sin(t * 5.1 + s + d[k + 1] * 3) * tb * dt;
        d[k + 5] += Math.cos(t * 4.3 + s * 1.7 + d[k + 1] * 2.6) * tb * dt;
      }
      d[k] += d[k + 3] * dt;
      d[k + 1] += d[k + 4] * dt;
      d[k + 2] += d[k + 5] * dt;
      if (d[k + 26] && d[k + 1] < 0.02) {
        d[k + 1] = 0.02;
        d[k + 4] = Math.abs(d[k + 4]) * 0.35;
        d[k + 3] *= 0.6;
        d[k + 5] *= 0.6;
      }
      if (d[k + 28] > 0 && this.head !== i) {
        const owed = d[k + 29] + d[k + 28] * dt * this.trailScale;
        const shed = Math.min(4, owed | 0);
        d[k + 29] = owed - (owed | 0);
        if (shed > 0) this.shed(k, shed, dt, f);
      }
      d[k + 10] += d[k + 11] * dt;
      const e = 1 - (1 - f) * (1 - f); // ease-out for growth
      const o = n * 4;
      A.array[o] = d[k];
      A.array[o + 1] = d[k + 1];
      A.array[o + 2] = d[k + 2];
      A.array[o + 3] = d[k + 8] + (d[k + 9] - d[k + 8]) * e;
      B.array[o] = d[k + 3];
      B.array[o + 1] = d[k + 4];
      B.array[o + 2] = d[k + 5];
      B.array[o + 3] = d[k + 22];
      Cc.array[o] = d[k + 12] + (d[k + 15] - d[k + 12]) * f;
      Cc.array[o + 1] = d[k + 13] + (d[k + 16] - d[k + 13]) * f;
      Cc.array[o + 2] = d[k + 14] + (d[k + 17] - d[k + 14]) * f;
      const fi = d[k + 24] > 0 ? Math.min(1, f / d[k + 24]) : 1;
      Cc.array[o + 3] = d[k + 18] * fi * Math.pow(1 - f, d[k + 25]);
      D.array[o] = d[k + 10];
      D.array[o + 1] = d[k + 21];
      D.array[o + 2] = d[k + 23];
      D.array[o + 3] = f;
      n++;
    }
    this.count = n;
    this.geo.instanceCount = n;
    for (const b of this.buf) {
      b.clearUpdateRanges && b.clearUpdateRanges();
      b.addUpdateRange && b.addUpdateRange(0, n * 4);
      b.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------- ribbons
const RVERT = /* glsl */ `
attribute float aAlong; attribute float aSide; attribute float aAlpha;
varying float vAlong; varying float vSide; varying float vAlpha; varying float vFog;
uniform float uFog;
void main(){
  vAlong = aAlong; vSide = aSide; vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = length(mv.xyz);
  vFog = exp(-uFog * uFog * d * d);
  gl_Position = projectionMatrix * mv;
}`;
const RFRAG = /* glsl */ `
varying float vAlong; varying float vSide; varying float vAlpha; varying float vFog;
uniform vec3 uColor; uniform vec3 uCore; uniform float uAlpha; uniform float uKind; uniform float uTime; uniform float uSeed;
uniform sampler2D uNoise;
void main(){
  float w = 1.0 - abs(vSide);
  float a;
  vec3 col;
  if (uKind < 0.5) {            // energy: white-hot core, coloured halo
    float core = pow(w, 6.0);
    a = pow(w, 1.6) * 0.55 + core;
    col = mix(uColor, uCore, core);
  } else if (uKind < 1.5) {     // smoke / vapour trail
    float n = texture2D(uNoise, vec2(vAlong * 3.0 + uSeed, vSide * 0.3 + uTime * 0.12)).r;
    a = smoothstep(0.0, 0.7, w) * smoothstep(0.25, 0.75, n + w * 0.3);
    col = uColor * (0.7 + n * 0.6);
  } else if (uKind < 2.5) {     // fire trail
    float n = texture2D(uNoise, vec2(vAlong * 4.0 - uTime * 1.6 + uSeed, vSide * 0.4)).r;
    float f = w * (0.55 + n * 0.9);
    a = smoothstep(0.25, 0.9, f);
    col = mix(uColor, uCore, smoothstep(0.6, 1.2, f));
  } else {                      // melee swipe: brightest where the blade is now (vAlong = 1) and out at the tip (vSide = +1)
    float n = texture2D(uNoise, vec2(vSide * 1.6 + uSeed, vAlong * 0.6 + uSeed * 3.0)).r;
    float head = smoothstep(0.6, 1.0, vAlong);
    float tipw = smoothstep(-1.0, 0.7, vSide);
    float body = pow(vAlong, 1.4) * (0.25 + n * 0.95) * tipw;
    a = body * 0.3 + head * tipw * 0.55 + smoothstep(0.86, 1.0, vSide) * vAlong * 0.7;
    col = mix(uColor, uCore, clamp(head * tipw + smoothstep(0.85, 1.0, vSide) * 0.6, 0.0, 1.0));
  }
  a *= vAlpha * uAlpha * vFog;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a, 1.0);
}`;

const KIND = { energy: 0, smoke: 1, fire: 2, swipe: 3 };

class Ribbon {
  constructor(maxPoints, noise) {
    this.max = maxPoints;
    this.pts = [];
    this.free = true;
    const n = maxPoints * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    g.setAttribute(
      "aAlong",
      new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    g.setAttribute(
      "aSide",
      new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    g.setAttribute(
      "aAlpha",
      new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const idx = [];
    for (let i = 0; i < maxPoints - 1; i++)
      idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: RVERT,
      fragmentShader: RFRAG,
      uniforms: {
        uColor: { value: new THREE.Vector3(1, 1, 1) },
        uCore: { value: new THREE.Vector3(1, 1, 1) },
        uAlpha: { value: 1 },
        uKind: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: 0 },
        uFog: { value: 0 },
        uNoise: { value: noise },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 22;
    this.mesh.visible = false;
  }
  start(o) {
    this.free = false;
    this.pts.length = 0;
    this.width = o.width ?? 0.05;
    this.life = o.life ?? 0.2; // total life for static ribbons / fade-out time after release for trails
    this.span = o.span ?? 0; // >0: moving trail, points older than span seconds are dropped
    this.age = 0;
    this.released = false;
    this.taper = o.taper ?? (this.span > 0 ? 1 : 0);
    this.edge = !!o.edge; // points are [base, tip] pairs instead of centre points
    this.fade = o.fade ?? 1;
    this.ends = !!o.ends; // static ribbons: fade both ends out (blade-shaped arcs)
    this.onUpdate = o.update || null;
    const u = this.mat.uniforms;
    const c = o.color || [1, 1, 1],
      core = o.core || [c[0] * 0.5 + 2, c[1] * 0.5 + 2, c[2] * 0.5 + 2];
    u.uColor.value.set(c[0], c[1], c[2]);
    u.uCore.value.set(core[0], core[1], core[2]);
    u.uKind.value = KIND[o.kind || "energy"];
    u.uSeed.value = Math.random() * 10;
    u.uAlpha.value = o.alpha ?? 1;
    this.alpha = o.alpha ?? 1;
    this.mesh.visible = true;
    this.geo.setDrawRange(0, 0);
    if (o.points) this.setPoints(o.points);
    return this;
  }
  setPoints(points) {
    this.pts.length = 0;
    const n = Math.min(points.length, this.max);
    for (let i = 0; i < n; i++)
      this.pts.push({
        p: points[i].clone ? points[i].clone() : points[i],
        t: 0,
      });
  }
  /** Add a head point (trail) or a [base, tip] pair (swipe). */
  push(a, b) {
    if (this.pts.length >= this.max) this.pts.shift();
    this.pts.push(
      b
        ? { p: a.clone(), q: b.clone(), t: this.age }
        : { p: a.clone(), t: this.age },
    );
  }
  /** Stop feeding a trail; it fades out and returns to the pool. */
  release() {
    this.released = true;
    this.relAge = this.age;
  }
  update(dt, t, camPos) {
    if (this.free) return;
    this.age += dt;
    if (this.onUpdate) this.onUpdate(this, this.age, dt);
    let alpha = this.alpha;
    if (this.span > 0) {
      while (this.pts.length && this.age - this.pts[0].t > this.span)
        this.pts.shift();
      if (this.released) {
        const k = 1 - (this.age - this.relAge) / Math.max(0.001, this.life);
        if (k <= 0 || this.pts.length < 2) return this.stop();
        alpha *= k;
      }
    } else {
      const k = 1 - this.age / this.life;
      if (k <= 0) return this.stop();
      alpha *= Math.pow(k, this.fade);
    }
    const u = this.mat.uniforms;
    u.uAlpha.value = alpha;
    u.uTime.value = t;
    const n = this.pts.length;
    if (n < 2) {
      this.geo.setDrawRange(0, 0);
      return;
    }
    const pos = this.geo.attributes.position.array,
      al = this.geo.attributes.aAlong.array,
      sd = this.geo.attributes.aSide.array,
      aa = this.geo.attributes.aAlpha.array;
    for (let i = 0; i < n; i++) {
      const pt = this.pts[i];
      const f = n > 1 ? i / (n - 1) : 0; // 0 tail .. 1 head
      let ax, ay, az, bx, by, bz;
      if (this.edge) {
        ax = pt.p.x;
        ay = pt.p.y;
        az = pt.p.z;
        bx = pt.q.x;
        by = pt.q.y;
        bz = pt.q.z;
      } else {
        const a = this.pts[Math.max(0, i - 1)].p,
          b = this.pts[Math.min(n - 1, i + 1)].p;
        _t1.subVectors(b, a);
        _t2.subVectors(camPos, pt.p);
        _up.crossVectors(_t1, _t2);
        const l = _up.length();
        if (l > 1e-8) _up.multiplyScalar(1 / l);
        else _up.set(0, 1, 0);
        const w =
          this.width *
          (this.taper ? 0.15 + 0.85 * Math.pow(f, this.taper) : 1) *
          0.5;
        ax = pt.p.x - _up.x * w;
        ay = pt.p.y - _up.y * w;
        az = pt.p.z - _up.z * w;
        bx = pt.p.x + _up.x * w;
        by = pt.p.y + _up.y * w;
        bz = pt.p.z + _up.z * w;
      }
      const o = i * 6;
      pos[o] = ax;
      pos[o + 1] = ay;
      pos[o + 2] = az;
      pos[o + 3] = bx;
      pos[o + 4] = by;
      pos[o + 5] = bz;
      al[i * 2] = al[i * 2 + 1] = f;
      sd[i * 2] = -1;
      sd[i * 2 + 1] = 1;
      const fadeTail =
        this.span > 0 || this.edge
          ? Math.pow(f, 1.3)
          : this.ends
            ? Math.sin(Math.PI * f)
            : 1;
      aa[i * 2] = aa[i * 2 + 1] = fadeTail;
    }
    for (const k of ["position", "aAlong", "aSide", "aAlpha"])
      this.geo.attributes[k].needsUpdate = true;
    this.geo.setDrawRange(0, (n - 1) * 6);
  }
  stop() {
    this.free = true;
    this.mesh.visible = false;
    this.onUpdate = null;
    this.pts.length = 0;
  }
}

/** Jagged polyline from a to b by midpoint displacement (lightning). */
export function jagged(a, b, { detail = 5, amp = 0.18, taper = true } = {}) {
  let pts = [a.clone(), b.clone()];
  let disp = a.distanceTo(b) * amp;
  for (let l = 0; l < detail; l++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const m = pts[i]
        .clone()
        .add(pts[i + 1])
        .multiplyScalar(0.5);
      randDir(_t1).multiplyScalar(disp * (0.4 + Math.random() * 0.6));
      // keep the wander perpendicular-ish to the bolt
      _t2.subVectors(pts[i + 1], pts[i]).normalize();
      _t1.addScaledVector(_t2, -_t1.dot(_t2));
      m.add(_t1);
      next.push(m, pts[i + 1]);
    }
    pts = next;
    disp *= 0.52;
  }
  return pts;
}

// ---------------------------------------------------------------- decals
const DVERT = /* glsl */ `
varying vec2 vUv; varying float vFog; uniform float uFog;
void main(){ vUv = uv * 2.0 - 1.0; vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = length(mv.xyz); vFog = exp(-uFog * uFog * d * d); gl_Position = projectionMatrix * mv; }`;
const DFRAG = /* glsl */ `
varying vec2 vUv; varying float vFog;
uniform sampler2D uNoise; uniform sampler2D uMap; uniform vec3 uColor; uniform float uAlpha; uniform float uKind; uniform float uTime; uniform float uSeed; uniform float uAge;
void main(){
  float d = length(vUv);
  float ang = atan(vUv.y, vUv.x);
  vec2 nuv = vUv * 0.5 + uSeed;
  float n = texture2D(uNoise, nuv).r;
  float n2 = texture2D(uNoise, nuv * 2.3).g;
  vec3 col = uColor; float a = 0.0; float add = 0.0;
  if (uKind < 0.5) {            // scorch: soot with a ragged edge
    a = smoothstep(1.0, 0.15, d + (n - 0.5) * 0.7) * (0.55 + n2 * 0.45);
    col = uColor * (0.4 + n2 * 0.6);
  } else if (uKind < 1.5) {     // impact pock: dark pit, pale chipped rim
    a = smoothstep(1.0, 0.3, d + (n - 0.5) * 0.5);
    col = mix(vec3(0.45, 0.42, 0.38), vec3(0.01), smoothstep(0.75, 0.25, d + (n2 - 0.5) * 0.4));
  } else if (uKind < 2.5) {     // expanding energy ring
    float r = mix(0.15, 0.92, 1.0 - pow(1.0 - uAge, 3.0));
    float th = mix(0.16, 0.03, uAge);
    a = smoothstep(th, 0.0, abs(d - r)) * (1.0 - uAge); add = 1.0;
  } else if (uKind < 3.5) {     // fire pool: churning embers
    vec2 q = vUv * 0.7 + vec2(sin(uTime * 0.7 + uSeed) * 0.05, -uTime * 0.12);
    float f = texture2D(uNoise, q + uSeed).r * 0.6 + texture2D(uNoise, q * 2.4 - vec2(0.0, uTime * 0.3)).g * 0.4;
    float body = smoothstep(1.0, 0.35, d + (n - 0.5) * 0.5);
    a = body * smoothstep(0.3, 0.75, f + (1.0 - d) * 0.25);
    col = mix(uColor * 0.5, uColor * 2.2 + vec3(0.6, 0.5, 0.2), smoothstep(0.55, 0.9, f)); add = 1.0;
  } else if (uKind < 4.5) {     // glyph / textured mark (uMap alpha), optional slow spin handled on the mesh
    vec4 m = texture2D(uMap, vUv * 0.5 + 0.5);
    a = m.a; col = uColor * (0.6 + 0.4 * m.r); add = 1.0;
  } else if (uKind < 5.5) {     // blood / liquid splat
    float rays = texture2D(uNoise, vec2(ang * 0.7 + uSeed, 0.3)).r;
    a = smoothstep(1.0, 0.2, d * (0.7 + rays * 0.9) + (n - 0.5) * 0.3);
    col = uColor * (0.5 + n2 * 0.5);
  } else {                      // electric field: crawling arcs on the ground
    float f = abs(texture2D(uNoise, vUv * 0.6 + vec2(uTime * 0.21, uSeed)).r - texture2D(uNoise, vUv * 0.6 - vec2(uSeed, uTime * 0.17)).g);
    float line = smoothstep(0.045, 0.0, f);
    a = (line * 1.2 + 0.08) * smoothstep(1.0, 0.6, d); add = 1.0;
    col = uColor * (1.0 + line * 2.0);
  }
  a *= uAlpha * vFog;
  if (a < 0.004) discard;
  gl_FragColor = add > 0.5 ? vec4(col * a, 1.0) : vec4(col, a);
}`;
const DKIND = {
  scorch: 0,
  pock: 1,
  ring: 2,
  firepool: 3,
  glyph: 4,
  splat: 5,
  field: 6,
};
const ADDITIVE_DECAL = new Set(["ring", "firepool", "glyph", "field"]);

class Decal {
  constructor(noise, blank) {
    this.free = true;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: DVERT,
      fragmentShader: DFRAG,
      uniforms: {
        uNoise: { value: noise },
        uMap: { value: blank },
        uColor: { value: new THREE.Vector3(1, 1, 1) },
        uAlpha: { value: 1 },
        uKind: { value: 0 },
        uTime: { value: 0 },
        uSeed: { value: 0 },
        uAge: { value: 0 },
        uFog: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
  }
}

// ---------------------------------------------------------------- the runtime
export function createFx(stage) {
  const { scene, camera } = stage;
  const noise = noiseTexture();
  const add = new Particles(7000, true, noise);
  const alp = new Particles(3500, false, noise);
  const group = new THREE.Group();
  group.name = "fx";
  group.add(alp.mesh, add.mesh);
  scene.add(group);

  const ribbons = [];
  for (let i = 0; i < 70; i++) {
    const r = new Ribbon(i < 20 ? 72 : 36, noise);
    ribbons.push(r);
    group.add(r.mesh);
  }
  const blank = new THREE.DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
  );
  blank.needsUpdate = true;
  const decals = [];
  for (let i = 0; i < 90; i++) {
    const d = new Decal(noise, blank);
    decals.push(d);
    group.add(d.mesh);
  }
  let decalHead = 0;
  const flashes = [];
  const tasks = []; // { t, life, fn(k, dt) -> false to stop }
  const camPos = new THREE.Vector3();
  let trauma = 0;
  let time = 0;

  // casings: three instanced meshes
  const casingKinds = {
    pistol: { r: 0.0052, len: 0.02, color: 0xc49a4a, metal: 1 },
    rifle: { r: 0.0062, len: 0.046, color: 0xc49a4a, metal: 1 },
    shell: { r: 0.0105, len: 0.062, color: 0x9a1810, metal: 0.1 },
  };
  const casings = {};
  for (const [k, c] of Object.entries(casingKinds)) {
    const geo = new THREE.CylinderGeometry(c.r, c.r, c.len, 10, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: c.color,
      metalness: c.metal,
      roughness: 0.35,
    });
    const im = new THREE.InstancedMesh(geo, mat, 28);
    im.frustumCulled = false;
    im.castShadow = true;
    im.count = 28;
    const items = [];
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < 28; i++) {
      im.setMatrixAt(i, hide);
      items.push({
        on: false,
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        q: new THREE.Quaternion(),
        w: new THREE.Vector3(),
        age: 0,
      });
    }
    casings[k] = { im, items, head: 0, len: c.len, hide };
    group.add(im);
  }
  const _m4 = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _one = new THREE.Vector3(1, 1, 1);

  const fx = {
    P,
    add,
    alpha: alp,
    noise,
    group,
    get time() {
      return time;
    },
    /** 1, or less where there is less to spend on effects (the game's low preset): counts scale by it. */
    get detail() {
      return stage.detail ?? 1;
    },
    /** Additive (glowing) particle. */
    glow(o) {
      add.emit(o);
    },
    /** Alpha-blended particle (smoke, debris, liquid, paper). */
    puff(o) {
      alp.emit(o);
    },
    /**
     * Ribbon. Static: { points, width, color, core, life, kind, fade }.
     * Trail: { span, width, color, kind, life (fade after release) } then r.push(pos) each frame and r.release().
     * Swipe: { edge: true, span, ... } then r.push(base, tip).
     */
    ribbon(o) {
      const need = o.points ? o.points.length : o.max || 36;
      let r =
        ribbons.find((x) => x.free && x.max >= need) ||
        ribbons.find((x) => x.free);
      if (!r) {
        r = ribbons[(Math.random() * ribbons.length) | 0];
        r.stop();
      }
      return r.start(o);
    },
    /** Lightning between two points; re-rolls its shape `flicker` times over its life. */
    bolt(a, b, o = {}) {
      const color = o.color || C(0x6fd8ff, 3);
      const life = o.life ?? 0.16;
      const make = () =>
        jagged(a, b, { detail: o.detail ?? 5, amp: o.amp ?? 0.16 });
      const rib = fx.ribbon({
        points: make(),
        width: o.width ?? 0.07,
        color,
        core: o.core || [4, 4.4, 5],
        life,
        fade: 0.6,
        kind: "energy",
      });
      const every = life / (o.flicker ?? 3);
      let acc = 0;
      rib.onUpdate = (r, age, dt) => {
        acc += dt;
        if (acc > every) {
          acc = 0;
          r.setPoints(make());
        }
      };
      const forks = o.forks ?? 2;
      const base = rib.pts;
      for (let i = 0; i < forks; i++) {
        const src = base[(base.length * (0.2 + Math.random() * 0.6)) | 0].p;
        const dir = randDir(new THREE.Vector3()).multiplyScalar(
          a.distanceTo(b) * (0.12 + Math.random() * 0.2),
        );
        dir.addScaledVector(
          _t2.subVectors(b, a).normalize(),
          a.distanceTo(b) * 0.12,
        );
        fx.ribbon({
          points: jagged(src, src.clone().add(dir), { detail: 3, amp: 0.25 }),
          width: (o.width ?? 0.07) * 0.5,
          color,
          core: o.core || [3, 3.3, 4],
          life: life * 0.7,
          fade: 1,
        });
      }
      return rib;
    },
    /**
     * Ground / wall mark. { kind, pos, normal, size, color, life, alpha, map, spin, grow, hold }
     * kinds: scorch, pock, ring, firepool, glyph, splat, field
     */
    decal(o) {
      let d = decals.find((x) => x.free);
      if (!d) {
        d = decals[decalHead];
        decalHead = (decalHead + 1) % decals.length;
      }
      d.free = false;
      d.age = 0;
      d.life = o.life ?? 8;
      d.alpha = o.alpha ?? 1;
      d.kind = o.kind || "scorch";
      d.spin = o.spin || 0;
      d.size = o.size ?? 1;
      d.grow = o.grow ?? 0;
      d.hold = o.hold ?? 0.75; // fraction of life at full strength before fading
      const u = d.mat.uniforms;
      u.uKind.value = DKIND[d.kind];
      const c = o.color || [0.02, 0.02, 0.02];
      u.uColor.value.set(c[0], c[1], c[2]);
      u.uSeed.value = Math.random() * 10;
      u.uMap.value = o.map || blank;
      d.mat.blending = ADDITIVE_DECAL.has(d.kind)
        ? THREE.CustomBlending
        : THREE.NormalBlending;
      d.mat.blendSrc = THREE.OneFactor;
      d.mat.blendDst = THREE.OneFactor;
      const n = o.normal || _up.set(0, 1, 0);
      d.mesh.position
        .copy(o.pos)
        .addScaledVector(n, 0.012 + Math.random() * 0.004);
      d.mesh.quaternion.setFromUnitVectors(
        _t1.set(0, 0, 1),
        _t2.copy(n).normalize(),
      );
      d.mesh.rotateZ(o.rot ?? Math.random() * 6.283);
      d.mesh.scale.setScalar(d.size);
      d.mesh.visible = true;
      d.follow = o.follow || null;
      return d;
    },
    /** Short flash of light. */
    flash(pos, color, intensity = 20, life = 0.08, dist = 10) {
      const l = stage.borrowLight();
      if (!l) return;
      l.color.set(color);
      l.position.copy(pos);
      l.distance = dist;
      l.intensity = intensity;
      flashes.push({ l, i: intensity, life, age: 0 });
    },
    /** A light that stays until released: returns { light, release() } or null. */
    hold(pos, color, intensity, dist = 8) {
      const l = stage.borrowLight();
      if (!l) return null;
      l.color.set(color);
      l.position.copy(pos);
      l.distance = dist;
      l.intensity = intensity;
      return { light: l, release: () => stage.releaseLight(l) };
    },
    /** Run fn(k 0..1, dt, age) every frame for `life` seconds (or until it returns false). */
    task(life, fn) {
      tasks.push({ age: 0, life, fn });
    },
    after(delay, fn) {
      tasks.push({ age: -delay, life: 0, fn: null, once: fn });
    },
    shake(amount) {
      trauma = Math.min(1, trauma + amount);
    },
    get trauma() {
      return trauma;
    },
    /** Spent case tumbling out of the ejection port. kind: pistol | rifle | shell */
    casing(kind, pos, vel) {
      const c = casings[kind];
      if (!c) return;
      const it = c.items[c.head];
      it.idx = c.head;
      c.head = (c.head + 1) % c.items.length;
      it.on = true;
      it.age = 0;
      it.p.copy(pos);
      it.v.copy(vel);
      it.q.setFromEuler(new THREE.Euler(rand(6), rand(6), rand(6)));
      it.w.set(srand(18), srand(18), srand(18));
      it.rest = false;
    },
    update(dt, t) {
      time = t;
      camera.getWorldPosition(camPos);
      const fog = scene.fog && scene.fog.density ? scene.fog.density : 0;
      add.mat.uniforms.uFog.value = fog;
      alp.mat.uniforms.uFog.value = fog;
      // trails are the first thing to thin out when a lot is burning at once
      add.trailScale =
        (stage.detail ?? 1) *
        Math.max(0.25, Math.min(1, 1.5 - 2.2 * (add.count / add.cap)));
      add.update(dt, t);
      alp.update(dt, t);
      for (const r of ribbons) {
        if (r.free) continue;
        r.mat.uniforms.uFog.value = fog;
        r.update(dt, t, camPos);
      }
      for (const d of decals) {
        if (d.free) continue;
        d.age += dt;
        const k = d.age / d.life;
        if (k >= 1) {
          d.free = true;
          d.mesh.visible = false;
          continue;
        }
        const u = d.mat.uniforms;
        u.uFog.value = fog;
        u.uTime.value = t;
        u.uAge.value = k;
        const fadeIn = Math.min(1, d.age / 0.08);
        u.uAlpha.value =
          d.alpha * fadeIn * (k < d.hold ? 1 : 1 - (k - d.hold) / (1 - d.hold));
        if (d.spin) d.mesh.rotateZ(d.spin * dt);
        if (d.grow) d.mesh.scale.setScalar(d.size * (1 + d.grow * k));
        if (d.follow)
          d.mesh.position.set(d.follow.x, d.mesh.position.y, d.follow.z);
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.age += dt;
        const k = 1 - f.age / f.life;
        if (k <= 0) {
          stage.releaseLight(f.l);
          flashes.splice(i, 1);
        } else f.l.intensity = f.i * k * k;
      }
      for (let i = tasks.length - 1; i >= 0; i--) {
        const k = tasks[i];
        k.age += dt;
        if (k.once) {
          if (k.age >= 0) {
            tasks.splice(i, 1);
            k.once();
          }
          continue;
        }
        const done =
          k.fn(Math.min(1, k.age / k.life), dt, k.age) === false ||
          k.age >= k.life;
        if (done) tasks.splice(i, 1);
      }
      trauma = Math.max(0, trauma - dt * 1.8);
      // casings
      const b = stage.range.bounds;
      for (const c of Object.values(casings)) {
        let dirty = false;
        for (const it of c.items) {
          if (!it.on) continue;
          dirty = true;
          it.age += dt;
          if (it.age > 7) {
            it.on = false;
            c.im.setMatrixAt(it.idx, c.hide);
            continue;
          }
          if (!it.rest) {
            it.v.y -= 9.8 * dt;
            it.p.addScaledVector(it.v, dt);
            _q.setFromAxisAngle(_t1.copy(it.w).normalize(), it.w.length() * dt);
            it.q.premultiply(_q);
            const floor = c.len * 0.25;
            if (it.p.y < floor) {
              it.p.y = floor;
              if (Math.abs(it.v.y) < 0.6) {
                it.rest = true;
                // lie flat
                it.q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, rand(6.28)));
              } else {
                it.v.y = -it.v.y * 0.38;
                it.v.x *= 0.6;
                it.v.z *= 0.6;
                it.w.multiplyScalar(0.6);
              }
            }
            if (Math.abs(it.p.x) > b.halfW - 0.05) {
              it.p.x = Math.sign(it.p.x) * (b.halfW - 0.05);
              it.v.x *= -0.4;
            }
          }
          _m4.compose(it.p, it.q, _one);
          c.im.setMatrixAt(it.idx, _m4);
        }
        if (dirty) c.im.instanceMatrix.needsUpdate = true;
      }
    },
    stats() {
      return {
        add: add.count,
        alpha: alp.count,
        ribbons: ribbons.filter((r) => !r.free).length,
        decals: decals.filter((d) => !d.free).length,
        lights: stage.fxLights.filter((l) => !l.userData.free).length,
      };
    },
    async prepareStartup(draw) {
      const position = camera.getWorldPosition(new THREE.Vector3());
      const direction = camera.getWorldDirection(new THREE.Vector3());
      position.addScaledVector(direction, 2);
      const end = position.clone().add(new THREE.Vector3(0.1, 0.1, 0));
      try {
        for (const ribbon of ribbons)
          ribbon.start({ points: [position, end], width: 0.01 });
        for (let index = 0; index < decals.length; index++)
          fx.decal({
            pos: position,
            normal: direction.clone().negate(),
            size: 0.01,
          });
        fx.glow({
          pos: position,
          life: 1,
          size: [0.01, 0.01],
          color: [1, 1, 1],
        });
        fx.puff({
          pos: position,
          life: 1,
          size: [0.01, 0.01],
          color: [1, 1, 1],
        });
        fx.update(0, time);
        await draw(2);
      } finally {
        fx.clear();
        fx.update(0, time);
      }
    },
    clear() {
      // pending tasks may be holding pooled lights: hand every light back
      for (const l of stage.fxLights) stage.releaseLight(l);
      flashes.length = 0;
      add.alive.fill(0);
      alp.alive.fill(0);
      for (const r of ribbons) if (!r.free) r.stop();
      for (const d of decals) {
        d.free = true;
        d.mesh.visible = false;
      }
      tasks.length = 0;
      trauma = 0;
      for (const casing of Object.values(casings)) {
        for (const [index, item] of casing.items.entries()) {
          item.on = false;
          casing.im.setMatrixAt(index, casing.hide);
        }
        casing.im.instanceMatrix.needsUpdate = true;
      }
    },
  };
  return fx;
}
