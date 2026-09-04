import { describe, expect, it } from "vitest";
import { catalog } from "@/data/catalog";
import { recommendCart } from "@/lib/agent/recommendCart";
import { createGiftSessionEvents } from "@/lib/events/sessionEvents";
import { detectGrowthSignals } from "@/lib/growth/detectOpportunity";
import { proposeBestOffer } from "@/lib/growth/proposeOffer";
import { validateOffer } from "@/lib/growth/validateOffer";

describe("growth offer engine", () => {
  it("proposes a gift note cross-sell from gift intent", () => {
    const recommendation = recommendCart("I need a gift for my brother under 1000");
    const signals = detectGrowthSignals(createGiftSessionEvents(), recommendation.recommendedItems, recommendation.intent);
    const offer = proposeBestOffer(signals, recommendation.recommendedItems, recommendation.intent, catalog);

    expect(offer?.ruleId).toBe("gift-note-cross-sell");
    expect(offer?.approvalMode).toBe("live_merchant_approval");
  });

  it("validates a safe offer that stays inside budget", () => {
    const recommendation = recommendCart("I need a gift for my brother under 1000");
    const signals = detectGrowthSignals(createGiftSessionEvents(), recommendation.recommendedItems, recommendation.intent);
    const offer = proposeBestOffer(signals, recommendation.recommendedItems, recommendation.intent, catalog);
    const result = validateOffer(offer, recommendation.intent, catalog);

    expect(result.passed).toBe(true);
  });

  it("blocks an offer that exceeds buyer budget", () => {
    const recommendation = recommendCart("I need a gift for my brother under 800");
    const signals = detectGrowthSignals(createGiftSessionEvents(), recommendation.recommendedItems, recommendation.intent);
    const offer = proposeBestOffer(signals, recommendation.recommendedItems, recommendation.intent, catalog);
    const result = validateOffer(offer, recommendation.intent, catalog);

    expect(result.passed).toBe(false);
  });
});
