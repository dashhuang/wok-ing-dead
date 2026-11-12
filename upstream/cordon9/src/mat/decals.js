function atlas(w, h, entries, seed = 7) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  const rnd = rng(seed), rects2 = {};
  for (const [name, [x, y, ww, hh, draw]] of Object.entries(entries)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, hh);
    ctx.clip();
    ctx.translate(x, y);
    draw(ctx, ww, hh, rnd);
    ctx.restore();
    const pad = 1.5;
    rects2[name] = [(x + pad) / w, 1 - (y + hh - pad) / h, (x + ww - pad) / w, 1 - (y + pad) / h];
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  return { tex, rect: (n) => rects2[n], canvas: cv };
}
function wear(ctx, w, h, rnd, amt = 0.25, scratches = 4) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const n = Math.round(w * h * 0.012 * amt);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.35 + rnd() * 0.65;
    const r = 0.4 + rnd() * rnd() * 2.6;
    ctx.beginPath();
    ctx.ellipse(rnd() * w, rnd() * h, r * (1 + rnd() * 2), r, rnd() * 3.14, 0, 6.3);
    ctx.fill();
  }
  ctx.lineCap = "round";
  for (let i = 0; i < scratches; i++) {
    ctx.globalAlpha = 0.5 + rnd() * 0.5;
    ctx.lineWidth = 0.5 + rnd() * 1.6;
    const x = rnd() * w, y = rnd() * h, a = (rnd() - 0.5) * 1.2, l = (0.2 + rnd() * 0.6) * w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}
function label(ctx, txt, x, y, w, h, { font = "bold", family = "Arial, Helvetica, sans-serif", color = "#d8d8d8", align = "center", track: track2 = 0, shadow = null } = {}) {
  let px2 = h;
  ctx.font = `${font} ${px2}px ${family}`;
  if (track2 && ctx.letterSpacing !== void 0) ctx.letterSpacing = track2 + "px";
  const mw = ctx.measureText(txt).width;
  if (mw > w) {
    px2 *= w / mw;
    ctx.font = `${font} ${px2}px ${family}`;
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  const tx = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(txt, tx + px2 * 0.035, y + h / 2 + px2 * 0.05);
  }
  ctx.fillStyle = color;
  ctx.fillText(txt, tx, y + h / 2);
  if (ctx.letterSpacing !== void 0) ctx.letterSpacing = "0px";
}
function quad(c, u, v, w, h, rect2, lift = 25e-5) {
  const n = new Vector3().crossVectors(new Vector3(...u), new Vector3(...v)).normalize();
  const P3 = [], N = [], UV = [];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    P3.push(c[0] + u[0] * a * w / 2 + v[0] * b * h / 2 + n.x * lift, c[1] + u[1] * a * w / 2 + v[1] * b * h / 2 + n.y * lift, c[2] + u[2] * a * w / 2 + v[2] * b * h / 2 + n.z * lift);
    N.push(n.x, n.y, n.z);
    UV.push(a < 0 ? rect2[0] : rect2[2], b < 0 ? rect2[1] : rect2[3]);
  }
  return fromArrays(P3, N, UV, [0, 1, 2, 0, 2, 3]);
}
function decalMaterial(tex, { rough = 0.6, metal = 0, opacity = 1 } = {}) {
  return new MeshStandardMaterial({ map: tex, transparent: true, opacity, depthWrite: false, roughness: rough, metalness: metal, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
}
function weaponAtlas() {
  const eng = "#c9c9c6", sh = "rgba(0,0,0,0.75)";
  return atlas(1024, 512, {
    model: [0, 0, 300, 96, (c, w, h, r) => {
      label(c, "KR-58", 4, 4, w - 8, 60, { color: eng, shadow: sh, track: 3 });
      label(c, "WARDEN  7.62\xD739", 4, 66, w - 8, 24, { color: eng, shadow: sh, track: 2 });
      wear(c, w, h, r, 0.2, 3);
    }],
    serial: [304, 0, 300, 44, (c, w, h, r) => {
      label(c, "C9A 4471-0926", 4, 4, w - 8, 36, { color: eng, shadow: sh, family: '"Courier New", monospace', track: 2 });
      wear(c, w, h, r, 0.15, 2);
    }],
    selS: [304, 48, 44, 44, (c, w, h, r) => {
      label(c, "S", 2, 2, w - 4, h - 4, { color: "#e6e6e0" });
      wear(c, w, h, r, 0.5, 1);
    }],
    sel1: [352, 48, 44, 44, (c, w, h, r) => {
      label(c, "1", 2, 2, w - 4, h - 4, { color: "#e6e6e0" });
      wear(c, w, h, r, 0.5, 1);
    }],
    selA: [400, 48, 44, 44, (c, w, h, r) => {
      label(c, "A", 2, 2, w - 4, h - 4, { color: "#d43a22" });
      wear(c, w, h, r, 0.5, 1);
    }],
    stock: [0, 100, 330, 84, (c, w, h, r) => {
      label(c, "C9-14", 6, 6, w - 12, h - 12, { color: "#e2dfd2", font: "900", track: 6 });
      c.globalCompositeOperation = "destination-out";
      c.fillRect(0, h * 0.47, w, 5);
      for (let i = 1; i < 6; i++) c.fillRect(i * w / 6 - 2, 0, 4, h);
      c.globalCompositeOperation = "source-over";
      wear(c, w, h, r, 0.9, 7);
    }],
    warn: [334, 100, 240, 150, (c, w, h, r) => {
      c.fillStyle = "#d9b21c";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#151515";
      c.lineWidth = 5;
      c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = "#151515";
      c.beginPath();
      c.moveTo(40, 22);
      c.lineTo(66, 66);
      c.lineTo(14, 66);
      c.closePath();
      c.fill();
      label(c, "!", 30, 32, 20, 30, { color: "#d9b21c" });
      label(c, "LASER", 76, 18, w - 92, 30, { color: "#151515" });
      label(c, "RADIATION", 76, 48, w - 92, 20, { color: "#151515" });
      label(c, "AVOID DIRECT EYE EXPOSURE", 14, 80, w - 28, 16, { color: "#151515" });
      label(c, "CLASS 3R  \xB7  850 nm / 635 nm  \xB7  5 mW", 14, 102, w - 28, 13, { color: "#151515", font: "normal" });
      label(c, "ILLUM-2 / SN 20418", 14, 122, w - 28, 13, { color: "#151515", font: "normal" });
      wear(c, w, h, r, 0.45, 5);
    }],
    illum: [578, 0, 300, 44, (c, w, h, r) => {
      label(c, "ILLUM-2  VIS/IR", 4, 6, w - 8, 32, { color: "#2a2418", track: 2 });
      wear(c, w, h, r, 0.3, 2);
    }],
    optic: [578, 48, 300, 40, (c, w, h, r) => {
      label(c, "VANTA  RD-30", 4, 5, w - 8, 30, { color: "#e8e8e8", track: 4 });
      wear(c, w, h, r, 0.35, 2);
    }],
    magStamp: [578, 92, 140, 70, (c, w, h, r) => {
      c.strokeStyle = eng;
      c.lineWidth = 3;
      c.strokeRect(4, 4, w - 8, h - 8);
      label(c, "7.62", 8, 8, w - 16, 28, { color: eng, shadow: sh });
      label(c, "30 RD", 8, 36, w - 16, 26, { color: eng, shadow: sh });
      wear(c, w, h, r, 0.4, 3);
    }],
    tag: [722, 92, 290, 110, (c, w, h, r) => {
      c.fillStyle = "#d9d6cb";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#1b1b1b";
      let x = 12;
      while (x < w - 14) {
        const bw = 1 + Math.floor(r() * 4);
        c.fillRect(x, 10, bw, 46);
        x += bw + 1 + Math.floor(r() * 3);
      }
      label(c, "PROPERTY OF", 10, 60, w - 20, 16, { color: "#1b1b1b" });
      label(c, "CITY EMERGENCY AUTHORITY", 10, 78, w - 20, 16, { color: "#1b1b1b" });
      c.fillStyle = "rgba(90,70,40,0.25)";
      c.fillRect(0, 0, w, h);
      wear(c, w, h, r, 0.7, 6);
    }],
    tally: [0, 188, 330, 120, (c, w, h, r) => {
      c.strokeStyle = "#b9b6ad";
      c.lineCap = "round";
      let x = 14;
      for (let gI = 0; gI < 4; gI++) {
        const n = gI < 3 ? 5 : 3;
        for (let i = 0; i < Math.min(n, 4); i++) {
          c.lineWidth = 2 + r() * 1.5;
          c.beginPath();
          c.moveTo(x + i * 14 + (r() - 0.5) * 4, 18 + r() * 8);
          c.lineTo(x + i * 14 + (r() - 0.5) * 5, 96 + r() * 10);
          c.stroke();
        }
        if (n === 5) {
          c.lineWidth = 2.5;
          c.beginPath();
          c.moveTo(x - 8, 82 + r() * 10);
          c.lineTo(x + 52, 30 + r() * 10);
          c.stroke();
        }
        x += 78;
      }
    }],
    pistol: [334, 254, 330, 60, (c, w, h, r) => {
      label(c, "M11 COMPACT  \xB7  9\xD719", 4, 6, w - 8, 30, { color: eng, shadow: sh, track: 2 });
      label(c, "C9A 220 771", 4, 38, w - 8, 18, { color: eng, shadow: sh, family: '"Courier New", monospace' });
      wear(c, w, h, r, 0.2, 2);
    }],
    watch: [0, 312, 284, 236, (c, w, h, r) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#8a9479");
      gr.addColorStop(1, "#6f7a62");
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(20,24,18,0.12)";
      label(c, "88:88", 14, 60, w - 28, 110, { color: "rgba(20,24,18,0.1)", family: '"Courier New", monospace' });
      label(c, "02:47", 14, 60, w - 28, 110, { color: "#161a14", family: '"Courier New", monospace' });
      label(c, "TU 10\xB711", 16, 14, 150, 34, { color: "#161a14", family: '"Courier New", monospace' });
      label(c, "ALM", w - 86, 16, 70, 28, { color: "#161a14" });
      c.fillStyle = "#161a14";
      c.fillRect(14, 54, w - 28, 3);
      c.fillRect(14, 178, w - 28, 3);
      label(c, "SECTOR 9", 16, 190, 150, 30, { color: "#161a14" });
      for (let i = 0; i < 5; i++) c.fillRect(w - 96 + i * 16, 214 - i * 5 - 6, 11, 6 + i * 5);
      wear(c, w, h, r, 0.06, 2);
    }],
    arrows: [668, 206, 180, 60, (c, w, h, r) => {
      c.fillStyle = "#e6e6e0";
      for (const [x, d] of [[30, -1], [150, 1]]) {
        c.beginPath();
        c.moveTo(x + d * 22, 30);
        c.lineTo(x - d * 6, 12);
        c.lineTo(x - d * 6, 48);
        c.closePath();
        c.fill();
      }
      label(c, "W", 62, 14, 24, 32, { color: "#e6e6e0" });
      label(c, "E", 94, 14, 24, 32, { color: "#e6e6e0" });
      wear(c, w, h, r, 0.3, 1);
    }]
  }, 11);
}

