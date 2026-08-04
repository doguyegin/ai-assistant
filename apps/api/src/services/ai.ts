import OpenAI from "openai";
import { env } from "../config/env.js";

export interface AiProvider {
  generate(prompt: string, system?: string): Promise<string>;
  chat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
  ): Promise<string>;
}

class OpenAiProvider implements AiProvider {
  private client: OpenAI | null;

  constructor() {
    this.client = env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
      : null;
  }

  async generate(prompt: string, system?: string): Promise<string> {
    return this.chat([
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user", content: prompt },
    ]);
  }

  async chat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
  ): Promise<string> {
    if (!this.client) {
      const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
      return [
        "[Mock AI — OPENAI_API_KEY tanımlı değil]",
        "",
        "Bugün önerilenler:",
        "- Bekleyen hatırlatmaları kontrol edin",
        "- Cevaplanmamış Google yorumlarını yanıtlayın",
        "- Taslak teklifleri müşterilere gönderin",
        "",
        `Mesajınız: ${last.slice(0, 200)}`,
      ].join("\n");
    }

    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      temperature: 0.6,
    });

    return completion.choices[0]?.message?.content?.trim() || "";
  }
}

export const aiProvider: AiProvider = new OpenAiProvider();

export const GENERATE_SYSTEM: Record<string, string> = {
  campaign:
    "Sen Türkiye'deki KOBİ'ler için pazarlama uzmanısın. Kısa, net Türkçe kampanya metni yaz.",
  whatsapp:
    "Sen profesyonel bir WhatsApp müşteri iletişimi yazarısın. Kısa, nazik Türkçe mesaj yaz.",
  quote:
    "Sen teklif metni yazarısın. Profesyonel, kısa Türkçe teklif açıklaması yaz.",
  review_reply:
    "Sen Google işletme yorumlarına cevap yazan bir uzmansın. Nazik, profesyonel Türkçe cevap yaz.",
  instagram: "Instagram gönderisi için Türkçe caption yaz. Emoji sparingly kullan.",
  blog: "Kısa bir blog yazısı taslağı üret (Türkçe).",
  email: "Profesyonel Türkçe e-posta metni yaz.",
  sms: "160 karakteri aşmayan Türkçe SMS metni yaz.",
};
