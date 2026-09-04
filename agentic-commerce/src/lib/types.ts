export type ProductCategory = "skincare" | "bundle" | "accessory";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  currency: "INR";
  stock: number;
  attributes: string[];
  useCases: string[];
  notFor: string[];
  policyRefs: string[];
  crossSellIds: string[];
  upsellIds: string[];
  claimsAllowed: string[];
  claimsBlocked: string[];
  image: string;
};

export type MerchantPolicy = {
  id: string;
  title: string;
  summary: string;
};

export type BuyerIntent = {
  raw: string;
  goal: string;
  maxAmount: number;
  allowedCategories: ProductCategory[];
  constraints: string[];
  blockedClaims: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
  unitAmount: number;
};

export type Recommendation = {
  intent: BuyerIntent;
  recommendedItems: CartItem[];
  rejectedItems: Array<{
    productId: string;
    reason: string;
  }>;
  explanation: string;
  needsClarification: boolean;
  clarifyingQuestion: string | null;
  answerLabels: Array<"catalog_verified" | "policy_verified" | "inventory_verified" | "agent_inference" | "blocked_unknown">;
};

export type GuardrailCheck = {
  name: string;
  passed: boolean;
  reason: string;
};

export type GuardrailResult = {
  passed: boolean;
  checks: GuardrailCheck[];
};

export type Mandate = {
  id: string;
  userGoal: string;
  maxAmount: number;
  allowedCategories: ProductCategory[];
  cartSnapshot: CartItem[];
  approvedAmount: number;
  cartHash: string;
  approvedAt?: string;
  expiresAt?: string;
  razorpayOrderId?: string;
  usedAt?: string;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: "buyer" | "merchant" | "agent" | "system" | "razorpay";
  action: string;
  summary: string;
  tone?: "success" | "warning" | "danger" | "info";
  data?: Record<string, unknown>;
};

export type CheckoutResult = {
  ok: boolean;
  orderId?: string;
  amount?: number;
  provider: "razorpay_test" | "mock";
  message: string;
};

export type PaymentVerificationResult = {
  ok: boolean;
  paymentId?: string;
  message: string;
};

export type SessionEvent =
  | {
      type: "chat_message" | "search";
      value: string;
      timestamp: string;
    }
  | {
      type: "product_view" | "add_to_cart" | "remove_from_cart";
      productId: string;
      timestamp: string;
    }
  | {
      type: "ask_policy";
      topic: "delivery" | "returns" | "ingredients" | "safety";
      timestamp: string;
    }
  | {
      type: "checkout_idle";
      seconds: number;
      timestamp: string;
    };

export type GrowthSignal = {
  id: string;
  type: "gift_intent" | "routine_gap" | "catalog_cross_sell" | "bundle_opportunity" | "checkout_hesitation";
  summary: string;
  confidence: number;
};

export type OfferType = "cross_sell" | "upsell" | "bundle_switch" | "discount";
export type ApprovalMode = "pre_approved" | "live_merchant_approval";

export type GrowthRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: GrowthSignal["type"];
  offerType: OfferType;
  whenProductIds?: string[];
  productId?: string;
  replacementProductId?: string;
  approvalMode: ApprovalMode;
  riskLevel: "low" | "medium" | "high";
  maxOffersPerSession: number;
  minCartAmount?: number;
  maxAddedAmount?: number;
  explanation: string;
  constraints: {
    mustStayWithinBuyerBudget: boolean;
    productMustBeInStock: boolean;
    buyerApprovalRequired: boolean;
    allowUrgencyOnlyIfInventoryBacked: boolean;
  };
};

export type OfferProposal = {
  id: string;
  ruleId: string;
  signal: GrowthSignal;
  offerType: OfferType;
  approvalMode: ApprovalMode;
  riskLevel: GrowthRule["riskLevel"];
  proposedItems: CartItem[];
  finalCart: CartItem[];
  addedAmount: number;
  finalAmount: number;
  merchantScript: string;
  buyerMessage: string;
  safetySummary: string;
};

export type OfferDecision =
  | "none"
  | "blocked"
  | "pending_merchant"
  | "available_to_buyer"
  | "merchant_rejected"
  | "buyer_accepted"
  | "buyer_declined";

export type CommerceSessionStatus =
  | "awaiting_product_choice"
  | "awaiting_merchant"
  | "awaiting_buyer_offer"
  | "awaiting_buyer_approval"
  | "buyer_approved"
  | "checkout_complete"
  | "payment_complete"
  | "checkout_blocked";

export type CommerceSession = {
  id: string;
  prompt: string;
  status: CommerceSessionStatus;
  recommendation: Recommendation;
  sessionEvents: SessionEvent[];
  growthSignals: GrowthSignal[];
  offer: OfferProposal | null;
  offerGuardrails: GuardrailResult;
  offerDecision: OfferDecision;
  activeCart: CartItem[];
  mandate: Mandate | null;
  checkout: CheckoutResult | null;
  payment: PaymentVerificationResult | null;
  priceOverrides: Record<string, number>;
  auditEvents: AuditEvent[];
  createdAt: string;
  updatedAt: string;
};
