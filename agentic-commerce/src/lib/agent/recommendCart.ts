import { catalog } from "@/data/catalog";
import { policies } from "@/data/policies";
import { parseIntent } from "@/lib/agent/parseIntent";
import type { CartItem, MerchantPolicy, Product, Recommendation } from "@/lib/types";

const ignoredTerms = new Set([
  "and", "anything", "buy", "for", "from", "have", "need", "please", "rupees", "something", "that", "the",
  "this", "under", "want", "with"
]);

function overlapScore(product: Product, terms: string[]) {
  const haystack = [...product.attributes, ...product.useCases, product.name, product.category].join(" ").toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function meaningfulTerms(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !ignoredTerms.has(term) && !/^\d+$/.test(term));
}

function hasPolicyEvidence(product: Product, merchantPolicies: MerchantPolicy[]) {
  return product.policyRefs.length > 0 && product.policyRefs.every((ref) => merchantPolicies.some((policy) => policy.id === ref));
}

export function recommendCart(
  rawIntent: string,
  products: Product[] = catalog,
  merchantPolicies: MerchantPolicy[] = policies
): Recommendation {
  const intent = parseIntent(rawIntent);

  if (intent.blockedClaims.length > 0) {
    return {
      intent,
      recommendedItems: [],
      rejectedItems: [],
      explanation: "The request includes a medical or safety claim the catalog does not verify. No product was recommended.",
      needsClarification: false,
      clarifyingQuestion: null,
      answerLabels: ["blocked_unknown"]
    };
  }

  const terms = Array.from(new Set([...meaningfulTerms(rawIntent), ...intent.constraints, intent.goal]));
  const ranked = products
    .map((product) => ({
      product,
      score:
        overlapScore(product, terms) +
        (product.category === "bundle" && ["gift purchase", "skincare routine"].includes(intent.goal) ? 2 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price);

  const eligible = ranked
    .filter(({ product, score }) =>
      score > 0 &&
      product.category !== "accessory" &&
      product.stock > 0 &&
      product.price <= intent.maxAmount &&
      hasPolicyEvidence(product, merchantPolicies)
    )
    .slice(0, 3);

  const recommendedItems: CartItem[] = eligible.map(({ product }) => ({
    productId: product.id,
    quantity: 1,
    unitAmount: product.price
  }));

  const rejectedItems = ranked
    .filter(({ product }) => !recommendedItems.some((item) => item.productId === product.id))
    .slice(0, 3)
    .map(({ product, score }) => ({
      productId: product.id,
      reason:
        product.stock <= 0
          ? "Out of stock."
          : product.price > intent.maxAmount
            ? "Would exceed the buyer's budget."
            : !hasPolicyEvidence(product, merchantPolicies)
              ? "Required merchant policy evidence is missing."
              : score === 0
                ? "Does not match the buyer's stated need."
                : "Available only as an add-on after a main product is chosen."
    }));

  return {
    intent,
    recommendedItems,
    rejectedItems,
    explanation: recommendedItems.length
      ? `Found ${recommendedItems.length} catalog-verified option${recommendedItems.length === 1 ? "" : "s"}. Nothing has been added to the cart yet.`
      : "GlowCart does not have an in-stock catalog item that matches this request and budget. No substitute was invented and nothing was added to the cart.",
    needsClarification: false,
    clarifyingQuestion: null,
    answerLabels: recommendedItems.length
      ? ["catalog_verified", "policy_verified", "inventory_verified", "agent_inference"]
      : ["blocked_unknown"]
  };
}
