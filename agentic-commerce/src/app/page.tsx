import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import "@/components/ui.css";
import "./page.css";

export default function HomePage() {
  return (
    <main className="retail-home">
      <header className="store-header home-header">
        <Link className="brand" href="/" aria-label="GlowCart home">
          <span className="brand-mark">G</span>
          <span>GlowCart</span>
        </Link>
        <nav className="store-nav" aria-label="Main navigation">
          <a href="#new">New</a>
          <a href="#routines">Routines</a>
          <a href="#standards">Our standards</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search"><Search size={19} /></button>
          <Link className="header-sign-in" href="/login">Sign in</Link>
          <Link className="cart-button" href="/cart" aria-label="Cart"><ShoppingBag size={19} /></Link>
        </div>
      </header>

      <section className="retail-hero">
        <div className="retail-hero-shade" />
        <div className="retail-hero-copy">
          <p>Daily care, considered</p>
          <h1>GlowCart</h1>
          <span>Skincare chosen around your routine, budget, and the things you care about.</span>
          <Link href="/login">Shop the collection <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="home-category-band" id="new">
        <div>
          <p className="kicker">Start with what you need</p>
          <h2>Browse first. Ask when you want help.</h2>
        </div>
        <div className="home-category-grid" id="routines">
          <Link href="/login"><span>01</span><strong>Daily essentials</strong><small>Cleanse, hydrate, protect</small></Link>
          <Link href="/login"><span>02</span><strong>Starter routines</strong><small>Simple sets for a clear beginning</small></Link>
          <Link href="/login"><span>03</span><strong>Thoughtful gifts</strong><small>Useful care with a personal touch</small></Link>
        </div>
      </section>

      <section className="home-standards" id="standards">
        <div><ShieldCheck size={22} /><strong>Catalog grounded</strong><span>We only recommend products the store actually carries.</span></div>
        <div><Sparkles size={22} /><strong>Help on your terms</strong><span>The shopping guide appears only when you open it.</span></div>
        <div><ShoppingBag size={22} /><strong>Your cart, your call</strong><span>Recommendations and offers never add themselves.</span></div>
      </section>
    </main>
  );
}
