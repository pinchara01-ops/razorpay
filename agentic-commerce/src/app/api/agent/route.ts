import { NextResponse } from "next/server";

type BuyerAgentRequest = {
  text: string;
};

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function readOutputText(response: OpenAIResponse) {
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")
    ?.text;
}

const buyerIntentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["clarify", "ready", "blocked"] },
    clarifyingQuestion: { type: "string" },
    normalizedPrompt: { type: "string" },
    reply: { type: "string" },
    intent: {
      type: "object",
      additionalProperties: false,
      properties: {
        goal: { type: "string" },
        recipient: { type: "string" },
        maxAmountRupees: { type: "integer", minimum: 0 },
        constraints: { type: "array", items: { type: "string" } },
        blockedClaims: { type: "array", items: { type: "string" } }
      },
      required: ["goal", "recipient", "maxAmountRupees", "constraints", "blockedClaims"]
    }
  },
  required: ["status", "clarifyingQuestion", "normalizedPrompt", "reply", "intent"]
};

export async function POST(request: Request) {
  const body = (await request.json()) as BuyerAgentRequest;
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ ok: false, message: "Buyer message is required." }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, fallback: "deterministic", message: "OpenAI is not configured." }, { status: 501 });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      store: false,
      instructions: [
        "You are the language-understanding adapter for GlowCart, an Indian skincare store.",
        "Extract buyer intent; do not recommend products, invent prices, create offers, or claim payment authority.",
        "A ready request needs a specific product type or useful shopping goal and a maximum budget in INR.",
        "Do not ask who an item is for unless the buyer says it is a gift. A specific product type plus budget is enough to check catalog availability.",
        "When information is missing, set status to clarify and ask exactly one concise question.",
        "If the buyer asks for an unverified medical or safety claim such as pregnancy safety or treating acne, set status to blocked and explain that the store cannot verify that claim.",
        "normalizedPrompt must be a concise canonical sentence containing the goal, recipient, 'under N', and all constraints. Preserve words such as pregnancy or acne so deterministic safety checks can see them.",
        "Keep reply friendly and under 35 words. Use empty strings and empty arrays for unavailable fields."
      ].join(" "),
      input: text,
      text: {
        format: {
          type: "json_schema",
          name: "glowcart_buyer_intent",
          strict: true,
          schema: buyerIntentSchema
        }
      }
    })
  });

  const payload = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    return NextResponse.json({ ok: false, fallback: "deterministic", message: "Buyer agent is temporarily unavailable." }, { status: 502 });
  }

  const outputText = readOutputText(payload);
  if (!outputText) {
    return NextResponse.json({ ok: false, fallback: "deterministic", message: "Buyer agent returned no structured result." }, { status: 502 });
  }

  try {
    return NextResponse.json({ ok: true, provider: "openai", analysis: JSON.parse(outputText) });
  } catch {
    return NextResponse.json({ ok: false, fallback: "deterministic", message: "Buyer agent result could not be read." }, { status: 502 });
  }
}
