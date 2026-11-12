// The kit handed to every weapon builder: geometry primitives, the material library,
// canvas labels and the wrapper that turns a finished model into something the lab can drive.
import * as THREE from "three";
import * as geo from "./geo.js";
import { createMats } from "./mats.js";

export const FONT_KAI =
  '"LXGW WenKai TC","Kaiti SC","STKaiti","KaiTi","BiauKai","DFKai-SB",serif';
export const FONT_SONG =
  '"Noto Serif TC","Songti SC","STSong","SimSun","PMingLiU",serif';
export const FONT_HEI =
  '"PingFang SC","Heiti SC","Microsoft YaHei","Noto Sans SC",sans-serif';
export const FONT_MONO = '"IBM Plex Mono","SF Mono",Menlo,Consolas,monospace';

export function createKit() {
  const mats = createMats();
  const texCache = new Map();

  /** Canvas texture. draw(g, W, H) paints it; key caches by name. */
  function canvas(key, W, H, draw, { srgb = true } = {}) {
    if (key && texCache.has(key)) return texCache.get(key);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    draw(g, W, H);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    if (key) texCache.set(key, t);
    return t;
  }

  function labelMaterial(tex, o = {}) {
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: o.opaque ? false : true,
      alphaTest: o.opaque ? 0 : 0.02,
      roughness: o.rough ?? 0.6,
      metalness: o.metal ?? 0,
      side: o.double ? THREE.DoubleSide : THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: !!o.opaque,
    });
    if (o.glow) {
      m.emissive.set(o.glowColor ?? 0xffffff);
      m.emissiveMap = tex;
      m.emissiveIntensity = o.glow;
      m.userData.glow = o.glow;
      mats.glowMats.push(m);
    }
    return m;
  }

  /**
   * Flat label / engraving / sticker painted with a 2D canvas.
   *   label({ key, w, h, px, draw(g, W, H), face, at, rot, metal, rough, glow, glowColor, double, opaque })
   * face: which way the label looks: "x" (left side), "-x" (right side), "y" (top), "-y", "z" (front), "-z".
   * Text always reads upright for someone looking at that face ("y": for the shooter looking down).
   * spin turns the label within its own plane (radians).
   */
  function label(o) {
    const px = o.px || 256;
    const W = px,
      H = Math.max(8, Math.round((px * o.h) / o.w));
    const tex = canvas(o.key, W, H, o.draw);
    const g = new THREE.PlaneGeometry(o.w, o.h);
    const mesh = new THREE.Mesh(g, labelMaterial(tex, o));
    const face = o.face || "x";
    // PlaneGeometry faces +Z with canvas +X to its right and canvas top towards +Y.
    const orient = new THREE.Group();
    if (face === "x") orient.rotation.y = Math.PI / 2;
    else if (face === "-x") orient.rotation.y = -Math.PI / 2;
    else if (face === "y") orient.rotation.set(-Math.PI / 2, 0, Math.PI);
    else if (face === "-y") orient.rotation.x = Math.PI / 2;
    else if (face === "-z") orient.rotation.y = Math.PI;
    mesh.rotation.z = o.spin || 0;
    orient.add(mesh);
    const holder = new THREE.Group();
    holder.add(orient);
    if (o.at) holder.position.set(o.at[0], o.at[1], o.at[2]);
    if (o.rot) holder.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    holder.name = "label:" + (o.key || "");
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return holder;
  }

  /**
   * Label wrapped round a cylinder whose axis is Z (paper wrappers, tape, engraved bands).
   *   wrap({ key, r, z0, z1, px, draw, arc: [start, length], repeat, ... })
   * Canvas X runs around the tube, canvas Y runs from the muzzle end (top) to the breech end.
   */
  function wrap(o) {
    const len = Math.abs(o.z1 - o.z0);
    const arc = o.arc || [0, Math.PI * 2];
    const px = o.px || 512;
    const W = px,
      H = Math.max(8, Math.round((px * len) / (o.r * arc[1])));
    const tex = canvas(o.key, W, Math.min(2048, H), o.draw);
    tex.wrapS = THREE.RepeatWrapping;
    if (o.repeat) tex.repeat.x = o.repeat;
    const g = new THREE.CylinderGeometry(
      o.r,
      o.r2 ?? o.r,
      len,
      o.seg || 32,
      1,
      true,
      arc[0],
      arc[1],
    );
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, (o.z0 + o.z1) / 2);
    const mat = labelMaterial(tex, { ...o, opaque: o.opaque ?? true });
    mat.polygonOffset = false;
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = !!o.opaque;
    mesh.receiveShadow = true;
    const holder = new THREE.Group();
    holder.add(mesh);
    if (o.at) holder.position.set(o.at[0], o.at[1], o.at[2]);
    if (o.rot) holder.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    return holder;
  }

  /**
   * Wrap a finished model for the lab.
   *   weapon({
   *     id, root,                      // THREE.Group in gun space
   *     anchors: { muzzle: [x,y,z] | { base, a, b } | { parent: node, at: [x,y,z] }, eject: ..., ... },
   *     update(s, dt),                 // drive moving parts, see README for the fields of `s`
   *     hands: { right: grip, left: grip | null } | (branch) => ({ right, left }),
   *       grip = { at: [x,y,z],        // where the middle of the palm touches the weapon
   *                palm: [x,y,z],      // which way the palm faces (towards the weapon)
   *                fingers: [x,y,z],   // which way the fingers would point if held straight
   *                pose: "pistol" | "cradle" | "wrap" | { base, r, index, thumb, ... },  // see kit/hands.js
   *                trigger: true,      // index finger follows the trigger
   *                parent: node,       // ride a moving part (pump, lever, bolt handle)
   *                elbow: [x,y,z] }    // optional elbow position in view space
   *     view: { hip: { pos, rot }, ads: { pos, rot } },   // camera-space pose of the gun origin
   *     show: { yaw, pitch, dist, target: [x,y,z] },      // default showcase framing
   *   })
   * Nodes anywhere under root may set userData.only = "base" | "a" | "b" | "a,b" ... to appear only for those branches.
   */
  function weapon(def) {
    const root = def.root;
    const holder = new THREE.Group();
    holder.name = `weapon:${def.id}`;
    holder.rotation.y = Math.PI; // gun +Z -> camera -Z
    holder.add(root);
    const anchors = {};
    const anchorDefs = def.anchors || {};
    for (const [name, a] of Object.entries(anchorDefs)) {
      const o = new THREE.Object3D();
      o.name = `anchor:${name}`;
      (a && a.parent ? a.parent : root).add(o);
      anchors[name] = o;
    }
    // hand grips: one anchor per hand, re-read whenever the branch changes
    const grips = { right: null, left: null };
    const gripAnchors = {
      right: new THREE.Object3D(),
      left: new THREE.Object3D(),
    };
    const _x = new THREE.Vector3(),
      _y = new THREE.Vector3(),
      _z = new THREE.Vector3(),
      _basis = new THREE.Matrix4();
    const altAnchors = [];
    const aim = (o, g) => {
      o.position.set(g.at[0], g.at[1], g.at[2]);
      // hand space: +Z along the fingers, -Y out of the palm
      _z.set(...(g.fingers || [0, 0, 1])).normalize();
      _y.set(...(g.palm || [0, -1, 0])).negate();
      _y.addScaledVector(_z, -_y.dot(_z)).normalize();
      _x.crossVectors(_y, _z);
      o.quaternion.setFromRotationMatrix(_basis.makeBasis(_x, _y, _z));
    };
    function setGrips(b) {
      const spec = typeof def.hands === "function" ? def.hands(b) : def.hands;
      for (const o of altAnchors.splice(0)) o.removeFromParent();
      for (const side of ["right", "left"]) {
        const g = spec && spec[side];
        const o = gripAnchors[side];
        if (!g) {
          grips[side] = null;
          o.removeFromParent();
          continue;
        }
        o.name = `grip:${side}`;
        (g.parent || root).add(o);
        aim(o, g);
        // second grips this hand can move to (see README): alts: { mag: { parent, at, palm, fingers, pose } }
        const alts = {};
        for (const [name, a] of Object.entries(g.alts || {})) {
          const ao = new THREE.Object3D();
          ao.name = `grip:${side}:${name}`;
          (a.parent || root).add(ao);
          aim(ao, a);
          altAnchors.push(ao);
          alts[name] = { anchor: ao, pose: a.pose || "wrap" };
        }
        grips[side] = {
          anchor: o,
          pose: g.pose || "wrap",
          trigger: !!g.trigger,
          elbow: g.elbow || null,
          away: 0,
          alts,
          to: null,
          mix: 0,
          spec: g,
        };
      }
    }
    let branch = "base";
    function setBranch(b) {
      branch = b === "a" || b === "b" ? b : "base";
      setGrips(branch);
      root.traverse((n) => {
        if (n.userData.only)
          n.visible = n.userData.only.split(",").includes(branch);
      });
      for (const [name, a] of Object.entries(anchorDefs)) {
        const v = Array.isArray(a) ? a : a.at || a[branch] || a.base;
        if (v) anchors[name].position.set(v[0], v[1], v[2]);
        const r = !Array.isArray(a) && a.rot;
        if (r) anchors[name].rotation.set(r[0], r[1], r[2]);
      }
      def.onBranch && def.onBranch(branch);
    }
    let tris = 0,
      meshes = 0;
    root.traverse((n) => {
      if (n.isMesh) {
        meshes++;
        const g = n.geometry;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      }
    });
    const model = {
      id: def.id,
      root,
      holder,
      anchors,
      /** { right, left }: each null or { anchor, pose, trigger, away } — update() may change pose / away / the anchor. */
      grips,
      /** true: the weapon animates its own reload (hands included); the lab adds nothing. */
      ownReload: !!def.ownReload,
      view: def.view || {},
      show: def.show || {},
      info: { tris: Math.round(tris), meshes },
      get branch() {
        return branch;
      },
      setBranch,
      update(s, dt) {
        def.update && def.update(s, dt);
      },
    };
    setBranch("base");
    return model;
  }

  /** Mark a node so it only shows for the given branches: only(node, "a") / only(node, "base,b"). */
  function only(node, branches) {
    node.userData.only = branches;
    return node;
  }

  return {
    THREE,
    mats,
    ...geo,
    M: () => geo.mesher(mats),
    canvas,
    label,
    wrap,
    weapon,
    only,
    FONT_KAI,
    FONT_SONG,
    FONT_HEI,
    FONT_MONO,
  };
}
