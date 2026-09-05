import { getCartTotal, getCurrentCartSnapshot } from "@/lib/cart";
import { createCartHash } from "@/lib/mandates/cartHash";
import type { BuyerIntent, CartItem, GuardrailCheck, GuardrailResult, Mandate, Product } from "@/lib/types";

export function validateCart(items: CartItem[], products: Product[], intent: BuyerIntent): GuardrailResult {
  const checks: GuardrailCheck[] = [];
  const total = getCartTotal(items);

  checks.push({
    name: "Cart items",
    passed: items.length > 0,
    reason: items.length > 0 ? "Cart contains at least one recommended item." : "Checkout requires at least one approved cart item."
  });

  checks.push({
    name: "Budget",
    passed: total <= intent.maxAmount,
    reason: total <= intent.maxAmount ? "Cart total stays within buyer budget." : "Cart total exceeds buyer budget."
  });

  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    checks.push({
      name: `Stock: ${item.productId}`,
      passed: Boolean(product && product.stock >= item.quantity),
      reason: product && product.stock >= item.quantity ? "Requested quantity is available." : "Product is out of stock or quantity is unavailable."
    });

    checks.push({
      name: `Category: ${item.productId}`,
      passed: Boolean(product && intent.allowedCategories.includes(product.category)),
      reason: product && intent.allowedCategories.includes(product.category) ? "Product category is allowed." : "Product category is not allowed by the buyer mandate."
    });

    checks.push({
      name: `Amount: ${item.productId}`,
      passed: Boolean(product && item.unitAmount === product.price),
      reason: product && item.unitAmount === product.price ? "Line item amount matches catalog price." : "Line item amount differs from current catalog price."
    });
  }

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export function validateMandateForCheckout(mandate: Mandate | null, currentItems: CartItem[], products: Product[]): GuardrailResult {
  const checks: GuardrailCheck[] = [];

  checks.push({
    name: "Approval exists",
    passed: Boolean(mandate?.approvedAt),
    reason: mandate?.approvedAt ? "Buyer approved this cart." : "Checkout requires buyer approval."
  });

  if (!mandate) {
    return { passed: false, checks };
  }

  const now = Date.now();
  const expiresAt = mandate.expiresAt ? Date.parse(mandate.expiresAt) : 0;
  checks.push({
    name: "Approval expiry",
    passed: Boolean(expiresAt && expiresAt > now),
    reason: expiresAt && expiresAt > now ? "Approval is still valid." : "Approval has expired."
  });

  const currentSnapshot = getCurrentCartSnapshot(currentItems, products);
  const currentHash = createCartHash(currentSnapshot, mandate.approvedAmount);
  checks.push({
    name: "Cart integrity",
    passed: currentHash === mandate.cartHash,
    reason: currentHash === mandate.cartHash ? "Current cart matches the approved cart." : "Cart or amount changed after approval."
  });

  for (const item of currentItems) {
    const product = products.find((candidate) => candidate.id === item.productId);
    checks.push({
      name: `Checkout amount: ${item.productId}`,
      passed: Boolean(product && item.unitAmount === product.price),
      reason: product && item.unitAmount === product.price
        ? "Submitted checkout line amount matches the current catalog price."
        : "Submitted checkout line amount differs from the current catalog price."
    });
  }

  checks.push({
    name: "Duplicate checkout",
    passed: !mandate.usedAt,
    reason: mandate.usedAt ? "This approval has already been used for checkout." : "Approval has not been used yet."
  });

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

export function validateCheckoutInventory(currentItems: CartItem[], products: Product[]): GuardrailResult {
  const checks: GuardrailCheck[] = currentItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return {
      name: `Checkout stock: ${item.productId}`,
      passed: Boolean(product && product.stock >= item.quantity),
      reason: product && product.stock >= item.quantity
        ? "Live inventory still covers the approved cart."
        : "Inventory changed after approval; checkout must stop before payment."
    };
  });

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}
