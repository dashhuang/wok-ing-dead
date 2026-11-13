// Scale the existing buses, preserving their mix and both dry/reverb sends.
// City voices have a separate direct reverb send, which follows effects too.
export function createCategoryVolumes(ctx, buses, effectsReverb, settings) {
  const base = Object.fromEntries(
    Object.entries(buses).map(([name, node]) => [name, node.gain.value]),
  );
  const values = { musicVolume: 1, effectsVolume: 1 };
  function set(key, value, immediate = false) {
    if (!Number.isFinite(value)) return;
    value = Math.max(0, Math.min(1, value));
    values[key] = value;
    const apply = (node, target) => {
      const now = ctx.currentTime;
      node.gain.cancelScheduledValues(now);
      if (immediate) node.gain.setValueAtTime(target, now);
      else node.gain.setTargetAtTime(target, now, 0.02);
    };
    for (const [name, node] of Object.entries(buses)) {
      if ((name === "music") === (key === "musicVolume"))
        apply(node, base[name] * value);
    }
    if (key === "effectsVolume") apply(effectsReverb, value);
  }
  set("musicVolume", settings.musicVolume ?? 1, true);
  set("effectsVolume", settings.effectsVolume ?? 1, true);
  return {
    setMusicVolume: (value) => set("musicVolume", value),
    setEffectsVolume: (value) => set("effectsVolume", value),
    debug: () => ({ ...values }),
  };
}
