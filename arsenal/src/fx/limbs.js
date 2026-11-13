// Dismemberment: what comes off a rigged body, the piece that flies, and the torn end that
// is left. Shared by the game's zombies (src/chinatown/zombies.js, armory.js) and the lab's
// stand-ins (combat/targets.js); which limb goes, and when, is the weapons' rule
// (combat/fate.js).
//
// A limb comes off in three parts:
//   - on the body, the bone it hangs from is shrunk to nothing, so everything skinned to it
//     and below closes up at the joint (the owner of the rig does that: LIMBS names the bone);
//   - a cap of torn flesh and a nub of bone is put over the end that is left (stump());
//   - the limb itself, cut out of the body's own mesh once and kept (of()), is thrown as a
//     rigid piece that tumbles, bounces and lies in the street for a while (toss()).
import * as THREE from "three";

/** Where a body comes apart: the bone that goes, with everything below it. */
export const LIMBS = {
  head: "Head",
  lFore: "LeftForeArm",
  rFore: "RightForeArm",
  lArm: "LeftArm",
  rArm: "RightArm",
  lShin: "LeftLeg",
  rShin: "RightLeg",
  lLeg: "LeftUpLeg",
  rLeg: "RightUpLeg",
};
/** What goes with what: a whole arm takes its forearm, a whole leg its shin. */
export const WITH = {
  lArm: "lFore",
  rArm: "rFore",
  lLeg: "lShin",
  rLeg: "rShin",
};

const GRAVITY = 12;
const MAX_PIECES = 22;
const LIE = 12; // seconds a piece lies in the street before it sinks away

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const ONE = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

// The limb below `boneName` as loose geometry in that bone's own space, one part for each of
// the body's meshes that reaches into it. Also how thick the body is where it is cut.
function cutOut(scene, boneName) {
  const parts = [];
  let meshIndex = -1;
  let radius = 0;
  let rim = 0;
  let reach = 0;
  scene.traverse((m) => {
    if (!m.isMesh) return;
    meshIndex++;
    if (!m.isSkinnedMesh) return;
    const bones = m.skeleton.bones;
    const cut = bones.findIndex((b) => b.name === boneName);
    if (cut < 0) return;
    const under = bones.map((b) => {
      for (let p = b; p && p.isBone; p = p.parent)
        if (p === bones[cut]) return true;
      return false;
    });
    const g = m.geometry;
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const si = g.attributes.skinIndex;
    const sw = g.attributes.skinWeight;
    // mesh space at rest -> the bone's own space
    const toBone = new THREE.Matrix4().multiplyMatrices(
      m.skeleton.boneInverses[cut],
      m.bindMatrix,
    );
    const turn = new THREE.Matrix3().setFromMatrix4(toBone);
    const count = pos.count;
    // how much of each vertex belongs to the limb
    const share = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let s = 0;
      for (let k = 0; k < 4; k++)
        if (under[si.getComponent(i, k)]) s += sw.getComponent(i, k);
      share[i] = s;
      if (s > 0.3 && s < 0.7) {
        _v.fromBufferAttribute(pos, i).applyMatrix4(toBone);
        radius += Math.hypot(_v.x, _v.z); // (these bones run along their own +Y)
        rim++;
      }
    }
    const index = g.index;
    const corners = index ? index.count : count;
    const map = new Int32Array(count).fill(-1);
    const P = [];
    const N = [];
    const U = [];
    const I = [];
    for (let t = 0; t < corners; t += 3) {
      const a = index ? index.getX(t) : t;
      const b = index ? index.getX(t + 1) : t + 1;
      const c = index ? index.getX(t + 2) : t + 2;
      if (!(share[a] > 0.5 && share[b] > 0.5 && share[c] > 0.5)) continue;
      for (const v of [a, b, c]) {
        if (map[v] < 0) {
          map[v] = P.length / 3;
          _v.fromBufferAttribute(pos, v).applyMatrix4(toBone);
          P.push(_v.x, _v.y, _v.z);
          reach = Math.max(reach, _v.length());
          if (nor) {
            _n.fromBufferAttribute(nor, v).applyMatrix3(turn).normalize();
            N.push(_n.x, _n.y, _n.z);
          }
          if (uv) U.push(uv.getX(v), uv.getY(v));
        }
        I.push(map[v]);
      }
    }
    if (!I.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    if (N.length)
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    else geometry.computeVertexNormals();
    if (U.length)
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    geometry.setIndex(I);
    geometry.computeBoundingSphere();
    parts.push({ geometry, meshIndex });
  });
  return { parts, radius: rim ? radius / rim : 0, reach };
}

// A torn end, one unit across: a low dome of flesh with the bone standing out of the middle.
// It faces along +Y, the way the limb that is gone used to run.
function tornEnd() {
  const flesh = new THREE.SphereGeometry(
    1,
    10,
    4,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  )
    .scale(1, 0.4, 1)
    .toNonIndexed();
  const bone = new THREE.CylinderGeometry(0.2, 0.26, 0.62, 6)
    .translate(0, 0.3, 0)
    .toNonIndexed();
  const P = [];
  const N = [];
  const C = [];
  const add = (g, colour) => {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      P.push(p.getX(i), p.getY(i), p.getZ(i));
      N.push(n.getX(i), n.getY(i), n.getZ(i));
      const c = colour(p.getX(i), p.getY(i), p.getZ(i));
      C.push(c[0], c[1], c[2]);
    }
  };
  // (ragged: darker towards the rim, with a little of the pale of fat in it)
  add(flesh, (x, y, z) => {
    const r = Math.hypot(x, z);
    const k = 0.75 + 0.5 * Math.sin(x * 9.1 + z * 5.3 + y * 7);
    return [0.2 * k * (1.15 - 0.5 * r), 0.008 * k, 0.008 * k];
  });
  add(bone, (x, y) => (y > 0.5 ? [0.22, 0.02, 0.015] : [0.5, 0.44, 0.33]));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  return g;
}

/**
 * createLimbs({ scene, blood(pos, dir, k), splat(pos, size) })
 * scene: where thrown pieces are put. blood / splat: the effects a piece leaves as it goes
 * (a spurt in the air, a mark where it lands); either may be absent.
 */
export function createLimbs({ scene, blood, splat }) {
  const cache = new WeakMap(); // body -> Map(bone -> cutOut())
  const pieces = [];
  const endGeo = tornEnd();
  const endMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0,
  });
  endMat.userData.armKeep = true;

  function of(body, boneName) {
    let m = cache.get(body);
    if (!m) cache.set(body, (m = new Map()));
    let c = m.get(boneName);
    if (!c) m.set(boneName, (c = cutOut(body, boneName)));
    return c;
  }
  function drop(p) {
    scene.remove(p.group);
    const i = pieces.indexOf(p);
    if (i >= 0) pieces.splice(i, 1);
  }

  return {
    LIMBS,
    WITH,
    of,
    material: endMat,
    /** A torn end for what is left on the body, `radius` across (in the space it will be put in). */
    stump(radius) {
      const mesh = new THREE.Mesh(endGeo, endMat);
      mesh.scale.setScalar(radius);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      return mesh;
    },
    /**
     * Where a stump sits: over the joint of the bone that was shrunk away, facing the way
     * the limb ran. (The bone's own matrix is no use: it is the one that was shrunk.)
     */
    place(mesh, bone, radius) {
      _m.compose(bone.position, bone.quaternion, ONE);
      mesh.matrix.multiplyMatrices(bone.parent.matrixWorld, _m);
      mesh.matrix.scale(_s.setScalar(radius));
      mesh.matrixWorldNeedsUpdate = true;
    },
    /**
     * Throw the limb below `bone` of `body`.
     * o: { body (the rigged scene the limb is cut from), bone (its name), matrix (that bone's
     *      world matrix as it is now), materials ([material per mesh of the body, in order]),
     *      vel, spin (rad/s about a random axis), ground (height of the street under it),
     *      layer }
     * Returns the piece, or null if that body has nothing skinned to that bone.
     */
    toss(o) {
      const cut = of(o.body, o.bone);
      if (!cut.parts.length) return null;
      const group = new THREE.Group();
      for (const part of cut.parts) {
        const mesh = new THREE.Mesh(
          part.geometry,
          o.materials[part.meshIndex] || o.materials[0],
        );
        mesh.castShadow = true;
        group.add(mesh);
      }
      // the end it was torn off at: the same cap, turned to face back up the limb
      const end = new THREE.Mesh(endGeo, endMat);
      end.scale.setScalar(cut.radius * 1.05);
      end.rotation.x = Math.PI;
      group.add(end);
      o.matrix.decompose(group.position, group.quaternion, group.scale);
      if (o.layer !== undefined) group.traverse((n) => n.layers.set(o.layer));
      scene.add(group);
      const size = cut.reach * group.scale.y;
      const p = {
        group,
        vel: o.vel.clone(),
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize(),
        spin: o.spin ?? 9,
        ground: o.ground ?? 0,
        // (it lies on its side: about the thickness of the limb above the street)
        rest: Math.max(0.05, cut.radius * group.scale.y * 0.9),
        size,
        age: 0,
        lying: false,
        settle: null,
        bleed: 0,
        marked: false,
      };
      pieces.push(p);
      while (pieces.length > MAX_PIECES) drop(pieces[0]);
      return p;
    },
    update(dt) {
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        const g = p.group;
        p.age += dt;
        if (p.age > LIE) {
          g.position.y -= dt * 0.12;
          if (p.age > LIE + 3) drop(p);
          continue;
        }
        if (p.lying) {
          if (p.settle) {
            // roll over until it lies along the street
            p.settleT = Math.min(1, p.settleT + dt * 5);
            g.quaternion.slerp(p.settle, Math.min(1, dt * 12));
            if (p.settleT >= 1) p.settle = null;
          }
          continue;
        }
        p.vel.y -= GRAVITY * dt;
        g.position.addScaledVector(p.vel, dt);
        g.quaternion.premultiply(_q.setFromAxisAngle(p.axis, p.spin * dt));
        // it trails blood while it is in the air
        if (blood && p.age < 1.2 && (p.bleed -= dt) <= 0) {
          p.bleed = 0.035;
          blood(g.position, _v.copy(p.vel).multiplyScalar(-0.2), 0.5);
        }
        const floor = p.ground + p.rest;
        if (g.position.y <= floor && p.vel.y < 0) {
          g.position.y = floor;
          if (!p.marked && splat) {
            p.marked = true;
            splat(_v.set(g.position.x, p.ground, g.position.z), 0.5);
          }
          if (p.vel.y < -1.6) {
            p.vel.y *= -0.3;
            p.vel.x *= 0.55;
            p.vel.z *= 0.55;
            p.spin *= 0.5;
          } else {
            p.lying = true;
            // its long axis (the bone's +Y) down onto the street
            _v.copy(UP).applyQuaternion(g.quaternion);
            _n.set(_v.x, 0, _v.z);
            if (_n.lengthSq() < 1e-4) _n.set(1, 0, 0);
            _n.normalize();
            p.settle = new THREE.Quaternion()
              .setFromUnitVectors(_v, _n)
              .multiply(g.quaternion);
            p.settleT = 0;
          }
        }
      }
    },
    get count() {
      return pieces.length;
    },
    clear() {
      while (pieces.length) drop(pieces[0]);
    },
  };
}
