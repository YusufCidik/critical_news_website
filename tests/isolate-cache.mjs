import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";

export default async function isolateCache() {
  const cacheDirectory = path.resolve(".next/cache");
  const fetchCache = path.join(cacheDirectory, "fetch-cache");
  await mkdir(cacheDirectory, { recursive: true });
  const backup = await mkdtemp(path.join(cacheDirectory, "browser-test-"));
  const previous = path.join(backup, "fetch-cache");
  try {
    await rename(fetchCache, previous);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return async () => {
    await rm(fetchCache, { recursive: true, force: true });
    try {
      await rename(previous, fetchCache);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await rm(backup, { recursive: true, force: true });
  };
}
