# INTELMATRIX V3.1 production report

The release continues PR #1 on `codex/intelmatrix-v3` from `03395a5`. The existing production domain and project were verified before implementation. The production rollout record is recorded after the Git integration deploys the reviewed revision.

- The population matcher was double-escaped and the score had no path for observed low-impact outcomes. V3.1 fixes numeric extraction, retains separate RSS lead evidence and introduces supported, provisional and insufficient outcomes. [Impact evaluation](docs/impact-scoring-evaluation-v3.1.md)
- The classifier missed domain-specific and multilingual wording, and sometimes treated incidental AI terms as the main subject. The 53-report final split improved from 54.7% to 81.1% accuracy and from .488 to .789 macro F1. [Classification evaluation](docs/classification-evaluation-v3.1.md)
- Clustering adds bounded context and small synonym mappings to a conservative primary-title matcher. On 38 selected real-news pairs, recall rose from 4.8% to 66.7%, with no false positives observed in either run. [Event evaluation](docs/event-clustering-evaluation.md)
- Briefings continue to select exact publisher text. The selector rejects boilerplate and truncated sentences, and caches the same publisher passages across UI languages. The extractive fallback retains source attribution and source order.
- The UI distinguishes provisional scores from insufficient evidence. The legacy modal uses the same image component as the feed and retains its image fallback.
- The existing Vercel workspace holds encrypted required configuration. No database changes or new infrastructure are included. [Production readiness](docs/production-readiness.md)

## Verification and rollout

The clean local suite passed 32 unit and mocked integration tests, both evaluation commands, typecheck, lint, dependency audit, production build and four browser checks across desktop and mobile. The separate live publisher run compared 2,161 reports and found 3.6% → 10.7% impact coverage. Exact-commit GitHub Actions checks and Vercel Preview gate the production smoke tests. The previous production deployment is `dpl_4tMfNkFUd6DxoN2WCxp8LXVEuoJd` at `4bd85b40ffd7f9d9dce13e5e0cf13dcd9e728901`.

The expected production URL is [critical-news-website.vercel.app](https://critical-news-website.vercel.app/). The final deployment ID, deployed commit, PR status, and provider smoke outcomes are recorded after verification.

## Remaining limitations

Most RSS articles still leave global impacts unclear. Evaluation uses one editorial label pass and a selected publisher window. Event groups are volatile across cold starts, and cross-language paraphrases can split groups. Per-process quotas do not provide distributed enforcement. A configured cron variable and unauthorized request verify only parts of cron delivery.
