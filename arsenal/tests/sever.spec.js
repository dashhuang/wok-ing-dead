// What a killing hit takes off the dead: a blast takes limbs at the root, a blade the head or
// an arm, a hit that throws the body something with it, a bullet through the head bursts it,
// and the specials stay whole. The rule is combat/fate.js (numbers: data/status.js `sever`);
// the pieces are fx/limbs.js. First the rule on its own, then on the bench's stand-in zombies.
import { test, expect } from "./fixtures.js";
import { STATUS } from "../src/data/status.js";
import { fateOf, limbsOf } from "../src/combat/fate.js";
import { LIMBS, WITH } from "../src/fx/limbs.js";

// a repeatable 0..1
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const walker = { type: "walker", rank: "", scale: 1, maxHp: 100, pin: 0 };
const many = (z, o, dmg, n = 600) => {
  const rng = seeded(7);
  return Array.from({ length: n }, () => fateOf(z, o, dmg, rng));
};

test("the rule: what each kind of killing hit takes off", () => {
  const V = STATUS.sever;
  const roots = ["lArm", "rArm", "lLeg", "rLeg"];

  // a blast: arms and legs at the root, now and then the head, nearly always something
  const blast = many(walker, { kind: "blast", knock: 3 }, 200);
  for (const f of blast) {
    expect(f.pop).toBe(false);
    for (const l of f.limbs || []) expect([...roots, "head"]).toContain(l);
    expect((f.limbs || []).length).toBeLessThanOrEqual(V.blast[0] + 1);
    expect(new Set(f.limbs || []).size).toBe((f.limbs || []).length);
  }
  expect(blast.filter((f) => f.limbs).length).toBeGreaterThan(540);
  const heads = blast.filter((f) => f.limbs?.includes("head")).length / 600;
  expect(heads).toBeGreaterThan(V.blast[1] - 0.08);
  expect(heads).toBeLessThan(V.blast[1] + 0.08);

  // a blade: the head or one arm at the shoulder, never both, never a burst
  const cut = many(walker, { cut: true, head: true }, 200);
  for (const f of cut) {
    expect(f.pop).toBe(false);
    expect((f.limbs || []).length).toBeLessThanOrEqual(1);
    for (const l of f.limbs || [])
      expect(["head", "lArm", "rArm"]).toContain(l);
  }
  const taken = cut.filter((f) => f.limbs).length / 600;
  expect(taken).toBeGreaterThan(V.cut[0] - 0.08);
  expect(taken).toBeLessThan(V.cut[0] + 0.08);

  // thrown by the hit: an arm (or half of one) and now and then a leg (or half of one)
  const thrown = many(walker, { knock: 3.2 }, 200);
  expect(thrown.every((f) => f.launch)).toBe(true);
  for (const f of thrown)
    for (const l of f.limbs || [])
      expect(Object.keys(LIMBS).filter((k) => k !== "head")).toContain(l);
  expect(thrown.filter((f) => f.limbs).length).toBeGreaterThan(450);

  // an ordinary kill: now and then a forearm or a shin if the hit was a big one, nothing
  // if it only finished the job
  const plain = many(walker, {}, 80);
  for (const f of plain) {
    expect(f.launch).toBeNull();
    for (const l of f.limbs || [])
      expect(["lFore", "rFore", "lShin", "rShin"]).toContain(l);
  }
  const some = plain.filter((f) => f.limbs).length / 600;
  expect(some).toBeGreaterThan(0);
  expect(some).toBeLessThan(V.plain + 0.08);
  expect(many(walker, {}, 20).some((f) => f.limbs)).toBe(false);

  // a bullet through the head that took a good share of its health in one bursts it
  expect(fateOf(walker, { head: true }, V.head * 100, seeded(1)).pop).toBe(
    true,
  );
  expect(fateOf(walker, { head: true }, V.head * 100 - 1, seeded(1)).pop).toBe(
    false,
  );
  expect(fateOf(walker, {}, 500, seeded(1)).pop).toBe(false);

  // a heavy gives up half as much; the specials stay whole whatever hits them
  const half = () => 0.5;
  expect(limbsOf(walker, { cut: true }, 100, false, half)).not.toBeNull();
  expect(
    limbsOf({ ...walker, type: "brute" }, { cut: true }, 100, false, half),
  ).toBeNull();
  for (const rank of ["elite", "boss"]) {
    expect(STATUS.rank[rank].severed).toBe(false);
    const z = { ...walker, rank };
    for (const o of [
      { kind: "blast", knock: 3 },
      { cut: true },
      { knock: 3.2 },
      { head: true },
    ])
      for (const f of many(z, o, 200, 100)) {
        expect(f.limbs).toBeNull();
        expect(f.pop).toBe(false);
      }
  }
  // a limb taken at the root takes the half below it with it
  for (const [root, below] of Object.entries(WITH)) {
    expect(LIMBS[root]).toBeTruthy();
    expect(LIMBS[below]).toBeTruthy();
  }
});

test("on the bench: pieces come off, lie on the ground, and the next one is whole", async ({
  page,
}) => {
  await page.goto("/?mode=fp&ui=0&w=revolver");
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  const got = await page.evaluate(() => {
    const lab = window.__lab;
    const c = lab.combat;
    const T = c.targets;
    const V = lab.stage.THREE.Vector3;
    lab.manual = true;
    T.setMode("stand");
    lab.advance(0.5, 1 / 60, false);
    const away = new V(0, 0, -1);
    const walkers = T.list.filter((z) => z.type === "walker" && z.alive);
    const scaleOf = (z, bone) => z.rig.getObjectByName(bone).scale.x;
    const out = {};

    // one arm at the shoulder, by hand: the arm and the forearm are gone, one torn end
    // stays on the body, one piece is in the air and then on the ground
    const a = walkers[0];
    const before = T.limbs.count;
    out.took = T.sever(a, "lArm", away);
    out.again = T.sever(a, "lArm", away);
    out.below = T.sever(a, "lFore", away);
    out.lost = Object.keys(a.lost).sort().join();
    out.stumps = a.stumps.length;
    out.pieces = T.limbs.count - before;
    out.arm = scaleOf(a, "LeftArm");
    out.other = scaleOf(a, "RightArm");
    out.stumpInScene = !!a.stumps[0].mesh.parent;
    lab.advance(2.5, 1 / 60, false);
    out.piecesLater = T.limbs.count - before;

    // a blast kills the rest: between them something comes off (each has 98 chances in 100)
    const rest = walkers.slice(1);
    for (const z of rest)
      T.damage(z, 99999, {
        dir: away.clone(),
        point: z.chest.clone(),
        kind: "blast",
        knock: 3,
      });
    lab.advance(1, 1 / 60, false);
    out.blast = rest.map((z) => Object.keys(z.lost).sort().join());
    out.dead = rest.every((z) => !z.alive);

    // they stand up again whole
    for (let i = 0; i < 12 && rest.some((z) => !z.alive); i++)
      lab.advance(1, 1 / 30, false);
    out.back = rest.every((z) => z.alive);
    out.whole = rest.every(
      (z) =>
        !Object.keys(z.lost).length &&
        !z.stumps.length &&
        ["LeftArm", "RightArm", "LeftUpLeg", "RightUpLeg", "Head"].every(
          (b) => scaleOf(z, b) === 1,
        ),
    );
    // and what lay on the ground has gone by the time the lab is cleared
    c.clear();
    out.cleared = T.limbs.count;
    out.errors = window.__errors;
    return out;
  });
  expect(got.took).toBe(true);
  expect(got.again).toBe(false);
  expect(got.below).toBe(false);
  expect(got.lost).toBe("lArm,lFore");
  expect(got.stumps).toBe(1);
  expect(got.pieces).toBe(1);
  expect(got.arm).toBeLessThan(0.001);
  expect(got.other).toBe(1);
  expect(got.stumpInScene).toBe(true);
  expect(got.piecesLater).toBe(1);
  expect(got.dead).toBe(true);
  expect(got.blast.some((s) => s.length > 0)).toBe(true);
  expect(got.back).toBe(true);
  expect(got.whole).toBe(true);
  expect(got.cleared).toBe(0);
  expect(got.errors).toEqual([]);
});
