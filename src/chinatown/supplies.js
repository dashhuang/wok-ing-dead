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
