import { catalog } from "@/data/catalog";
import { getCartTotal } from "@/lib/cart";
import type { BuyerIntent, CartItem, GrowthSignal, Product, SessionEvent } from "@/lib/types";

function textFromEvents(events: SessionEvent[]) {
  return events
    .filter((event): event is Extract<SessionEvent, { value: string }> => "value" in event)
    .map((event) => event.value.toLowerCase())
    .join(" ");
}

export function detectGrowthSignals(
  events: SessionEvent[],
  cart: CartItem[],
  intent: BuyerIntent,
  products: Product[] = catalog
): GrowthSignal[] {
  const text = `${intent.raw} ${textFromEvents(events)}`.toLowerCase();
  const signals: GrowthSignal[] = [];
  const cartProductIds = new Set(cart.map((item) => item.productId));

  if (["gift", "brother", "birthday", "present"].some((term) => text.includes(term))) {
    signals.push({
      id: "signal_gift_intent",
      type: "gift_intent",
      summary: "Buyer language suggests this is a gift purchase.",
      confidence: 0.91
    });
  }

  if ((text.includes("routine") || text.includes("day")) && !cartProductIds.has("sunscreen-light-50") && getCartTotal(cart) < intent.maxAmount) {
    signals.push({
      id: "signal_routine_gap",
      type: "routine_gap",
      summary: "Buyer is building a routine and the cart does not include sunscreen.",
      confidence: 0.72
    });
  }

  const selectedProducts = products.filter((product) => cartProductIds.has(product.id));
  const hasConfiguredCompanion = selectedProducts.some((product) =>
    product.crossSellIds.some((crossSellId) => !cartProductIds.has(crossSellId) && products.some((candidate) => candidate.id === crossSellId && candidate.stock > 0))
  );
  if (hasConfiguredCompanion) {
    signals.push({
      id: "signal_catalog_cross_sell",
      type: "catalog_cross_sell",
      summary: "The selected catalog product has an in-stock companion configured by the merchant.",
      confidence: 1
    });
  }

  if (cartProductIds.has("cleanser-oily-100") && cartProductIds.has("moisturizer-gel-50")) {
    signals.push({
      id: "signal_bundle_opportunity",
      type: "bundle_opportunity",
      summary: "Cart contains separate items that map to a curated starter bundle.",
      confidence: 0.88
    });
  }

  if (events.some((event) => event.type === "checkout_idle" && event.seconds >= 45)) {
    signals.push({
      id: "signal_checkout_hesitation",
      type: "checkout_hesitation",
      summary: "Buyer paused at checkout long enough to review a merchant-approved offer.",
      confidence: 0.58
    });
  }

  return signals;
}
