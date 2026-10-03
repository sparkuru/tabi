import { defineConfig } from "@playwright/test";

const baseURL = process.env.TABI_E2E_BASE_URL;
if (!baseURL || process.env.TABI_E2E_ISOLATED !== "1") {
  throw new Error(
    "Browser tests require TABI_E2E_ISOLATED=1 and TABI_E2E_BASE_URL for a dedicated test deployment; use ./hako browser npm run test:e2e.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    browserName: "chromium",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
});
