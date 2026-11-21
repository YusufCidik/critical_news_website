# Event intelligence

The RSS snapshot resolves exact duplicates by canonical URL, strips common tracking parameters, and retains raw-link aliases during the rolling window. Reports from different publishers keep their own links and source names. The feed picks the highest-ranked matching report per event after filtering and before pagination. Article detail exposes the publisher count, recent developments, chronology and original links.

`EventIndex` maintains report membership across warm refreshes. A new report compares its headline with anchors within 36 hours. Matching needs at least four shared informative terms. Paraphrased headlines also need 0.54 Jaccard overlap and a relatively uncommon shared term. For headlines with captured places, two distinct place annotations prevent a match. Large posting lists are skipped. Existing report metadata updates within its current group and expired memberships are pruned. Group IDs represent warm-process identities. Cold starts rebuild from available reports.

The event digest shows up to three distinct extracts from the latest report by each selected publisher. The chronological list includes up to 24 recent or publisher-distinct reports. Different attributed fatality counts within six hours appear together if each source offers a single specific, nonqualified number. The interface names time and method as potential reasons for the difference. This comparison has no authority to choose the correct count. Shared syndication can inflate publisher count without adding independent evidence.

The unit and browser suites cover near-identical titles, a late-arriving source, expiry, venue distinctions, canonical URL aliases, timeline order, duplicated wording and incompatible versus qualified counts. The live impact evaluator also reports clustered article and publisher-group counts. Counts measure coverage, while precision and recall need an independently labeled event sample.

Remaining limits include multilingual paraphrases, long-running events, attribution through wire syndication, and disagreements expressed in prose. A wider event window requires labeled decay and related-event fixtures before rollout.
