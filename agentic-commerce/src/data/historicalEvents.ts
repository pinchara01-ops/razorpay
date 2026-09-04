import type { SessionEvent } from "@/lib/types";

function add(productId: string): SessionEvent {
  return { type: "add_to_cart", productId, timestamp: "2026-08-01T10:00:00.000Z" };
}

export const historicalCommerceEvents: SessionEvent[][] = [
  [add("cleanser-oily-100"), add("sunscreen-light-50")],
  [add("cleanser-oily-100"), add("sunscreen-light-50"), add("gift-card-note")],
  [add("cleanser-oily-100"), add("moisturizer-gel-50")],
  [add("cleanser-oily-100"), add("sunscreen-light-50")],
  [add("cleanser-oily-100"), add("sunscreen-light-50")],
  [add("moisturizer-gel-50"), add("cleanser-oily-100")],
  [add("moisturizer-gel-50"), add("bundle-oily-starter")],
  [add("moisturizer-gel-50"), add("sunscreen-light-50")],
  [add("bundle-oily-starter"), add("sunscreen-light-50")],
  [add("bundle-oily-starter"), add("sunscreen-light-50"), add("gift-card-note")],
  [add("bundle-oily-starter"), add("gift-card-note")],
  [add("bundle-oily-starter"), add("sunscreen-light-50")],
  [add("sunscreen-light-50"), add("cleanser-oily-100")],
  [add("sunscreen-light-50"), add("moisturizer-gel-50")],
  [add("bundle-complete-routine"), add("gift-card-note")],
  [add("bundle-complete-routine"), add("gift-card-note")],
  [add("cleanser-oily-100")],
  [add("moisturizer-gel-50")],
  [add("sunscreen-light-50")],
  [add("bundle-oily-starter")]
];
