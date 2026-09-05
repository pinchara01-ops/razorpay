import { recommendCart } from "@/lib/agent/recommendCart";
import { createAuditEvent } from "@/lib/audit/auditLog";
import { getCartTotal } from "@/lib/cart";
import { createSessionEvent } from "@/lib/events/sessionEvents";
import { generateGrowthOpportunities } from "@/lib/growth/detectOpportunity";
import { proposeBestOffer } from "@/lib/growth/proposeOffer";
import { validateOffer } from "@/lib/growth/validateOffer";
import { validateCart, validateCheckoutInventory, validateMandateForCheckout } from "@/lib/guardrails/validateCart";
import { createMandate } from "@/lib/mandates/createMandate";
import { formatINR } from "@/lib/money";
import { growthPolicyRepository, productRepository } from "@/lib/repositories/commerceRepositories";
import type {
  CheckoutResult,
  CommerceSession,
  CommerceSessionStatus,
  GuardrailResult,
  GrowthRule,
  OfferDecision,
  PaymentVerificationResult,
  Product
} from "@/lib/types";

function now() {
  return new Date().toISOString();
}

function sessionId() {
  return `session_${Date.now().toString(36)}`;
}

function experimentVariant(): "treatment" {
  return "treatment";
}

function createOfferObservation(
  session: CommerceSession,
  updates: Partial<CommerceSession["offerObservations"][number]>
): CommerceSession["offerObservations"][number] {
  return {
    experimentId: session.experiment.id,
    sessionId: session.id,
    offerId: session.offer?.id ?? null,
    variant: session.experiment.variant,
    shown: false,
    accepted: false,
    checkoutStarted: false,
    purchased: false,
    finalOrderValue: getCartTotal(session.activeCart),
    recordedAt: now(),
    ...updates
  };
}

function statusForOffer(decision: OfferDecision): CommerceSessionStatus {
  if (decision === "available_to_buyer") return "awaiting_buyer_offer";
  return "awaiting_buyer_approval";
}

export function getClarifyingQuestion(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (!text) return "What are you shopping for today?";

  const hasBudget = /(?:under|below|within|less than|max|maximum|budget)\s*(?:inr|rs|rupees|₹)?\s*[0-9,]+/.test(text);
  if (!hasBudget) return "What is the most you would like to spend?";

  const hasUseCase = ["gift", "birthday", "routine", "skin", "sunscreen", "cleanser", "moisturizer", "outdoor"].some((term) =>
    text.includes(term)
  );
  if (!hasUseCase) return "Is this for you or a gift, and what should the product help with?";

  return null;
}

export function applyPriceOverrides(products: Product[], overrides: Record<string, number>) {
  return products.map((product) => ({
    ...product,
    price: overrides[product.id] ?? product.price
  }));
}

export function startCommerceSession(prompt: string, products: Product[] = productRepository.list()): CommerceSession {
  const recommendation = recommendCart(prompt, products);
  const sessionEvents = [
    createSessionEvent({ type: "chat_message", value: prompt }),
    createSessionEvent({ type: "search", value: prompt })
  ];
  const recommendationCanProceed = recommendation.recommendedItems.length > 0 && !recommendation.answerLabels.includes("blocked_unknown");
  const offerGuardrails = validateOffer(null, recommendation.intent, products);

  const timestamp = now();
  const id = sessionId();
  const experiment = {
    id: "growth-offer-v1",
    variant: experimentVariant(),
    assignedAt: timestamp
  } as const;
  const auditEvents = [
    createAuditEvent({
      actor: "buyer",
      action: "intent_submitted",
      summary: prompt,
      tone: "info"
    }),
    createAuditEvent({
      actor: "agent",
      action: recommendation.recommendedItems.length ? "products_recommended" : "request_blocked_or_unavailable",
      summary: recommendation.explanation,
      tone: recommendation.recommendedItems.length ? "success" : "danger",
      data: { intent: recommendation.intent, options: recommendation.recommendedItems, rejected: recommendation.rejectedItems }
    })
  ];

  return {
    id,
    prompt,
    status: recommendationCanProceed ? "awaiting_product_choice" : "checkout_blocked",
    experiment,
    recommendation,
    sessionEvents,
    growthSignals: [],
    offer: null,
    offerGuardrails,
    offerDecision: "none",
    offerObservations: [],
    activeCart: [],
    mandate: null,
    checkout: null,
    payment: null,
    priceOverrides: {},
    auditEvents,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function evaluateGrowth(
  session: CommerceSession,
  products: Product[],
  rules: GrowthRule[],
  sessionEvents: CommerceSession["sessionEvents"],
  activeCart: CommerceSession["activeCart"]
) {
  const candidates = generateGrowthOpportunities(sessionEvents, activeCart, session.recommendation.intent, products);
  const growthSignals = candidates.map((candidate) => candidate.signal);
  const treatmentOffer = proposeBestOffer(candidates, activeCart, session.recommendation.intent, products, rules);
  const offer = session.experiment.variant === "control" ? null : treatmentOffer;
  const offerGuardrails = validateOffer(offer, session.recommendation.intent, products, rules);

  let offerDecision: OfferDecision = "none";
  if (treatmentOffer && session.experiment.variant === "control") offerDecision = "blocked";
  if (offer && !offerGuardrails.passed) offerDecision = "blocked";
  if (offer && offerGuardrails.passed) {
    offerDecision = offer.approvalMode === "auto_approved" ? "available_to_buyer" : "blocked";
  }

  return { growthSignals, offer, offerGuardrails, offerDecision, withheldOffer: treatmentOffer && session.experiment.variant === "control" ? treatmentOffer : null };
}

export function selectRecommendedProduct(
  session: CommerceSession,
  productId: string,
  products: Product[],
  rules: GrowthRule[] = growthPolicyRepository.list()
): CommerceSession {
  if (session.status !== "awaiting_product_choice") return session;
  const option = session.recommendation.recommendedItems.find((item) => item.productId === productId);
  const product = products.find((candidate) => candidate.id === productId);
  if (!option || !product) return session;

  const activeCart = [{ ...option }];
  const sessionEvents = [
    ...session.sessionEvents,
    createSessionEvent({ type: "product_view", productId }),
    createSessionEvent({ type: "add_to_cart", productId })
  ];
  const growth = evaluateGrowth(session, products, rules, sessionEvents, activeCart);
  const auditEvents = [
    ...session.auditEvents,
    createAuditEvent({
      actor: "buyer",
      action: "recommended_product_selected",
      summary: `Buyer selected ${product.name}. Only now was it added to the cart.`,
      tone: "success",
      data: { productId, cart: activeCart }
    }),
    createAuditEvent({
      actor: "agent",
      action: growth.growthSignals.length ? "growth_moment_detected" : "growth_moment_not_found",
      summary: growth.growthSignals[0]?.summary ?? "No relevant in-session growth moment was detected after cart selection.",
      tone: growth.growthSignals.length ? "warning" : "info",
      data: { signals: growth.growthSignals, evidenceSources: growth.growthSignals.map((signal) => signal.source) }
    }),
    createAuditEvent({
      actor: "system",
      action: growth.offerDecision === "blocked" ? "growth_offer_blocked" : growth.offer ? "growth_offer_validated" : "growth_offer_not_found",
      summary: growth.offer
        ? growth.offerGuardrails.passed
          ? growth.offer.safetySummary
          : growth.offerGuardrails.checks.find((check) => !check.passed)?.reason ?? "Offer failed policy checks."
        : growth.withheldOffer
          ? "Session is in the experiment control group, so an eligible offer was measured but not shown."
          : "No enabled Growth Playbook boundary matched the selected product and session.",
      tone: growth.offerDecision === "blocked" ? "danger" : growth.offer ? "success" : "info",
      data: {
        offer: growth.offer,
        withheldOffer: growth.withheldOffer,
        checks: growth.offerGuardrails.checks,
        source: growth.offer?.source ?? growth.withheldOffer?.source,
        opportunityReason: growth.offer?.opportunityReason ?? growth.withheldOffer?.opportunityReason,
        evidence: growth.offer?.evidence ?? growth.withheldOffer?.evidence,
        boundaryId: growth.offer?.ruleId ?? growth.withheldOffer?.ruleId
      }
    })
  ];

  if (growth.offerDecision === "available_to_buyer") {
    auditEvents.push(
      createAuditEvent({
        actor: "system",
        action: "playbook_offer_auto_approved",
        summary: "An enabled low-risk boundary made the offer available. It has not changed the cart.",
        tone: "success",
        data: { offerId: growth.offer?.id, source: growth.offer?.source, evidence: growth.offer?.evidence, boundaryId: growth.offer?.ruleId }
      })
    );
  }

  const offerObservations = growth.offer
    ? [...session.offerObservations, createOfferObservation({ ...session, offer: growth.offer, activeCart, experiment: session.experiment, offerObservations: session.offerObservations }, { shown: true, finalOrderValue: growth.offer.finalAmount })]
    : growth.withheldOffer
      ? [...session.offerObservations, createOfferObservation({ ...session, offer: growth.withheldOffer, activeCart, experiment: session.experiment, offerObservations: session.offerObservations }, { shown: false, finalOrderValue: getCartTotal(activeCart) })]
      : session.offerObservations;
  const sessionGrowth = {
    growthSignals: growth.growthSignals,
    offer: growth.offer,
    offerGuardrails: growth.offerGuardrails,
    offerDecision: growth.offerDecision
  };

  return {
    ...session,
    ...sessionGrowth,
    status: statusForOffer(growth.offerDecision),
    activeCart,
    sessionEvents,
    offerObservations,
    auditEvents,
    updatedAt: now()
  };
}

export function reevaluateGrowthPlaybook(
  session: CommerceSession,
  products: Product[],
  rules: GrowthRule[]
): CommerceSession {
  if (session.activeCart.length === 0 || session.mandate || session.checkout) return session;
  const growth = evaluateGrowth(session, products, rules, session.sessionEvents, session.activeCart);
  const sessionGrowth = {
    growthSignals: growth.growthSignals,
    offer: growth.offer,
    offerGuardrails: growth.offerGuardrails,
    offerDecision: growth.offerDecision
  };

  return {
    ...session,
    ...sessionGrowth,
    status: statusForOffer(growth.offerDecision),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "merchant",
        action: "growth_playbook_reevaluated",
        summary: growth.offer
          ? `Updated playbook produced ${growth.offer.ruleId}.`
          : "Updated playbook produced no eligible bounded offer for this cart.",
        tone: growth.offer ? "success" : "info",
        data: { rules: rules.map(({ id, enabled }) => ({ id, enabled })), offer: growth.offer, source: growth.offer?.source, evidence: growth.offer?.evidence, boundaryId: growth.offer?.ruleId }
      })
    ],
    updatedAt: now()
  };
}

export function requestGrowthReview(
  session: CommerceSession,
  message: string,
  products: Product[],
  rules: GrowthRule[] = growthPolicyRepository.list()
): CommerceSession {
  if (session.activeCart.length === 0 || session.mandate || session.checkout) return session;
  const sessionEvents = [
    ...session.sessionEvents,
    createSessionEvent({ type: "chat_message", value: message })
  ];
  const growth = evaluateGrowth(session, products, rules, sessionEvents, session.activeCart);
  const sessionGrowth = {
    growthSignals: growth.growthSignals,
    offer: growth.offer,
    offerGuardrails: growth.offerGuardrails,
    offerDecision: growth.offerDecision
  };

  return {
    ...session,
    ...sessionGrowth,
    sessionEvents,
    status: statusForOffer(growth.offerDecision),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "buyer",
        action: "buyer_requested_growth_review",
        summary: message,
        tone: "warning",
        data: { message }
      }),
      createAuditEvent({
        actor: "system",
        action: growth.offerDecision === "blocked" && growth.offer?.approvalMode === "review_only" ? "growth_offer_logged_for_playbook_review" : growth.offerDecision === "blocked" ? "growth_offer_blocked" : growth.offer ? "growth_offer_validated" : "growth_offer_not_found",
        summary: growth.offer
          ? growth.offer.approvalMode === "review_only"
            ? "The requested deal is outside automatic execution, so it was withheld from the buyer and logged for merchant review."
            : growth.offer.safetySummary
          : growth.withheldOffer
            ? "Session is in the experiment control group, so an eligible offer was measured but not shown."
            : "No enabled Growth Playbook boundary matched the buyer's requested deal.",
        tone: growth.offerDecision === "blocked" ? "danger" : growth.offer ? "warning" : "info",
        data: {
          offer: growth.offer,
          withheldOffer: growth.withheldOffer,
          checks: growth.offerGuardrails.checks,
          source: growth.offer?.source ?? growth.withheldOffer?.source,
          opportunityReason: growth.offer?.opportunityReason ?? growth.withheldOffer?.opportunityReason,
          evidence: growth.offer?.evidence ?? growth.withheldOffer?.evidence,
          boundaryId: growth.offer?.ruleId ?? growth.withheldOffer?.ruleId
        }
      })
    ],
    updatedAt: now()
  };
}

export function decideMerchantOffer(session: CommerceSession, approved: boolean): CommerceSession {
  if (!session.offer || session.offerDecision !== "blocked" || session.offer.approvalMode !== "review_only") return session;

  const offerDecision: OfferDecision = approved ? "blocked" : "merchant_rejected";
  return {
    ...session,
    offerDecision,
    status: "awaiting_buyer_approval",
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "merchant",
        action: approved ? "merchant_marked_reviewed" : "merchant_rejected_offer",
        summary: approved
          ? "Merchant reviewed this withheld opportunity. Future sessions need a playbook change before buyers can see it."
          : "Merchant rejected the withheld opportunity. The original cart remains unchanged.",
        tone: approved ? "success" : "info",
        data: { offerId: session.offer.id, approvalMode: session.offer.approvalMode, source: session.offer.source, evidence: session.offer.evidence, boundaryId: session.offer.ruleId }
      })
    ]
  };
}

export function decideBuyerOffer(session: CommerceSession, accepted: boolean): CommerceSession {
  if (!session.offer || session.offerDecision !== "available_to_buyer") return session;

  const activeCart = accepted ? session.offer.finalCart : session.activeCart;
  return {
    ...session,
    offerDecision: accepted ? "buyer_accepted" : "buyer_declined",
    status: "awaiting_buyer_approval",
    activeCart,
    mandate: null,
    checkout: null,
    payment: null,
    offerObservations: session.offerObservations.map((observation, index, all) =>
      index === all.length - 1 && observation.offerId === session.offer?.id
        ? { ...observation, accepted, finalOrderValue: getCartTotal(activeCart), recordedAt: now() }
        : observation
    ),
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "buyer",
        action: accepted ? "buyer_accepted_offer" : "buyer_declined_offer",
        summary: accepted
          ? `Buyer accepted the offer. Proposed cart is now ${formatINR(getCartTotal(activeCart))}.`
          : "Buyer declined the offer. The original cart remains unchanged.",
        tone: accepted ? "success" : "info",
        data: { offerId: session.offer.id, cart: activeCart, source: session.offer.source, evidence: session.offer.evidence, boundaryId: session.offer.ruleId }
      })
    ]
  };
}

export function continueWithoutOffer(session: CommerceSession): CommerceSession {
  if (!session.offer || session.offerDecision !== "available_to_buyer") return session;

  return {
    ...session,
    offerDecision: "buyer_declined",
    status: "awaiting_buyer_approval",
    activeCart: session.activeCart,
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "buyer",
        action: "buyer_continued_without_offer",
        summary: "Buyer continued with the selected product without waiting for or accepting a growth offer.",
        tone: "info",
        data: { offerId: session.offer.id }
      })
    ]
  };
}

export function approveFinalCart(session: CommerceSession, products: Product[]): CommerceSession {
  const cartGuardrails = validateCart(session.activeCart, products, session.recommendation.intent);
  if (!cartGuardrails.passed) {
    return {
      ...session,
      status: "checkout_blocked",
      updatedAt: now(),
      auditEvents: [
        ...session.auditEvents,
        createAuditEvent({
          actor: "system",
          action: "buyer_approval_blocked",
          summary: cartGuardrails.checks.find((check) => !check.passed)?.reason ?? "The cart failed a guardrail.",
          tone: "danger",
          data: { checks: cartGuardrails.checks }
        })
      ]
    };
  }

  const mandate = createMandate(session.recommendation.intent, session.activeCart);
  return {
    ...session,
    mandate,
    status: "buyer_approved",
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "buyer",
        action: "buyer_approved_final_cart",
        summary: `Buyer approved ${formatINR(mandate.approvedAmount)} for exact cart ${mandate.cartHash}.`,
        tone: "success",
        data: { mandateId: mandate.id, cart: session.activeCart }
      })
    ]
  };
}

export function checkCheckout(session: CommerceSession, products: Product[]): GuardrailResult {
  const mandateChecks = validateMandateForCheckout(session.mandate, session.activeCart, products);
  const inventoryChecks = validateCheckoutInventory(session.activeCart, products);
  const checks = [...mandateChecks.checks, ...inventoryChecks.checks];
  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export function recordCheckoutBlocked(session: CommerceSession, checks: GuardrailResult): CommerceSession {
  return {
    ...session,
    status: "checkout_blocked",
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "system",
        action: "checkout_blocked",
        summary: checks.checks.find((check) => !check.passed)?.reason ?? "Checkout was blocked by guardrails.",
        tone: "danger",
        data: { checks: checks.checks }
      })
    ]
  };
}

export function recordCheckoutResult(session: CommerceSession, result: CheckoutResult): CommerceSession {
  const mandate = session.mandate
    ? {
        ...session.mandate,
        usedAt: result.ok ? now() : undefined,
        razorpayOrderId: result.orderId
      }
    : null;

  return {
    ...session,
    mandate,
    checkout: result,
    offerObservations: session.offerObservations.map((observation, index, all) =>
      index === all.length - 1
        ? { ...observation, checkoutStarted: result.ok, finalOrderValue: result.amount ?? getCartTotal(session.activeCart), recordedAt: now() }
        : observation
    ),
    status: result.ok ? "checkout_complete" : "checkout_blocked",
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: result.provider === "razorpay_test" ? "razorpay" : "system",
        action: result.ok ? "checkout_order_created" : "checkout_order_failed",
        summary: result.message,
        tone: result.ok ? "success" : "danger",
        data: result
      })
    ]
  };
}

export function recordPaymentVerification(session: CommerceSession, result: PaymentVerificationResult): CommerceSession {
  return {
    ...session,
    payment: result,
    offerObservations: session.offerObservations.map((observation, index, all) =>
      index === all.length - 1
        ? { ...observation, purchased: result.ok, recordedAt: now() }
        : observation
    ),
    status: result.ok ? "payment_complete" : "checkout_complete",
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "razorpay",
        action: result.ok ? "payment_signature_verified" : "payment_verification_failed",
        summary: result.message,
        tone: result.ok ? "success" : "danger",
        data: result
      })
    ]
  };
}

export function overrideProductPrice(session: CommerceSession, productId: string, amount: number): CommerceSession {
  return {
    ...session,
    priceOverrides: { ...session.priceOverrides, [productId]: amount },
    updatedAt: now(),
    auditEvents: [
      ...session.auditEvents,
      createAuditEvent({
        actor: "system",
        action: "catalog_price_changed",
        summary: `Catalog price for ${productId} changed after cart creation. Existing buyer approval must be checked again.`,
        tone: "warning",
        data: { productId, amount }
      })
    ]
  };
}
