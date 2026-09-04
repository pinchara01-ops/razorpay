import { NextResponse } from "next/server";

type VoiceRequest = {
  text: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as VoiceRequest;
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ ok: false, message: "Voice text is required." }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  if (!apiKey) {
    return NextResponse.json({ ok: false, fallback: "browser", message: "ElevenLabs key not configured." }, { status: 501 });
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false, fallback: "browser", message: "ElevenLabs voice generation failed." }, { status: 502 });
  }

  const audio = await response.arrayBuffer();
  return new Response(audio, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "audio/mpeg"
    }
  });
}
