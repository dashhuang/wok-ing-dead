// The game's zombies as seen by the arsenal's weapons.
// arsenal/src/combat/targets.js is the firing range's stand-in for the dead; this module offers
// the same surface (raycast, inSphere, inCone, nearest, damage, apply, pin, scare, update) on
// top of src/chinatown/zombies.js, and owns the four status effects and their reactions:
//   fire  灼烧: burns over time, stacks to 5, spreads when the host dies
//   shock 感电: the next hit arcs to two more
//   venom 蚀骨: +8% damage taken per stack, leaves a cloud
//   seal  镇压: three stacks pin the zombie in place for three seconds
//   fire + venom = 爆燃, shock + venom = 导电雾, seal + fire = 焚符, seal + shock = 引雷
// Each zombie gets a companion object ("mark") carrying what the weapons need to know.

const BURN_DPS = 6; // per stack
const BURN_TIME = 4;
const SHOCK_TIME = 6;
const SEAL_TIME = 8;
const PIN_TIME = 3;
const VENOM_TIME = 8;
const RADIUS = { walker: 0.3, brute: 0.38 };

export function createGameTargets(G, lab, fx, E, root, fxApi) {
  const T = G.THREE;
  const V3 = T.Vector3;
  const { C, rand, srand } = fxApi;
  const _a = new V3(),
    _b = new V3(),
    _c = new V3(),
    _d = new V3();
  const listeners = { damage: [], kill: [], attack: [] };
  const list = []; // marks of the zombies alive this frame
  let clock = 0;
  let killBy = null; // options of the hit being dealt right now, for the death that may follow

  // ---- forehead talismans (seal stacks), shared geometry and material
  const paperTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 160;
    const g = c.getContext("2d");
    g.fillStyle = "#d9b23c";
    g.fillRect(0, 0, 64, 160);
    g.strokeStyle = g.fillStyle = "#a01208";
    g.lineWidth = 2;
    g.strokeRect(4, 4, 56, 152);
    g.font = '700 26px "Noto Serif TC","Songti SC",serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("敕", 32, 24);
    g.fillText("令", 32, 52);
    g.lineWidth = 3.5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(32, 70);
    for (let i = 0; i < 6; i++)
      g.quadraticCurveTo(i % 2 ? 14 : 50, 76 + i * 12, 32, 82 + i * 12);
    g.stroke();
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  })();
  const paperGeo = new T.PlaneGeometry(0.075, 0.2).translate(0, -0.085, 0);
  const paperMat = new T.MeshStandardMaterial({
    map: paperTex,
    side: T.DoubleSide,
    roughness: 0.8,
    emissive: 0xffb030,
    emissiveIntensity: 0.06,
    emissiveMap: paperTex,
  });
  // one sheet waits under the street so its shader is ready before the first seal
  const warm = new T.Mesh(paperGeo, paperMat);
  warm.position.set(0, -300, 0);
  root.add(warm);

  function markOf(gz) {
    if (gz.mark) return gz.mark;
    const holder = new T.Group(); // nails and bolts stick here; follows the body
    holder.name = "stuck";
    root.add(holder);
    const m = {
      gz,
      get id() {
        return gz.id;
      },
      get type() {
        return gz.type;
      },
      get alive() {
        return gz.alive && gz.active;
      },
      get hp() {
        return gz.hp;
      },
      set hp(v) {
        gz.hp = v;
      },
      get maxHp() {
        return gz.maxHp;
      },
      get scale() {
        return gz.scale;
      },
      get radius() {
        return (RADIUS[gz.type] || 0.3) * Math.max(1, gz.scale);
      },
      get height() {
        return 1.75 * gz.scale;
      },
      // a weapon's stagger is the zombie's own flinch timer (heavies shrug most of it off)
      get stagger() {
        return Math.max(0, gz.staggerT);
      },
      set stagger(v) {
        gz.staggerT = Math.max(gz.staggerT, gz.type === "brute" ? v * 0.4 : v);
      },
      pos: gz.pos,
      vel: new V3(), // knock-back asked for this frame; handed to the zombie in update()
      headPos: new V3(),
      chest: new V3(),
      feet: new V3(),
      holder,
      papers: null,
      lift: 0,
      liftV: 0,
      pin: 0,
      pinKind: "",
      fear: 0,
      flash: 0,
      mark: 0,
      burnAcc: 0,
      stuck: [],
      links: new Set(),
      st: {
        burn: 0,
        burnT: 0,
        shock: 0,
        venom: 0,
        venomT: 0,
        seal: 0,
        sealT: 0,
      },
      serial: -1,
    };
    gz.mark = m;
    return m;
  }
  // a pooled body that has come back as someone else starts clean
  function fresh(m) {
    const gz = m.gz;
    if (m.serial === gz.id) return m;
    m.serial = gz.id;
    Object.assign(m.st, {
      burn: 0,
      burnT: 0,
      shock: 0,
      venom: 0,
      venomT: 0,
      seal: 0,
      sealT: 0,
    });
    m.lift = m.liftV = m.pin = m.fear = m.flash = m.mark = m.burnAcc = 0;
    m.pinKind = "";
    m.vel.set(0, 0, 0);
    for (const s of m.stuck) s.parent && s.parent.remove(s);
    m.stuck.length = 0;
    m.links.clear();
    if (m.papers) for (const p of m.papers) p.visible = false;
    return m;
  }
  const mk = (gz) => fresh(markOf(gz));

  function refresh(m) {
    const gz = m.gz;
    const p = gz.pos;
    m.feet.set(p.x, p.y + m.lift + 0.1, p.z);
    m.chest.set(p.x, p.y + m.lift + m.height * 0.68, p.z);
    if (gz.P && gz.P.head) {
      m.headPos.copy(gz.P.head);
      m.headPos.y += 0.07 * gz.scale;
    } else m.headPos.set(p.x, p.y + m.lift + m.height * 0.93, p.z);
    m.holder.position.set(p.x, p.y + m.lift, p.z);
    m.holder.rotation.y = gz.yaw;
  }
  function papersOf(m) {
    if (m.papers) return m.papers;
    m.papers = [];
    const g = new T.Group();
    for (let i = 0; i < 3; i++) {
      const p = new T.Mesh(paperGeo, paperMat);
      p.rotation.z = (i - 1) * 0.32;
      p.position.set((i - 1) * 0.035, 0, 0.002 * i);
      p.visible = false;
      g.add(p);
      m.papers.push(p);
    }
    m.paperRoot = g;
    root.add(g);
    return m.papers;
  }
  const say = (m, text, element) => {
    for (const f of listeners.damage)
      f({ z: m, dmg: 0, at: m.headPos, text, element, kind: "status" });
  };

  const hitOut = {
    dist: 0,
    point: new V3(),
    normal: new V3(),
    enemy: null,
    part: "body",
  };
  const api = {
    list,
    root,
    of: mk,
    on(ev, fn) {
      listeners[ev].push(fn);
    },
    setLayout() {},
    setMode() {},
    alive() {
      return list.filter((m) => m.alive);
    },
    /** First zombie along a ray: { z, dist, point, head, part } or null. `skip`: Set of marks to pass through. */
    raycast(o, d, max = 300, skip = null) {
      let best = null;
      hitOut.dist = max;
      hitOut.enemy = null;
      for (const gz of G.enemies.list) {
        if (!gz.alive) continue;
        if (skip && gz.mark && skip.has(gz.mark)) continue;
        const sc = gz.scale > 1.3 ? gz.scale : 1;
        _a.set(gz.pos.x - o.x, gz.pos.y + 0.9 * sc - o.y, gz.pos.z - o.z);
        const along = _a.dot(d);
        if (along < -1.5 * sc || along > max + 1.5 * sc) continue;
        if (_a.lengthSq() - along * along > 2.6 * sc * sc) continue;
        if (gz._raycast(o, d, max, hitOut)) best = gz;
      }
      if (!best) return null;
      return {
        z: mk(hitOut.enemy),
        dist: hitOut.dist,
        head: hitOut.part === "weak",
        part: hitOut.part,
        point: hitOut.point.clone(),
      };
    },
    inSphere(p, r, skip = null) {
      const out = [];
      for (const m of list) {
        if (!m.alive || (skip && skip.has(m))) continue;
        const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
        if (d <= r + m.radius && Math.abs(m.chest.y - p.y) < r + 1.2)
          out.push({ z: m, dist: d });
      }
      return out.sort((a, b) => a.dist - b.dist);
    },
    /** Zombies inside a cone from o along d (half angle in radians). */
    inCone(o, d, range, half) {
      const out = [];
      const cos = Math.cos(half);
      for (const m of list) {
        if (!m.alive) continue;
        _a.subVectors(m.chest, o);
        const dist = _a.length();
        if (dist > range + m.radius) continue;
        const ang = Math.atan2(m.radius + 0.25, Math.max(0.5, dist));
        const c = _a.dot(d) / Math.max(1e-4, dist);
        if (c >= Math.cos(half + ang) || c >= cos) out.push({ z: m, dist });
      }
      return out.sort((a, b) => a.dist - b.dist);
    },
    nearest(p, r, skip = null) {
      const l = api.inSphere(p, r, skip);
      return l.length ? l[0].z : null;
    },

    /**
     * damage(z, amount, { dir, point, head, element, kind, knock, lift, stagger, noChain, blood, pinBonus })
     * Returns true when this hit killed the target.
     */
    damage(m, amount, o = {}) {
      if (!m.alive) return false;
      const gz = m.gz;
      let dmg = amount;
      if (m.st.venom > 0) dmg *= 1 + 0.08 * m.st.venom;
      if (m.pin > 0 && m.pinKind === "seal" && o.head) dmg *= 1.5;
      if (m.pin > 0 && m.pinKind === "nail" && o.pinBonus) dmg *= o.pinBonus;
      dmg = Math.max(1, Math.round(dmg));
      m.flash = 1;
      const at = o.point || m.chest;
      for (const f of listeners.damage)
        f({
          z: m,
          dmg,
          at,
          head: !!o.head,
          element: o.element || "none",
          kind: o.kind || "hit",
        });
      const direct = !!o.dir && o.kind !== "dot";
      if (direct) {
        const k = (o.knock || 0) * (gz.type === "brute" ? 0.35 : 1);
        if (k > 0 && m.pin <= 0)
          m.vel.addScaledVector(
            _b.set(o.dir.x, 0, o.dir.z).normalize(),
            k * 4.2,
          );
        if (o.lift && m.pin <= 0)
          m.liftV = Math.max(m.liftV, o.lift * (gz.type === "brute" ? 0.5 : 1));
        if ((o.stagger || k > 0.6) && m.pin <= 0) m.stagger = o.stagger || 0.35;
      }
      // 感电: the next hit arcs to nearby targets
      const chain = m.st.shock > 0 && !o.noChain && o.kind !== "dot";
      if (chain) m.st.shock = 0;
      killBy = o;
      const part = o.head ? "weak" : "body";
      // the zombie applies its own part multipliers; a weapon has already done its sums
      const killed =
        gz.damage(dmg, o.point || null, direct ? o.dir : null, part) === true;
      killBy = null;
      // the game's own feedback: hit marker, blood and the sound of it landing
      if (o.kind !== "dot" && o.kind !== "share") {
        G.events.emit("player:hitEnemy", {
          enemy: gz,
          part,
          killed,
          weak: !!o.head,
          spread:
            o.kind === "blast" || o.kind === "chain" || o.kind === "react",
          armory: true,
        });
        if (direct && o.blood !== false)
          G.events.emit("impact", {
            point: at,
            normal: _c.copy(o.dir).negate(),
            dist: 0,
            surface: "enemy",
            enemy: gz,
            part,
            dir: o.dir,
            from: "player",
            killed,
          });
      }
      if (chain) {
        let from = m;
        const seen = new Set([m]);
        for (let i = 0; i < 2; i++) {
          const n = api.nearest(from.pos, 5, seen);
          if (!n) break;
          seen.add(n);
          fx.bolt(from.chest, n.chest, { width: 0.08, life: 0.16 });
          fx.glow({
            pos: n.chest,
            life: 0.12,
            size: [0.2, 0.9],
            color: E.PAL.shock.core,
            type: fx.P.STAR,
            fadePow: 1,
          });
          fx.flash(n.chest, 0x6fd8ff, 22, 0.12, 7);
          api.damage(n, amount * 0.6, {
            dir: _c.subVectors(n.chest, from.chest).normalize().clone(),
            element: "shock",
            noChain: true,
            blood: false,
            kind: "chain",
          });
          from = n;
        }
      }
      return killed;
    },
    /** apply(z, "fire" | "shock" | "venom" | "seal", stacks = 1) */
    apply(m, element, stacks = 1) {
      if (!m.alive) return;
      const s = m.st;
      const sealed = s.seal > 0 || (m.pin > 0 && m.pinKind === "seal");
      if (element === "fire") {
        if (sealed) return react(m, "焚符");
        if (s.venom > 0) return react(m, "爆燃");
        s.burn = Math.min(5, s.burn + stacks);
        s.burnT = BURN_TIME;
      } else if (element === "shock") {
        if (sealed) return react(m, "引雷");
        if (s.venom > 0) react(m, "导电雾");
        s.shock = SHOCK_TIME;
      } else if (element === "venom") {
        if (s.burn > 0) return react(m, "爆燃");
        s.venom = Math.min(5, s.venom + stacks);
        s.venomT = VENOM_TIME;
        if (s.shock > 0) react(m, "导电雾");
      } else if (element === "seal") {
        if (m.pin > 0 && m.pinKind === "seal") {
          m.pin = Math.max(m.pin, PIN_TIME * 0.6);
          return;
        }
        s.seal = Math.min(3, s.seal + stacks);
        s.sealT = SEAL_TIME;
        E.seal(m.headPos, { size: 0.6, scraps: 2 });
        if (s.seal >= 3) api.pin(m, PIN_TIME, "seal");
      }
    },
    /** Hold a zombie in place. kind "seal" (talisman, ritual circle) or "nail". */
    pin(m, time, kind = "seal") {
      if (!m.alive) return;
      // the boss shrugs most of it off; elites half
      const rank = m.gz.rank;
      const k = rank === "boss" ? 0.25 : rank === "elite" ? 0.5 : 1;
      m.pin = Math.max(m.pin, time * k);
      m.pinKind = kind;
      m.vel.set(0, 0, 0);
      if (kind === "seal") {
        m.st.seal = 0;
        E.circle(m.pos, {
          size: m.gz.type === "brute" ? 2.6 : 2.0,
          life: time * k,
          follow: m.pos,
        });
        E.seal(m.headPos, { size: 1.1, glyph: "鎮", scraps: 6 });
        say(m, "鎮壓", "seal");
      }
    },
    /** Make a zombie run away for a moment (firework shell). */
    scare(m, time) {
      if (m.alive && m.pin <= 0 && !m.gz.rank) m.fear = Math.max(m.fear, time);
    },
    update,
    stats() {
      return { alive: list.length, total: G.enemies.list.length };
    },
  };

  function react(m, name) {
    const s = m.st;
    say(m, name, "react");
    G.events.emit("run:reaction", { name, pos: m.pos });
    if (name === "爆燃") {
      s.burn = 0;
      s.venom = 0;
      E.explosion(m.chest, { radius: 3, pal: "fire" });
      for (const h of api.inSphere(m.chest, 3))
        api.damage(h.z, 70, {
          dir: _d.subVectors(h.z.chest, m.chest).normalize().clone(),
          element: "fire",
          knock: 1,
          noChain: true,
          kind: "blast",
        });
    } else if (name === "导电雾") {
      E.cloud(m.pos, 2.6, 1.6, { color: [C(0x4ad0ff, 0.7), C(0x1a4a6a, 0.4)] });
      for (const h of api.inSphere(m.chest, 3)) {
        h.z.st.shock = SHOCK_TIME;
        fx.bolt(m.chest, h.z.chest, { width: 0.05, life: 0.14 });
      }
    } else if (name === "焚符") {
      s.seal = 0;
      E.seal(m.headPos, {
        pal: "fire",
        glyph: "焚",
        paper: C(0x2a1408, 1),
        scraps: 9,
        size: 1.2,
      });
      for (let i = 0; i < 16; i++)
        fx.glow({
          pos: m.headPos,
          vel: _d.set(srand(1.2), rand(0.5, 2.5), srand(1.2)),
          life: rand(0.4, 0.9),
          size: [0.1, rand(0.3, 0.5)],
          color: [E.PAL.fire.core, E.PAL.fire.end],
          alpha: 0.7,
          type: fx.P.FLAME,
          gravity: -1.5,
          drag: 1.5,
        });
      // a share of its health; the boss and elites are spared the full bite
      const rank = m.gz.rank;
      const share = rank === "boss" ? 0.04 : rank === "elite" ? 0.12 : 0.3;
      api.damage(m, m.maxHp * share, {
        dir: _d.set(0, 1, 0).clone(),
        element: "fire",
        noChain: true,
        blood: false,
        kind: "react",
      });
      if (m.alive) {
        s.burn = Math.min(5, s.burn + 2);
        s.burnT = BURN_TIME;
      }
    } else if (name === "引雷") {
      s.seal = 0;
      E.lightning(m.pos, { radius: 5 });
      for (const h of api.inSphere(m.chest, 5))
        api.damage(h.z, h.z === m ? 150 : 90, {
          dir: _d.subVectors(h.z.chest, m.chest).setY(0.3).normalize().clone(),
          element: "shock",
          knock: h.z === m ? 0 : 0.8,
          noChain: true,
          blood: false,
          kind: "react",
        });
    }
  }

  // every death, whoever caused it: fire jumps to the neighbours, venom leaves its cloud
  G.events.on("enemy:killed", (e) => {
    const gz = e && e.enemy;
    const m = gz && gz.mark;
    if (!m || m.serial !== gz.id) return;
    const o = killBy || {};
    m.pin = 0;
    m.fear = 0;
    m.lift = m.liftV = 0;
    gz.ctl.pin = gz.ctl.fear = gz.ctl.lift = 0;
    if (m.papers) for (const p of m.papers) p.visible = false;
    refresh(m);
    for (const f of listeners.kill) f({ z: m, by: o });
    if (m.st.burn > 0) {
      for (const h of api.inSphere(m.chest, o.spread || 3)) {
        if (h.z === m) continue;
        h.z.st.burn = Math.min(5, h.z.st.burn + (o.spreadStacks || 1));
        h.z.st.burnT = BURN_TIME;
        fx.ribbon({
          points: [
            m.chest.clone(),
            m.chest
              .clone()
              .lerp(h.z.chest, 0.5)
              .add(new V3(0, 0.5, 0)),
            h.z.chest.clone(),
          ],
          width: 0.12,
          color: E.PAL.fire.body,
          life: 0.3,
          kind: "fire",
        });
      }
    }
    if (m.st.venom > 0) E.cloud(m.pos, 2, 3);
    if (o.deathBlast && m.st.burn > 0)
      E.explosion(m.chest, { radius: 1.8, smoke: 0.5, shake: 0.12 });
    m.deadT = 0;
  });

  function update(dt, t) {
    clock = t;
    list.length = 0;
    for (const gz of G.enemies.list) {
      if (!gz.active) continue;
      const m = mk(gz);
      const s = m.st;
      const ctl = gz.ctl;
      if (!gz.alive) {
        // charred corpses smoulder for a moment
        if (s.burn > 0 && (m.deadT = (m.deadT || 0) + dt) < 3) {
          refresh(m);
          E.burn(m.feet, _a.set(m.pos.x, m.pos.y + 0.5, m.pos.z), dt, 1);
        }
        m.flash = Math.max(0, m.flash - dt * 6);
        tint(m);
        continue;
      }
      list.push(m);
      refresh(m);
      // ---- statuses
      if (s.burn > 0) {
        s.burnT -= dt;
        m.burnAcc += s.burn * BURN_DPS * dt;
        if (m.burnAcc >= 6) {
          const d = Math.floor(m.burnAcc);
          m.burnAcc -= d;
          api.damage(m, d, { element: "fire", kind: "dot", noChain: true });
        }
        if (s.burnT <= 0) s.burn = 0;
      }
      if (!gz.alive) continue;
      if (s.shock > 0) s.shock -= dt;
      if (s.venom > 0 && (s.venomT -= dt) <= 0) s.venom = 0;
      if (s.seal > 0 && (s.sealT -= dt) <= 0) s.seal = 0;
      const sealed = m.pin > 0 && m.pinKind === "seal";
      if (s.seal > 0 || sealed || m.papers) {
        const papers = papersOf(m);
        for (let i = 0; i < 3; i++) papers[i].visible = sealed || i < s.seal;
        const g = m.paperRoot;
        g.position.copy(m.headPos);
        g.position.y += 0.04 * gz.scale;
        g.position.x += Math.sin(gz.yaw) * 0.12 * gz.scale;
        g.position.z += Math.cos(gz.yaw) * 0.12 * gz.scale;
        g.rotation.set(Math.sin(t * 2.3 + gz.id) * 0.06, gz.yaw, 0);
      }
      // ---- what the zombie itself has to obey
      if (m.pin > 0) m.pin = Math.max(0, m.pin - dt);
      m.fear = Math.max(0, m.fear - dt);
      if (m.lift > 0 || m.liftV > 0) {
        m.liftV -= 12 * dt;
        m.lift = Math.max(0, m.lift + m.liftV * dt);
        if (m.lift === 0) m.liftV = 0;
      }
      ctl.pin = m.pin;
      ctl.rate = m.pinKind === "seal" ? 0.04 : 0.25;
      ctl.fear = m.fear;
      ctl.lift = m.lift;
      if (m.vel.lengthSq() > 1e-6) {
        ctl.push.add(m.vel);
        m.vel.set(0, 0, 0);
      }
      // ---- status visuals
      if (s.burn > 0) E.burn(m.feet, m.headPos, dt, s.burn);
      if (s.shock > 0) E.shock(m.feet, m.headPos, dt);
      if (s.venom > 0) E.venom(m.feet, m.headPos, dt, s.venom);
      if (sealed && Math.random() < 12 * dt)
        fx.glow({
          pos: _b.set(
            m.pos.x + srand(0.7),
            m.pos.y + 0.05,
            m.pos.z + srand(0.7),
          ),
          vel: _c.set(0, rand(0.6, 1.6), 0),
          life: rand(0.5, 1.1),
          size: [0.012, 0.004],
          color: [E.PAL.seal.spark, E.PAL.seal.end],
          type: fx.P.GLOW,
          fadePow: 0.8,
        });
      m.flash = Math.max(0, m.flash - dt * 7);
      tint(m);
    }
  }

  // emissive wash over the zombie's own materials, on top of an elite's or the boss's glow
  function tint(m) {
    const gz = m.gz;
    const s = m.st;
    const g0 = gz.glow;
    let r = g0 ? g0[0] : 0,
      g = g0 ? g0[1] : 0,
      b = g0 ? g0[2] : 0;
    let any = !!g0;
    if (m.flash > 0.01) {
      r += m.flash * 0.04;
      g += m.flash * 0.03;
      b += m.flash * 0.025;
      any = true;
    }
    if (s.burn > 0) {
      const k = 0.05 + 0.02 * s.burn + 0.02 * Math.sin(clock * 17 + gz.id);
      r += k * 0.4;
      g += k * 0.08;
      any = true;
    }
    if (s.shock > 0 && gz.alive) {
      const k = Math.sin(clock * 53 + gz.id * 3) > 0.3 ? 0.16 : 0.03;
      g += k * 0.6;
      b += k;
      any = true;
    }
    if (s.venom > 0) {
      g += 0.05 * s.venom;
      any = true;
    }
    if (m.pin > 0 && m.pinKind === "seal") {
      r += 0.16;
      g += 0.11;
      b += 0.02;
      any = true;
    }
    if (!any && !m.tinted) return;
    m.tinted = any;
    for (const mat of gz.mats) {
      if (!mat.emissive) continue;
      mat.emissive.setRGB(r, g, b);
      mat.emissiveIntensity = 1;
    }
  }

  return api;
}
