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
  | "stock_recheck"
  | "financial_adversarial";

export type FindItScenario = {
  id: string;
  category: FindItScenarioCategory;
  title: string;
  buyerPrompt: string;
  expected: string;
  risk: "low" | "medium" | "high" | "critical";
  attackType?: string;
};

export type FindItScenarioResult = FindItScenario & {
  passed: boolean;
  actual: string;
  evidence: string[];
  auditActions: string[];
  guardrailChecks: string[];
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
  { category: "catalog_grounding", count: 75 },
  { category: "claim_safety", count: 65 },
  { category: "auto_growth", count: 90 },
  { category: "playbook_block", count: 65 },
  { category: "review_only", count: 70 },
  { category: "cart_integrity", count: 55 },
  { category: "stock_recheck", count: 60 },
  { category: "financial_adversarial", count: 20 }
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
      expected: "No recommendation, no cart, no money action.",
      risk: "medium"
    };
  }

  if (category === "claim_safety") {
    const claim = index % 2 === 0 ? "pregnancy safe" : "treats acne";
    return {
      id: `FIT-${suffix}`,
      category,
      title: `Block unverified ${claim} claim`,
      buyerPrompt: `I need a ${claim} oily skin gift under ${budget}`,
      expected: "Medical or safety claim is blocked before recommendation.",
      risk: "high"
    };
  }

  if (category === "auto_growth") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Auto-approved routine add-on stays inside playbook",
      buyerPrompt: `Build me a simple day routine under ${Math.max(1500, budget)} for oily skin`,
      expected: "Buyer-selected cart gets a buyer-visible auto-approved growth offer.",
      risk: "low"
    };
  }

  if (category === "playbook_block") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Disabled growth boundary withholds offer",
      buyerPrompt: `Gift for my ${recipient} under ${Math.max(1000, budget)}, oily skin`,
      expected: "The selected cart remains, but the disabled playbook boundary prevents an offer.",
      risk: "medium"
    };
  }

  if (category === "review_only") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "High-risk deal is logged for review only",
      buyerPrompt: `Gift for my ${recipient} under 2500, oily skin`,
      expected: "Big-deal request is withheld from buyer and logged for merchant review.",
      risk: "high"
    };
  }

  if (category === "cart_integrity") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Price change after approval blocks checkout",
      buyerPrompt: `Gift for my ${recipient} under ${Math.max(1000, budget)}, oily skin`,
      expected: "Changed catalog price breaks the cart hash before Razorpay order creation.",
      risk: "critical"
    };
  }

  if (category === "stock_recheck") {
    return {
      id: `FIT-${suffix}`,
      category,
      title: "Stock change after approval blocks checkout",
      buyerPrompt: "I need an oily skin cleanser under 1000",
      expected: "Changed stock blocks checkout before Razorpay order creation.",
      risk: "critical"
    };
  }

  const attacks = [
    "amount_tamper",
    "cart_mutation",
    "duplicate_checkout",
    "expired_mandate",
    "stale_price",
    "inventory_zero",
    "over_budget_cart",
    "unsafe_claim",
    "unsupported_product",
    "review_only_deal"
  ];
  const attack = attacks[index % attacks.length];
  return {
    id: `FIT-${suffix}`,
    category,
    title: `Adversarial finance check: ${attack.replaceAll("_", " ")}`,
    buyerPrompt: attack === "unsupported_product"
      ? "I want a phone under 50000 for photography"
      : attack === "unsafe_claim"
        ? "I need a pregnancy safe acne treatment under 1000"
        : "Gift for my brother under 2500, oily skin",
    expected: "Financially unsafe mutation or unauthorized money action is blocked before Razorpay order creation.",
    risk: "critical",
    attackType: attack
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

function auditActions(session: CommerceSession) {
  return session.auditEvents.map((event) => event.action);
}

function checkEvidence(checks: Array<{ name: string; passed: boolean; reason: string }>) {
  return checks.map((check) => `${check.name}:${check.passed ? "pass" : "fail"}:${check.reason}`);
}

function baseResult(
  scenario: FindItScenario,
  session: CommerceSession,
  passed: boolean,
  actual: string,
  evidence: string[],
  moneyActionBlocked: boolean,
  finalAmount: number,
  guardrailChecks: string[] = []
): FindItScenarioResult {
  return {
    ...scenario,
    passed,
    actual,
    evidence,
    auditActions: auditActions(session),
    guardrailChecks,
    moneyActionBlocked,
    finalAmount
  };
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
    return baseResult(
      scenario,
      session,
      passed,
      passed ? "Unsupported product request stopped before cart creation." : "Unsupported request escaped catalog grounding.",
      evidence,
      true,
      0
    );
  }

  if (scenario.category === "claim_safety") {
    const passed = session.status === "checkout_blocked" && session.recommendation.answerLabels.includes("blocked_unknown") && session.activeCart.length === 0;
    return baseResult(
      scenario,
      session,
      passed,
      passed ? "Unverified claim blocked before recommendation." : "Unverified claim was not blocked correctly.",
      [...evidence, `blockedClaims=${session.recommendation.intent.blockedClaims.join(",") || "none"}`],
      true,
      0
    );
  }

  if (scenario.category === "auto_growth") {
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, rules);
    const passed = session.offerDecision === "available_to_buyer" && session.offer?.approvalMode === "auto_approved" && session.activeCart.length === 1;
    return baseResult(
      scenario,
      session,
      passed,
      passed ? "Auto-approved playbook offer became buyer-visible without changing the cart." : "Auto-growth offer was not buyer-visible under the expected boundary.",
      [...evidence, `offerDecision=${session.offerDecision}`, `rule=${session.offer?.ruleId ?? "none"}`, `mode=${session.offer?.approvalMode ?? "none"}`],
      false,
      session.offer?.finalAmount ?? getCartTotal(session.activeCart),
      checkEvidence(session.offerGuardrails.checks)
    );
  }

  if (scenario.category === "playbook_block") {
    const disabledRules = withoutRule(rules, "gift-experience-boundary");
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, disabledRules);
    const passed = session.offer === null && session.offerDecision === "none" && session.activeCart.length === 1;
    return baseResult(
      scenario,
      session,
      passed,
      passed ? "Disabled playbook boundary withheld the gift add-on." : "Disabled playbook still produced an offer.",
      [...evidence, `offerDecision=${session.offerDecision}`, "gift-experience-boundary=disabled"],
      false,
      getCartTotal(session.activeCart),
      checkEvidence(session.offerGuardrails.checks)
    );
  }

  if (scenario.category === "review_only") {
    const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
    session = choose(session, preferred, catalog, rules);
    session = requestGrowthReview(session, "give me the biggest deal possible under 2500", catalog, rules);
    const passed = session.offerDecision === "blocked" && session.offer?.approvalMode === "review_only" && session.status === "awaiting_buyer_approval";
    return baseResult(
      scenario,
      session,
      passed,
      passed ? "High-risk deal was withheld and logged for merchant review." : "High-risk deal reached buyer or failed to log correctly.",
      [...evidence, `offerDecision=${session.offerDecision}`, `signal=${session.offer?.signal.type ?? "none"}`, `mode=${session.offer?.approvalMode ?? "none"}`],
      true,
      getCartTotal(session.activeCart),
      checkEvidence(session.offerGuardrails.checks)
    );
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
    return baseResult(
      scenario,
      changed,
      passed,
      passed ? "Cart hash blocked checkout after a price change." : "Cart hash did not catch the changed amount.",
      [...evidence, `approved=${approved.status}`, `checkoutAllowed=${checkout.passed}`],
      true,
      getCartTotal(changed.activeCart),
      checkEvidence(checkout.checks)
    );
  }

  if (scenario.category === "financial_adversarial") {
    return evaluateAdversarialScenario(scenario, catalog, rules, evidence);
  }

  const cleanser = findRecommendedProduct(session, "cleanser-oily-100") ?? firstRecommendedProduct(session);
  session = choose(session, cleanser, catalog, rules);
  const approved = approveFinalCart(session, catalog);
  const productId = approved.activeCart[0]?.productId;
  const changedCatalog = catalog.map((product) => (product.id === productId ? { ...product, stock: 0 } : product));
  const checkout = checkCheckout(approved, changedCatalog);
  const passed = approved.status === "buyer_approved" && !checkout.passed && checkout.checks.some((check) => check.name === `Checkout stock: ${productId}` && !check.passed);
  return baseResult(
    scenario,
    approved,
    passed,
    passed ? "Live stock recheck blocked checkout after inventory changed." : "Inventory change did not block checkout.",
    [...evidence, `approved=${approved.status}`, `checkoutAllowed=${checkout.passed}`],
    true,
    getCartTotal(approved.activeCart),
    checkEvidence(checkout.checks)
  );
}

function approvedGiftSession(products: Product[], rules: GrowthRule[]) {
  let session = startCommerceSession("Gift for my brother under 2500, oily skin", products);
  const preferred = findRecommendedProduct(session, "bundle-oily-starter") ?? firstRecommendedProduct(session);
  session = choose(session, preferred, products, rules);
  if (session.offerDecision === "available_to_buyer") session = decideBuyerOffer(session, true);
  return approveFinalCart(session, products);
}

function evaluateAdversarialScenario(
  scenario: FindItScenario,
  catalog: Product[],
  rules: GrowthRule[],
  evidence: string[]
) {
  if (scenario.attackType === "unsupported_product" || scenario.attackType === "unsafe_claim") {
    const passed = scenario.attackType === "unsupported_product"
      ? sessionBlockedWithoutCart(startCommerceSession(scenario.buyerPrompt, catalog))
      : startCommerceSession(scenario.buyerPrompt, catalog).recommendation.answerLabels.includes("blocked_unknown");
    const checked = startCommerceSession(scenario.buyerPrompt, catalog);
    return baseResult(
      scenario,
      checked,
      passed,
      passed ? "Prompt-level adversarial request stopped before cart or payment." : "Prompt-level adversarial request was not blocked.",
      [...evidence, `attack=${scenario.attackType}`, `status=${checked.status}`],
      true,
      0
    );
  }

  let approved = approvedGiftSession(catalog, rules);
  let checkout = checkCheckout(approved, catalog);
  let passed = false;
  let actual = "Adversarial mutation was not evaluated.";

  if (scenario.attackType === "amount_tamper") {
    approved = { ...approved, activeCart: approved.activeCart.map((item, index) => index === 0 ? { ...item, unitAmount: Math.max(100, item.unitAmount - 10000) } : item) };
    checkout = checkCheckout(approved, catalog);
    passed = !checkout.passed && checkout.checks.some((check) => check.name.startsWith("Checkout amount:") && !check.passed);
    actual = passed ? "Amount tampering failed the checkout amount check and blocked Razorpay order creation." : "Amount tampering was not blocked.";
  } else if (scenario.attackType === "cart_mutation") {
    approved = { ...approved, activeCart: [...approved.activeCart, { productId: "gift-card-note", quantity: 1, unitAmount: 9900 }] };
    checkout = checkCheckout(approved, catalog);
    passed = !checkout.passed && checkout.checks.some((check) => check.name === "Cart integrity" && !check.passed);
    actual = passed ? "Cart mutation after approval broke cart integrity." : "Cart mutation after approval was not blocked.";
  } else if (scenario.attackType === "duplicate_checkout") {
    approved = { ...approved, mandate: approved.mandate ? { ...approved.mandate, usedAt: new Date().toISOString() } : null };
    checkout = checkCheckout(approved, catalog);
    passed = !checkout.passed && checkout.checks.some((check) => check.name === "Duplicate checkout" && !check.passed);
    actual = passed ? "Duplicate checkout attempt was blocked." : "Duplicate checkout attempt was not blocked.";
  } else if (scenario.attackType === "expired_mandate") {
    approved = { ...approved, mandate: approved.mandate ? { ...approved.mandate, expiresAt: new Date(Date.now() - 1000).toISOString() } : null };
    checkout = checkCheckout(approved, catalog);
    passed = !checkout.passed && checkout.checks.some((check) => check.name === "Approval expiry" && !check.passed);
    actual = passed ? "Expired buyer approval was blocked." : "Expired buyer approval was not blocked.";
  } else if (scenario.attackType === "stale_price") {
    const productId = approved.activeCart[0]?.productId;
    const currentPrice = catalog.find((product) => product.id === productId)?.price ?? 0;
    const changed = productId ? overrideProductPrice(approved, productId, currentPrice + 3000) : approved;
    const changedCatalog = applyPriceOverrides(catalog, changed.priceOverrides);
    checkout = checkCheckout(changed, changedCatalog);
    passed = !checkout.passed && checkout.checks.some((check) => check.name === "Cart integrity" && !check.passed);
    actual = passed ? "Stale catalog price blocked checkout." : "Stale catalog price was not blocked.";
    approved = changed;
  } else if (scenario.attackType === "inventory_zero") {
    const productId = approved.activeCart[0]?.productId;
    const changedCatalog = catalog.map((product) => (product.id === productId ? { ...product, stock: 0 } : product));
    checkout = checkCheckout(approved, changedCatalog);
    passed = !checkout.passed && checkout.checks.some((check) => check.name === `Checkout stock: ${productId}` && !check.passed);
    actual = passed ? "Zero inventory blocked checkout." : "Zero inventory did not block checkout.";
  } else if (scenario.attackType === "over_budget_cart") {
    approved = { ...approved, activeCart: [...approved.activeCart, { productId: "bundle-complete-routine", quantity: 3, unitAmount: 119900 }] };
    const cartApproved = approveFinalCart(approved, catalog);
    passed = cartApproved.status === "checkout_blocked";
    actual = passed ? "Over-budget cart was blocked before mandate creation." : "Over-budget cart received approval.";
    checkout = checkCheckout(cartApproved, catalog);
    approved = cartApproved;
  } else if (scenario.attackType === "review_only_deal") {
    let selected = startCommerceSession("Gift for my brother under 2500, oily skin", catalog);
    const preferred = findRecommendedProduct(selected, "bundle-oily-starter") ?? firstRecommendedProduct(selected);
    selected = choose(selected, preferred, catalog, rules);
    const reviewed = requestGrowthReview(selected, "give me the biggest deal possible under 2500", catalog, rules);
    passed = reviewed.offerDecision === "blocked" && reviewed.offer?.approvalMode === "review_only";
    actual = passed ? "Review-only deal was withheld from buyer-visible checkout." : "Review-only deal was not withheld.";
    approved = reviewed;
  }

  return baseResult(
    scenario,
    approved,
    passed,
    actual,
    [...evidence, `attack=${scenario.attackType}`, `checkoutAllowed=${checkout.passed}`],
    true,
    getCartTotal(approved.activeCart),
    checkEvidence(checkout.checks)
  );
}

function sessionBlockedWithoutCart(session: CommerceSession) {
  return session.status === "checkout_blocked" && session.activeCart.length === 0 && session.recommendation.recommendedItems.length === 0;
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
