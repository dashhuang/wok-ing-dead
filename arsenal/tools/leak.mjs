// Leaks and per-frame cost, per weapon form: fight the horde for a while, three times over,
// and compare what is held on the GPU, in the scene and on the JS heap.
//
//   node arsenal/tools/leak.mjs [--seconds 20] [--only id,id]
//
// A geometry uploaded during the fight that nothing in the scene uses afterwards has leaked;
// the rest are pooled effect meshes being used for the first time ("first use").
// Exits 1 when a form leaks, throws, or its update costs more than 2.5 ms a frame.
import { openLab, parseArgs } from "./lab.mjs";

const { opt } = parseArgs();
const seconds = +(opt.seconds || 20);
const only = opt.only ? opt.only.split(",") : null;

const lab = await openLab({
  query: "w=shotgun&mode=fp&ui=0",
  width: 640,
  height: 360,
  args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"],
});
const { page } = lab;
const ids = await page.evaluate(() => {
  window.__lab.manual = true;
  return window.__lab.weapons.map((w) => w.id);
});
// load every model first so lazy loading does not look like a leak
for (const id of ids)
  await page.evaluate(async (id) => {
    await window.__lab.select(id, "base");
    window.__lab.advance(0.1);
  }, id);
// three.js puts a geometry on the GPU by listening for its "dispose": note those, and the disposals
await page.evaluate(() => {
  let proto = null;
  window.__lab.stage.scene.traverse((o) => {
    if (proto || !o.geometry) return;
    let p = Object.getPrototypeOf(o.geometry);
    while (p && !Object.prototype.hasOwnProperty.call(p, "addEventListener"))
      p = Object.getPrototypeOf(p);
    proto = p;
  });
  const added = (window.__geoAdded = new Set()),
    gone = (window.__geoGone = new Set());
  const listen = proto.addEventListener,
    dispatch = proto.dispatchEvent;
  proto.addEventListener = function (type, fn) {
    if (this.isBufferGeometry && type === "dispose") added.add(this);
    return listen.call(this, type, fn);
  };
  proto.dispatchEvent = function (ev) {
    if (this.isBufferGeometry && ev.type === "dispose") gone.add(this);
    return dispatch.call(this, ev);
  };
  window.__orphans = () => {
    const used = new Set();
    window.__lab.stage.scene.traverse(
      (o) => o.geometry && used.add(o.geometry),
    );
    let n = 0;
    for (const g of added) if (!gone.has(g) && !used.has(g)) n++;
    return n;
  };
});

let flagged = 0;
for (const id of ids) {
  if (only && !only.includes(id)) continue;
  for (const [b, lv] of [
    ["base", 1],
    ["a", 5],
    ["b", 5],
  ]) {
    const r = await page.evaluate(
      async ([id, b, lv, seconds]) => {
        const lab = window.__lab,
          c = lab.combat,
          T = c.targets,
          R = lab.stage.renderer;
        lab.state.level = lv;
        lab.state.branch = b;
        await lab.select(id, b);
        T.setMode("horde");
        c.clear();
        const snap = () => {
          if (window.gc) (window.gc(), window.gc());
          let objects = 0;
          lab.stage.scene.traverse(() => objects++);
          return {
            geo: R.info.memory.geometries,
            tex: R.info.memory.textures,
            objects,
            heap: performance.memory
              ? performance.memory.usedJSHeapSize / 1048576
              : 0,
          };
        };
        const run = (secs, timed) => {
          const dt = 1 / 60,
            N = Math.round(secs / dt);
          let fire = false,
            alt = false,
            sum = 0,
            max = 0,
            n = 0,
            clock = 0;
          const set = (name, on) => {
            if (name === "fire" && on !== fire) {
              fire = on;
              on ? c.press("fire") : c.release("fire");
            }
            if (name === "alt" && on !== alt) {
              alt = on;
              on ? c.press("alt") : c.release("alt");
            }
          };
          for (let i = 0; i < N; i++) {
            let best = null,
              bd = 1e9;
            for (const z of T.list)
              if (z.alive) {
                const d = Math.hypot(z.pos.x, z.pos.z);
                if (d < bd) ((bd = d), (best = z));
              }
            if (best) c.aimAt(best, false);
            clock += dt;
            const p = clock % 3;
            // fire most of the time, tap the special move, let charges go off
            set("fire", p < 2.2 && !(c.weapon.charge >= 0.97));
            set("alt", p >= 2.3 && p < 2.9);
            const draw = i % 6 === 0;
            const t0 = performance.now();
            lab.advance(dt, dt, draw);
            const el = performance.now() - t0;
            if (timed && !draw) {
              sum += el;
              n++;
              if (el > max) max = el;
            }
          }
          set("fire", false);
          set("alt", false);
          return { avg: sum / Math.max(1, n), max };
        };
        const settle = () => {
          c.clear();
          lab.advance(1.5, 1 / 60, true);
          c.clear();
          lab.advance(0.2, 1 / 60, true);
        };
        run(6, false);
        settle();
        const A = snap();
        window.__geoAdded.clear();
        window.__geoGone.clear();
        const tick = run(seconds, true);
        settle();
        const B = snap();
        run(seconds, false);
        settle();
        const C = snap();
        run(seconds, false);
        settle();
        const D = snap();
        return {
          A,
          B,
          C,
          D,
          tick,
          orphans: window.__orphans(),
          firstUse: window.__geoAdded.size,
          errors: window.__errors.length,
        };
      },
      [id, b, lv, seconds],
    );
    const leak =
      r.orphans > 0 ||
      r.D.tex > r.C.tex ||
      r.D.objects > r.C.objects ||
      (r.C.heap - r.B.heap > 2 && r.D.heap - r.C.heap > 2);
    const slow = r.tick.avg > 2.5;
    if (leak || slow || r.errors) flagged++;
    const heap = [r.B.heap - r.A.heap, r.C.heap - r.B.heap, r.D.heap - r.C.heap]
      .map((v) => (v >= 0 ? "+" : "") + v.toFixed(1))
      .join("/");
    console.log(
      `${id.padEnd(10)} ${b.padEnd(4)} orphans ${r.orphans} (first use ${String(r.firstUse).padStart(2)})  textures ${r.D.tex - r.A.tex >= 0 ? "+" : ""}${r.D.tex - r.A.tex}  objects ${r.D.objects - r.A.objects >= 0 ? "+" : ""}${r.D.objects - r.A.objects}  heap MB ${heap.padEnd(15)} update ${r.tick.avg.toFixed(2)} ms (max ${r.tick.max.toFixed(1)})  errors ${r.errors}${leak ? "  LEAK?" : ""}${slow ? "  SLOW" : ""}`,
    );
  }
}
await lab.close();
console.log(flagged ? `${flagged} form(s) flagged` : "nothing flagged");
process.exit(flagged ? 1 : 0);
