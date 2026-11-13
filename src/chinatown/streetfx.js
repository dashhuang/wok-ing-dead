// What the street's own lamps and signs do to the picture beyond the few real point lights:
//  - their pools of light baked onto the ground (every lamp down the street has one, not only
//    the handful nearest the camera),
//  - a halo in the wet air around the most relevant ones (added inside the fog pass),
//  - their colour on the rain that falls past them.
// This file is the shared state and the shader text; it has no engine import, because game.js
// reads it before the engine is published. Textures are made by whoever owns a THREE.
// Strengths live in look.js (`LOOK.fx`).

export const GLOW = {
  x0: -42, // the square the map covers, the same one as the ground masks
  z0: -42,
  size: 84,
  res: 128, // texels a side: pools are metres wide, 0.66 m is plenty
  max: 6, // irradiance stored as sqrt(E / max)
};
export const HALO_MAX = 16; // lights the fog and the rain can see at once

// Uniform holders shared by every material that reads them (ground, wet surfaces, fog, rain).
export const STREET = {
  glowTex: { value: null },
  glowRect: { value: [GLOW.x0, GLOW.z0, 1 / GLOW.size] },
  // x, y: metres from the camera over which the baked pools fade in; z: their weight up close,
  // where the real point lights are already doing the job; w: overall strength
  glowFade: { value: [8, 24, 0.35, 0] },
  haloPos: { value: new Float32Array(HALO_MAX * 4) }, // xyz, range
  haloCol: { value: new Float32Array(HALO_MAX * 3) }, // linear colour times candela
  haloK: { value: 0 },
  haloN: { value: 0 }, // how many of the slots are in use on this preset
  rainLit: { value: 0 },
};

// ---- shader text -------------------------------------------------------------------------

export const GLOW_PARS = `
uniform sampler2D uStGlow; uniform vec3 uStGlowRect; uniform vec4 uStGlowFade;
vec3 stGlowRaw(vec2 xz){
  vec3 g = texture2D(uStGlow, (xz - uStGlowRect.xy) * uStGlowRect.z).rgb;
  return g * g * ${GLOW.max.toFixed(1)};
}
// irradiance on up-facing ground from the lamps and signs around world position wp
vec3 stGlowAt(vec3 wp){
  float d = length(cameraPosition - wp);
  float fade = mix(uStGlowFade.z, 1.0, smoothstep(uStGlowFade.x, uStGlowFade.y, d));
  return stGlowRaw(wp.xz) * (fade * uStGlowFade.w * (1.0 - smoothstep(0.6, 2.6, wp.y)));
}
`;

// for any lit standard material with a world position: pavements, kerbs, car bonnets
export const glowApply = (worldPos) => `
#ifndef SL_TRIPLANAR
{
  float stUp = inverseTransformDirection(geometryNormal, viewMatrix).y;
  if (stUp > 0.2 && uStGlowFade.w > 0.0)
    reflectedLight.directDiffuse += stGlowAt(${worldPos}) * stUp * BRDF_Lambert(material.diffuseColor);
}
#endif
`;

// the carriageway: the same pools, plus the sheen wet asphalt gives back. Without the mirror
// pass (phones) the lights also leave a smeared image of themselves on the wet road: a lamp at
// height h shows at the point a fraction e / (e + h) of the way from the eye to its foot, so the
// map is read further out along the view ray, at a few distances for the vertical stretch.
export const GLOW_GROUND = `
if (uStGlowFade.w > 0.0) {
  vec3 stE = stGlowAt(vGWorld);
  reflectedLight.directDiffuse += stE * BRDF_Lambert(material.diffuseColor);
  reflectedLight.directSpecular += stE * (0.010 + 0.035 * gWet + 0.05 * gFilm) * (1.0 - gPuddle);
#ifdef G_NOREFL
  vec2 stV = vGWorld.xz - cameraPosition.xz;
  float stEye = max(cameraPosition.y, 0.3);
  vec3 stR = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    float h = 2.4 + 1.5 * float(i);
    stR += stGlowRaw(cameraPosition.xz + stV * ((stEye + h) / stEye));
  }
  float stGr = pow(1.0 - clamp(normalize(cameraPosition - vGWorld).y, 0.0, 1.0), 3.0);
  reflectedLight.indirectSpecular += stR * (0.14 * uStGlowFade.w) * (0.04 + 0.5 * stGr) * max(gPuddle, 0.35 * gSoak + 0.12 * gWet);
#endif
}
`;

// fog pass: light scattered toward the eye along the view ray by a point light is the integral
// of 1 / d^2 along it, which has a closed form. The ray stops at the scene depth, so a wall in
// front of a lamp hides its halo. `end` is the length of the ray, `acc` the running radiance.
export const HALO_FOG = `
if (uStHaloK > 0.0) {
  float stEnd = min(dist, 140.0);
  for (int i = 0; i < ${HALO_MAX}; i++) {
    if (float(i) >= uStHaloN) break;
    vec4 L = uStHaloPos[i];
    vec3 d = L.xyz - uCamPos;
    float b = dot(d, rd);
    float h2 = max(dot(d, d) - b * b, 0.07);
    float h = sqrt(h2);
    float I = (atan((stEnd - b) / h) + atan(b / h)) / h;
    // a ball of lit air a few metres across, not a veil over everything in range; and none
    // from a lamp the camera is standing under
    float R = min(L.w * 0.5, 5.0);
    float win = max(1.0 - h2 / (R * R), 0.0);
    acc += uStHaloCol[i] * (I * win * win * uStHaloK * smoothstep(1.0, 6.0, length(d)));
  }
}
`;
export const HALO_PARS = `
uniform vec4 uStHaloPos[${HALO_MAX}]; uniform vec3 uStHaloCol[${HALO_MAX}]; uniform float uStHaloK, uStHaloN;
`;

// rain streaks and splashes (vertex shaders): `p` is the drop, `vCol` its colour
export const RAIN_PARS = `
uniform vec4 uStHaloPos[${HALO_MAX}]; uniform vec3 uStHaloCol[${HALO_MAX}]; uniform float uStRainLit, uStHaloN;
vec3 stRainLight(vec3 p){
  vec3 c = vec3(0.0);
  for (int i = 0; i < ${HALO_MAX}; i++) {
    if (float(i) >= uStHaloN) break;
    vec3 d = uStHaloPos[i].xyz - p;
    float d2 = dot(d, d), r = uStHaloPos[i].w * 1.2;
    float w = max(1.0 - d2 / (r * r), 0.0);
    c += uStHaloCol[i] * (w * w / (d2 + 2.0));
  }
  return c * uStRainLit;
}
`;

export const uniformsFor = {
  glow: () => ({
    uStGlow: STREET.glowTex,
    uStGlowRect: STREET.glowRect,
    uStGlowFade: STREET.glowFade,
  }),
  halo: () => ({
    uStHaloPos: STREET.haloPos,
    uStHaloCol: STREET.haloCol,
    uStHaloK: STREET.haloK,
    uStHaloN: STREET.haloN,
  }),
  rain: () => ({
    uStHaloPos: STREET.haloPos,
    uStHaloCol: STREET.haloCol,
    uStRainLit: STREET.rainLit,
    uStHaloN: STREET.haloN,
  }),
};

// ---- baking the pools ----------------------------------------------------------------------

const lin = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
export function linearRgb(hex) {
  return [
    lin(((hex >> 16) & 255) / 255),
    lin(((hex >> 8) & 255) / 255),
    lin((hex & 255) / 255),
  ];
}

/**
 * bakeGlow(emitters, boxes, gain) -> Uint8Array (res * res * 4), row 0 at z0.
 * emitters: { pos: [x, y, z], color, power, range }; boxes: collision boxes ({ min, max }),
 * used as a height field so walls and vehicles shade the pools; gain: candela per unit power.
 */
export function bakeGlow(emitters, boxes, gain) {
  const N = GLOW.res,
    cell = GLOW.size / N;
  // height field at twice the map resolution: the tallest thing standing in each cell
  const HN = N * 2,
    hc = GLOW.size / HN,
    H = new Float32Array(HN * HN);
  for (const b of boxes) {
    if (b.playerOnly || b.max.y < 0.6 || b.min.y > 0.6) continue;
    const i0 = Math.max(0, Math.floor((b.min.x - GLOW.x0) / hc)),
      i1 = Math.min(HN - 1, Math.floor((b.max.x - GLOW.x0) / hc)),
      j0 = Math.max(0, Math.floor((b.min.z - GLOW.z0) / hc)),
      j1 = Math.min(HN - 1, Math.floor((b.max.z - GLOW.z0) / hc));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++)
        if (H[j * HN + i] < b.max.y) H[j * HN + i] = b.max.y;
  }
  const hAt = (x, z) => {
    const i = Math.floor((x - GLOW.x0) / hc),
      j = Math.floor((z - GLOW.z0) / hc);
    return i < 0 || j < 0 || i >= HN || j >= HN ? 0 : H[j * HN + i];
  };
  const E = new Float32Array(N * N * 3);
  for (const e of emitters) {
    if (!e || !e.pos || e.dynamic || e.blink || e.hazard || e.off) continue;
    const [lx, ly, lz] = e.pos;
    if (!(ly > 0.3) || !(e.power > 0)) continue;
    const reach = Math.min(e.range || 10, 10);
    const col = linearRgb(e.color),
      cd = e.power * gain;
    const i0 = Math.max(0, Math.floor((lx - reach - GLOW.x0) / cell)),
      i1 = Math.min(N - 1, Math.floor((lx + reach - GLOW.x0) / cell)),
      j0 = Math.max(0, Math.floor((lz - reach - GLOW.z0) / cell)),
      j1 = Math.min(N - 1, Math.floor((lz + reach - GLOW.z0) / cell));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = GLOW.x0 + (i + 0.5) * cell,
          z = GLOW.z0 + (j + 0.5) * cell;
        const dx = lx - x,
          dz = lz - z,
          r2 = dx * dx + dz * dz;
        if (r2 > reach * reach) continue;
        const d2 = r2 + ly * ly,
          d = Math.sqrt(d2);
        const q = d / (e.range || 10),
          win = Math.max(0, 1 - q * q * q * q);
        let v = ((cd * ly) / (d2 * d)) * win * win;
        if (v < 0.004) continue;
        // walk toward the light; stop short of it (lamp posts and the wall a sign hangs on)
        const steps = Math.ceil(Math.sqrt(r2) / 0.3);
        const last = 1 - 0.7 / d;
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          if (t > last) break;
          if (hAt(x + dx * t, z + dz * t) > 0.2 + (ly - 0.2) * t + 0.05) {
            v = 0;
            break;
          }
        }
        if (!v) continue;
        const o = (j * N + i) * 3;
        E[o] += col[0] * v;
        E[o + 1] += col[1] * v;
        E[o + 2] += col[2] * v;
      }
  }
  // one soft pass over the occlusion edges, then encode
  const out = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const o = (j * N + i) * 4;
      for (let k = 0; k < 3; k++) {
        let sum = 0,
          w = 0;
        for (let b = -1; b <= 1; b++)
          for (let a = -1; a <= 1; a++) {
            const ii = i + a,
              jj = j + b;
            if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
            const ww = a === 0 && b === 0 ? 4 : a === 0 || b === 0 ? 2 : 1;
            sum += E[(jj * N + ii) * 3 + k] * ww;
            w += ww;
          }
        const edge = i === 0 || j === 0 || i === N - 1 || j === N - 1 ? 0 : 1;
        out[o + k] = Math.round(
          255 * Math.sqrt(Math.min(1, (sum / w / GLOW.max) * edge)),
        );
      }
      out[o + 3] = 255;
    }
  return out;
}
