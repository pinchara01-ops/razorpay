"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  PackageSearch,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Volume2,
  X
} from "lucide-react";
import { hydrateCartItems } from "@/lib/cart";
import { applyPriceOverrides, overrideProductPrice, reevaluateGrowthPlaybook } from "@/lib/commerce/engine";
import { COMMERCE_SESSION_KEY, loadCommerceSession, saveCommerceSession } from "@/lib/commerce/sessionStore";
import { loadGrowthPlaybook, resetGrowthPlaybook, saveGrowthPlaybook } from "@/lib/growth/playbookStore";
import { formatINR } from "@/lib/money";
import { growthPolicyRepository, policyRepository, productRepository } from "@/lib/repositories/commerceRepositories";
import type { ApprovalMode, CommerceSession, GrowthRule, RiskLevel } from "@/lib/types";
import "@/components/ui.css";
import "../page.css";

type ConsoleView = "overview" | "opportunities" | "playbook" | "audit";

const navigation: Array<{ id: ConsoleView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "opportunities", label: "Growth inbox", icon: Sparkles },
  { id: "playbook", label: "Growth playbook", icon: ClipboardCheck },
  { id: "audit", label: "Audit trail", icon: FileClock }
];

const catalog = productRepository.list();
const policies = policyRepository.list();
const defaultGrowthRules = growthPolicyRepository.list();

export default function MerchantConsolePage() {
  const [session, setSession] = useState<CommerceSession | null>(null);
  const [rules, setRules] = useState<GrowthRule[]>(defaultGrowthRules);
  const [view, setView] = useState<ConsoleView>("overview");
  const [voiceStatus, setVoiceStatus] = useState("Ready");

  useEffect(() => {
    setSession(loadCommerceSession());
    setRules(loadGrowthPlaybook());
    function syncSession(event: StorageEvent) {
      if (event.key === COMMERCE_SESSION_KEY) setSession(loadCommerceSession());
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  const products = useMemo(
    () => applyPriceOverrides(catalog, session?.priceOverrides ?? {}),
    [session?.priceOverrides]
  );
  const cart = session ? hydrateCartItems(session.activeCart, products) : [];

  function persist(next: CommerceSession) {
    setSession(next);
    saveCommerceSession(next);
  }

  function updateRule(ruleId: string, changes: Partial<Pick<GrowthRule, "enabled">> & { risk?: RiskLevel; approvalMode?: ApprovalMode }) {
    const nextRules = rules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      if (changes.risk && changes.approvalMode) {
        return { ...rule, approvalByRisk: { ...rule.approvalByRisk, [changes.risk]: changes.approvalMode } };
      }
      return { ...rule, enabled: changes.enabled ?? rule.enabled };
    });
    setRules(nextRules);
    saveGrowthPlaybook(nextRules);
    if (session) persist(reevaluateGrowthPlaybook(session, products, nextRules));
  }

  function restorePlaybook() {
    const defaults = resetGrowthPlaybook();
    setRules(defaults);
    if (session) persist(reevaluateGrowthPlaybook(session, products, defaults));
  }

  async function playVoice() {
    if (!session?.offer) return;
    setVoiceStatus("Preparing voice...");
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: session.offer.merchantScript })
      });
      if (response.ok && response.headers.get("Content-Type")?.includes("audio")) {
        const blob = await response.blob();
        await new Audio(URL.createObjectURL(blob)).play();
        setVoiceStatus("Played with connected voice provider");
        return;
      }
    } catch {
      // Browser voice keeps the workflow available when the external adapter is unavailable.
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(session.offer.merchantScript);
      utterance.rate = 0.96;
      window.speechSynthesis.speak(utterance);
      setVoiceStatus("Played with browser voice");
    } else {
      setVoiceStatus("Voice is unavailable on this device");
    }
  }

  function simulatePriceChange() {
    if (!session?.activeCart[0]) return;
    const item = session.activeCart[0];
    const currentProduct = products.find((product) => product.id === item.productId);
    if (currentProduct) persist(overrideProductPrice(session, item.productId, currentProduct.price + 5000));
  }

  const unsafeBlocks = session?.auditEvents.filter((event) => event.tone === "danger").length ?? 0;
  const audit = [...(session?.auditEvents ?? [])].reverse();

  return (
    <main className="merchant-shell">
      <aside className="merchant-sidebar">
        <Link className="brand inverse" href="/merchant"><span className="brand-mark">G</span><span>GlowCart</span></Link>
        <div className="workspace-label"><Store size={16} /><span>Merchant workspace</span></div>
        <nav aria-label="Merchant navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}><Icon size={18} />{item.label}</button>;
          })}
        </nav>
        <div className="sidebar-footer">
          <Link href="/findit"><ShieldCheck size={17} /> Find-it eval</Link>
          <button><Settings2 size={18} /> Settings</button>
          <Link href="/shop"><ArrowLeft size={17} /> Open storefront</Link>
        </div>
      </aside>

      <section className="merchant-main">
        <header className="merchant-topbar">
          <div><p>Growth operations</p><h1>{navigation.find((item) => item.id === view)?.label}</h1></div>
          <div className="operator"><span>IP</span><div><strong>Inchara</strong><small>Administrator</small></div></div>
        </header>

        {!session && view !== "playbook" ? (
          <div className="empty-workspace">
            <PackageSearch size={34} />
            <h2>No active commerce session</h2>
            <p>Once a buyer asks GlowGuide for help, their structured intent and any guarded growth opportunity will appear here.</p>
            <Link className="primary-action" href="/shop">Open storefront <ChevronRight size={17} /></Link>
          </div>
        ) : null}

        {session && view === "overview" ? (
          <>
            <div className="metric-row">
              <article><span>Active sessions</span><strong>1</strong><small><Activity size={14} /> Live now</small></article>
              <article><span>Proposed value</span><strong>{formatINR(session.offer?.finalAmount ?? 0)}</strong><small><ShoppingBag size={14} /> Current opportunity</small></article>
              <article><span>Growth signals</span><strong>{session.growthSignals.length}</strong><small><Sparkles size={14} /> First-party events</small></article>
              <article><span>Blocked actions</span><strong>{unsafeBlocks}</strong><small><ShieldCheck size={14} /> Guardrails active</small></article>
            </div>

            <div className="merchant-grid">
              <section className="admin-panel span-two">
                <div className="admin-heading"><div><span className="section-icon"><Sparkles size={18} /></span><div><h2>Latest growth opportunity</h2><p>Live buyer intent matched against your playbook</p></div></div><button className="text-action" onClick={() => setView("opportunities")}>Open inbox <ChevronRight size={16} /></button></div>
                {session.offer ? <Opportunity session={session} voiceStatus={voiceStatus} onVoice={playVoice} /> : <p className="admin-empty">The current cart has no relevant playbook offer.</p>}
              </section>

              <section className="admin-panel">
                <div className="admin-heading"><div><span className="section-icon"><ShieldCheck size={18} /></span><div><h2>Control status</h2><p>Current money-action gates</p></div></div></div>
                <div className="control-list">
                  <Control label="Growth decision" passed={!session.offer || session.offerGuardrails.passed} />
                  <Control label="Playbook authority" passed={!session.offer || session.offerDecision !== "blocked" || session.offer.approvalMode === "review_only"} />
                  <Control label="Buyer exact-cart approval" passed={Boolean(session.mandate)} />
                  <Control label="Order creation" passed={session.status === "checkout_complete"} />
                </div>
              </section>
            </div>

            {session.activeCart.length > 0 && !session.checkout ? (
              <section className="admin-panel failure-panel">
                <div><AlertTriangle size={20} /><span><strong>Integrity test</strong><small>Change a catalog price before buyer approval. The stale cart must be blocked without creating a Razorpay order.</small></span></div>
                <button onClick={simulatePriceChange}>Change price by {formatINR(5000)}</button>
              </section>
            ) : null}
          </>
        ) : null}

        {session && view === "opportunities" ? (
          <section className="admin-panel">
            <div className="admin-heading"><div><span className="section-icon"><Sparkles size={18} /></span><div><h2>Session {session.id}</h2><p>{session.prompt}</p></div></div><span className={`state-pill state-${session.status}`}>{session.status.replaceAll("_", " ")}</span></div>
            {session.offer ? <Opportunity session={session} voiceStatus={voiceStatus} onVoice={playVoice} /> : <p className="admin-empty">No eligible offer for this session.</p>}
            <div className="detail-grid">
              <div><h3>Structured intent</h3><dl><dt>Goal</dt><dd>{session.recommendation.intent.goal}</dd><dt>Budget</dt><dd>{formatINR(session.recommendation.intent.maxAmount)}</dd><dt>Constraints</dt><dd>{session.recommendation.intent.constraints.join(", ") || "None"}</dd></dl></div>
              <div><h3>Recommended cart</h3>{cart.map(({ product, unitAmount }) => <div className="admin-cart-line" key={product?.id}><span>{product?.name}</span><strong>{formatINR(unitAmount)}</strong></div>)}</div>
              <div><h3>Guardrail checks</h3>{session.offerGuardrails.checks.map((check) => <div className="check-line" key={check.name}>{check.passed ? <Check size={15} /> : <X size={15} />}<span>{check.name}<small>{check.reason}</small></span></div>)}</div>
            </div>
            <section className="session-evidence"><h3>First-party session events</h3><p>Only actions produced in this storefront are recorded.</p><div>{session.sessionEvents.map((event, index) => <span key={`${event.type}-${event.timestamp}-${index}`}><strong>{event.type.replaceAll("_", " ")}</strong>{"productId" in event ? event.productId : "value" in event ? event.value : "topic" in event ? event.topic : `${event.seconds} seconds`}</span>)}</div></section>
          </section>
        ) : null}

        {view === "playbook" ? (
          <div className="playbook-layout">
            <section className="admin-panel span-two">
              <div className="admin-heading"><div><span className="section-icon"><ClipboardCheck size={18} /></span><div><h2>Offer rules</h2><p>Changes are saved locally and immediately re-evaluate any active, unpaid cart.</p></div></div><button className="text-action" onClick={restorePlaybook}><RotateCcw size={15} /> Restore defaults</button></div>
              {session?.activeCart.length ? <div className="playbook-outcome"><span>Current cart evaluation</span><strong>{session.offer ? `Matched ${session.offer.ruleId}` : "No enabled rule matched"}</strong><small>The cart still requires buyer approval either way.</small></div> : null}
              <div className="rules-table">
                {rules.map((rule) => (
                  <article key={rule.id}>
                    <div><strong>{rule.name}</strong><span>{rule.explanation}</span><small>Allows: {rule.allowedOfferTypes.map((type) => type.replaceAll("_", " ")).join(", ")} · Categories: {rule.allowedCategories.join(", ")} · Min margin: {rule.minMarginPercent}% · Rule ID: {rule.id}</small></div>
                    <span>{rule.maxAddedAmount ? `Max add ${formatINR(rule.maxAddedAmount)}` : "No added amount"}</span>
                    <span className="risk-low">boundary</span>
                    <div className="rule-controls">
                      <button className={`rule-toggle ${rule.enabled ? "on" : ""}`} role="switch" aria-checked={rule.enabled} onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}><span />{rule.enabled ? "Active" : "Off"}</button>
                      <select aria-label={`Low-risk authority mode for ${rule.name}`} disabled={!rule.enabled} value={rule.approvalByRisk.low} onChange={(event) => updateRule(rule.id, { risk: "low", approvalMode: event.target.value as ApprovalMode })}><option value="auto_approved">Low risk: auto-approved</option><option value="review_only">Low risk: review-only log</option></select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="admin-panel"><h2>Merchant policies</h2><div className="policy-stack">{policies.map((policy) => <div key={policy.id}><strong>{policy.title}</strong><p>{policy.summary}</p></div>)}</div></section>
          </div>
        ) : null}

        {session && view === "audit" ? (
          <section className="admin-panel">
            <div className="admin-heading"><div><span className="section-icon"><FileClock size={18} /></span><div><h2>Decision history</h2><p>Record of recommendations, approvals, blocks, and payment state</p></div></div><span className="state-pill">{audit.length} events</span></div>
            <div className="audit-table">
              {audit.map((event) => <article key={event.id}><span className={`audit-dot audit-${event.tone ?? "info"}`} /><div><strong>{event.action.replaceAll("_", " ")}</strong><p>{event.summary}</p>{typeof event.data?.source === "string" ? <small>{event.data.source === "historical_pattern" ? "Evidence-backed" : "Cold-start hypothesis"} · Boundary: {String(event.data.boundaryId ?? "none")}</small> : null}</div><span>{event.actor}</span><time>{new Date(event.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></article>)}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Control({ label, passed }: { label: string; passed: boolean }) {
  return <div className={passed ? "control-pass" : "control-wait"}>{passed ? <Check size={16} /> : <FileClock size={16} />}<span>{label}</span><strong>{passed ? "Complete" : "Waiting"}</strong></div>;
}

function Opportunity({ session, voiceStatus, onVoice }: { session: CommerceSession; voiceStatus: string; onVoice: () => void }) {
  if (!session.offer) return null;
  const sourceLabel = session.offer.source === "historical_pattern"
    ? `Evidence-backed · ${session.offer.evidence.observationCount} observations`
    : "Cold-start hypothesis";
  const reviewOnly = session.offer.approvalMode === "review_only";
  return (
    <div className="opportunity-card">
      <div className="opportunity-main">
        <div className="signal-row"><span>{session.offer.signal.type.replaceAll("_", " ")}</span><span>{sourceLabel}</span><span>{Math.round(session.offer.signal.confidence * 100)}% confidence</span><span>{session.offer.riskLevel} risk</span></div>
        <h3>{session.offer.merchantScript}</h3>
        <p>{reviewOnly ? "Withheld from buyer because this boundary is review-only. Change the Growth Playbook if this should become automatic in future sessions." : session.offer.safetySummary} Boundary checked: {session.offer.boundaryName}. Margin: {Math.round(session.offer.incrementalMarginPercent)}%.</p>
        <div className="opportunity-amount"><span>Added value <strong>{formatINR(session.offer.addedAmount)}</strong></span><span>Proposed total <strong>{formatINR(session.offer.finalAmount)}</strong></span></div>
      </div>
      <div className="opportunity-actions">
        <button className="voice-button" onClick={onVoice}><Volume2 size={17} /> Hear briefing</button>
        <small>{voiceStatus}</small>
        <span className="decision-state"><ShieldCheck size={17} /> {reviewOnly ? "withheld for review" : session.offerDecision.replaceAll("_", " ")}</span>
      </div>
    </div>
  );
}
