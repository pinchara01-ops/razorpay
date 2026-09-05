import { getCartTotal } from "@/lib/cart";
import { analyzeCommercePatterns } from "@/lib/growth/CommercePatternAnalyzer";
import { productRepository } from "@/lib/repositories/commerceRepositories";
import type { BuyerIntent, CartItem, GrowthOpportunityCandidate, GrowthSignal, Product, SessionEvent } from "@/lib/types";

function textFromEvents(events: SessionEvent[]) {
  return events
    .filter((event): event is Extract<SessionEvent, { value: string }> => "value" in event)
    .map((event) => event.value.toLowerCase())
    .join(" ");
}

function cartHasProduct(cart: CartItem[], productId: string) {
  return cart.some((item) => item.productId === productId);
}

function marginPercent(items: CartItem[], products: Product[]) {
  const revenue = getCartTotal(items);
  if (revenue <= 0) return 0;
  const cost = items.reduce((total, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return total + (product?.costPrice ?? item.unitAmount) * item.quantity;
  }, 0);
  return ((revenue - cost) / revenue) * 100;
}

function candidateMargin(items: CartItem[], products: Product[]) {
  return marginPercent(items, products);
}

function productItem(product: Product): CartItem {
  return { productId: product.id, quantity: 1, unitAmount: product.price };
}

function asksForBigDeal(text: string) {
  return /\b(discount|deal|offer|best value|premium|upgrade|bigger|biggest)\b/i.test(text);
}

export function generateGrowthOpportunities(
  events: SessionEvent[],
  cart: CartItem[],
  intent: BuyerIntent,
  products: Product[]
): GrowthOpportunityCandidate[] {
  const text = `${intent.raw} ${textFromEvents(events)}`.toLowerCase();
  const candidates: GrowthOpportunityCandidate[] = [];
  const cartProductIds = new Set(cart.map((item) => item.productId));
  const currentAmount = getCartTotal(cart);
  const hasGiftIntent = ["gift", "brother", "birthday", "present"].some((term) => text.includes(term));

  if (cart.length > 0 && asksForBigDeal(text)) {
    const premiumBundle = products.find(
      (product) =>
        product.category === "bundle" &&
        product.stock > 0 &&
        !cartHasProduct(cart, product.id) &&
        product.price > currentAmount &&
        product.price <= intent.maxAmount &&
        (product.useCases.some((useCase) => ["complete routine", "premium gift", "outdoor routine"].includes(useCase)) ||
          product.attributes.includes("bundle"))
    );

    if (premiumBundle) {
      const signal: GrowthSignal = {
        id: "signal_buyer_requested_big_deal",
        type: "deal_request",
        summary: "Buyer explicitly asked for a bigger deal or premium-value bundle.",
        confidence: 0.76,
        source: "cold_start_hypothesis",
        evidence: {
          explanation: "Heuristic from in-session buyer words such as discount, deal, offer, best value, premium, or upgrade.",
          observationCount: events.length
        }
      };
      const replacement = [productItem(premiumBundle)];
      candidates.push({
        id: `candidate_${signal.id}_${premiumBundle.id}`,
        signal,
        offerType: "bundle_switch",
        riskLevel: "high",
        proposedItems: replacement,
        finalCart: replacement,
        addedAmount: premiumBundle.price - currentAmount,
        finalAmount: premiumBundle.price,
        incrementalMarginPercent: candidateMargin(replacement, products),
        source: signal.source,
        evidence: signal.evidence,
        reason: "The buyer asked for a stronger deal, so the engine found a higher-value bundle but marks it high risk for merchant review."
      });
    }
  }

  if (hasGiftIntent) {
    const giftAddOn = products.find(
      (product) =>
        product.category === "accessory" &&
        product.stock > 0 &&
        product.useCases.some((useCase) => ["gift", "birthday"].some((term) => useCase.includes(term))) &&
        !cartProductIds.has(product.id)
    );
    if (giftAddOn) {
      const signal: GrowthSignal = {
        id: "signal_gift_intent",
        type: "gift_intent",
        summary: "Buyer language suggests this is a gift purchase.",
        confidence: 0.7,
        source: "cold_start_hypothesis",
        evidence: {
          explanation: "Heuristic from in-session buyer words: gift, birthday, brother, or present.",
          observationCount: events.length
        }
      };
      const proposedItems = [productItem(giftAddOn)];
      candidates.push({
        id: `candidate_${signal.id}_${giftAddOn.id}`,
        signal,
        offerType: "cross_sell",
        riskLevel: "low",
        proposedItems,
        finalCart: [...cart, ...proposedItems],
        addedAmount: giftAddOn.price,
        finalAmount: currentAmount + giftAddOn.price,
        incrementalMarginPercent: candidateMargin(proposedItems, products),
        source: signal.source,
        evidence: signal.evidence,
        reason: "The buyer is likely buying a gift, and this add-on improves the gift experience without changing the main product."
      });
    }
  }

  if ((text.includes("routine") || text.includes("day") || text.includes("outdoor")) && getCartTotal(cart) < intent.maxAmount) {
    const routineGap = products.find(
      (product) =>
        product.stock > 0 &&
        !cartProductIds.has(product.id) &&
        product.useCases.some((useCase) => useCase.includes("daily routine") || useCase.includes("outdoor routine"))
    );
    if (routineGap) {
      const signal: GrowthSignal = {
        id: "signal_routine_gap",
        type: "routine_gap",
        summary: "Buyer appears to be building a day routine and the cart has a missing routine step.",
        confidence: 0.64,
        source: "cold_start_hypothesis",
        evidence: {
          explanation: "Heuristic from in-session routine/day/outdoor language and catalog use-case tags.",
          observationCount: events.length
        }
      };
      const proposedItems = [productItem(routineGap)];
      candidates.push({
        id: `candidate_${signal.id}_${routineGap.id}`,
        signal,
        offerType: "cross_sell",
        riskLevel: "low",
        proposedItems,
        finalCart: [...cart, ...proposedItems],
        addedAmount: routineGap.price,
        finalAmount: currentAmount + routineGap.price,
        incrementalMarginPercent: candidateMargin(proposedItems, products),
        source: signal.source,
        evidence: signal.evidence,
        reason: "A routine shopper may need the next care step, so the engine suggests a tagged routine companion."
      });
    }
  }

  const patterns = analyzeCommercePatterns();
  if (patterns.length > 0) {
    for (const pattern of patterns) {
      if (!cartProductIds.has(pattern.antecedentProductId) || cartProductIds.has(pattern.consequentProductId)) continue;
      if (pattern.lift <= 1) continue;
      const consequent = products.find((product) => product.id === pattern.consequentProductId && product.stock > 0);
      if (!consequent) continue;
      if (!hasGiftIntent && consequent.category === "accessory" && consequent.useCases.includes("gift")) continue;
      const signal: GrowthSignal = {
        id: `signal_historical_${pattern.antecedentProductId}_${pattern.consequentProductId}`,
        type: "catalog_cross_sell",
        summary: "Historical basket data shows a product frequently bought with the selected item.",
        confidence: pattern.confidence,
        source: "historical_pattern",
        evidence: pattern.evidence
      };
      const proposedItems = [productItem(consequent)];
      candidates.push({
        id: `candidate_${signal.id}`,
        signal,
        offerType: "cross_sell",
        riskLevel: pattern.lift >= 1.1 ? "low" : "medium",
        proposedItems,
        finalCart: [...cart, ...proposedItems],
        addedAmount: consequent.price,
        finalAmount: currentAmount + consequent.price,
        incrementalMarginPercent: candidateMargin(proposedItems, products),
        source: signal.source,
        evidence: signal.evidence,
        reason: `This recommendation is backed by seed basket data with ${Math.round(pattern.confidence * 100)}% confidence and ${pattern.lift.toFixed(2)} lift.`
      });
    }
  }

  const selectedSkincare = cart
    .map((item) => products.find((product) => product.id === item.productId))
    .filter((product): product is Product => Boolean(product && product.category === "skincare"));
  const bundle = products.find(
    (product) =>
      product.category === "bundle" &&
      product.stock > 0 &&
      !cartHasProduct(cart, product.id) &&
      selectedSkincare.length >= 2 &&
      selectedSkincare.every((selected) => selected.useCases.some((useCase) => product.useCases.includes(useCase)))
  );
  if (bundle) {
    const signal: GrowthSignal = {
      id: "signal_bundle_opportunity",
      type: "bundle_opportunity",
      summary: "The cart contains separate items that can be replaced by a catalog bundle.",
      confidence: 0.68,
      source: "cold_start_hypothesis",
      evidence: {
        explanation: "Heuristic from catalog categories and shared use-case tags among selected items.",
        observationCount: events.length
      }
    };
    const replacement = [productItem(bundle)];
    candidates.push({
      id: `candidate_${signal.id}_${bundle.id}`,
      signal,
      offerType: "bundle_switch",
      riskLevel: "low",
      proposedItems: replacement,
      finalCart: replacement,
      addedAmount: bundle.price - currentAmount,
      finalAmount: bundle.price,
      incrementalMarginPercent: candidateMargin(replacement, products),
      source: signal.source,
      evidence: signal.evidence,
      reason: "The bundle preserves the same routine use case while simplifying the cart."
    });
  }

  if (events.some((event) => event.type === "checkout_idle" && event.seconds >= 45)) {
    const signal: GrowthSignal = {
      id: "signal_checkout_hesitation",
      type: "checkout_hesitation",
      summary: "Buyer paused at checkout long enough to review a merchant-approved intervention.",
      confidence: 0.45,
      source: "cold_start_hypothesis",
      evidence: {
        explanation: "Heuristic from this session's checkout idle event.",
        observationCount: events.length
      }
    };
    candidates.push({
      id: `candidate_${signal.id}`,
      signal,
      offerType: "discount",
      riskLevel: "high",
      proposedItems: [],
      finalCart: cart,
      addedAmount: 0,
      finalAmount: currentAmount,
      incrementalMarginPercent: 0,
      source: signal.source,
      evidence: signal.evidence,
      reason: "The buyer hesitated near checkout, but any discount still needs explicit merchant policy approval."
    });
  }

  return candidates.sort((a, b) => {
    const dealScore = (candidate: GrowthOpportunityCandidate) => candidate.signal.type === "deal_request" ? 2 : 0;
    const sourceScore = (candidate: GrowthOpportunityCandidate) => candidate.source === "historical_pattern" ? 1 : 0;
    return dealScore(b) - dealScore(a) || sourceScore(b) - sourceScore(a) || b.incrementalMarginPercent - a.incrementalMarginPercent || b.signal.confidence - a.signal.confidence;
  });
}

export function detectGrowthSignals(events: SessionEvent[], cart: CartItem[], intent: BuyerIntent, products: Product[] = productRepository.list()): GrowthSignal[] {
  return generateGrowthOpportunities(events, cart, intent, products).map((candidate) => candidate.signal);
}
