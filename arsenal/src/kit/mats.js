// Material library for weapon view models.
//
// Models have no UV layout: every surface is textured by projecting small tiling maps along the
// three object axes (triplanar). One shared "wear" map breaks up roughness and decides where the
// rounded edges (aWear attribute, see geo.js) are rubbed down to the layer underneath; an optional
// per-material pattern adds wood grain, stippling, cloth weave, casting pits and so on.
import * as THREE from "three";

// ---------------------------------------------------------------- tiling noise
function lattice(n, seed) {
  let s = seed >>> 0;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const a = new Float32Array(n * n);
  for (let i = 0; i < a.length; i++) a[i] = r();
  return a;
}
function valueNoise(size, cells, seed) {
  const L = lattice(cells, seed);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells,
        fy = (y / size) * cells;
      const x0 = Math.floor(fx),
        y0 = Math.floor(fy);
      const tx = fx - x0,
        ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx),
        sy = ty * ty * (3 - 2 * ty);
      const x1 = (x0 + 1) % cells,
        y1 = (y0 + 1) % cells;
      const a = L[y0 * cells + x0],
        b = L[y0 * cells + x1],
        c = L[y1 * cells + x0],
        d = L[y1 * cells + x1];
      out[y * size + x] =
        a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}
function fbm(size, base, octaves, seed) {
  const out = new Float32Array(size * size);
  let amp = 0.5,
    tot = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, base << o, seed + o * 17);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function canvasTex(size, draw, { srgb = false } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d", { willReadFrequently: true });
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function fromChannels(size, fn) {
  return canvasTex(size, (g) => {
    const img = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = fn(i, i % size, (i / size) | 0);
      img.data[i * 4] = Math.max(0, Math.min(255, v[0] * 255));
      img.data[i * 4 + 1] = Math.max(0, Math.min(255, v[1] * 255));
      img.data[i * 4 + 2] = Math.max(0, Math.min(255, v[2] * 255));
      img.data[i * 4 + 3] = Math.max(0, Math.min(255, (v[3] ?? 1) * 255));
    }
    g.putImageData(img, 0, 0);
  });
}

// wear map: R smudges+scratches (roughness), G large-scale dirt, B fine grain height, A edge chipping mask
function makeWear() {
  const S = 512;
  const smudge = fbm(S, 4, 5, 11);
  const dirt = fbm(S, 3, 4, 29);
  const grain = fbm(S, 64, 2, 53);
  const chip = fbm(S, 12, 4, 71);
  // scratches drawn on a scratch canvas, then read back
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  const r = rng(5);
  g.lineCap = "round";
  for (let i = 0; i < 520; i++) {
    const x = r() * S,
      y = r() * S;
    const ang = (r() - 0.5) * 0.9 + (r() < 0.25 ? Math.PI / 2 : 0);
    const len = 6 + r() * r() * 110;
    g.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.5})`;
    g.lineWidth = 0.5 + r() * 0.9;
    for (const [ox, oy] of [
      [0, 0],
      [S, 0],
      [-S, 0],
      [0, S],
      [0, -S],
    ]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(
        x + ox + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 4,
        y + oy + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 4,
        x + ox + Math.cos(ang) * len,
        y + oy + Math.sin(ang) * len,
      );
      g.stroke();
    }
  }
  const sc = g.getImageData(0, 0, S, S).data;
  return fromChannels(S, (i) => {
    const s = sc[i * 4] / 255;
    return [
      smudge[i] * 0.8 + s * 0.45,
      dirt[i],
      grain[i],
      chip[i] * 0.75 + s * 0.5,
    ];
  });
}

// pattern maps: R = albedo modulation (0.5 neutral), G = height, B = roughness modulation (0.5 neutral)
const PATTERNS = {
  wood() {
    const S = 512;
    const warp = fbm(S, 3, 4, 3);
    const fine = fbm(S, 96, 2, 9);
    const pore = lattice(S, 77);
    return fromChannels(S, (i, x, y) => {
      // grain runs along U (x); rings vary along V (y)
      const v =
        y / S + (warp[i] - 0.5) * 0.22 + (warp[(i * 7) % (S * S)] - 0.5) * 0.02;
      const ring = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 9);
      const ring2 = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 23 + warp[i] * 9);
      const streak = pore[(y * S + ((x / 24) | 0)) % (S * S)];
      const a =
        0.36 +
        ring * 0.2 +
        ring2 * 0.1 +
        (fine[i] - 0.5) * 0.07 +
        (streak - 0.5) * 0.08 +
        (warp[i] - 0.5) * 0.25;
      const h = 0.5 + (ring - 0.5) * 0.3 + (fine[i] - 0.5) * 0.15;
      return [a, h, 0.5 + (0.5 - ring) * 0.3];
    });
  },
  bamboo() {
    const S = 256;
    const fine = fbm(S, 64, 2, 13);
    const warp = fbm(S, 4, 3, 31);
    return fromChannels(S, (i, x, y) => {
      const fib =
        0.5 + 0.5 * Math.sin((y / S) * Math.PI * 2 * 40 + warp[i] * 6);
      return [
        0.45 + fib * 0.12 + (fine[i] - 0.5) * 0.2 + (warp[i] - 0.5) * 0.2,
        0.5 + (fib - 0.5) * 0.3,
        0.5,
      ];
    });
  },
  stipple() {
    const S = 256;
    const cell = 16;
    return fromChannels(S, (i, x, y) => {
      const row = (y / cell) | 0;
      const cx = ((x + (row % 2) * (cell / 2)) % cell) - cell / 2,
        cy = (y % cell) - cell / 2;
      const d = Math.hypot(cx, cy) / (cell / 2);
      const h = Math.max(0, 1 - d * 1.25);
      return [0.5 - h * 0.05, h, 0.5 + h * 0.2];
    });
  },
  knurl() {
    const S = 256;
    return fromChannels(S, (i, x, y) => {
      const a = Math.abs((((x + y) / 16) % 1) - 0.5) * 2,
        b = Math.abs((((x - y + S) / 16) % 1) - 0.5) * 2;
      const h = Math.min(a, b);
      return [0.45 + h * 0.1, h, 0.5];
    });
  },
  cast() {
    const S = 256;
    const a = fbm(S, 24, 3, 41),
      b = fbm(S, 6, 3, 43);
    return fromChannels(S, (i) => {
      const pit = Math.max(0, a[i] - 0.52) * 3;
      return [
        0.5 - pit * 0.25 + (b[i] - 0.5) * 0.25,
        0.6 - pit + (a[i] - 0.5) * 0.5,
        0.5 + pit * 0.4,
      ];
    });
  },
  brushed() {
    const S = 256;
    const line = lattice(S, 91);
    const n = fbm(S, 8, 3, 93);
    return fromChannels(S, (i, x, y) => {
      const l = (line[y] + line[(y * 3 + 7) % S] + line[S + ((y / 2) | 0)]) / 3;
      return [
        0.5 + (l - 0.5) * 0.14,
        0.5 + (l - 0.5) * 0.5,
        0.5 + (l - 0.5) * 0.5 + (n[i] - 0.5) * 0.3,
      ];
    });
  },
  weave() {
    const S = 256;
    const n = fbm(S, 32, 2, 61);
    return fromChannels(S, (i, x, y) => {
      const u = (x / 8) % 2 < 1,
        v = (y / 8) % 2 < 1;
      const wx = 0.5 + 0.5 * Math.sin((x / 8) * Math.PI),
        wy = 0.5 + 0.5 * Math.sin((y / 8) * Math.PI);
      const h = u === v ? Math.abs(wx - 0.5) * 2 : Math.abs(wy - 0.5) * 2;
      return [0.42 + h * 0.2 + (n[i] - 0.5) * 0.2, h * 0.8 + n[i] * 0.2, 0.55];
    });
  },
  twill() {
    // diagonal ribs: cord wraps, rope, tassel threads
    const S = 256;
    const n = fbm(S, 48, 2, 67);
    return fromChannels(S, (i, x, y) => {
      const d = ((((x + y * 2) / 12) % 1) + 1) % 1;
      const h = Math.sin(d * Math.PI);
      return [0.38 + h * 0.3 + (n[i] - 0.5) * 0.15, h, 0.55];
    });
  },
  paper() {
    const S = 256;
    const a = fbm(S, 6, 4, 81),
      b = fbm(S, 96, 2, 83);
    return fromChannels(S, (i) => [
      0.5 + (a[i] - 0.5) * 0.35 + (b[i] - 0.5) * 0.2,
      0.5 + (b[i] - 0.5) * 0.6,
      0.55,
    ]);
  },
  leather() {
    const S = 256;
    const a = fbm(S, 40, 3, 21),
      b = fbm(S, 5, 3, 23);
    return fromChannels(S, (i) => {
      const crease = Math.abs(a[i] - 0.5) * 2;
      return [
        0.5 - (1 - crease) * 0.1 + (b[i] - 0.5) * 0.3,
        crease,
        0.5 + (b[i] - 0.5) * 0.4,
      ];
    });
  },
  hammered() {
    // hand-forged dimples for bronze / brass fittings
    const S = 256;
    const a = fbm(S, 14, 2, 37);
    const b = fbm(S, 4, 3, 39);
    return fromChannels(S, (i) => [
      0.5 + (b[i] - 0.5) * 0.4,
      a[i],
      0.5 + (b[i] - 0.5) * 0.5,
    ]);
  },
};

// ---------------------------------------------------------------- shader patch
const VERT_DECL = /* glsl */ `
attribute float aWear;
varying vec3 vObjPos;
varying vec3 vObjNrm;
varying float vWear;
`;
const VERT_MAIN = /* glsl */ `
vObjPos = position;
vObjNrm = normal;
vWear = aWear;
`;
const FRAG_DECL = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vObjNrm;
varying float vWear;
uniform sampler2D uWearMap;
uniform sampler2D uPattern;
uniform vec4 uDetail;      // wearScale, patternScale, bump, patternAlbedo
uniform vec4 uEdge;        // rgb edge colour, a = amount
uniform vec4 uEdgeSurf;    // roughness, metalness of the exposed layer, dirt amount, roughness variation
uniform vec3 uDirtColor;
uniform vec3 uGrain;       // pattern stretch per axis (x: along Z for side faces ...)
uniform float uGlowBoost;
vec3 gTriW;
vec4 triSample(sampler2D map, vec3 p) {
  return texture2D(map, p.zy) * gTriW.x + texture2D(map, p.xz) * gTriW.y + texture2D(map, p.xy) * gTriW.z;
}
// pattern with its grain along the object's Z axis on side and top faces
vec4 triPattern(vec3 p) {
  return texture2D(uPattern, p.zy * uGrain.xy) * gTriW.x + texture2D(uPattern, p.zx * uGrain.xy) * gTriW.y +
         texture2D(uPattern, p.xy * uGrain.xy) * gTriW.z;
}
float gPatH;
float gEdgeMask;
`;
const FRAG_COLOR = /* glsl */ `
{
  vec3 an = abs(normalize(vObjNrm));
  an = pow(an, vec3(6.0));
  gTriW = an / (an.x + an.y + an.z);
  vec4 wr = triSample(uWearMap, vObjPos * uDetail.x);
  vec4 wr2 = triSample(uWearMap, vObjPos * uDetail.x * 0.23 + 0.37);
  vec4 pat = vec4(0.5);
  gPatH = 0.5;
  #ifdef USE_PATTERN
    pat = triPattern(vObjPos * uDetail.y);
    gPatH = pat.g;
    diffuseColor.rgb *= mix(1.0, pat.r * 2.0, uDetail.w);
  #endif
  // dirt: broad patches plus grime collecting in cavities
  float cavity = clamp(-vWear, 0.0, 1.0);
  float dirt = smoothstep(0.45, 0.8, wr2.g + cavity * 0.6) * uEdgeSurf.z;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uDirtColor, dirt);
  // edge wear: rounded edges, chipped by the mask, plus a few scuffs on open faces
  float e = clamp(vWear, 0.0, 1.0);
  float chip = wr.a * 0.7 + wr2.a * 0.5;
  // amount 1 wears ~70% of every edge; lower amounts leave only the most exposed chips
  float lo = mix(0.78, 0.34, uEdge.a);
  gEdgeMask = smoothstep(lo, lo + 0.13, chip) * smoothstep(0.25, 0.9, e) * min(1.0, uEdge.a * 1.6);
  // a few fine scratches through the finish on open faces
  gEdgeMask = max(gEdgeMask, smoothstep(0.86, 0.98, wr.r) * uEdge.a * 0.45);
  diffuseColor.rgb = mix(diffuseColor.rgb, uEdge.rgb, gEdgeMask);
  gWearR = wr.r;
  gWearR2 = wr2.r;
  gPatB = pat.b;
}
`;
const FRAG_ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, uEdgeSurf.x, gEdgeMask);
roughnessFactor = clamp(roughnessFactor + ((gWearR - 0.45) * 0.9 + (gWearR2 - 0.5) * 0.7) * uEdgeSurf.w + (gPatB - 0.5) * 0.5, 0.04, 1.0);
`;
const FRAG_METAL = /* glsl */ `
metalnessFactor = mix(metalnessFactor, uEdgeSurf.y, gEdgeMask);
`;
const FRAG_NORMAL = /* glsl */ `
#ifdef USE_PATTERN
if (uDetail.z > 0.0) {
  float hgt = gPatH;
  vec3 vSigmaX = dFdx(-vViewPosition);
  vec3 vSigmaY = dFdy(-vViewPosition);
  vec2 dH = vec2(dFdx(hgt), dFdy(hgt)) * uDetail.z;
  vec3 R1 = cross(vSigmaY, normal);
  vec3 R2 = cross(normal, vSigmaX);
  float fDet = dot(vSigmaX, R1);
  vec3 vGrad = sign(fDet) * (dH.x * R1 + dH.y * R2);
  normal = normalize(abs(fDet) * normal - vGrad);
}
#endif
`;

function patch(material, u) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + VERT_DECL)
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n" + VERT_MAIN,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\n" +
          FRAG_DECL +
          "float gWearR; float gWearR2; float gPatB;\n",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\n" + FRAG_COLOR,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\n" + FRAG_ROUGH,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\n" + FRAG_METAL,
      )
      .replace(
        "#include <normal_fragment_maps>",
        "#include <normal_fragment_maps>\n" + FRAG_NORMAL,
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uGlowBoost;",
      );
  };
  material.customProgramCacheKey = () =>
    material.defines.USE_PATTERN ? "arsenal-pat" : "arsenal";
}

// ---------------------------------------------------------------- definitions
// color: base albedo (sRGB hex).  edge: colour revealed on worn edges.  edgeAmt 0..1.
// pattern / pScale (tiles per metre) / bump / pAlbedo (how strongly the pattern tints the albedo).
const DEFS = {
  // steels
  steel_blued: {
    color: 0x15171c,
    rough: 0.34,
    metal: 1,
    edge: 0x9a9da6,
    edgeAmt: 0.85,
    edgeRough: 0.28,
    dirt: 0.25,
  },
  steel_park: {
    color: 0x26272a,
    rough: 0.62,
    metal: 0.75,
    edge: 0x8c8f96,
    edgeAmt: 0.8,
    edgeRough: 0.35,
    dirt: 0.3,
  },
  steel_bare: {
    color: 0x8d9198,
    rough: 0.3,
    metal: 1,
    edge: 0xc8ccd4,
    edgeAmt: 0.5,
    edgeRough: 0.2,
    dirt: 0.5,
    dirtColor: 0x5a4a3a,
    pattern: "brushed",
    pScale: 7,
    bump: 0.0002,
  },
  steel_dark: {
    color: 0x0b0c0e,
    rough: 0.5,
    metal: 0.9,
    edge: 0x6f737a,
    edgeAmt: 0.6,
    edgeRough: 0.35,
    dirt: 0.2,
  },
  iron_cast: {
    color: 0x1d1c1b,
    rough: 0.78,
    metal: 0.85,
    edge: 0x77787c,
    edgeAmt: 0.7,
    edgeRough: 0.4,
    dirt: 0.5,
    dirtColor: 0x6a4028,
    pattern: "cast",
    pScale: 28,
    bump: 0.0012,
    pAlbedo: 0.6,
  },
  iron_rust: {
    color: 0x4a2a1a,
    rough: 0.9,
    metal: 0.35,
    edge: 0x6d6f73,
    edgeAmt: 0.5,
    edgeRough: 0.45,
    dirt: 0.8,
    dirtColor: 0x9a5a2a,
    pattern: "cast",
    pScale: 22,
    bump: 0.0016,
    pAlbedo: 0.9,
  },
  chrome: {
    color: 0xd0d4da,
    rough: 0.12,
    metal: 1,
    edge: 0xffffff,
    edgeAmt: 0.2,
    edgeRough: 0.1,
    dirt: 0.3,
  },
  // warm metals
  brass: {
    color: 0xb8923c,
    rough: 0.3,
    metal: 1,
    edge: 0xf0cf78,
    edgeAmt: 0.7,
    edgeRough: 0.18,
    dirt: 0.75,
    dirtColor: 0x4a3a1e,
  },
  brass_aged: {
    color: 0x8a6a2c,
    rough: 0.45,
    metal: 1,
    edge: 0xe2bd62,
    edgeAmt: 0.9,
    edgeRough: 0.22,
    dirt: 0.9,
    dirtColor: 0x3c4a34,
    pattern: "hammered",
    pScale: 40,
    bump: 0.0005,
    pAlbedo: 0.5,
  },
  copper: {
    color: 0xb86a3e,
    rough: 0.32,
    metal: 1,
    edge: 0xf2a878,
    edgeAmt: 0.6,
    edgeRough: 0.2,
    dirt: 0.6,
    dirtColor: 0x3f6a58,
  },
  bronze: {
    color: 0x6c5630,
    rough: 0.5,
    metal: 1,
    edge: 0xd2a85a,
    edgeAmt: 0.9,
    edgeRough: 0.25,
    dirt: 1.0,
    dirtColor: 0x3a6a56,
    pattern: "hammered",
    pScale: 34,
    bump: 0.0007,
    pAlbedo: 0.6,
  },
  gold: {
    color: 0xe0b04a,
    rough: 0.22,
    metal: 1,
    edge: 0xffe6a0,
    edgeAmt: 0.4,
    edgeRough: 0.15,
    dirt: 0.3,
    dirtColor: 0x6a4a1a,
  },
  coin: {
    color: 0x9a7a34,
    rough: 0.42,
    metal: 1,
    edge: 0xf2d27a,
    edgeAmt: 1.0,
    edgeRough: 0.2,
    dirt: 1.0,
    dirtColor: 0x2f5a48,
    pattern: "hammered",
    pScale: 60,
    bump: 0.0004,
    pAlbedo: 0.7,
  },
  // polymers and rubber
  polymer: {
    color: 0x121314,
    rough: 0.66,
    metal: 0,
    edge: 0x4a4c50,
    edgeAmt: 0.5,
    edgeRough: 0.5,
    dirt: 0.3,
    dirtColor: 0x6a6258,
  },
  polymer_grip: {
    color: 0x0f1011,
    rough: 0.8,
    metal: 0,
    edge: 0x3c3e42,
    edgeAmt: 0.4,
    edgeRough: 0.6,
    dirt: 0.3,
    dirtColor: 0x6a6258,
    pattern: "stipple",
    pScale: 42,
    bump: 0.0005,
  },
  polymer_yellow: {
    color: 0xe0a80e,
    rough: 0.5,
    metal: 0,
    edge: 0xf6e9b8,
    edgeAmt: 0.75,
    edgeRough: 0.6,
    dirt: 0.9,
    dirtColor: 0x4a3a22,
  },
  polymer_tan: {
    color: 0x8a7350,
    rough: 0.62,
    metal: 0,
    edge: 0xcbb994,
    edgeAmt: 0.5,
    edgeRough: 0.6,
    dirt: 0.5,
    dirtColor: 0x3a3226,
  },
  rubber: {
    color: 0x0b0b0c,
    rough: 0.92,
    metal: 0,
    edge: 0x2a2a2c,
    edgeAmt: 0.3,
    edgeRough: 0.8,
    dirt: 0.4,
    dirtColor: 0x7a7468,
    pattern: "knurl",
    pScale: 36,
    bump: 0.0005,
  },
  rubber_red: {
    color: 0x7a1410,
    rough: 0.8,
    metal: 0,
    edge: 0xa84a40,
    edgeAmt: 0.4,
    edgeRough: 0.8,
    dirt: 0.6,
    dirtColor: 0x2a1a14,
  },
  // woods (grain along Z)
  wood_walnut: {
    color: 0x3e2415,
    rough: 0.44,
    metal: 0,
    edge: 0x8a6440,
    edgeAmt: 0.35,
    edgeRough: 0.6,
    dirt: 0.5,
    dirtColor: 0x2a1a10,
    pattern: "wood",
    pScale: 9,
    bump: 0.00022,
    pAlbedo: 0.85,
    grain: [0.3, 1],
    coat: 0.4,
  },
  wood_rose: {
    color: 0x4a1810,
    rough: 0.32,
    metal: 0,
    edge: 0x8a5438,
    edgeAmt: 0.3,
    edgeRough: 0.5,
    dirt: 0.5,
    dirtColor: 0x200c08,
    pattern: "wood",
    pScale: 11,
    bump: 0.00015,
    pAlbedo: 0.85,
    grain: [0.28, 1],
    coat: 0.7,
  },
  wood_peach: {
    color: 0x7a4a28,
    rough: 0.5,
    metal: 0,
    edge: 0xb48a5c,
    edgeAmt: 0.4,
    edgeRough: 0.65,
    dirt: 0.6,
    dirtColor: 0x3a2414,
    pattern: "wood",
    pScale: 10,
    bump: 0.00025,
    pAlbedo: 0.85,
    grain: [0.35, 1],
    coat: 0.2,
  },
  wood_dark: {
    color: 0x1c110b,
    rough: 0.5,
    metal: 0,
    edge: 0x5a4028,
    edgeAmt: 0.45,
    edgeRough: 0.6,
    dirt: 0.4,
    dirtColor: 0x0c0806,
    pattern: "wood",
    pScale: 9,
    bump: 0.00022,
    pAlbedo: 0.8,
    grain: [0.3, 1],
    coat: 0.3,
  },
  bamboo: {
    color: 0xb49a52,
    rough: 0.42,
    metal: 0,
    edge: 0xdcc88c,
    edgeAmt: 0.4,
    edgeRough: 0.5,
    dirt: 0.7,
    dirtColor: 0x4a3a1c,
    pattern: "bamboo",
    pScale: 12,
    bump: 0.0002,
    pAlbedo: 0.9,
    grain: [0.4, 1],
    coat: 0.3,
  },
  // lacquer and paint (worn edges show what is underneath)
  lacquer_red: {
    color: 0x5a0a08,
    rough: 0.27,
    metal: 0,
    edge: 0x2a1408,
    edgeAmt: 0.8,
    edgeRough: 0.7,
    dirt: 0.5,
    dirtColor: 0x2a0806,
    coat: 1,
  },
  lacquer_black: {
    color: 0x0a0908,
    rough: 0.18,
    metal: 0,
    edge: 0x6a2a1a,
    edgeAmt: 0.7,
    edgeRough: 0.6,
    dirt: 0.3,
    dirtColor: 0x3a3028,
    coat: 1,
  },
  paint_red: {
    color: 0x9a1810,
    rough: 0.42,
    metal: 0.1,
    edge: 0x8a8c90,
    edgeAmt: 0.9,
    edgeRough: 0.35,
    edgeMetal: 1,
    dirt: 0.7,
    dirtColor: 0x3a1c12,
  },
  paint_blue: {
    color: 0x1c4a8a,
    rough: 0.42,
    metal: 0.1,
    edge: 0x8a8c90,
    edgeAmt: 0.9,
    edgeRough: 0.35,
    edgeMetal: 1,
    dirt: 0.7,
    dirtColor: 0x4a2c1a,
  },
  paint_green: {
    color: 0x2a4a34,
    rough: 0.5,
    metal: 0.1,
    edge: 0x8a8c90,
    edgeAmt: 0.9,
    edgeRough: 0.35,
    edgeMetal: 1,
    dirt: 0.7,
    dirtColor: 0x3a2a1a,
  },
  paint_yellow: {
    color: 0xd6a012,
    rough: 0.45,
    metal: 0.1,
    edge: 0x7c7e82,
    edgeAmt: 0.95,
    edgeRough: 0.35,
    edgeMetal: 1,
    dirt: 0.8,
    dirtColor: 0x3a2a14,
  },
  paint_grey: {
    color: 0x55595c,
    rough: 0.5,
    metal: 0.1,
    edge: 0x9a9da2,
    edgeAmt: 0.9,
    edgeRough: 0.35,
    edgeMetal: 1,
    dirt: 0.7,
    dirtColor: 0x3a2a1a,
  },
  enamel_white: {
    color: 0xd8d4c8,
    rough: 0.3,
    metal: 0,
    edge: 0x1a1a1c,
    edgeAmt: 0.6,
    edgeRough: 0.6,
    dirt: 0.8,
    dirtColor: 0x5a4630,
  },
  // soft goods
  cloth_red: {
    color: 0x4a0e0c,
    rough: 0.95,
    metal: 0,
    edge: 0xb04a3a,
    edgeAmt: 0.3,
    edgeRough: 0.95,
    dirt: 0.7,
    dirtColor: 0x2a0c0a,
    pattern: "weave",
    pScale: 28,
    bump: 0.0005,
    pAlbedo: 0.7,
  },
  cloth_black: {
    color: 0x121112,
    rough: 0.95,
    metal: 0,
    edge: 0x3a383a,
    edgeAmt: 0.3,
    edgeRough: 0.95,
    dirt: 0.5,
    dirtColor: 0x5a5248,
    pattern: "weave",
    pScale: 28,
    bump: 0.0005,
    pAlbedo: 0.7,
  },
  cord_red: {
    color: 0x7a0e0c,
    rough: 0.85,
    metal: 0,
    edge: 0xc85a48,
    edgeAmt: 0.25,
    edgeRough: 0.9,
    dirt: 0.6,
    dirtColor: 0x300c08,
    pattern: "twill",
    pScale: 40,
    bump: 0.0006,
    pAlbedo: 0.9,
  },
  cord_gold: {
    color: 0xc89a2a,
    rough: 0.7,
    metal: 0.2,
    edge: 0xf0d27a,
    edgeAmt: 0.3,
    edgeRough: 0.7,
    dirt: 0.5,
    dirtColor: 0x4a3410,
    pattern: "twill",
    pScale: 40,
    bump: 0.0006,
    pAlbedo: 0.9,
  },
  rope_hemp: {
    color: 0x9a8254,
    rough: 0.95,
    metal: 0,
    edge: 0xc8b488,
    edgeAmt: 0.3,
    edgeRough: 0.95,
    dirt: 0.8,
    dirtColor: 0x3a2c18,
    pattern: "twill",
    pScale: 36,
    bump: 0.0007,
    pAlbedo: 0.9,
  },
  leather: {
    color: 0x4a2c18,
    rough: 0.6,
    metal: 0,
    edge: 0x9a6a44,
    edgeAmt: 0.7,
    edgeRough: 0.75,
    dirt: 0.6,
    dirtColor: 0x1a0e08,
    pattern: "leather",
    pScale: 24,
    bump: 0.0005,
    pAlbedo: 0.7,
  },
  tape_black: {
    color: 0x0d0d0e,
    rough: 0.55,
    metal: 0,
    edge: 0x2c2c2e,
    edgeAmt: 0.3,
    edgeRough: 0.7,
    dirt: 0.5,
    dirtColor: 0x6a6258,
    pattern: "twill",
    pScale: 30,
    bump: 0.0003,
    pAlbedo: 0.3,
  },
  paper_yellow: {
    color: 0xd8b03a,
    rough: 0.9,
    metal: 0,
    edge: 0xf0dc9a,
    edgeAmt: 0.3,
    edgeRough: 0.9,
    dirt: 0.6,
    dirtColor: 0x6a4a1a,
    pattern: "paper",
    pScale: 30,
    bump: 0.0005,
    pAlbedo: 0.8,
  },
  paper_red: {
    color: 0xa81810,
    rough: 0.85,
    metal: 0,
    edge: 0xd86a52,
    edgeAmt: 0.5,
    edgeRough: 0.9,
    dirt: 0.6,
    dirtColor: 0x3a0c08,
    pattern: "paper",
    pScale: 30,
    bump: 0.0005,
    pAlbedo: 0.8,
  },
  paper_kraft: {
    color: 0x8a6a44,
    rough: 0.9,
    metal: 0,
    edge: 0xb89a70,
    edgeAmt: 0.4,
    edgeRough: 0.9,
    dirt: 0.6,
    dirtColor: 0x3a2a18,
    pattern: "paper",
    pScale: 30,
    bump: 0.0006,
    pAlbedo: 0.8,
  },
  // stone, ceramic
  ceramic: {
    color: 0xe6e0d2,
    rough: 0.2,
    metal: 0,
    edge: 0xf6f2e8,
    edgeAmt: 0.2,
    edgeRough: 0.3,
    dirt: 0.9,
    dirtColor: 0x6a5234,
    coat: 0.8,
  },
  jade: {
    color: 0x3f9a6e,
    rough: 0.22,
    metal: 0,
    edge: 0x8ad8b0,
    edgeAmt: 0.3,
    edgeRough: 0.2,
    dirt: 0.4,
    dirtColor: 0x1a4a34,
    coat: 1,
  },
  agate_red: {
    color: 0xa81418,
    rough: 0.12,
    metal: 0,
    edge: 0xf06a5a,
    edgeAmt: 0.3,
    edgeRough: 0.1,
    dirt: 0.2,
    dirtColor: 0x3a0608,
    coat: 1,
  },
  bore: {
    color: 0x020202,
    rough: 0.9,
    metal: 0.2,
    edge: 0x020202,
    edgeAmt: 0,
    dirt: 0,
  },
};

export function createMats() {
  const wear = makeWear();
  const patterns = new Map();
  const cache = new Map();
  const glowMats = [];
  const getPattern = (k) => {
    if (!patterns.has(k)) patterns.set(k, PATTERNS[k]());
    return patterns.get(k);
  };

  function make(name, d) {
    const coat = d.coat || 0;
    const m = coat
      ? new THREE.MeshPhysicalMaterial({
          clearcoat: coat,
          clearcoatRoughness: 0.18,
        })
      : new THREE.MeshStandardMaterial();
    m.name = name;
    m.color.set(d.color);
    m.roughness = d.rough;
    m.metalness = d.metal;
    m.vertexColors = true;
    m.envMapIntensity = d.env ?? 1;
    if (d.emissive !== undefined) {
      m.emissive.set(d.emissive);
      m.emissiveIntensity = d.glow ?? 1;
    }
    m.defines = m.defines || {};
    if (d.pattern) m.defines.USE_PATTERN = "";
    const edge = new THREE.Color(d.edge ?? d.color);
    const dirtC = new THREE.Color(d.dirtColor ?? 0x40382e);
    const u = {
      uWearMap: { value: wear },
      uPattern: { value: d.pattern ? getPattern(d.pattern) : wear },
      uDetail: {
        value: new THREE.Vector4(
          d.wScale ?? 9,
          d.pScale ?? 10,
          d.bump ?? 0,
          d.pAlbedo ?? 0.35,
        ),
      },
      uEdge: {
        value: new THREE.Vector4(edge.r, edge.g, edge.b, d.edgeAmt ?? 0.6),
      },
      uEdgeSurf: {
        value: new THREE.Vector4(
          d.edgeRough ?? d.rough,
          d.edgeMetal ?? d.metal,
          d.dirt ?? 0.3,
          d.var ?? 0.5,
        ),
      },
      uDirtColor: { value: dirtC },
      uGrain: {
        value: new THREE.Vector3(
          d.grain ? d.grain[0] : 1,
          d.grain ? d.grain[1] : 1,
          1,
        ),
      },
      uGlowBoost: { value: 1 },
    };
    m.userData.u = u;
    patch(m, u);
    return m;
  }

  const api = {
    wearMap: wear,
    /** Shared material by name (see DEFS). */
    get(name) {
      if (!cache.has(name)) {
        const d = DEFS[name];
        if (!d) throw new Error(`[arsenal] unknown material "${name}"`);
        cache.set(name, make(name, d));
      }
      return cache.get(name);
    },
    /** One-off variant of a library material: mats.variant("paint_red", { color: 0x224488, rough: 0.3 }). */
    variant(base, over, name) {
      const key = name || `${base}:${JSON.stringify(over)}`;
      if (!cache.has(key))
        cache.set(key, make(key, { ...DEFS[base], ...over }));
      return cache.get(key);
    },
    /**
     * Self-lit material for neon tubes, hot metal, glowing glyphs. `power` is in HDR units:
     * 1 is paper white, 3+ blooms. The lab scales every glow material with setGlow().
     */
    glow(color, power = 3, opts = {}) {
      const key = `glow:${color}:${power}:${JSON.stringify(opts)}`;
      if (!cache.has(key)) {
        const m = new THREE.MeshStandardMaterial({
          color: opts.base ?? 0x050505,
          emissive: color,
          emissiveIntensity: power,
          roughness: opts.rough ?? 0.3,
          metalness: opts.metal ?? 0,
          vertexColors: true,
          transparent: !!opts.opacity,
          opacity: opts.opacity ?? 1,
        });
        m.name = key;
        m.userData.glow = power;
        glowMats.push(m);
        cache.set(key, m);
      }
      return cache.get(key);
    },
    /** Clear or tinted glass (neon envelopes, lenses, bulbs). */
    glass(color = 0xffffff, opts = {}) {
      const key = `glass:${color}:${JSON.stringify(opts)}`;
      if (!cache.has(key)) {
        const m = new THREE.MeshPhysicalMaterial({
          color,
          roughness: opts.rough ?? 0.05,
          metalness: 0,
          transparent: true,
          opacity: opts.opacity ?? 0.22,
          envMapIntensity: 1.6,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          depthWrite: false,
          vertexColors: true,
          side: opts.side ?? THREE.FrontSide,
        });
        m.name = key;
        cache.set(key, m);
      }
      return cache.get(key);
    },
    glowMats,
    names: () => Object.keys(DEFS),
    all: () => [...cache.values()],
  };
  return api;
}
