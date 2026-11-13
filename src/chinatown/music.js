// Recorded score, routed through the game's existing music/duck/master buses.
// Two cues, decoded once; only the crossfade runs both sources at once.
import { createMusicDirector, musicPressure } from "./musicflow.js";
export const MUSIC_TRACKS = {
  normal: "assets/audio/music/rainy-wok-v1.mp3",
  horde: "assets/audio/music/horde-rock-v1.mp3",
};

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

export function createMusic({ ctx, out, running, game }) {
  const mix = ctx.createGain();
  mix.gain.value = 0;
  mix.connect(out);
  const director = createMusicDirector();
  const tracks = Object.fromEntries(
    Object.entries(MUSIC_TRACKS).map(([id, url]) => [
      id,
      {
        url,
        buffer: null,
        loopStart: 0,
        voice: null,
        offset: 0,
        startedAt: 0,
        loadState: "loading",
        error: null,
      },
    ]),
  );
  let state = "title";
  let paused = false;
  let duckUntil = 0;
  let mood = "normal";
  let pressure = 0;
  let weight = 0;
  let transition = null;
  let lastTime = null;
  let pauseTime = 0;

  const ready = Promise.all(
    Object.values(tracks).map(async (track) => {
      try {
        const response = await fetch(track.url);
        if (!response.ok) throw new Error(`Music HTTP ${response.status}`);
        track.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        track.loopStart = prepareMusicLoop(track.buffer);
        track.loadState = "ready";
      } catch (cause) {
        track.buffer = null;
        track.loadState = "failed";
        track.error = String(cause);
        console.warn("[music] score unavailable", track.url, cause);
      }
    }),
  );

  function position(track, now) {
    const seconds = track.offset + (track.voice ? now - track.startedAt : 0);
    return track.buffer && seconds >= track.buffer.duration
      ? track.loopStart +
          ((seconds - track.loopStart) %
            (track.buffer.duration - track.loopStart))
      : seconds;
  }

  function stop(track, now) {
    if (!track.voice) return;
    track.offset = position(track, now);
    const old = track.voice;
    track.voice = null;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(0, now, 0.015);
    old.source.stop(now + 0.08);
  }

  function setPaused(value) {
    if (paused === !!value) return;
    paused = !!value;
    const now = ctx.currentTime;
    if (paused) {
      pauseTime = now;
      for (const track of Object.values(tracks)) stop(track, now);
    } else if (transition) {
      transition.at += now - pauseTime;
    }
    lastTime = null;
  }

  function start(track) {
    if (track.voice || !track.buffer || paused || !running()) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = track.buffer;
    source.loop = true;
    source.loopStart = track.loopStart;
    source.loopEnd = track.buffer.duration;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(mix);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    track.startedAt = ctx.currentTime;
    source.start(track.startedAt, track.offset);
    track.voice = { source, gain };
  }

  function crossfade(target, now) {
    if (transition) {
      const t = Math.min(
        1,
        Math.max(0, (now - transition.at) / transition.seconds),
      );
      const smooth = t * t * (3 - 2 * t);
      weight = transition.from + (transition.to - transition.from) * smooth;
      if (t === 1) transition = null;
    }
    if (target !== (transition?.to ?? weight)) {
      transition = {
        from: weight,
        to: target,
        at: now,
        seconds: target ? 3 : 6,
      };
    }
    // Equal-power crossfade between independent cues, never restart on each frame.
    for (const [id, track] of Object.entries(tracks)) {
      const amount = id === "horde" ? weight : 1 - weight;
      const needed =
        amount > 0 ||
        (transition &&
          (id === "horde" ? transition.to > 0 : transition.to < 1));
      if (needed) {
        start(track);
        track.voice?.gain.gain.setTargetAtTime(Math.sqrt(amount), now, 0.06);
      } else stop(track, now);
    }
  }

  return {
    ready,
    get on() {
      return Object.values(tracks).some((track) => !!track.voice);
    },
    setPaused,
    state(next, previous) {
      setPaused(next === "paused");
      if (next === "paused") return;
      state = next;
      if ((next === "playing" && previous !== "paused") || next === "title") {
        director.reset();
        duckUntil = 0;
      }
    },
    relay() {
      duckUntil = ctx.currentTime + 2;
    },
    // Boss pressure is read from its alive state, so killing it can release tension.
    finalRun() {},
    death() {
      state = "dead";
    },
    complete() {
      state = "complete";
    },
    snap() {},
    update(_dt, intensity) {
      if (!running() || paused) {
        lastTime = null;
        return;
      }
      const now = ctx.currentTime;
      // Audio time remains steady through ticket/wheel slow motion, and freezes in a background tab.
      const dt =
        lastTime === null ? 0 : Math.min(0.25, Math.max(0, now - lastTime));
      lastTime = now;
      pressure = musicPressure(game, intensity);
      mood = director.update(dt, pressure, state);
      let target = mood === "horde" ? 1 : 0;
      // Keep the available cue until the requested one finishes loading; no silent crossfade.
      if (!tracks.horde.buffer) target = 0;
      if (tracks.normal.loadState === "failed" && tracks.horde.buffer)
        target = 1;
      crossfade(target, now);
      const level =
        state === "dead"
          ? 0.035
          : state === "playing"
            ? 0.18 + weight * 0.06
            : 0.08;
      mix.gain.setTargetAtTime(level * (now < duckUntil ? 0.5 : 1), now, 0.4);
    },
    debug() {
      return {
        on: this.on,
        state,
        paused,
        mood,
        pressure,
        weight,
        transition: transition && { ...transition },
        tracks: Object.fromEntries(
          Object.entries(tracks).map(([id, track]) => [
            id,
            {
              url: track.url,
              loadState: track.loadState,
              error: track.error,
              position: +position(track, ctx.currentTime).toFixed(2),
              duration: track.buffer?.duration || 0,
              playing: !!track.voice,
            },
          ]),
        ),
      };
    },
  };
}
