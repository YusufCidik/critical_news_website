# INTELMATRIX V3.1 production report

The release continues PR #1 on `codex/intelmatrix-v3` from `03395a5`. The existing Vercel project and production domain were verified before implementation. The Git integration published the reviewed revision through the existing main branch.

- The population matcher was double-escaped and the score had no path for observed low-impact outcomes. V3.1 fixes numeric extraction, retains separate RSS lead evidence and introduces supported, provisional and insufficient outcomes. [Impact evaluation](docs/impact-scoring-evaluation-v3.1.md)
- The classifier missed domain-specific and multilingual wording, and sometimes treated incidental AI terms as the main subject. The 53-report final split improved from 54.7% to 81.1% accuracy and from .488 to .789 macro F1. [Classification evaluation](docs/classification-evaluation-v3.1.md)
- Clustering adds bounded context and small synonym mappings to a conservative primary-title matcher. On 38 selected real-news pairs, recall rose from 4.8% to 66.7%, with no false positives observed in either run. [Event evaluation](docs/event-clustering-evaluation.md)
- Briefings continue to select exact publisher text. The selector rejects boilerplate and truncated sentences, and caches the same publisher passages across UI languages. The extractive fallback retains source attribution and source order.
- The UI distinguishes provisional scores from insufficient evidence. The legacy modal uses the same image component as the feed and retains its image fallback.
- The existing Vercel workspace holds encrypted required configuration. No database changes or new infrastructure are included. [Production readiness](docs/production-readiness.md)

## Verification and rollout

The clean local suite passed 32 unit and mocked integration tests, both evaluation commands, typecheck, lint, dependency audit, production build and four browser checks across desktop and mobile. The separate live publisher run compared 2,161 reports and found 3.6% → 10.7% impact coverage. Exact-commit GitHub Actions checks and Vercel Preview gate the production smoke tests. The previous production deployment is `dpl_4tMfNkFUd6DxoN2WCxp8LXVEuoJd` at `4bd85b40ffd7f9d9dce13e5e0cf13dcd9e728901`.

| Release record | Verified value |
| --- | --- |
| Production URL | [critical-news-website.vercel.app](https://critical-news-website.vercel.app/) |
| Vercel project and target | `critical-news-website`, Production |
| Production deployment | `dpl_FRmjBELSYLxmDzqjfTmwAk9Z95Gi`, `READY`, assigned to the production domain |
| Production commit | [`d1baef1f38a07f65b11997e697d14d357ebb6b81`](https://github.com/YusufCidik/critical_news_website/commit/d1baef1f38a07f65b11997e697d14d357ebb6b81) |
| PR | [#1](https://github.com/YusufCidik/critical_news_website/pull/1) merged at 05:32 UTC on 22 November 2026 |
| Preview | `dpl_Fp1JMBAKwRNz2oG16HYrRT1P8Gpr` at `8d3460c5a1e4090a988a7a3ce0d705371e14b7da`, `READY` |
| Hosted CI | [Pre-merge checks](https://github.com/YusufCidik/critical_news_website/actions/runs/44989663188) and [merged main](https://github.com/YusufCidik/critical_news_website/actions/runs/44989845121) passed |
| Preview smoke | Home, versioned feed, search, linked article, and extractive briefing returned HTTP 200. Unauthenticated cron returned HTTP 401. |
| Live Gemini | One eligible preview request selected two MIT News passages via `gemini-3.5-flash-lite`, and preserved the original source URL. |
| Production HTTP | Home, versioned feed, search, article, and extractive publisher briefing returned HTTP 200. Feed observed 93 active feeds and 63 active publishers. A single unauthenticated cron request returned 401 before refresh. |
| Production Chromium | Desktop and Pixel 7 passed category navigation, live search with V3.1 responses, article score evidence, and device-local Save without uncaught errors or horizontal overflow. Automated translation requests were suppressed during this browser check. |

## Remaining limitations

Most RSS articles still leave global impacts unclear. Evaluation uses one editorial label pass and a selected publisher window. Event groups are volatile across cold starts, and cross-language paraphrases can split groups. Per-process quotas do not provide distributed enforcement. The cron configuration and unauthenticated rejection were verified on Preview and Production. The next authenticated production scheduler run remains unobserved. ElevenLabs was not exercised because the release made no changes to the production speech provider workflow.
