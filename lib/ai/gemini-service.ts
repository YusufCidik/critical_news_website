import { GoogleGenAI } from "@google/genai";

export type IntelCategory = "AI" | "Tech" | "Geopolitics";

export interface IntelPerspective {
  western_narrative: string;
  eastern_narrative: string;
  synthesis: string;
}

export interface IntelButterflyImpact {
  timeline: "short_term" | "long_term";
  impact: string;
}

export interface IntelMatrixRecord {
  id: string;
  original_title: string;
  translated_title: string;
  executive_summary: string;
  impact_score: number;
  category: IntelCategory;
  multi_perspective: IntelPerspective;
  butterfly_effect: IntelButterflyImpact[];
}

const responseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    original_title: { type: "string" },
    translated_title: { type: "string" },
    executive_summary: { type: "string" },
    impact_score: { type: "number" },
    category: { type: "string", enum: ["AI", "Tech", "Geopolitics"] },
    multi_perspective: {
      type: "object",
      properties: {
        western_narrative: { type: "string" },
        eastern_narrative: { type: "string" },
        synthesis: { type: "string" },
      },
      required: ["western_narrative", "eastern_narrative", "synthesis"],
    },
    butterfly_effect: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timeline: { type: "string", enum: ["short_term", "long_term"] },
          impact: { type: "string" },
        },
        required: ["timeline", "impact"],
      },
    },
  },
  required: [
    "id",
    "original_title",
    "translated_title",
    "executive_summary",
    "impact_score",
    "category",
    "multi_perspective",
    "butterfly_effect",
  ],
};

function sanitizeJsonText(rawText: string): string {
  const text = rawText.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
}

function buildFallbackIntelRecord(rawTitle: string): IntelMatrixRecord {
  const safeTitle = rawTitle || "Global strategic signal";
  const category: IntelCategory = /ai|model|chip|llm|gpu|compute/i.test(safeTitle) ? "AI" : /policy|war|security|diplomacy|trade/i.test(safeTitle) ? "Geopolitics" : "Tech";

  return {
    id: crypto.randomUUID(),
    original_title: safeTitle,
    translated_title: safeTitle,
    executive_summary: "Bu gelişme küresel teknoloji ve güvenlik kararlarını doğrudan etkiliyor. Yönetişim, yatırım ve operasyonel riskler açısından kısa vadeli izleme önerilir.",
    impact_score: 8,
    category,
    multi_perspective: {
      western_narrative: "Batı medyası, rekabet ve güvenlik endişelerini öne çıkarır.",
      eastern_narrative: "Doğu perspektifi, stratejik dayanıklılık ve üretim güvenliğini vurgular.",
      synthesis: "Gelişme, teknoloji ekosistemini ve jeopolitik dengeyi aynı anda yeniden biçimlendiriyor.",
    },
    butterfly_effect: [
      { timeline: "short_term", impact: "Piyasa ve yatırımcıların karar verme hızını artırır; kısa vadeli risk analizleri önem kazanır." },
      { timeline: "long_term", impact: "Endüstri yapısı ve küresel güç ilişkileri üzerinde kalıcı dönüşüm oluşturabilir." },
    ],
  };
}

export async function generateIntelBriefing(rawInput: string, title?: string): Promise<IntelMatrixRecord> {
  const sourceText = rawInput || title || "Global strategic intelligence signal";

  if (!process.env.GEMINI_API_KEY) {
    return buildFallbackIntelRecord(title || sourceText.split("\n")[0] || "Global strategic signal");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
      You are an elite geopolitical and technology intelligence analyst.
      Extract the core intelligence signal from the content below and return a strict JSON object matching the requested schema.
      Focus on geopolitical, AI, and technology implications.
      Use Turkish for untranslated_title, executive_summary, and narrative sections. Keep executive_summary to a maximum of 3 sentences.
      Output JSON only. No markdown fences.

      Source content:
      ${sourceText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const content = sanitizeJsonText(response.text || "{}");
    const parsed = JSON.parse(content) as IntelMatrixRecord;

    return {
      ...parsed,
      impact_score: Math.min(10, Math.max(1, Number(parsed.impact_score) || 5)),
      category: parsed.category || "Tech",
      multi_perspective: parsed.multi_perspective || {
        western_narrative: "",
        eastern_narrative: "",
        synthesis: "",
      },
      butterfly_effect: parsed.butterfly_effect?.length ? parsed.butterfly_effect : [{ timeline: "short_term", impact: "" }, { timeline: "long_term", impact: "" }],
    };
  } catch (error) {
    console.error("Gemini structured generation failed:", error);
    return buildFallbackIntelRecord(title || sourceText.split("\n")[0] || "Global strategic signal");
  }
}

export function buildStructuredNewsItem(
  feedItem: { title?: string; content?: string; summary?: string; link?: string; isoDate?: string },
  category: IntelCategory
): string {
  const text = [feedItem.title, feedItem.summary, feedItem.content].filter(Boolean).join("\n");
  return `${titleToCategory(feedItem.title || "")}\nCategory: ${category}\n\n${text}\nSource: ${feedItem.link || "unknown"}`;
}

function titleToCategory(title: string): string {
  if (/ai|model|llm|gpu|chip|automation|robot/i.test(title)) return "AI";
  if (/geopolitic|war|security|trade|sanction|election|policy|diplomacy/i.test(title)) return "Geopolitics";
  return "Tech";
}
