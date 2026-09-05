import Link from "next/link";
import { Activity, ArrowLeft, Check, ClipboardCheck, FileWarning, ShieldCheck, X } from "lucide-react";
import { formatINR } from "@/lib/money";
import { runFindItEvaluation, type FindItScenarioCategory } from "@/lib/evaluation/findItScenarios";
import "../page.css";

const categoryLabels: Record<FindItScenarioCategory, string> = {
  catalog_grounding: "Catalog grounding",
  claim_safety: "Claim safety",
  auto_growth: "Auto growth",
  playbook_block: "Playbook block",
  review_only: "Review-only deals",
  cart_integrity: "Cart integrity",
  stock_recheck: "Stock recheck",
  financial_adversarial: "Financial adversarial"
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function FindItPage() {
  const report = runFindItEvaluation();
  const adversarial = report.categories.find((category) => category.category === "financial_adversarial");
  const orderedRows = [
    ...report.failures,
    ...report.results.filter((result) => result.passed)
  ];

  return (
    <main className="findit-page">
      <header className="store-header">
        <Link className="brand" href="/" aria-label="GlowCart home">
          <span className="brand-mark">G</span>
          <span>GlowCart</span>
        </Link>
        <nav className="store-nav" aria-label="Evaluation navigation">
          <Link href="/shop">Shop</Link>
          <Link href="/merchant">Merchant</Link>
          <Link href="/findit">Find-it eval</Link>
        </nav>
        <Link className="back-to-shop" href="/merchant"><ArrowLeft size={17} /> Merchant console</Link>
      </header>

      <section className="findit-hero">
        <div>
          <p className="kicker">Synthetic scenario evaluation</p>
          <h1>Find-it checks whether the commerce engine follows the rules.</h1>
          <span>500 deterministic scenarios run against the same recommendation, growth, playbook, mandate, and checkout guardrail code used by the app.</span>
        </div>
        <div className={report.failed ? "findit-score has-failures" : "findit-score"}>
          <span>Pass rate</span>
          <strong>{percent(report.passRate)}</strong>
          <small>{report.passed}/{report.total} scenarios passed</small>
        </div>
      </section>

      <section className="findit-metrics">
        <article><Activity size={20} /><span>Total scenarios</span><strong>{report.total}</strong></article>
        <article><Check size={20} /><span>Passed</span><strong>{report.passed}</strong></article>
        <article><X size={20} /><span>Failed</span><strong>{report.failed}</strong></article>
        <article><ShieldCheck size={20} /><span>Blocked money actions</span><strong>{report.moneyActionsBlocked}</strong></article>
        <article><FileWarning size={20} /><span>Financial attacks</span><strong>{adversarial?.total ?? 0}</strong><small>{adversarial?.passed ?? 0} blocked safely</small></article>
      </section>

      <section className="findit-grid">
        <article className="findit-panel">
          <div className="findit-heading">
            <div><ClipboardCheck size={19} /><h2>Category coverage</h2></div>
            <span>Engine-level, no LLM calls</span>
          </div>
          <div className="category-results">
            {report.categories.map((category) => (
              <div key={category.category}>
                <span>{categoryLabels[category.category]}</span>
                <strong>{category.passed}/{category.total}</strong>
                <div aria-label={`${categoryLabels[category.category]} pass rate`}>
                  <i style={{ width: `${category.passRate * 100}%` }} />
                </div>
                <small>{category.failed ? `${category.failed} failed` : "All passed"}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="findit-panel">
          <div className="findit-heading">
            <div><FileWarning size={19} /><h2>What this proves</h2></div>
          </div>
          <ul className="findit-proof-list">
            <li>Unsupported products do not become fake recommendations.</li>
            <li>Unverified medical/safety claims stop before cart creation.</li>
            <li>Auto-approved offers still need buyer approval before Razorpay.</li>
            <li>Review-only deals are withheld from the buyer and logged.</li>
            <li>Price or stock changes block checkout before money movement.</li>
            <li>Adversarial amount, cart, mandate, inventory, and deal attacks are blocked.</li>
          </ul>
          <p className="findit-note">These are synthetic cases, not real customer analytics. The goal is regression confidence for the agentic commerce control logic.</p>
        </article>
      </section>

      <section className="findit-panel">
        <div className="findit-heading">
          <div><Activity size={19} /><h2>Inspectable case traces</h2></div>
          <span>{orderedRows.length} cases shown</span>
        </div>
        <div className="scenario-list">
          {orderedRows.map((result, index) => (
            <details className={result.passed ? "scenario-case" : "scenario-case scenario-failed"} key={`${result.id}-${index}`} id={result.id}>
              <summary>
                <span><strong>{result.id}</strong><small>{result.passed ? "passed" : "failed"}</small></span>
                <span>{categoryLabels[result.category]}</span>
                <span>{result.buyerPrompt}</span>
                <span>{result.finalAmount ? formatINR(result.finalAmount) : "No money action"}</span>
                <span className={`risk-pill risk-${result.risk}`}>{result.risk}</span>
              </summary>
              <div className="scenario-detail-grid">
                <section>
                  <h3>Expected</h3>
                  <p>{result.expected}</p>
                </section>
                <section>
                  <h3>Actual</h3>
                  <p>{result.actual}</p>
                  {result.attackType ? <span className="attack-pill">{result.attackType.replaceAll("_", " ")}</span> : null}
                </section>
                <section>
                  <h3>Engine Evidence</h3>
                  <ul>{result.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section>
                  <h3>Guardrail Checks</h3>
                  <ul>{result.guardrailChecks.length ? result.guardrailChecks.map((item) => <li key={item}>{item}</li>) : <li>No checkout guardrail needed for this case.</li>}</ul>
                </section>
                <section>
                  <h3>Audit Actions</h3>
                  <ul>{result.auditActions.map((item) => <li key={item}>{item.replaceAll("_", " ")}</li>)}</ul>
                </section>
                <section>
                  <h3>Money Action</h3>
                  <p>{result.moneyActionBlocked ? "Blocked, withheld, or requires buyer authorization before Razorpay." : "No blocked money action; buyer-visible offer still needs exact-cart approval."}</p>
                </section>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
