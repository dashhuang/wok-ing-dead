// Everything with writing or a picture on it is painted on canvases at load time:
// neon and lightbox signs, lacquered signboards, lit windows, shop interiors, posters, lattice.
// Each family shares one atlas texture so hundreds of signs cost a handful of draw calls.
import * as THREE from "three";

const SERIF = '"CT Serif", "Noto Serif TC", "Songti TC", "PingFang TC", serif';
const KAI = '"CT Kai", "LXGW WenKai TC", "Kaiti TC", "BiauKai", "CT Serif", serif';
const LATIN = '"Big Shoulders Display", "Barlow Condensed", "Arial Narrow", Impact, sans-serif';

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
export const NEON_COLORS = ["#ff2a4f", "#ff7a1a", "#ffd23a", "#35f0c8", "#3aa8ff", "#ff4fd8", "#7dff5a", "#ff3b30"];

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
        console.warn(`[chinatown] font ${family} unavailable, using system fonts`, err);
      }
    }),
  );
  try {
    await Promise.race([document.fonts.load(`900 40px ${LATIN}`), new Promise((r) => setTimeout(r, 400))]);
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
      let best = -1, bestY = 1e9;
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
      const x = best * STEP + 3, y = bestY + 3;
      return { x, y, w, h, uv: [(x + 1) / size, 1 - (y + h - 1) / size, (x + w - 1) / size, 1 - (y + 1) / size] };
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
function layout(ctx, text, x, y, w, h, vertical, font, weight, draw, squeeze = 0.92) {
  const chars = [...text];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (vertical) {
    const cell = h / chars.length;
    const size = Math.min(cell * squeeze, w * 0.96);
    ctx.font = `${weight} ${size}px ${font}`;
    chars.forEach((ch, i) => draw(ch, x + w / 2, y + cell * (i + 0.5) + size * 0.03, size));
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
  const { rnd, pick } = kit;
  const PPM = 150; // pixels per metre for signs
  const neonAtlas = makeAtlas(4096, "#000", kit.aniso);
  const boardAtlas = makeAtlas(4096, "#221c18", kit.aniso);
  const glassAtlas = makeAtlas(2048, "#000", Math.min(4, kit.aniso));
  const decalAtlas = makeAtlas(2048, null, Math.min(4, kit.aniso));

  // ---------- neon & lightboxes (emissive) ----------
  // spec: { text, sub, w, h (metres), vertical, color, trim, style: "tube" | "box" | "pawn" }
  function neon(spec) {
    const k = Math.min(1, 760 / (Math.max(spec.w, spec.h) * PPM));
    const W = spec.w * PPM * k, H = spec.h * PPM * k;
    const r = neonAtlas.alloc(W, H);
    const c = neonAtlas.ctx;
    const color = spec.color || pick(NEON_COLORS);
    const trim = spec.trim || pick(NEON_COLORS);
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const pad = Math.min(W, H) * 0.09;
    if (spec.style === "box") {
      // back-lit acrylic: bright face, dark lettering
      const face = spec.face || "#fff4d8";
      const g = c.createLinearGradient(r.x, r.y, r.x, r.y + H);
      g.addColorStop(0, shade(face, 0.1));
      g.addColorStop(0.5, face);
      g.addColorStop(1, shade(face, -0.25));
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(r.x, r.y, W, 3);
      c.fillRect(r.x, r.y + H - 3, W, 3);
      const subH = spec.sub ? (spec.vertical ? Math.min(H * 0.1, W * 0.5) : H * 0.26) : 0;
      c.fillStyle = color;
      layout(c, spec.text, r.x + pad, r.y + pad, W - pad * 2, H - pad * 2 - subH, spec.vertical, spec.kai ? KAI : SERIF, 900, (t, x, y) => c.fillText(t, x, y));
      if (spec.sub) {
        c.fillStyle = shade(color, -0.35);
        layout(c, spec.sub, r.x + pad, r.y + H - pad - subH, W - pad * 2, subH, false, LATIN, 800, (t, x, y) => c.fillText(t, x, y), 0.8);
      }
      // tube shadows and dirt make the face uneven like a real lightbox
      for (let i = 0; i < 5; i++) {
        c.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.05})`;
        spec.vertical ? c.fillRect(r.x, r.y + (H * (i + 0.5)) / 5 - 2, W, 4) : c.fillRect(r.x + (W * (i + 0.5)) / 5 - 2, r.y, 4, H);
      }
      noise(c, r.x, r.y, W, H, rnd, 40, 0.12);
    } else {
      const g = c.createLinearGradient(r.x, r.y, r.x + W, r.y + H);
      g.addColorStop(0, "#0c0c10");
      g.addColorStop(1, "#050507");
      c.fillStyle = g;
      c.fillRect(r.x, r.y, W, H);
      tube(c, trim, Math.max(2, pad * 0.16), () => rr(c, r.x + pad * 0.42, r.y + pad * 0.42, W - pad * 0.84, H - pad * 0.84, pad * 0.5));
      if (spec.style === "pawn") {
        // the bat-over-coin outline every pawn shop hangs out
        const cx = r.x + W / 2, top = r.y + pad * 1.5, rad = W * 0.34;
        tube(c, trim, Math.max(2, pad * 0.16), () => {
          c.beginPath();
          c.moveTo(cx - rad * 1.2, top + rad * 0.2);
          c.quadraticCurveTo(cx - rad * 0.6, top - rad * 0.25, cx, top + rad * 0.3);
          c.quadraticCurveTo(cx + rad * 0.6, top - rad * 0.25, cx + rad * 1.2, top + rad * 0.2);
          c.quadraticCurveTo(cx + rad * 0.7, top + rad * 0.9, cx, top + rad * 0.75);
          c.quadraticCurveTo(cx - rad * 0.7, top + rad * 0.9, cx - rad * 1.2, top + rad * 0.2);
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
        const subH = spec.sub ? (spec.vertical ? Math.min(H * 0.09, W * 0.42) : H * 0.24) : 0;
        layout(c, spec.text, r.x + pad * 1.2, r.y + pad * 1.2, W - pad * 2.4, H - pad * 2.4 - subH, spec.vertical, spec.kai ? KAI : SERIF, 900, glowText(c, color));
        if (spec.sub)
          layout(c, spec.sub, r.x + pad, r.y + H - pad * 1.1 - subH, W - pad * 2, subH, false, LATIN, 800, glowText(c, trim), 0.72);
      }
    }
    c.restore();
    return { uv: r.uv, w: spec.w, h: spec.h, color };
  }

  // ---------- painted boards, posters, patterns (lit by the scene) ----------
  // spec: { text, sub, w, h, vertical, bg, fg, frame, kai }
  function board(spec) {
    const k = Math.min(1, 700 / (Math.max(spec.w, spec.h) * PPM));
    const W = spec.w * PPM * k, H = spec.h * PPM * k;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    const bg = spec.bg || pick(["#5c1410", "#143326", "#15171c", "#6b2f12", "#1c2a4a"]);
    const fg = spec.fg || "#e9c46a";
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
      c.strokeRect(r.x + pad * 0.45, r.y + pad * 0.45, W - pad * 0.9, H - pad * 0.9);
      c.strokeStyle = "rgba(0,0,0,0.55)";
      c.lineWidth = Math.max(2, pad * 0.3);
      c.strokeRect(r.x, r.y, W, H);
    }
    const subH = spec.sub ? (spec.vertical ? Math.min(H * 0.08, W * 0.4) : H * 0.24) : 0;
    const paint = (t, x, y) => {
      c.fillStyle = "rgba(0,0,0,0.45)";
      c.fillText(t, x + 2, y + 3);
      c.fillStyle = fg;
      c.fillText(t, x, y);
    };
    layout(c, spec.text, r.x + pad * 1.3, r.y + pad * 1.2, W - pad * 2.6, H - pad * 2.4 - subH, spec.vertical, spec.kai === false ? SERIF : KAI, 700, paint);
    if (spec.sub) layout(c, spec.sub, r.x + pad, r.y + H - pad * 1.1 - subH, W - pad * 2, subH, false, LATIN, 800, paint, 0.72);
    // weathering: paint worn off along the bottom, a few runs
    for (let i = 0; i < 7; i++) {
      c.fillStyle = `rgba(20,14,10,${0.1 + rnd() * 0.2})`;
      const x = r.x + rnd() * W;
      c.fillRect(x, r.y + rnd() * H * 0.4, 1 + rnd() * 3, H * (0.2 + rnd() * 0.5));
    }
    c.restore();
    return { uv: r.uv, w: spec.w, h: spec.h };
  }
  // Paper notice. kind: "quarantine" | "evac" | "missing" | "bill"
  function poster(kind, w = 0.42, h = 0.6) {
    const W = w * PPM * 1.2, H = h * PPM * 1.2;
    const r = boardAtlas.alloc(W, H);
    const c = boardAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const paper = kind === "quarantine" ? "#d9c21f" : kind === "evac" ? "#e8e2d2" : kind === "bill" ? pick(["#c94a3a", "#d8b24a", "#e6dcc4"]) : "#e9e6dc";
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
        c.arc(r.x + W / 2 + Math.cos(i * 2.094 - 1.57) * H * 0.045, r.y + H * 0.87 + Math.sin(i * 2.094 - 1.57) * H * 0.045, H * 0.045, 0, Math.PI * 2);
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
        c.fillRect(r.x + W * 0.12, r.y + H * (0.79 + i * 0.045), W * (0.5 + rnd() * 0.26), H * 0.012);
      }
    } else if (kind === "missing") {
      line("尋人", H * 0.11, H * 0.15, SERIF, "#a01414");
      line("MISSING", H * 0.24, H * 0.08, LATIN);
      const gx = r.x + W * 0.24, gy = r.y + H * 0.31, gw = W * 0.52, gh = H * 0.36;
      c.fillStyle = "#b9b4a6";
      c.fillRect(gx, gy, gw, gh);
      c.fillStyle = "#5f5a52";
      c.beginPath();
      c.arc(gx + gw / 2, gy + gh * 0.38, gw * 0.2, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(gx + gw / 2, gy + gh * 1.02, gw * 0.36, gh * 0.36, 0, Math.PI, 0);
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "rgba(0,0,0,0.55)";
        c.fillRect(r.x + W * 0.14, r.y + H * (0.74 + i * 0.05), W * (0.45 + rnd() * 0.27), H * 0.014);
      }
    } else {
      const words = pick([["大減價", "SALE"], ["招租", "FOR RENT"], ["新張", "GRAND OPENING"], ["外賣", "TAKE AWAY"], ["平靚正", "BEST PRICE"]]);
      line(words[0], H * 0.36, H * 0.26, KAI, "#161210", 700);
      line(words[1], H * 0.7, H * 0.1, LATIN, "#161210");
    }
    // stains, creases, torn corner
    noise(c, r.x, r.y, W, H, rnd, 60, 0.14);
    c.fillStyle = "rgba(60,40,20,0.18)";
    c.beginPath();
    c.ellipse(r.x + rnd() * W, r.y + rnd() * H, W * 0.3, H * 0.16, rnd() * 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return { uv: r.uv, w, h };
  }
  // Painted beam band for the gate and temple: blue-green ground, gold lines, lotus medallions.
  function beamPattern(w = 4, h = 0.5) {
    const W = Math.min(1800, w * PPM), H = h * PPM;
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
        c.ellipse(x + cw / 2 + Math.cos(k * 1.047) * cw * 0.1, r.y + H / 2 + Math.sin(k * 1.047) * H * 0.13, cw * 0.05, H * 0.07, k, 0, Math.PI * 2);
        c.stroke();
      }
      // scrolls
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(x + cw / 2 + s * cw * 0.33, r.y + H / 2, H * 0.14, 0, Math.PI * 1.5);
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

  // ---------- lit windows & shop interiors (emissive) ----------
  const windows = [];
  function paintWindow(kind) {
    const W = 120, H = 170;
    const r = glassAtlas.alloc(W, H);
    const c = glassAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const warm = kind === "warm" || kind === "curtain" || kind === "blind";
    const base = kind === "tv" ? "#3f6ea8" : kind === "red" ? "#b3261a" : kind === "green" ? "#7fa06a" : kind === "dim" ? "#3a2a16" : "#e7a24a";
    const g = c.createRadialGradient(r.x + W * (0.3 + rnd() * 0.4), r.y + H * 0.35, 4, r.x + W / 2, r.y + H / 2, H * 0.75);
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
      c.fillRect(r.x + W * (0.1 + rnd() * 0.5), r.y + H * 0.42, W * 0.22, H * 0.3);
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
  for (const k of ["warm", "curtain", "blind", "warm", "curtain", "tv", "red", "green", "dim", "dim", "blind", "warm"]) windows.push(paintWindow(k));

  const interiors = {};
  function paintInterior(kind) {
    const W = 420, H = 300;
    const r = glassAtlas.alloc(W, H);
    const c = glassAtlas.ctx;
    c.save();
    c.beginPath();
    c.rect(r.x, r.y, r.w, r.h);
    c.clip();
    const wall = { grocery: "#c9b07a", diner: "#a8442c", herbs: "#7a4a24", bbq: "#e2dcc8", tea: "#6f7f4f", dark: "#1a1f24" }[kind];
    const g = c.createLinearGradient(r.x, r.y, r.x, r.y + H);
    g.addColorStop(0, shade(wall, 0.25));
    g.addColorStop(0.7, wall);
    g.addColorStop(1, shade(wall, -0.55));
    c.fillStyle = g;
    c.fillRect(r.x, r.y, W, H);
    const rect = (x, y, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(r.x + x * W, r.y + y * H, w * W, h * H);
    };
    if (kind === "grocery" || kind === "tea") {
      for (let s = 0; s < 4; s++) {
        rect(0.03, 0.16 + s * 0.2, 0.94, 0.02, "rgba(40,25,10,0.8)");
        for (let i = 0; i < 22; i++) {
          const col = kind === "tea" ? pick(["#8a1c14", "#c9a13a", "#1f5a3a", "#d8d2c0", "#3a2a1a"]) : pick(["#d8342a", "#f0c330", "#2f8f4f", "#2a6fc0", "#f2efe6", "#e57a22", "#b22a6a"]);
          const w = 0.02 + rnd() * 0.025, h = 0.07 + rnd() * 0.08;
          rect(0.04 + i * 0.042, 0.16 + s * 0.2 - h, w, h, col);
        }
      }
      rect(0, 0.82, 1, 0.18, "rgba(30,18,8,0.85)");
    } else if (kind === "herbs") {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 14; x++) {
          rect(0.04 + x * 0.066, 0.08 + y * 0.09, 0.058, 0.078, y % 2 ? "#5e3517" : "#6c3f1c");
          rect(0.062 + x * 0.066, 0.115 + y * 0.09, 0.014, 0.012, "#d9b45a");
        }
      rect(0, 0.74, 1, 0.26, "rgba(35,18,6,0.9)");
      for (let i = 0; i < 6; i++) rect(0.08 + i * 0.15, 0.6, 0.07, 0.14, "rgba(220,200,150,0.55)");
    } else if (kind === "diner") {
      for (let i = 0; i < 5; i++) {
        const x = 0.1 + i * 0.2;
        c.fillStyle = "#ff5a2a";
        c.beginPath();
        c.ellipse(r.x + x * W, r.y + H * 0.2, W * 0.035, H * 0.07, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(255,210,120,0.9)";
        c.beginPath();
        c.ellipse(r.x + x * W, r.y + H * 0.2, W * 0.016, H * 0.035, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "#e8dcc6";
        c.beginPath();
        c.ellipse(r.x + (0.14 + i * 0.24) * W, r.y + H * 0.72, W * 0.09, H * 0.045, 0, 0, Math.PI * 2);
        c.fill();
        rect(0.13 + i * 0.24, 0.74, 0.02, 0.2, "rgba(40,16,8,0.9)");
      }
      rect(0, 0.92, 1, 0.08, "rgba(30,10,6,0.9)");
    } else if (kind === "bbq") {
      rect(0, 0.1, 1, 0.025, "#8a8a8a");
      for (let i = 0; i < 9; i++) {
        const x = 0.08 + i * 0.1;
        rect(x + 0.014, 0.12, 0.004, 0.07, "#555");
        c.fillStyle = pick(["#a8431a", "#b9521c", "#8e3212", "#c96a22"]);
        c.beginPath();
        c.ellipse(r.x + (x + 0.016) * W, r.y + H * 0.34, W * 0.032, H * 0.16, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(255,200,120,0.35)";
        c.beginPath();
        c.ellipse(r.x + (x + 0.008) * W, r.y + H * 0.3, W * 0.01, H * 0.1, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (let y = 0; y < 6; y++) rect(0, 0.56 + y * 0.075, 1, 0.004, "rgba(0,0,0,0.25)");
      rect(0, 0.8, 1, 0.2, "#9aa0a0");
    } else {
      rect(0.1, 0.3, 0.3, 0.5, "rgba(0,0,0,0.6)");
      rect(0.55, 0.45, 0.35, 0.4, "rgba(0,0,0,0.6)");
      c.fillStyle = "rgba(120,150,170,0.5)";
      c.fillRect(r.x + W * 0.62, r.y + H * 0.06, W * 0.2, H * 0.03);
    }
    // soft vignette so the depth reads
    const v = c.createRadialGradient(r.x + W / 2, r.y + H * 0.4, H * 0.2, r.x + W / 2, r.y + H / 2, W * 0.7);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = v;
    c.fillRect(r.x, r.y, W, H);
    c.restore();
    interiors[kind] = r.uv;
  }
  for (const k of ["grocery", "diner", "herbs", "bbq", "tea", "dark"]) paintInterior(k);

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
        const ox = x * cell, oy = y * cell;
        c.strokeRect(ox + cell * 0.22, oy + cell * 0.22, cell * 0.56, cell * 0.56);
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
      for (let i = 0; i < 14; i++) blob(S / 2 + (rnd() - 0.5) * S * 0.7, S / 2 + (rnd() - 0.5) * S * 0.7, 6 + rnd() * 26, 5 + rnd() * 18, 0.85);
    } else if (kind === "smear") {
      for (let i = 0; i < 26; i++) blob(S * (0.12 + i * 0.03), S * (0.3 + Math.sin(i * 0.4) * 0.05 + i * 0.012), 16 + rnd() * 16, 22 - i * 0.5, 0.5 + rnd() * 0.3);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = "rgba(60,5,4,0.8)";
        c.fillRect(S * (0.2 + rnd() * 0.6), S * 0.4, 3 + rnd() * 4, S * (0.15 + rnd() * 0.4));
      }
    } else {
      // hand print with drag marks
      const px = S * 0.5, py = S * 0.42;
      blob(px, py, S * 0.11, S * 0.13, 0.9);
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * 0.5;
        blob(px + Math.sin(a) * S * 0.17, py - Math.cos(a) * S * 0.2, S * 0.028, S * 0.075, 0.9);
      }
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "rgba(60,5,4,0.6)";
        c.fillRect(px - S * 0.09 + i * S * 0.055, py + S * 0.05, S * 0.025, S * (0.2 + rnd() * 0.25));
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
    shop: kit.glowMap(glassAtlas.tex, 2.1),
    lattice: kit.painted(decalAtlas.tex, { alphaTest: 0.5, side: true, rough: 0.5, wet: "wood" }),
    blood: kit.painted(decalAtlas.tex, { transparent: true, rough: 0.18, wet: "glazed" }),
  };
  mats.lattice.color.set(0x7a1710);
  mats.blood.name = "ct_decal";

  return {
    neon,
    board,
    poster,
    beamPattern,
    windows,
    interiors,
    decals,
    mats,
    atlases: { neon: neonAtlas, board: boardAtlas, glass: glassAtlas, decal: decalAtlas },
    finish() {
      for (const a of [neonAtlas, boardAtlas, glassAtlas, decalAtlas]) a.tex.needsUpdate = true;
    },
  };
}
