// Everything with writing or a picture on it is painted on canvases at load time:
// neon and lightbox signs, lacquered signboards, lit windows, posters, lattice.
// Each family shares one atlas texture so hundreds of signs cost a handful of draw calls.
import * as THREE from "three";
import { markStatic } from "./texmem.js";

const SERIF = '"CT Serif", "Noto Serif TC", "Songti TC", "PingFang TC", serif';
const KAI =
  '"CT Kai", "LXGW WenKai TC", "Kaiti TC", "BiauKai", "CT Serif", serif';
const LATIN =
  '"Big Shoulders Display", "Barlow Condensed", "Arial Narrow", Impact, sans-serif';
// Latin letters from the display face, Chinese from the sign serif (the display faces have no CJK).
const MIXED = '"Big Shoulders Display", "Barlow Condensed", ' + SERIF;
const hasCJK = (t) => /[\u2e80-\u9fff\uff00-\uffef]/.test(t);

// Shop identities: [name, trade, english]. Invented names in the usual Cantonese pattern.
export const SHOPS = [
  ["金龍", "酒家", "GOLDEN DRAGON RESTAURANT"],
  ["龍鳳", "茶樓", "DRAGON PHOENIX TEA HOUSE"],
  ["福記", "麵家", "FOOK KEE NOODLES"],
  ["和興", "燒臘", "WO HING BBQ"],
  ["德記", "藥房", "TAK KEE PHARMACY"],
  ["萬利", "押", "MAN LEE PAWN"],
  ["寶華", "餅家", "PO WAH BAKERY"],
  ["新光", "電器", "SUN KWONG ELECTRIC"],
  ["玉蘭", "理髮", "YUK LAN BARBER"],
  ["興隆", "雜貨", "HING LUNG GROCERY"],
  ["安樂", "旅館", "ON LOK HOTEL"],
  ["長樂", "麻雀", "CHEUNG LOK MAHJONG"],
  ["吉祥", "海鮮", "KAT CHEUNG SEAFOOD"],
  ["如意", "涼茶", "YU YEE HERBAL TEA"],
  ["大發", "金行", "TAI FAT JEWELLERY"],
  ["順興", "洗衣", "SHUN HING LAUNDRY"],
  ["同福", "參茸", "TUNG FOOK GINSENG"],
  ["榮記", "粥粉", "WING KEE CONGEE"],
  ["明星", "冰室", "MING SING CAFE"],
  ["天寶", "書局", "TIN PO BOOKS"],
];
export const NEON_COLORS = [
  "#ff2a4f",
  "#ff7a1a",
  "#ffd23a",
  "#35f0c8",
  "#3aa8ff",
  "#ff4fd8",
  "#7dff5a",
  "#ff3b30",
];

export async function loadFonts() {
  const base = import.meta.env.BASE_URL || "/";
  const faces = [
    ["CT Serif", "assets/fonts/ct-serif.woff2", "900"],
    ["CT Kai", "assets/fonts/ct-kai.woff2", "700"],
  ];
  await Promise.all(
    faces.map(async ([family, url, weight]) => {
      try {
        const face = new FontFace(family, `url(${base}${url})`, { weight });
        document.fonts.add(await face.load());
      } catch (err) {
        console.warn(
          `[chinatown] font ${family} unavailable, using system fonts`,
          err,
        );
      }
    }),
  );
  try {
    await Promise.race([
      document.fonts.load(`900 40px ${LATIN}`),
      new Promise((r) => setTimeout(r, 400)),
    ]);
  } catch {}
}

function makeAtlas(size, bg, aniso, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  // skyline packer: each 8 px column remembers how far down it is filled
  const STEP = 8;
  const cols = new Uint16Array(size / STEP);
  return {
    canvas,
    ctx,
    tex,
    size,
    // returns the pixel rectangle and its texture coordinates [u0, v0, u1, v1] (v0 = bottom)
    alloc(w, h) {
      w = Math.ceil(w);
      h = Math.ceil(h);
      const wc = Math.ceil((w + 6) / STEP);
      let best = -1,
        bestY = 1e9;
      for (let i = 0; i + wc <= cols.length; i++) {
        let y = 0;
        for (let k = 0; k < wc; k++) if (cols[i + k] > y) y = cols[i + k];
        if (y < bestY) {
          bestY = y;
          best = i;
        }
      }
      if (best < 0 || bestY + h + 6 > size) {
        console.warn("[chinatown] sign atlas is full");
        return { x: 4, y: 4, w, h, uv: [0, 0, 0.01, 0.01] };
      }
      for (let k = 0; k < wc; k++) cols[best + k] = bestY + h + 6;
      const x = best * STEP + 3,
        y = bestY + 3;
      return {
        x,
        y,
        w,
        h,
        uv: [
          (x + 1) / size,
          1 - (y + h - 1) / size,
          (x + w - 1) / size,
          1 - (y + 1) / size,
        ],
      };
    },
  };
}

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  if (k >= 0) c.lerp(new THREE.Color(1, 1, 1), k);
  else c.multiplyScalar(1 + k);
  return "#" + c.getHexString();
};
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// Lays text out in a box, vertically (one glyph per cell, top to bottom) or horizontally.
function layout(
  ctx,
  text,
  x,
  y,
  w,
  h,
  vertical,
  font,
  weight,
  draw,
  squeeze = 0.92,
) {
  const chars = [...text];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (vertical) {
    const cell = h / chars.length;
    const size = Math.min(cell * squeeze, w * 0.96);
    ctx.font = `${weight} ${size}px ${font}`;
    chars.forEach((ch, i) =>
      draw(ch, x + w / 2, y + cell * (i + 0.5) + size * 0.03, size),
    );
  } else {
    let size = h * squeeze;
    ctx.font = `${weight} ${size}px ${font}`;
    const tw = ctx.measureText(text).width;
    if (tw > w * 0.96) {
      size *= (w * 0.96) / tw;
      ctx.font = `${weight} ${size}px ${font}`;
    }
    draw(text, x + w / 2, y + h / 2 + size * 0.03, size);
  }
}
function glowText(ctx, color) {
  return (t, cx, cy, size) => {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.42;
    ctx.fillStyle = color;
    ctx.fillText(t, cx, cy);
    ctx.shadowBlur = size * 0.16;
    ctx.fillText(t, cx, cy);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = shade(color, 0.72);
    ctx.lineWidth = Math.max(1, size * 0.018);
    ctx.strokeText(t, cx, cy);
    ctx.restore();
  };
}
function tube(ctx, color, width, path) {
  ctx.save();
  ctx.lineJoin = ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  path();
  ctx.stroke();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = shade(color, 0.75);
  ctx.lineWidth = Math.max(1, width * 0.4);
  ctx.stroke();
  ctx.restore();
}
function noise(ctx, x, y, w, h, rnd, n, alpha, dark = true) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * alpha;
    ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    const s = 1 + rnd() * 5;
    ctx.fillRect(x + rnd() * w, y + rnd() * h, s * (1 + rnd() * 6), s);
  }
}

export async function createSigns(kit) {
  await loadFonts();
  let rnd = kit.rnd,
    pick = kit.pick;
  // Runs fn with its own seeded random numbers, so optional extras (the easter eggs) can be
  // painted without shifting the street's shared random sequence.
  function isolated(seed, fn) {
    const saved = [rnd, pick];
    let s = seed | 0;
    rnd = (a = 1, b) => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return b === undefined ? r * a : a + (b - a) * r;
    };
    pick = (list) => list[Math.floor(rnd() * list.length) % list.length];
    try {
      return fn();
    } finally {
      [rnd, pick] = saved;
    }
  }
  const PPM = 150; // pixels per metre for signs
  const neonAtlas = makeAtlas(4096, "#000", kit.aniso);
  const boardAtlas = makeAtlas(4096, "#221c18", kit.aniso);
  const glassAtlas = makeAtlas(2048, "#000", Math.min(4, kit.aniso));
  const decalAtlas = makeAtlas(2048, null, Math.min(4, kit.aniso));

  // ---------- neon & lightboxes (emissive) ----------
  // spec: { text, sub, w, h (metres), vertical, color, trim, style: "tube" | "box" | "pawn", look }
  // look: { color, trim, face, mixed } replaces the chosen colours without changing how many
  // random numbers the sign consumes.
  function neon(spec) {
    const k = Math.min(1, 760 / (Math.max(spec.w, spec.h) * PPM));
    const W = spec.w * PPM * k,
      H = spec.h * PPM * k;
    const r = neonAtlas.alloc(W, H);
    const c = neonAtlas.ctx;
    const look = spec.look || {};
    const color0 = spec.color || pick(NEON_COLORS);
    const trim0 = spec.trim || pick(NEON_COLORS);
    const color = look.color || color0,
      trim = look.trim || trim0;
    const font = look.mixed ? MIXED : spec.kai ? KAI : SERIF;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const pad = Math.min(W, H) * 0.09;
    if (spec.style === "box") {
      // back-lit acrylic: bright face, dark lettering
      const face = look.face || spec.face || "#fff4d8";
      const g = c.createLinearGradient(r.x, r.y, r.x, r.y + H);
      g.addColorStop(0, shade(face, 0.1));
      g.addColorStop(0.5, face);
      g.addColorStop(1, shade(face, -0.25));
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(r.x, r.y, W, 3);
      c.fillRect(r.x, r.y + H - 3, W, 3);
      const subH = spec.sub
        ? spec.vertical
          ? Math.min(H * 0.1, W * 0.5)
          : H * 0.26
        : 0;
      c.fillStyle = color;
      layout(
        c,
        spec.text,
        r.x + pad,
        r.y + pad,
        W - pad * 2,
        H - pad * 2 - subH,
        spec.vertical,
        font,
        900,
        (t, x, y) => c.fillText(t, x, y),
      );
      if (spec.sub) {
        c.fillStyle = shade(color, -0.35);
        layout(
          c,
          spec.sub,
          r.x + pad,
          r.y + H - pad - subH,
          W - pad * 2,
          subH,
          false,
          LATIN,
          800,
          (t, x, y) => c.fillText(t, x, y),
          0.8,
        );
      }
      // tube shadows and dirt make the face uneven like a real lightbox
      for (let i = 0; i < 5; i++) {
        c.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.05})`;
        spec.vertical
          ? c.fillRect(r.x, r.y + (H * (i + 0.5)) / 5 - 2, W, 4)
          : c.fillRect(r.x + (W * (i + 0.5)) / 5 - 2, r.y, 4, H);
      }
      noise(c, r.x, r.y, W, H, rnd, 40, 0.12);
    } else {
      const g = c.createLinearGradient(r.x, r.y, r.x + W, r.y + H);
      g.addColorStop(0, "#0c0c10");
      g.addColorStop(1, "#050507");
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
      tube(c, trim, Math.max(2, pad * 0.16), () =>
        rr(
          c,
          r.x + pad * 0.42,
          r.y + pad * 0.42,
          W - pad * 0.84,
          H - pad * 0.84,
          pad * 0.5,
        ),
      );
      if (spec.style === "pawn") {
        // the bat-over-coin outline every pawn shop hangs out
        const cx = r.x + W / 2,
          top = r.y + pad * 1.5,
          rad = W * 0.34;
        tube(c, trim, Math.max(2, pad * 0.16), () => {
          c.beginPath();
          c.moveTo(cx - rad * 1.2, top + rad * 0.2);
          c.quadraticCurveTo(
            cx - rad * 0.6,
            top - rad * 0.25,
            cx,
            top + rad * 0.3,
          );
          c.quadraticCurveTo(
            cx + rad * 0.6,
            top - rad * 0.25,
            cx + rad * 1.2,
            top + rad * 0.2,
          );
          c.quadraticCurveTo(
            cx + rad * 0.7,
            top + rad * 0.9,
            cx,
            top + rad * 0.75,
          );
          c.quadraticCurveTo(
            cx - rad * 0.7,
            top + rad * 0.9,
            cx - rad * 1.2,
            top + rad * 0.2,
          );
        });
        tube(c, color, Math.max(2, pad * 0.2), () => {
          c.beginPath();
          c.arc(cx, r.y + H * 0.62, rad * 1.05, 0, Math.PI * 2);
        });
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.font = `900 ${rad * 1.35}px ${SERIF}`;
        glowText(c, color)(spec.text, cx, r.y + H * 0.63, rad * 1.35);
      } else {
        const subH = spec.sub
          ? spec.vertical
            ? Math.min(H * 0.09, W * 0.42)
            : H * 0.24
          : 0;
        layout(
          c,
          spec.text,
          r.x + pad * 1.2,
          r.y + pad * 1.2,
          W - pad * 2.4,
          H - pad * 2.4 - subH,
          spec.vertical,
          font,
          900,
          glowText(c, color),
        );
        if (spec.sub)
          layout(
            c,
            spec.sub,
            r.x + pad,
            r.y + H - pad * 1.1 - subH,
            W - pad * 2,
            subH,
            false,
            LATIN,
            800,
            glowText(c, trim),
            0.72,
          );
      }
    }
    c.restore();
    return { uv: r.uv, w: spec.w, h: spec.h, color };
  }

  // ---------- painted boards, posters, patterns (lit by the scene) ----------
  // spec: { text, sub, w, h, vertical, bg, fg, frame, kai, look: { bg, fg, mixed } }
  function board(spec) {
    const k = Math.min(1, 700 / (Math.max(spec.w, spec.h) * PPM));
    const W = spec.w * PPM * k,
      H = spec.h * PPM * k;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    const look = spec.look || {};
    const bg0 =
      spec.bg || pick(["#5c1410", "#143326", "#15171c", "#6b2f12", "#1c2a4a"]);
    const bg = look.bg || bg0;
    const fg = look.fg || spec.fg || "#e9c46a";
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const g = c.createLinearGradient(r.x, r.y, r.x, r.y + H);
    g.addColorStop(0, shade(bg, 0.12));
    g.addColorStop(1, shade(bg, -0.2));
    c.fillStyle = g;
    c.fillRect(r.x, r.y, W, H);
    noise(c, r.x, r.y, W, H, rnd, 140, 0.16);
    noise(c, r.x, r.y, W, H, rnd, 40, 0.07, false);
    const pad = Math.min(W, H) * 0.1;
    if (spec.frame !== false) {
      c.strokeStyle = fg;
      c.lineWidth = Math.max(2, pad * 0.16);
      c.strokeRect(
        r.x + pad * 0.45,
        r.y + pad * 0.45,
        W - pad * 0.9,
        H - pad * 0.9,
      );
      c.strokeStyle = "rgba(0,0,0,0.55)";
      c.lineWidth = Math.max(2, pad * 0.3);
      c.strokeRect(r.x, r.y, W, H);
    }
    const subH = spec.sub
      ? spec.vertical
        ? Math.min(H * 0.08, W * 0.4)
        : H * 0.24
      : 0;
    const paint = (t, x, y) => {
      c.fillStyle = "rgba(0,0,0,0.45)";
      c.fillText(t, x + 2, y + 3);
      c.fillStyle = fg;
      c.fillText(t, x, y);
    };
    layout(
      c,
      spec.text,
      r.x + pad * 1.3,
      r.y + pad * 1.2,
      W - pad * 2.6,
      H - pad * 2.4 - subH,
      spec.vertical,
      look.mixed ? MIXED : spec.kai === false ? SERIF : KAI,
      700,
      paint,
    );
    if (spec.sub)
      layout(
        c,
        spec.sub,
        r.x + pad,
        r.y + H - pad * 1.1 - subH,
        W - pad * 2,
        subH,
        false,
        LATIN,
        800,
        paint,
        0.72,
      );
    // weathering: paint worn off along the bottom, a few runs
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(20,14,10,${0.1 + rnd() * 0.2})`;
      const x = r.x + rnd() * W;
      c.fillRect(
        x,
        r.y + rnd() * H * 0.4,
        1 + rnd() * 3,
        H * (0.2 + rnd() * 0.5),
      );
    }
    c.restore();
    return { uv: r.uv, w: spec.w, h: spec.h };
  }
  // Paper notice. kind: "quarantine" | "evac" | "missing" | "bill"
  function poster(kind, w = 0.42, h = 0.6) {
    const W = w * PPM * 1.2,
      H = h * PPM * 1.2;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const paper =
      kind === "quarantine"
        ? "#d9c21f"
        : kind === "evac"
          ? "#e8e2d2"
          : kind === "bill"
            ? pick(["#c94a3a", "#d8b24a", "#e6dcc4"])
            : "#e9e6dc";
    c.fillStyle = paper;
    c.fillRect(r.x, r.y, W, H);
    c.textAlign = "center";
    c.textBaseline = "middle";
    const line = (t, y, size, font, color = "#111", weight = 900) => {
      c.font = `${weight} ${size}px ${font}`;
      c.fillStyle = color;
      let s = size;
      const tw = c.measureText(t).width;
      if (tw > W * 0.9) {
        s = (size * W * 0.9) / tw;
        c.font = `${weight} ${s}px ${font}`;
      }
      c.fillText(t, r.x + W / 2, r.y + y);
    };
    if (kind === "quarantine") {
      c.fillStyle = "#111";
      c.fillRect(r.x, r.y, W, H * 0.16);
      line("QUARANTINE", H * 0.08, H * 0.1, LATIN, "#d9c21f");
      line("隔離區", H * 0.34, H * 0.22, SERIF);
      line("禁止進入", H * 0.56, H * 0.15, SERIF, "#8a1010");
      line("NO ENTRY · INFECTED AREA", H * 0.72, H * 0.06, LATIN);
      c.lineWidth = H * 0.02;
      c.strokeStyle = "#111";
      c.beginPath();
      c.arc(r.x + W / 2, r.y + H * 0.87, H * 0.07, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(
          r.x + W / 2 + Math.cos(i * 2.094 - 1.57) * H * 0.045,
          r.y + H * 0.87 + Math.sin(i * 2.094 - 1.57) * H * 0.045,
          H * 0.045,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
    } else if (kind === "evac") {
      c.fillStyle = "#a01414";
      c.fillRect(r.x, r.y, W, H * 0.2);
      line("緊急疏散", H * 0.1, H * 0.13, SERIF, "#fff");
      line("EVACUATION ORDER", H * 0.28, H * 0.075, LATIN);
      line("檢疫站 · 東閘", H * 0.42, H * 0.09, SERIF);
      line("CHECKPOINT EAST GATE", H * 0.52, H * 0.055, LATIN, "#333");
      c.strokeStyle = "#a01414";
      c.lineWidth = H * 0.03;
      c.beginPath();
      c.moveTo(r.x + W * 0.2, r.y + H * 0.66);
      c.lineTo(r.x + W * 0.74, r.y + H * 0.66);
      c.moveTo(r.x + W * 0.62, r.y + H * 0.6);
      c.lineTo(r.x + W * 0.78, r.y + H * 0.66);
      c.lineTo(r.x + W * 0.62, r.y + H * 0.72);
      c.stroke();
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "rgba(0,0,0,0.5)";
        c.fillRect(
          r.x + W * 0.12,
          r.y + H * (0.79 + i * 0.045),
          W * (0.5 + rnd() * 0.26),
          H * 0.012,
        );
      }
    } else if (kind === "missing") {
      line("尋人", H * 0.11, H * 0.15, SERIF, "#a01414");
      line("MISSING", H * 0.24, H * 0.08, LATIN);
      const gx = r.x + W * 0.24,
        gy = r.y + H * 0.31,
        gw = W * 0.52,
        gh = H * 0.36;
      c.fillStyle = "#b9b4a6";
      c.fillRect(gx, gy, gw, gh);
      c.fillStyle = "#5f5a52";
      c.beginPath();
      c.arc(gx + gw / 2, gy + gh * 0.38, gw * 0.2, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(
        gx + gw / 2,
        gy + gh * 1.02,
        gw * 0.36,
        gh * 0.36,
        0,
        Math.PI,
        0,
      );
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "rgba(0,0,0,0.55)";
        c.fillRect(
          r.x + W * 0.14,
          r.y + H * (0.74 + i * 0.05),
          W * (0.45 + rnd() * 0.27),
          H * 0.014,
        );
      }
    } else {
      const words = pick([
        ["大減價", "SALE"],
        ["招租", "FOR RENT"],
        ["新張", "GRAND OPENING"],
        ["外賣", "TAKE AWAY"],
        ["平靚正", "BEST PRICE"],
      ]);
      line(words[0], H * 0.36, H * 0.26, KAI, "#161210", 700);
      line(words[1], H * 0.7, H * 0.1, LATIN, "#161210");
    }
    // stains, creases, torn corner
    noise(c, r.x, r.y, W, H, rnd, 60, 0.14);
    c.fillStyle = "rgba(60,40,20,0.18)";
    c.beginPath();
    c.ellipse(
      r.x + rnd() * W,
      r.y + rnd() * H,
      W * 0.3,
      H * 0.16,
      rnd() * 3,
      0,
      Math.PI * 2,
    );
    c.fill();
    c.restore();
    return { uv: r.uv, w, h };
  }
  // ---------- menus and easter-egg posters (lit by the scene, own random seed) ----------
  // Fits one line of text into maxW and draws it; returns the drawn width.
  function fitLine(c, t, x, y, maxW, size, font, weight, align = "left") {
    c.font = `${weight} ${size}px ${font}`;
    let tw = c.measureText(t).width;
    if (tw > maxW) {
      size *= maxW / tw;
      c.font = `${weight} ${size}px ${font}`;
      tw = maxW;
    }
    c.textAlign = align;
    c.textBaseline = "middle";
    c.fillText(t, x, y);
    return tw;
  }
  // spec: { style: "chalk" | "paper", title, sub, items: [[name, price, tag?] | ["#", heading]],
  //         foot, w, h (metres), accent, seed }
  function menu(spec) {
    return isolated(spec.seed ?? 7, () => paintMenu(spec));
  }
  function paintMenu(spec) {
    const MPPM = 560;
    const k = Math.min(1, 720 / (Math.max(spec.w, spec.h) * MPPM));
    const W = spec.w * MPPM * k,
      H = spec.h * MPPM * k;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    const chalk = spec.style === "chalk";
    const accent = spec.accent || (chalk ? "#ff9ec7" : "#b3140f");
    const ink = chalk ? "#f1eee4" : "#1b1512";
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const pad = W * 0.08;
    // ground
    if (chalk) {
      const g = c.createLinearGradient(r.x, r.y, r.x + W, r.y + H);
      g.addColorStop(0, "#27322c");
      g.addColorStop(1, "#161c19");
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
      // old writing wiped with a cloth: broad pale arcs
      for (let i = 0; i < 16; i++) {
        c.strokeStyle = `rgba(225,228,218,${0.025 + rnd() * 0.045})`;
        c.lineWidth = 10 + rnd() * 30;
        c.beginPath();
        c.arc(
          r.x + rnd() * W,
          r.y + rnd() * H,
          W * (0.15 + rnd() * 0.4),
          rnd() * 6,
          rnd() * 6 + 1.2,
        );
        c.stroke();
      }
    } else {
      const g = c.createLinearGradient(r.x, r.y, r.x, r.y + H);
      g.addColorStop(0, "#e9dfc6");
      g.addColorStop(1, "#d3c5a6");
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
    }
    // chalk is soft at the edges; ink is crisp
    const soft = (size) => {
      if (!chalk) return;
      c.shadowColor = "rgba(240,240,230,0.45)";
      c.shadowBlur = size * 0.09;
    };
    const plain = () => {
      c.shadowBlur = 0;
    };
    const mainFont = chalk ? KAI : SERIF;
    const mainWeight = chalk ? 700 : 900;
    const subFont = (t) => (hasCJK(t) ? KAI : LATIN);
    let y = r.y + pad * 0.7;
    // title
    const tH = H * 0.1;
    if (!chalk) {
      c.fillStyle = accent;
      c.fillRect(r.x, r.y, W, pad * 0.7 + tH * 1.25);
      c.fillStyle = "rgba(255,255,255,0.18)";
      c.fillRect(r.x, r.y + pad * 0.7 + tH * 1.25 - 3, W, 2);
    }
    c.fillStyle = chalk ? ink : "#fff6e6";
    soft(tH);
    fitLine(
      c,
      spec.title,
      r.x + W / 2,
      y + tH * 0.55,
      W - pad * 2,
      tH,
      chalk ? mainFont : SERIF,
      chalk ? 700 : 900,
      "center",
    );
    plain();
    y += tH * 1.25;
    if (spec.sub) {
      const sH = H * 0.036;
      c.fillStyle = accent;
      soft(sH);
      if (!chalk) y += sH * 0.5;
      fitLine(
        c,
        spec.sub,
        r.x + W / 2,
        y + sH * 0.6,
        W - pad * 2,
        sH,
        subFont(spec.sub),
        chalk ? 700 : 800,
        "center",
      );
      plain();
      y += sH * 1.6;
    }
    // divider: a wobbly chalk line, or a double printed rule
    c.strokeStyle = chalk ? "rgba(241,238,228,0.75)" : accent;
    c.lineWidth = chalk ? 2.2 : 1.6;
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const px = r.x + pad + ((W - pad * 2) * i) / 20;
      const py =
        y + (chalk ? Math.sin(i * 1.3) * 1.6 + (rnd() - 0.5) * 1.2 : 0);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    if (!chalk) {
      c.beginPath();
      c.moveTo(r.x + pad, y + 4);
      c.lineTo(r.x + W - pad, y + 4);
      c.stroke();
    }
    y += H * 0.03;
    // rows
    const footH = spec.foot ? H * 0.075 : 0;
    const rows = spec.items;
    const rowH = (r.y + H - pad * 0.6 - footH - y) / rows.length;
    for (const row of rows) {
      const cy = y + rowH / 2;
      if (row[0] === "#") {
        const hs = Math.min(rowH * 0.5, H * 0.04);
        c.fillStyle = accent;
        soft(hs);
        const tw = fitLine(
          c,
          row[1],
          r.x + W / 2,
          cy,
          W - pad * 2,
          hs,
          mainFont,
          mainWeight,
          "center",
        );
        plain();
        // short flourishes either side of the heading
        c.strokeStyle = accent;
        c.lineWidth = chalk ? 1.8 : 1.2;
        for (const sd of [-1, 1]) {
          c.beginPath();
          c.moveTo(r.x + W / 2 + sd * (tw / 2 + hs * 0.4), cy);
          c.lineTo(r.x + W / 2 + sd * (tw / 2 + hs * 1.6), cy);
          c.stroke();
        }
      } else {
        const [name, price, tag] = row;
        const size = Math.min(
          rowH * (chalk ? 0.56 : 0.64),
          H * (chalk ? 0.05 : 0.058),
        );
        c.fillStyle = ink;
        soft(size);
        const pw = price
          ? fitLine(
              c,
              price,
              r.x + W - pad,
              cy,
              W * 0.3,
              size * 0.95,
              mainFont,
              mainWeight,
              "right",
            )
          : 0;
        const nw = fitLine(
          c,
          name,
          r.x + pad,
          cy,
          W - pad * 2 - pw - size * (tag ? 2.2 : 0.8),
          size,
          mainFont,
          mainWeight,
        );
        plain();
        let x = r.x + pad + nw + size * 0.25;
        if (tag) {
          // a small boxed tag after the name: 招牌, 新, 推介 ...
          const ts = size * 0.5;
          c.font = `700 ${ts}px ${subFont(tag)}`;
          const tw = c.measureText(tag).width + ts * 0.7;
          c.fillStyle = accent;
          if (chalk) {
            c.strokeStyle = accent;
            c.lineWidth = 1.6;
            rr(c, x, cy - ts * 0.75, tw, ts * 1.5, ts * 0.3);
            c.stroke();
          } else {
            rr(c, x, cy - ts * 0.75, tw, ts * 1.5, ts * 0.3);
            c.fill();
            c.fillStyle = "#fff6e6";
          }
          c.textAlign = "center";
          c.fillText(tag, x + tw / 2, cy + ts * 0.04);
          x += tw + size * 0.2;
        }
        // dotted leader from the name to the price
        c.fillStyle = chalk ? "rgba(241,238,228,0.55)" : "rgba(30,20,15,0.5)";
        for (let px = x + 4; px < r.x + W - pad - pw - 6; px += size * 0.32)
          c.fillRect(px, cy + size * 0.28, 2, 2);
      }
      y += rowH;
    }
    if (spec.foot) {
      c.fillStyle = accent;
      soft(footH);
      fitLine(
        c,
        spec.foot,
        r.x + W / 2,
        r.y + H - pad * 0.6 - footH * 0.5,
        W - pad * 2,
        footH * 0.55,
        mainFont,
        mainWeight,
        "center",
      );
      plain();
    }
    if (chalk) {
      // a doodled heart in the corner, then chalk grain: flecks of slate through every stroke
      c.strokeStyle = accent;
      c.lineWidth = 2.4;
      const hx = r.x + W - pad * 1.1,
        hy = r.y + pad * 0.9,
        hs = pad * 0.42;
      c.beginPath();
      c.moveTo(hx, hy + hs);
      c.bezierCurveTo(
        hx - hs * 1.6,
        hy,
        hx - hs * 0.6,
        hy - hs,
        hx,
        hy - hs * 0.2,
      );
      c.bezierCurveTo(hx + hs * 0.6, hy - hs, hx + hs * 1.6, hy, hx, hy + hs);
      c.stroke();
      const n = Math.round((W * H) / 45);
      for (let i = 0; i < n; i++) {
        c.fillStyle = `rgba(28,36,32,${0.25 + rnd() * 0.5})`;
        c.fillRect(r.x + rnd() * W, r.y + rnd() * H, 1 + rnd() * 1.5, 1);
      }
    } else {
      // grease, a fold, sticky tape at the corners
      noise(c, r.x, r.y, W, H, rnd, 50, 0.1);
      c.fillStyle = "rgba(120,80,30,0.12)";
      c.beginPath();
      c.ellipse(r.x + W * 0.7, r.y + H * 0.78, W * 0.16, H * 0.07, 0.4, 0, 7);
      c.fill();
      c.fillStyle = "rgba(0,0,0,0.06)";
      c.fillRect(r.x, r.y + H * 0.5, W, 2);
      c.fillStyle = "rgba(235,235,215,0.55)";
      for (const [tx, ty, a] of [
        [0, 0, -0.6],
        [W, 0, 0.6],
        [0, H, 0.6],
        [W, H, -0.6],
      ]) {
        c.save();
        c.translate(r.x + tx, r.y + ty);
        c.rotate(a);
        c.fillRect(-W * 0.09, -W * 0.03, W * 0.18, W * 0.06);
        c.restore();
      }
    }
    c.restore();
    return { uv: r.uv, w: spec.w, h: spec.h };
  }
  // Easter-egg posters: "taptap" (game ad), "xd" (hiring notice), "cindy" (shop flyer).
  function eggPoster(kind, w = 0.42, h = 0.6) {
    const seed = { taptap: 201, xd: 202, cindy: 203 }[kind] || 200;
    return isolated(seed, () => paintEggPoster(kind, w, h));
  }
  function paintEggPoster(kind, w, h) {
    const W = w * 560,
      H = h * 560;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const line = (t, y, size, font, color, weight = 900) => {
      c.fillStyle = color;
      fitLine(
        c,
        t,
        r.x + W / 2,
        r.y + y,
        W * 0.86,
        size,
        font,
        weight,
        "center",
      );
    };
    if (kind === "taptap") {
      const g = c.createLinearGradient(r.x, r.y, r.x + W, r.y + H);
      g.addColorStop(0, "#22e0cf");
      g.addColorStop(1, "#0e9d93");
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
      // a rounded tile with a play mark
      const tx = r.x + W / 2,
        ty = r.y + H * 0.24,
        ts = W * 0.3;
      c.fillStyle = "#ffffff";
      rr(c, tx - ts / 2, ty - ts / 2, ts, ts, ts * 0.24);
      c.fill();
      c.fillStyle = "#13bfb1";
      c.beginPath();
      c.moveTo(tx - ts * 0.16, ty - ts * 0.22);
      c.lineTo(tx + ts * 0.24, ty);
      c.lineTo(tx - ts * 0.16, ty + ts * 0.22);
      c.closePath();
      c.fill();
      line("TapTap", H * 0.48, H * 0.13, LATIN, "#ffffff");
      line("發現好遊戲", H * 0.62, H * 0.085, SERIF, "#08443f");
      c.fillStyle = "rgba(255,255,255,0.9)";
      rr(c, r.x + W * 0.16, r.y + H * 0.72, W * 0.68, H * 0.1, H * 0.05);
      c.fill();
      line("新遊預約 · 搶先玩", H * 0.772, H * 0.052, SERIF, "#0e8a81");
      line("DISCOVER GREAT GAMES", H * 0.9, H * 0.04, LATIN, "#e9fffc", 800);
    } else if (kind === "xd") {
      c.fillStyle = "#f6f1ea";
      c.fillRect(r.x, r.y, W, H);
      // heart
      const hx = r.x + W / 2,
        hy = r.y + H * 0.2,
        hs = W * 0.16;
      c.fillStyle = "#ff4f8b";
      c.beginPath();
      c.moveTo(hx, hy + hs);
      c.bezierCurveTo(
        hx - hs * 1.7,
        hy - hs * 0.1,
        hx - hs * 0.7,
        hy - hs * 1.1,
        hx,
        hy - hs * 0.3,
      );
      c.bezierCurveTo(
        hx + hs * 0.7,
        hy - hs * 1.1,
        hx + hs * 1.7,
        hy - hs * 0.1,
        hx,
        hy + hs,
      );
      c.fill();
      line("心動", H * 0.43, H * 0.16, SERIF, "#1b1512");
      line("誠聘 · 一齊整好遊戲", H * 0.57, H * 0.065, SERIF, "#c2185b");
      line("策劃 / 程序 / 美術 / 運營", H * 0.68, H * 0.05, SERIF, "#3a302a");
      line("XD IS HIRING", H * 0.79, H * 0.06, LATIN, "#1b1512");
      // tear-off strips along the bottom
      for (let i = 0; i < 7; i++) {
        const sx = r.x + (W * (i + 0.5)) / 7;
        c.strokeStyle = "rgba(0,0,0,0.25)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(sx + W / 14, r.y + H * 0.86);
        c.lineTo(sx + W / 14, r.y + H);
        c.stroke();
        if (i === 2 || i === 5) {
          c.fillStyle = "#2a2a2a";
          c.fillRect(sx - W / 14 + 1, r.y + H * 0.86, W / 7 - 2, H * 0.14);
        }
      }
    } else {
      c.fillStyle = "#f3ead2";
      c.fillRect(r.x, r.y, W, H);
      c.fillStyle = "#173a36";
      c.fillRect(r.x, r.y, W, H * 0.3);
      // speech bubble
      const bx = r.x + W * 0.5,
        by = r.y + H * 0.14,
        bw = W * 0.34,
        bh = H * 0.13;
      c.fillStyle = "#ffe3a6";
      rr(c, bx - bw / 2, by - bh / 2, bw, bh, bh * 0.4);
      c.fill();
      c.beginPath();
      c.moveTo(bx - bw * 0.15, by + bh / 2 - 1);
      c.lineTo(bx - bw * 0.3, by + bh * 0.95);
      c.lineTo(bx + bw * 0.02, by + bh / 2 - 1);
      c.fill();
      c.fillStyle = "#173a36";
      for (const dx of [-1, 0, 1]) {
        c.beginPath();
        c.arc(bx + dx * bw * 0.22, by, bh * 0.1, 0, 7);
        c.fill();
      }
      line("Cindy", H * 0.39, H * 0.13, LATIN, "#173a36");
      line("有問必答 · 24 小時", H * 0.52, H * 0.066, SERIF, "#1b1512");
      line("搵人 搵路 搵食", H * 0.63, H * 0.058, SERIF, "#3a302a");
      line("搵路出城？問 Cindy", H * 0.74, H * 0.058, SERIF, "#b3140f");
      line("ASK CINDY · CINDY.APP", H * 0.88, H * 0.04, LATIN, "#173a36", 800);
    }
    noise(c, r.x, r.y, W, H, rnd, 50, 0.12);
    c.fillStyle = "rgba(60,40,20,0.16)";
    c.beginPath();
    c.ellipse(
      r.x + rnd() * W,
      r.y + rnd() * H,
      W * 0.26,
      H * 0.12,
      rnd() * 3,
      0,
      7,
    );
    c.fill();
    c.restore();
    return { uv: r.uv, w, h };
  }
  // Painted beam band for the gate and temple: blue-green ground, gold lines, lotus medallions.
  function beamPattern(w = 4, h = 0.5) {
    const W = Math.min(1800, w * PPM),
      H = h * PPM;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    c.fillStyle = "#12506b";
    c.fillRect(r.x, r.y, W, H);
    const n = Math.max(3, Math.round(W / (H * 2.2)));
    const cw = W / n;
    for (let i = 0; i < n; i++) {
      const x = r.x + i * cw;
      c.fillStyle = i % 2 ? "#1b7a55" : "#1a5fa0";
      c.fillRect(x + cw * 0.06, r.y + H * 0.12, cw * 0.88, H * 0.76);
      c.strokeStyle = "#e8c15a";
      c.lineWidth = H * 0.035;
      c.strokeRect(x + cw * 0.06, r.y + H * 0.12, cw * 0.88, H * 0.76);
      // medallion
      c.fillStyle = i % 2 ? "#c8442c" : "#e8c15a";
      c.beginPath();
      c.ellipse(x + cw / 2, r.y + H / 2, cw * 0.2, H * 0.26, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#f4e2a6";
      c.lineWidth = H * 0.025;
      c.stroke();
      for (let k = 0; k < 6; k++) {
        c.beginPath();
        c.ellipse(
          x + cw / 2 + Math.cos(k * 1.047) * cw * 0.1,
          r.y + H / 2 + Math.sin(k * 1.047) * H * 0.13,
          cw * 0.05,
          H * 0.07,
          k,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      // scrolls
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(
          x + cw / 2 + s * cw * 0.33,
          r.y + H / 2,
          H * 0.14,
          0,
          Math.PI * 1.5,
        );
        c.stroke();
      }
    }
    c.fillStyle = "#e8c15a";
    c.fillRect(r.x, r.y, W, H * 0.07);
    c.fillRect(r.x, r.y + H * 0.93, W, H * 0.07);
    noise(c, r.x, r.y, W, H, rnd, 120, 0.2);
    c.restore();
    return { uv: r.uv, w, h };
  }

  // ---------- lit windows (emissive) ----------
  const windows = [];
  function paintWindow(kind) {
    const W = 120,
      H = 170;
    const r = glassAtlas.alloc(W, H);
    const c = glassAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const warm = kind === "warm" || kind === "curtain" || kind === "blind";
    const base =
      kind === "tv"
        ? "#3f6ea8"
        : kind === "red"
          ? "#b3261a"
          : kind === "green"
            ? "#7fa06a"
            : kind === "dim"
              ? "#3a2a16"
              : "#e7a24a";
    const g = c.createRadialGradient(
      r.x + W * (0.3 + rnd() * 0.4),
      r.y + H * 0.35,
      4,
      r.x + W / 2,
      r.y + H / 2,
      H * 0.75,
    );
    g.addColorStop(0, shade(base, 0.35));
    g.addColorStop(0.55, base);
    g.addColorStop(1, shade(base, -0.6));
    c.fillStyle = g;
    c.fillRect(r.x, r.y, W, H);
    if (kind === "curtain") {
      for (let i = 0; i < 9; i++) {
        c.fillStyle = `rgba(90,40,10,${0.14 + (i % 2) * 0.2})`;
        c.fillRect(r.x + (W * i) / 9, r.y, W / 18, H);
      }
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(r.x + W * 0.46, r.y, W * 0.08, H);
    } else if (kind === "blind") {
      for (let i = 0; i < 16; i++) {
        c.fillStyle = "rgba(40,22,6,0.55)";
        c.fillRect(r.x, r.y + (H * i) / 16, W, H / 30);
      }
    } else if (warm || kind === "green") {
      // something of a room: a shelf line, a lamp, a figure-like dark shape
      c.fillStyle = "rgba(30,14,4,0.55)";
      c.fillRect(r.x, r.y + H * 0.72, W, H * 0.28);
      c.fillRect(
        r.x + W * (0.1 + rnd() * 0.5),
        r.y + H * 0.42,
        W * 0.22,
        H * 0.3,
      );
    }
    if (kind === "tv")
      for (let i = 0; i < 6; i++) {
        c.fillStyle = `rgba(190,220,255,${rnd() * 0.25})`;
        c.fillRect(r.x + rnd() * W, r.y + rnd() * H, W * 0.3, H * 0.1);
      }
    // rain on the glass
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(0,0,0,${0.08 + rnd() * 0.14})`;
      c.fillRect(r.x + rnd() * W, r.y + rnd() * H, 1.5, 6 + rnd() * 22);
    }
    c.restore();
    return r.uv;
  }
  for (const k of [
    "warm",
    "curtain",
    "blind",
    "warm",
    "curtain",
    "tv",
    "red",
    "green",
    "dim",
    "dim",
    "blind",
    "warm",
  ])
    windows.push(paintWindow(k));

  // ---------- decals with transparency: lattice, blood, grime ----------
  function lattice() {
    const S = 256;
    const r = decalAtlas.alloc(S, S);
    const c = decalAtlas.ctx;
    c.save();
    c.translate(r.x, r.y);
    c.strokeStyle = "#fff";
    c.lineWidth = 9;
    c.lineJoin = "miter";
    const cell = S / 4;
    c.strokeRect(4, 4, S - 8, S - 8);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const ox = x * cell,
          oy = y * cell;
        c.strokeRect(
          ox + cell * 0.22,
          oy + cell * 0.22,
          cell * 0.56,
          cell * 0.56,
        );
        c.beginPath();
        c.moveTo(ox, oy + cell / 2);
        c.lineTo(ox + cell * 0.22, oy + cell / 2);
        c.moveTo(ox + cell * 0.78, oy + cell / 2);
        c.lineTo(ox + cell, oy + cell / 2);
        c.moveTo(ox + cell / 2, oy);
        c.lineTo(ox + cell / 2, oy + cell * 0.22);
        c.moveTo(ox + cell / 2, oy + cell * 0.78);
        c.lineTo(ox + cell / 2, oy + cell);
        c.stroke();
      }
    c.restore();
    return r.uv;
  }
  function blood(kind) {
    const S = 256;
    const r = decalAtlas.alloc(S, S);
    const c = decalAtlas.ctx;
    c.save();
    c.translate(r.x, r.y);
    const blob = (x, y, rx, ry, a) => {
      const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, `rgba(74,6,4,${a})`);
      g.addColorStop(0.7, `rgba(52,4,3,${a * 0.9})`);
      g.addColorStop(1, "rgba(40,2,2,0)");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, y, rx, ry, rnd() * 3, 0, Math.PI * 2);
      c.fill();
    };
    if (kind === "pool") {
      blob(S / 2, S / 2, S * 0.3, S * 0.24, 0.95);
      for (let i = 0; i < 14; i++)
        blob(
          S / 2 + (rnd() - 0.5) * S * 0.7,
          S / 2 + (rnd() - 0.5) * S * 0.7,
          6 + rnd() * 26,
          5 + rnd() * 18,
          0.85,
        );
    } else if (kind === "smear") {
      for (let i = 0; i < 26; i++)
        blob(
          S * (0.12 + i * 0.03),
          S * (0.3 + Math.sin(i * 0.4) * 0.05 + i * 0.012),
          16 + rnd() * 16,
          22 - i * 0.5,
          0.5 + rnd() * 0.3,
        );
      for (let i = 0; i < 5; i++) {
        c.fillStyle = "rgba(60,5,4,0.8)";
        c.fillRect(
          S * (0.2 + rnd() * 0.6),
          S * 0.4,
          3 + rnd() * 4,
          S * (0.15 + rnd() * 0.4),
        );
      }
    } else {
      // hand print with drag marks
      const px = S * 0.5,
        py = S * 0.42;
      blob(px, py, S * 0.11, S * 0.13, 0.9);
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * 0.5;
        blob(
          px + Math.sin(a) * S * 0.17,
          py - Math.cos(a) * S * 0.2,
          S * 0.028,
          S * 0.075,
          0.9,
        );
      }
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "rgba(60,5,4,0.6)";
        c.fillRect(
          px - S * 0.09 + i * S * 0.055,
          py + S * 0.05,
          S * 0.025,
          S * (0.2 + rnd() * 0.25),
        );
      }
    }
    c.restore();
    return r.uv;
  }
  const decals = {
    lattice: lattice(),
    pool: [blood("pool"), blood("pool")],
    smear: [blood("smear"), blood("smear")],
    hand: [blood("hand"), blood("hand")],
  };

  const mats = {
    neon: kit.glowMap(neonAtlas.tex, 2.6),
    neonFaulty: kit.glowMap(neonAtlas.tex, 2.6),
    board: kit.painted(boardAtlas.tex, { rough: 0.55, wet: "wood" }),
    glass: kit.glowMap(glassAtlas.tex, 1.5),
    lattice: kit.painted(decalAtlas.tex, {
      alphaTest: 0.5,
      side: true,
      rough: 0.5,
      wet: "wood",
    }),
    blood: kit.painted(decalAtlas.tex, {
      transparent: true,
      rough: 0.18,
      wet: "glazed",
    }),
  };
  mats.lattice.color.set(0x7a1710);
  mats.blood.name = "ct_decal";

  return {
    neon,
    board,
    poster,
    menu,
    eggPoster,
    beamPattern,
    windows,
    decals,
    mats,
    atlases: {
      neon: neonAtlas,
      board: boardAtlas,
      glass: glassAtlas,
      decal: decalAtlas,
    },
    // final: nothing more will be drawn. On the low preset the atlases are then uploaded at
    // half resolution (4096 -> 2048): about 80 MB less GPU memory, and the full-size canvases
    // are released.
    finish({ final = false } = {}) {
      const half = final && (kit.G.quality.tex || 1024) < 1024;
      for (const a of [neonAtlas, boardAtlas, glassAtlas, decalAtlas]) {
        if (half && a.canvas.width > 1024) {
          const c = document.createElement("canvas");
          c.width = c.height = a.canvas.width >> 1;
          const x = c.getContext("2d");
          x.imageSmoothingQuality = "high";
          x.drawImage(a.canvas, 0, 0, c.width, c.height);
          a.canvas.width = a.canvas.height = 1;
          a.canvas = c;
          a.ctx = x;
          a.tex.image = c;
        }
        a.tex.needsUpdate = true;
        // nothing is painted after the last finish: a phone lets the canvas go once uploaded
        if (final) markStatic(a.tex);
      }
    },
  };
}
