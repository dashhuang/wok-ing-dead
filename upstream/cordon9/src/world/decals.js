var TAU = Math.PI * 2;
function pack(W, list, gap = 4) {
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
function blob(c, x, y, r, rnd, jag = 0.35, n = 11) {
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, rr = r * (1 - jag + rnd() * jag * 2), px2 = x + Math.cos(a) * rr, py2 = y + Math.sin(a) * rr;
    if (i) c.lineTo(px2, py2);
    else c.moveTo(px2, py2);
  }
  c.closePath();
}
function stripes(c, w, h, a, b, pitch, slant = 1) {
  c.fillStyle = a;
  c.fillRect(0, 0, w, h);
  c.fillStyle = b;
  for (let x = -h * 2; x < w + h * 2; x += pitch * 2) {
    c.beginPath();
    c.moveTo(x, h);
    c.lineTo(x + pitch, h);
    c.lineTo(x + pitch + h * slant, 0);
    c.lineTo(x + h * slant, 0);
    c.closePath();
    c.fill();
  }
}
function trefoil(c, cx, cy, r, col, bg) {
  c.save();
  c.translate(cx, cy);
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineCap = "butt";
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * TAU / 3, ox = Math.cos(a) * r * 0.42, oy = Math.sin(a) * r * 0.42;
    c.lineWidth = r * 0.2;
    c.beginPath();
    c.arc(ox, oy, r * 0.44, a - 2.2, a + 2.2);
    c.stroke();
  }
  c.lineWidth = r * 0.13;
  c.beginPath();
  c.arc(0, 0, r * 0.3, 0, TAU);
  c.stroke();
  c.fillStyle = bg;
  c.beginPath();
  c.arc(0, 0, r * 0.13, 0, TAU);
  c.fill();
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * TAU / 3;
    c.save();
    c.rotate(a);
    c.fillRect(-r * 0.045, r * 0.12, r * 0.09, r * 0.5);
    c.restore();
  }
  c.restore();
}
function grimeOver(c, w, h, rnd, amt = 0.3) {
  c.save();
  c.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y0 = rnd() * h * 0.6, len = (0.2 + rnd() * 0.8) * h, ww = 2 + rnd() * 10, g2 = c.createLinearGradient(0, y0, 0, y0 + len);
    g2.addColorStop(0, `rgba(30,24,16,${0.25 * amt + rnd() * 0.3 * amt})`);
    g2.addColorStop(1, "rgba(30,24,16,0)");
    c.fillStyle = g2;
    c.fillRect(x, y0, ww, len);
  }
  for (let i = 0; i < 60; i++) {
    c.fillStyle = `rgba(20,16,12,${rnd() * 0.16 * amt})`;
    blob(c, rnd() * w, rnd() * h, 6 + rnd() * rnd() * 60, rnd, 0.4);
    c.fill();
  }
  c.restore();
}
var board = (c, w, h, bg, border, bw = 8) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  if (border) {
    c.strokeStyle = border;
    c.lineWidth = bw;
    c.strokeRect(bw * 1.2, bw * 1.2, w - bw * 2.4, h - bw * 2.4);
  }
};
var SANS = "Arial, Helvetica, sans-serif";
var COND = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
var SERIF = 'Georgia, "Times New Roman", serif';
var MONO = '"Courier New", monospace';
var IMP = 'Impact, "Arial Black", sans-serif';
function signAtlas() {
  const L = [], add = (name, w, h, draw) => L.push({ name, w, h, draw });
  add("quarantine", 640, 480, (c, w, h, r) => {
    board(c, w, h, "#e3b90e", "#14130f", 12);
    trefoil(c, 120, 150, 86, "#14130f", "#e3b90e");
    label(c, "QUARANTINE", 220, 44, 390, 96, { color: "#14130f", font: "900", family: IMP, track: 3 });
    label(c, "ZONE 9", 220, 148, 390, 70, { color: "#14130f", font: "900", family: IMP, track: 8 });
    c.fillStyle = "#14130f";
    c.fillRect(34, 252, w - 68, 96);
    label(c, "NO ENTRY BEYOND THIS POINT", 46, 266, w - 92, 66, { color: "#e3b90e", font: "900", family: COND });
    label(c, "INFECTED PERSONS WILL NOT BE ADMITTED", 40, 366, w - 80, 30, { color: "#14130f", family: COND });
    label(c, "CITY EMERGENCY AUTHORITY  \xB7  ORDER 44-B  \xB7  DETENTION WITHOUT NOTICE", 40, 408, w - 80, 22, { color: "#14130f", font: "normal", family: COND });
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.35, 9);
  });
  add("checkpoint", 640, 256, (c, w, h, r) => {
    board(c, w, h, "#16335e", "#e9e9e4", 6);
    label(c, "CHECKPOINT 9", 30, 30, w - 60, 96, { color: "#eeeeea", font: "900", family: IMP, track: 6 });
    c.fillStyle = "#eeeeea";
    c.fillRect(30, 138, w - 60, 5);
    label(c, "STOP  \xB7  ENGINE OFF  \xB7  HANDS VISIBLE", 30, 156, w - 60, 38, { color: "#eeeeea", family: COND });
    label(c, "WAIT FOR SCREENING", 30, 202, w - 60, 30, { color: "#f2c230", family: COND, track: 4 });
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 6);
  });
  add("checkback", 640, 256, (c, w, h, r) => {
    board(c, w, h, "#d9b21a", "#15140f", 6);
    c.fillStyle = "#15140f";
    c.fillRect(22, 22, w - 44, 70);
    label(c, "LEAVING ZONE 9", 30, 28, w - 60, 58, { color: "#d9b21a", font: "900", family: IMP, track: 5 });
    label(c, "DECONTAMINATION IS MANDATORY", 30, 104, w - 60, 50, { color: "#15140f", font: "900", family: COND });
    label(c, "NO RE-ENTRY  \xB7  KEEP MOVING  \xB7  DO NOT STOP FOR THE SICK", 30, 164, w - 60, 30, { color: "#15140f", family: COND });
    label(c, "CITY EMERGENCY AUTHORITY", 30, 206, w - 60, 24, { color: "#5a1410", family: COND, track: 6 });
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.35, 6);
  });
  add("stop", 256, 256, (c, w, h, r) => {
    c.save();
    c.translate(w / 2, h / 2);
    for (const [rad, col] of [[124, "#e8e6df"], [112, "#a51a14"]]) {
      c.fillStyle = col;
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i + 0.5) * TAU / 8;
        c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
    }
    c.restore();
    label(c, "STOP", 28, 78, w - 56, 100, { color: "#e8e6df", font: "900", family: SANS });
    grimeOver(c, w, h, r, 0.3);
    wear(c, w, h, r, 0.25, 4);
  });
  for (const [n, a, b] of [["lane1", "LANE 1", "RESIDENTS \xB7 ID READY"], ["lane2", "LANE 2", "AUTHORISED VEHICLES"]]) add(n, 320, 128, (c, w, h, r) => {
    board(c, w, h, "#e6e4dc", "#151515", 4);
    label(c, a, 14, 12, 180, 64, { color: "#151515", font: "900", family: IMP, align: "left" });
    c.fillStyle = "#151515";
    c.beginPath();
    c.moveTo(w - 100, 26);
    c.lineTo(w - 40, 26);
    c.lineTo(w - 40, 12);
    c.lineTo(w - 14, 44);
    c.lineTo(w - 40, 76);
    c.lineTo(w - 40, 62);
    c.lineTo(w - 100, 62);
    c.closePath();
    c.fill();
    label(c, b, 14, 84, w - 28, 28, { color: "#151515", family: COND, align: "left" });
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 4);
  });
  add("curfew", 384, 288, (c, w, h, r) => {
    board(c, w, h, "#e9e7df", null);
    c.fillStyle = "#a2190f";
    c.fillRect(0, 0, w, 86);
    label(c, "CURFEW", 16, 10, w - 32, 68, { color: "#f0eee6", font: "900", family: IMP, track: 8 });
    label(c, "18:00 \u2013 06:00", 16, 98, w - 32, 70, { color: "#161616", font: "900", family: SANS });
    label(c, "ALL PERSONS MUST BE INDOORS", 20, 180, w - 40, 28, { color: "#161616", family: COND });
    label(c, "LETHAL FORCE AUTHORISED", 20, 216, w - 40, 30, { color: "#a2190f", family: COND, font: "900" });
    label(c, "CEA ORDER 51", 20, 254, w - 40, 18, { color: "#161616", font: "normal", family: MONO });
    grimeOver(c, w, h, r, 0.45);
    wear(c, w, h, r, 0.4, 7);
  });
  add("decon", 512, 128, (c, w, h, r) => {
    board(c, w, h, "#1b6b3c", "#e8efe6", 5);
    label(c, "DECONTAMINATION", 22, 26, 360, 76, { color: "#eef3ec", font: "900", family: COND, align: "left" });
    c.fillStyle = "#eef3ec";
    c.beginPath();
    c.moveTo(396, 50);
    c.lineTo(444, 50);
    c.lineTo(444, 30);
    c.lineTo(492, 64);
    c.lineTo(444, 98);
    c.lineTo(444, 78);
    c.lineTo(396, 78);
    c.closePath();
    c.fill();
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 5);
  });
  add("triage", 256, 256, (c, w, h, r) => {
    board(c, w, h, "#e9e9e2", "#1b6b3c", 8);
    c.fillStyle = "#1b6b3c";
    c.fillRect(104, 34, 48, 136);
    c.fillRect(60, 78, 136, 48);
    label(c, "TRIAGE", 24, 184, w - 48, 50, { color: "#1b6b3c", font: "900", family: IMP, track: 6 });
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 4);
  });
  add("roadclosed", 512, 128, (c, w, h, r) => {
    stripes(c, w, h, "#e9e7df", "#d9641a", 36);
    c.fillStyle = "#e9e7df";
    c.fillRect(70, 14, w - 140, h - 28);
    label(c, "ROAD CLOSED", 84, 24, w - 168, 80, { color: "#151515", font: "900", family: IMP, track: 4 });
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.4, 6);
  });
  add("detour", 320, 128, (c, w, h, r) => {
    board(c, w, h, "#d9641a", "#151515", 5);
    label(c, "DETOUR", 16, 20, 170, 86, { color: "#151515", font: "900", family: IMP, align: "left" });
    c.fillStyle = "#151515";
    c.beginPath();
    c.moveTo(206, 50);
    c.lineTo(254, 50);
    c.lineTo(254, 28);
    c.lineTo(304, 64);
    c.lineTo(254, 100);
    c.lineTo(254, 78);
    c.lineTo(206, 78);
    c.closePath();
    c.fill();
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.4, 5);
  });
  add("noentry", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#e8e6df";
    c.beginPath();
    c.arc(128, 128, 124, 0, TAU);
    c.fill();
    c.fillStyle = "#a51a14";
    c.beginPath();
    c.arc(128, 128, 112, 0, TAU);
    c.fill();
    c.fillStyle = "#e8e6df";
    c.fillRect(44, 106, 168, 44);
    grimeOver(c, w, h, r, 0.3);
    wear(c, w, h, r, 0.3, 4);
  });
  add("keepright", 256, 256, (c, w, h, r) => {
    c.fillStyle = "#e8e6df";
    c.beginPath();
    c.arc(128, 128, 124, 0, TAU);
    c.fill();
    c.fillStyle = "#1c4c9c";
    c.beginPath();
    c.arc(128, 128, 114, 0, TAU);
    c.fill();
    c.strokeStyle = "#e8e6df";
    c.lineWidth = 26;
    c.lineCap = "butt";
    c.beginPath();
    c.moveTo(78, 78);
    c.lineTo(170, 170);
    c.stroke();
    c.fillStyle = "#e8e6df";
    c.beginPath();
    c.moveTo(196, 196);
    c.lineTo(196, 126);
    c.lineTo(126, 196);
    c.closePath();
    c.fill();
    grimeOver(c, w, h, r, 0.3);
    wear(c, w, h, r, 0.3, 4);
  });
  const fascia = (name, bg, fg, text, sub2, fam, deco) => add(name, 768, 128, (c, w, h, r) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    if (deco) deco(c, w, h, r);
    label(c, text, 110, sub2 ? 14 : 24, w - 220, sub2 ? 70 : 80, { color: fg, font: "900", family: fam, track: 3, shadow: "rgba(0,0,0,0.35)" });
    if (sub2) label(c, sub2, 110, 90, w - 220, 24, { color: fg, family: COND, track: 4 });
    grimeOver(c, w, h, r, 0.6);
    wear(c, w, h, r, 0.3, 8);
  });
  fascia("shopPharm", "#e6ece6", "#17683a", "ALDER ST PHARMACY", "PRESCRIPTIONS  \xB7  OPEN 24 HRS", SANS, (c, w, h) => {
    c.fillStyle = "#17683a";
    for (const x of [36, w - 84]) {
      c.fillRect(x + 16, 30, 16, 68);
      c.fillRect(x - 10, 56, 68, 16);
    }
    c.fillRect(0, h - 10, w, 10);
  });
  fascia("shopNoodle", "#8f1c14", "#f2d77a", "LUCKY BOWL NOODLE", "HAND PULLED  \xB7  TAKE AWAY", SERIF, (c, w, h) => {
    c.strokeStyle = "#f2d77a";
    c.lineWidth = 4;
    c.strokeRect(10, 10, w - 20, h - 20);
    for (const x of [54, w - 54]) {
      c.beginPath();
      c.arc(x, 64, 30, 0, TAU);
      c.stroke();
      c.beginPath();
      c.arc(x, 64, 18, Math.PI, TAU);
      c.stroke();
    }
  });
  fascia("shopLaundry", "#2f6f95", "#f0f4f5", "WASH 'N' FOLD", "COIN LAUNDRY  \xB7  DRY CLEANING", SANS, (c, w, h) => {
    c.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.arc(30 + i * 90, 110 + i % 2 * 14, 40 + i % 3 * 12, 0, TAU);
      c.fill();
    }
  });
  fascia("shopPawn", "#141414", "#e7b416", "24HR CASH & PAWN", "GOLD  \xB7  TOOLS  \xB7  ELECTRONICS", IMP, (c, w, h) => {
    c.fillStyle = "#e7b416";
    c.fillRect(0, 0, w, 8);
    c.fillRect(0, h - 8, w, 8);
    for (const x of [40, w - 76]) for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(x + [0, 36, 18][i], [50, 50, 82][i], 15, 0, TAU);
      c.fill();
    }
  });
  fascia("shopHardware", "#d8d2c0", "#2a2a26", "KOWALSKI HARDWARE", "EST. 1961", SERIF, (c, w, h) => {
    c.fillStyle = "#7d2019";
    c.fillRect(0, 0, w, 12);
    c.fillRect(0, h - 12, w, 12);
  });
  fascia("shopDeli", "#1c4a2e", "#f1e9cf", "CORNER DELI & GROCERY", "COFFEE  \xB7  SANDWICHES  \xB7  LOTTO", SERIF, (c, w, h) => {
    c.fillStyle = "#a3261c";
    for (let x = 0; x < w; x += 48) c.fillRect(x, h - 14, 24, 14);
  });
  fascia("shopBarber", "#e9e4d6", "#1c2d5e", "TONY'S BARBER SHOP", null, SERIF, (c, w, h) => {
    for (const x of [18, w - 62]) {
      c.save();
      c.beginPath();
      c.rect(x, 16, 44, 96);
      c.clip();
      stripes(c, w, h, "#e9e4d6", "#a3261c", 14);
      c.fillStyle = "rgba(28,45,94,0.55)";
      for (let i = -4; i < 30; i++) if (i % 3 === 0) {
        c.beginPath();
        c.moveTo(i * 14 + 0, h);
        c.lineTo(i * 14 + 7, h);
        c.lineTo(i * 14 + 7 + h, 0);
        c.lineTo(i * 14 + h, 0);
        c.fill();
      }
      c.restore();
    }
  });
  fascia("shopVacant", "#b9b5a8", "#6a665c", "FOR LEASE", "RETAIL UNIT  \xB7  CALL 555 0142", COND, null);
  const poster = (name, draw) => add(name, 192, 256, (c, w, h, r) => {
    draw(c, w, h, r);
    c.fillStyle = "rgba(80,60,30,0.18)";
    c.fillRect(0, 0, w, h);
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.9, 10);
    c.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 3; i++) {
      blob(c, r() < 0.5 ? r() * 30 : w - r() * 30, r() < 0.5 ? r() * 40 : h - r() * 40, 16 + r() * 34, r, 0.5, 9);
      c.fill();
    }
    c.globalCompositeOperation = "source-over";
  });
  const face = (c, x, y, s, col) => {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, y, s * 0.36, s * 0.46, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(x, y + s * 0.95, s * 0.72, s * 0.5, 0, Math.PI, TAU);
    c.fill();
  };
  poster("posterMissing", (c, w, h, r) => {
    c.fillStyle = "#e8e4d6";
    c.fillRect(0, 0, w, h);
    label(c, "MISSING", 10, 8, w - 20, 44, { color: "#a51a14", font: "900", family: IMP });
    c.fillStyle = "#9a968a";
    c.fillRect(36, 58, 120, 112);
    face(c, 96, 104, 62, "#55524a");
    label(c, "DANA REYES, 34", 10, 176, w - 20, 20, { color: "#1a1a1a" });
    label(c, "LAST SEEN ALDER ST", 10, 200, w - 20, 16, { color: "#1a1a1a", font: "normal" });
    label(c, "CALL 555 0199", 10, 222, w - 20, 22, { color: "#1a1a1a", family: MONO });
  });
  poster("posterMissing2", (c, w, h, r) => {
    c.fillStyle = "#dfe3dd";
    c.fillRect(0, 0, w, h);
    label(c, "HAVE YOU SEEN", 10, 8, w - 20, 26, { color: "#1a1a1a", font: "900" });
    label(c, "OUR SON?", 10, 34, w - 20, 30, { color: "#1a1a1a", font: "900" });
    c.fillStyle = "#8f938b";
    c.fillRect(30, 70, 132, 110);
    face(c, 96, 112, 56, "#4c4f48");
    label(c, "MARCUS \xB7 19 \xB7 GREY HOODIE", 10, 188, w - 20, 16, { color: "#1a1a1a" });
    for (let i = 0; i < 6; i++) {
      c.fillStyle = "#1a1a1a";
      c.fillRect(8 + i * 30, 214, 1, 40);
      label(c, "555 0117", 10 + i * 30, 222, 26, 8, { color: "#1a1a1a", font: "normal" });
    }
  });
  poster("posterEvac", (c, w, h, r) => {
    c.fillStyle = "#e6c21a";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#151515";
    c.fillRect(0, 0, w, 54);
    label(c, "EVACUATION", 8, 6, w - 16, 28, { color: "#e6c21a", font: "900", family: IMP });
    label(c, "ORDER", 8, 30, w - 16, 20, { color: "#e6c21a", font: "900", family: IMP, track: 8 });
    const lines = ["SECTORS 7 \xB7 8 \xB7 9", "ASSEMBLE AT ALDER ST", "CHECKPOINT BY 17:00", "ONE BAG PER PERSON", "NO PETS", "DO NOT APPROACH", "THE SICK"];
    lines.forEach((t, i) => label(c, t, 12, 64 + i * 24, w - 24, i < 3 ? 20 : 17, { color: "#151515", font: i < 3 ? "900" : "bold", family: COND }));
    label(c, "CEA NOTICE 12", 12, 236, w - 24, 12, { color: "#151515", font: "normal", family: MONO });
  });
  poster("posterSymptoms", (c, w, h, r) => {
    c.fillStyle = "#eceae2";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#a51a14";
    c.fillRect(0, 0, w, 40);
    label(c, "KNOW THE SIGNS", 8, 6, w - 16, 28, { color: "#f1efe7", font: "900", family: COND });
    ["FEVER ABOVE 40\xB0", "GREY SKIN", "BLEEDING GUMS", "CONFUSION", "AGGRESSION"].forEach((t, i) => {
      c.fillStyle = "#a51a14";
      c.fillRect(14, 54 + i * 30, 14, 14);
      label(c, t, 38, 50 + i * 30, w - 50, 20, { color: "#1a1a1a", align: "left", family: COND });
    });
    label(c, "REPORT. ISOLATE.", 8, 206, w - 16, 20, { color: "#1a1a1a", font: "900" });
    label(c, "DO NOT TOUCH.", 8, 228, w - 16, 20, { color: "#a51a14", font: "900" });
  });
  poster("posterGig", (c, w, h, r) => {
    const g2 = c.createLinearGradient(0, 0, w, h);
    g2.addColorStop(0, "#2b1a4a");
    g2.addColorStop(1, "#a3261c");
    c.fillStyle = g2;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(255,220,120,0.5)";
    for (let i = 0; i < 14; i++) {
      c.lineWidth = 1 + r() * 3;
      c.beginPath();
      c.arc(96, 150, 20 + i * 11, 0, TAU);
      c.stroke();
    }
    label(c, "THE", 10, 16, w - 20, 24, { color: "#f2d77a", family: SERIF });
    label(c, "NIGHT", 10, 40, w - 20, 50, { color: "#f2d77a", font: "900", family: IMP });
    label(c, "TRAINS", 10, 88, w - 20, 50, { color: "#f2d77a", font: "900", family: IMP });
    label(c, "SAT 14 \xB7 THE VAULT \xB7 9PM", 10, 226, w - 20, 16, { color: "#f2d77a", family: COND });
  });
  poster("posterShelter", (c, w, h, r) => {
    c.fillStyle = "#e4e8ec";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#16335e";
    c.fillRect(0, 0, w, 64);
    label(c, "SAFE SHELTER", 8, 8, w - 16, 26, { color: "#eef1f4", font: "900", family: COND });
    label(c, "ST. BRIDE SCHOOL", 8, 36, w - 16, 20, { color: "#eef1f4", family: COND });
    c.strokeStyle = "#16335e";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(30, 200);
    c.lineTo(30, 110);
    c.lineTo(110, 110);
    c.lineTo(110, 150);
    c.lineTo(160, 150);
    c.stroke();
    c.fillStyle = "#a51a14";
    c.beginPath();
    c.arc(160, 150, 9, 0, TAU);
    c.fill();
    label(c, "YOU ARE HERE", 14, 206, 90, 12, { color: "#16335e" });
    label(c, "FOOD \xB7 WATER \xB7 BEDS", 8, 228, w - 16, 16, { color: "#16335e", font: "900", family: COND });
    c.strokeStyle = "#a51a14";
    c.lineWidth = 9;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(16, 80);
    c.lineTo(w - 16, 200);
    c.moveTo(w - 16, 80);
    c.lineTo(16, 200);
    c.stroke();
    label(c, "OVERRUN", 20, 120, w - 40, 36, { color: "#a51a14", font: "900", family: IMP });
  });
  add("notice", 256, 160, (c, w, h, r) => {
    c.fillStyle = "#ecebe4";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#a51a14";
    c.fillRect(0, 0, w, 36);
    label(c, "CLOSED BY ORDER", 8, 6, w - 16, 24, { color: "#f3f1ea", font: "900", family: COND });
    label(c, "THESE PREMISES ARE SEALED", 10, 46, w - 20, 20, { color: "#1a1a1a", family: COND });
    label(c, "UNDER EMERGENCY ORDER 44-B.", 10, 68, w - 20, 18, { color: "#1a1a1a", font: "normal", family: COND });
    label(c, "ENTRY IS AN OFFENCE.", 10, 90, w - 20, 18, { color: "#1a1a1a", font: "normal", family: COND });
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(20, 136);
    c.bezierCurveTo(60, 110, 80, 150, 120, 126);
    c.stroke();
    label(c, "CEA 09/11", 150, 122, 90, 18, { color: "#1a1a1a", family: MONO });
    wear(c, w, h, r, 0.5, 5);
  });
  add("hazstripe", 512, 64, (c, w, h, r) => {
    stripes(c, w, h, "#e3b90e", "#14130f", 32);
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.6, 8);
  });
  add("chevron", 512, 64, (c, w, h, r) => {
    c.fillStyle = "#e9e7df";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#b3201a";
    for (let x = -40; x < w; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 32, 0);
      c.lineTo(x + 64, h / 2);
      c.lineTo(x + 32, h);
      c.lineTo(x, h);
      c.lineTo(x + 32, h / 2);
      c.closePath();
      c.fill();
    }
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.5, 8);
  });
  add("tape", 512, 48, (c, w, h, r) => {
    c.fillStyle = "#e3b90e";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) label(c, "CORDON  \xB7  DO NOT CROSS", i * 256 + 8, 8, 240, 32, { color: "#14130f", font: "900", family: COND, track: 2 });
    wear(c, w, h, r, 0.3, 4);
  });
  add("reflector", 256, 64, (c, w, h, r) => {
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? "#e9e7df" : "#b3201a";
      c.fillRect(i * 64, 0, 64, h);
    }
    c.strokeStyle = "rgba(0,0,0,0.18)";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 6) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 6, h);
      c.stroke();
      c.beginPath();
      c.moveTo(x + 6, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    wear(c, w, h, r, 0.2, 3);
  });
  const spray = (c, pts, col, lw, r) => {
    c.strokeStyle = col;
    c.lineCap = "round";
    c.lineJoin = "round";
    for (const [k, a] of [[2.4, 0.12], [1.5, 0.3], [1, 0.95]]) {
      c.globalAlpha = a;
      c.lineWidth = lw * k;
      c.beginPath();
      pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.stroke();
    }
    c.globalAlpha = 0.9;
    c.lineWidth = lw * 0.3;
    for (const p of pts) if (r() < 0.35) {
      c.beginPath();
      c.moveTo(p[0], p[1]);
      c.lineTo(p[0] + (r() - 0.5) * 3, p[1] + 20 + r() * 60);
      c.stroke();
    }
    c.globalAlpha = 1;
  };
  const sprayText = (c, t, x, y, w, h, col, r, fam = '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive') => {
    for (const [bl, a] of [[6, 0.35], [0, 1]]) {
      c.save();
      c.filter = bl ? `blur(${bl}px)` : "none";
      c.globalAlpha = a;
      label(c, t, x, y, w, h, { color: col, font: "bold", family: fam });
      c.restore();
    }
  };
  add("grafSearch", 256, 256, (c, w, h, r) => {
    spray(c, [[30, 30], [226, 226]], "#d9641a", 9, r);
    spray(c, [[226, 30], [30, 226]], "#d9641a", 9, r);
    sprayText(c, "11\xB709", 86, 14, 84, 40, "#d9641a", r);
    sprayText(c, "CEA-4", 6, 108, 78, 38, "#d9641a", r);
    sprayText(c, "3 DEAD", 168, 108, 84, 34, "#d9641a", r);
    sprayText(c, "NE", 100, 204, 56, 40, "#d9641a", r);
    wear(c, w, h, r, 0.5, 0);
  });
  add("grafNoCure", 512, 256, (c, w, h, r) => {
    sprayText(c, "THERE IS NO", 16, 18, w - 32, 96, "#e8e6df", r);
    sprayText(c, "CURE", 80, 112, w - 160, 130, "#b3201a", r, IMP);
    spray(c, [[60, 236], [450, 228]], "#b3201a", 6, r);
    wear(c, w, h, r, 0.6, 0);
  });
  add("grafArrow", 512, 256, (c, w, h, r) => {
    sprayText(c, "SAFE ZONE", 20, 14, 330, 90, "#e8e6df", r);
    spray(c, [[360, 60], [480, 60]], "#e8e6df", 10, r);
    spray(c, [[440, 24], [484, 60], [440, 96]], "#e8e6df", 10, r);
    spray(c, [[14, 30], [500, 96]], "#111", 12, r);
    sprayText(c, "LIES", 150, 104, 220, 140, "#111", r, IMP);
    wear(c, w, h, r, 0.6, 0);
  });
  add("grafTag", 384, 192, (c, w, h, r) => {
    const col = "#5fb3c9";
    let x = 26;
    for (let i = 0; i < 5; i++) {
      const pts = [];
      for (let k = 0; k < 6; k++) pts.push([x + r() * 56, 26 + r() * 130]);
      spray(c, pts, col, 7, r);
      x += 64;
    }
    spray(c, [[20, 170], [360, 150]], col, 5, r);
    wear(c, w, h, r, 0.7, 0);
  });
  for (const [n, t, bg, fg] of [["plate1", "KRV 4471", "#e9e7df", "#16335e"], ["plate2", "7TQ 802", "#e8d46a", "#151515"], ["plate3", "CEA 0091", "#e9e7df", "#a51a14"]]) add(n, 256, 64, (c, w, h, r) => {
    board(c, w, h, bg, fg, 3);
    label(c, t, 12, 8, w - 24, 48, { color: fg, font: "900", family: MONO, track: 4 });
    grimeOver(c, w, h, r, 0.7);
    wear(c, w, h, r, 0.3, 3);
  });
  add("ems", 512, 128, (c, w, h, r) => {
    c.fillStyle = "#e8ecee";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#c2551a";
    c.fillRect(0, 0, w, 16);
    c.fillRect(0, h - 16, w, 16);
    c.save();
    c.translate(60, 64);
    c.fillStyle = "#1c4c9c";
    for (let i = 0; i < 3; i++) {
      c.rotate(TAU / 6);
      c.fillRect(-9, -36, 18, 72);
    }
    c.restore();
    label(c, "AMBULANCE", 116, 28, w - 136, 72, { color: "#1c4c9c", font: "900", family: SANS, track: 6 });
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.25, 6);
  });
  add("police", 384, 96, (c, w, h, r) => {
    c.fillStyle = "#e8ecee";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
      c.fillStyle = (i + j) % 2 ? "#16335e" : "#e8ecee";
      c.fillRect(i * 24, h - 28 + j * 14, 24, 14);
    }
    label(c, "POLICE", 16, 6, w - 32, 60, { color: "#16335e", font: "900", family: SANS, track: 10 });
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.25, 5);
  });
  add("transit", 512, 96, (c, w, h, r) => {
    c.fillStyle = "#d9dcd8";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#1b7a6a";
    c.fillRect(0, 34, w, 30);
    label(c, "CITY TRANSIT", 12, 2, 250, 30, { color: "#1b7a6a", font: "900", family: SANS, align: "left" });
    label(c, "4127", w - 120, 2, 108, 30, { color: "#2a2a2a", font: "900", family: MONO });
    label(c, "ROUTE 9 \xB7 ALDER ST \u2014 RIVERSIDE", 12, 68, w - 24, 22, { color: "#2a2a2a", family: COND, align: "left" });
    grimeOver(c, w, h, r, 0.7);
    wear(c, w, h, r, 0.3, 6);
  });
  add("boothId", 256, 96, (c, w, h, r) => {
    board(c, w, h, "#e9e7df", "#151515", 3);
    label(c, "POST 9-A", 10, 8, w - 20, 50, { color: "#151515", font: "900", family: IMP, track: 4 });
    label(c, "SHOW ID AT WINDOW", 10, 62, w - 20, 22, { color: "#151515", family: COND });
    grimeOver(c, w, h, r, 0.4);
    wear(c, w, h, r, 0.3, 3);
  });
  add("openclosed", 192, 96, (c, w, h, r) => {
    board(c, w, h, "#a51a14", "#eeeae0", 4);
    label(c, "CLOSED", 10, 18, w - 20, 60, { color: "#eeeae0", font: "900", family: SANS });
    wear(c, w, h, r, 0.3, 3);
  });
  add("genLabel", 256, 128, (c, w, h, r) => {
    board(c, w, h, "#e3b90e", "#14130f", 4);
    label(c, "VOLTA 20 kVA", 10, 10, w - 20, 40, { color: "#14130f", font: "900", family: SANS });
    label(c, "DANGER \xB7 LIVE TERMINALS", 10, 56, w - 20, 24, { color: "#14130f", family: COND });
    label(c, "DIESEL ONLY  \xB7  UNIT 07", 10, 88, w - 20, 22, { color: "#14130f", font: "normal", family: MONO });
    grimeOver(c, w, h, r, 0.5);
    wear(c, w, h, r, 0.5, 5);
  });
  add("crate", 256, 128, (c, w, h, r) => {
    label(c, "CEA RELIEF", 8, 6, w - 16, 44, { color: "#16335e", font: "900", family: IMP, track: 3 });
    label(c, "RATIONS \xB7 48 UNITS", 8, 56, w - 16, 26, { color: "#16335e", family: COND });
    label(c, "LOT 0911-K   KEEP DRY", 8, 90, w - 16, 22, { color: "#16335e", font: "normal", family: MONO });
    c.globalCompositeOperation = "destination-out";
    for (let i = 1; i < 7; i++) c.fillRect(i * w / 7 - 2, 0, 3, 54);
    c.globalCompositeOperation = "source-over";
    wear(c, w, h, r, 0.8, 6);
  });
  add("medkit", 256, 128, (c, w, h, r) => {
    c.fillStyle = "#e9e9e2";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#17683a";
    c.fillRect(22, 44, 84, 28);
    c.fillRect(50, 16, 28, 84);
    label(c, "TRAUMA KIT", 118, 22, 128, 34, { color: "#17683a", font: "900", family: COND });
    label(c, "CEA MEDICAL", 118, 62, 128, 24, { color: "#17683a", family: COND });
    label(c, "TYPE II", 118, 90, 128, 20, { color: "#17683a", font: "normal", family: MONO });
    wear(c, w, h, r, 0.3, 4);
  });
  add("ammo", 256, 128, (c, w, h, r) => {
    label(c, "7.62 \xD7 39", 8, 8, w - 16, 48, { color: "#d8c66a", font: "900", family: IMP, track: 3 });
    label(c, "640 RDS  \xB7  BALL", 8, 62, w - 16, 26, { color: "#d8c66a", family: COND });
    label(c, "LOT C9-22-114", 8, 94, w - 16, 22, { color: "#d8c66a", font: "normal", family: MONO });
    c.globalCompositeOperation = "destination-out";
    for (let i = 1; i < 6; i++) c.fillRect(i * w / 6 - 2, 0, 3, 58);
    c.globalCompositeOperation = "source-over";
    wear(c, w, h, r, 0.7, 6);
  });
  const P3 = pack(2048, L);
  const AH = P3.height <= 2048 ? 2048 : Math.ceil(P3.height / 128) * 128;
  if (AH > 4096) console.error("[decals] sign atlas overflow: " + P3.height);
  const A = atlas(2048, AH, P3.entries, 23);
  A.usedHeight = P3.height;
  A.names = L.map((e) => e.name);
  A.aspect = (n) => {
    const e = P3.entries[n];
    if (!e) throw new Error('sign atlas has no "' + n + '"');
    return e[2] / e[3];
  };
  return A;
}
function markAtlas() {
  const L = [], add = (name, w, h, draw) => L.push({ name, w, h, draw });
  const bloodCol = (r, a) => `rgba(${Math.round(58 + r() * 40)},${Math.round(4 + r() * 6)},${Math.round(4 + r() * 5)},${a})`;
  for (let i = 0; i < 4; i++) add("splat" + i, 256, 256, (c, w, h, r) => {
    const cx = w / 2 + (r() - 0.5) * 30, cy = h / 2 + (r() - 0.5) * 30, dir = r() * TAU;
    for (let k = 0; k < 5; k++) {
      c.fillStyle = bloodCol(r, 0.85);
      blob(c, cx + (r() - 0.5) * 40, cy + (r() - 0.5) * 40, 16 + r() * 34, r, 0.45, 13);
      c.fill();
    }
    for (let k = 0; k < 70; k++) {
      const a = dir + (r() - 0.5) * (i % 2 ? 1.4 : 5), d = 30 + Math.pow(r(), 0.7) * 92, s = Math.max(0.8, 7 * (1 - d / 125) * r() + 1);
      c.fillStyle = bloodCol(r, 0.6 + r() * 0.35);
      c.save();
      c.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      c.rotate(a);
      c.beginPath();
      c.ellipse(0, 0, s * (1.5 + r() * 3), s, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    c.globalCompositeOperation = "source-atop";
    for (let k = 0; k < 6; k++) {
      c.fillStyle = "rgba(20,2,2,0.3)";
      blob(c, cx + (r() - 0.5) * 60, cy + (r() - 0.5) * 60, 10 + r() * 20, r, 0.5);
      c.fill();
    }
    c.globalCompositeOperation = "source-over";
  });
  for (let i = 0; i < 2; i++) add("pool" + i, 256, 256, (c, w, h, r) => {
    const g2 = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 118);
    g2.addColorStop(0, "rgba(46,3,3,0.95)");
    g2.addColorStop(0.75, "rgba(60,5,4,0.92)");
    g2.addColorStop(1, "rgba(34,3,3,0.9)");
    c.fillStyle = g2;
    blob(c, w / 2, h / 2, 96, r, 0.16, 26);
    c.fill();
    for (let k = 0; k < 5; k++) {
      blob(c, w / 2 + (r() - 0.5) * 120, h / 2 + (r() - 0.5) * 120, 20 + r() * 34, r, 0.25, 14);
      c.fill();
    }
    c.strokeStyle = "rgba(16,1,1,0.55)";
    c.lineWidth = 3;
    blob(c, w / 2, h / 2, 92, r, 0.1, 26);
    c.stroke();
  });
  add("smear", 384, 128, (c, w, h, r) => {
    for (let k = 0; k < 26; k++) {
      const y = 20 + r() * 88, x0 = 10 + r() * 60, len = 120 + r() * 240, g2 = c.createLinearGradient(x0, 0, x0 + len, 0);
      g2.addColorStop(0, bloodCol(r, 0.8));
      g2.addColorStop(1, "rgba(50,4,4,0)");
      c.strokeStyle = g2;
      c.lineWidth = 1 + r() * 9;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x0, y);
      c.bezierCurveTo(x0 + len * 0.3, y + (r() - 0.5) * 16, x0 + len * 0.6, y + (r() - 0.5) * 16, x0 + len, y + (r() - 0.5) * 20);
      c.stroke();
    }
    c.fillStyle = bloodCol(r, 0.9);
    blob(c, 44, 64, 34, r, 0.4);
    c.fill();
  });
  add("hand", 128, 128, (c, w, h, r) => {
    c.fillStyle = bloodCol(r, 0.85);
    c.beginPath();
    c.ellipse(64, 84, 26, 30, 0, 0, TAU);
    c.fill();
    for (let i = 0; i < 4; i++) {
      c.save();
      c.translate(42 + i * 14, 58);
      c.rotate(-0.25 + i * 0.16);
      c.beginPath();
      c.ellipse(0, -22, 5.5, 22 + (i === 1 || i === 2 ? 5 : 0), 0, 0, TAU);
      c.fill();
      c.restore();
    }
    c.save();
    c.translate(92, 82);
    c.rotate(1);
    c.beginPath();
    c.ellipse(0, -14, 6, 16, 0, 0, TAU);
    c.fill();
    c.restore();
    for (let i = 0; i < 4; i++) {
      c.fillRect(46 + i * 13, 96, 3, 16 + r() * 16);
    }
    wear(c, w, h, r, 1.6, 0);
  });
  for (let i = 0; i < 2; i++) add("holeC" + i, 128, 128, (c, w, h, r) => {
    c.fillStyle = "rgba(150,146,138,0.85)";
    blob(c, 64, 64, 34 + r() * 10, r, 0.42, 12);
    c.fill();
    c.fillStyle = "rgba(96,93,88,0.9)";
    blob(c, 64, 64, 22, r, 0.4, 10);
    c.fill();
    c.fillStyle = "rgba(14,13,12,0.97)";
    blob(c, 64 + (r() - 0.5) * 6, 64 + (r() - 0.5) * 6, 9, r, 0.3, 9);
    c.fill();
    c.strokeStyle = "rgba(20,19,18,0.7)";
    c.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const a = r() * TAU;
      c.beginPath();
      c.moveTo(64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14);
      c.lineTo(64 + Math.cos(a + 0.2) * (36 + r() * 22), 64 + Math.sin(a + 0.2) * (36 + r() * 22));
      c.stroke();
    }
  });
  for (let i = 0; i < 2; i++) add("holeM" + i, 128, 128, (c, w, h, r) => {
    c.fillStyle = "rgba(40,36,32,0.55)";
    blob(c, 64, 64, 30, r, 0.3, 14);
    c.fill();
    const g2 = c.createRadialGradient(64, 64, 6, 64, 64, 22);
    g2.addColorStop(0, "rgba(190,190,195,0.95)");
    g2.addColorStop(1, "rgba(120,120,126,0.9)");
    c.fillStyle = g2;
    blob(c, 64, 64, 19, r, 0.22, 14);
    c.fill();
    c.fillStyle = "rgba(6,6,6,0.98)";
    c.beginPath();
    c.ellipse(64, 64, 8, 7, r() * 3, 0, TAU);
    c.fill();
    c.strokeStyle = "rgba(230,230,235,0.8)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(64, 64, 9.5, 3.4, 5.6);
    c.stroke();
  });
  add("holeG", 192, 192, (c, w, h, r) => {
    const hz = c.createRadialGradient(96, 96, 8, 96, 96, 62);
    hz.addColorStop(0, "rgba(225,235,240,0.34)");
    hz.addColorStop(1, "rgba(225,235,240,0)");
    c.fillStyle = hz;
    blob(c, 96, 96, 60, r, 0.3);
    c.fill();
    c.strokeStyle = "rgba(232,240,244,0.92)";
    c.lineCap = "round";
    for (let k = 0; k < 15; k++) {
      const a = k / 15 * TAU + r() * 0.3, l = 34 + r() * 58, a2 = a + (r() - 0.5) * 0.24;
      c.lineWidth = 1.5 + r() * 1.7;
      c.beginPath();
      c.moveTo(96 + Math.cos(a) * 7, 96 + Math.sin(a) * 7);
      c.lineTo(96 + Math.cos((a + a2) / 2 + (r() - 0.5) * 0.12) * l * 0.55, 96 + Math.sin((a + a2) / 2 + (r() - 0.5) * 0.12) * l * 0.55);
      c.lineTo(96 + Math.cos(a2) * l, 96 + Math.sin(a2) * l);
      c.stroke();
    }
    for (const rad of [17, 31, 49]) {
      c.lineWidth = rad < 20 ? 1.8 : 1.3;
      c.beginPath();
      for (let k = 0; k <= 15; k++) {
        const a = k / 15 * TAU, rr = rad * (0.85 + r() * 0.3);
        k ? c.lineTo(96 + Math.cos(a) * rr, 96 + Math.sin(a) * rr) : c.moveTo(96 + Math.cos(a) * rr, 96 + Math.sin(a) * rr);
      }
      c.stroke();
    }
    c.fillStyle = "rgba(238,243,247,0.78)";
    blob(c, 96, 96, 17, r, 0.3);
    c.fill();
    c.fillStyle = "rgba(4,5,6,0.95)";
    blob(c, 96, 96, 7, r, 0.3);
    c.fill();
  });
  add("oil", 256, 256, (c, w, h, r) => {
    for (let k = 0; k < 9; k++) {
      const g2 = c.createRadialGradient(128, 128, 4, 128, 128, 120);
      g2.addColorStop(0, "rgba(8,8,10,0.5)");
      g2.addColorStop(1, "rgba(8,8,10,0)");
      c.fillStyle = g2;
      blob(c, 128 + (r() - 0.5) * 70, 128 + (r() - 0.5) * 70, 40 + r() * 60, r, 0.3, 16);
      c.fill();
    }
    for (let k = 0; k < 30; k++) {
      c.fillStyle = "rgba(6,6,8,0.6)";
      c.beginPath();
      c.arc(r() * w, r() * h, 1 + r() * 5, 0, TAU);
      c.fill();
    }
  });
  add("scorch", 256, 256, (c, w, h, r) => {
    const g2 = c.createRadialGradient(128, 128, 6, 128, 128, 124);
    g2.addColorStop(0, "rgba(4,4,4,0.92)");
    g2.addColorStop(0.5, "rgba(12,10,9,0.7)");
    g2.addColorStop(1, "rgba(20,16,12,0)");
    c.fillStyle = g2;
    blob(c, 128, 128, 124, r, 0.12, 24);
    c.fill();
    for (let k = 0; k < 24; k++) {
      const a = r() * TAU;
      c.strokeStyle = "rgba(8,7,6,0.35)";
      c.lineWidth = 3 + r() * 9;
      c.beginPath();
      c.moveTo(128, 128);
      c.lineTo(128 + Math.cos(a) * (60 + r() * 60), 128 + Math.sin(a) * (60 + r() * 60));
      c.stroke();
    }
  });
  const run = (name, col) => add(name, 128, 384, (c, w, h, r) => {
    for (let k = 0; k < 16; k++) {
      const x = 14 + r() * 100, len = (0.3 + r() * 0.7) * h, ww = 3 + r() * 16, g2 = c.createLinearGradient(0, 0, 0, len);
      g2.addColorStop(0, col(0.75));
      g2.addColorStop(1, col(0));
      c.fillStyle = g2;
      c.beginPath();
      c.moveTo(x - ww / 2, 0);
      c.lineTo(x + ww / 2, 0);
      c.lineTo(x + ww * 0.15 + (r() - 0.5) * 8, len);
      c.lineTo(x - ww * 0.15 + (r() - 0.5) * 8, len);
      c.closePath();
      c.fill();
    }
  });
  run("rustRun", (a) => `rgba(112,54,20,${a})`);
  run("grimeRun", (a) => `rgba(18,16,13,${a * 0.8})`);
  run("leakRun", (a) => `rgba(52,62,40,${a * 0.7})`);
  add("tyre", 512, 96, (c, w, h, r) => {
    for (const y of [24, 68]) for (let k = 0; k < 9; k++) {
      const g2 = c.createLinearGradient(0, 0, w, 0);
      g2.addColorStop(0, "rgba(8,8,8,0)");
      g2.addColorStop(0.2, `rgba(8,8,8,${0.25 + r() * 0.3})`);
      g2.addColorStop(1, "rgba(8,8,8,0)");
      c.strokeStyle = g2;
      c.lineWidth = 1.5 + r() * 2.5;
      c.beginPath();
      c.moveTo(0, y + k * 2.4 - 10);
      c.bezierCurveTo(w * 0.3, y + k * 2.4 - 10 + r() * 6, w * 0.6, y + k * 2.4 - 16, w, y + k * 2.4 - 4);
      c.stroke();
    }
  });
  add("boot", 96, 192, (c, w, h, r) => {
    c.fillStyle = bloodCol(r, 0.7);
    c.beginPath();
    c.ellipse(48, 62, 26, 50, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(48, 152, 21, 28, 0, 0, TAU);
    c.fill();
    c.globalCompositeOperation = "destination-out";
    for (let y = 20; y < 180; y += 11) c.fillRect(0, y, w, 4);
    c.globalCompositeOperation = "source-over";
    wear(c, w, h, r, 1.5, 0);
  });
  add("crack", 256, 256, (c, w, h, r) => {
    c.strokeStyle = "rgba(10,10,10,0.8)";
    const walk = (x, y, a, l, wd) => {
      c.lineWidth = wd;
      c.beginPath();
      c.moveTo(x, y);
      for (let i = 0; i < l; i++) {
        a += (r() - 0.5) * 0.7;
        x += Math.cos(a) * 9;
        y += Math.sin(a) * 9;
        c.lineTo(x, y);
        if (r() < 0.12 && wd > 0.8) walk(x, y, a + (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.6), l * 0.5, wd * 0.6);
      }
      c.stroke();
    };
    for (let k = 0; k < 4; k++) walk(128, 128, r() * TAU, 13, 2.2);
  });
  add("dust", 128, 128, (c, w, h, r) => {
    const g2 = c.createRadialGradient(64, 64, 2, 64, 64, 62);
    g2.addColorStop(0, "rgba(200,196,186,0.5)");
    g2.addColorStop(1, "rgba(200,196,186,0)");
    c.fillStyle = g2;
    c.fillRect(0, 0, w, h);
  });
  const P3 = pack(1024, L);
  const A = atlas(1024, P3.height <= 1024 ? 1024 : 2048, P3.entries, 41);
  A.usedHeight = P3.height;
  A.names = L.map((e) => e.name);
  return A;
}
function windowAtlas(seed = 5) {
  const W = 1024, Hh = 512, cv = document.createElement("canvas");
  cv.width = W;
  cv.height = Hh;
  const c = cv.getContext("2d"), r = rng(seed), cw = W / 8, ch = Hh / 4;
  const kinds = [];
  c.fillStyle = "#000";
  c.fillRect(0, 0, W, Hh);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const x = i * cw, y = j * ch, kind = j === 0 ? "dark" : r() < 0.3 ? "dark" : ["curtain", "blind", "tv", "bare", "lamp", "board"][Math.floor(r() * 6)];
    kinds.push(kind);
    c.save();
    c.beginPath();
    c.rect(x, y, cw, ch);
    c.clip();
    c.translate(x, y);
    if (kind === "dark") {
      const g2 = c.createLinearGradient(0, 0, cw, ch);
      g2.addColorStop(0, "#05080b");
      g2.addColorStop(1, "#0b1016");
      c.fillStyle = g2;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = "rgba(120,140,160,0.06)";
      c.beginPath();
      c.moveTo(0, ch);
      c.lineTo(cw * 0.5, 0);
      c.lineTo(cw * 0.8, 0);
      c.lineTo(cw * 0.3, ch);
      c.fill();
    } else if (kind === "board") {
      c.fillStyle = "#2a2118";
      c.fillRect(0, 0, cw, ch);
      for (let k = 0; k < 5; k++) {
        c.fillStyle = `rgb(${50 + r() * 20},${38 + r() * 14},${24 + r() * 10})`;
        c.fillRect(0, k * ch / 5 + 2, cw, ch / 5 - 4);
      }
    } else {
      const warm = r() < 0.7, base = kind === "tv" ? [70, 110, 190] : warm ? [255, 170 + r() * 40, 70 + r() * 50] : [200, 220, 255], k = 0.5 + r() * 0.5;
      const g2 = c.createRadialGradient(cw * (0.3 + r() * 0.4), ch * (0.3 + r() * 0.3), 4, cw / 2, ch / 2, ch * 0.8);
      g2.addColorStop(0, `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`);
      g2.addColorStop(1, `rgb(${base[0] * k * 0.35},${base[1] * k * 0.3},${base[2] * k * 0.25})`);
      c.fillStyle = g2;
      c.fillRect(0, 0, cw, ch);
      if (kind === "curtain") {
        for (let k2 = 0; k2 < 14; k2++) {
          c.fillStyle = `rgba(60,20,10,${0.1 + r() * 0.25})`;
          c.fillRect(k2 * cw / 14, 0, cw / 28, ch);
        }
        c.fillStyle = "rgba(0,0,0,0.5)";
        c.fillRect(cw * 0.46, 0, cw * 0.08 * r(), ch);
      }
      if (kind === "blind") {
        for (let y2 = 2; y2 < ch * (0.5 + r() * 0.5); y2 += 6) {
          c.fillStyle = "rgba(20,14,8,0.6)";
          c.fillRect(0, y2, cw, 3);
        }
      }
      if (kind === "lamp") {
        const fx = cw * (0.3 + r() * 0.4), sd = fx < cw * 0.5 ? 1 : -1, gl = c.createRadialGradient(fx, ch * 0.44, 2, fx, ch * 0.5, ch * 0.42);
        gl.addColorStop(0, "rgba(255,236,190,0.85)");
        gl.addColorStop(0.35, "rgba(255,205,130,0.3)");
        gl.addColorStop(1, "rgba(255,190,110,0)");
        c.fillStyle = gl;
        c.fillRect(0, 0, cw, ch);
        c.fillStyle = "rgba(16,11,7,0.9)";
        c.fillRect(fx - 1, ch * 0.5, 2, ch * 0.5);
        c.fillStyle = "rgba(255,240,205,0.95)";
        c.beginPath();
        c.moveTo(fx - 7, ch * 0.38);
        c.lineTo(fx + 7, ch * 0.38);
        c.lineTo(fx + 12, ch * 0.5);
        c.lineTo(fx - 12, ch * 0.5);
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(22,15,10,0.82)";
        c.beginPath();
        c.roundRect(fx + sd * cw * 0.12 - (sd < 0 ? cw * 0.46 : 0), ch * 0.76, cw * 0.46, ch * 0.3, 7);
        c.fill();
        c.strokeStyle = "rgba(24,16,10,0.75)";
        c.lineWidth = 2.5;
        c.strokeRect(fx + sd * cw * 0.2 - (sd < 0 ? cw * 0.2 : 0), ch * 0.2, cw * 0.2, ch * 0.16);
      }
      if (kind === "bare") {
        c.fillStyle = "rgba(20,12,6,0.55)";
        c.fillRect(cw * 0.1, ch * 0.62, cw * 0.5, ch * 0.4);
        c.fillRect(cw * 0.7, ch * 0.3, cw * 0.2, ch * 0.7);
      }
    }
    c.fillStyle = "#060606";
    c.fillRect(cw / 2 - 2, 0, 4, ch);
    c.fillRect(0, ch * 0.5 - 2, cw, 4);
    c.lineWidth = 6;
    c.strokeStyle = "#080808";
    c.strokeRect(0, 0, cw, ch);
    c.restore();
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  return { tex, kinds, rect: (i) => {
    const cx = i % 8, cy = Math.floor(i / 8) % 4, p = 2 / W;
    return [cx / 8 + p, 1 - (cy + 1) / 4 + p, (cx + 1) / 8 - p, 1 - cy / 4 - p];
  } };
}

