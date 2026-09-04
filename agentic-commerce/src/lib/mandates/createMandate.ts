import { getCartTotal } from "@/lib/cart";
import { createCartHash } from "@/lib/mandates/cartHash";
import type { BuyerIntent, CartItem, Mandate } from "@/lib/types";

let mandateCounter = 0;

export function createMandate(intent: BuyerIntent, cartSnapshot: CartItem[]): Mandate {
  mandateCounter += 1;
  const approvedAmount = getCartTotal(cartSnapshot);
  const approvedAt = new Date();
  const expiresAt = new Date(approvedAt.getTime() + 15 * 60 * 1000);

  return {
    id: `mandate_${mandateCounter.toString().padStart(4, "0")}`,
    userGoal: intent.goal,
    maxAmount: intent.maxAmount,
    allowedCategories: intent.allowedCategories,
    cartSnapshot,
    approvedAmount,
    cartHash: createCartHash(cartSnapshot, approvedAmount),
    approvedAt: approvedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}
