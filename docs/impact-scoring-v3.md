# Impact scoring V3

The old live feed assigned every article a 5–9 score. Keywords such as “war” and “nuclear” triggered 9 even in commentary and uncertain reports. AI, economics and geopolitics received a category-based boost. V3 separates category milestones, broad consequences, score confidence and user preferences.

## Scoring

| Dimension | Evidence examples |
| --- | --- |
| Population | A reported number of people evacuated, displaced or affected |
| Geographic reach | Explicit national or multi-country scope |
| Economic | Reported losses, job cuts or monetary policy changes |
| Institutional | Enacted measures, court decisions, treaties in force or emergency declarations |
| Scientific | Trial phase, peer review, independent replication or regulatory approval |
| Duration | A stated multi-year or indefinite consequence |
| Magnitude | Reported disaster magnitude, fatalities or infrastructure disruption |
| Reversibility | Explicit permanent or irreversible loss |

The engine quotes the passage behind each matched dimension. It favors direct over qualified statements, discounts forecasts and skips negative matches. Repeated signals within a dimension contribute once. Global impact abstains when no dimension has evidence. Category importance can also use a topic milestone, such as a World Cup final. Time provides a tie-breaker and a separate latest-only sort. The feed consistently ranks within the selected category. Bookmarks never change either score.

The confidence band depends on the number of direct evidence dimensions and the available excerpt. It expresses the rule's evidence strength in the feed. Individual scores have no statistical calibration against real consequences.

## Live calibration

On 21 November 2026 at 20:09 UTC, the same RSS responses produced **2,178 matched canonical reports** in the baseline and V3. There were 87 active section feeds and 57 active publishers. Run `npm run evaluate:impact` to reproduce the method. It fetches one response per configured URL, runs both normalizers and compares canonical URL matches.

| Scoring approach | Unknown | 1–3 | 4–6 | 7–8 | 9–10 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline keyword score | 0 | 0 | 1,969 | 98 | 111 |
| V3 absolute global impact | 2,111 | 67 | 0 | 0 | 0 |
| Global percentile among scored reports | 2,111 | 20 | 47 | 0 | 0 |
| Within-category percentile among scored reports | 2,038 | 28 | 81 | 21 | 10 |
| Hybrid 75% absolute global, 25% global percentile | 2,111 | 67 | 0 | 0 | 0 |
| V3 absolute category importance | 2,038 | 2 | 67 | 71 | 0 |

V3 uses the two absolute measures. In this sample, percentiles promoted sparse, tied observations despite unchanged evidence, and category percentiles gave ten reports 9–10. The hybrid did little to address coverage. The sample also shows the central limitation of the current rules. About 97% of reports had no global score and all scored reports were at most 3. In this coverage mix the objective view mostly becomes a recency sort after the small scored set. This is preferable to giving every headline an inferred consequence, and it requires a broader labeled evaluation before changing thresholds or promising ranking quality.

A review of highly rated baseline stories found stories about a proposed deal, commentary, and an earthquake question. It also found a reported earthquake magnitude that V3 initially missed because of a Turkish suffix. The current magnitude rule and regression suite cover that wording. Held-out editorial impact labels and translated consequence extraction remain priorities.
