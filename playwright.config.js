import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;

export default defineConfig({
  testDir: "tests/e2e",
  // The game builds the whole street on load; under software WebGL (CI) that takes ~30-60 s.
  timeout: 240_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
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
        launchOptions: {
          // Software WebGL 2 so the test runs the same on CI runners without a GPU.
          args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        },
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
