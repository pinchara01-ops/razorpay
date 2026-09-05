# Linear Workspace Reconstruction: GlowCart AI Growth & Agentic Commerce

Date: 2026-09-05

Source of truth:

- Repository: `https://github.com/pinchara01-ops/razorpay`
- Application path: `/agentic-commerce`
- Deployed app: `https://glowcart-agentic-commerce-production.up.railway.app/`
- Current commits inspected:
  - `27bfb8e` Build guarded agentic commerce experience
  - `3a7abb2` Refactor growth engine boundaries
  - `0da300f` Reset checkout state for new buyer intents

This document reconstructs Linear work from the existing implementation. It is not a fake historical project-management log. Use the tickets below to create or update Linear once the Linear connector is available.

## Linear Project

Name:

```text
GlowCart — AI Growth & Agentic Commerce
```

Description:

```text
Build and validate a bounded AI commerce agent that helps merchants identify and execute safe growth opportunities while preserving merchant policy, buyer consent and payment integrity.

This Linear project is reconstructed from the existing repository implementation so the engineering process is inspectable from requirement to implementation, testing, review, verification and done.

Definition of Done: a ticket is considered Done when the requested behaviour is implemented, acceptance criteria are satisfied, relevant automated/manual verification has passed, and no known critical regression remains. Financial or authorization changes require explicit verification of failure and boundary cases.
```

## Workflow States

Use the closest available states in the workspace:

```text
Backlog
Todo
In Progress
In Review
QA / Verification
Done
```

## Labels

Create this small label set:

```text
frontend
backend
ai
commerce
growth
payments
security
testing
evaluation
infrastructure
documentation
```

## Dependency Map

```text
Merchant catalogue and policies
  -> Buyer intent and recommendation
  -> Buyer product selection
  -> Growth intelligence
  -> Merchant growth boundaries
  -> Offer guardrails
  -> Merchant/buyer approval
  -> Mandate Lite and cart hash
  -> Payment preconditions
  -> Razorpay test order
  -> Audit trail

Evaluation tickets depend on the relevant implemented engines.
Durable persistence, real outcome learning, and production auth remain future work.
```

## Tickets To Create In Linear

### 1. Buyer Intent -> Structured Commerce Intent

Status: Done
Priority: Medium
Labels: `ai`, `backend`, `commerce`
Evidence: `src/app/api/agent/route.ts`, `src/lib/agent/parseIntent.ts`, `src/app/shop/page.tsx`, commit `27bfb8e`

Problem:
Buyers ask vague shopping questions. The product needs a structured intent before catalogue matching or any money-related decision can happen.

Implementation:
The `/api/agent` route uses OpenAI structured output to classify buyer messages as `clarify`, `ready`, or `blocked`, while deterministic fallback logic in `getClarifyingQuestion` and `parseIntent` keeps the commerce pipeline usable when the LLM is unavailable.

Acceptance criteria:
- Missing budget produces one clarifying question.
- Missing shopping use case produces one clarifying question.
- Unverified medical or safety claims are blocked.
- LLM output does not directly recommend products, set prices, create offers, or authorize payment.

Verification:
- Unit coverage in `src/lib/commerce/engine.test.ts`.
- Manual flow in `/shop` via GlowGuide.

Risk:
Medium. Incorrect intent can produce bad recommendations, but deterministic commerce guardrails remain downstream.

### 2. Grounded Merchant Catalogue And Policy Data

Status: Done
Priority: Medium
Labels: `commerce`, `backend`
Evidence: `src/data/catalog.ts`, `src/data/policies.ts`, `src/lib/repositories/commerceRepositories.ts`, commit `3a7abb2`

Problem:
The agent must only sell what the merchant actually offers and must not invent policies or claims.

Implementation:
The repository contains typed synthetic product and policy records, including product IDs, categories, prices, cost prices, stock, allowed claims, blocked claims, policy references, and images. Thin repository interfaces wrap in-memory arrays so future database migration has a clean boundary.

Acceptance criteria:
- Every product has price, stock, cost price, policy references, and allowed/blocked claims.
- Product access goes through repository wrappers outside the data layer.
- Missing policy evidence prevents recommendation.

Verification:
- `src/lib/commerce/engine.test.ts` checks missing policy rejection.
- `src/lib/guardrails/validateCart.test.ts` checks stock and amount behavior.

Risk:
Medium. Catalogue integrity affects every downstream decision.

### 3. Deterministic Product Eligibility And Recommendation

Status: Done
Priority: Medium
Labels: `backend`, `commerce`, `ai`
Evidence: `src/lib/agent/recommendCart.ts`, `src/lib/commerce/engine.test.ts`, `e2e/commerce-flow.spec.ts`, commit `27bfb8e`

Problem:
The buyer-facing assistant should not hallucinate products or add unsupported substitutions.

Implementation:
`recommendCart` ranks products by overlap with buyer terms and intent, filters out accessories as primary recommendations, requires in-stock products, checks budget, and verifies policy references. Unsupported requests return no cart and no offer.

Acceptance criteria:
- Only in-stock, in-budget catalogue products are recommended.
- Unsupported categories such as phones produce a no-match state.
- Recommendations do not automatically enter the cart.

Verification:
- Unit tests for phone no-match and policy rejection.
- E2E test verifies unsupported phone request keeps cart count at zero.

Risk:
Medium. Recommendation errors damage trust but are still blocked before checkout.

### 4. Buyer Product Choice Before Cart Creation

Status: Done
Priority: High
Labels: `frontend`, `backend`, `commerce`
Evidence: `src/lib/commerce/engine.ts`, `src/app/shop/page.tsx`, `src/lib/commerce/engine.test.ts`, commit `27bfb8e`

Problem:
The AI should not silently create a cart just because it recommended products.

Implementation:
`startCommerceSession` creates recommendations with an empty `activeCart`. `selectRecommendedProduct` is the first point where product view/add events and a selected cart are created.

Acceptance criteria:
- Starting a session leaves the cart empty.
- Buyer selection creates `product_view` and `add_to_cart` events.
- Growth evaluation begins only after selection.

Verification:
- Unit test: "waits for a real buyer selection before emitting cart events or growth logic."

Risk:
High. This protects buyer agency and prevents premature growth offers.

### 5. Commerce Session Store Across Buyer And Merchant Surfaces

Status: In Review
Priority: Medium
Labels: `frontend`, `commerce`, `infrastructure`
Evidence: `src/lib/commerce/sessionStore.ts`, `src/app/shop/page.tsx`, `src/app/cart/page.tsx`, `src/app/merchant/page.tsx`, commits `27bfb8e`, `0da300f`

Problem:
The buyer, cart, and merchant console need to see the same active commerce session during the demo.

Implementation:
The app stores `CommerceSession` in browser local storage and syncs it across routes with the `storage` event. A recent fix clears completed checkout state when the buyer starts a fresh shopping intent.

Acceptance criteria:
- Buyer selection is visible in merchant console.
- Merchant approval changes buyer-visible state.
- Starting a new topic after checkout does not show stale Razorpay cards.

Verification:
- Unit tests cover commerce session state transitions.
- Commit `0da300f` fixes stale checkout state on new buyer intent.

Risk:
Medium. Current storage is client-side only and not production durable.

### 6. Growth Intelligence Candidate Generation

Status: Done
Priority: High
Labels: `growth`, `backend`, `ai`
Evidence: `src/lib/growth/GrowthIntelligenceEngine.ts`, `src/lib/growth/detectOpportunity.ts`, commit `3a7abb2`

Problem:
Growth opportunities should be discovered from commerce signals, not hardcoded as one-off playbook product pairs.

Implementation:
`generateGrowthOpportunities` creates candidates from cart contents, session text/events, routine/gift heuristics, bundle logic, checkout hesitation, and historical basket patterns. Each candidate carries a reason, source, evidence, risk, margin, and proposed final cart.

Acceptance criteria:
- Candidates are separate from merchant playbook boundaries.
- Candidates include `source` as `historical_pattern` or `cold_start_hypothesis`.
- Candidates include evidence and explanation.
- Growth signals derive from candidates.

Verification:
- `src/lib/growth/validateOffer.test.ts`.
- `src/lib/commerce/engine.test.ts`.

Risk:
High. This is the core Track 01 growth decision engine.

### 7. Commerce Pattern Analyzer With Real Statistics

Status: Done
Priority: Medium
Labels: `growth`, `evaluation`, `backend`
Evidence: `src/lib/growth/CommercePatternAnalyzer.ts`, `src/data/historicalEvents.ts`, commit `3a7abb2`

Problem:
The product should not show hand-typed confidence/lift numbers that look scientific but are fake.

Implementation:
The analyzer computes support, confidence, and lift from a clearly labeled seed dataset of 20 synthetic historical baskets. Patterns below sufficient observation count return no evidence-backed result.

Acceptance criteria:
- Support, confidence, and lift are computed from event baskets.
- Observation count is included in evidence.
- Seed data is not represented as real customer data.
- Weak lift is filtered before being treated as evidence-backed growth.

Verification:
- Exercised through growth and commerce unit tests.

Risk:
Medium. Metrics can mislead if not labeled.

### 8. Merchant Growth Playbook As Boundary Policy

Status: Done
Priority: High
Labels: `growth`, `commerce`, `frontend`, `backend`
Evidence: `src/data/growthRules.ts`, `src/lib/growth/playbookStore.ts`, `src/app/merchant/page.tsx`, commit `3a7abb2`

Problem:
The merchant should not edit source code for every product-pair opportunity. The playbook should bound what the AI may do.

Implementation:
`GrowthRule` now represents merchant boundaries: allowed offer types, categories, max added amount, minimum cart amount, minimum margin, constraints, and approval mode by risk level. The merchant UI can toggle boundaries and adjust low-risk approval mode.

Acceptance criteria:
- Playbook is not a hardcoded product-pair list.
- Boundaries are applied before an offer is shown.
- Merchant UI distinguishes configured boundaries from discovered opportunities.
- Active unpaid carts can be re-evaluated after playbook changes.

Verification:
- Unit test verifies playbook mutation changes same cart outcome.
- Merchant console renders playbook boundaries.

Risk:
High. Playbook errors can allow unsafe or unprofitable growth actions.

### 9. Margin-Aware Offer Optimization

Status: Done
Priority: High
Labels: `growth`, `commerce`, `backend`
Evidence: `src/data/catalog.ts`, `src/lib/growth/proposeOffer.ts`, `src/lib/growth/validateOffer.ts`, commit `3a7abb2`

Problem:
The agent should optimize for merchant value, not just the biggest cart total.

Implementation:
Every product includes `costPrice`. Candidate offers compute incremental margin, proposal ranking includes evidence and margin, and validation rejects proposed items below the configured minimum margin.

Acceptance criteria:
- All catalogue products include cost price.
- Offer validation checks margin for each proposed item.
- Ranking considers evidence quality and merchant margin.

Verification:
- Growth offer tests pass through margin validation.

Risk:
High. Margin mistakes can increase revenue while reducing profit.

### 10. Offer Proposal And Guardrail Validation

Status: Done
Priority: High
Labels: `growth`, `security`, `backend`
Evidence: `src/lib/growth/proposeOffer.ts`, `src/lib/growth/validateOffer.ts`, `src/lib/growth/validateOffer.test.ts`, commit `3a7abb2`

Problem:
Not every growth opportunity is safe to show to a buyer.

Implementation:
The proposal engine ranks candidates and tries enabled merchant boundaries. `validateOffer` enforces offer existence, enabled boundary, allowed type/category, approval mode, added amount, minimum cart amount, buyer budget, stock, catalog price, margin, buyer approval requirement, non-manipulative copy, and final cart value.

Acceptance criteria:
- Over-budget offers are blocked.
- Out-of-stock or stale-priced offer items are blocked.
- Boundary ID and evidence source are carried into the offer.
- Buyer approval is always required before payment.

Verification:
- `src/lib/growth/validateOffer.test.ts`.

Risk:
High. This is the boundary between AI suggestion and buyer-visible commerce action.

### 11. Hybrid Merchant Approval Flow

Status: Done
Priority: High
Labels: `frontend`, `growth`, `commerce`
Evidence: `src/lib/commerce/engine.ts`, `src/app/merchant/page.tsx`, `docs/adr/0001-playbook-authority.md`, commit `27bfb8e`

Problem:
The buyer flow should not wait for a merchant to approve individual offers. The merchant should configure authority once through the Growth Playbook.

Implementation:
The engine sets offer status based on the Growth Playbook authority mode. Auto-approved offers go to buyer review when guardrails pass. Review-only or unsafe opportunities are withheld from the buyer and logged in the merchant console.

Acceptance criteria:
- Review-only offers do not change buyer cart.
- Review-only offers are visible in merchant logs.
- Merchant can change playbook rules for future sessions.
- Buyer approval remains mandatory.

Verification:
- Unit tests cover playbook auto-approval, review-only withholding, and buyer offer choice.
- ADR documents the playbook authority tradeoff.

Risk:
High. Playbook authority is part of bounded money-action design.

### 12. Buyer Offer Choice And Exact-Cart Approval

Status: Done
Priority: Urgent
Labels: `frontend`, `commerce`, `payments`, `security`
Evidence: `src/app/shop/page.tsx`, `src/app/cart/page.tsx`, `src/lib/commerce/engine.ts`, commit `27bfb8e`

Problem:
The buyer must explicitly authorize the final cart and exact amount before Razorpay order creation.

Implementation:
The buyer can accept/skip an offer, then approve the exact cart through GlowGuide text, transcribed voice, or an explicit button. `/cart` remains optional. Approval creates Mandate Lite only after cart validation.

Acceptance criteria:
- Buyer accepts or declines offer explicitly.
- Final cart and exact total are shown before approval.
- Affirmative approval only works in the correct session state.
- Checkout begins only after approval.

Verification:
- Unit tests cover ordered merchant/buyer approval flow.
- E2E test covers conversational approval opening Razorpay.

Risk:
Urgent. This is buyer authorization for payment.

### 13. Mandate Lite And Cart Hash Integrity

Status: Done
Priority: Urgent
Labels: `security`, `payments`, `backend`
Evidence: `src/lib/mandates/createMandate.ts`, `src/lib/mandates/cartHash.ts`, `src/lib/guardrails/validateCart.ts`, `src/lib/commerce/engine.test.ts`, commit `27bfb8e`

Problem:
A buyer may approve a cart, then price/items can change before payment.

Implementation:
`createMandate` stores buyer intent, allowed categories, cart snapshot, approved amount, cart hash, approval time, and expiry. Checkout re-computes the current cart hash and blocks mismatch or duplicate use.

Acceptance criteria:
- Approved cart state is captured.
- Cart integrity is represented by deterministic hash.
- Current cart is revalidated before payment.
- Hash mismatch prevents payment.
- Duplicate checkout is blocked.

Verification:
- Unit tests cover price mutation blocking checkout.
- Cart guardrail test covers approved amount change.

Risk:
Urgent. Financial integrity.

### 14. Payment Preconditions And Inventory Recheck

Status: Done
Priority: Urgent
Labels: `payments`, `security`, `backend`
Evidence: `src/lib/guardrails/validateCart.ts`, `src/lib/commerce/engine.ts`, `src/lib/commerce/engine.test.ts`, commit `3a7abb2`

Problem:
Inventory can change after buyer approval but before payment.

Implementation:
`checkCheckout` combines mandate validation with `validateCheckoutInventory`, which rechecks live stock for every approved cart line before Razorpay order creation.

Acceptance criteria:
- Approval existence is checked.
- Expiry is checked.
- Cart hash is checked.
- Duplicate use is checked.
- Live inventory is rechecked before payment.
- Inventory failure blocks payment and is auditable.

Verification:
- Unit test: "blocks checkout when stock changes after buyer approval."

Risk:
Urgent. Prevents charging for unavailable inventory.

### 15. Razorpay Test Order Creation

Status: Done
Priority: High
Labels: `payments`, `backend`, `infrastructure`
Evidence: `src/app/api/checkout/route.ts`, `src/app/shop/page.tsx`, `src/app/cart/page.tsx`, commit `27bfb8e`

Problem:
The hackathon track requires visible Razorpay test-mode money action after bounded approval.

Implementation:
The backend creates Razorpay Orders via `https://api.razorpay.com/v1/orders` using server-side credentials. If keys are absent, it returns a mock order for local development. The buyer flow automatically opens hosted Razorpay Checkout after approval and order creation.

Acceptance criteria:
- Frontend never receives Razorpay secret.
- Invalid amount is rejected.
- Order amount equals approved mandate amount.
- Checkout failures do not mark payment complete.

Verification:
- E2E flow verifies Razorpay Checkout iframe opens.
- Manual provider checks were recorded in `docs/implementation-audit.md`.

Risk:
High. Payment integration is central to Track 01.

### 16. Razorpay Payment Signature Verification

Status: Done
Priority: Urgent
Labels: `payments`, `security`, `backend`, `testing`
Evidence: `src/app/api/payment/verify/route.ts`, `src/lib/payments/verifyRazorpaySignature.ts`, `src/lib/payments/verifyRazorpaySignature.test.ts`, commit `27bfb8e`

Problem:
The app must not trust a payment callback unless Razorpay signature verification succeeds.

Implementation:
The verification route requires order ID, payment ID, signature, and server-side secret. `verifyRazorpaySignature` validates the HMAC signature. Valid signatures mark payment confirmed; tampered signatures fail.

Acceptance criteria:
- Missing verification fields are rejected.
- Missing secret returns configured error.
- Valid signature is accepted.
- Tampered signature is rejected.

Verification:
- Unit tests in `verifyRazorpaySignature.test.ts`.

Risk:
Urgent. Prevents forged payment confirmation.

### 17. Explainable Audit Trail

Status: Done
Priority: High
Labels: `commerce`, `security`, `frontend`, `backend`
Evidence: `src/lib/audit/auditLog.ts`, `src/lib/commerce/engine.ts`, `src/app/merchant/page.tsx`, commit `3a7abb2`

Problem:
The track explicitly requires every money action to be explainable, bounded, gated, and auditable.

Implementation:
Commerce session actions append structured `AuditEvent` records. Growth events include opportunity reason, evidence source, evidence object, guardrail checks, and boundary ID. The merchant audit view renders decision history.

Acceptance criteria:
- Intent submission is logged.
- Product recommendation is logged.
- Growth detection and validation are logged.
- Merchant and buyer decisions are logged.
- Checkout creation/blocking and payment verification are logged.
- Cold-start vs evidence-backed source is visible.

Verification:
- Manual audit view in `/merchant`.
- Unit tests exercise events through commerce flows.

Risk:
High. Auditability is a judging requirement.

### 18. Buyer And Merchant Voice Adapters

Status: Done
Priority: Medium
Labels: `frontend`, `ai`
Evidence: `src/app/api/transcribe/route.ts`, `src/app/api/voice/route.ts`, `src/app/shop/page.tsx`, `src/app/merchant/page.tsx`, commit `27bfb8e`

Problem:
Voice makes the demo more memorable, but voice must stay an input/output adapter rather than payment authority.

Implementation:
Buyer voice uses `MediaRecorder`, OpenAI transcription, and ElevenLabs TTS with browser speech fallback. Merchant console can play spoken offer briefings. Voice approval only feeds the same text-state approval logic.

Acceptance criteria:
- Voice controls are visible on buyer assistant.
- Audio upload size is bounded.
- Missing providers fail gracefully.
- Voice does not bypass buyer approval or guardrails.

Verification:
- E2E checks voice controls are visible.
- Manual provider checks recorded in implementation audit.

Risk:
Medium. Important for pitch quality, but not the source of payment authority.

### 19. Public Landing, Login, Storefront, Cart, Merchant Console

Status: Done
Priority: Medium
Labels: `frontend`, `commerce`
Evidence: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/shop/page.tsx`, `src/app/cart/page.tsx`, `src/app/merchant/page.tsx`, `src/app/page.css`, commit `27bfb8e`

Problem:
The product should look like a working commerce product, not a single demo page.

Implementation:
The app has separate routes for public landing, login, catalogue browsing, cart review, and merchant operations. GlowGuide appears inside the signed-in shop, not on the public landing page.

Acceptance criteria:
- Landing page has no chat assistant.
- Buyer signs in before shopping.
- Catalogue is browsable without opening assistant.
- Cart and merchant console show relevant session state.

Verification:
- E2E test: landing is separate and unsupported request never enters cart.

Risk:
Medium. Affects demo credibility and UX.

### 20. Core Unit Regression Suite

Status: Done
Priority: High
Labels: `testing`, `security`, `payments`, `growth`
Evidence: `src/lib/**/*.test.ts`, latest local verification before this reconstruction

Problem:
Payment and growth logic needs automated regression coverage.

Implementation:
Vitest covers payment signature verification, cart guardrails, growth offer validation, commerce session ordering, playbook mutation, unsupported requests, missing policy evidence, claim blocking, price mutation, inventory mutation, and clarification prompts.

Acceptance criteria:
- `npm test` passes.
- Safety-critical checkout mutation paths are covered.
- Growth boundary behavior is covered.
- Payment signature verification is covered.

Verification:
- Last local run after commit `0da300f`: 22 tests passed.

Risk:
High. Regression coverage supports safe iteration.

### 21. End-To-End Commerce Flow Validation

Status: QA / Verification
Priority: High
Labels: `testing`, `evaluation`, `payments`, `frontend`
Evidence: `e2e/commerce-flow.spec.ts`, `playwright.config.ts`, `docs/implementation-audit.md`

Problem:
Unit tests do not prove that the buyer, merchant, cart, and Razorpay browser flow work together.

Implementation:
Playwright covers landing separation, sign-in, unsupported phone request, playbook auto-approval, price-change failure, playbook mutation, visible voice controls, conversational approval, and Razorpay Checkout opening.

Acceptance criteria:
- E2E suite runs against local app.
- No-match request does not create cart.
- Playbook auto-approval path works.
- Price mutation blocks checkout.
- Razorpay Checkout opens from GlowGuide.

Verification:
- Implementation audit records 4 passing browser journeys before the latest growth-boundary text changes.
- Current e2e test should be re-run because one selector still references old playbook copy: "Gift note cross-sell" instead of the current boundary wording.

Risk:
High. This is the closest automated proof of the demo path.

### 22. Deployment Configuration

Status: Done
Priority: Medium
Labels: `infrastructure`
Evidence: root `README.md`, root `render.yaml`, `agentic-commerce/package.json`, deployed Railway URL, commits `27bfb8e`, `0da300f`

Problem:
The app needs a deployable Node runtime because it contains server routes for AI, voice, checkout, and payment verification.

Implementation:
The repo documents required environment variables, Node 22, build/start commands, and Render blueprint config. Railway deployment requires root directory `/agentic-commerce`, build `npm ci && npm run build`, start `npm start`.

Acceptance criteria:
- Node version is configured.
- Secret environment variables are documented but not committed.
- Build command and start command are clear.
- Static deployment is not used.

Verification:
- Production build passes locally.
- App is deployed at the supplied Railway URL.

Risk:
Medium. Misconfigured deployment breaks live judging.

## Future / Backlog Tickets

### 23. Production Persistence, Auth, And Payment State Hardening

Status: Backlog
Priority: High
Labels: `backend`, `infrastructure`, `security`, `payments`
Evidence: Current local-storage implementation in `src/lib/commerce/sessionStore.ts`; payment callback verification in `src/app/api/payment/verify/route.ts`; no durable merchant auth implementation exists.

Problem:
Current sessions, audit events, playbook changes, mandates, observations, merchant actions, and payment state are browser-local or callback-driven. Production use needs durable storage, merchant authorization, idempotency, and webhook-backed order state.

Acceptance criteria:
- Sessions are persisted server-side.
- Mandates and audit events survive refresh/device changes.
- Merchant console reads server state.
- Storage supports idempotency and replay protection.
- Merchant approval and playbook edits require authenticated merchant permissions.
- Razorpay webhook events are verified and reconciled with callback state.
- Payment success/failure remains auditable.

Reason not Done:
No database, merchant-role enforcement, idempotency store, or webhook-backed order state exists yet.

### 24. Adversarial Commerce & Financial Integrity Testing

Status: Backlog
Priority: Urgent
Labels: `security`, `payments`, `testing`
Evidence: Unit tests cover several financial-integrity cases, but no complete adversarial suite exists.

Problem:
Malformed clients may try to modify amounts, bypass buyer approval, replay mandates, alter price/inventory, or trigger checkout without preconditions.

Acceptance criteria:
- Test amount modification.
- Test cart mutation after approval.
- Test approval bypass.
- Test merchant policy bypass.
- Test replay authorization.
- Test expired authorization.
- Test invalid cart hash.
- Test payment trigger without preconditions.

Reason not Done:
This should be security / financial-integrity verification, not called a penetration test. Current coverage is meaningful but not exhaustive.

### 25. Agent Decision Evaluation — 500 Scenario Regression Suite

Status: Backlog
Priority: Medium
Labels: `evaluation`, `testing`, `ai`, `growth`, `security`
Evidence: No 500-scenario suite exists in the repository.

Problem:
The agent needs broader controlled evaluation beyond the current unit/e2e cases.

Acceptance criteria:
- Controlled scenarios, not real customer data.
- Growth scenarios.
- Merchant-policy scenarios.
- Buyer constraints.
- Authorization and SHA/cart integrity.
- Payment safety.
- Expected vs actual decisions.
- Pass/fail results and critical safety metrics.
- Scenario inspection.

Reason not Done:
The repository contains tests but not a 500-scenario evaluation harness.

## Tickets Deliberately Not Created

- Multi-merchant universal checkout: discussed conceptually, not implemented.
- Real Amazon/Flipkart/Shopify integrations: not in the repository.
- Professional penetration test: no pentest was performed.
- Real customer analytics dashboard: no real customer data exists.
- Learned growth model from real outcomes: important later, but requires sufficient real labelled outcome data before training.
- Standalone model cost optimization track: useful later, but premature before labelled outcome data and evaluation harness exist.
- Returns/fraud/chargeback workflows: belong to other hackathon tracks, not this Track 01 build.
- Full phone-call voice agent: current implementation is web voice input/output only.

## Summary Counts For Linear

Recommended total tickets to create now: 25.

- Done: 20
- In Progress: 0
- In Review: 1
- QA / Verification: 1
- Backlog: 3

Directly supported by existing code:

- Tickets 1-22.

Future work:

- Tickets 23-25.

Tickets with GitHub implementation evidence:

- Tickets 1-22 can reference commits `27bfb8e`, `3a7abb2`, and/or `0da300f` plus the listed files.

Important current gaps:

- No Linear connector available in this session, so these tickets were reconstructed in this document rather than created in Linear.
- Commerce session, mandate, audit, playbook, and observation data are not persisted server-side.
- Merchant authentication and permissions are not implemented.
- The e2e suite should be re-run and may need selector text updated after the growth-boundary refactor.
- 500-scenario evaluation does not exist yet.
- Security / financial-integrity verification is meaningful but not exhaustive.
- Razorpay webhook-backed order state is not implemented.
