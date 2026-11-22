import { NextResponse } from "next/server";

import { readJson, RequestBodyError } from "@/lib/http/request";
import { readResponseBytes } from "@/lib/http/response";
import { workBudget } from "@/lib/http/work-budget";

const allowSpeech = workBudget(5, 8);
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 18 * 1024);
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 2800) return NextResponse.json({ error: "Text is too long" }, { status: 413 });
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 503 });
    }

    if (!allowSpeech()) return NextResponse.json({ error: "Try again shortly." }, { status: 429, headers: { "Retry-After": "10" } });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok) {
      console.warn(JSON.stringify({ event: "tts_provider_error", status: response.status }));
      return NextResponse.json({ error: "TTS generation failed" }, { status: response.status });
    }

    const audioBuffer = await readResponseBytes(response, 5_000_000);
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.warn(JSON.stringify({ event: "tts_unavailable" }));
    return NextResponse.json({ error: "Unable to generate speech" }, { status: 500 });
  }
}
