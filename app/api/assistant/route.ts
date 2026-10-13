import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AssistantRequest {
  question?: string;
  articles?: Array<{
    title?: string;
    summary?: string;
    source?: string;
    published_at?: string;
    impact_score?: number;
    category?: string;
  }>;
}

function fallbackAnswer(question: string, articles: AssistantRequest["articles"] = []) {
  const relevant = articles?.filter((article) => {
    const text = `${article.title || ""} ${article.summary || ""}`.toLocaleLowerCase("tr-TR");
    return question.toLocaleLowerCase("tr-TR").split(/\s+/).some((word) => word.length > 3 && text.includes(word));
  }).slice(0, 3) || [];

  if (!relevant.length) {
    return "Bu soruyu mevcut haber akışındaki doğrulanmış özetlerle yanıtlayacak yeterli eşleşme bulamadım. Dünya, kategori veya ülke filtresini değiştirerek daha ilgili bir akış açabilirsiniz.";
  }

  return `Mevcut akışta bu soruyla en ilgili ${relevant.length} haber var: ${relevant.map((article) => article.title).join("; ")}. Bu başlıkların ortalama önem puanı ${Math.round(relevant.reduce((sum, article) => sum + (article.impact_score || 0), 0) / relevant.length)}/10. Ayrıntılar için kaynak bağlantılarını açmanızı öneririm.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssistantRequest;
    const question = body.question?.trim();
    const articles = Array.isArray(body.articles) ? body.articles.slice(0, 40) : [];

    if (!question) {
      return NextResponse.json({ error: "Bir soru yazın." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ answer: fallbackAnswer(question, articles), model: "local-context" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const context = articles.map((article, index) => (
      `${index + 1}. [${article.category || "Dünya"}] ${article.title || "Başlıksız"}\n` +
      `Özet: ${article.summary || "Yok"}\n` +
      `Kaynak: ${article.source || "Bilinmiyor"} | Tarih: ${article.published_at || "Bilinmiyor"} | Önem: ${article.impact_score || "Bilinmiyor"}/10`
    )).join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Sen IntelMatrix'in tarafsız haber istihbarat asistanısın. Sadece aşağıdaki haber bağlamını kullan. Bilgi bağlamda yoksa açıkça bilinmediğini söyle. Haberleri yorumlarken olgu, çıkarım ve belirsizliği ayır. Türkçe, kısa ama analitik yanıt ver; mümkünse kaynak yayıncı adlarını belirt. Kullanıcı sorusu: ${question}\n\nHaber bağlamı:\n${context}`,
      config: { temperature: 0.2 },
    });

    return NextResponse.json({ answer: response.text?.trim() || fallbackAnswer(question, articles), model: "gemini-2.0-flash" });
  } catch (error) {
    console.error("Assistant request failed:", error);
    return NextResponse.json({ error: "Asistan şu anda yanıt veremiyor." }, { status: 500 });
  }
}
