// Construction kit for the Chinatown level: PBR materials on the game's wet-surface shader,
// a geometry batcher (everything static ends up in a few meshes per material and area),
// world-scaled primitives, GLB props and collision helpers.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const TEX = "assets/textures/";
const PROPS = "assets/props/";
const CELL = 80; // batches are split on this grid: the play area is one cell, each backdrop side its own

// name -> tile size in metres (how much wall one repeat of the texture covers)
export const SURFACES = {
  brick_red: 2.0,
  brick_orange: 2.2,
  brick_teal: 2.0,
  brick_white: 2.0,
  plaster_worn: 3.0,
  plaster_peel: 3.0,
  plaster_yellow: 3.0,
  plaster_blue: 3.0,
  concrete_dirty: 3.0,
  facade_tiles: 1.6,
  shutter: 1.6,
  shutter_rust: 1.6,
  roof_clay: 1.5,
  roof_ceramic: 1.5,
  pavers: 2.4,
  tiles_white: 1.4,
  tiles_floor: 2.0,
  granite: 2.4,
  wood_lacquer: 1.2,
  wood_planks: 1.6,
  corrugated: 1.5,
  marble: 2.0,
};
// [darkening, roughness when wet, streak strength, beading]
const WET = {
  masonry: [0.34, 0.5, 0.75, 0],
  plaster: [0.3, 0.55, 0.8, 0],
  stone: [0.3, 0.32, 0.6, 0.15],
  metal: [0.12, 0.45, 0.8, 0.5],
  wood: [0.32, 0.4, 0.6, 0.2],
  glazed: [0.08, 0.35, 0.5, 0.6],
  dry: [0, 1, 0, 0],
};
const SURFACE_WET = {
  brick_red: "masonry",
  brick_orange: "masonry",
  brick_teal: "masonry",
  brick_white: "masonry",
  plaster_worn: "plaster",
  plaster_peel: "plaster",
  plaster_yellow: "plaster",
  plaster_blue: "plaster",
  concrete_dirty: "stone",
  facade_tiles: "glazed",
  shutter: "metal",
  shutter_rust: "metal",
  roof_clay: "glazed",
  roof_ceramic: "glazed",
  pavers: "stone",
  tiles_white: "glazed",
  tiles_floor: "glazed",
  granite: "stone",
  wood_lacquer: "wood",
  wood_planks: "wood",
  corrugated: "metal",
  marble: "stone",
};

export async function createKit(G) {
  const base = import.meta.env.BASE_URL || "/";
  const lowTex = (G.quality.tex || 1024) < 1024;
  // anisotropic filtering multiplies texture reads on every surface seen at an angle
  const aniso = Math.min(
    lowTex ? 2 : 8,
    G.renderer.capabilities.getMaxAnisotropy(),
  );
  const texLoader = new THREE.TextureLoader();
  const gltfLoader = new GLTFLoader();
  const sets = new Map();
  const materials = new Map();
  const props = new Map();
  const propMats = new Map();

  // ---------- textures ----------
  async function loadTexture(url, srgb) {
    const tex = await texLoader.loadAsync(base + url);
    if (lowTex && tex.image && tex.image.width > 512) {
      // halve the maps on the lower presets
      const c = document.createElement("canvas");
      c.width = tex.image.width >> 1;
      c.height = tex.image.height >> 1;
      c.getContext("2d").drawImage(tex.image, 0, 0, c.width, c.height);
      tex.image = c;
    }
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = aniso;
    tex.needsUpdate = true;
    return tex;
  }
  async function loadSurface(name) {
    if (sets.has(name)) return sets.get(name);
    const tile = SURFACES[name];
    const [map, normal, arm] = await Promise.all([
      loadTexture(`${TEX}${name}_diff.webp`, true),
      loadTexture(`${TEX}${name}_nor.webp`, false),
      loadTexture(`${TEX}${name}_arm.webp`, false),
    ]);
    for (const t of [map, normal, arm]) t.repeat.set(1 / tile, 1 / tile);
    const set = { map, normal, arm, tile };
    sets.set(name, set);
    return set;
  }
  async function loadSurfaces(names) {
    await Promise.all(names.map(loadSurface));
  }

  // ---------- materials ----------
  // A surface from the texture library. Options: color (tint), wet (key of WET or array),
  // macro [albedo variation, roughness variation, frequency, grime], rough, metal, interior, side.
  function pbr(name, o = {}) {
    const set = sets.get(name);
    if (!set) throw new Error(`surface "${name}" was not loaded`);
    const wet = o.wet || SURFACE_WET[name] || "masonry";
    const wetP = Array.isArray(wet) ? wet : WET[wet];
    const macro = o.macro || [0.12, 0.06, 0.3, 0.45];
    // one real material per surface response; the tint travels in vertex colours, so a
    // cream wall and a green wall of the same plaster are one draw call
    const sig = [
      "pbr",
      name,
      o.interior ? 1 : 0,
      o.side ? 1 : 0,
      wetP.join(","),
      macro.join(","),
      o.rough ?? 1,
      o.metal ?? 1,
      o.normalScale ?? 1,
    ].join("|");
    let base = materials.get(sig);
    if (!base) {
      base = new THREE.MeshStandardMaterial({
        map: set.map,
        normalMap: set.normal,
        roughnessMap: set.arm,
        metalnessMap: set.arm,
        aoMap: set.arm,
        color: 0xffffff,
        roughness: o.rough ?? 1,
        metalness: o.metal ?? 1,
        vertexColors: true,
      });
      base.name = "ct_" + name;
      if (o.side) base.side = THREE.DoubleSide;
      if (o.normalScale !== undefined)
        base.normalScale.set(o.normalScale, o.normalScale);
      G.mats.adopt(base, { wet: wetP, macro, interior: !!o.interior });
      materials.set(sig, base);
    }
    const color =
      o.color && o.color.isColor
        ? o.color
        : new THREE.Color(o.color ?? 0xffffff);
    const key =
      sig +
      "#" +
      color.r.toFixed(3) +
      "," +
      color.g.toFixed(3) +
      "," +
      color.b.toFixed(3);
    let handle = materials.get(key);
    if (!handle) {
      // a handle, not a material: it only makes sense to the batching primitives below
      handle = {
        isSurfaceHandle: true,
        uuid: key,
        name: base.name,
        userData: { tint: { base, color } },
      };
      materials.set(key, handle);
    }
    return handle;
  }
  // Untextured surface that still takes rain.
  function flat(color, o = {}) {
    const key =
      "flat|" +
      color +
      "|" +
      (o.rough ?? 0.6) +
      "|" +
      (o.metal ?? 0) +
      "|" +
      (o.interior ? "i" : "") +
      (o.side ? "d" : "") +
      (o.reflect ? "r" : "") +
      (o.coat ? "c" : "") +
      (o.key || "");
    let m = materials.get(key);
    if (m) return m;
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.6,
      metalness: o.metal ?? 0,
    });
    m.name = "ct_flat";
    if (o.side) m.side = THREE.DoubleSide;
    const wet = Array.isArray(o.wet) ? o.wet : WET[o.wet || "metal"];
    const macro = o.macro || [0.05, 0.05, 1.5, 0.2];
    G.mats.adopt(m, { wet, macro, interior: !!o.interior });
    // batched geometry does not use this material itself: all flat colours with the same
    // surface response are drawn by one vertex-coloured material (see bucket()).
    m.userData.flat = {
      sig: [
        o.rough ?? 0.6,
        o.metal ?? 0,
        wet.join(","),
        macro.join(","),
        o.interior ? 1 : 0,
        o.side ? 1 : 0,
        o.reflect ? 1 : 0,
        o.coat ? 1 : 0,
      ].join("|"),
      reflect: !!o.reflect,
      coat: !!o.coat,
      color: new THREE.Color(color),
      rough: o.rough ?? 0.6,
      metal: o.metal ?? 0,
      wet,
      macro,
      interior: !!o.interior,
      side: !!o.side,
    };
    materials.set(key, m);
    return m;
  }
  const flatBases = new Map();
  function flatBase(f) {
    let m = flatBases.get(f.sig);
    if (m) return m;
    // coat: lacquered paint, a clear glossy layer over the coloured one
    m = f.coat
      ? new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          roughness: f.rough,
          metalness: f.metal,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          vertexColors: true,
        })
      : new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: f.rough,
          metalness: f.metal,
          vertexColors: true,
        });
    m.name = "ct_flat_shared";
    if (f.side) m.side = THREE.DoubleSide;
    G.mats.adopt(m, { wet: f.wet, macro: f.macro, interior: f.interior });
    m.userData.oneCell = true;
    // small details stay out of the wet-street reflection pass; big things (vehicles) opt in
    m.userData.noReflect = !f.reflect;
    flatBases.set(f.sig, m);
    return m;
  }
  // The game's own procedural materials (steel, rubber, glass, ...).
  const game = (name, o) => G.mats.get(name, o);
  // Unlit HDR colour: neon tubes, lamps, lit glass.
  function glow(color, strength = 3) {
    return G.mats.emissive(new THREE.Color(color).getHex(), strength);
  }
  // Unlit HDR texture (signs, lit windows). The texture is multiplied, so black stays black.
  function glowMap(texture, strength = 2.5, o = {}) {
    const m = new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(strength, strength, strength),
      transparent: !!o.transparent,
      alphaTest: o.alphaTest || 0,
      side: o.side ? THREE.DoubleSide : THREE.FrontSide,
      depthWrite: o.depthWrite !== false,
    });
    m.name = "ct_glow";
    if (o.additive) {
      m.blending = THREE.AdditiveBlending;
      m.depthWrite = false;
      m.transparent = true;
    }
    return m;
  }
  // Lit texture drawn on a canvas (signboards, posters, painted beams).
  function painted(texture, o = {}) {
    const m = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: o.rough ?? 0.6,
      metalness: o.metal ?? 0,
      transparent: !!o.transparent,
      alphaTest: o.alphaTest || 0,
      side: o.side ? THREE.DoubleSide : THREE.FrontSide,
    });
    m.name = "ct_painted";
    if (o.transparent) {
      m.depthWrite = false;
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
    }
    if (o.emissive) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveMap = texture;
      m.emissiveIntensity = o.emissiveIntensity ?? 1;
    }
    G.mats.adopt(m, {
      wet: Array.isArray(o.wet) ? o.wet : WET[o.wet || "wood"],
      macro: o.macro || [0, 0, 1, 0],
      interior: !!o.interior,
    });
    return m;
  }

  // ---------- batching ----------
  const batches = new Map();
  let active = null; // batch group currently receiving geometry
  function group(name) {
    const g = { name, parts: new Map() };
    batches.set(name, g);
    return g;
  }
  active = group("static");
  function bucket(mat, x, z) {
    const flat = mat.userData.flat || mat.userData.tint;
    if (mat.userData.flat) mat = flatBase(flat);
    else if (flat) mat = flat.base;
    // big wall and floor surfaces are split by area; small stuff shares one mesh per material
    const one = mat.userData.oneCell;
    const key = one
      ? mat.uuid
      : mat.uuid +
        "|" +
        Math.floor((x + 40) / CELL) +
        "|" +
        Math.floor((z + 40) / CELL);
    let b = active.parts.get(key);
    if (!b) {
      // shadow casting is decided per material, not per call: fewer, larger meshes
      b = {
        mat,
        cast: !mat.userData.noCast,
        pos: [],
        nrm: [],
        uv: [],
        idx: [],
        col: flat ? [] : null,
        tint: null,
      };
      active.parts.set(key, b);
    }
    b.tint = flat ? flat.color : null;
    return b;
  }
  // vertex colours for the n vertices just pushed into a shared flat bucket
  function paint(b, n) {
    if (!b.col) return;
    const c = b.tint;
    for (let i = 0; i < n; i++) b.col.push(c.r, c.g, c.b);
  }
  // Runs fn with all geometry going into a separate named group (kept as its own set of meshes).
  function into(name, fn) {
    const prev = active;
    active = batches.get(name) || group(name);
    try {
      return fn();
    } finally {
      active = prev;
    }
  }
  function flush(name, parent, o = {}) {
    const g = batches.get(name);
    const root = new THREE.Group();
    root.name = "ct-" + name;
    let tris = 0;
    if (g)
      for (const b of g.parts.values()) {
        if (!b.idx.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(b.pos, 3),
        );
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(b.nrm, 3));
        geo.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
        if (b.col)
          geo.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
        geo.setIndex(
          b.pos.length / 3 > 65535
            ? new THREE.Uint32BufferAttribute(b.idx, 1)
            : new THREE.Uint16BufferAttribute(b.idx, 1),
        );
        geo.computeBoundingSphere();
        geo.computeBoundingBox();
        const mesh = new THREE.Mesh(geo, b.mat);
        const lit = !b.mat.isMeshBasicMaterial;
        mesh.castShadow =
          b.cast && lit && !b.mat.transparent && o.cast !== false;
        mesh.receiveShadow = lit;
        mesh.matrixAutoUpdate = false;
        // merged in world space and never moved: drawn once into the cached shadow map
        mesh.userData.staticShadow = true;
        // small stuff is left out of the wet-street reflection pass (layer 2 = main view only)
        if (b.mat.userData.noReflect) mesh.layers.set(2);
        if (o.renderOrder) mesh.renderOrder = o.renderOrder;
        root.add(mesh);
        tris += b.idx.length / 3;
      }
    batches.delete(name);
    if (parent) parent.add(root);
    root.userData.tris = tris;
    return root;
  }

  // ---------- primitives ----------
  const _v = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _nm = new THREE.Matrix3();
  // p0..p3 counter-clockwise seen from the front. uv: optional [u0,v0,u1,v1,u2,v2,u3,v3].
  function quad(mat, p0, p1, p2, p3, uv, o = {}) {
    const b = bucket(mat, (p0[0] + p2[0]) / 2, (p0[2] + p2[2]) / 2);
    const ax = p1[0] - p0[0],
      ay = p1[1] - p0[1],
      az = p1[2] - p0[2];
    const bx = p3[0] - p0[0],
      by = p3[1] - p0[1],
      bz = p3[2] - p0[2];
    let nx = ay * bz - az * by,
      ny = az * bx - ax * bz,
      nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const i = b.pos.length / 3;
    b.pos.push(
      p0[0],
      p0[1],
      p0[2],
      p1[0],
      p1[1],
      p1[2],
      p2[0],
      p2[1],
      p2[2],
      p3[0],
      p3[1],
      p3[2],
    );
    b.nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
    if (uv) b.uv.push(uv[0], uv[1], uv[2], uv[3], uv[4], uv[5], uv[6], uv[7]);
    else {
      // planar, in metres: along the first edge and along the edge leaving the first corner
      const la = Math.hypot(ax, ay, az),
        lb = Math.hypot(bx, by, bz);
      const dom = Math.abs(ny) > 0.7 ? 1 : 0;
      const u0 = dom ? p0[0] : Math.abs(nx) > Math.abs(nz) ? p0[2] : p0[0];
      const v0 = dom ? p0[2] : p0[1];
      b.uv.push(u0, v0, u0 + la, v0, u0 + la, v0 + lb, u0, v0 + lb);
    }
    b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    paint(b, 4);
  }
  // Axis-aligned box with texture coordinates in world metres.
  // skip: letters of faces to leave out — w(-x) e(+x) n(-z) s(+z) t(top) b(bottom).
  function box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    // An explicit empty string keeps all six faces (e.g. a beam seen from below).
    const skip = o.skip ?? "b";
    const b = bucket(mat, (x0 + x1) / 2, (z0 + z1) / 2);
    const ou = o.uo || 0,
      ov = o.vo || 0;
    const face = (
      ax,
      ay,
      az,
      bx,
      by,
      bz,
      cx,
      cy,
      cz,
      dx,
      dy,
      dz,
      nx,
      ny,
      nz,
      u0,
      v0,
      u1,
      v1,
    ) => {
      const i = b.pos.length / 3;
      b.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
      b.nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
      b.uv.push(
        u0 + ou,
        v0 + ov,
        u1 + ou,
        v0 + ov,
        u1 + ou,
        v1 + ov,
        u0 + ou,
        v1 + ov,
      );
      b.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
      paint(b, 4);
    };
    if (!skip.includes("e"))
      face(
        x1,
        y0,
        z1,
        x1,
        y0,
        z0,
        x1,
        y1,
        z0,
        x1,
        y1,
        z1,
        1,
        0,
        0,
        -z1,
        y0,
        -z0,
        y1,
      );
    if (!skip.includes("w"))
      face(
        x0,
        y0,
        z0,
        x0,
        y0,
        z1,
        x0,
        y1,
        z1,
        x0,
        y1,
        z0,
        -1,
        0,
        0,
        z0,
        y0,
        z1,
        y1,
      );
    if (!skip.includes("s"))
      face(
        x0,
        y0,
        z1,
        x1,
        y0,
        z1,
        x1,
        y1,
        z1,
        x0,
        y1,
        z1,
        0,
        0,
        1,
        x0,
        y0,
        x1,
        y1,
      );
    if (!skip.includes("n"))
      face(
        x1,
        y0,
        z0,
        x0,
        y0,
        z0,
        x0,
        y1,
        z0,
        x1,
        y1,
        z0,
        0,
        0,
        -1,
        -x1,
        y0,
        -x0,
        y1,
      );
    if (!skip.includes("t"))
      face(
        x0,
        y1,
        z1,
        x1,
        y1,
        z1,
        x1,
        y1,
        z0,
        x0,
        y1,
        z0,
        0,
        1,
        0,
        x0,
        -z1,
        x1,
        -z0,
      );
    if (!skip.includes("b"))
      face(
        x0,
        y0,
        z0,
        x1,
        y0,
        z0,
        x1,
        y0,
        z1,
        x0,
        y0,
        z1,
        0,
        -1,
        0,
        x0,
        z0,
        x1,
        z1,
      );
  }
  // Any THREE geometry, transformed into place. uvScale multiplies its own coordinates
  // (e.g. [circumference, height] turns a cylinder's 0..1 mapping into metres).
  function add(mat, geo, matrix, o = {}) {
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const e = matrix ? matrix.elements : null;
    const cx = e ? e[12] : 0,
      cz = e ? e[14] : 0;
    const b = bucket(mat, o.cx ?? cx, o.cz ?? cz);
    const i0 = b.pos.length / 3;
    if (matrix) _nm.getNormalMatrix(matrix);
    const su = o.uvScale ? o.uvScale[0] : 1,
      sv = o.uvScale ? o.uvScale[1] : 1;
    const uo = o.uvOffset ? o.uvOffset[0] : 0,
      vo = o.uvOffset ? o.uvOffset[1] : 0;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      if (matrix) _v.applyMatrix4(matrix);
      b.pos.push(_v.x, _v.y, _v.z);
      if (nrm) {
        _n.fromBufferAttribute(nrm, i);
        if (matrix) _n.applyMatrix3(_nm).normalize();
        b.nrm.push(_n.x, _n.y, _n.z);
      } else b.nrm.push(0, 1, 0);
      if (uv) b.uv.push(uv.getX(i) * su + uo, uv.getY(i) * sv + vo);
      else b.uv.push(_v.x, _v.z);
    }
    paint(b, pos.count);
    const flip = matrix ? matrix.determinant() < 0 : false;
    if (geo.index) {
      const ix = geo.index;
      for (let i = 0; i < ix.count; i += 3) {
        if (flip)
          b.idx.push(i0 + ix.getX(i), i0 + ix.getX(i + 2), i0 + ix.getX(i + 1));
        else
          b.idx.push(i0 + ix.getX(i), i0 + ix.getX(i + 1), i0 + ix.getX(i + 2));
      }
    } else
      for (let i = 0; i < pos.count; i += 3) {
        if (flip) b.idx.push(i0 + i, i0 + i + 2, i0 + i + 1);
        else b.idx.push(i0 + i, i0 + i + 1, i0 + i + 2);
      }
  }
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3();
  const _p = new THREE.Vector3();
  function xform(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    return new THREE.Matrix4().compose(
      _p.set(x, y, z),
      _q.setFromEuler(_e.set(rx, ry, rz, "YXZ")),
      _s.set(sx, sy, sz),
    );
  }
  // Upright cylinder / cone / post. axis: "y" (default), "x" or "z".
  const cylCache = new Map();
  function cyl(mat, x, y, z, r, h, o = {}) {
    const seg = o.seg || 12;
    const rt = o.rTop ?? r;
    const key = seg + "|" + (o.open ? 1 : 0);
    let geo = cylCache.get(key);
    if (!geo) {
      geo = new THREE.CylinderGeometry(1, 1, 1, seg, 1, !!o.open);
      cylCache.set(key, geo);
    }
    let g = geo;
    if (rt !== r) g = new THREE.CylinderGeometry(rt, r, 1, seg, 1, !!o.open);
    const sxz = rt !== r ? 1 : r;
    const m =
      o.axis === "x"
        ? xform(x + h / 2, y, z, 0, 0, -Math.PI / 2, sxz, h, sxz)
        : o.axis === "z"
          ? xform(x, y, z + h / 2, Math.PI / 2, 0, 0, sxz, h, sxz)
          : xform(x, y + h / 2, z, 0, o.yaw || 0, 0, sxz, h, sxz);
    add(mat, g, m, {
      uvScale: [Math.max(0.5, Math.round(2 * Math.PI * Math.max(r, rt))), h],
      cast: o.cast,
      cx: x,
      cz: z,
    });
  }
  // Thin rod between two points (cables, rails, braces).
  function rod(mat, a, b, r = 0.02, o = {}) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return;
    const seg = o.seg || 5;
    const key = seg + "|0";
    let geo = cylCache.get(key);
    if (!geo) {
      geo = new THREE.CylinderGeometry(1, 1, 1, seg, 1, false);
      cylCache.set(key, geo);
    }
    _q.setFromUnitVectors(
      _v.set(0, 1, 0),
      _n.set(dx / len, dy / len, dz / len),
    );
    _m.compose(
      _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2),
      _q,
      _s.set(r, len, r),
    );
    add(mat, geo, _m, { uvScale: [1, len], cast: o.cast ?? false });
  }
  // Hanging cable between two points with a given sag.
  function cable(mat, a, b, sag = 0.4, r = 0.012, n = 8) {
    let prev = a;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const p = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t),
        a[2] + (b[2] - a[2]) * t,
      ];
      rod(mat, prev, p, r, { seg: 4 });
      prev = p;
    }
  }
  function cablePoint(a, b, sag, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t),
      a[2] + (b[2] - a[2]) * t,
    ];
  }

  // ---------- collision ----------
  const solid = (x0, y0, z0, x1, y1, z1, surface = "concrete", o = {}) =>
    G.physics.addBox([x0, y0, z0], [x1, y1, z1], { surface, ...o });

  // ---------- GLB props ----------
  async function loadProps(ids) {
    await Promise.all(
      ids.map(async (id) => {
        if (props.has(id)) return;
        try {
          const gltf = await gltfLoader.loadAsync(base + PROPS + id + ".glb");
          gltf.scene.updateMatrixWorld(true);
          props.set(id, gltf.scene);
        } catch (err) {
          console.warn(`[chinatown] prop "${id}" failed to load`, err);
          props.set(id, null);
        }
      }),
    );
  }
  // GLB exports bring MeshPhysicalMaterial. None of the props use clearcoat, sheen or
  // iridescence, so they become plain standard materials (a cheaper shader). Transmission is
  // the expensive one: any transmissive mesh in view makes three.js re-render every opaque
  // object into an extra multisampled target each frame, so glass becomes simple alpha glass.
  function standardOf(src) {
    if (!src.isMeshPhysicalMaterial) return src.clone();
    // the standard copy() takes only the standard fields
    const m = new THREE.MeshStandardMaterial().copy(src);
    if (src.transmission > 0) {
      m.transparent = true;
      m.opacity = Math.min(m.opacity, 0.35);
      m.depthWrite = false;
      m.roughness = Math.min(m.roughness, 0.15);
    }
    return m;
  }
  function propMaterial(src, o) {
    const key = src.uuid + (o.interior ? "i" : "") + (o.tint ?? "");
    let m = propMats.get(key);
    if (m) return m;
    m = standardOf(src);
    if (m.map) m.map.anisotropy = Math.min(4, aniso);
    if (o.tint !== undefined)
      m.color.multiply(new THREE.Color(o.tint)).multiplyScalar(o.gain ?? 1);
    if (m.isMeshStandardMaterial && !m.transparent)
      G.mats.adopt(m, {
        wet: WET[o.wet || "metal"],
        macro: [0, 0, 1, 0],
        interior: !!o.interior,
      });
    m.userData.oneCell = true;
    m.userData.noReflect = true;
    propMats.set(key, m);
    return m;
  }
  // Bakes a prop into the static batch. parts: array of top-level node names (default: all);
  // recentre: true moves the chosen parts so their footprint centre sits on (x, z) and their base on y.
  function prop(id, x, y, z, o = {}) {
    const scene = props.get(id);
    if (!scene) return null;
    const nodes = o.parts
      ? scene.children.filter((c) => o.parts.includes(c.name))
      : scene.children;
    if (!nodes.length) return null;
    const boxAll = new THREE.Box3();
    for (const n of nodes) boxAll.expandByObject(n);
    const s = o.scale ?? 1;
    const off = new THREE.Vector3();
    if (o.recentre !== false)
      off.set(
        -(boxAll.min.x + boxAll.max.x) / 2,
        -boxAll.min.y,
        -(boxAll.min.z + boxAll.max.z) / 2,
      );
    const place = xform(
      x,
      y,
      z,
      o.pitch || 0,
      o.yaw || 0,
      o.roll || 0,
      s,
    ).multiply(new THREE.Matrix4().makeTranslation(off.x, off.y, off.z));
    const mm = new THREE.Matrix4();
    for (const n of nodes)
      n.traverse((c) => {
        if (!c.isMesh) return;
        mm.multiplyMatrices(place, c.matrixWorld);
        add(propMaterial(c.material, o), c.geometry, mm, {
          cast: o.cast,
          cx: x,
          cz: z,
        });
      });
    const size = boxAll.getSize(new THREE.Vector3()).multiplyScalar(s);
    if (o.collide) {
      const cs = Math.abs(Math.cos(o.yaw || 0)),
        sn = Math.abs(Math.sin(o.yaw || 0));
      const hx = (size.x * cs + size.z * sn) / 2 - 0.04,
        hz = (size.x * sn + size.z * cs) / 2 - 0.04;
      const h = typeof o.collide === "number" ? o.collide : size.y;
      solid(
        x - hx,
        y,
        z - hz,
        x + hx,
        y + h,
        z + hz,
        o.surface || "metal",
        o.colOpts || {},
      );
    }
    return size;
  }
  // A live (not merged) copy, for things that move.
  function propObject(id, o = {}) {
    const scene = props.get(id);
    if (!scene) return null;
    const root = new THREE.Group();
    const nodes = o.parts
      ? scene.children.filter((c) => o.parts.includes(c.name))
      : scene.children;
    for (const n of nodes) root.add(n.clone(true));
    root.traverse((c) => {
      if (!c.isMesh) return;
      c.material = propMaterial(c.material, o);
      c.castShadow = o.cast !== false;
      c.receiveShadow = true;
    });
    return root;
  }

  // deterministic random
  let seed = 20261111;
  const rnd = (a = 1, b) => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return b === undefined ? r * a : a + (b - a) * r;
  };
  const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];
  const reseed = (s) => (seed = s | 0);

  return {
    G,
    THREE,
    loadSurfaces,
    loadProps,
    pbr,
    flat,
    game,
    glow,
    glowMap,
    painted,
    into,
    flush,
    quad,
    box,
    add,
    cyl,
    rod,
    cable,
    cablePoint,
    xform,
    solid,
    prop,
    propObject,
    hasProp: (id) => !!props.get(id),
    rnd,
    pick,
    reseed,
    aniso,
  };
}
