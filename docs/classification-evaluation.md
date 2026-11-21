# Classification evaluation

Run `npm run evaluate:classification -- --check`. The runner executes the classifier from commit `4bd85b4` and the current classifier on the same inputs. It reports per-label support, precision, recall and F1, confusion counts, and required secondary or excluded labels. The tests use editorial fixtures written for this project.

| Set | Rows | Top-1 accuracy, old → V3 | Macro precision | Macro recall | Macro F1 | AI false positives / negatives, old → V3 |
| --- | ---: | --- | --- | --- | --- | --- |
| Development | 48 | 58.3% → 100% | .799 → 1.000 | .677 → 1.000 | .695 → 1.000 | 9 / 3 → 0 / 0 |
| Review | 28 | 64.3% → 71.4% | .756 → .921 | .788 → .788 | .759 → .804 | 2 / 1 → 0 / 1 |

Secondary and exclusion checks passed 9 of 18 → 18 of 18 on the development set, and 4 of 6 → 6 of 6 on the review set. The review set was assembled after the initial rule pass. A general image-attribution rule changed after reviewing one of its misses. Both sets are authored fixtures. Production precision and recall require an independently labeled sample of publisher coverage.

The baseline promoted four political, three economy, two ambiguous, one culture and one health fixture to primary AI. The V3 review set still missed a German acronym and some headlines with indirect local-government, scientific, cultural or sporting signals. One AI election-advertising regulation was placed under AI first and politics second.

## Taxonomy

| Label | Include | Exclude or use a secondary label |
| --- | --- | --- |
| AI | AI models, deployments, tools, policy or research where AI is central or an independently meaningful part of the report | Publisher section alone, GPU products sold for gaming, company references without an AI subject, imagery credits |
| Teknoloji | Software, devices, semiconductors, cybersecurity and infrastructure | Market moves belong primarily in economy when the technology is incidental |
| Jeopolitik | Domestic political decisions, elections, civic action, diplomacy, sanctions and international affairs | A political event at a stadium stays political. Procurement can also qualify for defense |
| Savunma | Military procurement, budgets, exercises and defense policy | A civic protest is primarily politics when the report focuses on political action |
| Ekonomi | Monetary policy, trade, markets, earnings and economic consequences | Listing a price or company alone supplies weak evidence |
| Bilim | Scientific methods, experimental results, space, fossils and basic research | Treatments and public health can be primary health when patient outcomes are the focus |
| Sağlık | Public health, treatment, medicine, hospitals and clinical studies | AI use can be a secondary subject when the treatment is the main development |
| Spor | Teams, competitions, results and championships | Venue names and references to athletic metaphors supply weak evidence |
| Kültür | Art, books, performance, film and cultural institutions | An image credit or personal name alone supplies weak evidence |
| İklim | Climate change, emissions, extreme weather and climate policy | Power generation may also qualify for energy |
| Enerji | Energy systems, production, grids and supply | A general business story requires a specific energy connection |
| Seyahat | Tourism, travel advisories and transport as a travel subject | Cybersecurity can be primary when a travel business is affected |
| Dünya | Fallback for a general or underdetermined report | More specific labels take precedence when evidence clears the threshold |

The API returns primary `category`, ordered `categories`, and a `classification` record with version, model, tags, rule signals and confidence. Confidence scores are heuristic bands. The canonical feed selects one classification per report and never joins competing categories purely because two section feeds republished the URL.
