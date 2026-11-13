// Recorded score, routed through the game's existing music/duck/master buses.
// One decode, one looping source; no timers or repeated network requests.
export const MUSIC_URL = "assets/audio/music/rainy-wok-v1.mp3";

export function prepareMusicLoop(buffer) {
  const overlap = Math.min(
    Math.round(buffer.sampleRate * 2),
    Math.floor(buffer.length / 4),
  );
  if (overlap < 2) return 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    const tail = samples.length - overlap;
    for (let i = 0; i < overlap; i++) {
      const mix = i / (overlap - 1);
      samples[tail + i] = samples[tail + i] * (1 - mix) + samples[i] * mix;
    }
  }
  // The head has just played under the tail. Resume after it, not at zero.
  return overlap / buffer.sampleRate;
}

export function createMusic({ ctx, out, running }) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  filter.Q.value = 0.5;
  const mix = ctx.createGain();
  mix.gain.value = 0;
  filter.connect(mix);
  mix.connect(out);

  let buffer = null;
  let loopStart = 0;
  let voice = null;
  let offset = 0;
  let startedAt = 0;
  let state = "title";
  let paused = false;
  let final = false;
  let duckUntil = 0;
  let loadState = "loading";
  let error = null;

  const ready = (async () => {
    try {
      const response = await fetch(MUSIC_URL);
      if (!response.ok) throw new Error(`Music HTTP ${response.status}`);
      buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      loopStart = prepareMusicLoop(buffer);
      loadState = "ready";
    } catch (cause) {
      buffer = null;
      loadState = "failed";
      error = String(cause);
      // Missing music must never prevent play or silence weapon/ambience buses.
      console.warn("[music] score unavailable", cause);
    }
  })();

  function position(now) {
    const seconds = offset + (voice ? now - startedAt : 0);
    return buffer && seconds >= buffer.duration
      ? loopStart + ((seconds - loopStart) % (buffer.duration - loopStart))
      : seconds;
  }

  function setPaused(value) {
    paused = !!value;
    if (!paused || !voice) return;
    const now = ctx.currentTime;
    offset = position(now);
    const old = voice;
    voice = null;
    old.gain.gain.setTargetAtTime(0, now, 0.015);
    old.source.stop(now + 0.08);
  }

  function start() {
    if (voice || !buffer || paused || !running()) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = loopStart;
    source.loopEnd = buffer.duration;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(filter);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    startedAt = ctx.currentTime;
    source.start(startedAt, offset);
    gain.gain.setTargetAtTime(1, startedAt, 0.15);
    voice = { source, gain };
  }

  return {
    ready,
    get on() {
      return !!voice;
    },
    setPaused,
    state(next, previous) {
      setPaused(next === "paused");
      if (next === "paused") return;
      state = next;
      if ((next === "playing" && previous !== "paused") || next === "title") {
        final = false;
        duckUntil = 0;
      }
    },
    relay() {
      duckUntil = ctx.currentTime + 2;
    },
    finalRun() {
      final = true;
    },
    death() {
      state = "dead";
    },
    complete() {
      state = "complete";
    },
    snap() {
      final = true;
    },
    update(_dt, intensity) {
      if (!running() || paused) return;
      start();
      const heat = final ? 1 : Math.max(0, Math.min(1, intensity || 0));
      const playing = state === "playing";
      const level = playing
        ? 0.16 + heat * 0.1
        : state === "dead"
          ? 0.035
          : 0.08;
      const now = ctx.currentTime;
      mix.gain.setTargetAtTime(level * (now < duckUntil ? 0.5 : 1), now, 0.4);
      filter.frequency.setTargetAtTime(
        playing ? 7000 + heat * 7000 : 2200,
        now,
        0.7,
      );
    },
    debug() {
      return {
        on: !!voice,
        track: MUSIC_URL,
        loadState,
        error,
        state,
        paused,
        position: +position(ctx.currentTime).toFixed(2),
        duration: buffer?.duration || 0,
        loopStart,
        final,
      };
    },
  };
}
