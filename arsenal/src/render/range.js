// The firing range: a short, wet back street. The shooter stands at the origin looking down -Z.
// It only has to make weapon effects readable in the game's lighting, so it is built from a few
// textured boxes, neon signs and a rain layer, using the game's own PBR textures.
import * as THREE from "three";
import { FONT_KAI, FONT_HEI } from "../kit/index.js";

export const RANGE = { halfW: 5.2, far: -46, near: 6, wallH: 9 };

// The single-file showcase has no asset folder beside it: plain colours stand in for the textures.
let BARE = false;
function pbr(name, repeat, extra = {}) {
  if (BARE)
    return new THREE.MeshStandardMaterial({
      color: 0x3a3632,
      roughness: 0.8,
      ...extra,
    });
  const L = new THREE.TextureLoader();
  const load = (suffix, srgb) => {
    const t = L.load(`/assets/textures/${name}_${suffix}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const arm = load("arm", false);
  return new THREE.MeshStandardMaterial({
    map: load("diff", true),
    normalMap: load("nor", false),
    aoMap: arm,
    roughnessMap: arm,
    metalnessMap: arm,
    metalness: 1,
    roughness: 1,
    ...extra,
  });
}

function neonSign(
  text,
  color,
  w,
  h,
  { vertical = false, sub = "", font = FONT_KAI } = {},
) {
  const c = document.createElement("canvas");
  const S = 256;
  c.width = Math.round((S * w) / Math.max(w, h));
  c.height = Math.round((S * h) / Math.max(w, h));
  const g = c.getContext("2d");
  g.fillStyle = "#050506";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = color;
  g.lineWidth = 5;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const chars = [...text];
  if (vertical) {
    const step = (c.height - 30) / chars.length;
    g.font = `700 ${Math.min(step * 0.86, c.width * 0.7)}px ${font}`;
    chars.forEach((ch, i) =>
      g.fillText(ch, c.width / 2, 15 + step * (i + 0.5)),
    );
  } else {
    const step = (c.width - 30) / chars.length;
    g.font = `700 ${Math.min(step * 0.9, c.height * (sub ? 0.5 : 0.66))}px ${font}`;
    chars.forEach((ch, i) =>
      g.fillText(ch, 15 + step * (i + 0.5), c.height * (sub ? 0.42 : 0.5)),
    );
    if (sub) {
      g.font = `600 ${c.height * 0.14}px ${FONT_HEI}`;
      g.fillText(sub, c.width / 2, c.height * 0.8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 2.6,
      roughness: 0.5,
    }),
  );
  return m;
}

export function buildRange(kit, opts = {}) {
  BARE = !!opts.bare;
  const group = new THREE.Group();
  group.name = "range";
  const { halfW, far, near, wallH } = RANGE;
  const len = near - far;
  const zc = (near + far) / 2;

  // ground: wet pavers
  const groundMat = pbr("pavers", [5, len / 2.2], {
    roughness: 0.34,
    envMapIntensity: 1.6,
    color: 0x6a6e78,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2 + 8, len + 30),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, zc);
  ground.receiveShadow = true;
  group.add(ground);

  // walls
  const mkWall = (mat, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const segLen = len / 3;
  const wallMats = [
    pbr("brick_red", [segLen / 2.4, wallH / 2.4]),
    pbr("plaster_peel", [segLen / 3, wallH / 3]),
    pbr("brick_teal", [segLen / 2.4, wallH / 2.4]),
    pbr("plaster_yellow", [segLen / 3, wallH / 3]),
    pbr("brick_orange", [segLen / 2.4, wallH / 2.4]),
    pbr("plaster_blue", [segLen / 3, wallH / 3]),
  ];
  for (let i = 0; i < 3; i++) {
    const z = near - segLen * (i + 0.5);
    mkWall(wallMats[i * 2], 0.6, wallH, segLen, -halfW - 0.3, wallH / 2, z);
    mkWall(wallMats[i * 2 + 1], 0.6, wallH, segLen, halfW + 0.3, wallH / 2, z);
  }
  mkWall(
    pbr("brick_white", [(halfW * 2 + 1.2) / 2.4, wallH / 2.4]),
    halfW * 2 + 1.2,
    wallH,
    0.6,
    0,
    wallH / 2,
    far - 0.3,
  );
  // shutters and doorways break up the walls
  const shutter = pbr("shutter", [1.2, 1]);
  const shutterR = pbr("shutter_rust", [1.2, 1]);
  const dark = new THREE.MeshStandardMaterial({
    color: 0x050506,
    roughness: 0.9,
  });
  [-3, -12, -21, -30, -39].forEach((z, i) => {
    mkWall(i % 2 ? shutter : shutterR, 0.08, 2.7, 3.2, -halfW + 0.02, 1.35, z);
    mkWall(
      i % 2 ? shutterR : shutter,
      0.08,
      2.7,
      3.2,
      halfW - 0.02,
      1.35,
      z - 4.5,
    );
    mkWall(dark, 0.1, 1.3, 1.6, -halfW + 0.03, 5.2, z - 1);
    mkWall(dark, 0.1, 1.3, 1.6, halfW - 0.03, 5.2, z - 5);
  });
  // kerbs
  const kerb = pbr("granite", [0.3, len / 1.2]);
  mkWall(kerb, 0.9, 0.14, len, -halfW + 0.45, 0.07, zc);
  mkWall(kerb, 0.9, 0.14, len, halfW - 0.45, 0.07, zc);

  // neon
  const signs = [
    {
      t: "守夜人",
      c: "#ff3b8d",
      w: 0.7,
      h: 2.6,
      v: true,
      p: [-halfW + 0.35, 4.6, -7],
      ry: Math.PI / 2,
      light: 0xff3b8d,
    },
    {
      t: "靶場",
      c: "#35e0ff",
      w: 2.6,
      h: 1.1,
      sub: "FIRING RANGE",
      p: [0, 5.4, far + 0.1],
      ry: 0,
      light: 0x35e0ff,
    },
    {
      t: "五金",
      c: "#ffb02e",
      w: 1.7,
      h: 0.8,
      p: [halfW - 0.35, 3.5, -14],
      ry: -Math.PI / 2,
      light: 0xffb02e,
    },
    {
      t: "燒臘",
      c: "#ff4a2a",
      w: 0.7,
      h: 1.7,
      v: true,
      p: [halfW - 0.35, 4.4, -27],
      ry: -Math.PI / 2,
      light: 0xff4a2a,
    },
    {
      t: "當",
      c: "#8dff5a",
      w: 1.1,
      h: 1.1,
      p: [-halfW + 0.35, 3.9, -22],
      ry: Math.PI / 2,
      light: 0x8dff5a,
    },
    {
      t: "茶",
      c: "#ff3b8d",
      w: 1.0,
      h: 1.0,
      p: [-halfW + 0.35, 4.2, -36],
      ry: Math.PI / 2,
      light: 0xff3b8d,
    },
  ];
  const lights = [];
  for (const s of signs) {
    const m = neonSign(s.t, s.c, s.w, s.h, { vertical: s.v, sub: s.sub });
    m.position.set(...s.p);
    m.rotation.y = s.ry;
    group.add(m);
    const l = new THREE.PointLight(s.light, 15, 15, 2);
    l.position.set(s.p[0] * 0.8, s.p[1] - 0.3, s.p[2] + (s.ry === 0 ? 1.2 : 0));
    group.add(l);
    lights.push({ l, base: 15, ph: Math.random() * 10, flicker: s.t === "茶" });
  }

  // lantern strings
  const lanternGeo = new THREE.SphereGeometry(0.19, 14, 10);
  lanternGeo.scale(1, 0.86, 1);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0x7a0c08,
    emissive: 0xff2a10,
    emissiveIntensity: 1.5,
    roughness: 0.6,
  });
  const rows = [-5, -16, -29, -41];
  const lanterns = new THREE.InstancedMesh(
    lanternGeo,
    lanternMat,
    rows.length * 7,
  );
  const wires = [];
  const dummy = new THREE.Object3D();
  let li = 0;
  for (const z of rows) {
    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7;
      const x = (u - 0.5) * halfW * 2;
      const y = 6.4 - Math.sin(u * Math.PI) * 0.7;
      dummy.position.set(x, y - 0.25, z);
      dummy.updateMatrix();
      lanterns.setMatrixAt(li++, dummy.matrix);
    }
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      wires.push(
        new THREE.Vector3(
          (u - 0.5) * halfW * 2,
          6.4 - Math.sin(u * Math.PI) * 0.7,
          z,
        ),
      );
      if (i > 0 && i < 14) wires.push(wires[wires.length - 1].clone());
    }
  }
  group.add(lanterns);
  group.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(wires),
      new THREE.LineBasicMaterial({ color: 0x050505 }),
    ),
  );
  const lanternLight = new THREE.PointLight(0xff5020, 14, 18, 2);
  lanternLight.position.set(0, 5.4, -10);
  group.add(lanternLight);

  // distance markers painted on the ground
  for (const d of [10, 20, 30, 40]) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(230,220,190,0.75)";
    g.font = `700 44px ${FONT_HEI}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(`${d} M`, 128, 34);
    g.fillRect(0, 60, 256, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.4),
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 0.6,
        depthWrite: false,
        opacity: 0.6,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(-halfW + 2, 0.012, -d);
    group.add(m);
  }

  // base lighting: overcast night sky plus a cool key that throws shadows down the street
  const hemi = new THREE.HemisphereLight(0x46587e, 0x0e0b08, 0.62);
  group.add(hemi);
  const moon = new THREE.DirectionalLight(0x9db8ff, 0.8);
  moon.position.set(-6, 14, 6);
  moon.target.position.set(0, 0, -10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera;
  sc.left = -9;
  sc.right = 9;
  sc.top = 16;
  sc.bottom = -16;
  sc.near = 1;
  sc.far = 50;
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.02;
  group.add(moon, moon.target);
  // a soft lamp over the shooter so the weapon is never a silhouette
  const lamp = new THREE.SpotLight(0xffe2c0, 30, 7, 0.55, 0.9, 2);
  lamp.position.set(-0.7, 3.2, 0.7);
  lamp.target.position.set(0.15, 1.4, -0.6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0003;
  lamp.shadow.normalBias = 0.003;
  lamp.shadow.camera.near = 0.5;
  lamp.shadow.camera.far = 8;
  group.add(lamp, lamp.target);

  // rain: streaks in a box that follows the camera
  const N = 1400;
  const rp = new Float32Array(N * 6);
  const rs = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - 0.5) * 22,
      y = Math.random() * 14,
      z = (Math.random() - 0.5) * 44;
    rp.set([x, y, z, x, y, z], i * 6);
    rs[i * 2] = 0;
    rs[i * 2 + 1] = 1;
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  rg.setAttribute("aEnd", new THREE.BufferAttribute(rs, 1));
  const rainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: `attribute float aEnd; uniform float uT; uniform vec3 uCam; varying float vA;
      void main(){
        vec3 p = position;
        float sp = 15.0 + fract(p.x * 13.7 + p.z * 7.3) * 6.0;
        p.y = mod(p.y - uT * sp, 14.0);
        p.x += uCam.x; p.z += uCam.z - 12.0;
        p.y += aEnd * 0.55; p.x += aEnd * 0.035;
        vA = (1.0 - aEnd) * 0.5 + 0.12;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.62, 0.7, 0.85) * 0.9, vA * 0.34); }`,
  });
  const rain = new THREE.LineSegments(rg, rainMat);
  rain.frustumCulled = false;
  group.add(rain);

  const fog = new THREE.FogExp2(0x0b1119, 0.03);
  const sky = new THREE.Color(0x0b1119);

  return {
    group,
    fog,
    sky,
    ground,
    bounds: RANGE,
    update(dt, t, camera) {
      rainMat.uniforms.uT.value = t;
      rainMat.uniforms.uCam.value.copy(camera.position);
      for (const s of lights) {
        const f = s.flicker
          ? (Math.sin(t * 31 + s.ph) > 0.2 ? 1 : 0.25) *
            (Math.sin(t * 3.1 + s.ph) > -0.6 ? 1 : 0.1)
          : 1;
        s.l.intensity = s.base * (0.92 + 0.08 * Math.sin(t * 7 + s.ph)) * f;
      }
    },
    /**
     * Ray against the static range (ground, walls). Returns { dist, point, normal, surface } or null.
     */
    raycast(o, d, max = 300) {
      let best = null;
      const test = (t, nx, ny, nz, surface) => {
        if (t > 1e-4 && t < max && (!best || t < best.dist)) {
          const p = new THREE.Vector3(
            o.x + d.x * t,
            o.y + d.y * t,
            o.z + d.z * t,
          );
          if (p.y < -0.01 || p.y > wallH + 0.01) return;
          if (Math.abs(p.x) > halfW + 0.01 || p.z < far - 0.01) return;
          best = {
            dist: t,
            point: p,
            normal: new THREE.Vector3(nx, ny, nz),
            surface,
          };
        }
      };
      if (d.y < 0) test(-o.y / d.y, 0, 1, 0, "ground");
      if (d.x < 0) test((-halfW - o.x) / d.x, 1, 0, 0, "wall");
      if (d.x > 0) test((halfW - o.x) / d.x, -1, 0, 0, "wall");
      if (d.z < 0) test((far - o.z) / d.z, 0, 0, 1, "wall");
      return best;
    },
  };
}
