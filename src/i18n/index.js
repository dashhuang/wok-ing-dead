// Interface language: lookup, formatting, DOM binding and the fonts each language needs.
//
//   t("hud.kill", { who: t("enemy.walker") })
//   <b data-i18n="act.deploy"></b>          textContent
//   <p data-i18n-html="ctl.noteMouseHtml">   trusted markup from the locale files
//   <i data-i18n-aria="act.close">           aria-label
//
// Choose order: ?lang= → saved choice → browser languages → English.
import en from "./locales/en.js";
import zhCN from "./locales/zh-CN.js";
import zhTW from "./locales/zh-TW.js";
import ja from "./locales/ja.js";

export const LOCALES = [
  { code: "zh-CN", name: "简体中文", short: "简", cjk: "sc", dict: zhCN },
  { code: "zh-TW", name: "繁體中文", short: "繁", cjk: "tc", dict: zhTW },
  { code: "en", name: "English", short: "EN", cjk: null, dict: en },
  { code: "ja", name: "日本語", short: "日", cjk: "jp", dict: ja },
];
const STORAGE_KEY = "wokingdead.lang";
const OLD_STORAGE_KEY = "ghostmarket.lang";
const byCode = new Map(LOCALES.map((l) => [l.code, l]));
const listeners = new Set();
let current = byCode.get("en");

function match(tag) {
  if (!tag) return null;
  const t = String(tag).toLowerCase();
  if (byCode.has(tag)) return tag;
  if (t.startsWith("zh")) {
    return /hant|-tw|-hk|-mo/.test(t) ? "zh-TW" : "zh-CN";
  }
  if (t.startsWith("ja")) return "ja";
  if (t.startsWith("en")) return "en";
  return null;
}

function detect() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (match(q)) return match(q);
  } catch {}
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(OLD_STORAGE_KEY);
    if (byCode.has(saved)) return saved;
  } catch {}
  const tags = (
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language]
  ).filter(Boolean);
  for (const tag of tags) {
    const code = match(tag);
    if (code) return code;
  }
  return "en";
}

export function t(key, vars) {
  let s = current.dict[key];
  if (s == null) s = en[key];
  if (s == null) return key;
  if (vars)
    s = s.replace(/\{(\w+)\}/g, (m, k) =>
      vars[k] == null ? m : String(vars[k]),
    );
  return s;
}

export const locale = () => current.code;
export const isCJK = () => !!current.cjk;

export function fmtNum(n) {
  try {
    return Math.round(n).toLocaleString(current.code);
  } catch {
    return String(Math.round(n));
  }
}

export function applyDom(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]"))
    el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-html]"))
    el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll("[data-i18n-aria]"))
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  for (const el of root.querySelectorAll("[data-lang]"))
    el.setAttribute("aria-pressed", String(el.dataset.lang === current.code));
  // the logo: simplified characters, or traditional for zh-TW and Japanese. Set through
  // .src (not markup) so the single-file build can map the URL.
  const logo = current.code === "zh-TW" || current.code === "ja" ? "tc" : "sc";
  for (const el of root.querySelectorAll("img[data-logo]"))
    if (el.dataset.logo !== logo) {
      el.dataset.logo = logo;
      el.src = `assets/brand/logo-${logo}.svg`;
    }
}

export function onLocale(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLocale(code, { persist = true } = {}) {
  const next = byCode.get(code);
  if (!next) return;
  const changed = next !== current;
  current = next;
  if (persist)
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  const html = document.documentElement;
  html.lang = code;
  html.dataset.script = next.cjk || "latin";
  document.title = t("doc.title");
  loadFonts(next);
  applyDom();
  if (changed)
    for (const fn of listeners)
      try {
        fn(code);
      } catch (err) {
        console.error(err);
      }
}

// ---------------------------------------------------------------- fonts
// FontFace (rather than CSS @font-face) so the single-file build can map the URLs, and so
// only the active language's CJK files are ever fetched.
const BASE = (import.meta.env && import.meta.env.BASE_URL) || "/";
const UI = "assets/fonts/ui/";
const WORLD = "assets/fonts/world/";
// In CJK locales the Latin faces skip · — ‘’ “” … so the full-width CJK forms are used.
const NOT_CJK_PUNCT =
  "U+0000-00B6, U+00B8-2013, U+2015-2017, U+201A-201B, U+201E-2025, U+2027-FFFF";
let uiFaces = [];

function face(family, file, desc = {}) {
  const f = new FontFace(family, `url(${BASE}${file})`, {
    display: "swap",
    ...desc,
  });
  document.fonts.add(f);
  return f;
}

let staticDone = false;
function loadStatic() {
  if (staticDone || typeof FontFace !== "function") return;
  staticDone = true;
  // Fonts painted into in-world textures (signs, stencils, weapon engraving).
  face("Big Shoulders Display", WORLD + "big-shoulders-display.woff2", {
    weight: "100 900",
  });
  for (const w of [400, 500, 600])
    face("Barlow Condensed", `${WORLD}barlow-condensed-${w}.woff2`, {
      weight: String(w),
    });
  for (const w of [400, 500])
    face("IBM Plex Mono", `${WORLD}ibm-plex-mono-${w}.woff2`, {
      weight: String(w),
    });
  // Brand lockup and the language picker read the same in every locale.
  face("GM Logo", UI + "gm-logo.woff2", { weight: "900" })
    .load()
    .catch(() => {});
  face("GM Names", UI + "gm-names.woff2", { weight: "100 900" });
}

function loadFonts(loc) {
  if (typeof FontFace !== "function") return;
  loadStatic();
  for (const f of uiFaces) document.fonts.delete(f);
  const cjk = loc.cjk;
  uiFaces = [
    face("GM Sans", UI + "gm-sans.woff2", {
      weight: "400 800",
      unicodeRange: cjk ? NOT_CJK_PUNCT : undefined,
    }),
    face("GM Display", UI + "gm-display.woff2", {
      weight: "500 900",
      stretch: "62.5% 100%",
      unicodeRange: cjk ? NOT_CJK_PUNCT : undefined,
    }),
  ];
  if (cjk)
    uiFaces.push(
      face("GM Sans CJK", `${UI}gm-sans-${cjk}.woff2`, { weight: "400 800" }),
      face("GM Serif CJK", `${UI}gm-serif-${cjk}.woff2`, { weight: "600 900" }),
    );
  for (const f of uiFaces) f.load().catch(() => {});
}
export function initI18n() {
  setLocale(detect(), { persist: false });
}
