import { defineConfig, devices } from "@playwright/test";

// CI sets E2E_PORT so a run on the shared Mac Studio never collides with a local session.
const PORT = Number(process.env.E2E_PORT) || 5199;

export default defineConfig({
  testDir: "tests/e2e",
  // The game builds the whole street on load: ~1 min on the Mac Studio while it is busy.
  timeout: 240_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : "list",
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
        viewport: { width: 1280, height: 720 },
        // Machines without a GPU (Linux CI, containers) fall back to software WebGL 2.
        launchOptions:
          process.platform === "linux"
            ? {
                args: [
                  "--use-angle=swiftshader",
                  "--enable-unsafe-swiftshader",
                ],
              }
            : {},
      },
    },
  ],
  // Tests run against the production build, never the dev server: hot reload from other
  // edits would interrupt them, and the build is what actually ships.
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
