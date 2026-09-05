# Track 01 Strategy: AI Growth & Agentic Commerce

Date: 2026-08-29

## Purpose

This document captures the initial product strategy, research learnings, requirements, and edge cases for a Razorpay Buildathon Track 01 project.

It should be used later as a verification checklist against the actual repo, deployed demo, pitch, and judging narrative. The goal is to avoid losing the strategic context while building.

## Hackathon Track

Track 01: AI Growth & Agentic Commerce

Theme:

> Grow the merchant's revenue, and make them sellable to AI buyers.

Bar:

> Every money action explainable, bounded and gated. Show the audit trail and one failure handled gracefully.

Our interpretation:

The project should not be a generic shopping chatbot. It should make a Razorpay merchant understandable, selectable, and safely payable by AI agents.

The core product question:

> Can an AI agent help a merchant sell more, or make the merchant sellable to an AI buyer, while keeping every commerce action safe, explainable, bounded, approved, and auditable?

## Why We Are Choosing Track 01

Track 01 is comparatively less finance-operations-heavy than the other tracks. It does not require deep knowledge of settlements, reconciliation, tax-line matching, chargeback evidence, false-positive fraud economics, or accounting exceptions.

It still requires basic payment knowledge:

- product price
- cart total
- discounts
- stock
- Razorpay order creation
- payment success/failure
- webhook or status update handling
- duplicate payment prevention
- audit logging

But the main challenge is agent/product design:

- what the agent should recommend
- what the agent should refuse
- when it should ask clarifying questions
- when it must ask for approval
- how it proves user intent
- how it prevents unsafe money actions
- how it exposes a merchant catalog to AI buyers
- how it handles checkout failure gracefully

## Competitive And Market Learnings

### Big-Tech And Protocol Learnings

OpenAI Instant Checkout / Agentic Commerce Protocol:

- Buying can happen inside an AI conversation.
- Product discovery, cart creation, checkout, payment, and merchant fulfillment remain separate concerns.
- Merchant should remain merchant of record.
- The AI surface should not own fulfillment, support, refund policy, or final order validation.
- A user must confirm before payment.

Stripe ACP:

- Agentic checkout still needs normal commerce primitives underneath.
- Merchant validation, payment processing, and order ownership matter.
- The AI interface should not bypass the merchant backend.

Google Universal Commerce Protocol:

- AI agents need structured commerce capabilities, not scraped human pages.
- Catalog, cart, checkout, identity, order status, and policy should be available as explicit capabilities.

Google Agent Payments Protocol:

- The hard problem is authorization, not just autonomy.
- Agents need a provable record of intent and approval before transacting.
- Mandates are important: user intent mandate, cart mandate, and payment mandate.

Visa Intelligent Commerce / Mastercard Agent Pay:

- Trust, identity, payment controls, tokenization, and user preferences are core.
- The user should be able to define allowed merchants, spend limits, categories, and approval rules.

Razorpay Agentic Payments / NPCI UAP context:

- India-specific agentic commerce will likely be conversational, UPI-first, and consent-heavy.
- Razorpay is relevant because it can bridge agent decisions with actual test-mode payment/order actions.
- For this hackathon, the Razorpay angle should be visible in the product, not hidden as a generic payment button.

### Startup Learnings

Nekuda:

- Bet: websites need machine-readable/actionable routes for agents, not just human UI.
- Learning: expose agent tools such as search catalog, build cart, validate cart, checkout intent, policies, and order status.
- Useful idea: make a merchant site "agent-ready."

Henry Labs:

- Bet: checkout execution is the bottleneck after AI discovery.
- Learning: recommendation is not enough; the value is intent-to-completed-order.
- Useful idea: lock cart, validate terms, create payment action, track status.

Channel3:

- Bet: AI commerce needs a product graph.
- Learning: flat product search is weaker than relationships such as alternatives, bundles, compatibility, cross-sells, and substitutes.
- Useful idea: build recommendations from product graph edges, not only text similarity.

Catalog.ai:

- Bet: products need to be distributed to AI agents as structured data.
- Learning: missing product metadata makes merchants invisible to AI buyers.
- Useful idea: add "agent-readable catalog readiness" checks.

ReFiBuy:

- Bet: agentic commerce optimization becomes the next SEO.
- Learning: SKU-level product data should be complete, structured, and optimized for AI recommendation engines.
- Useful idea: score each product for AI readiness and flag missing fields.

ShopAgentic / New Gen / Paz.ai:

- Bet: commerce platforms will become AI-native.
- Learning: agent-first storefronts may sit alongside human storefronts.
- Useful idea: create an "agent storefront" with structured catalog, policy, and checkout APIs.

Rye:

- Bet: universal checkout can become an API.
- Learning: broad universal checkout is too large for our hackathon, but a one-merchant version is realistic.
- Useful idea: product intent in, validated Razorpay order out.

Skyfire:

- Bet: agents need identity, permissions, and trust before payments.
- Learning: agent identity and permissions should be first-class.
- Useful idea: show an "Agent Passport" with buyer agent, user, merchant, allowed amount, allowed categories, and approval status.

Basis Theory:

- Bet: agentic payments need secure data boundaries.
- Learning: LLMs should not see sensitive payment data or raw credentials.
- Useful idea: the LLM recommends; backend enforces payment rules.

Crossmint / Locus / Payman:

- Bet: agents need wallets, spending controls, audit trails, and approval flows.
- Learning: spend caps, category limits, expiry windows, and transaction logs are product features, not backend details.
- Useful idea: build "Mandate Lite" for hackathon and document cryptographic/credential upgrades for later.

Rep AI / Manifest AI / Zipchat / Alhena:

- Bet: merchant-side AI agents can increase conversion, average order value, and support efficiency.
- Learning: ecommerce agents must answer product questions, ask clarifying questions, recommend products, handle objections, guide checkout, recover carts, and avoid hallucinations.
- Useful idea: combine sales-agent behavior with strict groundedness and checkout guardrails.

Bluefish / Profound / Scrunch:

- Bet: brands need to monitor and improve how AI systems represent them.
- Learning: "AI visibility" may become as important as SEO.
- Useful idea: give merchants a dashboard showing what the AI recommended, rejected, or could not answer due to missing data.

Daydream / Phia / Ovlo:

- Bet: vertical buyer agents may win before generic shopping agents.
- Learning: choose one vertical with clear buyer intent and attributes.
- Useful idea: do not build "AI for all ecommerce"; pick a focused merchant category.

## Strategic Product Thesis

Our likely direction:

> An agent-ready Razorpay merchant layer that turns natural-language buyer intent into a safe, approved, explainable Razorpay checkout.

Alternative phrasing:

> A safe AI sales agent for Razorpay merchants that increases conversion and average order value while enforcing buyer intent, merchant policy, spend limits, and approval gates.

The product should combine three market bets:

1. Agent-readable merchant infrastructure.
2. Merchant-owned conversational sales agent.
3. Safe payment authorization layer.

Updated direction:

> A merchant-facing Growth Copilot watches first-party commerce session events, detects live growth moments, proposes safe offers from a merchant-configured Growth Playbook, uses hybrid approval for merchant consent, gets buyer approval for the final cart, and then creates a Razorpay test-mode order with full auditability.

## Possible Product Name Directions

Temporary names only:

- AgentPay Merchant Console
- TrustCart AI
- SellableAI
- CartMandate
- RazorAgent Commerce
- Agent-Ready Checkout

Name is not decided.

## Target User

Primary user:

- A small or mid-sized Razorpay merchant who wants AI-driven sales without giving up control of money actions.

Secondary users:

- A buyer using chat to discover and purchase products.
- A buyer-side AI agent acting on a user's intent.
- A hackathon judge evaluating safety, business value, and implementation maturity.

## Recommended Vertical

Pick one vertical. Do not build generic ecommerce.

Good candidates:

- skincare
- snacks/health foods
- fashion basics
- fitness products
- books/stationery
- gifting

Recommended for demo:

Skincare or health snacks.

Why:

- Easy to understand.
- Rich attributes.
- Good upsell/cross-sell possibilities.
- Real safety/claim edge cases.
- Clear budget and suitability constraints.

## Core User Story

Buyer:

> I want to tell the merchant what I need in natural language and get a safe cart recommendation that respects my budget, preferences, and constraints.

Merchant:

> I want the AI agent to increase conversion/AOV, but I need every recommendation and payment action to obey my catalog, inventory, policies, and approval rules.

AI buyer:

> I need structured product, policy, and checkout capabilities so I can compare, select, and request payment safely.

## Core Workflow

1. Buyer expresses intent.
2. Agent extracts constraints:
   - budget
   - category
   - use case
   - must-have attributes
   - forbidden attributes
   - delivery needs
   - approval preference
3. Agent searches structured catalog.
4. Agent asks clarifying questions if needed.
5. Agent drafts cart.
6. Agent checks guardrails.
7. Agent explains:
   - why selected
   - what alternatives were rejected
   - whether any upsell/cross-sell was included
   - total amount
   - policy summary
8. Buyer approves cart.
9. Backend creates Razorpay test order only after approval.
10. Buyer completes or simulates test-mode payment.
11. System handles success/failure.
12. Audit trail records all decisions and actions.

## Architecture Direction

High-level architecture:

```text
Merchant catalog and policies
        ↓
Catalog normalizer / AI readiness layer
        ↓
Buyer intent parser
        ↓
Recommendation and cart agent
        ↓
Guardrail / policy engine
        ↓
Mandate Lite approval record
        ↓
Razorpay test order creation
        ↓
Payment status / webhook handling
        ↓
Audit trail and merchant console
```

Recommended services/modules:

- catalog module
- policy module
- recommendation module
- cart module
- guardrail module
- mandate/approval module
- Razorpay integration module
- audit log module
- evaluation/demo metrics module

## Important Product Concepts

### Agent-Readable Catalog

Each product should have:

- product id
- name
- category
- variants
- price
- currency
- stock
- delivery promise
- return policy
- who it is for
- who it is not for
- ingredients/specifications
- warnings/constraints
- compatible products
- substitute products
- cross-sell products
- upsell products
- bundle rules
- margin or merchant priority
- claims the agent is allowed to make
- claims the agent is not allowed to make

### Product Graph

Relationships:

- goes_well_with
- substitute_for
- premium_alternative_to
- budget_alternative_to
- incompatible_with
- requires
- frequently_bought_with
- bundle_candidate

Why this matters:

It lets the agent explain recommendations and avoid dumb bundles.

### Guardrail Engine

Guardrails should be deterministic wherever possible.

Required checks:

- user budget not exceeded
- product is in stock
- product category is allowed
- product is not restricted
- selected quantity is allowed
- final amount matches approved amount
- approval exists
- approval has not expired
- cart has not changed after approval
- duplicate checkout is blocked
- discount is valid
- return/delivery claims are source-backed

### Mandate Lite

Hackathon implementation of AP2-style authorization.

Intent mandate:

- user goal
- budget
- allowed categories
- constraints
- approval requirements
- expiry

Cart mandate:

- selected products
- quantities
- total amount
- delivery/policy summary
- approved by user
- approval timestamp
- cart hash

Payment action:

- Razorpay order id
- approved amount
- created amount
- status
- failure reason if any

Future advanced version:

- signed mandates
- tamper-evident audit logs
- cryptographic cart hash
- scoped credentials
- verifiable agent identity

Do not dismiss these advanced requirements as unnecessary. They may be deferred for time, but should remain in scope as product direction.

### Agent Passport

A visible record of:

- buyer agent id
- human user id
- merchant id
- session id
- allowed amount
- allowed categories
- permissions
- approval state
- expiry time

Purpose:

The judge should be able to answer: "Who acted, for whom, with what authority?"

### Growth Copilot

The Growth Copilot is the merchant-facing AI assistant. It uses first-party commerce session events such as search, product view, add to cart, policy question, checkout idle, approval, and payment state.

It should not be described as watching everything the buyer does. It observes only merchant-owned commerce events inside the live session.

Primary demo behavior:

- detect gift intent
- identify a safe gift-note cross-sell
- check the Growth Playbook authority mode
- auto-show allowed offers to the buyer
- log review-only or unsafe opportunities to the merchant console
- show the buyer the final cart
- require buyer approval before Razorpay order creation

Voice tone:

> Growth moment logged. This shopper asked for a bigger deal. The proposed bundle fits the budget, but this boundary is review-only, so it was withheld from the buyer. Review the playbook if this should become automatic for future sessions.

### Growth Playbook

The Growth Playbook is the source of truth for upsell, cross-sell, bundle switch, and discount decisions. The LLM may interpret buyer language and explain the proposal, but it is not the source of truth for offer eligibility.

The Growth Playbook should define:

- offer type
- trigger event or signal
- required product relationship
- approval mode
- risk level
- budget constraints
- stock constraints
- policy constraints
- max offers per session
- discount or margin limits where applicable

### Playbook Authority

Offer authority should come from the merchant-configured playbook:

- auto-approved playbook offers may be shown to the buyer if they pass guardrails
- review-only or unsafe offers are withheld and logged for the merchant
- merchants change the playbook for future sessions instead of approving one live cart
- buyer approval is always required before Razorpay order creation

Examples:

- gift-note cross-sell under budget: can be auto-approved by the playbook
- bundle switch that stays inside a safe boundary: can be auto-approved
- discount: review-only unless explicitly auto-approved with strict limits
- high-value upsell: review-only unless explicitly auto-approved with strict limits
- unsupported claim: blocked, not approvable

### Human Approval Screen

Approval should be a pre-payment receipt, not a generic confirmation dialog.

It should show:

- original buyer request
- extracted constraints
- selected items
- rejected alternatives
- cart total
- budget check
- discount check
- stock check
- delivery estimate
- return policy
- final Razorpay amount
- approve/edit/reject actions

### Grounded Answering

Agent answers should be labeled:

- catalog_verified
- policy_verified
- inventory_verified
- agent_inference
- blocked_unknown

If the catalog or policy does not contain an answer, the agent should say it cannot verify.

## Functional Requirements

### Catalog Requirements

- Merchant can load a catalog of products.
- Products include structured attributes.
- Products can be searched by natural-language intent.
- Product readiness score is calculated.
- Missing critical fields are flagged.
- Product variants are supported or explicitly scoped out.
- Stock is checked before recommendation.

### Conversational Agent Requirements

- User can describe a shopping need in natural language.
- Agent extracts constraints from the message.
- Agent asks clarifying questions when the request is underspecified.
- Agent recommends a cart.
- Agent explains why items were chosen.
- Agent explains why rejected items were not chosen.
- Agent can suggest an upsell or cross-sell only inside rules.
- Agent refuses unsafe, unsupported, or over-budget actions.

### Checkout Requirements

- Cart is validated before approval.
- User approval is required before Razorpay order creation.
- Approval is tied to exact cart and amount.
- Razorpay test order is created after approval.
- Payment success/failure is handled.
- Duplicate order creation is prevented.
- Price/cart changes after approval require re-approval.

### Audit Requirements

- Every agent decision is logged.
- Every guardrail check is logged.
- Every approval is logged.
- Every Razorpay action is logged.
- Every failure is logged with reason and recovery path.
- Audit log is visible in UI.

### Merchant Console Requirements

- Show recommended products.
- Show completed/failed payment actions.
- Show blocked unsafe actions.
- Show AI readiness issues.
- Show AOV/conversion-related demo metrics.
- Show session-level audit trail.

## Non-Functional Requirements

- Explainability: judge can understand why every action happened.
- Safety: no money action without approval.
- Boundedness: every payment has limits and expiry.
- Groundedness: agent does not hallucinate catalog/policy facts.
- Observability: audit trail is human-readable.
- Recoverability: at least one failure path is handled cleanly.
- Extensibility: architecture can later support protocol-style agent buyers.
- Data minimization: LLM does not receive payment secrets or unnecessary sensitive data.

## Advanced Requirements To Keep Under Consideration

These may not all be implemented in the first build, but they should remain visible as future/hiring-signal ambitions:

- signed intent mandate
- signed cart mandate
- tamper-evident audit log
- cryptographic cart hash
- agent identity verification
- scoped API credentials for buyer agents
- merchant allowlist
- buyer spending policy
- category-level permissions
- payment method restrictions
- webhook signature verification
- replay attack prevention
- idempotency keys for checkout actions
- PII redaction in LLM prompts and logs
- policy versioning
- automated eval suite for agent decisions
- adversarial prompt-injection tests
- synthetic buyer-agent test harness
- multi-agent protocol compatibility layer

## Edge Case Bank

### Budget And Cart

- Agent adds upsell that exceeds user budget.
- Agent selects correct product but wrong quantity.
- Cart total changes due to shipping/fees/discount expiry.
- User approves one amount, backend creates a different amount.
- Cart changes after approval.
- Agent recommends premium alternative without explaining tradeoff.
- Agent includes two substitutes instead of one product plus complement.

### Inventory And Price

- Product goes out of stock after recommendation.
- Variant is out of stock but parent product is available.
- Catalog price differs from checkout price.
- Discount code expires before payment.
- Time-sensitive offer expires after approval.

### Product Suitability

- User has constraints that product may violate.
- User asks for unsupported health/medical claims.
- Product description is vague.
- Product has missing ingredients/specs.
- Product contains "prompt injection" text asking the agent to ignore rules.
- Product is for a category outside user permission.

### Policy And Trust

- Agent promises a return/refund policy not present in merchant policy.
- Agent promises delivery date without source.
- User asks for warranty or compatibility info not available.
- Agent compares with competitors using unverified information.
- Agent should say "I cannot verify" instead of inventing.

### Approval And Authorization

- User says "buy it" ambiguously.
- Unknown buyer agent tries to create checkout.
- Agent tries to reuse old approval.
- Approval expires.
- Agent has approval for one category but buys another.
- Agent attempts to create multiple orders from one mandate.

### Razorpay And Payment

- Payment fails.
- Payment succeeds but webhook/status update is delayed.
- Payment success callback arrives twice.
- User double-clicks checkout.
- Razorpay order is created but user never pays.
- Payment is captured but merchant app fails to mark order paid.
- Razorpay API returns error.
- Network fails after order creation.

### Abuse And Safety

- User asks agent to bypass budget.
- Product metadata attempts prompt injection.
- Merchant tries to force upsells against buyer constraints.
- Agent reveals sensitive data in explanation.
- Agent sends payment link without approval.
- Agent retries failed payment too many times.

## Failure Case To Demo

At minimum, demo one graceful failure.

Best options:

1. Payment failure:
   - Razorpay test payment fails.
   - Agent logs failure.
   - Agent offers one safe retry or alternate method.
   - It does not create infinite retries.

2. Price changed after approval:
   - User approves cart for INR 749.
   - Backend detects current total is INR 799.
   - Agent blocks checkout and asks for re-approval.

3. Out-of-stock product:
   - Agent recommends item.
   - Stock check fails before approval.
   - Agent replaces with verified alternative and explains.

4. Unsupported claim:
   - User asks "Is this safe during pregnancy?"
   - Agent cannot verify from catalog/policy.
   - Agent refuses to make claim and suggests checking professional/merchant support.

Most judge-friendly failure:

> Price/cart mismatch after approval, because it directly proves bounded money-action safety.

## Demo Metrics

Track 1 does not require ML precision/recall, but the demo should still show measured impact.

Possible metrics:

- assisted conversion rate across synthetic sessions
- average order value lift from bounded upsell/cross-sell
- number of unsafe actions blocked
- number of missing catalog fields detected
- number of products made agent-ready
- checkout completion rate
- payment failure recovery rate
- audit completeness rate

Example demo result:

```text
50 simulated buyer sessions
37 carts created
29 approved checkouts
25 successful test payments
7 unsafe actions blocked
11 catalog readiness issues found
18% simulated AOV lift from safe bundles
100% money actions had audit records
```

## Build Scope Options

### MVP Scope

This is the minimum strong build:

- one merchant vertical
- structured catalog
- conversational buyer interface
- recommendation/cart agent
- deterministic guardrail checks
- approval screen
- Razorpay test order creation
- payment success/failure handling
- audit trail
- one failure demo

### Strong Scope

Adds hiring-signal depth:

- AI catalog readiness dashboard
- product graph recommendations
- Mandate Lite object
- Agent Passport
- merchant console
- demo metrics across synthetic sessions
- prompt-injection and unsafe-action tests
- idempotency for checkout creation

### Ambitious Scope

Adds protocol-style differentiation:

- agent-readable API endpoints
- buyer-agent test harness
- signed cart hash
- webhook signature verification
- policy versioning
- tamper-evident audit trail
- multi-agent simulation: buyer agent negotiates with merchant agent

## Recommended Final Project Shape

Build:

> A merchant-owned AI sales and checkout agent that makes a Razorpay merchant agent-ready.

Demo flow:

1. Merchant catalog is loaded.
2. AI readiness scan flags missing/unsafe fields.
3. Buyer asks for a product/bundle under a budget.
4. Agent recommends cart and explains decisions.
5. Agent rejects one unsafe upsell or unsupported claim.
6. Approval screen shows mandate and cart details.
7. Razorpay test order is created.
8. Payment succeeds.
9. Second scenario shows graceful failure.
10. Audit trail proves every action.

## Verification Checklist For Later Repo Review

When the deployed version/repo is ready, verify:

- Does the app clearly solve Track 01, not Track 03 or generic ecommerce?
- Is the merchant catalog structured and agent-readable?
- Does the agent use real catalog/policy data instead of hallucinating?
- Does the agent ask clarifying questions for vague intent?
- Does the agent explain selected and rejected products?
- Are upsells/cross-sells bounded by budget and policy?
- Is there a guardrail layer separate from the LLM?
- Is user approval required before Razorpay order creation?
- Is approval tied to exact amount/cart?
- Does Razorpay test-mode order creation actually work?
- Is there payment failure handling?
- Is duplicate order creation prevented?
- Is there an audit trail for every money action?
- Is at least one failure handled gracefully?
- Are advanced security concerns documented or partially implemented?
- Are demo metrics shown?
- Can a judge understand the product in under 2 minutes?
- Does the project feel like agentic commerce, not just chatbot commerce?

## Pitch Narrative

Problem:

> Ecommerce stores are built for human browsing, but buyers are moving into AI conversations. Merchants need a way to make their products understandable and safely purchasable by AI agents without losing control of payment, policy, and trust.

Solution:

> We built an agent-ready commerce layer for Razorpay merchants. It turns buyer intent into a verified cart, enforces spend and policy guardrails, gets explicit approval, creates a Razorpay test order, and records a full audit trail.

Differentiator:

> Unlike a normal shopping chatbot, our system separates AI recommendation from payment authority. The AI can suggest, but deterministic guardrails and a user-approved mandate decide whether money action is allowed.

Why now:

> Protocols such as ACP, AP2, UCP, x402, and NPCI UAP show that agent-to-agent commerce is becoming real. Razorpay merchants need a practical bridge from today's checkout to AI-native buying.

Judging proof:

> Every money action is explainable, bounded, gated, and logged. We also demonstrate a failure case where checkout is blocked or recovered safely.

## Open Decisions

- Which vertical should we choose?
- Are we building for a human buyer, buyer-side AI agent, or both?
- Should the first demo emphasize revenue growth, AI-buyer readiness, or safe checkout?
- Which Razorpay APIs will be used first: Orders only, or Payment Links/Checkout too?
- How much of Mandate Lite should be implemented versus represented in audit logs?
- What metrics should be simulated for the pitch?
- Should we implement webhook handling or mock status updates for time?
