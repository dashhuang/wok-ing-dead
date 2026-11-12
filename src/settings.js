// Keep the original storage key and validation rules for existing saves.
export function createSettingsStore(defaultFov) {
  const storageKey = "saltline.settings.v1",
    defaults = {
      quality: "auto",
      sens: 1,
      invertY: false,
      volume: 0.8,
      fov: defaultFov,
      difficulty: "standard",
      mode: "mission",
      view: 1,
    },
    // Labels live in src/i18n/locales (view.*, mode.*, modeNote.*, diff.*, quality.*).
    viewOptions = [[1], [2], [3]],
    modeOptions = [["mission"], ["holdout"]],
    difficultyOptions = [["standard"], ["hard"], ["brutal"]],
    // Only the mild meal is served for now. The hotter ones come back later as stages of
    // their own, opened by clearing this one; until then they are shown locked, and a save
    // that had one selected falls back to mild.
    openDifficulties = ["standard"],
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
        if (openDifficulties.includes(saved.difficulty))
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
    difficultyOptions,
    openDifficulties,
    qualityOptions,
    load,
    save,
  };
}
