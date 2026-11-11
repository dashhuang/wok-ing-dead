// The wet market hall: a brick shed with a corrugated roof, abandoned mid-trade. It is the
// level's one interior (see interiorBoxes in level.js) and holds the second evac siren, so it
// is built to be fought through: a cross of wide aisles between islands of stalls.
//
// Everything the stalls need that is not a wall or a steel section comes from one canvas atlas
// (paintAtlas below) drawn through four materials — matte, glossy, unlit and transparent — whose
// colour is multiplied by per-vertex tints. Fish, meat, produce, signs, price cards, tarpaulins,
// tank water and skylight glass are therefore a handful of draw calls however many there are.
import * as THREE from "three";

const SERIF = '"CT Serif", "Noto Serif TC", "Songti TC", "PingFang TC", serif';
const KAI =
  '"CT Kai", "LXGW WenKai TC", "Kaiti TC", "BiauKai", "CT Serif", serif';
const LATIN =
  '"Big Shoulders Display", "Barlow Condensed", "Arial Narrow", Impact, sans-serif';

// Stall identities: [stall number, name, trade, english, board colours (ground, ink)].
const STALLS = {
  fish: ["12", "陳記", "鮮魚", "CHAN KEE FRESH FISH", "#f1ead6", "#b3161a"],
  fish2: ["14", "陳記", "冰鮮", "CHILLED FISH", "#1d4f8a", "#f4f1e2"],
  sea: ["16", "海龍", "海鮮", "HOI LUNG LIVE SEAFOOD", "#0d5a4a", "#ffe9a8"],
  meat: ["3", "強記", "鮮肉", "KEUNG KEE FRESH MEAT", "#b3161a", "#ffe9a8"],
  meat2: ["5", "強記", "豬肉", "PORK · OFFAL", "#f1ead6", "#b3161a"],
  poultry: ["1", "合興", "雞鴨", "HOP HING POULTRY", "#f3d43a", "#b3161a"],
  eggs: ["2", "珍記", "鮮蛋", "CHAN KEE EGGS", "#f1ead6", "#1f6a3a"],
  dry: ["7", "永利", "乾貨", "WING LEE DRIED GOODS", "#5a2a16", "#f3d98a"],
  dry2: ["24", "永利", "雜貨", "RICE · OIL · SUNDRIES", "#f1ead6", "#5a2a16"],
  tofu: ["18", "財記", "豆腐", "CHOI KEE BEAN CURD", "#f1ead6", "#1d4f8a"],
  noodle: ["26", "財記", "粉麵", "NOODLES · WRAPPERS", "#f3d43a", "#1d3f7a"],
  veg: ["31", "蘭姐", "蔬菜", "SISTER LAN VEGETABLES", "#1f6a3a", "#f4f1e2"],
  veg2: ["33", "新界", "菜檔", "LOCAL GREENS", "#f1ead6", "#1f6a3a"],
  fruit: ["35", "大利", "生果", "TAI LEE FRUIT", "#f3d43a", "#b3161a"],
  fruit2: ["37", "大利", "鮮果", "FRESH FRUIT", "#b3161a", "#ffe9a8"],
};
// Hand-written price cards: [key, goods, price, paper colour].
const CARDS = [
  ["orange", "靚橙", "$10/4個", "#ffe14a"],
  ["apple", "蘋果", "$12/3個", "#ff9cc0"],
  ["melon", "西瓜", "$5/斤", "#b8f25a"],
  ["dragon", "火龍果", "$15/2個", "#ffe14a"],
  ["hami", "蜜瓜", "$9/斤", "#ffb04a"],
  ["pomelo", "沙田柚", "$18/個", "#f3ead2"],
  ["pear", "雪梨", "$10/3個", "#b8f25a"],
  ["tomato", "番茄", "$8/斤", "#ffe14a"],
  ["bokchoy", "白菜", "$6/斤", "#f3ead2"],
  ["choysum", "菜心", "$9/斤", "#ff9cc0"],
  ["daikon", "蘿蔔", "$5/斤", "#ffe14a"],
  ["eggplant", "茄子", "$7/斤", "#ffb04a"],
  ["bitter", "苦瓜", "$8/斤", "#b8f25a"],
  ["onion", "洋蔥", "$4/斤", "#f3ead2"],
  ["potato", "薯仔", "$5/斤", "#c9a064"],
  ["cabbage", "椰菜", "$6/個", "#ffe14a"],
  ["snapper", "紅衫", "$38/斤", "#ffe14a"],
  ["croaker", "黃花", "$45/斤", "#ff9cc0"],
  ["mullet", "烏頭", "$28/斤", "#f3ead2"],
  ["grouper", "石斑", "$98/斤", "#ffb04a"],
  ["pomfret", "鯧魚", "$60/斤", "#ffe14a"],
  ["squid", "魷魚", "$32/斤", "#b8f25a"],
  ["shrimp", "海蝦", "$58/斤", "#ff9cc0"],
  ["clam", "花蜆", "$20/斤", "#f3ead2"],
  ["ribs", "排骨", "$48/斤", "#ffe14a"],
  ["belly", "腩肉", "$36/斤", "#f3ead2"],
  ["egg", "雞蛋", "$15/打", "#ffe14a"],
  ["tofu", "豆腐", "$4/磚", "#f3ead2"],
  ["chicken", "走地雞", "$68/隻", "#ffb04a"],
  ["rice", "香米", "$52/包", "#f3ead2"],
];

// Small deterministic generator, private to the hall so that dressing it never shifts the
// shared stream the rest of the level is laid out with.
function mulberry(seed) {
  let s = seed | 0;
  return (a = 1, b) => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return b === undefined ? r * a : a + (b - a) * r;
  };
}

// ------------------------------------------------------------------------------------------
// The atlas. tile(name, w, h, paint) reserves a rectangle and returns its texture coordinates
// [u0, v0, u1, v1] (v0 = bottom). Opaque tiles are painted a little past their edge so that
// mip levels bleed their own colour; tiles with alpha start from a cleared rectangle.
function paintAtlas(aniso, rnd) {
  const S = 2048,
    PAD = 8;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const c = canvas.getContext("2d");
  c.fillStyle = "#6b6b66";
  c.fillRect(0, 0, S, S);
  const R = {};
  // skyline packer: each tile goes where the row of tiles already placed is lowest
  const STEP = 8;
  const sky = new Uint16Array(S / STEP);
  function alloc(w, h) {
    const wc = Math.ceil(w / STEP);
    let best = -1,
      bestY = 1e9;
    for (let i = 0; i + wc <= sky.length; i++) {
      let y = 0;
      for (let k = 0; k < wc; k++) if (sky[i + k] > y) y = sky[i + k];
      if (y < bestY) {
        bestY = y;
        best = i;
      }
    }
    if (best < 0 || bestY + h > S) return null;
    for (let k = 0; k < wc; k++) sky[best + k] = bestY + h;
    return [best * STEP, bestY];
  }
  function tile(name, w, h, fn, alpha = false) {
    const slot = alloc(w + PAD, h + PAD);
    if (!slot) {
      console.warn(`[market] atlas is full, "${name}" left out`);
      return (R[name] = R.white);
    }
    const x = slot[0] + PAD / 2,
      y = slot[1] + PAD / 2;
    c.save();
    if (alpha) c.clearRect(x - PAD / 2, y - PAD / 2, w + PAD, h + PAD);
    const e = alpha ? 0 : PAD / 2 - 1;
    c.beginPath();
    c.rect(x - e, y - e, w + 2 * e, h + 2 * e);
    c.clip();
    c.translate(x, y);
    fn(w, h);
    c.restore();
    return (R[name] = [
      (x + 0.5) / S,
      1 - (y + h - 0.5) / S,
      (x + w - 0.5) / S,
      1 - (y + 0.5) / S,
    ]);
  }
  // ---- brushes ----
  const bg = (w, h, style) => {
    c.fillStyle = style;
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
  };
  const vgrad = (h, ...stops) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    for (let i = 0; i < stops.length; i += 2)
      g.addColorStop(stops[i], stops[i + 1]);
    return g;
  };
  const hgrad = (w, ...stops) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i < stops.length; i += 2)
      g.addColorStop(stops[i], stops[i + 1]);
    return g;
  };
  const dots = (w, h, n, col, r0, r1, a0 = 1, a1 = a0) => {
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      c.globalAlpha = a0 + rnd() * (a1 - a0);
      c.beginPath();
      c.arc(rnd() * w, rnd() * h, r0 + rnd() * (r1 - r0), 0, 6.3);
      c.fill();
    }
    c.globalAlpha = 1;
  };
  // soft round stain; rgb is "r,g,b"
  const blot = (x, y, r, rgb, a, sy = 1) => {
    c.save();
    c.translate(x, y);
    c.scale(1, sy);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r, 0, 6.3);
    c.fill();
    c.restore();
  };
  const mottle = (w, h, n, list, r0, r1, a) => {
    for (let i = 0; i < n; i++)
      blot(
        rnd() * w,
        rnd() * h,
        r0 + rnd() * (r1 - r0),
        list[Math.floor(rnd() * list.length)],
        a * (0.5 + rnd() * 0.5),
      );
  };
  const line = (x0, y0, x1, y1, col, lw = 1) => {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  };
  const text = (s, x, y, size, col, o = {}) => {
    c.save();
    c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    c.font = `${o.weight || 900} ${size}px ${o.font || SERIF}`;
    c.textAlign = o.align || "center";
    c.textBaseline = "middle";
    if (o.maxW) {
      const tw = c.measureText(s).width;
      if (tw > o.maxW) c.scale(o.maxW / tw, 1);
    }
    if (o.stroke) {
      c.strokeStyle = o.stroke;
      c.lineWidth = o.lw || size * 0.1;
      c.lineJoin = "round";
      c.strokeText(s, 0, 0);
    }
    c.fillStyle = col;
    c.fillText(s, 0, 0);
    c.restore();
  };
  // general dirt: stains, specks and a darker lower edge
  const weather = (w, h, k = 1) => {
    mottle(w, h, 10 * k, ["40,34,24", "70,60,40"], w * 0.08, w * 0.3, 0.18);
    dots(w, h, 60 * k, "#2a2418", 0.4, 1.4, 0.1, 0.4);
    c.fillStyle = vgrad(
      h,
      0,
      "rgba(30,24,16,0)",
      0.7,
      "rgba(30,24,16,0)",
      1,
      "rgba(30,24,16,0.35)",
    );
    c.fillRect(0, 0, w, h);
  };

  // plain white: flat-coloured geometry points all its texture coordinates here and takes
  // its colour from the vertex tint alone
  tile("white", 56, 56, (w, h) => bg(w, h, "#fff"));

  // ---- skylight glass (unlit): wired glass at dusk, dirty, with rain running down it ----
  const pane = (w, h, k) => {
    bg(w, h, vgrad(h, 0, "#7f9cc0", 0.5, "#6a87ac", 1, "#506c92"));
    mottle(w, h, 26, ["40,56,60", "150,170,196", "58,70,58"], 20, 90, 0.3);
    // moss and dirt creeping in from the bars
    c.fillStyle = hgrad(
      w,
      0,
      "rgba(34,44,30,0.75)",
      0.12,
      "rgba(34,44,30,0)",
      0.88,
      "rgba(34,44,30,0)",
      1,
      "rgba(34,44,30,0.75)",
    );
    c.fillRect(0, 0, w, h);
    c.fillStyle = vgrad(
      h,
      0,
      "rgba(30,38,30,0.55)",
      0.1,
      "rgba(30,38,30,0)",
      0.7,
      "rgba(26,32,24,0)",
      1,
      "rgba(26,32,24,0.85)",
    );
    c.fillRect(0, 0, w, h);
    // wire mesh
    c.globalAlpha = 0.5;
    for (let i = -h; i < w + h; i += 14) {
      line(i, 0, i + h, h, "#1c2630", 1);
      line(i, h, i + h, 0, "#1c2630", 1);
    }
    c.globalAlpha = 1;
    // rain runs
    for (let i = 0; i < 26 + k * 6; i++) {
      let x = rnd() * w,
        y = rnd() * h * 0.5;
      const len = 30 + rnd() * (h - y - 30);
      c.strokeStyle = `rgba(214,230,250,${0.25 + rnd() * 0.4})`;
      c.lineWidth = 1 + rnd() * 2;
      c.beginPath();
      c.moveTo(x, y);
      for (let t = 0; t < len; t += 8) {
        x += (rnd() - 0.5) * 3;
        c.lineTo(x, y + t);
      }
      c.stroke();
      c.fillStyle = "rgba(230,240,255,0.7)";
      c.beginPath();
      c.arc(x, y + len, 1.5 + rnd() * 1.5, 0, 6.3);
      c.fill();
    }
    dots(w, h, 120, "#dfeaff", 0.6, 1.8, 0.2, 0.6);
  };
  for (let k = 0; k < 3; k++)
    tile("pane" + k, 232, 232, (w, h) => pane(w, h, k));
  // a broken pane: open sky through a ragged hole, shards left in the frame
  tile("paneBroken", 232, 232, (w, h) => {
    pane(w, h, 0);
    c.fillStyle = "#b9d2f2";
    c.beginPath();
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283,
        r = (i % 2 ? 0.2 : 0.44) * w * (0.75 + rnd() * 0.4);
      c.lineTo(w / 2 + Math.cos(a) * r * 1.05, h / 2 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(240,248,255,0.9)";
    c.lineWidth = 2;
    c.stroke();
    for (let i = 0; i < 9; i++) {
      const a = rnd() * 6.283;
      line(
        w / 2 + Math.cos(a) * w * 0.3,
        h / 2 + Math.sin(a) * h * 0.3,
        w / 2 + Math.cos(a) * w * 0.7,
        h / 2 + Math.sin(a) * h * 0.7,
        "rgba(230,240,255,0.55)",
        1,
      );
    }
  });

  // ---- aquarium water (unlit): murky green, bubble columns, weed and dim shapes ----
  for (let k = 0; k < 2; k++)
    tile("tank" + k, 320, 168, (w, h) => {
      bg(
        w,
        h,
        vgrad(h, 0, "#b9f5c2", 0.12, "#5fd49a", 0.6, "#1f8f6c", 1, "#0c4a3c"),
      );
      mottle(w, h, 30, ["10,60,50", "150,240,190", "30,110,70"], 16, 70, 0.3);
      // gravel
      c.fillStyle = "#0e2a24";
      c.fillRect(-PAD, h - 14, w + 2 * PAD, 30);
      dots(w, 12, 0, "#000", 1, 1);
      for (let i = 0; i < 160; i++) {
        c.fillStyle = ["#27463c", "#3d5a48", "#16302a"][i % 3];
        c.beginPath();
        c.arc(rnd() * w, h - 14 + rnd() * 12, 1.5 + rnd() * 2.5, 0, 6.3);
        c.fill();
      }
      // weed
      for (let i = 0; i < 7; i++) {
        let x = rnd() * w,
          y = h - 10;
        c.strokeStyle = `rgba(12,${70 + rnd() * 40},40,0.8)`;
        c.lineWidth = 2 + rnd() * 3;
        c.beginPath();
        c.moveTo(x, y);
        for (let t = 0; t < 5 + rnd() * 6; t++) {
          x += (rnd() - 0.5) * 12;
          y -= 9;
          c.lineTo(x, y);
        }
        c.stroke();
      }
      // far fish, out of focus
      for (let i = 0; i < 5 + k * 2; i++) {
        const x = 20 + rnd() * (w - 40),
          y = 30 + rnd() * (h - 70),
          l = 16 + rnd() * 22,
          d = rnd() < 0.5 ? 1 : -1;
        c.fillStyle = `rgba(8,40,34,${0.35 + rnd() * 0.3})`;
        c.beginPath();
        c.ellipse(x, y, l, l * 0.3, 0, 0, 6.3);
        c.fill();
        c.beginPath();
        c.moveTo(x - d * l * 0.8, y);
        c.lineTo(x - d * l * 1.4, y - l * 0.3);
        c.lineTo(x - d * l * 1.4, y + l * 0.3);
        c.fill();
      }
      // bubble columns from the air stones
      for (const bx of [w * (0.18 + k * 0.5), w * (0.82 - k * 0.5)]) {
        blot(bx, h * 0.5, 26, "220,255,235", 0.25, 3.2);
        for (let i = 0; i < 90; i++) {
          c.fillStyle = `rgba(235,255,245,${0.3 + rnd() * 0.6})`;
          c.beginPath();
          c.arc(
            bx + (rnd() - 0.5) * (10 + rnd() * 16),
            rnd() * (h - 16),
            0.8 + rnd() * 2.2,
            0,
            6.3,
          );
          c.fill();
        }
      }
      // waterline scum
      c.fillStyle = "rgba(225,255,235,0.75)";
      c.fillRect(-PAD, 9, w + 2 * PAD, 2);
      c.fillStyle = "rgba(12,50,40,0.5)";
      c.fillRect(-PAD, 11, w + 2 * PAD, 3);
    });

  // ---- stall boards ----
  for (const [key, [no, name, trade, en, ground, ink]] of Object.entries(
    STALLS,
  ))
    tile("sign_" + key, 400, 128, (w, h) => {
      bg(w, h, ground);
      c.fillStyle = vgrad(
        h,
        0,
        "rgba(255,255,255,0.14)",
        0.5,
        "rgba(255,255,255,0)",
        1,
        "rgba(0,0,0,0.16)",
      );
      c.fillRect(0, 0, w, h);
      c.strokeStyle = ink;
      c.lineWidth = 5;
      c.strokeRect(7, 7, w - 14, h - 14);
      c.lineWidth = 1.5;
      c.strokeRect(14, 14, w - 28, h - 28);
      // stall number in a roundel
      c.fillStyle = ink;
      c.beginPath();
      c.arc(56, h / 2 - 8, 30, 0, 6.3);
      c.fill();
      text(no, 56, h / 2 - 7, no.length > 1 ? 34 : 40, ground, { font: LATIN });
      text("檔", 56, h - 26, 20, ink, { font: KAI, weight: 700 });
      text(name + trade, w / 2 + 44, h / 2 - 10, 74, ink, { maxW: w - 130 });
      text(en, w / 2 + 44, h - 24, 17, ink, {
        font: LATIN,
        weight: 700,
        maxW: w - 130,
      });
      // rust weeping from the two hanging eyes
      for (const x of [w * 0.12, w * 0.88]) {
        blot(x, 4, 12, "110,60,24", 0.7, 3);
        c.fillStyle = "#2a2018";
        c.beginPath();
        c.arc(x, 9, 3, 0, 6.3);
        c.fill();
      }
      weather(w, h, 1.4);
    });

  // ---- notices, plates and other writing ----
  tile("rules", 256, 352, (w, h) => {
    bg(w, h, "#1d3f7a");
    c.strokeStyle = "#e9eef4";
    c.lineWidth = 3;
    c.strokeRect(8, 8, w - 16, h - 16);
    text("街市守則", w / 2, 42, 40, "#f1f4f8");
    line(24, 70, w - 24, 70, "#e9eef4", 2);
    const rows = [
      "一　場內不准吸煙",
      "二　不准隨地吐痰",
      "三　保持通道清潔暢通",
      "四　不得攜帶犬隻入內",
      "五　手推車不得阻塞出口",
      "六　活家禽不得帶離檔位",
      "七　營業時間 上午六時至下午八時",
    ];
    rows.forEach((r, i) =>
      text(r, 26, 98 + i * 31, 19, "#f1f4f8", {
        align: "left",
        maxW: w - 52,
        weight: 700,
        font: KAI,
      }),
    );
    text("金龍街市管理處", w / 2, h - 30, 18, "#ffe08a", {
      weight: 700,
      font: KAI,
    });
    for (const [x, y] of [
      [16, 16],
      [w - 16, 16],
      [16, h - 16],
      [w - 16, h - 16],
    ]) {
      blot(x, y + 6, 10, "120,70,30", 0.8, 2.5);
      c.fillStyle = "#8a8f94";
      c.beginPath();
      c.arc(x, y, 3.5, 0, 6.3);
      c.fill();
    }
    weather(w, h, 2);
  });
  tile("board", 320, 216, (w, h) => {
    // felt notice board with what was pinned up in the last days
    bg(w, h, "#2f5a44");
    dots(w, h, 900, "#24483a", 0.5, 1.2, 0.3, 0.8);
    const sheet = (x, y, sw, sh, col, rot, fn) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = "rgba(0,0,0,0.3)";
      c.fillRect(-sw / 2 + 2, -sh / 2 + 3, sw, sh);
      c.fillStyle = col;
      c.fillRect(-sw / 2, -sh / 2, sw, sh);
      fn(sw, sh);
      c.fillStyle = "#c22";
      c.beginPath();
      c.arc(0, -sh / 2 + 6, 3, 0, 6.3);
      c.fill();
      c.restore();
    };
    const scribble = (sw, sh, y0, n, col = "#333") => {
      for (let i = 0; i < n; i++)
        line(
          -sw / 2 + 8,
          y0 + i * 8,
          sw / 2 - 8 - rnd() * sw * 0.3,
          y0 + i * 8,
          col,
          1.5,
        );
    };
    sheet(62, 70, 96, 124, "#f1eee4", -0.04, (sw, sh) => {
      text("通告", 0, -sh / 2 + 24, 24, "#b3161a");
      scribble(sw, sh, -sh / 2 + 46, 8);
    });
    sheet(172, 66, 112, 110, "#f6e36a", 0.05, (sw, sh) => {
      text("檢疫令", 0, -sh / 2 + 26, 28, "#b3161a");
      text("本街市即日封閉", 0, -sh / 2 + 54, 14, "#1a1a1a", {
        weight: 700,
        font: KAI,
      });
      text("所有人士立即離開", 0, -sh / 2 + 72, 13, "#1a1a1a", {
        weight: 700,
        font: KAI,
      });
      scribble(sw, sh, -sh / 2 + 88, 2);
    });
    sheet(268, 78, 78, 104, "#f1eee4", 0.02, (sw, sh) => {
      text("尋人", 0, -sh / 2 + 20, 20, "#1a1a1a");
      c.fillStyle = "#7c7c78";
      c.fillRect(-22, -sh / 2 + 34, 44, 44);
      blot(0, -sh / 2 + 52, 12, "40,40,40", 0.8);
      scribble(sw, sh, sh / 2 - 20, 2);
    });
    sheet(120, 166, 120, 64, "#f3c9d6", -0.03, (sw, sh) => {
      text("租金調整通知", 0, -sh / 2 + 20, 15, "#1a1a1a", {
        weight: 700,
        font: KAI,
      });
      scribble(sw, sh, -sh / 2 + 34, 3);
    });
    sheet(244, 170, 88, 58, "#e6ecf0", 0.08, (sw, sh) => {
      text("滅鼠運動", 0, -sh / 2 + 20, 16, "#1d4f8a", {
        weight: 700,
        font: KAI,
      });
      scribble(sw, sh, -sh / 2 + 34, 2, "#1d4f8a");
    });
    weather(w, h, 1);
  });
  tile("menu", 168, 232, (w, h) => {
    // chalked price list
    bg(w, h, "#16201c");
    mottle(w, h, 24, ["200,200,190"], 14, 50, 0.07);
    text("是日價錢", w / 2, 26, 24, "#f3e9a8", { font: KAI, weight: 700 });
    line(16, 44, w - 16, 44, "rgba(240,240,230,0.6)", 2);
    const rows = [
      ["板豆腐", "$4"],
      ["滑豆腐", "$5"],
      ["豆漿", "$6"],
      ["豆花", "$8"],
      ["油麵", "$10"],
      ["河粉", "$9"],
      ["雲吞皮", "$12"],
    ];
    rows.forEach(([a, b], i) => {
      text(a, 18, 68 + i * 24, 19, "rgba(240,240,232,0.92)", {
        font: KAI,
        weight: 700,
        align: "left",
      });
      text(b, w - 18, 68 + i * 24, 19, "rgba(255,180,170,0.95)", {
        font: KAI,
        weight: 700,
        align: "right",
      });
    });
  });
  for (let k = 0; k < 3; k++)
    tile("licence" + k, 116, 84, (w, h) => {
      bg(w, h, "#efe9d6");
      c.fillStyle = "#1f6a3a";
      c.fillRect(-PAD, -PAD, w + 2 * PAD, 26 + PAD);
      text("持牌檔位", w / 2, 13, 17, "#f4f1e2", { font: KAI, weight: 700 });
      text(
        ["甲", "乙", "丙"][k] + " " + (104 + k * 37),
        w / 2,
        46,
        22,
        "#1a1a1a",
        { font: LATIN },
      );
      line(12, 64, w - 12, 64, "#555", 1);
      line(12, 72, w - 40, 72, "#555", 1);
      weather(w, h, 0.6);
    });
  tile("clock", 168, 168, (w, h) => {
    // stopped at the hour the market emptied
    bg(w, h, "#e9e6da");
    const m = w / 2;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 6.283,
        r0 = i % 5 ? 70 : 62;
      line(
        m + Math.sin(a) * r0,
        m - Math.cos(a) * r0,
        m + Math.sin(a) * 76,
        m - Math.cos(a) * 76,
        "#1a1a1a",
        i % 5 ? 1 : 3.5,
      );
    }
    for (const [n, a] of [
      ["12", 0],
      ["3", 1.5708],
      ["6", 3.1416],
      ["9", 4.7124],
    ])
      text(n, m + Math.sin(a) * 48, m - Math.cos(a) * 48, 22, "#1a1a1a", {
        font: LATIN,
      });
    const hand = (a, len, lw, col) =>
      line(
        m - Math.sin(a) * 8,
        m + Math.cos(a) * 8,
        m + Math.sin(a) * len,
        m - Math.cos(a) * len,
        col,
        lw,
      );
    hand(((6 + 42 / 60) / 12) * 6.283, 40, 6, "#1a1a1a");
    hand((42 / 60) * 6.283, 62, 4, "#1a1a1a");
    hand((17 / 60) * 6.283, 66, 1.5, "#b3161a");
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(m, m, 5, 0, 6.3);
    c.fill();
    // cracked glass
    for (let i = 0; i < 5; i++) {
      const a = rnd() * 6.283;
      line(
        m + 30,
        m - 34,
        m + 30 + Math.cos(a) * 60,
        m - 34 + Math.sin(a) * 60,
        "rgba(255,255,255,0.8)",
        1,
      );
    }
    weather(w, h, 0.8);
  });
  tile("dial", 96, 96, (w, h) => {
    // face of a spring scale
    bg(w, h, "#ece8d8");
    const m = w / 2;
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * 6.283;
      line(
        m + Math.sin(a) * (i % 5 ? 38 : 33),
        m - Math.cos(a) * (i % 5 ? 38 : 33),
        m + Math.sin(a) * 42,
        m - Math.cos(a) * 42,
        "#1a1a1a",
        i % 5 ? 1 : 2,
      );
    }
    text("斤", m, m + 18, 15, "#b3161a", { font: KAI, weight: 700 });
    line(m, m, m + 22, m - 26, "#b3161a", 2.5);
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(m, m, 4, 0, 6.3);
    c.fill();
    weather(w, h, 0.5);
  });
  tile("danger", 72, 72, (w, h) => {
    bg(w, h, "#f2c81e");
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w / 2, 6);
    c.lineTo(w - 10, 44);
    c.lineTo(10, 44);
    c.closePath();
    c.stroke();
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.moveTo(w / 2 + 3, 14);
    c.lineTo(w / 2 - 6, 30);
    c.lineTo(w / 2, 30);
    c.lineTo(w / 2 - 4, 40);
    c.lineTo(w / 2 + 7, 24);
    c.lineTo(w / 2 + 1, 24);
    c.closePath();
    c.fill();
    text("危險", w / 2, 58, 18, "#1a1a1a");
  });
  tile("exit", 136, 56, (w, h) => {
    bg(w, h, "#0c7a3c");
    text("出口", 44, h / 2, 34, "#f4fff6");
    text("EXIT", 104, h / 2 + 1, 24, "#f4fff6", { font: LATIN });
  });
  tile("fire", 96, 128, (w, h) => {
    bg(w, h, "#b3161a");
    c.strokeStyle = "#f4f1e2";
    c.lineWidth = 3;
    c.strokeRect(6, 6, w - 12, h - 12);
    [..."消防喉轆"].forEach((ch, i) =>
      text(ch, w / 2, 24 + i * 27, 24, "#f4f1e2"),
    );
    weather(w, h, 1);
  });
  tile("calendar", 96, 128, (w, h) => {
    bg(w, h, "#f1eee4");
    c.fillStyle = "#b3161a";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, 28 + PAD);
    text("十一月", w / 2, 14, 18, "#f4f1e2", { font: KAI, weight: 700 });
    text("11", w / 2, 68, 62, "#b3161a", { font: LATIN });
    text("星期三　宜祭祀", w / 2, 112, 11, "#1a1a1a", {
      font: KAI,
      weight: 700,
    });
    weather(w, h, 0.5);
  });
  tile("banner", 56, 200, (w, h) => {
    // red paper couplet
    bg(w, h, "#b3161a");
    dots(w, h, 40, "#e6c15a", 0.6, 1.4, 0.4, 0.9);
    [..."生意興隆"].forEach((ch, i) =>
      text(ch, w / 2, 28 + i * 48, 38, "#f3d98a", { font: KAI, weight: 700 }),
    );
    weather(w, h, 0.5);
  });
  tile("mat", 200, 120, (w, h) => {
    bg(w, h, "#5a1c18");
    for (let x = 0; x < w; x += 6) line(x, 0, x, h, "rgba(20,8,6,0.5)", 2);
    c.strokeStyle = "#c79a3a";
    c.lineWidth = 4;
    c.strokeRect(10, 10, w - 20, h - 20);
    text("出入平安", w / 2, h / 2, 40, "#d9b04a");
    mottle(w, h, 24, ["20,16,12"], 14, 46, 0.5);
    weather(w, h, 2);
  });
  // price cards
  for (const [key, goods, price, paper] of CARDS)
    tile("card_" + key, 104, 72, (w, h) => {
      bg(w, h, paper);
      const ink = rnd() < 0.5 ? "#b3161a" : rnd() < 0.5 ? "#16191c" : "#1d3f8a";
      const rot = (rnd() - 0.5) * 0.12;
      text(goods, w / 2, 20, 24, "#16191c", {
        font: KAI,
        weight: 700,
        rot,
        maxW: w - 10,
      });
      text(price, w / 2, 50, 30, ink, {
        font: KAI,
        weight: 700,
        rot,
        maxW: w - 8,
      });
      weather(w, h, 0.4);
    });
  tile("label", 64, 64, (w, h) => {
    bg(w, h, "#b3161a");
    c.strokeStyle = "#f3d98a";
    c.lineWidth = 3;
    c.strokeRect(4, 4, w - 8, h - 8);
    text("醬", w / 2, h / 2 + 1, 40, "#f3d98a");
  });

  // ---- cloth, card, timber ----
  tile("tarp", 256, 256, (w, h) => {
    // red-white-blue woven sheeting
    bg(w, h, "#f1f1ec");
    const bands = [
      [0, 0.3, "#1c4fa8"],
      [0.38, 0.62, "#c4222a"],
      [0.7, 1, "#1c4fa8"],
    ];
    for (const [a, b, col] of bands) {
      c.fillStyle = col;
      c.fillRect(
        a * w - (a === 0 ? PAD : 0),
        -PAD,
        (b - a) * w + (a === 0 || b === 1 ? PAD : 0),
        h + 2 * PAD,
      );
    }
    for (const x of [0.33, 0.35, 0.65, 0.67])
      line(x * w, -PAD, x * w, h + PAD, "#1c4fa8", 1.5);
    c.globalAlpha = 0.16;
    for (let i = 0; i < w; i += 3) {
      line(i, -PAD, i, h + PAD, "#000", 1);
      line(-PAD, i, w + PAD, i, "#fff", 1);
    }
    c.globalAlpha = 1;
    mottle(w, h, 26, ["50,44,30", "20,20,20", "230,230,220"], 14, 70, 0.22);
    for (let i = 1; i < 4; i++)
      line(
        -PAD,
        (i * h) / 4 + rnd() * 6,
        w + PAD,
        (i * h) / 4 + rnd() * 6,
        "rgba(255,255,255,0.25)",
        2,
      );
  });
  tile("canvas", 128, 128, (w, h) => {
    bg(w, h, "#e9e6dc");
    c.globalAlpha = 0.12;
    for (let i = 0; i < w; i += 2) {
      line(i, -PAD, i, h + PAD, "#000", 1);
      line(-PAD, i, w + PAD, i, "#000", 1);
    }
    c.globalAlpha = 1;
    mottle(w, h, 18, ["60,54,40", "110,100,80"], 10, 44, 0.28);
    for (let i = 0; i < 5; i++) {
      const x = rnd() * w;
      c.fillStyle = "rgba(50,44,30,0.22)";
      c.fillRect(x, 0, 3 + rnd() * 8, h * (0.3 + rnd() * 0.7));
    }
  });
  tile("folds", 64, 128, (w, h) => {
    // hanging plastic and cloth: vertical creases on white, tinted where it is used
    bg(w, h, "#f4f4f0");
    for (let i = 0; i < 16; i++) {
      const x = rnd() * w;
      c.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${0.12 + rnd() * 0.2})`;
      c.fillRect(x, -PAD, 1 + rnd() * 4, h + 2 * PAD);
    }
    c.fillStyle = vgrad(
      h,
      0,
      "rgba(0,0,0,0.3)",
      0.15,
      "rgba(0,0,0,0)",
      1,
      "rgba(0,0,0,0.12)",
    );
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
  });
  tile("cardboard", 192, 192, (w, h) => {
    bg(w, h, "#a8834f");
    c.globalAlpha = 0.13;
    for (let x = 0; x < w; x += 4) line(x, -PAD, x, h + PAD, "#3a2812", 1);
    c.globalAlpha = 1;
    mottle(w, h, 14, ["60,40,20", "200,170,120"], 16, 60, 0.22);
    c.fillStyle = "rgba(206,180,120,0.85)";
    c.fillRect(-PAD, h * 0.44, w + 2 * PAD, h * 0.12);
    text("鮮果", 52, 42, 34, "rgba(150,24,20,0.85)");
    text("FRESH PRODUCE", 128, 150, 15, "rgba(40,30,20,0.8)", { font: LATIN });
    c.strokeStyle = "rgba(40,30,20,0.8)";
    c.lineWidth = 3;
    for (const x of [136, 162]) {
      c.beginPath();
      c.moveTo(x, 56);
      c.lineTo(x, 20);
      c.moveTo(x - 8, 30);
      c.lineTo(x, 20);
      c.lineTo(x + 8, 30);
      c.stroke();
    }
    blot(30, 160, 40, "50,34,18", 0.5);
  });
  tile("foam", 128, 128, (w, h) => {
    bg(w, h, "#eceee9");
    dots(w, h, 1400, "#c9cdc6", 0.8, 1.6, 0.25, 0.7);
    dots(w, h, 500, "#ffffff", 0.8, 1.6, 0.5, 1);
    c.fillStyle = "rgba(190,160,90,0.7)";
    c.fillRect(-PAD, 56, w + 2 * PAD, 14);
    text("魚 12", 64, 28, 26, "rgba(26,60,140,0.85)", {
      font: KAI,
      weight: 700,
      rot: -0.06,
    });
    text("冰鮮", 62, 100, 28, "rgba(170,24,20,0.8)", {
      font: KAI,
      weight: 700,
      rot: 0.04,
    });
    mottle(w, h, 8, ["90,80,60", "120,40,36"], 8, 30, 0.25);
  });
  tile("sack", 160, 200, (w, h) => {
    // woven polypropylene rice sack
    bg(w, h, "#e6e2d2");
    c.globalAlpha = 0.14;
    for (let i = 0; i < h; i += 3) line(-PAD, i, w + PAD, i, "#000", 1);
    for (let i = 0; i < w; i += 3) line(i, -PAD, i, h + PAD, "#fff", 1);
    c.globalAlpha = 1;
    for (const y of [40, 48, 158, 166]) {
      c.fillStyle = "#1f6a3a";
      c.fillRect(-PAD, y, w + 2 * PAD, 4);
    }
    c.fillStyle = "#b3161a";
    c.beginPath();
    c.arc(w / 2, 104, 42, 0, 6.3);
    c.fill();
    text("米", w / 2, 106, 58, "#f1ead6");
    text("泰國香米 25KG", w / 2, 180, 14, "#1a1a1a", {
      font: KAI,
      weight: 700,
    });
    mottle(w, h, 12, ["80,70,50"], 14, 50, 0.22);
  });
  tile("woodEnd", 136, 136, (w, h) => {
    // end grain of a chopping block, hacked and stained
    bg(w, h, "#b08a56");
    for (let r = 4; r < 100; r += 3 + rnd() * 3) {
      c.strokeStyle = `rgba(${90 + rnd() * 40},${60 + rnd() * 20},30,0.55)`;
      c.lineWidth = 1 + rnd() * 1.5;
      c.beginPath();
      c.ellipse(w / 2 + 6, h / 2 - 4, r, r * 0.94, 0.3, 0, 6.3);
      c.stroke();
    }
    blot(w / 2, h / 2, 54, "90,24,18", 0.55);
    blot(w * 0.6, h * 0.4, 30, "60,14,10", 0.5);
    for (let i = 0; i < 70; i++) {
      const x = w * 0.2 + rnd() * w * 0.6,
        y = h * 0.2 + rnd() * h * 0.6,
        a = rnd() * 3.14,
        l = 6 + rnd() * 18;
      line(
        x,
        y,
        x + Math.cos(a) * l,
        y + Math.sin(a) * l,
        rnd() < 0.5 ? "rgba(40,20,10,0.6)" : "rgba(230,200,150,0.5)",
        1,
      );
    }
  });
  tile("crate", 128, 80, (w, h) => {
    // moulded plastic crate, white so the tint colours it: rim strip (top), slotted side, dark
    // inside (bottom strip)
    bg(w, h, "#f2f2f2");
    c.fillStyle = "#4c4c4c";
    c.fillRect(-PAD, h - 9, w + 2 * PAD, 9 + PAD);
    c.fillStyle = "#ffffff";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, 8 + PAD);
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 9; i++) {
        c.fillStyle = "rgba(10,10,10,0.82)";
        c.fillRect(8 + i * 13, 20 + row * 16, 8, 10);
      }
    c.fillStyle = "rgba(0,0,0,0.25)";
    c.fillRect(0, 11, w, 3);
    c.fillRect(0, 66, w, 3);
    c.fillStyle = "rgba(10,10,10,0.85)";
    c.fillRect(w / 2 - 16, 12, 32, 6);
    mottle(w, 60, 10, ["60,50,40"], 8, 30, 0.2);
  });
  tile("wicker", 128, 64, (w, h) => {
    bg(w, h, "#b9925a");
    for (let y = 0; y < h; y += 5)
      for (let x = (y / 5) % 2 ? -5 : 0; x < w; x += 10) {
        c.fillStyle = `rgb(${150 + rnd() * 50},${110 + rnd() * 40},${60 + rnd() * 20})`;
        c.fillRect(x, y, 9, 4);
        c.fillStyle = "rgba(40,24,10,0.5)";
        c.fillRect(x + 9, y, 1, 5);
      }
    c.fillStyle = vgrad(
      h,
      0,
      "rgba(40,24,10,0.5)",
      0.15,
      "rgba(40,24,10,0)",
      0.85,
      "rgba(40,24,10,0)",
      1,
      "rgba(40,24,10,0.5)",
    );
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
  });
  tile("stack", 64, 64, (w, h) => {
    // a pile seen edge-on (egg trays, steamers, folded sacks); tinted in use
    bg(w, h, "#e8e6e0");
    for (let y = 0; y < h; y += 6) {
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(-PAD, y, w + 2 * PAD, 1.5);
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.fillRect(-PAD, y + 2, w + 2 * PAD, 1);
    }
    mottle(w, h, 8, ["60,50,40"], 6, 20, 0.2);
  });
  tile("tartan", 96, 96, (w, h) => {
    // the plaid nylon of a shopping trolley bag
    bg(w, h, "#7a1c22");
    for (let i = 0; i < w; i += 24) {
      c.fillStyle = "rgba(16,30,70,0.7)";
      c.fillRect(i, -PAD, 9, h + 2 * PAD);
      c.fillRect(-PAD, i, w + 2 * PAD, 9);
      c.fillStyle = "rgba(240,230,200,0.7)";
      c.fillRect(i + 15, -PAD, 2, h + 2 * PAD);
      c.fillRect(-PAD, i + 15, w + 2 * PAD, 2);
    }
  });

  // ---- ice, fish, meat ----
  tile("ice", 200, 200, (w, h) => {
    bg(w, h, "#d9eaf2");
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w,
        y = rnd() * h,
        r = 2 + rnd() * 6,
        k = rnd();
      c.fillStyle =
        k < 0.4
          ? "rgba(255,255,255,0.8)"
          : k < 0.75
            ? "rgba(150,190,212,0.6)"
            : "rgba(100,150,180,0.45)";
      c.beginPath();
      const a0 = rnd() * 6.283;
      for (let j = 0; j < 4; j++)
        c.lineTo(
          x + Math.cos(a0 + j * 1.7) * r,
          y + Math.sin(a0 + j * 1.7) * r * 0.8,
        );
      c.fill();
    }
    mottle(w, h, 7, ["200,90,90"], 16, 40, 0.16);
    dots(w, h, 260, "#ffffff", 0.5, 1.4, 0.6, 1);
  });
  // u runs nose to tail, v from the back (top) round to the belly (bottom); both flanks share it
  const fish = (name, back, flank, belly, fin, o = {}) =>
    tile("fish_" + name, 256, 96, (w, h) => {
      bg(
        w,
        h,
        vgrad(h, 0, back, 0.26, back, 0.5, flank, 0.78, belly, 1, belly),
      );
      if (o.spots) {
        dots(w * 0.84, h * 0.8, 150, o.spots, 2, 5, 0.5, 0.9);
        dots(w * 0.84, h * 0.8, 60, "#000", 1, 2.5, 0.2, 0.4);
      }
      if (o.bars)
        for (let x = 46; x < 210; x += 10) {
          c.strokeStyle = o.bars;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(x, 4);
          c.quadraticCurveTo(x + 8, h * 0.2, x + 1, h * 0.42);
          c.stroke();
        }
      if (o.stripe) {
        c.fillStyle = o.stripe;
        c.fillRect(40, h * 0.44, 176, 5);
      }
      // scales
      for (let y = 5, row = 0; y < h - 4; y += 7, row++)
        for (let x = 52 + (row % 2) * 4; x < 212; x += 8) {
          c.strokeStyle = "rgba(10,20,30,0.2)";
          c.lineWidth = 1;
          c.beginPath();
          c.arc(x, y, 5, -1.2, 1.2);
          c.stroke();
          c.strokeStyle = "rgba(255,255,255,0.2)";
          c.beginPath();
          c.arc(x - 1.5, y, 5, -1.0, 1.0);
          c.stroke();
        }
      // head: gill cover, eye, mouth
      c.fillStyle = "rgba(0,0,0,0.1)";
      c.fillRect(-PAD, -PAD, 48 + PAD, h + 2 * PAD);
      c.strokeStyle = "rgba(20,10,10,0.6)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(28, h * 0.52, 22, -1.15, 1.15);
      c.stroke();
      c.fillStyle = o.eye || "#d8dcd2";
      c.beginPath();
      c.arc(21, h * 0.4, 9, 0, 6.3);
      c.fill();
      c.fillStyle = "#0a0a0c";
      c.beginPath();
      c.arc(21, h * 0.4, 5.5, 0, 6.3);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.8)";
      c.beginPath();
      c.arc(19, h * 0.37, 1.6, 0, 6.3);
      c.fill();
      line(0, h * 0.6, 12, h * 0.56, "rgba(20,10,10,0.7)", 2);
      // tail and fins: rays on a translucent web
      c.fillStyle = fin;
      c.fillRect(214, -PAD, 42 + PAD, h + 2 * PAD);
      for (let i = 0; i < 16; i++)
        line(214, h * 0.5, 256 + PAD, (i / 15) * h, "rgba(20,16,16,0.35)", 1);
      c.fillStyle = hgrad(
        w,
        0.8,
        "rgba(0,0,0,0)",
        0.86,
        "rgba(0,0,0,0.25)",
        0.9,
        "rgba(0,0,0,0)",
      );
      c.fillRect(0, 0, w, h);
    });
  fish("mullet", "#3f4c54", "#aeb9bc", "#e9ecea", "#5a6468", {
    stripe: "rgba(60,70,76,0.3)",
  });
  fish("snapper", "#a8281e", "#e06a50", "#f3d2c2", "#c8402c", {
    eye: "#f0c040",
  });
  fish("croaker", "#8a7a3a", "#e3c452", "#f6e9a8", "#d8a82a", {
    eye: "#f3e7b0",
  });
  fish("grouper", "#4a3524", "#7a5a3a", "#b89a72", "#4a3524", {
    spots: "#2c1c10",
  });
  fish("pomfret", "#7a858c", "#cfd6d8", "#f1f3f1", "#8a949a");
  fish("mackerel", "#1f4a5a", "#9fb8bc", "#eef0ec", "#3a5a62", {
    bars: "rgba(10,30,40,0.7)",
  });
  tile("squid", 96, 96, (w, h) => {
    bg(w, h, vgrad(h, 0, "#e9d2cf", 1, "#f4ecea"));
    dots(w, h, 700, "#7a2a3a", 0.5, 1.4, 0.3, 0.8);
    mottle(w, h, 8, ["150,70,90"], 10, 30, 0.25);
  });
  tile("marble", 200, 200, (w, h) => {
    // red meat with fat running through it
    bg(w, h, "#8c1f1c");
    mottle(w, h, 60, ["110,20,16", "176,50,42", "70,10,10"], 10, 40, 0.5);
    for (let i = 0; i < 46; i++) {
      let x = rnd() * w,
        y = rnd() * h,
        a = rnd() * 6.283;
      c.strokeStyle = `rgba(240,224,204,${0.5 + rnd() * 0.45})`;
      c.lineWidth = 1 + rnd() * 4;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x, y);
      for (let t = 0; t < 4 + rnd() * 6; t++) {
        a += (rnd() - 0.5) * 1.2;
        x += Math.cos(a) * 10;
        y += Math.sin(a) * 10;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    dots(w, h, 200, "#f0d8c8", 0.5, 1.5, 0.3, 0.7);
  });
  tile("belly", 128, 128, (w, h) => {
    // pork belly seen on the cut: skin, fat and lean in layers
    const layers = [
      [0, "#d9b48c"],
      [0.07, "#f3e6d2"],
      [0.26, "#a52c26"],
      [0.4, "#f1e2cc"],
      [0.5, "#9a2622"],
      [0.72, "#eedcc6"],
      [0.8, "#8c201c"],
      [1.1, "#8c201c"],
    ];
    bg(w, h, "#8c201c");
    for (let i = 0; i < layers.length - 1; i++) {
      c.fillStyle = layers[i][1];
      c.beginPath();
      c.moveTo(-PAD, h + PAD);
      for (let x = -PAD; x <= w + PAD; x += 8)
        c.lineTo(
          x,
          layers[i][0] * h +
            Math.sin(x * 0.07 + i * 2) * 4 +
            (rnd() - 0.5) * 3 -
            (i === 0 ? PAD : 0),
        );
      c.lineTo(w + PAD, h + PAD);
      c.fill();
    }
    mottle(w, h, 20, ["120,20,18", "250,240,225"], 6, 22, 0.25);
  });
  tile("ribs", 200, 104, (w, h) => {
    bg(w, h, "#7e1f1a");
    for (let x = 6; x < w; x += 22) {
      c.fillStyle = hgrad(
        22,
        0,
        "rgba(150,96,80,0.75)",
        0.5,
        "rgba(206,170,146,0.85)",
        1,
        "rgba(140,88,74,0.75)",
      );
      c.save();
      c.translate(x, 0);
      c.fillRect(0, -PAD, 7, h + 2 * PAD);
      c.restore();
    }
    mottle(w, h, 50, ["130,30,24", "70,12,10", "176,60,50"], 6, 24, 0.4);
    c.fillStyle = vgrad(
      h,
      0,
      "rgba(226,204,180,0.6)",
      0.1,
      "rgba(226,204,180,0)",
      0.92,
      "rgba(226,204,180,0)",
      1,
      "rgba(226,204,180,0.5)",
    );
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
  });
  tile("leg", 104, 200, (w, h) => {
    // a hanging leg: sawn bone at the top, a strip of rind down one side, lean below
    bg(w, h, "#8e211d");
    mottle(w, h, 40, ["120,24,20", "176,56,46", "70,10,10"], 8, 30, 0.5);
    for (let i = 0; i < 16; i++) {
      const x = rnd() * w;
      c.strokeStyle = `rgba(240,224,204,${0.4 + rnd() * 0.4})`;
      c.lineWidth = 1 + rnd() * 3;
      c.beginPath();
      c.moveTo(x, 30 + rnd() * 40);
      c.bezierCurveTo(x + 10, 80, x - 12, 130, x + (rnd() - 0.5) * 20, h);
      c.stroke();
    }
    c.fillStyle = hgrad(
      w,
      0,
      "#e3c4a4",
      0.3,
      "#e9cfb2",
      0.42,
      "rgba(233,207,178,0)",
    );
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
    c.fillStyle = vgrad(
      h,
      0,
      "#ecdcc0",
      0.1,
      "#d9c4a4",
      0.16,
      "rgba(217,196,164,0)",
    );
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
    c.fillStyle = vgrad(h, 0.9, "rgba(60,8,8,0)", 1, "rgba(60,8,8,0.7)");
    c.fillRect(-PAD, -PAD, w + 2 * PAD, h + 2 * PAD);
  });
  tile("poultry", 128, 128, (w, h) => {
    // plucked skin
    bg(w, h, vgrad(h, 0, "#e6c98e", 0.5, "#efd9a6", 1, "#e2bf86"));
    dots(w, h, 900, "#c9a468", 0.6, 1.3, 0.3, 0.8);
    dots(w, h, 400, "#f8ecc8", 0.5, 1.0, 0.4, 0.9);
    mottle(w, h, 14, ["210,130,110", "150,90,60"], 8, 30, 0.25);
  });

  // ---- produce: the top of the tile is the stalk end, the sides wrap round the fruit ----
  const T = 120;
  tile("citrus", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#e4dfd6", 0.5, "#ffffff", 1, "#ece6dc"));
    dots(w, h, 600, "#bdb3a2", 0.6, 1.3, 0.25, 0.6);
    dots(w, h, 240, "#ffffff", 0.5, 1.0, 0.5, 0.9);
    c.fillStyle = "#56653a";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, PAD + 5);
    c.fillStyle = "rgba(120,120,80,0.5)";
    c.fillRect(-PAD, 5, w + 2 * PAD, 4);
  });
  tile("smooth", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#f0eee8", 0.5, "#ffffff", 1, "#e6e2da"));
    mottle(w, h, 30, ["120,110,100", "255,255,255"], 5, 18, 0.14);
    dots(w, h, 120, "#8a8072", 0.4, 0.9, 0.15, 0.4);
  });
  tile("grain", T, T, (w, h) => {
    // a heap of something small (beans, rice, dried shrimp, clams): tinted in use
    bg(w, h, "#b9b6ae");
    for (let i = 0; i < 2600; i++) {
      const k = 150 + rnd() * 105;
      c.fillStyle = `rgb(${k},${k},${k * 0.97})`;
      c.beginPath();
      c.ellipse(
        rnd() * w,
        rnd() * h,
        1.5 + rnd() * 2,
        1 + rnd() * 1.2,
        rnd() * 3.14,
        0,
        6.3,
      );
      c.fill();
    }
    dots(w, h, 300, "#3a362e", 0.5, 1.2, 0.3, 0.7);
  });
  tile("apple", T, T, (w, h) => {
    bg(
      w,
      h,
      vgrad(h, 0, "#6e1410", 0.14, "#b3221b", 0.6, "#c42c20", 1, "#86180f"),
    );
    for (let i = 0; i < 180; i++) {
      const x = rnd() * w;
      line(
        x,
        h * (0.05 + rnd() * 0.3),
        x + (rnd() - 0.5) * 8,
        h * (0.5 + rnd() * 0.5),
        rnd() < 0.5 ? "rgba(236,196,96,0.3)" : "rgba(110,12,10,0.4)",
        1 + rnd() * 1.5,
      );
    }
    blot(w * 0.5, h * 0.42, 40, "222,204,96", 0.75);
    dots(w, h, 160, "#f0dca0", 0.4, 0.9, 0.3, 0.7);
    c.fillStyle = "#3e3018";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, PAD + 5);
  });
  tile("pear", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#b89a44", 0.2, "#d9c36a", 1, "#c9ab52"));
    dots(w, h, 700, "#8a6a2c", 0.5, 1.1, 0.4, 0.8);
    mottle(w, h, 10, ["150,110,50"], 8, 26, 0.25);
    c.fillStyle = "#4a3418";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, PAD + 4);
  });
  tile("tomato", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#a81c12", 0.4, "#de3724", 1, "#b8241a"));
    mottle(w, h, 12, ["240,120,60"], 8, 26, 0.2);
    c.fillStyle = "#35622a";
    c.beginPath();
    c.moveTo(-PAD, -PAD);
    for (let x = -PAD; x <= w + PAD; x += 10) {
      c.lineTo(x, 6);
      c.lineTo(x + 5, 22);
    }
    c.lineTo(w + PAD, -PAD);
    c.fill();
  });
  tile("melon", T, T, (w, h) => {
    bg(w, h, "#1d4a22");
    for (let i = 0; i < 8; i++) {
      const x0 = (i + 0.5) * (w / 8);
      c.fillStyle = "#6a9a4e";
      c.beginPath();
      c.moveTo(x0, -PAD);
      for (let y = 0; y <= h; y += 6)
        c.lineTo(x0 + 2 + rnd() * 5 + Math.sin(y * 0.3) * 2, y);
      for (let y = h; y >= 0; y -= 6)
        c.lineTo(x0 - 2 - rnd() * 5 + Math.sin(y * 0.3) * 2, y);
      c.fill();
    }
    mottle(w, h, 20, ["10,40,14", "140,180,110"], 6, 20, 0.2);
  });
  tile("dragon", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#b0164e", 0.5, "#d81b60", 1, "#a8124a"));
    for (let row = 0; row < 5; row++)
      for (let i = 0; i < 6; i++) {
        const x = (i + (row % 2) * 0.5) * (w / 6),
          y = 18 + row * 22;
        const g = c.createLinearGradient(0, y + 12, 0, y - 14);
        g.addColorStop(0, "#c2185b");
        g.addColorStop(1, "#9bc53d");
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x - 9, y + 12);
        c.lineTo(x, y - 14);
        c.lineTo(x + 9, y + 12);
        c.fill();
      }
    c.fillStyle = "#7a9a34";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, PAD + 5);
  });
  tile("netted", T, T, (w, h) => {
    bg(w, h, "#c4a468");
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w,
        y = rnd() * h,
        a = rnd() * 6.283,
        l = 6 + rnd() * 12;
      line(
        x,
        y,
        x + Math.cos(a) * l,
        y + Math.sin(a) * l,
        "rgba(236,222,180,0.7)",
        1.2,
      );
    }
    mottle(w, h, 10, ["120,130,70"], 10, 30, 0.2);
  });
  tile("root", T, T, (w, h) => {
    bg(
      w,
      h,
      vgrad(h, 0, "#9db36a", 0.1, "#e9ecd6", 0.2, "#f6f4ea", 1, "#f1eee2"),
    );
    for (let i = 0; i < 40; i++) {
      const y = h * 0.15 + rnd() * h * 0.85,
        x = rnd() * w;
      line(x, y, x + 6 + rnd() * 16, y, "rgba(150,140,110,0.5)", 1);
    }
    mottle(w, h, 10, ["120,100,70"], 6, 20, 0.14);
  });
  tile("leafy", T, T, (w, h) => {
    // a head of bok choy: white stalks below, dark leaves above
    bg(
      w,
      h,
      vgrad(
        h,
        0,
        "#1f4f20",
        0.4,
        "#2f6b2a",
        0.58,
        "#b9cf9a",
        0.7,
        "#eef0e0",
        1,
        "#f4f4ea",
      ),
    );
    for (let i = 0; i < 60; i++) {
      const x = rnd() * w;
      line(
        x,
        h * 0.62,
        x + (rnd() - 0.5) * 14,
        h * (0.05 + rnd() * 0.3),
        "rgba(210,230,180,0.5)",
        1,
      );
      line(x, h, x + (rnd() - 0.5) * 3, h * 0.62, "rgba(160,170,140,0.5)", 1.5);
    }
    mottle(w, h * 0.5, 26, ["12,50,14", "70,130,50"], 6, 18, 0.35);
  });
  tile("cabbage", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#a9c47a", 0.5, "#c4d89a", 1, "#8fb060"));
    for (let i = 0; i < 26; i++) {
      let x = rnd() * w,
        y = h;
      c.strokeStyle = "rgba(236,244,214,0.75)";
      c.lineWidth = 1 + rnd() * 2;
      c.beginPath();
      c.moveTo(x, y);
      for (let t = 0; t < 8; t++) {
        x += (rnd() - 0.5) * 16;
        y -= h / 8;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    mottle(w, h, 20, ["70,110,40", "220,236,180"], 8, 24, 0.25);
  });
  tile("eggplant", T, T, (w, h) => {
    bg(
      w,
      h,
      vgrad(
        h,
        0,
        "#3f6a2c",
        0.1,
        "#4a7a34",
        0.14,
        "#4a1c58",
        0.6,
        "#3a1446",
        1,
        "#2a0e34",
      ),
    );
    c.fillStyle = hgrad(
      w,
      0.3,
      "rgba(255,255,255,0)",
      0.4,
      "rgba(230,200,255,0.3)",
      0.5,
      "rgba(255,255,255,0)",
    );
    c.fillRect(0, h * 0.14, w, h);
    c.fillStyle = "#3f6a2c";
    for (let x = -PAD; x < w + PAD; x += 14) {
      c.beginPath();
      c.moveTo(x, 10);
      c.lineTo(x + 7, 28);
      c.lineTo(x + 14, 10);
      c.fill();
    }
  });
  tile("bitter", T, T, (w, h) => {
    bg(w, h, "#7cab48");
    for (let x = 0; x < w; x += 10) {
      c.fillStyle = "rgba(40,80,20,0.5)";
      c.fillRect(x, -PAD, 3, h + 2 * PAD);
      c.fillStyle = "rgba(200,230,150,0.5)";
      c.fillRect(x + 5, -PAD, 3, h + 2 * PAD);
    }
    dots(w, h, 500, "#b9dc8a", 1, 2.4, 0.4, 0.8);
    dots(w, h, 300, "#3f6a24", 0.8, 1.8, 0.3, 0.6);
  });
  tile("onion", T, T, (w, h) => {
    bg(w, h, vgrad(h, 0, "#cdb98c", 0.12, "#f1e4cc", 1, "#e6d6b8"));
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w;
      line(x, 0, x + (rnd() - 0.5) * 6, h, "rgba(150,110,60,0.35)", 1);
    }
    mottle(w, h, 8, ["150,90,110"], 10, 26, 0.18);
  });
  tile("potato", T, T, (w, h) => {
    bg(w, h, "#b28c5a");
    mottle(w, h, 40, ["90,64,36", "206,170,120"], 5, 20, 0.35);
    dots(w, h, 60, "#4a3420", 1, 2.5, 0.4, 0.8);
  });
  // tops of trays and cartons
  tile("eggs", 192, 160, (w, h) => {
    bg(w, h, "#8c877a");
    dots(w, h, 600, "#6f6a5e", 0.6, 1.6, 0.3, 0.7);
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 6; i++) {
        const x = 16 + i * 32,
          y = 16 + j * 32,
          r = rnd();
        if (r < 0.08) {
          blot(x, y, 13, "20,18,14", 0.8);
          continue;
        }
        const g = c.createRadialGradient(x - 3, y - 4, 1, x, y, 13);
        const br = r < 0.6;
        g.addColorStop(0, br ? "#f3d9b6" : "#fbf6ea");
        g.addColorStop(0.7, br ? "#c9966a" : "#e4dccb");
        g.addColorStop(1, br ? "#8e6442" : "#b9b0a0");
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, y, 11.5, 12.5, 0, 0, 6.3);
        c.fill();
      }
    // one smashed
    blot(112, 80, 20, "240,190,40", 0.9);
    blot(112, 80, 30, "240,236,220", 0.4);
  });
  tile("tofu", 128, 128, (w, h) => {
    // blocks of bean curd standing in milky water
    bg(w, h, "#b9c4b8");
    mottle(w, h, 12, ["236,240,230"], 14, 40, 0.3);
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 4; i++) {
        if (rnd() < 0.18) continue;
        const x = 6 + i * 30,
          y = 8 + j * 39;
        c.fillStyle = "rgba(60,70,60,0.35)";
        c.fillRect(x + 2, y + 3, 26, 34);
        c.fillStyle = vgrad(h, 0, "#fbfaf2", 1, "#f1eee0");
        c.fillRect(x, y, 26, 34);
        c.strokeStyle = "rgba(190,186,160,0.8)";
        c.strokeRect(x + 0.5, y + 0.5, 25, 33);
        for (let k = 1; k < 3; k++)
          line(
            x + 2,
            y + k * 11,
            x + 24,
            y + k * 11,
            "rgba(200,196,170,0.5)",
            1,
          );
      }
  });
  tile("noodle", 128, 128, (w, h) => {
    bg(w, h, "#c9a84a");
    for (let n = 0; n < 9; n++) {
      const cx2 = 22 + (n % 3) * 42,
        cy2 = 22 + Math.floor(n / 3) * 42;
      blot(cx2 + 3, cy2 + 4, 24, "70,50,10", 0.5);
      for (let i = 0; i < 46; i++) {
        c.strokeStyle = `rgb(${226 + rnd() * 26},${190 + rnd() * 30},${90 + rnd() * 40})`;
        c.lineWidth = 1.4;
        c.beginPath();
        c.ellipse(
          cx2 + (rnd() - 0.5) * 8,
          cy2 + (rnd() - 0.5) * 8,
          5 + rnd() * 13,
          4 + rnd() * 12,
          rnd() * 3.14,
          0,
          6.3,
        );
        c.stroke();
      }
    }
  });
  tile("grate", 128, 40, (w, h) => {
    // cast drain grating over a dark channel
    bg(w, h, "#15191a");
    for (let x = -PAD; x < w + PAD; x += 8) {
      c.fillStyle = hgrad(8, 0, "#5a5f5e", 0.5, "#8a908c", 1, "#3c4040");
      c.save();
      c.translate(x, 0);
      c.fillRect(0, 3, 4.5, h - 6);
      c.restore();
    }
    c.fillStyle = "#6c726e";
    c.fillRect(-PAD, -PAD, w + 2 * PAD, PAD + 4);
    c.fillRect(-PAD, h - 4, w + 2 * PAD, PAD + 4);
    mottle(w, h, 14, ["90,50,24", "10,12,12"], 4, 14, 0.5);
  });
  tile("tube", 24, 128, (w, h) => {
    // fluorescent tube: bright along its length, blackened at the ends
    bg(
      w,
      h,
      vgrad(
        h,
        0,
        "#3a3a34",
        0.04,
        "#8a8a7a",
        0.1,
        "#ffffff",
        0.9,
        "#ffffff",
        0.96,
        "#8a8a7a",
        1,
        "#3a3a34",
      ),
    );
  });
  tile("zapper", 96, 48, (w, h) => {
    bg(w, h, "#1a1040");
    for (const y of [14, 34]) {
      c.fillStyle = vgrad(h, 0, "#3a2ad0", 1, "#3a2ad0");
      blot(w / 2, y, 60, "120,110,255", 0.9, 0.16);
      c.fillStyle = "#e6e2ff";
      c.fillRect(6, y - 2, w - 12, 4);
    }
    for (let x = 0; x < w; x += 6) line(x, 0, x, h, "rgba(0,0,0,0.75)", 1.5);
  });

  // ---- transparent tiles ----
  const puddle = (w, h, a) => {
    c.fillStyle = `rgba(6,10,12,${a})`;
    c.beginPath();
    const n = 18,
      ph = rnd() * 6;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 6.283,
        r =
          (0.33 +
            0.07 * Math.sin(t * 3 + ph) +
            0.05 * Math.sin(t * 5 + ph * 2)) *
          w;
      c.lineTo(w / 2 + Math.cos(t) * r, h / 2 + Math.sin(t) * r * 0.9);
    }
    c.filter = "blur(5px)";
    c.fill();
    c.filter = "none";
  };
  tile("puddle0", 200, 200, (w, h) => puddle(w, h, 0.62), true);
  tile(
    "puddle1",
    200,
    200,
    (w, h) => {
      puddle(w, h, 0.5);
      c.strokeStyle = "rgba(200,220,230,0.16)";
      for (const r of [22, 40, 58]) {
        c.beginPath();
        c.arc(w * 0.52, h * 0.5, r, 0, 6.3);
        c.stroke();
      }
    },
    true,
  );
  tile(
    "sheen",
    200,
    200,
    (w, h) => {
      for (let i = 0; i < 16; i++)
        blot(
          w * (0.25 + rnd() * 0.5),
          h * (0.25 + rnd() * 0.5),
          w * (0.14 + rnd() * 0.12),
          "6,10,12",
          0.2,
        );
    },
    true,
  );
  tile(
    "grime",
    256,
    96,
    (w, h) => {
      // dirt climbing a wall from the floor; wraps left to right
      c.fillStyle = vgrad(
        h,
        0,
        "rgba(20,18,12,0)",
        0.45,
        "rgba(20,18,12,0.25)",
        1,
        "rgba(16,14,10,0.8)",
      );
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const x = rnd() * w,
          r = 10 + rnd() * 26,
          y = h - rnd() * rnd() * h;
        for (const dx of [-w, 0, w]) blot(x + dx, y, r, "14,12,8", 0.3);
      }
      for (let i = 0; i < 60; i++) {
        const x = rnd() * w;
        c.fillStyle = `rgba(14,12,8,${0.15 + rnd() * 0.25})`;
        c.fillRect(x, h * (0.2 + rnd() * 0.5), 1 + rnd() * 2, h);
      }
    },
    true,
  );
  tile(
    "streaks",
    200,
    200,
    (w, h) => {
      // rain-borne dirt running down from a sill; wraps left to right
      c.fillStyle = vgrad(
        h,
        0,
        "rgba(22,24,16,0.7)",
        0.25,
        "rgba(22,24,16,0.3)",
        1,
        "rgba(22,24,16,0)",
      );
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = 4 + rnd() * (w - 8),
          l = h * (0.3 + rnd() * 0.7),
          lw = 1 + rnd() * 5;
        const g = c.createLinearGradient(0, 0, 0, l);
        g.addColorStop(
          0,
          `rgba(${rnd() < 0.3 ? "70,46,20" : "18,20,14"},${0.4 + rnd() * 0.4})`,
        );
        g.addColorStop(1, "rgba(18,20,14,0)");
        c.fillStyle = g;
        c.fillRect(x, 0, lw, l);
      }
    },
    true,
  );
  const splat = (name, fn) => tile(name, 128, 128, fn, true);
  splat("splatTomato", (w, h) => {
    for (let i = 0; i < 9; i++)
      blot(
        w / 2 + (rnd() - 0.5) * 60,
        h / 2 + (rnd() - 0.5) * 60,
        10 + rnd() * 22,
        "170,30,18",
        0.9,
      );
    c.save();
    c.translate(w / 2, h / 2);
    dots(40, 40, 0, "#000", 1, 1);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = "rgba(240,210,120,0.9)";
      c.beginPath();
      c.ellipse(
        (rnd() - 0.5) * 60,
        (rnd() - 0.5) * 60,
        2,
        1.2,
        rnd() * 3,
        0,
        6.3,
      );
      c.fill();
    }
    c.restore();
    blot(w * 0.45, h * 0.5, 16, "220,60,30", 0.9);
  });
  splat("splatLeaf", (w, h) => {
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(${30 + rnd() * 40},${80 + rnd() * 60},30,${0.7 + rnd() * 0.3})`;
      c.save();
      c.translate(w / 2 + (rnd() - 0.5) * 84, h / 2 + (rnd() - 0.5) * 84);
      c.rotate(rnd() * 6.3);
      c.beginPath();
      c.ellipse(0, 0, 5 + rnd() * 12, 2 + rnd() * 5, 0, 0, 6.3);
      c.fill();
      line(-10, 0, 10, 0, "rgba(210,230,180,0.6)", 1);
      c.restore();
    }
    blot(w / 2, h / 2, 50, "20,30,10", 0.35);
  });
  splat("splatPeel", (w, h) => {
    blot(w / 2, h / 2, 52, "30,20,6", 0.3);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = i % 3 ? "rgba(236,140,30,0.95)" : "rgba(244,224,170,0.95)";
      c.save();
      c.translate(w / 2 + (rnd() - 0.5) * 76, h / 2 + (rnd() - 0.5) * 76);
      c.rotate(rnd() * 6.3);
      c.beginPath();
      c.arc(0, 0, 8 + rnd() * 10, 0, 2.2 + rnd());
      c.lineTo(0, 0);
      c.fill();
      c.restore();
    }
  });
  splat("splatIce", (w, h) => {
    blot(w / 2, h / 2, 60, "110,20,24", 0.4);
    blot(w / 2, h / 2, 40, "6,10,12", 0.4);
    for (let i = 0; i < 120; i++) {
      c.fillStyle = `rgba(${220 + rnd() * 35},${236 + rnd() * 19},255,${0.5 + rnd() * 0.5})`;
      const x = w / 2 + (rnd() - 0.5) * (rnd() * 110),
        y = h / 2 + (rnd() - 0.5) * (rnd() * 110);
      c.fillRect(x, y, 1.5 + rnd() * 4, 1.5 + rnd() * 3);
    }
  });
  splat("feathers", (w, h) => {
    for (let i = 0; i < 30; i++) {
      c.save();
      c.translate(8 + rnd() * (w - 16), 8 + rnd() * (h - 16));
      c.rotate(rnd() * 6.3);
      c.fillStyle =
        rnd() < 0.7 ? "rgba(240,238,228,0.95)" : "rgba(150,110,70,0.95)";
      c.beginPath();
      c.ellipse(0, 0, 7 + rnd() * 5, 2 + rnd() * 1.5, 0, 0, 6.3);
      c.fill();
      line(-9, 0, 9, 0, "rgba(120,110,100,0.7)", 0.8);
      c.restore();
    }
  });
  tile(
    "prints",
    72,
    176,
    (w, h) => {
      // bloody shoe prints, fading as they go up the tile
      for (let i = 0; i < 4; i++) {
        const x = w / 2 + (i % 2 ? 15 : -15),
          y = h - 24 - i * 42,
          a = 0.9 - i * 0.2;
        c.fillStyle = `rgba(96,8,8,${a})`;
        c.beginPath();
        c.ellipse(x, y - 9, 8, 13, 0, 0, 6.3);
        c.fill();
        c.beginPath();
        c.ellipse(x, y + 12, 6.5, 7, 0, 0, 6.3);
        c.fill();
        for (let k = 0; k < 4; k++)
          line(
            x - 7,
            y - 16 + k * 5,
            x + 7,
            y - 16 + k * 5,
            "rgba(0,0,0,0.5)",
            1.2,
          );
      }
    },
    true,
  );
  for (let k = 0; k < 3; k++)
    tile(
      "litter" + k,
      96,
      128,
      (w, h) => {
        c.fillStyle = ["#e9e6da", "#c9c6ba", "#f1c9d2"][k];
        c.fillRect(0, 0, w, h);
        if (k === 0) text("檢疫令", w / 2, 24, 24, "#b3161a");
        if (k === 2)
          text("特價", w / 2, 24, 26, "#b3161a", { font: KAI, weight: 700 });
        for (let i = 0; i < 9; i++)
          line(
            8,
            46 + i * 8,
            w - 8 - rnd() * 30,
            46 + i * 8,
            "rgba(30,30,30,0.7)",
            k === 1 ? 3 : 1.5,
          );
        mottle(w, h, 8, ["40,30,20"], 10, 34, 0.4);
        c.fillStyle = "rgba(30,24,18,0.5)";
        c.beginPath();
        c.ellipse(w * 0.6, h * 0.7, 14, 22, 0.4, 0, 6.3);
        c.fill();
      },
      true,
    );
  tile(
    "wire",
    128,
    128,
    (w, h) => {
      // cage mesh
      for (let i = 0; i <= w; i += 16) {
        line(i, 0, i, h, "rgba(150,156,150,0.95)", 2);
        line(0, i, w, i, "rgba(150,156,150,0.95)", 2);
      }
      c.strokeStyle = "rgba(170,176,170,1)";
      c.lineWidth = 5;
      c.strokeRect(2.5, 2.5, w - 5, h - 5);
    },
    true,
  );
  tile(
    "strip",
    48,
    192,
    (w, h) => {
      // one length of a PVC strip curtain
      c.fillStyle = "rgba(196,214,190,0.34)";
      c.fillRect(0, 0, w, h);
      c.fillStyle = hgrad(
        w,
        0,
        "rgba(255,255,255,0.5)",
        0.14,
        "rgba(255,255,255,0)",
        0.8,
        "rgba(255,255,255,0)",
        0.9,
        "rgba(255,255,255,0.4)",
        1,
        "rgba(60,70,60,0.5)",
      );
      c.fillRect(0, 0, w, h);
      c.fillStyle = vgrad(h, 0.6, "rgba(40,36,24,0)", 1, "rgba(40,36,24,0.55)");
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++)
        blot(rnd() * w, rnd() * h, 4 + rnd() * 10, "50,44,30", 0.3);
    },
    true,
  );
  tile(
    "glass",
    128,
    128,
    (w, h) => {
      // front pane of a tank: nearly clear, scummed at the waterline and corners
      c.fillStyle = "rgba(150,220,190,0.07)";
      c.fillRect(0, 0, w, h);
      c.fillStyle = vgrad(
        h,
        0,
        "rgba(200,240,220,0.3)",
        0.1,
        "rgba(200,240,220,0.5)",
        0.13,
        "rgba(200,240,220,0)",
        0.85,
        "rgba(20,60,40,0)",
        1,
        "rgba(20,60,40,0.55)",
      );
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        const x = rnd() * w;
        c.fillStyle = `rgba(220,240,230,${0.08 + rnd() * 0.14})`;
        c.fillRect(x, h * 0.12, 1 + rnd() * 3, h * (0.2 + rnd() * 0.6));
      }
      line(8, h - 6, 60, 10, "rgba(255,255,255,0.12)", 14);
    },
    true,
  );
  tile(
    "fan",
    136,
    136,
    (w, h) => {
      // guard and blades of a wall fan, seen face on
      const m = w / 2;
      c.fillStyle = "rgba(20,24,24,0.55)";
      for (let k = 0; k < 3; k++) {
        c.save();
        c.translate(m, m);
        c.rotate(k * 2.094 + 0.4);
        c.beginPath();
        c.ellipse(30, 0, 30, 15, 0.35, 0, 6.3);
        c.fill();
        c.restore();
      }
      c.strokeStyle = "rgba(170,176,170,0.95)";
      c.lineWidth = 1.2;
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * 6.283;
        line(
          m + Math.cos(a) * 12,
          m + Math.sin(a) * 12,
          m + Math.cos(a) * 64,
          m + Math.sin(a) * 64,
          "rgba(170,176,170,0.9)",
          1.2,
        );
      }
      for (const r of [64, 44, 24]) {
        c.lineWidth = r === 64 ? 4 : 1.5;
        c.beginPath();
        c.arc(m, m, r, 0, 6.3);
        c.stroke();
      }
      c.fillStyle = "rgba(60,90,130,1)";
      c.beginPath();
      c.arc(m, m, 13, 0, 6.3);
      c.fill();
    },
    true,
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, R, canvas };
}

export function buildMarket(ctx, PLAN) {
  const { kit, signs, B } = ctx;
  const K = PLAN.kerb;
  const M = B.M;
  const m = PLAN.market;
  const { x0, z0, x1, z1, eave, ridge } = m;
  const zr = (z0 + z1) / 2;
  const I = { interior: true };
  const HALF = Math.PI / 2;
  const rnd = mulberry(0x51a7e11);
  const pick = (list) => list[Math.floor(rnd() * list.length) % list.length];

  // ---------- materials ----------
  const floor = kit.pbr("tiles_floor", {
    ...I,
    macro: [0.14, 0.1, 0.5, 0.6],
  });
  const tile = kit.pbr("tiles_white", { ...I, color: 0xd6ddd4 });
  const tileTrim = kit.pbr("tiles_white", { ...I, color: 0x2f6a4a });
  const counterTile = kit.pbr("tiles_white", { ...I, color: 0xcfd6cf });
  const wallIn = kit.pbr("plaster_worn", {
    ...I,
    color: 0xb9c2a8,
    key: "mkt",
  });
  const brick = kit.pbr("brick_orange", { macro: [0.14, 0.07, 0.22, 0.55] });
  const steelI = kit.game("steel_dark", I),
    galvI = kit.game("steel_galv", I);
  const sheet = kit.pbr("corrugated", { ...I, side: true });
  const conc = kit.pbr("concrete_dirty", { ...I, key: "mkt" });
  const woodI = kit.pbr("wood_planks", { ...I });
  const woodDark = kit.pbr("wood_planks", { ...I, color: 0x6a5440 });

  // the atlas and its four materials; colour comes from the per-vertex tint of a handle
  const atlas = paintAtlas(kit.aniso, mulberry(0x7ea5));
  const R = atlas.R;
  const own = (mat, name) => {
    mat.name = name;
    mat.vertexColors = true;
    mat.userData.oneCell = true; // one mesh for the whole hall
    mat.userData.noReflect = true; // nothing in here shows in the street's puddles
    mat.userData.noCast = true; // nor does the sun reach it
    return mat;
  };
  const matteM = own(
    kit.painted(atlas.tex, { rough: 0.82, wet: "dry", interior: true }),
    "ct_market_matte",
  );
  const glossM = own(
    kit.painted(atlas.tex, { rough: 0.3, wet: "dry", interior: true }),
    "ct_market_gloss",
  );
  const decalM = own(
    kit.painted(atlas.tex, {
      rough: 0.14,
      wet: "dry",
      interior: true,
      transparent: true,
    }),
    "ct_market_decal",
  );
  const glowM = own(kit.glowMap(atlas.tex, 1), "ct_market_glow");
  // the same, for the roof glazing and the strip lights: large and bright enough to belong in
  // the probe that lights the hall, which only renders the layer the wet street reflects
  const skyM = own(kit.glowMap(atlas.tex, 1), "ct_market_sky");
  skyM.userData.noReflect = false;
  const handles = new Map();
  const tinted = (base, color, k = 1) => {
    const key = base.name + "|" + color + "|" + k;
    let h = handles.get(key);
    if (!h) {
      const c = new THREE.Color(color);
      if (k !== 1) c.multiplyScalar(k);
      // the same kind of handle kit.pbr returns: a base material plus a tint
      h = {
        isSurfaceHandle: true,
        uuid: key,
        name: base.name,
        userData: { tint: { base, color: c } },
      };
      handles.set(key, h);
    }
    return h;
  };
  const mt = (c = 0xffffff) => tinted(matteM, c); // matte, lit
  const gl = (c = 0xffffff) => tinted(glossM, c); // wet or glazed, lit
  const dc = (c = 0xffffff) => tinted(decalM, c); // transparent overlay
  const em = (c = 0xffffff, k = 1) => tinted(glowM, c, k); // unlit, k = HDR gain
  const sky = (c = 0xffffff, k = 1) => tinted(skyM, c, k); // unlit and seen by the probe

  // ---------- geometry helpers ----------
  // Everything below is placed with matrices: P is the local frame of a stall or object
  // (+x along its front, +y up, +z towards whoever stands in front of it).
  const geos = new Map();
  const cached = (key, make) => {
    let g = geos.get(key);
    if (!g) geos.set(key, (g = make()));
    return g;
  };
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const ball = (ws = 6, hs = 4) =>
    cached(`ball${ws}|${hs}`, () => new THREE.SphereGeometry(1, ws, hs));
  const tubeG = (seg = 6, open = false, top = 1) =>
    cached(
      `cyl${seg}|${open}|${top}`,
      () => new THREE.CylinderGeometry(top, 1, 1, seg, 1, open),
    );
  const lathe = (key, pts, seg = 8) =>
    cached(
      `lathe${key}|${seg}`,
      () =>
        new THREE.LatheGeometry(
          pts.map(([r, y]) => new THREE.Vector2(r, y)),
          seg,
        ),
    );
  const disc = (seg = 10) =>
    cached("disc" + seg, () => new THREE.CircleGeometry(1, seg).rotateX(-HALF));
  // the same surface seen from behind (inside of a bowl, underside of a sheet)
  const inside = (geo) =>
    cached("in" + geo.uuid, () => {
      const g = geo.clone();
      const n = g.attributes.normal;
      for (let i = 0; i < n.count; i++)
        n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      const a = g.index.array;
      for (let i = 0; i < a.length; i += 3) {
        const t = a[i + 1];
        a[i + 1] = a[i + 2];
        a[i + 2] = t;
      }
      return g;
    });
  // free-form geometry from quads and triangles with their own texture coordinates
  function builder() {
    const pos = [],
      uv = [],
      idx = [];
    const self = {
      vert(p, u, v) {
        pos.push(p[0], p[1], p[2]);
        uv.push(u, v);
        return pos.length / 3 - 1;
      },
      tri(a, b, c) {
        idx.push(a, b, c);
      },
      quad(p0, p1, p2, p3, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
        const a = self.vert(p0, u0, v0),
          b = self.vert(p1, u1, v0),
          c = self.vert(p2, u1, v1),
          d = self.vert(p3, u0, v1);
        idx.push(a, b, c, a, c, d);
      },
      done() {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
      },
    };
    return self;
  }
  const WHITE = [(R.white[0] + R.white[2]) / 2, (R.white[1] + R.white[3]) / 2];
  // adds atlas geometry: its own 0..1 texture coordinates are fitted into tile r, or
  // collapsed onto the white texel when the colour is the tint alone
  function put(h, geo, mtx, r) {
    kit.add(
      h,
      geo,
      mtx,
      r
        ? { uvScale: [r[2] - r[0], r[3] - r[1]], uvOffset: [r[0], r[1]] }
        : { uvScale: [0, 0], uvOffset: WHITE },
    );
  }
  const at = (P, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
    const mtx = kit.xform(x, y, z, rx, ry, rz, sx, sy, sz);
    return P ? mtx.premultiply(P) : mtx;
  };
  // box between two corners of the local frame
  const bx = (h, P, ax, ay, az, cx, cy, cz, r) =>
    put(
      h,
      BOX,
      at(
        P,
        (ax + cx) / 2,
        (ay + cy) / 2,
        (az + cz) / 2,
        0,
        0,
        0,
        Math.abs(cx - ax),
        Math.abs(cy - ay),
        Math.abs(cz - az),
      ),
      r,
    );
  // box by centre, size and yaw / pitch / roll
  const ob = (h, P, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0, r) =>
    put(h, BOX, at(P, x, y, z, rx, ry, rz, sx, sy, sz), r);
  const sp = (h, P, x, y, z, sx, sy, sz, r, ry = 0, rx = 0, rz = 0, geo) =>
    put(h, geo || ball(), at(P, x, y, z, rx, ry, rz, sx, sy, sz), r);
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _d = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _up = new THREE.Vector3(0, 1, 0);
  const world = (P, p) => {
    _a.set(p[0], p[1], p[2]);
    if (P) _a.applyMatrix4(P);
    return [_a.x, _a.y, _a.z];
  };
  // thin atlas-coloured rod between two local points
  function rod(h, P, a, b, rad, seg = 5, r) {
    _a.set(a[0], a[1], a[2]);
    _b.set(b[0], b[1], b[2]);
    if (P) {
      _a.applyMatrix4(P);
      _b.applyMatrix4(P);
    }
    _d.subVectors(_b, _a);
    const len = _d.length();
    if (len < 1e-4) return;
    _q.setFromUnitVectors(_up, _d.divideScalar(len));
    put(
      h,
      tubeG(seg, true),
      new THREE.Matrix4().compose(
        _a.clone().add(_b).multiplyScalar(0.5),
        _q,
        new THREE.Vector3(rad, len, rad),
      ),
      r,
    );
  }
  // the same in the game's steel
  const srod = (mat, P, a, b, rad, seg = 5) =>
    kit.rod(mat, world(P, a), world(P, b), rad, { seg });
  const sbox = (mat, P, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) =>
    kit.add(mat, BOX, at(P, x, y, z, rx, ry, rz, sx, sy, sz));
  // axis-aligned box of a kit surface given in a local frame (frames turn in quarter steps)
  const span = (P, ax, ay, az, cx, cy, cz) => {
    const p = world(P, [ax, ay, az]),
      q = world(P, [cx, cy, cz]);
    return [
      Math.min(p[0], q[0]),
      Math.min(p[1], q[1]),
      Math.min(p[2], q[2]),
      Math.max(p[0], q[0]),
      Math.max(p[1], q[1]),
      Math.max(p[2], q[2]),
    ];
  };
  const wbox = (mat, P, ax, ay, az, cx, cy, cz, o) =>
    kit.box(mat, ...span(P, ax, ay, az, cx, cy, cz), o);
  const solid = (P, ax, ay, az, cx, cy, cz, surface = "concrete", o) =>
    kit.solid(...span(P, ax, ay, az, cx, cy, cz), surface, o);
  // flat picture: p0 bottom-left, p1 bottom-right, p2 top-right, p3 top-left
  const pic = (h, P, p0, p1, p2, p3, r) =>
    kit.quad(
      h,
      world(P, p0),
      world(P, p1),
      world(P, p2),
      world(P, p3),
      r
        ? [r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]]
        : [...WHITE, ...WHITE, ...WHITE, ...WHITE],
    );
  // upright picture facing +z of the frame, centred on (x, y)
  const plate = (h, P, x, y, z, w, hgt, r) =>
    pic(
      h,
      P,
      [x - w / 2, y - hgt / 2, z],
      [x + w / 2, y - hgt / 2, z],
      [x + w / 2, y + hgt / 2, z],
      [x - w / 2, y + hgt / 2, z],
      r,
    );
  // picture lying on the floor (or any level surface), turned by yaw
  const lay = (h, P, x, y, z, w, d, yaw, r) => {
    const c = Math.cos(yaw),
      s = Math.sin(yaw);
    const q = (px, pz) => [x + px * c + pz * s, y, z - px * s + pz * c];
    pic(
      h,
      P,
      q(-w / 2, d / 2),
      q(w / 2, d / 2),
      q(w / 2, -d / 2),
      q(-w / 2, -d / 2),
      r,
    );
  };
  // local frames: the letter is the way the front faces
  const YAW = { S: 0, E: HALF, N: Math.PI, W: -HALF };
  const frame = (x, z, dir, y = K) => kit.xform(x, y, z, 0, YAW[dir], 0);
  const light = (P, x, y, z, color, power, range, flicker = 0) => {
    const e = { pos: world(P, [x, y, z]), color, power, range, flicker };
    ctx.emitters.push(e);
    return e;
  };

  // ================= THE SHED =================
  kit.box(floor, x0, 0, z0, x1, K, z1, { skip: "b" });
  kit.solid(x0, -0.2, z0, x1, K, z1, "concrete");

  // walls: brick outside, tiled dado and plaster inside; openings are [from, to, head height]
  const T = 0.4;
  const DADO = 2.2 + K;
  function wall(side, openings, o = {}) {
    const f = B.frame(side, x0, z0, x1, z1);
    const W = f.len;
    let s = 0;
    const seg = (a, b, y0, y1) => {
      if (b - a < 0.02) return;
      if (!o.noOuter) B.fbox(f, brick, a, y0, -T / 2, b, y1, 0, { skip: "bi" });
      B.fbox(
        f,
        y0 < 2.2 ? tile : wallIn,
        a,
        y0,
        -T,
        b,
        Math.min(y1, DADO),
        -T / 2,
        {
          skip: "bo",
        },
      );
      if (y1 > DADO)
        B.fbox(f, wallIn, a, Math.max(y0, DADO), -T, b, y1, -T / 2, {
          skip: "bo",
        });
      // a band of dark green tile caps the dado
      if (y0 < 2.2)
        B.fbox(f, tileTrim, a, DADO - 0.1, -T - 0.012, b, DADO, -T, {
          skip: "o",
        });
      const pa = B.P(f, a, y0, -T),
        pb = B.P(f, b, y1, 0);
      kit.solid(
        Math.min(pa[0], pb[0]),
        y0,
        Math.min(pa[2], pb[2]),
        Math.max(pa[0], pb[0]),
        y1,
        Math.max(pa[2], pb[2]),
        "concrete",
      );
    };
    for (const [a, b, head] of openings) {
      seg(s, a, 0, eave);
      seg(a, b, head, eave);
      // steel frame round the opening
      B.fbox(f, M.steel, a - 0.08, 0, -T - 0.02, a, head, 0.03, {
        skip: "b",
      });
      B.fbox(f, M.steel, b, 0, -T - 0.02, b + 0.08, head, 0.03, {
        skip: "b",
      });
      B.fbox(
        f,
        M.steel,
        a - 0.08,
        head,
        -T - 0.02,
        b + 0.08,
        head + 0.34,
        0.06,
        { skip: "" },
      );
      s = b;
    }
    seg(s, W, 0, eave);
    return f;
  }
  // south front on the street: wide middle entrance
  const fs = wall("s", [[9, 15, 3.7]]);
  const fw = wall("w", [[8, 12, 3.3]]); // lane side
  const fe = wall("e", [[5, 9, 3.3]]); // east alley side
  wall("n", [], { noOuter: true });
  // stepped front gable with the market sign
  const W = x1 - x0;
  B.fbox(fs, brick, 0, eave, -T / 2, W, eave + 1.5, 0, { skip: "bi" });
  B.fbox(fs, wallIn, 0, eave, -T, W, eave + 1.5, -T / 2, { skip: "bo" });
  B.fbox(fs, brick, 4, eave + 1.5, -T / 2, W - 4, eave + 2.7, 0, {
    skip: "b",
  });
  B.fbox(fs, brick, 8, eave + 2.7, -T / 2, W - 8, eave + 3.8, 0, {
    skip: "b",
  });
  for (const [a, b, y] of [
    [0, W, eave + 1.5],
    [4, W - 4, eave + 2.7],
    [8, W - 8, eave + 3.8],
  ])
    B.fbox(
      fs,
      M.trim(0xc9bea8),
      a - 0.1,
      y,
      -T / 2 - 0.06,
      b + 0.1,
      y + 0.16,
      0.12,
      { skip: "" },
    );
  for (const s of [0.2, 4, 8.6, 15.4, 20, W - 0.2])
    B.fbox(fs, M.trim(0xc9bea8), s - 0.28, 0, 0, s + 0.28, eave + 1.5, 0.14, {
      skip: "bi",
    });
  const face = signs.neon({
    text: "金龍街市",
    sub: "GOLDEN DRAGON MARKET",
    w: 7.6,
    h: 1.9,
    color: "#ff2a4f",
    trim: "#35f0c8",
  });
  B.fbox(fs, M.steel, 8.1, eave + 0.55, 0, 15.9, eave + 2.6, 0.2, {
    skip: "i",
  });
  B.fquad(
    fs,
    signs.mats.neon,
    8.2,
    eave + 0.62,
    15.8,
    eave + 2.52,
    0.208,
    face.uv,
  );
  B.emit(fs, 12, eave - 0.6, 1.6, 0xff2a4f, 2.6, 14);
  ctx.glints.push({
    pos: B.P(fs, 12, eave + 1.5, 0.3),
    color: "#ff2a4f",
    size: 5,
  });
  // shuttered lock-ups either side of the entrance (these draw from the level's shared
  // random stream, as the street dressing after them expects)
  for (const [a, b] of [
    [0.7, 3.6],
    [4.5, 8.2],
    [15.8, 19.5],
    [20.4, 23.3],
  ]) {
    B.fquad(
      fs,
      kit.rnd() < 0.5 ? M.shutterRust : M.shutter(0x6a7a70),
      a,
      K,
      b,
      3.0,
      0.02,
    );
    B.fbox(fs, M.steel, a - 0.05, 3.0, 0, b + 0.05, 3.3, 0.1, { skip: "i" });
    if (kit.rnd() < 0.7)
      B.notice(fs, a + 0.3 + kit.rnd() * (b - a - 1), 1.3, 0.03);
    const bd = signs.board({
      text: kit.pick(["鮮魚", "蔬菜", "生果", "鮮肉", "豆腐", "雜貨"]),
      w: b - a,
      h: 0.7,
    });
    B.fquad(fs, signs.mats.board, a, 3.4, b, 4.1, 0.03, bd.uv);
  }
  // high windows on the long sides
  for (const [f, len] of [
    [fw, z1 - z0],
    [fe, z1 - z0],
  ])
    for (let s = 2.2; s < len - 2; s += 3.6) {
      B.fquad(
        f,
        signs.mats.glass,
        s,
        3.9,
        s + 2.2,
        4.8,
        0.012,
        signs.windows[7],
      );
      B.fbox(f, M.steel, s - 0.05, 3.85, 0, s + 2.25, 3.9, 0.06, {
        skip: "i",
      });
      B.fbox(f, M.steel, s - 0.05, 4.8, 0, s + 2.25, 4.85, 0.06, {
        skip: "i",
      });
      for (let k = 0; k < 4; k++)
        B.fbox(
          f,
          M.steel,
          s + k * 0.733 - 0.02,
          3.9,
          0,
          s + k * 0.733 + 0.02,
          4.8,
          0.04,
          { skip: "i" },
        );
    }
  // signs over the side entrances
  for (const [f, a, b] of [
    [fw, 8, 12],
    [fe, 5, 9],
  ]) {
    const sb = signs.neon({
      text: "街市",
      sub: "MARKET",
      w: 2.6,
      h: 0.8,
      style: "box",
      color: "#0a6a3a",
      face: "#f4f7ff",
    });
    B.fbox(
      f,
      M.steel,
      (a + b) / 2 - 1.35,
      3.7,
      0,
      (a + b) / 2 + 1.35,
      4.6,
      0.16,
      { skip: "i" },
    );
    B.fquad(
      f,
      signs.mats.neon,
      (a + b) / 2 - 1.3,
      3.75,
      (a + b) / 2 + 1.3,
      4.55,
      0.168,
      sb.uv,
    );
    B.emit(f, (a + b) / 2, 3.2, 1.0, 0xd8ffe8, 1.4, 8);
  }

  // roof: two corrugated slopes on steel trusses; the two bays over the main aisle are glazed
  const mix = (p, q, t) => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
  ];
  const BAY = (x1 - x0) / 6;
  const leaks = []; // where rain comes in through a broken pane: [x, y, z]
  const slope = (za, zb) => {
    // a quad on the slope that shows its front to the hall below
    const under = (mat, c0, c1, c2, c3, uv) =>
      za > zb
        ? kit.quad(mat, c0, c1, c2, c3, uv)
        : kit.quad(mat, c1, c0, c3, c2, uv);
    for (let i = 0; i < 6; i++) {
      const a = x0 + BAY * i,
        b = a + BAY;
      const q0 = [a, eave, za],
        q1 = [b, eave, za],
        q2 = [b, ridge, zb],
        q3 = [a, ridge, zb];
      if (i !== 2 && i !== 3) {
        under(sheet, q0, q1, q2, q3);
        continue;
      }
      const band = (t0, t1) =>
        under(
          sheet,
          mix(q0, q3, t0),
          mix(q1, q2, t0),
          mix(q1, q2, t1),
          mix(q0, q3, t1),
        );
      band(0, 0.25);
      band(0.75, 1);
      // patent glazing: four panes across, six up the slope, on steel T-bars
      const NX = 4,
        NT = 6;
      const pt = (u, t, drop = 0) => {
        const p = mix(mix(q0, q1, u), mix(q3, q2, u), 0.25 + t * 0.5);
        p[1] -= drop;
        return p;
      };
      for (let ix = 0; ix < NX; ix++)
        for (let it = 0; it < NT; it++) {
          const r = rnd();
          const broken =
            (i === 2 && ix === 3 && it === 2 && za > zb) ||
            (i === 3 && ix === 1 && it === 3 && za < zb);
          // most panes are filthy wired glass; a few were replaced with board, two are gone
          const name = broken ? "paneBroken" : "pane" + Math.floor(rnd() * 3);
          const k = broken ? 1.5 : r < 0.1 ? 0.12 : 0.55 + rnd() * 0.4;
          const tintC = r < 0.1 ? 0x8a8f86 : r < 0.3 ? 0xdfe8d2 : 0xffffff;
          const uvr = R[name];
          const c0 = pt(ix / NX, it / NT),
            c1 = pt((ix + 1) / NX, it / NT),
            c2 = pt((ix + 1) / NX, (it + 1) / NT),
            c3 = pt(ix / NX, (it + 1) / NT);
          const uv = [
            uvr[0],
            uvr[1],
            uvr[2],
            uvr[1],
            uvr[2],
            uvr[3],
            uvr[0],
            uvr[3],
          ];
          const h = sky(tintC, k * 1.7);
          kit.quad(h, c0, c1, c2, c3, uv);
          kit.quad(h, c1, c0, c3, c2, [
            uv[2],
            uv[3],
            uv[0],
            uv[1],
            uv[6],
            uv[7],
            uv[4],
            uv[5],
          ]);
          if (broken) leaks.push(pt((ix + 0.5) / NX, (it + 0.5) / NT));
        }
      for (let ix = 0; ix <= NX; ix++)
        kit.rod(
          steelI,
          pt(ix / NX, 0, 0.03),
          pt(ix / NX, 1, 0.03),
          ix % NX ? 0.022 : 0.035,
          { seg: 4 },
        );
      for (let it = 0; it <= NT; it++)
        kit.rod(
          steelI,
          pt(0, it / NT, 0.03),
          pt(1, it / NT, 0.03),
          it % NT ? 0.016 : 0.035,
          { seg: 4 },
        );
      // the dusk that comes through
      ctx.emitters.push({
        pos: pt(0.5, 0.5, 1.3),
        color: 0x86a6e0,
        power: 1.5,
        range: 12,
      });
    }
    // purlins under the sheeting
    for (const t of [0.12, 0.38, 0.62, 0.88]) {
      const y = eave + (ridge - eave) * t - 0.07,
        z = za + (zb - za) * t;
      kit.rod(steelI, [x0 + 0.1, y, z], [x1 - 0.1, y, z], 0.035, { seg: 4 });
    }
  };
  slope(z1, zr);
  slope(z0, zr);
  for (let x = x0 + 4; x < x1 - 1; x += 4) {
    kit.rod(steelI, [x, eave, z0 + 0.2], [x, eave, z1 - 0.2], 0.06, {
      seg: 6,
      cast: true,
    });
    kit.rod(steelI, [x, eave, z0 + 0.2], [x, ridge - 0.1, zr], 0.05, {
      seg: 6,
    });
    kit.rod(steelI, [x, eave, z1 - 0.2], [x, ridge - 0.1, zr], 0.05, {
      seg: 6,
    });
    kit.rod(steelI, [x, eave, zr], [x, ridge - 0.1, zr], 0.04, { seg: 6 });
    for (const s of [-1, 1]) {
      kit.rod(
        steelI,
        [x, eave, zr],
        [x, (eave + ridge) / 2, zr + s * (z1 - z0) * 0.25],
        0.035,
        { seg: 5 },
      );
      kit.rod(
        steelI,
        [x, eave, zr + s * (z1 - z0) * 0.25],
        [x, (eave + ridge) / 2, zr + s * (z1 - z0) * 0.25],
        0.03,
        { seg: 5 },
      );
    }
  }
  kit.rod(steelI, [x0, ridge - 0.1, zr], [x1, ridge - 0.1, zr], 0.06, {
    seg: 6,
  });
  // gable ends
  for (const [x, flip] of [
    [x0, 1],
    [x1, -1],
  ]) {
    const a = [x, eave, z0],
      b = [x, eave, z1],
      c = [x, ridge, zr];
    const tri = new THREE.BufferGeometry();
    tri.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...a, ...b, ...c], 3),
    );
    tri.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(
        [-flip, 0, 0, -flip, 0, 0, -flip, 0, 0],
        3,
      ),
    );
    tri.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([z0, eave, z1, eave, zr, ridge], 2),
    );
    tri.setIndex(flip > 0 ? [0, 1, 2] : [0, 2, 1]);
    kit.add(sheet, tri, null, { cx: x, cz: zr });
  }
  kit.solid(x0, ridge - 0.4, z0, x1, ridge + 0.2, z1, "metal", {
    bulletOnly: true,
  });

  // columns
  const COLS = [];
  for (const cx of [x0 + 6, x0 + 12, x0 + 18])
    for (const cz of [z0 + 6.5, z1 - 6.5]) {
      kit.box(conc, cx - 0.2, K, cz - 0.2, cx + 0.2, eave, cz + 0.2, {
        skip: "b",
      });
      kit.box(tile, cx - 0.22, K, cz - 0.22, cx + 0.22, K + 1.6, cz + 0.22, {
        skip: "b",
      });
      kit.box(
        tileTrim,
        cx - 0.23,
        K + 1.5,
        cz - 0.23,
        cx + 0.23,
        K + 1.6,
        cz + 0.23,
        {
          skip: "b",
        },
      );
      kit.solid(
        cx - 0.22,
        0,
        cz - 0.22,
        cx + 0.22,
        eave,
        cz + 0.22,
        "concrete",
      );
      COLS.push([cx, cz]);
    }

  // ================= PARTS =================
  // Heights below are measured from the hall floor (every frame sits on it).
  const EAVE = eave - K;
  const DARK = mt(0x1e2020),
    CHAIN = mt(0x3c403c),
    ROPE = mt(0xb9b29a),
    PVC = mt(0x8fa3ad),
    CONDUIT = mt(0x6f7672);

  // ---- lights ----
  // A flickering tube needs its glow and its light to stutter together: it is the one thing
  // in the hall with a material of its own and an updater.
  const flickM = kit.glow(0xe2ffee, 3.4);
  const flickers = [];
  // twin-tube batten hanging on two chains; the tubes run along the frame's x
  function tubeLight(P, x, y, z, o = {}) {
    const state = o.state || "on";
    bx(mt(0xd3d9d0), P, x - 0.64, y, z - 0.07, x + 0.64, y + 0.045, z + 0.07);
    for (const s of [-1, 1]) {
      bx(
        mt(0xb9c0b6),
        P,
        x + s * 0.62 - 0.02,
        y - 0.05,
        z - 0.07,
        x + s * 0.62 + 0.02,
        y,
        z + 0.07,
      );
      rod(
        CHAIN,
        P,
        [x + s * 0.5, y + 0.045, z],
        [x + s * 0.5, o.top ?? EAVE, z],
        0.005,
        4,
      );
      const mtx = at(
        P,
        x,
        y - 0.028,
        z + s * 0.034,
        0,
        0,
        HALF,
        0.017,
        1.2,
        0.017,
      );
      if (state === "flicker") kit.add(flickM, tubeG(6), mtx);
      else
        put(
          state === "on" ? sky(0xe2ffee, 3.4) : gl(0x8f988f),
          tubeG(6),
          mtx,
          R.tube,
        );
    }
    if (state === "dead") return;
    const e = light(
      P,
      x,
      y - 0.4,
      z,
      0xd0ffe4,
      o.power ?? 1.7,
      o.range ?? 10.5,
    );
    if (state === "flicker") flickers.push(e);
  }
  // enamel pendant shade with a bare bulb
  const shadeG = lathe(
    "shade",
    [
      [0.27, 0],
      [0.25, 0.035],
      [0.1, 0.17],
      [0.05, 0.2],
      [0.045, 0.27],
    ],
    12,
  );
  function lamp(P, x, y, z, o = {}) {
    rod(DARK, P, [x, y + 0.27, z], [x, o.top ?? EAVE, z], 0.006, 4);
    put(gl(o.shade ?? 0xb5221c), shadeG, at(P, x, y, z));
    put(mt(0xe9e4d4), inside(shadeG), at(P, x, y, z));
    bx(DARK, P, x - 0.025, y + 0.11, z - 0.025, x + 0.025, y + 0.2, z + 0.025);
    if (o.on === false) {
      sp(gl(0x6a6458), P, x, y + 0.06, z, 0.045, 0.06, 0.045);
      return;
    }
    sp(em(o.bulb ?? 0xffc890, 7), P, x, y + 0.06, z, 0.045, 0.06, 0.045);
    if (o.light !== false)
      light(
        P,
        x,
        y - 0.25,
        z,
        o.color ?? 0xffb070,
        o.power ?? 1.0,
        o.range ?? 6.5,
      );
  }
  // stall board on two chains, readable from both sides
  function stallSign(P, key, x, y, z, w = 1.5, o = {}) {
    const hh = (w * 0.32) / 2,
      r = R["sign_" + key];
    const h = o.lit ? em(0xffffff, 1.35) : mt();
    plate(h, P, x, y, z + 0.022, w, hh * 2, r);
    pic(
      h,
      P,
      [x + w / 2, y - hh, z - 0.022],
      [x - w / 2, y - hh, z - 0.022],
      [x - w / 2, y + hh, z - 0.022],
      [x + w / 2, y + hh, z - 0.022],
      r,
    );
    bx(
      DARK,
      P,
      x - w / 2 - 0.02,
      y - hh - 0.02,
      z - 0.02,
      x + w / 2 + 0.02,
      y + hh + 0.02,
      z + 0.02,
    );
    for (const s of [-0.38, 0.38])
      rod(
        CHAIN,
        P,
        [x + s * w, y + hh, z],
        [x + s * w, o.top ?? EAVE, z],
        0.005,
        4,
      );
    if (o.lit) light(P, x, y - 0.3, z + 0.5, o.color ?? 0xfff0d0, 0.9, 5.5);
  }
  // price card on a stick, or stuck to something when stick is 0
  function card(P, key, x, y, z, o = {}) {
    const stick = o.stick ?? 0.14,
      s = o.size ?? 1;
    if (stick)
      rod(
        mt(0xc9b48a),
        P,
        [x, y, z],
        [x, y + stick + 0.02, z - stick * 0.2],
        0.004,
        4,
      );
    ob(
      mt(),
      P,
      x,
      y + stick + 0.045 * s,
      z - stick * 0.2 + 0.004,
      0.14 * s,
      0.097 * s,
      0.004,
      o.yaw ?? rnd(-0.25, 0.25),
      o.tilt ?? -0.18,
      rnd(-0.08, 0.08),
      R["card_" + key],
    );
  }
  // sagging sheet tied by its corners (world points, in order round the sheet)
  function canopy(c00, c10, c11, c01, o = {}) {
    const nx = o.nx || 5,
      nz = o.nz || 4,
      sag = o.sag ?? 0.28;
    const f = (s, t) => {
      const p = mix(mix(c00, c10, s), mix(c01, c11, s), t);
      const edge = 4 * s * (1 - s) * 4 * t * (1 - t);
      // belly in the middle, scallops between the ties, a pocket where rain has pooled
      p[1] -=
        sag * Math.pow(edge, 0.7) +
        0.05 * Math.sin(s * nx * Math.PI) * (1 - edge) +
        (o.pool || 0) * Math.exp(-((s - 0.62) ** 2 + (t - 0.4) ** 2) * 30);
      return p;
    };
    const pos = [],
      nrm = [],
      uv = [],
      idx = [];
    const e = 0.02;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const v0 = pos.length / 3;
        for (const [di, dj] of [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]) {
          const s = (i + di) / nx,
            t = (j + dj) / nz;
          const p = f(s, t),
            ps = f(Math.min(1, s + e), t),
            ms = f(Math.max(0, s - e), t),
            pt2 = f(s, Math.min(1, t + e)),
            mt2 = f(s, Math.max(0, t - e));
          _a.set(ps[0] - ms[0], ps[1] - ms[1], ps[2] - ms[2]);
          _b.set(pt2[0] - mt2[0], pt2[1] - mt2[1], pt2[2] - mt2[2]);
          _d.crossVectors(_b, _a).normalize();
          if (_d.y < 0) _d.negate();
          pos.push(p[0], p[1], p[2]);
          nrm.push(_d.x, _d.y, _d.z);
          // each column shows the whole width of the cloth pattern
          uv.push(di, t);
        }
        idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    // wind the triangles to agree with the upward normals
    const p0 = f(0, 0),
      p1 = f(1, 0),
      p3 = f(0, 1);
    const up =
      (p1[2] - p0[2]) * (p3[0] - p0[0]) - (p1[0] - p0[0]) * (p3[2] - p0[2]) > 0;
    if (!up)
      for (let i = 0; i < idx.length; i += 3)
        [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    const h = mt(o.tint ?? 0xffffff),
      r = o.plain ? R.canvas : R.tarp;
    put(h, g, null, r);
    put(
      mt(new THREE.Color(o.tint ?? 0xffffff).multiplyScalar(0.8).getHex()),
      inside(g),
      null,
      r,
    );
    for (const [c, a] of [
      [c00, o.ties && o.ties[0]],
      [c10, o.ties && o.ties[1]],
      [c11, o.ties && o.ties[2]],
      [c01, o.ties && o.ties[3]],
    ])
      if (a) rod(ROPE, null, c, a, 0.006, 4);
  }

  // ---- containers ----
  // open-topped box, 1 × 1 × 1 with its base on the origin: walls t thick, floor b thick.
  // Texture rows: 0.90–0.98 rim, 0.14–0.86 outside, 0.02–0.10 inside (see the "crate" tile).
  const openBox = (t = 0.06, b = 0.08) =>
    cached(`open${t}|${b}`, () => {
      const g = builder(),
        i = 0.5 - t;
      const ring = [
        [-0.5, 0.5],
        [0.5, 0.5],
        [0.5, -0.5],
        [-0.5, -0.5],
      ];
      for (let k = 0; k < 4; k++) {
        const [ax, az] = ring[k],
          [cx, cz] = ring[(k + 1) % 4];
        const ix = ax * 2 * i,
          iz = az * 2 * i,
          jx = cx * 2 * i,
          jz = cz * 2 * i;
        g.quad(
          [ax, 0, az],
          [cx, 0, cz],
          [cx, 1, cz],
          [ax, 1, az],
          0,
          0.14,
          1,
          0.86,
        );
        g.quad(
          [jx, b, jz],
          [ix, b, iz],
          [ix, 1, iz],
          [jx, 1, jz],
          0,
          0.02,
          1,
          0.1,
        );
        g.quad(
          [ax, 1, az],
          [cx, 1, cz],
          [jx, 1, jz],
          [ix, 1, iz],
          0,
          0.9,
          1,
          0.98,
        );
      }
      g.quad([-i, b, i], [i, b, i], [i, b, -i], [-i, b, -i], 0, 0.02, 1, 0.1);
      return g.done();
    });
  const CRATE_COLORS = [
    0x2a62c8, 0xc23a2a, 0x2f9a4a, 0xe0a020, 0xe06a1a, 0x8a8f96,
  ];
  // plastic crate; returns its frame and inner size for whatever goes in it
  function crate(P, x, y, z, yaw = 0, o = {}) {
    const w = o.w ?? 0.52,
      h = o.h ?? 0.3,
      d = o.d ?? 0.36;
    const C = at(P, x, y, z, o.tilt || 0, yaw, 0);
    put(
      mt(o.color ?? pick(CRATE_COLORS)),
      openBox(),
      at(C, 0, 0, 0, 0, 0, 0, w, h, d),
      R.crate,
    );
    return { C, w: w - 0.07, d: d - 0.07, h };
  }
  // styrofoam fish box, lidded or open and full of ice
  function foamBox(P, x, y, z, yaw = 0, o = {}) {
    const w = o.w ?? 0.6,
      h = o.h ?? 0.32,
      d = o.d ?? 0.42;
    const C = at(P, x, y, z, 0, yaw, 0);
    put(
      mt(o.tint ?? 0xffffff),
      openBox(0.05, 0.1),
      at(C, 0, 0, 0, 0, 0, 0, w, h, d),
      R.foam,
    );
    if (o.lid)
      ob(
        mt(0xf2f4ee),
        C,
        o.lid === 2 ? 0.12 : 0,
        h + 0.02,
        o.lid === 2 ? 0.05 : 0,
        w + 0.01,
        0.04,
        d + 0.01,
        o.lid === 2 ? 0.3 : 0,
        0,
        0,
        R.foam,
      );
    else if (o.ice !== false)
      bx(
        gl(0xeaf4f8),
        C,
        -w / 2 + 0.03,
        h - 0.07,
        -d / 2 + 0.03,
        w / 2 - 0.03,
        h - 0.035,
        d / 2 - 0.03,
        R.ice,
      );
    return { C, w: w - 0.08, d: d - 0.08, h: h - 0.035 };
  }
  // stainless tray (level or tilted towards the customer)
  function tray(P, x, y, z, w, d, o = {}) {
    const tilt = o.tilt || 0,
      rim = o.rim ?? 0.06;
    const Tm = at(P, x, y + (Math.sin(tilt) * d) / 2, z, tilt, o.yaw || 0, 0);
    kit.add(galvI, openBox(0.012, 0.15), at(Tm, 0, 0, 0, 0, 0, 0, w, rim, d));
    if (tilt)
      sbox(
        galvI,
        P,
        x,
        y + (Math.sin(tilt) * d) / 2 - 0.004,
        z - d / 2 + 0.04,
        w - 0.12,
        Math.sin(tilt) * d - 0.01,
        0.03,
      );
    return { T: Tm, w: w - 0.03, d: d - 0.03, y: rim * 0.15 };
  }
  // round things thrown on a wheel: bowls, tubs, buckets, jars
  const bowlG = lathe(
    "bowl",
    [
      [0.82, 0],
      [1, 1],
    ],
    10,
  );
  const basketG = lathe(
    "basket",
    [
      [0.05, 0.1],
      [0.8, 0],
      [1, 1],
    ],
    10,
  );
  const jarG = lathe(
    "jar",
    [
      [0.72, 0],
      [1, 0.08],
      [1, 0.68],
      [0.62, 0.86],
      [0.62, 0.93],
    ],
    8,
  );
  const urnG = lathe(
    "urn",
    [
      [0.5, 0],
      [0.95, 0.3],
      [1, 0.55],
      [0.8, 0.85],
      [0.55, 0.95],
      [0.64, 1],
    ],
    10,
  );
  const bottleG = lathe(
    "bottle",
    [
      [0.9, 0],
      [1, 0.05],
      [1, 0.55],
      [0.42, 0.8],
      [0.36, 1],
    ],
    6,
  );
  const sackG = lathe(
    "sack",
    [
      [0.78, 0],
      [1, 0.14],
      [0.97, 0.7],
      [0.84, 0.9],
      [0.94, 1],
    ],
    8,
  );
  const stoolG = lathe(
    "stool",
    [
      [1, 0],
      [0.78, 0.9],
      [0.84, 1],
      [0.02, 1],
    ],
    8,
  );
  // open vessel with an optional level surface inside (water, soy milk, a heap)
  function vessel(P, x, y, z, r, h, o = {}) {
    const g = o.geo || bowlG,
      mk = o.gloss === false ? mt : gl;
    const V = at(P, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0);
    put(mk(o.color ?? 0x1e62b4), g, at(V, 0, 0, 0, 0, 0, 0, r, h, r), o.tile);
    put(
      mk(o.inner ?? o.color ?? 0x1e62b4),
      inside(g),
      at(V, 0, 0, 0, 0, 0, 0, r, h, r),
      o.tile,
    );
    if (o.fill !== undefined)
      put(
        o.fill,
        disc(10),
        at(
          V,
          0,
          h * (o.level ?? 0.8),
          0,
          0,
          0,
          0,
          r * (0.82 + 0.18 * (o.level ?? 0.8)),
        ),
        o.fillTile,
      );
    return V;
  }
  // low dome of something granular
  const mound = (h, P, x, y, z, rx, ry, rz, r = R.grain) =>
    sp(h, P, x, y, z, rx, ry, rz, r, rnd(6), 0, 0, dome(8));
  const dome = (seg = 6) =>
    cached(
      "dome" + seg,
      () =>
        new THREE.SphereGeometry(1, seg, 2, 0, Math.PI * 2, 0, Math.PI * 0.62),
    );

  // ---- produce ----
  const centred = (g) => g.clone().translate(0, -0.5, 0);
  const taperG = centred(
    lathe(
      "taper",
      [
        [0.03, 0],
        [0.62, 0.3],
        [1, 0.76],
        [0.8, 0.96],
        [0.12, 1],
      ],
      5,
    ),
  );
  const leafyG = centred(
    lathe(
      "leafy",
      [
        [0.3, 0],
        [0.78, 0.12],
        [0.45, 0.38],
        [1, 0.82],
        [0.55, 1],
        [0.03, 1],
      ],
      6,
    ),
  );
  // s: radii of a round thing, or [thickness, length, width] of a long one lying down
  const PRODUCE = {
    orange: {
      r: "citrus",
      s: [0.04, 0.038, 0.04],
      c: [0xf28a1a, 0xee7a12, 0xf59c30],
    },
    mandarin: {
      r: "citrus",
      s: [0.031, 0.026, 0.031],
      c: [0xf7931e, 0xf08418],
    },
    lemon: { r: "citrus", s: [0.028, 0.034, 0.028], c: [0xf2d43a, 0xe9c930] },
    lime: { r: "citrus", s: [0.026, 0.025, 0.026], c: [0x6f9a2e, 0x86a83a] },
    pomelo: {
      r: "citrus",
      s: [0.08, 0.086, 0.08],
      c: [0xd9d46a, 0xc9cf62, 0xe2d878],
      big: 1,
    },
    lychee: {
      r: "citrus",
      s: [0.019, 0.02, 0.019],
      c: [0xb03a3a, 0xc24a40, 0x9a3038],
    },
    apple: {
      r: "apple",
      s: [0.038, 0.036, 0.038],
      c: [0xffffff, 0xf0dcdc],
      gloss: 1,
    },
    greenapple: {
      r: "pear",
      s: [0.038, 0.036, 0.038],
      c: [0xb9d86a, 0xa8cc5a],
      gloss: 1,
    },
    pear: { r: "pear", s: [0.041, 0.047, 0.041], c: [0xffffff, 0xf4ecd0] },
    tomato: {
      r: "tomato",
      s: [0.035, 0.03, 0.035],
      c: [0xffffff, 0xffe0d0],
      gloss: 1,
    },
    melon: {
      r: "melon",
      s: [0.115, 0.115, 0.145],
      c: [0xffffff, 0xe0f0e0],
      big: 1,
      gloss: 1,
    },
    dragon: { r: "dragon", s: [0.046, 0.058, 0.046], c: [0xffffff, 0xf0d0e0] },
    hami: {
      r: "netted",
      s: [0.078, 0.078, 0.105],
      c: [0xffffff, 0xe8f0c0],
      big: 1,
    },
    cabbage: {
      r: "cabbage",
      s: [0.088, 0.072, 0.088],
      c: [0xffffff, 0xe6f0d0],
      big: 1,
    },
    onion: {
      r: "onion",
      s: [0.037, 0.034, 0.037],
      c: [0xd9a050, 0xc98a3a, 0xe0b060],
    },
    redonion: {
      r: "onion",
      s: [0.037, 0.034, 0.037],
      c: [0x9a4a6a, 0x8a3a5a],
      gloss: 1,
    },
    garlic: { r: "onion", s: [0.025, 0.023, 0.025], c: [0xffffff, 0xf0e8e0] },
    potato: { r: "potato", s: [0.046, 0.033, 0.037], c: [0xffffff, 0xe6d6c0] },
    taro: { r: "potato", s: [0.055, 0.05, 0.05], c: [0x8a6a5a, 0x7a5a4a] },
    egg: {
      r: "smooth",
      s: [0.021, 0.027, 0.021],
      c: [0xe9c9a0, 0xd9b088, 0xf4ecdc],
    },
    daikon: {
      r: "root",
      g: taperG,
      s: [0.034, 0.3, 0.034],
      c: [0xffffff],
      long: 1,
    },
    carrot: {
      r: "root",
      g: taperG,
      s: [0.018, 0.19, 0.018],
      c: [0xf07a1a, 0xe66a12],
      long: 1,
    },
    bokchoy: {
      r: "leafy",
      g: leafyG,
      s: [0.03, 0.2, 0.058],
      c: [0xffffff, 0xe8f4e0],
      long: 1,
    },
    choysum: {
      r: "leafy",
      g: leafyG,
      s: [0.022, 0.28, 0.038],
      c: [0xb0d890, 0xa0c880],
      long: 1,
    },
    eggplant: {
      r: "eggplant",
      s: [0.023, 0.13, 0.023],
      c: [0xffffff],
      long: 1,
      gloss: 1,
      half: 1,
    },
    bitter: {
      r: "bitter",
      s: [0.03, 0.12, 0.03],
      c: [0xffffff, 0xe0f0c0],
      long: 1,
      half: 1,
    },
    cucumber: {
      r: "bitter",
      s: [0.02, 0.1, 0.02],
      c: [0x5a8a4a, 0x4a7a3a],
      long: 1,
      half: 1,
      gloss: 1,
    },
  };
  // one fruit or vegetable. Packed ones are the upper dome only (nobody sees under them);
  // loose ones (full) are whole.
  function item(P, kind, x, y, z, yaw = 0, full = false) {
    const d = PRODUCE[kind];
    const h = (d.gloss ? gl : mt)(pick(d.c));
    if (d.long)
      put(
        h,
        d.g || ball(6, 4),
        at(
          P,
          x,
          y,
          z,
          0,
          yaw + rnd(-0.22, 0.22),
          HALF + rnd(-0.07, 0.07),
          d.s[0],
          d.s[1],
          d.s[2],
        ),
        R[d.r],
      );
    else if (full)
      put(
        h,
        d.big ? ball(8, 5) : ball(6, 4),
        at(
          P,
          x,
          y,
          z,
          rnd(-1.4, 1.4),
          rnd(6.28),
          rnd(-1.4, 1.4),
          d.s[0],
          d.s[1],
          d.s[2],
        ),
        R[d.r],
      );
    else
      put(
        h,
        dome(d.big ? 8 : 6),
        at(
          P,
          x,
          y,
          z,
          rnd(-0.45, 0.45),
          rnd(6.28),
          rnd(-0.45, 0.45),
          d.s[0],
          d.s[1],
          d.s[2],
        ),
        R[d.r],
      );
  }
  // fills a rectangle of the frame with produce: a packed layer, then a thinner one on top
  function heap(P, kind, xa, za, xb, zb, y, o = {}) {
    const d = PRODUCE[kind];
    const yaw = o.yaw ?? HALF,
      layers = o.layers ?? 2;
    let fx, fz, fy;
    if (d.long) {
      const len = d.half ? d.s[1] * 2 : d.s[1],
        alongX = Math.abs(Math.cos(yaw)) > 0.5;
      fx = alongX ? len : d.s[2] * 2;
      fz = alongX ? d.s[2] * 2 : len;
      fy = d.s[0] * 2;
    } else {
      fx = d.s[0] * 2;
      fz = d.s[2] * 2;
      fy = d.s[1] * 2;
    }
    fx *= 0.97;
    fz *= d.long ? 0.97 : 0.9;
    for (let L = 0; L < layers; L++) {
      const xa2 = xa + L * fx * 0.5,
        xb2 = xb - L * fx * 0.5,
        za2 = za + L * fz * 0.5,
        zb2 = zb - L * fz * 0.5;
      const nx = Math.floor((xb2 - xa2) / fx + 0.25),
        nz = Math.floor((zb2 - za2) / fz + 0.25);
      if (nx < 1 || nz < 1) break;
      const top = L === layers - 1 || nx < 3 || nz < 3;
      const sx = (xb2 - xa2) / nx,
        sz = (zb2 - za2) / nz;
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          if (!top && i > 0 && i < nx - 1 && j > 0 && j < nz - 1) continue; // buried
          if (L > 0 && rnd() < (o.gaps ?? 0.25)) continue; // sold off the top
          const jx = d.long ? 0.06 : 0.16;
          item(
            P,
            kind,
            xa2 +
              (i + 0.5 + ((j % 2) - 0.5) * (d.long ? 0 : 0.3) + rnd(-jx, jx)) *
                sx,
            y +
              fy * (d.long || o.whole ? 0.5 : 0.12) +
              L * fy * 0.8 +
              rnd(0, fy * 0.08),
            za2 + (j + 0.5 + rnd(-jx, jx)) * sz,
            yaw,
            !!o.whole,
          );
        }
    }
  }
  // a crate or basket of something, with its price
  function crateOf(P, kind, x, y, z, yaw = 0, o = {}) {
    const k = crate(P, x, y, z, yaw, o);
    heap(
      k.C,
      kind,
      -k.w / 2,
      -k.d / 2,
      k.w / 2,
      k.d / 2,
      k.h * (o.fill ?? 0.72),
      { layers: o.layers ?? 1, gaps: 0.1, yaw: o.itemYaw },
    );
    if (o.card)
      card(k.C, o.card, rnd(-0.1, 0.1), k.h * 0.8, -k.d / 2 + 0.03, {
        stick: 0.2,
      });
    return k;
  }
  function basketOf(P, kind, x, y, z, r = 0.24, o = {}) {
    const V = vessel(P, x, y, z, r, o.h ?? 0.09, {
      geo: basketG,
      gloss: false,
      color: 0xffffff,
      tile: R.wicker,
      rx: o.tilt || 0,
      ry: o.yaw || 0,
    });
    const q = r * 0.62;
    if (o.grain)
      mound(mt(o.grain), V, 0, 0.03, 0, r * 0.86, o.rise ?? 0.07, r * 0.86);
    else
      heap(V, kind, -q, -q, q, q, 0.03, {
        layers: o.layers ?? 2,
        yaw: o.itemYaw,
      });
    if (o.card) card(V, o.card, 0, 0.06, -q * 0.9, { stick: 0.18 });
    return V;
  }

  // ---- fish ----
  // one fish, 1 long, nose at -x: seven rings of six round a spine, fins as flat webs
  const fishG = (deep, fat, tail, bend) =>
    cached(`fish${deep}|${fat}|${tail}|${bend}`, () => {
      const g = builder();
      const ts = [0, 0.07, 0.2, 0.4, 0.6, 0.76, 0.86],
        hy = [0.04, 0.5, 0.88, 1, 0.8, 0.42, 0.16],
        hz = [0.04, 0.62, 0.95, 1, 0.72, 0.34, 0.08];
      const N = 6;
      const off = (t) => bend * (t - 0.4) * (t - 0.4);
      ts.forEach((t, i) => {
        for (let k = 0; k < N; k++) {
          const a = (k / N) * 6.2832;
          g.vert(
            [
              t - 0.45,
              Math.cos(a) * hy[i] * deep,
              Math.sin(a) * hz[i] * fat + off(t),
            ],
            t,
            (1 + Math.cos(a)) / 2,
          );
        }
      });
      for (let i = 0; i < ts.length - 1; i++)
        for (let k = 0; k < N; k++) {
          const a = i * N + k,
            b = i * N + ((k + 1) % N),
            c = a + N,
            d = b + N;
          g.tri(a, b, c);
          g.tri(b, d, c);
        }
      // tail (forked) and dorsal fin, each drawn from both sides
      const web = (pts) => {
        for (const order of [
          [0, 1, 2],
          [0, 2, 1],
        ]) {
          const v = pts.map(([x, y, u, w]) =>
            g.vert([x - 0.45, y, off(x)], u, w),
          );
          g.tri(v[order[0]], v[order[1]], v[order[2]]);
        }
      };
      const rt = [0.86, 0.16 * deep, 0.87, 0.75],
        rb = [0.86, -0.16 * deep, 0.87, 0.25],
        nt = [0.93, 0, 0.93, 0.5];
      web([rt, [1, tail, 0.99, 0.95], nt]);
      web([rt, nt, rb]);
      web([rb, nt, [1, -tail, 0.99, 0.05]]);
      web([
        [0.24, 0.92 * deep, 0.88, 0.9],
        [0.5, 1.5 * deep, 0.95, 0.6],
        [0.66, 0.74 * deep, 0.99, 0.9],
      ]);
      return g.done();
    });
  // species: [texture, body depth, thickness, tail spread, length]
  const FISH = {
    snapper: ["fish_snapper", 0.18, 0.055, 0.13, 0.3],
    croaker: ["fish_croaker", 0.12, 0.05, 0.1, 0.3],
    mullet: ["fish_mullet", 0.1, 0.052, 0.1, 0.36],
    mackerel: ["fish_mackerel", 0.095, 0.048, 0.11, 0.33],
    grouper: ["fish_grouper", 0.16, 0.075, 0.11, 0.42],
    pomfret: ["fish_pomfret", 0.3, 0.035, 0.17, 0.24],
  };
  // a fish lying on its side on a surface of frame P, head towards yaw
  function fish(P, kind, x, y, z, yaw, o = {}) {
    const [tex, deep, fat, tail, len] = FISH[kind];
    const L = len * (o.scale ?? rnd(0.88, 1.1));
    put(
      (o.dry ? mt : gl)(o.tint ?? 0xffffff),
      fishG(deep, fat, tail, pick([-0.5, 0, 0.35, 0.6])),
      at(
        P,
        x,
        y + fat * L * 0.8,
        z,
        (rnd() < 0.5 ? -1 : 1) * (HALF - (o.lean ?? 0.22)),
        yaw,
        0,
        L,
      ),
      R[tex],
    );
    return L;
  }
  // shingles a tray with one kind of fish, heads down the slope
  function fishOn(t, kind, o = {}) {
    const [, deep, , , len] = FISH[kind];
    const step = deep * len * (o.step ?? 1.25),
      rows = Math.max(1, Math.floor((t.d - 0.04) / (len * 0.95)));
    for (let r = 0; r < rows; r++) {
      const zc = -t.d / 2 + ((r + 0.5) * t.d) / rows + 0.02;
      for (
        let x = -t.w / 2 + step * 0.9;
        x < t.w / 2 - step * 0.6;
        x += step * rnd(0.92, 1.12)
      ) {
        if (rnd() < (o.gaps ?? 0.12)) continue;
        fish(
          t.T,
          kind,
          x,
          t.y + 0.035,
          zc + rnd(-0.02, 0.02),
          HALF + rnd(-0.12, 0.12),
        );
      }
    }
  }
  const squidG = centred(
    lathe(
      "squid",
      [
        [0.05, 0],
        [0.5, 0.12],
        [1, 0.5],
        [0.9, 0.62],
        [0.45, 0.66],
        [0.6, 0.8],
        [0.2, 1],
      ],
      6,
    ),
  );
  // crushed ice in a tray, heaped a little
  function iceIn(t, o = {}) {
    bx(
      gl(o.tint ?? 0xeaf4f8),
      t.T,
      -t.w / 2,
      t.y,
      -t.d / 2,
      t.w / 2,
      t.y + 0.03,
      t.d / 2,
      R.ice,
    );
    for (let i = 0; i < (o.lumps ?? 4); i++)
      sp(
        gl(0xffffff),
        t.T,
        rnd(-t.w / 2 + 0.1, t.w / 2 - 0.1),
        t.y + 0.02,
        rnd(-t.d / 2 + 0.1, t.d / 2 - 0.1),
        rnd(0.07, 0.14),
        0.03,
        rnd(0.07, 0.12),
        R.ice,
        rnd(6),
        0,
        0,
        dome(6),
      );
  }

  // ---- meat ----
  // rounded slab: a squared-off sphere, the flat faces mapped straight on
  const pillowG = cached("pillow", () => {
    const g = new THREE.SphereGeometry(1, 8, 6);
    const p = g.attributes.position,
      uv = g.attributes.uv;
    const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.5);
    for (let i = 0; i < p.count; i++) {
      const x = sq(p.getX(i)),
        y = sq(p.getY(i));
      p.setXYZ(i, x, y, p.getZ(i));
      uv.setXY(i, 0.5 + x * 0.47, 0.5 + y * 0.47);
    }
    g.computeVertexNormals();
    return g;
  });
  const legG = lathe(
    "leg",
    [
      [0.02, -1],
      [0.7, -0.96],
      [1, -0.8],
      [0.95, -0.55],
      [0.5, -0.3],
      [0.28, -0.14],
      [0.34, -0.05],
      [0.2, 0],
    ],
    8,
  );
  const birdG = lathe(
    "bird",
    [
      [0.02, -1],
      [0.6, -0.95],
      [1, -0.7],
      [0.9, -0.42],
      [0.45, -0.2],
      [0.2, -0.08],
      [0.16, 0],
    ],
    8,
  );
  // something hanging from a hook on a rail at (x, y, z)
  function hang(P, kind, x, y, z, yaw = rnd(-0.5, 0.5)) {
    // S-hook
    srod(galvI, P, [x, y + 0.012, z], [x + 0.02, y - 0.05, z], 0.004, 4);
    srod(galvI, P, [x + 0.02, y - 0.05, z], [x, y - 0.1, z], 0.004, 4);
    const H = at(P, x, y - 0.1, z, rnd(-0.06, 0.06), yaw, rnd(-0.06, 0.06));
    const s = rnd(0.9, 1.12);
    const raw = gl(0xa2948e); // hung meat sits close under the lamps: keep it from glowing
    if (kind === "leg")
      put(
        raw,
        legG,
        at(H, 0, 0, 0, 0, 0, 0, 0.1 * s, 0.56 * s, 0.085 * s),
        R.leg,
      );
    else if (kind === "belly")
      put(
        raw,
        pillowG,
        at(H, 0, -0.27 * s, 0, 0, 0, 0, 0.15 * s, 0.26 * s, 0.03),
        R.belly,
      );
    else if (kind === "ribs")
      put(
        raw,
        pillowG,
        at(H, 0, -0.3 * s, 0, 0, 0, 0.05, 0.2 * s, 0.29 * s, 0.028),
        R.ribs,
      );
    else if (kind === "side")
      put(
        raw,
        pillowG,
        at(H, 0, -0.5 * s, 0, 0, 0, 0, 0.23 * s, 0.5 * s, 0.05),
        R.ribs,
      );
    else if (kind === "loin")
      put(
        raw,
        pillowG,
        at(H, 0, -0.24 * s, 0, 0, 0, 0, 0.09 * s, 0.24 * s, 0.07),
        R.marble,
      );
    else if (kind === "liver")
      put(
        gl(0x6a1a1c),
        pillowG,
        at(H, 0, -0.16 * s, 0, 0, 0, 0.2, 0.11 * s, 0.15 * s, 0.03),
      );
    else if (kind === "bird" || kind === "duck") {
      const c = kind === "duck" ? 0xf0d6b0 : 0xffffff,
        k = kind === "duck" ? 1.2 : 1;
      put(
        gl(c),
        birdG,
        at(H, 0, -0.03, 0, 0, 0, 0, 0.085 * s * k, 0.34 * s * k, 0.07 * s * k),
        R.poultry,
      );
      sp(gl(c), H, 0, 0, 0, 0.022, 0.035, 0.026, R.poultry); // head
      rod(mt(0xd9a02a), H, [0.008, 0.02, 0.02], [0.012, -0.01, 0.05], 0.006, 4); // beak
      for (const sd of [-1, 1]) {
        sp(
          gl(c),
          H,
          sd * 0.07 * s * k,
          -0.19 * s * k,
          0,
          0.022,
          0.09 * k,
          0.045,
          R.poultry,
          0,
          0,
          sd * 0.25,
        ); // wing
        sp(
          gl(c),
          H,
          sd * 0.045 * s * k,
          -0.3 * s * k,
          0.03,
          0.03,
          0.075 * k,
          0.03,
          R.poultry,
          0,
          0.5,
          sd * 0.3,
        ); // thigh
        rod(
          mt(0xd9a02a),
          H,
          [sd * 0.05, -0.34 * s * k, 0.06],
          [sd * 0.06, -0.43 * s * k, 0.05],
          0.006,
          4,
        ); // shank
      }
    } else if (kind === "sausage") {
      // a bunch of cured sausages tied in pairs
      for (let i = 0; i < 6; i++) {
        const a = rnd(6.28),
          r = rnd(0.01, 0.035);
        sp(
          gl(pick([0x7a1c16, 0x8a2a1a, 0x5a140f])),
          H,
          Math.cos(a) * r,
          -0.13 - rnd(0.04),
          Math.sin(a) * r,
          0.012,
          0.12,
          0.012,
          null,
          0,
          rnd(-0.1, 0.1),
          rnd(-0.1, 0.1),
          ball(5, 3),
        );
      }
      rod(ROPE, H, [0, 0, 0], [0, -0.03, 0], 0.012, 4);
    } else if (kind === "driedfish") {
      put(
        mt(0xc9a878),
        fishG(0.12, 0.03, 0.1, 0),
        at(H, 0, -0.17, 0, 0, 0, -HALF, 0.34),
        R.fish_mullet,
      );
    } else if (kind === "bags") {
      // a fat bunch of carrier bags
      const c = pick([0xe0484a, 0xf1eee6, 0xe86a9a]);
      for (let i = 0; i < 3; i++)
        put(
          mt(c),
          pillowG,
          at(
            H,
            rnd(-0.01, 0.01),
            -0.21 * s,
            (i - 1) * 0.014,
            0,
            0,
            rnd(-0.05, 0.05),
            0.12 * s,
            0.2 * s,
            0.012,
          ),
          R.folds,
        );
    } else if (kind === "garlic") {
      for (let i = 0; i < 9; i++)
        sp(
          mt(0xf0e8dc),
          H,
          rnd(-0.03, 0.03),
          -0.05 - i * 0.045,
          rnd(-0.03, 0.03),
          0.028,
          0.026,
          0.028,
          R.onion,
        );
    }
  }
  // overhead rail on drop rods, hung with whatever the list says ("" leaves a bare hook)
  function rail(P, xa, xb, z, y, list, o = {}) {
    srod(galvI, P, [xa, y, z], [xb, y, z], 0.016, 6);
    const n = Math.max(2, Math.round((xb - xa) / 1.6));
    for (let i = 0; i <= n; i++)
      srod(
        galvI,
        P,
        [xa + ((xb - xa) * i) / n, y, z],
        [xa + ((xb - xa) * i) / n, o.top ?? EAVE, z],
        0.008,
        4,
      );
    const step = (xb - xa - 0.3) / list.length;
    list.forEach((kind, i) => {
      const x = xa + 0.15 + (i + 0.5) * step + rnd(-0.05, 0.05);
      if (kind) hang(P, kind, x, y - 0.016, z);
      else {
        srod(galvI, P, [x, y, z], [x + 0.02, y - 0.06, z], 0.004, 4);
        srod(galvI, P, [x + 0.02, y - 0.06, z], [x, y - 0.11, z], 0.004, 4);
      }
    });
  }
  // round chopping block with a cleaver left in it
  function block(P, x, y, z, r = 0.2, h = 0.14) {
    kit.cyl(woodDark, ...world(P, [x, y, z]), r, h, { seg: 12 });
    put(mt(), disc(12), at(P, x, y + h + 0.002, z, 0, rnd(6), 0, r), R.woodEnd);
    const Cv = at(
      P,
      x + rnd(-0.05, 0.05),
      y + h,
      z + rnd(-0.04, 0.04),
      0,
      rnd(6),
      rnd(-0.3, 0.3),
    );
    kit.add(galvI, BOX, at(Cv, 0, 0.05, 0, 0, 0, 0, 0.2, 0.1, 0.005));
    ob(mt(0x3a2414), Cv, 0.16, 0.085, 0, 0.13, 0.03, 0.024);
  }
  // hanging spring scale with its pan
  function hangScale(P, x, y, z, yaw = 0) {
    const S = at(P, x, y, z, 0, yaw, 0);
    rod(CHAIN, S, [0, 0, 0], [0, 0.35, 0], 0.005, 4);
    put(
      mt(0xc23a2a),
      tubeG(12),
      at(S, 0, -0.11, 0, HALF, 0, 0, 0.11, 0.06, 0.11),
    );
    put(mt(), disc(12), at(S, 0, -0.11, 0.032, HALF, 0, 0, 0.095), R.dial);
    for (let i = 0; i < 3; i++)
      rod(
        CHAIN,
        S,
        [0, -0.22, 0],
        [Math.cos(i * 2.094) * 0.16, -0.5, Math.sin(i * 2.094) * 0.16],
        0.003,
        3,
      );
    kit.add(galvI, bowlG, at(S, 0, -0.5, 0, Math.PI, 0, 0, 0.19, 0.05, 0.19));
    kit.add(
      galvI,
      inside(bowlG),
      at(S, 0, -0.5, 0, Math.PI, 0, 0, 0.19, 0.05, 0.19),
    );
  }
  // platform scale standing on a counter
  function counterScale(P, x, y, z, yaw = 0) {
    const S = at(P, x, y, z, 0, yaw, 0);
    bx(mt(0x2f7a8a), S, -0.14, 0, -0.12, 0.14, 0.08, 0.12);
    kit.add(galvI, BOX, at(S, 0, 0.1, 0, 0, 0, 0, 0.3, 0.012, 0.26));
    bx(mt(0x2f7a8a), S, -0.03, 0.08, -0.16, 0.03, 0.34, -0.12);
    put(
      mt(0x2f7a8a),
      tubeG(12),
      at(S, 0, 0.4, -0.14, HALF, 0, 0, 0.11, 0.05, 0.11),
    );
    put(mt(), disc(12), at(S, 0, 0.4, -0.112, HALF, 0, 0, 0.098), R.dial);
  }

  // ---- stall furniture ----
  // tiled counter with a stainless top; returns the height of the top
  function counter(P, ax, az, cx, cz, h = 0.86) {
    wbox(counterTile, P, ax, 0, az, cx, h, cz);
    wbox(galvI, P, ax - 0.03, h, az - 0.03, cx + 0.03, h + 0.035, cz + 0.03, {
      skip: "",
    });
    solid(P, ax, 0, az, cx, h + 0.035, cz);
    return h + 0.035;
  }
  // stepped timber display stand rising away from the customer; returns the step tops
  // as [z front, z back, height]
  function stand(P, xa, xb, zf, steps, o = {}) {
    const d = o.depth ?? 0.42,
      h0 = o.h0 ?? 0.52,
      rise = o.rise ?? 0.3;
    const out = [];
    for (let k = 0; k < steps; k++) {
      const za = zf - k * d,
        zb2 = za - d,
        h = h0 + k * rise;
      wbox(woodI, P, xa, h - 0.04, zb2, xb, h, za, { skip: "" });
      // painted apron below the step
      bx(
        mt(o.apron ?? 0x2f6a4a),
        P,
        xa,
        k ? h - rise : 0,
        za - 0.02,
        xb,
        h - 0.04,
        za,
      );
      out.push([za, zb2, h]);
    }
    bx(DARK, P, xa, 0, zf - steps * d, xa + 0.02, h0 + (steps - 1) * rise, zf);
    bx(DARK, P, xb - 0.02, 0, zf - steps * d, xb, h0 + (steps - 1) * rise, zf);
    solid(P, xa, 0, zf - steps * d, xb, h0 + (steps - 1) * rise, zf, "wood");
    return out;
  }
  // steel shelving against a wall
  function shelves(P, xa, xb, zb, d, hs) {
    for (const x of [xa, xb])
      for (const z of [zb, zb + d])
        srod(steelI, P, [x, 0, z], [x, hs[hs.length - 1] + 0.3, z], 0.014, 4);
    for (const h of hs)
      wbox(galvI, P, xa, h - 0.02, zb, xb, h, zb + d, { skip: "" });
    solid(P, xa, 0, zb, xb, hs[hs.length - 1], zb + d, "metal");
  }
  // stacked full sacks
  function sackPile(P, x, y, z, n, yaw = 0) {
    for (let i = 0; i < n; i++)
      put(
        mt(pick([0xffffff, 0xf0e8d8, 0xe6dcc8])),
        pillowG,
        at(
          P,
          x + rnd(-0.04, 0.04),
          y + 0.075 + i * 0.14,
          z + rnd(-0.04, 0.04),
          HALF,
          yaw + rnd(-0.15, 0.15),
          0,
          0.2,
          0.34,
          0.085,
        ),
        R.sack,
      );
  }
  // open sack standing on the floor, heaped with something
  function sackOf(P, x, y, z, tintC, o = {}) {
    const r = o.r ?? 0.2,
      h = o.h ?? 0.46;
    put(
      mt(o.sack ?? 0xf0e8d8),
      sackG,
      at(P, x, y, z, 0, rnd(6), 0, r, h, r),
      R.sack,
    );
    mound(mt(tintC), P, x, y + h * 0.88, z, r * 0.9, 0.09, r * 0.9);
    if (o.card) card(P, o.card, x, y + h * 0.95, z, { stick: 0.2 });
  }
  function jar(P, x, y, z, r, h, c, lid = 0xb3161a) {
    put(gl(c), jarG, at(P, x, y, z, 0, rnd(6), 0, r, h, r));
    put(
      mt(lid),
      tubeG(8),
      at(P, x, y + h * 0.96, z, 0, 0, 0, r * 0.68, h * 0.1, r * 0.68),
    );
  }
  function bottle(P, x, y, z, c = 0x1a0f0a, cap = 0xb3161a) {
    put(gl(c), bottleG, at(P, x, y, z, 0, 0, 0, 0.035, 0.26, 0.035));
    put(mt(cap), tubeG(6), at(P, x, y + 0.27, z, 0, 0, 0, 0.014, 0.025, 0.014));
    ob(mt(), P, x, y + 0.09, z + 0.0355, 0.05, 0.06, 0.002, 0, 0, 0, R.label);
  }
  // plastic stool, upright or kicked over
  function stool(P, x, z, o = {}) {
    const c = o.color ?? 0xc23a2a;
    const Sm = o.over
      ? at(P, x, 0.15, z, HALF * 0.98, o.yaw ?? rnd(6), 0)
      : at(P, x, 0, z, 0, rnd(6), 0);
    put(gl(c), stoolG, at(Sm, 0, 0, 0, 0, 0, 0, 0.17, 0.44, 0.17));
    put(gl(c), inside(stoolG), at(Sm, 0, 0, 0, 0, 0, 0, 0.17, 0.44, 0.17));
  }
  // bucket with a wire handle
  function bucket(P, x, y, z, c, o = {}) {
    const V = vessel(P, x, y, z, o.r ?? 0.15, o.h ?? 0.28, {
      color: c,
      fill: o.fill,
      level: o.level,
      rx: o.rx,
      ry: o.ry,
    });
    rod(
      CHAIN,
      V,
      [-(o.r ?? 0.15), (o.h ?? 0.28) * 0.95, 0],
      [0, (o.h ?? 0.28) * 0.75, 0.13],
      0.004,
      3,
    );
    rod(
      CHAIN,
      V,
      [o.r ?? 0.15, (o.h ?? 0.28) * 0.95, 0],
      [0, (o.h ?? 0.28) * 0.75, 0.13],
      0.004,
      3,
    );
    return V;
  }
  // wire cage for live birds
  function cage(P, x, y, z, w = 0.8, h = 0.42, d = 0.55, o = {}) {
    const C = at(P, x, y, z);
    bx(mt(0x4a4438), C, -w / 2, 0, -d / 2, w / 2, 0.025, d / 2);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        srod(
          galvI,
          C,
          [(sx * w) / 2, 0, (sz * d) / 2],
          [(sx * w) / 2, h, (sz * d) / 2],
          0.007,
          4,
        );
    const wire = dc(0xd0d4d0);
    plate(wire, C, 0, h / 2, d / 2, w, h, R.wire);
    pic(
      wire,
      C,
      [w / 2, 0, d / 2],
      [w / 2, 0, -d / 2],
      [w / 2, h, -d / 2],
      [w / 2, h, d / 2],
      R.wire,
    );
    pic(
      wire,
      C,
      [-w / 2, 0, -d / 2],
      [-w / 2, 0, d / 2],
      [-w / 2, h, d / 2],
      [-w / 2, h, -d / 2],
      R.wire,
    );
    pic(
      wire,
      C,
      [-w / 2, h, d / 2],
      [w / 2, h, d / 2],
      [w / 2, h, -d / 2],
      [-w / 2, h, -d / 2],
      R.wire,
    );
    // a bird or two, slumped
    for (let i = 0; i < (o.birds ?? 1); i++) {
      const bx2 = rnd(-w / 2 + 0.16, w / 2 - 0.16),
        bz = rnd(-0.1, 0.1),
        c = pick([0xf0ece0, 0xb07a48, 0xe6dccb, 0x5a4a3a]),
        yw = rnd(6);
      sp(mt(c), C, bx2, 0.1, bz, 0.1, 0.085, 0.14, R.smooth, yw);
      sp(
        mt(c),
        C,
        bx2 + Math.sin(yw) * 0.14,
        0.11,
        bz + Math.cos(yw) * 0.14,
        0.035,
        0.04,
        0.04,
        R.smooth,
      );
      ob(
        mt(0xb3161a),
        C,
        bx2 + Math.sin(yw) * 0.15,
        0.155,
        bz + Math.cos(yw) * 0.15,
        0.012,
        0.025,
        0.04,
        yw,
      );
    }
  }
  // steel hand sink on the wall with a tap and waste pipe
  function sink(P, x, z) {
    kit.add(
      galvI,
      openBox(0.03, 0.1),
      at(P, x, 0.72, z + 0.2, 0, 0, 0, 0.56, 0.2, 0.4),
    );
    srod(
      galvI,
      P,
      [x - 0.24, 0, z + 0.36],
      [x - 0.24, 0.72, z + 0.36],
      0.012,
      4,
    );
    srod(
      galvI,
      P,
      [x + 0.24, 0, z + 0.36],
      [x + 0.24, 0.72, z + 0.36],
      0.012,
      4,
    );
    rod(PVC, P, [x, 0.72, z + 0.2], [x, 0.3, z + 0.2], 0.022, 6);
    rod(PVC, P, [x, 0.3, z + 0.2], [x, 0.3, z + 0.02], 0.022, 6);
    // tap fed from the pipe run above
    rod(PVC, P, [x, 1.1, z + 0.03], [x, 2.75, z + 0.03], 0.014, 5);
    srod(galvI, P, [x, 1.1, z + 0.03], [x, 1.1, z + 0.16], 0.012, 5);
    srod(galvI, P, [x, 1.1, z + 0.16], [x, 1.02, z + 0.17], 0.012, 5);
    ob(mt(0xb3161a), P, x, 1.15, z + 0.06, 0.07, 0.015, 0.02);
    bx(gl(0xe9ecea), P, x - 0.32, 0.92, z, x + 0.32, 1.45, z + 0.008);
  }
  // column fan on a bracket, facing along +z of the frame
  function fan(P, x, y, z, yaw = 0, tilt = 0.25) {
    const Fm = at(P, x, y, z, tilt, yaw, 0);
    srod(steelI, Fm, [0, 0, -0.32], [0, 0, -0.1], 0.02, 5);
    put(
      mt(0x3c5a82),
      tubeG(8),
      at(Fm, 0, 0, -0.06, HALF, 0, 0, 0.08, 0.16, 0.08),
    );
    plate(dc(), Fm, 0, 0, 0.06, 0.62, 0.62, R.fan);
    plate(dc(), Fm, 0, 0, 0.0, 0.62, 0.62, R.fan);
    // the rim of the guard
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * 6.2832,
        a1 = ((i + 1) / 12) * 6.2832;
      rod(
        mt(0x9aa09a),
        Fm,
        [Math.cos(a0) * 0.3, Math.sin(a0) * 0.3, 0.03],
        [Math.cos(a1) * 0.3, Math.sin(a1) * 0.3, 0.03],
        0.012,
        3,
      );
    }
  }

  // steel frame over a stall (posts and a ring of rails) that its sheet, signs and lamps hang from
  const RAIL = 3.0;
  function stallFrame(xa, za, xb, zb, o = {}) {
    const h = o.h ?? RAIL;
    for (const [x, z] of [
      [xa, za],
      [xb, za],
      [xb, zb],
      [xa, zb],
    ])
      kit.rod(steelI, [x, K, z], [x, K + h, z], 0.022, { seg: 5 });
    kit.rod(steelI, [xa, K + h, za], [xb, K + h, za], 0.018, { seg: 5 });
    kit.rod(steelI, [xa, K + h, zb], [xb, K + h, zb], 0.018, { seg: 5 });
    kit.rod(steelI, [xa, K + h, za], [xa, K + h, zb], 0.018, { seg: 5 });
    kit.rod(steelI, [xb, K + h, za], [xb, K + h, zb], 0.018, { seg: 5 });
    if (o.sheet) {
      const e = o.over ?? 0.35,
        y = K + h + 0.06;
      canopy(
        [xa - e, y, za - e],
        [xb + e, y, za - e],
        [xb + e, y, zb + e],
        [xa - e, y, zb + e],
        o.sheet,
      );
    }
  }
  // rail in front of a wall stall, on brackets from the wall behind it
  function wallRail(P, xa, xb, z, depth, y = 2.7) {
    srod(steelI, P, [xa, y, z], [xb, y, z], 0.016, 5);
    const n = Math.max(1, Math.round((xb - xa) / 2.2));
    for (let i = 0; i <= n; i++) {
      const x = xa + ((xb - xa) * i) / n;
      srod(steelI, P, [x, y, z], [x, y + 0.45, -depth], 0.012, 4);
      srod(steelI, P, [x, y, z], [x, y, -depth], 0.012, 4);
    }
  }
  const F0 = frame(0, 0, "S"); // the hall floor in world x and z
  const CARD = (kind) => (R["card_" + kind] ? kind : null);
  // a row of goods along a display step, tipped towards the customer.
  // "kind" is a crate, "kind:b" a round basket, "kind:p" a loose pile, "" a gap
  function row(P, xa, xb, zc, y, goods, o = {}) {
    const sx = (xb - xa) / goods.length,
      tilt = o.tilt ?? 0.22;
    goods.forEach((g, i) => {
      if (!g) return;
      const x = xa + (i + 0.5) * sx + rnd(-0.03, 0.03);
      const [kind, how] = g.split(":");
      if (how === "b")
        basketOf(P, kind, x, y + 0.05, zc, Math.min(0.25, sx * 0.46), {
          tilt,
          card: CARD(kind),
        });
      else if (how === "p") {
        heap(P, kind, x - sx * 0.44, zc - 0.19, x + sx * 0.44, zc + 0.19, y, {
          whole: true,
          layers: 2,
          gaps: 0.3,
          yaw: 0,
        });
        if (CARD(kind)) card(P, CARD(kind), x, y, zc + 0.19, { stick: 0.24 });
      } else
        crateOf(P, kind, x, y + Math.sin(tilt) * 0.18, zc, rnd(-0.06, 0.06), {
          tilt,
          w: Math.min(0.56, sx - 0.05),
          card: CARD(kind),
          itemYaw: o.itemYaw,
        });
    });
  }
  // styrofoam boxes left on the floor in front of a stall (low: they can be vaulted)
  function floorBoxes(P, list) {
    for (const [x, z, yaw, o] of list) {
      const b = foamBox(P, x, 0, z, yaw, o || {});
      if (o && o.stack)
        foamBox(
          b.C,
          rnd(-0.03, 0.03),
          0.325,
          rnd(-0.03, 0.03),
          rnd(-0.2, 0.2),
          { lid: 1 },
        );
      solid(
        P,
        x - 0.26,
        0,
        z - 0.2,
        x + 0.26,
        o && o.stack ? 0.66 : 0.34,
        z + 0.2,
        "wood",
      );
    }
  }

  // ================= STALLS =================
  const D = 0.95; // depth of a counter

  // ---- 12, 14: fresh fish — a U of counters round a column, open to the east ----
  {
    const X0 = x0 + 15,
      X1 = x0 + 20.6,
      Z0 = z0 + 4.1,
      Z1 = z0 + 8.4;
    stallFrame(X0, Z0, X1, Z1, {
      sheet: { sag: 0.3, pool: 0.22, nx: 6, nz: 5 },
    });
    // west counter, on the main aisle
    const Pw = frame(X0, Z0, "W");
    const top = counter(Pw, 0, -D, Z1 - Z0, 0);
    ["snapper", "croaker", "mullet", "grouper"].forEach((k, i) => {
      const t = tray(Pw, 0.58 + i * 1.05, top, -D / 2 + 0.02, 1.0, 0.84, {
        tilt: 0.2,
      });
      iceIn(t);
      fishOn(t, k);
      card(t.T, k, rnd(-0.3, 0.3), t.y + 0.03, -t.d / 2 + 0.07, {
        stick: 0.17,
      });
    });
    stallSign(Pw, "fish", 2.15, 2.5, 0.05, 1.9, {
      top: RAIL,
      lit: true,
      color: 0xfff0d8,
    });
    tubeLight(Pw, 1.1, 2.72, -0.35, { top: RAIL, power: 1.5, range: 8 });
    tubeLight(Pw, 3.2, 2.72, -0.35, { top: RAIL, state: "dead" });
    hang(Pw, "bags", 0.25, RAIL - 0.5, 0.02);
    rod(CHAIN, Pw, [0.25, RAIL - 0.5, 0.02], [0.25, RAIL, 0.02], 0.004, 3);
    hangScale(Pw, 4.05, 2.3, -0.2, 0.4);
    rod(CHAIN, Pw, [4.05, 2.6, -0.2], [4.05, RAIL, -0.2], 0.004, 3);
    floorBoxes(Pw, [
      [0.45, 0.3, 0.1, { stack: 1 }],
      [1.15, 0.27, -0.08, {}],
      [1.85, 0.3, 0.05, { lid: 2 }],
    ]);
    fish(at(Pw, 1.15, 0.3, 0.27), "mullet", -0.05, 0, 0.0, 0.3);
    fish(at(Pw, 1.15, 0.3, 0.27), "mullet", 0.05, 0.02, 0.06, 0.2);
    // south counter: squid, pomfret, the block where they are gutted
    const Ps = frame(X0, Z1, "S");
    const W2 = X1 - X0;
    counter(Ps, D, -D, W2, 0);
    {
      const t = tray(Ps, 1.55, top, -D / 2 + 0.02, 1.0, 0.84, { tilt: 0.2 });
      iceIn(t);
      for (let i = 0; i < 12; i++)
        put(
          gl(pick([0xffffff, 0xf0dcdc])),
          squidG,
          at(
            t.T,
            rnd(-0.4, 0.4),
            t.y + 0.055 + rnd(0.02),
            rnd(-0.3, 0.3),
            0,
            rnd(-0.4, 0.4),
            HALF,
            0.028,
            0.24,
            0.05,
          ),
          R.squid,
        );
      card(t.T, "squid", 0.2, t.y + 0.03, -t.d / 2 + 0.07, { stick: 0.17 });
      const t2 = tray(Ps, 2.6, top, -D / 2 + 0.02, 1.0, 0.84, { tilt: 0.2 });
      iceIn(t2);
      fishOn(t2, "pomfret", { step: 0.62 });
      card(t2.T, "pomfret", -0.2, t2.y + 0.03, -t2.d / 2 + 0.07, {
        stick: 0.17,
      });
      const t3 = tray(Ps, 3.65, top, -D / 2 + 0.02, 1.0, 0.84, { tilt: 0.2 });
      iceIn(t3, { tint: 0xf4dcdc });
      fishOn(t3, "mackerel", { gaps: 0.3 });
    }
    block(Ps, 4.55, top, -0.5, 0.21, 0.13);
    ctx.blood(...world(Ps, [4.5, top + 0.004, -0.42]), 0.7, "pool");
    fish(Ps, "snapper", 4.56, top + 0.13, -0.5, 0.6, { lean: 0 });
    counterScale(Ps, 5.2, top, -0.45, -0.3);
    stallSign(Ps, "fish2", 3.0, 2.5, 0.05, 1.7, { top: RAIL });
    tubeLight(Ps, 2.1, 2.72, -0.35, { top: RAIL, power: 1.5, range: 8 });
    lamp(Ps, 4.6, 2.2, -0.45, {
      top: RAIL,
      shade: 0x2f7a5a,
      color: 0xfff0d0,
      power: 0.9,
    });
    // north counter: prawns, clams, boxes not yet unpacked
    const Pn = frame(X1, Z0, "N");
    counter(Pn, 0.5, -D, W2 - D, 0);
    {
      const t = tray(Pn, 1.2, top, -D / 2, 0.95, 0.8, { tilt: 0.16 });
      iceIn(t, { lumps: 2 });
      mound(gl(0xe08a6a), t.T, 0, t.y + 0.02, 0, 0.36, 0.09, 0.28);
      for (let i = 0; i < 14; i++)
        sp(
          gl(pick([0xe8917a, 0xd9775a, 0xf0a890])),
          t.T,
          rnd(-0.3, 0.3),
          t.y + 0.09 + rnd(0.02),
          rnd(-0.22, 0.22),
          0.011,
          0.045,
          0.014,
          R.smooth,
          rnd(6),
          0,
          HALF + rnd(-0.3, 0.3),
        );
      card(t.T, "shrimp", 0.25, t.y + 0.03, -t.d / 2 + 0.07, { stick: 0.17 });
      const v = vessel(Pn, 2.3, top, -0.48, 0.3, 0.17, {
        color: 0x1e62b4,
        fill: gl(0x243a3a),
        level: 0.62,
      });
      mound(gl(0x8a8272), v, 0.02, 0.1, 0, 0.24, 0.07, 0.22);
      card(v, "clam", 0.1, 0.12, -0.2, { stick: 0.2 });
      const t2 = tray(Pn, 3.35, top, -D / 2, 0.95, 0.8, { tilt: 0.16 });
      iceIn(t2);
      fishOn(t2, "croaker", { gaps: 0.35 });
      foamBox(Pn, 4.25, top, -0.5, 0.2, { lid: 1, w: 0.52, d: 0.4 });
    }
    lamp(Pn, 2.3, 2.2, -0.4, {
      top: RAIL,
      shade: 0x2f7a5a,
      color: 0xfff0d0,
      power: 0.9,
    });
    floorBoxes(Pn, [
      [1.0, 0.3, 0.05, { lid: 1 }],
      [3.9, 0.28, -0.1, {}],
    ]);
    // inside the U: water butt, gutting bench, hose
    vessel(F0, X1 - 0.75, 0, Z0 + 1.35, 0.3, 0.82, {
      color: 0x1e62b4,
      fill: gl(0x162a2c),
      level: 0.86,
      geo: lathe(
        "butt",
        [
          [0.86, 0],
          [1, 0.5],
          [0.9, 1],
        ],
        12,
      ),
    });
    kit.solid(X1 - 1.05, 0, Z0 + 1.05, X1 - 0.45, K + 0.82, Z0 + 1.65, "metal");
    bucket(F0, X0 + 1.5, 0, Z0 + 1.5, 0xc23a2a, {
      fill: gl(0x4a1416),
      level: 0.6,
    });
    stool(F0, X0 + 1.7, Z1 - 1.5, { color: 0x2a62c8 });
    // hose coiled on the column
    for (let i = 0; i < 4; i++) {
      const cxz = [x0 + 18 + 0.23, 1.25 + i * 0.03, z0 + 6.5];
      for (let k = 0; k < 10; k++) {
        const a0 = (k / 10) * 6.2832,
          a1 = ((k + 1) / 10) * 6.2832,
          r = 0.17 + i * 0.008;
        rod(
          mt(0x3a8a4a),
          F0,
          [
            cxz[0] + i * 0.012,
            cxz[1] + Math.cos(a0) * r,
            cxz[2] + Math.sin(a0) * r,
          ],
          [
            cxz[0] + i * 0.012,
            cxz[1] + Math.cos(a1) * r,
            cxz[2] + Math.sin(a1) * r,
          ],
          0.012,
          4,
        );
      }
    }
    light(F0, X0 + 2.8, 2.2, Z0 + 2.1, 0xd8fff0, 0.9, 6);
  }

  // ---- 3, 5: fresh meat — the same U, open to the west, under red lamps ----
  {
    const X0 = x0 + 3.4,
      X1 = x0 + 9,
      Z0 = z0 + 4.1,
      Z1 = z0 + 8.9;
    stallFrame(X0, Z0, X1, Z1);
    // east counter, on the main aisle
    const Pe = frame(X1, Z1, "E");
    const len = Z1 - Z0;
    const top = counter(Pe, 0, -D, len, 0);
    rail(
      Pe,
      0.15,
      len - 0.15,
      -0.28,
      2.02,
      ["leg", "belly", "ribs", "", "side", "loin", "leg", "liver", "belly", ""],
      { top: RAIL },
    );
    for (const x of [0.8, 2.4, 4.0])
      lamp(Pe, x, 2.4, 0.45, {
        top: RAIL,
        color: 0xff6a50,
        bulb: 0xffb090,
        power: 1.1,
        range: 6.5,
      });
    stallSign(Pe, "meat", 2.4, 2.72, 0.2, 1.8, { top: RAIL });
    // cuts laid out on steel
    const cuts = (P, x, z, w, d, n, kind) => {
      const t = tray(P, x, top, z, w, d, { rim: 0.04 });
      for (let i = 0; i < n; i++) {
        const cx2 = rnd(-w / 2 + 0.1, w / 2 - 0.1),
          cz2 = rnd(-d / 2 + 0.09, d / 2 - 0.09);
        if (kind === "chop")
          put(
            gl(),
            pillowG,
            at(
              t.T,
              cx2,
              t.y + 0.02 + i * 0.004,
              cz2,
              HALF,
              rnd(6),
              0,
              rnd(0.07, 0.1),
              rnd(0.05, 0.075),
              0.018,
            ),
            R.marble,
          );
        else if (kind === "rib")
          put(
            gl(),
            pillowG,
            at(
              t.T,
              cx2,
              t.y + 0.02 + i * 0.004,
              cz2,
              HALF,
              rnd(6),
              0,
              rnd(0.1, 0.13),
              0.06,
              0.02,
            ),
            R.ribs,
          );
        else if (kind === "belly")
          put(
            gl(),
            pillowG,
            at(
              t.T,
              cx2,
              t.y + 0.03 + i * 0.004,
              cz2,
              HALF,
              rnd(-0.3, 0.3),
              0,
              0.13,
              0.05,
              0.03,
            ),
            R.belly,
          );
        else if (kind === "offal")
          put(
            gl(pick([0x6a1a1c, 0x7a2a26, 0xc9a09a])),
            pillowG,
            at(
              t.T,
              cx2,
              t.y + 0.02 + i * 0.004,
              cz2,
              HALF,
              rnd(6),
              0,
              rnd(0.06, 0.1),
              rnd(0.05, 0.07),
              0.022,
            ),
          );
        else if (kind === "bone") {
          rod(
            gl(0xe6dcc6),
            t.T,
            [cx2 - 0.08, t.y + 0.03, cz2],
            [cx2 + 0.08, t.y + 0.035, cz2 + rnd(-0.05, 0.05)],
            0.014,
            5,
          );
          sp(
            gl(0x9a2a24),
            t.T,
            cx2,
            t.y + 0.035,
            cz2,
            0.05,
            0.02,
            0.03,
            R.marble,
          );
        }
      }
      return t;
    };
    card(
      cuts(Pe, 0.55, -0.42, 0.7, 0.6, 9, "chop").T,
      "ribs",
      0.2,
      0.02,
      -0.26,
      { stick: 0.17 },
    );
    cuts(Pe, 1.35, -0.42, 0.7, 0.6, 6, "rib");
    block(Pe, 2.25, top, -0.42, 0.23, 0.15);
    ctx.blood(...world(Pe, [2.2, top + 0.004, -0.3]), 0.9, "pool");
    card(
      cuts(Pe, 3.1, -0.42, 0.7, 0.6, 5, "belly").T,
      "belly",
      -0.2,
      0.02,
      -0.26,
      { stick: 0.17 },
    );
    {
      // mince, heaped
      const t = tray(Pe, 3.9, top, -0.42, 0.6, 0.5, { rim: 0.04 });
      mound(gl(0xc86a62), t.T, 0, t.y, 0, 0.24, 0.1, 0.19, R.marble);
    }
    counterScale(Pe, 4.45, top, -0.5, 0.25);
    hang(Pe, "bags", 4.72, RAIL - 0.45, 0.02);
    rod(CHAIN, Pe, [4.72, RAIL - 0.45, 0.02], [4.72, RAIL, 0.02], 0.004, 3);
    ctx.blood(...world(Pe, [1.6, 0.006, 0.5]), 1.5, "pool");
    // south counter, facing the lane door
    const Ps = frame(X0, Z1, "S");
    const W2 = X1 - X0;
    counter(Ps, 0, -D, W2 - D, 0);
    rail(
      Ps,
      0.15,
      W2 - D - 0.1,
      -0.28,
      2.02,
      ["ribs", "sausage", "sausage", "", "leg", "side", "belly", "sausage"],
      { top: RAIL },
    );
    for (const x of [1.1, 3.3])
      lamp(Ps, x, 2.4, 0.45, {
        top: RAIL,
        color: 0xff6a50,
        bulb: 0xffb090,
        power: 1.1,
        range: 6.5,
      });
    stallSign(Ps, "meat2", 2.3, 2.72, 0.2, 1.6, { top: RAIL });
    cuts(Ps, 0.6, -0.42, 0.8, 0.6, 8, "offal");
    cuts(Ps, 1.5, -0.42, 0.7, 0.6, 7, "bone");
    {
      // hand mincer clamped to the counter edge
      const Mi = at(Ps, 2.35, top, -0.2);
      kit.add(galvI, tubeG(8), at(Mi, 0, 0.16, 0, 0, 0, HALF, 0.05, 0.2, 0.05));
      kit.add(
        galvI,
        tubeG(8, true, 1.9),
        at(Mi, 0.03, 0.27, 0, 0, 0, 0, 0.045, 0.1, 0.045),
      );
      kit.add(galvI, BOX, at(Mi, 0.02, 0.07, 0, 0, 0, 0, 0.05, 0.14, 0.05));
      srod(galvI, Mi, [-0.1, 0.16, 0], [-0.16, 0.16, 0], 0.008, 4);
      srod(galvI, Mi, [-0.16, 0.16, 0], [-0.16, 0.05, 0.02], 0.008, 4);
      sp(mt(0x3a2414), Mi, -0.16, 0.04, 0.03, 0.022, 0.03, 0.022);
    }
    cuts(Ps, 3.2, -0.42, 0.8, 0.6, 7, "chop");
    hangScale(Ps, 4.3, 2.35, -0.15, -0.3);
    rod(CHAIN, Ps, [4.3, 2.65, -0.15], [4.3, RAIL, -0.15], 0.004, 3);
    // north counter: the back bench
    const Pn = frame(X1, Z0, "N");
    counter(Pn, D, -D, W2, 0);
    cuts(Pn, 1.6, -0.45, 0.8, 0.6, 6, "bone");
    cuts(Pn, 2.6, -0.45, 0.8, 0.6, 5, "offal");
    foamBox(Pn, 3.6, top, -0.45, 0.1, { lid: 1 });
    foamBox(Pn, 4.4, top, -0.45, -0.15, { tint: 0xf4dcdc });
    lamp(Pn, 2.2, 2.28, -0.3, {
      top: RAIL,
      color: 0xff6a50,
      bulb: 0xffb090,
      power: 1.0,
    });
    rail(Pn, 1.2, W2 - 0.2, -0.3, 2.02, ["", "leg", "", "ribs", ""], {
      top: RAIL,
    });
    // inside: the big block on its stand, bone tub, apron on the column
    kit.box(steelI, X0 + 1.0, K, Z0 + 1.35, X0 + 1.7, K + 0.5, Z0 + 2.05, {
      skip: "b",
    });
    kit.solid(X0 + 1.0, 0, Z0 + 1.35, X0 + 1.7, K + 0.82, Z0 + 2.05, "wood");
    block(F0, X0 + 1.35, 0.5, Z0 + 1.7, 0.3, 0.3);
    ctx.blood(X0 + 1.6, K + 0.006, Z0 + 2.6, 1.8, "pool");
    bucket(F0, X0 + 3.4, 0, Z0 + 1.7, 0x8a8f96, {
      fill: gl(0x5a1416),
      level: 0.7,
    });
    vessel(F0, X0 + 1.3, 0, Z1 - 1.7, 0.3, 0.3, { color: 0xc23a2a });
    for (let i = 0; i < 5; i++)
      rod(
        gl(0xe6dcc6),
        F0,
        [X0 + 1.2 + rnd(0.2), 0.12 + i * 0.03, Z1 - 1.8 + rnd(0.2)],
        [X0 + 1.3 + rnd(0.2), 0.3 + rnd(0.1), Z1 - 1.6 + rnd(0.2)],
        0.016,
        5,
      );
    {
      // apron left on a nail in the column
      const ax = x0 + 6 + 0.232,
        az = z0 + 6.5;
      pic(
        mt(0xc9c6b8),
        F0,
        [ax, 0.92, az + 0.19],
        [ax, 0.92, az - 0.19],
        [ax + 0.012, 1.62, az - 0.15],
        [ax + 0.012, 1.62, az + 0.15],
        R.folds,
      );
      rod(
        ROPE,
        F0,
        [ax + 0.012, 1.62, az - 0.13],
        [ax + 0.006, 1.82, az],
        0.004,
        3,
      );
      rod(
        ROPE,
        F0,
        [ax + 0.012, 1.62, az + 0.13],
        [ax + 0.006, 1.82, az],
        0.004,
        3,
      );
    }
    stool(F0, X0 + 3.6, Z1 - 1.6);
    // fly killer on the column
    bx(
      DARK,
      F0,
      x0 + 6 - 0.26,
      2.3,
      z0 + 6.5 - 0.2,
      x0 + 6 - 0.22,
      2.56,
      z0 + 6.5 + 0.2,
    );
    pic(
      em(0xffffff, 2.2),
      F0,
      [x0 + 6 - 0.262, 2.32, z0 + 6.5 - 0.18],
      [x0 + 6 - 0.262, 2.32, z0 + 6.5 + 0.18],
      [x0 + 6 - 0.262, 2.54, z0 + 6.5 + 0.18],
      [x0 + 6 - 0.262, 2.54, z0 + 6.5 - 0.18],
      R.zapper,
    );
    light(F0, x0 + 6 - 0.7, 2.4, z0 + 6.5, 0x6a5aff, 0.6, 4.5);
  }

  // ---- 16: live seafood — tanks two high along the north wall ----
  {
    const P = frame(x0 + 15.4, z0 + T + 1.15, "S");
    const len = 7.8;
    const TW = 1.08,
      TH = 0.52,
      TD = 0.5,
      zb = -1.12;
    const n = Math.floor(len / (TW + 0.03));
    for (let tier = 0; tier < 2; tier++) {
      const y = 0.42 + tier * 0.74;
      wbox(steelI, P, 0.05, y - 0.05, zb, len - 0.05, y, zb + TD + 0.04, {
        skip: "",
      });
      for (let i = 0; i < n; i++) {
        const xa = 0.1 + i * (TW + 0.03),
          xc = xa + TW / 2;
        const dry = tier === 1 && i === 4; // one cracked and drained
        const r = R["tank" + ((i + tier) % 2)];
        const k = dry ? 0.05 : 1.15 - tier * 0.15 + rnd(-0.15, 0.15);
        const g = em(pick([0xffffff, 0xe0fff0, 0xf0ffd8]), k);
        // lit water: back, ends, surface
        plate(g, P, xc, y + TH / 2, zb + 0.02, TW, TH, r);
        pic(
          g,
          P,
          [xa, y, zb + TD],
          [xa, y, zb],
          [xa, y + TH, zb],
          [xa, y + TH, zb + TD],
          r,
        );
        pic(
          g,
          P,
          [xa + TW, y, zb],
          [xa + TW, y, zb + TD],
          [xa + TW, y + TH, zb + TD],
          [xa + TW, y + TH, zb],
          r,
        );
        if (!dry)
          pic(
            em(0xbff5d2, 0.7),
            P,
            [xa, y + TH * 0.93, zb + TD],
            [xa + TW, y + TH * 0.93, zb + TD],
            [xa + TW, y + TH * 0.93, zb],
            [xa, y + TH * 0.93, zb],
          );
        bx(DARK, P, xa, y, zb, xa + TW, y + 0.03, zb + TD);
        // frame and front glass
        for (const [ax, ay, cx, cy] of [
          [xa, y, xa + TW, y + 0.025],
          [xa, y + TH - 0.025, xa + TW, y + TH],
          [xa, y, xa + 0.022, y + TH],
          [xa + TW - 0.022, y, xa + TW, y + TH],
        ])
          bx(DARK, P, ax, ay, zb + TD - 0.01, cx, cy, zb + TD + 0.012);
        plate(
          dc(),
          P,
          xc,
          y + TH / 2,
          zb + TD + 0.004,
          TW - 0.04,
          TH - 0.04,
          R.glass,
        );
        // what is left alive in it
        if (!dry)
          for (let f = 0; f < 3; f++) {
            const kind = pick(["grouper", "snapper", "mullet", "grouper"]);
            const [tex, deep, fat, tail, fl] = FISH[kind];
            const belly = rnd() < 0.25; // some float belly up
            put(
              gl(0xb0d8c0),
              fishG(deep, fat, tail, pick([-0.5, 0.35])),
              at(
                P,
                xa + rnd(0.2, TW - 0.2),
                y + (belly ? TH * 0.86 : rnd(0.1, TH - 0.14)),
                zb + rnd(0.14, TD - 0.1),
                belly ? Math.PI : 0,
                rnd() < 0.5 ? 0 : Math.PI,
                0,
                fl * 0.7,
              ),
              R[tex],
            );
          }
        // air line and price
        rod(
          mt(0xdfe6e0),
          P,
          [xa + 0.15, y + TH + 0.2, zb + 0.1],
          [xa + 0.15, y + 0.08, zb + 0.12],
          0.004,
          3,
        );
        if ((i + tier) % 3 === 0)
          card(
            P,
            pick(["grouper", "snapper", "mullet"]),
            xa + TW * 0.7,
            y + TH * 0.62,
            zb + TD + 0.016,
            { stick: 0, tilt: 0, yaw: 0 },
          );
      }
    }
    for (let i = 0; i <= n; i++) {
      const x = 0.085 + i * (TW + 0.03);
      for (const z of [zb, zb + TD + 0.03])
        srod(steelI, P, [x, 0, z], [x, 1.72, z], 0.016, 4);
    }
    solid(P, 0, 0, zb - 0.03, len, 1.75, zb + TD + 0.05, "glass");
    // hood light and the pipes that feed the tanks
    wbox(steelI, P, 0.05, 1.74, zb, len - 0.05, 1.78, zb + TD + 0.1, {
      skip: "",
    });
    for (const x of [1.4, 3.9, 6.4]) {
      put(
        em(0xd8ffe8, 2.6),
        tubeG(6),
        at(P, x, 1.72, zb + TD + 0.02, 0, 0, HALF, 0.016, 1.2, 0.016),
        R.tube,
      );
      light(P, x, 1.25, zb + TD + 0.75, 0x58ffb0, 1.25, 7);
    }
    rod(PVC, P, [-0.3, 2.05, zb + 0.08], [len + 0.3, 2.05, zb + 0.08], 0.03, 6);
    for (let i = 0; i < n; i++)
      rod(
        PVC,
        P,
        [0.5 + i * (TW + 0.03), 2.05, zb + 0.08],
        [0.5 + i * (TW + 0.03), 1.78, zb + 0.2],
        0.014,
        5,
      );
    for (const x of [2.1, 5.3]) {
      ob(mt(0xb3161a), P, x, 2.05, zb + 0.14, 0.1, 0.1, 0.02);
    }
    // basins of shellfish on the floor in front
    const basins = [
      [0.7, 0x8a8272, "clam"],
      [1.7, 0x4a4a52, null],
      [2.9, 0xc8765a, "shrimp"],
      [4.6, 0x8a8272, null],
      [5.8, 0x5a5248, null],
    ];
    for (const [x, c, cd] of basins) {
      const v = vessel(P, x, 0, -0.26, 0.3, 0.2, {
        color: pick([0x1e62b4, 0xc23a2a, 0x1e62b4]),
        fill: gl(0x1c3434),
        level: 0.55,
      });
      mound(gl(c), v, 0, 0.1, 0, 0.23, 0.08, 0.23);
      if (cd) card(v, cd, 0, 0.14, -0.18, { stick: 0.22 });
    }
    solid(P, 0.3, 0, -0.58, 6.2, 0.24, 0.04, "metal");
    floorBoxes(P, [[7.1, -0.28, 0.1, { stack: 1 }]]);
    bucket(P, 3.75, 0, -0.2, 0xc23a2a, { fill: gl(0x1c3434) });
    wallRail(P, 0.2, len - 0.2, 0.12, 1.15, 2.72);
    stallSign(P, "sea", 3.9, 2.38, 0.14, 2.1, {
      top: 2.72,
      lit: true,
      color: 0xb0ffd8,
    });
    hang(P, "bags", 0.5, 2.6, 0.12);
    hang(P, "bags", 7.3, 2.6, 0.12);
  }

  // ---- 1: live poultry in the north-west corner ----
  {
    const P = frame(x0 + T, z0 + T + 1.3, "S");
    // cages three high on a steel bench
    wbox(galvI, P, 0.12, 0.2, -1.28, 2.95, 0.24, -0.62, { skip: "" });
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        if (j === 2 && i === 1) continue;
        cage(P, 0.58 + i * 0.92, 0.24 + j * 0.45, -0.95, 0.86, 0.43, 0.6, {
          birds: rnd() < 0.3 ? 0 : rnd() < 0.5 ? 1 : 2,
        });
      }
    solid(P, 0.12, 0, -1.3, 2.98, 1.6, -0.62, "metal");
    lay(dc(), P, 1.2, 0.006, -0.15, 1.4, 1.4, 0.4, R.feathers);
    lay(dc(), P, 2.6, 0.006, 0.5, 1.2, 1.2, 2.0, R.feathers);
    // dressing counter and the scalding pot
    const top = counter(P, 3.15, -1.2, 4.75, -0.25);
    block(P, 3.6, top, -0.7, 0.2, 0.13);
    ctx.blood(...world(P, [3.7, top + 0.004, -0.6]), 0.8, "pool");
    kit.add(
      galvI,
      lathe(
        "pot",
        [
          [0.8, 0],
          [1, 0.1],
          [1, 1],
        ],
        12,
      ),
      at(P, 4.35, top, -0.75, 0, 0, 0, 0.22, 0.34, 0.22),
    );
    put(gl(0x2a2a26), disc(12), at(P, 4.35, top + 0.28, -0.75, 0, 0, 0, 0.21));
    wallRail(P, 0.2, 4.7, -0.1, 1.2, 2.5);
    rail(
      P,
      0.3,
      4.6,
      -0.1,
      2.5,
      ["bird", "bird", "", "duck", "bird", "bird", "duck", ""],
      { top: 2.5 },
    );
    card(P, "chicken", 3.35, top, -0.35, { stick: 0.2 });
    stallSign(P, "poultry", 1.6, 2.95, 0.0, 1.7, { top: 3.4 });
    srod(steelI, P, [0.2, 3.4, 0], [4.7, 3.4, 0], 0.014, 4);
    for (const x of [0.2, 4.7])
      srod(steelI, P, [x, 3.4, 0], [x, 3.4, -1.3], 0.014, 4);
    lamp(P, 1.5, 2.1, -0.45, {
      top: 2.5,
      shade: 0xe0a020,
      color: 0xffc070,
      power: 1.0,
    });
    lamp(P, 3.9, 2.1, -0.55, {
      top: 2.5,
      shade: 0xe0a020,
      color: 0xffc070,
      on: false,
    });
    crate(P, 3.5, 0, 0.0, 0.2, { color: 0xc23a2a });
    crate(P, 3.52, 0.3, 0.02, -0.1, { color: 0xe0a020 });
  }

  // ---- 2: eggs ----
  {
    const P = frame(x0 + 5.3, z0 + T + 1.3, "S");
    const len = 3.4;
    const st = stand(P, 0, len, 0, 2, {
      depth: 0.6,
      h0: 0.5,
      rise: 0.36,
      apron: 0xd9c9a0,
    });
    // trays stacked by the dozen, some brown, some white
    for (const [za, zb, h] of st)
      for (let x = 0.24; x < len - 0.2; x += 0.42) {
        if (rnd() < 0.15) continue;
        const n = 2 + Math.floor(rnd(9)),
          hh = n * 0.045,
          zc = (za + zb) / 2 + rnd(-0.05, 0.05);
        bx(
          mt(0xa9a294),
          P,
          x - 0.16,
          h,
          zc - 0.15,
          x + 0.16,
          h + hh,
          zc + 0.15,
          R.stack,
        );
        lay(
          mt(pick([0xffffff, 0xfff4e0, 0xf0e0d0])),
          P,
          x,
          h + hh + 0.002,
          zc,
          0.32,
          0.3,
          rnd() < 0.5 ? 0 : HALF,
          R.eggs,
        );
      }
    card(P, "egg", 0.9, st[0][2] + 0.25, st[0][0] - 0.1, { stick: 0.2 });
    basketOf(P, "egg", len - 0.45, st[0][2] + 0.02, st[0][0] - 0.3, 0.2, {
      layers: 2,
    });
    // preserved eggs in glazed urns at the end
    put(
      gl(0x3a2414),
      urnG,
      at(P, len + 0.3, 0, -0.75, 0, 0, 0, 0.22, 0.52, 0.22),
    );
    put(
      gl(0x4a3020),
      urnG,
      at(P, len + 0.35, 0, -0.25, 0, 0, 0, 0.19, 0.44, 0.19),
    );
    put(mt(0xb3161a), disc(10), at(P, len + 0.35, 0.445, -0.25, 0, 0, 0, 0.14));
    solid(P, len + 0.05, 0, -1.0, len + 0.6, 0.5, 0, "concrete");
    wallRail(P, 0.1, len - 0.1, 0.1, 1.3, 2.6);
    stallSign(P, "eggs", len / 2, 2.3, 0.1, 1.5, { top: 2.6 });
    lamp(P, len / 2, 1.95, -0.5, {
      top: 2.6,
      shade: 0xe9e4d4,
      color: 0xfff0c8,
      power: 0.9,
    });
  }

  // ---- 7: dried goods along the west wall ----
  {
    const P = frame(x0 + T + 1.3, z0 + 7.4, "E");
    const len = 4.8;
    shelves(P, 0.05, len - 0.05, -1.28, 0.36, [0.5, 1.0, 1.5, 2.0]);
    for (const h of [0.5, 1.0, 1.5, 2.0])
      for (let x = 0.2; x < len - 0.2;) {
        const r = rnd();
        if (r < 0.4) {
          jar(
            P,
            x + 0.1,
            h,
            -1.1,
            0.085,
            0.26,
            pick([0x8a5a2a, 0x5a3a1a, 0xb08a4a, 0x6a2a1a, 0x9a8a5a]),
          );
          x += 0.22;
        } else if (r < 0.7) {
          for (let k = 0; k < 3; k++)
            bottle(
              P,
              x + 0.04 + k * 0.08,
              h,
              -1.08 + rnd(-0.03, 0.03),
              pick([0x1a0f0a, 0x3a1a0a, 0x5a3a10]),
            );
          x += 0.3;
        } else if (r < 0.9) {
          const n = 1 + Math.floor(rnd(3));
          for (let k = 0; k < n; k++)
            put(
              mt(pick([0xc23a2a, 0xe0a020, 0x2f7a5a, 0xd9d6c8])),
              tubeG(8),
              at(
                P,
                x + 0.07,
                h + 0.055 + k * 0.11,
                -1.1,
                0,
                0,
                0,
                0.055,
                0.11,
                0.055,
              ),
            );
          x += 0.2;
        } else {
          bx(
            mt(pick([0xffffff, 0xd9c9a0])),
            P,
            x,
            h,
            -1.22,
            x + 0.3,
            h + 0.2,
            -0.98,
            R.cardboard,
          );
          x += 0.36;
        }
      }
    // open sacks and baskets in front
    const goods = [
      [0.45, 0xf0ece0, "rice"],
      [0.95, 0x7a2a22, null],
      [1.45, 0x6a8a3a, null],
      [1.95, 0xc9a070, null],
      [2.5, 0x3a2a20, null],
      [3.0, 0xd98a50, null],
    ];
    for (const [x, c, cd] of goods)
      sackOf(P, x, 0, -0.5 + rnd(-0.06, 0.06), c, { card: cd });
    solid(P, 0.2, 0, -0.75, 3.25, 0.46, -0.25, "wood");
    const st = stand(P, 3.4, len - 0.05, -0.05, 2, {
      depth: 0.42,
      h0: 0.4,
      rise: 0.3,
      apron: 0x5a2a16,
    });
    [0x4a3020, 0xb07040, 0xe6dcc0, 0x8a3a2a].forEach((c, i) =>
      basketOf(
        P,
        "",
        3.75 + (i % 2) * 0.62,
        st[Math.floor(i / 2)][2] + 0.04,
        (st[Math.floor(i / 2)][0] + st[Math.floor(i / 2)][1]) / 2,
        0.24,
        { grain: c, tilt: 0.2 },
      ),
    );
    sackPile(P, 0.5, 0, 0.0, 3, 0.2);
    wallRail(P, 0.1, len - 0.1, 0.05, 1.3, 2.55);
    rail(
      P,
      0.3,
      len - 0.3,
      0.05,
      2.55,
      [
        "sausage",
        "driedfish",
        "sausage",
        "garlic",
        "",
        "driedfish",
        "driedfish",
        "sausage",
        "garlic",
        "bags",
      ],
      { top: 2.55 },
    );
    stallSign(P, "dry", len / 2, 3.0, 0.05, 1.7, { top: 3.45 });
    srod(steelI, P, [0.2, 3.45, 0.05], [len - 0.2, 3.45, 0.05], 0.014, 4);
    for (const x of [0.2, len - 0.2])
      srod(steelI, P, [x, 3.45, 0.05], [x, 3.45, -1.3], 0.014, 4);
    lamp(P, 1.2, 2.05, -0.45, {
      top: 2.55,
      shade: 0x5a2a16,
      color: 0xffb060,
      power: 1.0,
    });
    lamp(P, 3.6, 2.05, -0.45, {
      top: 2.55,
      shade: 0x5a2a16,
      color: 0xffb060,
      power: 1.0,
    });
  }

  // ---- 18: bean curd along the east wall ----
  {
    const P = frame(x1 - T - 1.15, z0 + 2.7, "W");
    const len = 6.0;
    const top = counter(P, 0, -1.0, len, 0);
    // trays of curd under water, a pail of soy milk, pressed curd under cloth
    for (const x of [0.5, 1.35, 2.2]) {
      const t = tray(P, x, top, -0.5, 0.78, 0.74, { rim: 0.07 });
      lay(gl(), t.T, 0, t.y + 0.04, 0, t.w, t.d, 0, R.tofu);
    }
    card(P, "tofu", 1.35, top, -0.1, { stick: 0.16 });
    bucket(P, 2.95, top, -0.55, 0xe9ecea, {
      fill: mt(0xf4efe0),
      level: 0.85,
      r: 0.17,
      h: 0.3,
    });
    ob(
      mt(0xe6e0cc),
      P,
      3.6,
      top + 0.06,
      -0.5,
      0.6,
      0.12,
      0.6,
      0.05,
      0,
      0,
      R.canvas,
    );
    wbox(woodI, P, 3.28, top + 0.12, -0.82, 3.92, top + 0.15, -0.18, {
      skip: "",
    });
    // noodles and wrappers at the far end, steamers stacked behind
    for (const x of [4.5, 5.35]) {
      const t = tray(P, x, top, -0.5, 0.78, 0.74, { rim: 0.05 });
      lay(
        mt(x > 5 ? 0xf4ecd0 : 0xffffff),
        t.T,
        0,
        t.y + 0.035,
        0,
        t.w,
        t.d,
        0,
        R.noodle,
      );
    }
    for (let i = 0; i < 4; i++)
      put(
        mt(0xc9a878),
        tubeG(12),
        at(P, 4.1, top + 0.05 + i * 0.1, -0.78, 0, 0, 0, 0.21, 0.1, 0.21),
        R.stack,
      );
    put(
      mt(),
      lathe(
        "lid",
        [
          [1, 0],
          [0.7, 0.6],
          [0.02, 1],
        ],
        12,
      ),
      at(P, 4.1, top + 0.4, -0.78, 0, 0, 0, 0.215, 0.07, 0.215),
      R.wicker,
    );
    counterScale(P, 5.75, top, -0.75, 0.3);
    plate(mt(), P, 3.0, 1.75, -1.14, 0.55, 0.76, R.menu);
    bx(mt(0x6a4a2a), P, 2.7, 1.35, -1.15, 3.3, 2.15, -1.143);
    sackPile(P, 5.2, 0, 0.3, 2, 1.4);
    wallRail(P, 0.1, len - 0.1, 0.1, 1.15, 2.6);
    stallSign(P, "tofu", 1.5, 2.3, 0.1, 1.6, { top: 2.6 });
    stallSign(P, "noodle", 4.5, 2.3, 0.1, 1.6, { top: 2.6 });
    lamp(P, 1.3, 1.95, -0.45, {
      top: 2.6,
      shade: 0x2a62c8,
      color: 0xf0f4ff,
      power: 1.0,
    });
    lamp(P, 4.6, 1.95, -0.45, {
      top: 2.6,
      shade: 0x2a62c8,
      color: 0xf0f4ff,
      power: 1.0,
    });
    hang(P, "bags", 3.0, 2.5, 0.1);
  }

  // ---- 31, 35: vegetables and fruit — a back-to-back stepped island by the entrance ----
  {
    const X0 = x0 + 5.2,
      X1 = x0 + 9,
      Z0 = z0 + 14.2,
      Z1 = z0 + 20.4;
    const len = Z1 - Z0;
    stallFrame(X0, Z0, X1, Z1, { sheet: { sag: 0.26, nx: 5, nz: 6 } });
    // spine between the two stands
    kit.box(woodDark, X0 + 1.5, K, Z0, X1 - 1.5, K + 1.3, Z1, { skip: "b" });
    kit.solid(X0 + 1.5, 0, Z0, X1 - 1.5, K + 1.3, Z1, "wood");
    // fruit, facing the main aisle
    const Pe = frame(X1, Z1, "E");
    const se = stand(Pe, 0, len, 0, 3, {
      depth: 0.5,
      h0: 0.5,
      rise: 0.31,
      apron: 0xb3161a,
    });
    const zc = (s) => (s[0] + s[1]) / 2;
    row(Pe, 0.1, len - 0.1, zc(se[0]), se[0][2], [
      "orange",
      "apple",
      "pomelo:p",
      "dragon",
      "pear",
      "orange",
      "greenapple",
      "melon:p",
      "mandarin",
      "lemon",
    ]);
    row(Pe, 0.1, len - 0.1, zc(se[1]), se[1][2], [
      "hami:p",
      "lychee:b",
      "apple",
      "lime:b",
      "pomelo:p",
      "orange",
      "",
      "dragon",
      "pear:b",
      "hami:p",
    ]);
    row(
      Pe,
      0.1,
      len - 0.1,
      zc(se[2]),
      se[2][2],
      [
        "mandarin:b",
        "apple",
        "",
        "melon:p",
        "orange",
        "pear",
        "lemon:b",
        "greenapple",
        "",
        "pomelo:p",
      ],
      { tilt: 0.3 },
    );
    for (const [x, k] of [
      [1.75, 1],
      [4.1, 2],
      [5.6, 0],
    ])
      kit.prop("bananas", ...world(Pe, [x, se[k][2] + 0.02, zc(se[k])]), {
        yaw: rnd(6),
        scale: 1.7,
        interior: true,
        cast: false,
      });
    stallSign(Pe, "fruit", len / 2, 2.55, 0.1, 2.0, {
      top: RAIL,
      lit: true,
      color: 0xffe9a0,
    });
    for (const x of [1.0, 3.1, 5.2])
      lamp(Pe, x, 2.15, -0.5, {
        top: RAIL,
        shade: 0x2f7a5a,
        color: 0xffd8a0,
        power: 1.0,
        light: x !== 3.1,
      });
    hang(Pe, "bags", 0.2, 2.5, 0.05);
    rod(CHAIN, Pe, [0.2, 2.5, 0.05], [0.2, RAIL, 0.05], 0.004, 3);
    hangScale(Pe, len - 0.5, 2.2, -0.15, 0.3);
    rod(CHAIN, Pe, [len - 0.5, 2.5, -0.15], [len - 0.5, RAIL, -0.15], 0.004, 3);
    // vegetables, facing the lane side
    const Pw = frame(X0, Z0, "W");
    const sw = stand(Pw, 0, len, 0, 3, {
      depth: 0.5,
      h0: 0.5,
      rise: 0.31,
      apron: 0x2f6a4a,
    });
    row(Pw, 0.1, len - 0.1, zc(sw[0]), sw[0][2], [
      "bokchoy:b",
      "tomato",
      "daikon",
      "cabbage:p",
      "choysum:b",
      "eggplant",
      "carrot",
      "potato",
      "bitter",
      "onion",
    ]);
    row(Pw, 0.1, len - 0.1, zc(sw[1]), sw[1][2], [
      "cucumber",
      "garlic:b",
      "bokchoy",
      "tomato",
      "",
      "",
      "redonion:b",
      "choysum",
      "taro",
      "cabbage:p",
    ]);
    row(
      Pw,
      0.1,
      len - 0.1,
      zc(sw[2]),
      sw[2][2],
      [
        "potato",
        "choysum:b",
        "onion",
        "",
        "",
        "",
        "daikon",
        "tomato:b",
        "bitter",
        "carrot",
      ],
      { tilt: 0.3 },
    );
    stallSign(Pw, "veg", len / 2, 2.55, 0.1, 2.0, { top: RAIL });
    for (const x of [1.0, 3.1, 5.2])
      lamp(Pw, x, 2.15, -0.5, {
        top: RAIL,
        shade: 0x2f7a5a,
        color: 0xffe0b0,
        power: 1.0,
        light: x !== 3.1,
      });
    hang(Pw, "bags", len - 0.2, 2.5, 0.05);
    rod(CHAIN, Pw, [len - 0.2, 2.5, 0.05], [len - 0.2, RAIL, 0.05], 0.004, 3);
    hangScale(Pw, 0.6, 2.2, -0.15, -0.2);
    rod(CHAIN, Pw, [0.6, 2.5, -0.15], [0.6, RAIL, -0.15], 0.004, 3);
    // the north end, on the cross aisle: crates not yet put out
    const Pn = frame(X1, Z0, "N");
    crateOf(Pn, "cabbage", 0.9, 0, 0.25, 0.1, { layers: 1 });
    crateOf(Pn, "orange", 0.92, 0.3, 0.26, -0.08, {});
    crateOf(Pn, "potato", 1.6, 0, 0.24, -0.05, {});
    crate(Pn, 2.3, 0, 0.26, 0.2, {});
    crate(Pn, 2.28, 0.3, 0.24, 0.0, {});
    crate(Pn, 2.3, 0.6, 0.25, -0.2, {});
    sackPile(Pn, 3.05, 0, 0.3, 3, 0.1);
    solid(Pn, 0.6, 0, 0, 3.4, 0.44, 0.5, "wood");
    // the south end, towards the street: melons on a pallet
    const Ps = frame(X0, Z1, "S");
    wbox(woodI, Ps, 1.2, 0, 0.05, 2.6, 0.12, 0.95, { skip: "" });
    heap(Ps, "melon", 1.25, 0.1, 2.55, 0.9, 0.12, {
      whole: true,
      layers: 2,
      gaps: 0.2,
      yaw: 0,
    });
    card(Ps, "melon", 1.9, 0.12, 0.92, { stick: 0.4, size: 1.6 });
    solid(Ps, 1.2, 0, 0.05, 2.6, 0.4, 0.95, "wood");
  }

  // ---- 33: more greens along the west wall ----
  {
    const P = frame(x0 + T + 1.2, z1 - 3.2, "E");
    const len = 7.4;
    const st = stand(P, 0, len, 0, 2, {
      depth: 0.58,
      h0: 0.5,
      rise: 0.34,
      apron: 0x2f6a4a,
    });
    const zc = (s) => (s[0] + s[1]) / 2;
    row(P, 0.1, len - 0.1, zc(st[0]), st[0][2], [
      "choysum:b",
      "bokchoy",
      "daikon",
      "tomato",
      "cabbage:p",
      "bitter",
      "bokchoy:b",
      "eggplant",
      "onion",
      "cucumber",
      "potato",
      "carrot",
    ]);
    row(
      P,
      0.1,
      len - 0.1,
      zc(st[1]),
      st[1][2],
      [
        "cabbage:p",
        "garlic:b",
        "choysum",
        "",
        "taro",
        "bokchoy:b",
        "tomato",
        "",
        "redonion:b",
        "daikon",
        "cabbage:p",
        "choysum:b",
      ],
      { tilt: 0.3 },
    );
    wallRail(P, 0.1, len - 0.1, 0.1, 1.2, 2.6);
    stallSign(P, "veg2", len / 2, 2.3, 0.1, 1.7, { top: 2.6 });
    for (const x of [1.3, 3.7, 6.1])
      lamp(P, x, 1.95, -0.5, {
        top: 2.6,
        shade: 0x2f7a5a,
        color: 0xffe0b0,
        power: 1.0,
        light: x !== 3.7,
      });
    hang(P, "bags", 0.4, 2.5, 0.1);
    hang(P, "bags", len - 0.4, 2.5, 0.1);
    hang(P, "garlic", 2.4, 2.58, 0.1);
    hangScale(P, 5.0, 2.25, 0.1, 0.5);
    rod(CHAIN, P, [5.0, 2.5, 0.1], [5.0, 2.6, 0.1], 0.004, 3);
  }

  // ---- 37: fruit along the street wall ----
  {
    const P = frame(x0 + 8.6, z1 - T - 1.15, "N");
    const len = 6.9;
    const st = stand(P, 0, len, 0, 2, {
      depth: 0.56,
      h0: 0.5,
      rise: 0.34,
      apron: 0xb3161a,
    });
    const zc = (s) => (s[0] + s[1]) / 2;
    row(P, 0.1, len - 0.1, zc(st[0]), st[0][2], [
      "apple",
      "orange",
      "hami:p",
      "pear",
      "dragon",
      "mandarin:b",
      "pomelo:p",
      "greenapple",
      "orange",
      "lychee:b",
      "melon:p",
    ]);
    row(
      P,
      0.1,
      len - 0.1,
      zc(st[1]),
      st[1][2],
      [
        "melon:p",
        "lemon:b",
        "apple",
        "",
        "orange",
        "pomelo:p",
        "pear:b",
        "dragon",
        "",
        "apple",
        "hami:p",
      ],
      { tilt: 0.3 },
    );
    kit.prop("bananas", ...world(P, [2.25, st[1][2] + 0.02, zc(st[1])]), {
      yaw: 1,
      scale: 1.7,
      interior: true,
      cast: false,
    });
    kit.prop("bananas", ...world(P, [5.3, st[1][2] + 0.02, zc(st[1])]), {
      yaw: 4,
      scale: 1.7,
      interior: true,
      cast: false,
    });
    wallRail(P, 0.1, len - 0.1, 0.1, 1.15, 2.6);
    stallSign(P, "fruit2", len / 2, 2.3, 0.1, 1.7, { top: 2.6 });
    for (const x of [1.2, 3.45, 5.7])
      lamp(P, x, 1.95, -0.5, {
        top: 2.6,
        shade: 0xb5221c,
        color: 0xffd8a0,
        power: 1.0,
        light: x !== 3.45,
      });
    hang(P, "bags", len - 0.3, 2.5, 0.1);
    // boxes stacked in the corner
    for (let i = 0; i < 3; i++)
      bx(
        mt(pick([0xffffff, 0xe6d6b8])),
        P,
        len + 0.2,
        i * 0.3,
        -0.9,
        len + 0.75,
        i * 0.3 + 0.3,
        -0.45,
        R.cardboard,
      );
    crate(P, len + 0.45, 0, -0.2, 0.3, {});
    solid(P, len + 0.15, 0, -1.0, len + 0.8, 0.9, 0, "wood");
  }

  // ---- 24, 26: rice, oil and sundries facing the aisle; noodles behind, facing the east door ----
  {
    const X0 = x0 + 15,
      X1 = x0 + 19.4,
      Z0 = z0 + 14.2,
      Z1 = z0 + 20.4;
    const len = Z1 - Z0;
    stallFrame(X0, Z0, X1, Z1, {
      sheet: {
        sag: 0.24,
        nx: 5,
        nz: 6,
        plain: true,
        tint: 0x5f8f72,
        pool: 0.15,
      },
    });
    kit.box(woodDark, X0 + 1.3, K, Z0, X1 - 1.0, K + 1.5, Z1, { skip: "b" });
    kit.solid(X0 + 1.3, 0, Z0, X1 - 1.0, K + 1.5, Z1, "wood");
    const Pw = frame(X0, Z0, "W");
    const st = stand(Pw, 0, len, -0.45, 2, {
      depth: 0.42,
      h0: 0.62,
      rise: 0.42,
      apron: 0x5a2a16,
    });
    // sacks along the front, standing open
    const sacks = [
      0xf4f0e4, 0xefe6d0, 0x7a2a22, 0x6a8a3a, 0xc9a070, 0xe6d9a8, 0x3a2a20,
      0xd98a50, 0xf4f0e4,
    ];
    sacks.forEach((c, i) =>
      sackOf(Pw, 0.4 + i * 0.66, 0, -0.22 + rnd(-0.03, 0.03), c, {
        card: i === 0 ? "rice" : null,
        r: 0.21,
      }),
    );
    solid(Pw, 0.1, 0, -0.45, len - 0.1, 0.46, 0, "wood");
    // jars and bottles on the steps
    for (let x = 0.25; x < len - 0.2; x += 0.3) {
      if (rnd() < 0.8)
        jar(
          Pw,
          x,
          st[0][2],
          (st[0][0] + st[0][1]) / 2 + rnd(-0.05, 0.05),
          0.1,
          0.3,
          pick([0x8a5a2a, 0x5a3a1a, 0xb08a4a, 0x6a2a1a, 0x9a8a5a, 0xc23a2a]),
        );
      if (rnd() < 0.7)
        for (let k = 0; k < 2; k++)
          bottle(
            Pw,
            x - 0.05 + k * 0.1,
            st[1][2],
            (st[1][0] + st[1][1]) / 2 + rnd(-0.08, 0.08),
            pick([0x1a0f0a, 0x3a1a0a, 0x5a3a10, 0x6a5a10]),
          );
    }
    stallSign(Pw, "dry2", len / 2, 2.55, 0.1, 2.0, { top: RAIL });
    for (const x of [1.0, 3.1, 5.2])
      lamp(Pw, x, 2.15, -0.4, {
        top: RAIL,
        shade: 0x5a2a16,
        color: 0xffc078,
        power: 1.0,
        light: x !== 3.1,
      });
    rail(
      Pw,
      0.4,
      len - 0.4,
      -0.6,
      2.45,
      [
        "sausage",
        "",
        "driedfish",
        "garlic",
        "sausage",
        "bags",
        "driedfish",
        "",
        "sausage",
      ],
      { top: RAIL },
    );
    // noodle counter on the far side
    const Pe = frame(X1, Z1, "E");
    const top = counter(Pe, 0, -D, len, 0);
    for (const x of [0.55, 1.4, 2.25]) {
      const t = tray(Pe, x, top, -0.48, 0.78, 0.72, { rim: 0.05 });
      lay(
        mt(pick([0xffffff, 0xf4ecd0, 0xe8f0d0])),
        t.T,
        0,
        t.y + 0.035,
        0,
        t.w,
        t.d,
        0,
        R.noodle,
      );
    }
    for (const [x, n] of [
      [3.6, 5],
      [4.15, 3],
    ]) {
      for (let i = 0; i < n; i++)
        put(
          mt(0xc9a878),
          tubeG(12),
          at(Pe, x, top + 0.05 + i * 0.1, -0.5, 0, 0, 0, 0.23, 0.1, 0.23),
          R.stack,
        );
      put(
        mt(),
        lathe(
          "lid",
          [
            [1, 0],
            [0.7, 0.6],
            [0.02, 1],
          ],
          12,
        ),
        at(Pe, x, top + n * 0.1, -0.5, 0, 0, 0, 0.235, 0.075, 0.235),
        R.wicker,
      );
    }
    counterScale(Pe, 5.0, top, -0.5, -0.2);
    sackPile(Pe, 5.75, top, -0.5, 2, 0.3);
    stallSign(Pe, "noodle", len / 2, 2.55, 0.1, 1.8, { top: RAIL });
    for (const x of [1.3, 4.6])
      lamp(Pe, x, 2.15, -0.4, {
        top: RAIL,
        shade: 0x2a62c8,
        color: 0xf0f4ff,
        power: 1.0,
      });
    // rice on a pallet at the north end
    const Pn = frame(X1, Z0, "N");
    wbox(woodI, Pn, 0.9, 0, 0.05, 2.3, 0.12, 0.85, { skip: "" });
    sackPile(Pn, 1.25, 0.12, 0.45, 5, HALF);
    sackPile(Pn, 1.95, 0.12, 0.45, 4, HALF);
    solid(Pn, 0.9, 0, 0.05, 2.3, 0.44, 0.85, "wood");
  }

  // ================= THE HALL BETWEEN THE STALLS =================
  // ---- battens over the aisles: some burnt out, one on its way ----
  for (const [x, z, dir, state] of [
    [19, z1 - 4.2, "E", "on"],
    [19, z1 - 10.4, "E", "dead"],
    [19, z0 + 2.6, "E", "on"],
    [x0 + 3.6, zr - 1.3, "S", "on"],
    [x0 + 8.6, zr - 1.3, "S", "flicker"],
    [x1 - 7.2, zr - 1.3, "S", "on"],
    [x1 - 2.6, zr - 1.3, "S", "dead"],
    [x0 + 4.2, z1 - 8.2, "E", "on"],
    [x1 - 3.2, z1 - 7.6, "E", "on"],
  ])
    tubeLight(frame(x, z, dir), 0, 3.75, 0, { state, power: 1.9, range: 12 });
  if (flickers.length) {
    const lit = flickM.color.clone();
    let clock = 0;
    ctx.updaters.push((dt) => {
      // a failing starter: steady for a while, then a burst of stutter
      clock += dt;
      const n =
        Math.sin(clock * 1.9) +
        0.6 * Math.sin(clock * 6.7 + 1.3) +
        0.4 * Math.sin(clock * 29);
      const k = n > 1.25 ? 0.06 : n > 1.0 ? 0.45 : 1;
      flickM.color.copy(lit).multiplyScalar(k);
      for (const e of flickers) e.gain = k;
    });
  }

  // ---- writing on the walls ----
  const inS = (x) => frame(x, z1 - T - 0.014, "N"),
    inN = (x) => frame(x, z0 + T + 0.014, "S"),
    inW = (z) => frame(x0 + T + 0.014, z, "E"),
    inE = (z) => frame(x1 - T - 0.014, z, "W");
  // house rules by the street door, in a steel frame
  {
    const P = inS(x0 + 7.9);
    bx(mt(0x3a403c), P, -0.5, 1.08, 0, 0.5, 2.42, 0.012);
    plate(mt(), P, 0, 1.75, 0.016, 0.9, 1.24, R.rules);
  }
  // running-man boxes over the three ways out
  for (const [P, y] of [
    [inS(19), 4.38],
    [inW(z0 + 10), 4.0],
    [inE(z1 - 7), 4.0],
  ]) {
    bx(mt(0x1c2a22), P, -0.5, y - 0.2, 0, 0.5, y + 0.2, 0.07);
    plate(em(0xffffff, 1.5), P, 0, y, 0.074, 0.92, 0.36, R.exit);
    light(P, 0, y - 0.2, 0.7, 0x58ff9a, 0.5, 4.5);
  }
  {
    const P = inN(x0 + 12);
    put(
      mt(0x2a2a28),
      tubeG(16),
      at(P, 0, 4.25, 0.02, HALF, 0, 0, 0.4, 0.04, 0.4),
    );
    plate(mt(), P, 0, 4.25, 0.045, 0.56, 0.56, R.clock);
    plate(mt(), inW(z0 + 6.2), 0, 1.72, 0, 0.42, 0.56, R.calendar);
  }
  // fire points on the columns of the main aisle
  for (const [cx, cz, dir] of [
    [x0 + 12, z1 - 6.5, "S"],
    [x0 + 12, z0 + 6.5, "N"],
  ]) {
    const P = frame(cx, cz + (dir === "S" ? 0.236 : -0.236), dir);
    plate(mt(), P, 0, 2.05, 0, 0.3, 0.4, R.fire);
    put(
      gl(0xb3161a),
      tubeG(8),
      at(P, 0, 1.3, 0.08, 0, 0, 0, 0.065, 0.42, 0.065),
    );
    put(
      gl(0xb3161a),
      ball(8, 5),
      at(P, 0, 1.51, 0.08, 0, 0, 0, 0.065, 0.05, 0.065),
    );
    bx(mt(0x1a1a1a), P, -0.012, 1.55, 0.068, 0.012, 1.62, 0.092);
    rod(mt(0x1a1a1a), P, [0.02, 1.6, 0.08], [0.09, 1.38, 0.1], 0.008, 4);
    bx(mt(0x3a403c), P, -0.09, 1.1, 0, 0.09, 1.14, 0.1);
  }
  // paper couplets strung from the purlins down the main aisle
  for (const [x, z] of [
    [x0 + 10.4, z1 - 3.4],
    [x0 + 13.6, z1 - 3.4],
    [x0 + 10.3, zr + 1.6],
    [x0 + 13.7, zr + 1.6],
    [x0 + 10.4, z0 + 4.4],
    [x0 + 13.6, z0 + 4.4],
  ]) {
    const yaw = rnd(-0.25, 0.25),
      top = 4.72 + rnd(-0.1, 0.1);
    const P = at(null, x, K, z, 0, yaw, 0);
    plate(mt(), P, 0, top - 0.62, 0.003, 0.34, 1.2, R.banner);
    plate(
      mt(0xb9a9a2),
      at(P, 0, 0, 0, 0, Math.PI, 0),
      0,
      top - 0.62,
      0.003,
      0.34,
      1.2,
      R.banner,
    );
    rod(mt(0x5a3a22), P, [-0.19, top, 0], [0.19, top, 0], 0.012, 5);
    rod(ROPE, P, [0, top, 0], [0, EAVE + 0.3, 0], 0.004, 3);
  }

  // ---- the side doors keep what is left of their strip curtains ----
  for (const [P, half, head] of [
    [inW(z0 + 10), 2, 3.3],
    [inE(z1 - 7), 2, 3.3],
  ]) {
    rod(
      mt(0x8f988f),
      P,
      [-half, head - 0.03, -T / 2],
      [half, head - 0.03, -T / 2],
      0.02,
      5,
    );
    for (let s = -half + 0.1; s < half - 0.05; s += 0.2) {
      if (Math.abs(s) < 1.15 || rnd() < 0.18) continue;
      const len = rnd() < 0.3 ? rnd(1.0, 2.2) : head - 0.2,
        sw = rnd(-0.07, 0.07),
        dz = -T / 2 + rnd(-0.03, 0.03);
      pic(
        dc(0xd8ecf0),
        P,
        [s + sw, head - len, dz + sw],
        [s + 0.19 + sw, head - len, dz + sw],
        [s + 0.19, head - 0.03, dz],
        [s, head - 0.03, dz],
        R.strip,
      );
      pic(
        dc(0xd8ecf0),
        P,
        [s + 0.19 + sw, head - len, dz + sw],
        [s + sw, head - len, dz + sw],
        [s, head - 0.03, dz],
        [s + 0.19, head - 0.03, dz],
        R.strip,
      );
    }
  }

  // ---- the floor: mats, gullies, standing water, what was dropped ----
  const FL = K + 0.004;
  lay(mt(), null, 19, FL, z1 - T - 0.9, 2.2, 1.32, 0, R.mat);
  lay(mt(), null, x0 + T + 0.85, FL, z0 + 10, 2.0, 1.2, -HALF, R.mat);
  lay(mt(), null, x1 - T - 0.85, FL, z1 - 7, 2.0, 1.2, HALF, R.mat);
  // gully gratings down both sides of the main aisle and along the cross aisle
  for (let z = z1 - 4.4; z > z0 + 2.4; z -= 3.4)
    for (const x of [x0 + 10.55, x0 + 13.45]) {
      if (Math.abs(z - (z1 - 7.5)) < 1 || Math.abs(z - (z0 + 6.5)) < 1)
        continue;
      lay(mt(0xd8d8d0), null, x, FL - 0.001, z, 0.9, 0.28, HALF, R.grate);
    }
  for (let x = x0 + 2.4; x < x1 - 2; x += 3.6) {
    if (Math.abs(x - 19) < 2.6) continue;
    lay(mt(0xd8d8d0), null, x, FL - 0.001, zr - 2.9, 0.9, 0.28, 0, R.grate);
  }
  // water: under the two broken panes, off the fish and the tanks, tracked along the aisle
  for (const p of leaks) {
    lay(dc(), null, p[0], FL + 0.002, p[2], 3.0, 2.6, rnd(6), R.puddle1);
    lay(
      dc(),
      null,
      p[0] + rnd(-0.8, 0.8),
      FL + 0.001,
      p[2] + rnd(-0.8, 0.8),
      3.6,
      3.2,
      rnd(6),
      R.sheen,
    );
  }
  for (const [x, z, s, k] of [
    [x0 + 14.2, z0 + 6.2, 2.2, 0],
    [x0 + 14.4, z0 + 2.2, 2.6, 1],
    [x0 + 19.5, z0 + 2.3, 2.0, 0],
    [x0 + 21.6, z0 + 9.4, 1.8, 1],
    [x0 + 10.2, z0 + 9.6, 1.6, 0],
    [x0 + 12.3, zr + 0.4, 2.4, 0],
    [x0 + 4.4, zr - 1.2, 1.8, 1],
    [x1 - 4.6, zr - 2.0, 2.0, 0],
  ]) {
    lay(
      dc(),
      null,
      x,
      FL + 0.002,
      z,
      s,
      s * rnd(0.7, 1),
      rnd(6),
      k ? R.puddle1 : R.puddle0,
    );
    if (rnd() < 0.6)
      lay(
        dc(),
        null,
        x + rnd(-0.6, 0.6),
        FL + 0.001,
        z + rnd(-0.6, 0.6),
        s * 1.5,
        s * 1.3,
        rnd(6),
        R.sheen,
      );
  }
  // paper, wrappers, a trail of wet prints from the fish to the lane door
  for (let i = 0; i < 16; i++) {
    const main = rnd() < 0.55;
    const x = main ? 19 + rnd(-1.7, 1.7) : x0 + 1.5 + rnd(x1 - x0 - 3),
      z = main ? z0 + 2 + rnd(z1 - z0 - 4) : zr - 1.4 + rnd(-1.5, 1.5);
    lay(
      mt(pick([0xffffff, 0xd9d2c0, 0xb9b2a2])),
      null,
      x,
      FL + 0.003 + i * 0.0004,
      z,
      0.26,
      0.35,
      rnd(6),
      R["litter" + (i % 3)],
    );
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6,
      x = x0 + 13.6 - t * 11.2,
      z = z0 + 9.2 + t * 1.2 + (i % 2 ? 0.16 : -0.16);
    lay(
      dc(0xffffff),
      null,
      x,
      FL + 0.003,
      z,
      0.34,
      0.84,
      HALF + rnd(-0.12, 0.12),
      R.prints,
    );
  }
  for (const [x, z, s, k] of [
    [x0 + 12.4, z1 - 3.1, 1.9, "pool"],
    [x0 + 12.9, zr + 2.4, 2.2, "smear"],
    [x0 + 9.6, z0 + 5.4, 1.7, "pool"],
    [x1 - 5.2, zr - 1.2, 2.0, "smear"],
    [x0 + 15.6, z1 - 2.6, 1.5, "pool"],
  ])
    ctx.blood(x, FL, z, s, k);
  // what a delivery left by the street wall, and odds and ends in the aisles
  for (const [id, x, z, o] of [
    ["hand_truck", x1 - 6.6, z1 - 2.6, { yaw: 2.3, collide: true }],
    ["plastic_crate_02", x1 - 3.2, z1 - 2.5, { yaw: 0.2 }],
    ["plastic_crate_02", x1 - 2.6, z1 - 2.5, { yaw: -0.1 }],
    ["plastic_crate_02", x1 - 2.9, z1 - 2.5, { yaw: 0.5, y: 0.31 }],
    ["cardboard_box_01", x1 - 4.4, z1 - 2.3, { yaw: 0.9 }],
    ["cardboard_box_01", x1 - 5.2, z1 - 3.0, { yaw: 2.2 }],
    ["trashbag", x1 - 1.6, z1 - 3.3, { yaw: 1 }],
    ["trashbag", x1 - 2.2, z1 - 3.6, { yaw: 4 }],
    ["WetFloorSign_01", x0 + 11.2, zr - 0.6, { yaw: 0.6 }],
    [
      "WetFloorSign_01",
      x0 + 14.3,
      z0 + 3.2,
      { yaw: 2.4, pitch: HALF, y: 0.13 },
    ],
    ["plastic_container", x0 + 10.4, z0 + 1.9, { yaw: 1.2 }],
    ["metal_stool_02", x1 - 8.2, zr - 0.5, { yaw: 2 }],
    ["wicker_basket_01", x0 + 14.2, z1 - 6.2, { yaw: 3 }],
  ])
    kit.prop(id, x, K + (o.y || 0), z, {
      interior: true,
      collide: false,
      cast: false,
      ...o,
    });
  kit.solid(x1 - 3.5, 0, z1 - 2.85, x1 - 2.3, K + 0.62, z1 - 2.15, "wood");
  return { box: { min: [x0, 0, z0], max: [x1, ridge, z1] } };
}
