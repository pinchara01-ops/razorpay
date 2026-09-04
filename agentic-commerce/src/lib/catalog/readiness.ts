import type { Product } from "@/lib/types";

const criticalFields: Array<keyof Product> = ["id", "name", "category", "price", "stock", "useCases", "policyRefs", "claimsAllowed", "claimsBlocked"];

export function scoreProductReadiness(product: Product) {
  const missing = criticalFields.filter((field) => {
    const value = product[field];
    return Array.isArray(value) ? value.length === 0 : value === undefined || value === null || value === "";
  });

  const score = Math.round(((criticalFields.length - missing.length) / criticalFields.length) * 100);

  return {
    productId: product.id,
    score,
    missing
  };
}

export function scoreCatalogReadiness(products: Product[]) {
  return products.map(scoreProductReadiness);
}
