export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = { open: () => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;

let checkoutScriptPromise: Promise<boolean> | null = null;

function loadCheckoutScript() {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(true);
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}

export async function openRazorpayCheckout(options: {
  keyId?: string;
  orderId: string;
  amount: number;
  name: string;
  description: string;
  onSuccess: (payment: RazorpaySuccess) => void | Promise<void>;
  onDismiss?: () => void;
}) {
  const loaded = await loadCheckoutScript();
  const Razorpay = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (!loaded || !Razorpay || !options.keyId) return false;

  new Razorpay({
    key: options.keyId,
    amount: options.amount,
    currency: "INR",
    name: options.name,
    description: options.description,
    order_id: options.orderId,
    theme: { color: "#2454ff" },
    modal: { ondismiss: options.onDismiss },
    handler: options.onSuccess
  }).open();
  return true;
}
