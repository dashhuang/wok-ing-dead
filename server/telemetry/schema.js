import { z } from "zod";
const id = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,39}$/)
  .refine((s) => !["constructor", "prototype", "__proto__"].includes(s));
const number = z.number().finite().min(0).max(1e9);
const count = number.int();
const map = (v) => z.record(id, v).refine((v) => Object.keys(v).length <= 32);
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
  })
  .strict();

export function parseSnapshot(body, now = Date.now()) {
  const p = snapshotSchema.parse(body);
  if (p.startedAt > now + 300000 || p.startedAt < now - 7 * 86400000)
    throw new Error("Invalid start time");
  return p;
}
