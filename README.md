# Best News / INTELMATRIX

INTELMATRIX is a Next.js newsroom that aggregates public publisher RSS, groups related developments and displays source-attributed evidence. The recent feed, ranking, event grouping and extractive briefings run without an AI key.

## Run locally

Requires Node.js 24 and npm. Run these commands from the repository root.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. You can set optional credentials in `.env.local`.

```dotenv
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
CRON_SECRET=
```

The daily Vercel cron uses `GET /api/ingest` at 06:00 UTC with an `Authorization: Bearer …` header. `POST` accepts the same header for manual refresh. The endpoint refreshes the shared RSS snapshot, and the configured upstream revalidation window still applies. Set `CRON_SECRET` in the runtime environment for scheduled refresh. Keep provider credentials server-side.

## Newsroom

- The global and category feeds use separate impact and category-importance assessments. An assessment can abstain when source evidence is insufficient.
- The story page exposes scoring evidence, related coverage in publisher order, and possible disagreements about narrowly comparable reported counts.
- Search runs across the current seven-day feed and matches original publisher wording, tags and available cached translations. Its results represent the coverage returned by the registered feeds.
- Saved stories, language and theme are stored on the current device. Saving has no effect on the global agenda. The app also retains recently fetched stories in IndexedDB for offline use.
- Article briefings select exact passages from the RSS excerpt or fuller text included in a public feed. Gemini optionally selects relevant passages, and the app checks the selected indices. The publisher's original language remains visible alongside localized controls and the separate translated article excerpt. The interactive news assistant still generates prose from current server excerpts and validates source reference numbers.
- The feed has process-local snapshots and Next upstream caching. A story link can expire when it leaves the rolling window. A saved copy remains available on the device that saved it.

## Verification

```bash
npm test
npm run evaluate:classification -- --check
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
npm audit --omit=dev
```

The Node and browser suites use simulated provider responses. For a live read-only RSS comparison against the baseline, run `npm run evaluate:impact`. If your network requires an HTTP proxy, Node.js 24 supports `NODE_USE_ENV_PROXY=1`. Both evaluation commands need the baseline commit in local Git history. Publisher feeds can be checked individually with `node scripts/check-news-sources.mjs`.

## Documentation

- [Architecture audit](docs/architecture-audit.md)
- [Classification evaluation](docs/classification-evaluation.md)
- [Impact scoring](docs/impact-scoring-v3.md)
- [Event intelligence](docs/event-intelligence.md)
- [Roadmap](docs/product-roadmap.md)
- [Development report](NIGHT_REPORT.md)
