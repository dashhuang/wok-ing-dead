// The game's zombies as seen by the arsenal's weapons.
// arsenal/src/combat/targets.js is the firing range's stand-in for the dead; this module offers
// the same surface on top of src/chinatown/zombies.js. Neither holds any rules: damage, the
// four status effects, their reactions and the elemental seasonings are
// arsenal/src/combat/status.js, one copy for both. What is written here is only how a game
// zombie is found by a ray, how it takes the damage, and how a hold, a fright or a shove is
// handed to it.
// Each zombie gets a companion object ("mark") carrying what the rules need to know.
import { createStatus, clearStatus } from "../../arsenal/src/combat/status.js";
import { ZOMBIES } from "./zombietune.js";

export function createGameTargets(G, lab, fx, E, root) {
  const T = G.THREE;
  const V3 = T.Vector3;
  const _a = new V3(),
    _c = new V3();
  const list = []; // marks of the zombies alive this frame
  let clock = 0;
  // the rules every weapon's hit goes through, here and on the firing range
  const rules = createStatus({
    list,
    fx,
    E,
    rng: G.rng && G.rng.fork ? G.rng.fork() : Math.random,
    hurt(m, dmg, o, direct, fate) {
      const gz = m.gz;
      const part = o.head ? "weak" : "body";
      // (a weapon has already done its sums: the zombie only sees a body or a head hit, and,
      // if this is the hit that kills it, what becomes of its body: combat/fate.js)
      const killed =
        gz.damage(dmg, o.point || null, direct ? o.dir : null, part, fate) ===
        true;
      // the game's own feedback: hit marker, blood and the sound of it landing
      if (o.kind !== "dot" && o.kind !== "share") {
        G.events.emit("player:hitEnemy", {
          enemy: gz,
          part,
          killed,
          weak: !!o.head,
          spread: !rules.counts(o.kind),
          armory: true,
        });
        if (direct && o.blood !== false)
          G.events.emit("impact", {
            point: o.point || m.chest,
            normal: _c.copy(o.dir).negate(),
            dist: 0,
            surface: "enemy",
            enemy: gz,
            part,
            dir: o.dir,
            from: "player",
            killed,
            // how much of its health this one hit took (for how much it bleeds)
            power: dmg / (gz.maxHp || dmg),
          });
      }
      return killed;
    },
    onReaction(name, m) {
      G.events.emit("run:reaction", { name, pos: m.pos });
    },
  });

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
    const m = clearStatus({
      gz,
      get id() {
        return gz.id;
      },
      get type() {
        return gz.type;
      },
      get rank() {
        return gz.rank;
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
        return ZOMBIES[gz.type].radius * Math.max(1, gz.scale) * gz.girth;
      },
      get height() {
        return 1.75 * gz.scale;
      },
      // a weapon's stagger is the zombie's own flinch timer
      get stagger() {
        return Math.max(0, gz.staggerT);
      },
      set stagger(v) {
        gz.staggerT = Math.max(gz.staggerT, v);
      },
      pos: gz.pos,
      vel: new V3(), // knock-back asked for this frame; handed to the zombie in update()
      headPos: new V3(),
      chest: new V3(),
      feet: new V3(),
      holder,
      papers: null,
      mark: 0,
      stuck: [],
      links: new Set(),
      serial: -1,
      deadT: 0,
    });
    gz.mark = m;
    return m;
  }
  // a pooled body that has come back as someone else starts clean
  function fresh(m) {
    const gz = m.gz;
    if (m.serial === gz.id) return m;
    m.serial = gz.id;
    clearStatus(m);
    m.mark = 0;
    m.deadT = 0;
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
      m.headPos.y += ZOMBIES.head.above * gz.scale;
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
  const hitOut = {
    dist: 0,
    point: new V3(),
    normal: new V3(),
    enemy: null,
    part: "body",
  };
  const api = {
    // damage, apply, pin, scare, push, inSphere, inCone, nearest, alive, on, setInfusions …
    ...rules,
    rules,
    list,
    root,
    of: mk,
    setLayout() {},
    setMode() {},
    /** First zombie along a ray: { z, dist, point, head, part } or null. `skip`: Set of marks to pass through. */
    raycast(o, d, max = 300, skip = null) {
      let best = null;
      hitOut.dist = max;
      hitOut.enemy = null;
      for (const gz of G.enemies.list) {
        if (!gz.alive) continue;
        if (skip && gz.mark && skip.has(gz.mark)) continue;
        const sc = Math.max(gz.scale > 1.3 ? gz.scale : 1, gz.girth);
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
    update,
    stats() {
      return { alive: list.length, total: G.enemies.list.length };
    },
  };

  // every death, whoever caused it: fire jumps to the neighbours, venom leaves its cloud
  G.events.on("enemy:killed", (e) => {
    const gz = e && e.enemy;
    const m = gz && gz.mark;
    if (!m || m.serial !== gz.id) return;
    m.lift = m.liftV = 0;
    gz.ctl.pin = gz.ctl.fear = gz.ctl.lift = 0;
    if (m.papers) for (const p of m.papers) p.visible = false;
    refresh(m);
    rules.died(m);
    m.deadT = 0;
  });

  function update(dt, t) {
    clock = t;
    // who is in play this frame, and where (the rules look through this list)
    list.length = 0;
    for (const gz of G.enemies.list) {
      if (!gz.active || !gz.alive) continue;
      const m = mk(gz);
      refresh(m);
      list.push(m);
    }
    for (const gz of G.enemies.list) {
      if (!gz.active) continue;
      const m = mk(gz);
      if (!gz.alive) {
        // charred corpses smoulder for a moment
        m.deadT += dt;
        if (m.st.burn > 0 && m.deadT < 3) refresh(m);
        rules.corpse(m, dt, m.deadT);
        tint(m);
        continue;
      }
      // ---- statuses (the burn may kill)
      rules.tick(m, dt);
      if (!gz.alive) continue;
      const shown = rules.papers(m);
      if (shown > 0 || m.papers) {
        const papers = papersOf(m);
        for (let i = 0; i < 3; i++) papers[i].visible = i < shown;
        const g = m.paperRoot;
        g.position.copy(m.headPos);
        g.position.y += 0.04 * gz.scale;
        g.position.x += Math.sin(gz.yaw) * 0.12 * gz.scale;
        g.position.z += Math.cos(gz.yaw) * 0.12 * gz.scale;
        g.rotation.set(Math.sin(t * 2.3 + gz.id) * 0.06, gz.yaw, 0);
      }
      // ---- what the zombie itself has to obey
      const ctl = gz.ctl;
      ctl.pin = m.pin;
      ctl.rate = rules.heldRate(m);
      ctl.fear = m.fear;
      ctl.lift = m.lift;
      if (m.vel.lengthSq() > 1e-6) {
        ctl.push.add(m.vel);
        m.vel.set(0, 0, 0);
      }
      rules.visuals(m, dt);
      tint(m);
    }
  }

  // emissive wash over the zombie's own materials, on top of an elite's or the boss's glow
  const wash = [0, 0, 0];
  function tint(m) {
    const gz = m.gz;
    const g0 = gz.glow;
    wash[0] = g0 ? g0[0] : 0;
    wash[1] = g0 ? g0[1] : 0;
    wash[2] = g0 ? g0[2] : 0;
    const any = rules.wash(m, clock, gz.id, wash) || !!g0;
    if (!any && !m.tinted) return;
    m.tinted = any;
    for (const mat of gz.mats) {
      if (!mat.emissive) continue;
      mat.emissive.setRGB(wash[0], wash[1], wash[2]);
      mat.emissiveIntensity = 1;
    }
  }

  return api;
}
