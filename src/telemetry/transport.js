// One cumulative snapshot per pending run. Failed requests never block the game.
export function createTransport({
  storage,
  send,
  key = "wokingdead.telemetry.queue.v1",
}) {
  let pending = new Map();
  let busy = false;
  try {
    const saved = JSON.parse(storage?.getItem(key) || "[]");
    if (Array.isArray(saved))
      for (const p of saved.slice(-12)) {
        if (p?.runId && p?.startedAt > Date.now() - 7 * 86400000)
          pending.set(p.runId, p);
      }
  } catch {}
  function persist() {
    try {
      storage?.setItem(key, JSON.stringify([...pending.values()]));
    } catch {}
  }
  return {
    put(snapshot) {
      pending.set(snapshot.runId, snapshot);
      while (pending.size > 12) pending.delete(pending.keys().next().value);
      persist();
    },
    async flush() {
      if (busy) return;
      busy = true;
      try {
        for (const p of [...pending.values()]) {
          const result = await send(p);
          if (result === "retry") break;
          // A newer snapshot may have arrived while this request was in flight.
          if (pending.get(p.runId)?.seq === p.seq) pending.delete(p.runId);
          persist();
        }
      } catch {
      } finally {
        busy = false;
      }
    },
    beacon(send) {
      // A final snapshot can still be pending while an earlier fetch is in flight.
      // Beacon queues share a browser keepalive budget; stop as soon as it is full.
      for (const p of [...pending.values()].reverse()) {
        try {
          if (!send(p)) break;
        } catch {
          break;
        }
      }
    },
    get size() {
      return pending.size;
    },
  };
}
