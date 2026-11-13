import zh from "../src/i18n/locales/zh-CN.js";
import en from "../src/i18n/locales/en.js";

// Crawlers need these in the HTTP response, before any game JavaScript runs.
// Share copy reuses the locale files; changing the player's language does not
// change this one, stable Chinese/English card for the public URL.
export function socialPreview() {
  const url = "https://wok.huang.co/";
  const image = new URL("assets/social/chinatown-v1.jpg", url).href;
  const title = `${zh["brand.name"]} ${en["brand.name"]}`;
  const description = `${zh["brand.tagline"]}${zh["title.premise"]}`;
  const meta = (key, content) => ({
    tag: "meta",
    attrs: { [key.startsWith("og:") ? "property" : "name"]: key, content },
    injectTo: "head",
  });
  return {
    name: "wok-ing-dead:social-preview",
    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: { rel: "canonical", href: url },
          injectTo: "head",
        },
        meta("description", description),
        meta("og:type", "website"),
        meta("og:url", url),
        meta("og:site_name", title),
        meta("og:title", title),
        meta("og:description", description),
        meta("og:locale", "zh_CN"),
        meta("og:image", image),
        meta("og:image:type", "image/jpeg"),
        meta("og:image:width", "1280"),
        meta("og:image:height", "720"),
        meta("og:image:alt", zh["brand.sub"]),
        meta("twitter:card", "summary_large_image"),
        meta("twitter:title", title),
        meta("twitter:description", description),
        meta("twitter:image", image),
        meta("twitter:image:alt", zh["brand.sub"]),
      ];
    },
  };
}
