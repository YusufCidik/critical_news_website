export type NewsCategory = "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya";

const normalize = (text: string) => text.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/ı/g, "i");
const boundary = (pattern: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${pattern})(?=$|[^\\p{L}\\p{N}])`, "u");
const rules: Array<[NewsCategory, RegExp]> = [
  ["Teknoloji", boundary("technology|tech|software|semiconductors?|chips?|cyber\\w*|data cent(?:er|re)s?|smartphones?|robots?|nvidia|jensen huang|teknoloji\\w*|siber|yazilim\\w*|cip\\w*|yapay zeka\\w*")],
  ["Savunma", boundary("defen[cs]e|military|army|navy|missiles?|weapons?|drones?|savunma\\w*|ordu\\w*|fuze\\w*|silah\\w*")],
  ["Sağlık", boundary("health|medical|medicine|hospitals?|disease|healthcare|cancer|vaccines?|saglik\\w*|hastane\\w*|tedavi\\w*|kanser\\w*|asi")],
  ["İklim", boundary("climate|emissions?|carbon|floods?|wildfires?|drought|iklim\\w*|kuraklik\\w*|sel|orman yangini")],
  ["Enerji", boundary("energy|renewables?|solar|oil prices?|natural gas|nuclear power|enerji\\w*|petrol\\w*|dogalgaz\\w*|gunes enerjisi")],
  ["Spor", boundary("sports?|football|soccer|olympic\\w*|tennis|basketball|hockey|cricket|formula 1|premier league|champions league|nations league|futbol\\w*|sampiyona\\w*|galatasaray|fenerbahce|besiktas")],
  ["Kültür", boundary("culture|arts?|films?|movies?|music|books?|cinema|museum\\w*|kulturn?\\w*|kultur\\w*|sanat\\w*|sinema\\w*|muzik\\w*")],
  ["Seyahat", boundary("travel|tourism|tourists?|airports?|airlines?|turizm\\w*|seyahat\\w*|havaalani\\w*|ucus\\w*")],
  ["Jeopolitik", boundary("war|conflict|sanctions?|diplomacy|elections?|government|minister|ceasefire|savas\\w*|catisma\\w*|yaptirim\\w*|diplomasi\\w*|secim\\w*|hukumet\\w*|ateskes\\w*")],
  ["Ekonomi", boundary("economy|economic|markets?|inflation|trade|business|banks?|finance|earnings|stocks?|ekonomi\\w*|enflasyon\\w*|piyasa\\w*|ticaret\\w*|finans\\w*|faiz\\w*|borsa\\w*")],
  ["Bilim", boundary("science|scientists?|research|study|space|astronomy|quantum|bilim\\w*|arastirma\\w*|uzay\\w*")],
];
const explicitAI = boundary("ai|artificial intelligence|generative ai|machine learning|deep learning|neural networks?|large language models?|llms?|openai|anthropic|chatgpt|deepseek|qwen|yapay zeka\\w*|makine ogren\\w*|derin ogren\\w*|buyuk dil model\\w*");
const aiCompanies = boundary("nvidia|jensen huang|sam altman|demis hassabis|dario amodei|ilya sutskever|hugging face|deepmind|mistral");
const gaming = boundary("geforce|rtx|gaming|gamers?|gameplay|oyun\\w*|oyuncu\\w*");
const aiProducts = boundary("chatbots?|copilot|google gemini|claude (?:code|opus|sonnet|haiku)|gpt[ -]?[0-9]+|diffusion models?|yapay zeka ajan\\w*");
const politicalMeeting = /kurultay|parti meclisi|siyasi parti|party congress|political convention|party conference/;

/** Publisher sections, RSS topic metadata and entity/context signals contribute
 * independently. One story can belong to AI, technology and economics at once.
 * No paid AI call or translation is needed for filtering. */
export function classifyNews(title: string, summary = "", feedCategory: NewsCategory = "Dünya", topics: string[] = []) {
  const headline = normalize(title), body = normalize(summary), metadata = normalize(topics.join(" "));
  const text = `${headline} ${body} ${metadata}`;
  const isPoliticalMeeting = politicalMeeting.test(headline);
  const ai = feedCategory === "AI" || explicitAI.test(text) || aiProducts.test(text)
    || (aiCompanies.test(text) && !gaming.test(headline));
  const scores = rules.map(([category, pattern]) => ({ category, score: (pattern.test(headline) ? 3 : 0) + (pattern.test(body) ? 1 : 0) + (pattern.test(metadata) ? 3 : 0) }));
  const categories = new Set<NewsCategory>();
  if (feedCategory !== "Dünya" && !(feedCategory === "Spor" && isPoliticalMeeting)) categories.add(feedCategory);
  for (const entry of scores) if (entry.score >= 3 && !(entry.category === "Spor" && isPoliticalMeeting)) categories.add(entry.category);
  if (isPoliticalMeeting) categories.add("Jeopolitik");
  if (ai) { categories.add("AI"); categories.add("Teknoloji"); }
  // A clear topic in the excerpt is useful for otherwise general headlines.
  if (!categories.size) {
    const best = [...scores].sort((a, b) => b.score - a.score)[0];
    if (best.score) categories.add(best.category);
  }
  if (!categories.size) categories.add("Dünya");
  const category: NewsCategory = ai ? "AI" : isPoliticalMeeting ? "Jeopolitik" : categories.has(feedCategory) ? feedCategory : [...categories][0];
  return { category, categories: [...categories] };
}

export function matchesNewsCategory(story: { category: string; categories?: string[]; original_title: string; executive_summary: string }, selected: string) {
  if (selected === "all" || story.category === selected || story.categories?.includes(selected)) return true;
  // Older IndexedDB records can be classified with the same rules as live news.
  return !story.categories && classifyNews(story.original_title, story.executive_summary, story.category === "Tech" ? "Teknoloji" : story.category === "Geopolitics" ? "Jeopolitik" : story.category as NewsCategory).categories.includes(selected as NewsCategory);
}
