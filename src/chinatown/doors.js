// The side doors of the game: where its other rooms are and how to get to them.
//
//   the title page   this page, with nothing in its address
//   the firing range this same page with ?range=1 (range.js): the real street with the
//                    timeline off and a panel to set everything up by hand
//   the gallery      gallery/ beside this page: the weapon showcase of arsenal/, which every
//                    build of the site puts there (vite.config.js, arsenal/scripts/showcase.mjs).
//                    On the dev server the same address hands over to the lab's own server.
//
// Each is a page of its own, so going from one to another is a plain navigation: nothing of
// a run in progress has to be torn down, and the browser's back button does what it says.
// No game objects in here: the range's panel and the menu both use it.

const page = () => location.href.split(/[?#]/)[0];
const query = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

/** The gallery is a folder beside the page: a game opened as a single file has none. */
export const hasGallery = () => /^https?:$/.test(location.protocol);

export const homeUrl = () => page();

/** o: { w, b, lv }: the weapon to have in hand, its form and its level. */
export function rangeUrl(o = {}) {
  // (on a phone the panel would cover the street: it starts folded there)
  const touch =
    typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const q = query({ ...o, panel: touch ? 0 : undefined });
  return page() + "?range=1" + (q ? "&" + q : "");
}

/** o: { w, b, lv }: the weapon to have on show, its form and its level. */
export function galleryUrl(o = {}) {
  const q = query(o);
  return new URL("gallery/", page()).href + (q ? "?" + q : "");
}

export const go = (url) => location.assign(url);
