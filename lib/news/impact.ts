import { normalizeNewsText, type NewsCategory } from "./categories";
import { newsSentences } from "./text";

const amount = String.raw`(?:[1-9]\d{2,}|[1-9]\d{0,2}(?:[.,]\d{3})+|\d+(?:[.,]\d+)? (?:thousand|million|billion|bin|milyon|milyar)|thousands|millions|milyonlarca|binlerce)`;
const affected = String.raw`(?:people|residents|households|patients|customers|workers|users|kisi|hane|hasta)\b`;
const population = new RegExp(String.raw`\b(?:${amount} (?:of )?${affected} (?:were |are |have been )?(?:killed|displaced|evacuated|affected|without (?:power|water)|lost (?:power|jobs)|etkilendi|yerinden edildi|tahliye edildi)|(?:evacuat\w*|displac\w*|affect\w*|covers?|covering|left|leaves?) (?:of |more than |at least |around |over )?${amount} (?:of )?${affected})\b`, "u");

const dimensions = [
  ["population", population, 3],
  ["reach", /\b(?:nationwide|countrywide|across (?:the country|the continent|\d+ countries|multiple countries|three countries|four countries|five countries|europe|the united states|the european union)|in \d+ countries|ulke genelinde|dunya genelinde|birden fazla ulkede|a l echelle nationale|en todo el pais|landesweit)\b/u, 2],
  ["economic", /\b(?:\d[\d.,]* (?:million|billion|trillion|milyon|milyar) (?:dollars? in (?:losses|damages|relief)|(?:in )?(?:losses|damages)|dolar(?:lik)? (?:zarar|kayip))|(?:raises?|cuts?|raised|cut|holds?|keeps?|kept) (?:its )?(?:benchmark |policy )?interest rates?|(?:rate|rates) (?:by |at )\d+(?:\.\d+)? (?:basis points|percent|per cent)|(?:\d[\d,.]*|hundreds? of|thousands? of) jobs (?:lost|cut|eliminated)|(?:cuts?|eliminates?) (?:\d[\d,.]*|hundreds? of|thousands? of) jobs|bankruptcy filing|borcunu odeyemedi|faizini (?:artirdi|indirdi))\b/u, 2],
  ["institutional", /\b(?:parliament|congress|senate|council) (?:passes|approves|adopts|votes to approve|passed|approved|adopted)\b|\b(?:supreme court|constitutional court|high court|court|judge) (?:strikes down|overturns|blocks|upholds|struck down|overturned|blocked|upheld)\b|\b(?:(?:declares?|declared) (?:a )?(?:state of emergency|emergency)|sign(?:s|ed) (?:\w+ ){0,3}into law|referendum (?:passes|approved)|treaty enters into force|signs? (?:a |the )?(?:trade deal|trade agreement|peace treaty)|los(?:es|t) (?:its )?measles elimination status|sanctions? (?:take|took) effect|ceasefire (?:starts?|begins?|takes effect|entered into force)|ohal ilan|yasa (?:kabul edildi|yururluge girdi)|yururluge girdi)\b/u, 2],
  ["scientific", /\b(?:phase (?:3|iii) (?:clinical )?trial|peer[- ]reviewed (?:study|trial|results)|independent(?:ly)? (?:replication|replicated)|approved (?:a |the )?(?:vaccine|treatment)|vaccine (?:receives|received) approval|hakemli (?:dergi|calisma)|faz ?[3ıi]+ (?:klinik )?(?:calisma|deneme))\b/u, 2],
  ["duration", /\b(?:for (?:at least )?(?:\d+|several|many) years|permanent(?:ly)?|indefinitely|long[- ]term closure|\d+ yil boyunca|kalici olarak)\b/u, 1],
  ["magnitude", /\b(?:magnitude [67-9](?:\.\d+)?|[67-9](?:\.\d+)?[- ]magnitude|category [45] (?:storm|hurricane)|(?:(?:at least )?(?:\d[\d,.]*|eleven|twelve|twenty|dozens?))(?: people)? (?:were )?(?:deaths|fatalities|dead|killed|can kaybi)|(?:kills?|killed|left) (?:at least )?\d{1,6} (?:people|passengers|workers|residents|dead)|mass evacuations?|major infrastructure failure|[67-9](?:[.,]\d+)? buyuklugunde(?:ki)? deprem\w*)\b/u, 2],
  ["reversibility", /\b(?:irreversible(?: damage| loss)?|extinct(?:ion)?|permanent loss|geri donulemez)\b/u, 1],
] as const;

const categoryMilestones: Partial<Record<NewsCategory, RegExp>> = {
  Spor: /\b(?:world cup|olympics?|championship finals?|champions league final|grand slam|dunya kupasi|olimpiyat|sampiyona finali)\b/u,
  AI: /\b(?:model weights|independent benchmark|reasoning model|foundation model|deployment|open[- ]weight|model agirliklari)\b/u,
  Teknoloji: /\b(?:zero[- ]day|security patch|data breach|critical vulnerability|chip fabrication)\b/u,
  Jeopolitik: /\b(?:elections?|referendum|ceasefire|peace treaty|coalition agreement|secim|ateskes)\b/u,
  Ekonomi: /\b(?:central bank|interest rates?|inflation report|tariffs?|gross domestic product|merkez bankasi|enflasyon verileri)\b/u,
  Bilim: /\b(?:telescope|spacecraft|peer[- ]reviewed|new species|independently replicated)\b/u,
  Sağlık: /\b(?:clinical trials?|vaccine approval|outbreak|treatment approval|asi onayi|salgin|klinik calisma)\b/u,
  Kültür: /\b(?:film festival|academy awards|biennale|world premiere|film festivali)\b/u,
  İklim: /\b(?:emissions target|heat record|wildfires?|climate agreement)\b/u,
  Savunma: /\b(?:defen[cs]e budget|military spending|arms treaty|military procurement)\b/u,
  Enerji: /\b(?:power grid|nuclear power plant|energy shortage|wind farm)\b/u,
  Seyahat: /\b(?:travel restrictions?|airport closure|visa waiver|ucus yasagi)\b/u,
};
const uncertainty = /\b(?:could|might|if approved|plans? to|propos\w*|unconfirmed|unverified|alleg(?:ed|edly)|forecasts?|reportedly|expected to|considering|seeks? to|would|iddia\w*|olabilir|bekleniyor|planliyor|ongoruluyor)\b|\bmay (?:be|have|affect|cause|lead|lose|result|kill|displace)\b/u;
const negation = /\b(?:no|not|without any|ruled out|denied|denies|degil|yalanladi|gerceklesmedi)\b/u;
const commentary = /\b(?:opinion|editorial|podcast|op[- ]ed|quiz|rumou?rs?|what if|explainer|letter to the editor)\b/u;
const imminent = /\b(?:(?:evacuation|flood|tsunami|wildfire|storm) warnings?|(?:evacuation|curfew|travel ban) orders?|propos\w* (?:tariffs?|sanctions?|tax increases?|strike action|layoffs?)|strike could (?:shut|disrupt)|(?:climate|trade) (?:deal|talks?) (?:stall\w*|threaten\w*|deadlock\w*)|strike (?:plans?|planned|set)|(?:walkout|strike) planned|(?:in talks|bid|bids) to (?:rescue|buy|acquire|sell)|(?:launches?|opens?|targets?) (?:an? )?(?:antitrust|regulatory|data breach|cybersecurity) (?:probe|investigation)|(?:reported|apparent|suspected) (?:cyberattack|database hack|data breach)|talks? (?:resume|break down) (?:on|over) (?:a )?(?:ceasefire|peace)|(?:oecd|imf) (?:cuts?|raises?|forecasts?)|(?:tahliye|tsunami|sel) uyarisi)\b/u;
const routine: Partial<Record<NewsCategory, RegExp>> = {
  Spor: /\b(?:beat|beats|thrash\w*|defeats?|edges?|stuns?|dispatch\w*|draws? with|clinches?|wins?|won|lost|qualified|qualifies|reaches? (?:the )?final|earns? (?:a |the )?win|knocks? out|final ends|scores?|lifted the trophy|\d+[-–]\d+|maglup etti|galip geldi|kupayi kazandi)\b/u,
  Kültür: /\b(?:(?:exhibition|film|museum|gallery|festival|album|play) (?:opens?|premieres?|debuts?|launches?|returns?)|(?:releases?|released|premieres?|opens?|debuts?) (?:a |an |his |her |their |the )?(?:new )?(?:book|album|single|film|trailer|exhibition|museum|gallery)|(?:sergi|festival) acildi)\b/u,
  Teknoloji: /\b(?:(?:software|browser|app|ios|android|windows|firmware) (?:update|patch|release)|restricts? (?:mobile )?screenshots?|adds? (?:new )?privacy features?|(?:launches?|unveils?|releases?) (?:a |its )?(?:new )?(?:phone|smartphone|laptop|tablet|feature|app|headphones?|camera)|yeni (?:telefon|uygulama) tanitildi)\b/u,
  AI: /\b(?:(?:releases?|launches?|unveils?) (?:a |an |its )?(?:new )?(?:reasoning |language |foundation |open[- ]weight )?models?|(?:chatgpt|gemini|claude) (?:adds?|introduces?|rolls out) (?:a |new )?(?:new )?(?:features?|modes?|tools?)|modelini (?:tanitti|yayimladi))\b/u,
  Bilim: /\b(?:researchers? (?:identify|discover|describe|document|found)|scientists? (?:identify|discover|describe|document|found)|(?:telescope|james webb|spacecraft) (?:captures?|maps?|spots?|images?|reveals?)|astronomers? (?:observed|witnessed|found)|researchers? (?:tracked|measured|observed)|new species (?:of|discovered)|yeni (?:bir )?tur (?:kesfedildi|bulundu))\b/u,
  Ekonomi: /\b(?:quarterly (?:results|earnings)|(?:buys?|acquires?) (?:a |the |its )?[a-z][a-z-]+ (?:for|in)|completes? (?:an? |the )?(?:acquisition|merger|buyout))\b/u,
  Seyahat: /\b(?:airlines? (?:adds?|launches?|resumes?) (?:a |new )?(?:routes?|flights?|service)|(?:airport|railway) (?:reopens?|resumes? service)|yeni ucus hatti acildi)\b/u,
};
const publicMeasure = /\b(?:(?:government|regulator|agency|court|council|parliament|commission|bakanlik|mahkeme|belediye) (?:announc\w*|mandat\w*|ordered?|blocks?|imposes?|moves? to|investigat\w*|rules?|fines?|bans?|approved?|dismiss\w*|reopens?|inceleme baslatti|ceza verdi|karar verdi)|(?:inquiry|investigation|recall|lawsuit|sanctions?|curfew|shutdown|alert) (?:opened|announced|issued|imposed|launched|filed)|(?:fined|sued|indicted|charged with|investigated over) (?:[a-z0-9$]|fraud))\b/u;
const boundedResult = /\b(?:(?:score|result|qualif\w*|trophy|podyum|berabere|sampiyon\w*)\b.{0,65}\b(?:won|win|lost|finished|secured|kazandi|kaldi)|(?:won|wins?|loses?|lost|qualified|finishes?|clinched|kazandi|yenildi|berabere kaldi)\b.{0,65}\b(?:match|game|points|trophy|medal|race|final|league|championship|cup|playoffs?|puan|kupasi|mac|yaris\w*|sampiyon\w*)|(?:first|new|latest) (?:album|novel|film|exhibition|movie|single|game update)\b.{0,35}\b(?:released|premiered|opens?|unveiled|arrived|published)|(?:researchers?|astronomers?|scientists?) (?:report\w*|found|discovered|identified|demonstrated|measured)\b.{0,80}\b(?:stars?|species|particles?|molecules?|cells?|fossils?|planet|galax\w*|experiment\w*|trial|protein)|(?:arrested|charged|convicted|sentenced)\b.{0,55}\b(?:fraud|burglary|corruption|theft|after a (?:robbery|crash))|(?:unveils?|launches?|releases?|heralds?)\b.{0,45}\b(?:app\b|software|smartphone|camera|tablet|browser|headphones?|chip\b|new features?))\b/u;
const specificConsumerScope = /\b(?:visitors?|commuters?|customers?|subscribers?|flights?|players?|businesses?|users?|tourists?|students?|residents?|workers?|members?|patients?|supporters?)\b/u;
const consumerChange = /\b(?:fees?|fares?|service|tickets?|subscriptions?|lines?|routes?|hours|prices|rules|visas?|admissions?|limits?|parking)\b.{0,42}\b(?:changed?|increas\w*|reduc\w*|discontinu\w*|will|begin\w*|introduc\w*|resum\w*|cut|rise|effective|raised)|\b(?:introduc\w*|raises?|cuts?|increas\w*|ends?|launches?)\b.{0,42}\b(?:fees?|fares?|subscriptions?|routes?|prices|rules|visas?|admissions?|limits?)\b/u;
const namedDevelopment = /\b(?:recall(?:ed|s)?|suspend(?:ed|s)?|shut(?:s)? down|cancel(?:led|s)?|halt(?:ed|s)?|resum(?:ed|es)|restor(?:ed|es)|evacuat\w*|displac\w*|delay(?:ed|s)?|acqui(?:red|res)|offered|resign(?:ed|s)|dismiss(?:ed|es)|block(?:ed|s)?|restrict(?:ed|s)?|approve(?:d|s)?|unveil(?:ed|s)?|pilot(?:s|ed)|publish(?:ed|es)|test(?:ed|s)?|fired|cuts?|offers?|converted|warn(?:ed|s)?|claimed|seized|return(?:ed|s)?|tahliye edildi|iptal edildi|onayladi|onay aldi|istifa etti|yatirim aldi|yayimlandi|gosterime girdi|gosterime giriyor|gozaltina alindi)\b/u;
const concreteStake = /\b(?:jobs?|workers?|flights?|safety|patients?|appointments?|medicine|treatment|healthcare|vaccine|trial|hospital|outage|public transport|shipping|service|exports?|imports?|subsidies|tax(?:es)?|funding|(?:court )?injunction|polic(?:y|ies)|regulations?|rights|security|evacuation|resignation|data|browser|cinema|museum|customers?|residents?|injuries|strike|product|software|supply|demand|facilit(?:y|ies)|faiz|tedavi|ilac|saglik|ulasim|ucus|tahliye|enerji|yatirim|filmler?|teknoloji|gosterim\w*|arsiv|arastirma)\b/u;
const localOutcome = /\b(?:local (?:council|museum|library|school) (?:opens?|reopens?|closes?|voted|approved)|(?:one|two|three|four|five|[1-9]) (?:people |residents )?(?:were |was )?injured|(?:arrested|detained) (?:after|on suspicion)|(?:city|municipal) council (?:approved|banned)|(?:court|judge) grants (?:an? )?injunction|(?:restored|reopened) (?:a |the )?(?:local |city )?(?:road|bridge|library))\b/u;
const localConfirmed = /\b(?:reports?|reported) no (?:injuries|fatalities)|\bno (?:injuries|fatalities) (?:were )?reported\b/u;
const broadConflict = /\b(?:cross[- ]border|border crossing|international inspectors|capitals? (?:of|across)|millions? of|nationwide|sanctions?|mass layoffs?|global outage)\b/u;

type ImpactDimension = typeof dimensions[number][0] | "bounded" | "developing";
export interface ImpactAssessment {
  version: "evidence-3.0.0" | "evidence-3.1.0";
  status?: "supported" | "provisional" | "insufficient";
  global: number | null;
  category: number | null;
  byCategory: Partial<Record<NewsCategory, number>>;
  confidence: "limited" | "moderate";
  reasons: { dimension: ImpactDimension; evidence: string; provisional: boolean }[];
  milestone: string | null;
}

export function assessImpact(title: string, excerpt: string, category: NewsCategory, categories = [category]): ImpactAssessment {
  const passages = [title.trim(), ...newsSentences(excerpt, 7)].filter(Boolean);
  const normalized = passages.map(normalizeNewsText);
  const selections = dimensions.flatMap(([dimension, pattern]) => {
    const candidates = normalized.flatMap((text, i) => {
      if (!pattern.test(text) || negation.test(text)) return [];
      return [{ dimension, evidence: passages[i], provisional: uncertainty.test(text) }];
    });
    const strongest = candidates.find(({ provisional }) => !provisional) ?? candidates[0];
    return strongest ? [strongest] : [];
  });
  const direct = selections.filter((reason) => !reason.provisional);
  const weighted = dimensions.reduce((sum, [dimension, , weight]) => {
    const signal = selections.find((reason) => reason.dimension === dimension);
    return sum + (!signal || (signal.provisional && direct.length) ? 0 : weight * (signal.provisional ? 0.5 : 1));
  }, 0);
  const hasExcerpt = normalized.slice(1).some((text) => text !== normalized[0] && text.length >= 40);
  const bounded = normalized.findIndex((text, i) => (i === 0 || hasExcerpt)
    && ((localOutcome.test(text) || boundedResult.test(text) || routine[category]?.test(text)) && !negation.test(text) || localConfirmed.test(text))
    && !uncertainty.test(text));
  const developing = normalized.findIndex((text) => (imminent.test(text) || publicMeasure.test(text)
    || (hasExcerpt && ((consumerChange.test(text) && specificConsumerScope.test(text)) || (namedDevelopment.test(text) && concreteStake.test(text))))) && !negation.test(text));
  const blocked = commentary.test(normalized[0] ?? "") || /\?\s*$/.test(title);
  const explicitHeadlineOutcome = bounded === 0 && (boundedResult.test(normalized[0]) || localOutcome.test(normalized[0]));
  const reasons: ImpactAssessment["reasons"] = blocked ? [] : [...selections];
  if (!blocked && !reasons.length && bounded >= 0 && (hasExcerpt || explicitHeadlineOutcome) && !normalized.some((text) => broadConflict.test(text))) {
    reasons.push({ dimension: "bounded", evidence: passages[bounded], provisional: false });
  }
  if (!blocked && developing >= 0 && !direct.length && !reasons.some(({ dimension }) => dimension === "bounded")) {
    reasons.push({ dimension: "developing", evidence: passages[developing], provisional: true });
  }
  const status = !reasons.length ? "insufficient" : reasons.some((reason) => !reason.provisional) ? "supported" : "provisional";
  const estimate = reasons.some(({ dimension }) => dimension === "bounded") ? 1
    : Math.max(!direct.length && developing >= 0 ? 2 : 1, Math.round(weighted));
  const global = status === "insufficient" ? null : Math.min(status === "provisional" ? 4 : 10, estimate);
  const milestoneFor = (topic: NewsCategory) => normalized.findIndex((text) => categoryMilestones[topic]?.test(text) && !negation.test(text));
  const milestone = passages[milestoneFor(category)] ?? null;
  const byCategory: ImpactAssessment["byCategory"] = {};
  for (const topic of categories) {
    const evidenceIndex = milestoneFor(topic);
    if (evidenceIndex >= 0) {
      const base = uncertainty.test(normalized[evidenceIndex]) ? 4 : 7;
      byCategory[topic] = Math.min(10, base + Math.round((global ?? 0) * 0.5));
    } else if (global != null) {
      byCategory[topic] = Math.min(9, 3 + Math.round(global * 0.5));
    }
  }
  return {
    version: "evidence-3.1.0",
    status,
    global,
    category: byCategory[category] ?? null,
    byCategory,
    confidence: status === "supported" && hasExcerpt && (direct.length >= 2 || reasons[0].dimension === "bounded") ? "moderate" : "limited",
    reasons,
    milestone,
  };
}
