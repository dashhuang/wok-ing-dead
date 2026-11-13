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
const HELD = { at: new V3(0.03, -0.2, -0.68), tip: 0.3 };
// the ear the towel is on: an angle round the rim (90 degrees is the point nearest the cook)
const EAR = (128 * Math.PI) / 180;
// what is in the wok: [colour, kind]
const FOOD = [
  [0xc8873f, "cube"], // chicken
  [0xd49a52, "cube"],
  [0x7d120c, "chili"], // dried chilli
  [0x9a1a10, "chili"],
  [0x5c9a34, "stick"], // scallion
  [0x86b84a, "stick"],
  [0xdcb878, "nut"], // peanut
  [0xc22a14, "cube"], // red pepper
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
  const food = kit.mats.variant("ceramic", {
    color: 0xffffff,
    rough: 0.38,
    dirt: 0.2,
  });
  // a wok that has been seasoned for years: black, a little oil on it, no rust
  const iron = kit.mats.variant("iron_cast", {
    color: 0x141312,
    rough: 0.55,
    dirt: 0.12,
    dirtColor: 0x2a1c12,
    pAlbedo: 0.25,
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

  // one morsel, about the size of a thumb joint
  function morsel(kind, s = 1) {
    if (kind === "chili") return kit.rod(0.006 * s, -0.022 * s, 0.022 * s);
    if (kind === "stick") return kit.rod(0.0045 * s, -0.026 * s, 0.026 * s);
    if (kind === "nut")
      return kit.sphere(0.009 * s, { seg: 8, rings: 6, squash: [1, 0.8, 1.3] });
    return kit.box(0.022 * s, 0.018 * s, 0.024 * s, { r: 0.004 * s });
  }
  // a handful of them stuck together: one mesh (the colours are in the vertices)
  function clump(seed, n = 4, spread = 0.03, s = 1) {
    let k = seed * 9301 + 49297;
    const rnd = () => ((k = (k * 233280 + 49297) % 233281), k / 233281);
    const m = kit.M();
    for (let i = 0; i < n; i++) {
      const [color, kind] = FOOD[Math.floor(rnd() * FOOD.length)];
      m.add(morsel(kind, s), food, {
        at: [
          (rnd() - 0.5) * spread,
          (rnd() - 0.5) * spread * 0.5,
          (rnd() - 0.5) * spread,
        ],
        rot: [rnd() * TAU, rnd() * TAU, rnd() * TAU],
        color,
      });
    }
    return m.build("food");
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
    m.add(kit.lathe(prof, { seg: 40 }), iron, {
      rot: [-Math.PI / 2, 0, 0],
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

    // what is being cooked: clumps that lie in the bowl and fly when it is flipped
    const bits = [];
    for (let i = 0; i < 12; i++) {
      const node = clump(i + 1, 6, 0.06, 1.5);
      const a = i * 2.39996;
      const d = 0.02 + 0.115 * Math.sqrt((i + 0.5) / 12);
      const rest = new V3(Math.cos(a) * d, 0, Math.sin(a) * d);
      rest.y = bowlY(d) + 0.018;
      node.rotation.order = "YXZ";
      body.add(node);
      bits.push({
        node,
        rest,
        lag: (i % 4) * 0.022,
        high: 0.17 + 0.2 * ((i * 0.618) % 1),
        spin: 5 + ((i * 3.7) % 6),
        yaw: a * 3,
      });
    }
    const ld = ladle();
    view.add(ld);

    const gripAt = [
      Math.cos(EAR) * (WOK.r + 0.03),
      -0.006,
      Math.sin(EAR) * (WOK.r + 0.03),
    ];
    const inward = [-Math.cos(EAR), 0, -Math.sin(EAR)];
    const model = kit.weapon({
      id: "wok",
      root,
      hands: {
        // under and round the towelled ear, thumb over the top of it
        left: {
          parent: body,
          at: gripAt,
          palm: [inward[0] * 0.45, 0.89, inward[2] * 0.45],
          fingers: [inward[0] * 0.89, -0.45, inward[2] * 0.89],
          pose: { base: "wrap", r: 0.024 },
          give: [0.35, 0.5],
        },
        // the ladle, overhand
        right: {
          parent: ld,
          at: [0, 0.006, -0.02],
          palm: [0, -1, 0],
          fingers: [-1, 0, 0],
          pose: { base: "wrap", r: 0.013 },
        },
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
          b.node.position.set(
            b.rest.x * (air ? 0.8 : 1),
            b.rest.y + (air ? b.high * 4 * u * (1 - u) : 0),
            b.rest.z + slide,
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
        _b.set(
          Math.cos(st) * 0.06 * (1 - out) + out * 0.13,
          bowlY(0.06) + 0.03 + out * 0.11,
          Math.sin(st) * 0.045 * (1 - out) + 0.02,
        );
        body.updateMatrix();
        _b.applyMatrix4(body.matrix);
        aimLadle(ld, _a, _b, 0.25);
      },
    });
    model.body = body;
    return model;
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
      const c = clump(40 + i, 5, 0.05, 1.15);
      const a = i * 2.39996;
      const d = i ? 0.024 : 0;
      c.position.set(Math.cos(a) * d, 0.016 + i * 0.013, Math.sin(a) * d);
      c.rotation.set(i, i * 2, i * 3);
      heap.add(c);
    }
    heap.position.y = 0.02;
    pail.add(heap);
    // a ladleful on its way, and one that missed
    const load = clump(77, 6, 0.04, 1.1);
    const stray = clump(91, 2, 0.02, 1);
    all.add(load, stray);
    const ld = ladle();
    all.add(ld);
    // the order ticket, with the kitchen's chop on it
    const ticket = kit.label({
      key: "wok-ticket",
      w: 0.062,
      h: 0.084,
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
    ticketAt.position.set(
      0.012,
      PAIL.h * 0.62,
      (PAIL.d0 + PAIL.d1) / 4 + 0.009,
    );
    ticketAt.rotation.set(0.14, 0, 0.16);
    ticketAt.add(ticket);
    pail.add(ticketAt);
    // the bag: white, red print, two loops to carry it by
    const bag = new THREE.Group();
    const BAG = { w: 0.19, h: 0.2, d: 0.12 };
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
              [sgn * 0.066, BAG.h + 0.05, 0],
              [sgn * 0.03, BAG.h + 0.085, 0],
              [0, BAG.h + 0.09, 0],
            ],
            0.006,
          ),
          plastic,
        );
      bag.add(m.build("bag"));
      bag.add(
        kit.label({
          key: "wok-bag",
          w: 0.15,
          h: 0.16,
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

    const PAIL_AT = new V3(-0.085, -0.25, -0.5);
    const model = kit.weapon({
      id: "wok-pack",
      root,
      hands: {
        left: {
          parent: pail,
          at: [-0.012, -0.004, 0.006],
          palm: [0, 1, 0],
          fingers: [0.45, 0, -0.89],
          pose: "cradle",
          give: [0.4, 0.3],
        },
        right: {
          parent: ld,
          at: [0, 0.006, -0.02],
          palm: [0, -1, 0],
          fingers: [-1, 0, 0],
          pose: { base: "wrap", r: 0.013 },
          alts: {
            free: {
              parent: free,
              at: [0, 0, 0],
              palm: [0, -1, 0],
              fingers: [-0.5, 0, -0.87],
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
        all.position.set(off * 0.2, -(1 - up) * 0.3 - off * 0.36, 0);
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
          PAIL_AT.x + 0.012 + toBag * 0.03,
          PAIL_AT.y + PAIL.h + 0.014 - press + toBag * (BAG.h - PAIL.h + 0.05),
          PAIL_AT.z + 0.004,
        );
        free.rotation.set(0.2, 0.3 - toBag * 0.9, toBag * 0.5);
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
    startPack() {
      packing.age = 0;
      packing.u = 0;
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
