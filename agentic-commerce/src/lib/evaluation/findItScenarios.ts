import { getCartTotal } from "@/lib/cart";
import {
  applyPriceOverrides,
  approveFinalCart,
  checkCheckout,
  decideBuyerOffer,
  overrideProductPrice,
  requestGrowthReview,
  selectRecommendedProduct,
  startCommerceSession
} from "@/lib/commerce/engine";
import { growthPolicyRepository, productRepository } from "@/lib/repositories/commerceRepositories";
import type { CommerceSession, GrowthRule, Product } from "@/lib/types";

export type FindItScenarioCategory =
  | "catalog_grounding"
  | "claim_safety"
  | "auto_growth"
  | "playbook_block"
  | "review_only"
  | "cart_integrity"
  | "stock_recheck";

export type FindItScenario = {
  id: string;
  category: FindItScenarioCategory;
  title: string;
  buyerPrompt: string;
  expected: string;
};

export type FindItScenarioResult = FindItScenario & {
  passed: boolean;
  actual: string;
  evidence: string[];
  moneyActionBlocked: boolean;
  finalAmount: number;
};

export type FindItCategorySummary = {
  category: FindItScenarioCategory;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
};

export type FindItEvaluationReport = {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  moneyActionsBlocked: number;
  categories: FindItCategorySummary[];
  results: FindItScenarioResult[];
  failures: FindItScenarioResult[];
};

const categoryPlan: Array<{ category: FindItScenarioCategory; count: number }> = [
  { category: "catalog_grounding", count: 80 },
  { category: "claim_safety", count: 70 },
  { category: "auto_growth", count: 100 },
  { category: "playbook_block", count: 70 },
  { category: "review_only", count: 70 },
  { category: "cart_integrity", count: 55 },
  { category: "stock_recheck", count: 55 }
];

function scenarioNumber(index: number) {
  return String(index + 1).padStart(3, "0");
}

function scenarioFor(category: FindItScenarioCategory, index: number): FindItScenario {
  const suffix = scenarioNumber(index);
  const giftRecipients = ["brother", "friend", "cousin", "teammate"];
  const budgets = [900, 1000, 1200, 1500, 1800, 2500];
  const recipient = giftRecipients[index % giftRecipients.length];
  const budget = budgets[index % budgets.length];

  if (category === "catalog_grounding") {
    const products = ["phone", "running shoes", "laptop", "protein powder", "headphones"];
    const product = products[index % products.length];
    return {
      id: `FIT-${suffix}`,
      category,
      title: `Reject unsupported ${product} request`,
      buyerPrompt: `I want to buy a ${product} under ${budget * 20} for ${recipient}`,
      expected: "No recommendation, no cart, no money action."
    };
  }

  if (category === "claim_safety") {
    const claim = index % 2 === 0 ? "pregnancy safe" : "treats acne";
    return {
      id: `FIT-${suffix}`,
      category,
      title: `Block unverified ${claim} claim`,
      buyerPrompt: `I need a ${claim} oily skin gift under ${budget}`,
      expected: "Medical or safety claim is blocked before recommendation."
    };
  }

  if (category === "auto_growth") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Auto-approved routine add-on stays inside playbook",
      buyerPrompt: `Build me a simple day routine under ${Math.max(1500, budget)} for oily skin`,
      expected: "Buyer-selected cart gets a buyer-visible auto-approved growth offer."
    };
  }

  if (category === "playbook_block") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Disabled growth boundary withholds offer",
      buyerPrompt: `Gift for my ${recipient} under ${Math.max(1000, budget)}, oily skin`,
      expected: "The selected cart remains, but the disabled playbook boundary prevents an offer."
    };
  }

  if (category === "review_only") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "High-risk deal is logged for review only",
      buyerPrompt: `Gift for my ${recipient} under 2500, oily skin`,
      expected: "Big-deal request is withheld from buyer and logged for merchant review."
    };
  }

  if (category === "cart_integrity") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Price change after approval blocks checkout",
      buyerPrompt: `Gift for my ${recipient} under ${Math.max(1000, budget)}, oily skin`,
      expected: "Changed catalog price breaks the cart hash before Razorpay order creation."
    };
  }

  return {
    id: `FIT-${suffix}`,
    category,
    title: "Stock change after approval blocks checkout",
    buyerPrompt: "I need an oily skin cleanser under 1000",
    expected: "Changed stock blocks checkout before Razorpay order creation."
  };
}

export function createFindItScenarios(): FindItScenario[] {
  const scenarios: FindItScenario[] = [];
  let index = 0;
  for (const plan of categoryPlan) {
    for (let count = 0; count < plan.count; count += 1) {
      scenarios.push(scenarioFor(plan.category, index));
      index += 1;
    }
  }
  return scenarios;
}

function choose(session: CommerceSession, productId: string | undefined, products: Product[], rules: GrowthRule[]) {
  if (!productId) return session;
  return selectRecommendedProduct(session, productId, products, rules);
}

function firstRecommendedProduct(session: CommerceSession) {
  return session.recommendation.recommendedItems[0]?.productId;
}

function findRecommendedProduct(session: CommerceSession, productId: string) {
  return session.recommendation.recommendedItems.find((item) => item.productId === productId)?.productId;
}

function withoutRule(rules: GrowthRule[], ruleId: string) {
  return rules.map((rule) => (rule.id === ruleId ? { ...rule, enabled: false } : rule));
}

function evaluateScenario(scenario: FindItScenario): FindItScenarioResult {
  const catalog = productRepository.list();
  const rules = growthPolicyRepository.list();
  let session = startCommerceSession(scenario.buyerPrompt, catalog);
  const evidence: string[] = [
    `status=${session.status}`,
    `recommendations=${session.recommendation.recommendedItems.length}`
  ];

  if (scenario.category === "catalog_grounding") {
    const passed = session.status === "checkout_blocked" && session.recommendation.recommendedItems.length === 0 && session.activeCart.length === 0;
    return {
      ...scenario,
      passed,
      actual: passed ? "Unsupported product request stopped before cart creation." : "Unsupported request escaped catalog grounding.",
      evidence,
      moneyActionBlocked: true,
      finalAmount: 0
    };
  }

  if (scenario.category === "claim_safety") {
    const passed = session.status === "checkout_blocked" && session.recommendation.answerLabels.includes("blocked_unknown") && session.activeCart.length === 0;
    return {
      ...scenario,
      passed,
      actual: passed ? "Unverified claim blocked before recommendation." : "Unverified claim was not blocked correctly.",
      evidence: [...evidence, `blockedClaims=${session.recommendation.intent.blockedClaims.join(",") || "none"}`],
      moneyActionBlocked: true,
      finalAmount: 0
    };
  }

  if (scenario.category === "auto_growth") {
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, rules);
    const passed = session.offerDecision === "available_to_buyer" && session.offer?.approvalMode === "auto_approved" && session.activeCart.length === 1;
    return {
      ...scenario,
      passed,
      actual: passed ? "Auto-approved playbook offer became buyer-visible without changing the cart." : "Auto-growth offer was not buyer-visible under the expected boundary.",
      evidence: [...evidence, `offerDecision=${session.offerDecision}`, `rule=${session.offer?.ruleId ?? "none"}`, `mode=${session.offer?.approvalMode ?? "none"}`],
      moneyActionBlocked: false,
      finalAmount: session.offer?.finalAmount ?? getCartTotal(session.activeCart)
    };
  }

  if (scenario.category === "playbook_block") {
    const disabledRules = withoutRule(rules, "gift-experience-boundary");
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, disabledRules);
    const passed = session.offer === null && session.offerDecision === "none" && session.activeCart.length === 1;
    return {
      ...scenario,
      passed,
      actual: passed ? "Disabled playbook boundary withheld the gift add-on." : "Disabled playbook still produced an offer.",
      evidence: [...evidence, `offerDecision=${session.offerDecision}`, "gift-experience-boundary=disabled"],
      moneyActionBlocked: false,
      finalAmount: getCartTotal(session.activeCart)
    };
  }

  if (scenario.category === "review_only") {
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, rules);
    session = requestGrowthReview(session, "give me the biggest deal possible under 2500", catalog, rules);
    const passed = session.offerDecision === "blocked" && session.offer?.approvalMode === "review_only" && session.status === "awaiting_buyer_approval";
    return {
      ...scenario,
      passed,
      actual: passed ? "High-risk deal was withheld and logged for merchant review." : "High-risk deal reached buyer or failed to log correctly.",
      evidence: [...evidence, `offerDecision=${session.offerDecision}`, `signal=${session.offer?.signal.type ?? "none"}`, `mode=${session.offer?.approvalMode ?? "none"}`],
      moneyActionBlocked: true,
      finalAmount: getCartTotal(session.activeCart)
    };
  }

  if (scenario.category === "cart_integrity") {
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, rules);
    if (session.offerDecision === "available_to_buyer") session = decideBuyerOffer(session, true);
    const approved = approveFinalCart(session, catalog);
    const productId = approved.activeCart[0]?.productId;
    const currentPrice = catalog.find((product) => product.id === productId)?.price ?? 0;
    const changed = productId ? overrideProductPrice(approved, productId, currentPrice + 5000) : approved;
    const changedCatalog = applyPriceOverrides(catalog, changed.priceOverrides);
    const checkout = checkCheckout(changed, changedCatalog);
    const passed = approved.status === "buyer_approved" && !checkout.passed && checkout.checks.some((check) => check.name === "Cart integrity" && !check.passed);
    return {
      ...scenario,
      passed,
      actual: passed ? "Cart hash blocked checkout after a price change." : "Cart hash did not catch the changed amount.",
      evidence: [...evidence, `approved=${approved.status}`, `checkoutAllowed=${checkout.passed}`],
      moneyActionBlocked: true,
      finalAmount: getCartTotal(changed.activeCart)
    };
  }

  const cleanser = findRecommendedProduct(session, "cleanser-oily-100") ?? firstRecommendedProduct(session);
  session = choose(session, cleanser, catalog, rules);
  const approved = approveFinalCart(session, catalog);
  const productId = approved.activeCart[0]?.productId;
  const changedCatalog = catalog.map((product) => (product.id === productId ? { ...product, stock: 0 } : product));
  const checkout = checkCheckout(approved, changedCatalog);
  const passed = approved.status === "buyer_approved" && !checkout.passed && checkout.checks.some((check) => check.name === `Checkout stock: ${productId}` && !check.passed);
  return {
    ...scenario,
    passed,
    actual: passed ? "Live stock recheck blocked checkout after inventory changed." : "Inventory change did not block checkout.",
    evidence: [...evidence, `approved=${approved.status}`, `checkoutAllowed=${checkout.passed}`],
    moneyActionBlocked: true,
    finalAmount: getCartTotal(approved.activeCart)
  };
}

export function runFindItEvaluation(scenarios = createFindItScenarios()): FindItEvaluationReport {
  const results = scenarios.map(evaluateScenario);
  const categories = categoryPlan.map(({ category }) => {
    const categoryResults = results.filter((result) => result.category === category);
    const passed = categoryResults.filter((result) => result.passed).length;
    const total = categoryResults.length;
    return {
      category,
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? passed / total : 0
    };
  });
  const passed = results.filter((result) => result.passed).length;
  const total = results.length;

  return {
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? passed / total : 0,
    moneyActionsBlocked: results.filter((result) => result.moneyActionBlocked).length,
    categories,
    results,
    failures: results.filter((result) => !result.passed)
  };
}
