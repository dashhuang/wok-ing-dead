// Shared test setup for the weapon lab. Import { test, expect } from here, not from
// @playwright/test.
//
// On macOS the page gets a stand-in for the mouse lock (tests/support/fake-pointer-lock.js):
// a real lock moves the system cursor of whoever is using the Mac. Set REAL_POINTER_LOCK=1 to
// use the browser's real lock, only on an isolated machine (a Linux VM or container).
import { test as base, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fakeLock = fileURLToPath(
  new URL("../../tests/support/fake-pointer-lock.js", import.meta.url),
);
const useFake =
  process.platform === "darwin" && process.env.REAL_POINTER_LOCK !== "1";

export const test = base.extend({
  page: async ({ page }, use) => {
    if (useFake) await page.addInitScript({ path: fakeLock });
    await use(page);
  },
});
export { expect };
