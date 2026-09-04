import { catalog } from "@/data/catalog";
import { growthRules } from "@/data/growthRules";
import { policies } from "@/data/policies";
import type { GrowthRule, MerchantPolicy, Product } from "@/lib/types";

export interface ProductRepository {
  list(): Product[];
  findById(productId: string): Product | undefined;
}

export interface PolicyRepository {
  list(): MerchantPolicy[];
}

export interface GrowthPolicyRepository {
  list(): GrowthRule[];
}

export function createInMemoryProductRepository(products: Product[] = catalog): ProductRepository {
  return {
    list: () => products,
    findById: (productId) => products.find((product) => product.id === productId)
  };
}

export function createInMemoryPolicyRepository(merchantPolicies: MerchantPolicy[] = policies): PolicyRepository {
  return {
    list: () => merchantPolicies
  };
}

export function createInMemoryGrowthPolicyRepository(rules: GrowthRule[] = growthRules): GrowthPolicyRepository {
  return {
    list: () => rules
  };
}

export const productRepository = createInMemoryProductRepository();
export const policyRepository = createInMemoryPolicyRepository();
export const growthPolicyRepository = createInMemoryGrowthPolicyRepository();
