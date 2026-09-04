# Hybrid Offer Approval

We will use a hybrid approval model for growth offers. Low-risk offers that are explicitly configured in the merchant's Growth Playbook can be pre-approved when they pass guardrails, while discounts, high-value upsells, margin-sensitive actions, custom bundles, and any action outside the playbook require live merchant approval. Buyer approval is always required before Razorpay order creation, so merchant-side approval never replaces the buyer's final consent.

**Considered Options**

- Require live merchant approval for every offer: safest and best for demos, but it does not scale for real checkout sessions.
- Allow all playbook offers automatically: scalable, but too easy to make risky margin or trust changes without visible merchant control.
- Hybrid approval: keeps the voice copilot demo memorable while supporting a realistic product path.

**Consequences**

The Growth Playbook must store approval mode, risk level, constraints, and offer limits. The audit trail must distinguish pre-approved rule execution from live merchant approval.
