import type { SessionEvent } from "@/lib/types";

type SessionEventInput =
  | {
      type: "chat_message" | "search";
      value: string;
    }
  | {
      type: "product_view" | "add_to_cart" | "remove_from_cart";
      productId: string;
    }
  | {
      type: "ask_policy";
      topic: "delivery" | "returns" | "ingredients" | "safety";
    }
  | {
      type: "checkout_idle";
      seconds: number;
    };

export function createSessionEvent(event: SessionEventInput): SessionEvent {
  return {
    ...event,
    timestamp: new Date().toISOString()
  } as SessionEvent;
}

export function createGiftSessionEvents(): SessionEvent[] {
  return [
    createSessionEvent({ type: "search", value: "gift for brother under 1000" }),
    createSessionEvent({ type: "product_view", productId: "bundle-oily-starter" }),
    createSessionEvent({ type: "add_to_cart", productId: "bundle-oily-starter" })
  ];
}
