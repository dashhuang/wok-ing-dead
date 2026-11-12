// 敕令 · Taoist command tablet with a fan of hovering paper talismans.
// Gun space: +Z towards the target, +Y up, +X shooter's left. Origin at the grip (lower third of the
// tablet). The tablet stands upright, its carved 『敕令』 face looking at the shooter (-Z).
// Five talismans hover in a fan in front of and above it; the middle (front-most) one is the muzzle.

const TW = 0.075; // tablet width
const TT = 0.018; // tablet thickness
const TB = -0.07; // tablet foot
const YS = 0.122; // shoulder line where the cloud head starts (top ≈ 0.15)
const FZ = -TT / 2; // carved face (towards the shooter)
const PW = 0.07; // paper width
const PH = 0.2; // paper height

// fan slots: k = -2..2, middle one in front
const SLOTS = [-2, -1, 0, 1, 2].map((k) => {
  const th = k * 0.25;
  const R = 0.17;
  return {
    x: -Math.sin(th) * R * 1.05,
    y: 0.045 + Math.cos(th) * R - Math.abs(k) * 0.004,
    z: 0.2 - Math.abs(k) * 0.03 - (Math.abs(k) === 2 ? 0.012 : 0),
    rz: th,
    ry: -k * 0.12,
    rx: -0.08,
  };
});
const FRONT = 2;
const BRANCHES = ["base", "a", "b"];
// 剑指 with index and middle pressed together (the game hand's fingers fan apart at rest)
const SWORD = {
  base: "sword",
  index: [0.04, 0.05, 0.03, -0.12],
  middle: [0.04, 0.05, 0.03, 0.04],
};

const TEXTS = {
  base: [
    "鎮宅驅邪",
    "五方神將",
    "太上老君急急如律令",
    "北斗七星護身",
    "斬妖縛魅",
  ],
  a: ["五雷轟頂", "雷霆都司", "九天應元雷聲普化", "雷火交加", "掣電追魂"],
  b: ["三昧真火", "火德星君", "南方丙丁火焚邪", "赤焰焚煞", "離火燎原"],
};
const STYLE = {
  base: {
    paper: "#d6ad3c",
    paper2: "#b88a26",
    ink: "#b3180e",
    glow: "#ff3018",
    glowPow: 0.55,
  },
  a: {
    paper: "#1c2860",
    paper2: "#121a42",
    ink: "#d4dcec",
    glow: "#8fc4ff",
    glowPow: 0.6,
  },
  b: {
    paper: "#c3301a",
    paper2: "#8e1c0c",
    ink: "#f2c34a",
    glow: "#ffb02a",
    glowPow: 0.6,
  },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// a brush stroke: catmull-rom through pts, stamped with discs whose radius swells and tapers
function brush(g, pts, w, { taper = 0.25, swell = 1 } = {}) {
  const P = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(
      4,
      Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.5),
    );
    for (let k = 0; k < n; k++) {
      const t = k / n,
        t2 = t * t,
        t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  P.push(pts[pts.length - 1]);
  g.beginPath();
  for (let i = 0; i < P.length; i++) {
    const u = i / (P.length - 1);
    const r =
      (w / 2) *
      (taper +
        (1 - taper) *
          Math.pow(Math.sin(Math.min(1, u * 1.15 + 0.08) * Math.PI), 0.5)) *
      swell;
    g.moveTo(P[i][0] + r, P[i][1]);
    g.arc(P[i][0], P[i][1], Math.max(0.6, r), 0, Math.PI * 2);
  }
  g.fill();
}

function spiral(g, cx, cy, r0, turns, w) {
  const pts = [];
  const n = Math.ceil(turns * 18);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = r0 * (1 - t * 0.85);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  brush(g, pts, w, { taper: 0.4 });
}

// the paper's outline in canvas pixels: straight for base / A, burnt and ragged for B
function paperEdge(W, H, burnt, rnd) {
  const pts = [];
  const per = [
    [0, 0, W, 0],
    [W, 0, W, H],
    [W, H, 0, H],
    [0, H, 0, 0],
  ];
  for (const [x0, y0, x1, y1] of per) {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      let x = x0 + (x1 - x0) * t,
        y = y0 + (y1 - y0) * t;
      let d = burnt
        ? 6 +
          rnd() * 10 +
          Math.max(0, Math.sin(t * 9 + x0 * 0.03 + y0 * 0.01)) * 16
        : 1.5;
      // corners burn deeper
      if (burnt) {
        const cd = Math.min(
          Math.hypot(x, y),
          Math.hypot(W - x, y),
          Math.hypot(x, H - y),
          Math.hypot(W - x, H - y),
        );
        d += Math.max(0, 70 - cd) * 0.55;
      }
      const nx = y0 === y1 ? 0 : x0 === 0 ? 1 : -1;
      const ny = x0 === x1 ? 0 : y0 === 0 ? 1 : -1;
      pts.push([x + nx * d, y + ny * d]);
    }
  }
  return pts;
}

function drawInk(g, W, H, br, text, rnd, ink) {
  g.fillStyle = ink;
  g.strokeStyle = ink;
  // double frame
  g.lineWidth = 4;
  g.strokeRect(20, 20, W - 40, H - 40);
  g.lineWidth = 1.6;
  g.strokeRect(30, 30, W - 60, H - 60);
  // the three hooks of the Three Pure Ones
  for (let i = 0; i < 3; i++) {
    const x = W / 2 + (i - 1) * 58;
    brush(
      g,
      [
        [x - 14, 52],
        [x + 6, 60],
        [x + 2, 80],
        [x + 16, 86],
      ],
      10,
    );
  }
  // header 敕令
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${W * 0.36}px ${kit_FONT}`;
  g.fillText("敕", W / 2, 160);
  g.fillText("令", W / 2, 272);
  // a star cluster or thunder sigil below the header
  const yS = 350;
  if (br === "a") {
    g.lineWidth = 7;
    g.lineJoin = "miter";
    g.beginPath();
    g.moveTo(W * 0.3, yS - 24);
    g.lineTo(W * 0.52, yS - 4);
    g.lineTo(W * 0.42, yS + 6);
    g.lineTo(W * 0.7, yS + 30);
    g.stroke();
  } else if (br === "b") {
    for (const s of [-1, 1])
      brush(
        g,
        [
          [W / 2 + s * 10, yS + 26],
          [W / 2 + s * 40, yS],
          [W / 2 + s * 22, yS - 18],
          [W / 2 + s * 34, yS - 34],
        ],
        9,
      );
    brush(
      g,
      [
        [W / 2, yS + 30],
        [W / 2 - 8, yS - 4],
        [W / 2 + 6, yS - 30],
        [W / 2, yS - 44],
      ],
      11,
    );
  } else {
    const st = [
      [-70, -14],
      [-40, -24],
      [-12, -12],
      [14, -20],
      [26, 8],
      [58, 16],
      [76, -6],
    ];
    g.lineWidth = 3;
    g.beginPath();
    st.forEach(([x, y], i) =>
      i ? g.lineTo(W / 2 + x, yS + y) : g.moveTo(W / 2 + x, yS + y),
    );
    g.stroke();
    for (const [x, y] of st) {
      g.beginPath();
      g.arc(W / 2 + x, yS + y, 8, 0, Math.PI * 2);
      g.fill();
    }
  }
  // column of characters, with a long squiggling brush stroke running beside it
  const chars = [...text];
  const top = 410,
    bot = 770;
  const fs = Math.min(W * 0.26, ((bot - top) / chars.length) * 0.95);
  g.font = `700 ${fs}px ${kit_FONT}`;
  chars.forEach((ch, i) => {
    g.save();
    g.translate(
      W / 2 + (rnd() - 0.5) * 6,
      top + fs * 0.55 + (i * (bot - top - fs * 0.1)) / chars.length,
    );
    g.rotate((rnd() - 0.5) * 0.12);
    g.fillText(ch, 0, 0);
    g.restore();
  });
  for (const s of [-1, 1]) {
    const pts = [];
    for (let y = top - 20; y <= bot + 10; y += 26)
      pts.push([W / 2 + s * (W * 0.33 + Math.sin(y * 0.05 + s) * 10), y]);
    brush(g, pts, 5, { taper: 0.5 });
  }
  // 符胆: the tail stroke that winds into a spiral
  brush(
    g,
    [
      [W / 2, bot + 4],
      [W / 2 + 20, bot + 26],
      [W / 2 - 18, bot + 46],
      [W / 2 + 14, bot + 64],
      [W / 2 - 4, bot + 78],
    ],
    12,
  );
  spiral(g, W / 2 + 4, H - 82, 26, 2.3, 7);
  // seal stamp, bottom right
  const sx = W - 88,
    sy = H - 118,
    ss = 52;
  g.fillRect(sx, sy, ss, ss);
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.font = `700 ${ss * 0.42}px ${kit_FONT}`;
  g.fillText("道經", sx + ss / 2, sy + ss * 0.3);
  g.fillText("師寶", sx + ss / 2, sy + ss * 0.74);
  g.restore();
}

let kit_FONT = "serif";

function drawPaper(g, W, H, br, idx, mode) {
  const st = STYLE[br];
  const rnd = rng(
    9001 + idx * 77 + (br === "a" ? 1000 : br === "b" ? 2000 : 0),
  );
  const edge = paperEdge(W, H, br === "b", rng(31 + idx));
  g.clearRect(0, 0, W, H);
  if (mode === "glow") {
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
  }
  g.save();
  g.beginPath();
  edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  if (mode === "paper") {
    g.fillStyle = st.paper;
    g.fill();
  }
  g.clip();
  if (mode === "paper") {
    // fibres and blotches
    const grd = g.createRadialGradient(
      W / 2,
      H / 2,
      W * 0.2,
      W / 2,
      H / 2,
      H * 0.62,
    );
    grd.addColorStop(0, "rgba(255,255,255,0.08)");
    grd.addColorStop(1, st.paper2);
    g.fillStyle = grd;
    g.globalAlpha = 0.7;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    for (let i = 0; i < 900; i++) {
      const x = rnd() * W,
        y = rnd() * H,
        l = 3 + rnd() * 12,
        a = rnd() * Math.PI;
      g.strokeStyle =
        rnd() > 0.5 ? "rgba(255,240,200,0.09)" : "rgba(60,30,0,0.08)";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    drawInk(g, W, H, br, TEXTS[br][idx], rnd, st.ink);
  } else {
    drawInk(g, W, H, br, TEXTS[br][idx], rnd, st.glow);
  }
  if (br === "b") {
    // charred rim inside the ragged outline, glowing embers along it
    g.beginPath();
    edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    if (mode === "paper") {
      g.strokeStyle = "rgba(40,12,4,0.55)";
      g.lineWidth = 34;
      g.stroke();
      g.strokeStyle = "rgba(14,6,2,0.95)";
      g.lineWidth = 14;
      g.stroke();
    } else {
      g.strokeStyle = "#ff6a14";
      g.lineWidth = 5;
      g.setLineDash([22, 9, 6, 14]);
      g.stroke();
      g.setLineDash([]);
      for (let i = 0; i < 40; i++) {
        const p = edge[(rnd() * edge.length) | 0];
        g.fillStyle = rnd() > 0.5 ? "#ffd060" : "#ff5010";
        g.beginPath();
        g.arc(
          p[0] + (W / 2 - p[0]) * 0.04,
          p[1] + (H / 2 - p[1]) * 0.02,
          2 + rnd() * 3,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
    }
  }
  g.restore();
}

export default function build(kit) {
  const {
    THREE,
    M,
    prism,
    box,
    lathe,
    rod,
    sweep,
    sphere,
    torus,
    only,
    label,
    adopt,
  } = kit;
  const PI = Math.PI;
  kit_FONT = kit.FONT_KAI;

  // ------------------------------------------------------------------ tablet outline (front plane, [x, y])
  const tabletOutline = (d) => {
    const hw = TW / 2 - d;
    const circles = [
      [0, YS + 0.011, 0.0175 - d],
      [0.0235, YS, 0.014 - d],
      [-0.0235, YS, 0.014 - d],
    ];
    const inside = (x, y, skip) =>
      circles.some(
        (c, j) => j !== skip && Math.hypot(x - c[0], y - c[1]) < c[2] - 1e-6,
      );
    const top = [];
    circles.forEach(([cx, cy, r], j) => {
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * PI;
        const x = cx + Math.cos(a) * r,
          y = cy + Math.sin(a) * r;
        if (!inside(x, y, j) && Math.abs(x) <= hw + 1e-6) top.push([x, y]);
      }
    });
    top.sort((p, q) => q[0] - p[0]);
    const pts = [
      [-hw, TB + d],
      [hw, TB + d],
    ];
    for (const p of top) {
      const last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.0004) pts.push(p);
    }
    return pts;
  };

  // ------------------------------------------------------------------ tablet (fixed)
  const CAP = kit.mats.variant(
    "brass",
    {
      // aged brass: warm body, grime only in the cavities, rubbed bright on every edge
      color: 0xc99a48,
      rough: 0.32,
      dirt: 0.32,
      dirtColor: 0x6a4a22,
      edge: 0xffe2a0,
      edgeAmt: 1,
      edgeRough: 0.16,
    },
    "talisman-cap",
  );
  const tb = M();
  tb.add(
    prism(tabletOutline(0), TT, { plane: "front", bevel: 0.0022, bevelSeg: 2 }),
    "wood_peach",
  );
  // raised border on both faces, and the bar that divides the cloud head from the panel
  for (const sz of [-1, 1]) {
    tb.add(
      prism(tabletOutline(0.0028), 0.0018, {
        plane: "front",
        bevel: 0.0005,
        holes: [tabletOutline(0.0068)],
      }),
      "wood_peach",
      { at: [0, 0, sz * (TT / 2 + 0.0004)], color: 0xd8c0a8 },
    );
    tb.add(box(TW - 0.012, 0.0024, 0.0018, { bevel: 0.0005 }), "wood_peach", {
      at: [0, YS - 0.004, sz * (TT / 2 + 0.0004)],
      color: 0xd8c0a8,
    });
  }
  // bronze cap at the foot, with a lip and a finial carrying the tassel ring
  tb.add(
    box(TT + 0.006, 0.022, TW + 0.006, { bevel: 0.0022, bevelSeg: 2 }),
    CAP,
    { at: [0, TB + 0.008, 0], rot: [0, PI / 2, 0], wear: 0.45 },
  );
  tb.add(
    box(TT + 0.009, 0.0042, TW + 0.009, { bevel: 0.0012, bevelSeg: 2 }),
    CAP,
    { at: [0, TB + 0.0195, 0], rot: [0, PI / 2, 0], wear: 0.4 },
  );
  tb.add(box(TT + 0.009, 0.003, TW + 0.009, { bevel: 0.0011 }), CAP, {
    at: [0, TB - 0.003, 0],
    rot: [0, PI / 2, 0],
    wear: 0.4,
  });
  tb.add(
    lathe(
      [
        [0, 0],
        [0, 0.011, 0.002],
        [0.004, 0.0085, 0.002],
        [0.008, 0.0062, 0.001],
        [0.0115, 0.0078, 0.002],
        [0.0155, 0.0048, 0.001],
        [0.018, 0],
      ],
      { seg: 22 },
    ),
    CAP,
    { rot: [PI / 2, 0, 0], at: [0, TB - 0.0045, 0], wear: 0.5 },
  );
  tb.add(torus(0.0042, 0.0011, { seg: 6, around: 16 }), CAP, {
    at: [0, TB - 0.026, 0],
    rot: [0, PI / 2, 0],
    wear: 0.4,
  });
  // studs on the cap
  for (const x of [-0.026, 0, 0.026]) {
    tb.add(sphere(0.0018, { seg: 10, rings: 6, squash: [1, 1, 0.6] }), CAP, {
      at: [x, TB + 0.008, FZ - 0.003],
      wear: 0.3,
    });
    tb.add(sphere(0.0018, { seg: 10, rings: 6, squash: [1, 1, 0.6] }), CAP, {
      at: [x, TB + 0.008, -FZ + 0.003],
      wear: 0.3,
    });
  }
  const tablet = tb.build("tablet");

  // carved and gilded face: 『敕令』 with smaller characters below
  const incise = (g, text, x, y, size, font = kit.FONT_KAI) => {
    g.font = `900 ${size}px ${font}`;
    // the carved trench: a dark rim round each stroke and a shadow under it
    g.fillStyle = "rgba(30,8,2,0.95)";
    g.strokeStyle = "rgba(30,8,2,0.9)";
    g.lineJoin = "round";
    g.lineWidth = Math.max(2, size * 0.05);
    g.strokeText(text, x, y);
    g.fillText(text, x + size * 0.025, y + size * 0.03);
    const grd = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    grd.addColorStop(0, "#fff0b8");
    grd.addColorStop(0.45, "#f0c25a");
    grd.addColorStop(1, "#c08a2a");
    g.fillStyle = grd;
    g.fillText(text, x, y);
  };
  const panelH = YS - 0.008 - (TB + 0.024);
  // the panel inside the raised border is lacquered a deep cinnabar so the gold leaf reads against it
  for (const [face, z] of [
    ["-z", FZ - 0.0001],
    ["z", -FZ + 0.0001],
  ]) {
    tablet.add(
      label({
        key: `talisman-field${face}`,
        w: TW - 0.0136,
        h: panelH + 0.002,
        px: 128,
        face,
        at: [0, (YS - 0.008 + TB + 0.024) / 2, z],
        rough: 0.42,
        opaque: true,
        draw(g, W, H) {
          const grd = g.createLinearGradient(0, 0, W, 0);
          grd.addColorStop(0, "#3a0c06");
          grd.addColorStop(0.5, "#5c160c");
          grd.addColorStop(1, "#3a0c06");
          g.fillStyle = grd;
          g.fillRect(0, 0, W, H);
          // rubbed through to the wood where the thumb rests, and a few hairline crazes
          const r = rng(face === "z" ? 3 : 4);
          for (let i = 0; i < 60; i++) {
            g.fillStyle = `rgba(150,80,40,${r() * 0.18})`;
            g.fillRect(r() * W, r() * H, 1 + r() * 4, 1);
          }
          g.strokeStyle = "rgba(10,2,0,0.5)";
          g.lineWidth = 3;
          g.strokeRect(1, 1, W - 2, H - 2);
        },
      }),
    );
  }
  tablet.add(
    label({
      key: "talisman-panel",
      w: TW - 0.0145,
      h: panelH,
      px: 512,
      face: "-z",
      at: [0, (YS - 0.008 + TB + 0.024) / 2, FZ - 0.0003],
      metal: 0.7,
      rough: 0.36,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.textAlign = "center";
        g.textBaseline = "middle";
        incise(g, "敕", W / 2, H * 0.12, W * 0.66);
        incise(g, "令", W / 2, H * 0.32, W * 0.66);
        // thin gilt rule
        g.fillStyle = "#c89238";
        g.fillRect(W * 0.2, H * 0.445, W * 0.6, 5);
        const small = [..."雷霆都司"];
        small.forEach((c, i) =>
          incise(g, c, W / 2, H * (0.53 + i * 0.105), W * 0.3),
        );
        const tiny = (txt, x) =>
          [...txt].forEach((c, i) =>
            incise(g, c, x, H * (0.52 + i * 0.075), W * 0.16),
          );
        tiny("天圓地方", W * 0.15);
        tiny("律令九章", W * 0.85);
      },
    }),
  );
  // back of the tablet (faces the target): 急急如律令 and the eight trigrams
  tablet.add(
    label({
      key: "talisman-back",
      w: TW - 0.0145,
      h: panelH,
      px: 512,
      face: "z",
      at: [0, (YS - 0.008 + TB + 0.024) / 2, -FZ + 0.0003],
      metal: 0.7,
      rough: 0.38,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.textAlign = "center";
        g.textBaseline = "middle";
        const cx = W / 2,
          cy = H * 0.16,
          r = W * 0.36;
        g.save();
        g.translate(cx, cy);
        for (let i = 0; i < 8; i++) {
          g.save();
          g.rotate((i / 8) * PI * 2);
          for (let l = 0; l < 3; l++) {
            const broken = (i >> l) & 1;
            g.fillStyle = "#d8a444";
            const y = -r + l * 16;
            if (broken) {
              g.fillRect(-30, y, 24, 9);
              g.fillRect(6, y, 24, 9);
            } else g.fillRect(-30, y, 60, 9);
          }
          g.restore();
        }
        g.restore();
        [..."急急如律令"].forEach((c, i) =>
          incise(g, c, W / 2, H * (0.37 + i * 0.13), W * 0.38),
        );
      },
    }),
  );
  // cloud head: gilt cloud scrolls in the side lobes (every form)
  tablet.add(
    label({
      key: "talisman-clouds",
      w: TW - 0.006,
      h: 0.034,
      px: 512,
      face: "-z",
      at: [0, YS + 0.012, FZ - 0.0003],
      metal: 1,
      rough: 0.32,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        const sx = W / (TW - 0.006);
        const toC = (x, y) => [W / 2 - x * sx, H / 2 - (y - (YS + 0.012)) * sx];
        g.fillStyle = "rgba(34,12,4,0.9)";
        for (const pass of [0, 1]) {
          g.fillStyle = pass ? "#e0b050" : "rgba(34,12,4,0.9)";
          const o = pass ? 0 : 3;
          for (const s of [-1, 1]) {
            const [cx, cy] = toC(s * 0.0235, YS + 0.002);
            g.save();
            g.translate(cx + o, cy + o);
            g.scale(s, 1);
            spiral(g, 0, 0, 0.0085 * sx, 1.6, 10);
            brush(
              g,
              [
                [-0.008 * sx, 0.002 * sx],
                [-0.002 * sx, 0.006 * sx],
                [0.006 * sx, 0.004 * sx],
                [0.011 * sx, -0.002 * sx],
              ],
              7,
            );
            g.restore();
          }
        }
      },
    }),
  );
  // base: taiji in the centre lobe
  const taiji = only(
    label({
      key: "talisman-taiji",
      w: 0.022,
      h: 0.022,
      px: 256,
      face: "-z",
      at: [0, YS + 0.012, FZ - 0.0004],
      metal: 1,
      rough: 0.3,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        const r = W * 0.46,
          c = W / 2;
        g.fillStyle = "#e2b24e";
        g.beginPath();
        g.arc(c, c, r, 0, PI * 2);
        g.fill();
        g.fillStyle = "#3a1608";
        g.beginPath();
        g.arc(c, c, r * 0.9, -PI / 2, PI / 2);
        g.arc(c, c + r * 0.45, r * 0.45, PI / 2, -PI / 2, true);
        g.arc(c, c - r * 0.45, r * 0.45, PI / 2, -PI / 2, false);
        g.fill();
        g.beginPath();
        g.arc(c, c - r * 0.45, r * 0.13, 0, PI * 2);
        g.fill();
        g.fillStyle = "#e2b24e";
        g.beginPath();
        g.arc(c, c + r * 0.45, r * 0.13, 0, PI * 2);
        g.fill();
      },
    }),
    "base",
  );
  tablet.add(taiji);

  // ------------------------------------------------------------------ branch A: copper plate with lightning-struck grain
  const pa = M();
  pa.add(rod(0.0118, -0.0012, 0.0012, { seg: 32, r: 0.0005 }), "copper", {
    at: [0, YS + 0.012, FZ - 0.0002],
  });
  pa.add(torus(0.0122, 0.0011, { seg: 6, around: 32 }), CAP, {
    at: [0, YS + 0.012, FZ - 0.0008],
    wear: 0.3,
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    pa.add(sphere(0.0011, { seg: 8, rings: 5 }), CAP, {
      at: [
        Math.cos(a) * 0.0122,
        YS + 0.012 + Math.sin(a) * 0.0122,
        FZ - 0.0016,
      ],
      wear: 0.3,
    });
  }
  const plateA = pa.build("plate-a");
  plateA.add(
    label({
      key: "talisman-thunderwood",
      w: 0.0225,
      h: 0.0225,
      px: 256,
      face: "-z",
      at: [0, YS + 0.012, FZ - 0.0015],
      metal: 1,
      rough: 0.35,
      draw(g, W, H) {
        g.clearRect(0, 0, W, H);
        g.save();
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.49, 0, PI * 2);
        g.clip();
        // wood grain burnt into the copper
        for (let i = 0; i < 22; i++) {
          g.strokeStyle =
            i % 3 ? "rgba(60,22,10,0.7)" : "rgba(255,190,140,0.5)";
          g.lineWidth = i % 3 ? 2.2 : 1.2;
          g.beginPath();
          for (let y = 0; y <= H; y += 6) {
            const x =
              (i / 21) * W +
              Math.sin(y * 0.05 + i * 0.7) * 8 +
              Math.sin(y * 0.013 + i) * 14;
            y ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.stroke();
        }
        // the lightning scar: a pale forked crack
        const bolt = [
          [W * 0.62, 0],
          [W * 0.48, H * 0.3],
          [W * 0.58, H * 0.36],
          [W * 0.38, H * 0.7],
          [W * 0.46, H * 0.72],
          [W * 0.3, H],
        ];
        for (const [lw, col] of [
          [16, "rgba(30,8,4,0.9)"],
          [7, "#d6e8ff"],
        ]) {
          g.strokeStyle = col;
          g.lineWidth = lw;
          g.lineJoin = "miter";
          g.beginPath();
          bolt.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.moveTo(W * 0.53, H * 0.33);
          g.lineTo(W * 0.78, H * 0.55);
          g.stroke();
        }
        g.restore();
        g.strokeStyle = "rgba(255,210,160,0.8)";
        g.lineWidth = 6;
        g.beginPath();
        g.arc(W / 2, H / 2, W * 0.46, 0, PI * 2);
        g.stroke();
      },
    }),
  );
  only(plateA, "a");

  // ------------------------------------------------------------------ branch B: red agate bead in the head
  const pb = M();
  pb.add(
    sphere(0.0095, { seg: 24, rings: 16, squash: [1, 1, 0.62] }),
    "agate_red",
    { at: [0, YS + 0.012, FZ - 0.001] },
  );
  pb.add(torus(0.0098, 0.0014, { seg: 8, around: 32 }), "gold", {
    at: [0, YS + 0.012, FZ - 0.0012],
    wear: 0.3,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + PI / 2;
    pb.add(box(0.0024, 0.0034, 0.0024, { bevel: 0.0006 }), "gold", {
      at: [
        Math.cos(a) * 0.0098,
        YS + 0.012 + Math.sin(a) * 0.0098,
        FZ - 0.0035,
      ],
      rot: [0, 0, a],
      wear: 0.3,
    });
  }
  const beadB = only(pb.build("bead-b"), "b");

  // ------------------------------------------------------------------ tassel (sways from the finial ring)
  const ts = M();
  ts.add(
    sweep(
      [
        [0, 0.003, 0],
        [0, -0.006, 0.001],
        [0, -0.016, 0],
      ],
      0.0012,
      { seg: 5 },
    ),
    "cord_red",
  );
  // knot: woven lozenge facing the shooter with four ears
  ts.add(
    prism(
      [
        [0, -0.016, 0.002],
        [0.012, -0.029, 0.002],
        [0, -0.042, 0.002],
        [-0.012, -0.029, 0.002],
      ],
      0.005,
      { plane: "front", bevel: 0.0018, bevelSeg: 2 },
    ),
    "cord_red",
  );
  for (const [x, y] of [
    [0.009, -0.02],
    [-0.009, -0.02],
    [0.009, -0.038],
    [-0.009, -0.038],
  ]) {
    ts.add(torus(0.0042, 0.0012, { seg: 5, around: 14 }), "cord_red", {
      at: [x, y, 0],
      wear: 0.3,
    });
  }
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      ts.add(adopt(new THREE.BoxGeometry(0.019, 0.0011, 0.0056)), "cord_gold", {
        at: [s * (i - 1) * 0.0045, -0.029 + (i - 1) * 0.0045, 0],
        rot: [0, 0, s * PI * 0.25],
      });
    }
  }
  ts.add(sphere(0.005, { seg: 14, rings: 10 }), "jade", { at: [0, -0.049, 0] });
  ts.add(
    lathe(
      [
        [0, 0],
        [0, 0.0036, 0.001],
        [0.004, 0.0055, 0.002],
        [0.012, 0.0058, 0.002],
        [0.014, 0.0044, 0.001],
        [0.014, 0],
      ],
      { seg: 14 },
    ),
    "cord_gold",
    { rot: [PI / 2, 0, 0], at: [0, -0.054, 0] },
  );
  const rnd = rng(4242);
  ts.add(
    lathe(
      [
        [0, 0],
        [0, 0.0048, 0.001],
        [0.04, 0.0066, 0.01],
        [0.088, 0.0046, 0.002],
        [0.09, 0],
      ],
      { seg: 12 },
    ),
    "cord_red",
    { rot: [PI / 2, 0, 0], at: [0, -0.066, 0] },
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    const ox = Math.cos(a),
      oz = Math.sin(a);
    const len = 0.086 + rnd() * 0.016;
    const p = (t, sp) => [ox * sp, -0.068 - len * t, oz * sp];
    ts.add(
      sweep(
        [
          p(0.05, 0.004),
          p(0.45, 0.0068),
          p(0.8, 0.0072),
          p(1, 0.006 + rnd() * 0.003),
        ],
        0.001,
        { seg: 4, steps: 10 },
      ),
      "cord_red",
      {
        wear: 0.3,
      },
    );
  }
  const tassel = ts.build("tassel");
  tassel.position.set(0, TB - 0.03, 0);

  // ------------------------------------------------------------------ paper talismans: three sets of five
  const paperGeo = () => {
    const g = new THREE.PlaneGeometry(PW, PH, 8, 14);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i);
      // gently cupped across, a slow wave along the length, the bottom lifting in the draught
      p.setZ(
        i,
        -0.009 * (x / (PW / 2)) ** 2 +
          0.003 * Math.sin((y / PH) * PI * 1.6 + 0.5) +
          0.006 * Math.max(0, -y / (PH / 2)) ** 2,
      );
    }
    g.rotateY(PI); // printed face towards the shooter (-Z)
    g.computeVertexNormals();
    return g;
  };
  const glowMat = (color, pow) => {
    const m = kit.mats.glow(color, pow).clone();
    m.userData.glow = pow;
    kit.mats.glowMats.push(m);
    return m;
  };
  const sets = {};
  const arcs = [];
  for (const br of ["base", "a", "b"]) {
    const group = only(new THREE.Group(), br);
    group.name = `talismans-${br}`;
    const nodes = [];
    for (let i = 0; i < 5; i++) {
      const map = kit.canvas(`talisman-paper-${br}-${i}`, 320, 914, (g, W, H) =>
        drawPaper(g, W, H, br, i, "paper"),
      );
      const emi = kit.canvas(`talisman-glyph-${br}-${i}`, 320, 914, (g, W, H) =>
        drawPaper(g, W, H, br, i, "glow"),
      );
      const mat = new THREE.MeshStandardMaterial({
        map,
        emissive: 0xffffff,
        emissiveMap: emi,
        emissiveIntensity: STYLE[br].glowPow,
        roughness: br === "a" ? 0.6 : 0.82,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.35,
      });
      mat.name = `talisman-paper-${br}-${i}`;
      mat.userData.glow = STYLE[br].glowPow;
      kit.mats.glowMats.push(mat);
      const mesh = new THREE.Mesh(paperGeo(), mat);
      mesh.name = `talisman:${br}:${i}`;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      const node = new THREE.Group();
      node.name = `talisman-${br}-${i}`;
      node.add(mesh);
      group.add(node);
      nodes.push({ node, mat });
    }
    sets[br] = { group, nodes };
  }
  // A: little arcs crackling between the thunder talismans
  {
    const arcMat = glowMat(0xa8d4ff, 5);
    for (let i = 0; i < 4; i++) {
      const r = rng(77 + i);
      const pts = [];
      const n = 7;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        pts.push([
          -PW * 0.42 - t * 0.034,
          (r() - 0.5) * 0.014 + (t - 0.5) * 0.012,
          (r() - 0.5) * 0.008,
        ]);
      }
      const m = M();
      m.add(sweep(pts, 0.0007, { seg: 4, tension: 0, steps: 28 }), arcMat);
      const node = m.build(`arc-${i}`);
      node.position.set(0, (i % 2 ? 0.04 : -0.03) + r() * 0.02, 0);
      sets.a.nodes[i].node.add(node);
      arcs.push({ node, arcMat });
    }
  }
  // B: sparks drifting up from the burning edges (one mesh, vertices rewritten each frame)
  const SPARKS = 14;
  const sparkTpl = new THREE.OctahedronGeometry(0.0013, 0);
  const sparkGeo = (() => {
    const list = [];
    for (let i = 0; i < SPARKS; i++) list.push(sparkTpl.clone());
    return adopt(kit.mergeGeometries(list, false));
  })();
  const sparkBase = sparkGeo.attributes.position.array.slice();
  const perSpark = sparkBase.length / SPARKS;
  const sparkMat = glowMat(0xff8a2a, 4.5);
  const sparks = new THREE.Mesh(sparkGeo, sparkMat);
  sparks.name = "sparks-b";
  sparks.frustumCulled = false;
  only(sparks, "b");
  const sparkSeed = Array.from({ length: SPARKS }, (_, i) => {
    const r = rng(500 + i);
    return {
      slot: i % 5,
      x: (r() - 0.5) * PW,
      y: (r() - 0.3) * PH * 0.8,
      sp: 0.4 + r() * 0.5,
      ph: r(),
      drift: (r() - 0.5) * 0.03,
    };
  });

  // ------------------------------------------------------------------ assemble
  const root = new THREE.Group();
  root.name = "talisman";
  // the left hand does not hold anything: it makes the 剑指 beside the fan and flicks it at each cast
  const cast = new THREE.Group();
  cast.name = "cast-hand";
  const CAST = [0.36, 0.09, 0.14];
  cast.position.set(...CAST);
  root.add(cast);
  root.add(
    tablet,
    plateA,
    beadB,
    tassel,
    sets.base.group,
    sets.a.group,
    sets.b.group,
    sparks,
  );

  const tmp = new THREE.Vector3();
  let model;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  model = kit.weapon({
    id: "talisman",
    root,
    // right hand: palm on the back of the tablet's lower third, fingers across it curling round the far
    // (left) edge, thumb round the near edge onto the carved face. The hand is turned a little off the
    // back (fingertips away from it, heel on it) so the wrist does not have to bend back past its limit
    // for a forearm that comes up from below. Left hand: 剑指 beside the fan.
    hands: {
      right: {
        at: [-0.012, -0.02, TT / 2 + 0.0035],
        palm: [0, 0, -1],
        fingers: [1, 0.3, 0.2],
        pose: {
          base: "flat",
          index: [0.51, 0.83, 0.77, 0.04],
          middle: [0.78, 1.11, 0.78, 0],
          ring: [0.78, 1.11, 0.78, -0.04],
          pinky: [0.63, 0.96, 0.66, -0.1],
          thumb: [0.3, -0.9, 0.3, 0.85, 1.0],
        },
      },
      left: {
        parent: cast,
        at: [0, 0, 0],
        palm: [-1, 0, -0.5],
        fingers: [-0.15, 1, 0.5],
        pose: SWORD,
      },
    },
    anchors: { muzzle: [SLOTS[FRONT].x, SLOTS[FRONT].y, SLOTS[FRONT].z] },
    view: { hip: { pos: [0.25, -0.19, -0.4], rot: [-0.05, 0.36, 0.1] } },
    show: { yaw: -0.85, pitch: 0.14, dist: 1.25 },
    // s.t: idle bob; s.cycle (0 -> 1 after a shot): the front talisman has flown, a fresh one slides in
    // from behind the tablet; s.shot: recoil flutter; s.charge: glyphs brighten; tassel sways.
    update(s) {
      const t = s.t || 0;
      const c = s.cycle ?? 1;
      const kick = Math.exp(-(s.shot ?? 9) * 7);
      const charge = clamp(s.charge || 0);
      const boost = (s.level || 1) >= 5 ? 1.8 : 1;
      for (let bi = 0; bi < BRANCHES.length; bi++) {
        const br = BRANCHES[bi];
        const st = STYLE[br];
        const nodes = sets[br].nodes;
        for (let i = 0; i < nodes.length; i++) {
          const { node, mat } = nodes[i];
          const sl = SLOTS[i];
          const k = i - FRONT;
          const bob = Math.sin(t * 1.5 + i * 1.37) * 0.005;
          node.position.set(
            sl.x - k * kick * 0.012,
            sl.y + bob + kick * 0.006 * Math.abs(k),
            sl.z,
          );
          node.rotation.set(
            sl.rx + Math.sin(t * 1.1 + i * 2.1) * 0.05 - kick * 0.25,
            sl.ry + Math.sin(t * 0.8 + i * 0.9) * 0.07,
            sl.rz + Math.sin(t * 1.3 + i * 0.7) * 0.035 + k * kick * 0.08,
            "YXZ",
          );
          node.scale.setScalar(1);
          let fade = 1;
          if (i === FRONT && c < 1) {
            // launched: gone at first, then a new one rises from behind the tablet
            const p = clamp((c - 0.12) / 0.88);
            const e = p * p * (3 - 2 * p);
            tmp.set(0, 0.06, -0.01);
            node.position.lerpVectors(tmp, node.position, e);
            node.rotation.x += (1 - e) * 0.6;
            node.scale.setScalar(0.45 + 0.55 * e);
            fade = e;
          }
          node.visible = fade > 0.02;
          mat.opacity = fade;
          const flick =
            br === "b"
              ? 0.85 + 0.15 * Math.sin(t * 13 + i * 3) * Math.sin(t * 7.3 + i)
              : 1;
          mat.emissiveIntensity =
            (st.glowPow + charge * 1.6 + (i === FRONT ? 0.15 : 0)) *
            flick *
            boost *
            fade;
        }
      }
      // A: arcs flicker on and off
      for (let i = 0; i < arcs.length; i++) {
        const node = arcs[i].node;
        const h =
          Math.sin(Math.floor(t * 15 + i * 3.3) * 12.9898 + i * 78.233) *
          43758.5453;
        node.visible = h - Math.floor(h) > 0.55 - charge * 0.4;
        node.scale.set(1, 0.7 + (h - Math.floor(h)) * 0.6, 1);
      }
      arcs.length &&
        (arcs[0].arcMat.emissiveIntensity = (4 + charge * 3) * boost);
      // B: sparks rise from the papers and wink out
      const pos = sparkGeo.attributes.position;
      const arr = pos.array;
      for (let i = 0; i < sparkSeed.length; i++) {
        const sp = sparkSeed[i];
        const life = (t * sp.sp + sp.ph) % 1;
        const sl = SLOTS[sp.slot];
        const x =
          sl.x +
          sp.x * Math.cos(sl.rz) +
          Math.sin(life * 6 + i) * 0.006 +
          sp.drift * life;
        const y = sl.y + sp.y + life * 0.09;
        const z = sl.z - 0.004 + Math.cos(life * 5 + i) * 0.005;
        const sc = Math.sin(life * PI);
        for (let v = 0; v < perSpark; v += 3) {
          arr[i * perSpark + v] = x + sparkBase[i * perSpark + v] * sc;
          arr[i * perSpark + v + 1] = y + sparkBase[i * perSpark + v + 1] * sc;
          arr[i * perSpark + v + 2] = z + sparkBase[i * perSpark + v + 2] * sc;
        }
      }
      pos.needsUpdate = true;
      sparkMat.emissiveIntensity = 4.5 * boost * (0.8 + charge * 0.6);
      // tassel
      tassel.rotation.z = Math.sin(t * 1.3) * 0.08 + Math.sin(t * 2.9) * 0.02;
      tassel.rotation.x = Math.sin(t * 0.9 + 1) * 0.06 - kick * 0.35;
      // 剑指: snaps forward and down at the fan as the talisman leaves, then drifts back
      const since = s.shot ?? 9;
      const flick =
        since < 0.07
          ? Math.sin((since / 0.07) * PI * 0.5)
          : Math.exp(-(since - 0.07) * 6);
      const hold = 0.004 * Math.sin(t * 1.2);
      cast.position.set(
        CAST[0] + 0.01 * flick,
        CAST[1] + hold - 0.01 * flick + charge * 0.02,
        CAST[2] + 0.05 * flick,
      );
      cast.rotation.set(0.55 * flick, -0.15 * flick, 0);
    },
  });
  return model;
}
