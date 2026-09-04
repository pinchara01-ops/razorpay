# Architecture Implementation Audit

Date: 2026-09-04

This audit maps the architecture diagram to executable code. `Implemented` means the path is wired and tested. `Partial` means a safe local implementation exists but the target adapter or production persistence is still missing.

| Architecture capability | Status | Evidence | Remaining work |
|---|---|---|---|
| Public landing, buyer login, and catalogue | Implemented | `/`, `/login`, `/shop`; assistant absent from landing | Replace temporary catalogue media with final brand assets |
| Buyer clarification loop | Implemented | `src/app/shop/page.tsx`, `src/app/api/agent/route.ts` | Expand conversational evaluation set |
| Structured Buyer Intent | Implemented | OpenAI structured-output adapter with deterministic fallback | Expand extraction fields and evaluation set |
| Agent-readable catalog and policies | Partial | `src/data/catalog.ts`, `src/data/policies.ts` | Add external catalog ingestion and deeper policy compatibility checks |
| Recommendation Engine | Implemented | Strict positive-match ranking against the supplied catalogue; phone no-match test | Add a larger ranking evaluation set |
| Buyer product choice | Implemented | `selectRecommendedProduct`; recommendations leave cart empty | Add comparison and quantity workflows |
| Commerce Session Events | Implemented | Chat/search at intent time; product view/add only after buyer choice | Persist server-side |
| Growth Moment Detector | Implemented | `src/lib/growth/detectOpportunity.ts` | Measure precision on a larger scenario set |
| Growth Playbook | Implemented | Merchant can toggle rules and approval modes; active unpaid cart re-evaluates | Replace browser storage with durable merchant configuration |
| Offer Engine | Partial | `src/lib/growth/proposeOffer.ts` | Cross-sell and bundle switch work; discounted-cart pricing and upsell replacement need implementation |
| Offer Guardrails | Implemented | `src/lib/growth/validateOffer.ts` | Add margin data and per-session usage counters |
| Hybrid Merchant Approval | Implemented | `decideMerchantOffer` | Add authentication and role permissions |
| Buyer Offer Choice | Implemented | `decideBuyerOffer` | None for the current flow |
| Buyer Exact-Cart Approval and Mandate Lite | Implemented | Exact-total prompt inside GlowGuide accepts contextual text, transcribed voice, or explicit button; `approveFinalCart`, `src/lib/mandates` | Persist mandates server-side |
| Checkout Guardrails | Implemented | `checkCheckout`, `validateMandateForCheckout` | Add server-side idempotency storage |
| Razorpay Test Order and Checkout | Implemented and connected | One exact-cart approval automatically revalidates the cart, creates a live Test Mode order, and opens hosted Checkout; valid and tampered server-side signature tests | Add webhook-backed asynchronous payment states before production |
| Buyer and Merchant Voice | Implemented and connected | Visible buyer voice mode, MediaRecorder, OpenAI transcription through `/api/transcribe`, ElevenLabs English speech through `/api/voice`, and merchant briefing | Add streaming/realtime turn-taking if needed after the pitch |
| Audit Trail | Partial | `CommerceSession.auditEvents`, merchant audit view | Move from browser storage to an append-only server store |
| Handled Failure | Implemented | Price override invalidates cart hash and blocks checkout | Add network and inventory-change scenarios |

## Verified Loops

- Incomplete intent returns to the buyer conversation.
- The public landing page contains no shopping assistant.
- An unsupported phone request returns no catalogue match and creates no cart or offer.
- Product view and add-to-cart events occur only after the buyer selects an option.
- Disabling the matched gift rule removes the offer from the same active cart.
- Selecting the cleanser triggers a separate product-graph sunscreen rule, proving growth is not limited to gift wrap.
- A product with a missing policy reference is rejected instead of being labelled policy-verified.
- A blocked recommendation cannot enter the growth pipeline.
- A live-approval offer waits in the merchant Growth Inbox.
- Merchant approval only makes an offer available; it does not mutate the cart.
- Buyer acceptance changes the proposed cart, then one contextual text/voice approval or explicit control creates Mandate Lite, creates the Razorpay order, and opens Checkout without requiring `/cart` navigation.
- A catalog price change before approval makes the cart stale and blocks Razorpay order creation.
- A low-risk pre-approved rule bypasses live merchant approval but still waits for buyer choice.
- OpenAI structured output produces canonical buyer intent while deterministic modules retain money authority.
- The approved happy path creates a Razorpay test-mode order and opens hosted Checkout without a second application-owned click.
- Exact payment signatures are accepted and tampered signatures are rejected.
- ElevenLabs returns playable MP3 audio, and OpenAI accurately transcribes that audio through the buyer voice adapter.

## Verification Snapshot

- Unit tests: 21 passed, including no-match, policy evidence, product-graph growth, event-ordering, playbook mutation, cart, orchestration, and payment-signature guardrails.
- Browser journeys: 4 passed, including no-match, playbook mutation, guarded price-change failure, visible voice controls, conversational approval, and real Razorpay Test Mode checkout opening from GlowGuide.
- Live provider checks: OpenAI structured intent and audio transcription, ElevenLabs audio, and Razorpay order creation returned HTTP 200.
- Production build and lint: passed.

Razorpay's external mock-bank or OTP confirmation remains a manual Test Mode click. The application callback and signature-verification path are tested independently; production still requires durable order state and webhooks.
