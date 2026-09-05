"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Mic, Search, ShieldCheck, ShoppingBag, Sparkles, Square, UserRound, Volume2, X } from "lucide-react";
import { loadBuyerProfile, type BuyerProfile } from "@/lib/buyerProfile";
import { getCartTotal } from "@/lib/cart";
import {
  applyPriceOverrides,
  approveFinalCart,
  checkCheckout,
  decideBuyerOffer,
  getClarifyingQuestion,
  recordCheckoutBlocked,
  recordCheckoutResult,
  recordPaymentVerification,
  requestGrowthReview,
  selectRecommendedProduct,
  startCommerceSession
} from "@/lib/commerce/engine";
import { COMMERCE_SESSION_KEY, clearCommerceSession, loadCommerceSession, saveCommerceSession } from "@/lib/commerce/sessionStore";
import { loadGrowthPlaybook } from "@/lib/growth/playbookStore";
import { formatINR } from "@/lib/money";
import { openRazorpayCheckout, type RazorpaySuccess } from "@/lib/payments/openRazorpayCheckout";
import { productRepository } from "@/lib/repositories/commerceRepositories";
import type { CheckoutResult, CommerceSession, PaymentVerificationResult } from "@/lib/types";
import "../page.css";

type ChatMessage = { id: string; role: "buyer" | "agent"; text: string };
type BuyerAgentAnalysis = {
  status: "clarify" | "ready" | "blocked";
  clarifyingQuestion: string;
  normalizedPrompt: string;
  reply: string;
  intent: {
    goal: string;
    recipient: string;
    maxAmountRupees: number;
    constraints: string[];
    blockedClaims: string[];
  };
};

const suggestions = [
  "Gift for my brother under 1000, oily skin",
  "Build me a simple day routine under 1500",
  "I want a phone under 50000 for photography"
];

const catalog = productRepository.list();

const initialMessages: ChatMessage[] = [{
  id: "welcome",
  role: "agent",
  text: "Tell me what you need and your budget. I will only use products, stock, prices, and policies from this store."
}];

function isAffirmative(text: string) {
  return /^(yes|yep|yeah|ok|okay|sure|go ahead|proceed|confirm|buy it|pay|checkout|looks good)[.!\s]*$/i.test(text.trim());
}

function isNegative(text: string) {
  return /^(no|nope|skip|decline|not now|without it)[.!\s]*$/i.test(text.trim());
}

function isFinishedCommerceSession(current: CommerceSession | null) {
  return Boolean(current && ["checkout_complete", "payment_complete", "checkout_blocked"].includes(current.status));
}

function isDealRequest(text: string) {
  return /\b(discount|deal|offer|best value|premium|upgrade|bigger|biggest)\b/i.test(text);
}

function isNewShoppingRequest(text: string) {
  return /\b(i want|i need|build me|find me|show me|looking for|buy|gift for|routine|phone|cleanser|moisturizer|sunscreen)\b/i.test(text);
}

function isUnsupportedStoreRequest(text: string) {
  const normalized = text.toLowerCase();
  const outsideCatalog = /\b(phone|camera|laptop|headphones|shoes|protein|watch|wallet)\b/.test(normalized);
  const inCatalog = /\b(skin|skincare|cleanser|moisturizer|sunscreen|routine|serum|oily|gift note)\b/.test(normalized);
  return outsideCatalog && !inCatalog;
}

export default function ShopPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [session, setSession] = useState<CommerceSession | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [input, setInput] = useState("");
  const [intentDraft, setIntentDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice off");
  const [category, setCategory] = useState<"all" | "skincare" | "bundle">("all");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const buyer = loadBuyerProfile();
    if (!buyer) {
      router.replace("/login");
      return;
    }
    setProfile(buyer);
    setSession(loadCommerceSession());

    function syncSession(event: StorageEvent) {
      if (event.key === COMMERCE_SESSION_KEY) setSession(loadCommerceSession());
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [router]);

  const products = useMemo(() => applyPriceOverrides(catalog, session?.priceOverrides ?? {}), [session?.priceOverrides]);
  const visibleProducts = products.filter((product) =>
    product.category !== "accessory" && (category === "all" || product.category === category)
  );
  const recommendationOptions = session
    ? session.recommendation.recommendedItems.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    : [];
  const selectedProduct = session?.activeCart[0]
    ? products.find((product) => product.id === session.activeCart[0].productId)
    : null;
  const cartTotal = session ? getCartTotal(session.activeCart) : 0;
  const cartNames = session?.activeCart
    .map((item) => products.find((product) => product.id === item.productId)?.name)
    .filter(Boolean)
    .join(" and ");

  function persist(next: CommerceSession) {
    setSession(next);
    saveCommerceSession(next);
  }

  function addAgentMessage(text: string, speakReply = true) {
    setMessages((current) => [...current, { id: `agent_${Date.now()}_${current.length}`, role: "agent", text }]);
    if (speakReply) void speak(text);
  }

  async function speak(text: string, force = false) {
    if (!voiceMode && !force) return;
    voiceAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setVoiceStatus("GlowGuide is speaking");
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (response.ok && response.headers.get("Content-Type")?.includes("audio")) {
        const audio = new Audio(URL.createObjectURL(await response.blob()));
        voiceAudioRef.current = audio;
        audio.onended = () => setVoiceStatus("Voice ready");
        await audio.play();
        return;
      }
    } catch {
      // The browser voice keeps the conversation usable if the provider is unavailable.
    }

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.onend = () => setVoiceStatus("Voice ready");
      window.speechSynthesis.speak(utterance);
    } else {
      setVoiceStatus("Voice unavailable");
    }
  }

  async function toggleVoiceMode() {
    if (voiceMode) {
      voiceAudioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setVoiceMode(false);
      setVoiceStatus("Voice off");
      return;
    }
    setVoiceMode(true);
    setVoiceStatus("Voice ready");
    await speak("Voice mode is on. Tell me what you would like to shop for.", true);
  }

  async function toggleRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }

    try {
      voiceAudioRef.current?.pause();
      window.speechSynthesis?.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsListening(false);
        setVoiceStatus("Transcribing...");
        const audio = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const body = new FormData();
        body.append("audio", audio, "glowguide.webm");
        try {
          const response = await fetch("/api/transcribe", { method: "POST", body });
          const result = (await response.json()) as { ok?: boolean; text?: string; message?: string };
          if (!response.ok || !result.text) throw new Error(result.message);
          setVoiceStatus(`Heard: ${result.text}`);
          await submitMessage(result.text);
        } catch {
          setVoiceStatus("Could not hear that. Try again.");
        }
      };
      recorder.start();
      setIsListening(true);
      setVoiceStatus("Listening... tap stop when done");
    } catch {
      setVoiceStatus("Microphone permission is required");
    }
  }

  function exactApprovalMessage(current: CommerceSession) {
    const names = current.activeCart
      .map((item) => products.find((product) => product.id === item.productId)?.name)
      .filter(Boolean)
      .join(" and ");
    return `Your final cart is ${names}. The exact total is ${formatINR(getCartTotal(current.activeCart))}. Say okay or select Approve and pay to authorize this amount.`;
  }

  async function launchRazorpayCheckout(checkoutSession: CommerceSession) {
    if (!checkoutSession.checkout?.orderId || !checkoutSession.checkout.amount) return;
    const opened = await openRazorpayCheckout({
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      orderId: checkoutSession.checkout.orderId,
      amount: checkoutSession.checkout.amount,
      name: "GlowCart",
      description: "GlowGuide assisted order",
      onDismiss: () => addAgentMessage("Razorpay Checkout was closed. Your order is unchanged; say pay when you are ready to reopen it."),
      onSuccess: async (payment: RazorpaySuccess) => {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment)
        });
        const verified = recordPaymentVerification(
          checkoutSession,
          (await response.json()) as PaymentVerificationResult
        );
        persist(verified);
        addAgentMessage(verified.payment?.ok
          ? "Payment confirmed. Razorpay's signature matched, and your order is complete."
          : "The payment response could not be verified. The order was not marked paid.");
      }
    });

    if (!opened) {
      const failed = recordPaymentVerification(checkoutSession, {
        ok: false,
        message: "Razorpay Checkout could not load. The order is safe to retry."
      });
      persist(failed);
      addAgentMessage("Razorpay Checkout could not open. No additional payment action was taken; say pay to retry.");
    }
  }

  async function approveAndCheckout(current: CommerceSession) {
    setIsCheckingOut(true);
    try {
      const approved = approveFinalCart(current, products);
      persist(approved);
      if (approved.status !== "buyer_approved" || !approved.mandate) {
        addAgentMessage("I stopped checkout because the cart changed or failed a safety check. No Razorpay order was created.");
        return;
      }

      const checks = checkCheckout(approved, products);
      if (!checks.passed) {
        persist(recordCheckoutBlocked(approved, checks));
        addAgentMessage("I stopped checkout because the approved cart no longer matches the live catalog. No Razorpay order was created.");
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: approved.mandate.approvedAmount, receipt: approved.mandate.id })
      });
      const result = (await response.json()) as CheckoutResult;
      const checkoutSession = recordCheckoutResult(approved, result);
      persist(checkoutSession);
      if (!result.ok || !result.orderId || !result.amount) {
        addAgentMessage("Razorpay order creation failed. No payment was attempted.");
        return;
      }

      addAgentMessage(`Approved ${formatINR(result.amount)}. The Razorpay test order is ready, and secure Checkout is opening now.`);
      await launchRazorpayCheckout(checkoutSession);
    } catch {
      addAgentMessage("The payment service is unavailable. No order or charge was completed.");
    } finally {
      setIsCheckingOut(false);
      setIsThinking(false);
    }
  }

  async function submitMessage(text = input) {
    const buyerText = text.trim();
    if (!buyerText || isThinking) return;
    const buyerMessage: ChatMessage = { id: `buyer_${Date.now()}`, role: "buyer", text: buyerText };
    const startsFreshSearch = Boolean(
      session &&
      !isAffirmative(buyerText) &&
      !isNegative(buyerText) &&
      (isFinishedCommerceSession(session) ||
        (["awaiting_buyer_offer", "awaiting_buyer_approval"].includes(session.status) &&
          isNewShoppingRequest(buyerText) &&
          !isDealRequest(buyerText)))
    );
    const activeSession = startsFreshSearch ? null : session;
    const activeProducts = startsFreshSearch ? catalog : products;
    const combined = `${startsFreshSearch ? "" : intentDraft} ${buyerText}`.trim();

    if (startsFreshSearch) {
      clearCommerceSession();
      setSession(null);
      setIntentDraft("");
    }

    setMessages((current) => startsFreshSearch ? [buyerMessage] : [...current, buyerMessage]);
    setInput("");
    setIsThinking(true);

    if (isUnsupportedStoreRequest(combined)) {
      const next = startCommerceSession(combined, activeProducts);
      persist(next);
      setIntentDraft("");
      addAgentMessage(next.recommendation.explanation);
      setIsThinking(false);
      return;
    }

    if (activeSession?.status === "awaiting_buyer_offer") {
      if (isDealRequest(buyerText) && activeSession.activeCart.length > 0) {
        const reviewed = requestGrowthReview(activeSession, buyerText, products, loadGrowthPlaybook());
        persist(reviewed);
        if (reviewed.offerDecision === "blocked" && reviewed.offer?.approvalMode === "review_only") {
          addAgentMessage("That deal is outside the auto-approved playbook, so I did not show or apply it. I logged it in the merchant dashboard with the reason and boundary. Your cart is unchanged.");
        } else if (reviewed.status === "awaiting_buyer_offer" && reviewed.offer) {
          addAgentMessage(`${reviewed.offer.buyerMessage} With it, your exact total is ${formatINR(reviewed.offer.finalAmount)}. Say okay to add it and pay, or say skip.`);
        } else {
          addAgentMessage("I could not find a merchant-approved deal boundary for this cart. Your selected item is unchanged.");
        }
        setIsThinking(false);
        return;
      }
      if (isAffirmative(buyerText)) {
        const accepted = decideBuyerOffer(activeSession, true);
        persist(accepted);
        await approveAndCheckout(accepted);
        return;
      }
      if (isNegative(buyerText)) {
        const declined = decideBuyerOffer(activeSession, false);
        persist(declined);
        addAgentMessage(exactApprovalMessage(declined));
        setIsThinking(false);
        return;
      }
    }

    if (
      activeSession &&
      activeSession.activeCart.length > 0 &&
      activeSession.status === "awaiting_buyer_approval" &&
      isDealRequest(buyerText)
    ) {
      const reviewed = requestGrowthReview(activeSession, buyerText, products, loadGrowthPlaybook());
      persist(reviewed);
      if (reviewed.offerDecision === "blocked" && reviewed.offer?.approvalMode === "review_only") {
        addAgentMessage("This is outside the auto-approved playbook, so I withheld it from checkout and logged it for merchant review. Your cart has not changed.");
      } else if (reviewed.status === "awaiting_buyer_offer" && reviewed.offer) {
        addAgentMessage(`${reviewed.offer.buyerMessage} With it, your exact total is ${formatINR(reviewed.offer.finalAmount)}. Say okay to add it and pay, or say skip.`);
      } else {
        addAgentMessage("No approved growth boundary matched that deal request. Your current cart is unchanged.");
      }
      setIsThinking(false);
      return;
    }

    if (activeSession?.status === "awaiting_buyer_approval" && isAffirmative(buyerText)) {
      await approveAndCheckout(activeSession);
      return;
    }

    if (activeSession?.status === "checkout_complete" && isAffirmative(buyerText)) {
      await launchRazorpayCheckout(activeSession);
      setIsThinking(false);
      return;
    }

    let analysis: BuyerAgentAnalysis | null = null;
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combined })
      });
      if (response.ok) {
        const payload = (await response.json()) as { analysis?: BuyerAgentAnalysis };
        analysis = payload.analysis ?? null;
      }
    } catch {
      analysis = null;
    }

    const fallbackQuestion = getClarifyingQuestion(combined);
    const analysisHasGoalAndBudget = Boolean(
      analysis?.intent.goal.trim() && analysis.intent.maxAmountRupees > 0
    );
    const question = analysis?.status === "clarify" && !analysisHasGoalAndBudget
      ? analysis.clarifyingQuestion
      : analysis
        ? null
        : fallbackQuestion;
    if (question) {
      setIntentDraft(combined);
      setMessages((current) => [...current, { id: `agent_${Date.now()}`, role: "agent", text: question }]);
      void speak(question);
      setIsThinking(false);
      return;
    }

    const next = startCommerceSession(analysis?.normalizedPrompt || combined, activeProducts);
    persist(next);
    setIntentDraft("");
    const resultMessages = [
      ...(analysis?.reply ? [analysis.reply] : []),
      next.recommendation.explanation
    ];
    setMessages((current) => [
      ...current,
      ...(analysis?.reply ? [{ id: `understood_${Date.now()}`, role: "agent" as const, text: analysis.reply }] : []),
      { id: `result_${Date.now()}`, role: "agent", text: next.recommendation.explanation }
    ]);
    void speak(resultMessages.join(" "));
    setIsThinking(false);
  }

  function selectProduct(productId: string) {
    if (!session) return;
    const next = selectRecommendedProduct(session, productId, products, loadGrowthPlaybook());
    persist(next);
    if (next.status === "awaiting_buyer_offer" && next.offer) {
      addAgentMessage(`${next.offer.buyerMessage} With it, your exact total is ${formatINR(next.offer.finalAmount)}. Say okay to add it and pay, or say skip.`);
    } else if (next.status === "awaiting_buyer_approval") {
      addAgentMessage(exactApprovalMessage(next));
    }
  }

  async function acceptOfferAndPay() {
    if (!session) return;
    const accepted = decideBuyerOffer(session, true);
    persist(accepted);
    await approveAndCheckout(accepted);
  }

  function declineOffer() {
    if (!session) return;
    const declined = decideBuyerOffer(session, false);
    persist(declined);
    addAgentMessage(exactApprovalMessage(declined));
  }

  function askAboutProduct(name: string) {
    setGuideOpen(true);
    setInput(`I am interested in ${name}. My budget is `);
  }

  function beginAgain() {
    recorderRef.current?.stop();
    voiceAudioRef.current?.pause();
    clearCommerceSession();
    setSession(null);
    setMessages(initialMessages);
    setIntentDraft("");
    setInput("");
  }

  if (!profile) return <main className="page-loading">Opening your account...</main>;

  return (
    <main className="shop-page">
      <header className="store-header">
        <Link className="brand" href="/"><span className="brand-mark">G</span><span>GlowCart</span></Link>
        <nav className="store-nav" aria-label="Store navigation"><a href="#catalog">Shop</a><a href="#catalog">Routines</a><a href="#catalog">Gifts</a></nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search"><Search size={19} /></button>
          <span className="buyer-chip"><UserRound size={16} /> {profile.name}</span>
          <Link className="cart-button" href="/cart" aria-label="Open cart"><ShoppingBag size={19} /><span>{session?.activeCart.length ?? 0}</span></Link>
        </div>
      </header>

      <section className="shop-banner">
        <div><p>Signed in as {profile.name}</p><h1>Your shelf, without the guesswork.</h1><span>Browse the catalogue normally. Open GlowGuide only when you want help comparing what is actually here.</span></div>
      </section>

      <section className="catalog-shell" id="catalog">
        <div className="catalog-toolbar">
          <div><p className="kicker">Current collection</p><h2>Shop all care</h2></div>
          <div className="category-tabs" aria-label="Filter products">
            {(["all", "skincare", "bundle"] as const).map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item === "all" ? "All" : item === "bundle" ? "Routines" : "Essentials"}</button>)}
          </div>
        </div>

        <div className="retail-product-grid">
          {visibleProducts.map((product) => (
            <article className="retail-product" key={product.id}>
              <div className="product-photo" role="img" aria-label={product.name} style={{ backgroundImage: `url(${product.image})` }}>
                {product.stock <= 5 ? <span>{product.stock} left</span> : null}
              </div>
              <div className="retail-product-copy">
                <small>{product.useCases[0]}</small>
                <h3>{product.name}</h3>
                <p>{product.claimsAllowed[0]}</p>
                <div><strong>{formatINR(product.price)}</strong><button onClick={() => askAboutProduct(product.name)}>Ask GlowGuide</button></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <button className="guide-launcher" onClick={() => setGuideOpen(true)}><Sparkles size={19} /><span>Ask GlowGuide</span></button>

      {guideOpen ? <div className="guide-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setGuideOpen(false); }}>
        <aside className="guide-drawer" aria-label="GlowGuide shopping assistant">
          <header><div className="guide-avatar"><Sparkles size={20} /></div><div><strong>GlowGuide</strong><span>{voiceMode ? voiceStatus : "Grounded shopping assistant"}</span></div><div className="guide-header-actions"><button className={voiceMode ? "voice-mode active" : "voice-mode"} onClick={() => void toggleVoiceMode()} aria-pressed={voiceMode} title="Toggle spoken replies"><Volume2 size={16} /><span>{voiceMode ? "Voice on" : "Voice off"}</span></button><button onClick={() => setGuideOpen(false)} aria-label="Close GlowGuide"><X size={19} /></button></div></header>
          <div className="drawer-thread" aria-live="polite">
            {messages.map((message) => <div className={`message message-${message.role}`} key={message.id}>{message.text}</div>)}
            {!session && messages.length === 1 ? <div className="suggestion-list">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void submitMessage(suggestion)}>{suggestion}</button>)}</div> : null}
            {isThinking ? <div className="message message-agent thinking-message">Checking your request against the live catalogue...</div> : null}

            {session?.status === "awaiting_product_choice" ? <section className="recommendation-stack">
              <div className="evidence-line"><ShieldCheck size={16} /><span>Catalog, price, stock and policy references checked</span></div>
              {recommendationOptions.map(({ product, unitAmount }) => product ? <article key={product.id}>
                <div className="recommendation-thumb" style={{ backgroundImage: `url(${product.image})` }} />
                <div><strong>{product.name}</strong><span>{product.attributes.slice(0, 2).join(" · ")}</span><small>{formatINR(unitAmount)} · {product.stock} in stock</small></div>
                <button onClick={() => selectProduct(product.id)}>Choose</button>
              </article> : null)}
              <details><summary>Why other items were not chosen</summary>{session.recommendation.rejectedItems.map((item) => <p key={item.productId}><strong>{products.find((product) => product.id === item.productId)?.name ?? item.productId}:</strong> {item.reason}</p>)}</details>
            </section> : null}

            {session?.status === "checkout_blocked" ? <div className="notice danger"><ShieldCheck size={18} /><span><strong>{session.activeCart.length ? "Checkout stopped" : "No catalog match"}</strong>{session.activeCart.length ? session.auditEvents.at(-1)?.summary : session.recommendation.explanation}<small>No new money action was taken.</small></span></div> : null}
            {session?.offerDecision === "blocked" && session.offer?.approvalMode === "review_only" ? <div className="notice neutral"><ShieldCheck size={17} /><span><strong>{selectedProduct?.name ?? "Your selected item"} is selected.</strong>A bigger growth idea was withheld because the playbook marks it review-only. Your cart has not changed.</span></div> : null}

            {session?.offerDecision === "available_to_buyer" && session.offer ? <div className="offer-card">
              <span className="offer-label">{session.offer.source === "historical_pattern" ? `Evidence-backed from ${session.offer.evidence.observationCount} seed observations` : "Cold-start hypothesis"} · {session.offer.boundaryName}</span><strong>{session.offer.buyerMessage}</strong><p>Exact total with this offer: {formatINR(session.offer.finalAmount)}. Say okay to add it and pay. Boundary: {session.offer.ruleId}. {session.offer.safetySummary}</p>
              <div className="decision-row"><button className="accept-button" disabled={isCheckingOut} onClick={() => void acceptOfferAndPay()}><Check size={16} /> {isCheckingOut ? "Opening..." : `Add & pay ${formatINR(session.offer.finalAmount)}`}</button><button className="decline-button" onClick={declineOffer}><X size={16} /> Skip</button></div>
            </div> : null}

            {session?.status === "awaiting_buyer_approval" ? <div className="approval-card checkout-in-chat"><div><ShieldCheck size={18} /><span><strong>Approve the exact cart</strong><small>{cartNames}</small></span></div><p>Total: <strong>{formatINR(cartTotal)}</strong>. Say okay or use the button. GlowGuide will create the Razorpay order and open secure Checkout.</p><button className="approve-and-pay" disabled={isCheckingOut} onClick={() => void approveAndCheckout(session)}>{isCheckingOut ? "Creating secure order..." : `Approve & pay ${formatINR(cartTotal)}`}</button><Link href="/cart">View cart details</Link></div> : null}
            {session?.status === "checkout_complete" && session.checkout ? <div className="payment-card"><span>Razorpay test order ready</span><strong>{formatINR(session.checkout.amount ?? cartTotal)}</strong><small>{session.checkout.orderId}</small><button className="approve-and-pay" onClick={() => void launchRazorpayCheckout(session)}>Reopen Razorpay Checkout</button></div> : null}
            {session?.status === "payment_complete" ? <div className="notice success"><Check size={18} /><span><strong>Payment confirmed</strong>{session.payment?.message}</span></div> : null}
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); void submitMessage(); }}><input disabled={isThinking || isListening} value={input} onChange={(event) => setInput(event.target.value)} placeholder={isListening ? "Listening..." : "What are you looking for?"} aria-label="Message GlowGuide" /><button className={isListening ? "voice-input listening" : "voice-input"} type="button" disabled={isThinking} onClick={() => void toggleRecording()} aria-label={isListening ? "Stop voice input" : "Start voice input"} title={isListening ? "Stop recording" : "Talk to GlowGuide"}>{isListening ? <Square size={15} /> : <Mic size={18} />}</button><button type="submit" disabled={isThinking || isListening} aria-label="Send message"><ArrowRight size={18} /></button></form>
          {session ? <button className="start-over" onClick={beginAgain}>Start a new search</button> : null}
        </aside>
      </div> : null}
    </main>
  );
}
