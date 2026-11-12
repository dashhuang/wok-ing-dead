// A stand-in for the Pointer Lock API, injected into test pages with page.addInitScript.
//
// A real requestPointerLock() in Chromium on macOS moves and hides the *system* cursor, even
// in headless mode, so tests running on a Mac someone is using make their cursor jump. This
// keeps the page's view of the API (pointerLockElement, pointerlockchange, exitPointerLock)
// without ever asking the OS to capture the mouse. mousemove still carries movementX/Y.
(() => {
  let locked = null;
  const change = () =>
    queueMicrotask(() =>
      document.dispatchEvent(new Event("pointerlockchange")),
    );
  Object.defineProperty(Document.prototype, "pointerLockElement", {
    configurable: true,
    get() {
      return locked && locked.isConnected ? locked : null;
    },
  });
  Element.prototype.requestPointerLock = function () {
    if (locked !== this) {
      locked = this;
      change();
    }
    return Promise.resolve();
  };
  Document.prototype.exitPointerLock = function () {
    if (locked) {
      locked = null;
      change();
    }
  };
})();
