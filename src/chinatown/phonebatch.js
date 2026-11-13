// The street in a handful of draws, on phones.
//
// In Safari every WebGL call crosses to the GPU process, and the static street (the kit's
// batches for the level and the backdrop, the game props, the shop fittings, the stoves'
// ironwork) cost some 430 draws a frame, one per material: on an iPhone Air that alone kept
// the main thread busy for most of a frame. Merged as below, the main thread's time a frame
// went from about 47 ms to about 16 ms (measured 2026-11-14, docs/pitfalls.md).
//
// So on handheld devices on the low preset, before anything is first drawn, the street's opaque
// meshes are merged (those in the kit's static groups, and any mesh with userData.batch):
// - Lit surfaces using the street shader (G.mats.adopt) are merged by shader. Their textures go
//   into texture arrays (colour, normal, roughness/metalness/AO; each texture a layer of an
//   array of its own size, so nothing loses resolution), each material's constants into a row
//   of a small float table, and every vertex carries the row of its material. The shader is the same adopted
//   MeshStandardMaterial with those few uniforms read from the table and the three maps read
//   from the arrays.
// - Unlit glows (MeshBasicMaterial: neon and window atlases, lamps, lit rooms) are merged by
//   the one texture they share (no arrays: the sign atlases keep their resolution); the colour
//   comes from the table.
// The table follows the materials every frame: a lamp that flickers by changing its material's
// colour still flickers. Desktop presets never come here (docs/decisions.md: the computer's
// picture must not change). `?batch=0` turns it off on a phone, for comparison.
//
// Left alone: transparent and alpha-tested materials, clear-coated paint
// (MeshPhysicalMaterial), triplanar materials, anything skinned, instanced or live. Nothing
// merged is raycast (physics has its own boxes) or shown and hidden at runtime.
//
// game.js calls batchStatic(G) just before render.onLevelReady.
import * as THREE from "three";

const STATIC_GROUPS = new Set([
  "ct-static",
  "ct-backdrop",
  "ct-gameprops",
  "ct-shopfit",
]);
const MAPS = ["map", "normalMap", "roughnessMap"];
const NONE = [
  "emissiveMap",
  "alphaMap",
  "lightMap",
  "bumpMap",
  "displacementMap",
  "envMap",
  "aoMap",
  "specularMap",
];
const ROW = 8; // texels per material row in the table
const plainCompile = THREE.Material.prototype.onBeforeCompile;

function inStatic(o) {
  for (let p = o.parent; p; p = p.parent)
    if (STATIC_GROUPS.has(p.name)) return true;
  return false;
}

function plainMesh(o) {
  if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.visible)
    return false;
  if (Array.isArray(o.material) || !o.material || !o.material.visible)
    return false;
  if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender)
    return false;
  const g = o.geometry;
  if (!g || !g.attributes.position) return false;
  if (g.morphAttributes && Object.keys(g.morphAttributes).length) return false;
  const m = o.material;
  return (
    !m.transparent &&
    !m.wireframe &&
    m.blending === THREE.NormalBlending &&
    (inStatic(o) || o.userData.batch === true)
  );
}

// lit street surfaces
function litMesh(o) {
  const m = o.material;
  if (!m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) return false;
  if (!m.userData.sl || m.alphaTest > 0) return false;
  if (!m.defines || !("SL_FX" in m.defines)) return false;
  if ("SL_TRIPLANAR" in m.defines || "SL_ACUT" in m.defines) return false;
  if (!m.map || !m.roughnessMap) return false;
  for (const k of NONE) if (k !== "aoMap" && m[k]) return false;
  const a = o.geometry.attributes;
  return !!(a.normal && a.uv);
}

// unlit glows
function glowMesh(o) {
  const m = o.material;
  if (!m.isMeshBasicMaterial || m.onBeforeCompile !== plainCompile)
    return false;
  for (const k of NONE) if (m[k]) return false;
  return !m.map || !!o.geometry.attributes.uv;
}

const dims = (t) => {
  const i = t && (t.source ? t.source.data : t.image);
  return i ? Math.max(i.width || 1, i.height || 1) : 1;
};

const drawKey = (o, m) => [
  m.side,
  o.layers.mask,
  o.castShadow,
  o.receiveShadow,
  o.renderOrder,
  m.depthWrite,
  m.depthTest,
  m.colorWrite,
  m.polygonOffset ? `${m.polygonOffsetFactor},${m.polygonOffsetUnits}` : "",
  m.fog,
  m.toneMapped,
  m.shadowSide,
  m.alphaTest,
  JSON.stringify(m.defines || {}),
];

export function batchStatic(G) {
  const R = G.render && G.render.renderer;
  const scene = G.render && G.render.scene;
  if (!R || !scene || !G.mats || !G.mats.adopt) return null;
  const t0 = performance.now();
  scene.updateMatrixWorld(true);

  const lit = [];
  const glow = [];
  scene.traverse((o) => {
    if (!plainMesh(o)) return;
    if (litMesh(o)) lit.push(o);
    else if (glowMesh(o)) glow.push(o);
  });
  if (!lit.length && !glow.length) return null;

  // ---- the table: one row per material, kept in step with the materials ----
  const rows = new Map(); // material -> row
  const watched = []; // { m, row, lit }
  let data = new Float32Array(64 * ROW * 4);
  let nRows = 0;
  const write = (m, r, isLit) => {
    const o = r * ROW * 4;
    data[o] = m.color.r;
    data[o + 1] = m.color.g;
    data[o + 2] = m.color.b;
    if (!isLit) return;
    data[o + 3] = m.roughness;
    data[o + 4] = m.metalness;
    data[o + 7] = m.aoMapIntensity;
    const e = m.emissive;
    const k = m.emissiveIntensity;
    data[o + 24] = e.r * k;
    data[o + 25] = e.g * k;
    data[o + 26] = e.b * k;
  };
  const rowFor = (m, isLit, at = null) => {
    let r = rows.get(m);
    if (r !== undefined) return r;
    r = nRows++;
    if (nRows * ROW * 4 > data.length) {
      const d = new Float32Array(data.length * 2);
      d.set(data);
      data = d;
    }
    rows.set(m, r);
    watched.push({ m, r, isLit });
    write(m, r, isLit);
    const o = r * ROW * 4;
    if (isLit) {
      m.map.updateMatrix();
      const e = m.map.matrix.elements; // column-major 3x3
      const sl = m.userData.sl;
      data.set([0, m.normalScale.x, m.normalScale.y], o + 4);
      data[o + 4] = m.metalness;
      data.set([e[0], e[3], e[6], at.map.layer], o + 8);
      data.set([e[1], e[4], e[7], sl.uSlX.value.x], o + 12);
      data.set(sl.uSlWetP.value.toArray(), o + 16);
      data.set(sl.uSlMacro.value.toArray(), o + 20);
      data.set([at.normalMap.layer, at.roughnessMap.layer], o + 28);
    }
    return r;
  };

  // ---- lit: every texture is a layer of an array of its own size (rounded up to a power of
  // two, at most 2048), so nothing is drawn smaller than it was: the sign and market atlases
  // keep their resolution. Colour, normal and roughness are placed independently.
  const arrays = new Map(); // "slot:size" -> { slot, cls, list, index }
  const place = (slot, t) => {
    const cls = Math.min(
      2048,
      THREE.MathUtils.ceilPowerOfTwo(Math.max(4, dims(t))),
    );
    const key = slot + ":" + cls;
    let a = arrays.get(key);
    if (!a) arrays.set(key, (a = { slot, cls, list: [], index: new Map() }));
    const id = t ? t.source.uuid : "-";
    let layer = a.index.get(id);
    if (layer === undefined) {
      layer = a.list.length;
      a.list.push(t);
      a.index.set(id, layer);
    }
    return { key, cls, layer };
  };
  const placeAll = (m) => ({
    map: place("map", m.map),
    normalMap: place("normalMap", m.normalMap),
    roughnessMap: place("roughnessMap", m.roughnessMap),
  });

  const groups = new Map();
  for (const o of lit) {
    const m = o.material;
    const at = placeAll(m);
    const key = [
      "lit",
      at.map.key,
      at.normalMap.key,
      at.roughnessMap.key,
      m.userData.interior ? "i" : m.userData.street ? "s" : "",
      m.envMapIntensity,
      !!m.normalMap,
      m.normalMapType,
      !!m.aoMap,
      !!m.metalnessMap,
      m.flatShading,
      m.customProgramCacheKey(),
      ...drawKey(o, m),
    ].join("~");
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { lit: true, rep: m, at, mesh: o, list: [] }));
    g.list.push({ o, row: rowFor(m, true, at) });
  }
  for (const o of glow) {
    const m = o.material;
    const key = ["glow", m.map ? m.map.uuid : "-", ...drawKey(o, m)].join("~");
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { lit: false, rep: m, mesh: o, list: [] }));
    g.list.push({ o, row: rowFor(m, false) });
  }

  const filled = fillArrays(R, arrays);

  const table = new THREE.DataTexture(
    data.slice(0, Math.max(1, nRows) * ROW * 4),
    ROW,
    Math.max(1, nRows),
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  table.minFilter = table.magFilter = THREE.NearestFilter;
  table.needsUpdate = true;
  // follow colour changes (flickering lamps and signs change their material's colour)
  const tab = table.image.data;
  const sync = () => {
    let changed = false;
    for (const w of watched) {
      const o = w.r * ROW * 4;
      const m = w.m;
      if (
        tab[o] !== Math.fround(m.color.r) ||
        tab[o + 1] !== Math.fround(m.color.g) ||
        tab[o + 2] !== Math.fround(m.color.b) ||
        (w.isLit &&
          (tab[o + 3] !== Math.fround(m.roughness) ||
            tab[o + 24] !== Math.fround(m.emissive.r * m.emissiveIntensity)))
      ) {
        data = tab;
        write(m, w.r, w.isLit);
        changed = true;
      }
    }
    if (changed) table.needsUpdate = true;
  };
  if (G.render.addPrePass) G.render.addPrePass(sync);

  // ---- merged meshes ----
  const holder = new THREE.Group();
  holder.name = "ct-phonebatch";
  (scene.getObjectByName("level") || scene).add(holder);
  const phMap = placeholder(true);
  const phLin = placeholder(false);
  let draws = 0;
  for (const g of groups.values()) {
    const m = g.lit
      ? litMaterial(G, g, filled, table, phMap, phLin)
      : glowMaterial(g, table);
    const mesh = new THREE.Mesh(mergeGeometry(g.list), m);
    mesh.name = "pb";
    mesh.castShadow = g.mesh.castShadow;
    mesh.receiveShadow = g.mesh.receiveShadow;
    mesh.layers.mask = g.mesh.layers.mask;
    mesh.renderOrder = g.mesh.renderOrder;
    mesh.matrixAutoUpdate = false;
    mesh.userData.staticShadow = true;
    holder.add(mesh);
    draws++;
  }

  // the originals go; the lit ones' textures were only needed to fill the arrays
  const gone = new Set();
  for (const o of lit.concat(glow)) {
    o.parent.remove(o);
    o.geometry.dispose();
    gone.add(o.material);
  }
  const kept = new Set();
  scene.traverse((o) => {
    for (const m of [].concat(o.material || []))
      for (const k in m) if (m[k] && m[k].isTexture) kept.add(m[k]);
  });
  for (const m of gone)
    if (m.isMeshStandardMaterial)
      for (const k of MAPS.concat(["metalnessMap", "aoMap"])) {
        const t = m[k];
        if (t && !kept.has(t) && !t.isRenderTargetTexture) t.dispose();
      }

  const stats = {
    lit: lit.length,
    glow: glow.length,
    draws,
    materials: nRows,
    arrays: [...arrays.values()]
      .map((a) => `${a.slot}:${a.cls}x${a.list.length}`)
      .join(" "),
    ms: Math.round(performance.now() - t0),
  };
  console.log("[phonebatch]", JSON.stringify(stats));
  G.phonebatch = stats;
  return stats;
}

function placeholder(srgb) {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// The arrays are drawn on the GPU from whatever each texture is: an image, a canvas or a
// render target the material library painted. Same orientation and colour space as the
// original, so the shader reads the same values.
function fillArrays(R, arrays) {
  const out = new Map(); // "slot:size" -> array texture
  if (!arrays.size) return out;
  const flatNormal = new THREE.DataTexture(
    new Uint8Array([128, 128, 255, 255]),
    1,
    1,
  );
  flatNormal.needsUpdate = true;
  const white = placeholder(false);
  const copy = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null } },
    vertexShader:
      "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader:
      "uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }",
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copy);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = R.getRenderTarget();
  const aniso = Math.min(2, R.capabilities.getMaxAnisotropy());
  for (const [key, a] of arrays) {
    const rt = new THREE.WebGLArrayRenderTarget(a.cls, a.cls, a.list.length, {
      depthBuffer: false,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: a.slot === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    });
    const tex = rt.texture;
    // tiling surfaces repeat; an atlas in the same array only ever reads inside its tiles
    const tiles = a.list.some((t) => t && t.wrapS === THREE.RepeatWrapping);
    tex.wrapS = tex.wrapT = tiles
      ? THREE.RepeatWrapping
      : THREE.ClampToEdgeWrapping;
    tex.anisotropy = aniso;
    a.list.forEach((t, layer) => {
      // mipmaps once at the end (the storage gets its levels on first use)
      tex.generateMipmaps = layer === 0 || layer === a.list.length - 1;
      copy.uniforms.tSrc.value =
        t || (a.slot === "normalMap" ? flatNormal : white);
      R.setRenderTarget(rt, layer);
      R.render(quadScene, cam);
    });
    tex.generateMipmaps = true;
    out.set(key, tex);
  }
  R.setRenderTarget(prev);
  copy.dispose();
  quad.geometry.dispose();
  flatNormal.dispose();
  white.dispose();
  return out;
}

// World-space positions and normals, uv, colour (white where the material has none) and the
// table row of each vertex. Mirrored meshes get their triangles turned round.
const _n = new THREE.Matrix3();
const _v = new THREE.Vector3();
function mergeGeometry(list) {
  let nv = 0;
  let ni = 0;
  for (const { o } of list) {
    const geo = o.geometry;
    nv += geo.attributes.position.count;
    ni += geo.index ? geo.index.count : geo.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3);
  const nrm = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const col = new Float32Array(nv * 3);
  const mat = new Float32Array(nv);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0;
  let io = 0;
  for (const { o, row } of list) {
    const geo = o.geometry;
    const P = geo.attributes.position;
    const N = geo.attributes.normal;
    const U = geo.attributes.uv;
    const C = o.material.vertexColors ? geo.attributes.color : null;
    const M = o.matrixWorld;
    _n.getNormalMatrix(M);
    const flip = M.determinant() < 0;
    for (let i = 0; i < P.count; i++) {
      const v = vo + i;
      _v.fromBufferAttribute(P, i).applyMatrix4(M);
      pos[v * 3] = _v.x;
      pos[v * 3 + 1] = _v.y;
      pos[v * 3 + 2] = _v.z;
      if (N) {
        _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize();
        nrm[v * 3] = _v.x;
        nrm[v * 3 + 1] = _v.y;
        nrm[v * 3 + 2] = _v.z;
      } else nrm[v * 3 + 1] = 1;
      if (U) {
        uv[v * 2] = U.getX(i);
        uv[v * 2 + 1] = U.getY(i);
      }
      col[v * 3] = C ? C.getX(i) : 1;
      col[v * 3 + 1] = C ? C.getY(i) : 1;
      col[v * 3 + 2] = C ? C.getZ(i) : 1;
      mat[v] = row;
    }
    const n = geo.index ? geo.index.count : P.count;
    for (let i = 0; i < n; i += 3) {
      const a = geo.index ? geo.index.getX(i) : i;
      const b = geo.index ? geo.index.getX(i + 1) : i + 1;
      const c = geo.index ? geo.index.getX(i + 2) : i + 2;
      idx[io++] = vo + a;
      idx[io++] = vo + (flip ? c : b);
      idx[io++] = vo + (flip ? b : c);
    }
    vo += P.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aPbMat", new THREE.BufferAttribute(mat, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

const VERT_PARS =
  "#include <common>\nattribute float aPbMat;\nflat varying float vPbMat;";
const patchVertex = (vs) =>
  vs
    .replace("#include <common>", VERT_PARS)
    .replace("void main() {", "void main() {\n  vPbMat = aPbMat;");

const swap = (s, from, to) => {
  if (!s.includes(from))
    throw new Error("[phonebatch] shader changed: " + from);
  return s.split(from).join(to);
};

function copyDrawState(m, rep) {
  for (const k of [
    "side",
    "depthWrite",
    "depthTest",
    "colorWrite",
    "polygonOffset",
    "polygonOffsetFactor",
    "polygonOffsetUnits",
    "fog",
    "toneMapped",
    "shadowSide",
    "alphaTest",
  ])
    m[k] = rep[k];
}

function litMaterial(G, g, arr, table, phMap, phLin) {
  const rep = g.rep;
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: rep.flatShading,
    envMapIntensity: rep.envMapIntensity,
  });
  copyDrawState(m, rep);
  m.name = "pb_" + (rep.name || "street");
  m.map = phMap;
  m.roughnessMap = phLin;
  const nor = !!rep.normalMap;
  const ao = !!rep.aoMap;
  if (nor) {
    m.normalMap = phLin;
    m.normalMapType = rep.normalMapType;
  }
  if (rep.metalnessMap) m.metalnessMap = phLin;
  if (ao) m.aoMap = phLin;
  if (rep.userData.interior) m.userData.interior = true;
  if (rep.userData.street) m.userData.street = true;
  G.mats.adopt(m, { interior: !!rep.userData.interior });
  m.defines = { ...rep.defines };
  const key = m.customProgramCacheKey;
  const tag = "|pb" + (nor ? "n" : "") + JSON.stringify(m.defines);
  m.customProgramCacheKey = () => key() + tag;
  const adopted = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    adopted(sh, r);
    sh.uniforms.uPbMap = { value: arr.get(g.at.map.key) };
    sh.uniforms.uPbNor = { value: arr.get(g.at.normalMap.key) };
    sh.uniforms.uPbOrm = { value: arr.get(g.at.roughnessMap.key) };
    sh.uniforms.uPbTab = { value: table };
    sh.vertexShader = patchVertex(sh.vertexShader);
    sh.fragmentShader = patchLit(sh.fragmentShader, nor, ao);
  };
  m.needsUpdate = true;
  return m;
}

// The per-material uniforms become globals filled from the table; the three street maps are
// read from the arrays. Everything else is the adopted shader as it was.
function patchLit(fs, nor, ao) {
  fs = swap(fs, "uniform vec3 diffuse;", "vec3 diffuse;");
  fs = swap(fs, "uniform vec3 emissive;", "vec3 emissive;");
  fs = swap(fs, "uniform float roughness;", "float roughness;");
  fs = swap(fs, "uniform float metalness;", "float metalness;");
  fs = swap(
    fs,
    "uniform vec4 uSlWetP; uniform vec4 uSlMacro;",
    "vec4 uSlWetP; vec4 uSlMacro;",
  );
  fs = swap(fs, "uniform vec2 uSlX;", "vec2 uSlX;");
  // aoMapIntensity and normalScale are only declared with their maps, inside chunks that are
  // expanded later: expand those here
  fs = swap(
    fs,
    "#include <aomap_pars_fragment>",
    ao
      ? THREE.ShaderChunk.aomap_pars_fragment.replace(
          "uniform float aoMapIntensity;",
          "float aoMapIntensity;",
        )
      : "#include <aomap_pars_fragment>\nfloat aoMapIntensity;",
  );
  fs = swap(
    fs,
    "#include <normalmap_pars_fragment>",
    nor
      ? THREE.ShaderChunk.normalmap_pars_fragment.replace(
          "uniform vec2 normalScale;",
          "vec2 normalScale;",
        )
      : "#include <normalmap_pars_fragment>\nvec2 normalScale;",
  );
  fs = swap(
    fs,
    "#include <common>",
    `#include <common>
uniform highp sampler2DArray uPbMap;
uniform highp sampler2DArray uPbOrm;
${nor ? "uniform highp sampler2DArray uPbNor;" : ""}
uniform highp sampler2D uPbTab;
flat varying float vPbMat;
float pbLayer; float pbLayerN; float pbLayerO; vec3 pbM0; vec3 pbM1;`,
  );
  fs = swap(
    fs,
    "void main() {",
    `void main() {
  { int r = int(vPbMat + 0.5);
    vec4 a = texelFetch(uPbTab, ivec2(0, r), 0), b = texelFetch(uPbTab, ivec2(1, r), 0);
    vec4 c = texelFetch(uPbTab, ivec2(2, r), 0), d = texelFetch(uPbTab, ivec2(3, r), 0);
    diffuse = a.rgb; roughness = a.a; metalness = b.x; normalScale = b.yz; aoMapIntensity = b.w;
    pbM0 = c.xyz; pbLayer = c.w; pbM1 = d.xyz; uSlX = vec2(d.w, 0.0);
    uSlWetP = texelFetch(uPbTab, ivec2(4, r), 0); uSlMacro = texelFetch(uPbTab, ivec2(5, r), 0);
    emissive = texelFetch(uPbTab, ivec2(6, r), 0).rgb;
    vec4 e = texelFetch(uPbTab, ivec2(7, r), 0); pbLayerN = e.x; pbLayerO = e.y; }`,
  );
  fs = swap(
    fs,
    "slUv = vMapUv * uSlUv.xy;",
    "slUv = vec2(dot(pbM0.xy, vMapUv) + pbM0.z, dot(pbM1.xy, vMapUv) + pbM1.z);",
  );
  fs = swap(fs, "texture2D(map, slUv)", "texture(uPbMap, vec3(slUv, pbLayer))");
  fs = swap(
    fs,
    "texture2D(roughnessMap, slUv)",
    "texture(uPbOrm, vec3(slUv, pbLayerO))",
  );
  if (nor)
    fs = swap(
      fs,
      "texture2D(normalMap, slUv)",
      "texture(uPbNor, vec3(slUv, pbLayerN))",
    );
  return fs;
}

// Glows share their one texture (and its transform); only the colour differs per material.
function glowMaterial(g, table) {
  const rep = g.rep;
  const m = new THREE.MeshBasicMaterial({ map: rep.map, vertexColors: true });
  copyDrawState(m, rep);
  m.name = "pb_" + (rep.name || "glow");
  m.customProgramCacheKey = () => "pbglow";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPbTab = { value: table };
    sh.vertexShader = patchVertex(sh.vertexShader);
    let fs = swap(sh.fragmentShader, "uniform vec3 diffuse;", "vec3 diffuse;");
    fs = swap(
      fs,
      "#include <common>",
      "#include <common>\nuniform highp sampler2D uPbTab;\nflat varying float vPbMat;",
    );
    fs = swap(
      fs,
      "void main() {",
      "void main() {\n  diffuse = texelFetch(uPbTab, ivec2(0, int(vPbMat + 0.5)), 0).rgb;",
    );
    sh.fragmentShader = fs;
  };
  return m;
}
