function lod0(src) {
  const re = /\btexture2D\s*\(/g;
  let out = "", pos = 0, m;
  while (m = re.exec(src)) {
    let i = re.lastIndex, depth = 1, commas = 0;
    for (; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "," && depth === 1) commas++;
    }
    if (depth !== 0) break;
    const args = lod0(src.slice(re.lastIndex, i - 1));
    out += src.slice(pos, m.index) + (commas === 1 ? "textureLod(" + args + ", 0.0)" : "texture2D(" + args + ")");
    pos = i;
    re.lastIndex = i;
  }
  return out + src.slice(pos);
}
async function programsReady(renderer, materials, limitMs = 18e4) {
  const gl = renderer.getContext(), t0 = performance.now(), list = [...materials];
  for (; ; ) {
    if (gl.isContextLost()) return false;
    if (list.every((m) => {
      const pr = renderer.properties.get(m).currentProgram;
      return !pr || pr.isReady();
    })) return true;
    if (performance.now() - t0 > limitMs) {
      console.warn("[render] " + list.length + " program(s) still compiling after " + Math.round(limitMs / 1e3) + " s");
      return true;
    }
    await new Promise((r) => setTimeout(r, 4));
  }
}

