// The docks (the second stage) are the original harbor level, built by the original code.
// What the run needs on top of it is added here: after the level is built, before the
// collision world and the navigation grid are.
import { placeDockSupplies } from "./supplies.js";

export function prepareDocks(G, level) {
  level.supplySites = placeDockSupplies(G, level);
  openQuay(G);
  return level;
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
