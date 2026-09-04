import type { CartItem, Product } from "@/lib/types";

export function getCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.unitAmount * item.quantity, 0);
}

export function hydrateCartItems(items: CartItem[], products: Product[]) {
  return items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return {
      ...item,
      product
    };
  });
}

export function getCurrentCartSnapshot(items: CartItem[], products: Product[]): CartItem[] {
  return items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitAmount: product?.price ?? item.unitAmount
    };
  });
}
