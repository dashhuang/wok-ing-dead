// Resolve when queued so language changes apply to the next line.
import * as L10N from "../i18n/index.js";

export function holdoutRadio(event) {
  return L10N.t("radio.holdout." + event);
}

export function holdoutWaveClear(wave, seconds) {
  const variant = (wave - 1) % 6;
  return L10N.t(variant ? "wave.down" + variant : "wave.down", {
    n: wave,
    s: seconds,
  });
}
