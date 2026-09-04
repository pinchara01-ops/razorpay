import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpaySignature } from "./verifyRazorpaySignature";

const secret = "test_secret";
const orderId = "order_test_123";
const paymentId = "pay_test_456";

describe("verifyRazorpaySignature", () => {
  it("accepts the HMAC generated for the exact order and payment", () => {
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

    expect(verifyRazorpaySignature({ orderId, paymentId, signature, secret })).toBe(true);
  });

  it("rejects a signature after the payment id is changed", () => {
    const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

    expect(
      verifyRazorpaySignature({ orderId, paymentId: "pay_tampered", signature, secret })
    ).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(verifyRazorpaySignature({ orderId, paymentId, signature: "bad", secret })).toBe(false);
  });
});
