// Coarse device description for performance analysis. Only parsed fields are kept, never the
// full User-Agent. Browsers hide most models: Chromium on Android reports it through UA client
// hints, iOS never does (the screen size and pixel ratio narrow the iPhone/iPad generation).

const clean = (s, max = 80) =>
  String(s || "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const version = (s) => clean(String(s || "").replace(/_/g, "."), 16);

// "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002503) Direct3D11 vs_5_0 ps_5_0, D3D11)"
// -> "NVIDIA GeForce RTX 3060"; "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, ...)" -> "Apple M2".
export function normalizeGpu(raw) {
  let s = clean(raw, 200);
  const angle = /^ANGLE \((.*)\)$/.exec(s);
  if (angle) s = angle[1].split(", ")[1] || angle[1];
  return clean(
    s
      .replace(/^ANGLE Metal Renderer: /, "")
      .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
      .replace(/\s+Direct3D\S*.*$/, "")
      .replace(/\s+vs_\d.*$/, "")
      .replace(/\/PCIe\/SSE2$/, ""),
  );
}

// In-app browsers come first: WeChat, QQ etc. also carry a Chrome/Safari token.
const BROWSERS = [
  ["wechat", /MicroMessenger\/([\d.]+)/],
  ["qq", /\bQQ\/([\d.]+)/],
  ["weibo", /Weibo/],
  ["uc", /UCBrowser\/([\d.]+)/],
  ["quark", /Quark\/([\d.]+)/],
  ["baidu", /baiduboxapp\/([\d.]+)/],
  ["huawei", /HuaweiBrowser\/([\d.]+)/],
  ["miui", /MiuiBrowser\/([\d.]+)/],
  ["samsung", /SamsungBrowser\/([\d.]+)/],
  ["edge", /Edg(?:A|iOS)?\/([\d.]+)/],
  ["opera", /OPR\/([\d.]+)/],
  ["firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
  ["chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
  ["safari", /Version\/([\d.]+).*Safari/],
];

export function parseUserAgent(ua, touchPoints = 0) {
  const d = { os: "other", osVersion: "", kind: "other", model: "" };
  let m;
  if ((m = /\((iPhone|iPad|iPod)[^)]*?OS (\d+[_\d]*)/.exec(ua))) {
    d.os = m[1] === "iPad" ? "ipados" : "ios";
    d.kind = m[1];
    d.osVersion = version(m[2]);
  } else if (/Macintosh/.test(ua) && touchPoints > 1) {
    // iPadOS asks for the desktop site by default and calls itself a Mac.
    d.os = "ipados";
    d.kind = "iPad";
  } else if ((m = /Android (\d+(?:\.\d+)?)/.exec(ua))) {
    d.os = "android";
    d.kind = "Android";
    d.osVersion = version(m[1]);
    const model =
      /Android [\d.]+; (?:[a-z]{2}[-_][a-z]{2}; )?([^;)]+?)(?: Build\/|\))/i.exec(
        ua,
      );
    // Reduced UAs say "K" instead of the model.
    if (model && model[1] !== "K") d.model = clean(model[1], 60);
  } else if ((m = /Windows NT (\d+\.\d+)/.exec(ua))) {
    d.os = "windows";
    d.kind = "Windows";
    d.osVersion = m[1];
  } else if ((m = /Mac OS X (\d+[_.\d]*)/.exec(ua))) {
    d.os = "macos";
    d.kind = "Mac";
    d.osVersion = version(m[1]);
  } else if (/CrOS/.test(ua)) {
    d.os = "chromeos";
    d.kind = "Chromebook";
  } else if (/Linux/.test(ua)) {
    d.os = "linux";
    d.kind = "Linux";
  }
  d.browser = "other";
  d.browserVersion = "";
  for (const [name, re] of BROWSERS) {
    const b = re.exec(ua);
    if (b) {
      d.browser = name;
      d.browserVersion = version((b[1] || "").split(".")[0]);
      break;
    }
  }
  return d;
}

function readGpu(gl) {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return normalizeGpu(
      gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    );
  } catch {
    return "";
  }
}

// Returns the description right away; Chromium's client hints fill in the model and the real
// OS version a moment later (the object is updated in place).
export function readDevice(G) {
  const nav = globalThis.navigator || {};
  const scr = globalThis.screen || {};
  const dpr = globalThis.devicePixelRatio || 1;
  const w = Math.round(scr.width || 0);
  const h = Math.round(scr.height || 0);
  const device = {
    ...parseUserAgent(nav.userAgent || "", nav.maxTouchPoints || 0),
    gpu: G.renderer?.getContext ? readGpu(G.renderer.getContext()) : "",
    cores: Math.min(256, nav.hardwareConcurrency | 0),
    memory: Math.min(1024, Number(nav.deviceMemory) || 0),
    screen: `${Math.min(w, h)}x${Math.max(w, h)}`,
    dpr: Math.round(Math.min(8, dpr) * 100) / 100,
  };
  const hints = nav.userAgentData?.getHighEntropyValues;
  if (hints)
    hints
      .call(nav.userAgentData, ["model", "platformVersion"])
      .then((v) => {
        if (v.model) device.model = clean(v.model, 60);
        // Windows 11 still says "NT 10.0"; client hints give 13+ for it.
        if (device.os === "windows" && v.platformVersion)
          device.osVersion =
            parseInt(v.platformVersion, 10) >= 13 ? "11" : "10";
        else if (device.os === "macos" && v.platformVersion)
          device.osVersion = version(v.platformVersion);
        else if (device.os === "android" && v.platformVersion)
          device.osVersion = version(v.platformVersion);
      })
      .catch(() => {});
  return device;
}
