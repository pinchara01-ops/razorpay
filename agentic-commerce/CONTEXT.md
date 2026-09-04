# Agentic Commerce

This context describes the language for a Razorpay merchant growth copilot that turns live buyer intent into safe, approved commerce actions.

## Language

**Buyer**:
The person trying to purchase from the merchant during a commerce session.
_Avoid_: User, shopper, customer when referring to the live purchase actor

**Merchant**:
The seller that owns the catalog, policies, offers, order validation, fulfillment, and Razorpay payment setup.
_Avoid_: Store owner when the system-level seller is meant

**Buyer Agent**:
An AI actor that may express or assist with purchase intent on behalf of a buyer.
_Avoid_: Chatbot

**Growth Copilot**:
The merchant-facing AI assistant that detects live revenue opportunities, proposes safe offers, and asks for approval when needed.
_Avoid_: Cart recovery bot, sales bot

**Commerce Session**:
A first-party interaction between a buyer and the merchant storefront, including intent, product interest, cart, friction, approval, and payment events.
_Avoid_: Long-term customer profile

**Commerce Session Engine**:
The ordered workflow that turns buyer conversation into structured intent, recommendation, growth evaluation, approvals, Mandate Lite, checkout validation, and an auditable result.
_Avoid_: UI orchestration, collection of unrelated helper calls

**Product Option**:
An in-stock, in-budget catalog item returned for the buyer to consider after catalog and policy checks. It is not a cart item until the buyer selects it.
_Avoid_: Recommended cart

**Buyer Product Selection**:
The explicit buyer action that moves one Product Option into the cart and emits the corresponding first-party product-view and add-to-cart events.
_Avoid_: Automatic recommendation acceptance

**Catalog No-Match**:
A bounded result stating that the merchant has no verified item for the request. It stops recommendation, growth, and payment actions instead of inventing a substitute.
_Avoid_: Best-effort fallback product

**Session Event**:
A first-party commerce signal produced during a commerce session, such as search, product view, add to cart, checkout idle, policy question, approval, or payment state.
_Avoid_: External browsing history, surveillance event

**Growth Moment**:
A live, in-session opportunity where buyer intent, cart state, and merchant rules allow a relevant offer or checkout action.
_Avoid_: Abandoned-cart recovery

**Growth Playbook**:
The merchant-configured source of truth for which offers are allowed, when they can trigger, and what approvals or constraints they require.
_Avoid_: LLM knowledge, magic prompt

**Offer**:
A proposed commerce action that may change the buyer's cart, price, or decision context, including a cross-sell, upsell, bundle switch, or discount.
_Avoid_: Nudge when the action changes cart or price

**Safe Offer**:
An offer that is relevant, merchant-configured, within buyer constraints, policy-verified, approval-compliant, and auditable.
_Avoid_: Personalized offer when safety has not been checked

**Hybrid Approval**:
The approval model where low-risk playbook offers may be pre-approved by merchant rules, while risky or margin-sensitive offers require live merchant approval.
_Avoid_: Full automation, manual approval for everything

**Offer Availability**:
Permission to present a guarded offer to the buyer. Merchant approval changes offer availability, never the buyer's cart.
_Avoid_: Offer applied, item added

**Buyer Approval**:
The buyer's explicit approval of the final cart and amount before Razorpay order creation.
_Avoid_: Merchant approval

**Mandate Lite**:
A simplified authorization record that binds buyer intent, final cart, approved amount, cart hash, expiry, and checkout usage.
_Avoid_: Payment token, Razorpay order

**Money Action**:
Any action that creates or attempts to create a payment-relevant state, especially Razorpay order creation.
_Avoid_: Recommendation
