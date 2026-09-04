export const BUYER_PROFILE_KEY = "glowcart.buyer-profile.v1";

export type BuyerProfile = {
  name: string;
  email: string;
};

export function loadBuyerProfile(): BuyerProfile | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(BUYER_PROFILE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as BuyerProfile;
  } catch {
    window.localStorage.removeItem(BUYER_PROFILE_KEY);
    return null;
  }
}
