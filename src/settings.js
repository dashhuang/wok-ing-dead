// Keep the original storage key and validation rules for existing saves.
export function createSettingsStore(defaultFov) {
  const storageKey = "saltline.settings.v1",
    defaults = {
      quality: "auto",
      sens: 1,
      invertY: false,
      volume: 0.8,
      fov: defaultFov,
      difficulty: "hard",
      mode: "mission",
      view: 1,
    },
    viewOptions = [
      [1, "Close"],
      [2, "Three-quarter"],
      [3, "Compact"],
    ],
    modeOptions = [
      ["mission", "Mission"],
      ["holdout", "Holdout"],
    ],
    modeDescriptions = {
      mission: "Cut three sirens and reach the checkpoint. About six minutes.",
      holdout:
        "Endless waves that keep growing. Resupply between waves. How long can you hold?",
    },
    difficultyOptions = [
      ["standard", "Standard"],
      ["hard", "Hard"],
      ["brutal", "Brutal"],
    ],
    qualityOptions = ["low", "medium", "high", "ultra"];
  function load() {
    const settings = { ...defaults };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved === "object") {
        if (saved.quality === "auto" || qualityOptions.includes(saved.quality))
          settings.quality = saved.quality;
        if (Number.isFinite(saved.sens))
          settings.sens = Math.min(3, Math.max(0.2, saved.sens));
        settings.invertY = !!saved.invertY;
        if (Number.isFinite(saved.volume))
          settings.volume = Math.min(1, Math.max(0, saved.volume));
        if (Number.isFinite(saved.fov))
          settings.fov = Math.min(95, Math.max(60, saved.fov));
        if (difficultyOptions.some(([value]) => value === saved.difficulty))
          settings.difficulty = saved.difficulty;
        if (modeOptions.some(([value]) => value === saved.mode))
          settings.mode = saved.mode;
        if (viewOptions.some(([value]) => value === saved.view))
          settings.view = saved.view;
      }
    } catch {
      // Malformed saves or unavailable storage fall back to defaults.
    }
    return settings;
  }
  function save(settings) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // Storage may be disabled or full; gameplay can continue without saving.
    }
  }
  return {
    storageKey,
    defaults,
    viewOptions,
    modeOptions,
    modeDescriptions,
    difficultyOptions,
    qualityOptions,
    load,
    save,
  };
}
