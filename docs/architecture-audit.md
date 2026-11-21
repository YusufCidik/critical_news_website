# Repository architecture audit

The baseline is Git commit `4bd85b4`.

| Area | Implementation and observed behavior |
| --- | --- |
| Collection | `lib/news/sources.ts` registers 95 public RSS/Atom feeds from 65 publishers. `feed.ts` uses 20 workers, a five-second fetch deadline, and caps each feed at 200 items. Frankfurter/ECB supplies the independent markets panel. |
| Normalization | The live feed strips HTML, truncates display excerpts, extracts media, hashes the raw link, and keeps seven days of reports. Invalid publication dates previously became current dates. |
| Deduplication | The live snapshot merged raw-link IDs and forced AI to win on collisions. A second API pass dropped identical headlines even across publishers. No event membership or publisher provenance survived that second pass. |
| Classification | Live rules combine feed labels, metadata, English/Turkish terms and company names. AI selection ignores how central the signal is. A separate cron classifier matches substrings such as `ai` in “against.” The Swiss article's original record and serving path are unavailable. |
| Events | The baseline has no event detection, timeline or disagreement model. |
| Impact | The live feed assigns 5–9 from a short keyword list, with a default boost for AI, economy and geopolitics. The badge converts those scores into labels such as Critical without an uncertainty measure. |
| Briefings | Article analysis uses Gemini with headline and short RSS excerpt. Shape validation checks field types, without checking claims against evidence. The assistant ranks feed records and can use an optional Gemini relevance selector, response budgets and source links. Translation uses Gemini and MyMemory. TTS proxies optional ElevenLabs. |
| Persistence | Feed snapshots are process memory. The cron writes a local JSON file with no live reader. Browsers use IndexedDB for recent stories and localStorage for bookmarks, language and theme. Sync echoes input. There is no account authentication or durable server database. |
| Caching | Upstream Next data cache revalidates after five minutes. Aggregated process cache lasts 30 seconds. Complete localized pages get CDN caching. A service worker caches navigations and feed GETs, with separate IndexedDB fallback. |
| API | Routes cover news, article image and briefing, assistant, translation, ingestion, markets, sync and TTS. Publisher image requests use allowlists and check redirects. |
| Frontend | Next App Router renders a client newsroom with filters, browser-local search, market ticker and assistant. Server article pages use the live snapshot and fall back to IndexedDB on-device. The active detail page supports saving. |
| Deployment | Next.js 16, React 19, and Vercel daily cron at 06:00 UTC. The README's previous 15-minute schedule was stale. |
| Tests and CI | The Node suite bundles TypeScript with esbuild and mocks RSS, translation and Gemini. It includes API and static-render smoke tests. Baseline had no checked-in CI workflow. Clean npm install failed on missing Sharp optional packages in the lockfile. |
| Operational security | The old cron accepted a publicly derivable fallback secret. Optional provider endpoints consume shared quota; baseline has no distributed quota guard. Request validation varies. Publisher output and browser-supplied assistant context have distinct trust levels. |

## Open-source review

- [FreshRSS](https://github.com/FreshRSS/FreshRSS) provides mature feed aggregation and per-user subscriptions in a separate PHP application. Retain the existing RSS parser and device-local preferences for this Next.js product.
- [Media Cloud Story Indexer](https://github.com/mediacloud/story-indexer) separates fetching, parsing and indexing for an archive-scale pipeline. Adopt explicit normalization, provenance and independent pipeline stages within the present deployment.
- [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz) offers mature fuzzy string metrics in Python. Event identity also needs time windows and distinguishing shared terms. Use bounded candidate retrieval and token overlap locally, without a second runtime or model calls.
- [news-please](https://github.com/fhamborg/news-please) implements full-page extraction and crawling. V3 limits article evidence to publisher-provided RSS text to keep extraction, policy and runtime predictable.
- [Event Registry Python client](https://github.com/EventRegistry/event-registry-python) shows event and article retrieval as distinct product concepts. Its client depends on an external service, so V3 uses local event data from registered publisher feeds.
