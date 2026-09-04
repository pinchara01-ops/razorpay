import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/agent/parseIntent";
import { createMandate } from "@/lib/mandates/createMandate";
import { validateCart, validateMandateForCheckout } from "@/lib/guardrails/validateCart";
import { productRepository } from "@/lib/repositories/commerceRepositories";

const catalog = productRepository.list();

describe("cart guardrails", () => {
  it("allows a valid in-stock cart within budget", () => {
    const intent = parseIntent("starter routine under 1000");
    const result = validateCart([{ productId: "bundle-oily-starter", quantity: 1, unitAmount: 74900 }], catalog, intent);

    expect(result.passed).toBe(true);
  });

  it("blocks carts above budget", () => {
    const intent = parseIntent("starter routine under 500");
    const result = validateCart([{ productId: "bundle-oily-starter", quantity: 1, unitAmount: 74900 }], catalog, intent);

    expect(result.passed).toBe(false);
  });

  it("blocks out-of-stock products", () => {
    const intent = parseIntent("serum under 1000");
    const result = validateCart([{ productId: "serum-active-30", quantity: 1, unitAmount: 89900 }], catalog, intent);

    expect(result.passed).toBe(false);
  });

  it("blocks empty carts", () => {
    const intent = parseIntent("Is this safe during pregnancy and under 900?");
    const result = validateCart([], catalog, intent);

    expect(result.passed).toBe(false);
  });

  it("blocks checkout when the approved amount changes", () => {
    const intent = parseIntent("starter routine under 1000");
    const cart = [{ productId: "bundle-oily-starter", quantity: 1, unitAmount: 74900 }];
    const mandate = createMandate(intent, cart);
    const changedCatalog = catalog.map((product) => (product.id === "bundle-oily-starter" ? { ...product, price: 79900 } : product));

    const result = validateMandateForCheckout(mandate, cart, changedCatalog);

    expect(result.passed).toBe(false);
  });
});
