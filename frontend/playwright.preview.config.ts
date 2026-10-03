import { statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { defineConfig } from "@playwright/test";

const configuredURL = process.env.TABI_PREVIEW_BASE_URL;
let baseURL: string;
try {
  if (!configuredURL) throw new Error();
  const url = new URL(configuredURL);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error();
  baseURL = url.origin;
} catch {
  throw new Error("TABI_PREVIEW_BASE_URL must be an explicit HTTP(S) origin.");
}

const credentialsFile = process.env.TABI_PREVIEW_CREDENTIALS_FILE;
try {
  if (!credentialsFile || !isAbsolute(credentialsFile)) throw new Error();
  const file = statSync(credentialsFile);
  if (!file.isFile() || (file.mode & 0o077) !== 0) throw new Error();
} catch {
  throw new Error(
    "TABI_PREVIEW_CREDENTIALS_FILE must point to an existing absolute owner-only local JSON file.",
  );
}

// Playwright otherwise saves real page text in failure error-context artifacts.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./e2e-preview",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "list",
  outputDir: "test-results/preview",
  use: {
    baseURL,
    browserName: "chromium",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    trace: "off",
    screenshot: "off",
    video: "off",
    serviceWorkers: "block",
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
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
