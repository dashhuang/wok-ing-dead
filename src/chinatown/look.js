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
  // What the lamps and signs add beyond the few real point lights (src/chinatown/streetfx.js)
  // and the two things the renderer does for the street. 0 or false switches one off.
  fx: {
    glow: 1, // pools of lamp and sign light baked onto the ground
    glowNear: 0.35, // their weight near the camera, where real lights already shine
    halo: 0.0045, // halo in the wet air around lamps and signs
    rainLit: 0.1, // their colour on the rain falling past them
    probe: 1.3, // the gun, hands and glossy paint reflect the street, not the open sky (gain)
    lightning: 12, // peak strength of the light a flash throws, with shadows; 0 = sky only
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
  fx: {
    glow: 0,
    glowNear: 0,
    halo: 0,
    rainLit: 0,
    probe: 0,
    lightning: 0,
  },
};

// `?look=0` is the old look; `?sun=azimuth,elevation,intensity` moves the sun on the current one;
// `?fx=halo:0,glow:2` overrides entries of `fx` by name.
export function pickLook(params = {}) {
  let look = params.look === "0" ? LOOK_BEFORE : LOOK;
  if (params.sun) {
    const [az, el, power] = String(params.sun).split(",").map(Number);
    look = {
      ...look,
      sun: {
        ...look.sun,
        azimuth: Number.isFinite(az) ? az : look.sun.azimuth,
        elevation: Number.isFinite(el) ? el : look.sun.elevation,
        intensity: Number.isFinite(power) ? power : look.sun.intensity,
      },
    };
  }
  if (params.fx) {
    const fx = { ...look.fx };
    for (const pair of String(params.fx).split(",")) {
      const [key, value] = pair.split(":");
      if (key in fx && Number.isFinite(+value)) fx[key] = +value;
    }
    look = { ...look, fx };
  }
  return look;
}

// Unit vector pointing at the sun; +x is east along the street, +z is south.
export function sunDirection({ azimuth, elevation }) {
  const a = azimuth * DEG,
    e = elevation * DEG;
  return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
}
