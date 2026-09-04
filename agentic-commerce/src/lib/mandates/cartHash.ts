import type { CartItem } from "@/lib/types";

export function createCartHash(items: CartItem[], approvedAmount: number) {
  const stable = [...items]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((item) => `${item.productId}:${item.quantity}:${item.unitAmount}`)
    .join("|");

  let hash = 0;
  const input = `${stable}:${approvedAmount}`;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
