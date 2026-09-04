import { historicalCommerceEvents } from "@/data/historicalEvents";
import type { GrowthEvidence, SessionEvent } from "@/lib/types";

export type AssociationPattern = {
  antecedentProductId: string;
  consequentProductId: string;
  support: number;
  confidence: number;
  lift: number;
  observationCount: number;
  evidence: GrowthEvidence;
};

function basketFromEvents(events: SessionEvent[]) {
  return Array.from(
    new Set(
      events
        .filter((event): event is Extract<SessionEvent, { productId: string }> => "productId" in event)
        .filter((event) => event.type === "add_to_cart")
        .map((event) => event.productId)
    )
  );
}

export function analyzeCommercePatterns(
  sessions: SessionEvent[][] = historicalCommerceEvents,
  minimumObservations = 8
): AssociationPattern[] {
  const baskets = sessions.map(basketFromEvents).filter((basket) => basket.length > 0);
  const observationCount = baskets.length;
  if (observationCount < minimumObservations) return [];

  const productCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();

  for (const basket of baskets) {
    for (const productId of basket) {
      productCounts.set(productId, (productCounts.get(productId) ?? 0) + 1);
    }

    for (const antecedent of basket) {
      for (const consequent of basket) {
        if (antecedent === consequent) continue;
        const key = `${antecedent}->${consequent}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .map(([key, pairCount]) => {
      const [antecedentProductId, consequentProductId] = key.split("->");
      const antecedentCount = productCounts.get(antecedentProductId) ?? 0;
      const consequentCount = productCounts.get(consequentProductId) ?? 0;
      const support = pairCount / observationCount;
      const confidence = antecedentCount ? pairCount / antecedentCount : 0;
      const consequentSupport = consequentCount / observationCount;
      const lift = consequentSupport ? confidence / consequentSupport : 0;
      const evidence: GrowthEvidence = {
        explanation: `Seed basket data: ${pairCount} of ${antecedentCount} sessions containing ${antecedentProductId} also contained ${consequentProductId}.`,
        observationCount,
        support,
        confidence,
        lift,
        antecedentProductIds: [antecedentProductId],
        consequentProductId
      };

      return { antecedentProductId, consequentProductId, support, confidence, lift, observationCount, evidence };
    })
    .filter((pattern) => pattern.support > 0 && pattern.confidence > 0)
    .sort((a, b) => b.lift - a.lift || b.confidence - a.confidence || b.support - a.support);
}

export function insufficientPatternEvidence(observationCount: number): GrowthEvidence {
  return {
    explanation: `Insufficient aggregate history: only ${observationCount} observed basket${observationCount === 1 ? "" : "s"}.`,
    observationCount
  };
}
