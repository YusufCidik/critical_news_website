# Classification evaluation V3.1

V3 overused broad words such as “fossil,” missed common sector and Turkish inflections, and sometimes let an AI mention outweigh a scientific, regulatory or technology development. A focused lead drove little score on its own. V3.1 adds domain phrases and specific lead evidence, discounts incidental AI references, and gives publisher sections limited weight. There are no classification model calls.

The 216 reports are real RSS headlines with short excerpts, URLs, publishers and dates. Editorial labels were assigned by Codex in a separate reading pass without using classifier outputs as labels. No independent human labels were supplied. The development and review splits informed rule changes. The final 53-report split was frozen before the final rules, and its aggregate first-run failure patterns informed the last pass without inspecting individual misses before that pass. The splits share a rolling feed and can include coverage of the same event. These are directional estimates from a selected sample.

| Split | Reports | Accuracy V3 → V3.1 | Macro F1 | Secondary/exclusion checks |
| --- | ---: | --- | --- | --- |
| Development | 95 | 46.3% → 83.2% | 0.445 → 0.856 | 7/8 → 6/8 |
| Review | 68 | 51.5% → 89.7% | 0.473 → 0.885 | 5/5 → 5/5 |
| Holdout | 53 | 54.7% → 81.1% | 0.488 → 0.789 | 2/3 → 3/3 |

## Final split by category

| Category | Support | Precision V3 → V3.1 | Recall V3 → V3.1 |
| --- | ---: | --- | --- |
| AI | 5 | 0.714 → 1.000 | 1.000 → 1.000 |
| Bilim | 7 | 0.875 → 1.000 | 1.000 → 1.000 |
| Dünya | 2 | 0.071 → 0.167 | 0.500 → 0.500 |
| Ekonomi | 6 | 0.667 → 0.800 | 0.333 → 0.667 |
| Enerji | 6 | 1.000 → 1.000 | 0.667 → 1.000 |
| Jeopolitik | 7 | 1.000 → 0.800 | 0.286 → 0.571 |
| Kültür | 2 | 0.000 → 1.000 | 0.000 → 1.000 |
| Savunma | 4 | 1.000 → 1.000 | 0.500 → 0.750 |
| Sağlık | 5 | 1.000 → 1.000 | 0.600 → 1.000 |
| Spor | 3 | 0.000 → 1.000 | 0.000 → 0.667 |
| Teknoloji | 4 | 0.286 → 0.600 | 0.500 → 0.750 |
| İklim | 2 | 0.500 → 0.500 | 0.500 → 0.500 |

Most frequent final confusion pairs were Jeopolitik → Dünya (2), Savunma → Dünya (1), İklim → Teknoloji (1), Teknoloji → Ekonomi (1), Ekonomi → Jeopolitik (1), Spor → Dünya (1). Small classes make individual estimates volatile. Precision and recall for missing support are excluded from macro F1. Coverage includes politics, international affairs, AI, technology, science, economics, sports, public health, culture, defense, climate, energy, and ambiguous or multi-topic headlines. The earliest synthetic tests still guard Swiss and “against” misclassification, misleading section metadata, and incidental organization names.

Run `npm run evaluate:v31 -- --check` for full per-class metrics and confusion counts. The command loads the exact V3 implementation from `03395a5`. The evaluation keeps the RSS title, short lead and source section constant. Production also passes source topic tags, which can contribute limited context. The chosen rule engine remains interpretable and runs in-process without training infrastructure. A fastText supervised baseline would require more labeled training examples and distinct validation data. [fastText](https://github.com/facebookresearch/fastText)
