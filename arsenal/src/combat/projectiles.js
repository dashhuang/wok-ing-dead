// Travelling projectiles: nails, bolts, coins, paper talismans, rockets, shells, oil, sword waves.
// Each one is swept against the zombies and the range every frame; behaviour is supplied by the
// weapon through callbacks, so this file only knows how things fly, look and stick.
import * as THREE from "three";
import { C, rand, srand } from "../fx/core.js";
import { FONT_KAI } from "../kit/index.js";

const _a = new THREE.Vector3(),
  _b = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _z = new THREE.Vector3(0, 0, 1);

function std(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? 0.5,
    metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.glow ?? 0,
    side: o.side ?? THREE.FrontSide,
  });
}
function along(geo) {
  // THREE cylinders/cones run along Y: turn them so they run along +Z (the flight direction)
  geo.rotateX(Math.PI / 2);
  return geo;
}
function paperTexture(bg, ink, glyph = "敕令") {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, 96, 256);
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 3;
  g.strokeRect(6, 6, 84, 244);
  g.font = `700 38px ${FONT_KAI}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  [...glyph].forEach((ch, i) => g.fillText(ch, 48, 36 + i * 42));
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(48, 104);
  for (let i = 0; i < 7; i++)
    g.quadraticCurveTo(i % 2 ? 22 : 74, 112 + i * 17, 48, 122 + i * 17);
  g.stroke();
  g.beginPath();
  g.arc(48, 224, 12, 0.6, 6.6);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildProtos() {
  const P = {};
  const group = (...m) => {
    const g = new THREE.Group();
    for (const x of m) g.add(x);
    return g;
  };
  const mesh = (geo, mat, pos) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true;
    return m;
  };
  // --- nails (tip at +Z)
  const steel = std(0x9a9ea6, { metal: 1, rough: 0.35 });
  const nailShaft = along(new THREE.CylinderGeometry(0.0021, 0.0021, 0.085, 6));
  const nailTip = along(new THREE.ConeGeometry(0.0021, 0.012, 6));
  const nailHead = along(
    new THREE.CylinderGeometry(0.0052, 0.0052, 0.0016, 10),
  );
  P.nail = group(
    mesh(nailShaft, steel),
    mesh(nailTip, steel, [0, 0, 0.0485]),
    mesh(nailHead, steel, [0, 0, -0.043]),
  );
  const hot = std(0x2a0a04, {
    metal: 0.6,
    rough: 0.5,
    emissive: 0xff5a14,
    glow: 5,
  });
  P.hotnail = group(
    mesh(nailShaft, hot),
    mesh(nailTip, hot, [0, 0, 0.0485]),
    mesh(nailHead, hot, [0, 0, -0.043]),
  );
  const longShaft = along(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 6));
  P.spike = group(
    mesh(longShaft, steel),
    mesh(along(new THREE.ConeGeometry(0.003, 0.02, 6)), steel, [0, 0, 0.09]),
    mesh(
      along(new THREE.CylinderGeometry(0.0075, 0.0075, 0.002, 10)),
      steel,
      [0, 0, -0.081],
    ),
  );
  // --- crossbow bolts
  const bamboo = std(0xb49a52, { rough: 0.5 });
  const iron = std(0x2a2c30, { metal: 0.9, rough: 0.45 });
  const feather = std(0xd8d2c0, { rough: 0.9, side: THREE.DoubleSide });
  const shaft = along(new THREE.CylinderGeometry(0.0042, 0.0042, 0.3, 8));
  const head = along(new THREE.ConeGeometry(0.0075, 0.04, 4));
  const fl = new THREE.PlaneGeometry(0.018, 0.06);
  const fletch = () => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const m = mesh(fl, feather);
      m.rotation.set(Math.PI / 2, 0, 0);
      const h = new THREE.Group();
      m.position.set(0.011, 0, 0);
      h.add(m);
      h.rotation.z = (i / 3) * Math.PI * 2;
      g.add(h);
    }
    g.position.z = -0.115;
    return g;
  };
  P.bolt = group(mesh(shaft, bamboo), mesh(head, iron, [0, 0, 0.17]), fletch());
  const powder = std(0x9a1810, { rough: 0.7 });
  const fuseGlow = std(0x1a0804, { emissive: 0xff8a20, glow: 7 });
  P.firebolt = group(
    mesh(shaft, bamboo),
    mesh(head, iron, [0, 0, 0.17]),
    fletch(),
    mesh(
      along(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 10)),
      powder,
      [0, -0.014, 0.08],
    ),
    mesh(new THREE.SphereGeometry(0.006, 8, 6), fuseGlow, [0, -0.014, 0.036]),
  );
  const strip = mesh(
    new THREE.PlaneGeometry(0.03, 0.16),
    new THREE.MeshStandardMaterial({
      map: paperTexture("#d9b23c", "#a01208"),
      side: THREE.DoubleSide,
      roughness: 0.8,
      emissive: 0xffb030,
      emissiveIntensity: 0.2,
    }),
  );
  strip.geometry.rotateX(Math.PI / 2);
  strip.position.set(0, 0.004, -0.21);
  strip.name = "flutter";
  P.sealbolt = group(
    mesh(shaft, bamboo),
    mesh(head, iron, [0, 0, 0.17]),
    fletch(),
    strip,
  );
  // --- coins (axis along X so they roll forward)
  const gold = std(0xd0a23c, {
    metal: 1,
    rough: 0.3,
    emissive: 0xffb030,
    glow: 0.6,
  });
  const coinGeo = new THREE.TorusGeometry(0.0085, 0.004, 6, 14);
  coinGeo.rotateY(Math.PI / 2);
  coinGeo.scale(0.35, 1, 1);
  P.coin = group(mesh(coinGeo, gold));
  // --- paper talismans (long axis along Z, face up)
  const paper = (bg, ink, emissive) => {
    const tex = paperTexture(bg, ink);
    const g = new THREE.PlaneGeometry(0.07, 0.2, 1, 6);
    // a slight curl so the sheet catches the light
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.sin((p.getY(i) / 0.2 + 0.5) * Math.PI) * 0.012);
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2);
    return group(
      mesh(
        g,
        new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive,
          emissiveIntensity: 0.9,
          side: THREE.DoubleSide,
          roughness: 0.8,
        }),
      ),
    );
  };
  P.talisman = paper("#d9b23c", "#a01208", 0xffb030);
  P.talisman_a = paper("#1a2a6a", "#dfe8ff", 0x6fb0ff);
  P.talisman_b = paper("#b01a10", "#ffd060", 0xff5a20);
  // --- fireworks
  const redPaper = std(0xa81810, { rough: 0.8 });
  const goldBand = std(0xd0a23c, { metal: 0.8, rough: 0.4 });
  const stick = std(0x8a6a3c, { rough: 0.8 });
  P.rocket = group(
    mesh(
      along(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 12)),
      redPaper,
      [0, 0, 0.02],
    ),
    mesh(along(new THREE.ConeGeometry(0.016, 0.04, 12)), goldBand, [0, 0, 0.1]),
    mesh(
      along(new THREE.CylinderGeometry(0.0146, 0.0146, 0.012, 12)),
      goldBand,
      [0, 0, -0.03],
    ),
    mesh(
      along(new THREE.CylinderGeometry(0.0022, 0.0022, 0.3, 5)),
      stick,
      [0.012, 0, -0.12],
    ),
  );
  P.shell = group(
    mesh(new THREE.SphereGeometry(0.052, 18, 12), redPaper),
    mesh(along(new THREE.CylinderGeometry(0.053, 0.053, 0.012, 18)), goldBand),
    mesh(
      along(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6)),
      std(0x1a0804, { emissive: 0xff8a20, glow: 6 }),
      [0, 0, -0.07],
    ),
  );
  // --- oil
  P.oil = group(
    mesh(
      new THREE.SphereGeometry(0.07, 12, 8),
      std(0x3a1a04, { rough: 0.15, emissive: 0xff6a10, glow: 1.6 }),
    ),
  );
  return P;
}

// crescent wave of sword energy: an arc band in the XY plane travelling along +Z
// The band is the same for every wave, so it is built once and shared (only the material differs).
let crescentGeo = null;
function crescentGeometry() {
  if (crescentGeo) return crescentGeo;
  const seg = 28;
  const pos = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const a = (u - 0.5) * 2.5; // arc angle
    const w = 0.16 * Math.pow(Math.sin(u * Math.PI), 0.6) + 0.004;
    for (const s of [-1, 1]) {
      const r = 1 + s * w;
      // bulge forward in the middle so the wave reads as a blade from the shooter's side
      pos.push(Math.sin(a) * r, 0, Math.cos(a) * r - 0.75);
      uv.push(u, s * 0.5 + 0.5);
    }
    if (i < seg)
      idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  crescentGeo = g;
  return g;
}
function crescent(color, core) {
  const g = crescentGeometry();
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Vector3(...color) },
      uCore: { value: new THREE.Vector3(...core) },
      uAlpha: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform vec3 uCore; uniform float uAlpha;
      void main(){ float e = smoothstep(0.35, 1.0, vUv.y); float tail = smoothstep(0.0, 0.8, vUv.y);
        float ends = sin(vUv.x * 3.14159);
        vec3 c = mix(uColor, uCore, pow(e, 3.0)); float a = (tail * 0.5 + pow(e, 4.0)) * ends * uAlpha;
        gl_FragColor = vec4(c * a, a); }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 21;
  const grp = new THREE.Group();
  grp.add(mesh);
  return grp;
}

export function createProjectiles(lab, fx, E, targets) {
  const { stage } = lab;
  const range = stage.range;
  const root = new THREE.Group();
  root.name = "projectiles";
  stage.range.group.add(root);
  const protos = buildProtos();
  const live = [];
  const stuck = []; // { obj, until }
  const MAX_STUCK = 90;

  function makeMesh(kind, o) {
    if (kind === "crescent")
      return crescent(o.color || C(0xffc23a, 3), o.core || [5, 4.4, 2.6]);
    const p = protos[kind];
    return p ? p.clone() : null;
  }

  // Clones share their prototype's geometry and materials; only a mesh's own one-off material
  // (the sword wave's) has to be let go with it.
  function drop(mesh) {
    root.remove(mesh);
    mesh.traverse((o) => {
      if (
        o.material &&
        o.material.isShaderMaterial &&
        o.geometry === crescentGeo
      )
        o.material.dispose();
    });
  }

  const api = {
    live,
    /**
     * spawn({
     *   kind,                 // mesh: nail | hotnail | spike | bolt | firebolt | sealbolt | coin | talisman[_a|_b] | rocket | shell | oil | crescent | null
     *   pos, vel, gravity, drag, life, radius, scale,
     *   trail: ribbon options (span, width, color, kind), spin (rad/s about the flight axis), tumble (rad/s),
     *   flutter (paper wobble), wobble (corkscrew radius for rockets),
     *   homing: { target, turn (rad/s), acquire(p) -> zombie },
     *   onTick(p, dt), onHit(p, { z, point, head, dir }) -> "stop" | "pierce" | "stick",
     *   onWorld(p, { point, normal, surface }) -> "stop" | "bounce" | "continue" (already redirected), onExpire(p)
     * })
     */
    spawn(o) {
      const p = {
        ...o,
        pos: o.pos.clone(),
        vel: o.vel.clone(),
        age: 0,
        life: o.life ?? 4,
        gravity: o.gravity ?? 0,
        drag: o.drag ?? 0,
        radius: o.radius ?? 0.03,
        hit: new Set(o.skip || []),
        bounces: 0,
        dead: false,
        phase: Math.random() * 6.28,
        data: o.data || {},
      };
      p.mesh = makeMesh(o.kind, o);
      if (p.mesh) {
        if (o.scale) p.mesh.scale.setScalar(o.scale);
        p.mesh.position.copy(p.pos);
        root.add(p.mesh);
        orient(p, 0);
      }
      if (o.trail)
        p.ribbon = fx.ribbon({ span: 0.25, width: 0.03, max: 36, ...o.trail });
      live.push(p);
      return p;
    },
    update(dt, t) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        step(p, dt, t);
        if (p.dead) {
          live.splice(i, 1);
          if (p.ribbon) p.ribbon.release();
          if (p.mesh && !p.kept) drop(p.mesh);
        }
      }
      for (let i = stuck.length - 1; i >= 0; i--) {
        const s = stuck[i];
        if (t > s.until || !s.obj.parent) {
          s.obj.parent && s.obj.parent.remove(s.obj);
          stuck.splice(i, 1);
        } else if (s.tick) s.tick(s, dt, t);
      }
      while (stuck.length > MAX_STUCK) {
        const s = stuck.shift();
        s.obj.parent && s.obj.parent.remove(s.obj);
      }
    },
    /** Leave the projectile's mesh where it hit: in the world or riding on a zombie. Returns the stuck record. */
    stick(p, z, seconds = 8, depth = 0.03) {
      if (!p.mesh) return null;
      p.kept = true;
      const m = p.mesh;
      m.position.copy(p.pos).addScaledVector(_a.copy(p.vel).normalize(), depth);
      if (z) {
        z.holder.attach(m);
        z.stuck.push(m);
      }
      const rec = { obj: m, until: fx.time + seconds, z };
      stuck.push(rec);
      return rec;
    },
    clear() {
      for (const p of live) {
        if (p.ribbon) p.ribbon.release();
        if (p.mesh) drop(p.mesh);
      }
      live.length = 0;
      for (const s of stuck) s.obj.parent && s.obj.parent.remove(s.obj);
      stuck.length = 0;
    },
  };

  function orient(p, t) {
    const m = p.mesh;
    if (!m) return;
    const sp = p.vel.length();
    if (sp > 0.01) {
      _q.setFromUnitVectors(_z, _a.copy(p.vel).multiplyScalar(1 / sp));
      m.quaternion.copy(_q);
    }
    if (p.spin) m.rotateZ(p.age * p.spin);
    if (p.tumble) m.rotateX(p.age * p.tumble);
    if (p.flutter) {
      m.rotateZ(Math.sin(p.age * 19 + p.phase) * p.flutter);
      m.rotateX(Math.sin(p.age * 13 + p.phase * 2) * p.flutter * 0.6);
    }
    const fl = m.getObjectByName("flutter");
    if (fl) fl.rotation.x = Math.sin(p.age * 40 + p.phase) * 0.5;
  }

  function step(p, dt, t) {
    p.age += dt;
    if (p.age >= p.life) {
      p.dead = true;
      p.onExpire && p.onExpire(p);
      return;
    }
    // homing
    if (p.homing) {
      let tg = p.homing.target;
      if ((!tg || !tg.alive) && p.homing.acquire)
        tg = p.homing.target = p.homing.acquire(p);
      if (tg && tg.alive && p.age > (p.homing.delay || 0)) {
        const sp = p.vel.length();
        _a.subVectors(p.homing.head ? tg.headPos : tg.chest, p.pos).normalize();
        _b.copy(p.vel).multiplyScalar(1 / sp);
        const k = Math.min(1, p.homing.turn * dt);
        _b.lerp(_a, k).normalize();
        p.vel.copy(_b).multiplyScalar(sp);
      }
    }
    p.vel.y -= p.gravity * dt;
    if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * dt));
    if (p.wobble) {
      // corkscrew: rockets never fly straight
      const sp = p.vel.length();
      _a.copy(p.vel).multiplyScalar(1 / sp);
      _b.set(-_a.z, 0, _a.x).normalize();
      const w = p.wobble * sp;
      p.vel.addScaledVector(_b, Math.cos(p.age * 21 + p.phase) * w * dt * 21);
      p.vel.y += Math.sin(p.age * 21 + p.phase) * w * dt * 21;
    }
    const dist = p.vel.length() * dt;
    if (dist > 1e-6) {
      const dir = _a.copy(p.vel).normalize().clone();
      const zh = targets.raycast(p.pos, dir, dist + p.radius, p.hit);
      const wh = range.raycast(p.pos, dir, dist + p.radius * 0.5);
      if (zh && (!wh || zh.dist <= wh.dist) && p.onHit) {
        p.pos.copy(zh.point);
        p.hit.add(zh.z);
        const r = p.onHit(p, { z: zh.z, point: zh.point, head: zh.head, dir });
        if (r !== "pierce") {
          p.dead = true;
          if (p.mesh) p.mesh.position.copy(p.pos);
          return;
        }
      } else if (wh) {
        p.pos.copy(wh.point);
        const r = p.onWorld ? p.onWorld(p, wh) : "stop";
        if (r === "bounce") {
          p.bounces++;
          const n = wh.normal;
          p.vel
            .addScaledVector(n, -2 * p.vel.dot(n))
            .multiplyScalar(p.bounce ?? 0.6);
          p.pos.addScaledVector(n, 0.02);
        } else if (r === "continue") {
          // the callback has already redirected the projectile
        } else {
          p.dead = true;
          if (p.mesh) p.mesh.position.copy(p.pos);
          return;
        }
      } else {
        p.pos.addScaledVector(dir, dist);
      }
    }
    if (p.mesh) {
      p.mesh.position.copy(p.pos);
      orient(p, t);
    }
    if (p.ribbon) p.ribbon.push(p.pos);
    p.onTick && p.onTick(p, dt, t);
  }

  return api;
}
