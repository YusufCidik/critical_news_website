import { normalizeNewsText, type NewsCategory } from "./categories";
import { newsSentences } from "./text";

const amount = String.raw`(?:[1-9]\d{2,}|[1-9]\d{0,2}(?:[.,]\d{3})+|\d+(?:[.,]\d+)? (?:thousand|million|billion|bin|milyon|milyar)|thousands|millions|milyonlarca|binlerce)`;
const affected = String.raw`(?:people|residents|households|patients|customers|workers|users|kisi|hane|hasta)`;
const population = new RegExp(String.raw`\b(?:${amount} (?:of )?${affected} (?:were |are |have been )?(?:killed|displaced|evacuated|affected|without (?:power|water)|lost (?:power|jobs)|etkilendi|yerinden edildi|tahliye edildi)|(?:evacuat\w*|displac\w*|affect\w*|left|leaves?) (?:of |more than |at least |around |over )?${amount} (?:of )?${affected})\b`, "u");

const dimensions = [
  ["population", population, 3],
  ["reach", /\b(?:nationwide|countrywide|across (?:the country|the continent|\d+ countries|multiple countries|three countries|four countries|five countries|europe|the united states|the european union)|in \d+ countries|ulke genelinde|dunya genelinde|birden fazla ulkede|a l echelle nationale|en todo el pais|landesweit)\b/u, 2],
  ["economic", /\b(?:\d[\d.,]* (?:million|billion|trillion|milyon|milyar) (?:dollars? in (?:losses|damages|relief)|(?:in )?(?:losses|damages)|dolar(?:lik)? (?:zarar|kayip))|(?:raises?|cuts?|raised|cut|holds?|keeps?|kept) (?:its )?(?:benchmark |policy )?interest rates?|(?:rate|rates) (?:by |at )\d+(?:\.\d+)? (?:basis points|percent|per cent)|\d[\d,.]* jobs (?:lost|cut|eliminated)|bankruptcy filing|borcunu odeyemedi|faizini (?:artirdi|indirdi))\b/u, 2],
  ["institutional", /\b(?:parliament|congress|senate|council) (?:passes|approves|adopts|votes to approve|passed|approved|adopted)\b|\b(?:supreme court|constitutional court|high court|court|judge) (?:strikes down|overturns|blocks|upholds|struck down|overturned|blocked|upheld)\b|\b(?:(?:declares?|declared) (?:a )?(?:state of emergency|emergency)|sign(?:s|ed) (?:\w+ ){0,3}into law|referendum (?:passes|approved)|treaty enters into force|sanctions? (?:take|took) effect|ceasefire (?:starts?|begins?|takes effect|entered into force)|ohal ilan|yasa (?:kabul edildi|yururluge girdi)|yururluge girdi)\b/u, 2],
  ["scientific", /\b(?:phase (?:3|iii) (?:clinical )?trial|peer[- ]reviewed (?:study|trial|results)|independent(?:ly)? (?:replication|replicated)|approved (?:a |the )?(?:vaccine|treatment)|vaccine (?:receives|received) approval|hakemli (?:dergi|calisma)|faz ?[3ıi]+ (?:klinik )?(?:calisma|deneme))\b/u, 2],
  ["duration", /\b(?:for (?:at least )?(?:\d+|several|many) years|permanent(?:ly)?|indefinitely|long[- ]term closure|\d+ yil boyunca|kalici olarak)\b/u, 1],
  ["magnitude", /\b(?:magnitude [67-9](?:\.\d+)?|[67-9](?:\.\d+)?[- ]magnitude|category [45] (?:storm|hurricane)|\d[\d,.]* (?:deaths|fatalities|dead|killed|can kaybi)|mass evacuations?|major infrastructure failure|[67-9](?:[.,]\d+)? buyuklugunde(?:ki)? deprem\w*)\b/u, 2],
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
const uncertainty = /\b(?:could|might|may|if approved|plans? to|proposals?|unconfirmed|unverified|alleg(?:ed|edly)|forecasts?|reportedly|iddia|olabilir)\b/u;
const negation = /\b(?:no |not |without any |ruled out |denied |denies )\b/u;

type ImpactDimension = typeof dimensions[number][0];
export interface ImpactAssessment {
  version: "evidence-3.0.0";
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
  const reasons = dimensions.flatMap(([dimension, pattern]) => {
    const candidates = normalized.flatMap((text, i) => {
      if (!pattern.test(text) || negation.test(text)) return [];
      return [{ dimension, evidence: passages[i], provisional: uncertainty.test(text) }];
    });
    const strongest = candidates.find(({ provisional }) => !provisional) ?? candidates[0];
    return strongest ? [strongest] : [];
  });
  const points = dimensions.reduce((sum, [dimension, , weight]) => {
    const signal = reasons.find((reason) => reason.dimension === dimension);
    return sum + (signal ? weight * (signal.provisional ? 0.25 : 1) : 0);
  }, 0);
  const milestoneFor = (topic: NewsCategory) => normalized.findIndex((text) => categoryMilestones[topic]?.test(text) && !negation.test(text));
  const milestone = passages[milestoneFor(category)] ?? null;
  const byCategory: ImpactAssessment["byCategory"] = {};
  for (const topic of categories) {
    const evidenceIndex = milestoneFor(topic);
    if (evidenceIndex >= 0) {
      const base = uncertainty.test(normalized[evidenceIndex]) ? 4 : 7;
      byCategory[topic] = Math.min(10, base + Math.round(points * 0.5));
    } else if (reasons.length) {
      byCategory[topic] = Math.min(9, 3 + Math.round(points * 0.5));
    }
  }
  const directEvidence = reasons.filter((reason) => !reason.provisional).length;
  // A sports milestone and a public emergency use the same consequence scale.
  // A milestone can independently make a report important inside its topic.
  return {
    version: "evidence-3.0.0",
    global: reasons.length ? Math.min(10, Math.max(1, Math.round(points))) : null,
    category: byCategory[category] ?? null,
    byCategory,
    confidence: directEvidence >= 2 && excerpt.trim().length >= 80 ? "moderate" : "limited",
    reasons,
    milestone,
  };
}
