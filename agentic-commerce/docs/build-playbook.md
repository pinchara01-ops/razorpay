# Build Playbook: Track 01 Agentic Commerce

Date: 2026-08-29

## Purpose

This document tells a coding agent how to build the Track 01 project without losing the original strategy.

The strategy doc explains what the product should become. This playbook explains how to start coding it in the right order.

Primary reference:

- `docs/track-01-agentic-commerce-strategy.md`

## Build Objective

Build a merchant-owned AI sales and checkout agent for a Razorpay merchant.

The first working version must prove this flow:

```text
buyer intent
  -> agent recommends cart
  -> deterministic guardrails validate cart
  -> user approves exact cart and amount
  -> Razorpay test order is created
  -> payment success/failure is handled
  -> audit trail records every decision and money action
```

The project should feel like agentic commerce, not a generic ecommerce chatbot.

## Product Spine

The minimum useful product has six pieces:

1. Structured merchant catalog
2. Conversational buyer agent
3. Deterministic guardrail engine
4. Approval / Mandate Lite layer
5. Razorpay test-mode order creation
6. Human-readable audit trail

If time is short, protect this spine before adding extra screens or polish.

The final demo direction adds a merchant-facing Growth Copilot:

```text
commerce session events
  -> growth signal detection
  -> Growth Playbook offer proposal
  -> Growth Playbook authority check
  -> buyer approval
  -> Razorpay checkout
  -> audit trail
```

## Recommended Tech Stack

Default choice:

```text
Next.js full-stack app
TypeScript
React frontend
Next.js API routes or server actions
Razorpay Node SDK or direct REST calls
LLM API for recommendation only
Local JSON / SQLite / Prisma for demo data
Tailwind or simple CSS modules
```

Why this stack:

- one repo
- fast demo loop
- easy frontend/backend sharing
- easy Razorpay integration
- easy deployment
- enough structure for a hiring project

Avoid overengineering early:

- no microservices
- no complex event bus
- no multi-tenant auth system in MVP
- no universal checkout across multiple merchants
- no heavy ML training pipeline

## Suggested Folder Structure

Use the repo's framework conventions if they differ. Otherwise:

```text
docs/
  track-01-agentic-commerce-strategy.md
  build-playbook.md

src/
  app/
    page.tsx
    api/
      agent/
      approve/
      checkout/
      payment-status/

  components/
    BuyerChat.tsx
    CartRecommendation.tsx
    ApprovalReceipt.tsx
    AuditTrail.tsx
    MerchantDashboard.tsx

  lib/
    catalog/
      catalog.ts
      readiness.ts
      productGraph.ts

    agent/
      recommendCart.ts
      parseIntent.ts
      prompts.ts
      schemas.ts

    guardrails/
      validateCart.ts
      policies.ts
      errors.ts

    mandates/
      createMandate.ts
      verifyMandate.ts
      cartHash.ts

    razorpay/
      createOrder.ts
      verifyPayment.ts
      webhook.ts

    audit/
      auditLog.ts
      events.ts

    metrics/
      demoMetrics.ts

    events/
      sessionEvents.ts

    growth/
      growthRules.ts
      detectOpportunity.ts
      proposeOffer.ts
      validateOffer.ts

  data/
    catalog.json
    policies.json
    syntheticSessions.json
```

## Build Phases

### Phase 0: Project Setup

Goal:

Create a runnable app with basic data and layout.

Tasks:

- initialize app
- add TypeScript
- add basic styling system
- create `data/catalog.json`
- create `data/policies.json`
- create a single main page
- add environment variables for Razorpay and LLM API keys
- add `.env.example`

Checkpoint:

```text
The app runs locally and displays merchant products from structured data.
```

Do not add LLM logic yet.

### Phase 1: Deterministic Commerce Core

Goal:

Make the product work manually before making it intelligent.

Tasks:

- load structured catalog
- display product list
- create cart from selected items
- calculate total
- validate stock
- validate budget
- validate category restrictions
- validate merchant policy constraints
- create audit events for each manual action

Checkpoint:

```text
Manual cart creation works.
Guardrails can accept or reject a cart.
Audit trail shows what happened.
```

Why this phase matters:

The LLM should never be the only thing keeping money actions safe.

### Phase 2: Agent Recommendation Layer

Goal:

Add an AI layer that proposes carts, but does not create payments.

Tasks:

- create buyer intent parser
- create recommendation function
- force structured agent output
- include recommended items
- include rejected alternatives
- include explanation
- include confidence and missing-information flags
- ground agent only in catalog and policy data
- log agent reasoning summary to audit trail

Expected agent output shape:

```json
{
  "intent": {
    "goal": "birthday gift",
    "budget": 100000,
    "category": "gifting",
    "constraints": ["vegetarian", "delivery within 3 days"]
  },
  "recommended_items": [
    {
      "product_id": "gift_box_001",
      "quantity": 1,
      "reason": "Fits the gift use case and stays under budget."
    }
  ],
  "rejected_items": [
    {
      "product_id": "premium_box_003",
      "reason": "Would exceed the buyer's budget."
    }
  ],
  "needs_clarification": false,
  "clarifying_question": null,
  "answer_labels": ["catalog_verified", "policy_verified"]
}
```

Checkpoint:

```text
The agent can recommend a cart from catalog data and explain selected/rejected products.
Guardrails still run after the agent recommendation.
```

Important rule:

The agent may propose a cart. It may not create a Razorpay order.

### Phase 3: Guardrails And Refusals

Goal:

Make the safety layer visible and deterministic.

Required guardrails:

- block cart above user budget
- block out-of-stock products
- block invalid quantity
- block disallowed category
- block unsupported product/policy claims
- block checkout without approval
- block changed cart after approval
- block changed amount after approval
- block duplicate checkout from same approval
- block expired approval

Refusal examples:

```text
I cannot recommend this item because it exceeds your budget.
I cannot verify that this product is safe for that medical use case from the merchant catalog.
I cannot create checkout because the cart changed after approval.
```

Checkpoint:

```text
Unsafe recommendations are rejected even if the agent proposes them.
The UI explains which rule blocked the action.
```

### Phase 4: Mandate Lite Approval Layer

Goal:

Create a lightweight version of agent-payment authorization.

Implement:

- intent mandate
- cart mandate
- approval state
- approval timestamp
- approval expiry
- cart snapshot
- approved amount
- cart hash
- payment action record

Mandate Lite shape:

```json
{
  "mandate_id": "mandate_123",
  "intent": {
    "user_goal": "Buy a gift under INR 1000",
    "max_amount": 100000,
    "allowed_categories": ["gifting"]
  },
  "cart": {
    "items": [
      {
        "product_id": "gift_box_001",
        "quantity": 1,
        "unit_amount": 69900
      }
    ],
    "total_amount": 69900,
    "cart_hash": "..."
  },
  "approval": {
    "approved": true,
    "approved_at": "2026-08-29T10:00:00+05:30",
    "expires_at": "2026-08-29T10:15:00+05:30"
  }
}
```

Checkpoint:

```text
Razorpay checkout cannot happen unless Mandate Lite is valid.
If amount/cart changes after approval, checkout is blocked.
```

### Phase 5: Razorpay Test-Mode Integration

Goal:

Connect the approved cart to a real Razorpay test-mode money action.

Implement:

- environment config for Razorpay key id and key secret
- server-side order creation
- amount check before order creation
- idempotency or duplicate protection
- store Razorpay order id
- log Razorpay order creation
- show payment pending/success/failure

Razorpay rule:

Only the backend creates Razorpay orders. The frontend and LLM never receive Razorpay secret keys.

Checkpoint:

```text
An approved cart creates a Razorpay test order for exactly the approved amount.
Audit trail shows who approved, what amount, and what Razorpay order was created.
```

Optional after basic order creation works:

- Razorpay Checkout frontend
- payment signature verification
- webhook handling
- webhook signature verification

### Phase 6: Failure Demo

Goal:

Show one meaningful failure handled gracefully.

Recommended failure:

Price changed after approval.

Flow:

```text
1. Buyer approves cart for INR 749.
2. Product price changes before checkout.
3. Backend recalculates total as INR 799.
4. Guardrail blocks Razorpay order creation.
5. UI says re-approval is required.
6. Audit trail records the blocked action.
```

Alternative failure:

Payment failure.

Flow:

```text
1. Approved cart creates Razorpay test order.
2. Payment fails or is simulated as failed.
3. Audit log records failure.
4. Agent offers one safe retry or alternate method.
5. Retry limit prevents repeated attempts.
```

Checkpoint:

```text
The failure proves the system is bounded, gated, and auditable.
```

### Phase 7: Merchant Console And Metrics

Goal:

Make the business value visible.

Add dashboard sections:

- assisted sessions
- carts recommended
- approved checkouts
- successful payments
- blocked unsafe actions
- estimated AOV lift
- catalog readiness issues
- audit coverage

Useful demo metrics:

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

Checkpoint:

```text
The judge can see business impact, not just a single happy-path demo.
```

### Phase 7.5: Growth Copilot And Hybrid Offers

Goal:

Add the merchant-facing growth moment that makes the 5-minute pitch feel memorable while staying inside Track 01.

Implement:

- first-party commerce session events
- gift-intent signal detection
- Growth Playbook rules
- safe offer validation
- hybrid approval mode
- merchant-facing proposal panel
- voice-style text-to-speech proposal
- merchant approve/reject action
- buyer approval of final cart
- audit events for proposal, approval mode, merchant decision, buyer decision

Initial event groups:

```text
intent events
product interest events
cart events
friction events
merchant decision events
buyer approval events
payment events
```

Avoid:

```text
external browsing history
sensitive identity inference
long-term profiling
post-abandonment recovery as the main workflow
```

Initial offer types:

```text
cross_sell: gift note add-on
bundle_switch: cleanser + moisturizer -> starter duo
routine_gap: missing sunscreen
discount: future or live-approval-only
```

Hybrid approval rule:

```text
Low-risk playbook offers may be pre-approved.
Discounts, high-value upsells, margin-sensitive actions, custom bundles, and off-playbook actions should be review-only unless the merchant explicitly configures them as auto-approved boundaries.
Buyer approval is always required before checkout.
```

Voice tone:

```text
Friendly, specific, not pushy.
Signature phrase: "Tiny revenue moment spotted."
```

### Phase 8: Frontend Polish

Goal:

Make the demo understandable in two minutes.

Screens:

- buyer chat / agent interaction
- product recommendation
- cart approval receipt
- payment status
- audit trail
- merchant dashboard

Design guidance:

- make the actual product the first screen
- do not start with a marketing landing page
- keep money actions visually explicit
- show guardrails in plain language
- show audit trail near the checkout flow
- use real product images/assets when available later

Checkpoint:

```text
Someone can understand the product without reading the strategy doc.
```

## Frontend Changeability Rules

The frontend should be built so that future design changes can be made in one place instead of editing every screen.

This matters because assets, visual direction, colors, product images, and brand style may be provided later.

### Use Shared Design Tokens

Define common visual values centrally:

- colors
- fonts
- spacing
- radius
- shadows
- borders
- page width
- card styles
- button sizes
- status colors

Preferred locations:

```text
src/styles/tokens.css
src/styles/globals.css
tailwind.config.ts
src/lib/design/tokens.ts
```

Choose the location that fits the framework setup.

Do not hardcode repeated visual values across many components.

Bad:

```tsx
<button className="bg-blue-600 rounded-xl px-4 py-2 text-white" />
<div className="bg-blue-600 rounded-xl shadow-lg" />
```

Better:

```tsx
<Button variant="primary" />
<Card tone="default" />
```

Or use CSS variables:

```css
:root {
  --color-primary: #2454ff;
  --radius-card: 8px;
  --space-page: 24px;
}
```

### Use Reusable Components

Create shared UI components for repeated patterns:

- Button
- IconButton
- Input
- Textarea
- Select
- Badge
- StatusPill
- Card
- Panel
- Modal
- Tabs
- Stepper
- EmptyState
- AuditEventRow
- GuardrailCheckRow
- ProductCard
- CartLineItem
- ApprovalReceipt

If a visual pattern appears twice, consider making it a component. If it appears once, keep it local.

### Keep Domain Components Separate From UI Components

UI components should be generic:

```text
Button
Badge
Card
Tabs
Modal
```

Domain components should know about this product:

```text
BuyerChat
CartRecommendation
ApprovalReceipt
AuditTrail
MerchantDashboard
GuardrailPanel
AgentPassport
```

This separation makes it easier to redesign without rewriting business logic.

### Centralize Copy For Important Labels

For important repeated text, statuses, and guardrail labels, keep copy centralized.

Possible file:

```text
src/lib/copy.ts
```

Examples:

```text
Approved
Blocked
Needs re-approval
Catalog verified
Policy verified
Payment failed
Razorpay order created
```

This makes it easier to adjust tone later.

### Centralize Status And State Styling

Status colors should come from one map.

Example:

```ts
const statusTone = {
  approved: "success",
  blocked: "danger",
  pending: "warning",
  verified: "info",
};
```

Do not manually choose colors for each status in each component.

### Design For Asset Replacement

Product images, merchant logo, hero/brand assets, and illustrations should be referenced through data/config, not buried inside components.

Preferred:

```text
data/catalog.json
src/lib/merchantConfig.ts
public/assets/
```

The catalog should contain product image references. The UI should render whatever the catalog provides.

### Do Not Couple Business Logic To Styling

Guardrail validation, cart totals, mandate checks, and Razorpay state should live in `src/lib`, not inside styled React components.

React components can display:

- result of validation
- audit events
- approval state
- payment state

But they should not be the source of truth for:

- whether checkout is allowed
- whether amount changed
- whether approval expired
- whether product is in stock

### Page Layout Should Be Configurable

Keep layout shells reusable:

- app shell
- main content area
- side panel
- dashboard grid
- checkout/approval panel

If the final design changes from a split-screen UI to dashboard tabs, most domain logic should survive.

### Avoid One-Off Styling Drift

When editing frontend later:

- update shared tokens first
- update shared components second
- update page-specific layout last

Do not fix visual inconsistencies by adding random utility classes to individual components unless the case is truly unique.

### Frontend Definition Of Done

Before considering the frontend ready:

- colors are controlled by shared tokens
- repeated UI patterns use shared components
- product images come from catalog/config
- statuses use a central tone map
- business logic is outside visual components
- important user-facing labels are easy to find/change
- mobile and desktop layouts do not overlap or clip text
- approval/payment/audit states remain understandable after style changes

## Agent Boundaries

The LLM can:

- parse buyer intent
- ask clarifying questions
- recommend products
- explain selected products
- explain rejected products
- summarize policy from verified data
- draft user-facing messages

The LLM cannot:

- create Razorpay orders directly
- override guardrails
- change approved amount
- approve on behalf of the user
- invent product claims
- invent refund/delivery policy
- access payment secrets
- decide final payment eligibility alone

Deterministic code must handle:

- amounts
- stock
- approval
- cart hash
- expiry
- duplicate checkout prevention
- Razorpay order creation
- sensitive credentials
- audit persistence

## Minimum Tests

Do not over-invest in tests before the product works, but guardrails need basic coverage.

Minimum tests:

- valid approved cart is allowed
- over-budget cart is blocked
- out-of-stock product is blocked
- unsupported claim is blocked or marked unverified
- checkout without approval is blocked
- changed amount after approval is blocked
- changed cart after approval is blocked
- duplicate checkout is blocked

Nice-to-have tests:

- expired mandate is blocked
- invalid discount is blocked
- product prompt-injection does not bypass guardrails
- Razorpay order amount equals approved amount
- audit event is written for blocked money action

## Coding Priorities

Priority order:

1. Working end-to-end spine
2. Safety and approval boundaries
3. Razorpay test-mode integration
4. Audit trail visibility
5. Failure demo
6. Merchant metrics
7. UI polish
8. Advanced protocol/security features

Do not spend too long on:

- perfect UI before checkout works
- huge catalog before one vertical works
- complex authentication before demo flow works
- model fine-tuning
- universal multi-merchant checkout
- heavy analytics
- full production-grade accounting

## Environment Variables

Expected `.env.example` entries:

```text
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
LLM_API_KEY=
APP_BASE_URL=http://localhost:3000
```

Add more only when needed.

## Data Model Draft

Product:

```ts
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: "INR";
  stock: number;
  attributes: string[];
  useCases: string[];
  notFor: string[];
  policyRefs: string[];
  crossSellIds: string[];
  upsellIds: string[];
  claimsAllowed: string[];
  claimsBlocked: string[];
};
```

Audit event:

```ts
type AuditEvent = {
  id: string;
  timestamp: string;
  actor: "buyer" | "agent" | "system" | "razorpay";
  action: string;
  summary: string;
  data?: Record<string, unknown>;
};
```

Guardrail result:

```ts
type GuardrailResult = {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    reason: string;
  }>;
};
```

Mandate:

```ts
type Mandate = {
  id: string;
  userGoal: string;
  maxAmount: number;
  allowedCategories: string[];
  cartSnapshot: CartItem[];
  approvedAmount: number;
  cartHash: string;
  approvedAt?: string;
  expiresAt?: string;
  razorpayOrderId?: string;
  usedAt?: string;
};
```

## Demo Script Draft

Happy path:

```text
1. Buyer asks: "I need a gift under INR 1000, vegetarian, deliverable in 3 days."
2. Agent extracts constraints.
3. Agent recommends gift box plus greeting card.
4. Agent rejects premium hamper because it exceeds budget.
5. Guardrails pass.
6. Buyer approves exact cart and amount.
7. System creates Razorpay test order.
8. Payment succeeds.
9. Audit trail shows all steps.
```

Failure path:

```text
1. Buyer approves cart for INR 749.
2. Merchant price changes before checkout.
3. System detects approved amount no longer matches current amount.
4. Razorpay order creation is blocked.
5. UI asks for re-approval.
6. Audit trail records blocked money action.
```

Unsafe claim path:

```text
1. Buyer asks: "Is this safe during pregnancy?"
2. Agent checks catalog and policy.
3. No verified source exists.
4. Agent refuses to make the claim.
5. Audit trail marks answer as blocked_unknown.
```

## Definition Of Done For First Build

The first build is done when:

- user can ask for a product in natural language
- agent recommends a cart from structured catalog
- selected/rejected items are explained
- guardrails run and are visible
- approval is required before checkout
- Razorpay test order is created only after approval
- audit trail records agent, guardrail, approval, and Razorpay events
- one failure case is handled gracefully
- app runs locally with documented setup

## Later Verification Questions

Use these after a repo or deployed version exists:

- Did we build Track 01, or did we drift into generic ecommerce?
- Is the AI useful before checkout?
- Is the merchant sellable to AI buyers?
- Are money actions bounded and gated?
- Can every Razorpay action be explained?
- Does the system reject unsafe agent behavior?
- Does the audit trail prove what happened?
- Does the demo show business value?
- Does the product have a hiring-signal level of thoughtfulness?
