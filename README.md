# GlowCart Agentic Commerce

GlowCart is a reusable agentic-commerce engine for Razorpay merchants. A buyer-facing shopping agent grounds recommendations in the merchant catalogue, while an editable growth playbook, hybrid approvals, deterministic guardrails, Razorpay Test Mode checkout, voice interaction, and an audit trail keep commerce actions explainable and bounded.

The application lives in [`agentic-commerce`](./agentic-commerce).

## Local Development

```bash
cd agentic-commerce
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

## Render Deployment

This repository includes a root-level [`render.yaml`](./render.yaml). Create a Render Blueprint from the repository and enter the environment variables that Render prompts for. This project must be deployed as a **Node web service**, not a static site, because it contains server-side agent, voice, checkout, and payment-verification routes.

Required connected-provider variables:

```text
OPENAI_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID
```

Never commit `.env.local` or provider secrets.

## Product And Architecture

- [`Final architecture`](./agentic-commerce/docs/final-architecture-spec.md)
- [`Implementation audit`](./agentic-commerce/docs/implementation-audit.md)
- [`Build playbook`](./agentic-commerce/docs/build-playbook.md)
- [`Product strategy`](./agentic-commerce/docs/track-01-agentic-commerce-strategy.md)
