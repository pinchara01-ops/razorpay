"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BUYER_PROFILE_KEY } from "@/lib/buyerProfile";
import "../page.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("priya@example.com");
  const [password, setPassword] = useState("glowcart");
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => setClientReady(true), []);

  function signIn(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;
    window.localStorage.setItem(BUYER_PROFILE_KEY, JSON.stringify({ name: "Priya", email }));
    router.push("/shop");
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="GlowCart collection" />
      <section className="login-panel">
        <Link className="login-back" href="/"><ArrowLeft size={17} /> Home</Link>
        <div className="login-form-wrap">
          <Link className="brand" href="/"><span className="brand-mark">G</span><span>GlowCart</span></Link>
          <div className="login-heading"><span><LockKeyhole size={19} /></span><h1>Welcome back</h1><p>Sign in to browse your saved routines and open GlowGuide when you need it.</p></div>
          <form onSubmit={signIn}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button type="submit" disabled={!clientReady}>Sign in <ArrowRight size={18} /></button>
          </form>
          <small className="login-security"><LockKeyhole size={14} /> Your payment details are handled by Razorpay Checkout.</small>
        </div>
      </section>
    </main>
  );
}
