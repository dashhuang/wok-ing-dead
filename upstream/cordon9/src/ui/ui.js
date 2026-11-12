var pct = (v) => Math.round(v * 100) + "%";
var SETTINGS = [
  { k: "sens", tab: "controls", label: "Look sensitivity", min: 0.3, max: 3, step: 0.1, def: 1, fmt: (v) => v.toFixed(1) },
  { k: "aim", tab: "controls", label: "Aim sensitivity", sub: "multiplier while on the sights", min: 0.4, max: 1.5, step: 0.05, def: 1, fmt: (v) => v.toFixed(2) + " x" },
  { k: "invert", tab: "controls", label: "Invert vertical look", type: "opt", options: ["Off", "On"], def: 0 },
  { k: "fov", tab: "video", label: "Field of view", min: 60, max: 95, step: 1, def: 74, fmt: (v) => Math.round(v) + "\xB0" },
  { k: "hud", tab: "video", label: "Interface scale", min: 0.8, max: 1.3, step: 0.05, def: 1, fmt: pct },
  { k: "cross", tab: "video", label: "Crosshair colour", type: "swatch", options: ["#eef2f4", "#f2a31b", "#55d48a", "#7fc4ff", "#ff4b38"], def: 0 },
  { k: "vol", tab: "audio", label: "Master volume", min: 0, max: 1, step: 0.05, def: 0.8, fmt: pct },
  { k: "sfx", tab: "audio", label: "Weapons and effects", min: 0, max: 1, step: 0.05, def: 1, fmt: pct },
  { k: "music", tab: "audio", label: "Music", min: 0, max: 1, step: 0.05, def: 0.55, fmt: pct },
  { k: "amb", tab: "audio", label: "Rain and street", min: 0, max: 1, step: 0.05, def: 0.7, fmt: pct },
  { k: "mini", tab: "hud", label: "Drone feed (minimap)", type: "opt", options: ["Off", "On"], def: 1 },
  { k: "miniRot", tab: "hud", label: "Feed orientation", type: "opt", options: ["North up", "View up"], def: 1 },
  { k: "miniR", tab: "hud", label: "Feed range", min: 18, max: 50, step: 2, def: 30, fmt: (v) => Math.round(v) + " m" }
];
var TABS = [["controls", "Controls", "mouse"], ["video", "Video", "eye"], ["audio", "Audio", "sound"], ["hud", "Interface", "grid"]];
var KEYS2 = [["Move", ["W", "A", "S", "D"]], ["Sprint", ["Shift"]], ["Jump", ["Space"]], ["Crouch \xB7 slide at a run", ["C"]], ["Fire", ["Mouse 1"]], ["Sights", ["Mouse 2"]], ["Reload", ["R"]], ["Weapons \xB7 swap", ["1", "2", "Q"]], ["UAV \xB7 killstreak", ["E"]], ["Rifle light", ["F"]], ["Mute", ["M"]], ["Frame stats", ["P"]], ["Pause", ["Esc"]]];
var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var btn = (act, label2, ic, o = {}) => `<button class="btn ${o.cls || ""}" data-act="${act}"${o.k ? ` data-k="${o.k}"` : ""}>${ic ? icon(ic) : ""}<span>${label2}</span>${o.kbd ? `<kbd>${o.kbd}</kbd>` : ""}</button>`;
function createHud(root, { quality = "medium", onQuality = null, onSetting = null, onSound = null, maps = null, map = null, onMap = null, title = "Cordon 9", place = "Halsey Street checkpoint \xB7 night \xB7 rain" } = {}) {
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);
  const words = title.toUpperCase().split(" "), logo = words.map((w, i) => strokeText(w, { weight: 0.86, gap: 1.5, cls: i && i === words.length - 1 ? "hl" : "" })).join("");
  const rowHtml = (s) => {
    const ctl = s.type === "opt" ? `<div class="opt" data-o="${s.k}">${s.options.map((o, i) => `<button data-v="${i}">${o}</button>`).join("")}</div>` : s.type === "swatch" ? `<div class="opt" data-o="${s.k}">${s.options.map((o, i) => `<button class="sw" data-v="${i}" style="--c:${o}" aria-label="Colour ${i + 1}"></button>`).join("")}</div>` : `<div class="sl"><button class="stp" data-s="${s.k}" data-d="-1" aria-label="Less">\u2212</button><input type="range" data-r="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" aria-label="${s.label}"><button class="stp" data-s="${s.k}" data-d="1" aria-label="More">+</button></div>`;
    return `<div class="row"><div class="n">${s.label}${s.sub ? `<small>${s.sub}</small>` : ""}</div>${ctl}<div class="v" data-sv="${s.k}"></div></div>`;
  };
  const pane = (tab) => SETTINGS.filter((s) => s.tab === tab).map(rowHtml).join("") + (tab === "video" ? `<div class="row"><div class="n">Render quality<small>changing it reloads the page</small></div><div class="opt" data-k="ql">${["low", "medium", "high", "ultra"].map((q) => `<button data-q="${q}"${q === quality ? ' class="on"' : ""}>${q}</button>`).join("")}</div><div class="v"></div></div>` : "");
  root.innerHTML = `
<div class="hud" data-k="hud">
 <div class="tl"><div class="mm" data-k="mm"><canvas data-k="mmc"></canvas></div><div class="uav" data-k="uav"><i></i>${icon("drone")}<b data-k="uavs">UAV</b><kbd data-k="uavk">E</kbd><span data-k="uavc"></span></div><div class="uavb" data-k="uavb"><u data-k="uavf"></u></div></div>
 <div class="tc"><canvas class="cmp" data-k="cmp"></canvas><div class="wv" data-k="wv"><span class="lab">Wave</span><span class="wv-n" data-k="wave"></span><div class="wv-bar"><i data-k="wvfill"></i></div><span class="wv-r" data-k="left"></span></div></div>
 <div class="tr"><div class="lab">Score</div><div class="sc" data-k="score"></div><div class="ch" data-k="ch"><span data-k="chx"></span><div class="ch-bar"><i data-k="chfill"></i></div></div><div class="log" data-k="log"></div></div>
 <div class="bl" data-k="bl"><div class="stn" data-k="stn"></div><div class="hp">${icon("health")}<span class="hp-n" data-k="hp"></span></div><div class="hp-bar"><i class="gh" data-k="hpgh"></i><i class="fl" data-k="hpfl"></i><b></b></div><div class="stam"><i data-k="stam"></i></div></div>
 <div class="br"><div class="wn"><span class="lamp" data-k="lamp">Light</span><span class="lab" data-k="wname"></span></div><div class="gunrow" data-k="gun"></div><div class="pips" data-k="pips"></div><div class="am"><span class="am-m" data-k="mode"></span><span class="am-n" data-k="mag"></span><span class="am-s">/</span><span class="am-r" data-k="res"></span></div></div>
 <div class="cross" data-k="cross"><b class="d"></b><b data-c="0"></b><b data-c="1"></b><b data-c="2"></b><b data-c="3"></b></div>
 <div class="rl" data-k="rl"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="17"/><circle class="fg" data-k="rlfg" cx="20" cy="20" r="17" stroke-dasharray="106.8" stroke-dashoffset="106.8"/></svg><span>Reloading</span></div>
 <div class="hm" data-k="hm"></div><div class="dir" data-k="dir"></div><div class="feed" data-k="feed"></div>
 <div class="banner" data-k="banner"><div class="t" data-k="bt"></div><div class="r"></div><div class="s" data-k="bs"></div></div>
 <div class="hint" data-k="hint"></div><div class="toast" data-k="toast"></div><div class="dbg" data-k="dbg"></div>
</div>
<div class="panel title on" data-k="menu"><div class="col">
 <div class="kick">City Emergency Authority \xB7 field terminal</div><div class="logo">${logo}</div><div class="strap" data-k="place">${esc(place)}</div>
 <div class="menu">${btn("deploy", "Deploy", "play", { cls: "pri", k: "go", kbd: "Enter" })}${btn("settings", "Settings", "gear")}</div>
 ${maps && maps.length > 1 ? `<div class="maps" data-k="maps">${maps.map((m) => `<button class="mapc${m.id === map ? " on" : ""}" data-map="${esc(m.id)}"><b>${esc(m.name)}</b><span>${esc(m.note || "")}</span></button>`).join("")}</div>` : ""}
 <div class="best"><span class="lab">Best score</span><span class="v" data-k="best"></span></div></div>
 <div class="pitch"><b>No asset files.</b> No models, no image textures, no audio samples. The street, the rifle, the dead, the drone, every sound and the music are generated in code while the page loads.</div>
 <div class="keys"><h3>Field manual</h3><ul>${KEYS2.map(([a, ks]) => `<li><span>${a}</span><span>${ks.map((k) => `<kbd>${k}</kbd>`).join("")}</span></li>`).join("")}</ul></div></div>
<div class="panel pausep" data-k="pause"><div class="col"><div class="kick">Mouse released</div><div class="logo" style="font-size:3.2em">${strokeText("PAUSED", { weight: 0.86, gap: 1.5 })}</div>
 <div class="menu">${btn("resume", "Resume", "play", { cls: "pri go", kbd: "Click" })}${btn("restart", "Restart run", "restart")}${btn("settings", "Settings", "gear")}${btn("title", "Quit to title", "home")}</div></div></div>
<div class="panel deadp" data-k="dead"><div class="rep"><div class="kick" style="color:var(--red)">After-action report</div><div class="big">${strokeText("OVERRUN", { weight: 0.9, gap: 1.5 })}</div><div class="sub" data-k="dsub"></div>
 <div class="stats" data-k="dtab"></div><div class="repf">${btn("redeploy", "Redeploy", "restart", { cls: "pri go", kbd: "R" })}${btn("title", "Title", "home")}</div></div></div>
<div class="panel setp" data-k="settings"><div class="card"><h2>${strokeText("SETTINGS", { weight: 0.8, gap: 1.4 })}</h2>
 <div class="tabs">${TABS.map(([id, name, ic], i) => `<button class="tab${i ? "" : " on"}" data-tab="${id}">${icon(ic)}${name}</button>`).join("")}</div>
 ${TABS.map(([id], i) => `<div class="pane${i ? "" : " on"}" data-pane="${id}">${pane(id)}</div>`).join("")}
 <div class="cardf"><div class="note">Settings are kept in this browser. Quality sets resolution, shadow and fog sample counts.</div>${btn("back", "Back", "back", { cls: "sm", kbd: "Esc" })}</div></div></div>`;
  const $ = {};
  root.querySelectorAll("[data-k]").forEach((e) => {
    $[e.dataset.k] = e;
  });
  const ticks = [...root.querySelectorAll("[data-c]")], last = {}, snd = (n) => {
    if (onSound) onSound(n);
  };
  const set = (k, v) => {
    if (last[k] !== v) {
      last[k] = v;
      $[k].textContent = v;
    }
  };
  const num = (k, v, o) => {
    if (last[k] !== v) {
      last[k] = v;
      $[k].innerHTML = strokeText(v, o);
    }
  };
  const tf = (k, el2, v) => {
    const s = v.toFixed(3);
    if (last[k] !== s) {
      last[k] = s;
      el2.style.transform = `scaleX(${s})`;
    }
  };
  const mini = createMinimap($.mmc), compass = createCompass($.cmp);
  let hmT = 0, dirT = 0, banT = 0, toastT = 0, hintOn = "", state = "menu", CFG = {}, hpGhost = 1, hpHold = 0, contacts = -1;
  const H2 = {
    el: $,
    onClick: null,
    get state() {
      return state;
    },
    get settingsOpen() {
      return $.settings.classList.contains("on");
    },
    show(s) {
      state = s;
      root.classList.toggle("play", s === "playing" || s === "dead");
      $.menu.classList.toggle("on", s === "menu");
      $.pause.classList.toggle("on", s === "paused");
      $.dead.classList.toggle("on", s === "dead");
      if (s === "playing" || s === "dead") $.settings.classList.remove("on");
      const f3 = s === "menu" ? $.go : s === "paused" ? $.pause.querySelector(".go") : s === "dead" ? $.dead.querySelector(".go") : null;
      if (f3 && document.activeElement !== f3) try {
        f3.focus({ preventScroll: true });
      } catch {
      }
      if (!f3 && document.activeElement && document.activeElement.blur && root.contains(document.activeElement)) document.activeElement.blur();
    },
    // s: { hp, stamina, mag, magMax, reserve, low, wname, weapon, mode, wave, left, waveK, inter, score, chain, chainK, spread (px), ads, crossOn, reloadK, stance, lamp, lampCan, hint, dbg, best }
    update(dt, s) {
      num("hp", String(Math.max(0, Math.ceil(s.hp))), { weight: 0.8 });
      const hk = Math.max(0, Math.min(1, s.hp / 100));
      tf("hpw", $.hpfl, hk);
      if (hk > hpGhost) hpGhost = hk;
      else if (hk < hpGhost) {
        if (last.hk !== hk) hpHold = 0.45;
        hpHold -= dt;
        if (hpHold <= 0) hpGhost = Math.max(hk, hpGhost - dt * 0.55);
      }
      last.hk = hk;
      tf("hpg", $.hpgh, hpGhost);
      const low = s.hp <= 30 ? 1 : 0;
      if (last.low !== low) {
        last.low = low;
        $.bl.classList.toggle("low", !!low);
      }
      tf("sw", $.stam, Math.max(0, Math.min(1, s.stamina)));
      const sn = s.stance || "stand";
      if (last.sn !== sn) {
        last.sn = sn;
        $.stn.innerHTML = icon(sn) + "<span>" + sn + "</span>";
        $.stn.classList.toggle("a", sn === "slide" || sn === "sprint");
      }
      set("wname", s.wname);
      set("mode", s.mode);
      num("mag", String(s.mag), { weight: 0.82 });
      num("res", s.reserve === Infinity ? "~" : String(s.reserve), { weight: 0.7 });
      const mc = s.mag === 0 ? "red" : s.low ? "amber" : "";
      if (last.mc !== mc) {
        last.mc = mc;
        $.mag.className = "am-n " + mc;
      }
      const wk = s.weapon || "rifle";
      if (last.wk !== wk) {
        last.wk = wk;
        $.gun.innerHTML = gunIcon(wk);
      }
      const mm = s.magMax || 30;
      if (last.mm !== mm) {
        last.mm = mm;
        last.pm = -1;
        $.pips.className = "pips p" + mm;
        $.pips.innerHTML = "<i></i>".repeat(mm);
      }
      if (last.pm !== s.mag) {
        last.pm = s.mag;
        const ch = $.pips.children;
        for (let i = 0; i < ch.length; i++) ch[i].className = i < mm - s.mag ? "o" : "";
      }
      const pl = s.low ? 1 : 0;
      if (last.pl !== pl) {
        last.pl = pl;
        $.pips.classList.toggle("low", !!pl);
      }
      const lp = s.lamp ? 2 : s.lampCan ? 1 : 0;
      if (last.lp !== lp) {
        last.lp = lp;
        $.lamp.classList.toggle("on", lp === 2);
        $.lamp.style.display = lp ? "" : "none";
      }
      num("wave", String(s.wave).padStart(2, "0"), { weight: 0.82 });
      set("left", s.left);
      tf("wvk", $.wvfill, Math.max(0, Math.min(1, s.waveK || 0)));
      const it = s.inter ? 1 : 0;
      if (last.it !== it) {
        last.it = it;
        $.wv.classList.toggle("inter", !!it);
      }
      num("score", String(s.score), { weight: 0.8 });
      const cn = s.chain > 1 ? s.chain : 0;
      if (last.cn !== cn) {
        last.cn = cn;
        $.ch.classList.toggle("on", cn > 0);
        if (cn) $.chx.textContent = "Chain x" + cn;
      }
      if (cn) tf("chk", $.chfill, Math.max(0, Math.min(1, s.chainK || 0)));
      const g2 = Math.round(5 + s.spread), op = s.crossOn ? String(Math.max(0, 1 - s.ads * 1.6).toFixed(2)) : "0";
      if (last.g !== g2) {
        last.g = g2;
        const L = 9, T3 = 2;
        ticks[0].style.cssText = `width:${L}px;height:${T3}px;left:${g2}px;top:-1px`;
        ticks[1].style.cssText = `width:${L}px;height:${T3}px;left:${-g2 - L}px;top:-1px`;
        ticks[2].style.cssText = `width:${T3}px;height:${L}px;left:-1px;top:${g2}px`;
        ticks[3].style.cssText = `width:${T3}px;height:${L}px;left:-1px;top:${-g2 - L}px`;
      }
      if (last.op !== op) {
        last.op = op;
        $.cross.style.opacity = op;
      }
      const rk = s.reloadK >= 0 ? Math.round(s.reloadK * 50) : -1;
      if (last.rk !== rk) {
        last.rk = rk;
        $.rl.classList.toggle("on", rk >= 0);
        if (rk >= 0) $.rlfg.setAttribute("stroke-dashoffset", (106.8 * (1 - rk / 50)).toFixed(1));
      }
      if (hmT > 0) {
        hmT -= dt;
        $.hm.style.opacity = String(Math.max(0, hmT / 0.18).toFixed(2));
      }
      if (dirT > 0) {
        dirT -= dt;
        $.dir.style.opacity = String(Math.max(0, Math.min(1, dirT / 0.5)).toFixed(2));
      }
      if (banT > 0) {
        banT -= dt;
        if (banT <= 0) $.banner.classList.remove("on");
      }
      if (toastT > 0) {
        toastT -= dt;
        if (toastT <= 0) $.toast.classList.remove("on");
      }
      const h = s.hint || "";
      if (h !== hintOn) {
        hintOn = h;
        $.hint.textContent = h;
        $.hint.style.opacity = h ? "1" : "0";
      }
      if (s.dbg != null) set("dbg", s.dbg);
    },
    // the drone's picture: w = { px, pz, yaw, fov, enemies: [{ x, z, type }], pickups: [{ x, z, kind }], drone: { x, z, yaw, job, status } }. The game calls it about 20 times a second.
    world(dt, w) {
      w.range = CFG.miniR || 30;
      w.rotate = CFG.miniRot !== 0;
      if (CFG.mini !== 0 && mini.ready) mini.draw(dt, w);
      compass.draw(w);
      const d = w.drone || {}, n = w.enemies ? w.enemies.length : 0, sec = Math.ceil(d.sec || 0), rdy = !d.up && d.n > 0;
      const stt = d.up ? d.scan ? "UAV scan 0:" + String(sec).padStart(2, "0") : d.status === "LAUNCHING" || d.status === "RETURNING" ? "UAV " + d.status.toLowerCase() : d.status : rdy ? "UAV ready" + (d.n > 1 ? " \xD7" + d.n : "") : "UAV";
      const sub2 = d.up ? d.scan ? n === 1 ? "1 contact" : n + " contacts" : d.q ? "UAV queued" : "" : d.n >= d.max ? "max held" : d.need - d.p + " kills to next";
      const key = stt + "|" + sub2;
      if (last.us !== key) {
        last.us = key;
        $.uavs.textContent = stt;
        $.uavc.textContent = sub2;
        $.uav.classList.toggle("hot", !!d.up && !d.scan);
        $.uav.classList.toggle("rdy", rdy);
        $.uav.classList.toggle("off", !d.up && !rdy);
        $.uavb.classList.toggle("scan", !!d.scan);
      }
      tf("uavf", $.uavf, d.scan ? d.k || 0 : d.up ? 0 : d.n >= d.max ? 1 : (d.p || 0) / (d.need || 1));
    },
    setWorld(W, bounds, info = {}) {
      mini.setWorld(W, bounds);
      if (info.place) $.place.textContent = info.place;
    },
    hit(kill) {
      hmT = kill ? 0.3 : 0.18;
      $.hm.classList.toggle("k", !!kill);
      $.hm.style.opacity = "1";
    },
    // cls: '' score, 'h' headshot, 'c' chain (these float beside the crosshair and go to the log), 'u' drone traffic (log only)
    feed(text, cls = "") {
      if (cls !== "u") {
        const d = document.createElement("div");
        d.textContent = text;
        if (cls) d.className = cls;
        d.addEventListener("animationend", () => d.remove());
        $.feed.appendChild(d);
        while ($.feed.children.length > 5) $.feed.firstElementChild.remove();
      }
      const l = document.createElement("div");
      l.textContent = text;
      if (cls) l.className = cls;
      l.addEventListener("animationend", () => l.remove());
      $.log.appendChild(l);
      while ($.log.children.length > 5) $.log.firstElementChild.remove();
    },
    settings(o) {
      CFG = o;
      for (const s of SETTINGS) {
        const v = o[s.k];
        if (v == null) continue;
        const sv = root.querySelector(`[data-sv="${s.k}"]`);
        if (s.type) {
          root.querySelectorAll(`[data-o="${s.k}"] button`).forEach((b) => b.classList.toggle("on", +b.dataset.v === Math.round(v)));
          if (sv) sv.textContent = "";
        } else {
          const r = root.querySelector(`[data-r="${s.k}"]`);
          if (r) {
            r.value = String(v);
            r.style.setProperty("--p", ((v - s.min) / (s.max - s.min) * 100).toFixed(1) + "%");
          }
          if (sv) sv.textContent = s.fmt(v);
        }
      }
      root.style.setProperty("--s", String(o.hud || 1));
      const cs = SETTINGS.find((s) => s.k === "cross");
      root.style.setProperty("--cross", cs.options[Math.round(o.cross || 0)] || cs.options[0]);
      $.mm.classList.toggle("off", o.mini === 0);
      if (o.best != null) num("best", String(o.best), { weight: 0.75 });
    },
    hurt(angle) {
      dirT = 0.9;
      $.dir.style.transform = `rotate(${angle}rad)`;
      $.dir.style.opacity = "1";
    },
    banner(t, s = "", sec = 2.6) {
      $.bt.innerHTML = strokeText(String(t).toUpperCase(), { weight: 0.84, gap: 1.6 });
      $.bs.textContent = s;
      $.banner.classList.remove("on");
      void $.banner.offsetWidth;
      $.banner.classList.add("on");
      banT = sec;
    },
    toast(t, sec = 2.2) {
      $.toast.textContent = t;
      $.toast.classList.add("on");
      toastT = sec;
    },
    // rows: [[label, value, highlight?]], sub line, o.best = true when the run set a new best score
    death(rows, sub2, o = {}) {
      $.dsub.innerHTML = esc(sub2) + (o.best ? '<span class="nb">New best</span>' : "");
      $.dtab.innerHTML = rows.map(([a, b, hi]) => `<div class="stat${hi ? " hi" : ""}"><span class="lab">${esc(a)}</span><div class="v">${strokeText(String(b).toUpperCase(), { weight: 0.76 })}</div></div>`).join("");
    },
    openSettings() {
      $.settings.classList.add("on");
      const t = $.settings.querySelector(".tab.on");
      if (t) try {
        t.focus({ preventScroll: true });
      } catch {
      }
    },
    closeSettings() {
      if (!$.settings.classList.contains("on")) return false;
      $.settings.classList.remove("on");
      H2.show(state);
      return true;
    }
  };
  const act = (a) => {
    if (a === "deploy") {
      snd("uiOk");
      if (H2.onClick) H2.onClick("menu");
    } else if (a === "resume") {
      snd("uiOk");
      if (H2.onClick) H2.onClick("pause");
    } else if (a === "redeploy") {
      snd("uiOk");
      if (H2.onClick) H2.onClick("dead");
    } else if (a === "restart") {
      snd("uiOk");
      if (H2.onClick) H2.onClick("restart");
    } else if (a === "title") {
      snd("uiBack");
      if (H2.onClick) H2.onClick("title");
    } else if (a === "settings") {
      snd("uiOk");
      H2.openSettings(state);
    } else if (a === "back") {
      snd("uiBack");
      H2.closeSettings();
    }
  };
  root.querySelectorAll("[data-act]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      act(b.dataset.act);
    });
  });
  root.querySelectorAll("button").forEach((b) => b.addEventListener("pointerenter", () => snd("uiTick")));
  root.querySelectorAll("[data-tab]").forEach((t) => t.addEventListener("click", () => {
    snd("uiStep");
    root.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === t));
    root.querySelectorAll("[data-pane]").forEach((p) => p.classList.toggle("on", p.dataset.pane === t.dataset.tab));
  }));
  const by = Object.fromEntries(SETTINGS.map((s) => [s.k, s])), put = (k, v) => {
    const s = by[k];
    if (!s) return;
    if (!s.type) v = Math.max(s.min, Math.min(s.max, Math.round(v / s.step) * s.step));
    if (onSetting) onSetting(k, +(+v).toFixed(4));
  };
  root.querySelectorAll("[data-r]").forEach((r) => r.addEventListener("input", () => {
    snd("uiStep");
    put(r.dataset.r, +r.value);
  }));
  root.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => {
    snd("uiStep");
    const s = by[b.dataset.s];
    put(s.k, (CFG[s.k] ?? s.def) + s.step * +b.dataset.d);
  }));
  root.querySelectorAll("[data-o] button").forEach((b) => b.addEventListener("click", () => {
    snd("uiStep");
    put(b.parentElement.dataset.o, +b.dataset.v);
  }));
  root.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
    snd("uiOk");
    if (onQuality) onQuality(b.dataset.q);
  }));
  root.querySelectorAll("[data-map]").forEach((b) => b.addEventListener("click", () => {
    snd("uiOk");
    if (onMap) onMap(b.dataset.map);
  }));
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && $.settings.classList.contains("on")) {
      e.stopPropagation();
      snd("uiBack");
      H2.closeSettings();
    }
  }, true);
  return H2;
}
function bootScreen(el2, stages) {
  if (!el2) return { step() {
  }, done() {
  } };
  const st = document.createElement("style");
  st.textContent = `#boot{position:absolute;inset:0;background:#040709;color:#e8ebe6;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:clamp(10px,.62vw + .42vh,19px);display:flex;align-items:center;justify-content:center;transition:opacity .5s}
#boot .bx{width:min(34em,88vw)}#boot .kick{font-size:.68em;letter-spacing:.34em;text-transform:uppercase;color:#f2a31b;font-weight:700;margin-bottom:1.6em;display:flex;align-items:center;gap:.9em}#boot .kick:before{content:"";width:2.6em;height:.14em;background:#f2a31b}
#boot .logo{font-size:3.6em;line-height:1}#boot .logo svg{display:inline-block;vertical-align:top;overflow:visible}#boot .logo svg:last-child{color:#f2a31b;margin-left:.42em}
#boot .bar{position:relative;height:.24em;margin:2.4em 0 .8em;background:rgba(232,235,230,.14);overflow:hidden}#boot .bar i{position:absolute;inset:0;background:#f2a31b;transform-origin:0 50%;transform:scaleX(0);transition:transform .35s}
#boot .bar b{position:absolute;top:0;bottom:0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:cxboot 1.1s linear infinite}@keyframes cxboot{0%{transform:translateX(-100%)}100%{transform:translateX(430%)}}
#boot .now{display:flex;justify-content:space-between;font-size:.78em;letter-spacing:.2em;text-transform:uppercase;font-weight:600}#boot .now span:last-child{color:rgba(232,235,230,.62)}
#boot ol{list-style:none;margin:1.6em 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:.4em 2em;font-size:.72em;letter-spacing:.08em;color:rgba(232,235,230,.34)}#boot li{display:flex;gap:.7em;align-items:center}#boot li:before{content:"";width:.5em;height:.5em;border:1px solid currentColor;flex:none}
#boot li.on{color:#e8ebe6}#boot li.on:before{background:#f2a31b;border-color:#f2a31b}#boot li.ok{color:rgba(232,235,230,.62)}#boot li.ok:before{background:rgba(232,235,230,.62)}
#boot p{margin:2.2em 0 0;font-size:.76em;line-height:1.6;color:rgba(232,235,230,.62)}#boot p b{color:#e8ebe6;font-weight:600}`;
  document.head.appendChild(st);
  el2.innerHTML = `<div class="bx"><div class="kick">City Emergency Authority \xB7 field terminal</div><div class="logo">${strokeText("CORDON", { weight: 0.86, gap: 1.5 })}${strokeText("9", { weight: 0.86 })}</div>
<div class="bar"><i></i><b></b></div><div class="now"><span id="boot-msg">Starting</span><span class="pc">0%</span></div><ol>${stages.map((s) => `<li>${s}</li>`).join("")}</ol>
<p><b>No asset files.</b> No models, no image textures, no audio samples. The street, the rifle, the dead, the drone, every sound and the music are being generated in code right now.</p></div>`;
  const fill2 = el2.querySelector(".bar i"), msg = el2.querySelector("#boot-msg"), pc = el2.querySelector(".pc"), li = [...el2.querySelectorAll("li")];
  let n = -1;
  return {
    step(label2) {
      const i = stages.indexOf(label2);
      if (i >= 0) n = i;
      else n = Math.min(stages.length - 1, n + 1);
      msg.textContent = label2;
      const k = Math.max(0, n) / stages.length;
      fill2.style.transform = `scaleX(${k.toFixed(3)})`;
      pc.textContent = Math.round(k * 100) + "%";
      li.forEach((e, j) => {
        e.className = j < n ? "ok" : j === n ? "on" : "";
      });
    },
    done() {
      fill2.style.transform = "scaleX(1)";
      pc.textContent = "100%";
      el2.style.opacity = "0";
      el2.style.pointerEvents = "none";
      setTimeout(() => {
        el2.style.display = "none";
      }, 550);
    }
  };
}

