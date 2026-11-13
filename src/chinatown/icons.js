// Original line drawings, shared by the touch controls, ammunition HUD and world markers.
// Keep silhouettes distinct at 18px; colour is a second cue, never the only one.
const drawings = {
  fire: '<path d="m12 24-4-4 10-10c3-3 7-3 7-3s0 4-3 7Z"/><path d="m15 13 5 5M4 27l4-4M3 19l4-4M13 29l4-4"/>',
  secondary: '<path d="M18 3 6 18h9l-1 11 12-15h-9Z"/>',
  reload: '<path d="M25 12a10 10 0 1 0 1 8M25 5v7h-7"/>',
  swap: '<path d="M5 10h22l-5-5m5 5-5 5M27 22H5l5 5m-5-5 5-5"/>',
  jump: '<path d="M16 25V7m-7 7 7-7 7 7"/>',
  interact:
    '<path d="M11 17V7a2 2 0 0 1 4 0v8-11a2 2 0 0 1 4 0v11-8a2 2 0 0 1 4 0v10-5a2 2 0 0 1 4 0v8c0 5-3 8-8 8h-2c-3 0-5-1-7-4l-5-7a2 2 0 0 1 3-3l3 3Z"/>',
  pause: '<path d="M10 7v18M22 7v18" stroke-width="4"/>',
  "ammo-bullets":
    '<path d="M7 27V11l3-6 3 6v16ZM19 27V8l3-5 3 5v19ZM7 22h6M19 22h6M7 12h6M19 10h6"/>',
  "ammo-heavy":
    '<path d="M5 8h9v19H5ZM18 8h9v19h-9ZM5 21h9M18 21h9M7 5h5m8 0h5"/>',
  "ammo-fuel":
    '<path d="M7 10h15l4 4v13H6V11ZM9 10V5h10v5m2-2 4-3 3 3-4 4"/><path d="M16 13s-4 4-4 7a4 4 0 0 0 8 0c0-3-4-7-4-7Z"/>',
  "ammo-parts":
    '<path d="m16 4 10 6v12l-10 6-10-6V10Z"/><circle cx="16" cy="16" r="5"/>',
  "ammo-free": '<path d="M16 16c-4-8-11-8-11 0s7 8 11 0 11-8 11 0-7 8-11 0Z"/>',
  warning:
    '<path d="m16 4 13 23H3Z M16 12v7"/><circle cx="16" cy="23" r="1" fill="currentColor" stroke="none"/>',
};

/** Decorative SVG: its enclosing control or indicator supplies the localized label. */
export function uiIcon(name) {
  const drawing = drawings[name];
  return drawing
    ? `<svg class="ui-icon" data-icon="${name}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawing}</svg>`
    : "";
}

export const ammoIcon = (type) => uiIcon("ammo-" + (type || "free"));
