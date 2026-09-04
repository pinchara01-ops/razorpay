import { NextResponse } from "next/server";

type CheckoutRequest = {
  amount: number;
  receipt: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutRequest;

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid checkout amount." }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({
      ok: true,
      provider: "mock",
      orderId: `order_mock_${Date.now()}`,
      amount: body.amount,
      message: "Mock order created because Razorpay keys are not configured."
    });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: body.amount,
      currency: "INR",
      receipt: body.receipt,
      notes: {
        source: "glowcart-guided-checkout"
      }
    })
  });

  if (!razorpayResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        provider: "razorpay_test",
        message: "Razorpay order creation failed."
      },
      { status: 502 }
    );
  }

  const order = await razorpayResponse.json();

  return NextResponse.json({
    ok: true,
    provider: "razorpay_test",
    orderId: order.id,
    amount: order.amount,
    message: "Razorpay test order created."
  });
}
