// Frame-time statistics for one run. Fed the interval between animation frames while the
// player is actually in play (not paused, not choosing a ticket, tab visible).

const SLOW = 34; // ms: under 30 fps, or a dropped frame at 60 Hz
const HITCH = 100; // ms: a visible stutter
const GAP = 1000; // ms: longer gaps are suspension or a background tab, not frames
const MAX_MINUTES = 60;

const r1 = (v) => Math.round(v * 10) / 10;

export function createFrameStats() {
  const hist = new Uint32Array(HITCH + 1); // 1 ms buckets, the last one is >= 100 ms
  let frames = 0;
  let ms = 0;
  let slow = 0;
  let hitches = 0;
  let worst = 0;
  const minutes = [];
  let minute = { frames: 0, ms: 0, slow: 0, zombies: 0, samples: 0 };
  let scale = { sum: 0, seconds: 0, min: 1 };

  const percentile = (q) => {
    if (!frames) return 0;
    const target = q * frames;
    let seen = 0;
    for (let i = 0; i < hist.length; i++) {
      seen += hist[i];
      if (seen >= target) return i + 0.5;
    }
    return HITCH;
  };
  const closeMinute = () => {
    if (minutes.length < MAX_MINUTES && minute.frames)
      minutes.push({
        fps: r1((1000 * minute.frames) / minute.ms),
        slow: r1((100 * minute.slow) / minute.frames),
        zombies: minute.samples ? r1(minute.zombies / minute.samples) : 0,
      });
    minute = { frames: 0, ms: 0, slow: 0, zombies: 0, samples: 0 };
  };

  return {
    frame(dt) {
      if (!(dt > 0) || dt > GAP) return;
      frames++;
      ms += dt;
      hist[Math.min(HITCH, Math.floor(dt))]++;
      if (dt >= SLOW) slow++;
      if (dt >= HITCH) hitches++;
      if (dt > worst) worst = dt;
      minute.frames++;
      minute.ms += dt;
      if (dt >= SLOW) minute.slow++;
      if (minute.ms >= 60000) closeMinute();
    },
    // Once a second of play: dynamic resolution scale and live zombies.
    sample(seconds, renderScale, zombies) {
      if (Number.isFinite(renderScale)) {
        scale.sum += renderScale * seconds;
        scale.seconds += seconds;
        scale.min = Math.min(scale.min, renderScale);
      }
      if (Number.isFinite(zombies)) {
        minute.zombies += zombies;
        minute.samples++;
      }
    },
    summary() {
      const partial = minute.frames
        ? [
            {
              fps: r1((1000 * minute.frames) / minute.ms),
              slow: r1((100 * minute.slow) / minute.frames),
              zombies: minute.samples ? r1(minute.zombies / minute.samples) : 0,
            },
          ]
        : [];
      return {
        frames,
        seconds: r1(ms / 1000),
        fps: frames ? r1((1000 * frames) / ms) : 0,
        p50: percentile(0.5),
        p95: percentile(0.95),
        p99: percentile(0.99),
        slow,
        hitches,
        worst: Math.round(worst),
        scale: scale.seconds
          ? Math.round((100 * scale.sum) / scale.seconds) / 100
          : 1,
        minScale: scale.min,
        minutes: [...minutes, ...partial].slice(0, MAX_MINUTES),
      };
    },
  };
}
