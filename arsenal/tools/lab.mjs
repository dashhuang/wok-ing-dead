// Shared by the tools in this folder: opens the lab in a headless browser.
//
// The lab has to be served. If one is already running on its usual port (npm run arsenal) the
// tools use it; otherwise they start their own for the run. ARSENAL_URL points them elsewhere
// (a preview of the build, say).
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const USUAL = "http://127.0.0.1:5311/";

// WebGL 2 on the GPU where there is one; software rendering on Linux CI and containers
export const GPU_ARGS =
  process.platform === "linux"
    ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    : ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

async function responds(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

/** { url, stop() }: the address of a running lab, started here if need be. */
export async function serveLab() {
  if (process.env.ARSENAL_URL)
    return { url: process.env.ARSENAL_URL, stop: async () => {} };
  if (await responds(USUAL)) return { url: USUAL, stop: async () => {} };
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
    server: { port: 5313, strictPort: false },
    logLevel: "error",
  });
  await server.listen();
  return { url: server.resolvedUrls.local[0], stop: () => server.close() };
}

/**
 * openLab({ query, width, height, args }) -> { page, url, errors, close() }
 * `query` is the lab's address parameters ("w=shotgun&mode=fp&ui=0"); the page is ready when
 * this returns. `errors` collects uncaught page errors.
 */
export async function openLab(o = {}) {
  const lab = await serveLab();
  const browser = await chromium.launch({
    // the full browser in headless mode (the headless shell has no pointer lock)
    channel: "chromium",
    args: [...GPU_ARGS, "--mute-audio", ...(o.args || [])],
  });
  const context = await browser.newContext({
    viewport: { width: o.width || 1280, height: o.height || 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(lab.url + (o.query ? "?" + o.query : ""), {
    waitUntil: "load",
  });
  await page.waitForFunction("window.__ready === true", null, {
    timeout: 90_000,
  });
  return {
    page,
    url: lab.url,
    errors,
    async close() {
      await browser.close();
      await lab.stop();
    },
  };
}

/**
 * Tile screenshots into one image. `shots` is [{ label, png }] (png: Buffer); the sheet is
 * written to `out`.
 */
export async function contactSheet(page, shots, out, cols, cell) {
  const [cw, ch] = cell;
  const sheet = await page.context().newPage();
  const rows = Math.ceil(shots.length / cols);
  await sheet.setViewportSize({ width: cw * cols, height: ch * rows });
  const esc = (s) =>
    String(s).replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
    );
  await sheet.setContent(
    `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${cw}px)">` +
      shots
        .map(
          (s) =>
            `<div style="position:relative;width:${cw}px;height:${ch}px"><img src="data:image/png;base64,${s.png.toString("base64")}" style="display:block;width:${cw}px;height:${ch}px">` +
            `<span style="position:absolute;left:6px;top:4px;color:#fc6;font:13px ui-monospace,monospace;background:#000a;padding:1px 5px">${esc(s.label)}</span></div>`,
        )
        .join("") +
      "</body>",
  );
  await sheet.screenshot({ path: out });
  await sheet.close();
}

/** `--name value` pairs and bare words from the command line. */
export function parseArgs(argv = process.argv.slice(2)) {
  const opt = {},
    rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i] ?? "";
    else rest.push(argv[i]);
  }
  return { opt, rest };
}

/** Every weapon form the lab has: [{ id, b, lv }], five per weapon. */
export const FORMS = [
  ["base", 1],
  ["a", 3],
  ["b", 3],
  ["a", 5],
  ["b", 5],
];
