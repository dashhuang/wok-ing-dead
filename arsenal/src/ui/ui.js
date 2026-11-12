// Interface of the weapon lab: weapon list, the upgrade card (levels, the two forks, capstones),
// the rules drawer, and the firing-range HUD (crosshair, ammunition, damage numbers, DPS meter).
// Everything is rendered from data/weapons.js so the lab and the design document cannot drift apart.
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

function statLine(w) {
  const f = w.fire;
  const out = [];
  if (f.kind === "melee") {
    out.push(
      ["伤害", f.damage],
      ["攻速", `${f.rpm}/分`],
      ["范围", `${f.reach} 米`],
    );
    if (f.combo) out.push(["连段", f.combo]);
  } else if (f.kind === "stream") {
    out.push(
      ["伤害", `${f.damage}×${f.tick}/秒`],
      ["射程", `${f.range} 米`],
      ["燃料", w.mag],
    );
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
      ["射速", `${f.rpm}/分`],
      ["弹匣", w.mag === Infinity ? "∞" : w.mag],
    );
    if (f.range) out.push(["射程", `${f.range} 米`]);
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
        <button data-mode="fp">靶场</button>
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
      <div class="ammo"><div class="ammo-n" id="ammo-n"></div><div class="ammo-w" id="ammo-w"></div><div class="ammo-bar"><i id="ammo-bar"></i></div></div>
      <div class="alt" id="alt"></div>
      <div class="note" id="note"></div>
      <div class="meter">
        <div><span>每秒伤害</span><b id="m-dps">0</b></div>
        <div><span>累计</span><b id="m-total">0</b></div>
        <div><span>击杀</span><b id="m-kills">0</b></div>
        <div><span>受伤</span><b id="m-taken">0</b></div>
        <button class="ghost" data-act="reset">清零</button>
      </div>
      <div class="range-opts">
        <div class="seg" id="seg-target"><span>靶子</span><button data-target="stand">站桩</button><button data-target="advance">逼近</button><button data-target="horde" title="按游戏本体的僵尸血量、速度和伤害成群涌来">尸潮</button></div>
        <div class="seg" id="seg-infuse"><span>铭文附魔</span>
          <button data-infuse="fire" title="炎：每 4 次命中叠 1 层灼烧">炎</button>
          <button data-infuse="shock" title="霆：每 4 次命中感电">霆</button>
          <button data-infuse="venom" title="蚀：每 3 次命中叠 1 层蚀骨">蚀</button>
          <button data-infuse="seal" title="敕：爆头叠 1 层镇压">敕</button>
        </div>
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
          <b>${esc(w.name)}</b><span>${esc(w.type)}</span><em>${esc(w.slot)}</em></button>`;
      }
    }
    html += `<h4>现有<small>已在游戏里，只设计了岔路</small></h4>`;
    for (const w of EXISTING)
      html += `<button class="item" disabled><i class="dot"></i><b>${esc(w.name)}</b><span>${esc(w.type)}</span><em>${esc(w.slot)}</em></button>`;
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
    const stats = statLine(w)
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
        <div class="cls">${esc(CLASSES[w.cls].name)} · ${esc(w.slot)}武器 · ${esc(KIND[w.fire.kind])}</div>
        <h1>${esc(w.name)}</h1>
        <div class="type">${esc(w.type)}${el.name !== "无" ? `<i style="color:${hex(el.color)}">　${esc(el.name)} · ${esc(el.status)}</i>` : ""}</div>
        <p class="tag">${esc(w.tagline)}</p>
      </div>
      <div class="stats">${stats}</div>
      <div class="sec">局内升级<small>拾到同名武器或在摊位强化时升一级</small></div>
      <div class="pips">${pips}</div>
      <div class="lvnote"><b>${lv.lv} 级 · ${esc(lv.name)}</b>　伤害 ×${lv.dmg}　铭文槽 ${lv.slots}　<span>${esc(lv.note)}</span></div>
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
        `<li><b>${l.lv} · ${esc(l.name)}</b><span>伤害 ×${l.dmg}，铭文槽 ${l.slots}。${esc(l.note)}</span></li>`,
    ).join("");
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
        <p class="lead">每局从一把副武器开始，沿路拾取或在摊位换购。武器在局内最多升到 5 级：3 级时在两条岔路里选一条，外形和打法一起改变；5 级解锁这条岔路的终极词条。铭文是通用的小改造，插进武器的铭文槽。</p>
        <div class="cols">
          <section><h3>等级</h3><ul>${lv}</ul></section>
          <section><h3>元素与状态</h3><ul>${el}</ul><h3>元素反应</h3><ul>${re}</ul></section>
          <section><h3>铭文</h3>${ins}</section>
        </div>
        <h3>现有两把枪的岔路</h3><ul>${ex}</ul>
        <p class="foot">靶场里已实现全部 12 把新武器的基础、甲、乙三种形态和四种状态、四种元素反应；铭文只接入了四种元素附魔（靶场右上角开关），其余铭文目前只有设计。</p>
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
      for (const b of root.querySelectorAll("#seg-infuse button"))
        b.classList.toggle("on", c.infuse.has(b.dataset.infuse));
    }
    $("btn-hands").classList.toggle("on", !!s.hands);
    $("btn-hands").hidden = s.mode === "fp";
    $("btn-demo").hidden = s.mode === "fp";
    $("tip").textContent = s.mode === "show" ? "拖动旋转 · 滚轮缩放" : "";
  }
  lab.listeners.add(render);

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
    } else if (d.infuse && lab.combat) {
      lab.combat.setInfuse(d.infuse, !lab.combat.infuse.has(d.infuse));
      render();
    } else if (d.act === "reset" && lab.combat) lab.combat.resetMeter();
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
