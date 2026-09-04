import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/payments/verifyRazorpaySignature";

type VerificationRequest = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as VerificationRequest;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) return NextResponse.json({ ok: false, message: "Payment verification is not configured." }, { status: 501 });
  if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
    return NextResponse.json({ ok: false, message: "Payment verification details are incomplete." }, { status: 400 });
  }

  const valid = verifyRazorpaySignature({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
    secret
  });

  if (!valid) return NextResponse.json({ ok: false, message: "Payment signature could not be verified." }, { status: 400 });

  return NextResponse.json({
    ok: true,
    paymentId: body.razorpay_payment_id,
    message: "Payment confirmed and signature verified."
  });
}
