import fs from "node:fs/promises";
import path from "node:path";

const serviceWorkerPath = path.join(process.cwd(), "public", "sw.js");

try {
  await fs.access(serviceWorkerPath);
  console.log("Service worker ready:", serviceWorkerPath);
} catch {
  throw new Error(`Service worker missing at ${serviceWorkerPath}`);
}
