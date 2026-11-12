var BAKE_VERT = (
  /* glsl */
  `in vec3 position; out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`
);
var LIB = (
  /* glsl */
  `
precision highp float; precision highp int;
uniform float uSeed, uTexel, uBump; uniform vec4 uP;
// uZero is always 0. Add it to the bound of a loop that must stay a real loop: with a bound it can see, the Direct3D shader
// compiler unrolls the loop and inlines the body once per pass (the paint recipe took about a minute to compile that way).
uniform int uZero;
// 1 while the baker only needs surf().h (the height samples behind the normal): a recipe may skip work that height does not use
int gHOnly = 0;
in vec2 vUv;
#ifdef BAKE_PASS
// one output per program (BAKE_PASS 0 colour+height, 1 ORM+tint, 2 normal): see baker.js for why Direct3D needs this
layout(location = 0) out vec4 oO;
#else
layout(location = 0) out vec4 oA; layout(location = 1) out vec4 oB; layout(location = 2) out vec4 oC;
#endif
#define sat(x) clamp(x, 0.0, 1.0)
#define TAU 6.2831853
float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
struct Surf { vec3 c; float r; float m; float ao; float h; float t; };
vec3 L(float r, float g, float b){ return pow(vec3(r, g, b), vec3(2.2)); }
uint hu(uint x){ x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
// periodic lattice hash -> 3 values in 0..1
vec3 hs(vec2 c, vec2 per, int s){
  c = mod(c, per); uint h = hu(uint(c.x + 0.5) + hu(uint(c.y + 0.5) + hu(uint(s) + uint(uSeed))));
  return vec3(float(h & 1023u), float((h >> 10) & 1023u), float((h >> 20) & 1023u)) / 1023.0;
}
float vn(vec2 p, vec2 per, int s){
  vec2 i = floor(p), f = p - i; vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hs(i, per, s).x, b = hs(i + vec2(1, 0), per, s).x, c = hs(i + vec2(0, 1), per, s).x, d = hs(i + vec2(1, 1), per, s).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// fractal value noise 0..1 (mean 0.5); frequencies are per-tile so the result tiles
float fbm(vec2 uv, vec2 f, int oct, int s){ float a = 0.5, v = 0.0, t = 0.0; for (int i = 0; i < 8; i++){ if (i >= oct) break; v += a * vn(uv * f, f, s + i * 13); t += a; a *= 0.5; f *= 2.0; } return v / t; }
float ridged(vec2 uv, vec2 f, int oct, int s){ float a = 0.5, v = 0.0, t = 0.0; for (int i = 0; i < 8; i++){ if (i >= oct) break; v += a * (1.0 - abs(2.0 * vn(uv * f, f, s + i * 13) - 1.0)); t += a; a *= 0.5; f *= 2.0; } return v / t; }
// cellular: x = F1, y = F2, z,w = cell randoms
vec4 wor(vec2 p, vec2 per, int s){
  vec2 i = floor(p), f = p - i; float d1 = 9.0, d2 = 9.0; vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 o = vec2(float(x), float(y)); vec3 r = hs(i + o, per, s); vec2 d = o + r.xy - f; float dd = dot(d, d);
    if (dd < d1){ d2 = d1; d1 = dd; id = vec2(r.z, fract(r.z * 41.0 + r.x * 7.0)); } else if (dd < d2) d2 = dd;
  }
  return vec4(sqrt(d1), sqrt(d2), id);
}
// scattered straight scratches. f cells per tile, w half-width in cells, ang base angle, spr spread, dens 0..1
float scr(vec2 uv, float f, int s, float w, float ang, float spr, float dens){
  vec2 p = uv * f, i = floor(p), fr = p - i; float m = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 o = vec2(float(x), float(y)); vec3 r = hs(i + o, vec2(f), s), r2 = hs(i + o, vec2(f), s + 57);
    vec2 c = o + r.xy - fr; float a = ang + (r.z - 0.5) * spr; vec2 dir = vec2(cos(a), sin(a));
    float al = dot(c, dir), ac = dot(c, vec2(-dir.y, dir.x)), len = 0.12 + r2.x * 0.85;
    m = max(m, smoothstep(w, w * 0.25, abs(ac)) * smoothstep(len, len * 0.6, abs(al)) * step(r2.y, dens) * (0.3 + 0.7 * r2.z));
  }
  return m;
}
// small round pits/dings: returns depth 0..1
float pits(vec2 uv, float f, int s, float dens, float rad){ vec4 w = wor(uv * f, vec2(f), s); return step(w.z, dens) * smoothstep(rad * (0.4 + 0.6 * w.w), 0.0, w.x); }
`
);
var MAIN = (
  /* glsl */
  `
vec3 enc(vec3 c){ c = sat(c); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
#ifndef BAKE_PASS
void main(){
  Surf s = surf(vUv);
  gHOnly = 1;
  float hx = surf(vUv + vec2(uTexel, 0.0)).h, hy = surf(vUv + vec2(0.0, uTexel)).h;
  vec3 n = normalize(vec3((s.h - hx) * uBump, (s.h - hy) * uBump, 1.0));
  oA = vec4(enc(s.c), sat(s.h));
  oB = vec4(sat(s.ao), clamp(s.r, 0.04, 1.0), sat(s.m), sat(s.t));
  oC = vec4(n * 0.5 + 0.5, 1.0);
}
#elif BAKE_PASS == 0
void main(){ Surf s = surf(vUv); oO = vec4(enc(s.c), sat(s.h)); }
#elif BAKE_PASS == 1
void main(){ Surf s = surf(vUv); oO = vec4(sat(s.ao), clamp(s.r, 0.04, 1.0), sat(s.m), sat(s.t)); }
#else
void main(){
  // the three height samples run in a loop whose bound the compiler cannot see, so surf() is compiled once, not three times
  float h[3]; gHOnly = 1;
  for (int i = 0; i < 3 + uZero; i++) h[i] = surf(vUv + uTexel * vec2(i == 1 ? 1.0 : 0.0, i == 2 ? 1.0 : 0.0)).h;
  vec3 n = normalize(vec3((h[0] - h[1]) * uBump, (h[0] - h[2]) * uBump, 1.0));
  oO = vec4(n * 0.5 + 0.5, 1.0);
}
#endif`
);
var RECIPES = {};
var R = (name, cfg, glsl) => {
  RECIPES[name] = { ...cfg, glsl };
};
R(
  "gunmetal",
  { tile: 0.14, bump: 5.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), mid = fbm(uv, vec2(18.0), 4, 2), grain = fbm(uv, vec2(128.0), 2, 3);
  float lines = fbm(uv, vec2(6.0, 150.0), 3, 4);                       // faint tooling direction
  float polish = smoothstep(0.52, 0.72, fbm(uv + 0.31, vec2(5.0), 4, 5)); // handling polish: smoother, a touch lighter
  float pit = pits(uv, 90.0, 6, 0.22, 0.32);
  float s1 = scr(uv, 7.0, 7, 0.006, 0.3, 2.6, 0.38), s2 = scr(uv, 22.0, 8, 0.012, 1.2, 3.0, 0.2);
  float sc = max(s1, s2 * 0.7) * smoothstep(0.35, 0.6, fbm(uv, vec2(40.0), 2, 9));
  float oil = smoothstep(0.62, 0.8, fbm(uv + 0.7, vec2(7.0), 5, 10));
  vec3 c = L(0.235, 0.237, 0.25) * (0.86 + 0.28 * big) * (0.94 + 0.12 * mid);
  c = mix(c, c * vec3(1.06, 1.0, 0.92), smoothstep(0.4, 0.8, fbm(uv, vec2(9.0), 3, 11)) * 0.5);   // warm oxide cast in places
  c = mix(c, L(0.30, 0.30, 0.31), polish * 0.45);
  c = mix(c, L(0.62, 0.61, 0.60), sc * 0.85);
  c *= 1.0 - pit * 0.45; c *= 1.0 - oil * 0.25;
  float r = 0.56 + (mid - 0.5) * 0.22 + (grain - 0.5) * 0.14 - polish * 0.2;
  r = mix(r, 0.27, sc * 0.8); r = mix(r, 0.3, oil * 0.5);
  float h = 0.5 + (grain - 0.5) * 0.22 + (lines - 0.5) * 0.1 - pit * 0.25 - sc * 0.18 + (mid - 0.5) * 0.015;
  return Surf(c, r, 0.9 - oil * 0.2, 1.0 - pit * 0.4, h, 1.0);
}`
);
R(
  "anodized",
  { tile: 0.1, bump: 4.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(4.0), 4, 1), mid = fbm(uv, vec2(26.0), 3, 2);
  vec4 bl = wor(uv * 128.0, vec2(128.0), 3);                             // blast texture
  float blast = smoothstep(0.0, 0.6, bl.x);
  float s1 = scr(uv, 9.0, 4, 0.005, 0.0, 3.1, 0.3), s2 = scr(uv, 30.0, 5, 0.014, 0.7, 3.1, 0.16);
  float sc = max(s1, s2 * 0.6);
  float rub = smoothstep(0.6, 0.78, fbm(uv + 0.2, vec2(6.0), 4, 6));       // burnished by handling
  vec3 c = L(0.145, 0.145, 0.152) * (0.85 + 0.3 * big);
  c = mix(c, c * vec3(1.12, 1.0, 1.1), smoothstep(0.45, 0.75, fbm(uv, vec2(3.0), 3, 7)) * 0.6); // dye variation
  c = mix(c, L(0.19, 0.19, 0.2), rub * 0.6);
  c = mix(c, L(0.72, 0.72, 0.74), sc * 0.9);
  float r = 0.6 + (mid - 0.5) * 0.14 + (bl.z - 0.5) * 0.08 - rub * 0.24; r = mix(r, 0.3, sc);
  float h = 0.5 + (blast - 0.5) * 0.2 - sc * 0.2 + (mid - 0.5) * 0.012;
  return Surf(c, r, mix(0.7, 1.0, sc), 0.9 + 0.1 * blast, h, 1.0);
}`
);
R(
  "polymer",
  { tile: 0.07, bump: 9 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), mid = fbm(uv, vec2(20.0), 4, 2), fine = fbm(uv, vec2(110.0), 2, 3);
  vec4 st = wor(uv * 64.0, vec2(64.0), 4);                               // moulded stipple pips
  float pip = smoothstep(0.42, 0.12, st.x) * (0.6 + 0.4 * st.w);
  float flow = fbm(uv, vec2(2.0, 22.0), 4, 5);                           // mould flow marks
  float scuff = smoothstep(0.58, 0.75, fbm(uv + 0.4, vec2(8.0), 5, 6)) * (0.5 + 0.5 * fine);
  float shine = smoothstep(0.6, 0.8, fbm(uv + 0.9, vec2(5.0), 4, 7));    // palm polish
  float s1 = scr(uv, 8.0, 8, 0.007, 0.5, 3.1, 0.3);
  vec3 c = vec3(0.22) * (0.86 + 0.28 * big) * (0.95 + 0.1 * flow);   // neutral: the per-part tint sets the polymer colour
  c = mix(c, vec3(0.62), scuff * 0.42);
  c = mix(c, vec3(0.8), s1 * 0.6);
  c *= 0.88 + 0.2 * pip;
  float r = 0.66 + (mid - 0.5) * 0.16 + scuff * 0.12 - shine * 0.26 - pip * 0.06; r = mix(r, 0.8, s1);
  float h = 0.42 + pip * 0.42 + (fine - 0.5) * 0.12 - s1 * 0.2 + (flow - 0.5) * 0.04;
  return Surf(c, r, 0.0, 0.75 + 0.25 * pip, h, 1.0);
}`
);
R(
  "rubber",
  { tile: 0.05, bump: 6 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), mid = fbm(uv, vec2(24.0), 4, 2), fine = fbm(uv, vec2(120.0), 2, 3);
  vec2 g = abs(fract(uv * 40.0) - 0.5); float dia = smoothstep(0.5, 0.2, g.x + g.y);     // fine diamond texture
  float dust = smoothstep(0.5, 0.75, fbm(uv + 0.3, vec2(10.0), 5, 4));
  vec3 c = L(0.075, 0.075, 0.078) * (0.85 + 0.3 * big);
  c = mix(c, L(0.2, 0.19, 0.17), dust * 0.35 * (1.0 - dia * 0.6));
  float r = 0.86 + (mid - 0.5) * 0.14 - dia * 0.06;
  float h = 0.4 + dia * 0.35 + (fine - 0.5) * 0.15;
  return Surf(c, r, 0.0, 0.7 + 0.3 * dia, h, 1.0);
}`
);
R(
  "butyl",
  { tile: 0.06, bump: 6.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), mid = fbm(uv, vec2(20.0), 4, 2), fine = fbm(uv, vec2(128.0), 2, 3);
  vec4 pb = wor(uv * 52.0, vec2(52.0), 4);
  float peb = smoothstep(0.5, 0.12, pb.x);                                // raised pebbles
  float bloom = smoothstep(0.45, 0.8, fbm(uv + 0.3, vec2(6.0), 5, 5));     // grey surface bloom of old rubber
  float talc = smoothstep(0.55, 0.85, fbm(uv + 0.7, vec2(9.0), 4, 6)) * (1.0 - peb);
  float s1 = scr(uv, 8.0, 7, 0.006, 0.4, 3.1, 0.3);
  vec3 c = L(0.085, 0.086, 0.09) * (0.82 + 0.36 * big);
  c = mix(c, L(0.16, 0.16, 0.165), bloom * 0.22); c = mix(c, L(0.36, 0.35, 0.33), talc * 0.12); c = mix(c, L(0.3, 0.3, 0.3), s1 * 0.5);
  float r = 0.5 + (mid - 0.5) * 0.2 + bloom * 0.18 + talc * 0.2 - peb * 0.1; r = mix(r, 0.7, s1);
  float h = 0.4 + peb * 0.34 + (fine - 0.5) * 0.08 - s1 * 0.15 + (mid - 0.5) * 0.03;
  return Surf(c, r, 0.0, 0.72 + 0.28 * peb, h, 1.0);
}`
);
R(
  "steel",
  { tile: 0.1, bump: 4 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), mid = fbm(uv, vec2(16.0), 4, 2);
  float brush = fbm(uv, vec2(3.0, 160.0), 3, 3), brush2 = fbm(uv, vec2(9.0, 256.0), 2, 4);
  float carbon = smoothstep(0.5, 0.78, fbm(uv + 0.5, vec2(6.0), 5, 5));     // carbon / old oil
  float rust = smoothstep(0.7, 0.86, fbm(uv + 0.13, vec2(12.0), 5, 6)) * smoothstep(0.4, 0.7, fbm(uv, vec2(90.0), 2, 7));
  float sc = scr(uv, 10.0, 8, 0.006, 1.57, 1.2, 0.35);
  vec3 c = L(0.62, 0.61, 0.59) * (0.85 + 0.3 * big) * (0.9 + 0.2 * brush);
  c = mix(c, L(0.16, 0.15, 0.14), carbon * 0.75);
  c = mix(c, L(0.36, 0.18, 0.09), rust * 0.8);
  c = mix(c, L(0.8, 0.8, 0.8), sc * 0.5);
  float r = 0.3 + (brush - 0.5) * 0.24 + (mid - 0.5) * 0.1 + carbon * 0.3 + rust * 0.45; r = mix(r, 0.2, sc * 0.5);
  float h = 0.5 + (brush - 0.5) * 0.3 + (brush2 - 0.5) * 0.15 - sc * 0.15 + rust * 0.12;
  return Surf(c, r, 1.0 - rust * 0.8 - carbon * 0.4, 1.0 - carbon * 0.2, h, 1.0);
}`
);
R(
  "brass",
  { tile: 0.04, bump: 3, res: 0.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), draw = fbm(uv, vec2(380.0, 3.0), 3, 2), mid = fbm(uv, vec2(20.0), 4, 3);
  float tarn = smoothstep(0.45, 0.75, fbm(uv + 0.2, vec2(7.0), 5, 4));
  float sc = scr(uv, 9.0, 5, 0.008, 0.0, 1.0, 0.3);
  vec3 c = L(0.86, 0.69, 0.33) * (0.88 + 0.24 * big) * (0.94 + 0.12 * draw);
  c = mix(c, L(0.42, 0.3, 0.14), tarn * 0.6);
  c = mix(c, L(0.95, 0.85, 0.55), sc * 0.5);
  float r = 0.26 + (draw - 0.5) * 0.14 + tarn * 0.3 + (mid - 0.5) * 0.08;
  float h = 0.5 + (draw - 0.5) * 0.25 - sc * 0.2;
  return Surf(c, r, 1.0 - tarn * 0.25, 1.0, h, 1.0);
}`
);
R(
  "paint",
  { tile: 0.6, bump: 5, p: [0.45, 0, 0, 0] },
  /* glsl */
  `
float chipsAt(vec2 uv, float amt){
  float zone = smoothstep(0.5, 0.78, fbm(uv, vec2(2.0), 3, 21));
  float dens = (0.02 + 0.1 * zone) * (0.4 + amt);
  vec4 a = wor(uv * vec2(26.0, 17.0), vec2(26.0, 17.0), 22), b = wor(uv * 74.0, vec2(74.0), 23);
  float e = fbm(uv, vec2(80.0), 3, 24) - 0.5;
  float c1 = step(a.z, dens) * smoothstep(0.3 * (0.3 + 0.7 * a.w), 0.12 * (0.3 + 0.7 * a.w), a.x + e * 0.5);
  float c2 = step(b.z, dens * 1.5) * smoothstep(0.36 * (0.3 + 0.7 * b.w), 0.2 * (0.3 + 0.7 * b.w), b.x + e * 0.4);
  float wearN = fbm(uv, vec2(3.0), 6, 25); float th = 0.74 - 0.12 * amt + uP.y * 0.2;
  float c3 = smoothstep(th, th + 0.035, wearN + (fbm(uv, vec2(46.0), 3, 26) - 0.5) * 0.14);
  float s = max(scr(uv, 6.0, 27, 0.004, 0.2, 0.8, 0.2 + 0.3 * amt), scr(uv, 15.0, 28, 0.009, 1.5, 1.0, 0.1 + 0.2 * amt));
  return sat(max(max(c1, c2), max(c3, s * smoothstep(0.4, 0.6, fbm(uv, vec2(55.0), 2, 29)))));
}
const vec2 CHIP_OFF[6] = vec2[6](vec2(0.0), vec2(0.0018, 0.0012), vec2(-0.0016, -0.0013), vec2(0.004, 0.0), vec2(-0.004, 0.0), vec2(0.0, 0.004));
Surf surf(vec2 uv){
  float amt = uP.x;
  float big = fbm(uv, vec2(2.0), 4, 1), mid = fbm(uv, vec2(14.0), 4, 2), fine = fbm(uv, vec2(200.0), 2, 3);
  float peel = fbm(uv, vec2(120.0), 2, 4);
  // All chip samples come from one loop that the compiler cannot unroll (bound + uZero), so chipsAt is compiled once instead of
  // eleven inlined copies per surf() call. 0 = here, 1..2 = primer ring, 3..5 = stain halo, 6..10 = runs below. Height uses 0..2 only.
  float ch[11]; int chN = gHOnly == 1 ? 3 : 11;
  for (int i = 0; i < 11; i++) ch[i] = 0.0;
  for (int i = 0; i < chN + uZero; i++) ch[i] = chipsAt(uv + (i < 6 ? CHIP_OFF[i] : vec2(0.0, float(i - 5) * 0.022)), amt);
  float chip = ch[0];
  // primer ring: paint goes first, primer survives a little further in
  float edge = ch[1] + ch[2];
  float primer = sat(edge * 0.6) * (1.0 - chip);
  // rust grows where steel is exposed and old; stain halo around it; runs below it (-V is down)
  float age = smoothstep(0.35, 0.7, fbm(uv + 0.37, vec2(4.0), 4, 5));
  float rust = chip * mix(0.35, 1.0, age);
  float halo = sat(ch[3] + ch[4] + ch[5]) * (1.0 - chip) * age * smoothstep(0.35, 0.7, fbm(uv, vec2(40.0), 3, 6));
  float run = 0.0; for (int i = 1; i <= 5; i++){ run = max(run, ch[5 + i] * (1.0 - float(i) / 6.0)); }
  run *= smoothstep(0.42, 0.75, fbm(uv, vec2(140.0, 1.0), 3, 7)) * age * (1.0 - chip);
  float grime = smoothstep(0.45, 0.8, fbm(uv + 0.6, vec2(5.0), 5, 8));
  float orange = fbm(uv, vec2(36.0), 3, 9);                               // orange-peel sheen of sprayed paint
  vec3 pc = vec3(0.8) * (0.9 + 0.2 * big) * (0.96 + 0.08 * mid);
  pc *= 1.0 - grime * 0.22;
  vec3 pr = L(0.42, 0.26, 0.2) * (0.85 + 0.3 * fine);                     // red oxide primer
  vec3 st = L(0.36, 0.35, 0.34) * (0.8 + 0.4 * fine);
  vec3 ru = mix(L(0.3, 0.13, 0.06), L(0.52, 0.27, 0.1), fbm(uv, vec2(60.0), 3, 10)) * (0.7 + 0.6 * peel);
  vec3 c = pc;
  c = mix(c, c * L(0.72, 0.5, 0.36), sat(halo * 0.8 + run * 0.75));
  c = mix(c, pr, primer);
  c = mix(c, mix(st, ru, rust), chip);
  float r = 0.42 + (orange - 0.5) * 0.12 + grime * 0.22 + (mid - 0.5) * 0.1;
  r = mix(r, 0.7, primer); r = mix(r, mix(0.38, 0.92, rust), chip); r = mix(r, 0.75, run * 0.6);
  float m = chip * (1.0 - rust * 0.9);
  float h = 0.62 + (orange - 0.5) * 0.05 - primer * 0.12 - chip * 0.3 + chip * rust * (peel - 0.3) * 0.25;
  return Surf(c, r, m, 1.0 - chip * 0.25, h, (1.0 - chip) * (1.0 - primer));
}`
);
R(
  "cloth",
  { tile: 0.04, bump: 7, p: [56, 8, 0, 0.3] },
  /* glsl */
  `
Surf surf(vec2 uv){
  float n = uP.x; vec2 p = uv * n;
  if (uP.z > 0.5) p = vec2(p.x + floor(p.y) * 0.3333, p.y);           // twill: diagonal float
  vec2 cell = floor(p), f = fract(p);
  float over = mod(cell.x + cell.y, 2.0);                               // which thread is on top here
  float warp = sin(f.x * 3.14159), weft = sin(f.y * 3.14159);
  float hWarp = warp * (0.55 + 0.45 * mix(sin(f.y * 3.14159), 1.0 - sin(f.y * 3.14159) * 0.6, over));
  float hWeft = weft * (0.55 + 0.45 * mix(1.0 - sin(f.x * 3.14159) * 0.6, sin(f.x * 3.14159), over));
  float h = max(hWarp, hWeft);
  float fibre = fbm(uv, vec2(n * 6.0, n * 0.75), 2, 1) * 0.5 + fbm(uv, vec2(n * 0.75, n * 6.0), 2, 2) * 0.5;
  float rip = 0.0;
  if (uP.y > 0.5) { vec2 rr = abs(fract(uv * n / uP.y) - 0.5) * uP.y; rip = smoothstep(0.9, 0.4, min(rr.x, rr.y)); }
  float big = fbm(uv, vec2(3.0), 4, 3), mid = fbm(uv, vec2(18.0), 4, 4);
  float pill = smoothstep(0.62, 0.8, fbm(uv, vec2(40.0), 3, 5)) * uP.w;
  vec3 c = vec3(0.72) * (0.85 + 0.3 * big) * (0.72 + 0.4 * h) * (0.9 + 0.2 * fibre);
  c *= 1.0 + rip * 0.12; c = mix(c, vec3(0.8), pill * 0.3);
  float r = 0.82 + (mid - 0.5) * 0.12 - rip * 0.1 + pill * 0.1;
  float hh = 0.3 + h * 0.45 + rip * 0.2 + (fibre - 0.5) * 0.12 + pill * 0.15;
  return Surf(c, r, 0.0, 0.6 + 0.4 * h, hh, 1.0);
}`
);
R(
  "leather",
  { tile: 0.07, bump: 7.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 wp = uv + (vec2(fbm(uv, vec2(8.0), 3, 1), fbm(uv, vec2(8.0), 3, 2)) - 0.5) * 0.02;
  vec4 a = wor(wp * 46.0, vec2(46.0), 3), b = wor(wp * 15.0, vec2(15.0), 4);
  float pebble = smoothstep(0.0, 0.16, a.y - a.x), crease = smoothstep(0.07, 0.0, b.y - b.x);
  float pore = pits(uv, 150.0, 5, 0.35, 0.3);
  float big = fbm(uv, vec2(3.0), 4, 6), mid = fbm(uv, vec2(22.0), 4, 7);
  float rubbed = smoothstep(0.55, 0.78, fbm(uv + 0.3, vec2(5.0), 4, 8));
  vec3 c = vec3(0.7) * (0.82 + 0.36 * big) * (0.8 + 0.2 * pebble);
  c *= 1.0 - crease * 0.35 - pore * 0.2; c = mix(c, c * 1.25, rubbed * 0.4);
  float r = 0.6 + (mid - 0.5) * 0.16 - rubbed * 0.22 + crease * 0.1;
  float h = 0.35 + pebble * 0.4 - crease * 0.3 - pore * 0.12;
  return Surf(c, r, 0.0, (0.7 + 0.3 * pebble) * (1.0 - crease * 0.4), h, 1.0);
}`
);
R(
  "skin",
  { tile: 0.11, bump: 6.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 wp = uv + (vec2(fbm(uv, vec2(6.0), 3, 1), fbm(uv, vec2(6.0), 3, 2)) - 0.5) * 0.03;
  vec4 a = wor(wp * 70.0, vec2(70.0), 3), b = wor(wp * 22.0, vec2(22.0), 4);
  float fine = smoothstep(0.1, 0.0, a.y - a.x);                         // micro wrinkle net
  float fold = smoothstep(0.06, 0.0, b.y - b.x);
  float pore = pits(uv, 190.0, 5, 0.5, 0.33);
  float big = fbm(uv, vec2(2.0), 4, 6), mid = fbm(uv, vec2(9.0), 5, 7), hi = fbm(uv, vec2(120.0), 2, 8);
  // veins: ridged noise thresholded to thin branching lines
  vec2 vp = uv + (vec2(fbm(uv, vec2(5.0), 3, 9), fbm(uv, vec2(5.0), 3, 10)) - 0.5) * 0.12;
  float vein = smoothstep(0.915, 0.98, ridged(vp, vec2(5.0), 3, 11)) * smoothstep(0.25, 0.5, fbm(uv, vec2(3.0), 3, 12));
  float livor = smoothstep(0.5, 0.8, fbm(uv + 0.41, vec2(3.0), 5, 13));   // pooled blood blotches
  float sore = smoothstep(0.78, 0.86, fbm(uv + 0.77, vec2(11.0), 5, 14)) * smoothstep(0.3, 0.7, hi);
  float pale = smoothstep(0.4, 0.7, fbm(uv + 0.13, vec2(4.0), 4, 15));
  vec3 c = mix(L(0.55, 0.51, 0.46), L(0.43, 0.49, 0.46), pale);            // sallow -> grey-green (dead, not pink)
  c *= 0.84 + 0.32 * big; c *= 0.92 + 0.16 * mid;
  c = mix(c, L(0.34, 0.26, 0.33), livor * 0.6);
  c = mix(c, L(0.16, 0.19, 0.29), vein * 0.8);
  c = mix(c, L(0.3, 0.07, 0.05), sore * 0.85);
  c *= 1.0 - fine * 0.04 - fold * 0.05 - pore * 0.16;
  float r = 0.64 + (mid - 0.5) * 0.2 + fine * 0.1 - sore * 0.34 + (hi - 0.5) * 0.1;
  float h = 0.55 - fine * 0.05 - fold * 0.09 - pore * 0.2 + vein * 0.1 + (hi - 0.5) * 0.08 + sore * 0.1;
  return Surf(c, r, 0.0, 1.0 - fold * 0.35 - pore * 0.2, h, 1.0);
}`
);
R(
  "zskin",
  { tile: 0.11, bump: 3.4 },
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 wp = uv + (vec2(fbm(uv, vec2(6.0), 3, 1), fbm(uv, vec2(6.0), 3, 2)) - 0.5) * 0.03;
  vec4 a = wor(wp * 70.0, vec2(70.0), 3), b = wor(wp * 22.0, vec2(22.0), 4);
  float fine = smoothstep(0.1, 0.0, a.y - a.x);
  float fold = smoothstep(0.06, 0.0, b.y - b.x);
  float pore = pits(uv, 190.0, 5, 0.5, 0.33);
  float big = fbm(uv, vec2(2.0), 4, 6), mid = fbm(uv, vec2(9.0), 5, 7), hi = fbm(uv, vec2(120.0), 2, 8);
  vec2 vp = uv + (vec2(fbm(uv, vec2(5.0), 3, 9), fbm(uv, vec2(5.0), 3, 10)) - 0.5) * 0.12;
  float vein = smoothstep(0.93, 0.985, ridged(vp, vec2(5.0), 3, 11)) * smoothstep(0.45, 0.65, fbm(uv, vec2(3.0), 3, 12));
  float flush = smoothstep(0.35, 0.75, fbm(uv + 0.13, vec2(4.0), 4, 15));
  vec3 c = mix(L(0.755, 0.705, 0.685), L(0.78, 0.695, 0.665), flush);           // wax-pale, a little warmer where blood still sits under it
  c *= 0.95 + 0.1 * big; c *= 0.97 + 0.06 * mid;
  c = mix(c, L(0.47, 0.5, 0.62), vein * 0.5);
  c *= 1.0 - fine * 0.004 - fold * 0.006 - pore * 0.15;
  float r = 0.5 + (mid - 0.5) * 0.16 + fine * 0.1 + (hi - 0.5) * 0.1 - pore * 0.05;
  float h = 0.55 - fine * 0.005 - fold * 0.008 - pore * 0.2 + vein * 0.08 + (hi - 0.5) * 0.08;
  return Surf(c, r, 0.0, 1.0 - fold * 0.1 - pore * 0.2, h, 1.0);
}`
);
R(
  "gore",
  { tile: 0.06, bump: 8, res: 0.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 wp = uv + (vec2(fbm(uv, vec2(5.0), 3, 1), fbm(uv, vec2(5.0), 3, 2)) - 0.5) * 0.08;
  float fib = fbm(wp, vec2(60.0, 5.0), 3, 3), fib2 = ridged(wp, vec2(24.0, 3.0), 3, 4);
  vec4 cl = wor(wp * 14.0, vec2(14.0), 5);
  float clot = smoothstep(0.45, 0.15, cl.x) * step(cl.z, 0.6);
  float big = fbm(uv, vec2(3.0), 4, 6), fat = smoothstep(0.7, 0.85, fbm(uv + 0.3, vec2(9.0), 4, 7));
  vec3 c = mix(L(0.24, 0.028, 0.026), L(0.42, 0.06, 0.05), fib) * (0.7 + 0.6 * big);
  c = mix(c, L(0.09, 0.01, 0.01), clot * 0.85);
  c = mix(c, L(0.7, 0.6, 0.38), fat * 0.6);
  float r = 0.22 + fib * 0.16 - clot * 0.12 + fat * 0.2;
  float h = 0.4 + fib2 * 0.35 + clot * 0.25 + (fib - 0.5) * 0.1;
  return Surf(c, r, 0.0, 0.6 + 0.4 * fib2, h, 1.0);
}`
);
R(
  "bone",
  { tile: 0.04, bump: 4, res: 0.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(3.0), 4, 1), lines = fbm(uv, vec2(60.0, 4.0), 3, 2), pit = pits(uv, 60.0, 3, 0.3, 0.3);
  float stain = smoothstep(0.45, 0.75, fbm(uv + 0.2, vec2(6.0), 5, 4));
  vec3 c = L(0.8, 0.74, 0.6) * (0.85 + 0.3 * big) * (0.95 + 0.1 * lines);
  c = mix(c, L(0.45, 0.33, 0.18), stain * 0.6); c *= 1.0 - pit * 0.4;
  return Surf(c, 0.42 + stain * 0.25 + (lines - 0.5) * 0.1, 0.0, 1.0 - pit * 0.3, 0.5 + (lines - 0.5) * 0.2 - pit * 0.3, 1.0);
}`
);
R(
  "hair",
  { tile: 0.05, bump: 6, res: 0.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float st = fbm(uv, vec2(160.0, 3.0), 3, 1), clump = fbm(uv, vec2(18.0, 2.0), 3, 2), big = fbm(uv, vec2(3.0), 3, 3);
  vec3 c = vec3(0.7) * (0.55 + 0.9 * st) * (0.8 + 0.4 * clump) * (0.85 + 0.3 * big);
  return Surf(c, 0.48 + (st - 0.5) * 0.3, 0.0, 0.5 + 0.5 * st, 0.3 + st * 0.5 + clump * 0.2, 1.0);
}`
);
R(
  "concrete",
  { tile: 2.4, bump: 6 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(2.0), 5, 1), mid = fbm(uv, vec2(11.0), 5, 2), fine = fbm(uv, vec2(170.0), 3, 3);
  float trowel = fbm(uv, vec2(3.0, 9.0), 4, 4);
  float p1 = pits(uv, 64.0, 5, 0.3, 0.32), p2 = pits(uv, 230.0, 6, 0.45, 0.3);
  vec2 wu = uv + (vec2(fbm(uv, vec2(5.0), 3, 7), fbm(uv, vec2(5.0), 3, 8)) - 0.5) * 0.14 + (vec2(fbm(uv, vec2(40.0), 3, 9), fbm(uv, vec2(40.0), 3, 10)) - 0.5) * 0.02;
  vec4 cr = wor(wu * 3.0, vec2(3.0), 11);
  float crack = smoothstep(0.005, 0.0012, cr.y - cr.x) * smoothstep(0.42, 0.6, fbm(uv, vec2(3.0), 2, 12));
  vec4 ag = wor(uv * 120.0, vec2(120.0), 13); float stone = smoothstep(0.45, 0.25, ag.x) * step(ag.z, 0.55);
  float spall = smoothstep(0.8, 0.85, fbm(uv, vec2(6.0), 4, 14) + (fine - 0.5) * 0.08);
  float stain = smoothstep(0.5, 0.82, fbm(uv + 0.2, vec2(4.0), 5, 15));
  float tyre = smoothstep(0.6, 0.8, fbm(uv, vec2(1.0, 14.0), 3, 16)) * smoothstep(0.45, 0.7, fbm(uv, vec2(2.0), 2, 17));
  vec3 c = L(0.5, 0.495, 0.47) * (0.72 + 0.42 * big + 0.2 * (mid - 0.5));
  c *= mix(vec3(1.05, 1.0, 0.93), vec3(0.94, 1.0, 1.06), fbm(uv, vec2(3.0), 3, 18));
  c *= 1.0 - stain * 0.32 - tyre * 0.25;
  c *= 1.0 - p1 * 0.5 - p2 * 0.2 - crack * 0.65;
  vec3 agc = mix(L(0.36, 0.35, 0.33), L(0.56, 0.53, 0.47), ag.w);
  c = mix(c, mix(L(0.38, 0.37, 0.35) * (0.8 + 0.4 * fine), agc, stone * 0.85), spall);
  float r = 0.84 + (mid - 0.5) * 0.18 - (trowel - 0.5) * 0.16; r = mix(r, 0.96, spall); r = mix(r, 0.6, stain * 0.35);
  float h = 0.6 + (mid - 0.5) * 0.22 + (fine - 0.5) * 0.12 + (trowel - 0.5) * 0.06 - p1 * 0.35 - p2 * 0.1 - crack * 0.25;
  h = mix(h, 0.4 + stone * 0.14 + fine * 0.08, spall);
  return Surf(c, r, 0.0, 1.0 - p1 * 0.5 - crack * 0.5 - spall * 0.15, h, 1.0);
}`
);

