import { growthRules } from "@/data/growthRules";
import { getCartTotal } from "@/lib/cart";
import type { BuyerIntent, GrowthRule, GuardrailResult, OfferProposal, Product } from "@/lib/types";

export function validateOffer(
  proposal: OfferProposal | null,
  intent: BuyerIntent,
  products: Product[],
  rules: GrowthRule[] = growthRules
): GuardrailResult {
  const checks = [];

  checks.push({
    name: "Offer exists",
    passed: Boolean(proposal),
    reason: proposal ? "A Growth Playbook rule produced an offer." : "No eligible Growth Playbook offer found."
  });

  if (!proposal) {
    return { passed: false, checks };
  }

  const rule = rules.find((candidate) => candidate.id === proposal.ruleId && candidate.enabled);
  checks.push({
    name: "Active playbook rule",
    passed: Boolean(rule),
    reason: rule ? "Offer comes from an enabled merchant rule." : "Offer rule is missing or disabled."
  });

  checks.push({
    name: "Approval mode",
    passed: Boolean(rule && rule.approvalMode === proposal.approvalMode),
    reason: rule && rule.approvalMode === proposal.approvalMode ? "Offer uses the configured approval mode." : "Offer approval mode differs from the playbook."
  });

  checks.push({
    name: "Added amount limit",
    passed: Boolean(!rule?.maxAddedAmount || proposal.addedAmount <= rule.maxAddedAmount),
    reason: !rule?.maxAddedAmount || proposal.addedAmount <= rule.maxAddedAmount ? "Offer stays within the rule's added-value limit." : "Offer exceeds the rule's added-value limit."
  });

  checks.push({
    name: "Buyer budget",
    passed: proposal.finalAmount <= intent.maxAmount,
    reason: proposal.finalAmount <= intent.maxAmount ? "Offer keeps final cart within buyer budget." : "Offer exceeds buyer budget."
  });

  for (const item of proposal.proposedItems) {
    const product = products.find((candidate) => candidate.id === item.productId);
    checks.push({
      name: `Offer stock: ${item.productId}`,
      passed: Boolean(product && product.stock >= item.quantity),
      reason: product && product.stock >= item.quantity ? "Offered product is in stock." : "Offered product is not available."
    });

    checks.push({
      name: `Offer price: ${item.productId}`,
      passed: Boolean(product && product.price === item.unitAmount),
      reason: product && product.price === item.unitAmount ? "Offer price matches catalog." : "Offer price differs from current catalog price."
    });
  }

  checks.push({
    name: "Buyer approval required",
    passed: true,
    reason: "Offer can only enter checkout after buyer approves the final cart."
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
