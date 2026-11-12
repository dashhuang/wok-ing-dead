var TAU4 = Math.PI * 2;
var MAPCOL = { ink: "#e8ebe6", amber: "#f2a31b", red: "#ff4b38", green: "#55d48a", blue: "#7fc4ff" };
function createMinimap(canvas, { size = 208 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), N = Math.round(size * dpr), c = canvas.getContext("2d");
  canvas.width = canvas.height = N;
  let base = null, B2 = null, ppm = 6, t = 0, sweep3 = 0;
  function setWorld(W, bounds) {
    B2 = bounds;
    const pad = 14, w = B2.x1 - B2.x0 + pad * 2, h = B2.z1 - B2.z0 + pad * 2;
    ppm = Math.max(3, Math.min(8, 900 / Math.max(w, h)));
    base = document.createElement("canvas");
    base.width = Math.ceil(w * ppm);
    base.height = Math.ceil(h * ppm);
    base.ox = B2.x0 - pad;
    base.oz = B2.z0 - pad;
    const g2 = base.getContext("2d");
    g2.fillStyle = "rgba(10,16,20,0.0)";
    g2.fillRect(0, 0, base.width, base.height);
    g2.fillStyle = "rgba(126,160,178,0.10)";
    g2.fillRect((B2.x0 - base.ox) * ppm, (B2.z0 - base.oz) * ppm, (B2.x1 - B2.x0) * ppm, (B2.z1 - B2.z0) * ppm);
    const cols = (W.colliders || []).slice().sort((a, b) => a.c[1] + a.h[1] - (b.c[1] + b.h[1]));
    for (const k of cols) {
      if (k.playerOnly || k.soft) continue;
      const top = k.c[1] + k.h[1];
      if (top < 0.35) continue;
      const tall = top > 2.2, mid = top > 0.9;
      g2.save();
      g2.translate((k.c[0] - base.ox) * ppm, (k.c[2] - base.oz) * ppm);
      g2.rotate(-(k.yaw || 0));
      g2.fillStyle = tall ? "rgba(168,190,202,0.50)" : mid ? "rgba(150,172,186,0.34)" : "rgba(140,160,172,0.2)";
      g2.fillRect(-k.h[0] * ppm, -k.h[2] * ppm, k.h[0] * 2 * ppm, k.h[2] * 2 * ppm);
      if (tall) {
        g2.strokeStyle = "rgba(214,228,236,0.55)";
        g2.lineWidth = 1;
        g2.strokeRect(-k.h[0] * ppm, -k.h[2] * ppm, k.h[0] * 2 * ppm, k.h[2] * 2 * ppm);
      }
      g2.restore();
    }
    g2.strokeStyle = "rgba(242,163,27,0.55)";
    g2.setLineDash([6, 5]);
    g2.lineWidth = 1.5;
    g2.strokeRect((B2.x0 - base.ox) * ppm, (B2.z0 - base.oz) * ppm, (B2.x1 - B2.x0) * ppm, (B2.z1 - B2.z0) * ppm);
  }
  function draw(dt, s) {
    t += dt;
    sweep3 = (sweep3 + dt * 1.1) % TAU4;
    const R4 = N / 2, k = (R4 - 4 * dpr) / s.range, rot2 = s.rotate ? s.yaw : 0, cs = Math.cos(rot2), sn = Math.sin(rot2);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, N, N);
    c.save();
    c.beginPath();
    c.arc(R4, R4, R4 - 2 * dpr, 0, TAU4);
    c.clip();
    const bg = c.createRadialGradient(R4, R4, R4 * 0.1, R4, R4, R4);
    bg.addColorStop(0, "rgba(14,24,30,0.86)");
    bg.addColorStop(1, "rgba(5,9,12,0.9)");
    c.fillStyle = bg;
    c.fillRect(0, 0, N, N);
    c.translate(R4, R4);
    c.rotate(rot2);
    if (base) {
      const sc2 = k / ppm;
      c.save();
      c.scale(sc2, sc2);
      c.imageSmoothingEnabled = true;
      c.drawImage(base, (base.ox - s.px) * ppm, (base.oz - s.pz) * ppm);
      c.restore();
    }
    c.lineWidth = dpr;
    c.strokeStyle = "rgba(232,235,230,0.10)";
    for (let r = 10; r < s.range; r += 10) {
      c.beginPath();
      c.arc(0, 0, r * k, 0, TAU4);
      c.stroke();
    }
    const P22 = (x, z) => [(x - s.px) * k, (z - s.pz) * k];
    for (const p of s.pickups || []) {
      const [x, y] = P22(p.x, p.z);
      if (Math.hypot(x, y) > R4) continue;
      c.save();
      c.translate(x, y);
      c.rotate(-rot2);
      c.fillStyle = p.kind === "med" ? MAPCOL.green : MAPCOL.amber;
      const a = 3.6 * dpr;
      if (p.kind === "med") {
        c.fillRect(-a, -a * 0.36, a * 2, a * 0.72);
        c.fillRect(-a * 0.36, -a, a * 0.72, a * 2);
      } else {
        c.beginPath();
        c.moveTo(0, -a);
        c.lineTo(a, 0);
        c.lineTo(0, a);
        c.lineTo(-a, 0);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    if (s.drone && s.drone.job) {
      const [x, y] = P22(s.drone.job.x, s.drone.job.z), pr = t * 1.6 % 1;
      c.strokeStyle = MAPCOL.blue;
      c.lineWidth = 1.5 * dpr;
      c.globalAlpha = 1 - pr;
      c.beginPath();
      c.arc(x, y, (3 + pr * 9) * dpr, 0, TAU4);
      c.stroke();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(x, y, 2.2 * dpr, 0, TAU4);
      c.stroke();
    }
    let out = 0;
    const rim2 = [];
    for (const e of s.enemies || []) {
      const [x, y] = P22(e.x, e.z), d = Math.hypot(x, y), r = (e.type === "brute" ? 4.3 : e.type === "runner" ? 2.7 : 3.2) * dpr;
      if (d > R4 - 7 * dpr) {
        rim2.push(Math.atan2(y, x));
        out++;
        continue;
      }
      c.fillStyle = MAPCOL.red;
      c.beginPath();
      c.arc(x, y, r, 0, TAU4);
      c.fill();
      if (e.type === "runner") {
        c.strokeStyle = MAPCOL.red;
        c.lineWidth = dpr;
        c.beginPath();
        c.arc(x, y, r + 2 * dpr, 0, TAU4);
        c.stroke();
      }
      if (d / k < 6) {
        c.strokeStyle = "rgba(255,75,56,0.5)";
        c.lineWidth = dpr;
        c.beginPath();
        c.arc(x, y, r + (3 + 2 * Math.sin(t * 9)) * dpr, 0, TAU4);
        c.stroke();
      }
    }
    if (s.drone && s.drone.up !== false) {
      const [x, y] = P22(s.drone.x, s.drone.z), d = Math.hypot(x, y), a = Math.atan2(y, x), q = d > R4 - 9 * dpr ? R4 - 9 * dpr : d;
      c.save();
      c.translate(Math.cos(a) * q, Math.sin(a) * q);
      c.rotate(-s.drone.yaw + Math.PI);
      c.strokeStyle = MAPCOL.blue;
      c.fillStyle = MAPCOL.blue;
      c.lineWidth = 1.3 * dpr;
      const u2 = 3.4 * dpr;
      c.beginPath();
      c.moveTo(-u2, -u2);
      c.lineTo(u2, u2);
      c.moveTo(u2, -u2);
      c.lineTo(-u2, u2);
      c.stroke();
      for (const [ex, ey] of [[-u2, -u2], [u2, -u2], [-u2, u2], [u2, u2]]) {
        c.beginPath();
        c.arc(ex, ey, 1.7 * dpr, 0, TAU4);
        c.stroke();
      }
      c.beginPath();
      c.arc(0, 0, 1.4 * dpr, 0, TAU4);
      c.fill();
      c.restore();
    }
    c.rotate(-rot2);
    c.strokeStyle = MAPCOL.red;
    c.lineWidth = 2.4 * dpr;
    for (const a0 of rim2) {
      const a = a0 + rot2;
      c.beginPath();
      c.moveTo(Math.cos(a) * (R4 - 9 * dpr), Math.sin(a) * (R4 - 9 * dpr));
      c.lineTo(Math.cos(a) * (R4 - 3 * dpr), Math.sin(a) * (R4 - 3 * dpr));
      c.stroke();
    }
    const head = s.rotate ? -Math.PI / 2 : -Math.PI / 2 - s.yaw, half = (s.fov || 74) * Math.PI / 360 * 1.25, cone3 = c.createRadialGradient(0, 0, 0, 0, 0, R4 * 0.8);
    cone3.addColorStop(0, "rgba(232,235,230,0.26)");
    cone3.addColorStop(1, "rgba(232,235,230,0)");
    c.fillStyle = cone3;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, R4 * 0.8, head - half, head + half);
    c.closePath();
    c.fill();
    c.save();
    c.rotate(head + Math.PI / 2);
    c.fillStyle = MAPCOL.ink;
    c.strokeStyle = "rgba(0,0,0,0.7)";
    c.lineWidth = dpr;
    const u = 5.2 * dpr;
    c.beginPath();
    c.moveTo(0, -u * 1.25);
    c.lineTo(u * 0.82, u);
    c.lineTo(0, u * 0.5);
    c.lineTo(-u * 0.82, u);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    const sw = c.createConicGradient && (!s.drone || s.drone.scan !== false) ? c.createConicGradient(sweep3, 0, 0) : null;
    if (sw) {
      sw.addColorStop(0, "rgba(127,196,255,0)");
      sw.addColorStop(0.86, "rgba(127,196,255,0)");
      sw.addColorStop(1, "rgba(127,196,255,0.13)");
      c.fillStyle = sw;
      c.beginPath();
      c.arc(0, 0, R4, 0, TAU4);
      c.fill();
    }
    c.restore();
    c.setTransform(1, 0, 0, 1, R4, R4);
    c.strokeStyle = "rgba(232,235,230,0.5)";
    c.lineWidth = 1.5 * dpr;
    c.beginPath();
    c.arc(0, 0, R4 - 2 * dpr, 0, TAU4);
    c.stroke();
    c.strokeStyle = "rgba(232,235,230,0.35)";
    c.lineWidth = dpr;
    for (let i = 0; i < 24; i++) {
      const a = i * TAU4 / 24 + (s.rotate ? s.yaw : 0), l = i % 6 === 0 ? 6 : 3;
      c.beginPath();
      c.moveTo(Math.cos(a) * (R4 - 2 * dpr), Math.sin(a) * (R4 - 2 * dpr));
      c.lineTo(Math.cos(a) * (R4 - (2 + l) * dpr), Math.sin(a) * (R4 - (2 + l) * dpr));
      c.stroke();
    }
    const na = -Math.PI / 2 + (s.rotate ? s.yaw : 0);
    c.fillStyle = MAPCOL.amber;
    c.save();
    c.translate(Math.cos(na) * (R4 - 11 * dpr), Math.sin(na) * (R4 - 11 * dpr));
    c.rotate(na + Math.PI / 2);
    c.beginPath();
    c.moveTo(0, -5 * dpr);
    c.lineTo(4 * dpr, 4 * dpr);
    c.lineTo(-4 * dpr, 4 * dpr);
    c.closePath();
    c.fill();
    c.restore();
    return out;
  }
  return { setWorld, draw, get ready() {
    return !!base;
  } };
}
function createCompass(canvas, { w = 440, h = 30 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(w * dpr), H2 = Math.round(h * dpr), c = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H2;
  const SPAN = 120, names = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" }, wrap2 = (a) => (a + 540) % 360 - 180;
  function draw(s) {
    const hd = (-s.yaw * 180 / Math.PI % 360 + 360) % 360, X = (deg2) => W / 2 + wrap2(deg2 - hd) / SPAN * W;
    c.clearRect(0, 0, W, H2);
    const fade = (x) => Math.max(0, Math.min(1, Math.min(x, W - x) / (W * 0.16)));
    c.textAlign = "center";
    c.textBaseline = "top";
    for (let d = 0; d < 360; d += 5) {
      const x = X(d);
      if (x < 0 || x > W) continue;
      const big = d % 45 === 0, mid = d % 15 === 0;
      c.globalAlpha = fade(x) * (big ? 0.95 : mid ? 0.6 : 0.3);
      c.fillStyle = d === 0 ? MAPCOL.amber : MAPCOL.ink;
      c.fillRect(Math.round(x) - (big ? dpr : dpr / 2), 0, big ? 2 * dpr : dpr, (big ? 9 : mid ? 6 : 3.5) * dpr);
      if (big) {
        c.font = `600 ${11 * dpr}px ui-sans-serif,system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif`;
        c.fillText(names[d], x, 12 * dpr);
      } else if (d % 15 === 0) {
        c.font = `${8.5 * dpr}px ui-sans-serif,system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif`;
        c.globalAlpha *= 0.75;
        c.fillText(String(d), x, 13 * dpr);
      }
    }
    const bearing = (x, z) => Math.atan2(x - s.px, -(z - s.pz)) * 180 / Math.PI;
    const mark = (x, z, col, sz, tri) => {
      const px2 = X(bearing(x, z));
      if (px2 < 2 || px2 > W - 2) return;
      const d = Math.hypot(x - s.px, z - s.pz);
      c.globalAlpha = fade(px2) * Math.max(0.35, Math.min(1, 1.25 - d / 40));
      c.fillStyle = col;
      const a = sz * dpr;
      c.beginPath();
      if (tri) {
        c.moveTo(px2, H2 - a * 1.5);
        c.lineTo(px2 + a, H2);
        c.lineTo(px2 - a, H2);
      } else c.rect(px2 - a * 0.6, H2 - a * 1.5, a * 1.2, a * 1.5);
      c.closePath();
      c.fill();
    };
    for (const p of s.pickups || []) mark(p.x, p.z, p.kind === "med" ? MAPCOL.green : MAPCOL.amber, 3, false);
    if (s.drone && s.drone.up !== false) mark(s.drone.x, s.drone.z, MAPCOL.blue, 3, false);
    for (const e of s.enemies || []) mark(e.x, e.z, MAPCOL.red, e.type === "brute" ? 4.5 : 3.4, true);
    c.globalAlpha = 1;
    c.fillStyle = MAPCOL.ink;
    c.beginPath();
    c.moveTo(W / 2, 11 * dpr);
    c.lineTo(W / 2 + 4 * dpr, 0);
    c.lineTo(W / 2 - 4 * dpr, 0);
    c.closePath();
    c.fill();
    return Math.round(hd);
  }
  return { draw };
}

