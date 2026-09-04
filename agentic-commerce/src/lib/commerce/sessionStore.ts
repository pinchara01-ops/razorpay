import type { CommerceSession } from "@/lib/types";

export const COMMERCE_SESSION_KEY = "glowcart.active-commerce-session.v2";

export function loadCommerceSession(): CommerceSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COMMERCE_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CommerceSession;
  } catch {
    window.localStorage.removeItem(COMMERCE_SESSION_KEY);
    return null;
  }
}

export function saveCommerceSession(session: CommerceSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMERCE_SESSION_KEY, JSON.stringify(session));
}

export function clearCommerceSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COMMERCE_SESSION_KEY);
}
