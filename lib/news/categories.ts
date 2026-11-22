export type NewsCategory = "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya";

export const normalizeNewsText = (text: string) => text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/ı/g, "i");
const boundary = (pattern: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${pattern})(?=$|[^\\p{L}\\p{N}])`, "u");
const rules: Array<[NewsCategory, RegExp]> = [
  ["Teknoloji", boundary("technology|tech|software|hacks?|hacked|data breach|database(?: hack)?|outages?|screenshots?|browsers?|smart devices?|wearables?|firmware|semiconductors?|chips?|cyber[- ]?\\w*|driverless|waymo|data cent(?:er|re)s?|smartphones?|robots?|teknoloji\\w*|siber|yazilim\\w*|cip\\w*|yapay zeka\\w*")],
  ["Savunma", boundary("military spending|defen[cs]e|military|navy|airspace|autonomous weapons|killer robots|troops?|tanks?|pentagon|mayina carparak|declassified military|airstrikes?|drone strikes?|military incursion|armed forces|assassination plot|armed groups|missiles?|weapons?|drones?|savunma\\w*|ordu\\w*|fuze\\w*|silah\\w*")],
  ["Sağlık", boundary("health|medical|medicine|hospitals?|disease|healthcare|cancer|vaccines?|measles|covid|alzheimer\\w*|flu|intensive care|medicine|hospitalized|doctors?|dent(?:al|ists?)|surgery|patients?|clinical|obesity|toxi(?:c|ns?)|saglik\\w*|hastane\\w*|tedavi\\w*|kanser\\w*|asi")],
  ["İklim", boundary("climate|cop ?[0-9]+|fossil fuels?|environmental (?:cost|damage|impact)|emissions?|carbon|floods?|wildfires?|drought|iklim\\w*|kuraklik\\w*|air pollution|air quality|greenhouse gases|iklim diplomasi\\w*|sel|orman yangini")],
  ["Enerji", boundary("energy|electricity|power (?:supply|shortages?|grids?)|renewables?|geothermal|fusion power|wind farms?|energy storage|solar|offshore wind|oil prices?|natural gas|nuclear power|enerji\\w*|petrol\\w*|dogalgaz\\w*|gunes enerjisi")],
  ["Spor", boundary("sports?|rugby|all blacks|springboks|handball|premiership|mlb|world series|quarterbacks?|pitchers?|playoffs?|formula (?:one|1)|grand prix|cfb|b1g|mls|wnba|nfl|nba|coach(?:es)?|football|soccer|finals?|championships?|world cup|grand prix|formula (?:one|1)|playoffs?|national team|coach(?:es)?|rugby|mls|premiership|olympic\\w*|tennis|basketball|hockey|cricket|formula 1|premier league|champions league|nations league|futbol\\w*|sampiyona\\w*|galatasaray|fenerbahce|besiktas")],
  ["Kültür", boundary("culture|arts?|theatre|theater|television series|series review|on screen|concert|guitarist|new tracks|songwriting|stage play|plays? (?:a role|in theatres)|documentar(?:y|ies)|actress(?:es)?|actors?|oscars?|screenwriter|cinematograph\\w*|spinoffs?|sitcoms?|singers?|skits?|video games?|band (?:plays|performs)|exhibitions?|albums?|films?|movies?|music|books?|cinema|museum\\w*|kulturn?\\w*|kultur\\w*|sanat\\w*|sergi\\w*|sinema\\w*|muzik\\w*")],
  ["Seyahat", boundary("travel|tourism|tourists?|airbnb|holiday rentals?|airports?|airlines?|turizm\\w*|seyahat\\w*|havaalani\\w*|ucus\\w*")],
  ["Jeopolitik", boundary("wars?|conflicts?|sanctions?|diplomac\\w*|elections?|vot(?:e|es|ing)|how-to-vote|government|prime minister|parlamento\\w*|basbakan\\w*|muhalefet\\w*|repression|opposition|court sentences|foreign troops|minister\\w*|legislatur\\w*|mayor|council|ruling party|border crossing|delegations?|(?:diplomatic|bilateral|foreign) (?:relations|ties)|ties with|post-brexit|settler violence|occupied (?:west bank|territor\\w*)|international law|human rights|uluslararasi anlasma\\w*|milletlerarasi anlasma\\w*|ceasefire|protest(?:s|ers?)?|demonstrat(?:ions?|ors?)|rall(?:y|ies)|parliament|referendum|coalition|summit|treaty|bilateral|border talks|parlamento|protesto\\w*|savas\\w*|catisma\\w*|yaptirim\\w*|diplomasi\\w*|secim\\w*|hukumet\\w*|ateskes\\w*")],
  ["Ekonomi", boundary("economy|economic|markets?|stock market|ipo|trade agreements?|corporate earnings|quarterly sales|takeover|subsidiar\\w*|investment trends?|yatirim\\w*|inflation|trade|budget|mergers?|acquisitions?|buyout|tak(?:eover|ing over)|bids?|bidder|jobs?|funding|stake|investments?|retailers?|earnings|business|business deal|dealerships?|banks?|finance|earnings|stocks?|shares?|investors?|interest rates?|tariffs?|gdp|hisseler\\w*|hisse\\w*|halka arz|ekonomi\\w*|enflasyon\\w*|piyasa\\w*|ticaret\\w*|finans\\w*|faiz\\w*|borsa\\w*")],
  ["Bilim", boundary("science|scientists?|research|study|researchers?|experiment\\w*|astronomers?|evolution|archaeolog\\w*|telescope\\w*|supertelescope|sarcophagus|fossil record|migration to|cosmic|galax\\w*|space|astronomy|quantum|telescope|fossils?|orbit|lab experiment|bilim\\w*|arastirma\\w*|uzay\\w*")],
];
const aiSubject = boundary("ai|artificial intelligence|machine learning|deep learning|neural networks?|large language models?|multimodal foundation models?|foundational ai models?|ai agents?|llms?|ki[- ](?:modell|system|werkzeug)\\w*|chatgpt|chatbots?|github copilot|google gemini|claude (?:code|opus|sonnet|haiku)|gpt[ -]?[0-9]+|diffusion models?|yapay zeka\\w*|makine ogren\\w*|derin ogren\\w*|buyuk dil model\\w*|kunstliche intelligenz|intelligence artificielle|inteligencia artificial");
const aiOrganization = boundary("openai|anthropic|deepseek|qwen|nvidia|deepmind|hugging face|mistral|jensen huang");
const aiProductAction = boundary("reasoning|(?:new|releases?|launches?|training|train|trains) (?:a |its )?(?:reasoning |language |foundation )?models?|inference|model weights|accelerators?|model benchmarks?");
const incidentalAI = boundary("written (?:with|by)|generated (?:with|by)|translated (?:with|by)|made (?:with|by)|took a back seat|unrelated|powered by|us(?:e|es|ed|ing) ai to (?:write|translate)|ai(?:[- ]generated)? (?:image|illustration|photo)|about the author");
const politicalMeeting = /kurultay|parti meclisi|siyasi parti|party congress|political convention|party conference/;
const civicAction = boundary("protest(?:s|ers?)?|demonstrations?|march(?:es)?|rall(?:y|ies)|referendum|protesto\\w*|miting\\w*|kurultay");
const sportOutcome = boundary("wins?|won|lost|loss|defeats?|beats?|knocks? out|clinches?|scores?|mauling|trophy|titles?|injur\\w*|match|roundup|coach");
const civicOutcome = boundary("minister\\w* (?:resigns?|resigned)|parliament (?:passes|adopts|rejects)|election (?:campaign|results?)|how-to-vote|(?:diplomatic|bilateral) (?:relations|ties)|occupied (?:west bank|territor\\w*)|settler violence|(?:president|prime minister) (?:resigns?|resigned)");
const focusRules: Partial<Record<NewsCategory, RegExp>> = {
  "Teknoloji": boundary("cyberattacks?|security patch|software flaw|semiconductor fabrication|(?:database|agency) (?:hack|breach)|hacked|breached by hackers|tech outages?|screenshots?|device"),
  "Sağlık": boundary("cancer|measles|covid|alzheimer\\w*|flu shots?|hospitalized|vaccines?|clinical trials?|dental|di[sş]\\w* muayene\\w*|hospitals?|outbreaks?|treatments?|patients?|surgery|doctors?|di[sş] (?:muayene|ipi)|weight[- ]loss|kanser|hasta\\w*"),
  "Savunma": boundary("(?:military|defen[cs]e) spending|defen[cs]e budget|arms procurement|missile tests?|naval drills|autonomous weapons|killer robots|airspace violation|armed incursion|drone strikes?|(?:iranian|russian|israeli|ukrainian) (?:attack|strike|tanks?)|foreign troops|mayina carparak|airstrikes?|combat troops|assassination plot|savunma butcesi"),
  "Ekonomi": boundary("interest rates?|central banks?|inflation|tariffs?|trade (?:deal|agreement)|ipo|halka arz|investment trends?|yatirim egilimi|gdp|budgets?|earnings|investors?|shares?|stocks?|(?:buys?|acquires?|acquisition)\\b|buyouts?|bidder|job cuts?|funding squeeze|hisseler\\w*|hisse\\w*|halka arz|enflasyon|merkez bankasi"),
  "Bilim": boundary("telescopes?|fossils?|astronomy|spacecraft|quantum|lab experiments?|archaeolog\\w*|supertelescope|ancient (?:site|temple|tomb)|evolution|astronomers?|sarcophagus|giant star|space telescope|teleskop\\w*|fosil\\w*"),
  "Spor": boundary("finals?|championships?|world cup|olympic\\w*|wins? the league|sampiyona\\w*"),
  "Kültür": boundary("exhibitions?|(?:film |music )?festivals?|museums?|albums?|oscars?|television series|series review|theatre|theater|spinoffs?|sitcoms?|documentar(?:y|ies)|singers?|skits?|sergi\\w*"),
  "İklim": boundary("emissions?|climate (?:change|deal|talks)|cop ?[0-9]+|fossil fuels?|environmental (?:cost|impact)|heatwaves?|wildfires?|iklim degisikligi"),
  "Enerji": boundary("power plants?|power grids?|geothermal|fusion power|wind farms?|energy storage|electricity supply|power shortages?|energy costs?|wind farms?|nuclear power|natural gas|gunes enerjisi"),
  "Seyahat": boundary("travel restrictions?|tourism|travel guide|turizm\\w*"),
};

type Evidence = "headline" | "lead" | "publisher-section" | "publisher-topic" | "specific-subject";
export interface Classification {
  version: "context-3.0.0" | "context-3.1.0";
  model: "contextual-rules";
  confidence: "low" | "medium" | "high";
  confidence_score: number;
  tags: string[];
  explanation: { category: NewsCategory; evidence: Evidence[] }[];
}

export function classifyNews(title: string, summary = "", feedCategory: NewsCategory = "Dünya", topics: string[] = []) {
  const headline = normalizeNewsText(title);
  const topicalHeadline = headline.replace(/\bfossil fuels?\b/g, "energy").replace(/\b(?:culture war|win-win|time and space)\b/g, "");
  const lead = normalizeNewsText(summary).slice(0, 800);
  const metadata = normalizeNewsText(topics.join(" ")).slice(0, 800);
  const political = politicalMeeting.test(headline);
  const civic = civicAction.test(headline);
  const scores = rules.flatMap(([category, pattern]) => {
    if (category === "Spor" && political) return [];
    const evidence: Evidence[] = [];
    if (pattern.test(topicalHeadline)) evidence.push("headline");
    if (pattern.test(lead)) evidence.push("lead");
    if (pattern.test(metadata)) evidence.push("publisher-topic");
    if (category === feedCategory) evidence.push("publisher-section");
    if (focusRules[category]?.test(headline) || (category === "Jeopolitik" && (civic || political || civicOutcome.test(headline)))) evidence.push("specific-subject");
    const focusedLead = focusRules[category]?.test(lead.slice(0, 240)) ?? false;
    if (focusedLead && !evidence.includes("headline") && !evidence.includes("specific-subject") && evidence.includes("lead")) {
      evidence.push("specific-subject");
    }
    const sportsContext = category === "Spor" && feedCategory === "Spor" && sportOutcome.test(headline);
    if (sportsContext && !evidence.includes("specific-subject")) evidence.push("specific-subject");
    const weights = { headline: 5, lead: 2, "publisher-topic": 1, "publisher-section": 1, "specific-subject": category === "Jeopolitik" && (civic || political || civicOutcome.test(headline)) ? 6 : 3 };
    return [{ category, evidence, score: evidence.reduce((score, signal) => score + weights[signal], 0) }];
  });

  // An editorial section or company name supplies context, but AI needs evidence in the story.
  const cleanHeadline = headline.replace(/\s*[-–—|:]\s*(?:an? )?ai[- ]generated (?:image|illustration|photo).*$/u, "");
  const contextualClaude = aiOrganization.test(cleanHeadline) && boundary("claude|chatbot").test(cleanHeadline);
  const contextualTitle = cleanHeadline.replace(/\bai researcher(?:'|’)?s\b/g, "");
  const headlineAI = (aiSubject.test(contextualTitle) && !incidentalAI.test(contextualTitle))
    || contextualClaude || (aiOrganization.test(cleanHeadline) && aiProductAction.test(cleanHeadline));
  const firstSentence = lead.split(/(?<=[.!?])\s+/u, 1)[0];
  const meaningfulLead = !incidentalAI.test(firstSentence) && (aiSubject.test(firstSentence) || aiOrganization.test(firstSentence))
    && (aiProductAction.test(firstSentence) || (boundary("uses?|using|deploy\\w*|regulat\\w*|detect\\w*|predict\\w*|develop\\w*|adopt\\w*|train\\w*|launch\\w*|model\\w*|systems?|tools?").test(firstSentence) && aiSubject.test(firstSentence)));
  if (headlineAI || meaningfulLead) {
    const evidence: Evidence[] = headlineAI ? ["headline", "specific-subject"] : ["lead", "specific-subject"];
    if (feedCategory === "AI") evidence.push("publisher-section");
    if (aiSubject.test(metadata)) evidence.push("publisher-topic");
    const centralAction = boundary("deploys? (?:an? )?ai|launches? (?:an? )?ai|regulat\\w* (?:new )?ai|trains? (?:an? )?ai").test(cleanHeadline);
    const secondaryContext = civicOutcome.test(cleanHeadline) || boundary("parliament\\w*|parlament\\w*").test(cleanHeadline) || boundary("in the age of ai|ai agent style|ai surveillance|supertelescope|archaeolog\\w*").test(cleanHeadline);
    scores.push({ category: "AI", score: (headlineAI ? (centralAction ? 11 : secondaryContext ? 6 : 9) : 4) + Number(feedCategory === "AI") + Number(aiSubject.test(metadata)), evidence });
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const selected = scores.filter(({ score }) => score >= 4 && score >= best.score - 5).slice(0, 3);
  if (!selected.length && best.evidence.includes("lead") && best.evidence.includes("publisher-section")) selected.push(best);
  const category = selected[0]?.category ?? "Dünya";
  const categories = selected.length ? selected.map((entry) => entry.category) : [category];
  if (categories.includes("AI") && !categories.includes("Teknoloji") && categories.length < 3) {
    categories.push("Teknoloji");
    selected.push({ category: "Teknoloji", score: 0, evidence: ["specific-subject"] });
  }
  const margin = best.score - (scores[1]?.score ?? 0);
  const confidence_score = !selected.length ? 0.25 : best.score >= 8 && margin >= 2 ? 0.9 : best.score >= 5 ? 0.7 : best.score >= 2 ? 0.5 : 0.25;
  const classification: Classification = {
    version: "context-3.1.0", model: "contextual-rules", confidence_score,
    confidence: confidence_score >= 0.9 ? "high" : confidence_score >= 0.7 ? "medium" : "low",
    tags: [...new Set([...topics.map((tag) => tag.trim()).filter((tag) => tag.length >= 2 && tag.length <= 70), ...categories.filter((value) => value !== "Dünya")])].slice(0, 10),
    explanation: selected.map(({ category, evidence }) => ({ category, evidence })),
  };
  return { category, categories, classification };
}

export function matchesNewsCategory(story: { category: string; categories?: string[]; classification?: Classification; original_title: string; executive_summary: string }, selected: string) {
  if (selected === "all") return true;
  if (story.classification) return story.category === selected || !!story.categories?.includes(selected as NewsCategory);
  const legacyHint = story.category === "Tech" ? "Teknoloji" : story.category === "Geopolitics" ? "Jeopolitik" : story.category as NewsCategory;
  return classifyNews(story.original_title, story.executive_summary, legacyHint).categories.includes(selected as NewsCategory);
}
