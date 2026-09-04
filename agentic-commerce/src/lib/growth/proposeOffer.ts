import { growthRules } from "@/data/growthRules";
import { getCartTotal } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import type { BuyerIntent, CartItem, GrowthRule, GrowthSignal, OfferProposal, Product } from "@/lib/types";

function cartHasProduct(cart: CartItem[], productId: string) {
  return cart.some((item) => item.productId === productId);
}

function buildCrossSellProposal(rule: GrowthRule, signal: GrowthSignal, cart: CartItem[], intent: BuyerIntent, products: Product[]): OfferProposal | null {
  if (!rule.productId || cartHasProduct(cart, rule.productId)) return null;
  const product = products.find((candidate) => candidate.id === rule.productId);
  if (!product) return null;

  const proposedItem = {
    productId: product.id,
    quantity: 1,
    unitAmount: product.price
  };
  const finalCart = [...cart, proposedItem];
  const finalAmount = getCartTotal(finalCart);
  const addedAmount = product.price;

  return {
    id: `offer_${rule.id}`,
    ruleId: rule.id,
    signal,
    offerType: rule.offerType,
    approvalMode: rule.approvalMode,
    riskLevel: rule.riskLevel,
    proposedItems: [proposedItem],
    finalCart,
    addedAmount,
    finalAmount,
    merchantScript: `Growth moment spotted. ${signal.summary} The cart is ${formatINR(getCartTotal(cart))}, the buyer's limit is ${formatINR(intent.maxAmount)}, and ${product.name} keeps the proposed total at ${formatINR(finalAmount)}. Make this offer available?`,
    buyerMessage: `Add ${product.name} for ${formatINR(product.price)}? It is relevant to what you asked for and keeps the cart within ${formatINR(intent.maxAmount)}.`,
    safetySummary: `Offer comes from ${rule.name}, stays within buyer budget, requires buyer approval, and uses an in-stock configured add-on.`
  };
}

function buildBundleSwitchProposal(rule: GrowthRule, signal: GrowthSignal, cart: CartItem[], intent: BuyerIntent, products: Product[]): OfferProposal | null {
  if (!rule.replacementProductId) return null;
  const replacement = products.find((candidate) => candidate.id === rule.replacementProductId);
  if (!replacement || replacement.stock <= 0) return null;

  const replacementCart = [
    {
      productId: replacement.id,
      quantity: 1,
      unitAmount: replacement.price
    }
  ];
  const finalAmount = getCartTotal(replacementCart);

  return {
    id: `offer_${rule.id}`,
    ruleId: rule.id,
    signal,
    offerType: rule.offerType,
    approvalMode: rule.approvalMode,
    riskLevel: rule.riskLevel,
    proposedItems: replacementCart,
    finalCart: replacementCart,
    addedAmount: finalAmount - getCartTotal(cart),
    finalAmount,
    merchantScript: `Tiny revenue moment spotted. The buyer selected separate routine products. I can switch them to ${replacement.name} for ${formatINR(finalAmount)} while preserving the same starter-routine intent.`,
    buyerMessage: `Switch to ${replacement.name} for ${formatINR(finalAmount)}? It keeps the routine together in one curated bundle.`,
    safetySummary: `Bundle switch is configured in the Growth Playbook and still requires buyer approval before checkout.`
  };
}

export function proposeBestOffer(
  signals: GrowthSignal[],
  cart: CartItem[],
  intent: BuyerIntent,
  products: Product[],
  rules: GrowthRule[] = growthRules
): OfferProposal | null {
  for (const signal of signals) {
    const eligibleRules = rules.filter(
      (rule) =>
        rule.enabled &&
        rule.trigger === signal.type &&
        (!rule.whenProductIds || rule.whenProductIds.some((productId) => cartHasProduct(cart, productId)))
    );
    for (const rule of eligibleRules) {
      if (rule.minCartAmount && getCartTotal(cart) < rule.minCartAmount) continue;

      const proposal =
        rule.offerType === "bundle_switch"
          ? buildBundleSwitchProposal(rule, signal, cart, intent, products)
          : buildCrossSellProposal(rule, signal, cart, intent, products);

      if (proposal) return proposal;
    }
  }

  return null;
}
