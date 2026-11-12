var WEAPONS = {
  rifle: { name: "KR-58 Warden", mode: "Auto \xB7 7.62", mag: 30, reserve0: 150, reserveMax: 240, interval: 60 / 620, auto: true, dmg: 34, headK: 3, spreadHip: 0.017, spreadAds: 22e-4, spreadMove: 0.012, bloom: 34e-4, bloomMax: 0.028, kickP: 0.0125, kickY: 6e-3, adsFov: 50, adsViewFov: 28, snd: "rifle", casing: 1, flash: 1, light: 24 },
  pistol: { name: "M11 Compact", mode: "Semi \xB7 9 mm", mag: 15, reserve0: Infinity, reserveMax: Infinity, interval: 0.115, auto: false, dmg: 42, headK: 2.6, spreadHip: 0.011, spreadAds: 38e-4, spreadMove: 8e-3, bloom: 7e-3, bloomMax: 0.03, kickP: 0.021, kickY: 8e-3, adsFov: 62, snd: "pistol", casing: 0.72, flash: 0.7, light: 15 }
};
var HIT_SND = { asphalt: "hitConcrete", concrete: "hitConcrete", brick: "hitConcrete", metal: "hitMetal", car: "hitMetal", mesh: "hitMetal", wood: "hitWood", glass: "hitGlass", plastic: "hitWood", rubber: "hitWood", cloth: "hitWood", sand: "hitWood" };
var lerp5 = (a, b, t) => a + (b - a) * t;
var clamp5 = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
async function createGame(G4, step2 = async () => {
}) {
  const R4 = G4.render, rnd = Math.random, rr = (a, b) => a + (b - a) * rnd(), auto = !!G4.params.auto;
  const dbgZoom = +G4.params.zoom || 0;
  const MAP = pickMap(G4.params.map);
  await step2("Building " + MAP.meta.title);
  const W = MAP.build(G4);
  G4.world = W;
  G4.maps = mapList();
  G4.mapId = MAP.meta.id;
  R4.scene.environmentIntensity = +(G4.params.env || 1);
  R4.M.vol.uniforms.uSigma.value = +(G4.params.sigma || 65e-4);
  R4.M.grade.uniforms.uKey.value = +(G4.params.key || 0.11);
  const look = createLook(G4, W);
  if (W.look && W.look.setup) W.look.setup(G4, look);
  await G4.mats.flush(step2, "Building " + (MAP.meta.title || "the map"));
  await R4.warm();
  W.update(0.016, 0, R4.camera.position.set(W.env.cam[0], W.env.cam[1], W.env.cam[2]));
  R4.bakeEnvFromScene(new Vector3(W.env.probe[0], W.env.probe[1], W.env.probe[2]));
  const phys = createPhysics(W), fx = createFx(G4, W, phys), surf = createSurfHit(W);
  fx.refine = surf.refine;
  await step2("Assembling weapons");
  const vm = createViewmodel(G4), P3 = createPlayer(G4, phys);
  await step2("Waking the dead");
  const horde = createHorde(G4, W, phys, { size: +(G4.params.pool || (W.rules && W.rules.pool ? W.rules.pool(G4.quality.name) : G4.quality.name === "low" ? 12 : 16)) });
  const input = createInput(R4.renderer.domElement), audio = createAudio(G4);
  const store = { get(k) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  }, set(k, v) {
    try {
      window.localStorage.setItem(k, String(v));
      return true;
    } catch {
      return false;
    }
  } };
  const num = (k, d, lo, hi) => {
    const v = parseFloat(store.get(k));
    return Number.isFinite(v) ? clamp5(v, lo, hi) : d;
  }, SENS0 = input.sens;
  const CFG = {};
  for (const d of SETTINGS) CFG[d.k] = d.type ? Math.round(num("cordon9." + d.k, d.def, 0, d.options.length - 1)) : num("cordon9." + d.k, d.def, d.min, d.max);
  const applyCfg = () => {
    input.sens = SENS0 * CFG.sens;
    audio.vol.master = CFG.vol;
    audio.vol.sfx = CFG.sfx;
    audio.vol.music = CFG.music;
    audio.vol.amb = CFG.amb;
  };
  const onSetting = (k, v) => {
    const d = SETTINGS.find((q) => q.k === k);
    if (!d) return;
    CFG[k] = d.type ? Math.round(clamp5(v, 0, d.options.length - 1)) : clamp5(v, d.min, d.max);
    applyCfg();
    store.set("cordon9." + k, CFG[k]);
    hud.settings(CFG);
  };
  await step2("Synthesising sound");
  audio.prepare();
  const hud = createHud(document.getElementById("ui"), {
    quality: G4.quality.name,
    onSetting,
    onSound: (n) => audio.play(n, { vol: 0.7, jit: 0 }),
    onQuality: (q) => {
      const u = new URL(location.href);
      u.searchParams.set("q", q);
      location.href = u.toString();
    },
    maps: G4.maps || null,
    map: G4.mapId || null,
    onMap: (id) => {
      const u = new URL(location.href);
      u.searchParams.set("map", id);
      location.href = u.toString();
    },
    place: MAP.meta.title + " \xB7 " + (MAP.meta.sub || "night \xB7 rain")
  });
  hud.setWorld(W, W.bounds || BOUNDS);
  R4.viewLight.intensity = 0.85 * look.def.viewLight;
  R4.stagger = G4.params.stagger !== "0";
  applyCfg();
  const torch = new SpotLight(14411519, 0, 38, 0.36, 0.92, 1.1);
  torch.layers.set(LAYER_WORLD);
  torch.castShadow = false;
  torch.position.set(0.07, -0.085, -0.25);
  torch.target.position.set(0.02, -0.03, -12);
  R4.camera.add(torch);
  R4.camera.add(torch.target);
  look.addSpot(torch, { beam: 1.1, range: 30 });
  const TORCH_CD = +(G4.params.torch || 150);
  const S4 = {
    state: "menu",
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    headshots: 0,
    shots: 0,
    hits: 0,
    taken: 0,
    toSpawn: [],
    total: 0,
    spawnT: 0,
    interT: 0,
    maxAlive: 5,
    hpK: 1,
    speedK: 1,
    gap: 2,
    weapon: "rifle",
    ammo: { rifle: { mag: 30, reserve: 150 }, pistol: { mag: 15, reserve: Infinity } },
    fireT: 0,
    bloom: 0,
    heat: 0,
    dryT: 0,
    autoReloadT: 0,
    best: 0,
    flashT: 0,
    menuT: 0,
    log: []
  };
  S4.best = Math.max(0, Math.floor(+store.get("cordon9.best") || 0));
  CFG.best = S4.best;
  hud.settings(CFG);
  const v1 = new Vector3(), v2 = new Vector3(), v32 = new Vector3(), dir = new Vector3(), rgt = new Vector3(), up = new Vector3(), mz = new Vector3();
  const flash = R4.fills[0];
  flash.color.setRGB(1, 0.72, 0.4);
  flash.distance = 10;
  flash.userData.glow = 0.25;
  const A = worldAtlases().signs, beamGeo = new PlaneGeometry(0.34, 1.7).translate(0, 0.95, 0);
  const beamMat = (c) => new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    side: DoubleSide,
    uniforms: { uC: { value: new Color(...c) }, uT: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uC; uniform float uT; varying vec2 vUv; void main(){ float x = abs(vUv.x - 0.5) * 2.0; float a = exp(-x * x * 9.0) * pow(1.0 - vUv.y, 1.6) * (0.75 + 0.25 * sin(uT * 3.0 + vUv.y * 9.0)); gl_FragColor = vec4(uC * a, 1.0); }"
  });
  const pkMat = { ammo: beamMat([0.9, 0.5, 0.12]), med: beamMat([0.2, 0.85, 0.4]) }, pickups = [];
  const pkProto = { ammo: propMeshes(G4, ammoCan(1, { atlas: A })), med: propMeshes(G4, medKit(1, { atlas: A })) };
  for (const kind of ["ammo", "ammo", "ammo", "ammo", "med", "med", "med"]) {
    const g2 = new Group(), body = pkProto[kind].clone(true), beam = new Mesh(beamGeo, pkMat[kind]);
    beam.renderOrder = 7;
    beam.frustumCulled = false;
    g2.add(body, beam);
    g2.visible = false;
    R4.scene.add(g2);
    pickups.push({ kind, g: g2, beam, on: false, x: 0, z: 0, t: 0 });
  }
  const UAV_SEC = +(G4.params.uavsec || 25), UAV_NEED = +(G4.params.uavneed || 8), UAV_MAX = 3, NEAR_R = 9;
  const drone = createDrone(G4, W, look, phys, { bounds: W.droneBounds || W.bounds || BOUNDS, payloads: pkProto }), threats = [];
  function dropPickup(kind, x, z) {
    const p = pickups.find((q) => q.kind === kind && !q.on);
    if (!p) return false;
    if (pickups.some((q) => q.on && Math.hypot(q.x - x, q.z - z) < 1.2)) return false;
    p.on = true;
    p.x = x;
    p.z = z;
    p.t = 0;
    p.g.position.set(x, phys.groundY(x, z), z);
    p.g.rotation.y = rnd() * 6.28;
    p.g.visible = true;
    return true;
  }
  function placePickups() {
    const spots = W.pickups.filter(([x, z]) => phys.free(x, z) && Math.hypot(x - P3.pos.x, z - P3.pos.z) > 5).sort(() => rnd() - 0.5);
    let i = 0;
    const want = [["ammo", 2], ["med", P3.hp < 60 ? 2 : 1]];
    for (const [kind, n] of want) {
      let have = pickups.filter((q) => q.on && q.kind === kind).length;
      while (have < n && i < spots.length) {
        if (dropPickup(kind, spots[i][0], spots[i][1])) have++;
        i++;
      }
    }
  }
  function updatePickups(dt) {
    for (const p of pickups) {
      if (!p.on) continue;
      p.t += dt;
      p.beam.rotation.y = Math.atan2(P3.eye.x - p.x, P3.eye.z - p.z) - p.g.rotation.y;
      if (!P3.alive) continue;
      if (Math.hypot(P3.pos.x - p.x, P3.pos.z - p.z) < 1.05) {
        if (p.kind === "ammo") {
          const am = S4.ammo.rifle;
          if (am.reserve >= WEAPONS.rifle.reserveMax) continue;
          const n = Math.min(60, WEAPONS.rifle.reserveMax - am.reserve);
          am.reserve += n;
          hud.toast("Rifle ammunition +" + n);
          audio.play("pickAmmo", { vol: 0.8 });
        } else {
          if (P3.hp >= P3.maxHp) continue;
          const h = Math.min(45, P3.maxHp - P3.hp);
          P3.heal(45);
          hud.toast("Field dressing +" + Math.round(h));
          audio.play("pickMed", { vol: 0.8 });
        }
        p.on = false;
        p.g.visible = false;
        S4.score += 25;
      }
    }
    pkMat.ammo.uniforms.uT.value = pkMat.med.uniforms.uT.value = S4.time;
  }
  const dctx = { menu: false, player: null, vel: null, fwd: [0, -1], threats };
  function launchUav() {
    if (!P3.alive || S4.state !== "playing") return;
    if (drone.up && !drone.leaving) {
      if (!drone.supplying) hud.toast("UAV already up");
      else if (S4.uavN <= 0) hud.toast("No UAV \xB7 " + (UAV_NEED - S4.uavP) + " more kills");
      else if (!S4.uavQ) {
        S4.uavQ = true;
        hud.toast("UAV queued \xB7 after the drop");
      }
      return;
    }
    S4.uavQ = false;
    if (S4.uavN <= 0) {
      hud.toast("No UAV \xB7 " + (UAV_NEED - S4.uavP) + " more kills");
      audio.play("dry", { vol: 0.4 });
      return;
    }
    const r = drone.launch(P3.pos, [-Math.sin(P3.yaw), -Math.cos(P3.yaw)], UAV_SEC);
    S4.uavWhy = r;
    if (r !== "ok") {
      hud.toast(r === "roof" ? "UAV \xB7 no open sky here" : "UAV not ready");
      audio.play("dry", { vol: 0.4 });
      return;
    }
    S4.uavN--;
    S4.uavs++;
    S4.uavLow = 0.5;
    audio.play("uavCall", { vol: 0.55, jit: 0 });
    audio.play("cloth", { vol: 0.7 });
    hud.toast("UAV away");
  }
  function updateDrone(dt, t, menu) {
    threats.length = 0;
    if (!menu && drone.scanning) {
      for (const Z of horde.list) if (Z.active && Z.alive) threats.push(Z.pos);
    }
    dctx.menu = menu;
    dctx.player = P3.pos;
    dctx.vel = P3.vel;
    dctx.fwd[0] = -Math.sin(P3.yaw);
    dctx.fwd[1] = -Math.cos(P3.yaw);
    drone.update(dt, t, dctx);
    const dp = drone.pos;
    audio.track("droneLoop", [dp.x, dp.y, dp.z], !drone.up ? 0 : menu ? 0.3 : 0.5, 0.9 + 0.22 * drone.S.load, 6);
    if (S4.supplyDue && !menu && !drone.up && P3.alive) {
      S4.supplyDue = false;
      callSupply();
    }
    for (const e of drone.S.events) {
      if (e.type === "track") {
        audio.play("uavPing", { vol: 0.3, jit: 0 });
        hud.feed("UAV: contact marked", "u");
      } else if (e.type === "station") {
        audio.play("uavPing", { vol: 0.4, jit: 0 });
        hud.feed("UAV on station \xB7 scanning " + UAV_SEC + " s", "u");
      } else if (e.type === "recall") {
        audio.play("uavPing", { vol: 0.3, jit: 0, rate: 0.8 });
        hud.toast("UAV scan over \xB7 returning");
      } else if (e.type === "docked") {
        if (S4.state === "playing" && P3.alive) {
          S4.uavLow = 0.3;
          audio.play("magIn", { vol: 0.6 });
          hud.feed("UAV recovered", "u");
        }
      } else if (e.type === "release") audio.play("uavRelease", { pos: [e.x, e.y, e.z], vol: 0.8, ref: 5 });
      else if (e.type === "landed") {
        let ok = dropPickup(e.kind, e.x, e.z);
        for (let i = 0; i < 6 && !ok; i++) {
          const a = i * 1.05;
          ok = dropPickup(e.kind, e.x + Math.cos(a) * 1.4, e.z + Math.sin(a) * 1.4);
        }
        audio.play("magDrop", { pos: [e.x, e.y, e.z], vol: 1, rate: 0.6, ref: 4, verb: 0.3 });
        for (let i = 0; i < 10; i++) fx.alpha.emit({ x: e.x + rr(-0.2, 0.2), y: e.y + 0.03, z: e.z + rr(-0.2, 0.2), vx: rr(-1.6, 1.6), vy: rr(0.8, 2.6), vz: rr(-1.6, 1.6), life: rr(0.25, 0.5), size: rr(6e-3, 0.014), col: [0.34, 0.38, 0.43], alpha: 0.6, spr: 2, stretch: 0.05, grav: 9.8, floor: e.y + 4e-3 });
        if (ok) hud.toast(e.kind === "med" ? "Supply canister down: field dressing" : "Supply canister down: rifle ammunition");
      }
    }
    drone.S.events.length = 0;
  }
  function callSupply() {
    const kind = P3.hp < 55 ? "med" : S4.ammo.rifle.reserve < 120 ? "ammo" : rnd() < 0.5 ? "ammo" : "med", job = drone.supply(kind, P3.pos.x - Math.sin(P3.yaw) * 4, P3.pos.z - Math.cos(P3.yaw) * 4, W.pickups);
    if (job) {
      audio.play("uavCall", { vol: 0.6, jit: 0 });
      hud.toast("Supply drop inbound");
      S4.supplies++;
    } else if (drone.up) S4.supplyDue = true;
  }
  const zpos = [0, 0, 0];
  horde.fx = fx;
  horde.sfx = (name, Z, vol) => {
    zpos[0] = Z.pos.x;
    zpos[1] = Z.pos.y + (name === "zstep" || name === "bodyfall" ? 0.1 : 1.45);
    zpos[2] = Z.pos.z;
    audio.play(name, { pos: zpos, vol, verb: 0.3, ref: 3.2, occl: true, rate: Z.type === "brute" ? 0.78 : Z.type === "runner" ? 1.16 : 1, jit: 0.08 });
  };
  P3.onStep = (sprint) => !P3.sliding && audio.play(phys.groundY(P3.pos.x, P3.pos.z) < 0.01 ? "stepWet" : "step", { vol: sprint ? 0.5 : 0.3, jit: 0.1 });
  P3.onLand = (v) => {
    audio.play("step", { vol: Math.min(0.9, 0.3 + v * 0.1), rate: 0.8 });
    vm.land(v);
  };
  const slideHit = /* @__PURE__ */ new Set();
  let slideSeen = 0, sprayT = 0;
  P3.onSlide = () => {
    audio.play("skid", { vol: 0.75, jit: 0.06 });
    vm.land(1.3);
    S4.slides++;
  };
  function slideFx(dt) {
    if (P3.slideN !== slideSeen) {
      slideSeen = P3.slideN;
      slideHit.clear();
    }
    const sp2 = Math.hypot(P3.vel.x, P3.vel.z) || 1, dx = P3.vel.x / sp2, dz = P3.vel.z / sp2, gy = phys.groundY(P3.pos.x, P3.pos.z);
    sprayT -= dt;
    if (sprayT <= 0) {
      sprayT = 0.022;
      for (let i = 0; i < 3; i++) fx.alpha.emit({ x: P3.pos.x + dx * 0.55 + rr(-0.28, 0.28), y: gy + 0.03, z: P3.pos.z + dz * 0.55 + rr(-0.28, 0.28), vx: dx * sp2 * 0.4 + rr(-1.4, 1.4), vy: rr(0.8, 2.4), vz: dz * sp2 * 0.4 + rr(-1.4, 1.4), life: rr(0.22, 0.5), size: rr(6e-3, 0.014), col: [0.34, 0.38, 0.43], alpha: 0.6, spr: 2, stretch: 0.05, grav: 9.8, floor: gy + 4e-3 });
    }
    for (const Z of horde.list) {
      if (!Z.active || !Z.alive || slideHit.has(Z)) continue;
      const zx = Z.pos.x - P3.pos.x, zz = Z.pos.z - P3.pos.z, d = Math.hypot(zx, zz);
      if (d > 1.2 || zx * dx + zz * dz < 0.15) continue;
      slideHit.add(Z);
      dir.set(dx, 0.2, dz).normalize();
      const res = horde.damage(Z, 28, "leg", dir);
      audio.play("hitFlesh", { pos: [Z.pos.x, 0.5, Z.pos.z], vol: 0.85 });
      hud.hit(res.killed);
      P3.shake = Math.min(1, (P3.shake || 0) + 0.25);
      S4.kicks++;
      if (!res.killed) hud.feed("Slide kick");
    }
  }
  fx.onCasing = (p) => audio.play("casing", { pos: [p.x, p.y, p.z], vol: 0.35, ref: 1.5 });
  audio.onThunder = () => {
    S4.flashT = 0.35;
  };
  audio.occluded = (p) => {
    const L = audio.listener;
    return !phys.los(L[0], L[1], L[2], p[0], p[1], p[2]);
  };
  fx.magProto("rifle", vm.rifle.mag, vm.magMid.rifle);
  fx.magProto("pistol", vm.pistol.mag, vm.magMid.pistol);
  fx.onMagHit = (kind, p, n) => {
    if (n < 1) audio.play(kind === "pistol" ? "pMagDrop" : "magDrop", { pos: [p.x, p.y, p.z], vol: 0.75, ref: 2, verb: 0.2 });
  };
  const mq = new Quaternion();
  function dropMag() {
    R4.camera.updateMatrixWorld(true);
    const k = vm.magWorld(v1, mq, v2);
    v2.add(P3.vel);
    fx.dropMag(vm.weapon, v1, mq, v2, k);
  }
  horde.onHurtPlayer = (Z, dmg) => {
    if (!P3.damage(dmg, Z.pos.x, Z.pos.z)) return;
    S4.taken += dmg;
    R4.post.damage = 1;
    hud.hurt(P3.lastHitDir || 0);
    audio.play("playerHurt", { vol: 0.9 });
    audio.play("hitFlesh", { vol: 0.7 });
    S4.heat = 1;
    if (!P3.alive) die();
  };
  horde.onKill = (Z, zone, score) => {
    S4.kills++;
    S4.score += score;
    if (zone === "head") S4.headshots++;
    S4.chain = S4.chainT > 0 ? S4.chain + 1 : 1;
    S4.chainT = 3.2;
    if (S4.chain > S4.bestChain) S4.bestChain = S4.chain;
    if (S4.uavN < UAV_MAX && ++S4.uavP >= UAV_NEED) {
      S4.uavP = 0;
      S4.uavN++;
      audio.play("uavCall", { vol: 0.5, jit: 0 });
      hud.toast("UAV earned \xB7 press E");
      hud.feed("Killstreak: UAV ready", "u");
    }
    hud.feed("+" + score + (zone === "head" ? " headshot" : ""), zone === "head" ? "h" : "");
    if (S4.chain > 1) {
      const b = Math.min(250, 25 * (S4.chain - 1));
      S4.score += b;
      hud.feed((S4.chain === 2 ? "Double" : S4.chain === 3 ? "Triple" : "Chain x" + S4.chain) + " +" + b, "c");
    }
    const r = rnd();
    if (r < 0.13) dropPickup("ammo", Z.pos.x, Z.pos.z);
    else if (r < 0.17) dropPickup("med", Z.pos.x, Z.pos.z);
  };
  function startWave(n) {
    S4.wave = n;
    const count = Math.min(72, 4 + n * 3 + Math.floor(n * n * 0.22)), bruteP = n >= 4 ? Math.min(0.18, 0.045 * (n - 3)) : 0, runP = n >= 2 ? Math.min(0.42, 0.11 * (n - 1)) : 0;
    S4.toSpawn = [];
    for (let i = 0; i < count; i++) {
      const r = rnd();
      S4.toSpawn.push(r < bruteP ? "brute" : r < bruteP + runP ? "runner" : "walker");
    }
    S4.total = count;
    S4.maxAlive = Math.min(horde.list.length, 4 + n);
    S4.hpK = 1 + 0.09 * (n - 1);
    S4.speedK = Math.min(1.75, 1.25 + 0.045 * (n - 1));
    S4.gap = Math.max(0.45, 2.1 - 0.14 * n);
    S4.spawnT = 1.6;
    S4.interT = 0;
    if (W.rules && W.rules.alive) S4.maxAlive = Math.min(horde.list.length, W.rules.alive(n));
    hud.banner("Wave " + n, count + " hostiles inbound");
    audio.play("waveStart", { vol: 0.8, bus: "music", jit: 0 });
    placePickups();
    S4.log.push({ t: +S4.time.toFixed(1), wave: n, count });
  }
  function pickSpawn() {
    if (W.pickSpawn) return W.pickSpawn(P3.pos, rnd);
    let tot = 0;
    const c = [];
    for (const s of W.spawns) {
      const d = Math.hypot(s.p[0] - P3.pos.x, s.p[1] - P3.pos.z);
      if (d < 8) continue;
      const w = s.w * (d < 14 ? 0.5 : 1);
      c.push([s, w]);
      tot += w;
    }
    if (!c.length) return W.spawns[0];
    let r = rnd() * tot;
    for (const [s, w] of c) {
      r -= w;
      if (r <= 0) return s;
    }
    return c[0][0];
  }
  function director(dt) {
    if (S4.interT > 0) {
      S4.interT -= dt;
      if (S4.interT <= 0) startWave(S4.wave + 1);
      return;
    }
    if (S4.wave === 0) return;
    if (S4.kills !== S4.progK || S4.taken !== S4.progD || S4.toSpawn.length !== S4.progS) {
      S4.progK = S4.kills;
      S4.progD = S4.taken;
      S4.progS = S4.toSpawn.length;
      S4.progT = S4.time;
    } else if (S4.time - S4.progT > 30 && horde.alive > 0) {
      S4.progT = S4.time;
      let n = 0;
      for (const Z of horde.list) {
        if (!Z.active || !Z.alive || Z.direct || (Z.gainT ?? 99) < 12) continue;
        n++;
        Z.failN = (Z.failN || 0) + 1;
        if (Z.failN >= 3 || !horde.relocate(Z, P3)) horde.putDown(Z);
      }
      if (n) S4.stallFix = (S4.stallFix || 0) + 1;
    }
    S4.spawnT -= dt;
    if (S4.toSpawn.length && S4.spawnT <= 0 && horde.alive < S4.maxAlive) {
      const type = S4.toSpawn[S4.toSpawn.length - 1], s = pickSpawn();
      let x = s.p[0] + rr(-0.7, 0.7), z = s.p[1] + rr(-0.7, 0.7);
      if (!phys.free(x, z)) {
        x = s.p[0];
        z = s.p[1];
      }
      const Z = horde.spawn(type, x, z, Math.atan2(P3.pos.x - x, P3.pos.z - z), S4.hpK, S4.speedK);
      if (Z) {
        Z.dmgK = 1 + 0.05 * (S4.wave - 1);
        S4.toSpawn.pop();
        horde.alive++;
        S4.spawnT = S4.gap * rr(0.6, 1.4);
      } else S4.spawnT = 0.6;
    }
    if (!S4.toSpawn.length && horde.alive === 0 && P3.alive) {
      const bonus = 250 * S4.wave;
      S4.score += bonus;
      S4.interT = 7;
      hud.banner("Wave " + S4.wave + " cleared", "Bonus " + bonus + " \xB7 next wave in 7 s", 3.2);
      audio.play("waveClear", { vol: 0.7, bus: "music", jit: 0 });
      callSupply();
    }
  }
  function fire() {
    const wd = WEAPONS[S4.weapon], am = S4.ammo[S4.weapon], ads = vm.state.ads;
    am.mag--;
    S4.fireT += wd.interval;
    S4.shots++;
    S4.heat = 1;
    R4.camera.updateMatrixWorld(true);
    const e = R4.camera.matrixWorld.elements;
    rgt.set(e[0], e[1], e[2]);
    up.set(e[4], e[5], e[6]);
    dir.set(-e[8], -e[9], -e[10]);
    const spread = lerp5(wd.spreadHip, wd.spreadAds, ads) + S4.bloom + clamp5(P3.moving / 4.3) * wd.spreadMove * (1 - ads * 0.7) + (P3.onGround ? 0 : 0.03), ang = rnd() * 6.2832, rad = Math.sqrt(rnd()) * spread;
    dir.addScaledVector(rgt, Math.cos(ang) * rad).addScaledVector(up, Math.sin(ang) * rad).normalize();
    const ox = P3.eye.x, oy = P3.eye.y, oz = P3.eye.z, wh = phys.raycast(ox, oy, oz, dir.x, dir.y, dir.z, 120, "bullet");
    let wt = 120, ws = null, wx = 0, wy = 0, wz = 0, nx = 0, ny = 1, nz = 0, mark = true;
    if (wh) {
      wt = wh.t;
      ws = wh.surface;
      wx = wh.x;
      wy = wh.y;
      wz = wh.z;
      nx = wh.nx;
      ny = wh.ny;
      nz = wh.nz;
      if (wh.col && wh.col.inst != null) {
        const ex = surf.refine(wh.col, ox, oy, oz, dir.x, dir.y, dir.z, wh.t);
        if (ex) {
          wt = ex.t;
          wx = ex.x;
          wy = ex.y;
          wz = ex.z;
          nx = ex.nx;
          ny = ex.ny;
          nz = ex.nz;
          if (ex.mat.indexOf("glass") === 0) ws = "glass";
          else if (ex.mat === "rubber" || ex.mat === "tyre") ws = "rubber";
        } else mark = false;
      }
    }
    const zh = horde.raycast(ox, oy, oz, dir.x, dir.y, dir.z, wt);
    vm.fire(ads, am.mag === 0);
    vm.muzzle(mz);
    if (zh) {
      const hx = zh.x, hy = zh.y, hz = zh.z, zone = zh.zone, Z = zh.Z, res = horde.damage(Z, wd.dmg, zone, dir, wd.headK);
      S4.hits++;
      fx.blood(hx, hy, hz, dir.x, dir.y, dir.z, res.killed ? 1.5 : 1, zone === "head");
      audio.play(zone === "head" ? "headshot" : "hitFlesh", { pos: [hx, hy, hz], vol: 0.9, ref: 4 });
      audio.play(res.killed ? "killmark" : "hitmark", { vol: 0.5, jit: 0 });
      hud.hit(res.killed);
      fx.tracer(mz, v1.set(hx, hy, hz));
    } else if (ws) {
      if (ws !== "none") {
        fx.impact(ws, wx, wy, wz, nx, ny, nz, mark);
        audio.play(HIT_SND[ws] || "hitConcrete", { pos: [wx, wy, wz], vol: 0.7, ref: 4, verb: 0.3 });
        if ((ws === "metal" || ws === "car") && rnd() < 0.3) audio.play("ricochet", { pos: [wx, wy, wz], vol: 0.5, ref: 5 });
      }
      fx.tracer(mz, v1.set(wx, wy, wz));
    } else fx.tracer(mz, v1.set(ox + dir.x * 90, oy + dir.y * 90, oz + dir.z * 90));
    fx.muzzle(mz, dir, wd.flash);
    flash.position.copy(mz).addScaledVector(dir, 0.7).addScaledVector(up, 0.12);
    flash.intensity = wd.light * rr(0.8, 1.2);
    vm.eject(v2);
    v32.copy(rgt).multiplyScalar(rr(1.5, 2.6)).addScaledVector(up, rr(1.1, 2)).addScaledVector(dir, rr(-0.5, 0.3)).add(P3.vel);
    fx.casing(v2, v32, wd.casing);
    {
      const lowN = S4.weapon === "rifle" ? 7 : 4;
      audio.shot(wd.snd, { low: am.mag < lowN ? 1 - am.mag / lowN : 0 });
    }
    P3.recoil(wd.kickP * (1 - 0.35 * ads), (rnd() - 0.5) * 2 * wd.kickY);
    S4.bloom = Math.min(wd.bloomMax, S4.bloom + wd.bloom);
  }
  function wantReload() {
    const wd = WEAPONS[S4.weapon], am = S4.ammo[S4.weapon];
    if (am.mag >= wd.mag || am.reserve <= 0 || vm.busy) return false;
    return vm.reload(am.mag === 0);
  }
  function swap(name) {
    if (name === S4.weapon || vm.state.switchTo) return;
    if (vm.switchTo(name, name === "pistol" && S4.ammo.pistol.mag === 0)) {
      S4.weapon = name;
      S4.bloom = 0;
      audio.play("cloth", { vol: 0.6 });
    }
  }
  function weapons(dt, inp2) {
    const wd = WEAPONS[S4.weapon], am = S4.ammo[S4.weapon];
    S4.fireT = Math.max(-0.02, S4.fireT - dt);
    S4.bloom = Math.max(0, S4.bloom - dt * 0.05);
    S4.dryT -= dt;
    if (!P3.alive) return;
    if (inp2.w1) swap("rifle");
    if (inp2.w2) swap("pistol");
    if (inp2.swap) swap(S4.weapon === "rifle" ? "pistol" : "rifle");
    if (inp2.reload) wantReload();
    const canFire = !vm.busy && vm.state.sprint < 0.35, trig = wd.auto ? inp2.fire : inp2.firePressed;
    if (trig && canFire) {
      if (am.mag > 0) {
        if (S4.fireT <= 0) {
          if (S4.fireT < -0.019) S4.fireT = 0;
          let n = 0;
          while (S4.fireT <= 0 && am.mag > 0 && n++ < 3) fire();
        }
      } else if (inp2.firePressed || S4.dryT < -0.4) {
        if (S4.dryT <= 0) {
          audio.play(S4.weapon === "pistol" ? "pDry" : "dry", { vol: 0.7 });
          S4.dryT = 0.25;
        }
        if (!wantReload() && S4.weapon === "rifle" && am.reserve <= 0 && inp2.firePressed) swap("pistol");
      }
    }
    if (am.mag === 0 && !vm.busy && am.reserve > 0) {
      S4.autoReloadT += dt;
      if (S4.autoReloadT > 0.35) wantReload();
    } else S4.autoReloadT = 0;
    for (const ev of vm.events) {
      const side2 = vm.weapon === "pistol";
      if (ev === "rlStart") audio.play("rlStart", { vol: side2 ? 0.35 : 0.5 });
      else if (ev === "magOut") audio.play(side2 ? "pMagOut" : "magOut", { vol: 0.75, jit: 0.02 });
      else if (ev === "drop") dropMag();
      else if (ev === "magGrab") audio.play("magGrab", { vol: side2 ? 0.35 : 0.5 });
      else if (ev === "magIn") audio.play(side2 ? "pMagIn" : "magIn", { vol: 0.85, jit: 0.02 });
      else if (ev === "boltBack") audio.play("boltBack", { vol: 0.75, jit: 0.02 });
      else if (ev === "boltFwd") audio.play("boltFwd", { vol: 0.9, jit: 0.02 });
      else if (ev === "slide") audio.play("slide", { vol: 0.85, jit: 0.02 });
      else if (ev === "fill") {
        const w = WEAPONS[vm.weapon], a2 = S4.ammo[vm.weapon], n = Math.min(w.mag - a2.mag, a2.reserve);
        a2.mag += n;
        if (a2.reserve !== Infinity) a2.reserve -= n;
      }
    }
    vm.events.length = 0;
    P3.fovT = dbgZoom || lerp5(CFG.fov, wd.adsFov * (CFG.fov / 74), vm.state.ads) + 6 * P3.slideK * (1 - vm.state.ads);
  }
  function reset() {
    horde.clear();
    fx.clear();
    for (const p of pickups) {
      p.on = false;
      p.g.visible = false;
    }
    Object.assign(S4, { time: 0, wave: 0, score: 0, kills: 0, headshots: 0, shots: 0, hits: 0, taken: 0, toSpawn: [], weapon: "rifle", fireT: 0, bloom: 0, heat: 0, interT: 2.2, log: [], progK: -1, progD: -1, progS: -1, progT: 0, stallFix: 0, chain: 0, chainT: 0, bestChain: 0, torch: false, slides: 0, supplies: 0, kicks: 0, uavN: 1, uavP: 0, uavs: 0, uavLow: 0, uavQ: false, supplyDue: false, torchK: 1 });
    torch.intensity = 0;
    drone.dock();
    S4.ammo.rifle.mag = WEAPONS.rifle.mag;
    S4.ammo.rifle.reserve = WEAPONS.rifle.reserve0;
    S4.ammo.pistol.mag = WEAPONS.pistol.mag;
    P3.spawn(W.start.p[0], W.start.p[1], W.start.yaw);
    vm.reset("rifle");
    R4.post.damage = 0;
    R4.post.lowHp = 0;
    R4.post.fade = 0;
  }
  function die() {
    S4.state = "dead";
    const newBest = S4.score > S4.best && S4.score > 0;
    if (S4.score > S4.best) {
      S4.best = S4.score;
      store.set("cordon9.best", S4.best);
      CFG.best = S4.best;
      hud.settings(CFG);
    }
    const acc = S4.shots ? Math.round(S4.hits / S4.shots * 100) : 0;
    hud.death([["Wave reached", S4.wave, 1], ["Score", S4.score, 1], ["Best", S4.best], ["Kills", S4.kills], ["Headshots", S4.headshots], ["Accuracy", acc + "%"], ["Longest chain", S4.bestChain], ["Time", Math.floor(S4.time / 60) + ":" + String(Math.floor(S4.time % 60)).padStart(2, "0")], ["Slides", S4.slides], ["Slide kicks", S4.kicks], ["UAV flights", S4.uavs], ["Supply drops", S4.supplies], ["Damage taken", Math.round(S4.taken)]], "The cordon fell on wave " + S4.wave, { best: newBest });
    audio.play("dead", { vol: 0.9, bus: "music", jit: 0 });
    S4.deadT = 0;
    setTimeout(() => {
      if (S4.state === "dead") hud.show("dead");
    }, auto ? 0 : 1300);
  }
  function prime() {
    const vis = vm.root.visible, ti = torch.intensity, sx = W.start.p[0], sz = W.start.p[1];
    try {
      vm.root.visible = true;
      torch.intensity = 1;
      let i = 0;
      for (const t of ["walker", "runner", "brute"]) horde.spawn(t, sx + (i++ - 1) * 1.2, sz - 5, 0, 1, 0.01);
      R4.frame(0.016);
    } catch (e) {
      console.warn("[game] prime frame failed: " + (e && e.message || e));
    } finally {
      horde.clear();
      fx.clear();
      vm.root.visible = vis;
      torch.intensity = ti;
    }
  }
  function begin() {
    if (!auto) input.lock();
    audio.init();
    audio.resume();
    reset();
    S4.state = "playing";
    hud.show("playing");
  }
  function toTitle() {
    audio.resume();
    horde.clear();
    fx.clear();
    for (const p of pickups) {
      p.on = false;
      p.g.visible = false;
    }
    S4.state = "menu";
    S4.menuT = 0;
    R4.post.damage = 0;
    R4.post.lowHp = 0;
    R4.post.fade = 0;
    R4.post.ads = 0;
    torch.intensity = 0;
    vm.root.visible = false;
    hud.show("menu");
  }
  hud.onClick = (k) => {
    if (k === "menu" || k === "dead") begin();
    else if (k === "restart") {
      audio.resume();
      begin();
    } else if (k === "title") toTitle();
    else if (k === "pause") {
      audio.resume();
      input.lock();
      S4.state = "playing";
      hud.show("playing");
    }
  };
  const pause = () => {
    if (S4.state !== "playing" || auto) return;
    S4.state = "paused";
    hud.show("paused");
    audio.suspend();
  };
  input.onLock = (locked, err) => {
    if (err) {
      if (!input.locked) input.free = true;
      return;
    }
    if (locked) {
      input.free = false;
      return;
    }
    if (!input.free) pause();
  };
  hud.show("menu");
  const inp = { dx: 0, dy: 0, fwd: 0, right: 0, sprint: false, jump: false, ads: false, fire: false, firePressed: false, reload: false, w1: false, w2: false, swap: false, light: false, crouch: false, crouchPressed: false, uav: false };
  function readInput() {
    const d = input.down;
    inp.dx = input.dx;
    inp.dy = input.dy;
    inp.fwd = (d.has("KeyW") || d.has("ArrowUp") ? 1 : 0) - (d.has("KeyS") || d.has("ArrowDown") ? 1 : 0);
    inp.right = (d.has("KeyD") || d.has("ArrowRight") ? 1 : 0) - (d.has("KeyA") || d.has("ArrowLeft") ? 1 : 0);
    inp.sprint = d.has("ShiftLeft") || d.has("ShiftRight");
    inp.jump = input.hit("Space");
    inp.ads = input.rmb;
    inp.fire = input.lmb;
    inp.firePressed = input.lmbPressed;
    inp.reload = input.hit("KeyR");
    inp.w1 = input.hit("Digit1");
    inp.w2 = input.hit("Digit2");
    inp.swap = input.hit("KeyQ") || input.wheel !== 0;
    if (input.hit("KeyM")) hud.toast(audio.toggleMute() ? "Sound off" : "Sound on");
    if (input.hit("KeyP")) S4.showStats = !S4.showStats;
    if (input.hit("Escape") && !input.locked) pause();
    inp.light = input.hit("KeyF");
    inp.crouch = d.has("KeyC");
    inp.crouchPressed = input.hit("KeyC");
    inp.uav = input.hit("KeyE") || input.hit("Digit3");
    if (S4.state === "dead" && (input.hit("KeyR") || input.hit("Enter")) && P3.deadT > 0.8) begin();
    if (S4.state === "menu" && input.hit("Enter") && !hud.settingsOpen) begin();
    return inp;
  }
  const sens = () => input.sens * (R4.camera.fov / CFG.fov) * lerp5(1, CFG.aim, vm.state.ads);
  function update(dt, I) {
    if (S4.state === "menu") {
      S4.menuT += dt;
      const a = Math.sin(S4.menuT * 0.07) * 0.5;
      R4.camera.position.set(W.start.p[0] - 0.4 + Math.sin(S4.menuT * 0.11) * 0.6, 1.72, W.start.p[1] + 1.2);
      R4.camera.rotation.set(0.02, a, 0, "YXZ");
      P3.eye.copy(R4.camera.position);
      vm.root.visible = false;
      W.update(dt, S4.menuT, P3.eye);
      fx.update(dt, S4.menuT, P3.eye);
      updateDrone(dt, S4.menuT, true);
      return;
    }
    if (S4.state === "paused") return;
    vm.root.visible = true;
    S4.time += dt;
    S4.heat = Math.max(0, S4.heat - dt * 0.25);
    const k = sens();
    P3.update(dt, { mx: I.dx * k, my: I.dy * k * (CFG.invert ? -1 : 1), fwd: I.fwd, right: I.right, sprint: I.sprint, jump: I.jump, ads: I.ads && !vm.busy, crouch: I.crouch, crouchPressed: I.crouchPressed });
    if (P3.sliding) slideFx(dt);
    weapons(dt, I);
    vm.update(dt, { ads: I.ads, slide: P3.sliding, sprint: P3.sprinting, dYaw: P3.dYaw, dPitch: P3.dPitch, strafe: I.right * clamp5(P3.moving / 4.3), bobPh: P3.bobPh, bobAmp: P3.bobAmp, lowered: !P3.alive || S4.uavLow > 0 });
    if (S4.uavLow > 0) S4.uavLow -= dt;
    if (I.uav) launchUav();
    else if (S4.uavQ && (!drone.up || drone.leaving)) launchUav();
    {
      const a = vm.state.ads, vf = lerp5(VIEW_FOV, WEAPONS[vm.weapon].adsViewFov || VIEW_FOV, a * a * (3 - 2 * a));
      if (Math.abs(R4.viewCamera.fov - vf) > 4e-3) {
        R4.viewCamera.fov = vf;
        R4.viewCamera.updateProjectionMatrix();
      }
    }
    if (I.light && P3.alive && S4.weapon === "rifle") {
      S4.torch = !S4.torch;
      audio.play("dry", { vol: 0.32, jit: 0.02 });
    }
    {
      let nd = 9;
      if (S4.torch) {
        const fx0 = -Math.sin(P3.yaw), fz0 = -Math.cos(P3.yaw);
        for (const Z of horde.list) if (Z.active && Z.alive) {
          const dx = Z.pos.x - P3.pos.x, dz = Z.pos.z - P3.pos.z, d = Math.hypot(dx, dz);
          if (d < nd && fx0 * dx + fz0 * dz > d * 0.75) nd = d;
        }
      }
      S4.torchK += (lerp5(0.6, 1, clamp5((nd - 1.5) / 3)) - S4.torchK) * Math.min(1, dt * 5);
      const on = S4.torch && P3.alive && S4.weapon === "rifle" && !vm.state.switchTo ? TORCH_CD * (1 - 0.6 * vm.state.sprint) * (G4.params.torchnear === "0" ? 1 : S4.torchK) : 0;
      torch.intensity += (on - torch.intensity) * Math.min(1, dt * 22);
      if (torch.intensity < 0.5 && !on) torch.intensity = 0;
    }
    if (S4.chainT > 0) {
      S4.chainT -= dt;
      if (S4.chainT <= 0) S4.chain = 0;
    }
    horde.update(dt, P3, S4.time);
    if (P3.alive) director(dt);
    updatePickups(dt);
    updateDrone(dt, S4.time, false);
    fx.update(dt, S4.time, P3.eye);
    W.update(dt, S4.time, P3.eye);
    flash.intensity *= Math.exp(-dt * 38);
    if (flash.intensity < 0.5) flash.intensity = 0;
    R4.post.damage = Math.max(0, R4.post.damage - dt * 1.6);
    R4.post.lowHp = P3.alive ? clamp5((35 - P3.hp) / 35) : 0.6;
    R4.post.ads = vm.state.ads;
    S4.flashT = Math.max(0, S4.flashT - dt);
    R4.post.flash = S4.flashT > 0 ? 0.05 * (S4.flashT / 0.35) * (Math.sin(S4.time * 60) > -0.3 ? 1 : 0.2) : 0;
    if (!P3.alive) R4.post.fade = Math.min(0.45, P3.deadT * 0.3);
    audio.setListener(R4.camera);
    audio.update(dt, { intensity: clamp5(horde.near * 0.14 + horde.alive * 0.025 + S4.heat * 0.25), lowHp: P3.alive ? clamp5((40 - P3.hp) / 40) : 0, dead: !P3.alive, music: true });
  }
  let dbgT = 0, fpsN = 0, fpsT = 0, fps = 0;
  function frame2(dt) {
    const I = auto && G4.bot ? G4.bot(dt) : readInput();
    input.playing = S4.state === "playing";
    update(dt, I);
    input.endFrame();
    {
      const nowT = performance.now();
      fpsN++;
      if (nowT - fpsT >= 500) {
        fps = Math.round(fpsN * 1e3 / (nowT - fpsT));
        fpsN = 0;
        fpsT = nowT;
      }
    }
    const wd = WEAPONS[S4.weapon], am = S4.ammo[S4.weapon], px2 = (lerp5(wd.spreadHip, wd.spreadAds, vm.state.ads) + S4.bloom + clamp5(P3.moving / 4.3) * wd.spreadMove) * (innerHeight / 2) / Math.tan(R4.camera.fov * Math.PI / 360);
    dbgT += dt;
    const dbg = G4.params.dbg || input.down.has("F3") || S4.showStats ? `${fps} fps \xB7 scale ${Math.round(G4.quality.scale * 100)}% \xB7 ${(G4.render.stats().tris / 1e6).toFixed(2)}M tris \xB7 ${G4.render.stats().calls} calls \xB7 alive ${horde.alive}` : "";
    const left = horde.alive + S4.toSpawn.length, inter = S4.interT > 0 && S4.wave > 0;
    hud.update(dt, {
      hp: P3.hp,
      stamina: P3.stamina,
      mag: am.mag,
      magMax: wd.mag,
      reserve: am.reserve,
      low: am.mag <= wd.mag * 0.25,
      wname: wd.name,
      weapon: S4.weapon,
      mode: wd.mode,
      wave: Math.max(1, S4.wave),
      left: inter ? "Next in " + Math.ceil(S4.interT) + " s" : left + " remaining",
      waveK: inter ? 1 : S4.total ? 1 - left / S4.total : 0,
      inter,
      score: S4.score,
      chain: S4.chain,
      chainK: S4.chainT / 3.2,
      lamp: S4.torch && S4.weapon === "rifle",
      lampCan: S4.weapon === "rifle",
      spread: px2,
      ads: vm.state.ads,
      crossOn: P3.alive && !vm.reloading && vm.state.sprint < 0.5,
      reloadK: P3.alive ? vm.reloadK : -1,
      stance: P3.sliding ? "slide" : P3.crouch > 0.5 ? "crouch" : P3.sprinting ? "sprint" : "stand",
      dbg,
      hint: !P3.alive ? "" : am.mag === 0 && am.reserve > 0 && !vm.reloading ? "Press R to reload" : S4.weapon === "rifle" && am.mag === 0 && am.reserve <= 0 ? "Rifle empty \xB7 press 2 for sidearm" : P3.hp <= 30 ? "Find a field dressing" : ""
    });
    feedT -= dt;
    if (feedT <= 0 && S4.state !== "menu") {
      feedT = 0.05;
      feed.px = P3.pos.x;
      feed.pz = P3.pos.z;
      feed.yaw = P3.yaw;
      feed.fov = R4.camera.fov;
      feed.enemies.length = 0;
      feed.pickups.length = 0;
      const scan = drone.scanning;
      for (const Z of horde.list) if (Z.active && Z.alive && (scan || Math.hypot(Z.pos.x - P3.pos.x, Z.pos.z - P3.pos.z) < NEAR_R)) feed.enemies.push({ x: Z.pos.x, z: Z.pos.z, type: Z.type });
      for (const q of pickups) if (q.on) feed.pickups.push(q);
      const fd = feed.drone;
      fd.x = drone.pos.x;
      fd.z = drone.pos.z;
      fd.yaw = drone.yaw;
      fd.job = drone.S.job;
      fd.status = drone.status;
      fd.up = drone.up;
      fd.scan = scan;
      fd.sec = Math.max(0, drone.S.scanT);
      fd.k = drone.S.scanDur ? clamp5(drone.S.scanT / drone.S.scanDur) : 0;
      fd.n = S4.uavN;
      fd.p = S4.uavP;
      fd.need = UAV_NEED;
      fd.q = !!S4.uavQ;
      fd.max = UAV_MAX;
      hud.world(0.05, feed);
    }
  }
  let feedT = 0;
  const feed = { px: 0, pz: 0, yaw: 0, fov: 74, enemies: [], pickups: [], drone: { x: 0, z: 0, yaw: 0, job: null, status: "", up: false, scan: false, sec: 0, k: 0, n: 0, p: 0, need: 1, max: 1 } };
  const Game = {
    S: S4,
    W,
    P: P3,
    vm,
    horde,
    fx,
    phys,
    surf,
    audio,
    hud,
    input,
    torch,
    drone,
    CFG,
    update,
    frame: frame2,
    begin,
    reset,
    prime,
    startWave,
    fire,
    swap,
    launchUav,
    feed,
    WEAPONS,
    pickups,
    inp,
    info: () => ({ arena: W.stats, horde: horde.stats, vm: vm.stats, audio: audio.stats })
  };
  G4.game = Game;
  return Game;
}

