import { test } from "node:test";
import assert from "node:assert/strict";
import { createTransport } from "../../src/telemetry/transport.js";
const storage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) };
};
const p = (runId = "a", seq = 1) => ({ runId, seq, startedAt: Date.now() });
test("failed uploads survive reload and retry without losing a newer revision", async () => {
  const store = storage();
  const first = createTransport({
    storage: store,
    send: async () => {
      throw Error("offline");
    },
  });
  first.put(p());
  await first.flush();
  assert.equal(first.size, 1);
  let resolve;
  const next = createTransport({
    storage: store,
    send: () => new Promise((r) => (resolve = r)),
  });
  const sending = next.flush();
  next.put(p("a", 2));
  resolve("ok");
  await sending;
  assert.equal(next.size, 1);
  const delivered = [];
  const reload = createTransport({
    storage: store,
    send: async (p) => {
      delivered.push(p.seq);
      return "ok";
    },
  });
  await reload.flush();
  assert.deepEqual(delivered, [2]);
  assert.equal(reload.size, 0);
});
test("blocked storage, bounded queues and permanent validation errors are harmless", async () => {
  const blocked = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  const t = createTransport({ storage: blocked, send: async () => "drop" });
  for (let i = 0; i < 30; i++) t.put(p(String(i)));
  assert.equal(t.size, 12);
  await t.flush();
  assert.equal(t.size, 0);
});

test("page exit beacons pending finals and stops when the browser queue is full", () => {
  const t = createTransport({ storage: storage(), send: async () => "retry" });
  t.put({ ...p("old"), outcome: "dead" });
  t.put(p("current"));
  const sent = [];
  t.beacon((p) => {
    sent.push(p.runId);
    return false;
  });
  assert.deepEqual(sent, ["current"]);
  assert.equal(t.size, 2);
});
