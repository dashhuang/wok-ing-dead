// The look of the street: where the last light comes from and how the picture is graded.
// Pure data (no engine, no DOM). game.js reads it once, before any system exists, so the sky,
// the fog, the rain, the shadow map and the environment capture all agree on the same sun.
//
// The engine was lit for a harbour at dusk: one low sun doing all the work. Golden Dragon
// Street runs west to east, so the sun sits a few degrees off its far end. From the gate the
// street is seen against the light: the dead are silhouettes with shadows reaching toward the
// player, the wet carriageway carries the glare, and shafts cut through the lantern strings.
// The few degrees off the axis keep a raking light on the north-side fronts; much more than
// that and the south-side buildings shade the whole carriageway again.

const DEG = Math.PI / 180;

export const LOOK = {
  sun: {
    azimuth: 3, // degrees south of due east (the street axis); 0 = straight down the street
    elevation: 11, // degrees above the horizon
    intensity: 4.2,
    color: [1, 0.52, 0.27],
  },
  sky: {
    zenith: [0.03, 0.05, 0.095],
    horizon: [0.9, 0.46, 0.24],
    horizonAway: [0.1, 0.14, 0.215],
    fog: [0.2, 0.235, 0.3],
    gain: 0.3, // the whole sky, against the harbour original
    disk: 0.3, // the sun disk itself
  },
  // Overrides for the post chain (the names are the renderer's TUNE). Graded for a night
  // street: neon blooms and streaks sideways, shafts read in the rain, shadows go deeper.
  post: {
    volSunScale: 1.15,
    volSigma: 0.0042,
    bloom: 0.085,
    dirt: 0.16,
    streak: 0.075,
    streakThreshold: 1.5,
    flare: 0.2,
    key: 0.105,
    vignette: 0.36,
    grain: 0.026,
    lookPower: 1.24,
    lookSat: 1.24,
  },
};

// What the street looked like before this table existed (`?look=0`), for side-by-side checks.
export const LOOK_BEFORE = {
  sun: {
    azimuth: 19.87,
    elevation: 13,
    intensity: 3.1,
    color: [1, 0.6, 0.36],
  },
  sky: { ...LOOK.sky, gain: 0.28 },
  post: {},
};

// `?look=0` is the old look; `?sun=azimuth,elevation,intensity` moves the sun on the current one.
export function pickLook(params = {}) {
  const base = params.look === "0" ? LOOK_BEFORE : LOOK;
  if (!params.sun) return base;
  const [az, el, power] = String(params.sun).split(",").map(Number);
  return {
    ...base,
    sun: {
      ...base.sun,
      azimuth: Number.isFinite(az) ? az : base.sun.azimuth,
      elevation: Number.isFinite(el) ? el : base.sun.elevation,
      intensity: Number.isFinite(power) ? power : base.sun.intensity,
    },
  };
}

// Unit vector pointing at the sun; +x is east along the street, +z is south.
export function sunDirection({ azimuth, elevation }) {
  const a = azimuth * DEG,
    e = elevation * DEG;
  return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
}
