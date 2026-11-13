// The cook's hands: what is held in first person while a street stove's dish is being made.
//
//   wok   the wok taken off the fire for a toss: the left hand holds its near ear through a
//         folded towel (a Cantonese wok has two ears and no handle), the right works the ladle,
//         and the dish goes up and comes down again with every flip
//   pack  the finished dish being packed: ladled into a takeaway pail until it is heaped far
//         over the top, the flaps pressed down on it anyway, the order ticket slapped on, and
//         the lot dropped into a "thank you" bag
//
// Both are models of the arsenal's kit (kit.weapon), held by the armoury like a weapon, so
// the arms are the game's own and find the grips themselves. Nothing here knows the rules:
// run.js says how far along a toss or the packing is (setToss / setPack) and when fire comes
// off the wok (flare).
//
// Everything is laid out in the eye's own space: x to the right, y up, -z away, in metres.
//
// The grips are written so that each hand lies in line with its forearm. An arm comes in from
// its own shoulder, low and to the side, so a hand that is set square to what it holds (the
// way a handle is drawn on paper) ends up at a right angle to its forearm, which no wrist
// does. These directions were found by solving the arms for every moment a grip is held and
// keeping the one that bends the wrist least (under twenty-five degrees throughout).
import * as THREE from "three";

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
// 0 before a, 1 after b
const ramp = (t, a, b) => ease((t - a) / (b - a));
// values at given moments, eased from one to the next: keys = [[t, v], ...]
function keyed(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
    }
  return keys[keys.length - 1][1];
}

// the wok: a shallow cap of a sphere
const WOK = { r: 0.27, depth: 0.105, wall: 0.006 };
WOK.sphere = (WOK.r * WOK.r + WOK.depth * WOK.depth) / (2 * WOK.depth);
// height of the inside of the bowl at a distance from its middle (0 at the rim)
const bowlY = (d) =>
  -WOK.depth +
  WOK.sphere -
  Math.sqrt(Math.max(0, WOK.sphere * WOK.sphere - d * d)) +
  WOK.wall;
// where it is held: the middle of the rim, and how far it is tipped towards the cook
const HELD = { at: new V3(0.04, -0.185, -0.69), tip: 0.28 };
// the ear the towel is on: an angle round the rim (90 degrees is the point nearest the cook)
const EAR = (145 * Math.PI) / 180;
// What is in the wok: fried rice, the dish the street stove shows in its own wok. Grains of
// several shades (soy has not reached every one), and what is fried into it.
// (all a good deal darker than they are on a plate: the street is exposed for the night, and
// by the burner anything pale goes white)
const RICE = [0xc9ab66, 0xb8964a, 0xd6bc7c, 0xa98438, 0xc2a058];
const RICE_CORE = 0x9c7a34;
const BITS = [
  [0xd9a514, "egg"],
  [0xe0b422, "egg"],
  [0x8a2412, "pork"], // char siu, red at the edge
  [0x741c0e, "pork"],
  [0x3f8a22, "pea"],
  [0x2f7a22, "scallion"],
  [0x4c9a30, "scallion"],
  [0xc8600f, "carrot"],
  [0xd66a48, "shrimp"],
];

export function createWokHands(armory) {
  const kit = armory.kit;
  const fx = armory.fx;
  const P = fx.P;
  const cloth = kit.mats.variant("cloth_red", {
    color: 0xd9d4c6,
    edge: 0xf2efe6,
    dirtColor: 0x6a5a40,
  });
  // (not glossy: a shine on every spoonful of rice turns it into a row of buns)
  const food = kit.mats.variant("ceramic", {
    color: 0xffffff,
    rough: 0.74,
    dirt: 0.2,
    env: 0.4,
  });
  // A wok that has been seasoned for years: near black, no rust. Dull, and hardly a metal
  // to the renderer: with any gloss the inside of the bowl, seen at the shallow angle it is
  // held at, mirrored the burner and came out the colour of wood.
  const iron = kit.mats.variant("iron_cast", {
    color: 0x1f1c19,
    rough: 0.86,
    metal: 0.1,
    env: 0.3,
    edge: 0x4c4742,
    edgeAmt: 0.35,
    dirt: 0.15,
    dirtColor: 0x2a1c12,
    pAlbedo: 0.3,
  });
  const carton = kit.mats.variant("paper_yellow", {
    color: 0xe6e1d2,
    edge: 0xf6f3ea,
    dirtColor: 0x7a6a50,
  });
  const plastic = kit.mats.variant("enamel_white", {
    color: 0xe9e6dc,
    rough: 0.42,
    dirt: 0.15,
  });

  // Hundreds of small things make a dish, so each is as few triangles as will pass at arm's
  // length: a grain of rice is a stretched ball of sixteen.
  const ball = (r, sx = 1, sy = 1, sz = 1, w = 4, h = 3) => {
    const g = kit.adopt(new THREE.SphereGeometry(r, w, h));
    g.scale(sx, sy, sz);
    return g;
  };
  const block = (w, h, d) => kit.adopt(new THREE.BoxGeometry(w, h, d));
  function bit(kind, s) {
    if (kind === "egg") return block(0.024 * s, 0.009 * s, 0.018 * s);
    if (kind === "pork") return block(0.018 * s, 0.014 * s, 0.019 * s);
    if (kind === "carrot") return block(0.012 * s, 0.012 * s, 0.012 * s);
    if (kind === "pea") return ball(0.0075 * s, 1, 1, 1, 5, 4);
    if (kind === "shrimp") return ball(0.011 * s, 1.5, 0.8, 0.9, 5, 4);
    // scallion: a short cut of the green
    return kit.adopt(
      new THREE.CylinderGeometry(0.0062 * s, 0.0062 * s, 0.009 * s, 6),
    );
  }
  /**
   * A spoonful of the rice as it holds together: a core, grains all over it, and what was
   * fried into it showing on the upper side. One mesh (the colours are in the vertices).
   * grains, bits: how many of each; core: false for a few loose grains with nothing inside.
   */
  function lump(seed, s = 1, grains = 30, bits = 4, core = true) {
    let k = seed * 9301 + 49297;
    const rnd = () => ((k = (k * 233280 + 49297) % 233281), k / 233281);
    // half-extents of the core: wide and low, so that a heap of them runs together
    const R = [0.037 * s, 0.017 * s, 0.033 * s];
    const m = kit.M();
    // (the core is four knobs, not one ball: a spoonful of rice has no outline to speak of)
    const knobs = [];
    if (core)
      for (let i = 0; i < 4; i++) {
        const at = [
          (rnd() - 0.5) * R[0] * 1.1,
          (rnd() - 0.5) * R[1] * 0.7,
          (rnd() - 0.5) * R[2] * 1.1,
        ];
        const r = (0.5 + rnd() * 0.2) * R[2];
        knobs.push([at, r]);
        m.add(ball(r, 1, 0.62, 1, 5, 4), food, { at, color: RICE_CORE });
      }
    // a direction over the whole ball, or (up: true) over its upper half
    const on = (up) => {
      const a = rnd() * TAU;
      const y = up ? 0.25 + rnd() * 0.75 : rnd() * 2 - 1;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    // a point on the outside of the lump: on one of its knobs, or (no core) anywhere in it
    const outside = (up, far) => {
      const d = on(up);
      if (!core) {
        const k = rnd() * 0.9;
        return [d[0] * R[0] * k, d[1] * R[1] * k, d[2] * R[2] * k];
      }
      const [c, r] = knobs[Math.floor(rnd() * knobs.length)];
      return [
        c[0] + d[0] * r * far,
        c[1] + d[1] * r * 0.62 * far,
        c[2] + d[2] * r * far,
      ];
    };
    for (let i = 0; i < grains; i++)
      m.add(ball(0.0056 * s, 1, 1, 2.3), food, {
        // (standing well out of it: the grains are what the eye should find, not the core)
        at: outside(false, 0.95 + rnd() * 0.5),
        rot: [rnd() * TAU, rnd() * TAU, 0],
        color: RICE[Math.floor(rnd() * RICE.length)],
      });
    for (let i = 0; i < bits; i++) {
      const [color, kind] = BITS[Math.floor(rnd() * BITS.length)];
      m.add(bit(kind, s), food, {
        at: outside(core, 1.1),
        rot: [rnd() * TAU, rnd() * TAU, rnd() * TAU],
        color,
      });
    }
    return m.build("rice");
  }
  // What a dish is when it has been left on the fire until nothing of it is food: a few
  // black knobs fused together.
  function coal(seed, s = 1) {
    let k = seed * 9301 + 49297;
    const rnd = () => ((k = (k * 233280 + 49297) % 233281), k / 233281);
    const m = kit.M();
    for (let i = 0; i < 5; i++) {
      const r = (0.014 + rnd() * 0.012) * s;
      const g =
        rnd() < 0.4
          ? block(r * 1.5, r * 1.2, r * 1.4)
          : ball(r, 1, 0.8, 1, 5, 4);
      m.add(g, iron, {
        at: [
          (rnd() - 0.5) * 0.04 * s,
          (rnd() - 0.5) * 0.014 * s,
          (rnd() - 0.5) * 0.036 * s,
        ],
        rot: [rnd() * TAU, rnd() * TAU, rnd() * TAU],
      });
    }
    return m.build("coal");
  }
  // one of two things in the same place: the rice, or what is left of it charred
  const charable = [];
  function either(rice, char) {
    const g = new THREE.Group();
    g.add(rice, char);
    char.visible = false;
    charable.push((on) => {
      rice.visible = !on;
      char.visible = on;
    });
    return g;
  }
  // a ladle along its own +Z: wooden grip at the origin, the bowl at the far end
  function ladle() {
    const m = kit.M();
    m.add(kit.rod(0.011, -0.085, 0.045, { r: 0.004 }), "wood_dark");
    m.add(kit.rod(0.0048, 0.04, 0.34), "steel_bare");
    m.add(
      kit.lathe(
        [
          [-0.03, 0, 0.004],
          [-0.024, 0.03],
          [0, 0.046],
          [0.002, 0.046],
          [0.002, 0.042],
          [-0.02, 0.027],
          [-0.026, 0],
        ],
        { seg: 18 },
      ),
      "steel_bare",
      { at: [0, 0.028, 0.372], rot: [-Math.PI / 2 + 0.5, 0, 0] },
    );
    const g = m.build("ladle");
    g.rotation.order = "YXZ";
    return g;
  }
  const _x = new V3(),
    _y = new V3(),
    _z = new V3(),
    _m = new THREE.Matrix4(),
    _a = new V3(),
    _b = new V3(),
    _c = new V3();
  // The ladle is held the way a cook holds one: not across the fist like a hammer, but lying
  // slantwise from the heel of the hand out past the first finger, so it carries on the line
  // of the forearm.
  const LADLE_GRIP = (node) => ({
    parent: node,
    at: [0, 0.006, -0.02],
    palm: [-0.985, -0.174, 0],
    fingers: [-0.087, 0.492, 0.866],
    pose: {
      base: "wrap",
      r: 0.014,
      index: [0.5, 0.6, 0.35, 0.04],
      thumb: [0.5, -0.45, 0.75, 0.35, 0.25],
    },
    give: [0.3, 0.4],
  });
  // a hand under the rim of the wok: the fingers a little curled against the underside of
  // it, the thumb come over the top
  const UNDER = {
    base: "flat",
    index: [0.3, 0.36, 0.2, 0.03],
    middle: [0.32, 0.38, 0.22, 0],
    ring: [0.34, 0.4, 0.22, -0.03],
    pinky: [0.38, 0.42, 0.24, -0.08],
    thumb: [0.5, -0.62, 0.6, 0.5, 0.45],
  };
  // point a ladle from its grip at a spot (the bowl ends up there), the back of its bowl down
  function aimLadle(node, from, to, roll = 0) {
    _z.subVectors(to, from).normalize();
    _y.set(0, 1, 0).addScaledVector(_z, -_z.y).normalize();
    _x.crossVectors(_y, _z);
    node.position.copy(from);
    node.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
    if (roll) node.rotateZ(roll);
  }

  // ================================================================ the wok
  const toss = { frac: 0, flips: 3, tossed: false, age: 0, flash: 0 };
  const wok = (() => {
    const root = new THREE.Group();
    const view = new THREE.Group(); // the eye's space (the kit's holder faces the other way)
    view.rotation.y = Math.PI;
    root.add(view);
    const body = new THREE.Group(); // the wok and all that rides on it
    body.rotation.order = "YXZ";
    view.add(body);

    // the bowl: out along the underside, over the lip, back along the inside
    const prof = [];
    const N = 9;
    for (let i = 0; i <= N; i++) {
      const d = (WOK.r * i) / N;
      prof.push([bowlY(d) - WOK.wall, d]);
    }
    prof.push([0.004, WOK.r + 0.004, 0.003], [0.004, WOK.r - 0.008, 0.002]);
    for (let i = N - 1; i >= 0; i--) {
      const d = ((WOK.r - 0.008) * i) / N;
      prof.push([bowlY(d), d]);
    }
    const m = kit.M();
    // (wear 0: the curve of the bowl is not an edge for the seasoning to have rubbed off)
    m.add(kit.lathe(prof, { seg: 40 }), iron, {
      rot: [-Math.PI / 2, 0, 0],
      wear: 0,
    });
    // two ears, riveted on: one under the towel, one across from it
    for (const a of [EAR, EAR + Math.PI])
      m.add(
        kit.torus(0.034, 0.0055, { arc: Math.PI, around: 14, seg: 6 }),
        iron,
        {
          rot: [-0.5, Math.PI / 2 - a, 0],
          at: [Math.cos(a) * (WOK.r + 0.004), 0, Math.sin(a) * (WOK.r + 0.004)],
        },
      );
    body.add(m.build("wok"));

    // the towel: folded over the ear, a blue stripe along each edge
    const towel = new THREE.Group();
    towel.position.set(Math.cos(EAR) * WOK.r, 0, Math.sin(EAR) * WOK.r);
    towel.rotation.y = -EAR; // local +x points out from the middle of the wok
    {
      const t = kit.M();
      t.add(kit.box(0.1, 0.012, 0.15, { r: 0.005 }), cloth, {
        at: [0.012, 0.012, 0],
      });
      t.add(kit.box(0.014, 0.085, 0.15, { r: 0.005 }), cloth, {
        at: [0.056, -0.028, 0],
        rot: [0, 0, 0.12],
      });
      t.add(kit.box(0.012, 0.06, 0.14, { r: 0.004 }), cloth, {
        at: [-0.04, -0.012, 0],
        rot: [0, 0, 0.75],
      });
      for (const z of [-0.058, 0.058])
        t.add(kit.box(0.101, 0.0124, 0.012), cloth, {
          at: [0.012, 0.0122, z],
          color: 0x3d5fa8,
        });
      towel.add(t.build("towel"));
    }
    body.add(towel);

    // What is being cooked: a heap of spoonfuls in the middle of the bowl, and loose grains
    // round it. All of it flies when the wok is flipped: the heap as it lies, the loose
    // grains higher and wider.
    const bits = [];
    // (the heap: one in the middle, a ring round it, a wider ring under that, three on top)
    const HEAP = [[0, 0, 0]];
    for (let i = 0; i < 6; i++) HEAP.push([0.047, (i * TAU) / 6, 0.004]);
    for (let i = 0; i < 9; i++) HEAP.push([0.09, (i * TAU) / 9 + 0.3, 0]);
    for (let i = 0; i < 3; i++) HEAP.push([0.028, (i * TAU) / 3 + 0.5, 0.024]);
    HEAP.forEach(([d, a, up], i) => {
      const node = lump(i + 1, 1.1 - 1.2 * d, 34, 5);
      const rest = new V3(Math.cos(a) * d, 0, Math.sin(a) * d);
      rest.y = bowlY(d) + 0.014 + up;
      node.rotation.order = "YXZ";
      body.add(node);
      bits.push({
        node,
        rest,
        // (the far side of the heap leaves the wok first)
        lag: 0.03 + rest.z * 0.22 + (i % 3) * 0.008,
        high: 0.15 + 0.13 * ((i * 0.618) % 1) + up * 2,
        spin: 3 + ((i * 3.7) % 4),
        yaw: a * 3 + i,
        wide: 0.85,
      });
    });
    for (let i = 0; i < 14; i++) {
      const node = lump(60 + i, 1.5, 8, 1, false);
      const a = i * 2.39996;
      const d = 0.1 + 0.07 * ((i * 0.618) % 1);
      const rest = new V3(Math.cos(a) * d, 0, Math.sin(a) * d);
      rest.y = bowlY(d) + 0.006;
      node.rotation.order = "YXZ";
      body.add(node);
      bits.push({
        node,
        rest,
        lag: 0.02 + (i % 4) * 0.02,
        high: 0.3 + 0.16 * ((i * 0.618) % 1),
        spin: 7 + ((i * 3.7) % 6),
        yaw: a,
        wide: 0.55,
      });
    }
    const ld = ladle();
    view.add(ld);

    const gripAt = [
      Math.cos(EAR) * (WOK.r + 0.03),
      -0.018,
      Math.sin(EAR) * (WOK.r + 0.03),
    ];
    const model = kit.weapon({
      id: "wok",
      root,
      hands: {
        // under the towelled ear, palm up, the fingers running forward beneath the rim and
        // the thumb over the top of it: the way a tray is carried by its edge
        left: {
          parent: body,
          at: gripAt,
          palm: [0, 1, 0],
          fingers: [0, 0, -1],
          pose: UNDER,
          give: [0.35, 0.5],
        },
        right: LADLE_GRIP(ld),
      },
      anchors: {
        // where the fire comes off: the far lip
        flare: { parent: body, at: [0, 0.02, -WOK.r * 0.9] },
        steam: { parent: body, at: [0, 0.03, 0] },
      },
      view: { hip: { pos: [0, 0, 0], rot: [0, 0, 0] } },
      show: { yaw: -0.5, pitch: 0.5, dist: 1.4 },
      update(s, dt = 1 / 60) {
        toss.age += dt;
        toss.flash = Math.max(0, toss.flash - dt * 3);
        const f = clamp(toss.frac) * toss.flips;
        const i = Math.min(toss.flips - 1, Math.floor(f));
        // p: how far through this flip (the food leaves the wok at 0.45)
        const p = toss.tossed ? 1 : f - i;
        // taken up from the stove below
        const up = ease(toss.age / 0.28);
        // forward and down, then snatched back and up
        const fwd = keyed(p, [
          [0, 0],
          [0.36, 0.075],
          [0.54, -0.055],
          [1, 0],
        ]);
        const lift = keyed(p, [
          [0, 0],
          [0.36, -0.03],
          [0.54, 0.06],
          [1, 0],
        ]);
        const tip = keyed(p, [
          [0, 0],
          [0.36, -0.2],
          [0.52, 0.34],
          [1, 0],
        ]);
        const sway = Math.sin(toss.age * 2.3) * 0.006;
        body.position.set(
          HELD.at.x + sway,
          HELD.at.y + lift - (1 - up) * 0.42,
          HELD.at.z - fwd,
        );
        body.rotation.set(HELD.tip + tip, 0, sway * 2);
        for (const b of bits) {
          // slides to the far side, flies up and back, lands and settles
          const u = clamp((p - 0.45 - b.lag) / 0.4);
          const air = u > 0 && u < 1;
          const slide = air
            ? -0.07 + 0.1 * u
            : p < 0.5
              ? -0.07 * ease(p / 0.45)
              : 0.03 * (1 - ramp(p, 0.85, 1));
          // (in the air it draws together, and spreads again as it lands)
          const k = air ? 1 - (1 - b.wide) * 4 * u * (1 - u) : 1;
          b.node.position.set(
            b.rest.x * k,
            b.rest.y + (air ? b.high * 4 * u * (1 - u) : 0),
            b.rest.z * k + slide,
          );
          b.node.rotation.set(
            air ? u * b.spin : 0,
            b.yaw + (air ? u * 3 : 0),
            air ? u * b.spin * 0.6 : 0,
          );
        }
        // the ladle stirs between flips and gets out of the way of them
        const st = toss.age * 7;
        const out = keyed(p, [
          [0, 0],
          [0.3, 0],
          [0.5, 1],
          [0.8, 1],
          [1, 0],
        ]);
        _a.set(0.25 + out * 0.05, -0.185 + out * 0.05 - (1 - up) * 0.4, -0.4);
        // (it works the near side of the heap, and leaves the heap to be seen)
        _b.set(
          0.1 + Math.cos(st) * 0.03 * (1 - out) + out * 0.05,
          bowlY(0.11) + 0.035 + out * 0.11,
          0.045 + Math.sin(st) * 0.03 * (1 - out),
        );
        body.updateMatrix();
        _b.applyMatrix4(body.matrix);
        aimLadle(ld, _a, _b, 0.25);
      },
    });
    model.body = body;
    model.bits = bits;
    return model;
  })();

  // ================================================================ the same dish, on its stove
  // What the cook tosses is what fries: the heap of the wok in hand, laid out again for the
  // wok of the street stove (which is a different size: this is made for a bowl whose rim is
  // one unit from its middle, lowest point at the origin, and the stove scales it to its
  // own). It lies still but for the shiver of something frying (sizzle); charred, it is a
  // few lumps of coal instead.
  const frying = { t: 0, rice: [], coals: null };
  const dish = (() => {
    const g = new THREE.Group();
    g.name = "wok-dish";
    const inner = new THREE.Group();
    inner.scale.setScalar(1 / WOK.r);
    inner.position.y = (WOK.depth - WOK.wall) / WOK.r;
    g.add(inner);
    wok.bits.forEach((b, i) => {
      const node = b.node.clone();
      node.position.copy(b.rest);
      node.rotation.set(0, b.yaw, 0);
      inner.add(node);
      frying.rice.push({
        node,
        rest: b.rest.clone(),
        yaw: b.yaw,
        seed: i * 1.7,
      });
    });
    const coals = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const c = coal(120 + i, 1.7);
      const a = i * 2.39996;
      const d = i ? 0.03 + 0.05 * ((i * 0.618) % 1) : 0;
      c.position.set(Math.cos(a) * d, bowlY(d) + 0.014, Math.sin(a) * d);
      c.rotation.set(i, i * 2, i * 3);
      coals.add(c);
    }
    coals.visible = false;
    inner.add(coals);
    frying.coals = coals;
    g.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = false;
        n.receiveShadow = true;
      }
    });
    return g;
  })();

  // ================================================================ the packing
  const packing = { u: 0, age: 0 };
  const PAIL = { w0: 0.076, d0: 0.06, w1: 0.104, d1: 0.086, h: 0.098 };
  const pack = (() => {
    const root = new THREE.Group();
    const view = new THREE.Group();
    view.rotation.y = Math.PI;
    root.add(view);
    const all = new THREE.Group(); // comes up into view, and goes down again at the end
    view.add(all);
    const pail = new THREE.Group();
    pail.rotation.order = "YXZ";
    all.add(pail);
    // the pail: a paper box wider at the top (four leaning walls), a wire handle over it
    {
      const m = kit.M();
      const lean = (a, b, h) => Math.atan2((b - a) / 2, h);
      const t = 0.0025;
      const mw = (PAIL.w0 + PAIL.w1) / 2;
      const md = (PAIL.d0 + PAIL.d1) / 2;
      m.add(kit.box(PAIL.w0, t, PAIL.d0), carton, { at: [0, t / 2, 0] });
      for (const sgn of [-1, 1]) {
        m.add(kit.box(mw + 0.004, PAIL.h, t), carton, {
          at: [0, PAIL.h / 2, (sgn * md) / 2],
          rot: [sgn * lean(PAIL.d0, PAIL.d1, PAIL.h), 0, 0],
        });
        m.add(kit.box(t, PAIL.h, md + 0.004), carton, {
          at: [(sgn * mw) / 2, PAIL.h / 2, 0],
          rot: [0, 0, -sgn * lean(PAIL.w0, PAIL.w1, PAIL.h)],
        });
      }
      m.add(
        kit.sweep(
          [
            [-PAIL.w1 / 2, PAIL.h - 0.012, 0],
            [-PAIL.w1 / 2 - 0.012, PAIL.h + 0.05, 0],
            [0, PAIL.h + 0.085, 0],
            [PAIL.w1 / 2 + 0.012, PAIL.h + 0.05, 0],
            [PAIL.w1 / 2, PAIL.h - 0.012, 0],
          ],
          0.0012,
        ),
        "steel_bare",
      );
      pail.add(m.build("pail"));
      // the red pagoda every such pail has, and the house's thanks
      pail.add(
        kit.label({
          key: "wok-pail",
          w: 0.07,
          h: 0.075,
          px: 256,
          face: "z",
          at: [0, PAIL.h * 0.52, md / 2 + 0.004],
          rot: [lean(PAIL.d0, PAIL.d1, PAIL.h), 0, 0],
          draw(g, W, H) {
            g.clearRect(0, 0, W, H);
            g.fillStyle = "#b3180f";
            g.textAlign = "center";
            // a pagoda: three roofs, each narrower than the one below
            for (let i = 0; i < 3; i++) {
              const y = H * (0.5 - i * 0.14);
              const w = W * (0.3 - i * 0.07);
              g.beginPath();
              g.moveTo(W / 2 - w - 14, y);
              g.quadraticCurveTo(W / 2 - w, y - 6, W / 2 - w + 8, y - 14);
              g.lineTo(W / 2 + w - 8, y - 14);
              g.quadraticCurveTo(W / 2 + w, y - 6, W / 2 + w + 14, y);
              g.closePath();
              g.fill();
              g.fillRect(W / 2 - w * 0.7, y, w * 1.4, H * 0.085);
            }
            g.fillRect(W / 2 - 3, H * 0.1, 6, H * 0.14);
            g.font = `600 ${Math.round(H * 0.16)}px ${kit.FONT_SONG}`;
            g.fillText("謝謝惠顧", W / 2, H * 0.8);
            g.font = `600 ${Math.round(H * 0.09)}px ${kit.FONT_MONO}`;
            g.fillText("THANK YOU", W / 2, H * 0.93);
          },
        }),
      );
    }
    // the four flaps of its top, each hinged on its edge
    const flaps = [];
    for (const [ax, sgn] of [
      ["z", 1],
      ["z", -1],
      ["x", 1],
      ["x", -1],
    ]) {
      const hinge = new THREE.Group();
      const long = ax === "z";
      const w = long ? PAIL.w1 : PAIL.d1;
      const reach = (long ? PAIL.d1 : PAIL.w1) * 0.52;
      const m = kit.M();
      m.add(kit.box(long ? w : 0.002, reach, long ? 0.002 : w), carton, {
        at: [0, reach / 2, 0],
      });
      hinge.add(m.build("flap"));
      hinge.position.set(
        long ? 0 : (sgn * PAIL.w1) / 2,
        PAIL.h,
        long ? (sgn * PAIL.d1) / 2 : 0,
      );
      pail.add(hinge);
      flaps.push({ hinge, long, sgn });
    }
    // what goes into it: more than it holds
    const heap = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const c = either(lump(40 + i, 1.25, 30, 5), coal(40 + i, 1.3));
      const a = i * 2.39996;
      const d = i ? 0.024 : 0;
      c.position.set(Math.cos(a) * d, 0.016 + i * 0.013, Math.sin(a) * d);
      c.rotation.set(i, i * 2, i * 3);
      heap.add(c);
    }
    heap.position.y = 0.02;
    pail.add(heap);
    // a ladleful on its way, and one that missed
    const load = either(lump(77, 1.3, 34, 5), coal(77, 1.3));
    const stray = either(lump(91, 1, 5, 1, false), coal(91, 0.5));
    all.add(load, stray);
    const ld = ladle();
    all.add(ld);
    // the order ticket, with the kitchen's chop on it
    const ticket = kit.label({
      key: "wok-ticket",
      w: 0.044,
      h: 0.06,
      px: 256,
      face: "z",
      opaque: true,
      double: true,
      at: [0, 0, 0],
      draw(g, W, H) {
        g.fillStyle = "#efe9d8";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#2a2622";
        g.textAlign = "left";
        g.font = `700 ${Math.round(H * 0.12)}px ${kit.FONT_HEI}`;
        g.fillText("外賣單", W * 0.08, H * 0.15);
        g.font = `500 ${Math.round(H * 0.075)}px ${kit.FONT_MONO}`;
        g.fillText("NO. 0413", W * 0.08, H * 0.26);
        g.fillRect(W * 0.08, H * 0.3, W * 0.84, 2);
        for (let i = 0; i < 4; i++)
          g.fillRect(W * 0.08, H * (0.38 + i * 0.085), W * (0.7 - i * 0.12), 5);
        // the chop, a little crooked
        g.save();
        g.translate(W * 0.6, H * 0.76);
        g.rotate(-0.22);
        g.strokeStyle = g.fillStyle = "#b3180f";
        g.lineWidth = 5;
        g.strokeRect(-W * 0.3, -H * 0.11, W * 0.6, H * 0.22);
        g.textAlign = "center";
        g.font = `700 ${Math.round(H * 0.14)}px ${kit.FONT_KAI}`;
        g.fillText("趁熱", 0, H * 0.05);
        g.restore();
      },
    });
    const ticketAt = new THREE.Group();
    // (on a corner of the front, askew: the pagoda still shows beside it)
    ticketAt.position.set(0.026, PAIL.h * 0.7, (PAIL.d0 + PAIL.d1) / 4 + 0.011);
    ticketAt.rotation.set(0.14, 0, 0.22);
    ticketAt.add(ticket);
    pail.add(ticketAt);
    // the bag: white, red print, two loops to carry it by
    const bag = new THREE.Group();
    const BAG = { w: 0.19, h: 0.15, d: 0.12 };
    {
      const m = kit.M();
      m.add(kit.box(BAG.w, BAG.h, BAG.d, { r: 0.02 }), plastic, {
        at: [0, BAG.h / 2, 0],
      });
      for (const sgn of [-1, 1])
        m.add(
          kit.sweep(
            [
              [sgn * 0.07, BAG.h - 0.01, 0],
              [sgn * 0.066, BAG.h + 0.035, 0],
              [sgn * 0.03, BAG.h + 0.056, 0],
              [0, BAG.h + 0.06, 0],
            ],
            0.006,
          ),
          plastic,
        );
      bag.add(m.build("bag"));
      bag.add(
        kit.label({
          key: "wok-bag",
          w: 0.125,
          h: 0.133,
          px: 256,
          face: "z",
          at: [0, BAG.h * 0.5, BAG.d / 2 + 0.002],
          draw(g, W, H) {
            g.clearRect(0, 0, W, H);
            g.strokeStyle = g.fillStyle = "#c21f14";
            g.textAlign = "center";
            // the face that smiles from every such bag
            g.lineWidth = 9;
            g.beginPath();
            g.arc(W / 2, H * 0.3, H * 0.19, 0, TAU);
            g.stroke();
            g.beginPath();
            g.arc(W / 2, H * 0.31, H * 0.11, 0.15 * Math.PI, 0.85 * Math.PI);
            g.stroke();
            for (const sx of [-1, 1]) {
              g.beginPath();
              g.arc(W / 2 + sx * H * 0.07, H * 0.25, 6, 0, TAU);
              g.fill();
            }
            g.font = `700 ${Math.round(H * 0.2)}px ${kit.FONT_HEI}`;
            g.fillText("謝謝", W / 2, H * 0.73);
            g.font = `700 ${Math.round(H * 0.105)}px ${kit.FONT_MONO}`;
            g.fillText("THANK YOU", W / 2, H * 0.87);
            g.font = `600 ${Math.round(H * 0.06)}px ${kit.FONT_MONO}`;
            g.fillText("HAVE A NICE DAY", W / 2, H * 0.96);
          },
        }),
      );
    }
    all.add(bag);
    // the right hand lets the ladle go for the lid, then the bag: one grip that moves
    const free = new THREE.Group();
    all.add(free);

    const PAIL_AT = new V3(-0.07, -0.2, -0.52);
    const model = kit.weapon({
      id: "wok-pack",
      root,
      hands: {
        left: {
          parent: pail,
          at: [-0.012, -0.004, 0.006],
          palm: [-0.315, 0.933, 0.174],
          fingers: [0.25, 0.259, -0.933],
          pose: "cradle",
          give: [0.4, 0.3],
        },
        right: {
          ...LADLE_GRIP(ld),
          alts: {
            free: {
              parent: free,
              at: [0, 0, 0],
              // flat on the lid, the fingers away and a little up: the hand comes over the
              // near corner of the pail and leaves the rest of it to be seen
              palm: [-0.171, -0.94, -0.296],
              fingers: [-0.47, 0.342, -0.814],
              pose: "flat",
            },
          },
        },
      },
      anchors: { steam: { parent: pail, at: [0, PAIL.h + 0.03, 0] } },
      view: { hip: { pos: [0, 0, 0], rot: [0, 0, 0] } },
      show: { yaw: -0.5, pitch: 0.4, dist: 1.2 },
      update(s, dt = 1 / 60) {
        packing.age += dt;
        const u = clamp(packing.u);
        // up into view; at the very end down and away to the right, in its bag
        const up = ramp(u, 0, 0.09);
        const off = ramp(u, 0.92, 1);
        // (it also sinks a little as the bag takes the weight: the hand on its loops stays low)
        const sink = ramp(u, 0.72, 0.86) * 0.08;
        all.position.set(off * 0.2, -(1 - up) * 0.3 - off * 0.36 - sink, 0);
        all.rotation.z = -off * 0.3;
        // three ladlefuls between 0.1 and 0.46
        const sc = clamp((u - 0.1) / 0.36) * 3;
        const n = Math.min(2, Math.floor(sc));
        const q = u < 0.1 ? 0 : u >= 0.46 ? 1 : sc - n; // through this ladleful
        const filled = u < 0.1 ? 0 : u >= 0.46 ? 3 : n + ramp(q, 0.55, 0.8);
        // the lid goes down on it at 0.52-0.62 and the heap gives way
        const shut = ramp(u, 0.52, 0.61);
        const squash = keyed(u, [
          [0.58, 0],
          [0.63, 1],
          [0.7, -0.35],
          [0.76, 0],
        ]);
        pail.position.copy(PAIL_AT);
        pail.position.y -= squash * 0.012;
        pail.rotation.set(0.2, 0.3, 0.04 - squash * 0.03);
        pail.scale.set(1 + squash * 0.07, 1 - squash * 0.1, 1 + squash * 0.07);
        heap.scale.set(
          0.55 + 0.15 * filled,
          (0.25 + 0.42 * filled) * (1 - 0.72 * shut),
          0.55 + 0.15 * filled,
        );
        heap.visible = filled > 0.02;
        for (const f of flaps) {
          // open: leaning out; shut: lying flat, the long ones on top
          const a = -0.35 + (Math.PI / 2 + 0.35 - (f.long ? 0 : 0.05)) * shut;
          if (f.long) f.hinge.rotation.x = -f.sgn * a;
          else f.hinge.rotation.z = f.sgn * a;
        }
        // the ladle: down to the wok on the right, over the pail, tipped out
        const over = keyed(q, [
          [0, 0],
          [0.5, 1],
          [0.85, 1],
          [1, 0],
        ]);
        const tipped = ramp(q, 0.5, 0.72) * (1 - ramp(q, 0.85, 1));
        const drop = ramp(u, 0.46, 0.56); // let go of
        _a.set(0.27 - over * 0.05, -0.2 + over * 0.07 - drop * 0.5, -0.36);
        _b.set(
          0.2 + (PAIL_AT.x + 0.02 - 0.2) * over,
          -0.36 + (PAIL_AT.y + PAIL.h + 0.085 + 0.36) * over,
          -0.56 + (PAIL_AT.z + 0.56) * over,
        );
        aimLadle(ld, _a, _b, 0.25 + tipped * 1.5);
        ld.visible = drop < 0.98;
        // what is in the ladle rides in it until it is tipped, then falls into the pail
        const fall = ramp(q, 0.55, 0.8);
        load.visible = u >= 0.1 && u < 0.46 && q > 0.25 && fall < 1;
        if (load.visible) {
          _c.set(0, 0.03, 0.372)
            .applyQuaternion(ld.quaternion)
            .add(ld.position);
          load.position.copy(_c);
          load.position.y -= fall * 0.07;
          load.position.lerp(
            _b.set(PAIL_AT.x, PAIL_AT.y + PAIL.h, PAIL_AT.z),
            fall * 0.7,
          );
          load.rotation.set(q * 5, q * 3, 0);
        }
        // one morsel always misses
        const miss = clamp((u - 0.36) / 0.2);
        stray.visible = miss > 0 && miss < 1;
        stray.position.set(
          PAIL_AT.x + 0.05 + miss * 0.1,
          PAIL_AT.y + PAIL.h + 0.06 + 0.5 * miss * (0.6 - miss),
          PAIL_AT.z + 0.03,
        );
        stray.rotation.set(miss * 9, miss * 5, 0);
        // the ticket is slapped on at 0.66
        const stuck = ramp(u, 0.64, 0.69);
        ticket.visible = u > 0.64;
        ticket.scale.setScalar(2.2 - 1.2 * stuck);
        ticket.position.z = (1 - stuck) * 0.06;
        // the bag comes up round it from 0.72
        const bagged = ramp(u, 0.72, 0.86);
        bag.visible = u > 0.72;
        bag.position.set(
          PAIL_AT.x,
          PAIL_AT.y - 0.03 - (1 - bagged) * 0.3,
          PAIL_AT.z,
        );
        bag.rotation.set(0.12, 0.3, Math.sin(packing.age * 9) * 0.05 * off);
        // the right hand: ladle, then flat on the lid, then the loops of the bag
        const g = model.grips.right;
        const toLid = ramp(u, 0.48, 0.58);
        const toBag = ramp(u, 0.74, 0.86);
        g.to = "free";
        g.mix = toLid;
        g.alts.free.pose = toBag > 0.5 ? "fist" : "flat";
        // (pressing down on the lid, and a second push for the ticket)
        const press =
          squash * 0.012 +
          keyed(u, [
            [0.62, 0],
            [0.66, 0.02],
            [0.7, 0],
          ]);
        free.position.set(
          PAIL_AT.x + 0.034 - toBag * 0.03,
          PAIL_AT.y + PAIL.h + 0.014 - press + toBag * (BAG.h - PAIL.h + 0.016),
          PAIL_AT.z + 0.004,
        );
        free.rotation.set(0.2, 0.3, 0);
        // and the left lets go once the bag has it
        model.grips.left.away = ramp(u, 0.86, 0.94);
        pail.visible = bagged < 0.98;
      },
    });
    return model;
  })();

  // ================================================================ fire and steam
  const flareAt = new V3();
  const steamAt = new V3();
  const fire = {
    core: [2.5, 1.0, 0.1],
    body: [1.9, 0.48, 0.03],
    end: [0.6, 0.05, 0],
  };
  // the root of a gas flame under full pressure (linear values, like the fire's)
  const JET = { core: [0.5, 1.1, 2.6], end: [0.12, 0.2, 0.9] };
  const api = {
    wok,
    pack,
    /** Models to hand to armory.adopt before they are first held. */
    models: [wok, pack],
    /** A toss begins: the wok comes up off the stove. */
    startToss() {
      toss.age = 0;
      toss.frac = 0;
      toss.tossed = false;
    },
    /** frac: how far through the toss (0-1); flips: how many it is made of; tossed: done. */
    setToss(frac, flips, tossed) {
      toss.frac = frac;
      toss.flips = flips;
      toss.tossed = !!tossed;
    },
    /** charred: what is packed is not the rice but what is left of it. */
    startPack(charred = false) {
      packing.age = 0;
      packing.u = 0;
      for (const set of charable) set(!!charred);
    },
    setPack(u) {
      packing.u = u;
    },
    /**
     * Fire off the wok, thrown out along `dir` (the way the cook faces, flat on the ground)
     * to about `range` metres.
     */
    flare(dir, range = 4) {
      wok.anchors.flare.getWorldPosition(flareAt);
      for (let i = 0; i < 46; i++) {
        const sp = (0.5 + Math.random()) * range * 1.5;
        _a.set(
          dir.x * sp + (Math.random() - 0.5) * 2.4,
          1.2 + Math.random() * 2.6,
          dir.z * sp + (Math.random() - 0.5) * 2.4,
        );
        fx.glow({
          pos: _b
            .copy(flareAt)
            .addScaledVector(dir, Math.random() * 0.3)
            .setY(flareAt.y + Math.random() * 0.15),
          vel: _a,
          life: 0.35 + Math.random() * 0.4,
          size: [0.06, 0.45 + Math.random() * 0.55],
          color: [fire.core, fire.end],
          alpha: 0.5,
          type: P.FLAME,
          drag: 2.1,
          gravity: -2.6,
          spin: (Math.random() - 0.5) * 5,
          turb: 4,
          fadeIn: 0.04,
          fadePow: 1.5,
        });
      }
      for (let i = 0; i < 10; i++)
        fx.glow({
          pos: flareAt,
          vel: _a.set(
            dir.x * 3 + (Math.random() - 0.5) * 5,
            2 + Math.random() * 4,
            dir.z * 3 + (Math.random() - 0.5) * 5,
          ),
          life: 0.4 + Math.random() * 0.5,
          size: [0.02, 0.006],
          color: [[4.5, 1.6, 0.2], fire.end],
          type: P.GLOW,
          gravity: 6,
          drag: 0.6,
        });
    },
    /**
     * Once a frame while the wok is off its stove: the open burner at `pos` (the top of it),
     * roaring with nothing over it. A blue root, yellow flames standing a metre high, sparks.
     */
    burner(pos, dt) {
      const n = Math.round(52 * dt + Math.random() - 0.5);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * 0.17;
        const root = Math.random() < 0.35;
        fx.glow({
          pos: _b.set(
            pos.x + Math.cos(a) * d,
            pos.y + Math.random() * 0.06,
            pos.z + Math.sin(a) * d,
          ),
          // (drawn in towards the middle as it climbs: a jet, not a bonfire)
          vel: _a.set(
            -Math.cos(a) * d * 2.2 + (Math.random() - 0.5) * 0.5,
            root ? 1.6 + Math.random() * 0.8 : 2.4 + Math.random() * 1.8,
            -Math.sin(a) * d * 2.2 + (Math.random() - 0.5) * 0.5,
          ),
          life: root
            ? 0.12 + Math.random() * 0.08
            : 0.24 + Math.random() * 0.22,
          size: root
            ? [0.04, 0.11 + Math.random() * 0.06]
            : [0.05, 0.2 + Math.random() * 0.15],
          color: root ? [JET.core, JET.end] : [fire.core, fire.end],
          alpha: root ? 0.7 : 0.5,
          type: P.FLAME,
          drag: 1.5,
          gravity: -2.2,
          spin: (Math.random() - 0.5) * 4,
          turb: root ? 1 : 3.5,
          fadeIn: 0.04,
          fadePow: 1.4,
        });
      }
      if (Math.random() < dt * 14)
        fx.glow({
          pos: _b.set(pos.x, pos.y + 0.1, pos.z),
          vel: _a.set(
            (Math.random() - 0.5) * 1.6,
            2.5 + Math.random() * 3,
            (Math.random() - 0.5) * 1.6,
          ),
          life: 0.5 + Math.random() * 0.6,
          size: [0.018, 0.005],
          color: [[4.5, 1.6, 0.2], fire.end],
          type: P.GLOW,
          gravity: 3,
          drag: 0.5,
        });
    },
    /**
     * Once a frame while a dish that has caught stands on its stove: black smoke off the wok
     * at `pos`. heavy: it is charred, and pours.
     */
    smoke(pos, dt, heavy = false) {
      if (Math.random() > dt * (heavy ? 26 : 12)) return;
      fx.puff({
        pos: _b.set(
          pos.x + (Math.random() - 0.5) * 0.4,
          pos.y,
          pos.z + (Math.random() - 0.5) * 0.4,
        ),
        vel: _a.set(
          (Math.random() - 0.5) * 0.5,
          1.1 + Math.random() * 0.9,
          (Math.random() - 0.5) * 0.5,
        ),
        life: 1.6 + Math.random() * 1.2,
        size: [0.25, (heavy ? 1.5 : 1) * (0.9 + Math.random() * 0.6)],
        color: [
          [0.03, 0.03, 0.03, 1],
          [0.12, 0.11, 0.1, 0.7],
        ],
        alpha: heavy ? 0.55 : 0.38,
        type: P.SMOKE,
        drag: 0.8,
        gravity: -0.6,
        fadeIn: 0.25,
        spin: (Math.random() - 0.5) * 1.5,
        turb: 2,
      });
    },
    /** The dish as it stands in the wok of a street stove (stove.js, setDish). */
    dish,
    /** charred: what stands in that wok is coal. */
    charDish(on) {
      frying.coals.visible = !!on;
      for (const r of frying.rice) r.node.visible = !on;
    },
    /**
     * Once a frame while the dish fries on its stove: it shivers where it lies. k: how
     * hard (1 frying; more when it wants tossing and is starting to jump).
     */
    sizzle(dt, k = 1) {
      frying.t += dt;
      const t = frying.t;
      for (const r of frying.rice) {
        const a = t * (21 + (r.seed % 9)) + r.seed * 5;
        r.node.position.y = r.rest.y + Math.max(0, Math.sin(a)) * 0.0022 * k;
        r.node.rotation.set(
          Math.sin(a * 0.7 + 1) * 0.035 * k,
          r.yaw + Math.sin(t * 3.1 + r.seed) * 0.03 * k,
          Math.cos(a * 0.6) * 0.035 * k,
        );
      }
    },
    /** Once a frame while something hot is in hand: what rises off it. */
    steam(dt, model = wok) {
      if (Math.random() > dt * 14) return;
      model.anchors.steam.getWorldPosition(steamAt);
      fx.puff({
        pos: _b
          .copy(steamAt)
          .add(
            _a.set(
              (Math.random() - 0.5) * 0.16,
              0,
              (Math.random() - 0.5) * 0.16,
            ),
          ),
        vel: _a.set(
          (Math.random() - 0.5) * 0.2,
          0.5 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.2,
        ),
        life: 0.7 + Math.random() * 0.5,
        size: [0.05, 0.3 + Math.random() * 0.2],
        color: [
          [0.8, 0.8, 0.78, 1],
          [0.6, 0.6, 0.6, 0.6],
        ],
        alpha: 0.12,
        type: P.SMOKE,
        drag: 1.2,
        gravity: -0.5,
        fadeIn: 0.3,
        turb: 1.5,
      });
    },
  };
  return api;
}
