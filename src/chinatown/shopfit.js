// What is behind and in front of a shop window: the fitted-out room seen through the glass,
// the slice of it visible under a half-closed shutter, and the canvas awning over the pavement.
// Called by the building generator with face-local helpers (see buildings.js):
//   P(f, s, y, d) -> world point; s runs along the wall, y up, d outward (negative = indoors).
//
// Interiors are real geometry drawn by one unlit, vertex-coloured material: there are no
// lights to spare for rooms, so the lighting is baked into the vertex colours when the room
// is built (a few lamp positions with shadow rays against the furniture, ambient with corner
// darkening, a cool fill from the street). Labels, menus, tiles and wood come from one atlas.
// Rooms are only recorded while the buildings go up; finish() plans them (so two shops on a
// corner never share space), builds them and merges everything into three meshes.
import * as THREE from "three";

const SERIF = '"CT Serif", "Noto Serif TC", "Songti TC", "PingFang TC", serif';
const KAI =
  '"CT Kai", "LXGW WenKai TC", "Kaiti TC", "BiauKai", "CT Serif", serif';
const FL = 0.16; // shop floor: one small step above the pavement
const GAIN = 1.0; // overall brightness of baked interiors against the street's exposure

// Small generator of its own, so fitting out a shop never shifts the level's random sequence.
function prng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [base, accent, ink, words] for printed packaging
const BOXES = [
  ["#c8231c", "#f2c230", "#ffffff", "即食麵"],
  ["#f4d13a", "#c8231c", "#7a1010", "蛋卷"],
  ["#1f6a3c", "#f0e6c8", "#ffffff", "龍井"],
  ["#f0e6d2", "#c8231c", "#c8231c", "餅乾"],
  ["#2a4f9a", "#f4f0e0", "#ffffff", "砂糖"],
  ["#e8862a", "#fff3d0", "#5a1a08", "蝦片"],
  ["#7a1a5a", "#f2c230", "#ffffff", "月餅"],
  ["#f6f2e6", "#2a4f9a", "#2a4f9a", "生粉"],
  ["#b01818", "#ffe9a0", "#ffe9a0", "香燭"],
  ["#3a8a8a", "#ffffff", "#ffffff", "洗衣粉"],
  ["#e9c9a0", "#7a4a20", "#5a2a10", "米粉"],
  ["#d8e6c0", "#2a6a2a", "#2a6a2a", "蚊香"],
  ["#f0a0a0", "#ffffff", "#a01020", "肥皂"],
  ["#202020", "#f2c230", "#f2c230", "茶葉"],
  ["#f2ead8", "#d04a1a", "#d04a1a", "麵粉"],
  ["#5a2a80", "#ffd84a", "#ffffff", "火柴"],
];
const TINS = [
  ["#b3261e", "#f6e3a8", "#ffffff", "午餐肉"],
  ["#f2c230", "#b3261e", "#7a1010", "豆豉鯪魚"],
  ["#1f5a8a", "#f4f0e0", "#ffffff", "沙甸魚"],
  ["#f4f0e0", "#b3261e", "#b3261e", "煉奶"],
  ["#2a7a3a", "#ffe9a0", "#ffffff", "粟米"],
  ["#d04a1a", "#ffffff", "#ffffff", "茄汁豆"],
  ["#f0d8a0", "#7a4a20", "#5a2a10", "蘑菇"],
  ["#a02060", "#fff0c0", "#ffffff", "荔枝"],
  ["#e8b02a", "#2a6a2a", "#1a4a1a", "菠蘿"],
  ["#f4f4f0", "#2a7a3a", "#2a7a3a", "椰漿"],
];
// ... plus the colour of what is in the bottle
const BOTTLES = [
  ["#f4e9c8", "#b3261e", "#201008", "生抽", 0x1a0d08],
  ["#b3261e", "#f2c230", "#ffffff", "老抽", 0x120806],
  ["#f2c230", "#b3261e", "#7a1010", "蠔油", 0x2a1408],
  ["#f6f2e6", "#2a6a2a", "#2a6a2a", "麻油", 0x4a2a0c],
  ["#ffffff", "#c8231c", "#c8231c", "米醋", 0xb8b08a],
  ["#c8231c", "#ffffff", "#ffffff", "辣椒醬", 0xa02410],
  ["#f4d13a", "#2a6a2a", "#2a4a1a", "花生油", 0xd9a82a],
  ["#e9e2d0", "#5a2a80", "#3a1a50", "腐乳", 0xd8c8a0],
];
const TEAS = [
  ["#8a1a14", "#e9c46a", "鐵觀音"],
  ["#1f4a34", "#e9c46a", "普洱"],
  ["#c9a13a", "#5a1a10", "龍井"],
  ["#262626", "#d8b45a", "烏龍"],
  ["#a83a1a", "#f2e2b0", "香片"],
  ["#34506a", "#e8d8a8", "壽眉"],
  ["#6a1a2a", "#e9c46a", "水仙"],
  ["#b98a2a", "#3a1408", "大紅袍"],
];
const HERBS = [
  "當歸 黃芪",
  "黨參 枸杞",
  "甘草 陳皮",
  "茯苓 白朮",
  "川芎 熟地",
  "杜仲 桂枝",
  "紅棗 淮山",
  "百合 蓮子",
  "薏米 菊花",
  "田七 人參",
  "鹿茸 靈芝",
  "金銀花 羅漢果",
];
const MENU = [
  ["叉燒飯", 38],
  ["燒鴨飯", 42],
  ["雲吞麵", 32],
  ["牛腩麵", 40],
  ["魚蛋粉", 30],
  ["乾炒牛河", 52],
  ["揚州炒飯", 48],
  ["星洲炒米", 48],
  ["菠蘿包", 8],
  ["蛋撻", 7],
  ["西多士", 24],
  ["奶茶", 16],
  ["鴛鴦", 18],
  ["檸茶", 16],
];
const ROAST = [
  ["燒鵝", 168],
  ["燒鴨", 78],
  ["叉燒", 88],
  ["燒肉", 98],
  ["油雞", 68],
];

// ---------------------------------------------------------------------------------------
// The atlas: tileable materials (painted light, tinted by vertex colour), packaging, wall
// art, awning canvas, and a few cut-outs with alpha (stains, soft shadows, glass streaks).
// ---------------------------------------------------------------------------------------
function paintAtlas(aniso) {
  const SIZE = 2048,
    STEP = 8;
  const cv = document.createElement("canvas");
  cv.width = cv.height = SIZE;
  const g = cv.getContext("2d");
  g.fillStyle = "#8f887c";
  g.fillRect(0, 0, SIZE, SIZE);
  const sky = new Uint16Array(SIZE / STEP); // skyline packer, as in signs.js
  const R = prng(977);
  const rr = (a, b) => a + (b - a) * R();
  function alloc(w, h) {
    const wc = Math.ceil(w / STEP);
    let best = 0,
      bestY = 1e9;
    for (let i = 0; i + wc <= sky.length; i++) {
      let y = 0;
      for (let k = 0; k < wc; k++) if (sky[i + k] > y) y = sky[i + k];
      if (y < bestY) {
        bestY = y;
        best = i;
      }
    }
    if (bestY + h > SIZE) {
      console.warn("[chinatown] shop atlas is full");
      return { x: 0, y: 0 };
    }
    for (let k = 0; k < wc; k++) sky[best + k] = bestY + h;
    return { x: best * STEP, y: bestY };
  }
  // One picture. fn paints in its own pixel space; returns [u0, v0, u1, v1] (v0 = bottom).
  function cell(w, h, fn, alpha) {
    const r = alloc(w + 8, h + 8);
    const x = r.x + 4,
      y = r.y + 4;
    g.save();
    g.beginPath();
    g.rect(x - 3, y - 3, w + 6, h + 6);
    g.clip();
    if (alpha) g.clearRect(x - 4, y - 4, w + 8, h + 8);
    g.translate(x, y);
    fn(g, w, h);
    g.restore();
    return [
      (x + 0.5) / SIZE,
      1 - (y + h - 0.5) / SIZE,
      (x + w - 0.5) / SIZE,
      1 - (y + 0.5) / SIZE,
    ];
  }
  // A repeating patch: painted once, then laid 3 x 3 so the cell has a continuous gutter and
  // neighbouring quads can each show one repeat without seams in the mip chain.
  function tile(px, fn) {
    const GUT = 16;
    const c2 = document.createElement("canvas");
    c2.width = c2.height = px;
    fn(c2.getContext("2d"), px);
    const r = alloc(px + 2 * GUT + 2, px + 2 * GUT + 2);
    g.save();
    g.beginPath();
    g.rect(r.x, r.y, px + 2 * GUT, px + 2 * GUT);
    g.clip();
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        g.drawImage(c2, r.x + GUT + i * px, r.y + GUT + j * px);
    g.restore();
    const x = r.x + GUT,
      y = r.y + GUT;
    return [x / SIZE, 1 - (y + px) / SIZE, (x + px) / SIZE, 1 - y / SIZE];
  }
  const fill = (c, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(-4, -4, w + 8, h + 8);
  };
  const txt = (c, s, x, y, px, font, color, weight = 700) => {
    c.font = `${weight} ${px}px ${font}`;
    c.fillStyle = color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(s, x, y);
  };
  // one glyph per cell, top to bottom
  const vtxt = (c, s, x, y0, y1, px, font, color, weight) => {
    const ch = [...s];
    const st = (y1 - y0) / ch.length;
    ch.forEach((q, i) =>
      txt(
        c,
        q,
        x,
        y0 + st * (i + 0.5),
        Math.min(px, st * 0.96),
        font,
        color,
        weight,
      ),
    );
  };
  const speck = (c, w, h, n, alpha, dark = true, s = 3) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = dark
        ? `rgba(40,28,16,${R() * alpha})`
        : `rgba(255,255,255,${R() * alpha})`;
      c.fillRect(R() * w, R() * h, 1 + R() * s, 1 + R() * s);
    }
  };
  const blotch = (c, w, h, n, color, r0, r1) => {
    for (let i = 0; i < n; i++) {
      const x = R() * w,
        y = R() * h,
        r = rr(r0, r1);
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gr;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };

  const A = {};
  A.white = cell(40, 40, (c, w, h) => fill(c, w, h, "#ffffff"));

  // ---- materials ----
  A.tile = tile(192, (c, n) => {
    c.fillStyle = "#aaa397";
    c.fillRect(0, 0, n, n);
    const k = n / 4;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const v = 232 + Math.floor(rr(-10, 10));
        c.fillStyle = `rgb(${v + 6},${v + 5},${v - 2})`;
        c.fillRect(i * k + 1.5, j * k + 1.5, k - 3, k - 3);
        const gr = c.createLinearGradient(i * k, j * k, i * k + k, j * k + k);
        gr.addColorStop(0, "rgba(255,255,255,0.35)");
        gr.addColorStop(0.5, "rgba(255,255,255,0)");
        gr.addColorStop(1, "rgba(60,50,30,0.12)");
        c.fillStyle = gr;
        c.fillRect(i * k + 1.5, j * k + 1.5, k - 3, k - 3);
      }
    blotch(c, n, n, 5, "rgba(90,70,40,0.10)", 20, 60);
    speck(c, n, n, 160, 0.16);
  });
  A.check = tile(192, (c, n) => {
    const k = n / 2;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? "#e9e3d2" : "#55695e";
        c.fillRect(i * k, j * k, k, k);
      }
    speck(c, n, n, 900, 0.3, true, 2);
    speck(c, n, n, 700, 0.3, false, 2);
    c.strokeStyle = "rgba(50,44,36,0.7)";
    c.lineWidth = 2;
    c.strokeRect(0, 0, k, k);
    c.strokeRect(k, k, k, k);
    c.strokeRect(-1, -1, n + 2, n + 2);
    blotch(c, n, n, 4, "rgba(60,45,25,0.16)", 30, 70);
  });
  A.plank = tile(192, (c, n) => {
    const k = n / 4;
    for (let j = 0; j < 4; j++) {
      const v = rr(0.86, 1);
      c.fillStyle = `rgb(${220 * v},${198 * v},${166 * v})`;
      c.fillRect(0, j * k, n, k);
      for (let i = 0; i < 14; i++) {
        c.strokeStyle = `rgba(90,58,28,${rr(0.06, 0.22)})`;
        c.lineWidth = rr(0.5, 1.6);
        const y = j * k + rr(2, k - 2);
        c.beginPath();
        c.moveTo(0, y);
        c.bezierCurveTo(n * 0.3, y + rr(-3, 3), n * 0.7, y + rr(-3, 3), n, y);
        c.stroke();
      }
      c.fillStyle = "rgba(30,18,8,0.75)";
      c.fillRect(0, j * k, n, 1.5);
      c.fillRect(((j * 0.37) % 1) * n, j * k, 1.5, k);
    }
    speck(c, n, n, 200, 0.15);
  });
  A.wood = tile(192, (c, n) => {
    c.fillStyle = "#eadfce";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < 110; i++) {
      const x = R() * n;
      c.strokeStyle = `rgba(96,60,28,${rr(0.05, 0.24)})`;
      c.lineWidth = rr(0.5, 2.2);
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + rr(-5, 5), n * 0.33, x + rr(-5, 5), n * 0.66, x, n);
      c.stroke();
    }
  });
  A.plaster = tile(192, (c, n) => {
    c.fillStyle = "#f0ece1";
    c.fillRect(0, 0, n, n);
    blotch(c, n, n, 9, "rgba(120,96,60,0.08)", 20, 70);
    blotch(c, n, n, 5, "rgba(255,255,255,0.12)", 20, 50);
    speck(c, n, n, 500, 0.08);
  });
  A.terrazzo = tile(192, (c, n) => {
    c.fillStyle = "#d9d4c8";
    c.fillRect(0, 0, n, n);
    const chips = ["#b3aa98", "#8d8576", "#efeae0", "#a39078", "#c7b9a0"];
    for (let i = 0; i < 900; i++) {
      c.fillStyle = chips[Math.floor(R() * chips.length)];
      c.beginPath();
      c.ellipse(R() * n, R() * n, rr(1, 3.4), rr(0.8, 2.4), R() * 3.14, 0, 6.3);
      c.fill();
    }
    blotch(c, n, n, 4, "rgba(70,55,35,0.12)", 30, 70);
  });
  A.sack = tile(96, (c, n) => {
    c.fillStyle = "#eadfc4";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 3) {
      c.fillStyle = `rgba(110,84,44,${rr(0.1, 0.28)})`;
      c.fillRect(i, 0, 1, n);
      c.fillRect(0, i, n, 1);
    }
  });
  A.card = tile(96, (c, n) => {
    c.fillStyle = "#d8b98c";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 4) {
      c.fillStyle = `rgba(110,76,36,${rr(0.04, 0.14)})`;
      c.fillRect(i, 0, 1.5, n);
    }
    speck(c, n, n, 120, 0.12);
  });
  A.steel = tile(96, (c, n) => {
    c.fillStyle = "#dfe2e4";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < 150; i++) {
      c.fillStyle =
        R() < 0.5
          ? `rgba(255,255,255,${rr(0.05, 0.3)})`
          : `rgba(60,70,80,${rr(0.04, 0.16)})`;
      c.fillRect(0, R() * n, n, rr(0.4, 1.4));
    }
  });
  // awning canvas, tinted by vertex colour: v = 0 at the lip (dirt), v = 1 at the wall
  A.canvas = cell(512, 256, (c, w, h) => {
    fill(c, w, h, "#f1eee6");
    for (let i = 0; i < w; i += 2) {
      c.fillStyle = `rgba(70,62,50,${rr(0.03, 0.1)})`;
      c.fillRect(i, 0, 1, h);
    }
    for (let j = 0; j < h; j += 2) {
      c.fillStyle = `rgba(70,62,50,${rr(0.03, 0.1)})`;
      c.fillRect(0, j, w, 1);
    }
    blotch(c, w, h, 14, "rgba(255,255,255,0.22)", 30, 90); // sun fade
    for (let i = 0; i < 120; i++) {
      // rain runs from the wall edge
      const x = R() * w,
        len = rr(0.2, 1) * h;
      const gr = c.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, `rgba(58,50,38,${rr(0.1, 0.3)})`);
      gr.addColorStop(1, "rgba(58,50,38,0)");
      c.fillStyle = gr;
      c.fillRect(x, 0, rr(1, 5), len);
    }
    const dirt = c.createLinearGradient(0, h * 0.72, 0, h);
    dirt.addColorStop(0, "rgba(52,44,30,0)");
    dirt.addColorStop(1, "rgba(52,44,30,0.6)");
    c.fillStyle = dirt;
    c.fillRect(-4, h * 0.72, w + 8, h * 0.28 + 4);
    blotch(c, w, h, 18, "rgba(40,48,30,0.2)", 6, 22); // mildew
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(40,46,28,${rr(0.1, 0.35)})`;
      c.fillRect(R() * w, h - R() * R() * 60, rr(1, 3), rr(1, 3));
    }
  });
  A.valance = cell(256, 64, (c, w, h) => {
    fill(c, w, h, "#efece4");
    for (let i = 0; i < w; i += 2) {
      c.fillStyle = `rgba(70,62,50,${rr(0.03, 0.1)})`;
      c.fillRect(i, 0, 1, h);
    }
    const dirt = c.createLinearGradient(0, h * 0.35, 0, h);
    dirt.addColorStop(0, "rgba(52,44,30,0)");
    dirt.addColorStop(1, "rgba(52,44,30,0.55)");
    c.fillStyle = dirt;
    c.fillRect(-4, 0, w + 8, h + 4);
    c.strokeStyle = "rgba(40,34,24,0.5)";
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(0, 5);
    c.lineTo(w, 5);
    c.stroke();
    c.setLineDash([]);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(58,50,38,${rr(0.08, 0.25)})`;
      c.fillRect(R() * w, 0, rr(1, 4), rr(0.3, 1) * h);
    }
  });

  // ---- packaging ----
  function label(c, w, h, [base, acc, ink, words], style, vertical) {
    fill(c, w, h, base);
    c.fillStyle = acc;
    if (style === 0) {
      c.fillRect(-4, -4, w + 8, h * 0.18 + 4);
      c.fillRect(-4, h * 0.84, w + 8, h);
    } else if (style === 1) {
      c.beginPath();
      c.ellipse(w / 2, h / 2, w * 0.44, h * 0.42, 0, 0, 6.3);
      c.fill();
      ink = base;
    } else if (style === 2) {
      c.beginPath();
      c.moveTo(-4, h * 0.62);
      c.lineTo(w + 4, h * 0.38);
      c.lineTo(w + 4, h + 4);
      c.lineTo(-4, h + 4);
      c.fill();
    } else {
      c.fillRect(-4, h * 0.42, w + 8, h * 0.07);
      c.fillRect(-4, h * 0.54, w + 8, h * 0.03);
    }
    c.strokeStyle = acc;
    c.lineWidth = 1.5;
    c.strokeRect(2.5, 2.5, w - 5, h - 5);
    if (vertical)
      vtxt(c, words, w / 2, h * 0.16, h * 0.86, w * 0.5, SERIF, ink, 900);
    else {
      const px = Math.min(h * 0.5, (w * 0.86) / [...words].length);
      txt(c, words, w / 2, h * 0.5, px, SERIF, ink, 900);
    }
  }
  A.boxes = BOXES.map((p, i) => ({
    uv: cell(56, 80, (c, w, h) => label(c, w, h, p, i % 4, true)),
    base: p[0],
  }));
  // can labels wrap right round: the same panel twice, so one always faces the shopper
  A.tins = TINS.map((p, i) => ({
    uv: cell(128, 52, (c, w, h) => {
      for (let k = 0; k < 2; k++) {
        c.save();
        c.translate(k * 64, 0);
        c.beginPath();
        c.rect(k ? 0 : -4, -4, 68, h + 8);
        c.clip();
        label(c, 64, h, p, i % 3 === 1 ? 1 : 0, false);
        c.restore();
      }
    }),
    base: p[0],
  }));
  A.bottles = BOTTLES.map((p, i) => ({
    uv: cell(96, 48, (c, w, h) => {
      for (let k = 0; k < 2; k++) {
        c.save();
        c.translate(k * 48, 0);
        c.beginPath();
        c.rect(k ? 0 : -4, -4, 52, h + 8);
        c.clip();
        label(c, 48, h, p, i % 2 ? 3 : 0, false);
        c.restore();
      }
    }),
    base: p[0],
    glass: p[4],
  }));
  A.teas = TEAS.map(([base, gold, words]) => ({
    uv: cell(192, 112, (c, w, h) => {
      fill(c, w, h, base);
      c.fillStyle = gold;
      c.fillRect(-4, 6, w + 8, 3);
      c.fillRect(-4, h - 9, w + 8, 3);
      for (let k = 0; k < 2; k++) {
        const x = 48 + k * 96;
        c.fillStyle = "#f3ead2";
        c.fillRect(x - 26, 16, 52, h - 32);
        c.strokeStyle = gold;
        c.lineWidth = 2;
        c.strokeRect(x - 23, 19, 46, h - 38);
        vtxt(c, words, x, 22, h - 22, 30, KAI, "#1c1410");
      }
    }),
    base,
  }));
  A.drawers = HERBS.map((pair) =>
    cell(64, 52, (c, w, h) => {
      const v = rr(0.85, 1.05);
      fill(c, w, h, `rgb(${122 * v},${78 * v},${44 * v})`);
      for (let i = 0; i < 16; i++) {
        c.fillStyle = `rgba(40,20,8,${rr(0.08, 0.3)})`;
        c.fillRect(0, R() * h, w, rr(0.5, 1.5));
      }
      c.strokeStyle = "rgba(30,14,6,0.7)";
      c.lineWidth = 2;
      c.strokeRect(1, 1, w - 2, h - 2);
      c.strokeStyle = "rgba(255,220,170,0.18)";
      c.lineWidth = 1;
      c.strokeRect(3.5, 3.5, w - 7, h - 7);
      const names = pair.split(" ");
      names.forEach((s, i) => {
        const x = i ? w - 15 : 15;
        c.fillStyle = "#eadfbe";
        c.fillRect(x - 8, 7, 16, h - 14);
        vtxt(c, s, x, 9, h - 9, 13, KAI, "#2a1a10");
      });
    }),
  );
  A.jarLabel = ["參", "杞", "棗", "菊"].map((s) =>
    cell(48, 48, (c, w, h) => {
      fill(c, w, h, "#b01c16");
      c.strokeStyle = "#e9c46a";
      c.lineWidth = 2;
      c.strokeRect(3, 3, w - 6, h - 6);
      txt(c, s, w / 2, h / 2 + 1, 30, KAI, "#f6e7b0");
    }),
  );
  A.carton = ["易碎", "向上"].map((s) =>
    cell(128, 96, (c, w, h) => {
      fill(c, w, h, "#c9a676");
      for (let i = 0; i < w; i += 4) {
        c.fillStyle = `rgba(110,76,36,${rr(0.04, 0.14)})`;
        c.fillRect(i, 0, 1.5, h);
      }
      c.fillStyle = "rgba(226,206,160,0.8)";
      c.fillRect(-4, h * 0.44, w + 8, h * 0.14);
      txt(c, s, w * 0.3, h * 0.24, 24, SERIF, "rgba(40,24,12,0.75)", 900);
      c.strokeStyle = "rgba(40,24,12,0.7)";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w * 0.72, h * 0.36);
      c.lineTo(w * 0.72, h * 0.12);
      c.moveTo(w * 0.64, h * 0.2);
      c.lineTo(w * 0.72, h * 0.1);
      c.lineTo(w * 0.8, h * 0.2);
      c.stroke();
      txt(c, "30 × 12", w * 0.5, h * 0.8, 16, SERIF, "rgba(40,24,12,0.6)", 900);
    }),
  );
  A.rice = cell(128, 176, (c, w, h) => {
    fill(c, w, h, "#e9dfc6");
    for (let i = 0; i < w; i += 3) {
      c.fillStyle = `rgba(110,84,44,${rr(0.08, 0.22)})`;
      c.fillRect(i, 0, 1, h);
    }
    for (let j = 0; j < h; j += 3) {
      c.fillStyle = `rgba(110,84,44,${rr(0.08, 0.22)})`;
      c.fillRect(0, j, w, 1);
    }
    c.strokeStyle = "#b3261e";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(w / 2, h * 0.36, 38, 0, 6.3);
    c.stroke();
    txt(c, "米", w / 2, h * 0.37, 52, SERIF, "#b3261e", 900);
    txt(c, "泰國香米", w / 2, h * 0.7, 24, SERIF, "#1f4a34", 900);
    txt(c, "25 KG", w / 2, h * 0.86, 18, SERIF, "#1f4a34", 900);
  });
  A.teaChest = cell(128, 96, (c, w, h) => {
    fill(c, w, h, "#b89468");
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(70,44,18,${rr(0.06, 0.25)})`;
      c.fillRect(0, R() * h, w, rr(0.5, 2));
    }
    c.fillStyle = "rgba(40,24,10,0.55)";
    c.fillRect(-4, h / 3, w + 8, 1.5);
    c.fillRect(-4, (h * 2) / 3, w + 8, 1.5);
    txt(c, "茶", w / 2, h / 2, 54, SERIF, "rgba(30,60,40,0.8)", 900);
  });

  // ---- wall art and counters ----
  A.menu = cell(448, 288, (c, w, h) => {
    fill(c, w, h, "#f3ecd8");
    blotch(c, w, h, 8, "rgba(150,120,60,0.1)", 30, 90);
    c.fillStyle = "#a81c14";
    c.fillRect(-4, -4, w + 8, 44);
    txt(c, "今日特價 · 早餐 午餐 下午茶", w / 2, 20, 26, KAI, "#fff3d0");
    MENU.forEach(([name, price], i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const x = col * (w / 2) + 18,
        y = 66 + row * 31;
      c.textAlign = "left";
      c.font = `700 25px ${KAI}`;
      c.fillStyle = i === 3 || i === 8 ? "#a81c14" : "#1c1814";
      c.textBaseline = "middle";
      c.fillText(name, x, y);
      c.textAlign = "right";
      c.fillStyle = "#a81c14";
      c.fillText("$" + price, x + w / 2 - 40, y);
      c.fillStyle = "rgba(60,50,40,0.25)";
      c.fillRect(x, y + 14, w / 2 - 40, 1);
    });
  });
  A.roast = ROAST.map(([name, price]) =>
    cell(52, 192, (c, w, h) => {
      fill(c, w, h, "#c4201a");
      blotch(c, w, h, 3, "rgba(60,0,0,0.25)", 10, 40);
      vtxt(c, name, w / 2, 8, h * 0.62, 38, KAI, "#ffe9a0");
      txt(c, "$" + price, w / 2, h * 0.78, 20, KAI, "#ffffff");
      txt(c, "每斤", w / 2, h * 0.91, 15, KAI, "#ffe9a0");
    }),
  );
  A.clock = cell(128, 128, (c, w, h) => {
    fill(c, w, h, "#2a2622");
    c.fillStyle = "#f4f0e4";
    c.beginPath();
    c.arc(w / 2, h / 2, 56, 0, 6.3);
    c.fill();
    c.strokeStyle = "#1c1a18";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      c.lineWidth = i % 3 ? 2 : 4;
      c.beginPath();
      c.moveTo(w / 2 + Math.sin(a) * 44, h / 2 - Math.cos(a) * 44);
      c.lineTo(w / 2 + Math.sin(a) * 52, h / 2 - Math.cos(a) * 52);
      c.stroke();
    }
    c.lineCap = "round";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(w / 2, h / 2);
    c.lineTo(w / 2 + 22, h / 2 + 14);
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2, h / 2);
    c.lineTo(w / 2 - 12, h / 2 - 40);
    c.stroke();
    c.fillStyle = "#b3261e";
    c.beginPath();
    c.arc(w / 2, h / 2, 4, 0, 6.3);
    c.fill();
  });
  A.calendar = cell(112, 168, (c, w, h) => {
    fill(c, w, h, "#f6f1e4");
    c.fillStyle = "#b3261e";
    c.fillRect(-4, -4, w + 8, 40);
    txt(c, "十一月", w / 2, 18, 24, SERIF, "#fff3d0", 900);
    txt(c, "11", w / 2, 92, 84, SERIF, "#b3261e", 900);
    txt(c, "星期三 · 宜出行", w / 2, 150, 13, KAI, "#2a2420");
  });
  A.scrolls = ["茶禪一味", "寧靜致遠", "和氣生財"].map((s) =>
    cell(96, 352, (c, w, h) => {
      fill(c, w, h, "#6a5a3a");
      c.fillStyle = "#ece2c6";
      c.fillRect(8, 26, w - 16, h - 52);
      blotch(c, w, h, 6, "rgba(120,96,50,0.14)", 20, 60);
      vtxt(c, s, w / 2, 44, h - 80, 64, KAI, "#16120e");
      c.fillStyle = "#b3261e";
      c.fillRect(w - 30, h - 62, 16, 16);
      c.fillStyle = "#3a2a18";
      c.fillRect(-4, -4, w + 8, 12);
      c.fillRect(-4, h - 8, w + 8, 12);
    }),
  );
  A.faichun = ["生意興隆", "出入平安", "招財進寶"].map((s) =>
    cell(56, 208, (c, w, h) => {
      fill(c, w, h, "#c8201a");
      speck(c, w, h, 60, 0.5, false, 2);
      vtxt(c, s, w / 2, 8, h - 8, 42, KAI, "#16100c");
    }),
  );
  A.fu = cell(96, 96, (c, w, h) => {
    fill(c, w, h, "#c8201a");
    c.strokeStyle = "#e9c46a";
    c.lineWidth = 3;
    c.strokeRect(5, 5, w - 10, h - 10);
    txt(c, "福", w / 2, h / 2 + 2, 66, KAI, "#f6e7b0");
  });
  A.shrine = cell(128, 144, (c, w, h) => {
    fill(c, w, h, "#b01c16");
    c.strokeStyle = "#e9c46a";
    c.lineWidth = 3;
    c.strokeRect(5, 5, w - 10, h - 10);
    vtxt(c, "五方五土龍神", w * 0.7, 12, h - 12, 20, KAI, "#f6e7b0");
    vtxt(c, "前後地主財神", w * 0.3, 12, h - 12, 20, KAI, "#f6e7b0");
  });
  A.till = cell(96, 64, (c, w, h) => {
    fill(c, w, h, "#3a3d40");
    c.fillStyle = "#0c1a10";
    c.fillRect(8, 6, w - 16, 16);
    txt(c, "0.00", w - 30, 15, 13, SERIF, "#5cff8a", 900);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        c.fillStyle =
          i === 5 ? "#b3261e" : j === 2 && i > 3 ? "#e9c46a" : "#d8d4c8";
        c.fillRect(8 + i * 14, 28 + j * 11, 11, 8);
      }
  });
  A.dial = cell(64, 64, (c, w, h) => {
    fill(c, w, h, "#b3261e");
    c.fillStyle = "#f4f0e4";
    c.beginPath();
    c.arc(w / 2, h / 2, 28, 0, 6.3);
    c.fill();
    c.strokeStyle = "#1c1a18";
    c.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * 6.283;
      c.beginPath();
      c.moveTo(w / 2 + Math.sin(a) * 22, h / 2 - Math.cos(a) * 22);
      c.lineTo(w / 2 + Math.sin(a) * 26, h / 2 - Math.cos(a) * 26);
      c.stroke();
    }
    c.strokeStyle = "#b3261e";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(w / 2, h / 2);
    c.lineTo(w / 2 + 14, h / 2 - 16);
    c.stroke();
  });
  A.paper = cell(96, 128, (c, w, h) => {
    fill(c, w, h, "#d9d5c8");
    c.fillStyle = "#1c1a18";
    c.fillRect(6, 6, w - 12, 14);
    c.fillStyle = "rgba(40,38,34,0.7)";
    c.fillRect(6, 26, 40, 30);
    for (let j = 0; j < 30; j++)
      c.fillRect(
        j < 10 ? 52 : 6,
        28 + j * 3.2,
        rr(0.5, 1) * (j < 10 ? 38 : w - 12),
        1.4,
      );
  });
  A.posters = [
    ["#e8b02a", "#8a1a14", "鮮", "醬油"],
    ["#1f4a34", "#f2e2b0", "凍", "啤酒"],
  ].map(([bg, ink, big, small]) =>
    cell(128, 176, (c, w, h) => {
      fill(c, w, h, bg);
      c.fillStyle = "rgba(255,255,255,0.85)";
      c.beginPath();
      c.arc(w / 2, h * 0.4, 46, 0, 6.3);
      c.fill();
      txt(c, big, w / 2, h * 0.41, 62, SERIF, ink, 900);
      txt(c, small, w / 2, h * 0.82, 36, SERIF, ink, 900);
      blotch(c, w, h, 4, "rgba(60,40,10,0.18)", 20, 60);
    }),
  );
  A.plaque = cell(160, 160, (c, w, h) => {
    fill(c, w, h, "#3a1c10");
    for (let i = 0; i < 50; i++) {
      c.fillStyle = `rgba(0,0,0,${rr(0.05, 0.25)})`;
      c.fillRect(0, R() * h, w, rr(0.5, 2));
    }
    txt(c, "茶", w / 2, h / 2 + 4, 112, KAI, "#d8b45a");
  });
  A.board = cell(384, 96, (c, w, h) => {
    fill(c, w, h, "#1c1210");
    c.strokeStyle = "#c9a13a";
    c.lineWidth = 4;
    c.strokeRect(6, 6, w - 12, h - 12);
    [..."妙手回春"].forEach((q, i) =>
      txt(c, q, w * (0.86 - i * 0.24), h / 2 + 3, 62, KAI, "#e2bc58"),
    );
  });
  A.closed = cell(112, 72, (c, w, h) => {
    fill(c, w, h, "#f4f0e4");
    c.strokeStyle = "#b3261e";
    c.lineWidth = 4;
    c.strokeRect(4, 4, w - 8, h - 8);
    txt(c, "暫停營業", w / 2, h / 2 + 2, 24, SERIF, "#b3261e", 900);
  });
  A.prices = [48, 68, 128, 280].map((n) =>
    cell(64, 40, (c, w, h) => {
      fill(c, w, h, "#fbf6e6");
      c.strokeStyle = "#b3261e";
      c.lineWidth = 2;
      c.strokeRect(2, 2, w - 4, h - 4);
      txt(c, "$" + n, w / 2, h / 2 + 1, 22, KAI, "#b3261e");
    }),
  );
  A.cake = cell(96, 96, (c, w, h) => {
    fill(c, w, h, "#e6dcc0");
    c.strokeStyle = "#8a1a14";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(w / 2, h / 2, 36, 0, 6.3);
    c.stroke();
    c.lineWidth = 1;
    c.beginPath();
    c.arc(w / 2, h / 2, 31, 0, 6.3);
    c.stroke();
    vtxt(c, "普洱", w / 2, 22, h - 22, 26, KAI, "#1f4a34");
  });
  A.crackle = cell(96, 96, (c, w, h) => {
    fill(c, w, h, "#c98838");
    for (let i = 0; i < 380; i++) {
      c.fillStyle =
        R() < 0.6
          ? `rgba(240,190,100,${rr(0.2, 0.7)})`
          : `rgba(90,40,10,${rr(0.2, 0.6)})`;
      c.beginPath();
      c.arc(R() * w, R() * h, rr(1, 3.5), 0, 6.3);
      c.fill();
    }
  });
  A.pork = cell(96, 48, (c, w, h) => {
    fill(c, w, h, "#b98a6a");
    const bands = [
      "#c98838",
      "#f0e2c4",
      "#a86a52",
      "#ecdcbc",
      "#96584a",
      "#a86a52",
    ];
    bands.forEach((b, i) => {
      c.fillStyle = b;
      c.fillRect(-4, (i * h) / 6 - 1, w + 8, h / 6 + 2);
    });
    speck(c, w, h, 200, 0.3);
  });
  A.dried = cell(96, 96, (c, w, h) => {
    fill(c, w, h, "#b9a078");
    for (let i = 0; i < 260; i++) {
      const v = rr(0.55, 1.15);
      c.fillStyle = `rgb(${200 * v},${170 * v},${120 * v})`;
      c.strokeStyle = "rgba(50,30,10,0.5)";
      c.beginPath();
      c.ellipse(R() * w, R() * h, rr(2, 6), rr(1.5, 4), R() * 3.14, 0, 6.3);
      c.fill();
      c.stroke();
    }
  });
  A.fret = cell(128, 32, (c, w, h) => {
    fill(c, w, h, "#e6d8c4");
    c.strokeStyle = "rgba(50,24,10,0.85)";
    c.lineWidth = 2.5;
    for (let x = 0; x < w + 32; x += 32) {
      c.beginPath();
      c.moveTo(x, h - 5);
      c.lineTo(x, 5);
      c.lineTo(x + 24, 5);
      c.lineTo(x + 24, h - 11);
      c.lineTo(x + 8, h - 11);
      c.lineTo(x + 8, 12);
      c.lineTo(x + 16, 12);
      c.stroke();
    }
  });
  A.planks = cell(192, 256, (c, w, h) => {
    fill(c, w, h, "#1a1612");
    for (let j = 0; j < 5; j++) {
      const y = 6 + j * 50 + rr(-3, 3),
        v = rr(0.7, 1);
      c.save();
      c.translate(w / 2, y + 20);
      c.rotate(rr(-0.05, 0.05));
      c.fillStyle = `rgb(${150 * v},${116 * v},${78 * v})`;
      c.fillRect(-w / 2 - 6, -20, w + 12, 40);
      for (let i = 0; i < 14; i++) {
        c.fillStyle = `rgba(50,30,12,${rr(0.1, 0.35)})`;
        c.fillRect(-w / 2, rr(-19, 19), w, rr(0.5, 2));
      }
      c.fillStyle = "#2a2a2c";
      for (const x of [-w / 2 + 12, w / 2 - 12]) {
        c.beginPath();
        c.arc(x, rr(-8, 8), 3, 0, 6.3);
        c.fill();
      }
      c.restore();
    }
  });
  A.drinks = cell(128, 192, (c, w, h) => {
    fill(c, w, h, "#dfeaf0");
    const tones = [
      "#c8231c",
      "#1f6a3c",
      "#f2c230",
      "#2a4f9a",
      "#e8862a",
      "#f4f4f0",
      "#3a1a10",
    ];
    for (let j = 0; j < 4; j++) {
      const y0 = j * 48;
      c.fillStyle = "#8a98a0";
      c.fillRect(-4, y0 + 44, w + 8, 4);
      let x = 3;
      while (x < w - 10) {
        const bw = rr(11, 16),
          bh = rr(26, 38);
        c.fillStyle = tones[Math.floor(R() * tones.length)];
        c.fillRect(x, y0 + 44 - bh, bw, bh);
        c.fillStyle = "rgba(255,255,255,0.55)";
        c.fillRect(x + 2, y0 + 44 - bh * 0.6, bw - 4, bh * 0.25);
        c.fillStyle = "rgba(255,255,255,0.35)";
        c.fillRect(x + 1, y0 + 44 - bh, 2, bh);
        x += bw + rr(1, 3);
      }
    }
  });
  A.cold = cell(128, 32, (c, w, h) => {
    fill(c, w, h, "#1f5a9a");
    txt(c, "冰凍飲品", w / 2, h / 2 + 1, 22, SERIF, "#ffffff", 900);
  });
  A.curtain = cell(128, 128, (c, w, h) => {
    fill(c, w, h, "#2a4a7a");
    for (let i = 0; i < w; i += 2) {
      c.fillStyle = `rgba(10,20,40,${rr(0.05, 0.2)})`;
      c.fillRect(i, 0, 1, h);
    }
    c.strokeStyle = "#e8e2d0";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(w / 2, h * 0.52, 34, 0, 6.3);
    c.stroke();
    txt(c, "福", w / 2, h * 0.53, 40, KAI, "#e8e2d0");
    c.fillStyle = "rgba(8,14,30,0.8)";
    c.fillRect(w / 2 - 1, h * 0.2, 2, h);
  });

  // ---- cut-outs with alpha ----
  A.blob = cell(
    64,
    64,
    (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 30);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.6, "rgba(255,255,255,0.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    },
    true,
  );
  A.solid = cell(24, 24, (c, w, h) => fill(c, w, h, "#ffffff"), true);
  A.hand = cell(
    96,
    112,
    (c, w, h) => {
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.beginPath();
      c.ellipse(w / 2, h * 0.52, 22, 24, 0, 0, 6.3);
      c.fill();
      [-0.5, -0.22, 0.04, 0.3].forEach((a, i) => {
        c.save();
        c.translate(w / 2 + a * 40, h * 0.36);
        c.rotate(a * 0.7);
        c.beginPath();
        c.ellipse(0, -16 - (i === 1 || i === 2 ? 6 : 0), 5.5, 17, 0, 0, 6.3);
        c.fill();
        c.restore();
      });
      c.save();
      c.translate(w / 2 + 26, h * 0.52);
      c.rotate(1.0);
      c.beginPath();
      c.ellipse(0, -12, 6, 14, 0, 0, 6.3);
      c.fill();
      c.restore();
      for (let i = 0; i < 5; i++) {
        const x = w / 2 + rr(-18, 18);
        c.fillStyle = `rgba(255,255,255,${rr(0.5, 0.9)})`;
        c.fillRect(x, h * 0.6, rr(2, 4), rr(14, 44));
      }
      c.globalCompositeOperation = "destination-out";
      speck(c, w, h, 260, 0.9, true, 3);
      c.globalCompositeOperation = "source-over";
    },
    true,
  );
  A.smear = cell(
    256,
    128,
    (c, w, h) => {
      for (let i = 0; i < 26; i++) {
        const y = h / 2 + rr(-34, 34);
        c.strokeStyle = `rgba(255,255,255,${rr(0.2, 0.8)})`;
        c.lineWidth = rr(2, 12);
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(rr(14, 60), y);
        c.bezierCurveTo(
          w * 0.35,
          y + rr(-14, 14),
          w * 0.65,
          y + rr(-14, 14),
          w - rr(14, 70),
          y + rr(-10, 10),
        );
        c.stroke();
      }
      blotch(c, 70, h, 8, "rgba(255,255,255,0.8)", 10, 26);
    },
    true,
  );
  A.pool = cell(
    256,
    192,
    (c, w, h) => {
      c.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 16; i++) {
        c.beginPath();
        c.ellipse(
          w / 2 + rr(-60, 60),
          h / 2 + rr(-36, 36),
          rr(22, 56),
          rr(16, 40),
          R() * 3.14,
          0,
          6.3,
        );
        c.fill();
      }
      for (let i = 0; i < 30; i++) {
        c.beginPath();
        c.arc(R() * w, R() * h, rr(1, 5), 0, 6.3);
        c.fill();
      }
      c.globalCompositeOperation = "destination-out";
      blotch(c, w, h, 10, "rgba(0,0,0,0.5)", 10, 40);
      c.globalCompositeOperation = "source-over";
    },
    true,
  );
  A.streak = cell(
    64,
    128,
    (c, w, h) => {
      for (const [x, a, bw] of [
        [10, 0.55, 5],
        [20, 0.2, 10],
        [50, 0.3, 3],
      ]) {
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "rgba(255,255,255,0)");
        gr.addColorStop(0.2, `rgba(255,255,255,${a})`);
        gr.addColorStop(0.85, `rgba(255,255,255,${a * 0.7})`);
        gr.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = gr;
        c.fillRect(x, 0, bw, h);
      }
      c.fillStyle = "rgba(255,255,255,0.1)";
      c.fillRect(0, 0, w, h);
    },
    true,
  );

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, aniso);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  // awning name bands are painted on demand, one per shop name
  const bands = new Map();
  A.band = (words, hex) => {
    const key = words + hex;
    if (!bands.has(key)) {
      bands.set(
        key,
        cell(288, 44, (c, w, h) => {
          fill(c, w, h, "#ece6d6");
          for (let i = 0; i < w; i += 2) {
            c.fillStyle = `rgba(70,62,50,${rr(0.03, 0.1)})`;
            c.fillRect(i, 0, 1, h);
          }
          const ch = [...words];
          ch.forEach((q, i) =>
            txt(
              c,
              q,
              (w * (i + 0.5)) / ch.length,
              h / 2 + 1,
              30,
              SERIF,
              hex,
              900,
            ),
          );
          const dirt = c.createLinearGradient(0, h * 0.5, 0, h);
          dirt.addColorStop(0, "rgba(52,44,30,0)");
          dirt.addColorStop(1, "rgba(52,44,30,0.45)");
          c.fillStyle = dirt;
          c.fillRect(-4, 0, w + 8, h + 4);
        }),
      );
      tex.needsUpdate = true;
    }
    return bands.get(key);
  };
  A.tex = tex;
  return A;
}

const NO = Object.freeze({});
const ONE = new THREE.Vector3(1, 1, 1);

export function createShopfit({ kit, ctx, M, P, fbox }) {
  const A = paintAtlas(kit.aniso);
  const WU = (A.white[0] + A.white[2]) / 2,
    WV = (A.white[1] + A.white[3]) / 2;
  const WHITE = [WU, WV, WU, WV];
  const mainEmitters = ctx.emitters; // backdrop.js swaps this list while it builds
  const colors = new Map();
  // sRGB hex (or css string) -> linear [r, g, b]
  const C = (hex) => {
    let c = colors.get(hex);
    if (!c) {
      const k = new THREE.Color(hex);
      colors.set(hex, (c = [k.r, k.g, k.b]));
    }
    return c;
  };

  // ---------------------------------------------------------------------------------------
  // Batches: opaque interior, see-through interior (rgba), awning cloth (lit, with normals)
  // ---------------------------------------------------------------------------------------
  const newBuf = (nc) => ({ pos: [], col: [], uv: [], nrm: [], idx: [], nc });
  let bO = newBuf(3),
    bT = newBuf(4),
    bA = newBuf(3);

  // ---------------------------------------------------------------------------------------
  // The room being built. Room space looks in from the street: x along the wall from the
  // left edge of the opening, y up, z towards the viewer (the back wall is at z = -D).
  // ---------------------------------------------------------------------------------------
  let Rm = null;
  let T = null; // transform of the object being placed (room space), or null
  let lights = []; // lamp sample points { x, y, z, c, pw, r }
  let occ = []; // flat list of shadow-casting boxes, six numbers each
  let vols = []; // [x0, y0, z0, x1, y1, z1, k]: ambient light is scaled by k inside
  let dry = false; // first pass over a room: only lamps and shadow casters are collected
  let shellMode = false; // floors and walls are merged apart from what stands in the room
  let visC = null; // lamp visibility shared by every vertex of a small object
  let yCut = 1e9; // nothing above this is built (the shutter hides it)
  let wox = 0,
    woz = 0,
    wax = 1,
    waz = 0,
    wnx = 0,
    wnz = 1; // room -> world
  let rnd = prng(1);
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = (l) => l[Math.floor(rnd() * l.length) % l.length];
  const chance = (p) => rnd() < p;

  function put(buf, x, y, z, r, g, b, u, v, a) {
    buf.pos.push(wox + wax * x + wnx * z, y, woz + waz * x + wnz * z);
    if (buf.nc === 4) buf.col.push(r, g, b, a);
    else buf.col.push(r, g, b);
    buf.uv.push(u, v);
    return buf.pos.length / 3 - 1;
  }

  // ----- baked lighting -----
  function blocked(px, py, pz, qx, qy, qz) {
    const dx = qx - px,
      dy = qy - py,
      dz = qz - pz;
    for (let i = 0; i < occ.length; i += 6) {
      let t0 = 0,
        t1 = 1,
        a,
        b,
        t;
      if (Math.abs(dx) < 1e-6) {
        if (px < occ[i] || px > occ[i + 3]) continue;
      } else {
        a = (occ[i] - px) / dx;
        b = (occ[i + 3] - px) / dx;
        if (a > b) ((t = a), (a = b), (b = t));
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) continue;
      }
      if (Math.abs(dy) < 1e-6) {
        if (py < occ[i + 1] || py > occ[i + 4]) continue;
      } else {
        a = (occ[i + 1] - py) / dy;
        b = (occ[i + 4] - py) / dy;
        if (a > b) ((t = a), (a = b), (b = t));
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) continue;
      }
      if (Math.abs(dz) < 1e-6) {
        if (pz < occ[i + 2] || pz > occ[i + 5]) continue;
      } else {
        a = (occ[i + 2] - pz) / dz;
        b = (occ[i + 5] - pz) / dz;
        if (a > b) ((t = a), (a = b), (b = t));
        if (a > t0) t0 = a;
        if (b < t1) t1 = b;
        if (t0 > t1) continue;
      }
      return true;
    }
    return false;
  }
  // which lamps a point can see, plus how much ambient light reaches it (last entry)
  function visAt(x, y, z) {
    const n = lights.length,
      out = new Float32Array(n + 1);
    for (let i = 0; i < n; i++) {
      const L = lights[i];
      out[i] = blocked(x, y, z, L.x, L.y, L.z) ? 0 : 1;
    }
    let a = 1;
    for (const v of vols)
      if (x > v[0] && x < v[3] && y > v[1] && y < v[4] && z > v[2] && z < v[5])
        a *= v[6];
    out[n] = a;
    return out;
  }
  const _v = new THREE.Vector3();
  function visOf(x, y, z) {
    if (T) {
      _v.set(x, y, z).applyMatrix4(T);
      return visAt(_v.x, _v.y, _v.z);
    }
    return visAt(x, y, z);
  }
  let LR = 0,
    LG = 0,
    LB = 0, // light arriving at the vertex
    SR = 0,
    SG = 0,
    SB = 0; // highlight (not tinted by the surface)
  function light(x, y, z, nx, ny, nz, vis, sp) {
    const R = Rm,
      n = lights.length;
    // ambient, darker towards the edges of the room and wherever furniture boxes it in
    let ao = vis[n];
    const k = 0.36,
      s = 0.3;
    let d = y - R.fl;
    if (!(d < 0.02 && ny > 0.9)) ao *= 1 - k * Math.exp(-Math.max(0, d) / s);
    d = R.H - y;
    if (!(d < 0.02 && ny < -0.9)) ao *= 1 - k * Math.exp(-Math.max(0, d) / s);
    d = x - R.X0;
    if (!(d < 0.02 && nx > 0.9)) ao *= 1 - k * Math.exp(-Math.max(0, d) / s);
    d = R.X1 - x;
    if (!(d < 0.02 && nx < -0.9)) ao *= 1 - k * Math.exp(-Math.max(0, d) / s);
    d = z + R.D;
    if (!(d < 0.02 && nz > 0.9)) ao *= 1 - k * Math.exp(-Math.max(0, d) / s);
    const up = ny * 0.5 + 0.5,
      au = R.ambUp,
      ad = R.ambDn;
    let r = (ad[0] + (au[0] - ad[0]) * up) * ao,
      g = (ad[1] + (au[1] - ad[1]) * up) * ao,
      b = (ad[2] + (au[2] - ad[2]) * up) * ao;
    SR = SG = SB = 0;
    for (let i = 0; i < n; i++) {
      if (vis[i] <= 0) continue;
      const L = lights[i];
      const lx = L.x - x,
        ly = L.y - y,
        lz = L.z - z;
      const d2 = lx * lx + ly * ly + lz * lz,
        dl = Math.sqrt(d2) || 1e-3;
      const fall = L.pw / (1 + d2 / (L.r * L.r));
      const lam = ((nx * lx + ny * ly + nz * lz) / dl + 0.3) / 1.3;
      if (lam > 0) {
        const f = lam * fall;
        r += L.c[0] * f;
        g += L.c[1] * f;
        b += L.c[2] * f;
      }
      if (sp) {
        // gloss, as seen by someone looking in from the pavement
        const ex = R.W / 2 - x,
          ey = 1.6 - y,
          ez = 1.4 - z,
          el = Math.hypot(ex, ey, ez);
        const hx = lx / dl + ex / el,
          hy = ly / dl + ey / el,
          hz = lz / dl + ez / el;
        const nh =
          (nx * hx + ny * hy + nz * hz) / (Math.hypot(hx, hy, hz) || 1);
        if (nh > 0) {
          const f = sp[0] * Math.pow(nh, sp[1]) * fall;
          SR += L.c[0] * f;
          SG += L.c[1] * f;
          SB += L.c[2] * f;
        }
      }
    }
    // cool dusk light through the window
    const wf =
      (Math.max(0, nz * 0.75 + ny * 0.25 + 0.15) * R.fill) / (1 + (z * z) / 5);
    LR = r + 0.5 * wf;
    LG = g + 0.64 * wf;
    LB = b + 0.92 * wf;
  }
  // Shades one vertex and stores it. o: e (unlit, colour x e), k (albedo scale), sp ([strength,
  // power] gloss), a (alpha, see-through batch only).
  function vert(buf, x, y, z, nx, ny, nz, al, u, v, o) {
    if (T) {
      _v.set(x, y, z).applyMatrix4(T);
      x = _v.x;
      y = _v.y;
      z = _v.z;
      _v.set(nx, ny, nz).transformDirection(T);
      nx = _v.x;
      ny = _v.y;
      nz = _v.z;
    }
    const a = o.a ?? 1;
    if (o.e !== undefined)
      return put(buf, x, y, z, al[0] * o.e, al[1] * o.e, al[2] * o.e, u, v, a);
    light(
      x,
      y,
      z,
      nx,
      ny,
      nz,
      visC || visAt(x + nx * 0.02, y + ny * 0.02, z + nz * 0.02),
      o.sp,
    );
    const k = (o.k ?? 1) * GAIN;
    return put(
      buf,
      x,
      y,
      z,
      al[0] * LR * k + SR * GAIN,
      al[1] * LG * k + SG * GAIN,
      al[2] * LB * k + SB * GAIN,
      u,
      v,
      a,
    );
  }

  // ----- primitives -----
  // Rectangle from origin o along U (length lu) and V (length lv); it faces U x V. Large ones
  // are diced so the baked light has something to vary over. tex: null, a [u0,v0,u1,v1] rect
  // stretched over the whole face, or { uv, m } = a repeating patch m metres wide.
  function plane(ox, oy, oz, ux, uy, uz, vx, vy, vz, lu, lv, hex, tex, o = NO) {
    if (dry || lu <= 0 || lv <= 0) return;
    if (!T && Math.min(oy, oy + uy * lu, oy + vy * lv) > yCut) return;
    const buf = o.t ? bT : shellMode ? bS : bO,
      al = C(hex);
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const tl = tex && tex.m ? tex : null;
    let step = o.step || (!visC && Math.max(lu, lv) > 0.9 ? 0.45 : 1e9);
    let per = 1;
    if (tl) {
      per = Math.max(1, Math.round(tl.m / Math.min(step, tl.m)));
      step = tl.m / per;
    }
    const nu = Math.max(1, Math.ceil(lu / step - 1e-6)),
      nv = Math.max(1, Math.ceil(lv / step - 1e-6));
    const ids = [];
    const r = tl ? tl.uv : tex || WHITE;
    const du = r[2] - r[0],
      dv = r[3] - r[1];
    for (let j = 0; j < nv; j++) {
      const b0 = j * step,
        b1 = Math.min(lv, b0 + step);
      for (let i = 0; i < nu; i++) {
        const a0 = i * step,
          a1 = Math.min(lu, a0 + step);
        let u0, u1, v0, v1;
        if (tl) {
          u0 = r[0] + (du * (i % per)) / per;
          u1 = u0 + (du * (a1 - a0)) / tl.m;
          v0 = r[1] + (dv * (j % per)) / per;
          v1 = v0 + (dv * (b1 - b0)) / tl.m;
        } else {
          u0 = r[0] + (du * a0) / lu;
          u1 = r[0] + (du * a1) / lu;
          v0 = r[1] + (dv * b0) / lv;
          v1 = r[1] + (dv * b1) / lv;
        }
        const q = (a, b, u, v) =>
          vert(
            buf,
            ox + ux * a + vx * b,
            oy + uy * a + vy * b,
            oz + uz * a + vz * b,
            nx,
            ny,
            nz,
            al,
            u,
            v,
            o,
          );
        // shared corners are shaded again per cell: the repeat needs its own coordinates
        const i0 = q(a0, b0, u0, v0),
          i1 = q(a1, b0, u1, v0),
          i2 = q(a1, b1, u1, v1),
          i3 = q(a0, b1, u0, v1);
        ids.push(i0, i1, i2, i0, i2, i3);
      }
    }
    for (const i of ids) buf.idx.push(i);
  }
  function occBox(x0, y0, z0, x1, y1, z1) {
    if (!dry) return;
    if (!T) {
      occ.push(
        x0 + 0.004,
        y0 + 0.004,
        z0 + 0.004,
        x1 - 0.004,
        y1 - 0.004,
        z1 - 0.004,
      );
      return;
    }
    const b = new THREE.Box3();
    for (let i = 0; i < 8; i++)
      b.expandByPoint(
        _v
          .set(i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0)
          .applyMatrix4(T),
      );
    occ.push(b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z);
  }
  // Box. Faces: f +z (towards the street), b -z, l -x, r +x, u top, d bottom. o: skip (face
  // letters, default "d"), tx { face: tex, all: tex }, cx { face: hex }, occ (casts shadows),
  // plus the vertex options.
  function box(x0, y0, z0, x1, y1, z1, hex, o = NO) {
    if (o.occ) occBox(x0, y0, z0, x1, y1, z1);
    if (dry || (!T && y0 > yCut)) return;
    const skip = o.skip ?? "d",
      tx = o.tx || NO,
      cx = o.cx || NO;
    const own = !visC && Math.max(x1 - x0, y1 - y0, z1 - z0) < 0.5;
    if (own) visC = visOf((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const F = (ch, ox, oy, oz, ux, uy, uz, vx, vy, vz, lu, lv) => {
      if (skip.includes(ch)) return;
      plane(
        ox,
        oy,
        oz,
        ux,
        uy,
        uz,
        vx,
        vy,
        vz,
        lu,
        lv,
        cx[ch] ?? hex,
        tx[ch] ?? tx.all ?? null,
        o,
      );
    };
    F("f", x0, y0, z1, 1, 0, 0, 0, 1, 0, x1 - x0, y1 - y0);
    F("b", x1, y0, z0, -1, 0, 0, 0, 1, 0, x1 - x0, y1 - y0);
    F("l", x0, y0, z0, 0, 0, 1, 0, 1, 0, z1 - z0, y1 - y0);
    F("r", x1, y0, z1, 0, 0, -1, 0, 1, 0, z1 - z0, y1 - y0);
    F("u", x0, y1, z1, 1, 0, 0, 0, 0, -1, x1 - x0, z1 - z0);
    F("d", x0, y0, z0, 1, 0, 0, 0, 0, 1, x1 - x0, z1 - z0);
    if (own) visC = null;
  }
  // Surface of revolution about a vertical axis through (x, z); prof = [[radius, height], ...]
  // from the bottom up. o: seg, sx / sz (squash), cols (hex per ring), off ([dx, dz] per
  // ring, for bent shapes), wrap (label rect round the side), cap ("u", "d"), capHex, capTex.
  function lathe(prof, x, y, z, hex, o = NO) {
    if (dry || (!T && y + prof[0][1] > yCut)) return;
    const buf = o.t ? bT : bO;
    const seg = o.seg || 8,
      sx = o.sx ?? 1,
      sz = o.sz ?? 1,
      n = prof.length;
    const own = !visC;
    if (own) visC = visOf(x, y + (prof[0][1] + prof[n - 1][1]) / 2, z);
    const base = C(hex),
      wr = o.wrap,
      h0 = prof[0][1],
      hh = prof[n - 1][1] - h0 || 1;
    const rows = [];
    for (let j = 0; j < n; j++) {
      const a = prof[Math.max(0, j - 1)],
        b = prof[Math.min(n - 1, j + 1)];
      let nr = b[1] - a[1],
        nh = a[0] - b[0];
      const l = Math.hypot(nr, nh) || 1;
      nr /= l;
      nh /= l;
      const al = o.cols ? C(o.cols[j]) : base;
      const ofx = o.off ? o.off[j][0] : 0,
        ofz = o.off ? o.off[j][1] : 0;
      const row = [];
      for (let i = 0; i <= seg; i++) {
        const ph = -Math.PI / 2 + (2 * Math.PI * i) / seg,
          s = Math.sin(ph),
          c = Math.cos(ph);
        row.push(
          vert(
            buf,
            x + ofx + prof[j][0] * s * sx,
            y + prof[j][1],
            z + ofz + prof[j][0] * c * sz,
            s * nr,
            nh,
            c * nr,
            al,
            wr ? wr[0] + ((wr[2] - wr[0]) * i) / seg : WU,
            wr ? wr[1] + ((wr[3] - wr[1]) * (prof[j][1] - h0)) / hh : WV,
            o,
          ),
        );
      }
      rows.push(row);
    }
    for (let j = 0; j < n - 1; j++) {
      if (prof[j][0] <= 0 && prof[j + 1][0] <= 0) continue;
      for (let i = 0; i < seg; i++)
        buf.idx.push(
          rows[j][i],
          rows[j][i + 1],
          rows[j + 1][i + 1],
          rows[j][i],
          rows[j + 1][i + 1],
          rows[j + 1][i],
        );
    }
    const cap = (j, up) => {
      const al = C(o.capHex ?? (o.cols ? o.cols[j] : hex)),
        ct = o.capTex,
        ny = up ? 1 : -1;
      const cx = x + (o.off ? o.off[j][0] : 0),
        cz = z + (o.off ? o.off[j][1] : 0),
        cy = y + prof[j][1],
        r = prof[j][0];
      const mu = ct ? (ct[0] + ct[2]) / 2 : WU,
        mv = ct ? (ct[1] + ct[3]) / 2 : WV,
        hu = ct ? (ct[2] - ct[0]) / 2 : 0,
        hv = ct ? (ct[3] - ct[1]) / 2 : 0;
      const c0 = vert(buf, cx, cy, cz, 0, ny, 0, al, mu, mv, o);
      let prev = -1;
      for (let i = 0; i <= seg; i++) {
        const ph = -Math.PI / 2 + (2 * Math.PI * i) / seg,
          s = Math.sin(ph),
          c = Math.cos(ph);
        const id = vert(
          buf,
          cx + r * s * sx,
          cy,
          cz + r * c * sz,
          0,
          ny,
          0,
          al,
          mu + hu * s,
          mv - hv * c,
          o,
        );
        if (i) up ? buf.idx.push(c0, prev, id) : buf.idx.push(c0, id, prev);
        prev = id;
      }
    };
    const caps = o.cap ?? "";
    if (caps.includes("u") && prof[n - 1][0] > 0) cap(n - 1, true);
    if (caps.includes("d") && prof[0][0] > 0) cap(0, false);
    if (own) visC = null;
  }
  const cyl = (x, y, z, r, h, hex, o = NO) =>
    lathe(
      [
        [r, 0],
        [o.rt ?? r, h],
      ],
      x,
      y,
      z,
      hex,
      { cap: "u", ...o },
    );
  // squashed sphere centred on (x, y, z)
  function ball(x, y, z, rx, ry, rz, hex, o = NO) {
    const k = o.rings || 4,
      prof = [];
    for (let j = 0; j <= k; j++) {
      const t = -Math.PI / 2 + (Math.PI * j) / k;
      prof.push([Math.cos(t), Math.sin(t) * ry]);
    }
    prof[0][0] = prof[k][0] = 0;
    lathe(prof, x, y, z, hex, { seg: 7, ...o, sx: rx, sz: rz });
  }
  // free quad, corners counter-clockwise seen from the front; uv = [u0, v0, u1, v1]
  function quad(a, b, c, d, hex, uv, o = NO) {
    if (dry) return;
    const buf = o.t ? bT : bO,
      al = C(hex),
      r = uv || WHITE;
    let nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]),
      ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]),
      nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const i0 = vert(buf, a[0], a[1], a[2], nx, ny, nz, al, r[0], r[1], o),
      i1 = vert(buf, b[0], b[1], b[2], nx, ny, nz, al, r[2], r[1], o),
      i2 = vert(buf, c[0], c[1], c[2], nx, ny, nz, al, r[2], r[3], o),
      i3 = vert(buf, d[0], d[1], d[2], nx, ny, nz, al, r[0], r[3], o);
    buf.idx.push(i0, i1, i2, i0, i2, i3);
  }
  // Runs fn with everything it builds moved to (x, y, z) and turned by ry (then rx, rz).
  function at(x, y, z, ry, fn, rx = 0, rz = 0) {
    if (!T && y > yCut + 0.25) return;
    const prev = T;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
      ONE,
    );
    T = prev ? prev.clone().multiply(m) : m;
    try {
      fn();
    } finally {
      T = prev;
    }
  }
  // every vertex built by fn shares the lamp visibility of one point (cheap, for small things)
  function lit(x, y, z, fn) {
    if (dry) return fn();
    const prev = visC;
    visC = visOf(x, y, z);
    try {
      fn();
    } finally {
      visC = prev;
    }
  }
  const lamp = (x, y, z, hex, pw, r = 2.2) => {
    if (dry) lights.push({ x, y, z, c: C(hex), pw, r });
  };
  const shadeVol = (x0, y0, z0, x1, y1, z1, k) => {
    if (dry) vols.push([x0, y0, z0, x1, y1, z1, k]);
  };
  // picture lying on the floor (stains, soft shadows): w along x, d along z before turning
  function floorDecal(x, z, w, d, rot, uv, hex, o = NO) {
    const c = Math.cos(rot) * 0.5,
      s = Math.sin(rot) * 0.5,
      y = Rm.fl + (o.y ?? 0.006);
    const p = (i, j) => [
      x + i * w * c + j * d * s,
      y,
      z - i * w * s + j * d * c,
    ];
    quad(p(-1, 1), p(1, 1), p(1, -1), p(-1, -1), hex, uv, { t: 1, ...o });
  }
  const shadow = (x, z, w, d, a = 0.5, rot = 0) =>
    floorDecal(x, z, w, d, rot, A.blob, 0, { e: 0, a, y: 0.004 });

  // ---------------------------------------------------------------------------------------
  // Shell and fittings shared by every trade
  // ---------------------------------------------------------------------------------------
  const TX = {
    tile: { uv: A.tile, m: 0.6 },
    check: { uv: A.check, m: 0.6 },
    mosaic: { uv: A.check, m: 0.3 },
    plank: { uv: A.plank, m: 0.9 },
    wood: { uv: A.wood, m: 0.6 },
    plaster: { uv: A.plaster, m: 0.9 },
    terrazzo: { uv: A.terrazzo, m: 0.9 },
    card: { uv: A.card, m: 0.3 },
    steel: { uv: A.steel, m: 0.45 },
  };
  // u is measured from the wall beside the door, so a layout reads the same for either hand
  const mx = (u) => (Rm.dl ? Rm.X0 + u : Rm.X1 - u);
  const mbox = (u0, y0, z0, u1, y1, z1, hex, o) => {
    const a = mx(u0),
      b = mx(u1);
    box(Math.min(a, b), y0, z0, Math.max(a, b), y1, z1, hex, o);
  };
  // furniture against a side wall, facing into the room: fn(length) builds it in shelf space
  // (x along the wall, front at z = 0, back at z = -dep)
  function sideWall(doorSide, zNear, zFar, dep, fn) {
    if (zNear - zFar < 0.4) return;
    if (doorSide === Rm.dl)
      at(Rm.X0 + dep, Rm.fl, zNear, Math.PI / 2, () => fn(zNear - zFar));
    else at(Rm.X1 - dep, Rm.fl, zFar, -Math.PI / 2, () => fn(zNear - zFar));
  }
  // one wall of the room from (ox, oz) along (ux, uz); it faces (-uz, ux)
  function wall(ox, oz, ux, uz, len, y0, y1, s, back) {
    const up = back && s.back ? s.back : s.wall;
    const dh = s.dado && up === s.wall ? Math.min(y1, y0 + s.dado[0]) : y0;
    if (dh > y0)
      plane(ox, y0, oz, ux, 0, uz, 0, 1, 0, len, dh - y0, s.dado[1], s.dado[2]);
    plane(ox, dh, oz, ux, 0, uz, 0, 1, 0, len, y1 - dh, up[0], up[1]);
    const px = ox - uz * 0.012,
      pz = oz + ux * 0.012;
    if (s.band !== undefined && dh > y0)
      plane(px, dh - 0.02, pz, ux, 0, uz, 0, 1, 0, len, 0.05, s.band, null);
    if (s.skirt !== undefined)
      plane(px, y0, pz, ux, 0, uz, 0, 1, 0, len, 0.09, s.skirt, null);
  }
  // floor, walls, ceiling and the display bed behind the window; s = { floor: [hex, tex],
  // wall, back, dado: [height, hex, tex], band, skirt, ceil, bed: [hex, tex] }
  function shell(s) {
    shellMode = true;
    try {
      shellParts(s);
    } finally {
      shellMode = false;
    }
  }
  function shellParts(s) {
    const R = Rm,
      fl = R.fl,
      zf = R.zf,
      top = Math.min(R.H, yCut + 0.45);
    const fo = { step: 0.3 };
    plane(
      R.X0,
      fl,
      zf,
      1,
      0,
      0,
      0,
      0,
      -1,
      R.X1 - R.X0,
      R.D + zf,
      ...s.floor,
      fo,
    );
    wall(R.X0, -R.D, 1, 0, R.X1 - R.X0, fl, top, s, true);
    wall(R.X0, R.zfL, 0, -1, R.D + R.zfL, fl, top, s);
    wall(R.X1, -R.D, 0, 1, R.D + R.zfR, fl, top, s);
    // where a neighbour takes a corner of the plot, the room steps in around it
    const boards = (x0, x1) => {
      const door = x0 < R.dx1 && x1 > R.dx0 && R.glass;
      plane(
        x0,
        fl,
        zf - 0.04,
        1,
        0,
        0,
        0,
        1,
        0,
        x1 - x0,
        top - fl,
        0xffffff,
        door ? A.planks : TX.plaster,
        { k: door ? 2.4 : 1.6 },
      );
    };
    if (R.X0 > 0) {
      if (R.zfL < zf - 0.3) {
        plane(0, fl, zf, 1, 0, 0, 0, 0, -1, R.X0, zf - R.zfL, ...s.floor, fo);
        wall(0, zf, 0, -1, zf - R.zfL, fl, top, s);
        wall(0, R.zfL, 1, 0, R.X0, fl, top, s);
      } else boards(0, R.X0);
    }
    if (R.X1 < R.W) {
      if (R.zfR < zf - 0.3) {
        plane(
          R.X1,
          fl,
          zf,
          1,
          0,
          0,
          0,
          0,
          -1,
          R.W - R.X1,
          zf - R.zfR,
          ...s.floor,
          fo,
        );
        wall(R.W, R.zfR, 0, 1, zf - R.zfR, fl, top, s);
        wall(R.X1, R.zfR, 1, 0, R.W - R.X1, fl, top, s);
      } else boards(R.X1, R.W);
    }
    plane(
      0,
      top,
      -R.D,
      1,
      0,
      0,
      0,
      0,
      1,
      R.W,
      R.D + zf,
      top < R.H ? 0x050505 : s.ceil,
      null,
      { step: 0.6 },
    );
    if (R.bed)
      box(R.bed[0], fl, -0.78, R.bed[1], 0.55, zf, s.bed[0], {
        skip: "dbf",
        tx: { all: s.bed[1] },
        occ: 1,
        sp: s.bed[2],
      });
  }
  function tube(x0, x1, y, z, hex, pw) {
    box(x0 - 0.04, y - 0.03, z - 0.05, x1 + 0.04, y, z + 0.05, 0xd8d8d0, {
      skip: "u",
    });
    box(x0, y - 0.058, z - 0.016, x1, y - 0.03, z + 0.016, hex, {
      e: 3.4,
      skip: "u",
    });
    for (let i = 0; i < 3; i++)
      lamp(x0 + ((x1 - x0) * (i + 0.5)) / 3, y - 0.12, z, hex, pw / 3);
  }
  function pendant(x, y, z, hex, pw, shade = 0x1f4a34, r = 0.19) {
    box(x - 0.006, y + 0.15, z - 0.006, x + 0.006, Rm.H, z + 0.006, 0x151515, {
      skip: "ud",
    });
    lathe(
      [
        [r, 0],
        [r * 0.6, 0.09],
        [0.035, 0.17],
      ],
      x,
      y,
      z,
      shade,
      { seg: 10, sp: [0.3, 10] },
    );
    lathe(
      [
        [r * 0.96, 0.004],
        [r * 0.96, 0.006],
      ],
      x,
      y,
      z,
      hex,
      { seg: 10, cap: "d", e: 1.7 },
    );
    ball(x, y + 0.012, z, 0.04, 0.05, 0.04, hex, { e: 5, seg: 6, rings: 3 });
    lamp(x, y - 0.06, z, hex, pw, 1.9);
  }
  // picture on a wall: "b" back, "d" the wall beside the door, "f" the far side wall. p is
  // the centre along that wall (u for the back wall, z for the sides).
  function pic(w, p, y, pw, ph, uv, o = NO) {
    const R = Rm,
      e = 0.014;
    let x, z, ux, uz;
    if (w === "b") ((x = mx(p) - pw / 2), (z = -R.D + e), (ux = 1), (uz = 0));
    else if ((w === "d") === R.dl)
      ((x = R.X0 + e), (z = p + pw / 2), (ux = 0), (uz = -1));
    else ((x = R.X1 - e), (z = p - pw / 2), (ux = 0), (uz = 1));
    if (o.frame !== undefined) {
      const m = 0.025;
      plane(
        x - ux * m - uz * -0.004,
        y - m,
        z - uz * m + ux * -0.004,
        ux,
        0,
        uz,
        0,
        1,
        0,
        pw + 2 * m,
        ph + 2 * m,
        o.frame,
        null,
        o,
      );
    }
    plane(x, y, z, ux, 0, uz, 0, 1, 0, pw, ph, o.hex ?? 0xffffff, uv, o);
  }
  // doorway to a dark back room, with a half curtain
  function backDoor(u0, u1) {
    const R = Rm,
      z = -R.D + 0.01,
      x0 = Math.min(mx(u0), mx(u1)),
      x1 = Math.max(mx(u0), mx(u1));
    plane(x0, R.fl, z, 1, 0, 0, 0, 1, 0, x1 - x0, 2.02, 0x030303, null, {
      e: 1,
    });
    box(x0 - 0.06, R.fl, -R.D, x0, R.fl + 2.08, -R.D + 0.05, 0x3a2416, {
      tx: { all: TX.wood },
      skip: "db",
    });
    box(x1, R.fl, -R.D, x1 + 0.06, R.fl + 2.08, -R.D + 0.05, 0x3a2416, {
      tx: { all: TX.wood },
      skip: "db",
    });
    box(
      x0 - 0.06,
      R.fl + 2.02,
      -R.D,
      x1 + 0.06,
      R.fl + 2.1,
      -R.D + 0.05,
      0x3a2416,
      { tx: { all: TX.wood }, skip: "b" },
    );
    const n = 2,
      w = (x1 - x0) / n;
    for (let i = 0; i < n; i++)
      plane(
        x0 + i * w + 0.01,
        R.fl + 1.18 + rr(0, 0.05),
        z + 0.03,
        1,
        0,
        0,
        0,
        1,
        0,
        w - 0.02,
        0.82,
        0xffffff,
        A.curtain,
      );
  }
  // household shrine on the floor against the back wall, with its red lamps
  function shrine(u) {
    const R = Rm,
      x = mx(u),
      z = -R.D + 0.02,
      y = R.fl;
    box(x - 0.2, y, z, x + 0.2, y + 0.4, z + 0.2, 0xa01a14, {
      tx: { f: A.shrine },
      cx: { f: 0xffffff },
    });
    box(x - 0.23, y + 0.4, z, x + 0.23, y + 0.43, z + 0.24, 0x7a120e, {
      skip: "b",
    });
    cyl(x, y, z + 0.27, 0.05, 0.06, 0xa08040, { seg: 7, capHex: 0x9a9488 });
    for (const dx of [-0.13, 0.13]) {
      box(
        x + dx - 0.01,
        y,
        z + 0.22,
        x + dx + 0.01,
        y + 0.1,
        z + 0.24,
        0xff3a20,
        { e: 3 },
      );
      ball(x + dx * 0.6, y + 0.035, z + 0.36, 0.035, 0.033, 0.035, 0xe8862a, {
        seg: 6,
        rings: 3,
      });
    }
    lamp(x, y + 0.25, z + 0.3, 0xff3018, 0.3, 0.55);
  }
  // soft stuffed shape lying at the origin: lx by lz, ly thick, printed on top
  function pillow(lx, ly, lz, hex, uv, o = NO) {
    if (dry) return;
    const nu = 5,
      nv = 4,
      al = C(hex),
      r = uv || WHITE,
      buf = bO;
    const hgt = (a, b) =>
      ly *
      (0.42 +
        0.58 *
          Math.sqrt(
            Math.max(0, (1 - (2 * a - 1) ** 4) * (1 - (2 * b - 1) ** 4)),
          ));
    lit(0, ly, 0, () => {
      const id = [];
      for (let j = 0; j <= nv; j++)
        for (let i = 0; i <= nu; i++) {
          const a = i / nu,
            b = j / nv,
            e = 0.02;
          const nx = (hgt(a - e, b) - hgt(a + e, b)) / (2 * e * lx),
            nz = (hgt(a, b + e) - hgt(a, b - e)) / (2 * e * lz),
            l = Math.hypot(nx, 1, nz);
          id.push(
            vert(
              buf,
              (a - 0.5) * lx,
              hgt(a, b),
              (0.5 - b) * lz,
              nx / l,
              1 / l,
              nz / l,
              al,
              r[0] + (r[2] - r[0]) * a,
              r[1] + (r[3] - r[1]) * b,
              o,
            ),
          );
        }
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const k = j * (nu + 1) + i;
          buf.idx.push(
            k + id[0],
            k + 1 + id[0],
            k + nu + 2 + id[0],
            k + id[0],
            k + nu + 2 + id[0],
            k + nu + 1 + id[0],
          );
        }
      const hx = lx / 2,
        hz = lz / 2,
        s = ly * 0.42;
      const sh = o.side ?? hex;
      quad([-hx, 0, hz], [hx, 0, hz], [hx, s, hz], [-hx, s, hz], sh, null, o);
      quad([hx, 0, hz], [hx, 0, -hz], [hx, s, -hz], [hx, s, hz], sh, null, o);
      quad(
        [-hx, 0, -hz],
        [-hx, 0, hz],
        [-hx, s, hz],
        [-hx, s, -hz],
        sh,
        null,
        o,
      );
      quad(
        [hx, 0, -hz],
        [-hx, 0, -hz],
        [-hx, s, -hz],
        [hx, s, -hz],
        sh,
        null,
        o,
      );
    });
  }
  // ----- goods -----
  // One run of the same product on a shelf (shelf space: back at zb, front edge at zf).
  function run(kind, x0, x1, y, zb, zf, hmax) {
    const lo = Rm.lod,
      low = y < 1.25; // seen from above: needs stock behind the front row
    lit((x0 + x1) / 2, y + 0.08, zf - 0.02, () => {
      if (kind === "b") {
        const p = pick(A.boxes),
          w = rr(0.07, 0.12),
          h = Math.min(hmax, rr(0.13, 0.24)),
          d = Math.min(zf - zb - 0.02, rr(0.05, 0.1)),
          tight = chance(0.5);
        if (lo)
          return box(x0, y, zf - d, x1, y + h, zf, p.base, {
            skip: "db",
            tx: { f: p.uv },
            cx: { f: 0xffffff },
          });
        let x = x0;
        while (x + w <= x1) {
          const j = tight ? 0 : rr(0, 0.02),
            last = x + 2 * w > x1;
          if (!chance(0.07))
            box(x, y, zf - d - j, x + w, y + h, zf - j, p.base, {
              skip: tight && x > x0 && !last ? "dblr" : "db",
              tx: { f: p.uv },
              cx: { f: 0xffffff },
            });
          x += w + (tight ? 0.002 : rr(0.004, 0.014));
        }
        if (low)
          box(x0, y, zb, x - 0.01, y + h * 0.96, zf - d - 0.02, p.base, {
            skip: "dbflr",
            k: 0.7,
          });
      } else if (kind === "t") {
        const p = pick(A.tins),
          r = rr(0.033, 0.047),
          h = rr(0.07, 0.11),
          two = h * 2 < hmax && chance(0.4);
        if (lo)
          return box(x0, y, zf - 2 * r, x1, y + h, zf, p.base, {
            skip: "db",
            tx: { f: p.uv },
            cx: { f: 0xffffff },
          });
        let x = x0 + r;
        while (x + r <= x1) {
          const j = rr(0, 0.012);
          for (let k = 0; k < (two && chance(0.8) ? 2 : 1); k++)
            if (!chance(0.06))
              cyl(x, y + k * h, zf - r - j, r, h, 0xffffff, {
                seg: 6,
                wrap: p.uv,
                capHex: 0xb4b8bc,
                sp: [0.2, 14],
              });
          x += 2 * r + rr(0.002, 0.012);
        }
        if (low)
          box(x0, y, zb, x - r, y + h * 0.98, zf - 2 * r - 0.02, 0xa8acb0, {
            skip: "dbflr",
            k: 0.7,
          });
      } else if (kind === "l") {
        const p = pick(A.bottles),
          r = rr(0.028, 0.035),
          h = Math.min(hmax - 0.01, rr(0.2, 0.27));
        if (lo)
          return box(x0, y, zf - 2 * r, x1, y + h * 0.6, zf, p.base, {
            skip: "db",
            tx: { f: p.uv },
            cx: { f: 0xffffff },
          });
        let x = x0 + r;
        while (x + r <= x1) {
          const z = zf - r - rr(0, 0.012);
          if (!chance(0.08)) {
            cyl(x, y, z, r, h * 0.6, 0xffffff, { seg: 6, wrap: p.uv, cap: "" });
            lathe(
              [
                [r, h * 0.6],
                [r * 0.42, h * 0.8],
                [r * 0.42, h * 0.95],
                [r * 0.5, h],
              ],
              x,
              y,
              z,
              p.glass,
              { seg: 6, cap: "u", capHex: 0xb3261e, sp: [0.5, 16] },
            );
          }
          x += 2 * r + rr(0.004, 0.016);
        }
      } else {
        const hex = pick([0x8a3a14, 0xb04a1a, 0xc9a13a, 0x6a7a2a, 0xa02410]),
          lid = pick([0xb3261e, 0xc9a13a, 0xe8e2d0]),
          r = rr(0.038, 0.05),
          h = Math.min(hmax - 0.01, rr(0.1, 0.15));
        if (lo)
          return box(x0, y, zf - 2 * r, x1, y + h, zf, hex, { skip: "db" });
        let x = x0 + r;
        while (x + r <= x1) {
          if (!chance(0.08))
            lathe(
              [
                [r, 0],
                [r, h * 0.86],
                [r * 0.86, h * 0.88],
                [r * 0.86, h],
              ],
              x,
              y,
              zf - r - rr(0, 0.012),
              hex,
              { seg: 6, cap: "u", cols: [hex, hex, lid, lid], sp: [0.6, 18] },
            );
          x += 2 * r + rr(0.006, 0.02);
        }
      }
    });
  }
  // fills a shelf with runs of goods; loot = share of it that is bare
  function stock(x0, x1, y, zb, zf, hmax, kinds = "bbbbttlj", loot = 0.12) {
    let x = x0 + rr(0, 0.04);
    while (x < x1 - 0.12) {
      const len = Math.min(x1 - x, rr(0.3, 0.72));
      if (chance(loot)) x += len * rr(0.3, 0.9);
      else {
        run(pick(kinds), x, x + len, y, zb, zf, hmax);
        x += len + rr(0.01, 0.04);
      }
    }
  }
  // Shelving in shelf space: x 0..L, front at z = 0, back against z = -dep. o: hex, tx (wood),
  // kinds, loot, first (height of the lowest shelf).
  function shelving(L, dep, hgt, rows, o = NO) {
    const hex = o.hex ?? 0xc4c7c2,
      tx = o.tx ? { all: o.tx } : undefined,
      y0 = o.first ?? 0.14,
      gap = (hgt - y0 - 0.05) / (rows - 1);
    box(0, 0, -dep, L, hgt, -dep + 0.012, hex, {
      skip: "dblr",
      occ: 1,
      tx,
      k: 0.8,
    });
    box(-0.014, 0, -dep, 0, hgt, -0.01, hex, { occ: 1, tx });
    box(L, 0, -dep, L + 0.014, hgt, -0.01, hex, { occ: 1, tx });
    for (let i = 1; i * 1.1 < L - 0.3; i++)
      box(i * 1.1 - 0.012, 0, -0.03, i * 1.1 + 0.012, hgt, 0, hex, {
        skip: "db",
        tx,
      });
    if (dry) {
      const b = new THREE.Box3();
      for (let i = 0; i < 8; i++)
        b.expandByPoint(
          _v
            .set(i & 1 ? L : 0, i & 2 ? hgt : 0, i & 4 ? 0 : -dep)
            .applyMatrix4(T),
        );
      vols.push([b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z, 0.55]);
    }
    for (let i = 0; i < rows; i++) {
      const y = y0 + i * gap;
      box(0, y - 0.024, -dep + 0.01, L, y, 0, hex, {
        skip: y > 1.45 ? "b" : "bd",
        occ: 1,
        tx,
        cx: tx ? undefined : { f: 0xe6dfc4 },
      });
      if (i < rows - 1 || o.topStock)
        stock(
          0.02,
          L - 0.02,
          y,
          -dep + 0.03,
          -0.012,
          gap - 0.04,
          o.kinds,
          o.loot,
        );
    }
  }
  // things knocked onto the floor around (x, z)
  function spill(x, z, n, rad) {
    for (let i = 0; i < n; i++) {
      const px = x + rr(-rad, rad),
        pz = z + rr(-rad, rad),
        yaw = rr(0, 6.28);
      if (
        px < Rm.X0 + 0.1 ||
        px > Rm.X1 - 0.1 ||
        pz < -Rm.D + 0.1 ||
        pz > Rm.zf - 0.08
      )
        continue;
      if (chance(0.55)) {
        const p = pick(A.tins),
          r = rr(0.035, 0.045),
          h = rr(0.08, 0.11);
        at(
          px,
          Rm.fl + r,
          pz,
          yaw,
          () =>
            cyl(0, -h / 2, 0, r, h, 0xffffff, {
              seg: 6,
              wrap: p.uv,
              cap: "ud",
              capHex: 0xb4b8bc,
            }),
          Math.PI / 2,
        );
        shadow(px, pz, 0.16, 0.14, 0.45);
      } else {
        const p = pick(A.boxes),
          w = rr(0.08, 0.12),
          h = rr(0.14, 0.22);
        at(px, Rm.fl, pz, yaw, () =>
          box(-w / 2, 0, -h / 2, w / 2, 0.05, h / 2, p.base, {
            tx: { u: p.uv },
            cx: { u: 0xffffff },
          }),
        );
        shadow(px, pz, 0.2, 0.22, 0.4);
      }
    }
  }
  function carton(x, z, w, h, d, yaw, y = Rm.fl) {
    at(x, y, z, yaw, () =>
      box(-w / 2, 0, -d / 2, w / 2, h, d / 2, 0xffffff, {
        tx: { all: TX.card, f: pick(A.carton), r: pick(A.carton) },
        cx: { u: 0xc4a274 },
        occ: 1,
      }),
    );
    if (y === Rm.fl) shadow(x, z, w + 0.2, d + 0.2, 0.5, yaw);
  }
  // blood on the floor, and now and then a hand on the inside of the glass
  function gore(x, z, big) {
    if (big)
      floorDecal(
        x,
        z,
        rr(1.0, 1.5),
        rr(0.8, 1.1),
        rr(0, 6.28),
        A.pool,
        0x5a0d0a,
        { a: 0.9, sp: [0.5, 20] },
      );
    floorDecal(
      x + rr(-0.3, 0.3),
      z - rr(0.5, 0.9),
      rr(1.3, 1.9),
      rr(0.5, 0.8),
      Math.PI / 2 + rr(-0.5, 0.5),
      A.smear,
      0x520c09,
      { a: 0.85 },
    );
  }
  const stoolAt = (x, z, hex, tip) =>
    at(
      x,
      Rm.fl + (tip ? 0.16 : 0),
      z,
      rr(0, 6.28),
      () => {
        cyl(0, 0.415, 0, 0.155, 0.045, hex, { seg: 10, sp: [0.25, 12] });
        for (const [dx, dz] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ])
          box(
            dx * 0.1 - 0.011,
            0,
            dz * 0.1 - 0.011,
            dx * 0.1 + 0.011,
            0.415,
            dz * 0.1 + 0.011,
            0x9a9fa4,
            { skip: "ud", sp: [0.4, 20] },
          );
      },
      tip ? Math.PI / 2 : 0,
    );
  // glass-fronted drinks fridge standing at the origin, facing +z
  function fridge() {
    box(-0.36, 0, -0.62, 0.36, 1.95, -0.02, 0xdfe3e6, {
      tx: { all: TX.steel },
      skip: "df",
      occ: 1,
    });
    plane(-0.32, 0.2, -0.05, 1, 0, 0, 0, 1, 0, 0.64, 1.44, 0xffffff, A.drinks, {
      e: 1.25,
    });
    plane(-0.36, 1.66, 0, 1, 0, 0, 0, 1, 0, 0.72, 0.29, 0xffffff, A.cold, {
      e: 1.2,
    });
    box(-0.36, 0, -0.02, 0.36, 0.2, 0, 0x2a2e32, { skip: "db" });
    for (const x of [-0.36, 0.32])
      box(x, 0.2, -0.05, x + 0.04, 1.66, 0, 0x2a2e32, { skip: "db" });
    plane(
      -0.32,
      0.2,
      -0.004,
      1,
      0,
      0,
      0,
      1,
      0,
      0.64,
      1.46,
      0xffffff,
      A.streak,
      { t: 1, a: 0.55, e: 0.8 },
    );
    box(0.25, 0.8, 0, 0.27, 1.25, 0.035, 0x1c1c1e, { skip: "b" });
    if (dry) {
      _v.set(0, 1.0, 0.4).applyMatrix4(T);
      lights.push({
        x: _v.x,
        y: _v.y,
        z: _v.z,
        c: C(0xd8ecff),
        pw: 0.55,
        r: 1.1,
      });
    }
  }

  function glassJar(x, y, z, r, h, hex, lid = 0xb3261e) {
    cyl(x, y + 0.004, z, r * 0.9, h * 0.72, hex, {
      seg: 8,
      wrap: A.dried,
      capTex: A.dried,
    });
    cyl(x, y, z, r, h, 0xffffff, {
      seg: 8,
      t: 1,
      a: 0.5,
      wrap: A.streak,
      e: 0.9,
      cap: "",
    });
    cyl(x, y + h, z, r * 0.82, 0.02, lid, { seg: 8, sp: [0.5, 16] });
  }
  const priceCard = (x, y, z) =>
    plane(
      x - 0.05,
      y,
      z,
      1,
      0,
      0,
      0,
      1,
      0,
      0.1,
      0.062,
      0xffffff,
      pick(A.prices),
    );
  // glazed ceramic jar with a red paper label
  function potJar(x, y, z, s, hex = 0xdfe6ee) {
    lathe(
      [
        [0.07 * s, 0],
        [0.115 * s, 0.07 * s],
        [0.125 * s, 0.17 * s],
        [0.09 * s, 0.26 * s],
        [0.06 * s, 0.28 * s],
        [0.07 * s, 0.31 * s],
      ],
      x,
      y,
      z,
      hex,
      { seg: 9, cap: "u", capHex: 0x8a5a34, sp: [0.7, 22] },
    );
    plane(
      x - 0.045 * s,
      y + 0.1 * s,
      z + 0.127 * s,
      1,
      0,
      0,
      0,
      1,
      0,
      0.09 * s,
      0.09 * s,
      0xffffff,
      pick(A.jarLabel),
    );
  }
  // small round-bellied teapot
  function teapot(x, y, z, yaw, hex = 0x7a3420, s = 1) {
    at(x, y, z, yaw, () => {
      lathe(
        [
          [0.035 * s, 0],
          [0.062 * s, 0.025 * s],
          [0.06 * s, 0.06 * s],
          [0.035 * s, 0.078 * s],
          [0.012 * s, 0.085 * s],
          [0.012 * s, 0.1 * s],
        ],
        0,
        0,
        0,
        hex,
        { seg: 8, cap: "u", sp: [0.5, 18] },
      );
      box(
        0.055 * s,
        0.035 * s,
        -0.008 * s,
        0.11 * s,
        0.05 * s,
        0.008 * s,
        hex,
        { skip: "l", sp: [0.5, 18] },
      );
      box(
        -0.1 * s,
        0.02 * s,
        -0.006 * s,
        -0.058 * s,
        0.07 * s,
        0.006 * s,
        hex,
        { skip: "r", sp: [0.5, 18] },
      );
    });
  }
  function bowl(x, y, z, food) {
    lathe(
      [
        [0.026, 0],
        [0.06, 0.042],
        [0.062, 0.048],
      ],
      x,
      y,
      z,
      0xf0eee6,
      { seg: 7, cap: "u", capHex: food, sp: [0.5, 20] },
    );
  }
  const cup = (x, y, z) =>
    cyl(x, y, z, 0.027, 0.048, 0xf0eee6, {
      seg: 6,
      capHex: 0x7a4a1c,
      sp: [0.5, 20],
    });
  // round pedestal table with its settings; returns nothing, stands at (x, z)
  function roundTable(x, z, r, wreck) {
    const y = Rm.fl + 0.74;
    cyl(x, y - 0.03, z, r, 0.03, 0xd8d0bc, {
      seg: 14,
      sp: [0.35, 14],
      cap: "ud",
    });
    cyl(x, Rm.fl + 0.03, z, 0.035, 0.68, 0x2a2a2c, { seg: 6, cap: "" });
    cyl(x, Rm.fl, z, 0.24, 0.03, 0x2a2a2c, { seg: 10 });
    occBox(x - r * 0.72, y - 0.03, z - r * 0.72, x + r * 0.72, y, z + r * 0.72);
    shadow(x, z, r * 2.3, r * 2.3, 0.4);
    if (Rm.lod) return;
    lit(x, y + 0.05, z, () => {
      const n = 2 + Math.floor(rnd() * 3),
        a0 = rr(0, 6.28);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i * 6.283) / n,
          px = x + Math.sin(a) * r * 0.62,
          pz = z + Math.cos(a) * r * 0.62;
        if (chance(0.7)) bowl(px, y, pz, pick([0xf4f0e0, 0xb86a2a, 0xd9c08a]));
        else cyl(px, y, pz, 0.085, 0.01, 0xf0eee6, { seg: 8, sp: [0.5, 20] });
        at(
          px + Math.cos(a) * 0.1,
          y,
          pz - Math.sin(a) * 0.1,
          a + rr(-0.3, 0.3),
          () => {
            box(-0.008, 0, -0.11, -0.003, 0.005, 0.11, 0x2a1a10);
            box(0.003, 0, -0.11, 0.008, 0.005, 0.11, 0x2a1a10);
          },
        );
        if (wreck && i === 0)
          at(
            px - Math.cos(a) * 0.12,
            y + 0.027,
            pz + Math.sin(a) * 0.12,
            a,
            () =>
              cyl(0, -0.024, 0, 0.027, 0.048, 0xf0eee6, { seg: 6, cap: "ud" }),
            Math.PI / 2,
          );
        else cup(px - Math.cos(a) * 0.12, y, pz + Math.sin(a) * 0.12);
      }
      // sauce, toothpicks, napkins in the middle
      lathe(
        [
          [0.022, 0],
          [0.022, 0.07],
          [0.009, 0.1],
          [0.011, 0.115],
        ],
        x - 0.05,
        y,
        z,
        0x1a0d08,
        { seg: 6, cap: "u", capHex: 0xb3261e, sp: [0.6, 18] },
      );
      cyl(x + 0.02, y, z + 0.05, 0.018, 0.06, 0xc9a13a, { seg: 6 });
      box(x + 0.01, y, z - 0.09, x + 0.11, y + 0.06, z - 0.03, 0xb8bcc0, {
        sp: [0.5, 16],
      });
    });
  }
  // something strung from a rail at (x, y, z)
  function hang(x, y, z) {
    const k = Math.floor(rnd() * 4),
      len = rr(0.06, 0.16);
    box(x - 0.002, y - len, z - 0.002, x + 0.002, y, z + 0.002, 0x8a7a5a, {
      skip: "ud",
    });
    const t = y - len;
    lit(x, t - 0.1, z, () => {
      if (k === 0)
        for (const dx of [-0.014, 0.014])
          lathe(
            [
              [0.003, -0.22],
              [0.011, -0.2],
              [0.012, -0.03],
              [0.003, 0],
            ],
            x + dx,
            t,
            z,
            dx < 0 ? 0x9a2a20 : 0x5a1c16,
            { seg: 5, sp: [0.5, 14] },
          );
      else if (k === 1)
        ball(x, t - 0.12, z, 0.04, 0.12, 0.012, 0xb9a070, {
          seg: 6,
          sp: [0.3, 10],
        });
      else if (k === 2)
        for (let i = 0; i < 4; i++)
          ball(
            x + (i % 2 ? 0.014 : -0.014),
            t - 0.03 - i * 0.045,
            z,
            0.028,
            0.026,
            0.028,
            0xe6e0cc,
            { seg: 6, rings: 3 },
          );
      else
        for (let i = 0; i < 5; i++)
          ball(
            x + (i % 2 ? 0.01 : -0.01),
            t - 0.02 - i * 0.035,
            z + (i % 3) * 0.006,
            0.011,
            0.028,
            0.011,
            0xb01c12,
            { seg: 5, rings: 3, sp: [0.5, 14] },
          );
    });
  }

  // ---------------------------------------------------------------------------------------
  // The trades
  // ---------------------------------------------------------------------------------------
  // what every half-shuttered shop leaves by the door: boxes, a stool, sometimes a trail
  function threshold() {
    const R = Rm;
    if (R.glass) return;
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = rr(R.X0 + 0.35, R.X1 - 0.35),
        z = rr(-Math.min(1.1, R.D - 0.4), -0.42),
        w = rr(0.3, 0.5);
      carton(x, z, w, rr(0.22, 0.36), rr(0.26, 0.4), rr(-0.4, 0.4));
    }
    if (R.mess > 0.5) gore(rr(R.X0 + 0.6, R.X1 - 0.6), -0.55, R.mess > 0.8);
  }

  function grocery() {
    const R = Rm,
      fl = R.fl,
      Wd = R.X1 - R.X0,
      D = R.D,
      H = R.H,
      lite = 0xfff1dc,
      hi = !R.lod;
    tube(
      R.X0 + 0.5,
      R.X1 - 0.5,
      H - 0.01,
      -Math.min(1.25, D * 0.45),
      lite,
      1.5,
    );
    if (D > 2.9) tube(R.X0 + 0.6, R.X1 - 0.6, H - 0.01, -(D - 1.0), lite, 1.3);
    shell({
      floor: [0xc2bbac, TX.terrazzo],
      wall: [0xc6d2c0, TX.plaster],
      skirt: 0x4a4a44,
      ceil: 0xcfcfc6,
      bed: [0x9a7a54, TX.wood],
    });
    const loot = 0.08 + R.mess * 0.25,
      wide = Wd >= 3.0 && D >= 2.2,
      fr = wide ? 0.86 : 0.03;
    if (wide) {
      at(mx(0.45), fl, -D + 0.66, 0, fridge);
      shadow(mx(0.45), -D + 0.7, 0.95, 0.5, 0.5);
    }
    if (D >= 1.5)
      at(Math.min(mx(fr), mx(Wd - 0.03)), fl, -D + 0.4, 0, () =>
        shelving(Wd - fr - 0.03, 0.38, 2.0, 5, { loot }),
      );
    if (D >= 2.5)
      sideWall(false, R.glass ? -0.92 : -0.3, -D + 0.44, 0.33, (L) =>
        shelving(L, 0.33, 2.0, 5, { loot }),
      );
    // counter with till and scales
    if (D >= 3.0 && Wd >= 3.2) {
      const u0 = 1.05,
        u1 = Math.min(Wd - 0.8, 2.6),
        z0 = -D + 1.2,
        z1 = -D + 1.7,
        y = fl + 0.9,
        zc = (z0 + z1) / 2;
      mbox(u0, fl, z0, u1, y - 0.04, z1, 0x8a6a4a, {
        tx: { all: TX.wood },
        skip: "du",
        occ: 1,
      });
      mbox(u0 - 0.03, y - 0.04, z0 - 0.03, u1 + 0.03, y, z1 + 0.03, 0xd8d2c0, {
        sp: [0.3, 14],
        skip: "",
      });
      shadow(mx((u0 + u1) / 2), z1 + 0.05, u1 - u0 + 0.3, 0.5, 0.5);
      const pc = mx((u0 + u1) / 2);
      plane(
        pc - 0.2,
        fl + 0.14,
        z1 + 0.004,
        1,
        0,
        0,
        0,
        1,
        0,
        0.4,
        0.55,
        0xffffff,
        pick(A.posters),
      );
      if (hi) {
        const tx = mx(u0 + 0.3),
          sx = mx(u1 - 0.3);
        box(tx - 0.17, y, zc - 0.17, tx + 0.17, y + 0.11, zc + 0.17, 0x3a3d40, {
          tx: { u: A.till },
          cx: { u: 0xffffff },
        });
        box(
          tx - 0.1,
          y + 0.11,
          zc - 0.17,
          tx + 0.1,
          y + 0.2,
          zc - 0.12,
          0x2a2c2e,
        );
        plane(
          tx - 0.07,
          y + 0.135,
          zc - 0.118,
          1,
          0,
          0,
          0,
          1,
          0,
          0.14,
          0.04,
          0x40ff80,
          null,
          { e: 1.3 },
        );
        box(sx - 0.12, y, zc - 0.11, sx + 0.12, y + 0.07, zc + 0.11, 0xa82a22, {
          sp: [0.4, 14],
        });
        box(
          sx - 0.08,
          y + 0.07,
          zc - 0.11,
          sx + 0.08,
          y + 0.25,
          zc - 0.07,
          0xa82a22,
          { tx: { f: A.dial }, cx: { f: 0xffffff } },
        );
        cyl(sx, y + 0.07, zc + 0.02, 0.105, 0.012, 0xc8ccd0, {
          seg: 10,
          sp: [0.6, 20],
        });
        glassJar(mx((u0 + u1) / 2), y, zc + 0.05, 0.065, 0.17, 0xd04a3a);
        box(pc + 0.2, y, zc - 0.1, pc + 0.42, y + 0.04, zc + 0.16, 0xffffff, {
          tx: { u: A.paper },
          cx: { l: 0xbfbbb0, r: 0xbfbbb0, f: 0xbfbbb0 },
        });
      }
    }
    // rice by the far wall, cartons by the door
    const sx = mx(Wd - (D >= 2.5 ? 0.78 : 0.4)),
      sz = R.glass ? -1.22 : -0.6;
    for (let i = 0; i < 3; i++)
      at(
        sx + rr(-0.04, 0.04),
        fl + i * 0.135,
        sz + rr(-0.04, 0.04),
        rr(-0.25, 0.25),
        () => pillow(0.42, 0.15, 0.62, 0xffffff, A.rice, { side: 0xe2d7ba }),
      );
    occBox(sx - 0.2, fl, sz - 0.3, sx + 0.2, fl + 0.4, sz + 0.3);
    shadow(sx, sz, 0.7, 0.9, 0.55);
    if (D >= 2.4) {
      carton(mx(0.3), -D + 1.55, 0.42, 0.3, 0.34, rr(-0.2, 0.2));
      carton(mx(0.32), -D + 1.55, 0.36, 0.26, 0.3, rr(-0.5, 0.5), fl + 0.3);
    }
    if (R.bed) {
      const [b0, b1] = R.bed,
        y = 0.55;
      // dried goods strung over the window
      if (hi) {
        const ry = H - 0.3,
          rz = -0.47;
        box(
          b0 + 0.06,
          ry - 0.008,
          rz - 0.008,
          b1 - 0.06,
          ry + 0.008,
          rz + 0.008,
          0x8a8f94,
          { skip: "lr" },
        );
        for (let x = b0 + 0.18; x < b1 - 0.15; x += rr(0.17, 0.3))
          hang(x, ry, rz);
      }
      let x = b0 + 0.22;
      const p = pick(A.tins);
      lit(x + 0.1, y + 0.2, -0.4, () => {
        for (let k = 0; k < 3; k++)
          for (let i = 0; i < 3 - k; i++)
            cyl(
              x + (i + k * 0.5) * 0.105,
              y + k * 0.11,
              -0.42,
              0.05,
              0.11,
              0xffffff,
              { seg: 7, wrap: p.uv, capHex: 0xb4b8bc, sp: [0.2, 14] },
            );
      });
      x += 0.46;
      if (hi) priceCard(x - 0.12, y, -0.3);
      for (let i = 0; i < 2 && x < b1 - 0.5; i++, x += 0.24) {
        const q = pick(A.boxes);
        box(
          x,
          y,
          -0.6 + i * 0.05,
          x + 0.2,
          y + 0.28,
          -0.4 + i * 0.05,
          0xd9a82a,
          { tx: { f: q.uv }, cx: { f: 0xffffff }, sp: [0.3, 14] },
        );
      }
      if (x < b1 - 0.55) {
        cyl(x + 0.2, y, -0.48, 0.17, 0.1, 0x8a6a3a, {
          seg: 10,
          rt: 0.2,
          capTex: A.dried,
          capHex: 0xffffff,
        });
        if (hi) priceCard(x + 0.2, y, -0.27);
        x += 0.5;
      }
      for (; x < b1 - 0.32 && hi; x += 0.21)
        glassJar(
          x + 0.08,
          y,
          -0.45 + rr(-0.04, 0.04),
          0.08,
          0.2,
          pick([0x8a3a14, 0xc9a13a, 0xa02410, 0x6a7a2a]),
        );
      if (b1 - x > 0.3)
        carton(
          Math.min(b1 - 0.24, x + 0.2),
          -0.5,
          0.36,
          0.26,
          0.3,
          rr(-0.2, 0.2),
          y,
        );
    }
    // a free-standing unit in the middle of wide shops: pushed over where things went badly
    if (Wd >= 3.9 && D >= 3.3) {
      const down = R.mess > 0.45,
        ux = mx(1.75),
        yaw = R.dl ? -Math.PI / 2 : Math.PI / 2;
      at(
        ux,
        fl,
        R.dl ? -2.55 : -1.35,
        yaw,
        () => {
          shelving(1.2, 0.36, 1.35, 4, { loot: down ? 0.75 : loot });
          plane(
            -0.016,
            0.72,
            -0.05,
            0,
            0,
            -1,
            0,
            1,
            0,
            0.26,
            0.36,
            0xffffff,
            pick(A.posters),
          );
          plane(
            1.216,
            0.72,
            -0.31,
            0,
            0,
            1,
            0,
            1,
            0,
            0.26,
            0.36,
            0xffffff,
            pick(A.posters),
          );
        },
        down ? 1.36 : 0,
      );
      if (down) spill(mx(1.1), -1.95, 14, 0.75);
      shadow(mx(down ? 1.2 : 1.9), -1.95, down ? 1.7 : 0.6, 1.5, 0.5);
    } else if (R.mess > 0.4)
      spill(mx(Math.min(1.4, Wd / 2)), -Math.min(1.5, D * 0.5), 9, 0.6);
    if (R.mess > 0.68) gore(mx(0.7), -Math.min(1.6, D * 0.55), R.mess > 0.85);
    threshold();
  }

  function diner() {
    const R = Rm,
      fl = R.fl,
      Wd = R.X1 - R.X0,
      D = R.D,
      H = R.H,
      warm = 0xffb478,
      hi = !R.lod;
    // where the furniture goes decides where the lamps hang, so plan first
    const booth = Wd >= 3.4 && D >= 2.6,
      bz = R.glass ? -1.0 : -0.45,
      two = booth && D >= 3.7,
      service = D >= 3.0;
    const tables = [];
    const free0 = 1.25,
      free1 = Wd - (booth ? 1.25 : 0.25);
    if (D >= 1.9 && free1 - free0 >= 0.85) {
      const tz = R.glass ? -1.45 : -Math.min(1.0, D - 0.9);
      if (free1 - free0 >= 2.0)
        tables.push([free0 + 0.5, tz], [free1 - 0.5, tz - 0.25]);
      else tables.push([(free0 + free1) / 2, tz]);
      if (D >= 3.9 && !service)
        tables.push([(free0 + free1) / 2 + 0.2, tz - 1.2]);
    }
    for (const [u, z] of tables) pendant(mx(u), 1.95, z, warm, 1.15, 0x1f4a34);
    if (booth) pendant(mx(Wd - 0.55), 1.95, bz - 0.76, warm, 1.0, 0x1f4a34);
    if (service)
      tube(R.X0 + 0.9, R.X1 - 0.5, H - 0.01, -D + 0.95, 0xffe6c4, 1.1);
    else if (!tables.length) lamp(R.W / 2, H - 0.3, -D / 2, warm, 1.2);
    shell({
      floor: [0xffffff, TX.check],
      wall: [0xe8dcba, TX.plaster],
      back: [0xeeeee6, TX.tile],
      dado: [1.15, 0x9cc4ae, TX.tile],
      band: 0x1f5a40,
      ceil: 0xd2c8b0,
      bed: [0x9a6a44, TX.wood],
    });
    // back wall: kitchen door, counter with the urn, menu and clock above
    if (D >= 1.6 && Wd >= 2.6) backDoor(0.1, 0.9);
    if (service) {
      const u0 = 1.1,
        u1 = Wd - 0.06,
        z0 = -D + 0.78,
        z1 = -D + 1.26,
        y = fl + 1.0;
      mbox(u0, fl, z0, u1, y - 0.04, z1, 0x8fb09e, {
        tx: { all: TX.tile },
        skip: "du",
        occ: 1,
      });
      mbox(u0 - 0.02, y - 0.04, z0 - 0.02, u1 + 0.02, y, z1 + 0.04, 0xc8ccd0, {
        tx: { all: TX.steel },
        sp: [0.5, 16],
        skip: "",
      });
      shadow(mx((u0 + u1) / 2), z1 + 0.05, u1 - u0 + 0.3, 0.5, 0.5);
      const mw = Math.min(1.7, u1 - u0 - 0.5);
      pic("b", (u0 + u1) / 2, fl + 1.42, mw, mw * 0.64, A.menu, {
        frame: 0x3a2416,
      });
      const ux = mx(u0 + 0.35),
        zc = (z0 + z1) / 2;
      lathe(
        [
          [0.11, 0],
          [0.12, 0.02],
          [0.12, 0.34],
          [0.09, 0.38],
          [0.03, 0.4],
          [0.03, 0.44],
        ],
        ux,
        y,
        zc,
        0xc8ccd0,
        { seg: 10, cap: "u", sp: [0.9, 24] },
      );
      box(
        ux - 0.015,
        y + 0.07,
        zc + 0.12,
        ux + 0.015,
        y + 0.1,
        zc + 0.17,
        0x2a2a2c,
      );
      if (hi) {
        const sx = mx(u1 - 0.3);
        lit(sx, y + 0.1, zc, () => {
          for (let i = 0; i < 4; i++) bowl(sx, y + i * 0.022, zc, 0xf0eee6);
          for (let i = 0; i < 6; i++)
            cup(
              sx + (R.dl ? -1 : 1) * (0.14 + (i % 3) * 0.07),
              y,
              zc - 0.06 + Math.floor(i / 3) * 0.08,
            );
        });
      }
    }
    if (D >= 1.6) {
      at(
        mx(0.5),
        fl + 2.32,
        -D + 0.02,
        0,
        () =>
          cyl(0, -0.02, 0, 0.16, 0.03, 0x2a2622, {
            seg: 14,
            capTex: A.clock,
            capHex: 0xffffff,
          }),
        Math.PI / 2,
      );
      pic(
        "b",
        Math.min(Wd - 0.2, 1.05 + (service ? 0 : 0.4)),
        fl + 1.5,
        0.26,
        0.39,
        A.calendar,
      );
      pic("f", -D + 0.5, fl + 1.3, 0.14, 0.52, pick(A.faichun));
    }
    // booth along the far wall
    if (booth) {
      const seat = (z0, z1, back) => {
        mbox(Wd - 1.05, fl, z0, Wd - 0.03, fl + 0.44, z1, 0x8a1c18, {
          sp: [0.35, 12],
          occ: 1,
        });
        mbox(
          Wd - 1.05,
          fl + 0.44,
          back,
          Wd - 0.03,
          fl + 1.06,
          back + 0.07,
          0x8a1c18,
          { sp: [0.35, 12], skip: "d", occ: 1 },
        );
      };
      const tbl = (z0, z1) => {
        mbox(Wd - 0.98, fl + 0.7, z0, Wd - 0.03, fl + 0.74, z1, 0xd9d2c0, {
          sp: [0.35, 14],
          skip: "",
          occ: 1,
        });
        mbox(
          Wd - 0.56,
          fl,
          (z0 + z1) / 2 - 0.04,
          Wd - 0.48,
          fl + 0.7,
          (z0 + z1) / 2 + 0.04,
          0x2a2a2c,
          { skip: "ud" },
        );
        if (hi)
          lit(mx(Wd - 0.5), fl + 0.8, (z0 + z1) / 2, () => {
            bowl(mx(Wd - 0.7), fl + 0.74, z0 + 0.15, 0xd9c08a);
            cup(mx(Wd - 0.35), fl + 0.74, z0 + 0.2);
            cyl(mx(Wd - 0.6), fl + 0.74, z1 - 0.18, 0.085, 0.01, 0xf0eee6, {
              seg: 8,
              sp: [0.5, 20],
            });
            box(
              mx(Wd - 0.2) - 0.05,
              fl + 0.74,
              z0 + 0.22,
              mx(Wd - 0.2) + 0.05,
              fl + 0.8,
              z0 + 0.3,
              0xb8bcc0,
              { sp: [0.5, 16] },
            );
          });
      };
      seat(bz - 0.42, bz, bz - 0.07);
      tbl(bz - 1.04, bz - 0.5);
      seat(bz - 1.54, bz - 1.12, bz - 1.54);
      if (two) {
        seat(bz - 1.98, bz - 1.56, bz - 1.63);
      }
      shadow(mx(Wd - 0.55), bz - 0.8, 1.2, 1.9, 0.4);
    }
    tables.forEach(([u, z], i) => {
      const x = mx(u),
        wreck = R.mess > 0.4 && i === 0;
      roundTable(x, z, 0.4, wreck);
      const n = 3 + (chance(0.5) ? 1 : 0),
        a0 = rr(0, 6.28);
      for (let k = 0; k < n; k++) {
        const a = a0 + (k * 6.283) / n + rr(-0.2, 0.2),
          d = wreck && k === 0 ? 0.95 : rr(0.6, 0.7);
        const px = x + Math.sin(a) * d,
          pz = Math.min(R.zf - 0.25, z + Math.cos(a) * d);
        if (px < R.X0 + 0.2 || px > R.X1 - 0.2) continue;
        stoolAt(px, pz, 0xa82a22, wreck && k === 0);
        shadow(px, pz, 0.45, 0.45, 0.45);
      }
    });
    // ceiling fan
    if (H - fl > 2.4 && D >= 2.2)
      at(R.W / 2, H - 0.3, -Math.min(D / 2, 1.9), rr(0, 2), () => {
        box(-0.012, 0.03, -0.012, 0.012, 0.3, 0.012, 0xd8d4c8, { skip: "ud" });
        cyl(0, -0.03, 0, 0.09, 0.07, 0xd8d4c8, { seg: 8, cap: "d" });
        for (let i = 0; i < 3; i++)
          at(0, 0, 0, (i * 6.283) / 3, () =>
            box(0.08, -0.004, -0.06, 0.62, 0.004, 0.06, 0x6a4a30, { skip: "" }),
          );
      });
    // bakery trays in the window
    if (R.bed) {
      const [b0, b1] = R.bed,
        y = 0.55;
      for (let x = b0 + 0.12; x < b1 - 0.5; x += 0.56) {
        const buns = chance(0.6);
        box(x, y, -0.68, x + 0.46, y + 0.018, -0.32, 0xb8bcc0, {
          sp: [0.5, 16],
        });
        if (hi) {
          lit(x + 0.23, y + 0.1, -0.5, () => {
            for (let i = 0; i < (buns ? 3 : 4); i++)
              for (let j = 0; j < (buns ? 2 : 3); j++) {
                if (chance(0.25)) continue;
                const px = x + 0.08 + i * (buns ? 0.15 : 0.1),
                  pz = -0.6 + j * (buns ? 0.17 : 0.11);
                if (buns)
                  ball(px, y + 0.04, pz, 0.058, 0.036, 0.058, 0xd9a03a, {
                    seg: 6,
                    rings: 3,
                    cols: [0xb87a2a, 0xd9a03a, 0xe8bc54, 0xe8bc54],
                  });
                else
                  cyl(px, y + 0.018, pz, 0.03, 0.022, 0xd9a860, {
                    seg: 6,
                    rt: 0.038,
                    capHex: 0xf2c230,
                    sp: [0.4, 14],
                  });
              }
          });
          priceCard(x + 0.23, y, -0.29);
        }
      }
    }
    // something dropped on the way out
    if (R.mess > 0.3 && D >= 2.2) {
      const tx = mx(0.75),
        tz = -Math.min(D - 0.8, 1.7);
      at(tx, fl + 0.012, tz, rr(0, 3), () => {
        box(-0.2, 0, -0.14, 0.2, 0.014, 0.14, 0x7a4a2a, { sp: [0.3, 12] });
        cyl(0.05, 0.014, 0.02, 0.085, 0.01, 0xf0eee6, { seg: 8 });
      });
      floorDecal(tx + 0.25, tz + 0.1, 0.7, 0.5, rr(0, 6), A.pool, 0x5a3418, {
        a: 0.5,
        sp: [0.4, 16],
      });
      at(
        tx + 0.3,
        fl + 0.03,
        tz - 0.2,
        rr(0, 6),
        () => bowl(0, -0.048, 0, 0xf0eee6),
        Math.PI,
      );
      shadow(tx, tz, 0.6, 0.5, 0.4);
    }
    if (R.mess > 0.62) gore(mx(0.55), -Math.min(D - 0.9, 2.3), R.mess > 0.82);
    threshold();
  }

  // ----- fittings shared by the specialist trades -----
  // brass balance on a stand; one pan still holds what was being weighed
  function balance(x, y, z, yaw) {
    at(x, y, z, yaw, () => {
      const br = 0xa8843a,
        sp = [0.8, 22];
      cyl(0, 0, 0, 0.07, 0.014, 0x3a2416, { seg: 8 });
      box(-0.007, 0.014, -0.007, 0.007, 0.34, 0.007, br, { skip: "ud", sp });
      at(
        0,
        0.335,
        0,
        0,
        () => {
          box(-0.19, -0.006, -0.005, 0.19, 0.006, 0.005, br, { skip: "", sp });
          for (const s of [-1, 1]) {
            box(
              s * 0.18 - 0.0015,
              -0.17,
              -0.0015,
              s * 0.18 + 0.0015,
              0,
              0.0015,
              0x6a5a3a,
              { skip: "ud" },
            );
            lathe(
              [
                [0.012, -0.2],
                [0.06, -0.186],
                [0.066, -0.17],
              ],
              s * 0.18,
              0,
              0,
              br,
              {
                seg: 8,
                cap: "u",
                capHex: s < 0 ? 0xffffff : 0x7a6230,
                capTex: s < 0 ? A.dried : undefined,
                sp,
              },
            );
          }
        },
        0,
        0.07,
      );
    });
  }
  function mortar(x, y, z) {
    lathe(
      [
        [0.045, 0],
        [0.07, 0.03],
        [0.078, 0.1],
        [0.068, 0.104],
      ],
      x,
      y,
      z,
      0x8f8c84,
      { seg: 8, cap: "u", capHex: 0x3c3a36, sp: [0.25, 10] },
    );
    at(
      x + 0.02,
      y + 0.1,
      z,
      rr(0, 6),
      () =>
        box(-0.012, -0.05, -0.012, 0.012, 0.14, 0.012, 0x9a968e, { skip: "" }),
      0.5,
    );
  }
  // open sack of dried goods standing on the floor
  function sack(x, z, s, tint) {
    const y = Rm.fl;
    lathe(
      [
        [0.16 * s, 0],
        [0.22 * s, 0.1 * s],
        [0.21 * s, 0.32 * s],
        [0.225 * s, 0.38 * s],
        [0.2 * s, 0.39 * s],
      ],
      x,
      y,
      z,
      0xd9c9a2,
      {
        seg: 9,
        wrap: A.sack,
        cap: "u",
        capTex: A.dried,
        capHex: tint,
        sz: 0.92,
      },
    );
    occBox(
      x - 0.18 * s,
      y,
      z - 0.18 * s,
      x + 0.18 * s,
      y + 0.36 * s,
      z + 0.18 * s,
    );
    shadow(x, z, 0.62 * s, 0.6 * s, 0.5);
  }
  // loose sheets on the floor
  function litter(x, z, n, rad) {
    for (let i = 0; i < n; i++) {
      const px = x + rr(-rad, rad),
        pz = z + rr(-rad, rad);
      if (
        px < Rm.X0 + 0.15 ||
        px > Rm.X1 - 0.15 ||
        pz < -Rm.D + 0.15 ||
        pz > Rm.zf - 0.1
      )
        continue;
      floorDecal(
        px,
        pz,
        0.21,
        0.29,
        rr(0, 6.28),
        chance(0.5) ? A.paper : null,
        chance(0.5) ? 0xffffff : 0xe2d8bc,
        { a: 1, y: 0.007 + i * 0.0005 },
      );
    }
  }
  // drum stool
  const drumStool = (x, z, hex = 0x5a2014) => {
    lathe(
      [
        [0.12, 0],
        [0.17, 0.11],
        [0.17, 0.31],
        [0.13, 0.42],
      ],
      x,
      Rm.fl,
      z,
      hex,
      { seg: 10, cap: "u", sp: [0.6, 20] },
    );
    occBox(x - 0.12, Rm.fl, z - 0.12, x + 0.12, Rm.fl + 0.42, z + 0.12);
    shadow(x, z, 0.5, 0.5, 0.5);
  };
  // the sill every doorway steps over, and the sign left hanging on a glass door
  function sill() {
    const R = Rm;
    const x0 = R.glass ? R.dx0 : 0,
      x1 = R.glass ? R.dx1 : R.W;
    box(x0, 0.08, R.zf, x1, R.fl, 0.004, 0x8a8478, {
      skip: "dblr",
      tx: { all: TX.terrazzo },
    });
    if (R.glass && !R.lod && chance(0.6)) {
      const xc = (R.dx0 + R.dx1) / 2;
      plane(
        xc - 0.14,
        1.32,
        -0.178,
        1,
        0,
        0,
        0,
        1,
        0,
        0.28,
        0.18,
        0xffffff,
        A.closed,
        { k: 1.5 },
      );
      box(xc - 0.001, 1.5, -0.179, xc + 0.001, 1.62, -0.177, 0x8a7a5a, {
        skip: "ud",
      });
    }
  }

  // The herbalist's wall of labelled drawers, in shelf space (x 0..L, front at z = 0).
  function drawerWall(L, dep, y0, y1) {
    const wood = 0x5a3420,
      trim = 0x3a2014;
    const cols = Math.max(2, Math.round(L / 0.235)),
      cw = L / cols;
    const rows = Math.max(2, Math.round((y1 - y0) / 0.19)),
      rh = (y1 - y0) / rows;
    box(0, 0, -dep, L, y1 + 0.05, -0.012, wood, {
      tx: { all: TX.wood },
      skip: "db",
      occ: 1,
      cx: { f: 0x1c100a },
    });
    box(-0.02, y1 + 0.05, -dep, L + 0.02, y1 + 0.09, 0.02, trim, {
      tx: { all: TX.wood },
      skip: "b",
    });
    box(-0.01, y0 - 0.035, -0.012, L + 0.01, y0, 0.05, trim, {
      tx: { all: TX.wood },
      skip: "b",
    });
    if (dry) {
      const b = new THREE.Box3();
      for (let i = 0; i < 8; i++)
        b.expandByPoint(
          _v
            .set(i & 1 ? L : 0, i & 2 ? y1 : 0, i & 4 ? 0.3 : -dep)
            .applyMatrix4(T),
        );
      vols.push([b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z, 0.8]);
    }
    lit(L / 2, (y0 + y1) / 2, 0.5, () => {
      const nd = Math.max(1, Math.round(L / 0.62)),
        dw = L / nd;
      for (let i = 0; i < nd; i++) {
        box(
          i * dw + 0.012,
          0.07,
          -0.012,
          (i + 1) * dw - 0.012,
          y0 - 0.05,
          0.006,
          wood,
          {
            tx: { all: TX.wood },
            skip: "db",
            k: 1.15,
          },
        );
        if (!Rm.lod)
          box(
            i * dw + dw - 0.06,
            y0 * 0.55,
            0.006,
            i * dw + dw - 0.045,
            y0 * 0.55 + 0.09,
            0.02,
            0xa8843a,
            { skip: "b", sp: [0.8, 22] },
          );
      }
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const x = i * cw,
            y = y0 + j * rh,
            uv = pick(A.drawers);
          const out =
            !Rm.lod && chance(0.02 + Rm.mess * 0.07) ? rr(0.06, 0.2) : 0;
          if (out) {
            box(
              x + 0.006,
              y + 0.006,
              -0.1,
              x + cw - 0.006,
              y + rh - 0.006,
              out,
              0x6a4024,
              {
                tx: { f: uv, l: TX.wood, r: TX.wood },
                cx: { f: 0xffffff, u: 0x2a1a10 },
                skip: "db",
              },
            );
          } else
            plane(
              x + 0.005,
              y + 0.005,
              0,
              1,
              0,
              0,
              0,
              1,
              0,
              cw - 0.01,
              rh - 0.01,
              0xffffff,
              uv,
              { k: 1.1 },
            );
          if (!Rm.lod)
            box(
              x + cw / 2 - 0.007,
              y + rh * 0.16,
              out,
              x + cw / 2 + 0.007,
              y + rh * 0.16 + 0.014,
              out + 0.012,
              0xb08a3a,
              {
                skip: "bd",
                sp: [0.8, 22],
              },
            );
        }
    });
  }

  function herbs() {
    const R = Rm,
      fl = R.fl,
      Wd = R.X1 - R.X0,
      D = R.D,
      H = R.H,
      warm = 0xffc58c,
      hi = !R.lod;
    const lz = -Math.min(1.35, D * 0.45);
    pendant(mx(Wd * 0.3), 2.12, lz, warm, 1.25, 0x6a1c14);
    if (Wd >= 3.2)
      pendant(mx(Wd * 0.72), 2.12, lz - 0.15, warm, 1.25, 0x6a1c14);
    if (D >= 2.8)
      tube(R.X0 + 0.7, R.X1 - 0.7, H - 0.01, -(D - 0.85), 0xffe6c8, 1.0);
    shell({
      floor: [0x9a7a58, TX.plank],
      wall: [0xd9cdb0, TX.plaster],
      dado: [1.0, 0x5a3420, TX.wood],
      band: 0x2e190e,
      ceil: 0xc8bea6,
      bed: [0x5a3420, TX.wood],
    });
    const door = Wd >= 3.4 && D >= 1.6;
    if (door) backDoor(0.1, 0.9);
    // the wall of drawers, jars along its top
    if (D >= 1.3) {
      const u0 = door ? 1.1 : 0.06,
        u1 = Wd - 0.06,
        L = u1 - u0;
      at(Math.min(mx(u0), mx(u1)), fl, -D + 0.44, 0, () =>
        drawerWall(L, 0.42, 0.8, 2.14),
      );
      if (hi && H - fl > 2.62)
        for (let u = u0 + 0.2; u < u1 - 0.15; u += rr(0.3, 0.42))
          if (!chance(0.15))
            potJar(
              mx(u),
              fl + 2.23,
              -D + 0.24,
              rr(0.85, 1.05),
              pick([0xdfe6ee, 0xdfe6ee, 0x9ab4c8, 0x2a4a7a]),
            );
    }
    // dispensing counter
    if (D >= 2.7 && Wd >= 2.8) {
      const u0 = door ? 1.15 : 0.5,
        u1 = Wd - 0.5,
        z0 = -D + 1.15,
        z1 = -D + 1.62,
        y = fl + 0.92,
        zc = (z0 + z1) / 2;
      mbox(u0, fl, z0, u1, y - 0.045, z1, 0x6a4024, {
        tx: { all: TX.wood },
        skip: "du",
        occ: 1,
      });
      mbox(u0 - 0.03, y - 0.045, z0 - 0.03, u1 + 0.03, y, z1 + 0.04, 0x3a2014, {
        tx: { all: TX.wood },
        sp: [0.3, 14],
        skip: "",
      });
      for (let u = u0 + 0.04; u + 0.7 <= u1; u += 0.72) {
        const x = Math.min(mx(u), mx(u + 0.7));
        plane(
          x,
          y - 0.25,
          z1 + 0.003,
          1,
          0,
          0,
          0,
          1,
          0,
          0.7,
          0.175,
          0xffffff,
          A.fret,
          { k: 0.9 },
        );
      }
      shadow(mx((u0 + u1) / 2), z1 + 0.05, u1 - u0 + 0.3, 0.5, 0.5);
      balance(mx(u0 + 0.4), y, zc, rr(-0.3, 0.3));
      if (hi) {
        mortar(mx(u1 - 0.3), y, zc - 0.05);
        lit(mx((u0 + u1) / 2), y + 0.1, zc, () => {
          for (let u = u0 + 0.85; u < u1 - 0.65; u += 0.32) {
            const x = mx(u),
              z = zc + rr(-0.05, 0.08);
            at(x, y + 0.002, z, rr(-0.3, 0.3), () => {
              plane(
                -0.12,
                0,
                0.12,
                1,
                0,
                0,
                0,
                0,
                -1,
                0.24,
                0.24,
                0xe9dfc4,
                null,
              );
              ball(
                0,
                0.016,
                0,
                rr(0.05, 0.08),
                0.03,
                rr(0.05, 0.07),
                pick([0xffffff, 0xc86a3a, 0x8a6a4a, 0xe8d8a8]),
                {
                  wrap: A.dried,
                  seg: 7,
                  rings: 3,
                },
              );
            });
          }
        });
      }
    }
    // jars down the far wall
    if (D >= 2.2)
      sideWall(
        false,
        R.glass ? -0.92 : -0.3,
        -D + (D >= 2.7 ? 1.72 : 0.5),
        0.3,
        (L) =>
          shelving(L, 0.3, 1.9, 5, {
            hex: 0x6a4428,
            tx: TX.wood,
            kinds: "jjjl",
            loot: 0.1 + R.mess * 0.3,
          }),
      );
    if (D >= 2.4) {
      pic(
        "d",
        -D * 0.5,
        fl + 1.7,
        Math.min(1.5, D * 0.42),
        Math.min(1.5, D * 0.42) / 4,
        A.board,
        { frame: 0x2a1810 },
      );
      pic("d", -D * 0.5 + 1.05, fl + 1.25, 0.14, 0.52, pick(A.faichun));
    }
    // sacks on the floor
    const sx = Wd - (D >= 2.2 ? 0.72 : 0.4),
      sz = R.glass ? -1.25 : -0.55;
    sack(mx(sx), sz, 1, 0xffffff);
    if (Wd >= 3) sack(mx(sx - 0.47), sz - 0.08, 0.9, 0xc8643a);
    if (Wd >= 3.6 && hi) sack(mx(sx - 0.2), sz - 0.5, 0.95, 0x8f6a48);
    if (R.bed) {
      const [b0, b1] = R.bed,
        y = 0.55;
      let x = b0 + 0.25;
      for (let i = 0; x < b1 - 0.25; i++) {
        const k = i % 3;
        if (k === 0) {
          cyl(x, y, -0.47, 0.19, 0.045, 0x9a7a4a, {
            seg: 12,
            rt: 0.2,
            capTex: A.dried,
            capHex: pick([0xffffff, 0xc8643a, 0xd9c08a]),
          });
          if (hi) priceCard(x, y, -0.26);
          x += 0.5;
        } else if (k === 1) {
          glassJar(
            x,
            y,
            -0.5,
            0.1,
            0.27,
            pick([0xc9a13a, 0x8a3a14, 0xa02410, 0xd8c8a0]),
            0x2a1a10,
          );
          if (hi && x + 0.24 < b1 - 0.2)
            glassJar(
              x + 0.22,
              y,
              -0.42,
              0.075,
              0.2,
              pick([0xc9a13a, 0x6a7a2a, 0xd8c8a0]),
              0x2a1a10,
            );
          x += 0.52;
        } else {
          potJar(x, y, -0.48, 1.25, pick([0xdfe6ee, 0x9ab4c8]));
          x += 0.42;
        }
      }
    }
    if (R.mess > 0.35 && D >= 2) {
      litter(mx(Math.min(1.5, Wd / 2)), -Math.min(1.6, D * 0.5), 7, 0.7);
      stoolAt(
        mx(Math.min(1.7, Wd * 0.6)),
        -Math.min(1.9, D * 0.6),
        0x6a4024,
        true,
      );
    } else if (D >= 2)
      drumStool(mx(Math.min(1.7, Wd * 0.6)), -Math.min(1.9, D * 0.6), 0x5a3420);
    if (R.mess > 0.66) gore(mx(0.65), -Math.min(1.6, D * 0.55), R.mess > 0.85);
    threshold();
  }

  // something roasted, hanging from (x, y, z): 0 goose, 1 duck, 2 soy chicken, 3 char siu,
  // 4 a slab of crackling pork
  function roast(x, y, z, k) {
    const hook = rr(0.05, 0.09);
    box(
      x - 0.003,
      y - hook,
      z - 0.003,
      x + 0.003,
      y + 0.012,
      z + 0.003,
      0xc8ccd0,
      { skip: "ud" },
    );
    const t = y - hook,
      sp = [1.1, 26];
    lit(x, t - 0.2, z + 0.05, () => {
      if (k <= 2) {
        const s = k === 0 ? 1.15 : k === 1 ? 1 : 0.92;
        const c =
          k === 2
            ? [0x9a6a24, 0xc8923c, 0xe0b458, 0xe6bc64, 0xc8923c, 0x9a6a24]
            : k === 1
              ? [0x4a1a08, 0x8a3a10, 0xb0561a, 0xb85e1e, 0x8a3a10, 0x4a1a08]
              : [0x3a1206, 0x6a280c, 0x8f3e12, 0x984414, 0x6a280c, 0x3a1206];
        // neck up to the hook, body, the stumps of the legs
        lathe(
          [
            [0.03 * s, -0.17 * s],
            [0.02 * s, -0.09 * s],
            [0.016 * s, -0.02 * s],
            [0.01 * s, 0],
          ],
          x,
          t,
          z,
          c[2],
          {
            seg: 6,
            sp,
            off: [
              [0, 0],
              [0.012, 0],
              [0.004, 0],
              [0, 0],
            ],
          },
        );
        ball(x, t - 0.3 * s, z, 0.088 * s, 0.155 * s, 0.066 * s, c[2], {
          seg: 8,
          rings: 5,
          cols: c,
          sp,
        });
        for (const dx of [-0.045, 0.045]) {
          ball(
            x + dx * 1.75 * s,
            t - 0.25 * s,
            z - 0.01,
            0.022 * s,
            0.085 * s,
            0.03 * s,
            c[1],
            { seg: 5, rings: 3, sp },
          );
          lathe(
            [
              [0.008 * s, -0.52 * s],
              [0.014 * s, -0.5 * s],
              [0.024 * s, -0.42 * s],
            ],
            x + dx * s,
            t,
            z,
            c[1],
            { seg: 5, cap: "d", sp },
          );
        }
      } else if (k === 3) {
        const n = 1 + (chance(0.5) ? 1 : 0);
        for (let i = 0; i < n; i++)
          ball(
            x + (i - (n - 1) / 2) * 0.07,
            t - 0.19,
            z + i * 0.01,
            0.033,
            0.19,
            0.026,
            0x8a1c10,
            {
              seg: 6,
              rings: 4,
              cols: [0x3a0a04, 0x7a180c, 0xa02c14, 0x7a180c, 0x3a0a04],
              sp,
            },
          );
      } else {
        ball(x, t - 0.23, z, 0.125, 0.225, 0.034, 0xffffff, {
          seg: 8,
          rings: 5,
          wrap: A.crackle,
          cols: [0xb98a6a, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xb98a6a],
          sp: [0.6, 16],
        });
      }
    });
  }

  function bbq() {
    const R = Rm,
      fl = R.fl,
      Wd = R.X1 - R.X0,
      D = R.D,
      H = R.H,
      hi = !R.lod,
      heat = 0xff9448;
    const steel = { tx: { all: TX.steel }, sp: [0.5, 16] };
    // heat lamps over the window, strip lights behind
    const railY = Math.min(R.top - 0.3, 2.46),
      railZ = -0.46;
    if (R.bed) {
      const [b0, b1] = R.bed,
        n = Math.max(1, Math.round((b1 - b0) / 1.3));
      for (let i = 0; i < n; i++)
        pendant(
          b0 + ((b1 - b0) * (i + 0.5)) / n,
          railY + 0.16,
          railZ - 0.26,
          heat,
          1.35,
          0xb8bcc0,
          0.15,
        );
    } else lamp(R.W / 2, 1.9, -0.9, heat, 1.3);
    tube(
      R.X0 + 0.6,
      R.X1 - 0.6,
      H - 0.01,
      -Math.min(D - 0.7, D * 0.62),
      0xfff0dc,
      1.5,
    );
    shell({
      floor: [0xb9b4a6, TX.terrazzo],
      wall: [0xeef0e8, TX.tile],
      dado: [1.1, 0xe2e8de, TX.tile],
      band: 0xb3261e,
      skirt: 0x4a4a44,
      ceil: 0xd4d0c4,
      bed: [0xc8ccd0, TX.steel, [0.5, 16]],
    });
    // the window: rail of roasts, trays below, prices pasted inside the glass
    if (R.bed) {
      const [b0, b1] = R.bed;
      box(
        b0 + 0.04,
        railY - 0.01,
        railZ - 0.01,
        b1 - 0.04,
        railY + 0.01,
        railZ + 0.01,
        0xc8ccd0,
        { skip: "lr", sp: [0.8, 22] },
      );
      for (const x of [b0 + 0.3, b1 - 0.3])
        box(
          x - 0.008,
          railY + 0.01,
          railZ - 0.008,
          x + 0.008,
          H,
          railZ + 0.008,
          0xc8ccd0,
          { skip: "ud" },
        );
      const order = [1, 1, 0, 3, 3, 4, 2, 1, 3, 0, 2, 4];
      let x = b0 + 0.22,
        i = Math.floor(rnd() * order.length);
      while (x < b1 - 0.18) {
        const k = order[i++ % order.length];
        if (chance(0.82 - R.mess * 0.3))
          roast(x + (k === 4 ? 0.08 : 0), railY, railZ, hi || k !== 4 ? k : 3);
        x += k === 4 ? 0.48 : k === 3 ? 0.22 : rr(0.27, 0.32);
      }
      const y = 0.55;
      for (let tx = b0 + 0.1; tx + 0.5 < b1; tx += 0.62) {
        box(tx, y, -0.7, tx + 0.52, y + 0.03, -0.3, 0xc8ccd0, {
          sp: [0.6, 18],
        });
        if (hi)
          lit(tx + 0.26, y + 0.1, -0.5, () => {
            for (let n = 0; n < 5; n++) {
              const px = tx + rr(0.08, 0.44),
                pz = rr(-0.64, -0.36);
              if (chance(0.5))
                at(px, y + 0.03, pz, rr(0, 3), () =>
                  box(-0.05, 0, -0.022, 0.05, 0.035, 0.022, 0xffffff, {
                    tx: { all: A.pork, u: A.crackle },
                    sp: [0.5, 14],
                  }),
                );
              else
                ball(px, y + 0.045, pz, 0.05, 0.02, 0.03, 0x8a2a12, {
                  seg: 6,
                  rings: 3,
                  sp: [1, 24],
                });
            }
          });
        floorDecal(tx + 0.26, -0.5, 0.4, 0.3, rr(0, 6), A.pool, 0x6a3410, {
          a: 0.55,
          y: y + 0.032 - fl,
          sp: [0.6, 20],
        });
      }
      if (hi && D >= 1.6)
        for (let k = 0; k < 3; k++)
          pic("f", -1.05 - k * 0.2, fl + 1.42, 0.14, 0.52, A.roast[k]);
    }
    // chopping bench right behind the window
    const cz1 = R.glass ? -0.84 : -Math.max(0.5, D - 1.0),
      cz0 = cz1 - 0.56,
      cy = fl + 0.9;
    const cu0 = R.glass ? 1.25 : 1.2,
      cu1 = Wd - 0.08;
    if (D >= 1.9 && cu1 - cu0 >= 1.1) {
      mbox(cu0, fl, cz0, cu1, cy - 0.04, cz1, 0xc8ccd0, {
        ...steel,
        skip: "du",
        occ: 1,
      });
      mbox(
        cu0 - 0.02,
        cy - 0.04,
        cz0 - 0.02,
        cu1 + 0.02,
        cy,
        cz1 + 0.02,
        0xd4d8dc,
        { ...steel, skip: "" },
      );
      shadow(mx((cu0 + cu1) / 2), cz0 - 0.05, cu1 - cu0 + 0.3, 0.5, 0.5);
      const zc = (cz0 + cz1) / 2,
        bx = mx(cu0 + 0.42);
      cyl(bx, cy, zc, 0.2, 0.13, 0xb98a54, {
        seg: 12,
        capHex: 0xd2a868,
        capTex: A.wood,
        sp: [0.2, 10],
      });
      // the cleaver, left standing in the block
      at(
        bx + 0.03,
        cy + 0.13,
        zc,
        rr(-0.6, 0.6),
        () => {
          box(-0.1, 0, -0.002, 0.1, 0.1, 0.002, 0xc8ccd0, {
            skip: "",
            sp: [1, 28],
          });
          box(0.1, 0.055, -0.012, 0.21, 0.085, 0.012, 0x3a2416, { skip: "l" });
        },
        0,
        rr(0.15, 0.4),
      );
      if (hi) {
        const rx = mx(cu1 - 0.3);
        lathe(
          [
            [0.13, 0],
            [0.14, 0.03],
            [0.14, 0.2],
            [0.12, 0.24],
            [0.03, 0.26],
            [0.03, 0.285],
          ],
          rx,
          cy,
          zc,
          0xeeeae0,
          { seg: 10, cap: "u", capHex: 0x2a2a2c, sp: [0.5, 18] },
        );
        lit(mx((cu0 + cu1) / 2 + 0.2), cy + 0.1, zc, () => {
          for (let k = 0; k < 3; k++)
            bowl(
              mx(cu0 + 0.95 + k * 0.17),
              cy,
              zc + 0.12,
              pick([0x1a0d08, 0xb04a1a, 0xd9c08a]),
            );
          for (let k = 0; k < 4; k++)
            box(
              mx(cu0 + 1.0) - 0.11,
              cy + k * 0.052,
              zc - 0.2,
              mx(cu0 + 1.0) + 0.11,
              cy + k * 0.052 + 0.05,
              zc - 0.04,
              0xf2f0ea,
              {
                cx: { f: 0xe6e3da },
              },
            );
        });
      }
    }
    // back wall: kitchen door, menu, the day's prices
    const door = D >= 1.6 && Wd >= 2.6;
    if (door) backDoor(0.1, 0.9);
    if (D >= 1.6) {
      const u0 = door ? 1.2 : 0.3,
        mw = Math.min(1.6, Wd - u0 - 0.9);
      if (mw > 0.8)
        pic("b", u0 + mw / 2, fl + 1.35, mw, mw * 0.64, A.menu, {
          frame: 0x3a2416,
        });
      if (hi)
        for (
          let k = 0, u = u0 + Math.max(mw, 0) + 0.25;
          k < A.roast.length && u < Wd - 0.5;
          k++, u += 0.2
        )
          pic("b", u, fl + 1.45, 0.14, 0.52, A.roast[k]);
      at(
        mx(0.5),
        fl + 2.34,
        -D + 0.02,
        0,
        () =>
          cyl(0, -0.02, 0, 0.16, 0.03, 0x2a2622, {
            seg: 14,
            capTex: A.clock,
            capHex: 0xffffff,
          }),
        Math.PI / 2,
      );
      pic("f", -D + 0.55, fl + 1.35, 0.26, 0.39, A.calendar);
      shrine(Wd - 0.32);
    }
    // a couple of tables for those who ate in
    if (R.glass ? D >= 3.5 && Wd >= 3.2 : D >= 2.3 && Wd >= 2.6) {
      const tz = R.glass ? -(D - 1.25) : -0.95,
        us =
          Wd >= 4.4
            ? [1.55, Wd - 1.0]
            : R.glass
              ? [Wd / 2 + 0.3]
              : [0.8, Wd - 0.8];
      us.forEach((u, i) => {
        const x = mx(u),
          wreck = R.mess > 0.45 && i === 0;
        roundTable(x, tz, 0.38, wreck);
        const a0 = rr(0, 6.28);
        for (let k = 0; k < 3; k++) {
          const a = a0 + (k * 6.283) / 3,
            d = wreck && k === 0 ? 0.9 : 0.62;
          const px = x + Math.sin(a) * d,
            pz = R.glass
              ? Math.min(cz0 - 0.3, tz + Math.cos(a) * d)
              : Math.min(-0.3, tz + Math.cos(a) * d);
          if (px < R.X0 + 0.2 || px > R.X1 - 0.2 || pz < -D + 0.25) continue;
          if (!R.glass && pz < cz1 + 0.2) continue;
          stoolAt(px, pz, 0x2a5a8a, wreck && k === 0);
          shadow(px, pz, 0.45, 0.45, 0.45);
        }
      });
    }
    if (R.mess > 0.4 && D >= 2.4)
      floorDecal(
        mx(0.7),
        -Math.min(D - 0.9, 1.9),
        0.9,
        0.6,
        rr(0, 6),
        A.pool,
        0x4a2a10,
        { a: 0.5, sp: [0.5, 18] },
      );
    if (R.mess > 0.6) gore(mx(0.6), -Math.min(D - 0.9, 2.2), R.mess > 0.8);
    threshold();
  }

  const teaTin = (x, y, z, p, s = 1) => {
    cyl(x, y, z, 0.085 * s, 0.2 * s, 0xffffff, {
      seg: 10,
      wrap: p.uv,
      cap: "",
      sp: [0.35, 16],
    });
    cyl(x, y + 0.2 * s, z, 0.089 * s, 0.03 * s, p.base, {
      seg: 10,
      sp: [0.6, 20],
    });
  };
  // pressed tea cake on a little stand, face to the room
  const teaCake = (x, y, z) => {
    box(x - 0.05, y, z - 0.03, x + 0.05, y + 0.012, z + 0.03, 0x3a2014);
    at(
      x,
      y + 0.115,
      z,
      0,
      () =>
        cyl(0, -0.012, 0, 0.1, 0.024, 0xe6dcc0, {
          seg: 12,
          cap: "ud",
          capTex: A.cake,
          capHex: 0xffffff,
        }),
      Math.PI / 2 - 0.16,
    );
  };
  // The merchant's wall: cupboards below, four shelves of caddies, cakes and pots above.
  function teaWall(L, dep, hgt) {
    const wood = 0x4a2a18,
      tx = { all: TX.wood };
    box(0, 0, -dep, L, hgt, -dep + 0.014, wood, {
      tx,
      skip: "dblr",
      occ: 1,
      k: 0.75,
    });
    box(-0.03, 0, -dep, 0, hgt, 0, wood, { tx, occ: 1 });
    box(L, 0, -dep, L + 0.03, hgt, 0, wood, { tx, occ: 1 });
    box(-0.03, hgt, -dep, L + 0.03, hgt + 0.05, 0.03, 0x2e190e, {
      tx,
      skip: "b",
    });
    box(0, 0, -dep + 0.014, L, 0.6, -0.012, wood, { tx, skip: "dblr", occ: 1 });
    const nd = Math.max(1, Math.round(L / 0.6)),
      dw = L / nd;
    for (let i = 0; i < nd; i++)
      box(
        i * dw + 0.012,
        0.06,
        -0.012,
        (i + 1) * dw - 0.012,
        0.56,
        0.004,
        0x5a3420,
        { tx, skip: "db", k: 1.1 },
      );
    if (dry) {
      const b = new THREE.Box3();
      for (let i = 0; i < 8; i++)
        b.expandByPoint(
          _v
            .set(i & 1 ? L : 0, i & 2 ? hgt : 0, i & 4 ? 0 : -dep)
            .applyMatrix4(T),
        );
      vols.push([b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z, 0.6]);
    }
    const rows = 4,
      y0 = 0.62,
      gap = (hgt - y0 - 0.03) / rows;
    const loot = 0.06 + Rm.mess * 0.25,
      zc = -dep / 2;
    for (let j = 0; j < rows; j++) {
      const y = y0 + j * gap;
      box(0, y - 0.026, -dep + 0.014, L, y, 0, wood, {
        tx,
        skip: j ? "b" : "bd",
        occ: 1,
      });
      let x = 0.13;
      while (x < L - 0.1) {
        if (chance(loot)) {
          x += rr(0.2, 0.5);
          continue;
        }
        const kind = j === 2 ? 1 : j === 3 && chance(0.5) ? 2 : 0;
        if (Rm.lod) {
          const p = pick(A.teas),
            len = Math.min(L - 0.1 - x, rr(0.5, 0.9));
          box(
            x - 0.08,
            y,
            zc - 0.07,
            x - 0.08 + len,
            y + 0.2,
            zc + 0.07,
            p.base,
            { skip: "db", tx: { f: p.uv }, cx: { f: 0xffffff } },
          );
          x += len + 0.1;
        } else if (kind === 0) {
          const p = pick(A.teas),
            n = 2 + Math.floor(rnd() * 3);
          lit(x + 0.2, y + 0.12, 0, () => {
            for (let i = 0; i < n && x < L - 0.1; i++, x += 0.195)
              teaTin(
                x,
                y,
                zc + rr(-0.015, 0.015),
                p,
                Math.min(1, (gap - 0.06) / 0.24),
              );
          });
          x += 0.05;
        } else if (kind === 1) {
          lit(x + 0.1, y + 0.12, 0, () => {
            teaCake(x, y, zc);
            if (x + 0.24 < L - 0.1)
              teapot(
                x + 0.24,
                y,
                zc + 0.02,
                rr(-0.6, 0.6),
                pick([0x7a3420, 0x4a2c20, 0x2a3a34]),
                1.1,
              );
          });
          x += 0.5;
        } else {
          lit(x, y + 0.12, 0, () =>
            potJar(
              x,
              y,
              zc,
              Math.min(1, (gap - 0.05) / 0.32),
              pick([0xdfe6ee, 0x2a4a7a, 0x8a1a14]),
            ),
          );
          x += 0.3;
        }
      }
    }
  }

  function tea() {
    const R = Rm,
      fl = R.fl,
      Wd = R.X1 - R.X0,
      D = R.D,
      H = R.H,
      warm = 0xffbe84,
      hi = !R.lod;
    const table = D >= 2.7 && Wd >= 3.1,
      tu = Math.min(Wd - 1.25, Wd / 2 + 0.35),
      tz = -Math.min(D - 1.55, R.glass ? 1.75 : 1.2);
    pendant(
      mx(table ? tu : Wd / 2),
      1.95,
      table ? tz : -Math.min(1.2, D / 2),
      warm,
      1.3,
      0x8a1c14,
      0.21,
    );
    if (Wd >= 3.6)
      pendant(mx(0.75), 2.1, -Math.min(D - 0.9, 1.1), warm, 0.9, 0x8a1c14);
    if (D >= 2.6) {
      lamp(R.W * 0.3, H - 0.25, -D + 0.75, 0xffd9a8, 0.6);
      lamp(R.W * 0.7, H - 0.25, -D + 0.75, 0xffd9a8, 0.6);
    }
    shell({
      floor: [0x8a6644, TX.plank],
      wall: [0xe2d6b8, TX.plaster],
      dado: [0.95, 0x4a2c1a, TX.wood],
      band: 0x241408,
      ceil: 0xcbc0a4,
      bed: [0x4a2c1a, TX.wood],
    });
    const door = Wd >= 3.6 && D >= 1.6;
    if (door) backDoor(0.1, 0.9);
    if (D >= 1.3) {
      const u0 = door ? 1.12 : 0.08,
        u1 = Wd - 0.08;
      at(Math.min(mx(u0), mx(u1)), fl, -D + 0.38, 0, () =>
        teaWall(u1 - u0, 0.36, 2.2),
      );
      // downlights tucked under the cornice wash the caddies
      if (H - fl > 2.5)
        for (let u = u0 + 0.36; u + 0.72 <= u1 - 0.3; u += 0.72)
          plane(
            Math.min(mx(u), mx(u + 0.72)),
            fl + 2.3,
            -D + 0.022,
            1,
            0,
            0,
            0,
            1,
            0,
            0.72,
            0.18,
            0xffffff,
            A.fret,
            { k: 1.1 },
          );
    }
    // the tasting table
    if (table) {
      const x = mx(tu),
        y = fl + 0.5;
      box(x - 0.55, y - 0.07, tz - 0.3, x + 0.55, y, tz + 0.3, 0x3a2014, {
        tx: { all: TX.wood },
        skip: "",
        sp: [0.4, 16],
        occ: 1,
      });
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ])
        box(
          x + dx * 0.47 - 0.035,
          fl,
          tz + dz * 0.23 - 0.035,
          x + dx * 0.47 + 0.035,
          y - 0.07,
          tz + dz * 0.23 + 0.035,
          0x3a2014,
          { skip: "ud" },
        );
      shadow(x, tz, 1.4, 0.9, 0.55);
      lit(x, y + 0.1, tz, () => {
        box(x - 0.24, y, tz - 0.15, x + 0.24, y + 0.022, tz + 0.15, 0x241408, {
          sp: [0.5, 18],
        });
        teapot(x - 0.08, y + 0.022, tz, rr(-0.8, 0.8), 0x7a3420, 1.25);
        if (hi)
          for (let k = 0; k < 4; k++) {
            const tip = R.mess > 0.5 && k === 0;
            if (tip)
              at(
                x + 0.34,
                y + 0.027,
                tz + 0.2,
                rr(0, 6),
                () =>
                  cyl(0, -0.024, 0, 0.027, 0.048, 0xf0eee6, {
                    seg: 6,
                    cap: "ud",
                  }),
                Math.PI / 2,
              );
            else
              cup(
                x + 0.05 + (k % 2) * 0.075,
                y + 0.022,
                tz - 0.06 + Math.floor(k / 2) * 0.1,
              );
          }
        if (hi) teaCake(x + 0.38, y, tz - 0.12);
      });
      const tipped = R.mess > 0.55;
      drumStool(x - 0.25, tz + 0.62);
      if (tipped) {
        at(
          x + 0.5,
          fl + 0.17,
          tz + 0.75,
          rr(0, 6),
          () =>
            lathe(
              [
                [0.12, -0.21],
                [0.17, -0.1],
                [0.17, 0.1],
                [0.13, 0.21],
              ],
              0,
              0,
              0,
              0x5a2014,
              { seg: 10, cap: "ud", sp: [0.6, 20] },
            ),
          Math.PI / 2,
        );
        shadow(x + 0.5, tz + 0.75, 0.6, 0.45, 0.5);
      } else drumStool(x + 0.38, tz + 0.6);
      if (tz - 0.62 > -D + 0.75) drumStool(x + 0.1, tz - 0.6);
    }
    // chests of leaf stacked by the far wall
    const cx = mx(Wd - 0.34),
      cz = R.glass ? -1.2 : -0.55;
    const chest = (x, y, z, yaw) => {
      at(x, y, z, yaw, () =>
        box(-0.26, 0, -0.2, 0.26, 0.36, 0.2, 0xffffff, {
          tx: { all: A.teaChest },
          cx: { u: 0xb89468 },
          skip: y > fl ? "" : "d",
          occ: 1,
        }),
      );
    };
    const cyaw = R.dl ? -Math.PI / 2 : Math.PI / 2;
    chest(cx, fl, cz, cyaw + rr(-0.08, 0.08));
    if (D >= 2.2) chest(cx, fl, cz - 0.58, cyaw + rr(-0.08, 0.08));
    if (hi)
      chest(
        cx - (R.dl ? 0.02 : -0.02),
        fl + 0.36,
        cz - 0.25,
        cyaw + rr(-0.2, 0.2),
      );
    shadow(cx, cz - 0.3, 0.8, 1.4, 0.55);
    if (D >= 2.4) {
      const sz = -Math.min(D - 1.0, D * 0.55);
      pic("d", sz, fl + 1.25, 0.34, 1.25, A.scrolls[0]);
      if (D >= 3.2) pic("d", sz - 0.6, fl + 1.25, 0.34, 1.25, A.scrolls[1]);
      pic("f", -D + (D >= 3 ? 1.5 : 1.0), fl + 1.45, 0.62, 0.62, A.plaque, {
        frame: 0x1c100a,
      });
    }
    if (R.bed) {
      const [b0, b1] = R.bed,
        y = 0.55;
      let x = b0 + 0.24;
      for (let i = 0; x < b1 - 0.22; i++) {
        const k = i % 4;
        if (k === 0) {
          const p = pick(A.teas);
          lit(x + 0.1, y + 0.2, -0.45, () => {
            teaTin(x, y, -0.5, p);
            teaTin(x + 0.19, y, -0.5, p);
            if (hi) teaTin(x + 0.095, y + 0.23, -0.5, p);
          });
          if (hi) priceCard(x + 0.1, y, -0.3);
          x += 0.5;
        } else if (k === 1) {
          lit(x, y + 0.1, -0.45, () => {
            for (let n = 0; n < 4; n++)
              cyl(x, y + n * 0.025, -0.48, 0.1, 0.024, 0xe6dcc0, {
                seg: 12,
                capTex: A.cake,
                capHex: 0xffffff,
              });
            if (hi) teaCake(x + 0.24, y, -0.52);
          });
          x += 0.52;
        } else if (k === 2) {
          lit(x, y + 0.1, -0.45, () => {
            box(x - 0.14, y, -0.6, x + 0.2, y + 0.02, -0.36, 0x241408, {
              sp: [0.5, 18],
            });
            teapot(
              x - 0.02,
              y + 0.02,
              -0.48,
              rr(-0.5, 0.5),
              pick([0x7a3420, 0x2a3a34]),
              1.3,
            );
            if (hi)
              for (let n = 0; n < 3; n++)
                cup(x + 0.1 + (n % 2) * 0.06, y + 0.02, -0.55 + n * 0.07);
          });
          x += 0.5;
        } else {
          potJar(x, y, -0.5, 1.3, pick([0x2a4a7a, 0x8a1a14, 0xdfe6ee]));
          x += 0.42;
        }
      }
    }
    if (R.mess > 0.4 && D >= 2) {
      // a caddy knocked off the shelf, its leaf across the boards
      const lx = mx(Math.min(1.5, Wd * 0.45)),
        lzz = -Math.min(D - 0.75, D * 0.7);
      const p = pick(A.teas);
      at(
        lx,
        fl + 0.085,
        lzz,
        rr(0, 6),
        () =>
          cyl(0, -0.1, 0, 0.085, 0.2, 0xffffff, {
            seg: 10,
            wrap: p.uv,
            cap: "ud",
            capHex: 0x1c1a14,
          }),
        Math.PI / 2,
      );
      floorDecal(lx + 0.2, lzz + 0.12, 0.6, 0.45, rr(0, 6), A.pool, 0x1c1a10, {
        a: 0.75,
      });
      shadow(lx, lzz, 0.4, 0.3, 0.45);
    }
    if (R.mess > 0.7) gore(mx(0.65), -Math.min(D - 0.9, 2.0), R.mess > 0.86);
    threshold();
  }

  // ---------------------------------------------------------------------------------------
  // Rooms: recorded as the buildings go up, planned and built by finish()
  // ---------------------------------------------------------------------------------------
  const TRADES = { grocery, diner, herbs, bbq, tea };
  // ambient light from above and below, and how much dusk comes in from the street
  const MOOD = {
    grocery: { up: [0.2, 0.21, 0.2], dn: [0.085, 0.088, 0.085], fill: 0.1 },
    diner: { up: [0.2, 0.165, 0.125], dn: [0.085, 0.07, 0.055], fill: 0.1 },
    herbs: { up: [0.17, 0.135, 0.095], dn: [0.075, 0.06, 0.045], fill: 0.09 },
    bbq: { up: [0.21, 0.19, 0.165], dn: [0.09, 0.08, 0.07], fill: 0.1 },
    tea: { up: [0.165, 0.13, 0.09], dn: [0.07, 0.056, 0.042], fill: 0.09 },
  };
  const LOW = !!(kit.G && kit.G.quality && kit.G.quality.name === "low");
  const rooms = [];
  let serial = 0;
  function record(f, r) {
    const o = P(f, r.a, 0, 0);
    rooms.push({
      f,
      ox: o[0],
      oz: o[2],
      W: r.b - r.a,
      seed: 9176 + 7919 * serial++,
      lod: LOW || ctx.emitters !== mainEmitters,
      ...r,
    });
  }
  // The room behind a glazed shopfront. The opening spans a..b along the wall and 0..top in
  // height; the display window is w0..w1 and the door door0..door1. kind: grocery | diner |
  // herbs | bbq | tea.
  function interior(f, { a, b, top, kind, w0, w1, door0, door1 }) {
    record(f, {
      a,
      b,
      top,
      kind,
      glass: true,
      bed: [w0 - a + 0.02, w1 - a - 0.02],
      dl: door0 < w0,
      dx0: door0 - a,
      dx1: door1 - a,
    });
  }
  // The slice of shop visible under a shutter that stopped `lift` metres above the ground.
  function underShutter(f, { a, b, lift, kind, top = 2.75 }) {
    record(f, {
      a,
      b,
      top,
      kind,
      glass: false,
      lift,
      bed: null,
      dx0: 0,
      dx1: b - a,
    });
  }

  // footprint of room p in the room space of q: [x0, x1, z0, z1]
  function plotIn(q, p) {
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9;
    for (const [u, d] of [
      [0, 0],
      [p.W, 0],
      [p.W, -p.D],
      [0, -p.D],
    ]) {
      const dx = p.ox + p.f.ax * u + p.f.nx * d - q.ox,
        dz = p.oz + p.f.az * u + p.f.nz * d - q.oz;
      const x = dx * q.f.ax + dz * q.f.az,
        z = dx * q.f.nx + dz * q.f.nz;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    return [x0, x1, z0, z1];
  }
  function plan(list) {
    for (const r of list) {
      const R0 = prng(r.seed ^ 0x51ed);
      const want = r.lod
        ? 2.4
        : r.glass
          ? Math.min(4.3, 2.5 + r.W * 0.42)
          : 2.7;
      const room =
        r.f.depth !== undefined ? Math.max(0.7, r.f.depth * 0.5 - 0.2) : 2.4;
      r.D = Math.min(want, room);
      r.X0 = 0;
      r.X1 = r.W;
      r.zf = r.glass ? -0.2 : -0.16;
      r.zfL = r.zfR = -0.3;
      r.mess = R0();
      if (r.dl === undefined) r.dl = R0() < 0.5;
    }
    // two shops on a corner: the grander one keeps the corner, the other steps in around it
    const order = [...list].sort((p, q) => q.glass - p.glass || q.W - p.W);
    for (let i = 0; i < order.length; i++)
      for (let j = i + 1; j < order.length; j++) {
        const p = order[i],
          q = order[j];
        if (p.f === q.f || p.dead || q.dead) continue;
        let [x0, x1, z0, z1] = plotIn(q, p);
        const hit = () =>
          x1 > 0.05 && x0 < q.W - 0.05 && z1 > -q.D + 0.05 && z0 < -0.05;
        if (!hit()) continue;
        const left = x0 < 0.45,
          right = x1 > q.W - 0.45;
        if (left && right) q.dead = true;
        else if (left || right) {
          const cover = left ? x1 : q.W - x0,
            spare = cover + 0.12 - (q.W - Math.max(1.5, q.W * 0.55));
          if (spare > 0) {
            p.D = Math.max(1.6, p.D - spare);
            [x0, x1, z0, z1] = plotIn(q, p);
            if (!hit()) continue;
          }
          if (left) {
            q.X0 = Math.max(q.X0, x1 + 0.12);
            if (z1 + 0.12 < q.zf - 0.3) q.zfL = Math.min(q.zfL, z1 + 0.12);
          } else {
            q.X1 = Math.min(q.X1, x0 - 0.12);
            if (z1 + 0.12 < q.zf - 0.3) q.zfR = Math.min(q.zfR, z1 + 0.12);
          }
        } else q.D = Math.min(q.D, -z1 - 0.12);
        if (q.X1 - q.X0 < 1.2 || q.D < 0.7) q.dead = true;
      }
    for (const r of list) {
      if (!r.bed) continue;
      const b0 = Math.max(r.bed[0], r.X0 + 0.02),
        b1 = Math.min(r.bed[1], r.X1 - 0.02);
      r.bed = b1 - b0 > 0.7 ? [b0, b1] : null;
    }
  }

  // Rooms are merged by district so the ones behind the camera are culled together.
  const chunks = new Map();
  let bS = newBuf(3); // floors, walls and ceilings: large enough to matter in wet-street reflections
  function useChunk(x, z) {
    const key = Math.floor(x / 24) + "," + Math.floor(z / 24);
    let c = chunks.get(key);
    if (!c) chunks.set(key, (c = { s: newBuf(3), o: newBuf(3), t: newBuf(4) }));
    bS = c.s;
    bO = c.o;
    bT = c.t;
  }
  function build(r) {
    const f = r.f,
      mood = MOOD[r.kind] || MOOD.grocery;
    wox = r.ox;
    woz = r.oz;
    wax = f.ax;
    waz = f.az;
    wnx = f.nx;
    wnz = f.nz;
    useChunk(
      wox + wax * r.W * 0.5 - wnx * 1.5,
      woz + waz * r.W * 0.5 - wnz * 1.5,
    );
    Rm = {
      W: r.W,
      D: r.D,
      X0: r.X0,
      X1: r.X1,
      zf: r.zf,
      zfL: r.zfL,
      zfR: r.zfR,
      fl: FL,
      H: r.top + 0.3,
      top: r.top,
      glass: r.glass,
      bed: r.bed,
      dl: r.dl,
      dx0: r.dx0,
      dx1: r.dx1,
      mess: r.mess,
      lod: r.lod,
      ambUp: mood.up,
      ambDn: mood.dn,
      fill: r.glass ? mood.fill : mood.fill * 0.7,
    };
    yCut = r.glass ? 1e9 : r.lift + 0.12;
    lights = [];
    occ = [];
    vols = [];
    T = null;
    visC = null;
    if (r.dead) {
      // nothing fits behind this front: it was boarded up from the inside
      dry = false;
      rnd = prng(r.seed);
      const top = Math.min(Rm.H, yCut + 0.45);
      for (let x = 0; x < r.W - 0.01; x += 1.1)
        plane(
          x,
          0.08,
          r.zf - 0.05,
          1,
          0,
          0,
          0,
          1,
          0,
          Math.min(1.1, r.W - x),
          top - 0.08,
          0xffffff,
          A.planks,
          { k: 2.2 },
        );
      return;
    }
    const trade = TRADES[r.kind] || grocery;
    for (const pass of [true, false]) {
      dry = pass;
      rnd = prng(r.seed);
      T = null;
      visC = null;
      trade();
      sill();
    }
  }

  // ---------------------------------------------------------------------------------------
  // Awnings: sagging canvas on a pipe frame, with a scalloped valance carrying the shop name
  // ---------------------------------------------------------------------------------------
  const awnCol = new Map();
  function awning(f, s0, s1, y, depth, color, stripes, shop) {
    const drop = 0.55,
      L = s1 - s0;
    const nS = Math.max(3, Math.round(L / 0.56)),
      nD = 5,
      sub = 3; // each stripe is `sub` strips wide so the cloth can belly between the ribs
    let cc = awnCol.get(color);
    if (!cc) {
      const k = new THREE.Color(color);
      awnCol.set(color, (cc = [k.r, k.g, k.b]));
    }
    const pale = C(0xe6dfcc);
    const cv = A.canvas,
      vl = A.valance;
    const Rw = prng((s0 * 977 + f.ox * 131 + f.oz * 71) | 0);
    const sagMid = 0.05 + Rw() * 0.05,
      lean = (Rw() - 0.5) * 0.06;
    // height and reach of the cloth at (t along the wall, v from wall to lip)
    const surf = (t, v) => {
      const rib = Math.abs(Math.sin(Math.PI * t * nS)); // 0 on a rib, 1 between
      const belly =
        Math.sin(Math.PI * v) * (0.035 + 0.05 * rib) +
        sagMid * Math.sin(Math.PI * t) * v * v;
      return [
        s0 + L * t,
        y - drop * v - belly + lean * (t - 0.5) * v,
        0.05 + (depth - 0.05) * v,
      ];
    };
    const push = (p, n, c, u, v) => {
      const w = P(f, p[0], p[1], p[2]);
      bA.pos.push(w[0], w[1], w[2]);
      bA.nrm.push(f.ax * n[0] + f.nx * n[2], n[1], f.az * n[0] + f.nz * n[2]);
      bA.col.push(c[0], c[1], c[2]);
      bA.uv.push(u, v);
      return bA.pos.length / 3 - 1;
    };
    const nrm = (t, v) => {
      const e = 0.01,
        a = surf(Math.min(1, t + e), v),
        b = surf(Math.max(0, t - e), v),
        c = surf(t, Math.min(1, v + e)),
        d = surf(t, Math.max(0, v - e));
      const ux = a[0] - b[0],
        uy = a[1] - b[1],
        uz = a[2] - b[2],
        vx = c[0] - d[0],
        vy = c[1] - d[1],
        vz = c[2] - d[2];
      // (along the wall) x (towards the lip) points down in face space: flip it
      let nx = -(uy * vz - uz * vy),
        ny = -(uz * vx - ux * vz),
        nz = -(ux * vy - uy * vx);
      const l = Math.hypot(nx, ny, nz) || 1;
      return [nx / l, ny / l, nz / l];
    };
    for (let i = 0; i < nS; i++) {
      const col = stripes && i % 2 ? pale : cc;
      const grid = [];
      for (let k = 0; k <= sub; k++) {
        const t = (i + k / sub) / nS,
          row = [];
        for (let j = 0; j <= nD; j++) {
          const v = j / nD;
          row.push(
            push(
              surf(t, v),
              nrm(t, v),
              col,
              cv[0] + (cv[2] - cv[0]) * t,
              cv[3] + (cv[1] - cv[3]) * v,
            ),
          );
        }
        grid.push(row);
      }
      for (let k = 0; k < sub; k++)
        for (let j = 0; j < nD; j++)
          bA.idx.push(
            grid[k][j],
            grid[k][j + 1],
            grid[k + 1][j + 1],
            grid[k][j],
            grid[k + 1][j + 1],
            grid[k + 1][j],
          );
    }
    // valance: a straight band, then one scallop under every half stripe
    const vh = 0.19,
      sc = 0.085,
      nV = nS * 2,
      wave = (t) => 0.012 * Math.sin(t * L * 5.1 + s0);
    const lip = (t, dy) => {
      const p = surf(t, 1);
      return [p[0], p[1] - dy, p[2] + wave(t) * (dy / vh)];
    };
    const out = [0, 0.12, 0.993];
    for (let i = 0; i < nV; i++) {
      const col = stripes && Math.floor(i / 2) % 2 ? pale : cc;
      const t0 = i / nV,
        t1 = (i + 1) / nV;
      const u0 = vl[0] + (vl[2] - vl[0]) * ((i % 4) / 4),
        u1 = vl[0] + (vl[2] - vl[0]) * ((i % 4) / 4 + 0.25),
        vT = vl[3],
        vM = vl[1] + (vl[3] - vl[1]) * 0.3,
        vB = vl[1];
      const a = push(lip(t0, 0), out, col, u0, vT),
        b = push(lip(t1, 0), out, col, u1, vT),
        c = push(lip(t1, vh), out, col, u1, vM),
        d = push(lip(t0, vh), out, col, u0, vM);
      bA.idx.push(a, d, c, a, c, b);
      // rounded tongue
      const seg = 5;
      let prev = d;
      const mid = push(lip((t0 + t1) / 2, vh), out, col, (u0 + u1) / 2, vM);
      for (let k = 1; k <= seg; k++) {
        const ph = (Math.PI * k) / seg,
          tt = t0 + ((t1 - t0) * (1 - Math.cos(ph))) / 2;
        const id =
          k === seg
            ? c
            : push(
                lip(tt, vh + sc * Math.sin(ph)),
                out,
                col,
                u0 + (u1 - u0) * ((1 - Math.cos(ph)) / 2),
                vM + (vB - vM) * Math.sin(ph),
              );
        bA.idx.push(mid, prev, id);
        prev = id;
      }
    }
    // the shop's name sewn on the middle of the band
    const words = shop ? String(shop[0] || "") + String(shop[1] || "") : "";
    if (words && L > 2.2) {
      const dark = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l < 0.45;
      const uv = A.band(words, dark ? "#8a1a14" : "#1c1a18"),
        bw = Math.min(L * 0.5, 0.22 * [...words].length + 0.3),
        bh = vh - 0.035;
      const tc = 0.5,
        ht = bw / 2 / L,
        o2 = [0, 0.12, 0.993];
      const q = (t, dy) => {
        const p = lip(t, dy);
        return [p[0], p[1], p[2] + 0.006];
      };
      const a = push(q(tc - ht, 0.02), o2, [1, 1, 1], uv[0], uv[3]),
        b = push(q(tc + ht, 0.02), o2, [1, 1, 1], uv[2], uv[3]),
        c = push(q(tc + ht, 0.02 + bh), o2, [1, 1, 1], uv[2], uv[1]),
        d = push(q(tc - ht, 0.02 + bh), o2, [1, 1, 1], uv[0], uv[1]);
      bA.idx.push(a, d, c, a, c, b);
    }
    // pipe frame: wall rail, lip rail, a rib under every stripe edge, stays at the ends
    const lipY = (t) => surf(t, 1)[1] - 0.012;
    kit.rod(M.galv, P(f, s0, y - 0.02, 0.06), P(f, s1, y - 0.02, 0.06), 0.014);
    kit.rod(M.galv, P(f, s0, lipY(0), depth), P(f, s1, lipY(1), depth), 0.016);
    for (let i = 0; i <= nS; i++) {
      const t = i / nS,
        s = s0 + L * t;
      kit.rod(
        M.galv,
        P(f, s, y - 0.025, 0.06),
        P(f, s, lipY(t), depth),
        0.011,
        { cast: false },
      );
    }
    for (const [s, t] of [
      [s0 + 0.03, 0],
      [s1 - 0.03, 1],
    ])
      kit.rod(
        M.galv,
        P(f, s, lipY(t), depth - 0.02),
        P(f, s, y - 0.85, 0.03),
        0.013,
      );
  }

  // ---------------------------------------------------------------------------------------
  // Materials and the merge
  // ---------------------------------------------------------------------------------------
  const matRoom = new THREE.MeshBasicMaterial({
    map: A.tex,
    vertexColors: true,
  });
  matRoom.name = "ct_shopfit";
  const matSee = new THREE.MeshBasicMaterial({
    map: A.tex,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  matSee.name = "ct_shopfit_alpha";
  const matCloth = new THREE.MeshStandardMaterial({
    map: A.tex,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  matCloth.name = "ct_awning";
  kit.G.mats.adopt(matCloth, {
    wet: [0.25, 0.7, 0.4, 0.4],
    macro: [0.05, 0.05, 1.5, 0.2],
    interior: false,
  });

  function toMesh(buf, mat, o = NO) {
    if (!buf.idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
    geo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(buf.col, buf.nc),
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(buf.uv, 2));
    if (buf.nrm.length)
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(buf.nrm, 3));
    geo.setIndex(
      buf.pos.length / 3 > 65535
        ? new THREE.Uint32BufferAttribute(buf.idx, 1)
        : new THREE.Uint16BufferAttribute(buf.idx, 1),
    );
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = !!o.cast;
    mesh.receiveShadow = !!o.cast;
    // merged in world space and never moved (a shadow cache may draw it only once)
    mesh.userData.staticShadow = true;
    if (o.mainOnly) mesh.layers.set(2);
    if (o.order) mesh.renderOrder = o.order;
    return mesh;
  }
  // Builds every room recorded so far and adds the merged meshes to `parent`. Safe to call
  // again later (the backdrop does, for the streets beyond the wire).
  function finish(parent) {
    const t0 = performance.now();
    const n = rooms.length;
    // where each room ended up: [x, z, outward x, outward z, width, depth, trade, glass, boarded]
    const plots = rooms.map((r) => [
      r.ox + r.f.ax * r.W * 0.5,
      r.oz + r.f.az * r.W * 0.5,
      r.f.nx,
      r.f.nz,
      r.W,
      0,
      r.kind,
      r.glass,
      false,
    ]);
    if (n) {
      plan(rooms);
      rooms.forEach((r, i) => {
        build(r);
        plots[i][5] = r.D;
        plots[i][8] = !!r.dead;
      });
      rooms.length = 0;
    }
    Rm = null;
    const root = new THREE.Group();
    root.name = "ct-shopfit";
    let tris = 0;
    const add = (m) => {
      if (!m) return;
      root.add(m);
      tris += m.geometry.index.count / 3;
    };
    for (const c of chunks.values()) {
      add(toMesh(c.s, matRoom));
      add(toMesh(c.o, matRoom, { mainOnly: true }));
      add(toMesh(c.t, matSee, { mainOnly: true, order: -1 }));
    }
    chunks.clear();
    add(toMesh(bA, matCloth, { cast: true }));
    bA = newBuf(3);
    root.userData.tris = tris;
    root.userData.rooms = n;
    root.userData.plots = plots;
    root.userData.ms = Math.round(performance.now() - t0);
    if (parent) parent.add(root);
    return root;
  }

  return { interior, underShutter, awning, finish };
}
