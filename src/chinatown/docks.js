// The docks (the second stage) are the original harbor level, built by the original code.
// What the run needs on top of it is added here: after the level is built, before the
// collision world and the navigation grid are.
import { placeDockSupplies } from "./supplies.js";
import { buildStove } from "./stove.js";

export function prepareDocks(G, level) {
  level.supplySites = placeDockSupplies(G, level);
  placeStoves(G, level);
  openQuay(G);
  return level;
}

// The original level has three relay cabinets where a run lights its stoves. Each cabinet
// goes (its model, and the boxes that made it solid) and a stove stands in its place; the
// objective keeps its position and gets the stove as the object whose state the game sets.
// level.stoves is what run.js animates (this stage has no updaters of its own).
function placeStoves(G, level) {
  const T = G.THREE;
  const V3 = T.Vector3;
  const std = (color, rough, metal, side) =>
    new T.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      side: side || T.FrontSide,
    });
  const mats = {
    steel: std(0x6b7175, 0.55, 0.75),
    dark: std(0x1c1f22, 0.6, 0.6),
    darkOpen: std(0x1c1f22, 0.6, 0.6, T.DoubleSide),
    paint: std(0xb8891c, 0.6, 0.2),
    flame: new T.MeshBasicMaterial({ color: 0xff8a2a }),
  };
  level.stoves = [];
  for (const o of level.objectives || []) {
    if (!o || !o.pos) continue;
    try {
      const { x, y, z } = o.pos;
      if (o.object) o.object.visible = false;
      const boxes = G.physics.boxes;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        const cx = (b.min.x + b.max.x) / 2,
          cz = (b.min.z + b.max.z) / 2;
        if (
          Math.hypot(cx - x, cz - z) < 0.9 &&
          b.max.x - b.min.x < 2 &&
          b.max.z - b.min.z < 2 &&
          b.min.y > y - 0.3 &&
          b.max.y < y + 2.7
        )
          boxes.splice(i, 1);
      }
      const st = buildStove(T, mats);
      st.group.position.set(x, y, z);
      (level.root || G.scene).add(st.group);
      G.physics.addBox(
        new V3(x - 0.6, y, z - 0.6),
        new V3(x + 0.6, y + 1.15, z + 0.6),
        { surface: "metal" },
      );
      o.object = st.group;
      level.stoves.push(st);
    } catch (e) {
      console.warn("[docks] stove at " + o.id + " failed: " + e);
    }
  }
}

// The way out is a pocket of the quay at the end of a corridor two metres wide, with a
// mooring bollard standing in it. A person walks past the bollard. The navigation grid keeps
// a body's width clear of everything solid, so to it the corridor is closed: the dead could
// not follow the player in (a place to stand and never be touched), and any that rose inside
// could not get out. The bollard stays solid; it just no longer counts for navigation.
function openQuay(G) {
  for (const b of G.physics.boxes)
    if (
      b.max.y <= 0.7 &&
      b.min.x > 28.5 &&
      b.max.x < 29.8 &&
      b.min.z > 15.8 &&
      b.max.z < 17
    )
      b.noNav = true;
}
