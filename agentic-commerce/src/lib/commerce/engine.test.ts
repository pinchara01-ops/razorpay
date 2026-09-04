import { describe, expect, it } from "vitest";
import {
  applyPriceOverrides,
  approveFinalCart,
  checkCheckout,
  decideBuyerOffer,
  decideMerchantOffer,
  getClarifyingQuestion,
  overrideProductPrice,
  reevaluateGrowthPlaybook,
  selectRecommendedProduct,
  startCommerceSession
} from "@/lib/commerce/engine";
import { growthPolicyRepository, productRepository } from "@/lib/repositories/commerceRepositories";

const catalog = productRepository.list();
const growthRules = growthPolicyRepository.list();

function chooseFirstRecommendation(prompt: string) {
  const started = startCommerceSession(prompt, catalog);
  const productId = started.recommendation.recommendedItems[0]?.productId;
  if (!productId) throw new Error("Test scenario produced no catalog recommendation.");
  return { started, selected: selectRecommendedProduct(started, productId, catalog, growthRules) };
}

describe("commerce session engine", () => {
  it("waits for a real buyer selection before emitting cart events or growth logic", () => {
    const started = startCommerceSession("Gift for my brother under 1000, oily skin", catalog);

    expect(started.status).toBe("awaiting_product_choice");
    expect(started.activeCart).toEqual([]);
    expect(started.offer).toBeNull();
    expect(started.sessionEvents.some((event) => event.type === "add_to_cart")).toBe(false);

    const productId = started.recommendation.recommendedItems[0].productId;
    const selected = selectRecommendedProduct(started, productId, catalog, growthRules);

    expect(selected.activeCart).toHaveLength(1);
    expect(selected.sessionEvents.some((event) => event.type === "add_to_cart")).toBe(true);
    expect(selected.offerDecision).toBe("pending_merchant");
  });

  it("runs merchant approval, buyer offer choice, and exact-cart approval in order", () => {
    const { selected } = chooseFirstRecommendation("Gift for my brother under 1000, oily skin");
    const merchantApproved = decideMerchantOffer(selected, true);
    expect(merchantApproved.offerDecision).toBe("available_to_buyer");
    expect(merchantApproved.activeCart).toEqual(selected.activeCart);

    const buyerAccepted = decideBuyerOffer(merchantApproved, true);
    expect(buyerAccepted.offerDecision).toBe("buyer_accepted");
    expect(buyerAccepted.activeCart).toEqual(buyerAccepted.offer?.finalCart);

    const buyerApproved = approveFinalCart(buyerAccepted, catalog);
    expect(buyerApproved.status).toBe("buyer_approved");
    expect(buyerApproved.mandate?.approvedAmount).toBe(buyerApproved.offer?.finalAmount);
  });

  it("uses the merchant playbook as an input rather than a fixed internal rule", () => {
    const { started, selected } = chooseFirstRecommendation("Gift for my brother under 1000, oily skin");
    expect(selected.offer?.ruleId).toBe("gift-experience-boundary");

    const disabledGiftRule = growthRules.map((rule) =>
      rule.id === "gift-experience-boundary" ? { ...rule, enabled: false } : rule
    );
    const reevaluated = reevaluateGrowthPlaybook(selected, catalog, disabledGiftRule);

    expect(reevaluated.activeCart).toEqual(selected.activeCart);
    expect(reevaluated.offer).toBeNull();
    expect(reevaluated.offerDecision).toBe("none");
    expect(started.activeCart).toEqual([]);
  });

  it("makes a low-risk routine rule available only after product selection", () => {
    const started = startCommerceSession("Build me a simple day routine under 2000 for oily skin", catalog);
    const starter = started.recommendation.recommendedItems.find((item) => item.productId === "bundle-oily-starter");
    expect(starter).toBeTruthy();

    const selected = selectRecommendedProduct(started, starter!.productId, catalog, growthRules);
    expect(selected.offer?.approvalMode).toBe("pre_approved");
    expect(selected.offerDecision).toBe("available_to_buyer");
    expect(selected.activeCart).toEqual([starter]);
  });

  it("uses evidence-backed basket patterns for a non-gift cross-sell", () => {
    const started = startCommerceSession("I need an oily skin cleanser under 1000", catalog);
    const cleanser = started.recommendation.recommendedItems.find((item) => item.productId === "cleanser-oily-100");
    expect(cleanser).toBeTruthy();

    const selected = selectRecommendedProduct(started, cleanser!.productId, catalog, growthRules);
    expect(selected.growthSignals.some((signal) => signal.type === "catalog_cross_sell")).toBe(true);
    expect(selected.offer?.ruleId).toBe("standard-growth-boundary");
    expect(selected.offer?.source).toBe("historical_pattern");
    expect(selected.offerDecision).toBe("available_to_buyer");
  });

  it("rejects requests for products the merchant does not sell", () => {
    const session = startCommerceSession("I want to buy a phone under 50000", catalog);

    expect(session.status).toBe("checkout_blocked");
    expect(session.recommendation.recommendedItems).toEqual([]);
    expect(session.recommendation.explanation).toMatch(/does not have/i);
    expect(session.activeCart).toEqual([]);
    expect(session.offer).toBeNull();
  });

  it("does not label a product verified when its policy reference is missing", () => {
    const catalogWithMissingPolicy = [{ ...catalog[0], policyRefs: ["missing-policy"] }];
    const session = startCommerceSession("I need an oily skin cleanser under 1000", catalogWithMissingPolicy);

    expect(session.recommendation.recommendedItems).toEqual([]);
    expect(session.recommendation.rejectedItems[0]?.reason).toMatch(/policy evidence is missing/i);
    expect(session.status).toBe("checkout_blocked");
  });

  it("stops growth logic when a product claim is not verified", () => {
    const session = startCommerceSession("Pregnancy safe birthday gift under 900", catalog);

    expect(session.status).toBe("checkout_blocked");
    expect(session.recommendation.answerLabels).toContain("blocked_unknown");
    expect(session.growthSignals).toEqual([]);
    expect(session.offer).toBeNull();
  });

  it("blocks checkout when catalog price changes after buyer approval", () => {
    const { selected } = chooseFirstRecommendation("Gift for my brother under 1000, oily skin");
    const merchantApproved = decideMerchantOffer(selected, true);
    const buyerAccepted = decideBuyerOffer(merchantApproved, true);
    const buyerApproved = approveFinalCart(buyerAccepted, catalog);
    const productId = buyerApproved.activeCart[0].productId;
    const currentPrice = catalog.find((product) => product.id === productId)?.price ?? 0;
    const changed = overrideProductPrice(buyerApproved, productId, currentPrice + 5000);
    const changedCatalog = applyPriceOverrides(catalog, changed.priceOverrides);
    const result = checkCheckout(changed, changedCatalog);

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.name === "Cart integrity")?.passed).toBe(false);
  });

  it("blocks checkout when stock changes after buyer approval", () => {
    const { selected } = chooseFirstRecommendation("I need an oily skin cleanser under 1000");
    const buyerApproved = approveFinalCart(selected, catalog);
    const productId = buyerApproved.activeCart[0].productId;
    const changedCatalog = catalog.map((product) => (product.id === productId ? { ...product, stock: 0 } : product));
    const result = checkCheckout(buyerApproved, changedCatalog);

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.name === `Checkout stock: ${productId}`)?.passed).toBe(false);
  });

  it("asks for missing information before starting the commerce pipeline", () => {
    expect(getClarifyingQuestion("I need a gift for my brother")).toMatch(/spend/i);
    expect(getClarifyingQuestion("I need something under 1000")).toMatch(/for you or a gift/i);
    expect(getClarifyingQuestion("Gift for my brother under 1000")).toBeNull();
  });
});
