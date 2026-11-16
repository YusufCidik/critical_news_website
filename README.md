# Critical News Website / IntelMatrix

IntelMatrix is a professional, responsive newsroom for world affairs, AI, technology, markets, science, health, climate, defense, culture, sports, energy, and travel. It combines multiple publisher RSS feeds, concise source-linked summaries, importance scoring, country/category views, live market data, offline caching, and a Gemini-powered news assistant.

Repository: https://github.com/YusufCidik/critical_news_website

## Product features

- Professional white newsroom layout with optional dark mode.
- Language selector: Turkish, English, German, French, and Spanish UI, headlines and publisher excerpts.
- Relative publication times such as `40 dakika önce`, `2 saat önce`, and `3 gün önce`.
- Seven-day rolling news window with importance and latest sorting.
- Cursor pagination with an explicit load-more action.
- World and country views for Türkiye, US, UK, China, Israel/Palestine, Ukraine, Russia, Iran, France, Germany, India, and Japan.
- Categories for geopolitics, AI, technology, economics, science, sports, culture, health, climate, defense, energy, and travel.
- Importance labels: `Kritik`, `Yüksek`, `İzlenmeli`, and `Düşük`, backed by a 1-10 impact score.
- Breaking-news strip based on explicit publisher signals such as breaking, live updates, or developing.
- Publisher name, publication time, image, and original source link on every article.
- Markets panel with live USD-based EUR, TRY, GBP, JPY, CHF, and CAD reference rates from Frankfurter / ECB.
- News AI assistant that answers questions using the currently loaded article context.
- Gemini structured enrichment pipeline and optional ElevenLabs audio summaries.
- IndexedDB cache and service-worker fallback for offline reading.
- Vercel cron configuration for scheduled ingestion.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The RSS newsroom and market panel work without API keys. Gemini and ElevenLabs are optional.

## Environment variables

Add these to `.env.local` locally and to the hosting provider's environment settings:

```env
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
CRON_SECRET=replace-with-a-long-random-secret
```

Never commit `.env.local`, API keys, or other credentials.

## Gemini assistant

The assistant endpoint is `POST /api/assistant`. The browser sends the currently loaded headlines, summaries, sources, dates, categories, and importance scores. The Gemini key is used only inside the server route and is never exposed to the browser.

Without `GEMINI_API_KEY`, the assistant uses a deterministic local-context fallback so the UI remains usable during development.

## GitHub

The configured target repository is:

```text
https://github.com/YusufCidik/critical_news_website
```

From the project directory:

```powershell
cd "C:\Users\ycidi\Desktop\best_news"
git add .
git commit -m "Add professional newsroom, markets, and Gemini assistant"
git branch -M main
git remote add origin https://github.com/YusufCidik/critical_news_website.git
git push -u origin main
```

If `origin` already exists:

```powershell
git remote set-url origin https://github.com/YusufCidik/critical_news_website.git
git push -u origin main
```

If GitHub asks for authentication, use GitHub CLI (`gh auth login`) or a personal access token instead of a password.

## Vercel deployment

1. Open https://vercel.com/new.
2. Import `YusufCidik/critical_news_website`.
3. Keep the framework as Next.js and the build command as `npm run build`.
4. Add `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `CRON_SECRET` in the project environment settings.
5. Deploy and use the generated HTTPS URL from any device.
6. Add a custom domain under Vercel Project Settings > Domains if needed.

The included `vercel.json` schedules `/api/ingest` every 15 minutes. The live `/api/news` route independently reads the publisher feeds and serves the seven-day feed with source fallback handling.

## Validation commands

```powershell
npm run lint
npm run build
npm run start
```

Lint may report non-blocking image optimization warnings because publisher RSS feeds use changing image CDN domains. The production build must complete with `Compiled successfully` and `Finished TypeScript`.

## Attribution and reliability

IntelMatrix displays shortened RSS summaries and sends readers to the original publisher. RSS availability, wording, images, and timestamps depend on each publisher. A single source timeout does not take down the newsroom; other sources continue and IndexedDB keeps the latest successful feed available offline.

## Article pages, translation and AI setup

Headlines, images, breaking-news links and assistant references now open `/news/[id]`. The detail page has the publisher excerpt, publication time, estimated reading time, a save action and an explicit external source button. Its AI briefing includes a summary, supported facts, available background, a cautious explanation of significance and uncertainties. AI uses the RSS headline and excerpt only; it does not claim to have read the full article.

Select a language to translate headlines and excerpts throughout the feed and detail page. Translation prefers Gemini when configured and falls back to MyMemory. Public translation has service quotas: failures retain the original text, display a retry action and are not cached as successful translations.

Configure the following server-side environment variables in `.env.local` and your hosting environment, then restart/redeploy:

```env
GEMINI_API_KEY=your-key-from-google-ai-studio
GEMINI_MODEL=gemini-3.1-flash-lite
```

The model is configurable; consult [Google's model reference](https://ai.google.dev/gemini-api/docs/models) for models available to your account. Keys are never sent to the browser. Without a key, the assistant explicitly shows publisher excerpts instead of an AI answer, and the article page marks AI analysis as unavailable. Provider errors have the same visible fallback and can be retried.

Importance is a keyword-based priority heuristic, independent of publication age; it is not an AI fact check. Sorting by importance or latest happens before pagination. Additional pages load only when requested.

Article availability follows the rolling RSS feed and its in-process cache. Cached articles can also be read from IndexedDB on the same device. This repository does not yet have a durable server-side article database, so older links may become unavailable after leaving RSS and a server restart. Service-worker responses use the browser Cache API, separately from article records in IndexedDB.

Run `npm test`, `npm run lint` and `npm run build` to verify changes. The regression suite mocks external services and tests RSS media extraction, stable IDs and detail lookup, category filtering, pagination, full-length translations, retry behavior, AI schema validation, conversation context and article references. A real Gemini response requires a configured key and is not covered by the mocked tests.

## Performance and editorial assistant controls

The news API accepts `language=tr|en|de|fr|es` and includes confirmed `localized_title` values with each page. These seed the client translation queue, so a ready headline does not require a second request. Complete public feed responses are cached by language, filters and pagination at the Vercel CDN; partial translation responses are not cached. The browser shows its saved feed while refreshing and writes fresh records to IndexedDB without blocking rendering.

Model roles are independent, server-side settings:

```env
GEMINI_TRANSLATION_MODEL=gemini-3.5-flash-lite
GEMINI_SELECTION_MODEL=gemini-3.5-flash-lite
GEMINI_ASSISTANT_MODEL=gemini-4-hydrogen
```

These are the defaults, verified against the available Gemini models. `GEMINI_MODEL` remains a legacy ingestion setting. The assistant and article briefings use the editorial model; translation and relevance selection use the fast model. Consult the [Gemini model reference](https://ai.google.dev/gemini-api/docs/models) for account availability.

The assistant interprets concise/detailed requests and explicit word, sentence and bullet limits. The default answer is capped at 140 words; concise requests at 60; detailed requests at 360 unless the user supplies a different bounded word count. A final server-side check enforces the budget even if the model exceeds it. Formatting-only follow-ups reuse validated prior article references and preserve the topic. Source links remain available in a collapsed list. Long news grids skip offscreen rendering and unchanged cards avoid repeated React renders.
