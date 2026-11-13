import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGpu, parseUserAgent } from "../../src/telemetry/device.js";
import { createFrameStats } from "../../src/telemetry/perf.js";

test("device parsing keeps only coarse fields and recognises in-app browsers", () => {
  const iphone = parseUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x18003237) NetType/WIFI Language/zh_CN",
  );
  assert.deepEqual(
    [iphone.os, iphone.osVersion, iphone.kind, iphone.browser],
    ["ios", "18.5", "iPhone", "wechat"],
  );
  const samsung = parseUserAgent(
    "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  );
  assert.deepEqual(
    [samsung.os, samsung.model, samsung.browser, samsung.browserVersion],
    ["android", "SM-S918B", "samsung", "25"],
  );
  const reduced = parseUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  );
  assert.equal(reduced.model, "");
  const ipad = parseUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    5,
  );
  assert.deepEqual([ipad.os, ipad.browser], ["ipados", "safari"]);
  assert.equal(
    normalizeGpu(
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002503) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ),
    "NVIDIA GeForce RTX 3060",
  );
  assert.equal(
    normalizeGpu(
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)",
    ),
    "Apple M2 Pro",
  );
  assert.equal(normalizeGpu("Adreno (TM) 740"), "Adreno (TM) 740");
});

test("frame statistics ignore suspension gaps and split play into minutes", () => {
  const s = createFrameStats();
  s.sample(1, 0.8, 20);
  for (let i = 0; i < 3600; i++) s.frame(i % 10 ? 16.7 : 40);
  s.frame(5000);
  const r = s.summary();
  assert.equal(r.frames, 3600);
  assert.equal(r.slow, 360);
  assert.equal(r.p50, 16.5);
  assert.equal(r.minScale, 0.8);
  assert.equal(r.minutes.length, 2);
  assert.equal(r.minutes[0].zombies, 20);
});
