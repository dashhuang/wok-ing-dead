// Tests for the weapon lab, separate from the game's (tests/e2e): npm run arsenal:test
import { defineConfig, devices } from "@playwright/test";

const PORT = 5312;

export default defineConfig({
  testDir: "tests",
  timeout: 600_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 810 },
        // the full browser in headless mode, not the cut-down headless shell: the range
        // captures the mouse (pointer lock), which the shell does not do
        channel: "chromium",
        launchOptions: {
          // WebGL 2 on the GPU where there is one; software rendering on Linux CI and containers
          args:
            process.platform === "linux"
              ? [
                  "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader",
                  "--mute-audio",
                ]
              : [
                  "--use-angle=metal",
                  "--enable-gpu",
                  "--ignore-gpu-blocklist",
                  "--mute-audio",
                ],
        },
      },
    },
  ],
  // Against the production build, like the game's tests: nothing reloads under a test.
  webServer: {
    command: `npx vite build --config vite.config.js && npx vite preview --config vite.config.js --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
