// Test the meshes that actually ship: a visible underside must stop a ray, roof caps
// must be closed from both ends, and vehicle triangles must agree with their normals.
import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

test("scene roofs, suspended boxes and vehicle surfaces have no missing faces", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript({
    path: fileURLToPath(
      new URL("../support/fake-pointer-lock.js", import.meta.url),
    ),
  });
  await page.route("**/api/telemetry", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/?lang=zh-CN&q=low");
  await page.waitForFunction(() => window.__ready);

  const result = await page.evaluate(() => {
    const G = window.__G;
    const { Vector3, Raycaster } = G.THREE;
    const meshes = [];
    G.scene.updateMatrixWorld(true);
    G.scene.traverse((mesh) => {
      if (mesh.isMesh && mesh.userData.staticShadow) meshes.push(mesh);
    });
    const ray = new Raycaster();
    const hit = (origin, direction, far) => {
      ray.set(new Vector3(...origin), new Vector3(...direction));
      ray.far = far;
      return ray.intersectObjects(meshes, false)[0]?.distance ?? null;
    };
    // The temple's front beam, side lintel and porch beam are solid, not open boxes.
    const undersides = [
      ["gate beam", [22, 3, 13.225], 0.6],
      ["side lintel", [7.225, 2, 20.7], 0.6],
      ["porch beam", [21, 3.8, 23.15], 0.75],
    ].map(([name, origin, distance]) => ({
      name,
      expected: distance,
      actual: hit(origin, [0, 1, 0], 1),
    }));

    // Sample the full curved end of each furnace roof slope, above the brickwork.
    const caps = [];
    for (const [z, dz] of [
      [14.5, 1],
      [16.7, -1],
    ])
      for (const [x, y] of [
        [31.5, 2.1],
        [31.3, 2.0],
        [31.1, 1.95],
        [30.9, 1.96],
        [30.7, 2.0],
      ])
        for (const px of [x, 63.2 - x])
          caps.push({
            origin: [px, y, z],
            actual: hit([px, y, z], [0, 0, dz], 0.3),
          });

    // These shared materials include the procedural car bodies, windows, trim and
    // cabin linings in the street and backdrop. Imported props keep other materials.
    const a = new Vector3(),
      b = new Vector3(),
      c = new Vector3(),
      normal = new Vector3(),
      shaded = new Vector3(),
      tmp = new Vector3();
    let triangles = 0,
      inverted = 0;
    const examples = [];
    for (const mesh of meshes) {
      if (!["ct_flat_shared", "ct_carglass"].includes(mesh.material.name))
        continue;
      const { position, normal: normals } = mesh.geometry.attributes;
      const index = mesh.geometry.index;
      if (!normals || !index) continue;
      for (let i = 0; i < index.count; i += 3) {
        const ia = index.getX(i),
          ib = index.getX(i + 1),
          ic = index.getX(i + 2);
        a.fromBufferAttribute(position, ia);
        b.fromBufferAttribute(position, ib).sub(a);
        c.fromBufferAttribute(position, ic).sub(a);
        normal.crossVectors(b, c);
        // Ignore sub-millimetre slivers whose direction is lost when baked to float32.
        if (normal.length() < 1e-5) continue;
        triangles++;
        shaded.fromBufferAttribute(normals, ia);
        shaded.add(tmp.fromBufferAttribute(normals, ib));
        shaded.add(tmp.fromBufferAttribute(normals, ic));
        if (normal.normalize().dot(shaded.normalize()) < -0.1) {
          inverted++;
          if (examples.length < 8)
            examples.push({ material: mesh.material.name, at: a.toArray() });
        }
      }
    }
    return { undersides, caps, triangles, inverted, examples };
  });

  for (const probe of result.undersides) {
    expect(probe.actual, probe.name).not.toBeNull();
    expect(probe.actual, probe.name).toBeCloseTo(probe.expected, 4);
  }
  expect(result.caps).toHaveLength(20);
  for (const probe of result.caps) {
    expect(probe.actual, `roof cap at ${probe.origin}`).not.toBeNull();
    expect(probe.actual).toBeCloseTo(0.2, 4);
  }
  expect(result.triangles).toBeGreaterThan(30_000);
  expect(result.inverted, JSON.stringify(result.examples)).toBe(0);
  expect(errors).toEqual([]);
});
