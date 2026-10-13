# Critical News Website / IntelMatrix

IntelMatrix is a professional, responsive newsroom for world affairs, AI, technology, markets, science, health, climate, defense, culture, sports, energy, and travel. It combines multiple publisher RSS feeds, concise source-linked summaries, importance scoring, country/category views, live market data, offline caching, and a Gemini-powered news assistant.

Repository: https://github.com/YusufCidik/critical_news_website

## Product features

- Professional white newsroom layout with optional dark mode.
- Site language selector: Turkish, English, German, French, and Spanish UI.
- Relative publication times such as `40 dakika önce`, `2 saat önce`, and `3 gün önce`.
- Seven-day rolling news window, sorted with recent and breaking signals first.
- Infinite feed with cursor pagination and a manual load-more fallback.
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
