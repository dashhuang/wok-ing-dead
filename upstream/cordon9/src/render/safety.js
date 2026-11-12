function gpuProbe(params = {}) {
  const out = { renderer: "unknown", vendor: "unknown", webgl2: false, parallelCompile: false, d3d: false, why: "" };
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (gl) {
      out.webgl2 = true;
      out.parallelCompile = !!gl.getExtension("KHR_parallel_shader_compile");
      const e = gl.getExtension("WEBGL_debug_renderer_info");
      out.renderer = String(e && gl.getParameter(e.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER) || "unknown");
      out.vendor = String(e && gl.getParameter(e.UNMASKED_VENDOR_WEBGL) || gl.getParameter(gl.VENDOR) || "unknown");
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
  } catch (err) {
    out.why = "probe failed: " + (err.message || err);
  }
  const named = /Direct3D|D3D/i.test(out.renderer), hidden = !/ANGLE|Direct3D|OpenGL|Metal|Vulkan|Mesa|SwiftShader/i.test(out.renderer);
  const windows = /Windows/i.test(typeof navigator !== "undefined" && navigator.userAgent || "");
  out.d3d = named || hidden && windows;
  out.why = out.why || (named ? "renderer string names Direct3D" : out.d3d ? "renderer string hidden, platform is Windows" : "renderer string does not name Direct3D");
  if (params.d3d === "1") {
    out.d3d = true;
    out.why = "forced by ?d3d=1";
  }
  if (params.d3d === "0") {
    out.d3d = false;
    out.why = "disabled by ?d3d=0";
  }
  return out;
}
function tuneQuality(quality, params, gpu) {
  if (params.safe === "1") {
    Object.assign(quality, QUALITY.low, { safe: true, scale: 0.6, msaa: 0, shadow: 1024, tex: 256, hardShadows: true });
  }
  if (gpu.d3d) {
    quality.d3d = true;
    quality.bakeSplit = true;
    quality.shadowTaps = Math.min(quality.shadowTaps, 12);
    quality.search = Math.min(quality.search, 8);
  }
  return quality;
}
var el = (tag, css, text) => {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text != null) e.textContent = text;
  return e;
};
var BTN = "font:inherit;color:#e8edf1;background:#1c2329;border:1px solid #5b6770;padding:8px 14px;margin:0 8px 8px 0;cursor:pointer;letter-spacing:.06em";
function failureReport(reason) {
  const G4 = window.__G || {}, q = G4.quality || {}, gpu = G4.gpu || {}, R4 = G4.render, M = G4.mats, s = G4.safety || {};
  const L = ["CORDON 9 graphics report", "reason: " + reason];
  L.push("gpu: " + (gpu.renderer || "unknown"), "gpu vendor: " + (gpu.vendor || "unknown"), "direct3d path: " + (gpu.d3d ? "yes" : "no") + " (" + (gpu.why || "not probed") + ")");
  L.push("webgl2: " + (gpu.webgl2 ? "yes" : "no") + ", parallel shader compile: " + (gpu.parallelCompile ? "yes" : "no"));
  L.push("quality: " + (q.name || "?") + (q.safe ? " (safe mode)" : "") + ", scale " + q.scale + ", msaa " + q.msaa + ", shadow " + q.shadow + (q.hardShadows ? " hard" : " soft " + q.shadowTaps + " taps") + ", textures " + q.tex);
  L.push("query: " + (location.search || "(none)"));
  let lostNow = false;
  try {
    lostNow = !!(R4 && R4.renderer.getContext().isContextLost());
  } catch {
  }
  L.push("context: lost " + (s.losses || 0) + " time(s), restored " + (s.restores || 0) + " time(s), lost now: " + (lostNow ? "yes" : "no"));
  L.push("load step: " + ((document.getElementById("boot-msg") || {}).textContent || "?") + ", loaded: " + (s.ready ? "yes" : "no") + ", frames: " + (window.__frames || 0));
  if (M) L.push("surfaces: " + M.log.length + " baked, " + M.pending + " waiting, " + (M.split ? "one pass per output" : "one pass, three outputs"));
  const se = R4 && R4.shaderErrors || [];
  L.push("shader errors: " + se.length);
  se.slice(0, 5).forEach((e, i) => L.push("  " + (i + 1) + ": " + String(e).replace(/\s+/g, " ").slice(0, 300)));
  const errs = [...new Set(window.__errors || [])].filter((e) => !/^\[shader\]/.test(e));
  L.push("other errors: " + errs.length);
  errs.slice(0, 5).forEach((e, i) => L.push("  " + (i + 1) + ": " + String(e).replace(/\s+/g, " ").slice(0, 300)));
  L.push("browser: " + navigator.userAgent, "window: " + innerWidth + "x" + innerHeight + " at pixel ratio " + devicePixelRatio);
  return L.join("\n");
}
var safeUrl = () => {
  const u = new URL(location.href);
  u.searchParams.set("safe", "1");
  return u.toString();
};
var retryUrl = () => {
  const u = new URL(location.href);
  u.searchParams.set("ctx", "1");
  return u.toString();
};
function showFailure(title, reason, { dismiss = false } = {}) {
  const G4 = window.__G || {}, safe = !!(G4.quality && G4.quality.safe), report = failureReport(reason);
  window.__failure = { title, reason, report };
  let p = document.getElementById("gfx-fail");
  if (p) p.remove();
  p = el("div", "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(5,6,7,.92);color:#cfd6dc;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;pointer-events:auto");
  p.id = "gfx-fail";
  const box2 = el("div", "width:min(760px,92vw);max-height:92vh;overflow:auto;border:1px solid #5b6770;background:#0b0e10;padding:20px 22px;box-sizing:border-box");
  box2.append(el("div", "font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#ffb46a;margin-bottom:10px", title));
  box2.append(el("div", "margin-bottom:6px", reason));
  box2.append(el("div", "margin-bottom:12px;color:#9aa5ad", safe ? "Safe mode is already on. Updating the graphics driver or closing other GPU-heavy tabs may help." : "Safe mode is the lightest way to run the game: small textures, no anti-aliasing, simple shadows."));
  const ta = el("textarea", "width:100%;height:min(240px,34vh);box-sizing:border-box;background:#050607;color:#cfd6dc;border:1px solid #333c43;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:8px;margin-top:6px;resize:vertical;white-space:pre");
  ta.readOnly = true;
  ta.value = report;
  ta.id = "gfx-report";
  const copy = el("button", BTN, "Copy report"), note = el("span", "color:#9aa5ad");
  copy.onclick = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(report);
      ok = true;
    } catch {
      try {
        ta.focus();
        ta.select();
        ok = document.execCommand("copy");
      } catch {
      }
    }
    if (!ok) {
      try {
        ta.focus();
        ta.select();
      } catch {
      }
    }
    note.textContent = ok ? "Copied." : "Could not copy. The report below is selected: press Ctrl+C.";
  };
  const go = el("button", BTN, safe ? "Reload" : "Reload in safe mode");
  go.onclick = () => {
    if (safe) location.reload();
    else location.replace(safeUrl());
  };
  box2.append(copy, go);
  if (dismiss) {
    const c = el("button", BTN, "Continue anyway");
    c.onclick = () => p.remove();
    box2.append(c);
  }
  const row = el("div", "min-height:1.5em");
  row.append(note);
  box2.append(row, ta);
  p.append(box2);
  document.body.append(p);
  try {
    if (document.pointerLockElement) document.exitPointerLock();
  } catch {
  }
  return p;
}
function installSafety(G4, canvas) {
  const S4 = { lost: false, losses: 0, restores: 0, ready: false, reloading: false };
  let timer = 0, note = null;
  const say = (text) => {
    if (!note) {
      note = el("div", "position:fixed;left:0;right:0;top:0;z-index:999;padding:10px 14px;background:#1c2329;color:#ffb46a;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;text-align:center;pointer-events:none");
      document.body.append(note);
    }
    note.textContent = text;
    note.style.display = text ? "block" : "none";
  };
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    S4.lost = true;
    S4.losses++;
    console.warn("[gfx] WebGL context lost (" + S4.losses + ")");
    say("Graphics context lost. Waiting for the browser to restore it.");
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (S4.lost) showFailure("Graphics stopped", "The browser took the graphics context away and has not given it back.");
    }, 8e3);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    clearTimeout(timer);
    S4.lost = false;
    S4.restores++;
    console.warn("[gfx] WebGL context restored (" + S4.restores + ")");
    if (!G4.quality.safe) {
      if (!S4.reloading) {
        S4.reloading = true;
        const again = !(G4.params && G4.params.ctx);
        say(again ? "Graphics context was lost. Restarting." : "Graphics context was lost again. Restarting in safe mode.");
        location.replace(again ? retryUrl() : safeUrl());
      }
      return;
    }
    if (!S4.ready) {
      say("");
      showFailure("Graphics failed in safe mode", "The graphics context was lost while loading, in safe mode.");
      return;
    }
    try {
      G4.render.recover();
      say("");
    } catch (e) {
      console.error("[gfx] recovery failed: " + (e && e.stack || e));
      say("");
      showFailure("Graphics failed in safe mode", "The graphics context came back but the scene could not be rebuilt.");
    }
  });
  S4.check = () => {
    const n = G4.render.shaderErrors.length;
    let lost = S4.lost;
    try {
      lost = lost || G4.render.renderer.getContext().isContextLost();
    } catch {
    }
    if (lost) {
      if (!document.getElementById("gfx-fail")) showFailure("Graphics stopped", "The graphics context was lost" + (S4.ready ? "." : " while loading."));
      return false;
    }
    if (n && n !== S4.reported) {
      S4.reported = n;
      showFailure("Shader errors", n + " shader program" + (n === 1 ? "" : "s") + " failed to build on this GPU. Parts of the picture may be missing.", { dismiss: true });
      return false;
    }
    return true;
  };
  S4.loaded = () => {
    S4.ready = true;
    S4.check();
    setTimeout(S4.check, 6e3);
  };
  return S4;
}

