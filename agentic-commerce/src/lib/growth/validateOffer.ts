import { growthPolicyRepository } from "@/lib/repositories/commerceRepositories";
import { getCartTotal } from "@/lib/cart";
import type { BuyerIntent, GrowthRule, GuardrailCheck, GuardrailResult, OfferProposal, Product } from "@/lib/types";

function productMarginPercent(itemProduct: Product, unitAmount: number) {
  if (unitAmount <= 0) return 0;
  return ((unitAmount - itemProduct.costPrice) / unitAmount) * 100;
}

export function validateOffer(
  proposal: OfferProposal | null,
  intent: BuyerIntent,
  products: Product[],
  rules: GrowthRule[] = growthPolicyRepository.list()
): GuardrailResult {
  const checks: GuardrailCheck[] = [];

  checks.push({
    name: "Offer exists",
    passed: Boolean(proposal),
    reason: proposal ? "A Growth Intelligence candidate became a bounded offer." : "No eligible growth opportunity found."
  });

  if (!proposal) {
    return { passed: false, checks };
  }

  const boundary = rules.find((candidate) => candidate.id === proposal.ruleId && candidate.enabled);
  checks.push({
    name: "Active playbook boundary",
    passed: Boolean(boundary),
    reason: boundary ? "Offer was checked against an enabled merchant boundary." : "Offer boundary is missing or disabled."
  });

  checks.push({
    name: "Allowed offer type",
    passed: Boolean(boundary?.allowedOfferTypes.includes(proposal.offerType)),
    reason: boundary?.allowedOfferTypes.includes(proposal.offerType)
      ? "Offer type is allowed by the playbook boundary."
      : "Offer type is outside the playbook boundary."
  });

  checks.push({
    name: "Approval mode",
    passed: Boolean(boundary && boundary.approvalByRisk[proposal.riskLevel] === proposal.approvalMode),
    reason: boundary && boundary.approvalByRisk[proposal.riskLevel] === proposal.approvalMode
      ? "Offer uses the approval mode required for its risk level."
      : "Offer approval mode differs from the risk boundary."
  });

  checks.push({
    name: "Added amount limit",
    passed: Boolean(!boundary?.maxAddedAmount || proposal.addedAmount <= boundary.maxAddedAmount),
    reason: !boundary?.maxAddedAmount || proposal.addedAmount <= boundary.maxAddedAmount
      ? "Offer stays within the added-value limit."
      : "Offer exceeds the added-value limit."
  });

  checks.push({
    name: "Minimum cart amount",
    passed: Boolean(!boundary?.minCartAmount || proposal.finalAmount - proposal.addedAmount >= boundary.minCartAmount),
    reason: !boundary?.minCartAmount || proposal.finalAmount - proposal.addedAmount >= boundary.minCartAmount
      ? "Original cart meets any minimum-cart boundary."
      : "Original cart is below the minimum-cart boundary."
  });

  checks.push({
    name: "Buyer budget",
    passed: proposal.finalAmount <= intent.maxAmount,
    reason: proposal.finalAmount <= intent.maxAmount ? "Offer keeps final cart within buyer budget." : "Offer exceeds buyer budget."
  });

  if (proposal.proposedItems.length === 0 && proposal.offerType !== "discount") {
    checks.push({
      name: "Proposed items",
      passed: false,
      reason: "Non-discount offers must propose at least one concrete product."
    });
  }

  for (const item of proposal.proposedItems) {
    const product = products.find((candidate) => candidate.id === item.productId);
    checks.push({
      name: `Allowed category: ${item.productId}`,
      passed: Boolean(product && boundary?.allowedCategories.includes(product.category)),
      reason: product && boundary?.allowedCategories.includes(product.category)
        ? "Offered product category is allowed."
        : "Offered product category is outside the playbook boundary."
    });

    checks.push({
      name: `Offer stock: ${item.productId}`,
      passed: Boolean(!boundary?.constraints.productMustBeInStock || (product && product.stock >= item.quantity)),
      reason: !boundary?.constraints.productMustBeInStock || (product && product.stock >= item.quantity)
        ? "Offered product is in stock."
        : "Offered product is not available."
    });

    checks.push({
      name: `Offer price: ${item.productId}`,
      passed: Boolean(product && product.price === item.unitAmount),
      reason: product && product.price === item.unitAmount ? "Offer price matches catalog." : "Offer price differs from current catalog price."
    });

    checks.push({
      name: `Offer margin: ${item.productId}`,
      passed: Boolean(product && productMarginPercent(product, item.unitAmount) >= (boundary?.minMarginPercent ?? 0)),
      reason: product && productMarginPercent(product, item.unitAmount) >= (boundary?.minMarginPercent ?? 0)
        ? "Offered product meets the merchant margin boundary."
        : "Offered product falls below the merchant margin boundary."
    });
  }

  checks.push({
    name: "Buyer approval required",
    passed: Boolean(boundary?.constraints.buyerApprovalRequired),
    reason: boundary?.constraints.buyerApprovalRequired
      ? "Offer can only enter checkout after buyer approves the final cart."
      : "Playbook boundary must require buyer approval."
  });

  checks.push({
    name: "Non-manipulative message",
    passed: !proposal.merchantScript.toLowerCase().includes("only today") && !proposal.merchantScript.toLowerCase().includes("hurry"),
    reason: "Offer avoids fake urgency or pressure language."
  });

  checks.push({
    name: "Cart has value",
    passed: getCartTotal(proposal.finalCart) > 0,
    reason: "Final cart has a payable amount."
  });

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}
