// Renderer, post-processing, image-based lighting and the two places a weapon can be looked at:
// the showcase (turntable under studio lights) and the firing range (first person, rainy street).
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { buildRange } from "./range.js";

const FX_LIGHTS = 6;

// Image-based lighting, rendered once into a cube map from a handful of emissive cards.
//   "street": a cool soft box overhead, magenta and cyan tubes at the sides, warm lanterns behind;
//             gives gun metal the reflections the rainy street would.
//   "studio": large neutral soft boxes with only a hint of colour, for judging materials.
function makeEnvironment(renderer, kind) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(kind === "studio" ? 0x050506 : 0x020304);
  const add = (w, h, color, power, pos, look = [0, 0.5, 0]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(power),
        side: THREE.DoubleSide,
      }),
    );
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  if (kind === "studio") {
    add(9, 6, 0xf2f4ff, 3.4, [0, 7, 0.5]); // overhead soft box
    add(5, 7, 0xfff2e2, 3.0, [-7.5, 3, 3.5]); // key side
    add(5, 7, 0xdfe6ff, 1.1, [7.5, 2.5, 3.5]); // fill side
    add(7, 3, 0xffffff, 1.2, [0, 2.5, 9]); // front card
    add(0.6, 6, 0xff3a90, 3.2, [-5, 2, -7]); // colour kickers behind
    add(0.6, 6, 0x2ad0ff, 3.2, [5.5, 2, -6.5]);
    add(16, 16, 0x14161a, 1, [0, -3, 0]); // floor
  } else {
    add(8, 5, 0xe4ecff, 4.2, [0.5, 6.5, -0.5]);
    add(5, 6, 0xfff0dc, 2.6, [-7, 3, 4]);
    add(4, 5, 0xcfd8ff, 1.4, [7, 2.5, 5]);
    add(0.5, 7, 0xff2a8a, 8, [-7, 1.5, -3.5]);
    add(0.5, 7, 0x22d8ff, 8, [7, 1.2, -2.5]);
    add(1.6, 1.6, 0xff7a22, 6, [3.5, 3.4, 8]);
    add(1.2, 1.2, 0xff3a1a, 5, [-3, 2.6, 9]);
    add(12, 1.6, 0x8a9ab8, 1.4, [0, 0.6, -9]);
    add(14, 14, 0x20242c, 1, [0, -4, 0]);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  s.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return tex;
}

function buildStudio(kit) {
  const g = new THREE.Group();
  g.name = "studio";
  // backdrop: inside of a sphere with a soft vertical gradient and a faint vignette
  const back = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {},
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 top = vec3(0.006, 0.007, 0.010);
          vec3 mid = vec3(0.022, 0.020, 0.024);
          vec3 low = vec3(0.008, 0.008, 0.009);
          vec3 c = mix(low, mid, smoothstep(-0.35, 0.02, h));
          c = mix(c, top, smoothstep(0.02, 0.7, h));
          // two soft colour washes, like neon behind frosted glass
          c += vec3(0.03, 0.003, 0.012) * pow(smoothstep(0.55, 1.0, dot(vDir, normalize(vec3(-0.8, 0.1, -0.55)))), 2.0);
          c += vec3(0.002, 0.014, 0.02) * pow(smoothstep(0.55, 1.0, dot(vDir, normalize(vec3(0.85, 0.08, -0.45)))), 2.0);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  g.add(back);
  // floor: dark polished stone
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 96),
    new THREE.MeshStandardMaterial({
      color: 0x08090b,
      roughness: 0.5,
      metalness: 0.0,
      envMapIntensity: 0.18,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  // plinth: black lacquer drum with a brass band
  const M = kit.M();
  M.add(
    kit.lathe(
      [
        [0, 0],
        [0, 0.62, 0.004],
        [0.05, 0.62, 0.006],
        [0.058, 0.6, 0.004],
        [0.085, 0.6, 0.008],
        [0.085, 0],
      ],
      { seg: 72 },
    ),
    "lacquer_black",
    { rot: [-Math.PI / 2, 0, 0] },
  );
  M.add(
    kit.lathe(
      [
        [0.05, 0.6],
        [0.05, 0.626, 0.002],
        [0.058, 0.626, 0.002],
        [0.058, 0.6],
      ],
      { seg: 72 },
    ),
    "brass_aged",
    { rot: [-Math.PI / 2, 0, 0] },
  );
  const plinth = M.build("plinth");
  g.add(plinth);

  const key = new THREE.SpotLight(0xfff1e0, 95, 14, 0.36, 0.7, 2);
  key.position.set(-2.4, 4.4, 2.6);
  key.target.position.set(0, 1.15, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.004;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 9;
  key.shadow.radius = 5;
  g.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xb4c8ff, 0.3);
  fill.position.set(3, 2, 3);
  g.add(fill);
  // narrow coloured kickers from behind: they graze the weapon and miss the stage floor
  const rim = (color, pos) => {
    const l = new THREE.SpotLight(color, 14, 10, 0.2, 0.8, 2);
    l.position.set(...pos);
    l.target.position.set(0, 1.25, 0);
    g.add(l, l.target);
    return l;
  };
  rim(0xff4aa0, [-0.6, 3.4, -3.2]);
  rim(0xbfe2ff, [2.8, 2.2, -2.4]);
  return g;
}

export function createStage(canvas, kit, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; // OutputPass tone-maps after bloom
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const envStudio = makeEnvironment(renderer, "studio");
  const envStreet = makeEnvironment(renderer, "street");
  scene.environment = envStudio;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 400);
  scene.add(camera);

  // FX point lights are created once so the light count (and every shader) stays fixed.
  const fxLights = [];
  for (let i = 0; i < FX_LIGHTS; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 12, 2);
    l.userData.free = true;
    scene.add(l);
    fxLights.push(l);
  }

  const studio = buildStudio(kit);
  const range = buildRange(kit, { bare: !!opts.bareRange });
  scene.add(studio, range.group);

  // mounts
  const showMount = new THREE.Group(); // turntable
  showMount.position.set(0, 1.2, 0);
  studio.add(showMount);
  // first person: camera > viewMount > viewKick (recoil, sway, swings) > viewPose (rest pose) > weapon
  const viewMount = new THREE.Group();
  camera.add(viewMount);
  const viewKick = new THREE.Group();
  const viewPose = new THREE.Group();
  viewPose.rotation.order = "YXZ";
  viewMount.add(viewKick);
  viewKick.add(viewPose);

  const size = new THREE.Vector2();
  const rt = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.42, 0.72, 1.15);
  const output = new OutputPass();
  // A light right next to glossy metal can overflow the half-float buffer; one bad pixel would then
  // be smeared over the whole frame by the bloom blur. Clamp before it gets there.
  const sanitize = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){
        vec3 v = texture2D(tDiffuse, vUv).rgb;
        if (isnan(v.r) || isnan(v.g) || isnan(v.b)) v = vec3(0.0);
        if (isinf(v.r) || isinf(v.g) || isinf(v.b)) v = vec3(32.0);
        gl_FragColor = vec4(clamp(v, 0.0, 32.0), 1.0);
      }`,
  });
  composer.addPass(renderPass);
  composer.addPass(sanitize);
  composer.addPass(bloom);
  composer.addPass(output);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // read by OutputPass

  const stage = {
    THREE,
    renderer,
    scene,
    camera,
    composer,
    bloom,
    studio,
    range,
    showMount,
    viewMount,
    viewKick,
    viewPose,
    fxLights,
    mode: "show",
    orbit: {
      yaw: -0.7,
      pitch: 0.16,
      dist: 1.6,
      target: new THREE.Vector3(0, 1.2, 0),
      auto: true,
    },
    look: { yaw: 0, pitch: 0 },
    eye: new THREE.Vector3(0, 1.62, 0),
    // camera recoil and shake, written by the combat module (fov: a fraction punched outwards)
    kick: { pitch: 0, yaw: 0, roll: 0, fov: 0 },
    // the share of a kick that is not given back: it turns the aim itself
    nudgeLook(dp, dy) {
      stage.look.pitch = Math.max(-0.7, Math.min(0.7, stage.look.pitch + dp));
      stage.look.yaw = Math.max(-1.25, Math.min(1.25, stage.look.yaw + dy));
    },
    zoom: 1,
    zoomNow: 1,
    fov: { show: 32, fp: 68 },
    resize() {
      const w = canvas.clientWidth || window.innerWidth,
        h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.getDrawingBufferSize(size);
      composer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      camera.aspect = w / h;
      stage.applyShift();
    },
    /** Showcase only: slide the picture sideways so the weapon sits in the gap between the UI panels. */
    shiftX: 0,
    shiftY: 0, // > 0 lifts the picture (a bottom sheet covers the lower part of a phone screen)
    fit: 1, // > 1 pulls the showcase camera back when UI panels cover part of the view
    applyShift() {
      const w = canvas.clientWidth || window.innerWidth,
        h = canvas.clientHeight || window.innerHeight;
      if (stage.mode === "show" && (stage.shiftX || stage.shiftY))
        camera.setViewOffset(w, h, -stage.shiftX, stage.shiftY, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    },
    setMode(mode) {
      stage.mode = mode === "fp" ? "fp" : "show";
      const fp = stage.mode === "fp";
      studio.visible = !fp;
      range.group.visible = fp;
      scene.fog = fp ? range.fog : null;
      scene.background = fp ? range.sky : new THREE.Color(0x030405);
      scene.environment = fp ? envStreet : envStudio;
      scene.environmentIntensity = fp ? 0.6 : 1.5;
      renderer.toneMappingExposure = fp ? 1.05 : 1.0;
      bloom.strength = fp ? 0.36 : 0.28;
      bloom.radius = fp ? 0.55 : 0.72;
      camera.fov = fp ? stage.fov.fp : stage.fov.show;
      stage.applyShift();
    },
    /** Put a wrapped weapon model on the turntable or in the shooter's hands. */
    mount(model) {
      for (const m of [showMount, viewPose])
        for (const c of [...m.children]) m.remove(c);
      if (!model) return;
      const h = model.holder;
      if (stage.mode === "fp") {
        // view.hip: where the gun origin sits in camera space (x right, y up, -z forward) and how it
        // is turned: rot = [pitch up, yaw left, roll] in radians.
        const v = model.view.hip || {};
        const p = v.pos || [0.16, -0.17, -0.4];
        const r = v.rot || [0, 0, 0];
        viewPose.position.set(p[0], p[1], p[2]);
        viewPose.rotation.set(r[0], r[1], r[2], "YXZ");
        h.position.set(0, 0, 0);
        h.rotation.set(0, Math.PI, 0);
        viewPose.add(h);
      } else {
        // centre the visible parts on the turntable (hidden branch parts must not shift the framing)
        h.position.set(0, 0, 0);
        h.rotation.set(0, Math.PI, 0);
        h.updateMatrixWorld(true);
        const box = new THREE.Box3();
        const part = new THREE.Box3();
        const shown = (o) => {
          for (let n = o; n && n !== h.parent; n = n.parent)
            if (!n.visible) return false;
          return true;
        };
        h.traverse((o) => {
          if (!o.isMesh || !shown(o)) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          box.union(
            part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld),
          );
        });
        if (box.isEmpty()) box.setFromObject(h);
        const c = box.getCenter(new THREE.Vector3());
        const s = box.getSize(new THREE.Vector3());
        h.position.sub(c);
        showMount.add(h);
        const sh = model.show || {};
        const span = Math.max(s.z, s.y * 1.6, s.x * 1.6);
        stage.orbit.dist =
          (sh.dist || Math.max(0.4, span * 1.45 + 0.15)) * stage.fit;
        showMount.position.y = Math.max(1.2, s.y / 2 + 0.25);
        stage.orbit.target.set(0, showMount.position.y, 0);
        if (sh.yaw !== undefined) stage.orbit.yaw = sh.yaw;
        if (sh.pitch !== undefined) stage.orbit.pitch = sh.pitch;
        showMount.rotation.set(0, 0, 0);
      }
    },
    update(dt, t) {
      if (stage.mode === "show") {
        const o = stage.orbit;
        if (o.auto) showMount.rotation.y += dt * 0.35;
        const cp = Math.cos(o.pitch);
        camera.position.set(
          o.target.x + Math.sin(o.yaw) * cp * o.dist,
          o.target.y + Math.sin(o.pitch) * o.dist,
          o.target.z + Math.cos(o.yaw) * cp * o.dist,
        );
        camera.lookAt(o.target);
      } else {
        camera.position.copy(stage.eye);
        const k = stage.kick;
        camera.rotation.set(
          stage.look.pitch + k.pitch,
          stage.look.yaw + k.yaw,
          k.roll,
          "YXZ",
        );
        // zoom (scopes) eases towards its target
        stage.zoomNow += (stage.zoom - stage.zoomNow) * Math.min(1, dt * 12);
        const fov = (stage.fov.fp / stage.zoomNow) * (1 + (k.fov || 0));
        if (Math.abs(camera.fov - fov) > 0.01) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }
        range.update(dt, t, camera);
      }
    },
    render() {
      composer.render();
    },
    /** Borrow a pooled light for a flash: returns the light or null when all are busy. */
    borrowLight() {
      const l = fxLights.find((x) => x.userData.free);
      if (l) l.userData.free = false;
      return l || null;
    },
    releaseLight(l) {
      l.intensity = 0;
      l.userData.free = true;
    },
  };
  stage.setMode("show");
  stage.resize();
  window.addEventListener("resize", () => stage.resize());
  return stage;
}
