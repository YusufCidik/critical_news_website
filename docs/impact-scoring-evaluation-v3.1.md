# Impact scoring evaluation V3.1

V3 only awarded global impact when one of eight narrow rule dimensions matched. The population regular expression was double-escaped inside a raw template, preventing routine numeric population phrases from matching. V3 also lacked a low-impact pathway for ordinary completed results. In some feeds it used the longer encoded body in place of the distinct RSS lead.

V3.1 fixes population extraction, evaluates the distinct lead and early RSS body, and adds bounded outcomes and provisional developments. An observed tightly scoped outcome can score 1, such as a decided match or limited product release. A reported change with unclear reach can receive a provisional estimate. Conditional claims contribute to provisional scores only, which are capped at 4 and downweighted in global ordering. Stronger direct consequence signals determine supported scores. Questions, speculation-only coverage and unsupported framing can still abstain. Category milestones and local Saved preferences remain separate.

## Matched snapshot

The 21 November V3 report observed 67/2,178 scored. The following replay applies both versions to a single later corpus captured on 22 November at 05:14 UTC. It held original classifications fixed and used original publisher evidence plus the available RSS display lead for V3.1. The display lead is a truncated proxy for the separate publisher lead. The live command also reports production-pipeline results on a newly fetched snapshot.

| Status | V3 | V3.1 |
| --- | ---: | ---: |
| Reports | 2,162 | 2,162 |
| Supported | 76 | 151 |
| Provisional | 2 | 75 |
| Insufficient | 2,084 | 1,936 |
| Coverage | 3.6% | 10.5% |
| Abstention | 96.4% | 89.5% |
| Scores 1–2 | 78 | 222 |
| Scores 3–4 | 0 | 3 |
| Scores 5–6 | 0 | 1 |
| Scores 7–10 | 0 | 0 |

## Editorial challenge

There are 49 editorial judgment rows with a target evidence status and, where justified, a range on the 1–10 scale. Labels were assigned separately from the scorer by reading publisher evidence. This is a small, selected rubric exercise and offers no human inter-rater or probability calibration.

| Observation | V3 | V3.1 |
| --- | ---: | ---: |
| Scored | 7/49 | 21/49 |
| Status agreement | 21/49 | 35/49 |
| Within the editorial band | 5 | 18 |
| Below band among scored | 1 | 2 |
| Above band among scored | 0 | 0 |
| Scored where the rubric abstained | 1 | 1 |
| Abstention where the rubric supported a band | 27 | 13 |
| Exact evidence passages | 7/7 | 23/23 |

For V3.1, status and band jointly agreed on 9/10 moderate supported outputs, 6/8 limited supported outputs, and 3/3 provisional outputs. Exact extract checks verify attribution to input wording. They cannot establish that an excerpt is independently true or that its contexts are complete.

Run `NODE_USE_ENV_PROXY=1 npm run evaluate:v31 -- --live` behind a proxy for a fresh RSS run. A custom capture can be replayed with `--snapshot=/path/to/capture.json`. Most live reports still lack sufficient evidence for a global score. Publisher policy and multilingual extraction affect the achievable coverage. The current results support exposing provisional labels and abstention.

A second live run at 05:29 UTC used the actual V3.1 normalizer with 87 active feeds and 2,161 articles. It produced 157 supported and 75 provisional scores, with 1,929 abstentions. Applying V3 to the same articles produced 78 scores. The resulting coverage was 3.6% → 10.7%.
