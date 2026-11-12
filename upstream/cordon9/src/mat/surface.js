var GLOBAL = { uWet: { value: 1 }, uTime: { value: 0 }, tNoise: { value: null }, uSpec: { value: 1 }, coat: true };
var VERT_COMMON = (
  /* glsl */
  `
attribute vec2 mask;
#ifndef USE_COLOR
attribute vec3 color;
#endif
varying vec3 vCxP; varying vec3 vCxN; varying vec2 vCxMask; varying vec3 vCxCol; varying mat3 vCxM; varying vec3 vCxWp;
`
);
var FRAG_COMMON = (
  /* glsl */
  `
uniform sampler2D tAlb, tOrm, tNrm, tCxNoise;
uniform vec4 uTex;   // tiles per metre, normal strength, macro amount, macro cycles per metre
uniform vec4 uWetP;  // porous darkening, wet roughness multiplier, bead amount, streak amount
uniform vec4 uWear;  // amount, roughness, metalness, -
uniform vec4 uDirt;  // rgb multiplier, amount
uniform vec3 uWearCol;
uniform vec4 uBlood; // rgb, amount
uniform vec3 uBloodP; // zombie skin: share of a stain that stays wet, roughness of the wet part, brightness of the wet part
uniform float uCxWet, uCxTime, uCxSpec; // uCxSpec: gain on reflected environment only, so a look can drop the ambient fill without losing the reflections
uniform vec3 uWr;    // cloth creases: cycles per metre, height in metres, crease darkening
uniform vec2 uCoat;  // clear film over the base layer: always there (lacquer on car paint), added where the surface is wet (rain film)
varying vec3 vCxP; varying vec3 vCxN; varying vec2 vCxMask; varying vec3 vCxCol; varying mat3 vCxM; varying vec3 vCxWp;
vec3 cxW; vec2 cxUx, cxUy, cxUz; vec4 cxOrm;
float cxBloodK = 0.0, cxFreshK = 0.0, cxWetK = 0.0, cxBead = 0.0, cxBeadH = 0.0, cxWearK = 0.0, cxDirtK = 0.0, cxUp = 0.0, cxMac = 0.0, cxWrH = 0.0;
float cxSS(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
// 3D value noise from one fetch: the G channel of the noise texture is R shifted by (37,17)
float cxN3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); vec2 uv = i.xy + vec2(37.0, 17.0) * i.z + f.xy; vec2 rg = textureLod(tCxNoise, (uv + 0.5) / 256.0, 0.0).rg; return mix(rg.x, rg.y, f.z); }
vec4 cxTri(sampler2D t){ return texture2D(t, cxUx) * cxW.x + texture2D(t, cxUy) * cxW.y + texture2D(t, cxUz) * cxW.z; }
`
);
var FRAG_MAP = (
  /* glsl */
  `
{
  vec3 cxOn = normalize(vCxN);
  vec3 cxW3 = pow(abs(cxOn), vec3(5.0)); cxW = cxW3 / (cxW3.x + cxW3.y + cxW3.z);
  vec3 cxQ = vCxP * uTex.x; cxUx = cxQ.zy; cxUy = cxQ.xz; cxUz = cxQ.xy;
  vec4 cxA = cxTri(tAlb); cxOrm = cxTri(tOrm);
  float cxM1 = cxN3(vCxP * uTex.w), cxM2 = cxN3(vCxP * uTex.w * 3.7 + 11.3);
  cxMac = cxM1 * 0.65 + cxM2 * 0.35 - 0.5;
  cxA.rgb *= 1.0 + uTex.z * cxMac * 2.0;
  diffuseColor.rgb *= cxA.rgb * mix(vec3(1.0), vCxCol, cxOrm.a);
  #ifdef CX_WRINKLE
  { // worn-in creases a few centimetres apart: two octaves of folded noise (sharp valleys, round crowns), stretched so they run across a limb more than along it.
    // The height feeds the normal further down; the valleys are darkened here.
    vec3 cxWq = vCxP * vec3(1.0, 1.9, 1.0) * uWr.x;
    float cxWa = cxN3(cxWq + vec3(3.1, 0.0, 1.7)), cxWb = cxN3(cxWq * 2.6 + 5.1);
    cxWrH = abs(2.0 * cxWa - 1.0) * 0.68 + abs(2.0 * cxWb - 1.0) * 0.32;
    diffuseColor.rgb *= 1.0 - uWr.z * cxSS(0.3, 0.02, cxWrH);
  }
  #endif
  float cxWn = cxN3(vCxP * 650.0);
  cxWearK = step(0.001, uWear.x) * cxSS(0.42, 0.7, vCxMask.x * (0.3 + 0.45 * uWear.x) + (cxWn - 0.5) * 0.5 + (cxM2 - 0.5) * 0.4 + (cxA.a - 0.5) * 0.3 - 0.1);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWearCol * (0.8 + 0.4 * cxWn), cxWearK);
  #ifdef CX_BLOOD
  { // mask.x carries a smooth blood field; noise turns its fringe into spatter, drips and soaked patches
    float cxBf = clamp(vCxMask.x * uBlood.a, 0.0, 1.0);
    // warp the lookup so the square value-noise lattice turns into ragged spatter and runs instead of blocks
    vec3 cxBp = vCxP + (vec3(cxN3(vCxP * 29.0 + 2.7), cxN3(vCxP * 29.0 + 9.1), cxN3(vCxP * 29.0 + 15.3)) - 0.5) * 0.036;
    float cxBn = cxN3(cxBp * 46.0) * 0.5 + cxN3(cxBp * vec3(120.0, 26.0, 120.0) + 3.1) * 0.3 + cxN3(cxBp * 210.0 + 7.7) * 0.2;
    cxBloodK = cxSS(0.0, 0.05, cxBn - (1.05 - cxBf)) * step(0.02, cxBf);   // coverage: ~5% at 0.3, ~25% at 0.5, solid above 0.9
    float cxBd = cxN3(vCxP * 17.0 + 1.9);
    float cxFresh = cxSS(0.78, 1.0, cxBf) * cxSS(0.35, 0.7, cxBd);                       // only the soaked cores stay wet and red
    vec3 cxBc = mix(uBlood.rgb * vec3(0.34, 0.62, 0.7), uBlood.rgb, cxFresh) * (0.7 + 0.6 * cxBn);   // dried: brown-black, soaked cores: deep red
    cxFreshK = cxFresh * cxBloodK;
    #ifdef CX_BLOODWET
    { // on skin most of a heavy stain is still running: bright red sheets with dried brown only at the thin edge and in patches
      float cxF2 = max(cxFresh, uBloodP.x * cxSS(0.36, 0.62, cxBf) * cxSS(0.12, 0.42, cxBd + 0.5 * (cxBf - 0.6)));
      // the vertex field is only as fine as the mesh, so its outline would show the triangles: millimetre noise (faded out where a
      // pixel is wider than its grain) frays the outline, and the film thins toward its edge instead of ending in a hard line
      float cxPx = length(fwidth(vCxP));
      float cxFine = (cxN3(cxBp * 430.0 + 4.3) - 0.5) * clamp(1.6 - cxPx * 430.0, 0.0, 1.0) + (cxN3(vCxP * 1100.0 + 1.3) - 0.5) * 0.6 * clamp(1.6 - cxPx * 1100.0, 0.0, 1.0);
      float cxEdge = cxBn + cxFine * 0.3 - (1.05 - cxBf);
      cxBloodK = cxSS(-0.03, 0.15, cxEdge) * step(0.02, cxBf);
      float cxThick = cxSS(0.08, 0.5, cxEdge);
      // thick blood is dark, a thin film is bright and lets the skin through at its edge
      cxBc = mix(uBlood.rgb * vec3(0.3, 0.5, 0.55), uBlood.rgb * uBloodP.z * mix(0.4, 1.0, cxSS(0.25, 0.75, cxBd + 0.4 * (cxBn - 0.5))) * mix(1.25, 0.62, cxThick), cxF2) * (0.78 + 0.44 * cxBn);
      cxFreshK = cxF2 * cxBloodK * (0.35 + 0.65 * cxThick);
    }
    #endif
    // a damp, darker halo soaks out past the stain edge before the stain itself starts
    float cxHalo = cxSS(-0.12, 0.0, cxBn - (1.05 - cxBf)) * step(0.02, cxBf) * (1.0 - cxBloodK);
    diffuseColor.rgb *= 1.0 - 0.24 * cxHalo; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.0, 0.72, 0.68), cxHalo * 0.6);
    diffuseColor.rgb = mix(diffuseColor.rgb, cxBc, cxBloodK * (0.9 + 0.1 * cxBf));
  }
  #endif
  cxDirtK = clamp(vCxMask.y * uDirt.a * (0.55 + 0.9 * cxM2), 0.0, 1.0) * (1.0 - cxBloodK);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uDirt.rgb, cxDirtK);
  vec3 cxVn = normalize(vNormal);
  #ifdef DOUBLE_SIDED
    cxVn *= gl_FrontFacing ? 1.0 : -1.0;
  #endif
  vec3 cxWN = inverseTransformDirection(cxVn, viewMatrix);
  cxUp = cxSS(0.1, 0.8, cxWN.y);
  float cxExpo = cxSS(-0.5, -0.05, cxWN.y);
  float cxSt = cxN3(vec3((vCxWp.x + vCxWp.z) * 9.0, vCxWp.y * 0.7, 1.3)) * cxN3(vec3((vCxWp.x - vCxWp.z) * 27.0, vCxWp.y * 1.4, 7.1));
  cxSt = cxSS(0.12, 0.4, cxSt);
  cxWetK = clamp(uCxWet * cxExpo * mix(0.4 + 0.6 * cxSt * uWetP.w, 0.8 + 0.4 * cxM1, cxUp), 0.0, 1.0);
  float cxLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(vec3(cxLum), diffuseColor.rgb, 1.0 + 0.35 * cxWetK * uWetP.x);
  diffuseColor.rgb *= 1.0 - 0.5 * uWetP.x * cxWetK;
  #ifdef CX_BEADS
  {
    float cxFade = clamp(1.0 - length(fwidth(vCxP)) * 260.0, 0.0, 1.0);
    if (cxFade > 0.0) {
      float cxB = cxN3(vCxP * 330.0) * 0.62 + cxN3(vCxP * 790.0 + 5.3) * 0.38;
      float cxAmt = uWetP.z * uCxWet * cxExpo * cxFade * (0.45 + 0.55 * cxUp);
      cxBeadH = cxSS(0.69, 0.80, cxB) * cxAmt;
      cxBead = cxSS(0.69, 0.73, cxB) * cxAmt;
    }
  }
  #endif
}
`
);
var FRAG_ROUGH = (
  /* glsl */
  `
float roughnessFactor = roughness * cxOrm.g;
roughnessFactor += uTex.z * cxMac * 0.9;
roughnessFactor = mix(roughnessFactor, uWear.y, cxWearK);
roughnessFactor = mix(roughnessFactor, min(1.0, roughnessFactor + 0.3), cxDirtK);
roughnessFactor = mix(roughnessFactor, mix(0.66, 0.2, cxFreshK), cxBloodK * 0.8);
#ifdef CX_BLOODWET
roughnessFactor = mix(roughnessFactor, uBloodP.y, cxFreshK);
#endif
roughnessFactor = mix(roughnessFactor, roughnessFactor * uWetP.y, cxWetK);
roughnessFactor = mix(roughnessFactor, 0.05, cxBead);
roughnessFactor = clamp(roughnessFactor, 0.045, 1.0);
`
);
var FRAG_METAL = (
  /* glsl */
  `
float metalnessFactor = metalness * cxOrm.b;
metalnessFactor = mix(metalnessFactor, uWear.z, cxWearK);
metalnessFactor *= 1.0 - cxDirtK * 0.8;
`
);
var FRAG_NORMAL = (
  /* glsl */
  `
{
  vec3 cxOn = normalize(vCxN);
  float cxNs = uTex.y * (1.0 - 0.45 * cxWetK * cxUp);
  vec3 cxTx = texture2D(tNrm, cxUx).xyz * 2.0 - 1.0, cxTy = texture2D(tNrm, cxUy).xyz * 2.0 - 1.0, cxTz = texture2D(tNrm, cxUz).xyz * 2.0 - 1.0;
  cxTx.xy *= cxNs; cxTy.xy *= cxNs; cxTz.xy *= cxNs;
  cxTx = vec3(cxTx.xy + cxOn.zy, abs(cxTx.z) * cxOn.x); cxTy = vec3(cxTy.xy + cxOn.xz, abs(cxTy.z) * cxOn.y); cxTz = vec3(cxTz.xy + cxOn.xy, abs(cxTz.z) * cxOn.z);
  vec3 cxNo = normalize(cxTx.zyx * cxW.x + cxTy.xzy * cxW.y + cxTz.xyz * cxW.z);
  normal = normalize(vCxM * cxNo);
  #ifdef DOUBLE_SIDED
    normal *= faceDirection;
  #endif
  #ifdef CX_WRINKLE
  { vec3 cxSx = dFdx(-vViewPosition), cxSy = dFdy(-vViewPosition);
    vec3 cxR1 = cross(cxSy, normal), cxR2 = cross(normal, cxSx);
    float cxDet = dot(cxSx, cxR1);
    vec2 cxDh = vec2(dFdx(cxWrH), dFdy(cxWrH)) * uWr.y;
    vec3 cxGr = sign(cxDet) * (cxDh.x * cxR1 + cxDh.y * cxR2);
    vec3 cxNw = abs(cxDet) * normal - cxGr; float cxWl = dot(cxNw, cxNw); if (cxWl > 1e-20) normal = cxNw * inversesqrt(cxWl); }
  #endif
  #ifdef CX_BEADS
  { vec3 cxSx = dFdx(-vViewPosition), cxSy = dFdy(-vViewPosition);
    // derivatives are taken outside the branch (inside it they are undefined at the rim of a bead), and a zero vector is never normalised
    vec2 cxDh = vec2(dFdx(cxBeadH), dFdy(cxBeadH)) * 0.0007;
    if (cxBeadH > 0.0) {
      vec3 cxR1 = cross(cxSy, normal), cxR2 = cross(normal, cxSx);
      float cxDet = dot(cxSx, cxR1);
      vec3 cxNb = abs(cxDet) * normal - sign(cxDet) * (cxDh.x * cxR1 + cxDh.y * cxR2);
      float cxNl = dot(cxNb, cxNb);
      if (cxNl > 1e-20) normal = cxNb * inversesqrt(cxNl);
    }
  }
  #endif
  // specular anti-aliasing: widen the lobe where the shading normal changes faster than a pixel (kills sparkle on wet, bumpy surfaces)
  { vec3 cxDu = dFdx(normal), cxDv = dFdy(normal); float cxVar = 0.25 * (dot(cxDu, cxDu) + dot(cxDv, cxDv)); roughnessFactor = sqrt(min(1.0, roughnessFactor * roughnessFactor + min(4.0 * cxVar, 0.32))); }
}
`
);
var FRAG_COAT = (
  /* glsl */
  `
#ifdef USE_CLEARCOAT
material.clearcoat = saturate(uCoat.x * (1.0 - 0.75 * cxDirtK) * (1.0 - cxWearK) * (1.0 - cxBloodK) + uCoat.y * cxWetK * (1.0 - 0.5 * cxDirtK));
#endif
`
);
var FRAG_AO = (
  /* glsl */
  `
{
  float cxAO = cxOrm.r * (1.0 - 0.4 * cxDirtK);
  reflectedLight.indirectDiffuse *= cxAO;
  float cxDnv = saturate(dot(geometryNormal, geometryViewDir));
  reflectedLight.indirectSpecular *= uCxSpec * saturate(pow(cxDnv + cxAO, exp2(-16.0 * material.roughness - 1.0)) - 1.0 + cxAO);
  #ifdef USE_CLEARCOAT
  clearcoatSpecularIndirect *= uCxSpec * (0.35 + 0.65 * cxAO);
  #endif
}
`
);
function makeSurface(set, o = {}) {
  const {
    scale = 1 / set.tile,
    color = 16777215,
    rough = 1,
    metal = 1,
    nrm: nrm4 = 1,
    macro = 0.1,
    macroScale = 2.2,
    wet = 0.3,
    wetRough = 0.5,
    beads = 0,
    streaks = 0.6,
    wear: wear2 = 0,
    wearCol = [0.62, 0.62, 0.64],
    wearRough = 0.3,
    wearMetal = 1,
    dirt: dirt2 = 0.7,
    dirtCol = [0.4, 0.34, 0.28],
    side: side2 = FrontSide,
    env: env2 = 1,
    blood = 0,
    bloodCol = [0.085, 55e-4, 45e-4],
    wrinkle = null,
    coat = 0,
    wetCoat = 0,
    coatRough = 0.07
  } = o;
  const film = (coat > 0 || wetCoat > 0) && GLOBAL.coat !== false;
  const m = film ? new MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, side: side2, envMapIntensity: env2, clearcoat: 1, clearcoatRoughness: coatRough }) : new MeshStandardMaterial({ color, roughness: rough, metalness: metal, side: side2, envMapIntensity: env2 });
  const u = {
    tAlb: { value: set.alb },
    tOrm: { value: set.orm },
    tNrm: { value: set.nrm },
    tCxNoise: GLOBAL.tNoise,
    uTex: { value: new Vector4(scale, nrm4, macro, macroScale) },
    uWetP: { value: new Vector4(wet, wetRough, beads, streaks) },
    uWear: { value: new Vector4(wear2, wearRough, wearMetal, 0) },
    uDirt: { value: new Vector4(dirtCol[0], dirtCol[1], dirtCol[2], dirt2) },
    uWearCol: { value: new Vector3(wearCol[0], wearCol[1], wearCol[2]) },
    uBlood: { value: new Vector4(bloodCol[0], bloodCol[1], bloodCol[2], blood) },
    uCxWet: GLOBAL.uWet,
    uCxTime: GLOBAL.uTime,
    uCxSpec: GLOBAL.uSpec,
    uCoat: { value: new Vector2(coat, wetCoat) },
    uWr: { value: new Vector3(...wrinkle || [0, 0, 0]) }
  };
  m.userData.u = u;
  m.userData.set = set.name;
  if (beads > 0) m.defines = { ...m.defines || {}, CX_BEADS: "" };
  if (blood > 0) m.defines = { ...m.defines || {}, CX_BLOOD: "" };
  if (blood > 0 && o.bloodWet) {
    m.defines.CX_BLOODWET = "";
    u.uBloodP = { value: new Vector3(o.bloodWet[0], o.bloodWet[1], o.bloodWet[2]) };
  }
  if (wrinkle) m.defines = { ...m.defines || {}, CX_WRINKLE: "" };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VERT_COMMON).replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvCxN = objectNormal;").replace("#include <defaultnormal_vertex>", "#include <defaultnormal_vertex>\n#ifdef USE_SKINNING\nvCxM = normalMatrix * mat3(skinMatrix);\n#else\nvCxM = normalMatrix;\n#endif").replace("#include <begin_vertex>", "#include <begin_vertex>\nvCxP = position; vCxMask = mask; vCxCol = color;").replace("#include <project_vertex>", "#include <project_vertex>\nvCxWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + FRAG_COMMON).replace("#include <map_fragment>", FRAG_MAP).replace("#include <roughnessmap_fragment>", FRAG_ROUGH).replace("#include <metalnessmap_fragment>", FRAG_METAL).replace("#include <normal_fragment_maps>", FRAG_NORMAL).replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n" + FRAG_COAT).replace("#include <aomap_fragment>", FRAG_AO);
  };
  m.customProgramCacheKey = () => "cx-surface" + (beads > 0 ? "-b" : "") + (blood > 0 ? "-bl" : "") + (wrinkle ? "-wr" : "") + (film ? "-cc" : "");
  return m;
}

