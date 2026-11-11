// What is behind and in front of a shop window: the lit room seen through the glass,
// the strip of light under a half-closed shutter, and the awning over the pavement.
// Called by the building generator with face-local helpers (see buildings.js):
//   P(f, s, y, d) -> world point; s runs along the wall, y up, d outward (negative = indoors).
import * as THREE from "three";

export function createShopfit({
  kit,
  signs,
  ctx,
  M,
  P,
  fbox,
  fquad,
  fquadBack,
  squad,
  emit,
  WALL_T,
}) {
  const { rnd, pick } = kit;
  const cropBottom = (uv, k) => [
    uv[0],
    uv[1],
    uv[2],
    uv[1] + (uv[3] - uv[1]) * k,
  ];

  // The room behind a glazed shopfront. The opening spans a..b along the wall and 0..top in
  // height; the display window is w0..w1 and the door door0..door1. kind: grocery | diner |
  // herbs | bbq | tea.
  function interior(f, { a, b, top, kind, w0, w1 }) {
    fquad(f, signs.mats.shop, a, 0, b, top, -1.5, signs.interiors[kind], {
      cast: false,
    });
    fbox(f, M.void, a - 0.02, 0, -1.5, a, top, -WALL_T, {
      cast: false,
      skip: "b",
    });
    fbox(f, M.void, b, 0, -1.5, b + 0.02, top, -WALL_T, {
      cast: false,
      skip: "b",
    });
    kit.quad(
      M.woodDark,
      P(f, a, 0.02, -1.5),
      P(f, a, 0.02, -0.1),
      P(f, b, 0.02, -0.1),
      P(f, b, 0.02, -1.5),
      null,
      { cast: false },
    );
    kit.quad(
      M.void,
      P(f, a, top, -0.1),
      P(f, a, top, -1.5),
      P(f, b, top, -1.5),
      P(f, b, top, -0.1),
      null,
      { cast: false },
    );
    fbox(
      f,
      M.tubeWhite,
      w0 + 0.3,
      top - 0.1,
      -0.9,
      w1 - 0.3,
      top - 0.06,
      -0.84,
      { cast: false },
    );
  }

  // The slice of shop visible under a shutter that stopped `lift` metres above the ground.
  function underShutter(f, { a, b, lift, kind }) {
    fquad(
      f,
      signs.mats.shop,
      a,
      0,
      b,
      lift,
      -1.0,
      cropBottom(signs.interiors[kind], 0.3),
      { cast: false },
    );
    fbox(f, M.void, a, 0, -1.0, a + 0.02, lift, -0.12, {
      cast: false,
      skip: "b",
    });
    fbox(f, M.void, b - 0.02, 0, -1.0, b, lift, -0.12, {
      cast: false,
      skip: "b",
    });
  }

  function awning(f, s0, s1, y, depth, color, stripes) {
    const drop = 0.55;
    const m = M.cloth(color);
    const m2 = stripes ? M.cloth(0xe9e2d0) : m;
    const n = stripes ? Math.max(2, Math.round((s1 - s0) / 0.55)) : 1;
    for (let i = 0; i < n; i++) {
      const a = s0 + ((s1 - s0) * i) / n,
        b = s0 + ((s1 - s0) * (i + 1)) / n;
      const mat = i % 2 ? m2 : m;
      kit.quad(
        mat,
        P(f, a, y - drop, depth),
        P(f, b, y - drop, depth),
        P(f, b, y, 0.05),
        P(f, a, y, 0.05),
      );
      kit.quad(
        mat,
        P(f, a, y - drop - 0.22, depth),
        P(f, b, y - drop - 0.22, depth),
        P(f, b, y - drop, depth),
        P(f, a, y - drop, depth),
        null,
        { cast: false },
      );
    }
    for (const s of [s0 + 0.05, s1 - 0.05]) {
      kit.rod(M.galv, P(f, s, y - drop, depth), P(f, s, y - 0.75, 0.02), 0.014);
      kit.rod(M.galv, P(f, s, y - drop, depth), P(f, s, y, 0.05), 0.014);
    }
    kit.rod(
      M.galv,
      P(f, s0, y - drop, depth),
      P(f, s1, y - drop, depth),
      0.016,
    );
  }

  return { interior, underShutter, awning };
}
