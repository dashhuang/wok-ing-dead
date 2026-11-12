var R3 = (name, cfg, glsl) => {
  RECIPES[name] = { ...cfg, glsl };
};
R3(
  "turf",
  { tile: 2, bump: 9 },
  /* glsl */
  `
float blades(vec2 uv, float f, int s, float lean){
  vec2 p = uv * f, i = floor(p), fr = p - i; float m = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 o = vec2(float(x), float(y)); vec3 r = hs(i + o, vec2(f), s), r2 = hs(i + o, vec2(f), s + 31);
    vec2 c = o + r.xy - fr; float a = lean + (r.z - 0.5) * 2.4; vec2 d = vec2(cos(a), sin(a));
    float al = dot(c, d), ac = dot(c, vec2(-d.y, d.x)), len = 0.35 + 0.55 * r2.x, t = clamp(al / len * 0.5 + 0.5, 0.0, 1.0);
    float w = 0.085 * (1.0 - t * 0.8);
    m = max(m, smoothstep(w, w * 0.3, abs(ac + 0.12 * sin(t * 3.0 + r2.y * 6.0))) * step(abs(al), len) * (0.45 + 0.55 * r2.z) * (0.5 + 0.5 * t));
  }
  return m;
}
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(2.0), 4, 1), mid = fbm(uv, vec2(7.0), 4, 2), fine = fbm(uv, vec2(90.0), 3, 3);
  float lean = 0.9 + (fbm(uv, vec2(3.0), 3, 4) - 0.5) * 2.2;
  float b1 = blades(uv, 64.0, 5, lean), b2 = blades(uv + 0.37, 110.0, 6, lean + 0.7), b3 = blades(uv + 0.11, 44.0, 7, lean - 0.5);
  float cover = smoothstep(0.3, 0.62, mid * 0.6 + big * 0.5);                          // where the sward is thick
  float blade = max(b1, max(b2 * 0.85, b3 * cover));
  vec4 cl = wor(uv * 9.0, vec2(9.0), 8); float clover = smoothstep(0.42, 0.2, cl.x) * step(cl.z, 0.16);
  vec4 lf = wor(uv * 150.0, vec2(150.0), 9); float leaf = smoothstep(0.5, 0.25, lf.x) * clover;
  float moss = smoothstep(0.62, 0.78, fbm(uv + 0.6, vec2(5.0), 4, 10));
  float stud = pits(uv, 30.0, 11, 0.12, 0.3), wcast = pits(uv + 0.2, 22.0, 12, 0.06, 0.45);
  float soilK = (1.0 - cover) * (1.0 - blade * 0.7) * 0.75 + stud * 0.6;
  vec3 soil = mix(L(0.2, 0.15, 0.1), L(0.33, 0.27, 0.19), fine) * (0.7 + 0.5 * mid);
  vec3 thatch = mix(L(0.34, 0.33, 0.17), L(0.47, 0.44, 0.24), fine);
  vec3 g0 = mix(L(0.1, 0.17, 0.07), L(0.17, 0.25, 0.1), b1 * 0.6 + big * 0.5);
  vec3 g1 = mix(L(0.15, 0.22, 0.09), L(0.29, 0.34, 0.17), b2);
  vec3 c = mix(thatch * 0.6, g0, smoothstep(0.05, 0.5, blade));
  c = mix(c, g1, b2 * 0.55);
  c = mix(c, mix(L(0.09, 0.18, 0.08), L(0.16, 0.28, 0.13), leaf), clover * 0.8);
  c = mix(c, L(0.2, 0.27, 0.07) * (0.7 + 0.6 * fine), moss * 0.5);
  c = mix(c, soil, clamp(soilK, 0.0, 1.0));
  c = mix(c, L(0.25, 0.19, 0.13), wcast * 0.8);
  c *= 0.78 + 0.44 * big;
  float h = 0.3 + blade * 0.5 + leaf * 0.3 + (fine - 0.5) * 0.14 - stud * 0.3 + wcast * 0.25 + (mid - 0.5) * 0.12;
  float r = 0.74 - blade * 0.22 + soilK * 0.1 - leaf * 0.1;
  return Surf(c, r, 0.0, 0.55 + 0.45 * smoothstep(0.1, 0.7, blade + leaf), h, 1.0);
}`
);
R3(
  "mud",
  { tile: 2.4, bump: 10 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(2.0), 5, 1), mid = fbm(uv, vec2(9.0), 4, 2), fine = fbm(uv, vec2(120.0), 3, 3);
  vec2 wu = uv + (vec2(fbm(uv, vec2(5.0), 3, 4), fbm(uv, vec2(5.0), 3, 5)) - 0.5) * 0.12;
  vec4 lump = wor(wu * 14.0, vec2(14.0), 6), clod = wor(wu * 46.0, vec2(46.0), 7);
  float churn = ridged(wu, vec2(6.0), 4, 8);                                            // ridges thrown up by feet and wheels
  float print = smoothstep(0.34, 0.12, lump.x) * step(lump.z, 0.45);                    // heel and toe pockets
  float lug = smoothstep(0.3, 0.7, sin((wu.x * 3.0 + wu.y * 1.2 + (lump.w - 0.5) * 0.05) * TAU * 14.0) * 0.5 + 0.5) * smoothstep(0.55, 0.8, fbm(uv + 0.31, vec2(3.0), 3, 9));
  float low = smoothstep(0.52, 0.3, churn * 0.6 + big * 0.5) + print * 0.5;             // where water sits
  low = clamp(low, 0.0, 1.0);
  float stone = step(clod.z, 0.1) * smoothstep(0.34, 0.16, clod.x);
  vec4 st = wor(wu * vec2(70.0, 16.0), vec2(70.0, 16.0), 10); float straw = smoothstep(0.12, 0.04, st.x) * step(st.z, 0.14) * (1.0 - low);
  vec3 wetC = mix(L(0.12, 0.085, 0.055), L(0.17, 0.125, 0.085), mid);
  vec3 dryC = mix(L(0.27, 0.2, 0.135), L(0.38, 0.3, 0.2), fine) * (0.8 + 0.4 * churn);
  vec3 c = mix(dryC, wetC, low * 0.9);
  c = mix(c, mix(L(0.34, 0.33, 0.3), L(0.5, 0.47, 0.42), clod.w), stone * 0.85);
  c = mix(c, L(0.36, 0.38, 0.17), straw * 0.7);
  c *= 0.82 + 0.36 * big; c *= 1.0 - lug * 0.18;
  float h = 0.42 + (churn - 0.5) * 0.5 * (1.0 - low * 0.8) - print * 0.22 + stone * 0.2 + (fine - 0.5) * 0.1 * (1.0 - low) + lug * 0.08 + straw * 0.05;
  h = mix(h, 0.3, low * 0.55);
  float r = mix(0.82, 0.16, low) + stone * 0.2 + (fine - 0.5) * 0.1;
  return Surf(c, r, 0.0, 1.0 - print * 0.3 - (1.0 - churn) * 0.25, h, 1.0);
}`
);
R3(
  "gravel",
  { tile: 1.5, bump: 10 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(2.0), 4, 1), fine = fbm(uv, vec2(140.0), 3, 2);
  vec4 a = wor(uv * 40.0, vec2(40.0), 3), b = wor(uv * 84.0 + 0.3, vec2(84.0), 4), g = wor(uv * 190.0, vec2(190.0), 5);
  float sa = smoothstep(0.5, 0.18, a.x) * step(a.z, 0.7), sb = smoothstep(0.5, 0.2, b.x) * step(b.z, 0.8), sg = smoothstep(0.5, 0.25, g.x);
  float fac = smoothstep(0.0, 0.3, a.y - a.x);                                          // flat fracture faces with dark gaps between stones
  vec3 fines = mix(L(0.26, 0.24, 0.21), L(0.36, 0.33, 0.29), fine) * (0.75 + 0.5 * big);
  vec3 ca = mix(L(0.36, 0.36, 0.37), L(0.58, 0.56, 0.52), a.w), cb = mix(L(0.3, 0.29, 0.28), L(0.5, 0.46, 0.4), b.w), cg = mix(L(0.3, 0.3, 0.3), L(0.46, 0.45, 0.43), g.w);
  vec3 c = mix(fines, cg, sg * 0.6); c = mix(c, cb, sb); c = mix(c, ca * (0.8 + 0.3 * fine), sa);
  c *= 0.55 + 0.45 * fac;
  float h = 0.25 + sg * 0.12 + sb * 0.26 + sa * 0.42 + (fine - 0.5) * 0.08;
  float r = 0.86 - sa * 0.18 + (fine - 0.5) * 0.1;
  return Surf(c, r, 0.0, 0.6 + 0.4 * max(sa, sb), h, 1.0);
}`
);
R3(
  "block",
  { tile: 1.6, bump: 6 },
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 n = vec2(4.0, 8.0); vec2 p = uv * n; float row = floor(p.y); p.x += 0.5 * mod(row, 2.0); vec2 id = floor(p), f = p - id;
  vec3 hb = hs(id, n, 1);
  float jx = min(f.x, 1.0 - f.x) * (1.6 / 4.0), jy = min(f.y, 1.0 - f.y) * (1.6 / 8.0), jd = min(jx, jy);
  float joint = smoothstep(0.009, 0.004, jd), bed = smoothstep(0.018, 0.006, jd);
  float pore = fbm(uv, vec2(160.0), 3, 2), pin = pits(uv, 120.0, 3, 0.3, 0.4) * (1.0 - joint);
  float big = fbm(uv, vec2(2.0), 4, 4), run = fbm(uv, vec2(40.0, 2.0), 3, 5);
  float stain = smoothstep(0.5, 0.8, run * 0.6 + big * 0.5);
  float chip = smoothstep(0.7, 0.78, fbm(uv + 0.2, vec2(22.0), 3, 6)) * smoothstep(0.03, 0.01, jd + (pore - 0.5) * 0.02);
  vec3 paintC = vec3(1.0) * (0.9 + 0.1 * hb.x) * (1.0 - 0.1 * step(0.9, hb.y));
  vec3 c = paintC * (0.92 + 0.12 * pore);
  c *= 1.0 - bed * 0.16 - joint * 0.2 - pin * 0.35;
  c = mix(c, c * vec3(0.72, 0.68, 0.6), stain * 0.5);
  c = mix(c, L(0.45, 0.44, 0.42) * (0.8 + 0.4 * pore), chip);
  float h = 0.6 - joint * 0.4 - bed * 0.1 + (pore - 0.5) * 0.12 - pin * 0.2 - chip * 0.1 + (hb.z - 0.5) * 0.03;
  float r = 0.6 + (pore - 0.5) * 0.2 + chip * 0.3 + stain * 0.1;
  return Surf(c, r, 0.0, 1.0 - joint * 0.5 - pin * 0.3, h, 1.0 - chip);
}`
);
R3(
  "court",
  { tile: 1.8, bump: 2.6 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float nb = 32.0; float bx = uv.x * nb, bi = floor(bx), fx = bx - bi; vec3 hb = hs(vec2(bi, 0.0), vec2(nb, 1.0), 1);
  float ly = uv.y * 3.0 + hb.x * 3.0, li = floor(ly), fy = ly - li; vec3 hl = hs(vec2(bi, li), vec2(nb, 3.0), 2);
  float seam = smoothstep(0.045, 0.015, min(fx, 1.0 - fx)), butt = smoothstep(0.006, 0.002, min(fy, 1.0 - fy));
  float grain = fbm(vec2(uv.x + hl.y, uv.y + hl.x * 3.0), vec2(nb * 6.0, 5.0), 3, 3), fig = fbm(vec2(uv.x, uv.y + hl.z), vec2(nb, 2.0), 3, 4);
  float worn = smoothstep(0.5, 0.74, fbm(uv, vec2(3.0, 2.0), 4, 5));
  float scuff = scr(uv, 9.0, 6, 0.012, 0.6, 3.0, 0.3), scratch = scr(uv, 26.0, 7, 0.003, 0.2, 6.0, 0.5);
  float film = smoothstep(0.45, 0.75, fbm(uv + 0.3, vec2(4.0), 4, 8));
  vec3 c = mix(L(0.72, 0.56, 0.34), L(0.84, 0.7, 0.46), fig) * (0.86 + 0.2 * hl.x) * (0.94 + 0.12 * grain);
  c = mix(c, L(0.66, 0.6, 0.48) * (0.8 + 0.3 * grain), worn * 0.6);
  c *= 1.0 - seam * 0.45 - butt * 0.5; c = mix(c, L(0.06, 0.06, 0.06), scuff * 0.7); c *= 1.0 - scratch * 0.2;
  c *= 1.0 - film * 0.14;
  float h = 0.6 - seam * 0.3 - butt * 0.25 + (grain - 0.5) * 0.05 * worn - scratch * 0.1;
  float r = 0.16 + worn * 0.42 + film * 0.22 + scratch * 0.2 + scuff * 0.3 + (grain - 0.5) * 0.05;
  return Surf(c, r, 0.0, 1.0 - seam * 0.4, h, 1.0 - scuff);
}`
);
R3(
  "bark",
  { tile: 0.9, bump: 11 },
  /* glsl */
  `
Surf surf(vec2 uv){
  vec2 wu = uv + (vec2(fbm(uv, vec2(4.0, 3.0), 3, 1), 0.0) - 0.5) * vec2(0.1, 0.0);
  float fur = ridged(wu, vec2(14.0, 2.0), 4, 2), fur2 = ridged(wu + 0.2, vec2(34.0, 5.0), 3, 3);
  vec4 pl = wor(wu * vec2(9.0, 3.0), vec2(9.0, 3.0), 4); float plate = smoothstep(0.02, 0.1, pl.y - pl.x);
  float fine = fbm(uv, vec2(120.0, 60.0), 3, 5), big = fbm(uv, vec2(2.0), 4, 6);
  float lichen = smoothstep(0.64, 0.74, fbm(uv + 0.5, vec2(7.0), 4, 7)) * plate, algae = smoothstep(0.45, 0.8, big);
  float ridge = clamp(fur * 0.7 + fur2 * 0.3, 0.0, 1.0) * plate;
  vec3 c = mix(L(0.1, 0.085, 0.07), L(0.36, 0.31, 0.26), ridge) * (0.8 + 0.4 * fine);
  c = mix(c, L(0.22, 0.3, 0.14), algae * 0.35 * ridge); c = mix(c, L(0.55, 0.6, 0.48), lichen * 0.7);
  float h = 0.15 + ridge * 0.7 + (fine - 0.5) * 0.1 + lichen * 0.04;
  float r = 0.92 - (1.0 - ridge) * 0.3;
  return Surf(c, r, 0.0, 0.4 + 0.6 * ridge, h, 1.0);
}`
);
R3(
  "hdpe",
  { tile: 0.6, bump: 3.5 },
  /* glsl */
  `
Surf surf(vec2 uv){
  float big = fbm(uv, vec2(2.0), 3, 1), peel = fbm(uv, vec2(150.0), 3, 3), fine = fbm(uv, vec2(280.0), 2, 4);
  float s1 = scr(uv, 5.0, 5, 0.008, 0.3, 2.8, 0.5), s2 = scr(uv, 14.0, 6, 0.01, 1.3, 3.0, 0.35);
  float scuff = max(s1, s2 * 0.6);
  float gouge = pits(uv, 12.0, 9, 0.12, 0.3);
  vec3 c = vec3(0.8) * (0.97 + 0.06 * big);
  c = mix(c, c * 0.75 + 0.2, scuff * 0.45);
  c *= 1.0 - gouge * 0.2;
  float r = 0.5 + (peel - 0.5) * 0.08 + scuff * 0.16;
  float h = 0.6 + (peel - 0.5) * 0.1 + (fine - 0.5) * 0.03 - scuff * 0.1 - gouge * 0.25;
  return Surf(c, r, 0.0, 1.0 - gouge * 0.3, h, 1.0);
}`
);

