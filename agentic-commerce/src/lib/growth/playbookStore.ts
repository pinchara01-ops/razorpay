import { growthPolicyRepository } from "@/lib/repositories/commerceRepositories";
import type { GrowthRule } from "@/lib/types";

export const GROWTH_PLAYBOOK_KEY = "glowcart.growth-playbook.v1";

function cloneDefaults() {
  return growthPolicyRepository.list().map((rule) => ({ ...rule, approvalByRisk: { ...rule.approvalByRisk }, constraints: { ...rule.constraints } }));
}

export function loadGrowthPlaybook(): GrowthRule[] {
  if (typeof window === "undefined") return cloneDefaults();
  const stored = window.localStorage.getItem(GROWTH_PLAYBOOK_KEY);
  if (!stored) return cloneDefaults();

  try {
    return JSON.parse(stored) as GrowthRule[];
  } catch {
    return cloneDefaults();
  }
}

export function saveGrowthPlaybook(rules: GrowthRule[]) {
  window.localStorage.setItem(GROWTH_PLAYBOOK_KEY, JSON.stringify(rules));
}

export function resetGrowthPlaybook() {
  window.localStorage.removeItem(GROWTH_PLAYBOOK_KEY);
  return cloneDefaults();
}
