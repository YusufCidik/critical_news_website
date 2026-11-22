import type { SupportedLanguage } from "@/lib/store/language-store";

const turkishFeeds = [
  "BBC Türkçe", "TRT Haber", "NTV", "Habertürk", "Diken", "Bianet", "Webrazzi",
  "ShiftDelete.Net", "DonanımHaber", "SavunmaSanayiST",
];

export function newsSourceLanguage(source?: string): SupportedLanguage {
  return source && turkishFeeds.some((name) => source === name || source.startsWith(name + " ")) ? "tr" : "en";
}
