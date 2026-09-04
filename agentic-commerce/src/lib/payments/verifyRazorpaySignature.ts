import { createHmac, timingSafeEqual } from "node:crypto";

type RazorpaySignatureInput = {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
};

export function verifyRazorpaySignature({ orderId, paymentId, signature, secret }: RazorpaySignatureInput) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
