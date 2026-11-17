// Weapon pass on a portrait screen.
//
// The weapon camera keeps a fixed vertical field of view, so on a phone held upright the gun
// and the arms come out as large as on a landscape screen twice as tall and reach across the
// middle of a narrow picture, over the reticle. On a portrait screen the weapon pass is
// shrunk on screen towards a point at the bottom edge, right of the middle: the reticle comes
// clear and the gun still enters from the lower right.
//
// It is a change to the weapon camera's projection only (render.resize in game.js), so the
// gun, the arms, the wok and anything else on the weapon layer move together. Anchors that the
// world camera draws from (muzzle, ejection port, blade tip) go through squeezePoint so the
// tracers and sparks still start on the barrel.
//
// Pure maths on plain numbers: game.js imports this before three.js is published.

export const PORTRAIT_VIEW = {
  // size on screen = aspect ** power, never below min; 1 (no change) from a square screen up
  power: 0.5,
  min: 0.6,
  // the point it shrinks towards, in normalised screen coordinates (-1 left/bottom, 1 right/top)
  pivotX: 0.5,
  pivotY: -1,
};

/** The squeeze for a screen of this width / height, or null when it is not portrait. */
export function portraitSqueeze(aspect) {
  if (!(aspect > 0) || aspect >= 1) return null;
  const T = PORTRAIT_VIEW;
  const f = Math.max(T.min, Math.min(1, Math.pow(aspect, T.power)));
  if (f >= 0.999) return null;
  return { f, px: T.pivotX, py: T.pivotY };
}

/**
 * Scale a perspective projection matrix (three.js Matrix4 elements, column-major) about the
 * pivot on screen: ndc' = pivot + f * (ndc - pivot). Depth is untouched.
 */
export function squeezeProjection(e, s) {
  if (!s) return;
  const { f, px, py } = s;
  for (let c = 0; c < 4; c++) {
    const w = e[c * 4 + 3];
    e[c * 4] = f * e[c * 4] + (1 - f) * px * w;
    e[c * 4 + 1] = f * e[c * 4 + 1] + (1 - f) * py * w;
  }
}

/**
 * Move a point in the weapon camera's own space ({x, y, z}, z < 0 in front) to where it has
 * to be, at the same depth, to land where the squeezed weapon pass draws it.
 * tanHalf: tan(weapon camera vertical fov / 2); aspect: width / height.
 */
export function squeezePoint(p, s, tanHalf, aspect) {
  if (!s) return p;
  const { f, px, py } = s;
  const d = -p.z;
  p.x = f * p.x + (1 - f) * px * d * tanHalf * aspect;
  p.y = f * p.y + (1 - f) * py * d * tanHalf;
  return p;
}
