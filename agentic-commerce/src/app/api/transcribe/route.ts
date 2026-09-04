import { NextResponse } from "next/server";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "Voice transcription is not configured." }, { status: 501 });
  }

  const incoming = await request.formData();
  const audio = incoming.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ ok: false, message: "A recorded audio file is required." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ ok: false, message: "The voice recording is too large." }, { status: 413 });
  }

  const body = new FormData();
  body.append("file", audio, audio.name || "glowguide.webm");
  body.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  body.append("language", "en");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false, message: "Voice transcription failed." }, { status: 502 });
  }

  const result = (await response.json()) as { text?: string };
  const text = result.text?.trim();
  if (!text) {
    return NextResponse.json({ ok: false, message: "No speech was detected." }, { status: 422 });
  }

  return NextResponse.json({ ok: true, provider: "openai", text });
}
