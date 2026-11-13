// Which quality preset the page starts on: the one saved in the settings, so that everything
// built while loading (the zombies' pool and textures among it) follows what the player chose
// and not what the device would be given by default.
//
// A phone has no way of telling how much memory its browser will let a page have. One set to
// a preset it cannot hold is killed while the page loads, loads again, and is killed again,
// and its owner never reaches the settings to turn it down. So on a phone a preset above the
// lowest is on trial: a mark is left while the page is in front, and taken away when it is
// put away or closed in the ordinary way. Finding the mark at the next start means the page
// died where it stood; the setting goes back to automatic and the page starts as a phone
// normally does.
const KEY = "wokingdead.boot";

const store = (v) => {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    // no storage, no trial: the preset is simply used
  }
};

export function presetToBoot(settings, save, handheld) {
  const q = settings.quality;
  if (!q || q === "auto") return "";
  if (!handheld || q === "low" || q === "fast") return q;
  let died = false;
  try {
    died = !!localStorage.getItem(KEY);
  } catch {
    // as above
  }
  if (died) {
    store("");
    settings.quality = "auto";
    save(settings);
    console.warn(
      "[boot] the page did not survive the " +
        q +
        " preset last time: quality is back on automatic",
    );
    return "";
  }
  store(q);
  addEventListener("pagehide", () => store(""));
  addEventListener("pageshow", () => store(q));
  document.addEventListener("visibilitychange", () =>
    store(document.hidden ? "" : q),
  );
  return q;
}
