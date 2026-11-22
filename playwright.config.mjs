import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const mockUpstream = fileURLToPath(new URL("./tests/mock-upstream.mjs", import.meta.url));
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/isolate-cache.mjs",
  use: {
    baseURL: "http://localhost:3177",
    serviceWorkers: "block",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "npm run start -- --port 3177",
    url: "http://localhost:3177",
    env: {
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${mockUpstream}`].filter(Boolean).join(" "),
      GEMINI_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    timeout: 60_000,
  },
});
