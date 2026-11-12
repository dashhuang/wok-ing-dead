// Run interface: the clock and course name, the wok-hei (experience) bar, seasoning chips,
// the boss bar, pickup toasts, the weapons carried and the four pools of ammunition, and the
// order tickets shown on a level-up (seasonings, a new weapon, or the fork of a weapon).
// Plain DOM next to the game's own HUD; all wording comes from the locale files.
import * as L10N from "../i18n/index.js";

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const mmss = (s) => {
  s = Math.max(0, Math.ceil(s));
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
};
const PIPS = (n, max) =>
  "<i></i>".repeat(Math.max(0, n)) +
  '<i class="off"></i>'.repeat(Math.max(0, max - n));

export function createRunHud(G) {
  const ui = document.getElementById("ui");
  const root = el("div", "rl");
  root.setAttribute("aria-hidden", "true");

  const clock = el(
    "div",
    "rl-clock",
    '<span class="rl-stage"></span><b class="rl-time">00:00</b><em class="rl-surge"></em>',
  );
  const stageEl = clock.querySelector(".rl-stage");
  const timeEl = clock.querySelector(".rl-time");
  const surgeEl = clock.querySelector(".rl-surge");

  const boss = el(
    "div",
    "rl-boss",
    '<span class="rl-boss-n"></span><div class="rl-boss-bar"><i></i></div>',
  );
  const bossName = boss.querySelector(".rl-boss-n");
  const bossFill = boss.querySelector(".rl-boss-bar i");

  const xp = el(
    "div",
    "rl-xp",
    '<span class="rl-xp-k"></span><div class="rl-xp-bar"><i></i></div><b class="rl-xp-n">1</b>',
  );
  const xpLabel = xp.querySelector(".rl-xp-k");
  const xpFill = xp.querySelector(".rl-xp-bar i");
  const xpLevel = xp.querySelector(".rl-xp-n");

  const spices = el("div", "rl-spices");
  const toasts = el("div", "rl-toasts");
  const weapons = el("div", "rl-weapons");
  const pools = el("div", "rl-pools");
  const cards = el(
    "div",
    "rl-cards",
    '<div class="rl-cards-h"><span></span><b class="rl-cards-s"></b></div><div class="rl-cards-bar"><i></i></div><div class="rl-cards-row"></div><p class="rl-cards-hint"></p>',
  );
  const cardsTitle = cards.querySelector(".rl-cards-h span");
  const cardsSecs = cards.querySelector(".rl-cards-s");
  const cardsBar = cards.querySelector(".rl-cards-bar i");
  const cardsRow = cards.querySelector(".rl-cards-row");
  const cardsHint = cards.querySelector(".rl-cards-hint");
  // while tickets are up the street darkens behind them: this is ordering, not fighting
  const veil = el("div", "rl-veil");

  root.append(clock, boss, spices, toasts, weapons, pools, xp, veil, cards);
  // directly after the game's HUD: it shows and hides with it (see .hud.on ~ .rl in the
  // stylesheet) and stays underneath the menus
  const hudRoot = G.hud && G.hud.root;
  if (hudRoot && hudRoot.parentNode === ui)
    ui.insertBefore(root, hudRoot.nextSibling);
  else ui.appendChild(root);

  // weapon level pips sit inside the game's own ammo block, under the weapon name
  const wlv = el("div", "rl-wlv");
  const ammoBlock = G.hud && G.hud.root && G.hud.root.querySelector(".h-ammo");
  const altLine = ammoBlock && ammoBlock.querySelector(".h-alt");
  if (ammoBlock) ammoBlock.insertBefore(wlv, altLine || null);

  const last = {
    time: "",
    stage: "",
    surge: "",
    xp: -1,
    level: -1,
    wlv: "",
    boss: -1,
    bossOn: null,
    spices: "",
    bar: -1,
    secs: -1,
    weapons: "",
    pools: "",
  };
  let live = []; // toasts: { el, life }
  let open = null; // { cards, onPick }
  let stageKey = "";
  let spiceList = [];
  let bossKey = "";
  let weaponList = [];
  let poolList = [];
  let onWeapon = null;
  let title = { key: "run.cards.title", varKeys: null };
  // keys in varKeys are looked up when the text is drawn, so a language change redraws them
  const fill = (vars, varKeys) => {
    const out = { ...(vars || {}) };
    for (const [k, key] of Object.entries(varKeys || {})) out[k] = L10N.t(key);
    return out;
  };

  function keyHint(i) {
    if (G.input && G.input.touch) return "";
    if (G.input && G.input.device === "pad")
      return "<kbd>" + ["←", "↑", "→"][i] + "</kbd>";
    return "<kbd>" + (i + 1) + "</kbd>";
  }
  function cardHtml(c, i) {
    const pips = c.max > 1 ? `<em>${PIPS(c.level, c.max)}</em>` : "";
    const tag = c.tagKey ? `<i class="rl-tag">${L10N.t(c.tagKey)}</i>` : "";
    return (
      keyHint(i) +
      `<b>${tag}${L10N.t(c.nameKey)}</b>${pips}<span>${L10N.t(c.descKey, fill(c.vars, c.varKeys))}</span>` +
      (c.recommended ? `<u>${L10N.t("run.cards.rec")}</u>` : "")
    );
  }
  function drawCards() {
    if (!open) return;
    cardsTitle.textContent = L10N.t(title.key, fill(null, title.varKeys));
    const how =
      G.input && G.input.touch
        ? "touch"
        : G.input && G.input.device === "pad"
          ? "pad"
          : "keys";
    cardsHint.textContent = L10N.t("run.cards.hint." + how);
    cardsRow.innerHTML = "";
    open.cards.forEach((c, i) => {
      const b = el(
        "button",
        "rl-card" + (c.recommended ? " rec" : "") + " k-" + (c.kind || "spice"),
        cardHtml(c, i),
      );
      b.dataset.i = String(i);
      cardsRow.appendChild(b);
    });
  }
  // taps (touch) and clicks (unlocked mouse); keys and the pad are read by run.js
  cards.addEventListener("click", (ev) => {
    const b = ev.target.closest(".rl-card");
    if (!b || !open) return;
    ev.preventDefault();
    open.onPick(+b.dataset.i);
  });
  const swallow = (ev) => {
    if (ev.target.closest(".rl-card")) ev.stopPropagation();
  };
  cards.addEventListener("touchstart", swallow, { passive: true });
  cards.addEventListener("mousedown", swallow);

  function drawWeapons() {
    const key =
      weaponList
        .map((w) => w.id + w.level + (w.cur ? "c" : "") + (w.ok ? "" : "x"))
        .join(",") + L10N.locale();
    if (key === last.weapons) return;
    last.weapons = key;
    const touch = G.input && G.input.touch;
    let html = "";
    let group = -1;
    for (const w of weaponList) {
      if (w.group !== group) {
        if (group >= 0) html += "</span>";
        group = w.group;
        // keys have numbers; a phone has no keys, and no room for the row of pools either,
        // so there each group is headed by what is left of its ammunition
        const pool = touch && w.ammo && poolList.find((p) => p.type === w.ammo);
        html += `<span class="rl-wg">${
          touch
            ? pool
              ? `<em class="rl-wg-n a-${w.ammo}${pool.have <= 0 ? " dry" : ""}" data-pool="${w.ammo}">${pool.have}</em>`
              : ""
            : `<kbd>${group}</kbd>`
        }`;
      }
      html += `<button class="rl-w${w.cur ? " cur" : ""}${w.ok ? "" : " dry"} a-${w.ammo || "none"}" data-w="${w.id}"><b>${L10N.t("weapon." + w.id + ".s")}</b><sup>${w.level}</sup></button>`;
    }
    if (group >= 0) html += "</span>";
    weapons.innerHTML = html;
  }
  weapons.addEventListener("click", (ev) => {
    const b = ev.target.closest(".rl-w");
    if (!b || !onWeapon) return;
    ev.preventDefault();
    onWeapon(b.dataset.w);
  });
  weapons.addEventListener(
    "touchstart",
    (ev) => {
      if (ev.target.closest(".rl-w")) ev.stopPropagation();
    },
    { passive: true },
  );
  function drawPools() {
    const key =
      poolList
        .map((p) => p.type + p.have + "/" + p.cap + (p.cur ? "c" : ""))
        .join(",") + L10N.locale();
    if (key === last.pools) return;
    last.pools = key;
    pools.innerHTML = poolList
      .map(
        (p) =>
          `<span class="rl-pool a-${p.type}${p.cur ? " cur" : ""}${p.have <= 0 ? " dry" : ""}"><b>${L10N.t("run.ammo." + p.type + ".s")}</b><em>${p.have}</em><i style="--f:${Math.max(0, Math.min(1, p.have / Math.max(1, p.cap))).toFixed(3)}"></i></span>`,
      )
      .join("");
    // (touch) the same numbers at the head of each group of the weapon bar
    for (const el of weapons.querySelectorAll("[data-pool]")) {
      const p = poolList.find((q) => q.type === el.dataset.pool);
      if (!p) continue;
      el.textContent = p.have;
      el.classList.toggle("dry", p.have <= 0);
    }
  }
  function drawSpices() {
    const key = spiceList.map((s) => s.id + s.level).join(",") + L10N.locale();
    if (key === last.spices) return;
    last.spices = key;
    spices.innerHTML = spiceList
      .map(
        (s) =>
          `<span class="rl-chip"><b>${L10N.t("run.spice." + s.id)}</b><em>${PIPS(s.level, s.max)}</em></span>`,
      )
      .join("");
  }

  const api = {
    root,
    show(on) {
      root.classList.toggle("on", !!on);
    },
    // secondsLeft < 0 hides the clock (boss fight and after)
    setClock(secondsLeft, stage, surgeLeft) {
      const t = secondsLeft >= 0 ? mmss(secondsLeft) : "";
      if (t !== last.time) {
        last.time = t;
        timeEl.textContent = t;
        clock.classList.toggle("late", secondsLeft >= 0 && secondsLeft < 30);
      }
      if (stage !== last.stage) {
        last.stage = stage;
        stageKey = stage;
        stageEl.textContent = stage ? L10N.t("run.stage." + stage) : "";
        clock.classList.remove("flash");
        void clock.offsetWidth;
        clock.classList.add("flash");
      }
      const s = surgeLeft > 0 ? String(Math.ceil(surgeLeft)) : "";
      if (s !== last.surge) {
        last.surge = s;
        surgeEl.textContent = s ? L10N.t("run.surge.badge", { s }) : "";
        clock.classList.toggle("surge", !!s);
      }
    },
    setXp(frac, level) {
      const f = Math.round(Math.max(0, Math.min(1, frac)) * 200) / 200;
      if (f !== last.xp) {
        last.xp = f;
        xpFill.style.transform = `scaleX(${f})`;
      }
      if (level !== last.level) {
        last.level = level;
        xpLevel.textContent = String(level);
        xpLabel.textContent = L10N.t("run.xp");
        xp.classList.remove("up");
        void xp.offsetWidth;
        xp.classList.add("up");
      }
    },
    setSpices(list) {
      spiceList = list;
      drawSpices();
    },
    /** list: [{ id, group, level, ammo, cur, ok }] in the order they should stand. */
    setWeapons(list, pick) {
      weaponList = list;
      onWeapon = pick || onWeapon;
      drawWeapons();
    },
    /** list: [{ type, have, cap, cur }] */
    setPools(list) {
      poolList = list;
      drawPools();
    },
    setWeaponLevel(level, max) {
      const key = level + "/" + max;
      if (key === last.wlv) return;
      last.wlv = key;
      wlv.innerHTML = level > 0 ? PIPS(level, max) : "";
    },
    // info: null or { key, frac }
    setBoss(info) {
      const on = !!info;
      if (on !== last.bossOn) {
        last.bossOn = on;
        boss.classList.toggle("on", on);
      }
      if (!on) return;
      if (info.key !== bossKey) {
        bossKey = info.key;
        bossName.textContent = L10N.t(info.key);
      }
      const f = Math.round(Math.max(0, Math.min(1, info.frac)) * 250) / 250;
      if (f !== last.boss) {
        last.boss = f;
        bossFill.style.transform = `scaleX(${f})`;
      }
    },
    /** o.titleKey / o.titleVarKeys: the heading above the tickets (default: "add to order"). */
    openCards(list, onPick, o = {}) {
      open = { cards: list, onPick };
      title = {
        key: o.titleKey || "run.cards.title",
        varKeys: o.titleVarKeys || null,
      };
      last.bar = -1;
      last.secs = -1;
      cardsSecs.textContent = "";
      drawCards();
      cards.classList.toggle("two", list.length === 2);
      cards.classList.remove("out");
      cards.classList.add("on");
      root.classList.add("pick");
    },
    /** frac: share of the time left (for the bar); secs: seconds left (for the count) */
    setCardTime(frac, secs) {
      const f = Math.round(Math.max(0, Math.min(1, frac)) * 100) / 100;
      if (f !== last.bar) {
        last.bar = f;
        cardsBar.style.transform = `scaleX(${f})`;
      }
      const n = secs == null ? -1 : Math.max(0, Math.ceil(secs));
      if (n !== last.secs) {
        last.secs = n;
        cardsSecs.textContent = n < 0 ? "" : String(n);
        cards.classList.toggle("hurry", n >= 0 && n <= 3);
      }
    },
    closeCards(picked) {
      if (!open) return;
      const btn = cardsRow.children[picked];
      if (btn) btn.classList.add("picked");
      open = null;
      cards.classList.add("out");
      root.classList.remove("pick");
      setTimeout(() => {
        if (!open) cards.classList.remove("on");
        cards.classList.remove("out");
      }, 260);
    },
    get cardsOpen() {
      return !!open;
    },
    toast(html, kind = "") {
      const t = el("div", "rl-toast " + kind, html);
      toasts.appendChild(t);
      live.push({ el: t, life: 2.6 });
      while (live.length > 4) live.shift().el.remove();
    },
    reset() {
      for (const t of live) t.el.remove();
      live = [];
      open = null;
      cards.classList.remove("on", "out", "hurry");
      root.classList.remove("pick");
      api.setBoss(null);
      api.setSpices([]);
      api.setWeapons([]);
      api.setPools([]);
      last.stage = "";
      last.time = "";
      last.level = -1;
      last.xp = -1;
      last.wlv = "";
    },
    // real seconds
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const t = live[i];
        t.life -= dt;
        if (t.life <= 0) {
          t.el.remove();
          live.splice(i, 1);
        } else if (t.life < 0.5 && !t.out) {
          t.out = true;
          t.el.classList.add("out");
        }
      }
    },
    relocalize() {
      stageEl.textContent = stageKey ? L10N.t("run.stage." + stageKey) : "";
      xpLabel.textContent = L10N.t("run.xp");
      if (bossKey) bossName.textContent = L10N.t(bossKey);
      last.surge = "";
      last.spices = "";
      last.weapons = "";
      last.pools = "";
      drawSpices();
      drawWeapons();
      drawPools();
      drawCards();
    },
  };
  L10N.onLocale(() => api.relocalize());
  if (G.events && G.events.on)
    G.events.on("input:device", () => {
      drawCards();
      last.weapons = "";
      drawWeapons();
    });
  // the game's own "other weapon" line under the ammo count has no place in a run
  api.setRunLayout = (on) => {
    if (hudRoot) hudRoot.classList.toggle("in-run", !!on);
  };
  let noMag = null;
  api.setNoMag = (on) => {
    if (on === noMag) return;
    noMag = on;
    if (hudRoot) hudRoot.classList.toggle("no-mag", !!on);
  };
  xpLabel.textContent = L10N.t("run.xp");
  return api;
}
