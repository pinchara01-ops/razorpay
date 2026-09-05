import { getCartTotal } from "@/lib/cart";
import { validateOffer } from "@/lib/growth/validateOffer";
import { growthPolicyRepository } from "@/lib/repositories/commerceRepositories";
import { formatINR } from "@/lib/money";
import type { BuyerIntent, GrowthOpportunityCandidate, GrowthRule, OfferProposal, Product } from "@/lib/types";

function valueScore(candidate: GrowthOpportunityCandidate) {
  const explicitDealScore = candidate.signal.type === "deal_request" ? 250 : 0;
  const evidenceScore = candidate.source === "historical_pattern" ? 100 : 0;
  const liftScore = (candidate.evidence.lift ?? 0) * 30;
  const confidenceScore = (candidate.evidence.confidence ?? candidate.signal.confidence) * 20;
  const marginScore = candidate.incrementalMarginPercent * 0.5;
  return explicitDealScore + evidenceScore + liftScore + confidenceScore + marginScore + Math.max(candidate.addedAmount, 0) / 10000;
}

function buildOffer(candidate: GrowthOpportunityCandidate, boundary: GrowthRule, intent: BuyerIntent, cartAmount: number): OfferProposal {
  const approvalMode = boundary.approvalByRisk[candidate.riskLevel];
  const primaryProduct = candidate.proposedItems[0]
    ? candidate.proposedItems[0].productId
    : "the proposed adjustment";
  const evidenceLabel = candidate.source === "historical_pattern"
    ? `evidence-backed from ${candidate.evidence.observationCount} seed observations`
    : "cold-start hypothesis";

  return {
    id: `offer_${candidate.id}_${boundary.id}`,
    ruleId: boundary.id,
    boundaryName: boundary.name,
    signal: candidate.signal,
    offerType: candidate.offerType,
    approvalMode,
    riskLevel: candidate.riskLevel,
    proposedItems: candidate.proposedItems,
    finalCart: candidate.finalCart,
    addedAmount: candidate.addedAmount,
    finalAmount: candidate.finalAmount,
    incrementalMarginPercent: candidate.incrementalMarginPercent,
    source: candidate.source,
    evidence: candidate.evidence,
    opportunityReason: candidate.reason,
    merchantScript: `Growth moment spotted. ${candidate.reason} This is ${evidenceLabel}, checked against ${boundary.name}. Current cart is ${formatINR(cartAmount)}, proposed total is ${formatINR(candidate.finalAmount)}, and incremental margin is ${Math.round(candidate.incrementalMarginPercent)}%. Make ${primaryProduct} available?`,
    buyerMessage: candidate.offerType === "bundle_switch"
      ? `Switch to the curated bundle for ${formatINR(candidate.finalAmount)}? It keeps the same shopping intent and stays within ${formatINR(intent.maxAmount)}.`
      : `Add a relevant item for ${formatINR(candidate.addedAmount)}? It stays within your ${formatINR(intent.maxAmount)} budget.`,
    safetySummary: `Opportunity source: ${evidenceLabel}. Boundary: ${boundary.name}. Buyer approval is required before any Razorpay order.`
  };
}

export function proposeBestOffer(
  candidates: GrowthOpportunityCandidate[],
  cart: { productId: string; quantity: number; unitAmount: number }[],
  intent: BuyerIntent,
  products: Product[],
  rules: GrowthRule[] = growthPolicyRepository.list()
): OfferProposal | null {
  const cartAmount = getCartTotal(cart);
  const ranked = [...candidates].sort((a, b) => valueScore(b) - valueScore(a));

  for (const candidate of ranked) {
    const eligibleBoundaries = rules
      .filter((rule) => rule.enabled && rule.allowedOfferTypes.includes(candidate.offerType))
      .sort((a, b) => a.allowedCategories.length - b.allowedCategories.length);
    for (const boundary of eligibleBoundaries) {
      const proposal = buildOffer(candidate, boundary, intent, cartAmount);
      if (validateOffer(proposal, intent, products, rules).passed) return proposal;
    }
  }

  return null;
}
