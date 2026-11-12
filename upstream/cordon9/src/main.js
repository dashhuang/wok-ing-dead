for (const k of Object.keys(SHOW || {})) SHOWCASES[k] = SHOW[k];
SHOWCASES.drone = showDrone;
window.__frames = 0;
window.__ready = false;
window.__errors = [];
window.__fatal = null;
window.addEventListener("error", (e) => window.__errors.push(String(e.message)));
{
  const ce = console.error.bind(console);
  console.error = (...a) => {
    try {
      window.__errors.push(a.map((x) => x && x.stack || String(x)).join(" ").slice(0, 600));
    } catch {
    }
    ce(...a);
  };
}
var bootEl = document.getElementById("boot");
var bootUI = bootScreen(bootEl, ["Starting renderer", "Baking surfaces", "Building the street", "Assembling weapons", "Waking the dead", "Synthesising sound", "Ready"]);
var step = (m) => new Promise((r) => {
  bootUI.step(m);
  let go = false;
  const f3 = () => {
    if (!go) {
      go = true;
      r();
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(f3));
  setTimeout(f3, 60);
});
async function boot() {
  const params = Object.fromEntries(new URLSearchParams(location.search));
  const quality = { ...QUALITY[params.q] || QUALITY[params.shot ? "shot" : "medium"] };
  const gpu = gpuProbe(params);
  tuneQuality(quality, params, gpu);
  if (params.msaa != null) quality.msaa = +params.msaa;
  if (params.tex) quality.tex = +params.tex;
  const G4 = { THREE: three_module_exports, params, quality, time: { t: 0, dt: 0, frame: 0 }, updates: [] };
  if (params.map) params.map = String(params.map).toLowerCase();
  window.__G = G4;
  G4.gpu = gpu;
  await step("Starting renderer");
  G4.render = createPipeline({ canvas: document.getElementById("view"), quality, params });
  G4.safety = installSafety(G4, G4.render.renderer.domElement);
  await step("Baking surfaces");
  G4.mats = createMaterials({ renderer: G4.render.renderer, quality, noise: G4.render.tNoise });
  G4.render.pendingBakes = () => G4.mats.pending;
  let shot = null, game = null;
  const setShot = (o) => {
    if (o.cam) {
      const f3 = String(o.cam).split(",").map(Number);
      shot = { pos: new Vector3(f3[0], f3[1], f3[2]), look: new Vector3(f3[3] ?? 0, f3[4] ?? 1, f3[5] ?? 0) };
    }
    if (o.fov) {
      G4.render.camera.fov = +o.fov;
      G4.render.camera.updateProjectionMatrix();
    }
    if (o.exposure) G4.render.exposure = +o.exposure;
  };
  window.__setShot = setShot;
  const show = params.show && SHOWCASES[params.show] ? params.show : params.show ? null : null;
  if (params.show && !show) throw new Error("unknown showcase " + params.show);
  if (show) {
    await step("Building showcase " + show);
    G4.showcase = await SHOWCASES[show](G4) || {};
    await G4.mats.flush(step, "Baking surfaces");
    await G4.render.warm();
    if (G4.render.envDeferred) G4.render.bakeEnvFromScene(...G4.render.envFrom);
    if (G4.showcase.cam) setShot({ cam: [...G4.showcase.cam, ...G4.showcase.target || [0, 1, 0]].join(","), fov: G4.showcase.fov });
  } else {
    game = await createGame(G4, step);
    G4.game = game;
    await G4.mats.flush(step, "Baking surfaces");
    await step("Compiling shaders");
    await G4.render.warm();
    game.prime();
    if (params.auto) {
      G4.bot = createBot(game, { skill: +(params.skill || 1) });
      if (params.bot === "0") G4.bot = () => game.inp;
      window.__game = {
        start: () => {
          game.begin();
          return game.S.state;
        },
        sim: (sec, dt = 1 / 60) => {
          const n = Math.round(sec / dt);
          for (let i = 0; i < n; i++) {
            G4.time.t += dt;
            game.frame(dt);
            G4.mats.update(dt, G4.time.t);
          }
          return window.__game.state();
        },
        state: () => {
          const S4 = game.S, P3 = game.P;
          return { state: S4.state, t: +S4.time.toFixed(1), wave: S4.wave, score: S4.score, kills: S4.kills, head: S4.headshots, shots: S4.shots, hits: S4.hits, taken: Math.round(S4.taken), hp: Math.round(P3.hp), pos: [+P3.pos.x.toFixed(1), +P3.pos.z.toFixed(1)], alive: game.horde.alive, queued: S4.toSpawn.length, mag: S4.ammo[S4.weapon].mag, res: S4.ammo.rifle.reserve, weapon: S4.weapon, unstuck: game.horde.stats.unstuck || 0, reloc: game.horde.stats.relocated || 0, errors: window.__errors.length };
        },
        // step until a predicate over (S, P, vm, horde) holds; returns the state and how long it took
        until: (expr, max = 120, dt = 1 / 60) => {
          const f3 = new Function("S", "P", "vm", "horde", "return (" + expr + ")");
          let t = 0;
          while (t < max && !f3(game.S, game.P, game.vm, game.horde)) {
            G4.time.t += dt;
            game.frame(dt);
            G4.mats.update(dt, G4.time.t);
            t += dt;
          }
          return { ...window.__game.state(), took: +t.toFixed(2), ok: t < max };
        },
        game
      };
      if (params.nofire) G4.bot.noFire = true;
    }
  }
  if (params.cam) setShot(params);
  if (params.fov) setShot({ fov: params.fov });
  if (params.exposure) setShot({ exposure: params.exposure });
  window.__pose = (n) => {
    const r = G4.showcase && G4.showcase.setPose && G4.showcase.setPose(n);
    if (!r) return false;
    setShot({ cam: [...r.cam, ...r.target].join(","), fov: r.fov });
    return true;
  };
  window.__stats = () => ({ ...G4.render.stats(), ...G4.mats.stats(), info: game ? game.info() : G4.showcase && G4.showcase.info });
  await step("Ready");
  bootUI.done();
  G4.safety.loaded();
  let last = performance.now();
  const gov = { t: 0, n: 0, skip: 2, base: quality.scale, ms: 0 };
  G4.gov = gov;
  G4.render.renderer.setAnimationLoop(() => {
    if (G4.safety.lost) {
      last = performance.now();
      return;
    }
    const now2 = performance.now(), raw = (now2 - last) / 1e3;
    let dt = Math.min(raw, 0.05);
    last = now2;
    if (params.dt) dt = +params.dt;
    if (game && !params.auto && params.dyn !== "0" && game.S.state === "playing") {
      gov.t += raw;
      gov.n++;
      if (gov.t >= 2) {
        const ms = gov.t / gov.n * 1e3;
        gov.t = 0;
        gov.n = 0;
        if (gov.skip > 0) gov.skip--;
        else if (ms > 22 && quality.scale > 0.56) {
          quality.scale = Math.max(0.55, quality.scale - 0.1);
          gov.skip = 1;
        } else if (ms < 13.5 && quality.scale < gov.base - 0.01) {
          quality.scale = Math.min(gov.base, quality.scale + 0.05);
          gov.skip = 1;
        }
        gov.ms = ms;
      }
    }
    G4.time.dt = dt;
    G4.time.t += dt;
    G4.time.frame++;
    try {
      if (game) {
        if (!window.__hold) game.frame(dt);
      } else if (G4.showcase && G4.showcase.update) G4.showcase.update(dt, G4.time.t);
      for (const u of G4.updates) u(dt, G4.time.t);
      G4.mats.update(dt, G4.time.t);
    } catch (e) {
      if (!boot.e1) {
        boot.e1 = 1;
        console.error("[loop] update failed: " + (e.stack || e));
      }
    }
    if (shot && !game) {
      G4.render.camera.position.copy(shot.pos);
      G4.render.camera.lookAt(shot.look);
    }
    try {
      G4.render.frame(dt);
    } catch (e) {
      if (!boot.e2) {
        boot.e2 = 1;
        console.error("[loop] render failed: " + (e.stack || e));
      }
    }
    window.__frames++;
    if (window.__frames === (+params.settle || 4)) window.__ready = true;
  });
}
boot().catch((e) => {
  window.__fatal = String(e && e.stack || e);
  console.error("[fatal] " + window.__fatal);
  try {
    showFailure("Could not start", String(e && e.message || e).slice(0, 300));
  } catch {
  }
  window.__ready = true;
});
/*! Bundled license information:

three/build/three.core.js:
  (**
   * @license
   * Copyright 2010-2025 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2025 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/

