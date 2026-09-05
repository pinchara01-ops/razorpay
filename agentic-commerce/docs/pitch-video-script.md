# 5-Minute Pitch Video Script: GlowCart
*Skill: startup-pitch | Generated: 2026-09-05*

## Links To Open During Recording

- Problem statement page: open the hackathon Track 01 page.
- Local landing: http://localhost:3000
- Buyer shop: http://localhost:3000/shop
- Merchant console: http://localhost:3000/merchant
- Cart page, only if needed: http://localhost:3000/cart
- Find-it scenario dashboard: http://localhost:3000/findit
- Linear project: https://linear.app/main-el-sem-4/project/glowcart-ai-growth-and-agentic-commerce-558e1405d848
- Architecture spec: `docs/final-architecture-spec.md`

Note: The Find-it dashboard is a synthetic deterministic engine evaluation, not real customer analytics. It runs 500 generated scenarios against the commerce engine, playbook, mandate, and checkout guardrails.

## Recommended Demo Flow

1. Show Track 01 problem statement.
2. Show Linear project briefly, to prove this was broken into real engineering work.
3. Show architecture diagram/spec.
4. Demo happy path:
   - Buyer logs in.
   - Buyer goes to shop.
   - Buyer opens GlowGuide.
   - Prompt: `Build me a simple day routine under 1500 for oily skin`
   - Choose the `Oily Skin Starter Duo`.
   - Show that the relevant add-on is auto-approved because it fits an enabled low-risk Growth Playbook boundary.
   - Accept the buyer-visible offer.
   - Say/type `okay` to approve exact cart and open Razorpay checkout.
5. Demo risky merchant-review path:
   - Start a new search.
   - Prompt: `Gift for my brother under 2500, oily skin`
   - Choose the `Oily Skin Starter Duo`.
   - Type: `give me the biggest deal possible under 2500`
   - Show that the system withholds this high-risk bundle/deal request from the buyer because the playbook marks it review-only.
   - In the merchant console, show the reason, risk level, boundary, proposed total, and audit log so the merchant can decide whether to change future playbook rules.
6. Demo failure path:
   - Use unsupported intent: `I want a phone under 50000 for photography`
   - Show that the system refuses to invent a product.
   - Or use merchant price change before payment to show cart hash failure.
7. Show audit trail and Find-it evaluation story.

## Spoken Script

### 0:00 to 0:35 - Problem Statement

"This is the problem statement I picked: Track 01, AI Growth and Agentic Commerce.

The key line for me was: grow the merchant's revenue, and make them sellable to AI buyers.

At first this sounds like, okay, build a chatbot that sells products. But when I read the bar carefully, it says every money action has to be explainable, bounded, and gated. So the real problem is not just, can an AI recommend products? The real problem is: can an AI safely participate in commerce without hallucinating products, pushing random offers, changing carts secretly, or creating payments without consent?"

### 0:35 to 1:05 - What I Built

"So I built GlowCart, a reusable agentic commerce engine for Razorpay merchants.

The buyer gets a guided shopping agent called GlowGuide. It takes a vague request like, 'I need a gift for my brother under 1000 for oily skin,' asks for missing details if needed, and recommends only products that exist in the merchant's catalogue.

On the merchant side, there is a growth copilot. It watches first-party session events, detects a safe growth moment, checks the merchant's growth playbook, and then proposes an upsell, cross-sell, bundle switch, or offer.

The important part is this: the AI can suggest, but the deterministic commerce engine decides what is allowed."

### 1:05 to 1:55 - Core Insight

"My main insight while building this was that the hard part is not the agent.

If I just give an LLM a catalogue and say, 'sell more,' it will probably suggest something. But that is not enough for money movement. A merchant cannot approve every tiny offer manually, and at the same time the merchant cannot give the agent unlimited freedom.

So I split the system into two layers.

The merchant does not need to manually write every cross-sell rule like, 'if cleanser, offer sunscreen, if gift, offer gift note.' Instead, the merchant defines boundaries: allowed offer types, allowed categories, maximum added amount, minimum margin, whether buyer approval is required, and whether a class of offer is auto-approved or review-only.

Inside those boundaries, the growth engine can form hypotheses from the session. For example, if the buyer is shopping for a gift, it can propose a gift note. If the buyer is building a skincare routine and has no sunscreen, it can propose sunscreen. Later, this can become a trained growth model or a larger rule engine, so we are not paying for an expensive LLM call for every small commerce decision."

### 1:55 to 2:40 - Architecture

"This is the architecture I used.

The buyer starts normally, on a real storefront, not on a demo chatbot page. They log in, browse the catalogue, and only then open GlowGuide.

GlowGuide converts the conversation into structured buyer intent. That intent goes into a recommendation engine which checks catalogue, stock, price, budget, and merchant policy references.

Only after the buyer chooses a product do we create cart events. That is important because recommendations should not secretly become cart actions.

Then the growth detector looks at the selected cart, the buyer's intent, and the session events. It creates growth candidates. The offer engine checks those candidates against the merchant Growth Playbook. Then guardrails validate budget, stock, margin, approval mode, price, and buyer consent.

For higher-risk offers, the system does not interrupt the buyer flow. It withholds the offer, logs the reason in the merchant console, and lets the merchant change the Growth Playbook for future sessions. For low-risk auto-approved rules, the offer can go directly to the buyer, but even then the buyer must approve the final cart.

Before Razorpay order creation, I create what I call Mandate Lite. It binds the buyer's intent, exact cart, exact amount, cart hash, expiry, and checkout usage. Then checkout revalidates the cart before creating a Razorpay test order."

### 2:40 to 3:45 - Happy Path Demo

"Now I will show the happy path.

I log in as a buyer and go to the shop. Notice the catalogue is visible first. The assistant is not pretending the whole site is a chat app.

I open GlowGuide and ask: 'Gift for my brother under 1000, oily skin.'

The agent now has to stay grounded. It cannot pull products from Amazon or Flipkart. It only uses the merchant catalogue. It recommends an in-stock product that fits the budget and the use case.

I choose the Oily Skin Starter Duo. Now the growth engine detects a routine gap. It sees that a relevant add-on can complete the routine and still keep the total within budget.

This does not go to the merchant because the merchant already approved this class of low-risk offer in the Growth Playbook. The playbook boundary allows relevant cross-sells if the product is in stock, the total stays inside buyer budget, margin is above the threshold, and the buyer still approves the exact cart.

The buyer still has a choice. I accept the offer, and now GlowGuide shows the exact cart and exact total.

When I say okay, the system creates Mandate Lite, rechecks the cart, creates a Razorpay test order, and opens Razorpay Checkout automatically."

### 3:45 to 4:20 - Risky Deal Review Demo

"Now I will show why the merchant console exists.

I start a new search and ask for a gift under 2500 for oily skin. I choose the starter bundle. Then I ask: 'give me the biggest deal possible under 2500.'

This is different from a small add-on. The buyer is asking for a bigger value deal, so the engine treats it as high risk. It can find a higher-value bundle, but it cannot auto-apply that decision just because the LLM sounded confident.

So the system does not show it to the buyer. It withholds the opportunity and logs it in the merchant console. The merchant sees the buyer request, the proposed bundle, the current cart, the proposed total, the risk level, and the Growth Playbook boundary. This is the scalable model: normal safe growth is automatic, but margin-affecting or high-risk growth becomes review data for future playbook changes."

### 4:20 to 4:45 - Failure And Safety Demo

"The second thing I wanted to show is that the system can say no.

If I ask for a phone under 50000 for photography, GlowGuide does not fake a product. It says this merchant catalogue does not have a matching product, and it does not create a cart or payment.

There is also a financial integrity failure path. If the merchant changes the product price after the buyer approved the cart, the cart hash no longer matches. Checkout gets blocked instead of silently charging the buyer a changed amount.

This is what I mean by bounded money actions. The LLM can talk, but the commerce engine owns the permission."

### 4:45 to 5:05 - Proof, Tests, And Audit

"For proof, I added an audit trail. It records the recommendation, growth signal, playbook decision, withheld opportunities, buyer approval, mandate creation, checkout guardrail result, Razorpay order creation, and payment verification.

I also split the work into Linear tickets so the architecture is inspectable: intent, catalogue grounding, recommendation, growth playbook, offer guardrails, playbook authority, Mandate Lite, Razorpay order creation, payment signature verification, voice adapters, and E2E validation.

The current repo has unit tests, browser journey tests, and a Find-it dashboard with 500 synthetic scenarios. It measures whether the engine follows the important rules: no fake products, no unverified claims, playbook-authorized offers only, review-only deals withheld, and checkout blocked when price or stock changes."

### 5:05 to 5:20 - Close

"So GlowCart is not just a shopping chatbot. It is an agentic commerce control system for Razorpay merchants.

It helps the merchant grow revenue, but keeps the buyer protected through grounding, playbook boundaries, buyer approval, cart hashes, Razorpay test orders, signature verification, and an audit trail.

That is why I think it fits Track 01: growth, agentic commerce, and safe explainable money actions together."

## Red Flags

- The 500-scenario Find-it dashboard is synthetic engine evaluation, not production customer analytics.
- Current persistence is local/browser-based, not production database-backed.
- Merchant authentication and webhook-backed payment state are future work.

## Yellow Flags

- Voice is a strong demo moment, but it should be framed as an input/output adapter, not the source of payment authority.
- The demo catalogue is synthetic and narrow, so unsupported-product refusal is a feature, not a bug.
- The old `/demo` route still exists, but the pitch should use the real product routes.

## Sources

- `docs/final-architecture-spec.md`
- `docs/implementation-audit.md`
- `docs/linear-workspace-reconstruction.md`
- `src/data/catalog.ts`
- `src/data/growthRules.ts`
- `src/lib/evaluation/findItScenarios.ts`
- `src/app/findit/page.tsx`
