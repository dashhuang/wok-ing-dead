// Supply crates: fixed spots around the district where a run can stock ammunition.
// The crates are part of the static street; which of them hold anything is decided per run
// (see run.js), so the player has to look for the ones that are lit.

const CRATE_PARTS = [
  "old_military_crate_a",
  "old_military_crate_lid_a",
  "old_military_crate_latch_a",
  "old_military_crate_loop_a",
];

// x, z in metres; all on open ground with room to walk round them.
export const SUPPLY_SITES = [
  { id: "gate", x: -29.5, z: 0.8, yaw: 0.2 },
  { id: "alley_n", x: -18, z: -13, yaw: 1.4 },
  { id: "lane_n", x: 0.5, z: -26.6, yaw: 0.1 },
  { id: "market", x: 20, z: -3.5, yaw: 1.62 },
  { id: "temple", x: 14, z: 16.2, yaw: -0.3 },
  { id: "checkpoint", x: 27.5, z: 8.6, yaw: 1.2 },
  { id: "alley_s", x: -12, z: 23.2, yaw: 0.05 },
  { id: "lane_s", x: 1.2, z: 26.4, yaw: -0.15 },
  { id: "pavement_n", x: -14.5, z: 0.6, yaw: 0.05 },
  { id: "pavement_s", x: -22.5, z: 11.4, yaw: -0.1 },
  { id: "pavement_e", x: 17, z: 0.8, yaw: 0.12 },
  { id: "temple_e", x: 26.5, z: 15.8, yaw: 1.5 },
];

// The docks (the second stage) are built by the original level code, which knows nothing of
// supplies: the crates are separate objects there, set down before the collision world and
// the navigation grid are built. All on the open apron or the shed floor.
export const DOCK_SITES = [
  { id: "gate", x: -26.9, z: 2.7, yaw: 0.3 },
  { id: "yard_w", x: -16.7, z: 5.6, yaw: 1.5 },
  { id: "yard_s", x: -8.1, z: 15.4, yaw: 0.1 },
  { id: "mid_w", x: -10, z: -1.1, yaw: -0.2 },
  { id: "mid_e", x: 7.8, z: -1.5, yaw: 0.15 },
  { id: "stacks", x: 12.5, z: 8.4, yaw: 1.45 },
  { id: "quay_s", x: 11.6, z: 16.8, yaw: 0.05 },
  { id: "shed_w", x: -11.6, z: -18.6, yaw: 1.6, y: 0.03 },
  { id: "shed_n", x: 0.4, z: -25.4, yaw: 0.1, y: 0.03 },
  { id: "east_n", x: 20.2, z: -15.4, yaw: -0.1 },
  { id: "east_c", x: 25.3, z: -4.8, yaw: 1.4 },
  { id: "east_s", x: 26.8, z: 14.4, yaw: 0.2 },
];
const DOCK_CRATE = 0.55; // of a 1.1 m shipping crate

export function placeDockSupplies(G, level) {
  const V3 = G.THREE.Vector3;
  const sites = [];
  for (const [i, s] of DOCK_SITES.entries()) {
    const y = s.y || 0;
    let size = [0.6, 0.55, 0.5];
    try {
      const crate = G.props.build("crate_wood", { seed: 31 + i });
      const full = crate.userData.size || [1.1, 1, 0.9];
      size = full.map((v) => v * DOCK_CRATE);
      crate.scale.setScalar(DOCK_CRATE);
      crate.position.set(s.x, y, s.z);
      crate.rotation.y = s.yaw;
      (level.root || G.scene).add(crate);
      const cs = Math.abs(Math.cos(s.yaw)),
        sn = Math.abs(Math.sin(s.yaw));
      const hx = (size[0] * cs + size[2] * sn) / 2,
        hz = (size[0] * sn + size[2] * cs) / 2;
      G.physics.addBox(
        new V3(s.x - hx, y, s.z - hz),
        new V3(s.x + hx, y + size[1], s.z + hz),
        { surface: "wood" },
      );
    } catch (e) {
      console.warn("[supplies] dock crate " + s.id + " failed: " + e);
    }
    sites.push({
      id: s.id,
      pos: new V3(s.x, y, s.z),
      yaw: s.yaw,
      top: y + size[1],
      size,
    });
  }
  return sites;
}

// Bakes one crate per site into the static batch and returns where they stand.
// Crates are lower than the navigation step height, so the dead walk over them.
export function placeSupplies(ctx) {
  const { G, kit } = ctx;
  const V3 = G.THREE.Vector3;
  const sites = [];
  for (const s of SUPPLY_SITES) {
    let y = 0;
    try {
      y = G.physics.groundHeight(s.x, s.z, 2) || 0;
    } catch {
      y = 0;
    }
    const size = kit.prop("old_military_crate", s.x, y, s.z, {
      parts: CRATE_PARTS,
      yaw: s.yaw,
      scale: 1.4,
      collide: true,
    });
    sites.push({
      id: s.id,
      pos: new V3(s.x, y, s.z),
      yaw: s.yaw,
      top: y + (size ? size.y : 0.38),
      size: size ? [size.x, size.y, size.z] : [0.9, 0.38, 0.5],
    });
  }
  return sites;
}
