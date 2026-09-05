import { describe, expect, it } from "vitest";
import { recommendCart } from "@/lib/agent/recommendCart";
import { createGiftSessionEvents } from "@/lib/events/sessionEvents";
import { generateGrowthOpportunities } from "@/lib/growth/detectOpportunity";
import { proposeBestOffer } from "@/lib/growth/proposeOffer";
import { validateOffer } from "@/lib/growth/validateOffer";
import { productRepository } from "@/lib/repositories/commerceRepositories";

const catalog = productRepository.list();

describe("growth offer engine", () => {
  it("proposes a gift add-on within the gift boundary from gift intent", () => {
    const recommendation = recommendCart("I need a gift for my brother under 1000");
    const candidates = generateGrowthOpportunities(createGiftSessionEvents(), recommendation.recommendedItems, recommendation.intent, catalog);
    const offer = proposeBestOffer(candidates, recommendation.recommendedItems, recommendation.intent, catalog);

    expect(offer?.ruleId).toBe("gift-experience-boundary");
    expect(offer?.approvalMode).toBe("auto_approved");
    expect(offer?.source).toBeDefined();
  });

  it("validates a safe offer that stays inside budget", () => {
    const recommendation = recommendCart("I need a gift for my brother under 1000");
    const candidates = generateGrowthOpportunities(createGiftSessionEvents(), recommendation.recommendedItems, recommendation.intent, catalog);
    const offer = proposeBestOffer(candidates, recommendation.recommendedItems, recommendation.intent, catalog);
    const result = validateOffer(offer, recommendation.intent, catalog);

    expect(result.passed).toBe(true);
  });

  it("blocks an offer that exceeds buyer budget", () => {
    const recommendation = recommendCart("I need a gift for my brother under 800");
    const candidates = generateGrowthOpportunities(createGiftSessionEvents(), recommendation.recommendedItems, recommendation.intent, catalog);
    const offer = proposeBestOffer(candidates, recommendation.recommendedItems, recommendation.intent, catalog);
    const result = validateOffer(offer, recommendation.intent, catalog);

    expect(result.passed).toBe(false);
  });
});
