import { z } from "zod";
const id = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,39}$/)
  .refine((s) => !["constructor", "prototype", "__proto__"].includes(s));
const number = z.number().finite().min(0).max(1e9);
const count = number.int();
const map = (v) => z.record(id, v).refine((v) => Object.keys(v).length <= 32);
const text = (max) =>
  z
    .string()
    .regex(/^[\x20-\x7e]*$/)
    .max(max);
const ms = z.number().finite().min(0).max(1000);
// Coarse device description, parsed on the client (never the full User-Agent).
const device = z
  .object({
    os: z.enum([
      "ios",
      "ipados",
      "android",
      "windows",
      "macos",
      "chromeos",
      "linux",
      "other",
    ]),
    osVersion: text(16),
    kind: text(16),
    model: text(60),
    browser: id,
    browserVersion: text(16),
    gpu: text(80),
    cores: count.max(256),
    memory: number.max(1024),
    screen: z.string().regex(/^\d{1,5}x\d{1,5}$/),
    dpr: number.max(8),
  })
  .strict();
const perf = z
  .object({
    frames: count,
    seconds: number.max(86400),
    fps: number.max(1000),
    p50: ms,
    p95: ms,
    p99: ms,
    slow: count,
    hitches: count,
    worst: ms,
    scale: number.max(1),
    minScale: number.max(1),
    qualityStart: id,
    autoDrops: count.max(10),
    res: z.string().regex(/^(\d{1,5}x\d{1,5})?$/),
    minutes: z
      .array(
        z
          .object({
            fps: number.max(1000),
            slow: number.max(100),
            zombies: number.max(1000),
          })
          .strict(),
      )
      .max(60),
  })
  .strict();
export const snapshotSchema = z
  .object({
    schema: z.literal(1),
    runId: z.uuid(),
    playerId: z.uuid(),
    seq: z.number().int().min(1).max(10000),
    startedAt: z.number().int().positive(),
    release: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/),
    stage: z.enum(["street", "docks"]),
    mode: z.enum(["mission", "holdout"]),
    difficulty: z.enum(["standard", "hard", "brutal"]),
    difficultyChanged: z.boolean().default(false),
    quality: id,
    input: z.enum(["mouse", "touch", "pad"]),
    test: z.boolean(),
    outcome: z.enum(["active", "dead", "complete", "restart", "quit"]),
    duration: number.max(86400),
    activeSeconds: number.max(86400),
    kills: count,
    damageTaken: number,
    health: number,
    level: count,
    sirens: count,
    waves: count,
    bossSeen: z.boolean(),
    bossDead: z.boolean(),
    weapons: z
      .array(
        z
          .object({
            id,
            level: z.number().int().min(1).max(5),
            branch: z.enum(["base", "a", "b"]),
          })
          .strict(),
      )
      .max(32),
    spice: map(count),
    ammo: map(number),
    ammoReceived: map(number),
    weaponUse: map(
      z
        .object({ seconds: number, killsWhileHeld: count, spent: number })
        .strict(),
    ),
    choices: z
      .array(
        z
          .object({
            at: number,
            kind: id,
            id,
            branch: z.enum(["base", "a", "b"]),
            level: count,
            offered: z.array(id).max(3),
          })
          .strict(),
      )
      .max(128),
    // Added after the first release: older queued snapshots arrive without them, and a
    // malformed diagnostic is dropped rather than costing the run's gameplay record.
    device: device.optional().catch(undefined),
    perf: perf.optional().catch(undefined),
  })
  .strict();

export function parseSnapshot(body, now = Date.now()) {
  const p = snapshotSchema.parse(body);
  if (p.startedAt > now + 300000 || p.startedAt < now - 7 * 86400000)
    throw new Error("Invalid start time");
  return p;
}
