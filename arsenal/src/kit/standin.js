// A stand-in for a weapon whose real model is not the lab's to build: the game's own carbine
// and sidearm, which src/game.js makes (the lab does not import the game). It is a dark block
// with a muzzle, for the test bench to fire them from (arsenal/tools/balance.mjs); the
// showcase never lists it. A round leaves from the eye, so the shape changes nothing.
import * as THREE from "three";

const SIZES = {
  rifle: { len: 0.72, h: 0.07, view: [0.15, -0.16, -0.34] },
  pistol: { len: 0.2, h: 0.12, view: [0.12, -0.13, -0.3] },
};

export function standIn(kit, id) {
  const s = SIZES[id] || SIZES.rifle;
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, s.h, s.len),
    new THREE.MeshStandardMaterial({
      color: 0x1b1c20,
      roughness: 0.5,
      metalness: 0.6,
    }),
  );
  body.position.z = s.len / 2;
  root.add(body);
  return kit.weapon({
    id,
    root,
    anchors: { muzzle: [0, 0, s.len + 0.01] },
    hands: { right: null, left: null },
    view: { hip: { pos: s.view, rot: [0, 0, 0] } },
  });
}
