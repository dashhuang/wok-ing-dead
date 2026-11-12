// Interface of the weapon lab: weapon list, the upgrade card (levels, the two forks, capstones),
// the rules drawer, and the firing-range HUD (crosshair, ammunition, damage numbers, DPS meter).
// Everything is rendered from data: the weapons from data/weapons.js, what a form really
// carries and how fast it fires from its behaviour (the numbers the game plays with), and the
// rules of a run — seasonings, ammunition — from the game's own tables, with the game's own
// names for them. Nothing about the run is written out a second time here.
import {
  WEAPONS,
  EXISTING,
  CLASSES,
  ELEMENTS,
  REACTIONS,
  LEVELS,
  INSCRIPTIONS,
  byId,
} from "../data/weapons.js";
import { BEHAVIOURS } from "../combat/behaviours.js";
import {
  RANGE_SPICES,
  OTHER_SPICES,
  RUN,
  AMMO,
  ARMS,
  ammoPer,
  spiceVars,
} from "../combat/meal.js";
import ZH from "../../../src/i18n/locales/zh-CN.js";

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const KIND = {
  hitscan: "即时命中",
  projectile: "飞行弹体",
  stream: "持续喷射",
  melee: "近战",
};
const BRANCH_LABEL = { base: "基础", a: "甲", b: "乙" };
// the game's own words (its Chinese language pack), with {placeholders} filled in
const tr = (key, vars = {}) =>
  (ZH[key] || key).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
const num = (n) => String(+(+n).toFixed(2));
const ammoName = (type) => tr("run.ammo." + type);
// "吃重弹，每发 1" / "不吃弹药": what a form draws from the run's pools
function ammoLine(id, b = "base", lv = 1) {
  const a = ARMS[id];
  if (!a || !a.ammo) return "不吃弹药";
  return `吃${ammoName(a.ammo)}，每发 ${num(ammoPer(id, b, lv))}`;
}
// a seasoning at a level, in the words of the game's ticket (the total, not one level's worth)
function spiceLine(s, level) {
  const v = spiceVars(s.id, level || 1);
  const total = { ...v, n: s.id === "soup" ? v.n * (level || 1) : v.t };
  return tr("run.spice." + s.id + ".d", s.per !== undefined ? total : v);
}

// The headline numbers of a form. Magazine, rate and reload are read from the behaviour, so
// they are the form's real ones; damage and range are the base weapon's (the same numbers
// the behaviour fires with: it reads them from the data). What a form changes is in its
// description.
function statLine(w, b = "base", lv = 1) {
  const f = w.fire;
  const spec = BEHAVIOURS[w.id] ? BEHAVIOURS[w.id].spec(b, lv) : {};
  const out = [];
  if (f.kind === "melee") {
    out.push(
      ["伤害", f.damage],
      ["攻速", `${Math.round(60 / spec.swingTime)}/分`],
      ["范围", `${f.reach} 米`],
    );
    if (spec.combo) out.push(["连段", spec.combo]);
  } else if (f.kind === "stream") {
    out.push(
      ["伤害", `${f.damage}×${spec.tickRate ?? f.tick}/秒`],
      ["射程", `${f.range} 米`],
      ["燃料", spec.mag ?? w.mag],
    );
    if (spec.reload) out.push(["换弹", `${spec.reload} 秒`]);
    if (f.chain) out.push(["跳电", f.chain]);
  } else {
    out.push(
      [
        "伤害",
        f.pellets
          ? `${f.damage}×${f.pellets}`
          : f.splash
            ? `${f.damage}+${f.splash}`
            : f.damage,
      ],
      ["射速", `${spec.rpm ?? f.rpm}/分`],
      ["弹匣", spec.mag ?? w.mag],
    );
    if (spec.reload) out.push(["换弹", `${spec.reload} 秒`]);
    else if (spec.regen) out.push(["补充", `每 ${spec.regen} 秒 1 发`]);
    if (f.range)
      out.push([
        "射程",
        `${f.range} 米${f.falloff ? `（${f.falloff[0]} 米后衰减）` : ""}`,
      ]);
    if (f.head) out.push(["弱点", `×${f.head}`]);
    if (f.pierce) out.push(["穿透", f.pierce]);
    if (f.radius) out.push(["爆炸", `${f.radius} 米`]);
  }
  return out;
}

export function createUI(lab) {
  const root = document.getElementById("ui");
  root.innerHTML = `
    <header class="bar">
      <div class="brand"><b>鬼市</b><span>军械试验场</span></div>
      <nav class="tabs">
        <button data-mode="show">展柜</button>
        <button data-act="range" id="btn-range" title="在游戏本体里打开靶场：真实的街道、僵尸和画面，带着现在这把武器的形态、等级和调料">靶场 ↗</button>
        <button data-mode="fp" class="bench" title="自动测试用的巷子。规则和数值与游戏是同一份，但场景、僵尸的动作和命中体积是简化的；试手感、看特效亮度请用「靶场」">测试台</button>
      </nav>
      <div class="bar-right">
        <button class="ghost on" data-act="sound" id="btn-sound">声音</button>
        <button class="ghost" data-act="demo" id="btn-demo">演示动作</button>
        <button class="ghost" data-act="hands" id="btn-hands">双手</button>
        <button class="ghost" data-act="rules">升级规则</button>
      </div>
    </header>
    <aside class="list" id="list"></aside>
    <aside class="card" id="card"></aside>
    <div class="tip" id="tip"></div>
    <div class="hud" id="hud">
      <div class="cross"><i></i><i></i><i></i><i></i><b></b></div>
      <div class="scope"></div>
      <div class="ammo"><div class="ammo-n" id="ammo-n"></div><div class="ammo-w" id="ammo-w"></div><div class="ammo-p" id="ammo-p"></div><div class="ammo-bar"><i id="ammo-bar"></i></div></div>
      <div class="alt" id="alt"></div>
      <div class="note" id="note"></div>
      <div class="meter">
        <div><span>每秒伤害</span><b id="m-dps">0</b></div>
        <div><span>累计</span><b id="m-total">0</b></div>
        <div><span>击杀</span><b id="m-kills">0</b></div>
        <div><span>受伤</span><b id="m-taken">0</b></div>
        <div title="打掉的弹药，按套餐的弹药池单位算"><span id="m-spent-k">耗弹</span><b id="m-spent">0</b></div>
        <button class="ghost" data-act="reset">清零</button>
      </div>
      <div class="range-opts">
        <div class="seg" id="seg-target"><span>靶子</span><button data-target="stand">站桩</button><button data-target="advance">逼近</button><button data-target="horde" title="按游戏本体的僵尸血量、速度和伤害成群涌来">尸潮</button></div>
        <div class="seg" id="seg-ammo"><span>弹药</span><button data-ammo="free" title="弹匣凭空补满">无限</button><button data-ammo="meal" title="按套餐结算：换弹从四种弹药池里扣，池子空了就换不了。再点一次把池子补满">套餐</button></div>
        <div class="seg spices" id="seg-spice"><span title="套餐里的调料，名字、层数和数值都读自游戏本体。点一下加一层，满三层再点清掉">调料</span>${RANGE_SPICES.map(
          (sp) =>
            `<button data-spice="${sp.id}">${esc(tr("run.spice." + sp.id))}<i></i></button>`,
        ).join("")}</div>
      </div>
      <div class="lock" id="lock">点击画面开始射击</div>
      <div class="keys">左键 开火　右键 特殊　R 换弹　1 / 2 / 3 形态　− / = 等级　Q / E 换武器　Tab 回展柜　Esc 释放鼠标</div>
      <div class="nums" id="nums"></div>
    </div>
    <div class="rules" id="rules" hidden></div>
  `;
  const $ = (id) => root.querySelector("#" + id);
  const list = $("list"),
    card = $("card"),
    hud = $("hud"),
    rules = $("rules"),
    nums = $("nums");

  // ---------------------------------------------------------------- weapon list
  // one character for the pool a weapon draws on, as on the game's HUD
  const pool = (id) =>
    ARMS[id] && ARMS[id].ammo ? tr("run.ammo." + ARMS[id].ammo + ".s") : "—";
  function renderList() {
    const s = lab.state;
    let html = "";
    for (const [cls, c] of Object.entries(CLASSES)) {
      html += `<h4>${esc(c.name)}<small>${esc(c.note)}</small></h4>`;
      for (const w of WEAPONS.filter((x) => x.cls === cls)) {
        const ok = lab.has(w.id);
        const el = ELEMENTS[w.element];
        html += `<button class="item${s.weapon === w.id ? " on" : ""}" data-w="${w.id}" ${ok ? "" : "disabled"}>
          <i class="dot" style="background:${hex(el.color)}"></i>
          <b>${esc(w.name)}</b><span>${esc(w.type)}</span><em title="${esc(ammoLine(w.id))}">${esc(pool(w.id))}</em></button>`;
      }
    }
    html += `<h4>现有<small>游戏本体自己的两把，不在试验场里</small></h4>`;
    for (const w of EXISTING)
      html += `<button class="item" disabled><i class="dot"></i><b>${esc(w.name)}</b><span>${esc(w.type)}</span><em title="${esc(ammoLine(w.id))}">${esc(pool(w.id))}</em></button>`;
    list.innerHTML = html;
  }

  // ---------------------------------------------------------------- upgrade card
  function renderCard() {
    const s = lab.state;
    const w = byId[s.weapon];
    if (!w) {
      card.innerHTML = "";
      return;
    }
    const forked = s.level >= 3;
    const b = forked ? s.branch : "base";
    const el =
      ELEMENTS[b === "base" ? w.element : w.branches[b].element || w.element];
    const stats = statLine(w, b, s.level)
      .map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`)
      .join("");
    const lv = LEVELS[s.level - 1];
    const pips = LEVELS.map(
      (l) =>
        `<button class="pip${l.lv <= s.level ? " on" : ""}${l.lv === s.level ? " cur" : ""}${l.lv === 3 ? " p-fork" : ""}" data-lv="${l.lv}" title="${esc(l.name)}：${esc(l.note)}"><b>${l.lv}</b><span>${esc(l.name)}</span></button>`,
    ).join("");
    const branch = (key) => {
      const br = w.branches[key];
      const on = forked && s.branch === key;
      const bel = ELEMENTS[br.element || "none"];
      return `<button class="branch${on ? " on" : ""}" data-b="${key}">
        <div class="branch-h"><em>${BRANCH_LABEL[key]}</em><b>${esc(br.name)}</b>${br.element && br.element !== "none" ? `<i style="color:${hex(bel.color)}">${esc(bel.name)}</i>` : ""}</div>
        <p>${esc(br.text)}</p>
        <div class="cap${on && s.level >= 5 ? " lit" : ""}"><em>极</em><b>${esc(br.cap.name)}</b><span>${esc(br.cap.text)}</span></div>
      </button>`;
    };
    card.innerHTML = `
      <div class="card-h">
        <div class="cls">${esc(CLASSES[w.cls].name)} · ${esc(KIND[w.fire.kind])} · ${esc(ammoLine(w.id, b, s.level))}</div>
        <h1>${esc(w.name)}</h1>
        <div class="type">${esc(w.type)}${el.name !== "无" ? `<i style="color:${hex(el.color)}">　${esc(el.name)} · ${esc(el.status)}</i>` : ""}</div>
        <p class="tag">${esc(w.tagline)}</p>
      </div>
      <div class="stats">${stats}</div>
      <div class="sec">局内升级<small>捡到红包，手上那把升一级</small></div>
      <div class="pips">${pips}</div>
      <div class="lvnote"><b>${lv.lv} 级 · ${esc(lv.name)}</b>　伤害 ×${lv.dmg}　<span>${esc(lv.note)}</span></div>
      <div class="sec">三级岔路<small>二选一，外形和打法一起变</small></div>
      <div class="branches">
        <button class="branch base${!forked ? " on" : ""}" data-b="base"><div class="branch-h"><em>基础</em><b>${esc(w.name)}</b></div><p>${esc(w.reload)}。</p></button>
        ${branch("a")}${branch("b")}
      </div>
      <div class="look"><span>外形</span>${esc(b === "base" ? w.look : w.branches[b].look)}</div>
    `;
  }

  // ---------------------------------------------------------------- rules drawer
  function renderRules() {
    const el = Object.entries(ELEMENTS)
      .filter(([k]) => k !== "none")
      .map(
        ([, e]) =>
          `<li><i class="dot" style="background:${hex(e.color)}"></i><b>${esc(e.name)} · ${esc(e.status)}</b><span>${esc(e.hint)}</span></li>`,
      )
      .join("");
    const re = REACTIONS.map(
      (r) =>
        `<li><b>${esc(ELEMENTS[r.a].name)} + ${esc(ELEMENTS[r.b].name)} → ${esc(r.name)}</b><span>${esc(r.text)}</span></li>`,
    ).join("");
    const lv = LEVELS.map(
      (l) =>
        `<li><b>${l.lv} · ${esc(l.name)}</b><span>伤害 ×${l.dmg}。${esc(l.note)}</span></li>`,
    ).join("");
    // a seasoning's three levels in one line, in the words of the game's tickets
    const spice = (sp) =>
      `<li><em>${esc(tr("run.spice." + sp.id))}</em><span>${[1, 2, 3]
        .filter((n) => n <= RUN.spiceMax)
        .map((n) => esc(spiceLine(sp, n)))
        .join("　/　")}</span></li>`;
    const pools = Object.entries(AMMO)
      .map(([type, a]) => {
        const users = Object.entries(ARMS)
          .filter(([, w]) => w.ammo === type)
          .map(([id]) => {
            const w = byId[id] || EXISTING.find((x) => x.id === id);
            const per = ARMS[id].per;
            const cost =
              typeof per === "number"
                ? num(per)
                : `${num(per.base)}（甲 ${num(per.a)}、乙 ${num(per.b)}）`;
            return `${esc(w ? w.name : id)} ${cost}`;
          })
          .join("，");
        return `<li><b>${esc(ammoName(type))}</b><span>最多带 ${a.cap}，开局 ${a.start}，一包 ${a.pack}。每发消耗：${users}</span></li>`;
      })
      .join("");
    const free = Object.entries(ARMS)
      .filter(([, w]) => !w.ammo)
      .map(([id]) => (byId[id] || EXISTING.find((x) => x.id === id) || {}).name)
      .join("、");
    const groups = [...new Set(INSCRIPTIONS.map((i) => i.group))];
    const ins = groups
      .map(
        (g) =>
          `<h5>${esc(g)}</h5><ul class="ins">${INSCRIPTIONS.filter(
            (i) => i.group === g,
          )
            .map(
              (i) =>
                `<li><em>${esc(i.name)}</em><span>${esc(i.text)}</span></li>`,
            )
            .join("")}</ul>`,
      )
      .join("");
    const ex = EXISTING.map(
      (w) =>
        `<li><b>${esc(w.name)} ${esc(w.type)}</b><span>甲「${esc(w.branches.a.name)}」${esc(w.branches.a.text)}　乙「${esc(w.branches.b.name)}」${esc(w.branches.b.text)}</span></li>`,
    ).join("");
    rules.innerHTML = `
      <div class="rules-in">
        <button class="close" data-act="rules">关闭</button>
        <h2>一局里武器怎么成长</h2>
        <p class="lead">这一页说的就是游戏本体「套餐」的规则，数字直接读自本体的数值表，本体改了这里跟着变。开局三选一，之后能带的武器不限数量；捡到红包，<b>手上那把</b>升一级，最高 ${LEVELS.length} 级：3 级时在两条岔路里选一条，外形和打法一起改变，5 级解锁这条岔路的终极词条。击杀攒镬气，每升一级从小票里选一种调料，每种最多 ${RUN.spiceMax} 层。</p>
        <div class="cols">
          <section><h3>等级</h3><ul>${lv}</ul>
            <h3>弹药</h3><ul>${pools}<li><b>不吃弹药</b><span>${esc(free)}</span></li></ul></section>
          <section><h3>元素与状态</h3><ul>${el}</ul><h3>元素反应</h3><ul>${re}</ul></section>
          <section><h3>调料</h3>
            <h5>作用在武器上</h5><ul class="ins wide">${RANGE_SPICES.map(spice).join("")}</ul>
            <h5>作用在人和整局上</h5><ul class="ins wide">${OTHER_SPICES.map(spice).join("")}</ul></section>
        </div>
        <p class="foot">这些都可以在游戏的靶场里直接试：点顶部的「靶场 ↗」，带着现在这把武器进游戏本体——真实的街道、僵尸和画面，面板上能调等级、形态、全部十二种调料、弹药和僵尸，还能边玩边改数值。</p>
        <h2>还没做进游戏的设计</h2>
        <p class="lead">下面这些只是设计稿，本体和靶场里都没有。</p>
        <div class="cols">
          <section><h3>铭文</h3>${ins}</section>
          <section><h3>现有两把枪的岔路</h3><ul>${ex}</ul></section>
        </div>
      </div>`;
  }

  function render() {
    const s = lab.state;
    root.classList.toggle("solo", !!lab.solo);
    if (lab.solo) root.querySelector(".brand span").textContent = "军械展柜";
    root.classList.toggle("fp", s.mode === "fp");
    for (const b of root.querySelectorAll(".tabs button"))
      b.classList.toggle("on", b.dataset.mode === s.mode);
    renderList();
    renderCard();
    const c = lab.combat;
    if (c) {
      for (const b of root.querySelectorAll("#seg-target button"))
        b.classList.toggle("on", b.dataset.target === c.targets.mode);
    }
    const meal = lab.meal;
    if (meal) {
      for (const b of root.querySelectorAll("#seg-ammo button"))
        b.classList.toggle("on", b.dataset.ammo === meal.ammo);
      for (const b of root.querySelectorAll("#seg-spice button")) {
        const sp = RANGE_SPICES.find((x) => x.id === b.dataset.spice);
        const n = meal.level(sp.id);
        b.classList.toggle("on", n > 0);
        b.querySelector("i").textContent = n || "";
        b.title = `${tr("run.spice." + sp.id)} ${n} / ${RUN.spiceMax} 层${n ? "：" + spiceLine(sp, n) : "（下一层：" + spiceLine(sp, 1) + "）"}`;
      }
    }
    $("btn-hands").classList.toggle("on", !!s.hands);
    $("btn-hands").hidden = s.mode === "fp";
    $("btn-demo").hidden = s.mode === "fp";
    $("tip").textContent = s.mode === "show" ? "拖动旋转 · 滚轮缩放" : "";
  }
  lab.listeners.add(render);

  // ---------------------------------------------------------------- the range is the game
  // The firing range is not in the lab: it is the game itself (src/chinatown/range.js), on
  // its own street with its own dead. This opens it with the weapon on show, in its form and
  // level, and the seasonings set on the bench. Which game: ?game=<address> if given, the dev
  // server beside this lab if one answers, the published game otherwise.
  const PUBLISHED = "https://wok-ing-dead.vercel.app/";
  const DEV = "http://127.0.0.1:5173/";
  function rangeQuery() {
    const s = lab.state;
    const q = [`range=1`, `w=${s.weapon}`, `lv=${s.level}`];
    if (s.level >= 3 && s.branch !== "base") q.push(`b=${s.branch}`);
    const spice = lab.meal ? Object.entries(lab.meal.spice) : [];
    if (spice.length)
      q.push("spice=" + spice.map(([id, lv]) => `${id}:${lv}`).join(","));
    if (lab.meal && lab.meal.ammo === "meal") q.push("ammo=meal");
    return q.join("&");
  }
  async function openRange() {
    let base = new URLSearchParams(location.search).get("game");
    if (!base && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
      try {
        await fetch(DEV, { mode: "no-cors", signal: AbortSignal.timeout(900) });
        base = DEV;
      } catch {}
    }
    const url = (base || PUBLISHED) + "?" + rangeQuery();
    lab.rangeUrl = url; // (for the tests: where the click was about to go)
    if (!lab.noNavigate) location.href = url;
  }

  // ---------------------------------------------------------------- actions
  const order = () => WEAPONS.filter((w) => lab.has(w.id)).map((w) => w.id);
  const actions = {
    weapon(id) {
      lab.select(id);
    },
    cycle(d) {
      const o = order();
      const i = o.indexOf(lab.state.weapon);
      lab.select(o[(i + d + o.length) % o.length]);
    },
    branch(b) {
      lab.setBranch(b);
    },
    level(lv) {
      if (lv < 3)
        lab.state.branchKeep =
          lab.state.branch !== "base" ? lab.state.branch : lab.state.branchKeep;
      lab.setLevel(lv);
    },
    mode(m) {
      lab.setMode(m);
    },
  };
  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const d = t.dataset;
    if (d.w) actions.weapon(d.w);
    else if (d.b) actions.branch(d.b);
    else if (d.lv) actions.level(+d.lv);
    else if (d.mode) actions.mode(d.mode);
    else if (d.target && lab.combat) {
      lab.combat.targets.setMode(d.target);
      render();
    } else if (d.spice && lab.meal) lab.meal.cycle(d.spice);
    else if (d.ammo && lab.meal) lab.meal.setAmmo(d.ammo);
    else if (d.act === "range") openRange();
    else if (d.act === "reset" && lab.combat) lab.combat.resetMeter();
    else if (d.act === "hands") lab.setHands(!lab.state.hands);
    else if (d.act === "sound") {
      lab.audio.setMuted(!lab.audio.muted);
      $("btn-sound").classList.toggle("on", !lab.audio.muted);
    } else if (d.act === "demo") {
      // the point of the demo is how the hands work the weapon
      if (!lab.state.hands) lab.setHands(true);
      lab.playDemo();
    } else if (d.act === "rules") {
      if (rules.hidden) renderRules();
      rules.hidden = !rules.hidden;
    }
    t.blur();
  });
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.code;
    if (k === "Digit1") actions.branch("base");
    else if (k === "Digit2") actions.branch("a");
    else if (k === "Digit3") actions.branch("b");
    else if (k === "KeyQ") actions.cycle(-1);
    else if (k === "KeyE") actions.cycle(1);
    else if (k === "Minus") actions.level(Math.max(1, lab.state.level - 1));
    else if (k === "Equal") actions.level(Math.min(5, lab.state.level + 1));
    else if (k === "Tab") {
      e.preventDefault();
      actions.mode(lab.state.mode === "fp" ? "show" : "fp");
    } else if (k === "Escape" && !rules.hidden) rules.hidden = true;
  });

  // ---------------------------------------------------------------- HUD
  const pend = new Map(); // zombie -> accumulated stream / dot damage
  let flush = 0;
  function number(at, text, cls) {
    const v = at.clone().project(lab.stage.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return;
    const n = document.createElement("span");
    n.className = "num " + cls;
    n.textContent = text;
    n.style.left =
      ((v.x * 0.5 + 0.5) * 100 + (Math.random() - 0.5) * 2.4).toFixed(2) + "%";
    n.style.top =
      ((-v.y * 0.5 + 0.5) * 100 - 2 + (Math.random() - 0.5) * 2).toFixed(2) +
      "%";
    nums.appendChild(n);
    n.addEventListener("animationend", () => n.remove());
    while (nums.childElementCount > 70) nums.firstChild.remove();
  }
  function damage(ev) {
    if (ev.text) return number(ev.at, ev.text, "status " + ev.element);
    if (ev.kind === "stream" || ev.kind === "dot" || ev.kind === "share") {
      const p = pend.get(ev.z) || { d: 0, el: ev.element, at: ev.at };
      p.d += ev.dmg;
      p.el = ev.element;
      p.at = ev.at;
      pend.set(ev.z, p);
      return;
    }
    number(ev.at, ev.dmg, (ev.head ? "head " : "") + ev.element);
  }
  function hudFrame() {
    requestAnimationFrame(hudFrame);
    const c = lab.combat;
    if (!c || lab.state.mode !== "fp") return;
    const w = c.weapon;
    if (!w) return;
    const now = performance.now();
    if (now - flush > 280) {
      flush = now;
      for (const [, p] of pend)
        if (p.d >= 1) number(p.at, Math.round(p.d), "tick " + p.el);
      pend.clear();
    }
    const def = w.def;
    const b = w.branch;
    const mag = w.spec.mag;
    $("ammo-n").innerHTML =
      w.spec.kind === "melee"
        ? "—"
        : w.reload >= 0
          ? `<small>装填</small>`
          : `${Math.ceil(w.rounds)}<small>/ ${mag}</small>`;
    $("ammo-w").textContent =
      `${def.name}${b !== "base" ? " · " + def.branches[b].name : ""}　${w.level} 级`;
    // the pool this weapon draws on: what is left of it when the range plays by the run's
    // ammunition, and what has been fired off either way
    const p = lab.meal && lab.meal.of(w);
    $("ammo-p").textContent = !p
      ? "不吃弹药"
      : lab.meal.ammo === "meal"
        ? `${ammoName(p.type)} ${Math.floor(p.have)} / ${p.cap}`
        : `${ammoName(p.type)} · 每发 ${num(p.per)}`;
    $("m-spent-k").textContent = p ? `耗${ammoName(p.type)}` : "耗弹";
    $("m-spent").textContent = p ? Math.round(c.meter.spent * p.per) : "—";
    $("ammo-bar").style.width =
      (w.spec.kind === "melee"
        ? 100
        : w.reload >= 0
          ? w.reload * 100
          : (w.rounds / mag) * 100
      ).toFixed(1) + "%";
    const charge =
      w.charge > 0
        ? `<i style="width:${(w.charge * 100).toFixed(0)}%"></i>`
        : "";
    $("alt").innerHTML =
      (c.hint() ? `<span>${esc(c.hint())}</span>` : "") +
      (charge ? `<div class="charge">${charge}</div>` : "");
    $("note").textContent = c.note;
    $("m-dps").textContent = Math.round(c.dps);
    $("m-total").textContent = Math.round(c.meter.total);
    $("m-kills").textContent = c.meter.kills;
    $("m-taken").textContent = Math.round(c.meter.taken);
    $("lock").hidden = c.locked;
    hud.classList.toggle("zoom", lab.stage.zoomNow > 1.6);
    hud.classList.toggle("melee", w.spec.kind === "melee");
  }
  requestAnimationFrame(hudFrame);

  render();
  // a zombie got through: flash the edges of the screen
  function hurt() {
    hud.classList.remove("hurt");
    void hud.offsetWidth;
    hud.classList.add("hurt");
  }
  return { render, damage, hurt };
}
