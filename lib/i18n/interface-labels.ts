import type { SupportedLanguage } from "@/lib/store/language-store";
const labels = {
"importance":["Önem puanı","Importance","Bedeutung","Importance","Importancia"],
"assistantIntro":["Merhaba. Bu akıştaki haberleri özetleyebilirim. En önemli gelişmeleri sorabilirsin.","Hello. I can summarize this feed. Ask about the most important developments.","Hallo. Ich kann diese Nachrichten zusammenfassen. Frage nach den wichtigsten Entwicklungen.","Bonjour. Je peux résumer ce fil. Posez une question sur les événements essentiels.","Hola. Puedo resumir estas noticias. Pregunta por los acontecimientos más importantes."],
"assistantContext":["Açık haber akışından analiz","Analysis of the current feed","Analyse des aktuellen Feeds","Analyse du fil actuel","Análisis del flujo actual"],
"assistantClose":["Asistanı kapat","Close assistant","Assistent schließen","Fermer l’assistant","Cerrar asistente"],
"assistantQuestion":["Haberler hakkında soru sorun","Ask about the news","Frage zu den Nachrichten","Posez une question sur l’actualité","Pregunta sobre las noticias"],
"assistantSend":["Soruyu gönder","Send question","Frage senden","Envoyer la question","Enviar pregunta"],
"assistantLoading":["Haberler analiz ediliyor…","Analyzing stories…","Nachrichten werden analysiert…","Analyse des articles…","Analizando noticias…"],
"assistantError":["Yanıt alınamadı. Lütfen tekrar deneyin.","No response. Please try again.","Keine Antwort. Bitte erneut versuchen.","Aucune réponse. Veuillez réessayer.","Sin respuesta. Vuelve a intentarlo."],
"light":["Açık tema","Light mode","Heller Modus","Mode clair","Modo claro"],
"dark":["Koyu tema","Dark mode","Dunkler Modus","Mode sombre","Modo oscuro"],

  "intro": [
    "Önce en önemli gelişmeler.",
    "The essential stories first.",
    "Die wichtigsten Nachrichten zuerst.",
    "L’essentiel de l’actualité en premier.",
    "Las noticias esenciales primero."
  ],
  "translating": [
    "Başlıklar ve özetler çevriliyor…",
    "Translating headlines and summaries…",
    "Titel und Zusammenfassungen werden übersetzt…",
    "Traduction des titres et résumés…",
    "Traduciendo titulares y resúmenes…"
  ],
  "translationError": [
    "Bazı çeviriler alınamadı. Otomatik yeniden deneme tamamlandı.",
    "Some translations are unavailable after automatic retries.",
    "Einige Übersetzungen sind nach automatischen Wiederholungen nicht verfügbar.",
    "Certaines traductions restent indisponibles après plusieurs tentatives.",
    "Algunas traducciones no están disponibles tras los reintentos automáticos."
  ],
  "retry": [
    "Tekrar dene",
    "Retry",
    "Erneut versuchen",
    "Réessayer",
    "Reintentar"
  ],
  "featured": [
    "Öne çıkanlar",
    "Featured",
    "Im Blickpunkt",
    "À la une",
    "Destacados"
  ],
  "noSearch": [
    "Aramanızla eşleşen haber bulunamadı.",
    "No stories match your search.",
    "Keine passenden Nachrichten gefunden.",
    "Aucun article ne correspond à votre recherche.",
    "No hay noticias que coincidan con tu búsqueda."
  ],
  "read": [
    "Özeti oku",
    "Read briefing",
    "Zusammenfassung lesen",
    "Lire le résumé",
    "Leer resumen"
  ],
  "minutes": [
    "dk okuma",
    "min read",
    "Min. Lesezeit",
    "min de lecture",
    "min de lectura"
  ],
  "news": [
    "haber",
    "stories",
    "Nachrichten",
    "articles",
    "noticias"
  ],
  "markets": [
    "Piyasalar",
    "Markets",
    "Märkte",
    "Marchés",
    "Mercados"
  ],
  "rates": [
    "USD bazlı güncel referans kurlar",
    "Current USD reference rates",
    "Aktuelle USD-Referenzkurse",
    "Taux de référence actuels en USD",
    "Tipos de referencia actuales en USD"
  ],
  "updating": [
    "Güncelleniyor",
    "Updating",
    "Wird aktualisiert",
    "Actualisation",
    "Actualizando"
  ],
  "marketError": [
    "Piyasa verisi geçici olarak kullanılamıyor.",
    "Market data is temporarily unavailable.",
    "Marktdaten sind vorübergehend nicht verfügbar.",
    "Les données de marché sont temporairement indisponibles.",
    "Los datos del mercado no están disponibles temporalmente."
  ],
  "audio": [
    "Sesli haber özeti",
    "Audio briefing",
    "Audio-Zusammenfassung",
    "Résumé audio",
    "Resumen de audio"
  ],
  "listen": [
    "Dinle",
    "Listen",
    "Anhören",
    "Écouter",
    "Escuchar"
  ],
  "stop": [
    "Durdur",
    "Stop",
    "Stoppen",
    "Arrêter",
    "Detener"
  ],
  "preparing": [
    "Hazırlanıyor",
    "Preparing",
    "Wird vorbereitet",
    "Préparation",
    "Preparando"
  ],
  "category": [
    "Kategori",
    "Category",
    "Kategorie",
    "Catégorie",
    "Categoría"
  ],
  "publisher": [
    "Yayıncı",
    "Publisher",
    "Herausgeber",
    "Éditeur",
    "Editor"
  ]
} as const;
export function ui(language: SupportedLanguage, key: keyof typeof labels) { return labels[key][["tr", "en", "de", "fr", "es"].indexOf(language)]; }
