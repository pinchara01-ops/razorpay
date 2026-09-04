import type { GrowthRule } from "@/lib/types";

export const growthRules: GrowthRule[] = [
  {
    id: "standard-growth-boundary",
    name: "Standard guarded growth boundary",
    enabled: true,
    allowedOfferTypes: ["cross_sell", "upsell", "bundle_switch"],
    allowedCategories: ["skincare", "bundle"],
    approvalByRisk: {
      low: "pre_approved",
      medium: "live_merchant_approval",
      high: "live_merchant_approval"
    },
    maxOffersPerSession: 1,
    maxAddedAmount: 60000,
    minMarginPercent: 42,
    explanation: "Allows relevant add-ons and bundle switches when they stay inside budget, stock, and margin limits.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: true,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  },
  {
    id: "gift-experience-boundary",
    name: "Gift experience boundary",
    enabled: true,
    allowedOfferTypes: ["cross_sell"],
    allowedCategories: ["accessory"],
    approvalByRisk: {
      low: "live_merchant_approval",
      medium: "live_merchant_approval",
      high: "live_merchant_approval"
    },
    maxOffersPerSession: 1,
    minCartAmount: 50000,
    maxAddedAmount: 15000,
    minMarginPercent: 50,
    explanation: "Allows small gift add-ons, but keeps a human gate because personalized items can affect trust.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: true,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  },
  {
    id: "discount-review-boundary",
    name: "Discount review boundary",
    enabled: false,
    allowedOfferTypes: ["discount"],
    allowedCategories: ["skincare", "bundle", "accessory"],
    approvalByRisk: {
      low: "live_merchant_approval",
      medium: "live_merchant_approval",
      high: "live_merchant_approval"
    },
    maxOffersPerSession: 1,
    minCartAmount: 100000,
    maxAddedAmount: 0,
    minMarginPercent: 55,
    explanation: "Discounts are disabled by default because they can train buyers to wait and can damage margin.",
    constraints: {
      mustStayWithinBuyerBudget: true,
      productMustBeInStock: false,
      buyerApprovalRequired: true,
      allowUrgencyOnlyIfInventoryBacked: false
    }
  }
];
