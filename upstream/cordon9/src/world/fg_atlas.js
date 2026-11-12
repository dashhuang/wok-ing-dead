var TAU2 = Math.PI * 2;
var SANS2 = "Arial, Helvetica, sans-serif";
var COND2 = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
var SERIF2 = 'Georgia, "Times New Roman", serif';
var MONO2 = '"Courier New", monospace';
var IMP2 = 'Impact, "Arial Black", sans-serif';
var NAVY = "#16284a";
var GOLD = "#d9a520";
var CREAM = "#e6e2d4";
var INK = "#14130f";
var EYEL = "#e3b90e";
var EGRN = "#17683a";
var ERED = "#b3261c";
var OLIVE = "#4a5136";
var BONE = "#d8d4c4";
function pack2(W, list, gap = 4) {
  const out = {};
  let x = gap, y = gap, rowH = 0;
  for (const e of [...list].sort((a, b) => b.h - a.h)) {
    if (x + e.w + gap > W) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    out[e.name] = [x, y, e.w, e.h, e.draw];
    x += e.w + gap;
    rowH = Math.max(rowH, e.h);
  }
  return { entries: out, height: y + rowH + gap };
}
var board2 = (c, w, h, bg, border, bw = 8) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  if (border) {
    c.strokeStyle = border;
    c.lineWidth = bw;
    c.strokeRect(bw * 1.2, bw * 1.2, w - bw * 2.4, h - bw * 2.4);
  }
};
function blob2(c, x, y, r, rnd, jag = 0.35, n = 11) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU2, rr = r * (1 - jag + rnd() * jag * 2), px2 = x + Math.cos(a) * rr, py2 = y + Math.sin(a) * rr;
    if (i) c.lineTo(px2, py2);
    else c.moveTo(px2, py2);
  }
  c.closePath();
}
function weather(c, w, h, rnd, amt = 0.3, green = 0.3) {
  c.save();
  c.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 24; i++) {
    const x = rnd() * w, y0 = rnd() * h * 0.5, len = (0.2 + rnd() * 0.8) * h, ww = 2 + rnd() * 9, g2 = c.createLinearGradient(0, y0, 0, y0 + len);
    g2.addColorStop(0, `rgba(28,24,16,${0.2 * amt + rnd() * 0.3 * amt})`);
    g2.addColorStop(1, "rgba(28,24,16,0)");
    c.fillStyle = g2;
    c.fillRect(x, y0, ww, len);
  }
  const ga = c.createLinearGradient(0, h * 0.6, 0, h);
  ga.addColorStop(0, "rgba(40,58,24,0)");
  ga.addColorStop(1, `rgba(40,58,24,${0.5 * green})`);
  c.fillStyle = ga;
  c.fillRect(0, h * 0.6, w, h * 0.4);
  for (let i = 0; i < 50; i++) {
    c.fillStyle = `rgba(20,16,12,${rnd() * 0.15 * amt})`;
    blob2(c, rnd() * w, rnd() * h, 5 + rnd() * rnd() * 50, rnd, 0.4);
    c.fill();
  }
  c.restore();
}
var cross = (c, x, y, s, col) => {
  c.fillStyle = col;
  c.fillRect(x - s * 0.5, y - s * 0.17, s, s * 0.34);
  c.fillRect(x - s * 0.17, y - s * 0.5, s * 0.34, s);
};
var arrow = (c, x, y, len, rot2, col, wd = 0.34) => {
  c.save();
  c.translate(x, y);
  c.rotate(rot2);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(len / 2, 0);
  c.lineTo(len * 0.08, -len * wd);
  c.lineTo(len * 0.08, -len * wd * 0.4);
  c.lineTo(-len / 2, -len * wd * 0.4);
  c.lineTo(-len / 2, len * wd * 0.4);
  c.lineTo(len * 0.08, len * wd * 0.4);
  c.lineTo(len * 0.08, len * wd);
  c.closePath();
  c.fill();
  c.restore();
};
var stripes2 = (c, x, y, w, h, a, b, pitch) => {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = a;
  c.fillRect(x, y, w, h);
  c.fillStyle = b;
  for (let k = -h * 2; k < w + h * 2; k += pitch * 2) {
    c.beginPath();
    c.moveTo(x + k, y + h);
    c.lineTo(x + k + pitch, y + h);
    c.lineTo(x + k + pitch + h, y);
    c.lineTo(x + k + h, y);
    c.closePath();
    c.fill();
  }
  c.restore();
};
function kestrel(c, x, y, s, col, bg = null) {
  c.save();
  c.translate(x, y);
  c.scale(s / 100, s / 100);
  if (bg) {
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(-58, -66);
    c.lineTo(58, -66);
    c.lineTo(58, 10);
    c.quadraticCurveTo(54, 56, 0, 78);
    c.quadraticCurveTo(-54, 56, -58, 10);
    c.closePath();
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 5;
    c.stroke();
  }
  c.fillStyle = col;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * 6, -12);
    c.quadraticCurveTo(sx * 30, -52, sx * 52, -44);
    c.quadraticCurveTo(sx * 44, -30, sx * 46, -18);
    c.lineTo(sx * 36, -22);
    c.lineTo(sx * 36, -8);
    c.lineTo(sx * 26, -14);
    c.lineTo(sx * 24, 0);
    c.lineTo(sx * 14, -6);
    c.quadraticCurveTo(sx * 10, 4, sx * 6, 6);
    c.closePath();
    c.fill();
  }
  c.beginPath();
  c.ellipse(0, -2, 9, 20, 0, 0, TAU2);
  c.fill();
  c.beginPath();
  c.arc(0, -26, 8, 0, TAU2);
  c.fill();
  c.beginPath();
  c.moveTo(-2, -22);
  c.lineTo(9, -19);
  c.lineTo(-1, -16);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(-9, 14);
  c.lineTo(-14, 44);
  c.lineTo(-5, 36);
  c.lineTo(0, 48);
  c.lineTo(5, 36);
  c.lineTo(14, 44);
  c.lineTo(9, 14);
  c.closePath();
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = col;
  c.beginPath();
  c.moveTo(-36, 40);
  c.lineTo(0, 62);
  c.lineTo(36, 40);
  c.stroke();
  c.restore();
}
function seg7(c, x, y, w, h, d, on = "#ffb020", off = "#2a1a08") {
  const M = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g", " ": "" }[d] || "", t = w * 0.17, g2 = t * 0.25;
  const S4 = { a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t], f: [x, y + t, t, h / 2 - t * 1.5], b: [x + w - t, y + t, t, h / 2 - t * 1.5], e: [x, y + h / 2 + t / 2, t, h / 2 - t * 1.5], c: [x + w - t, y + h / 2 + t / 2, t, h / 2 - t * 1.5] };
  for (const k in S4) {
    const s = S4[k];
    c.fillStyle = M.includes(k) ? on : off;
    c.fillRect(s[0] + g2, s[1] + g2, s[2] - 2 * g2, s[3] - 2 * g2);
  }
}
var person = (c, x, y, s, col, skirt = false) => {
  c.save();
  c.fillStyle = col;
  c.strokeStyle = col;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.arc(x, y - s * 0.385, s * 0.082, 0, TAU2);
  c.fill();
  c.lineWidth = s * 0.06;
  c.beginPath();
  if (skirt) {
    c.moveTo(x - s * 0.085, y - s * 0.245);
    c.lineTo(x + s * 0.085, y - s * 0.245);
    c.lineTo(x + s * 0.2, y + s * 0.13);
    c.lineTo(x - s * 0.2, y + s * 0.13);
  } else {
    c.moveTo(x - s * 0.105, y - s * 0.245);
    c.lineTo(x + s * 0.105, y - s * 0.245);
    c.lineTo(x + s * 0.09, y + s * 0.1);
    c.lineTo(x - s * 0.09, y + s * 0.1);
  }
  c.closePath();
  c.fill();
  c.stroke();
  c.lineWidth = s * 0.062;
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(x + d * s * (skirt ? 0.15 : 0.175), y - s * 0.235);
    c.lineTo(x + d * s * (skirt ? 0.235 : 0.2), y + s * 0.07);
    c.stroke();
  }
  c.lineWidth = s * (skirt ? 0.066 : 0.09);
  for (const d of [-1, 1]) {
    c.beginPath();
    c.moveTo(x + d * s * 0.058, y + s * 0.12);
    c.lineTo(x + d * s * (skirt ? 0.058 : 0.066), y + s * 0.44);
    c.stroke();
  }
  c.restore();
};
var runner = (c, x, y, s, col) => {
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineWidth = s * 0.1;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.arc(x + s * 0.12, y - s * 0.36, s * 0.09, 0, TAU2);
  c.fill();
  c.beginPath();
  c.moveTo(x + s * 0.06, y - s * 0.22);
  c.lineTo(x - s * 0.06, y + s * 0.06);
  c.lineTo(x + s * 0.14, y + s * 0.2);
  c.lineTo(x + s * 0.1, y + s * 0.42);
  c.moveTo(x - s * 0.06, y + s * 0.06);
  c.lineTo(x - s * 0.2, y + s * 0.26);
  c.lineTo(x - s * 0.38, y + s * 0.22);
  c.moveTo(x + s * 0.04, y - s * 0.16);
  c.lineTo(x + s * 0.24, y - s * 0.06);
  c.lineTo(x + s * 0.36, y - s * 0.16);
  c.moveTo(x + s * 0.02, y - s * 0.16);
  c.lineTo(x - s * 0.2, y - s * 0.14);
  c.lineTo(x - s * 0.28, y);
  c.stroke();
};
var typed = (c, x, y, w, h, r, col = "#3a3a3a", lh = 9) => {
  c.fillStyle = col;
  for (let yy = y; yy < y + h - lh * 0.5; yy += lh) {
    const full = r() > 0.2;
    c.globalAlpha = 0.55 + r() * 0.3;
    c.fillRect(x, yy, w * (full ? 0.86 + r() * 0.14 : 0.3 + r() * 0.4), lh * 0.42);
  }
  c.globalAlpha = 1;
};
var SKIN = [[238, 204, 178], [224, 182, 150], [200, 152, 114], [164, 116, 80], [124, 84, 56], [92, 62, 42]];
var HAIRC = [[24, 20, 18], [50, 34, 24], [94, 62, 36], [170, 134, 80], [128, 56, 30], [36, 28, 24], [150, 150, 152], [224, 220, 212]];
var CLOTHC = [[44, 64, 116], [146, 36, 40], [54, 96, 62], [214, 210, 200], [44, 44, 50], [200, 154, 44], [114, 72, 124], [72, 114, 144]];
var portrait = (c, x, y, w, h, r, mono = 0) => {
  const sk = SKIN[Math.floor(r() * 6)], age = r(), old = age > 0.8, kid = age < 0.24, hc = HAIRC[old ? 6 + Math.floor(r() * 2) : Math.floor(r() * 6)], cl8 = CLOTHC[Math.floor(r() * 8)], cl22 = CLOTHC[Math.floor(r() * 8)];
  let style = Math.floor(r() * 8);
  if (kid && style === 3) style = 0;
  const turn = (r() - 0.5) * 0.7, tilt = (r() - 0.5) * 0.2, lit = r() < 0.5 ? -1 : 1, glasses = r() < (old ? 0.6 : 0.18), beard = !kid && style !== 7 && r() < 0.24, smile = r(), bgk = Math.floor(r() * 3), ct = kid && r() < 0.5 ? 3 : Math.floor(r() * 4), jaw = kid ? 0.84 : 0.62 + r() * 0.24;
  const col = (a, k = 1, al = 1) => {
    let [R4, G4, B2] = a.map((v) => Math.min(255, v * k));
    if (mono) {
      const l = Math.max(0, Math.min(255, (0.3 * R4 + 0.59 * G4 + 0.11 * B2 - 118) * 1.32 + 122));
      R4 = G4 = B2 = l;
    }
    return `rgba(${R4 | 0},${G4 | 0},${B2 | 0},${al})`;
  };
  const ell2 = (ex, ey2, rx, ry, f3, rot2 = 0) => {
    c.fillStyle = f3;
    c.beginPath();
    c.ellipse(ex, ey2, Math.max(0.3, rx), Math.max(0.3, ry), rot2, 0, TAU2);
    c.fill();
  };
  const hw = w * (kid ? 0.165 : 0.175), hh = hw * (kid ? 1.16 : 1.34), hx = x + w * (0.5 + turn * 0.1), hy = y + h * (kid ? 0.5 : 0.44), nb2 = y + h * 0.78, sw = w * (kid ? 0.3 : 0.44), fx = hx + turn * hw * 0.5, ey = hy + hh * (kid ? 0.14 : 0.04), ed = hw * 0.43;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.lineCap = "round";
  c.lineJoin = "round";
  if (bgk === 0) {
    c.fillStyle = col([112, 132, 160]);
    c.fillRect(x, y, w, h);
    for (let i = 0; i < 14; i++) ell2(x + r() * w, y + r() * h, w * (0.1 + r() * 0.2), h * (0.1 + r() * 0.2), col([150, 168, 190], 0.8 + r() * 0.4, 0.22));
  } else if (bgk === 1) {
    const g2 = c.createLinearGradient(0, y, 0, y + h);
    g2.addColorStop(0, col([196, 208, 218]));
    g2.addColorStop(0.45, col([168, 182, 176]));
    g2.addColorStop(0.5, col([62, 86, 52]));
    g2.addColorStop(1, col([40, 58, 36]));
    c.fillStyle = g2;
    c.fillRect(x, y, w, h);
    for (let i = 0; i < 26; i++) ell2(x + r() * w, y + h * (0.42 + r() * 0.5), w * (0.04 + r() * 0.08), h * (0.03 + r() * 0.06), col([70 + r() * 40, 104 + r() * 40, 56], 1, 0.4));
  } else {
    c.fillStyle = col([188, 176, 150]);
    c.fillRect(x, y, w, h);
    const dx = x + w * (lit > 0 ? 0.08 : 0.74);
    c.fillStyle = col([120, 98, 72]);
    c.fillRect(dx, y, w * 0.18, h);
    c.fillStyle = col([92, 74, 54]);
    c.fillRect(dx + w * 0.02, y, w * 0.14, h);
    c.fillStyle = col([150, 140, 118]);
    c.fillRect(x, y + h * 0.62, w, h * 0.012);
  }
  {
    const g2 = c.createRadialGradient(hx, hy, hw, hx, hy, w * 0.75);
    g2.addColorStop(0, "rgba(0,0,0,0)");
    g2.addColorStop(1, "rgba(0,0,0,0.42)");
    c.fillStyle = g2;
    c.fillRect(x, y, w, h);
  }
  const sh = new Path2D();
  sh.moveTo(hx - sw, y + h + 2);
  sh.bezierCurveTo(hx - sw, nb2 + h * 0.03, hx - hw * 0.9, nb2 + h * 0.01, hx - hw * 0.5, nb2 - h * 0.05);
  sh.lineTo(hx + hw * 0.5, nb2 - h * 0.05);
  sh.bezierCurveTo(hx + hw * 0.9, nb2 + h * 0.01, hx + sw, nb2 + h * 0.03, hx + sw, y + h + 2);
  sh.closePath();
  if (ct === 2) ell2(hx, nb2 - h * 0.03, hw * 1.25, h * 0.11, col(cl8, 0.72));
  c.fillStyle = col(cl8);
  c.fill(sh);
  c.save();
  c.clip(sh);
  {
    const g2 = c.createLinearGradient(hx - lit * sw, 0, hx + lit * sw, 0);
    g2.addColorStop(0, "rgba(0,0,0,0.45)");
    g2.addColorStop(0.6, "rgba(0,0,0,0.05)");
    g2.addColorStop(1, "rgba(255,255,255,0.1)");
    c.fillStyle = g2;
    c.fillRect(x, nb2 - h * 0.1, w, h * 0.4);
  }
  for (let i = 0; i < 5; i++) {
    c.strokeStyle = "rgba(0,0,0,0.16)";
    c.lineWidth = w * 0.012;
    c.beginPath();
    const fxx = hx + (r() - 0.5) * sw * 1.7;
    c.moveTo(fxx, nb2 + h * 0.02);
    c.quadraticCurveTo(fxx + (r() - 0.5) * w * 0.1, nb2 + h * 0.12, fxx + (r() - 0.5) * w * 0.12, y + h);
    c.stroke();
  }
  if (ct === 1 || ct === 3) {
    c.fillStyle = col(ct === 3 ? [232, 232, 226] : cl8, 1.25);
    c.beginPath();
    c.moveTo(hx - hw * 0.5, nb2 - h * 0.05);
    c.lineTo(hx, nb2 + h * 0.14);
    c.lineTo(hx + hw * 0.5, nb2 - h * 0.05);
    c.lineTo(hx + hw * 0.78, nb2 + h * 0.05);
    c.lineTo(hx, nb2 + h * 0.24);
    c.lineTo(hx - hw * 0.78, nb2 + h * 0.05);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(0,0,0,0.3)";
    c.lineWidth = w * 8e-3;
    c.stroke();
  }
  if (ct === 3) {
    c.fillStyle = col(cl22, 0.9);
    c.beginPath();
    c.moveTo(hx - hw * 0.1, nb2 + h * 0.06);
    c.lineTo(hx + hw * 0.1, nb2 + h * 0.06);
    c.lineTo(hx + hw * 0.16, y + h);
    c.lineTo(hx - hw * 0.16, y + h);
    c.closePath();
    c.fill();
    c.strokeStyle = col(cl22, 1.5, 0.7);
    c.lineWidth = w * 0.012;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(hx - hw * 0.12, nb2 + h * (0.1 + i * 0.05));
      c.lineTo(hx + hw * 0.12, nb2 + h * (0.12 + i * 0.05));
      c.stroke();
    }
  }
  if (ct === 2) {
    c.strokeStyle = col([226, 222, 210], 1, 0.9);
    c.lineWidth = w * 0.012;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(hx + s * hw * 0.3, nb2 + h * 0.02);
      c.lineTo(hx + s * hw * 0.34, nb2 + h * 0.17);
      c.stroke();
    }
  }
  c.restore();
  c.translate(hx, nb2);
  c.rotate(tilt);
  c.translate(-hx, -nb2);
  if (style === 1) ell2(hx, hy + hh * 0.42, hw * 1.34, hh * 1.5, col(hc, 0.82));
  else if (style === 2) ell2(hx, hy + hh * 0.02, hw * 1.3, hh * 1.14, col(hc, 0.82));
  else if (style === 7) {
    ell2(hx, hy + hh * 0.3, hw * 1.42, hh * 1.5, col(cl22, 0.86));
  } else if (style === 4) for (let i = 0; i < 22; i++) {
    const a = Math.PI * (1.05 + 0.9 * (i / 21)) + (r() - 0.5) * 0.2, rr = 0.95 + r() * 0.3;
    ell2(hx + Math.cos(a) * hw * rr, hy - hh * 0.1 + Math.sin(a) * hh * rr, hw * 0.3, hw * 0.3, col(hc, 0.75 + r() * 0.3));
  }
  else if (style === 5) ell2(hx - lit * hw * 0.5, hy - hh * 1.08, hw * 0.42, hw * 0.4, col(hc, 0.85));
  c.fillStyle = col(sk, 0.74);
  c.fillRect(hx - hw * 0.42, hy + hh * 0.55, hw * 0.84, nb2 - hy - hh * 0.5);
  ell2(hx, hy + hh * 1.02, hw * 0.62, hh * 0.2, "rgba(0,0,0,0.3)");
  if (style !== 1 && style !== 2 && style !== 7) for (const s of [-1, 1]) {
    ell2(hx + s * hw * (1 - s * turn * 0.25), hy + hh * 0.1, hw * 0.13, hh * 0.19, col(sk, 0.84));
    ell2(hx + s * hw * (0.98 - s * turn * 0.25), hy + hh * 0.1, hw * 0.06, hh * 0.1, col(sk, 0.6));
  }
  const face = new Path2D();
  face.moveTo(hx, hy - hh);
  face.bezierCurveTo(hx + hw * 1.06, hy - hh, hx + hw * 1.04, hy + hh * 0.22, hx + hw * jaw, hy + hh * 0.64);
  face.quadraticCurveTo(hx + hw * 0.42, hy + hh * 1.03, hx + turn * hw * 0.3, hy + hh * 1.02);
  face.quadraticCurveTo(hx - hw * 0.42, hy + hh * 1.03, hx - hw * jaw, hy + hh * 0.64);
  face.bezierCurveTo(hx - hw * 1.04, hy + hh * 0.22, hx - hw * 1.06, hy - hh, hx, hy - hh);
  face.closePath();
  {
    const g2 = c.createRadialGradient(hx + lit * hw * 0.4, hy - hh * 0.25, hw * 0.1, hx, hy, hw * 1.55);
    g2.addColorStop(0, col(sk, 1.1));
    g2.addColorStop(0.5, col(sk, 0.98));
    g2.addColorStop(1, col(sk, 0.58));
    c.fillStyle = g2;
    c.fill(face);
  }
  c.save();
  c.clip(face);
  ell2(hx - lit * hw * 0.95, hy + hh * 0.1, hw * 0.55, hh * 1.1, "rgba(30,14,8,0.22)");
  if (!mono) for (const s of [-1, 1]) ell2(fx + s * hw * 0.55, ey + hh * 0.36, hw * 0.24, hh * 0.13, "rgba(190,70,60,0.13)");
  if (beard) {
    const b = c.createLinearGradient(0, ey + hh * 0.25, 0, hy + hh);
    b.addColorStop(0, col(hc, 0.9, 0));
    b.addColorStop(0.35, col(hc, 0.9, 0.78));
    b.addColorStop(1, col(hc, 0.8, 0.92));
    c.fillStyle = b;
    c.fillRect(hx - hw * 1.1, ey + hh * 0.25, hw * 2.2, hh);
  }
  if (old) {
    c.strokeStyle = "rgba(40,20,10,0.28)";
    c.lineWidth = hw * 0.03;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(fx + s * hw * 0.2, ey + hh * 0.34);
      c.quadraticCurveTo(fx + s * hw * 0.42, ey + hh * 0.48, fx + s * hw * 0.4, ey + hh * 0.72);
      c.stroke();
      c.beginPath();
      c.moveTo(fx + s * ed - hw * 0.16, ey + hh * 0.13);
      c.quadraticCurveTo(fx + s * ed, ey + hh * 0.18, fx + s * ed + hw * 0.16, ey + hh * 0.12);
      c.stroke();
    }
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(fx - hw * 0.5, hy - hh * (0.48 + i * 0.1));
      c.quadraticCurveTo(fx, hy - hh * (0.52 + i * 0.1), fx + hw * 0.5, hy - hh * (0.48 + i * 0.1));
      c.stroke();
    }
  }
  const es3 = kid ? 1.25 : 1;
  for (const s of [-1, 1]) {
    const ex = fx + s * ed * (1 - s * turn * 0.3), ew = hw * 0.18 * es3 * (1 - s * turn * 0.35);
    ell2(ex, ey - hh * 0.03, ew * 1.5, hh * 0.13, "rgba(40,18,10,0.2)");
    ell2(ex, ey, ew, hh * 0.062 * es3, col([238, 234, 226]));
    ell2(ex + turn * hw * 0.08, ey, hh * 0.058 * es3, hh * 0.06 * es3, col(r() < 0.3 ? [70, 96, 120] : [48, 32, 22]));
    ell2(ex + turn * hw * 0.08, ey, hh * 0.026 * es3, hh * 0.026 * es3, col([8, 8, 8]));
    ell2(ex + turn * hw * 0.08 + lit * hh * 0.02, ey - hh * 0.02, hh * 0.012, hh * 0.012, "rgba(255,255,255,0.9)");
    c.strokeStyle = col([30, 18, 12], 1, 0.85);
    c.lineWidth = hw * 0.035;
    c.beginPath();
    c.moveTo(ex - ew, ey);
    c.quadraticCurveTo(ex, ey - hh * 0.1 * es3, ex + ew, ey);
    c.stroke();
    c.strokeStyle = col(hc, old ? 0.8 : 0.7, 0.9);
    c.lineWidth = hw * (kid ? 0.05 : 0.075);
    c.beginPath();
    c.moveTo(ex - s * ew * 1.1, ey - hh * (0.15 + smile * 0.03));
    c.quadraticCurveTo(ex, ey - hh * 0.23 * es3, ex + s * ew * 1.25, ey - hh * 0.16);
    c.stroke();
  }
  c.strokeStyle = col(sk, 0.52, 0.8);
  c.lineWidth = hw * 0.045;
  c.beginPath();
  if (!kid) {
    c.moveTo(fx - lit * hw * 0.09, ey + hh * 0.06);
    c.lineTo(fx - lit * hw * 0.13 + turn * hw * 0.2, ey + hh * 0.36);
  } else c.moveTo(fx - hw * 0.12 + turn * hw * 0.2, ey + hh * 0.36);
  c.quadraticCurveTo(fx + turn * hw * 0.2, ey + hh * 0.45, fx + hw * 0.13 + turn * hw * 0.2, ey + hh * 0.36);
  c.stroke();
  ell2(fx + lit * hw * 0.03 + turn * hw * 0.15, ey + hh * 0.24, hw * 0.05, hh * 0.12, "rgba(255,255,255,0.16)");
  {
    const my = ey + hh * 0.62, mw = hw * (0.3 + smile * 0.2), mx = fx + turn * hw * 0.12, lip = col([Math.max(60, sk[0] * 0.66), sk[1] * 0.4, sk[2] * 0.4]);
    if (smile > 0.55) {
      c.fillStyle = col([240, 234, 224]);
      c.beginPath();
      c.moveTo(mx - mw, my - hh * 0.02);
      c.quadraticCurveTo(mx, my + hh * 0.03, mx + mw, my - hh * 0.02);
      c.quadraticCurveTo(mx, my + hh * 0.17, mx - mw, my - hh * 0.02);
      c.fill();
      c.strokeStyle = lip;
      c.lineWidth = hw * 0.055;
      c.stroke();
    } else {
      c.strokeStyle = lip;
      c.lineWidth = hw * 0.07;
      c.beginPath();
      c.moveTo(mx - mw, my - (smile - 0.3) * hh * 0.05);
      c.quadraticCurveTo(mx, my + (smile - 0.25) * hh * 0.16, mx + mw, my - (smile - 0.3) * hh * 0.05);
      c.stroke();
    }
    ell2(mx, my + hh * 0.14, mw * 0.6, hh * 0.035, "rgba(40,16,10,0.2)");
  }
  c.restore();
  const cap2 = (line, part2) => {
    c.fillStyle = col(hc);
    c.beginPath();
    c.moveTo(hx - hw * 1.05, hy - hh * 0.05);
    c.bezierCurveTo(hx - hw * 1.2, hy - hh * 1.25, hx + hw * 1.2, hy - hh * 1.25, hx + hw * 1.05, hy - hh * 0.05);
    c.quadraticCurveTo(hx + hw * 0.95, hy - hh * line, hx + part2 * hw, hy - hh * (line + 0.2));
    c.quadraticCurveTo(hx - hw * 0.9, hy - hh * line, hx - hw * 1.05, hy - hh * 0.05);
    c.closePath();
    c.fill();
    c.strokeStyle = col(hc, 1.7, 0.3);
    c.lineWidth = hw * 0.03;
    for (let i = 0; i < 9; i++) {
      const t = (i + r()) / 9 * 2 - 1;
      c.beginPath();
      c.moveTo(hx + part2 * hw, hy - hh * (line + 0.3));
      c.quadraticCurveTo(hx + t * hw * 0.8, hy - hh * 1.12, hx + t * hw * 1.05, hy - hh * (0.25 + r() * 0.3));
      c.stroke();
    }
  };
  const part = (r() - 0.5) * 1;
  if (style === 0) cap2(0.5 + r() * 0.16, part);
  else if (style === 1) {
    cap2(0.5, part);
    for (const s of [-1, 1]) ell2(hx + s * hw * 1.08, hy + hh * 0.55, hw * 0.3, hh * 1.15, col(hc, 0.94), s * -0.06);
  } else if (style === 2) {
    cap2(0.34, part * 0.3);
    c.fillStyle = col(hc, 1.06);
    c.fillRect(hx - hw * 0.94, hy - hh * 0.68, hw * 1.88, hh * 0.3);
    for (const s of [-1, 1]) ell2(hx + s * hw * 1.06, hy + hh * 0.18, hw * 0.26, hh * 0.72, col(hc, 0.94));
  } else if (style === 3) {
    for (const s of [-1, 1]) ell2(hx + s * hw * 0.98, hy - hh * 0.28, hw * 0.2, hh * 0.36, col(hc, 0.9));
    ell2(hx + lit * hw * 0.3, hy - hh * 0.72, hw * 0.3, hh * 0.1, "rgba(255,255,255,0.22)");
  } else if (style === 4) for (let i = 0; i < 14; i++) {
    const a = Math.PI * (1.12 + 0.76 * (i / 13));
    ell2(hx + Math.cos(a) * hw * 0.82, hy - hh * 0.08 + Math.sin(a) * hh * 0.84, hw * 0.27, hw * 0.27, col(hc, 0.85 + r() * 0.35));
  }
  else if (style === 5) cap2(0.62, part * 0.4);
  else if (style === 6) {
    for (const s of [-1, 1]) ell2(hx + s * hw * 0.96, hy - hh * 0.2, hw * 0.16, hh * 0.26, col(hc, 0.9));
    c.fillStyle = col(cl22);
    c.beginPath();
    c.moveTo(hx - hw * 1.1, hy - hh * 0.36);
    c.bezierCurveTo(hx - hw * 1.15, hy - hh * 1.42, hx + hw * 1.15, hy - hh * 1.42, hx + hw * 1.1, hy - hh * 0.36);
    c.closePath();
    c.fill();
    c.fillStyle = col(cl22, 0.72);
    c.fillRect(hx - hw * 1.12, hy - hh * 0.56, hw * 2.24, hh * 0.22);
    c.strokeStyle = col(cl22, 1.4, 0.4);
    c.lineWidth = hw * 0.03;
    for (let i = -5; i <= 5; i++) {
      c.beginPath();
      c.moveTo(hx + i * hw * 0.2, hy - hh * 0.56);
      c.lineTo(hx + i * hw * 0.2, hy - hh * 0.36);
      c.stroke();
    }
  } else {
    c.strokeStyle = col(cl22);
    c.lineWidth = hw * 0.34;
    c.beginPath();
    c.ellipse(hx, hy + hh * 0.04, hw * 1.08, hh * 1.1, 0, Math.PI * 0.72, Math.PI * 2.28);
    c.stroke();
    c.strokeStyle = col(cl22, 0.7, 0.8);
    c.lineWidth = hw * 0.04;
    c.beginPath();
    c.ellipse(hx, hy + hh * 0.04, hw * 0.93, hh * 0.96, 0, Math.PI * 0.8, Math.PI * 2.2);
    c.stroke();
    ell2(hx, hy + hh * 1.16, hw * 0.8, hh * 0.24, col(cl22, 0.9));
  }
  if (glasses) {
    c.strokeStyle = col([20, 20, 22], 1, 0.92);
    c.lineWidth = hw * 0.05;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(fx + s * ed * (1 - s * turn * 0.3), ey + hh * 0.01, hw * 0.3, hh * 0.17, 0, 0, TAU2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(fx - ed + hw * 0.3, ey - hh * 0.02);
    c.quadraticCurveTo(fx, ey - hh * 0.08, fx + ed - hw * 0.3, ey - hh * 0.02);
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.5)";
    c.lineWidth = hw * 0.03;
    c.beginPath();
    c.moveTo(fx - ed - hw * 0.12, ey - hh * 0.06);
    c.lineTo(fx - ed + hw * 0.02, ey - hh * 0.13);
    c.stroke();
  }
  c.restore();
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  if (mono) {
    for (let i = 0; i < 70; i++) {
      c.fillStyle = r() < 0.6 ? `rgba(20,20,20,${0.2 + r() * 0.5})` : `rgba(240,240,236,${0.3 + r() * 0.5})`;
      c.fillRect(x + r() * w, y + r() * h, 0.6 + r() * 1.6, 0.6 + r() * 1.6);
    }
    for (let i = 0; i < 3; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? "10,10,10" : "245,245,240"},${0.06 + r() * 0.12})`;
      c.fillRect(x + r() * w, y, 1 + r() * 3, h);
    }
  } else {
    c.fillStyle = `rgba(${200 + r() * 40},${170 + r() * 40},${120 + r() * 40},${0.06 + r() * 0.12})`;
    c.fillRect(x, y, w, h);
    ell2(x + w * (0.5 + lit * 0.3), y + h * 0.12, w * 0.3, h * 0.12, "rgba(255,255,255,0.08)");
  }
  c.restore();
};
var scrawl = (c, x, y, w, lines, lh, r, col = "#1c2a6a") => {
  c.save();
  c.strokeStyle = col;
  c.lineWidth = Math.max(0.9, lh * 0.09);
  c.lineCap = "round";
  c.lineJoin = "round";
  for (let l = 0; l < lines; l++) {
    let px2 = x + r() * lh * 0.4;
    const py2 = y + l * lh + lh * 0.7, end = x + w * (l === lines - 1 ? 0.35 + r() * 0.4 : 0.8 + r() * 0.2);
    while (px2 < end) {
      const wl = lh * (0.8 + r() * 2.2);
      c.beginPath();
      c.moveTo(px2, py2);
      for (let q = px2; q < Math.min(end, px2 + wl); q += lh * 0.22) {
        const up = r() < 0.18 ? -lh * 0.62 : r() < 0.12 ? lh * 0.3 : -lh * (0.12 + r() * 0.2);
        c.quadraticCurveTo(q + lh * 0.06, py2 + up, q + lh * 0.22, py2 + (r() - 0.5) * lh * 0.08);
      }
      c.stroke();
      px2 += wl + lh * 0.45;
    }
  }
  c.restore();
};
var plate2 = (c, w, h, txt, bg, fg) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = fg;
  c.lineWidth = 3;
  c.strokeRect(4, 4, w - 8, h - 8);
  label(c, txt, 10, 8, w - 20, h - 16, { color: fg, font: "900", family: COND2, track: 2 });
};
function fieldAtlas() {
  const L = [], add = (name, w, h, draw) => L.push({ name, w, h, draw });
  add("school", 1024, 160, (c, w, h, r) => {
    board2(c, w, h, NAVY, GOLD, 5);
    kestrel(c, 84, 78, 86, GOLD);
    label(c, "THORNWAKE SECONDARY SCHOOL", 170, 22, w - 200, 66, { color: CREAM, font: "bold", family: SERIF2, track: 2 });
    label(c, "SPORTS HALL  \xB7  COMMUNITY USE EVENINGS AND WEEKENDS", 170, 98, w - 200, 30, { color: GOLD, family: COND2, track: 3 });
    weather(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.2, 3);
  });
  add("kestrels", 768, 192, (c, w, h, r) => {
    board2(c, w, h, GOLD, NAVY, 6);
    kestrel(c, 100, 98, 110, NAVY);
    label(c, "HOME OF THE", 210, 22, 520, 40, { color: NAVY, family: COND2, track: 8 });
    label(c, "KESTRELS", 210, 66, 520, 100, { color: NAVY, font: "900", family: IMP2, track: 6 });
    weather(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 4);
  });
  add("crest", 256, 320, (c, w, h, r) => {
    kestrel(c, 128, 150, 210, GOLD, NAVY);
    label(c, "THORNWAKE", 30, 258, 196, 34, { color: NAVY, font: "bold", family: SERIF2 });
    wear(c, w, h, r, 0.25, 3);
  });
  add("rules", 512, 640, (c, w, h, r) => {
    board2(c, w, h, "#e9e6da", NAVY, 6);
    c.fillStyle = NAVY;
    c.fillRect(14, 14, w - 28, 92);
    label(c, "GROUND RULES", 30, 26, w - 60, 66, { color: CREAM, font: "bold", family: SERIF2 });
    const rows = ["No dogs on the playing surface", "No studs in the sports hall", "No golf practice", "No vehicles beyond the car park", "Pitch closed when lines are red", "Spectators keep behind the rail", "Floodlights off by 21:30", "Report damage to the site office"];
    rows.forEach((t, i) => {
      c.fillStyle = ERED;
      c.beginPath();
      c.arc(50, 150 + i * 54, 9, 0, TAU2);
      c.fill();
      label(c, t, 76, 132 + i * 54, w - 110, 34, { color: INK, align: "left", family: COND2 });
    });
    label(c, "SITE OFFICE  \xB7  EXT 214", 30, 574, w - 60, 28, { color: NAVY, family: COND2, track: 2 });
    weather(c, w, h, r, 0.5, 0.5);
    wear(c, w, h, r, 0.3, 5);
  });
  add("champ1", 256, 512, (c, w, h, r) => {
    c.fillStyle = NAVY;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w, h - 70);
    c.lineTo(w / 2, h);
    c.lineTo(0, h - 70);
    c.closePath();
    c.fill();
    c.strokeStyle = GOLD;
    c.lineWidth = 8;
    c.stroke();
    kestrel(c, w / 2, 110, 110, GOLD);
    label(c, "DISTRICT", 20, 196, w - 40, 44, { color: GOLD, font: "900", family: COND2, track: 3 });
    label(c, "CHAMPIONS", 20, 244, w - 40, 44, { color: GOLD, font: "900", family: COND2, track: 2 });
    label(c, "UNDER 15", 20, 304, w - 40, 30, { color: CREAM, family: COND2 });
    label(c, "YEAR 11", 20, 346, w - 40, 56, { color: CREAM, font: "bold", family: SERIF2 });
  });
  add("champ2", 256, 512, (c, w, h, r) => {
    c.fillStyle = "#7a1420";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w, h - 70);
    c.lineTo(w / 2, h);
    c.lineTo(0, h - 70);
    c.closePath();
    c.fill();
    c.strokeStyle = CREAM;
    c.lineWidth = 8;
    c.stroke();
    label(c, "COUNTY CUP", 20, 40, w - 40, 46, { color: CREAM, font: "900", family: COND2, track: 2 });
    label(c, "RUNNERS UP", 20, 96, w - 40, 38, { color: CREAM, family: COND2, track: 2 });
    c.strokeStyle = CREAM;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(w / 2, 230, 56, 0, TAU2);
    c.stroke();
    label(c, "NETBALL", 20, 320, w - 40, 44, { color: CREAM, font: "bold", family: SERIF2 });
    label(c, "YEAR 9", 20, 376, w - 40, 40, { color: CREAM, family: SERIF2 });
  });
  add("scoreFace", 1024, 448, (c, w, h, r) => {
    c.fillStyle = "#0b0c0d";
    c.fillRect(0, 0, w, h);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, w, 84);
    kestrel(c, 54, 44, 60, GOLD);
    label(c, "THORNWAKE ATHLETIC GROUND", 110, 18, w - 220, 50, { color: CREAM, font: "bold", family: SERIF2, track: 2 });
    label(c, "HOME", 60, 104, 300, 50, { color: BONE, font: "900", family: COND2, track: 6 });
    label(c, "VISITORS", 664, 104, 300, 50, { color: BONE, font: "900", family: COND2, track: 6 });
    label(c, "TIME", 412, 104, 200, 40, { color: BONE, family: COND2, track: 6 });
    c.fillStyle = "#050505";
    c.fillRect(70, 170, 280, 220);
    c.fillRect(674, 170, 280, 220);
    c.fillRect(392, 156, 240, 110);
    c.fillRect(452, 300, 120, 100);
    label(c, "HALF", 412, 272, 200, 24, { color: BONE, family: COND2, track: 4 });
  });
  add("scoreLit", 1024, 448, (c, w, h, r) => {
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    seg7(c, 86, 186, 110, 188, "0", "#ff9a18", "#160c03");
    seg7(c, 224, 186, 110, 188, "2", "#ff9a18", "#160c03");
    seg7(c, 690, 186, 110, 188, " ", "#ff9a18", "#160c03");
    seg7(c, 828, 186, 110, 188, "1", "#ff9a18", "#160c03");
    seg7(c, 404, 168, 44, 86, "8", "#ff3a18", "#160603");
    seg7(c, 454, 168, 44, 86, "-", "#ff3a18", "#160603");
    seg7(c, 526, 168, 44, 86, "-", "#ff3a18", "#160603");
    seg7(c, 576, 168, 44, 86, "4", "#ff3a18", "#160603");
    seg7(c, 484, 310, 56, 80, "2", "#ff9a18", "#160c03");
  });
  const sponsor = (name, bg, fg, big, small) => add(name, 768, 128, (c, w, h, r) => {
    board2(c, w, h, bg, null);
    label(c, big, 24, 12, w - 48, 70, { color: fg, font: "900", family: IMP2, track: 3 });
    label(c, small, 24, 88, w - 48, 26, { color: fg, family: COND2, track: 3 });
    weather(c, w, h, r, 0.7, 0.8);
    wear(c, w, h, r, 0.5, 6);
  });
  sponsor("sp0", "#b8251c", "#f2efe2", "TOP FLIGHT SPORTS", "KIT  \xB7  BOOTS  \xB7  TROPHIES  \xB7  ENGRAVING");
  sponsor("sp1", "#f0e8d0", "#1c3a22", "GREEN LANE GARDEN CENTRE", "TURF  \xB7  SEED  \xB7  MOWER REPAIRS");
  sponsor("sp2", "#1c2f66", "#f4d21c", "CITY TYRE AND EXHAUST", "FREE FITTING  \xB7  OPEN SEVEN DAYS");
  sponsor("sp3", "#e9e9e2", "#16284a", "SUNRISE BAKERY", "MATCH DAY PIES  \xB7  ORDER BY THURSDAY");
  sponsor("sp4", "#17171a", "#e8a31a", "NIGHT OWL TAXIS", "AIRPORT  \xB7  STATION  \xB7  24 HOURS");
  sponsor("sp5", "#2c6e8f", "#f2efe2", "CLEARWATER PLUMBING", "BOILERS  \xB7  LEAKS  \xB7  NO CALL OUT FEE");
  add("section", 512, 128, (c, w, h, r) => {
    ["A", "B", "C", "D"].forEach((t, i) => {
      c.fillStyle = NAVY;
      c.fillRect(i * 128 + 6, 6, 116, 116);
      label(c, t, i * 128 + 16, 14, 96, 100, { color: GOLD, font: "900", family: IMP2 });
    });
    wear(c, w, h, r, 0.4, 5);
  });
  add("away", 384, 96, (c, w, h, r) => {
    plate2(c, w, h, "VISITORS", "#e9e6da", NAVY);
    wear(c, w, h, r, 0.3, 3);
  });
  add("home", 384, 96, (c, w, h, r) => {
    plate2(c, w, h, "HOME", NAVY, GOLD);
    wear(c, w, h, r, 0.3, 3);
  });
  add("press", 384, 96, (c, w, h, r) => {
    plate2(c, w, h, "MATCH OFFICIALS ONLY", "#e9e6da", INK);
    weather(c, w, h, r, 0.4);
  });
  add("changing", 512, 96, (c, w, h, r) => {
    plate2(c, w, h, "CHANGING ROOMS", NAVY, CREAM);
    weather(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.3, 3);
  });
  add("parkBus", 384, 384, (c, w, h, r) => {
    board2(c, w, h, "#e9e6da", INK, 5);
    c.fillStyle = "#1c4fa0";
    c.fillRect(20, 20, w - 40, 150);
    label(c, "P", 40, 30, 120, 130, { color: "#fff", font: "900", family: SANS2 });
    label(c, "BUSES", 170, 34, 180, 56, { color: "#fff", font: "900", family: COND2 });
    label(c, "ONLY", 170, 94, 180, 56, { color: "#fff", font: "900", family: COND2 });
    label(c, "08:00 to 09:15", 30, 196, w - 60, 44, { color: INK, family: COND2 });
    label(c, "14:45 to 16:00", 30, 248, w - 60, 44, { color: INK, family: COND2 });
    label(c, "TERM TIME", 30, 312, w - 60, 34, { color: ERED, font: "900", family: COND2, track: 4 });
    weather(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.25, 3);
  });
  add("speed5", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#e9e6da";
    c.beginPath();
    c.arc(128, 128, 124, 0, TAU2);
    c.fill();
    c.strokeStyle = ERED;
    c.lineWidth = 26;
    c.beginPath();
    c.arc(128, 128, 106, 0, TAU2);
    c.stroke();
    label(c, "5", 60, 46, 136, 164, { color: INK, font: "900", family: SANS2 });
    weather(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 3);
  });
  add("visitors", 512, 256, (c, w, h, r) => {
    board2(c, w, h, NAVY, GOLD, 5);
    label(c, "ALL VISITORS", 30, 30, w - 60, 60, { color: CREAM, font: "bold", family: SERIF2 });
    label(c, "MUST REPORT TO RECEPTION", 30, 100, w - 60, 44, { color: CREAM, family: COND2, track: 2 });
    arrow(c, w / 2, 198, 150, Math.PI, GOLD, 0.26);
    weather(c, w, h, r, 0.5);
  });
  add("exit", 384, 160, (c, w, h, r) => {
    c.fillStyle = "#0d7a3e";
    c.fillRect(0, 0, w, h);
    runner(c, 80, 82, 120, "#f1f1ea");
    label(c, "EXIT", 170, 30, 190, 100, { color: "#f1f1ea", font: "900", family: SANS2 });
  });
  add("fireDoor", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#1b52a8";
    c.beginPath();
    c.arc(128, 128, 124, 0, TAU2);
    c.fill();
    label(c, "FIRE DOOR", 40, 62, 176, 50, { color: "#fff", font: "900", family: COND2 });
    label(c, "KEEP SHUT", 40, 132, 176, 50, { color: "#fff", font: "900", family: COND2 });
    wear(c, w, h, r, 0.2, 2);
  });
  add("wc", 384, 192, (c, w, h, r) => {
    board2(c, w, h, "#e9e6da", INK, 4);
    person(c, 96, 96, 150, INK, true);
    person(c, 288, 96, 150, INK, false);
    c.fillStyle = INK;
    c.fillRect(189, 24, 6, 144);
    wear(c, w, h, r, 0.2, 2);
  });
  add("evac", 1280, 224, (c, w, h, r) => {
    board2(c, w, h, EYEL, INK, 9);
    stripes2(c, 18, 18, 150, h - 36, EYEL, INK, 26);
    stripes2(c, w - 168, 18, 150, h - 36, EYEL, INK, 26);
    label(c, "EVACUATION POINT 4", 190, 24, w - 380, 104, { color: INK, font: "900", family: IMP2, track: 4 });
    label(c, "CITY EMERGENCY AUTHORITY  \xB7  REGISTER  \xB7  TRIAGE  \xB7  TRANSPORT", 190, 142, w - 380, 40, { color: INK, font: "900", family: COND2, track: 2 });
    weather(c, w, h, r, 0.6, 0.2);
    wear(c, w, h, r, 0.2, 4);
  });
  add("triage", 640, 256, (c, w, h, r) => {
    board2(c, w, h, "#e9e9e2", EGRN, 8);
    cross(c, 118, 128, 150, EGRN);
    label(c, "TRIAGE", 220, 30, 390, 120, { color: EGRN, font: "900", family: IMP2, track: 4 });
    label(c, "ONE AT A TIME  \xB7  SHOW YOUR HANDS", 220, 166, 390, 36, { color: INK, family: COND2 });
    weather(c, w, h, r, 0.5);
  });
  add("ward", 384, 192, (c, w, h, r) => {
    board2(c, w, h, "#e9e9e2", EGRN, 6);
    cross(c, 76, 96, 100, EGRN);
    label(c, "WARD B", 150, 30, 214, 80, { color: EGRN, font: "900", family: IMP2 });
    label(c, "OBSERVATION 12 HRS", 150, 122, 214, 30, { color: INK, family: COND2 });
    weather(c, w, h, r, 0.4);
  });
  add("stores", 384, 192, (c, w, h, r) => {
    board2(c, w, h, OLIVE, BONE, 5);
    label(c, "STORES", 24, 24, w - 48, 86, { color: BONE, font: "900", family: IMP2, track: 6 });
    label(c, "ISSUE ON CHIT ONLY", 24, 124, w - 48, 34, { color: BONE, family: MONO2 });
    wear(c, w, h, r, 0.5, 4);
  });
  add("register", 512, 640, (c, w, h, r) => {
    board2(c, w, h, "#f0efe8", INK, 5);
    c.fillStyle = EYEL;
    c.fillRect(14, 14, w - 28, 100);
    label(c, "REGISTRATION", 30, 30, w - 60, 70, { color: INK, font: "900", family: IMP2, track: 3 });
    ["1  Queue in single file", "2  Have identification ready", "3  One bag per person", "4  Declare bites and fever", "5  Children stay with adults", "6  Wait for your bus number"].forEach((t, i) => label(c, t, 40, 142 + i * 62, w - 80, 40, { color: INK, align: "left", family: COND2, font: "bold" }));
    c.fillStyle = ERED;
    c.fillRect(14, 530, w - 28, 92);
    label(c, "NO WEAPONS BEYOND THIS POINT", 30, 548, w - 60, 56, { color: "#fff", font: "900", family: COND2 });
    weather(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.2, 3);
  });
  add("infected", 512, 384, (c, w, h, r) => {
    board2(c, w, h, ERED, "#f2efe2", 8);
    label(c, "BITTEN?", 30, 30, w - 60, 110, { color: "#f2efe2", font: "900", family: IMP2, track: 4 });
    label(c, "SCRATCHED? FEVER?", 30, 150, w - 60, 56, { color: "#f2efe2", font: "900", family: COND2 });
    label(c, "TELL A MEDIC NOW", 30, 222, w - 60, 56, { color: EYEL, font: "900", family: COND2 });
    label(c, "CONCEALMENT IS AN OFFENCE UNDER ORDER 44-B", 30, 304, w - 60, 28, { color: "#f2efe2", family: COND2 });
    weather(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.2, 3);
  });
  add("morgue", 512, 192, (c, w, h, r) => {
    board2(c, w, h, "#17171a", BONE, 5);
    label(c, "TEMPORARY MORTUARY", 24, 24, w - 48, 70, { color: BONE, font: "900", family: COND2, track: 2 });
    label(c, "AUTHORISED STAFF ONLY  \xB7  DO NOT OPEN BAGS", 24, 116, w - 48, 34, { color: EYEL, family: COND2 });
    wear(c, w, h, r, 0.3, 3);
  });
  add("water", 384, 384, (c, w, h, r) => {
    board2(c, w, h, "#1c5fa8", "#f2efe2", 6);
    c.fillStyle = "#f2efe2";
    c.beginPath();
    c.moveTo(192, 44);
    c.quadraticCurveTo(262, 140, 248, 176);
    c.arc(192, 172, 58, 0.07, Math.PI - 0.07);
    c.quadraticCurveTo(122, 140, 192, 44);
    c.fill();
    label(c, "WATER POINT", 30, 246, w - 60, 54, { color: "#f2efe2", font: "900", family: COND2, track: 2 });
    label(c, "4 LITRES PER PERSON PER DAY", 30, 312, w - 60, 30, { color: "#f2efe2", family: COND2 });
    weather(c, w, h, r, 0.5);
  });
  add("food", 512, 256, (c, w, h, r) => {
    board2(c, w, h, "#f0efe8", EGRN, 6);
    label(c, "FIELD KITCHEN", 30, 26, w - 60, 70, { color: EGRN, font: "900", family: IMP2, track: 3 });
    label(c, "06:00     12:00     18:00", 30, 110, w - 60, 56, { color: INK, font: "bold", family: MONO2 });
    label(c, "BRING YOUR WRISTBAND", 30, 184, w - 60, 38, { color: ERED, font: "900", family: COND2, track: 2 });
    weather(c, w, h, r, 0.5);
  });
  add("helipad", 512, 256, (c, w, h, r) => {
    board2(c, w, h, EYEL, INK, 8);
    label(c, "LANDING ZONE", 30, 26, w - 60, 86, { color: INK, font: "900", family: IMP2, track: 3 });
    label(c, "KEEP CLEAR  \xB7  SECURE LOOSE ITEMS", 30, 130, w - 60, 40, { color: INK, font: "900", family: COND2 });
    label(c, "APPROACH FROM THE FRONT ONLY", 30, 184, w - 60, 34, { color: ERED, font: "900", family: COND2 });
    weather(c, w, h, r, 0.4);
  });
  add("assembly", 384, 384, (c, w, h, r) => {
    c.fillStyle = "#0d7a3e";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#f1f1ea";
    c.lineWidth = 8;
    c.strokeRect(14, 14, w - 28, h - 28);
    for (const [x, y] of [[150, 170], [234, 170], [192, 130], [192, 214]]) person(c, x, y, 70, "#f1f1ea");
    for (const [x, y, a] of [[70, 70, 0.78], [314, 70, 2.36], [70, 290, -0.78], [314, 290, -2.36]]) arrow(c, x, y, 70, a, "#f1f1ea", 0.3);
    label(c, "ASSEMBLY POINT", 30, 318, w - 60, 40, { color: "#f1f1ea", font: "900", family: COND2 });
    weather(c, w, h, r, 0.4);
  });
  const way = (name, txt, rot2, bg = EYEL, fg = INK) => add(name, 640, 160, (c, w, h, r) => {
    board2(c, w, h, bg, fg, 6);
    const left = Math.abs(rot2) > 1.6;
    arrow(c, left ? 90 : w - 90, h / 2, 120, rot2, fg, 0.3);
    label(c, txt, left ? 170 : 30, 34, w - 200, 92, { color: fg, font: "900", family: COND2, track: 2 });
    weather(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.2, 3);
  });
  way("wayBuses", "BUSES", 0);
  way("wayTriage", "TRIAGE", Math.PI, "#e9e9e2", EGRN);
  way("wayShelter", "SHELTER  \xB7  SPORTS HALL", -Math.PI / 2 + 1e-4);
  way("wayWater", "WATER  \xB7  TOILETS", Math.PI, "#1c5fa8", "#f2efe2");
  way("wayReg", "REGISTRATION", 0);
  way("wayExit", "NO EXIT  \xB7  GATE SEALED", Math.PI, ERED, "#f2efe2");
  add("cots", 768, 128, (c, w, h, r) => {
    ["A", "B", "C"].forEach((t, i) => {
      c.fillStyle = "#f0efe8";
      c.fillRect(i * 256 + 6, 6, 244, 116);
      c.strokeStyle = INK;
      c.lineWidth = 4;
      c.strokeRect(i * 256 + 10, 10, 236, 108);
      label(c, "COT BLOCK " + t, i * 256 + 22, 20, 212, 56, { color: INK, font: "900", family: COND2 });
      label(c, `ROWS ${i * 6 + 1} TO ${i * 6 + 6}`, i * 256 + 22, 82, 212, 26, { color: ERED, family: COND2 });
    });
  });
  add("capacity", 384, 256, (c, w, h, r) => {
    board2(c, w, h, "#f0efe8", INK, 4);
    label(c, "CAPACITY 240", 24, 22, w - 48, 60, { color: INK, font: "900", family: COND2 });
    label(c, "QUIET HOURS 22:00 TO 06:00", 24, 98, w - 48, 34, { color: INK, family: COND2 });
    label(c, "LIGHTS STAY ON", 24, 150, w - 48, 44, { color: ERED, font: "900", family: COND2, track: 2 });
    label(c, "DOORS ARE LOCKED AT DUSK", 24, 206, w - 48, 28, { color: INK, family: COND2 });
  });
  add("manifest", 768, 512, (c, w, h, r) => {
    c.fillStyle = "#eef0ee";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#8c9094";
    c.lineWidth = 10;
    c.strokeRect(5, 5, w - 10, h - 10);
    const pen = (col) => {
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = 3;
      c.lineCap = "round";
    };
    pen("#1c2f80");
    c.font = 'italic bold 44px "Comic Sans MS", "Segoe Print", cursive';
    c.textBaseline = "middle";
    c.textAlign = "left";
    c.fillText("BUS", 40, 56);
    c.fillText("SEATS", 190, 56);
    c.fillText("LEFT", 400, 56);
    c.fillText("BACK?", 580, 56);
    c.beginPath();
    c.moveTo(24, 90);
    c.lineTo(w - 24, 90);
    c.stroke();
    const rows = [["1", "44", "06:10", "yes"], ["2", "44", "06:40", "yes"], ["3", "38", "07:15", "yes"], ["4", "44", "09:00", "NO"], ["5", "44", "09:30", "NO"], ["6", "", "", ""]];
    rows.forEach((row, i) => {
      const y = 132 + i * 56;
      pen(row[3] === "NO" ? "#b3261c" : "#1c2f80");
      c.font = 'italic bold 40px "Comic Sans MS", "Segoe Print", cursive';
      c.fillText(row[0], 56, y + (r() - 0.5) * 6);
      c.fillText(row[1], 210, y + (r() - 0.5) * 6);
      c.fillText(row[2], 396, y + (r() - 0.5) * 6);
      c.fillText(row[3], 600, y + (r() - 0.5) * 6);
    });
    pen("#b3261c");
    c.font = 'italic bold 46px "Comic Sans MS", "Segoe Print", cursive';
    c.save();
    c.translate(60, 468);
    c.rotate(-0.04);
    c.fillText("NO MORE BUSES. STAY INSIDE.", 0, 0);
    c.restore();
    c.beginPath();
    c.moveTo(56, 492);
    c.lineTo(700, 484);
    c.stroke();
  });
  const missing = (seed) => (c, w, h, r) => {
    c.fillStyle = "#6b4f33";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(${40 + r() * 60},${28 + r() * 40},${14 + r() * 24},0.35)`;
      c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
    }
    const q = rng(seed), HEADS = ["MISSING", "MISSING", "HAVE YOU SEEN", "LOOKING FOR", "MISSING", "PLEASE HELP"], NOTES = ["GONE TO GATE 3", "WAIT HERE", "WE ARE IN THE HALL", "BUS 14", "MEET AT THE STAND"];
    const pin3 = (x, y) => {
      c.fillStyle = "rgba(0,0,0,0.35)";
      c.beginPath();
      c.arc(x + 1.5, y + 2, 4, 0, TAU2);
      c.fill();
      c.fillStyle = ["#c22", "#26c", "#dc2", "#2a4", "#ddd"][Math.floor(q() * 5)];
      c.beginPath();
      c.arc(x, y, 4, 0, TAU2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.beginPath();
      c.arc(x - 1.2, y - 1.3, 1.3, 0, TAU2);
      c.fill();
    };
    const tape = (x, y, a) => {
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.fillStyle = "rgba(226,214,160,0.62)";
      c.fillRect(-13, -5, 26, 10);
      c.strokeStyle = "rgba(120,110,70,0.35)";
      c.lineWidth = 0.6;
      c.strokeRect(-13, -5, 26, 10);
      c.restore();
    };
    for (let i = 0; i < 20; i++) {
      const kind = q() < 0.62 ? 0 : q() < 0.66 ? 1 : 2, pw = kind === 2 ? 92 + q() * 30 : 116 + q() * 30, ph = kind === 2 ? pw * (0.8 + q() * 0.4) : pw * 1.4, x = 6 + i % 10 * 101 + q() * 10 - (pw - 100) / 2, y = (i < 10 ? 10 : 262) + q() * (kind === 2 ? 110 : 26);
      c.save();
      c.translate(Math.max(pw / 2 + 2, Math.min(w - pw / 2 - 2, x + pw / 2)), y + ph / 2);
      c.rotate((q() - 0.5) * 0.14);
      c.shadowColor = "rgba(0,0,0,0.55)";
      c.shadowBlur = 6;
      c.shadowOffsetY = 2;
      c.fillStyle = kind === 2 ? ["#f1e58c", "#f3c7d0", "#cfe6f2", "#f4f2ec"][Math.floor(q() * 4)] : ["#f1efe6", "#ece6d2", "#f4f2ec", "#e6ded0", "#eef0ea"][Math.floor(q() * 5)];
      c.fillRect(-pw / 2, -ph / 2, pw, ph);
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
      c.shadowColor = "rgba(0,0,0,0)";
      const L2 = -pw / 2, T3 = -ph / 2;
      if (kind === 0) {
        const red = q() < 0.6, mono = q() < 0.62 ? 1 : 0, bw = pw * 0.72, bh = ph * 0.47;
        if (q() < 0.35) {
          c.fillStyle = red ? ERED : INK;
          c.fillRect(L2, T3, pw, 28);
          label(c, HEADS[Math.floor(q() * 6)], L2 + 6, T3 + 6, pw - 12, 16, { color: "#f4f2ec", font: "900", family: COND2 });
        } else label(c, HEADS[Math.floor(q() * 6)], L2 + 6, T3 + 9, pw - 12, 18, { color: red ? ERED : INK, font: "900", family: COND2 });
        portrait(c, -bw / 2, T3 + 33, bw, bh, q, mono);
        c.strokeStyle = "rgba(20,20,20,0.7)";
        c.lineWidth = 1;
        c.strokeRect(-bw / 2, T3 + 33, bw, bh);
        const ty = T3 + 38 + bh;
        c.fillStyle = INK;
        c.fillRect(-pw * 0.3, ty, pw * (0.4 + q() * 0.2), 6);
        typed(c, L2 + 9, ty + 11, pw - 18, ph - (ty - T3) - 34, q, "#2c2c2c", 6);
        c.strokeStyle = "rgba(30,30,30,0.6)";
        c.lineWidth = 0.8;
        c.setLineDash([2, 2]);
        c.beginPath();
        c.moveTo(L2, T3 + ph - 20);
        c.lineTo(L2 + pw, T3 + ph - 20);
        c.stroke();
        const n = 8, tw = pw / n;
        for (let k = 0; k < n; k++) {
          if (q() < 0.3) {
            c.setLineDash([]);
            c.fillStyle = "#5f462d";
            c.beginPath();
            c.moveTo(L2 + k * tw, T3 + ph - 20 + q() * 3);
            c.lineTo(L2 + (k + 0.5) * tw, T3 + ph - 18 + q() * 4);
            c.lineTo(L2 + (k + 1) * tw, T3 + ph - 20 + q() * 3);
            c.lineTo(L2 + (k + 1) * tw, T3 + ph + 1);
            c.lineTo(L2 + k * tw, T3 + ph + 1);
            c.closePath();
            c.fill();
            c.setLineDash([2, 2]);
          } else {
            c.beginPath();
            c.moveTo(L2 + k * tw, T3 + ph - 20);
            c.lineTo(L2 + k * tw, T3 + ph);
            c.stroke();
            c.fillStyle = "rgba(30,30,30,0.7)";
            c.fillRect(L2 + k * tw + tw * 0.4, T3 + ph - 17, 1.6, 14);
          }
        }
        c.setLineDash([]);
        if (q() < 0.16) {
          c.save();
          c.rotate(-0.5);
          c.strokeStyle = "rgba(23,104,58,0.85)";
          c.lineWidth = 3;
          c.strokeRect(-pw * 0.36, -12, pw * 0.72, 26);
          label(c, "FOUND", -pw * 0.34, -9, pw * 0.68, 20, { color: "rgba(23,104,58,0.9)", font: "900", family: IMP2 });
          c.restore();
        }
        pin3((q() - 0.5) * pw * 0.5, T3 + 4);
      } else if (kind === 1) {
        const lined = q() < 0.5;
        if (lined) {
          c.strokeStyle = "rgba(90,130,190,0.4)";
          c.lineWidth = 0.7;
          for (let yy = T3 + 16; yy < T3 + ph - 4; yy += 9) {
            c.beginPath();
            c.moveTo(L2 + 3, yy);
            c.lineTo(L2 + pw - 3, yy);
            c.stroke();
          }
          c.strokeStyle = "rgba(200,60,60,0.45)";
          c.beginPath();
          c.moveTo(L2 + 16, T3);
          c.lineTo(L2 + 16, T3 + ph);
          c.stroke();
        }
        const bw = pw * 0.74, bh = bw * (q() < 0.5 ? 0.78 : 1.22), a = (q() - 0.5) * 0.2;
        c.save();
        c.translate(0, T3 + 12 + bh / 2);
        c.rotate(a);
        c.shadowColor = "rgba(0,0,0,0.4)";
        c.shadowBlur = 4;
        c.fillStyle = "#f6f5f0";
        c.fillRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8);
        c.shadowBlur = 0;
        c.shadowColor = "rgba(0,0,0,0)";
        portrait(c, -bw / 2, -bh / 2, bw, bh, q, 0);
        tape(-bw / 2, -bh / 2, -0.7);
        tape(bw / 2, -bh / 2, 0.7);
        c.restore();
        scrawl(c, L2 + (lined ? 20 : 8), T3 + 22 + bh, pw - (lined ? 28 : 16), Math.max(2, Math.floor((ph - bh - 34) / 12)), 12, q, q() < 0.6 ? "#1c2a6a" : "#1a1a1a");
        pin3(L2 + pw / 2 + (q() - 0.5) * 20, T3 + 5);
      } else {
        c.save();
        c.rotate((q() - 0.5) * 0.1);
        label(c, NOTES[Math.floor(q() * 5)], L2 + 6, T3 + 8, pw - 12, 18, { color: q() < 0.5 ? "#1a1a1a" : "#1c2a6a", font: "italic 900", family: SANS2 });
        c.restore();
        scrawl(c, L2 + 8, T3 + 30, pw - 16, Math.max(1, Math.floor((ph - 40) / 13)), 13, q, "#1a1a1a");
        pin3(0, T3 + 6);
      }
      c.restore();
    }
    weather(c, w, h, q, 0.35, 0.05);
  };
  add("missing", 1024, 512, missing(4471));
  add("missing2", 1024, 512, missing(9203));
  const notice = (name, head, col) => add(name, 256, 352, (c, w, h, r) => {
    c.fillStyle = "#efede4";
    c.fillRect(0, 0, w, h);
    c.fillStyle = col;
    c.fillRect(0, 0, w, 62);
    label(c, head, 12, 12, w - 24, 40, { color: "#fff", font: "900", family: COND2 });
    label(c, "CITY EMERGENCY AUTHORITY", 14, 72, w - 28, 16, { color: INK, family: COND2, track: 1 });
    typed(c, 18, 104, w - 36, 150, r, "#333", 11);
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.strokeRect(18, 268, w - 36, 60);
    label(c, "ORDER 44-B", 24, 278, w - 48, 40, { color: INK, font: "900", family: MONO2 });
    weather(c, w, h, r, 0.6, 0.1);
  });
  notice("noticeA", "CURFEW IN FORCE", ERED);
  notice("noticeB", "TRANSPORT ROTA", "#1c5fa8");
  notice("noticeC", "RATION ISSUE", EGRN);
  notice("noticeD", "KNOW THE SIGNS", "#17171a");
  add("tape", 512, 48, (c, w, h, r) => {
    stripes2(c, 0, 0, w, h, EYEL, INK, 24);
  });
  add("tapeRW", 512, 48, (c, w, h, r) => {
    stripes2(c, 0, 0, w, h, "#e9e9e2", ERED, 24);
  });
  add("hazard", 256, 256, (c, w, h, r) => {
    stripes2(c, 0, 0, w, h, EYEL, INK, 32);
    wear(c, w, h, r, 0.5, 6);
  });
  add("chevR", 512, 128, (c, w, h, r) => {
    stripes2(c, 0, 0, w, h, "#e9e9e2", ERED, 40);
    wear(c, w, h, r, 0.3, 4);
  });
  add("greenCross", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#e9e9e2";
    c.fillRect(0, 0, w, h);
    cross(c, 128, 128, 190, EGRN);
    wear(c, w, h, r, 0.2, 2);
  });
  add("redCrossless", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#e9e9e2";
    c.beginPath();
    c.arc(128, 128, 122, 0, TAU2);
    c.fill();
    cross(c, 128, 128, 160, EGRN);
  });
  add("wristband", 384, 256, (c, w, h, r) => {
    board2(c, w, h, "#f0efe8", INK, 4);
    const rows = [["GREEN", "#1e8a44", "CLEARED"], ["AMBER", "#d9901a", "OBSERVE"], ["RED", "#b3261c", "ISOLATE"], ["BLACK", "#17171a", "DO NOT MOVE"]];
    rows.forEach((row, i) => {
      c.fillStyle = row[1];
      c.fillRect(22, 22 + i * 56, 110, 42);
      label(c, row[0], 26, 28 + i * 56, 102, 30, { color: "#fff", font: "900", family: COND2 });
      label(c, row[2], 150, 26 + i * 56, 212, 34, { color: INK, align: "left", font: "900", family: COND2 });
    });
  });
  add("busName", 768, 96, (c, w, h, r) => {
    label(c, "THORNWAKE DISTRICT SCHOOLS", 10, 12, w - 20, 72, { color: INK, font: "900", family: COND2, track: 4 });
    wear(c, w, h, r, 0.35, 4);
  });
  add("busFront", 512, 96, (c, w, h, r) => {
    c.fillStyle = INK;
    c.fillRect(0, 0, w, h);
    label(c, "SCHOOL BUS", 14, 10, w - 28, 76, { color: EYEL, font: "900", family: SANS2, track: 4 });
  });
  add("busDest", 512, 96, (c, w, h, r) => {
    c.fillStyle = "#060606";
    c.fillRect(0, 0, w, h);
    label(c, "EVAC 4  \xB7  NOT IN SERVICE", 14, 16, w - 28, 64, { color: "#ffb428", font: "bold", family: MONO2 });
  });
  for (let i = 0; i < 6; i++) add("busNo" + i, 128, 96, (c, w, h, r) => {
    label(c, String([14, 22, 7, 31, 9, 18][i]), 6, 6, w - 12, h - 12, { color: INK, font: "900", family: SANS2 });
    wear(c, w, h, r, 0.3, 2);
  });
  add("stopArm", 256, 256, (c, w, h, r) => {
    c.fillStyle = ERED;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      c.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = "#f2efe2";
    c.lineWidth = 9;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      c.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
    }
    c.closePath();
    c.stroke();
    label(c, "STOP", 40, 78, 176, 100, { color: "#f2efe2", font: "900", family: SANS2 });
    wear(c, w, h, r, 0.2, 3);
  });
  add("emergDoor", 384, 64, (c, w, h, r) => {
    label(c, "EMERGENCY DOOR", 6, 8, w - 12, 48, { color: ERED, font: "900", family: COND2, track: 3 });
  });
  for (let i = 0; i < 6; i++) add("plate" + i, 256, 64, (c, w, h, r) => {
    c.fillStyle = i < 3 ? "#e8e4d0" : "#1a1a1a";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = i < 3 ? INK : BONE;
    c.lineWidth = 3;
    c.strokeRect(3, 3, w - 6, h - 6);
    const s = () => "ABCEFHJKLMNPRSTVXY"[Math.floor(r() * 18)];
    label(c, i < 3 ? `${s()}${s()}${s()} ${Math.floor(100 + r() * 899)}` : `${Math.floor(10 + r() * 89)} ${s()}${s()} ${Math.floor(10 + r() * 89)}`, 12, 8, w - 24, h - 16, { color: i < 3 ? INK : BONE, font: "900", family: MONO2 });
  });
  const sten = (name, w0, h0, txt, col = BONE, fam = IMP2) => add(name, w0, h0, (c, w, h, r) => {
    label(c, txt, 4, 4, w - 8, h - 8, { color: col, font: "900", family: fam, track: 3 });
    c.globalCompositeOperation = "destination-out";
    const n = Math.max(3, Math.round(w / 46));
    for (let i = 1; i < n; i++) c.fillRect(i * w / n - 1.5, 0, 3, h);
    c.globalCompositeOperation = "source-over";
    wear(c, w, h, r, 0.6, 5);
  });
  sten("stRescue", 512, 112, "RESCUE");
  sten("stTail", 384, 96, "K-417");
  sten("stUnit", 384, 80, "CEA AIR WING 2");
  sten("stNoStep", 192, 48, "NO STEP", "#c8c4b4", COND2);
  sten("stDanger", 384, 64, "DANGER  KEEP AWAY", "#d8b21c", COND2);
  sten("stTruckA", 384, 96, "CEA 4-17");
  sten("stTruckB", 384, 96, "CEA 4-22");
  sten("stMax", 256, 48, "MAX 2500 KG", "#c8c4b4", COND2);
  sten("stFuel", 256, 64, "DIESEL", "#d8b21c");
  sten("stWaterB", 512, 96, "DRINKING WATER");
  sten("stGen", 384, 80, "GENSET 3");
  sten("stLift", 256, 48, "LIFT HERE", "#c8c4b4", COND2);
  sten("stRations", 384, 96, "RATIONS 24 HR");
  sten("stMed", 384, 96, "MEDICAL");
  sten("stBlank", 384, 96, "BLANKETS 50");
  add("stArrow", 192, 96, (c, w, h, r) => {
    arrow(c, w / 2, h / 2, 170, 0, "#d8b21c", 0.26);
    wear(c, w, h, r, 0.5, 3);
  });
  add("roundel", 256, 256, (c, w, h, r) => {
    c.fillStyle = BONE;
    c.beginPath();
    c.arc(128, 128, 120, 0, TAU2);
    c.fill();
    c.fillStyle = OLIVE;
    c.beginPath();
    c.arc(128, 128, 96, 0, TAU2);
    c.fill();
    c.fillStyle = BONE;
    c.beginPath();
    c.moveTo(128, 46);
    c.lineTo(200, 172);
    c.lineTo(56, 172);
    c.closePath();
    c.fill();
    c.fillStyle = OLIVE;
    c.beginPath();
    c.moveTo(128, 92);
    c.lineTo(166, 156);
    c.lineTo(90, 156);
    c.closePath();
    c.fill();
    wear(c, w, h, r, 0.5, 5);
  });
  add("medRound", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#e9e9e2";
    c.fillRect(8, 8, 240, 240);
    cross(c, 128, 128, 176, EGRN);
    wear(c, w, h, r, 0.45, 5);
  });
  add("gauges", 512, 256, (c, w, h, r) => {
    c.fillStyle = "#101214";
    c.fillRect(0, 0, w, h);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
      const x = 64 + i * 128, y = 64 + j * 128;
      c.fillStyle = "#050505";
      c.beginPath();
      c.arc(x, y, 52, 0, TAU2);
      c.fill();
      c.strokeStyle = "#7d8286";
      c.lineWidth = 4;
      c.stroke();
      c.strokeStyle = "#d8d8d0";
      c.lineWidth = 2;
      for (let k = 0; k < 13; k++) {
        const a2 = 2.4 + k * 0.38;
        c.beginPath();
        c.moveTo(x + Math.cos(a2) * 40, y + Math.sin(a2) * 40);
        c.lineTo(x + Math.cos(a2) * 47, y + Math.sin(a2) * 47);
        c.stroke();
      }
      const a = 2.4 + r() * 4.5;
      c.strokeStyle = "#e8621c";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * 38, y + Math.sin(a) * 38);
      c.stroke();
      c.fillStyle = "#c9c9c0";
      c.beginPath();
      c.arc(x, y, 5, 0, TAU2);
      c.fill();
    }
  });
  add("panelSw", 512, 192, (c, w, h, r) => {
    c.fillStyle = "#17191b";
    c.fillRect(0, 0, w, h);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 10; i++) {
      const x = 30 + i * 50, y = 34 + j * 60;
      c.fillStyle = "#060606";
      c.fillRect(x - 14, y - 16, 28, 40);
      c.fillStyle = ["#c9c9c0", "#c9c9c0", "#b3261c", "#d8b21c"][Math.floor(r() * 4)];
      c.fillRect(x - 6, y - (r() < 0.5 ? 12 : -2), 12, 14);
      c.fillStyle = "#8f948f";
      c.fillRect(x - 16, y + 26, 32, 5);
    }
  });
  add("drugLabel", 256, 128, (c, w, h, r) => {
    c.fillStyle = "#f2f2ee";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#1c5fa8";
    c.fillRect(0, 0, w, 34);
    label(c, "SODIUM CHLORIDE 0.9%", 8, 6, w - 16, 22, { color: "#fff", font: "900", family: COND2 });
    typed(c, 12, 46, w - 24, 60, r, "#333", 9);
    label(c, "1000 ML", 150, 92, 96, 26, { color: INK, font: "900", family: COND2 });
  });
  add("tagToe", 192, 96, (c, w, h, r) => {
    c.fillStyle = "#e8dfb8";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#17171a";
    c.beginPath();
    c.arc(18, 48, 7, 0, TAU2);
    c.fill();
    typed(c, 40, 14, 140, 70, r, "#222", 12);
    c.fillStyle = ERED;
    c.fillRect(150, 8, 34, 14);
  });
  const graf = (name, w0, h0, lines, col, fam = '"Comic Sans MS", "Segoe Print", "Marker Felt", cursive') => add(name, w0, h0, (c, w, h, r) => {
    const lh = h / lines.length;
    lines.forEach((t, i) => {
      c.save();
      c.translate(w / 2, lh * (i + 0.5));
      c.rotate((r() - 0.5) * 0.07);
      c.shadowColor = col;
      c.shadowBlur = 7;
      label(c, t, -w / 2 + 14, -lh * 0.42, w - 28, lh * 0.84, { color: col, font: "bold", family: fam });
      c.restore();
    });
    c.shadowBlur = 0;
    c.fillStyle = col;
    for (let i = 0; i < 12; i++) {
      const x = 20 + r() * (w - 40), y = lh * (0.7 + Math.floor(r() * lines.length));
      c.globalAlpha = 0.7;
      c.fillRect(x, y, 2 + r() * 3, 12 + r() * 50);
    }
    c.globalAlpha = 1;
    wear(c, w, h, r, 0.5, 2);
  });
  graf("gNoBuses", 640, 256, ["NO MORE", "BUSES"], "#c9281c");
  graf("gDay", 384, 192, ["DAY 9"], "#e8e4d8");
  graf("gGym", 768, 256, ["DON'T OPEN", "THE HALL"], "#c9281c");
  graf("gLeft", 640, 192, ["THEY LEFT US"], "#e8e4d8");
  graf("gNorth", 512, 192, ["GONE NORTH", "ROOM 12 FAMILY"], "#1e1e1e");
  graf("gCount", 384, 256, ["IN: 212", "OUT: 31"], "#e8a31a");
  graf("gDead", 512, 192, ["DEAD INSIDE"], "#17171a");
  graf("gX", 256, 256, ["X"], "#e8621c", IMP2);
  graf("gSorry", 512, 160, ["SORRY MUM"], "#e8e4d8");
  graf("gAim", 512, 192, ["AIM FOR", "THE HEAD"], "#c9281c");
  add("tally", 384, 256, (c, w, h, r) => {
    c.strokeStyle = "#e8e4d8";
    c.lineWidth = 5;
    c.lineCap = "round";
    for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) {
      if (j === 2 && i > 2) break;
      const x = 24 + i * 60, y = 22 + j * 78;
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(x + k * 9 + (r() - 0.5) * 3, y);
        c.lineTo(x + k * 9 + (r() - 0.5) * 3, y + 54);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(x - 6, y + 44);
      c.lineTo(x + 36, y + 10);
      c.stroke();
    }
    wear(c, w, h, r, 0.4, 0);
  });
  add("handprints", 384, 256, (c, w, h, r) => {
    for (let k = 0; k < 5; k++) {
      const x = 50 + r() * 280, y = 60 + r() * 130;
      c.save();
      c.translate(x, y);
      c.rotate((r() - 0.5) * 1.2);
      c.fillStyle = `rgba(${70 + r() * 30},6,5,0.82)`;
      c.beginPath();
      c.ellipse(0, 14, 17, 20, 0, 0, TAU2);
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.save();
        c.translate(-14 + i * 9.5, -4);
        c.rotate(-0.25 + i * 0.16);
        c.beginPath();
        c.ellipse(0, -15, 3.8, 15, 0, 0, TAU2);
        c.fill();
        c.restore();
      }
      const g2 = c.createLinearGradient(0, 20, 0, 110);
      g2.addColorStop(0, "rgba(70,6,5,0.7)");
      g2.addColorStop(1, "rgba(70,6,5,0)");
      c.fillStyle = g2;
      c.fillRect(-12, 20, 24, 90);
      c.restore();
    }
  });
  const AW = 4096, P3 = pack2(AW, L);
  const AH = P3.height <= 2048 ? 2048 : P3.height <= 4096 ? 4096 : Math.ceil(P3.height / 128) * 128;
  if (AH > 4096) console.error("[field] sign atlas overflow: " + P3.height);
  const A = atlas(AW, AH, P3.entries, 61);
  A.usedHeight = P3.height;
  A.names = L.map((e) => e.name);
  A.aspect = (n) => {
    const e = P3.entries[n];
    if (!e) throw new Error('field atlas has no "' + n + '"');
    return e[2] / e[3];
  };
  const rect0 = A.rect;
  A.rect = (n) => {
    const q = rect0(n);
    if (!q) throw new Error('field atlas has no "' + n + '"');
    return q;
  };
  return A;
}
var cardTex = (cv, rep = false) => {
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  if (rep) t.wrapS = t.wrapT = RepeatWrapping;
  return t;
};
function foliageSheet() {
  const S4 = 1024, cv = document.createElement("canvas");
  cv.width = S4;
  cv.height = S4 * 1.5;
  const c = cv.getContext("2d"), r = rng(77), Hh = S4 / 2;
  const leaf = (x, y, l, wd, a, col) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(l * 0.45, -wd, l, 0);
    c.quadraticCurveTo(l * 0.45, wd, 0, 0);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(l * 0.92, 0);
    c.stroke();
    c.restore();
  };
  const green = (k, warm = 0) => `rgb(${Math.round((30 + warm * 40 + r() * 26) * k)},${Math.round((58 + r() * 40) * k)},${Math.round((20 + r() * 16) * k)})`;
  c.save();
  c.beginPath();
  c.rect(0, 0, Hh, Hh);
  c.clip();
  for (let layer = 0; layer < 3; layer++) {
    const k = 0.5 + layer * 0.3;
    for (let t = 0; t < 26; t++) {
      const a0 = -Math.PI / 2 + (r() - 0.5) * 2.5;
      let x = Hh / 2 + (r() - 0.5) * 60, y = Hh - 8, a = a0;
      const n = 8 + Math.floor(r() * 10);
      c.strokeStyle = "rgb(28,22,16)";
      c.lineWidth = 3 - layer * 0.6;
      for (let i = 0; i < n; i++) {
        const nx = x + Math.cos(a) * 24, ny = y + Math.sin(a) * 24;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(nx, ny);
        c.stroke();
        x = nx;
        y = ny;
        a += (r() - 0.5) * 0.6;
        for (let q2 = 0; q2 < 3; q2++) leaf(x + (r() - 0.5) * 8, y + (r() - 0.5) * 8, 22 + r() * 18, 7 + r() * 5, a + (r() - 0.5) * 2.6, green(k, r() * 0.5));
      }
    }
  }
  c.restore();
  c.save();
  c.beginPath();
  c.rect(Hh, 0, Hh, Hh);
  c.clip();
  c.translate(Hh, 0);
  for (let layer = 0; layer < 3; layer++) {
    const k = 0.42 + layer * 0.26;
    for (let t = 0; t < 18; t++) {
      let x = Hh / 2 + (r() - 0.5) * 40, y = 10 + r() * 60, a = Math.PI / 2 + (r() - 0.5) * 1.9;
      const n = 16 + Math.floor(r() * 12);
      for (let i = 0; i < n; i++) {
        const nx = x + Math.cos(a) * 15, ny = y + Math.sin(a) * 15;
        c.strokeStyle = "rgb(30,24,18)";
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(nx, ny);
        c.stroke();
        c.strokeStyle = `rgb(${Math.round(22 * k + r() * 14)},${Math.round(66 * k + r() * 26)},${Math.round(40 * k + r() * 14)})`;
        c.lineWidth = 1.7;
        for (let q2 = 0; q2 < 7; q2++) {
          const na = a + (q2 % 2 ? 1 : -1) * (0.7 + r() * 0.5), l = 12 + r() * 9, px2 = x + (nx - x) * q2 / 7, py2 = y + (ny - y) * q2 / 7;
          c.beginPath();
          c.moveTo(px2, py2);
          c.lineTo(px2 + Math.cos(na) * l, py2 + Math.sin(na) * l);
          c.stroke();
        }
        x = nx;
        y = ny;
        a += (r() - 0.5) * 0.25 + (Math.PI / 2 - a) * 0.04;
      }
    }
  }
  c.restore();
  c.save();
  c.beginPath();
  c.rect(0, Hh, Hh, Hh);
  c.clip();
  c.translate(0, Hh);
  for (let layer = 0; layer < 4; layer++) {
    const k = 0.36 + layer * 0.22;
    for (let i = 0; i < 900; i++) {
      const x = r() * Hh, top = 60 + 50 * fbm(x * 0.012, 3.3, layer, 3) + (3 - layer) * 14, y = top + r() * (Hh - top);
      leaf(x, y, 12 + r() * 12, 4 + r() * 4, r() * TAU2, green(k * (0.75 + 0.25 * (1 - y / Hh)), r() * 0.3));
    }
  }
  c.restore();
  c.save();
  c.beginPath();
  c.rect(Hh, Hh, Hh, Hh);
  c.clip();
  c.translate(Hh, Hh);
  for (let i = 0; i < 260; i++) {
    const x = 20 + r() * (Hh - 40), hgt = 80 + r() * r() * 380, lean = (r() - 0.5) * 120, k = 0.5 + r() * 0.5;
    c.strokeStyle = `rgb(${Math.round((50 + r() * 50) * k)},${Math.round((78 + r() * 40) * k)},${Math.round(26 * k)})`;
    c.lineWidth = 2 + r() * 3.5;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, Hh);
    c.quadraticCurveTo(x + lean * 0.2, Hh - hgt * 0.6, x + lean, Hh - hgt);
    c.stroke();
    if (r() < 0.2) for (let q2 = 0; q2 < 6; q2++) leaf(x + lean * 0.2 * q2 / 6, Hh - hgt * (0.2 + 0.11 * q2), 22 + r() * 16, 8 + r() * 5, (q2 % 2 ? 0 : Math.PI) + (r() - 0.5) * 0.8 - 0.3, green(0.9, 0.2));
  }
  c.restore();
  const IVY = [[0, 0.1], [-0.28, 0.12], [-0.62, -0.02], [-0.36, -0.26], [-0.58, -0.55], [-0.2, -0.52], [0, -1], [0.2, -0.52], [0.58, -0.55], [0.36, -0.26], [0.62, -0.02], [0.28, 0.12]];
  const ivyLeaf = (x, y, sz, a, k) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillStyle = `rgb(${Math.round((22 + r() * 22) * k)},${Math.round((62 + r() * 34) * k)},${Math.round((26 + r() * 14) * k)})`;
    c.lineJoin = "round";
    c.beginPath();
    IVY.forEach(([px2, py2], i) => i ? c.lineTo(px2 * sz, py2 * sz) : c.moveTo(px2 * sz, py2 * sz));
    c.closePath();
    c.fill();
    c.strokeStyle = `rgba(${Math.round(150 * k)},${Math.round(176 * k)},${Math.round(120 * k)},0.5)`;
    c.lineWidth = 1.3;
    for (const i of [2, 4, 6, 8, 10]) {
      c.beginPath();
      c.moveTo(0, 0.05 * sz);
      c.lineTo(IVY[i][0] * sz * 0.82, IVY[i][1] * sz * 0.82);
      c.stroke();
    }
    c.restore();
  };
  c.save();
  c.beginPath();
  c.rect(0, S4, Hh, Hh);
  c.clip();
  c.translate(0, S4);
  {
    const edge = (a) => Hh * (0.3 + 0.16 * fbm(Math.cos(a) * 1.6 + 4, Math.sin(a) * 1.6 + 9, 1.3, 3));
    for (let t = 0; t < 9; t++) {
      let x = Hh / 2 + (r() - 0.5) * 120, y = Hh / 2 + (r() - 0.5) * 120, a = r() * TAU2;
      c.strokeStyle = "rgb(44,34,24)";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, y);
      for (let i = 0; i < 7; i++) {
        a += (r() - 0.5) * 0.9;
        x += Math.cos(a) * 26;
        y += Math.sin(a) * 26;
        if (Math.hypot(x - Hh / 2, y - Hh / 2) > Hh * 0.36) break;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    for (let layer = 0; layer < 3; layer++) {
      const k = 0.45 + layer * 0.3;
      for (let i = 0; i < 150; i++) {
        const a = r() * TAU2, d = Math.sqrt(r()) * edge(a) * (1 - layer * 0.08), sz = 36 + r() * 24;
        ivyLeaf(Hh / 2 + Math.cos(a) * d, Hh / 2 + Math.sin(a) * d, sz * 0.5, Math.PI + (r() - 0.5) * 1.6, k);
      }
    }
  }
  c.restore();
  c.save();
  c.beginPath();
  c.rect(Hh, S4, Hh, Hh);
  c.clip();
  c.translate(Hh, S4);
  for (let t = 0; t < 11; t++) {
    let x = 40 + r() * (Hh - 80), y = 14;
    const len = 8 + Math.floor(r() * 9), k = 0.5 + r() * 0.5;
    let a = Math.PI / 2 + (r() - 0.5) * 0.5;
    const pts = [[x, y]];
    for (let i = 0; i < len; i++) {
      a += (r() - 0.5) * 0.5 + (Math.PI / 2 - a) * 0.2;
      x = clamp2(x + Math.cos(a) * 30, 34, Hh - 34);
      y += Math.sin(a) * 30;
      if (y > Hh - 40) break;
      pts.push([x, y]);
    }
    c.strokeStyle = "rgb(46,36,25)";
    c.lineWidth = 2.6;
    c.beginPath();
    pts.forEach(([px2, py2], i) => i ? c.lineTo(px2, py2) : c.moveTo(px2, py2));
    c.stroke();
    for (const [px2, py2] of pts) for (let q2 = 0; q2 < 2; q2++) ivyLeaf(px2 + (r() - 0.5) * 22, py2 + (r() - 0.5) * 16, 17 + r() * 13, Math.PI + (r() - 0.5) * 1.9, k * (0.8 + 0.4 * r()));
  }
  c.restore();
  const tex = cardTex(cv), q = 3 / S4;
  return { tex, rect: (i) => {
    const cx = i % 2, cy = Math.floor(i / 2);
    return [cx / 2 + q, 1 - (cy + 1) / 3 + q, (cx + 1) / 2 - q, 1 - cy / 3 - q];
  } };
}
function netTexture() {
  const S4 = 128, cv = document.createElement("canvas");
  cv.width = cv.height = S4;
  const c = cv.getContext("2d");
  c.clearRect(0, 0, S4, S4);
  for (const [lw, col] of [[9, "#6f736f"], [6, "#c9cbc4"], [2.5, "#f0f0ea"]]) {
    c.strokeStyle = col;
    c.lineWidth = lw;
    for (const p of [0, S4]) {
      c.beginPath();
      c.moveTo(p, 0);
      c.lineTo(p, S4);
      c.stroke();
      c.beginPath();
      c.moveTo(0, p);
      c.lineTo(S4, p);
      c.stroke();
    }
  }
  c.fillStyle = "#e4e4dc";
  for (const [x, y] of [[0, 0], [S4, 0], [0, S4], [S4, S4]]) {
    c.beginPath();
    c.arc(x, y, 9, 0, TAU2);
    c.fill();
  }
  return cardTex(cv, true);
}
function weldTexture() {
  const W = 64, Hh = 256, cv = document.createElement("canvas");
  cv.width = W;
  cv.height = Hh;
  const c = cv.getContext("2d");
  c.clearRect(0, 0, W, Hh);
  const wire = (x0, y0, x1, y1, lw) => {
    for (const [k, col] of [[1, "#16301e"], [0.6, "#2f6a40"], [0.22, "#69a878"]]) {
      c.strokeStyle = col;
      c.lineWidth = lw * k;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
  };
  for (let i = 0; i <= 4; i++) wire(i * 16, 0, i * 16, Hh, 7);
  for (let j = 0; j <= 3; j++) wire(0, j * Hh / 3 + (j === 3 ? -4 : j === 0 ? 4 : 0), W, j * Hh / 3 + (j === 3 ? -4 : j === 0 ? 4 : 0), 8);
  wire(0, 14, W, 14, 6);
  wire(0, Hh - 14, W, Hh - 14, 6);
  return cardTex(cv, true);
}

