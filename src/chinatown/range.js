// The firing range: the game itself, with the timeline switched off and a panel to set
// everything up by hand (/?range=1). The street, the dead, the weapons, the seasonings, the
// ammunition and the renderer are the real ones: this is a run of the set meal in which
// nothing arrives unless it is asked for. So whatever is tried here is what will be played,
// and there is no second copy of anything to keep in step.
//
// The panel can put any weapon in hand at any level and in either form, set any seasoning,
// feed the weapons from nowhere or from the run's pools, bring on the dead one at a time or
// as a course of the meal, and change the shared numbers while the game runs. Its state lives
// in the address, so the page comes back as it was after a reload (the dev server reloads on
// every save):
//   /?range=1&w=flamer&b=a&lv=5&spice=chili:2,fire:3&ammo=meal&z=horde&course=mains&god=0
//
// It is also where the models on trial are looked at (zombietune.js EXTRA_BODIES): "模型"
// puts one of them, or all of them, in place of the usual dead for everything the panel
// brings on, and "列队" stands the lot in a row (&body=pumpkinhulk, &body=mix, &z=lineup).
//
// A debugging tool: its own labels are Chinese only and are not in the language packs (the
// names of weapons, seasonings, ammunition and courses are the game's and follow the language).
import * as L10N from "../i18n/index.js";
import { hasGallery, homeUrl, galleryUrl } from "./doors.js";
import { ARMS, AMMO, AMMO_TYPES, MAX_LEVEL, ammoPer } from "./loadout.js";
import { RUN, spiceVars } from "./runtune.js";
import { ZOMBIES, EXTRA_BODIES } from "./zombietune.js";
import { STATUS } from "../../arsenal/src/data/status.js";
import { LEVELS } from "../../arsenal/src/data/levels.js";
import { FEEL } from "../../arsenal/src/data/feel.js";

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const num = (n) => String(+(+n).toFixed(3));

// who can be asked for one at a time: [id, label, body, how it is made]
const SPAWNS = [
  ["walker", "行尸", "walker", () => ({ runner: false })],
  ["runner", "奔尸", "walker", () => ({ runner: true })],
  ["brute", "重型", "brute", () => ({})],
  ["bloater", "胀尸", "walker", (c) => c.bloaterOpts()],
  ["elite", "精英", "brute", (c, n) => c.eliteOpts(n)],
  ["boss", "关底", "brute", (c) => c.bossOpts()],
];
const MODES = [
  ["none", "空场"],
  ["stand", "站桩"],
  ["advance", "逼近"],
  ["horde", "尸潮"],
  ["lineup", "列队", "试用的新模型站成两排"],
];
// the models that can stand in for the usual dead: [id, label]
const BODY_NAMES = {
  yaku: "黑帮",
  prisoner: "囚犯",
  whiteclown: "小丑",
  parasite: "寄生",
  skeletonzombie: "骷髅",
  pumpkinhulk: "南瓜",
  mutant: "变异",
};
const TRIAL = Object.keys(EXTRA_BODIES);
const BODIES = [
  ["", "原版", "现在一局里用的四个模型"],
  ["mix", "新的混编", "七个新模型一起上，各按自己的规则（行尸或重型）"],
  ...TRIAL.map((id) => [
    id,
    BODY_NAMES[id] || id,
    `只上这一个，什么身份都由它来演（自己上场时是${EXTRA_BODIES[id].type === "brute" ? "重型" : "行尸"}）`,
  ]),
];
// the trial models in two staggered rows, the ordinary ones in front and the heavy ones
// behind: [metres ahead, metres to the side, rules, model]
const lineRow = (heavy, d, gap) =>
  TRIAL.filter((b) => (EXTRA_BODIES[b].type === "brute") === heavy).map(
    (body, i, row) => [
      d,
      (i - (row.length - 1) / 2) * gap,
      EXTRA_BODIES[body].type,
      body,
    ],
  );
const LINE = [...lineRow(false, 5, 1.3), ...lineRow(true, 7.4, 2.6)];
// the standing targets: metres ahead, metres to the side, body
const SPOTS = [
  [6, -1.2, "walker"],
  [8, 1.3, "walker"],
  [11, -2.2, "walker"],
  [13, 0.5, "brute"],
  [16, -0.9, "walker"],
  [19, 2.0, "walker"],
  [23, 0, "brute"],
];
const ADVANCE = 8; // how many keep walking in

/**
 * c: what run.js hands over —
 *   S, hud, loadout, hooks, spawnOne, spawnTick, bloaterOpts, eliteOpts, bossOpts,
 *   set(id, level, branch), setSpice(id, level), retune()
 */
export function createRange(G, c) {
  const { S, loadout, hooks } = c;
  const V3 = G.THREE.Vector3;
  const P = () => G.player;
  const p0 = G.params || {};
  const courses = RUN.stages.filter((s) => s.at < RUN.bossAt);

  const opt = {
    ammo: p0.ammo === "meal" ? "meal" : "free",
    z: MODES.some((m) => m[0] === p0.z) ? p0.z : "stand",
    course: courses.some((s) => s.id === p0.course) ? p0.course : courses[0].id,
    body: BODIES.some((b) => b[0] === p0.body) ? p0.body : "",
    god: p0.god !== "0",
    tickets: p0.tickets === "1",
    open: p0.panel !== "0",
  };
  const pref = {}; // the form each weapon was last given: "a" | "b"
  const meter = { hits: [], total: 0, kills: 0, hurt: 0, spent: {} };
  const spotList = (list) =>
    list.map(([d, o, type, body]) => ({
      d,
      o,
      type,
      body,
      z: null,
      id: -1,
      t: 0,
    }));
  const stand = spotList(SPOTS);
  const line = spotList(LINE);
  const spotsNow = () => (opt.z === "lineup" ? line : stand);
  let bodyNote = ""; // "载入中…" while a model is on its way, or what went wrong
  let casting = false; // the chosen models are on their way: nobody is brought on meanwhile
  let anchor = null; // where the standing targets were laid out from: { pos, yaw }
  let advanceT = 0;
  let eliteN = 0;
  let lastRounds = null; // { id, rounds } of the weapon in hand, to count what it fires
  let clock = 0;

  // ---------------------------------------------------------------- the panel
  // (the numbers at the bottom are built once: redrawing them would shut whatever is open)
  const el = document.createElement("div");
  el.className = "rg";
  el.innerHTML = `
    <header><b>靶场</b><a class="rg-door" data-door="home" title="回到游戏首页">首页</a><a class="rg-door" data-door="gallery" title="在陈列馆里看手上这把：模型、双手、升级卡">陈列</a><span class="rg-keys">Tab 松开 / 收回鼠标</span><button data-act="fold" title="收起 / 展开面板"></button></header>
    <div class="rg-body"><div id="rg-main"></div>
      <details class="rg-tune"><summary>数值<small>改了立刻生效，刷新即还原</small></summary><div id="rg-tables"></div>
        <div class="rg-row"><button data-act="copy">复制改动</button><button data-act="revert">全部还原</button><span class="rg-note" id="rg-changed"></span></div>
        <textarea id="rg-out" readonly hidden></textarea></details>
    </div>`;
  const main = el.querySelector("#rg-main");
  const wname = (id) => L10N.t("weapon." + id + ".s");
  const spiceName = (id) => L10N.t("run.spice." + id);
  const seg = (name, items, cur) =>
    items
      .map(
        ([v, label, title]) =>
          `<button data-${name}="${v}"${v === cur ? ' class="on"' : ""}${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`,
      )
      .join("");

  function spiceTitle(s, level) {
    const lv = Math.max(1, level);
    const v = spiceVars(s.id, lv);
    const total = { ...v, n: s.id === "soup" ? v.n * lv : v.t };
    return L10N.t("run.spice." + s.id + ".d", s.per !== undefined ? total : v);
  }

  function render() {
    const cur = loadout.cur;
    const it = loadout.item(cur) || { level: 1, branch: "base" };
    const own = ARMS[cur] && ARMS[cur].own;
    const forked = it.level >= 3 && !own;
    const weapons = Object.keys(ARMS)
      .map(
        (id) =>
          `<button data-w="${id}"${id === cur ? ' class="on"' : ""} title="${esc(ammoLine(id))}">${esc(wname(id))}${loadout.has(id) ? `<i>${loadout.item(id).level}</i>` : ""}</button>`,
      )
      .join("");
    const levels = LEVELS.map(
      (l) =>
        `<button data-lv="${l.lv}"${l.lv === it.level ? ' class="on"' : ""} title="伤害 ×${l.dmg}">${l.lv}</button>`,
    ).join("");
    const forms = own
      ? `<span class="rg-note">本体的枪，没有岔路</span>`
      : seg(
          "b",
          [
            ["base", "基础"],
            [
              "a",
              "甲 " + L10N.t(`run.branch.${cur}.a`),
              L10N.t(`run.branch.${cur}.a.d`),
            ],
            [
              "b",
              "乙 " + L10N.t(`run.branch.${cur}.b`),
              L10N.t(`run.branch.${cur}.b.d`),
            ],
          ],
          forked ? it.branch : "base",
        );
    const spices = RUN.spices
      .map((s) => {
        const lv = S.spice[s.id] || 0;
        return `<button data-spice="${s.id}"${lv ? ' class="on"' : ""} title="${esc(`${lv} / ${RUN.spiceMax} 层：${spiceTitle(s, lv)}`)}">${esc(spiceName(s.id))}<i>${lv || ""}</i></button>`;
      })
      .join("");
    const spawns = SPAWNS.map(
      ([id, label]) => `<button data-spawn="${id}">＋${label}</button>`,
    ).join("");
    const bodies = seg("body", BODIES, opt.body);
    // the ways out: the title page, and the gallery with the weapon in hand on show (the
    // game's own two guns are not in it: it opens on its first)
    el.querySelector('[data-door="home"]').href = homeUrl();
    const door = el.querySelector('[data-door="gallery"]');
    door.hidden = !hasGallery();
    door.href = galleryUrl(
      own ? {} : { w: cur, b: forked ? it.branch : undefined, lv: it.level },
    );
    el.classList.toggle("shut", !opt.open);
    el.querySelector('[data-act="fold"]').textContent = opt.open
      ? "收起"
      : "展开";
    main.innerHTML = `
        <section><h4>武器<small>${esc(ammoLine(cur))}</small></h4><div class="rg-grid">${weapons}</div>
          <div class="rg-row"><span>等级</span><div class="rg-seg">${levels}</div></div>
          <div class="rg-row"><span>形态</span><div class="rg-seg">${forms}</div></div></section>
        <section><h4>调料<small>点一下加一层，满了再点清掉</small></h4><div class="rg-grid">${spices}</div></section>
        <section><h4>弹药</h4><div class="rg-row"><div class="rg-seg">${seg(
          "ammo",
          [
            ["free", "无限", "四种弹药池一直是满的"],
            ["meal", "套餐", "和一局里一样：打掉的要捡回来"],
          ],
          opt.ammo,
        )}</div><button data-act="refill">补满</button></div></section>
        <section><h4>僵尸<small id="rg-alive"></small></h4>
          <div class="rg-row"><div class="rg-seg">${seg(
            "z",
            MODES,
            opt.z,
          )}</div><button data-act="clear">清场</button></div>
          <div class="rg-row${opt.z === "horde" ? "" : " dim"}"><span>火候</span><div class="rg-seg">${seg(
            "course",
            courses.map((s) => [s.id, L10N.t("run.stage." + s.id)]),
            opt.course,
          )}</div></div>
          <div class="rg-row"><span>模型</span><span class="rg-note">${esc(bodyNote || "新模型还在试用，只在靶场里有")}</span></div>
          <div class="rg-grid">${bodies}</div>
          <div class="rg-grid">${spawns}</div></section>
        <section><div class="rg-row"><div class="rg-seg">${seg(
          "god",
          [
            ["1", "无敌"],
            ["0", "会受伤"],
          ],
          opt.god ? "1" : "0",
        )}</div><div class="rg-seg">${seg(
          "tickets",
          [
            ["0", "不升级"],
            ["1", "升级小票", "击杀攒镬气，照常出小票"],
          ],
          opt.tickets ? "1" : "0",
        )}</div></div></section>
        <section class="rg-meter"><div><span>每秒伤害</span><b id="rg-dps">0</b></div><div><span>累计</span><b id="rg-total">0</b></div><div><span>击杀</span><b id="rg-kills">0</b></div><div><span>受伤</span><b id="rg-hurt">0</b></div><div><span id="rg-spent-k">耗弹</span><b id="rg-spent">0</b></div><button data-act="zero">清零</button></section>`;
  }

  function ammoLine(id) {
    const a = ARMS[id];
    if (!a || !a.ammo) return "不吃弹药";
    const it = loadout.item(id);
    const per = ammoPer(id, it ? it.branch : "base", it ? it.level : 1);
    return `吃${L10N.t("run.ammo." + a.ammo)}，每发 ${num(per)}`;
  }

  // ---------------------------------------------------------------- the shared numbers, live
  // Every table a weapon's effect depends on, as it is in memory. Editing a number here edits
  // the object the game is running on; the file is not touched, so a reload puts it back.
  // "复制改动" lists what was changed, to be written into the files named beside each table.
  const fx = {
    get 粒子亮度() {
      const a = loadout.armory;
      return a ? a.debug.gain.value : 0;
    },
    set 粒子亮度(v) {
      const a = loadout.armory;
      if (a) a.debug.gain.value = v;
    },
  };
  const TABLES = [
    ["状态与反应", "arsenal/src/data/status.js", "STATUS", STATUS],
    ["每级伤害倍率", "arsenal/src/data/levels.js", "LEVELS", LEVELS],
    [
      "手感（后坐、镜头、散布、近战顿挫）",
      "arsenal/src/data/feel.js",
      "FEEL",
      FEEL,
    ],
    [
      "僵尸",
      "src/chinatown/zombietune.js",
      "ZOMBIES",
      ZOMBIES,
      ["walker", "brute", "head", "staggerSlow"],
    ],
    ["弹药池", "src/chinatown/loadout.js", "AMMO", AMMO],
    ["每发消耗", "src/chinatown/loadout.js", "ARMS", ARMS],
    ["调料", "src/chinatown/runtune.js", "RUN.spices", RUN.spices],
    ["精英", "src/chinatown/runtune.js", "RUN.elite", RUN.elite],
    ["关底", "src/chinatown/runtune.js", "RUN.boss", RUN.boss],
    ["胀尸", "src/chinatown/runtune.js", "RUN.bloater", RUN.bloater],
    [
      "特效（夜街压暗后的粒子亮度）",
      "src/chinatown/armory.js",
      "ARMORY_TUNE.fxGain",
      fx,
    ],
  ];
  const changed = new Map(); // "file · path" -> { obj, key, from, to }
  const fields = []; // inputs on screen: { obj, key }
  function rows(obj, path, only, out) {
    const keys = Array.isArray(obj) ? obj.map((_, i) => i) : Object.keys(obj);
    for (const k of keys) {
      if (only && !only.includes(k)) continue;
      const v = obj[k];
      // an entry of a list is named by its id where it has one ("RUN.spices[fire]")
      const name = Array.isArray(obj)
        ? `[${(v && (v.id || v.lv)) ?? k}]`
        : (path ? "." : "") + k;
      if (typeof v === "number") {
        fields.push({ obj, key: k, path: path + name });
        out.push(
          `<label><span>${esc(path + name)}</span><input type="number" step="any" data-f="${fields.length - 1}" value="${num(v)}"></label>`,
        );
      } else if (v && typeof v === "object") rows(v, path + name, null, out);
    }
  }
  function renderTables() {
    const box = el.querySelector("#rg-tables");
    if (!box) return;
    fields.length = 0;
    box.innerHTML = TABLES.map(([title, file, root, obj, only]) => {
      const out = [];
      const at = fields.length;
      rows(obj, "", only, out);
      for (let i = at; i < fields.length; i++) {
        fields[i].file = file;
        fields[i].root = root;
      }
      return `<details><summary>${esc(title)}<small>${esc(file)}</small></summary>${out.join("")}</details>`;
    }).join("");
    for (const [key] of changed) mark(key);
    noteChanged();
  }
  const keyOf = (f) =>
    `${f.file} · ${f.root}${f.path.startsWith("[") ? "" : "."}${f.path}`;
  function mark(key) {
    const i = fields.findIndex((f) => keyOf(f) === key);
    const input = i >= 0 && el.querySelector(`input[data-f="${i}"]`);
    if (input) input.classList.toggle("ch", changed.has(key));
  }
  function noteChanged() {
    const n = el.querySelector("#rg-changed");
    if (n) n.textContent = changed.size ? `改了 ${changed.size} 处` : "";
  }
  function editField(i, raw) {
    const f = fields[i];
    const v = parseFloat(raw);
    if (!f || !Number.isFinite(v)) return;
    const key = keyOf(f);
    const was = changed.get(key);
    const from = was ? was.from : f.obj[f.key];
    f.obj[f.key] = v;
    if (v === from) changed.delete(key);
    else changed.set(key, { obj: f.obj, key: f.key, from, to: v });
    mark(key);
    noteChanged();
    c.retune(f.root === "LEVELS");
  }
  function changesText() {
    return [...changed]
      .map(([key, ch]) => `${key}: ${num(ch.from)} → ${num(ch.to)}`)
      .join("\n");
  }

  // ---------------------------------------------------------------- actions
  function give(id, level, branch) {
    if (branch === "a" || branch === "b") pref[id] = branch;
    return c.set(id, level, pref[id] || "a").then(() => {
      lastRounds = null;
      sync();
      render();
    });
  }
  function onClick(ev) {
    const t = ev.target.closest("button");
    if (!t || !el.contains(t)) return;
    const d = t.dataset;
    const cur = loadout.cur;
    const it = loadout.item(cur) || { level: 1, branch: "base" };
    if (d.w) {
      const have = loadout.item(d.w);
      give(
        d.w,
        have ? have.level : 1,
        have && have.branch !== "base" ? have.branch : null,
      );
    } else if (d.lv) give(cur, +d.lv, null);
    else if (d.b) {
      if (d.b === "base") give(cur, Math.min(2, it.level), null);
      else give(cur, Math.max(3, it.level), d.b);
    } else if (d.spice) {
      const lv = S.spice[d.spice] || 0;
      c.setSpice(d.spice, lv >= RUN.spiceMax ? 0 : lv + 1);
    } else if (d.ammo) {
      opt.ammo = d.ammo;
      loadout.refill();
    } else if (d.z) setMode(d.z);
    else if (d.course) {
      opt.course = d.course;
      if (opt.z !== "horde") setMode("horde");
    } else if (d.spawn) spawn(d.spawn);
    else if (d.body !== undefined) setBody(d.body);
    else if (d.god) opt.god = d.god === "1";
    else if (d.tickets) opt.tickets = d.tickets === "1";
    else if (d.act === "refill") loadout.refill();
    else if (d.act === "clear") {
      G.enemies.clear();
      setMode("none");
    } else if (d.act === "zero") zero();
    else if (d.act === "fold") opt.open = !opt.open;
    else if (d.act === "copy") {
      const text = changesText() || "（没有改动）";
      const box = el.querySelector("#rg-out");
      box.hidden = false;
      box.value = text;
      try {
        navigator.clipboard.writeText(text).catch(() => {});
      } catch {}
      t.blur();
      return; // keep the text on screen
    } else if (d.act === "revert") {
      for (const ch of changed.values()) ch.obj[ch.key] = ch.from;
      changed.clear();
      c.retune(true);
      renderTables();
    }
    t.blur();
    sync();
    render();
  }
  el.addEventListener("click", onClick);
  el.addEventListener("change", (ev) => {
    const f = ev.target.dataset && ev.target.dataset.f;
    if (f !== undefined) editField(+f, ev.target.value);
  });
  el.querySelector(".rg-tune").addEventListener("toggle", (ev) => {
    if (ev.target.open && !fields.length) renderTables();
  });
  // typing in the panel must not walk the player about or swap weapons
  for (const type of ["keydown", "keyup", "keypress"])
    el.addEventListener(type, (ev) => {
      if (ev.target.tagName === "INPUT" && ev.code !== "Tab")
        ev.stopPropagation();
    });
  // Tab: let the mouse go to use the panel, take it back to aim
  window.addEventListener(
    "keydown",
    (ev) => {
      if (ev.code !== "Tab" || !S.active || !S.range) return;
      if (!G.game || G.game.state !== "playing") return;
      ev.preventDefault();
      const I = G.input;
      if (!I || I.touch) return;
      if (ev.target && ev.target.blur && el.contains(ev.target))
        ev.target.blur();
      if (I.locked) I.exitLock && I.exitLock();
      else I.requestLock && I.requestLock();
    },
    true,
  );

  // the panel's state in the address: a reload comes back to the same set-up
  function sync() {
    const cur = loadout.cur;
    const it = loadout.item(cur) || { level: 1, branch: "base" };
    const u = new URL(location.href);
    const q = u.searchParams;
    const set = (k, v, dflt) => (v === dflt ? q.delete(k) : q.set(k, v));
    q.set("range", "1");
    q.set("w", cur);
    q.set("lv", it.level);
    set("b", it.level >= 3 ? it.branch : "base", "base");
    set(
      "spice",
      Object.entries(S.spice)
        .map(([id, lv]) => `${id}:${lv}`)
        .join(","),
      "",
    );
    set("ammo", opt.ammo, "free");
    set("z", opt.z, "stand");
    set("course", opt.course, courses[0].id);
    set("body", opt.body, "");
    set("god", opt.god ? "1" : "0", "1");
    set("tickets", opt.tickets ? "1" : "0", "0");
    set("panel", opt.open ? "1" : "0", "1");
    q.delete("autostart");
    // (commas and colons read better unescaped, and the lab writes them the same way)
    const text =
      u.pathname +
      "?" +
      q.toString().replace(/%2C/g, ",").replace(/%3A/g, ":") +
      u.hash;
    try {
      history.replaceState(null, "", text);
    } catch {}
    // the game's own parameters: a retry, or a death, starts from what is set now
    Object.assign(p0, {
      w: cur,
      lv: String(it.level),
      b: it.level >= 3 ? it.branch : "base",
    });
    p0.spice = q.get("spice") || "";
  }

  // ---------------------------------------------------------------- the dead
  const fwdOf = (yaw) => new V3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const walkable = (p) => {
    const nav = G.physics && G.physics.nav;
    return !nav || !nav.isWalkable || nav.isWalkable(p.x, p.z);
  };
  // a spot d metres out from where the targets were laid out, o metres to the side, the
  // whole layout pulled in to k of its size
  const spotAt = (yaw, d, o, k = 1) => {
    const f = fwdOf(yaw);
    return anchor.pos
      .clone()
      .addScaledVector(f, d * k)
      .addScaledVector(new V3(-f.z, 0, f.x), o * k);
  };
  function spotPos(d, o) {
    // (walk it in towards the player until it is on ground the dead can stand on)
    for (let k = 1; k >= 0.25; k -= 0.15) {
      const p = spotAt(anchor.yaw, d, o, k);
      if (walkable(p)) return p;
    }
    return null;
  }
  // Which way the standing targets are laid out: the way the player is facing if the street
  // is open there, otherwise the nearest heading where it is (facing a wall, the targets
  // go up beside or behind rather than not at all).
  function openHeading(yaw, list) {
    let best = yaw;
    let most = -1;
    for (const turn of [0, 45, -45, 90, -90, 135, -135, 180]) {
      const h = yaw + (turn * Math.PI) / 180;
      const n = list.filter((s) => walkable(spotAt(h, s.d, s.o))).length;
      if (n > most) [most, best] = [n, h];
      if (n === list.length) break;
    }
    return best;
  }
  function setMode(mode) {
    opt.z = mode;
    G.enemies.clear();
    for (const s of [...stand, ...line]) {
      s.z = null;
      s.t = 0;
    }
    advanceT = 0;
    S.spawnT = 0.3;
    anchor = { pos: P().pos.clone(), yaw: P().yaw };
    if (mode === "stand" || mode === "lineup")
      anchor.yaw = openHeading(anchor.yaw, spotsNow());
    if (mode === "lineup") fetchBodies(TRIAL);
  }
  // ---- the models on trial
  function fetchBodies(names) {
    bodyNote = "载入中…";
    return G.enemies.ensure(names).then(
      () => {
        bodyNote = "";
        render();
        return true;
      },
      (err) => {
        console.warn("[range] model failed to load", err);
        bodyNote = "模型没载入成功";
        render();
        return false;
      },
    );
  }
  // which models stand in for the usual dead: "" | "mix" | one of TRIAL
  function setBody(body) {
    opt.body = body;
    const names = body === "mix" ? TRIAL : body ? [body] : null;
    G.enemies.cast = null;
    casting = !!names;
    setMode(opt.z);
    if (!names) return void (bodyNote = "");
    fetchBodies(names).then((ok) => {
      if (opt.body !== body) return; // another was picked meanwhile
      casting = false;
      if (!ok) opt.body = "";
      else G.enemies.cast = names;
      // those already on the street were the old cast: lay the scene out again
      setMode(opt.z);
      sync();
      render();
    });
  }
  function spawn(kind) {
    const def = SPAWNS.find((s) => s[0] === kind);
    if (!def) return;
    const opts = def[3](c, eliteN);
    const z = c.spawnOne(def[2], opts, { minDist: 14 });
    if (!z) return;
    if (kind === "elite") {
      eliteN++;
      S.elites.push(z);
    }
    if (kind === "boss") {
      S.boss = z;
      S.bossSeen = true;
      S.bossDead = false;
    }
    hooks.refreshMarkers();
  }
  const alive = (s) => s.z && s.z.alive && s.z.id === s.id;
  // dt: seconds on the street, real: wall-clock seconds. A fallen target is stood up again
  // by the clock on the wall: the street may be running slow (a ticket up, a slow machine).
  function tend(dt, real) {
    if (casting) return;
    if (opt.z === "stand" || opt.z === "lineup") {
      for (const s of spotsNow()) {
        if (alive(s)) continue;
        s.t -= real;
        if (s.t > 0) continue;
        const pos = spotPos(s.d, s.o);
        s.t = 2.5;
        if (!pos) continue;
        const z = hooks.spawn(s.type, pos, {
          passive: true,
          runner: false,
          yaw: Math.atan2(anchor.pos.x - pos.x, anchor.pos.z - pos.z),
          body: s.body,
        });
        if (z) {
          s.z = z;
          s.id = z.id;
        } else if (s.body) s.t = 0.4; // its model is still on the way
      }
    } else if (opt.z === "advance") {
      advanceT -= dt;
      if (advanceT <= 0 && hooks.alive() < ADVANCE) {
        advanceT = 1.1;
        c.spawnOne(
          Math.random() < 0.12 ? "brute" : "walker",
          { runner: false },
          { minDist: 22 },
        );
      }
    } else if (opt.z === "horde") {
      // the run's own spawner, held at the middle of the chosen course
      const i = RUN.stages.findIndex((s) => s.id === opt.course);
      const from = RUN.stages[i].at;
      const to = RUN.stages[i + 1] ? RUN.stages[i + 1].at : from;
      S.t = S.clock = (from + to) / 2;
      c.spawnTick(dt);
    }
  }

  // ---------------------------------------------------------------- the meter
  function zero() {
    meter.hits.length = 0;
    meter.total = meter.kills = meter.hurt = 0;
    meter.spent = {};
  }
  G.events.on("enemy:hit", (e) => {
    if (!S.active || !S.range || !e || !(e.amount > 0)) return;
    meter.hits.push({ t: clock, d: e.amount });
    meter.total += e.amount;
  });
  G.events.on("enemy:killed", () => {
    if (S.active && S.range) meter.kills++;
  });
  // what the dead did to the player: the real loss of health, or with "无敌" on what each
  // swing that landed would have taken
  G.events.on("player:hit", (e) => {
    if (S.active && S.range && e && e.amount > 0) meter.hurt += e.amount;
  });
  G.events.on("enemy:melee", (e) => {
    if (!S.active || !S.range || !opt.god || !e || !e.enemy) return;
    const z = e.enemy;
    const t = ZOMBIES[z.type] || ZOMBIES.walker;
    meter.hurt += t.damage * (z.dmgMul || 1) * (z.crawling ? 0.7 : 1);
  });
  // rounds fired, in units of the pool they come from
  function countSpent() {
    const id = loadout.cur;
    const a = ARMS[id];
    if (!a || !a.ammo) return void (lastRounds = null);
    const arm = loadout.armory;
    const rounds =
      id === "rifle"
        ? G.weapon.slots[0].ammo
        : arm && arm.current === id
          ? arm.rounds
          : null;
    if (rounds === null) return void (lastRounds = null);
    if (lastRounds && lastRounds.id === id && rounds < lastRounds.rounds)
      meter.spent[a.ammo] =
        (meter.spent[a.ammo] || 0) +
        (lastRounds.rounds - rounds) * loadout.perOf(id);
    lastRounds = { id, rounds };
  }
  const put = (id, text) => {
    const n = el.querySelector("#" + id);
    if (n && n.textContent !== String(text)) n.textContent = text;
  };
  let shown = "";
  function readout() {
    while (meter.hits.length && clock - meter.hits[0].t > 5) meter.hits.shift();
    let sum = 0;
    for (const h of meter.hits) sum += h.d;
    put("rg-dps", Math.round(sum / 5));
    put("rg-total", Math.round(meter.total));
    put("rg-kills", meter.kills);
    put("rg-hurt", Math.round(meter.hurt));
    const a = ARMS[loadout.cur];
    const pool = a && a.ammo;
    put("rg-spent-k", pool ? "耗" + L10N.t("run.ammo." + pool) : "耗弹");
    put("rg-spent", pool ? Math.round(meter.spent[pool] || 0) : "—");
    put("rg-alive", `街上 ${hooks.alive()} 只`);
    // the weapon bar, the wheel and red envelopes change what is in hand behind our back
    const it = loadout.item(loadout.cur) || { level: 1, branch: "base" };
    const now = `${loadout.cur}:${it.level}:${it.branch}:${loadout.owned().length}:${JSON.stringify(S.spice)}:${L10N.locale()}`;
    if (now !== shown) {
      if (shown) sync();
      shown = now;
      render();
    }
  }

  const api = {
    el,
    opt,
    meter,
    /** Whether kills fill the wok-hei bar and bring tickets (off unless asked for). */
    get tickets() {
      return opt.tickets;
    },
    /** The course whose mix of the dead is coming (shown in place of the clock), or "". */
    get course() {
      return opt.z === "horde" ? opt.course : "";
    },
    setMode(mode) {
      if (!MODES.some((m) => m[0] === mode)) return;
      setMode(mode);
      sync();
      render();
    },
    spawn,
    give,
    zero,
    changes: changesText,
    /** Where the standing targets are and which of them are up (for tests and diagnosis). */
    debug() {
      const r = (n) => +n.toFixed(1);
      return {
        mode: opt.z,
        player: [r(P().pos.x), r(P().pos.z), r(P().yaw)],
        heading: anchor ? r(anchor.yaw) : null,
        body: opt.body,
        cast: G.enemies.cast,
        spots: spotsNow().map((s) => {
          const p = anchor && spotPos(s.d, s.o);
          return `${s.body || s.type[0]}${s.d}:${p ? "ok" : "blocked"}:${alive(s) ? "up" : "down"}`;
        }),
      };
    },
    /** A run on the range has begun (also after a death and a retry). */
    begin() {
      if (!el.parentNode)
        (c.hud.root.parentNode || document.body).appendChild(el);
      el.hidden = false;
      eliteN = 0;
      lastRounds = null;
      zero();
      setBody(opt.body);
      shown = "";
      render();
    },
    end() {
      el.hidden = true;
      G.enemies.cast = null;
      if (P()) P().invulnerable = false;
    },
    /** dt: seconds on the street, real: wall-clock seconds. */
    update(dt, real) {
      clock += real;
      if (P()) P().invulnerable = opt.god;
      if (opt.ammo === "free") loadout.refill();
      tend(dt, real);
      countSpent();
      readout();
    },
  };
  return api;
}
