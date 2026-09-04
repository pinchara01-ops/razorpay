import { parseBudgetFromText } from "@/lib/money";
import type { BuyerIntent, ProductCategory } from "@/lib/types";

export function parseIntent(raw: string): BuyerIntent {
  const lower = raw.toLowerCase();
  const constraints: string[] = [];
  const blockedClaims: string[] = [];
  const allowedCategories: ProductCategory[] = ["skincare", "bundle", "accessory"];

  if (lower.includes("oily")) constraints.push("oily skin");
  if (lower.includes("vegan") || lower.includes("vegetarian")) constraints.push("vegan");
  if (lower.includes("gift") || lower.includes("birthday")) constraints.push("gift");
  if (lower.includes("3 days") || lower.includes("three days")) constraints.push("delivery within 3 days");
  if (lower.includes("pregnancy") || lower.includes("pregnant")) blockedClaims.push("pregnancy safety");
  if (lower.includes("acne")) blockedClaims.push("treats acne");

  let goal = "shopping assistance";
  if (lower.includes("gift") || lower.includes("birthday")) goal = "gift purchase";
  if (lower.includes("routine")) goal = "skincare routine";
  if (lower.includes("sunscreen")) goal = "sun protection";

  return {
    raw,
    goal,
    maxAmount: parseBudgetFromText(raw),
    allowedCategories,
    constraints,
    blockedClaims
  };
}
