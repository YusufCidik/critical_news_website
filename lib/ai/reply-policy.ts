type Message = { role: string; text: string };
export type ReplyMode = "brief" | "standard" | "detailed";
export interface ReplyPolicy { mode: ReplyMode; maxWords: number; maxItems: number; maxSentences?: number; topic: string; followUp: boolean }
const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").toLowerCase();
function preference(text: string): ReplyMode | undefined {
  const value = normalize(text);
  if (/detayli|ayrintili|kapsamli|in detail|detailed|ausfuhrlich|en detail|detallad/.test(value)) return "detailed";
  if (/kisaca|kisa (yaz|anlat|cevap|yanit|tut|ozet|olsun)|daha kisa|ozetle|brief|short|concise|kurz|bref|breve|tek cumle/.test(value)) return "brief";
}
export function resolveReplyPolicy(question: string, history: Message[], preferred?: string): ReplyPolicy {
  let mode: ReplyMode = preferred === "brief" || preferred === "detailed" ? preferred : "standard";
  for (const message of history) if (message.role === "user") mode = preference(message.text) || mode;
  mode = preference(question) || mode;
  const text = normalize(question);
  const formatText = text.replace(/^(?:lutfen\s+)?(?:bunu|bunlari|onlari|yaniti|cevabi|make it)\s+/, "");
  const followUp = /^(?:lutfen\s+)?(?:daha\s+)?(?:kisaca(?:\s+(?:yaz|anlat|soyle))?|kisa\s+(?:yaz|anlat|tut)|ozetle|detayli(?:\s+(?:yaz|anlat))?|ayrintili(?:\s+(?:yaz|anlat))?|tek cumle(?:yle)?(?:\s+(?:yaz|anlat))?|shorter|briefly|in detail|kurzer|kurz|plus court|mas breve)[.!?\s]*$/.test(formatText);
  const topic = followUp ? [...history].reverse().find((message) => message.role === "user" && !/^(kisaca(?: yaz)?|kisa yaz|ozetle|detayli(?: yaz)?|shorter|briefly)[.!?\s]*$/.test(normalize(message.text)))?.text || question : question;
  let maxWords = mode === "brief" ? 60 : mode === "detailed" ? 360 : 140;
  let maxItems = mode === "brief" ? 3 : mode === "detailed" ? 10 : 5;
  const wordCount = text.match(/(\d{1,3})\s*(?:kelime|words?|worter|mots?|palabras?)/);
  if (wordCount) maxWords = Math.max(1, Math.min(700, Number(wordCount[1])));
  const itemCount = text.match(/(\d{1,2})\s*(?:madde|baslik|bullets?|points?|punkte|puntos?)/);
  if (itemCount) maxItems = Math.max(1, Math.min(12, Number(itemCount[1])));
  const oneSentence = /tek cumle|bir cumle|one sentence|ein satz|une phrase|una frase/.test(text);
  const sentenceCount = text.match(/(\d{1,2})\s*(?:cumle|sentences?|satze|phrases?|frases?)/);
  const maxSentences = oneSentence ? 1 : sentenceCount ? Math.max(1, Math.min(8, Number(sentenceCount[1]))) : undefined;
  if (maxSentences) maxWords = Math.min(maxWords, maxSentences * 40);
  return { mode, maxWords, maxItems, maxSentences, topic, followUp };
}
export function enforceReplyBudget(raw: string, policy: ReplyPolicy, language: string) {
  const cleaned = raw
    .replace(/\[(\d+(?:\s*,\s*\d+)+)\]/g, (_, values: string) => values.split(/\s*,\s*/).map((value) => "[" + value + "]").join(" "))
    .replace(/\*\*/g, "").replace(/^#{1,6}\s*/gm, "").replace(/^\s*\*\s+/gm, "• ").trim();
  const segments: string[] = [];
  let unit = "";
  for (const entry of new Intl.Segmenter(language, { granularity: "sentence" }).segment(cleaned)) {
    unit += entry.segment;
    // Sentence segmentation can mistake Turkish ordinals (3. Lig) and
    // abbreviations for sentence endings. Never return those fragments.
    if (/(?:\b\d{1,2}|\b(?:Dr|Mr|Mrs|Ms|Prof|No|vs))\.\s*$/iu.test(unit)) continue;
    segments.push(unit); unit = "";
  }
  if (unit) segments.push(unit);
  const result: string[] = [];
  let words = 0, sentences = 0, bullets = 0;
  for (const segment of segments) {
    const count = segment.trim().split(/\s+/).length;
    const items = (segment.match(/(?:^|\n)\s*[•*-]\s+/g) || []).length;
    if (words + count > policy.maxWords || (policy.maxSentences && sentences >= policy.maxSentences) || bullets + items > policy.maxItems) break;
    result.push(segment); words += count; sentences++; bullets += items;
  }
  if (result.length) return result.join("").trim();
  const tokens = cleaned.split(/\s+/);
  if (tokens.length <= policy.maxWords && !policy.maxSentences) return cleaned;
  const citation = cleaned.match(/\[\d+\]/)?.[0];
  return tokens.slice(0, Math.max(1, policy.maxWords - (citation ? 2 : 1))).join(" ").replace(/[\s,;:]+$/, "") + "…" + (citation ? " " + citation : "");
}
