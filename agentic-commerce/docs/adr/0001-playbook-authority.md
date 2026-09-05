# Playbook Authority For Growth Offers

The Growth Playbook is the runtime authority for buyer-visible growth actions. Low-risk offers that are explicitly configured as auto-approved can be shown to the buyer after deterministic guardrails pass. Review-only, disabled, out-of-boundary, or unsafe opportunities are withheld from the buyer and logged in the merchant console for later review.

Buyer approval is still required before Razorpay order creation, so playbook auto-approval never replaces the buyer's final consent.

**Considered Options**

- Ask the merchant to approve every offer live: visible for demos, but it does not scale and makes the agent less useful.
- Allow all detected opportunities automatically: scalable, but risky for margin, trust, and buyer consent.
- Use the Growth Playbook as authority: merchants configure boundaries ahead of time; the agent acts only inside those boundaries and logs everything else.

**Consequences**

The Growth Playbook must store authority mode, risk level, constraints, and offer limits. The audit trail must distinguish buyer-visible auto-approved offers from withheld review-only opportunities. The merchant dashboard is for configuration and review, not for live checkout approval.
