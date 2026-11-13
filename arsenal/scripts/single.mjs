// Builds arsenal/dist-single/arsenal-showcase.html: the showcase (models, upgrade card, hands)
// as one self-contained file that opens straight from disk or on a phone. No firing range:
// that needs the zombie models and street textures, which would make the file ~25 MB.
// (The game's own build makes the same thing as its weapon gallery: see showcase.mjs.)
//
//   node arsenal/scripts/single.mjs
import { fileURLToPath } from "node:url";
import { buildShowcase } from "./showcase.mjs";

const { out, bytes } = await buildShowcase({
  out: fileURLToPath(
    new URL("../dist-single/arsenal-showcase.html", import.meta.url),
  ),
});
console.log(`wrote ${out} (${(bytes / 1048576).toFixed(2)} MB)`);
