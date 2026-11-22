# INTELMATRIX production readiness

## Release gates

The existing Vercel project is `critical-news-website` in the `yusufcidiks-projects` Vercel workspace. The production domain is `critical-news-website.vercel.app`. Release uses existing draft PR #1, the GitHub Actions workflow, and the existing Git integration for `main`.

Before this release, the deployment assigned to the production domain was `dpl_4tMfNkFUd6DxoN2WCxp8LXVEuoJd`, Git commit `4bd85b40ffd7f9d9dce13e5e0cf13dcd9e728901`. The V3 branch preview was `dpl_2LxyyULMExZTR6vCdRoXg9wNXQdW` at `03395a5`. Vercel reports Node 24 and Next.js.

| Check | Evidence and release expectation |
| --- | --- |
| Git and Vercel | Verify the exact preview SHA and ready state, and match the production deployment SHA to merged `main`. |
| Environment | Vercel lists encrypted `CRON_SECRET`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, and `ELEVENLABS_VOICE_ID` on both Production and Preview. Values are neither pulled nor printed. |
| Cron | The existing `vercel.json` schedules `/api/ingest` daily at 06:00 UTC. Preview rejects unauthenticated refresh. Mocked tests cover an authenticated refresh and missing-secret behavior. Scheduled execution history requires a runtime log observation. |
| Upstream RSS | Twenty workers, individual five-second timeouts, 2 MB response limits, and a warm snapshot. One sample had 87 active feeds. Cold snapshot assembly depends on publisher availability. |
| Storage | RSS and server caches are ephemeral. Bookmarks and offline news stay browser-local. The change contains no database connections, writes or migrations. |
| Quotas | Optional Gemini selection retains rate and concurrency limits, bounded points, and extractive fallback. Process-local limits do not measure distributed quota usage. |
| Cache | Five-minute upstream cache, local feed snapshot and optional CDN policy. Search stays unshared. Model extraction is cached by source, contents and mode. |
| Provider verification | One concise preview briefing can exercise the configured Gemini account without reading the key. Keep extractive and model-backed results separate in the release report. |
| Rollback | If the deployed revision breaks critical smoke checks, use the existing Vercel project rollback to restore the previous working deployment, then verify the domain alias. |

Run the clean install, lint, typecheck, regression, classification, impact and event comparisons, build and both Chromium profiles before merging. Verify the public deployment on feed, article, search and briefing endpoints after the domain alias changes.
