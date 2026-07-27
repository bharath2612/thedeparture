import Link from "next/link";
import CurrencySwitcher from "./CurrencySwitcher";
import { COMPANY } from "@/lib/company";
import { showOpsPricing } from "@/lib/opsview";
import type { CurrencyCode } from "@/lib/currency";

// The three components the landing design imported (StatusPill, AgentChip,
// SlaBadge) plus the shared header/footer/chat dock. Rebuilt as real React —
// the design shipped them as separate design-canvas documents.

export function StatusPill({
  state = "ontime",
  label,
}: {
  state?: "ontime" | "delayed" | "neutral";
  label: string;
}) {
  const caret = state === "delayed" ? "▾" : state === "ontime" ? "▴" : "•";
  return (
    <span className={`statuspill ${state}`}>
      <span aria-hidden>{caret}</span>
      {label}
    </span>
  );
}

export function AgentChip({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  return (
    <span className="agentchip">
      <span className="avatar">{initials}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span className="k">Agent</span>
        <span className="n">{name}</span>
      </span>
    </span>
  );
}

export function SlaBadge({ seconds, label }: { seconds: number; label?: string }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const display = m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
  return (
    <span className="slabadge">
      <span className="dot" />
      {label ? <span className="k">{label}</span> : null}
      <span className="t">{display}</span>
    </span>
  );
}

export function SiteHeader({
  env,
  currency,
  active,
}: {
  env: { label: string; live: boolean };
  currency: { code: CurrencyCode; source: "chosen" | "ip" | "default" };
  active?: "how" | "agencies" | "support";
}) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          <span>The Departure</span>
        </Link>
        <nav className="navlinks">
          <Link className={active === "how" ? "on" : ""} href="/#how">
            How it works
          </Link>
          {showOpsPricing() && (
            <Link className={active === "agencies" ? "on" : ""} href="/suppliers">
              Suppliers
            </Link>
          )}
          <Link className={active === "support" ? "on" : ""} href="/#support">
            Support
          </Link>
        </nav>
        <div className="navright">
          <CurrencySwitcher current={currency.code} source={currency.source} />
          {/* SANDBOX/LIVE is a deployment fact about us, not information for a
              traveller — and printing "SANDBOX" beside a price invites exactly
              the wrong question. */}
          {showOpsPricing() && (
            <span className="envtag">
              ENV <b className={env.live ? "env-live" : "env-sandbox"}>{env.label}</b>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const a = COMPANY.address;
  return (
    <footer className="sitefoot">
      <div className="inner">
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 34, height: 34, borderRadius: 8 }} />
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 500 }}>{COMPANY.brand}</span>
            <span className="mark">Smart Travel · AI Powered</span>
          </span>
        </div>
        <div className="links">
          <Link href="/flights">Flights</Link>
          <Link href="/results">Hotels</Link>
          {showOpsPricing() && <Link href="/suppliers">Suppliers</Link>}
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="legalbar">
        <span>
          {COMPANY.legalName} · {a.line1}, {a.line2}, {a.city} {a.postcode}, {a.country}
        </span>
        <span className="copy">© 2026 {COMPANY.legalName.toUpperCase()}</span>
      </div>
    </footer>
  );
}

export function ChatDock() {
  return (
    <div className="chatdock">
      <span className="icon">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z" />
        </svg>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span className="t1">Departures Desk</span>
        <span className="t2">Replies in &lt; 5 min</span>
      </span>
    </div>
  );
}
