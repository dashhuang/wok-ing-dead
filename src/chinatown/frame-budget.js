export function createFrameBudget({
  now = () => performance.now(),
  budgetMs = 2,
  frameLimitMs = 22,
} = {}) {
  if (typeof now !== "function") {
    throw new TypeError("now must be a function");
  }
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new RangeError("budgetMs must be finite and positive");
  }
  if (!Number.isFinite(frameLimitMs) || frameLimitMs <= 0) {
    throw new RangeError("frameLimitMs must be finite and positive");
  }

  const budget = Math.min(budgetMs, 2);
  const frameLimit = Math.min(frameLimitMs, 22);
  const queue = [];
  let running = false;
  let cooldown = 0;

  function readClock() {
    try {
      return now();
    } catch {
      return NaN;
    }
  }

  return {
    schedule(task) {
      if (typeof task !== "function") {
        return Promise.reject(new TypeError("task must be a function"));
      }
      return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
      });
    },

    tick({ frameStart, frameMs, idle = true, visible = true } = {}) {
      if (
        !idle ||
        !visible ||
        running ||
        queue.length === 0 ||
        !Number.isFinite(frameStart) ||
        frameStart < 0 ||
        !Number.isFinite(frameMs) ||
        frameMs < 0 ||
        frameMs > frameLimit
      ) {
        return false;
      }

      const started = readClock();
      if (!Number.isFinite(started)) return false;
      const elapsed = started - frameStart;
      if (elapsed < 0 || elapsed >= 16.67) {
        return false;
      }
      if (cooldown > 0) {
        cooldown -= 1;
        return false;
      }

      const allowance = Math.min(budget, 16.67 - elapsed);
      const entry = queue.shift();
      running = true;
      let result;
      try {
        result = Promise.resolve(entry.task());
      } catch (error) {
        result = Promise.reject(error);
      }

      const finished = readClock();
      const duration = Number.isFinite(finished) ? finished - started : NaN;
      cooldown =
        Number.isFinite(finished) && duration >= 0
          ? Math.max(0, Math.ceil(duration / allowance) - 1)
          : 1;

      result.then(
        (value) => {
          running = false;
          entry.resolve(value);
        },
        (error) => {
          running = false;
          entry.reject(error);
        },
      );
      return true;
    },

    get pending() {
      return queue.length + Number(running);
    },
  };
}
