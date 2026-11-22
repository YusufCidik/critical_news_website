# Event clustering evaluation

V3 indexed titles alone and required relatively high literal overlap. Editors and publishers often use different verbs, counts, names and first clauses. V3.1 adds bounded headline and first-sentence token overlap, small synonym normalization, and a stronger shared-context test for paraphrases. The 36-hour window and explicit location guard remain. Short overlaps require rare terms and tighter time proximity. Publishers and original URLs remain separate.

| Same-development pair metric | V3 | V3.1 |
| --- | ---: | ---: |
| True positives | 1 | 14 |
| False positives | 0 | 0 |
| False negatives | 20 | 7 |
| True negatives | 17 | 17 |
| Precision | 100% | 100% |
| Recall | 4.8% | 66.7% |

The sample contains 38 manually adjudicated real publisher pairs, 21 positives and 17 negatives, supplied with exact source URLs. Codex did the separate editorial reading pass, and the pairs were used in development. Zero observed false positives on 17 sampled negatives cannot establish a general precision rate. Verified examples include stories about the same rugby result, boat incident and court or government developments. Deliberate negatives include distinct trade agreements, different rescue bids, matches, and localized incidents.

Chronology uses publication timestamps. Disagreement detection excludes explicitly rising, revised and qualified fatality counts and preserves direct attribution. Missing evidence, syndicated reports and long-running event sequences still need editorial review. Run `npm run evaluate:v31 -- --check` to verify the pair comparison and list mismatches.
