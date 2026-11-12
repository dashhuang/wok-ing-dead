var VIEW_DEPTH = "0.05";
var FS_VERT = (
  /* glsl */
  `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
);
var COMMON = (
  /* glsl */
  `
varying vec2 vUv;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float h12(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`
);
var SKY_VERT = (
  /* glsl */
  `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`
);
var SKY_FRAG = (
  /* glsl */
  `
precision highp float;
varying vec3 vDir;
uniform sampler2D tNoise;
uniform float uTime, uEnv, uFlash, uCover, uShow;
uniform vec3 uZen, uHor, uGlow, uGlowDir, uCloudLo, uCloudHi, uFlashDir, uCard, uCardDir;
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return texture2D(tNoise, (i + f + 0.5) / 256.0).r; }
float fb(vec2 p, int o){ float a = 0.5, s = 0.0, n = 0.0; for (int i = 0; i < 6; i++){ if (i >= o) break; s += a * vn(p); n += a; p = mat2(1.7, 1.1, -1.1, 1.7) * p + 9.7; a *= 0.5; } return s / n; }
void main(){
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  float toGlow = clamp(dot(normalize(d.xz + 1e-5), normalize(uGlowDir.xz)) * 0.5 + 0.5, 0.0, 1.0);
  // clear-air gradient
  vec3 hor = uHor + uGlow * (0.35 + 0.65 * pow(toGlow, 2.0));
  vec3 col = mix(hor, uZen, pow(smoothstep(0.0, 0.75, h), 0.55));
  // cloud deck: projected onto a plane, warped, two scales
  vec2 cuv = d.xz / (h + 0.12) * vec2(0.8, 0.8) + vec2(0.006, -0.003) * uTime;
  float warp = fb(cuv * 0.5 + 3.1, 3);
  vec2 q = cuv + (warp - 0.5) * 1.1;
  float dens = fb(q, 5);
  float big = vn(q * 0.23 + 7.0);
  float body = dens * 0.7 + big * 0.4;
  float cov = smoothstep(0.62 - uCover * 0.5, 0.86 - uCover * 0.5, body);
  // underside relief lit from below by the city: sample density toward the glow
  float densG = fb(q + normalize(uGlowDir.xz) * 0.18, 4);
  float relief = clamp((densG - dens) * 4.0 + 0.5, 0.0, 1.0);
  float lowLit = exp(-h * 3.2) * (0.35 + 0.65 * toGlow);
  vec3 cl = mix(uCloudLo, uCloudHi, relief * relief) * (0.55 + 0.9 * (1.0 - smoothstep(0.35, 0.8, body)));
  cl += uGlow * lowLit * (0.25 + 1.4 * relief);
  cl += vec3(0.6, 0.7, 1.0) * uFlash * pow(max(dot(d, uFlashDir), 0.0), 4.0) * (0.3 + 2.5 * dens * dens);
  cl = mix(cl, hor * 0.8 + cl * 0.2, exp(-h * 9.0));
  col = mix(col, cl, cov);
  // soft light card (only matters for reflections / studio lighting)
  float card = smoothstep(0.90, 0.985, dot(d, normalize(uCardDir)));
  col += uCard * card;
  if (d.y < 0.0) { float t = clamp(-d.y * 4.0, 0.0, 1.0); col = mix(hor, mix(hor * 0.35, vec3(0.02, 0.022, 0.026), uEnv), t); }
  col *= mix(uShow, 1.0, uEnv);
  col = mix(col, min(col, vec3(8.0)), uEnv);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`
);
function softShadowChunk({ taps = 16, search = 8, near = 0.5, far = 80, bilinear = true } = {}) {
  return (
    /* glsl */
    `
  // CX_SOFT_SHADOW
  const float CX_SN = ${near.toFixed(3)}, CX_SF = ${far.toFixed(3)};
  float cxIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
  vec2 cxDisc( int i, int n, float phi ) { float r = sqrt( ( float( i ) + 0.5 ) / float( n ) ); float t = float( i ) * 2.39996323 + phi; return r * vec2( cos( t ), sin( t ) ); }
  float cxLin( float d ) { return CX_SN * CX_SF / ( CX_SF - d * ( CX_SF - CX_SN ) ); }
  // depth comparison with manual 2x2 bilinear weights (the packed depth map itself cannot be filtered)
  float cxCmp( sampler2D sm, vec2 uv, float ref, vec2 size ) {
    ${bilinear ? `vec2 st = uv * size - 0.5, f = fract( st ), b = ( floor( st ) + 0.5 ) / size, t = 1.0 / size;
    float a = step( ref, unpackRGBAToDepth( texture2D( sm, b ) ) ), c = step( ref, unpackRGBAToDepth( texture2D( sm, b + vec2( t.x, 0.0 ) ) ) );
    float d = step( ref, unpackRGBAToDepth( texture2D( sm, b + vec2( 0.0, t.y ) ) ) ), e = step( ref, unpackRGBAToDepth( texture2D( sm, b + t ) ) );
    return mix( mix( a, c, f.x ), mix( d, e, f.x ), f.y );` : `return step( ref, unpackRGBAToDepth( texture2D( sm, uv ) ) );`}
  }
  float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
    bool persp = abs( shadowCoord.w - 1.0 ) > 1e-3;
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;
    vec3 sc = shadowCoord.xyz;
    if ( sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 ) return 1.0;
    vec2 texel = 1.0 / shadowMapSize;
    // receiver plane depth gradient so wide kernels do not self-shadow slopes
    vec3 dx = dFdx( sc ), dy = dFdy( sc );
    float det = dx.x * dy.y - dx.y * dy.x;
    vec2 dz = vec2( 0.0 );
    if ( abs( det ) > 1e-12 ) dz = vec2( dy.y * dx.z - dx.y * dy.z, dx.x * dy.z - dy.x * dx.z ) / det;
    float lim = 0.004 / max( texel.x, texel.y );
    dz = clamp( dz, vec2( - lim ), vec2( lim ) );
    // the blocker search uses a fixed pattern (a noisy search leaks dots of light); the filter gets a small per-pixel turn only,
    // because there is no temporal AA here to average a fully random rotation
    float phi = cxIGN( gl_FragCoord.xy ) * 0.6;
    float zr = persp ? cxLin( sc.z ) : sc.z;
    float sR = persp ? clamp( shadowRadius * 0.6 / max( zr, 0.5 ), 2.0 * texel.x, 0.035 ) : clamp( shadowRadius * 0.08, 2.0 * texel.x, 0.02 );
    float blk = 0.0, nb = 0.0;
    for ( int i = 0; i < ${search}; i ++ ) {
      vec2 o = cxDisc( i, ${search}, 0.7 ) * sR;
      float d = unpackRGBAToDepth( texture2D( shadowMap, sc.xy + o ) );
      if ( d < sc.z + dot( o, dz ) ) { blk += persp ? cxLin( d ) : d; nb += 1.0; }
    }
    if ( nb < 0.5 ) return 1.0;
    float zb = blk / nb;
    float pen = persp ? shadowRadius * max( zr - zb, 0.0 ) / max( zb * zr, 1e-3 ) : shadowRadius * max( zr - zb, 0.0 );
    float fR = clamp( pen, 1.3 * texel.x, 0.045 );
    float lit = 0.0;
    for ( int i = 0; i < ${taps}; i ++ ) {
      vec2 o = cxDisc( i, ${taps}, phi + 1.9 ) * fR;
      lit += cxCmp( shadowMap, sc.xy + o, sc.z + dot( o, dz ), shadowMapSize );
    }
    lit /= float( ${taps} );
    vec2 e = min( sc.xy, 1.0 - sc.xy );
    lit = mix( 1.0, lit, smoothstep( 0.0, 0.03, min( e.x, e.y ) ) );
    return mix( 1.0, lit, shadowIntensity );
  }
  `
  );
}
var DEPTH_HALF = (
  /* glsl */
  `${COMMON}
uniform sampler2D tDepth; uniform float uNear, uFar;
void main(){
  ivec2 p = min(ivec2(gl_FragCoord.xy) * 2, textureSize(tDepth, 0) - 1);
  float d = texelFetch(tDepth, p, 0).r;
  float z = d < ${VIEW_DEPTH} ? 0.0 : (uNear * uFar) / (uFar - d * (uFar - uNear));
  gl_FragColor = vec4(z, 0.0, 0.0, 1.0);
}`
);
var AO_FRAG = (
  /* glsl */
  `${COMMON}
uniform sampler2D tZ; uniform vec2 uTan, uTexel; uniform float uRadius, uPower, uAspect;
vec3 vp(vec2 uv, float z){ return vec3((uv * 2.0 - 1.0) * uTan * z, -z); }
void main(){
  float z0 = texture2D(tZ, vUv).r;
  if (z0 <= 0.0 || z0 > 120.0) { gl_FragColor = vec4(1.0); return; }
  vec3 P = vp(vUv, z0);
  vec2 ox = vec2(uTexel.x, 0.0), oy = vec2(0.0, uTexel.y);
  float zl = texture2D(tZ, vUv - ox).r, zr = texture2D(tZ, vUv + ox).r, zd = texture2D(tZ, vUv - oy).r, zu = texture2D(tZ, vUv + oy).r;
  vec3 dx = abs(zl - z0) < abs(zr - z0) ? P - vp(vUv - ox, zl) : vp(vUv + ox, zr) - P;
  vec3 dy = abs(zd - z0) < abs(zu - z0) ? P - vp(vUv - oy, zd) : vp(vUv + oy, zu) - P;
  vec3 n = normalize(cross(dx, dy));
  float R = uRadius * (0.5 + 0.5 * clamp(z0 / 10.0, 0.0, 1.0));
  float rUv = clamp(R / (2.0 * z0 * uTan.y), 2.5 * uTexel.y, 0.16);
  float rot = ign(gl_FragCoord.xy) * 6.2831853, sum = 0.0;
  for (int i = 0; i < AO_TAPS; i++) {
    float a = (float(i) + 0.5) / float(AO_TAPS);
    float th = a * 6.2831853 * 2.6 + rot;
    vec2 o = vec2(cos(th), sin(th)) * a * rUv; o.x /= uAspect;
    vec2 uv2 = vUv + o; float z2 = texture2D(tZ, uv2).r;
    if (z2 <= 0.0) continue;
    vec3 v = vp(uv2, z2) - P; float vv = dot(v, v), vn = dot(v, n);
    float fall = max(1.0 - vv / (R * R), 0.0);
    sum += fall * fall * max((vn - 0.012 - 0.003 * z0) / sqrt(vv + 1e-4), 0.0);
  }
  float ao = pow(clamp(1.0 - 2.0 * sum / float(AO_TAPS), 0.0, 1.0), uPower);
  ao = mix(ao, 1.0, smoothstep(60.0, 120.0, z0));
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`
);
var BILATERAL = (
  /* glsl */
  `${COMMON}
uniform sampler2D tSrc, tZ; uniform vec2 uDir;
void main(){
  float z0 = texture2D(tZ, vUv).r; float zc = z0 <= 0.0 ? 500.0 : min(z0, 300.0);
  vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -3; i <= 3; i++) {
    vec2 uv = vUv + uDir * float(i); float z = texture2D(tZ, uv).r; z = z <= 0.0 ? 500.0 : min(z, 300.0);
    float w = (1.0 - abs(float(i)) * 0.2) * max(0.0, 1.0 - abs(z - zc) / (0.06 * zc + 0.03));
    acc += texture2D(tSrc, uv) * w; ws += w;
  }
  gl_FragColor = ws > 1e-4 ? acc / ws : texture2D(tSrc, vUv);
}`
);
var VOL_FRAG = (
  /* glsl */
  `${COMMON}
#define NKEY 2
#define NGLOW 8
#define NCONE 16
uniform sampler2D tZ; uniform sampler2D tShadow0, tShadow1, tNoise;
uniform vec4 uConePos[NCONE], uConeDir[NCONE], uConeCol[NCONE]; // xyz + range | axis + cos(outer) | intensity rgb + cos(inner)
uniform vec4 uFogP;   // height scale in metres, density share that does not fall with height, wisp amount, wisp cycles per metre
uniform vec3 uWind;
uniform mat4 uCamWorld; uniform mat4 uShadowM[NKEY];
uniform vec3 uCamPos, uAmb, uHazeCol;
uniform vec3 uKeyPos[NKEY], uKeyDir[NKEY], uKeyCol[NKEY]; uniform vec4 uKeyCone[NKEY]; // cosOuter, cosInner, hasShadow, on
uniform vec3 uGlowPos[NGLOW], uGlowCol[NGLOW];
uniform vec2 uTan; uniform float uMaxDist, uSigma, uHaze, uFarZ, uTime, uG;
float hg(float mu, float g){ float g2 = g * g; return (1.0 - g2) / (12.566371 * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5)); }
float unpack(vec4 v){ return dot(v, vec4(0.99609375, 0.99609375 / 256.0, 0.99609375 / 65536.0, 1.0 / 16777216.0)); } // three r180 RGBA depth packing
float vis(int k, vec3 p){
  vec4 sc = uShadowM[k] * vec4(p, 1.0); sc.xyz /= sc.w;
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 || sc.z < 0.0) return 1.0;
  float d = k == 0 ? unpack(texture2D(tShadow0, sc.xy)) : unpack(texture2D(tShadow1, sc.xy));
  return step(sc.z - 0.0004, d);
}
// 3D value noise from one fetch (the G channel of the noise texture is R shifted by (37,17))
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); vec2 uv = i.xy + vec2(37.0, 17.0) * i.z + f.xy; vec2 rg = texture2D(tNoise, (uv + 0.5) / 256.0).rg; return mix(rg.x, rg.y, f.z); }
float densH(vec3 p){ return uFogP.y + (1.0 - uFogP.y) * exp(-max(p.y, 0.0) / uFogP.x); }
// drifting wisps: two octaves, the slow one carries banks of mist, the fast one breaks up the inside of a light cone
float wisp(vec3 p){ vec3 q = p * uFogP.w + uWind * uTime; float n = n3(q) * 0.65 + n3(q * 2.7 + 4.1) * 0.35; return max(0.0, 1.0 + uFogP.z * (n - 0.5) * 2.0); }
float dens(vec3 p){ return densH(p) * wisp(p); }
// In-scatter from unshadowed cone lamps. Each lamp gets its own samples, placed by equal angle as seen from the lamp, so the
// 1/d^2 term cancels and a handful of samples per lamp gives a clean cone at any distance.
vec3 cones(vec3 ro, vec3 rd, float dist, float j){
  vec3 acc = vec3(0.0);
  for (int k = 0; k < NCONE; k++) {
    vec3 col = uConeCol[k].rgb; if (col.r + col.g + col.b <= 0.0) continue;
    vec3 q = uConePos[k].xyz - ro; float tc = dot(q, rd), D2 = dot(q, q) - tc * tc, R = uConePos[k].w;
    if (D2 >= R * R) continue;
    float hw = sqrt(R * R - D2), t0 = max(tc - hw, 0.0), t1 = min(tc + hw, dist); if (t1 <= t0) continue;
    float D = sqrt(max(D2, 0.09)), th0 = atan((t0 - tc) / D), th1 = atan((t1 - tc) / D);
    float s = 0.0, jj = fract(j + float(k) * 0.618034);
    for (int i = 0; i < CONE_SAMPLES; i++) {
      float t = tc + D * tan(mix(th0, th1, (float(i) + jj) / float(CONE_SAMPLES)));
      vec3 p = ro + rd * t, L = p - uConePos[k].xyz; float dl = length(L); vec3 ld = L / max(dl, 1e-3);
      float c = smoothstep(uConeDir[k].w, uConeCol[k].w, dot(ld, uConeDir[k].xyz)); if (c <= 0.0) continue;
      float win = 1.0 - min(dl / R, 1.0); win *= win;
      float mu = -dot(rd, ld), ph = hg(mu, uG) * 0.45 + hg(mu, 0.15) * 0.55;
      s += c * win * ph * dens(p) * exp(-uSigma * 0.7 * (t + dl));
    }
    acc += col * (s * (th1 - th0) / (D * float(CONE_SAMPLES)));
  }
  return acc * uSigma;
}
void main(){
  float z = texture2D(tZ, vUv).r;
  if (z <= 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 vd = vec3((vUv * 2.0 - 1.0) * uTan, -1.0); float rl = length(vd);
  vec3 rd = normalize(mat3(uCamWorld) * vd);
  float dist = z * rl; bool sky = z > uFarZ * 0.97;
  float maxD = min(dist, uMaxDist);
  float j = ign(gl_FragCoord.xy + fract(uTime * 7.0) * 0.0);
  vec3 acc = vec3(0.0); float T = 1.0, tPrev = 0.0;
  for (int i = 0; i < VOL_STEPS; i++) {
    float f = (float(i) + 1.0) / float(VOL_STEPS);
    float t1 = maxD * f * (0.3 + 0.7 * f); float ds = t1 - tPrev;
    vec3 p = uCamPos + rd * (tPrev + ds * j);
    float ext = uSigma * dens(p); float Ti = exp(-ext * ds);
    vec3 src = uAmb;
    for (int k = 0; k < NKEY; k++) {
      if (uKeyCone[k].w < 0.5) continue;
      vec3 L = p - uKeyPos[k]; float d2 = dot(L, L); float dl = sqrt(d2); vec3 ld = L / max(dl, 1e-3);
      float cone = smoothstep(uKeyCone[k].x, uKeyCone[k].y, dot(ld, uKeyDir[k]));
      if (cone <= 0.0) continue;
      float sh = uKeyCone[k].z > 0.5 ? vis(k, p) : 1.0;
      float ph = hg(dot(rd, ld) * -1.0, uG) * 0.6 + hg(dot(rd, ld) * -1.0, 0.1) * 0.4;
      src += uKeyCol[k] * (cone * sh * ph / (d2 + 2.0));
    }
    acc += T * src * (1.0 - Ti); T *= Ti; tPrev = t1;
  }
  // analytic in-scatter from unshadowed lamps: integral of 1/d^2 along the view ray
  for (int g = 0; g < NGLOW; g++) {
    vec3 gc = uGlowCol[g]; if (gc.r + gc.g + gc.b <= 0.0) continue;
    vec3 q = uCamPos - uGlowPos[g]; float b = dot(rd, q), c = dot(q, q); float hh = sqrt(max(c - b * b, 0.3)); // floor on the miss distance: a soft halo, never a white core over what is behind the lamp
    float I = (atan((dist + b) / hh) - atan(b / hh)) / hh;
    acc += gc * I * uSigma * 0.08;
  }
  acc += cones(uCamPos, rd, min(dist, 140.0), j);
  // far haze toward the city glow
  if (!sky && dist > uMaxDist) { float tau = uSigma * uHaze * (dist - uMaxDist); float Tf = exp(-tau); acc += T * uHazeCol * (1.0 - Tf); T *= Tf; }
  if (sky) { float Tf = exp(-uSigma * uHaze * 60.0 * exp(-max(rd.y, 0.0) * 6.0)); acc += T * uHazeCol * (1.0 - Tf); T *= Tf; }
  gl_FragColor = vec4(acc, T);
}`
);
var COMPOSITE = (
  /* glsl */
  `${COMMON}
uniform sampler2D tColor, tDepth, tZ, tAO, tVol; uniform vec2 uHalf; uniform float uNear, uFar, uAoOn, uVolOn, uAoK, uExpo, uAoLit;
void main(){
  vec3 col = max(texture2D(tColor, vUv).rgb, vec3(0.0));
  float d = texture2D(tDepth, vUv).r;
  if (d >= ${VIEW_DEPTH}) {
    float z = (uNear * uFar) / (uFar - d * (uFar - uNear)); float zc = min(z, 300.0);
    vec2 hp = vUv * uHalf - 0.5, f = fract(hp), base = (floor(hp) + 0.5) / uHalf, tx = 1.0 / uHalf;
    float ao = 0.0, ws = 0.0; vec4 vol = vec4(0.0);
    for (int k = 0; k < 4; k++) {
      vec2 o = vec2(float(k & 1), float(k >> 1)); vec2 uv = base + o * tx;
      float zh = texture2D(tZ, uv).r; zh = zh <= 0.0 ? 500.0 : min(zh, 300.0);
      float w = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y);
      w = max(w / (0.02 + abs(zh - zc) / zc), 1e-5);
      ao += texture2D(tAO, uv).r * w; vol += texture2D(tVol, uv) * w; ws += w;
    }
    ao /= ws; vol /= ws;
    if (uAoOn > 0.5 && d < 0.99999) {
      // occlusion mostly belongs to indirect light: back it off on strongly lit pixels
      float lit = smoothstep(0.25, 1.4, luma(col) * uExpo);
      float a = mix(1.0, ao, uAoK * (1.0 - uAoLit * lit));
      col *= mix(vec3(a), vec3(1.0), vec3(0.0, 0.02, 0.05));
    }
    if (uVolOn > 0.5) col = col * vol.a + vol.rgb;
  }
  gl_FragColor = vec4(col, 1.0);
}`
);
var BLOOM_DOWN = (
  /* glsl */
  `${COMMON}
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uFirst;
vec3 s(vec2 o){ return min(max(texture2D(tSrc, vUv + o * uTexel).rgb, vec3(0.0)), vec3(300.0)); }
float kw(vec3 c){ return 1.0 / (1.0 + luma(c) * 0.12); }
void main(){
  vec3 a = s(vec2(-2, 2)), b = s(vec2(0, 2)), c = s(vec2(2, 2)), d = s(vec2(-2, 0)), e = s(vec2(0, 0)), f = s(vec2(2, 0)), g = s(vec2(-2, -2)), h = s(vec2(0, -2)), i = s(vec2(2, -2));
  vec3 j = s(vec2(-1, 1)), k = s(vec2(1, 1)), l = s(vec2(-1, -1)), m = s(vec2(1, -1));
  vec3 col;
  if (uFirst > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25, g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25, g4 = (j + k + l + m) * 0.25;
    float w0 = kw(g0) * 0.125, w1 = kw(g1) * 0.125, w2 = kw(g2) * 0.125, w3 = kw(g3) * 0.125, w4 = kw(g4) * 0.5;
    col = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(col, 1.0);
}`
);
var BLOOM_UP = (
  /* glsl */
  `${COMMON}
uniform sampler2D tLow, tHigh; uniform vec2 uTexel; uniform float uMix;
void main(){
  vec2 o = uTexel; vec3 t = texture2D(tLow, vUv).rgb * 4.0;
  t += (texture2D(tLow, vUv + vec2(o.x, 0.0)).rgb + texture2D(tLow, vUv - vec2(o.x, 0.0)).rgb + texture2D(tLow, vUv + vec2(0.0, o.y)).rgb + texture2D(tLow, vUv - vec2(0.0, o.y)).rgb) * 2.0;
  t += texture2D(tLow, vUv + o).rgb + texture2D(tLow, vUv - o).rgb + texture2D(tLow, vUv + vec2(o.x, -o.y)).rgb + texture2D(tLow, vUv + vec2(-o.x, o.y)).rgb;
  gl_FragColor = vec4(mix(texture2D(tHigh, vUv).rgb, t / 16.0, uMix), 1.0);
}`
);
var STREAK = (
  /* glsl */
  `${COMMON}
uniform sampler2D tSrc; uniform vec2 uDir; uniform float uThr;
void main(){ vec3 acc = vec3(0.0); float ws = 0.0; for (int i = -8; i <= 8; i++) { float x = float(i); float w = exp(-x * x / 22.0); vec3 c = max(texture2D(tSrc, vUv + uDir * x).rgb - vec3(uThr), vec3(0.0)); acc += c * w; ws += w; } gl_FragColor = vec4(acc / ws, 1.0); }`
);
var ADAPT = (
  /* glsl */
  `${COMMON}
uniform sampler2D tPrev, tLum; uniform float uRate;
void main(){
  float ls = 0.0, ws = 0.0;
  for (int y = 0; y < 6; y++) for (int x = 0; x < 8; x++) {
    vec2 uv = (vec2(float(x), float(y)) + 0.5) / vec2(8.0, 6.0); float w = 1.0 - 0.7 * smoothstep(0.1, 0.6, length(uv - 0.5));
    ls += log(max(luma(texture2D(tLum, uv).rgb), 1e-4)) * w; ws += w;
  }
  float avg = clamp(exp(ls / ws), 0.0005, 50.0);
  float prev = texture2D(tPrev, vec2(0.5)).r; float a = mix(prev, avg, uRate);
  if (!(a > 0.0) || a > 1e4) a = avg;
  gl_FragColor = vec4(a, 0.0, 0.0, 1.0);
}`
);
var GRADE = (
  /* glsl */
  `${COMMON}
uniform sampler2D tScene, tBloom, tStreak, tAdapt, tDepth;
uniform float uExposure, uKey, uMinE, uMaxE, uAuto, uBloom, uStreak, uAspect, uVignette, uCA, uDamage, uLowHp, uFlash, uFade, uSat, uTime, uContrast;
uniform vec3 uShadowTint, uHighTint, uLift; uniform float uToe, uVib, uTintPivot;
// filmic tone curve: P max, a contrast, m linear start, l linear length, c black tightness, b pedestal
vec3 curve(vec3 x){
  const float P = 1.0, a = 1.0, m = 0.22, l = 0.4, b = 0.0; float c = uToe;
  float l0 = ((P - m) * l) / a, S0 = m + l0, S1 = m + a * l0, C2 = (a * P) / (P - S1), CP = -C2 / P;
  vec3 w0 = 1.0 - smoothstep(0.0, m, x), w2 = step(m + l0, x), w1 = 1.0 - w0 - w2;
  vec3 T = m * pow(x / m, vec3(c)) + b, Sv = P - (P - S1) * exp(CP * (x - S0)), Lv = m + a * (x - m);
  return T * w0 + Lv * w1 + Sv * w2;
}
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
void main(){
  vec2 c = vUv - 0.5; float r2 = dot(c * vec2(uAspect, 1.0), c * vec2(uAspect, 1.0)) / (0.25 * (uAspect * uAspect + 1.0));
  vec2 off = c * r2 * (uCA + uDamage * 0.008);
  vec3 col = vec3(texture2D(tScene, vUv + off).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - off).b);
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  col = mix(col, bloom, uBloom);
  col += texture2D(tStreak, vUv).rgb * vec3(0.55, 0.7, 1.0) * uStreak;
  float ad = texture2D(tAdapt, vec2(0.5)).r;
  float ex = uExposure * mix(1.0, clamp(pow(uKey / max(ad, 1e-4), 0.8), uMinE, uMaxE), uAuto);
  col *= ex;
  col += vec3(1.0, 0.92, 0.8) * uFlash;
  // slight desaturation of very bright values before the curve so lamps roll off to white
  float L0 = luma(col); col = mix(col, vec3(L0), smoothstep(1.5, 12.0, L0) * 0.6);
  col = curve(col);
  // grade in display-linear
  float L = luma(col);
  // vibrance: pushes weakly saturated colours further than colours that are already strong, so accents stay clean
  float mxc = max(col.r, max(col.g, col.b)), mnc = min(col.r, min(col.g, col.b)), sat0 = (mxc - mnc) / max(mxc, 1e-3);
  col = mix(vec3(L), col, uSat + uVib * (1.0 - sat0));
  col *= mix(uShadowTint, uHighTint, smoothstep(0.0, uTintPivot, L));
  col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);
  // lift: the blacks carry the colour of the air instead of falling to neutral black
  col += uLift * (1.0 - L) * (1.0 - L);
  // vignette, hurt, low health
  float vg = 1.0 - uVignette * smoothstep(0.25, 1.15, r2);
  col *= vg;
  float hurt = uDamage * smoothstep(0.15, 1.0, r2);
  col = mix(col, vec3(0.42, 0.02, 0.01) * (0.6 + 0.4 * L), hurt * 0.75);
  float pulse = uLowHp * (0.55 + 0.45 * sin(uTime * 5.0)) * smoothstep(0.3, 1.1, r2);
  col = mix(col, vec3(L) * vec3(0.9, 0.35, 0.3), pulse * 0.6);
  col *= 1.0 - uFade;
  gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
}`
);
var FINAL = (
  /* glsl */
  `${COMMON}
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uSharp, uGrain, uTime, uFxaa;
float lm(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 M = texture2D(tSrc, vUv).rgb; vec3 col = M;
  vec3 N = texture2D(tSrc, vUv + vec2(0.0, uTexel.y)).rgb, S = texture2D(tSrc, vUv - vec2(0.0, uTexel.y)).rgb, E = texture2D(tSrc, vUv + vec2(uTexel.x, 0.0)).rgb, W = texture2D(tSrc, vUv - vec2(uTexel.x, 0.0)).rgb;
  if (uFxaa > 0.5) {
    float lNW = lm(texture2D(tSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb), lNE = lm(texture2D(tSrc, vUv + vec2(1.0, 1.0) * uTexel).rgb);
    float lSW = lm(texture2D(tSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb), lSE = lm(texture2D(tSrc, vUv + vec2(1.0, -1.0) * uTexel).rgb), lM = lm(M);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    if (lMax - lMin > max(0.03, lMax * 0.1)) {
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), vec2(-8.0), vec2(8.0)) * uTexel;
      vec3 A = 0.5 * (texture2D(tSrc, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tSrc, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 B = A * 0.5 + 0.25 * (texture2D(tSrc, vUv - dir * 0.5).rgb + texture2D(tSrc, vUv + dir * 0.5).rgb);
      float lB = lm(B); col = (lB < lMin || lB > lMax) ? A : B;
    }
  }
  // contrast-adaptive sharpen
  vec3 mn = min(M, min(min(N, S), min(E, W))), mx = max(M, max(max(N, S), max(E, W)));
  vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, vec3(1e-3)), 0.0, 1.0));
  vec3 wgt = amp * (-0.125 * uSharp);
  col = clamp((col + (N + S + E + W) * wgt) / (1.0 + 4.0 * wgt), 0.0, 1.0);
  // grain (luma weighted) + dither
  float g = h12(gl_FragCoord.xy + fract(uTime) * 311.0) - 0.5;
  col += g * uGrain * (0.35 + 0.65 * (1.0 - lm(col)));
  col += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`
);
var COPY = (
  /* glsl */
  `${COMMON} uniform sampler2D tSrc; void main(){ gl_FragColor = texture2D(tSrc, vUv); }`
);

