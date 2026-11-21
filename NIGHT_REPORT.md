# INTELMATRIX V3 delivery report

## Starting point

The live Next.js newsroom read a rolling RSS feed. An unrelated cron fetched a smaller registry, called Gemini for each item and wrote a JSON file the live newsroom never read. The UI filtered already loaded articles, and saved records had no view. It showed category-favored keyword scores as editorial urgency. There was no event model or CI workflow.

Source review verified that live classification could promote a publisher AI section, a company name, or an incidental AI mention to primary AI. The orphan cron regex also matched `ai` inside words such as “against.” The original Swiss article record was unavailable. The regression fixtures reproduce the relevant failure patterns.

## Completed and verified

- Contextual, versioned classification supports secondary topics, rule evidence, tags and confidence. On the 28-case review set, top-1 accuracy rose from 64.3% to 71.4%, and macro F1 from .759 to .804. The 48-case development set rose from 58.3% to 100%. These are fixture results. [Method and confusion patterns](docs/classification-evaluation.md)
- Consequence and category scores now use separate evidence and can abstain. On 2,178 matched live RSS reports, the baseline assigned 209 reports at least 7/10, including 111 at 9/10. V3 assigned a global score to 67 reports, all at 1–3. The sample established a substantial abstention rate and insufficient evidence to claim production ranking calibration. [Scoring comparison](docs/impact-scoring-v3.md)
- Canonical URL deduplication preserves tracked-link aliases and distinct publisher reports. The rolling index grouped 78 reports, with 23 publisher-diverse groups observed in the live sample. The app shows dated source extracts, coverage, and narrowly comparable fatality counts with different reported values. [Event model](docs/event-intelligence.md)
- Article briefing uses exact RSS passages in concise and detailed modes. A model can select passage indices, and invalid output falls back to deterministic source selections. The assistant uses server-controlled excerpts while a live feed is available.
- Server search filters before pagination and uses cached translations when available. The device-local Saved view retains article access without affecting objective ranks. Score evidence and coverage are visible on mobile and desktop.
- The authenticated cron uses the shared feed pathway and no per-article model calls. The service no longer writes an unused local JSON file. Feed and provider responses have time or size bounds. Public search avoids shared and service-worker caching.
- Next.js was upgraded from 16.3.8 to 16.4.6 after the baseline npm audit flagged critical advisories. The final npm audit reported zero known vulnerabilities. The lockfile supports clean installs, and unused UI and Workbox dependencies were removed.

## Verification

| Check | Scope and result |
| --- | --- |
| Baseline install, build and tests | Original lockfile failed clean install. After refreshing the lockfile, baseline build and all 27 mocked regression tests passed. |
| Clean install, typecheck and production build | Passed on Node 24 and Next.js 16.4.6. |
| Lint | Passed with one existing warning about `<img>` in an unused legacy modal. |
| Regression suite | 31 passed, including mocked RSS and Gemini, API validation, scores, event updates, aliases and bounded provider requests. |
| Browser | Desktop Chromium and Pixel 7 viewport passed against the production build using fixture RSS and market data. Covers server search, event attribution, score evidence, source briefing and saved state after reload. |
| Live publisher data | Read-only matched RSS comparison used one set of responses for both versions. 87 feeds and 57 publishers returned recent reports. A separate local production server returned HTTP 200 on real feed, search, detail and keyless extractive briefing requests. |
| GitHub Actions | Workflow covers clean install, lint, typecheck, tests, evaluation, runtime dependency audit, build and Chromium smoke. |

## Performance and reliability

Story lookup uses a map and warm event updates only match new reports. Consolidated snapshot refresh eliminates the old cron's optional enrichment loop, which could attempt 36 article-level calls in one invocation. Feed concurrency remains bounded. Search groups and paginates before translation, and results avoid shared caching. In one local live run, the first feed page took 4.73 s, subsequent search 26 ms, article render 3.32 s, and extractive briefing 14 ms. This is a single run through the environment proxy. It provides no production latency or cost estimate.

## Implemented with verification limits

- Live newsroom samples established score distribution and event coverage. Editorial accuracy for ranking and event pairs needs independent labels. Competing fatality counts are possible reporting differences, and repeated publisher coverage can be syndicated.
- Real Gemini and ElevenLabs calls, deployed cron delivery, CDN behavior, and shared quota enforcement require a configured hosting environment. Current budgets are per process and can throttle simultaneous users. Extractive briefings remain usable without Gemini.
- Search covers the rolling snapshot and available translations. It does not translate arbitrary query terms into other source languages.

## Deferred

A durable archive, account-backed personalization, topic following and general claim reconciliation require product validation or infrastructure choices. Prioritize independent classification and event labeling, then improve impact evidence coverage on a representative publisher sample. [Product roadmap](docs/product-roadmap.md)

Delivery branch is [codex/intelmatrix-v3](https://github.com/YusufCidik/critical_news_website/tree/codex/intelmatrix-v3).
