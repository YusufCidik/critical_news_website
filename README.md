# IntelMatrix

IntelMatrix is a responsive, white-background newsroom for global affairs, technology, AI, science, and economics. It aggregates multiple RSS publishers, keeps the original source link visible, extracts publisher photography when available, supports country/category views, and progressively loads the feed as the reader scrolls.

## Features

- Live RSS aggregation from BBC World, BBC Turkce, Daily Sabah, Al Jazeera, The Guardian, NPR, TechCrunch, The Verge, and Deutsche Welle.
- Source attribution, original article links, publication time, and source-provided images.
- World view plus country views for Turkiye, the US, UK, China, Israel/Palestine, Ukraine, Russia, Iran, France, Germany, India, and Japan.
- Category views for geopolitics, AI, technology, economics, and science.
- Breaking-news strip for publisher headlines containing an explicit live/breaking/developing signal.
- Cursor-based infinite feed with an accessible load-more fallback.
- IndexedDB offline cache and service-worker fallback.
- Optional ElevenLabs audio summaries with browser speech fallback.
- Optional Gemini enrichment pipeline for scheduled ingestion.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The public newsroom feed works without API keys. ElevenLabs and Gemini are optional integrations.

## Environment variables

Set these in `.env.local` for local use or in the hosting provider dashboard:

```env
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
GEMINI_API_KEY=
CRON_SECRET=replace-with-a-long-random-secret
```

Never commit `.env.local` or any real API key.

## Deploy to the public internet with Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Open [vercel.com/new](https://vercel.com/new) and import the repository.
3. Keep the detected framework as Next.js and the default build command as `npm run build`.
4. Add the environment variables above under Project Settings > Environment Variables.
5. Deploy. Vercel provides an HTTPS URL that works from desktop and mobile devices.
6. Add a custom domain from Project Settings > Domains if desired.

The included `vercel.json` schedules `/api/ingest` every 15 minutes. Set `CRON_SECRET` in Vercel; Vercel sends it as a bearer token to the scheduled route. The live `/api/news` endpoint remains available even if the scheduled enrichment route is not configured.

## Useful commands

```bash
npm run build
npm run start
npm run lint
```

## Data and attribution

IntelMatrix displays shortened RSS summaries and links readers to the original publisher. RSS availability, image availability, article wording, and publication times depend on each publisher. A source timeout does not take down the whole feed; available publishers continue to appear and cached data remains available offline.
