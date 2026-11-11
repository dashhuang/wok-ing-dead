// Original embedded-version switch. Keep shutdown order before replacing the page.
const LEGACY_ELEMENT_ID = "legacy-v8";
export function hasLegacyVersion() {
  return !!document.getElementById(LEGACY_ELEMENT_ID);
}
export function switchToLegacyVersion(context) {
  let element = document.getElementById(LEGACY_ELEMENT_ID);
  if (!element) return false;
  let binary = atob(element.textContent.replace(/\html+/g, "")),
    bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  let html = new TextDecoder("utf-8").decode(bytes);
  context.dead = true;
  try {
    context.renderer.setAnimationLoop(null);
  } catch {}
  try {
    context.audio &&
      context.audio.ctx &&
      context.audio.ctx.close &&
      context.audio.ctx.close();
  } catch {}
  try {
    document.pointerLockElement && document.exitPointerLock();
  } catch {}
  try {
    context.renderer.forceContextLoss();
  } catch {}
  return (document.open(), document.write(html), document.close(), true);
}
