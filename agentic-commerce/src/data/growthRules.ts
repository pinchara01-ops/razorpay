import type { GrowthRule } from "@/lib/types";

export const growthRules: GrowthRule[] = [
  {
    id: "cleanser-sunscreen-companion",
    name: "Cleanser companion cross-sell",
    enabled: true,
    trigger: "catalog_cross_sell",
    offerType: "cross_sell",
    whenProductIds: ["cleanser-oily-100"],
    productId: "sunscreen-light-50",
    approvalMode: "pre_approved",
    riskLevel: "low",
    maxOffersPerSession: 1,
    maxAddedAmount: 55000,
    explanation: "A buyer choosing the oil-control cleanser can be shown its configured daytime companion when the total stays within budget.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: true,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  },
  {
    id: "gift-note-cross-sell",
    name: "Gift note cross-sell",
    enabled: true,
    trigger: "gift_intent",
    offerType: "cross_sell",
    productId: "gift-card-note",
    approvalMode: "live_merchant_approval",
    riskLevel: "low",
    maxOffersPerSession: 1,
    minCartAmount: 50000,
    maxAddedAmount: 15000,
    explanation: "Gift-intent sessions can receive a low-cost personalized note if it stays within the buyer's budget.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: true,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  },
  {
    id: "routine-gap-sunscreen",
    name: "Routine-gap sunscreen cross-sell",
    enabled: true,
    trigger: "routine_gap",
    offerType: "cross_sell",
    productId: "sunscreen-light-50",
    approvalMode: "pre_approved",
    riskLevel: "low",
    maxOffersPerSession: 1,
    maxAddedAmount: 60000,
    explanation: "Day-routine buyers can be offered sunscreen when the cart lacks SPF and the budget allows it.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: true,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  },
  {
    id: "starter-duo-bundle-switch",
    name: "Starter duo bundle switch",
    enabled: true,
    trigger: "bundle_opportunity",
    offerType: "bundle_switch",
    replacementProductId: "bundle-oily-starter",
    approvalMode: "pre_approved",
    riskLevel: "low",
    maxOffersPerSession: 1,
    explanation: "If cleanser and moisturizer are selected separately, suggest switching to the curated starter duo when it preserves intent.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: true,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  },
  {
    id: "hesitation-discount-review",
    name: "Checkout hesitation discount review",
    enabled: false,
    trigger: "checkout_hesitation",
    offerType: "discount",
    approvalMode: "live_merchant_approval",
    riskLevel: "high",
    maxOffersPerSession: 1,
    minCartAmount: 100000,
    explanation: "Discounts affect margin and should require live merchant approval unless a strict campaign is configured.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: false,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  }
];
