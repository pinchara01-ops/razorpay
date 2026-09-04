"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock3, ShieldCheck, ShoppingBag, Sparkles, X } from "lucide-react";
import { catalog } from "@/data/catalog";
import { getCartTotal, hydrateCartItems } from "@/lib/cart";
import {
  applyPriceOverrides,
  approveFinalCart,
  checkCheckout,
  continueWithoutOffer,
  decideBuyerOffer,
  recordCheckoutBlocked,
  recordCheckoutResult,
  recordPaymentVerification
} from "@/lib/commerce/engine";
import { COMMERCE_SESSION_KEY, loadCommerceSession, saveCommerceSession } from "@/lib/commerce/sessionStore";
import { formatINR } from "@/lib/money";
import { openRazorpayCheckout, type RazorpaySuccess } from "@/lib/payments/openRazorpayCheckout";
import type { CheckoutResult, CommerceSession, PaymentVerificationResult } from "@/lib/types";
import "../page.css";

export default function CartPage() {
  const [session, setSession] = useState<CommerceSession | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    setSession(loadCommerceSession());
    function syncSession(event: StorageEvent) {
      if (event.key === COMMERCE_SESSION_KEY) setSession(loadCommerceSession());
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  const products = useMemo(() => applyPriceOverrides(catalog, session?.priceOverrides ?? {}), [session?.priceOverrides]);
  const cart = session ? hydrateCartItems(session.activeCart, products) : [];
  const total = session ? getCartTotal(session.activeCart) : 0;

  function persist(next: CommerceSession) {
    setSession(next);
    saveCommerceSession(next);
  }

  function chooseOffer(accepted: boolean) {
    if (session) persist(decideBuyerOffer(session, accepted));
  }

  function skipOffer() {
    if (session) persist(continueWithoutOffer(session));
  }

  async function approveCartAndContinue() {
    if (!session) return;
    const approvedSession = approveFinalCart(session, products);
    persist(approvedSession);
    if (approvedSession.status === "buyer_approved" && approvedSession.mandate) {
      await createOrder(approvedSession);
    }
  }

  async function createOrder(approvedSession: CommerceSession) {
    if (!approvedSession.mandate) return;
    const checks = checkCheckout(approvedSession, products);
    if (!checks.passed) {
      persist(recordCheckoutBlocked(approvedSession, checks));
      return;
    }

    setIsPaying(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: approvedSession.mandate.approvedAmount, receipt: approvedSession.mandate.id })
      });
      const checkoutSession = recordCheckoutResult(approvedSession, (await response.json()) as CheckoutResult);
      persist(checkoutSession);
      if (checkoutSession.status === "checkout_complete") {
        await launchRazorpayCheckout(checkoutSession);
      }
    } catch {
      persist(recordCheckoutResult(approvedSession, { ok: false, provider: "mock", message: "Payment service unavailable. No order was created." }));
    } finally {
      setIsPaying(false);
    }
  }

  async function launchRazorpayCheckout(checkoutSession: CommerceSession) {
    if (!checkoutSession.checkout?.orderId || !checkoutSession.checkout.amount) return;
    const opened = await openRazorpayCheckout({
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      orderId: checkoutSession.checkout.orderId,
      amount: checkoutSession.checkout.amount,
      name: "GlowCart",
      description: "GlowCart order",
      onSuccess: async (payment: RazorpaySuccess) => {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment)
        });
        persist(recordPaymentVerification(checkoutSession, (await response.json()) as PaymentVerificationResult));
      }
    });
    if (!opened) {
      persist(recordPaymentVerification(checkoutSession, { ok: false, message: "Razorpay Checkout could not load. The order is safe to retry." }));
    }
  }

  return (
    <main className="cart-page">
      <header className="store-header">
        <Link className="brand" href="/"><span className="brand-mark">G</span><span>GlowCart</span></Link>
        <nav className="checkout-steps" aria-label="Checkout progress"><span className="active">Cart</span><span>Approval</span><span>Payment</span></nav>
        <Link className="back-to-shop" href="/shop"><ArrowLeft size={17} /> Continue shopping</Link>
      </header>

      <section className="cart-shell">
        <div className="cart-main">
          <div className="cart-title"><div><p className="kicker">Your order</p><h1>Review your cart</h1></div><span>{cart.length} item{cart.length === 1 ? "" : "s"}</span></div>

          {!session || cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={30} /><h2>Your cart is empty</h2><p>Browse the collection or ask GlowGuide to find a suitable product.</p><Link href="/shop">Go to catalogue</Link></div> : null}

          {cart.map(({ product, quantity, unitAmount }) => product ? <article className="cart-line" key={product.id}>
            <div className="cart-line-image" style={{ backgroundImage: `url(${product.image})` }} />
            <div><small>{product.category}</small><h2>{product.name}</h2><p>{product.claimsAllowed[0]}</p><span>Quantity {quantity} · {product.stock} in stock</span></div>
            <strong>{formatINR(unitAmount * quantity)}</strong>
          </article> : null)}

          {session?.offerDecision === "pending_merchant" && session.offer ? <section className="cart-offer pending">
            <Clock3 size={20} /><div><strong>Optional offer awaiting merchant review</strong><p>Your selected item is ready. The pending offer has not changed your cart.</p></div><button onClick={skipOffer}>Continue without offer</button>
          </section> : null}

          {session?.offerDecision === "available_to_buyer" && session.offer ? <section className="cart-offer">
            <Sparkles size={20} /><div><span>Merchant playbook · {session.offer.ruleId}</span><strong>{session.offer.buyerMessage}</strong><p>{session.offer.safetySummary}</p></div><div><button className="offer-yes" onClick={() => chooseOffer(true)}><Check size={16} /> Add</button><button onClick={() => chooseOffer(false)}><X size={16} /> Skip</button></div>
          </section> : null}

          {session?.status === "checkout_blocked" ? <div className="cart-block"><ShieldCheck size={20} /><div><strong>Checkout paused</strong><p>{session.auditEvents.at(-1)?.summary}</p><span>No money action was taken.</span></div></div> : null}
          {session?.status === "payment_complete" ? <div className="cart-success"><Check size={21} /><div><strong>Payment confirmed</strong><p>{session.payment?.message}</p></div></div> : null}
        </div>

        {session && cart.length > 0 ? <aside className="order-summary">
          <h2>Order summary</h2>
          <dl><div><dt>Items</dt><dd>{formatINR(total)}</dd></div><div><dt>Delivery</dt><dd>Free</dd></div><div className="summary-total"><dt>Total</dt><dd>{formatINR(total)}</dd></div></dl>
          <div className="approval-note"><ShieldCheck size={17} /><span>Only this exact cart and amount can be sent to Razorpay.</span></div>

          {session.status === "checkout_complete" && session.checkout ? <div className="order-created"><Check size={16} /><span><strong>Razorpay test order created</strong><small>{session.checkout.orderId}</small></span></div> : null}

          {session.status === "awaiting_buyer_approval" || session.status === "buyer_approved" ? <button className="checkout-primary" disabled={isPaying} onClick={() => void approveCartAndContinue()}>{isPaying ? "Creating secure order..." : `Approve ${formatINR(total)} and continue`}</button> : null}
          {session.status === "checkout_complete" ? <button className="checkout-primary" onClick={() => void launchRazorpayCheckout(session)}>Reopen Razorpay Checkout</button> : null}
          {session.mandate ? <small className="mandate-note">Approval ID {session.mandate.id}<br />Expires 15 minutes after approval</small> : null}
        </aside> : null}
      </section>
    </main>
  );
}
