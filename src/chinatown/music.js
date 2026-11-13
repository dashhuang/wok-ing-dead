// Recorded score, routed through the game's existing music/duck/master buses.
// The two cues are streamed through media elements rather than decoded whole:
// decoded, the pair is about 110 MB of samples, enough to get the page killed on
// an iPhone. Only the compressed files (6.5 MB) stay in memory.
import { createMusicDirector, musicPressure } from "./musicflow.js";
export const MUSIC_TRACKS = {
  normal: "assets/audio/music/rainy-wok-v1.mp3",
  horde: "assets/audio/music/horde-rock-v1.mp3",
};

// Skip quiet intros in game; the source files remain intact.
export const MUSIC_ENTRY = { normal: 15, horde: 18 };

// The end of a cue is blended into its entry point over this many seconds,
// so a loop never falls back into the skipped intro.
const LOOP_FADE = 2;
const GESTURES = ["pointerdown", "keydown", "touchend", "mousedown"];

export function createMusic({ ctx, out, running, game }) {
  const mix = ctx.createGain();
  mix.gain.value = 0;
  mix.connect(out);
  const director = createMusicDirector();

  // Media elements would otherwise switch an iPhone to the playback audio
  // session and ignore the ringer switch; keep what Web Audio alone gets.
  try {
    if (navigator.audioSession?.type === "auto")
      navigator.audioSession.type = "ambient";
  } catch {
    // older browsers have no audio session API
  }

  const players = [];
  function player(track) {
    const el = new Audio();
    el.preload = "auto";
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain);
    gain.connect(track.gain);
    const p = { el, gain, unlocked: false };
    el.addEventListener("ended", () => {
      // Only reached when no frame came to hand the loop over (a stalled tab).
      if (track.playing && track.players[track.cur] === p) {
        track.playing = false;
        track.offset = track.entry;
      }
    });
    el.addEventListener("error", () => {
      if (track.loadState === "failed") return;
      fail(track, el.error ? "media error " + el.error.code : "media error");
    });
    players.push(p);
    return p;
  }

  const tracks = Object.fromEntries(
    Object.entries(MUSIC_TRACKS).map(([id, url]) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(mix);
      const track = {
        url,
        entry: MUSIC_ENTRY[id],
        gain,
        players: [],
        cur: 0,
        handoverUntil: 0,
        playing: false,
        retryAt: 0,
        timer: 0,
        offset: MUSIC_ENTRY[id],
        loadState: "loading",
        error: null,
      };
      track.players = [player(track), player(track)];
      return [id, track];
    }),
  );

  function fail(track, cause) {
    stop(track, ctx.currentTime);
    track.loadState = "failed";
    track.error = String(cause);
    console.warn("[music] score unavailable", track.url, cause);
  }

  const duration = (track) => {
    const d = track.players[0].el.duration;
    return Number.isFinite(d) ? d : 0;
  };

  // The bytes come through fetch so the single-file build can serve them, and one
  // blob feeds both players of a cue.
  const ready = Promise.all(
    Object.values(tracks).map(async (track) => {
      try {
        const response = await fetch(track.url);
        if (!response.ok) throw new Error(`Music HTTP ${response.status}`);
        const src = URL.createObjectURL(await response.blob());
        for (const p of track.players) {
          p.el.addEventListener("loadedmetadata", () => {
            const d = duration(track);
            if (d && track.entry > d / 2) {
              track.entry = d / 2;
              if (!track.playing) track.offset = track.entry;
            }
          });
          p.el.src = src;
        }
        if (track.loadState === "loading") track.loadState = "ready";
      } catch (cause) {
        fail(track, cause);
      }
    }),
  );

  // iOS only lets a media element play from a frame once it has played inside a
  // tap; do that silently (its gains are zero) on the first gestures.
  function unlock() {
    for (const p of players) {
      if (p.unlocked || !p.el.src || !p.el.paused) continue;
      const play = p.el.play();
      if (!play) continue;
      play.then(
        () => {
          p.unlocked = true;
          if (!isPlayer(p)) p.el.pause();
          if (players.every((q) => q.unlocked))
            for (const g of GESTURES) removeEventListener(g, unlock, true);
        },
        () => {},
      );
    }
  }
  const isPlayer = (p) =>
    Object.values(tracks).some(
      (t) =>
        t.playing &&
        (t.players[t.cur] === p || (t.handoverUntil && t.players.includes(p))),
    );
  if (typeof window !== "undefined")
    for (const g of GESTURES)
      addEventListener(g, unlock, { capture: true, passive: true });

  let state = "title";
  let paused = false;
  let duckUntil = 0;
  let mood = "normal";
  let pressure = 0;
  let weight = 0;
  let transition = null;
  let lastTime = null;
  let pauseTime = 0;

  function position(track) {
    return track.playing
      ? track.players[track.cur].el.currentTime
      : track.offset;
  }

  function stop(track, now) {
    if (!track.playing) return;
    // Mid-loop the newer player carries on from where it is.
    track.offset = position(track);
    track.playing = false;
    track.handoverUntil = 0;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setTargetAtTime(0, now, 0.015);
    clearTimeout(track.timer);
    track.timer = setTimeout(() => {
      if (track.playing) return;
      for (const p of track.players) p.el.pause();
    }, 80);
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

  function start(track, now) {
    if (track.playing || track.loadState !== "ready" || paused || !running())
      return;
    if (now < track.retryAt) return;
    clearTimeout(track.timer);
    const p = track.players[track.cur];
    for (const q of track.players) {
      q.gain.gain.cancelScheduledValues(now);
      q.gain.gain.value = q === p ? 1 : 0;
      if (q !== p) q.el.pause();
    }
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.value = 0;
    track.playing = true;
    try {
      p.el.currentTime = track.offset;
    } catch {
      // not seekable yet: starts from the top
    }
    const play = p.el.play();
    if (play)
      play.catch(() => {
        // Not allowed yet (no gesture): try again shortly.
        if (track.players[track.cur] !== p) return;
        track.playing = false;
        track.retryAt = ctx.currentTime + 0.5;
      });
  }

  // Hand the end of a cue over to a second player started at the entry point.
  function loop(track, now) {
    if (!track.playing) return;
    if (track.handoverUntil) {
      if (now < track.handoverUntil) return;
      track.handoverUntil = 0;
      track.players[1 - track.cur].el.pause();
      return;
    }
    const d = duration(track);
    const a = track.players[track.cur];
    if (!d || a.el.paused || a.el.currentTime < d - LOOP_FADE) return;
    const b = track.players[1 - track.cur];
    const fade = Math.max(0.05, d - a.el.currentTime);
    try {
      b.el.currentTime = track.entry;
    } catch {
      return;
    }
    b.el.play()?.catch(() => {});
    a.gain.gain.cancelScheduledValues(now);
    a.gain.gain.setValueAtTime(1, now);
    a.gain.gain.linearRampToValueAtTime(0, now + fade);
    b.gain.gain.cancelScheduledValues(now);
    b.gain.gain.setValueAtTime(0, now);
    b.gain.gain.linearRampToValueAtTime(1, now + fade);
    track.cur = 1 - track.cur;
    track.handoverUntil = now + fade + 0.1;
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
        start(track, now);
        if (track.playing)
          track.gain.gain.setTargetAtTime(Math.sqrt(amount), now, 0.06);
        loop(track, now);
      } else stop(track, now);
    }
  }

  return {
    ready,
    get on() {
      return Object.values(tracks).some((track) => track.playing);
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
        // A suspended context drops the sound but the elements would play on.
        if (!running())
          for (const track of Object.values(tracks))
            stop(track, ctx.currentTime);
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
      if (tracks.horde.loadState !== "ready") target = 0;
      if (
        tracks.normal.loadState === "failed" &&
        tracks.horde.loadState === "ready"
      )
        target = 1;
      crossfade(target, now);
      const level =
        state === "dead"
          ? 0.24
          : state === "playing"
            ? 1.7 + weight * 0.3
            : 1.2;
      mix.gain.setTargetAtTime(level * (now < duckUntil ? 0.5 : 1), now, 0.12);
    },
    debug() {
      return {
        on: this.on,
        state,
        paused,
        mood,
        pressure,
        mixGain: mix.gain.value,
        weight,
        transition: transition && { ...transition },
        tracks: Object.fromEntries(
          Object.entries(tracks).map(([id, track]) => [
            id,
            {
              url: track.url,
              loadState: track.loadState,
              error: track.error,
              position: +position(track).toFixed(2),
              duration: duration(track),
              entry: track.entry,
              looping: !!track.handoverUntil,
              playing: track.playing,
              gain: track.playing ? track.gain.gain.value : 0,
            },
          ]),
        ),
      };
    },
  };
}
