export type NewsCategory = "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya";

export const normalizeNewsText = (text: string) => text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/ı/g, "i");
const boundary = (pattern: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${pattern})(?=$|[^\\p{L}\\p{N}])`, "u");
const rules: Array<[NewsCategory, RegExp]> = [
  ["Teknoloji", boundary("technology|tech|software|semiconductors?|chips?|cyber\\w*|data cent(?:er|re)s?|smartphones?|robots?|nvidia|jensen huang|teknoloji\\w*|siber|yazilim\\w*|cip\\w*|yapay zeka\\w*")],
  ["Savunma", boundary("military spending|defen[cs]e|military|army|navy|missiles?|weapons?|drones?|savunma\\w*|ordu\\w*|fuze\\w*|silah\\w*")],
  ["Sağlık", boundary("health|medical|medicine|hospitals?|disease|healthcare|cancer|vaccines?|saglik\\w*|hastane\\w*|tedavi\\w*|kanser\\w*|asi")],
  ["İklim", boundary("climate|emissions?|carbon|floods?|wildfires?|drought|iklim\\w*|kuraklik\\w*|sel|orman yangini")],
  ["Enerji", boundary("energy|renewables?|solar|oil prices?|natural gas|nuclear power|enerji\\w*|petrol\\w*|dogalgaz\\w*|gunes enerjisi")],
  ["Spor", boundary("sports?|football|soccer|finals?|championships?|world cup|olympic\\w*|tennis|basketball|hockey|cricket|formula 1|premier league|champions league|nations league|futbol\\w*|sampiyona\\w*|galatasaray|fenerbahce|besiktas")],
  ["Kültür", boundary("culture|arts?|exhibitions?|albums?|films?|movies?|music|books?|cinema|museum\\w*|kulturn?\\w*|kultur\\w*|sanat\\w*|sergi\\w*|sinema\\w*|muzik\\w*")],
  ["Seyahat", boundary("travel|tourism|tourists?|airports?|airlines?|turizm\\w*|seyahat\\w*|havaalani\\w*|ucus\\w*")],
  ["Jeopolitik", boundary("wars?|conflicts?|sanctions?|diplomac\\w*|elections?|government|minister|ceasefire|protest(?:s|ers?)?|demonstrat(?:ions?|ors?)|rall(?:y|ies)|parliament|referendum|coalition|summit|treaty|bilateral|border talks|parlamento|protesto\\w*|savas\\w*|catisma\\w*|yaptirim\\w*|diplomasi\\w*|secim\\w*|hukumet\\w*|ateskes\\w*")],
  ["Ekonomi", boundary("economy|economic|markets?|inflation|trade|business|banks?|finance|earnings|stocks?|shares?|investors?|interest rates?|tariffs?|gdp|hisseler?i?|ekonomi\\w*|enflasyon\\w*|piyasa\\w*|ticaret\\w*|finans\\w*|faiz\\w*|borsa\\w*")],
  ["Bilim", boundary("science|scientists?|research|study|space|astronomy|quantum|telescope|fossils?|orbit|lab experiment|bilim\\w*|arastirma\\w*|uzay\\w*")],
];
const aiSubject = boundary("ai|artificial intelligence|machine learning|deep learning|neural networks?|large language models?|llms?|chatgpt|chatbots?|github copilot|google gemini|claude (?:code|opus|sonnet|haiku)|gpt[ -]?[0-9]+|diffusion models?|yapay zeka\\w*|makine ogren\\w*|derin ogren\\w*|buyuk dil model\\w*|kunstliche intelligenz|intelligence artificielle|inteligencia artificial");
const aiOrganization = boundary("openai|anthropic|deepseek|qwen|nvidia|deepmind|hugging face|mistral|jensen huang");
const aiProductAction = boundary("reasoning|(?:new|releases?|launches?|training|train|trains) (?:a |its )?(?:reasoning |language |foundation )?models?|inference|model weights|accelerators?|model benchmarks?");
const incidentalAI = boundary("written (?:with|by)|generated (?:with|by)|translated (?:with|by)|made (?:with|by)|took a back seat|unrelated|unlike|powered by|us(?:e|es|ed|ing) ai to (?:write|translate)|ai(?:[- ]generated)? (?:image|illustration|photo)|about the author");
const politicalMeeting = /kurultay|parti meclisi|siyasi parti|party congress|political convention|party conference/;
const civicAction = boundary("protest(?:s|ers?)?|demonstrations?|march(?:es)?|rall(?:y|ies)|referendum|protesto\\w*|miting\\w*|kurultay");
const focusRules: Partial<Record<NewsCategory, RegExp>> = {
  "Teknoloji": boundary("cyberattacks?|security patch|software flaw|semiconductor fabrication"),
  "Sağlık": boundary("cancer|vaccines?|clinical trials?|hospitals?|outbreaks?|treatments?|patients?|kanser|hasta\\w*"),
  "Savunma": boundary("(?:military|defen[cs]e) spending|defen[cs]e budget|arms procurement|missile tests?|naval drills|savunma butcesi"),
  "Ekonomi": boundary("interest rates?|central banks?|inflation|tariffs?|gdp|earnings|investors?|shares?|stocks?|hisseler?i?|enflasyon|merkez bankasi"),
  "Bilim": boundary("telescopes?|fossils?|astronomy|spacecraft|quantum|lab experiments?|teleskop\\w*|fosil\\w*"),
  "Spor": boundary("finals?|championships?|world cup|olympic\\w*|wins? the league|sampiyona\\w*"),
  "Kültür": boundary("exhibitions?|film festivals?|museums?|albums?|sergi\\w*"),
  "İklim": boundary("emissions?|climate change|heatwaves?|wildfires?|iklim degisikligi"),
  "Enerji": boundary("power plants?|power grids?|wind farms?|nuclear power|natural gas|gunes enerjisi"),
  "Seyahat": boundary("travel restrictions?|tourism|travel guide|turizm\\w*"),
};

type Evidence = "headline" | "lead" | "publisher-section" | "publisher-topic" | "specific-subject";
export interface Classification {
  version: "context-3.0.0";
  model: "contextual-rules";
  confidence: "low" | "medium" | "high";
  confidence_score: number;
  tags: string[];
  explanation: { category: NewsCategory; evidence: Evidence[] }[];
}

export function classifyNews(title: string, summary = "", feedCategory: NewsCategory = "Dünya", topics: string[] = []) {
  const headline = normalizeNewsText(title);
  const lead = normalizeNewsText(summary).slice(0, 800);
  const metadata = normalizeNewsText(topics.join(" ")).slice(0, 800);
  const political = politicalMeeting.test(headline);
  const civic = civicAction.test(headline);
  const scores = rules.flatMap(([category, pattern]) => {
    if (category === "Spor" && political) return [];
    const evidence: Evidence[] = [];
    if (pattern.test(headline)) evidence.push("headline");
    if (pattern.test(lead)) evidence.push("lead");
    if (pattern.test(metadata)) evidence.push("publisher-topic");
    if (category === feedCategory) evidence.push("publisher-section");
    if (focusRules[category]?.test(headline) || (category === "Jeopolitik" && (civic || political))) evidence.push("specific-subject");
    const weights = { headline: 5, lead: 2, "publisher-topic": 1, "publisher-section": 1, "specific-subject": category === "Jeopolitik" && (civic || political) ? 6 : 3 };
    return [{ category, evidence, score: evidence.reduce((score, signal) => score + weights[signal], 0) }];
  });

  // An editorial section or company name supplies context, but AI needs evidence in the story.
  const cleanHeadline = headline.replace(/\s*[-–—|:]\s*(?:an? )?ai[- ]generated (?:image|illustration|photo).*$/u, "");
  const headlineAI = (aiSubject.test(cleanHeadline) && !incidentalAI.test(cleanHeadline))
    || (aiOrganization.test(cleanHeadline) && aiProductAction.test(cleanHeadline));
  const firstSentence = lead.split(/(?<=[.!?])\s+/u, 1)[0];
  const meaningfulLead = !incidentalAI.test(firstSentence) && (aiSubject.test(firstSentence) || aiOrganization.test(firstSentence))
    && (aiProductAction.test(firstSentence) || (boundary("uses?|using|deploy\\w*|regulat\\w*|detect\\w*|predict\\w*|develop\\w*|adopt\\w*|train\\w*|launch\\w*|model\\w*|systems?|tools?").test(firstSentence) && aiSubject.test(firstSentence)));
  if (headlineAI || meaningfulLead) {
    const evidence: Evidence[] = headlineAI ? ["headline", "specific-subject"] : ["lead", "specific-subject"];
    if (feedCategory === "AI") evidence.push("publisher-section");
    if (aiSubject.test(metadata)) evidence.push("publisher-topic");
    const centralAction = boundary("deploys? (?:an? )?ai|launches? (?:an? )?ai|regulat\\w* (?:new )?ai|trains? (?:an? )?ai").test(cleanHeadline);
    scores.push({ category: "AI", score: (headlineAI ? (centralAction ? 11 : 9) : 4) + Number(feedCategory === "AI") + Number(aiSubject.test(metadata)), evidence });
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const selected = scores.filter(({ score }) => score >= 4 && score >= best.score - 5).slice(0, 3);
  if (!selected.length && best.evidence.includes("lead")) selected.push(best);
  const category = selected[0]?.category ?? "Dünya";
  const categories = selected.length ? selected.map((entry) => entry.category) : [category];
  if (categories.includes("AI") && !categories.includes("Teknoloji") && categories.length < 3) {
    categories.push("Teknoloji");
    selected.push({ category: "Teknoloji", score: 0, evidence: ["specific-subject"] });
  }
  const margin = best.score - (scores[1]?.score ?? 0);
  const confidence_score = !selected.length ? 0.25 : best.score >= 8 && margin >= 2 ? 0.9 : best.score >= 5 ? 0.7 : best.score >= 2 ? 0.5 : 0.25;
  const classification: Classification = {
    version: "context-3.0.0", model: "contextual-rules", confidence_score,
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
