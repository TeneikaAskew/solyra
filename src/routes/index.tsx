import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, Minus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Volara — Read market structure before price moves" },
      {
        name: "description",
        content:
          "Volara is a market structure terminal: dealer positioning, institutional flow, charting and an AI analyst in one workspace for self-directed traders.",
      },
      { property: "og:title", content: "Volara — Read market structure before price moves" },
      {
        property: "og:description",
        content:
          "Dealer positioning, institutional flow, charting and an AI analyst — one terminal built for self-directed traders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/* ------------------------------------------------------------------ data */

const navLinks = [
  { label: "Modules", href: "#modules" },
  { label: "Platform", href: "#platform" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Proof", href: "#proof" },
];

const audiences = ["Swing Traders", "Day Traders", "Futures Desks", "Long-Term Investors"];

const modules = [
  {
    eyebrow: "Charting Engine",
    name: "Meridian",
    trademark: true,
    blurb:
      "A complete charting surface — drawing tools, studies, session replay — with positioning pressure and the hedging paths behind it rendered directly on price.",
    cta: "Explore Meridian",
    points: [
      ["01", "Pressure Bands", "Forward exposure paths drawn from live positioning data"],
      ["02", "Magnet Levels", "Strikes where hedging becomes mechanical rather than optional"],
      ["03", "Session Replay", "Rewind any day and watch structure assemble tick by tick"],
      ["04", "24 Overlays", "Gamma, vanna, charm, dark-pool prints and blended composites"],
      ["05", "Paper Desk Link", "Stage a trade on the chart you are already reading"],
      ["06", "Layout Studio", "Save multi-monitor workspaces per strategy, not per ticker"],
    ],
    visual: "chart" as const,
  },
  {
    eyebrow: "Practice & Social",
    name: "Paper Desk",
    trademark: false,
    blurb:
      "Take the trade before you take the trade. Paper Desk puts a simulated book on the exact chart you are reading, so a bad read costs you points instead of capital.",
    cta: "Open Paper Desk",
    points: [
      ["01", "Simulated Book", "Strike, expiry and size on live data with nothing at risk"],
      ["02", "One-Click Ticket", "The ticket opens from the Meridian chart in context"],
      ["03", "Verified Positioning", "See how members are actually positioned, not what they post"],
      ["04", "On Every Tier", "Practice is never gated behind the top plan"],
    ],
    visual: "desk" as const,
  },
];

const platformCards = [
  {
    tag: "Pressure",
    audience: "Day Traders",
    title: "Triad View",
    body: "Three-panel positioning read across index, ETF and futures proxies, refreshed every sixty seconds so intraday inflection is visible while it forms.",
    tone: "signal" as const,
    span: "lg:col-span-7",
  },
  {
    tag: "Pressure",
    audience: "Swing Traders",
    title: "Horizon Map",
    body: "Full exposure heatmap across strikes and expirations. Find where positioning is stacked and where multi-day moves have room to run.",
    tone: "mint" as const,
    span: "lg:col-span-5",
  },
  {
    tag: "Flow",
    audience: "Options Traders",
    title: "Live Tape",
    body: "Institutional options flow with 22 filterable columns. Isolate sweeps, blocks and outliers as the print lands.",
    tone: "ember" as const,
    span: "lg:col-span-5",
  },
  {
    tag: "Flow",
    audience: "Research",
    title: "Contract Drilldown",
    body: "Open any contract: volume, open interest, chain ratio and fill history stitched into a single readable view.",
    tone: "signal" as const,
    span: "lg:col-span-7",
  },
  {
    tag: "Community",
    audience: "Members",
    title: "Floor",
    body: "Follow verified traders, publish setups, track live positions and build a track record that is measured instead of claimed.",
    tone: "mint" as const,
    span: "lg:col-span-7",
  },
  {
    tag: "Extensibility",
    audience: "Coming Q3",
    title: "Workbench",
    body: "Assemble your own agents from data sources, rules and actions, then let them watch the tape while you do not.",
    tone: "ember" as const,
    span: "lg:col-span-5",
  },
];

const principles = [
  {
    title: "Institutional Foundation",
    body: "Licensed, high-fidelity market data of the grade desks keep behind glass — delivered without dilution.",
  },
  {
    title: "The Signal Layer",
    body: "Agents scan continuously and surface candidates that match your rules, so you review instead of hunt.",
  },
  {
    title: "One Workspace",
    body: "Research, simulate and review inside a single surface. Familiar charts, sharper instruments.",
  },
  {
    title: "Structured Context",
    body: "Filings, transcripts and sentiment tagged at the source, so your agents reason on data, not summaries.",
  },
  {
    title: "A Real Floor",
    body: "A member community that trades the same read, with performance attached to every claim.",
  },
];

const loopCards = [
  {
    title: "Research That Runs Itself",
    body: "Screens execute on schedule, filings get parsed, candidates arrive ranked and annotated.",
  },
  {
    title: "Trader-Native Design",
    body: "No onboarding maze. The terminal maps to the workflow you already run every session.",
  },
  {
    title: "The Whole Lifecycle",
    body: "Idea, sizing, execution notes and post-trade review live in one continuous loop.",
  },
];

const testimonials = [
  "Six weeks in and the positioning map has replaced three subscriptions I was stacking. The levels are the levels.",
  "I stopped guessing at reversal zones. Being able to see where hedging turns mechanical changed how I size.",
  "Paper Desk is the part nobody talks about. I ran a strategy for a month before risking a dollar on it.",
  "The tape filters alone are worth the tier. I catch blocks I would have scrolled past on any other feed.",
  "Support answers in minutes and the weekly sessions actually teach the tool instead of selling the next thing.",
  "Been trading nine years. This is the first workspace where research and execution notes live in the same place.",
  "The replay mode is how I review every losing day now. Watching structure rebuild is worth an hour a week.",
  "Not a magic button — it is a better read. That is exactly what I wanted and rarely what gets sold.",
];

const tiers = [
  {
    name: "Floor",
    tagline: "Get oriented",
    monthly: 89,
    annual: 71,
    cta: "Join Floor",
    featured: false,
    features: [
      ["Member community", true],
      ["Daily structure brief", true],
      ["Live Tape — indices", true],
      ["Paper Desk", true],
      ["Live sessions", "Audio only"],
      ["Horizon Map — indices", false],
      ["Horizon Map — 1,400 tickers", false],
      ["Meridian charting", false],
      ["Analyst agent", false],
      ["Workbench", false],
    ] as [string, boolean | string][],
  },
  {
    name: "Operator",
    tagline: "Trade with an edge",
    monthly: 249,
    annual: 199,
    cta: "Get Operator",
    featured: true,
    features: [
      ["Member community", true],
      ["Daily structure brief", true],
      ["Live Tape — full market", true],
      ["Paper Desk", true],
      ["Live sessions", true],
      ["Horizon Map — indices", true],
      ["Horizon Map — 1,400 tickers", false],
      ["Meridian charting", true],
      ["Analyst agent", "Limited"],
      ["Workbench", false],
    ] as [string, boolean | string][],
  },
  {
    name: "Desk",
    tagline: "The full instrument set",
    monthly: 599,
    annual: 479,
    cta: "Go Desk",
    featured: false,
    features: [
      ["Member community", true],
      ["Daily structure brief", true],
      ["Live Tape — full market", true],
      ["Paper Desk", true],
      ["Live sessions", true],
      ["Horizon Map — indices", true],
      ["Horizon Map — 1,400 tickers", true],
      ["Meridian charting", true],
      ["Analyst agent", true],
      ["Workbench", "Q3 preview"],
    ] as [string, boolean | string][],
  },
];

const faqs = [
  [
    "What exactly is Volara measuring?",
    "Volara models the positioning that market makers accumulate through options activity, then maps where that positioning forces hedging as price travels. It is a structural read on supply and demand, not a prediction engine.",
  ],
  [
    "Do I need to trade options to get value?",
    "No. Many members trade shares or futures and use the maps purely as level context — where price is likely to stall, accelerate or mean-revert.",
  ],
  [
    "How current is the data?",
    "Positioning refreshes each minute during regular hours and flow streams as prints land. Historical replay reaches back three years on index products.",
  ],
  [
    "Is there a learning curve?",
    "A short one. Every tier includes a guided curriculum and weekly live sessions, and most members are reading the primary maps confidently inside two weeks.",
  ],
  [
    "Can I cancel whenever I want?",
    "Yes. Plans are self-serve month to month, cancel from your account page, and annual plans are prorated within the first fourteen days.",
  ],
  [
    "Is this financial advice?",
    "No. Volara is a data and analytics product. Nothing in the terminal or the community is a recommendation, and simulated results are not indicative of future performance.",
  ],
];

const footerCols = [
  { title: "Product", links: ["Meridian", "Horizon Map", "Live Tape", "Paper Desk", "Workbench"] },
  { title: "Company", links: ["About", "Careers", "Press kit", "Partners", "Contact"] },
  { title: "Learn", links: ["Curriculum", "Glossary", "Live sessions", "Changelog", "Status"] },
  { title: "Legal", links: ["Terms", "Privacy", "Disclaimer", "Data sources", "Cookies"] },
];

/* ------------------------------------------------------------- components */

function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-signal-soft to-signal ${className}`}
      aria-hidden
    >
      <span className="size-2.5 rotate-45 rounded-[2px] bg-background" />
    </span>
  );
}

function Wordmark() {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <Mark />
      <span className="font-display text-lg font-extrabold tracking-[0.16em] text-foreground">
        VOLARA
      </span>
    </a>
  );
}

function PrimaryButton({
  children,
  href = "#pricing",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 ${className}`}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

function GhostButton({
  children,
  href = "#modules",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-input bg-surface/60 px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-2 ${className}`}
    >
      {children}
    </a>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 lg:px-10">
        <Wordmark />

        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          <span className="h-5 w-px bg-border" />
          <a href="#pricing" className="text-sm font-semibold text-foreground/90 hover:text-foreground">
            Log in
          </a>
          <a
            href="#pricing"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Sign up
          </a>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-full border border-input lg:hidden"
        >
          <span className="flex flex-col gap-1">
            <span className="block h-px w-4 bg-foreground" />
            <span className="block h-px w-4 bg-foreground" />
          </span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#pricing"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              Sign up
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % audiences.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden pt-32 lg:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[820px] halo" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[820px] opacity-[0.18] grid-lines [mask-image:radial-gradient(60%_50%_at_50%_10%,black,transparent)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-[1400px] px-5 lg:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-[2.75rem] font-bold leading-[1.03] sm:text-6xl lg:text-[4.6rem]">
            Trade the structure
            <br />
            <span className="text-muted-foreground">beneath the price.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Dealers hedge because they are obligated to, not because they have a view. Volara maps
            where that obligation lands — so you are already at the level when price arrives.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton>Get access</PrimaryButton>
            <GhostButton>See how it works</GhostButton>
          </div>

          <p className="eyebrow mt-10">Market data licensed via NASDAQ, CBOE &amp; OPRA</p>
        </div>

        <div className="mx-auto mt-24 max-w-3xl text-center lg:mt-28">
          <p className="text-base text-muted-foreground sm:text-lg">
            The market structure terminal purpose-built for self-directed
          </p>
          <p key={i} className="rise-in mt-3 text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]">
            {audiences[i]}
          </p>
          <span className="mx-auto mt-3 block h-px w-16 bg-signal" />
        </div>

        <div className="mt-16 lg:mt-20">
          <p className="eyebrow mb-5 text-center">The terminal, live</p>
          <TerminalMock />
        </div>
      </div>
    </section>
  );
}

function TerminalMock() {
  const rows = Array.from({ length: 16 });
  return (
    <div className="relative mx-auto max-w-[1180px]">
      <div
        className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-signal/15 blur-3xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-ember/70" />
            <span className="size-2.5 rounded-full bg-muted-foreground/40" />
            <span className="size-2.5 rounded-full bg-mint/60" />
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            volara · meridian / horizon-map · SPX 0DTE
          </span>
          <span className="ml-auto hidden items-center gap-1.5 font-mono text-[11px] text-mint sm:flex">
            <span className="size-1.5 rounded-full bg-mint" /> live
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="flex flex-col gap-[3px]">
              {rows.map((_, r) => (
                <div key={r} className="flex items-center gap-[3px]">
                  <span className="w-12 shrink-0 text-right font-mono text-[9px] text-muted-foreground">
                    {6180 - r * 10}
                  </span>
                  {Array.from({ length: 26 }).map((__, c) => {
                    const v = (Math.sin(r * 1.7 + c * 0.55) + Math.cos(c * 0.31 - r * 0.4)) / 2;
                    const mag = Math.abs(v);
                    const color = v > 0 ? "var(--mint)" : "var(--signal)";
                    return (
                      <span
                        key={c}
                        className="h-3 flex-1 rounded-[2px]"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${color} ${Math.round(mag * 82)}%, transparent)`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground">
              <span>GEX +2.41B</span>
              <span>VEX −318M</span>
              <span>FLIP 6,042</span>
              <span>MAGNET 6,100</span>
            </div>
          </div>

          <div className="p-4">
            <p className="eyebrow">Analyst</p>
            <div className="mt-3 space-y-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <p>
                <span className="text-signal-soft">›</span> Positioning is stacked long-gamma above
                6,100. Expect compression into the close unless the tape clears the shelf.
              </p>
              <p>
                <span className="text-signal-soft">›</span> Flip level at 6,042. Below it, hedging
                turns pro-cyclical and realized volatility expands quickly.
              </p>
              <p>
                <span className="text-signal-soft">›</span> Tape: 3 sweeps &gt; $1M in the 6,150
                calls, 12m. Net delta positive.
              </p>
            </div>
            <div className="mt-5 space-y-2">
              {[
                ["Magnet", "6,100", "mint"],
                ["Flip", "6,042", "signal"],
                ["Shelf", "5,975", "ember"],
              ].map(([k, v, tone]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {k}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: `var(--${tone})` }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>MERIDIAN · 5m</span>
        <span>Pressure bands on</span>
      </div>
      <div className="relative mt-4 h-64 sm:h-80">
        {[0.18, 0.42, 0.66].map((t, i) => (
          <span
            key={t}
            className="absolute inset-x-0 h-px"
            style={{
              top: `${t * 100}%`,
              background: `color-mix(in oklab, var(--${["mint", "signal", "ember"][i]}) 55%, transparent)`,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {Array.from({ length: 54 }).map((_, i) => {
            const base = 32 + Math.sin(i * 0.32) * 20 + Math.sin(i * 0.11) * 14;
            const body = 6 + Math.abs(Math.sin(i * 0.9)) * 22;
            const up = Math.sin(i * 0.9) > 0;
            return (
              <span key={i} className="relative flex-1" style={{ height: "100%" }}>
                <span
                  className="absolute left-1/2 w-px -translate-x-1/2 rounded"
                  style={{
                    bottom: `${base}%`,
                    height: `${body + 12}%`,
                    background: up ? "var(--mint)" : "var(--ember)",
                    opacity: 0.45,
                  }}
                />
                <span
                  className="absolute inset-x-0 rounded-[2px]"
                  style={{
                    bottom: `${base + 4}%`,
                    height: `${body}%`,
                    background: up ? "var(--mint)" : "var(--ember)",
                    opacity: 0.85,
                  }}
                />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeskVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>PAPER DESK · TICKET</span>
        <span className="text-mint">simulated</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ["Symbol", "SPX"],
          ["Strike", "6,100 C"],
          ["Expiry", "0DTE"],
          ["Size", "4"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-background/60 px-3 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
            <p className="mt-1 text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {[
          ["m.harlow", "+18.4%", "mint"],
          ["quietdelta", "+6.1%", "mint"],
          ["rowanp", "−2.7%", "ember"],
        ].map(([n, p, tone]) => (
          <div
            key={n}
            className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-xs">
              <span className="size-5 rounded-full bg-surface-2" />
              <span className="font-mono text-muted-foreground">{n}</span>
            </span>
            <span className="font-mono text-xs" style={{ color: `var(--${tone})` }}>
              {p}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
        No orders are routed. No capital at risk.
      </div>
    </div>
  );
}

function ModuleSection({ m, flip }: { m: (typeof modules)[number]; flip: boolean }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="eyebrow">{m.eyebrow}</p>
        <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
          {m.name}
          {m.trademark && <span className="align-super text-base text-muted-foreground">™</span>}
        </h2>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          {m.blurb}
        </p>
        <ul className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {m.points.map(([n, t, d]) => (
            <li key={n}>
              <p className="flex items-baseline gap-2 text-sm font-semibold">
                <span className="font-mono text-[11px] text-signal-soft">{n}</span>
                {t}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </li>
          ))}
        </ul>
        <PrimaryButton className="mt-9">{m.cta}</PrimaryButton>
      </div>
      <div className={flip ? "lg:order-1" : ""}>
        {m.visual === "chart" ? <ChartVisual /> : <DeskVisual />}
      </div>
    </div>
  );
}

function PriceToggle({
  annual,
  setAnnual,
}: {
  annual: boolean;
  setAnnual: (v: boolean) => void;
}) {
  return (
    <div className="mx-auto mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
      {[
        ["Monthly", false],
        ["Annual", true],
      ].map(([label, val]) => (
        <button
          key={String(label)}
          type="button"
          onClick={() => setAnnual(val as boolean)}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            annual === val
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label as string}
        </button>
      ))}
      <span className="px-3 font-mono text-[10px] uppercase tracking-widest text-mint">−20%</span>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-border border-y border-border">
      {faqs.map(([q, a], i) => (
        <div key={q}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-6 py-5 text-left"
            aria-expanded={open === i}
          >
            <span className="text-base font-semibold sm:text-lg">{q}</span>
            <ChevronDown
              className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                open === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === i && (
            <p className="-mt-1 pb-6 pr-10 text-sm leading-relaxed text-muted-foreground">{a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- the page */

function Index() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />

        {/* modules */}
        <section id="modules" className="mx-auto w-full max-w-[1400px] space-y-28 px-5 py-28 lg:px-10 lg:py-36">
          {modules.map((m, i) => (
            <ModuleSection key={m.name} m={m} flip={i % 2 === 1} />
          ))}
        </section>

        {/* platform bento */}
        <section id="platform" className="border-y border-border bg-surface/30">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
            <div className="max-w-3xl">
              <p className="eyebrow">Inside the terminal</p>
              <h2 className="mt-4 text-balance text-4xl font-bold sm:text-5xl lg:text-[3.4rem]">
                Every layer of the read. One surface.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Charting, dealer positioning, institutional flow, and an analyst agent that reads all
                three at once.
              </p>
            </div>

            <div className="mt-14 grid gap-4 lg:grid-cols-12">
              {platformCards.map((c) => (
                <article
                  key={c.title}
                  className={`panel group relative overflow-hidden rounded-2xl p-7 transition hover:border-input ${c.span}`}
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
                    <span style={{ color: `var(--${c.tone})` }}>{c.tag}</span>
                    <span className="text-muted-foreground">/ {c.audience}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold">{c.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                  <div
                    className="mt-8 h-24 rounded-lg border border-border"
                    style={{
                      background: `linear-gradient(120deg, color-mix(in oklab, var(--${c.tone}) 16%, transparent), transparent 62%)`,
                    }}
                  />
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* principles */}
        <section className="mx-auto w-full max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
          <h2 className="max-w-3xl text-balance text-4xl font-bold sm:text-5xl lg:text-[3.4rem]">
            Built for how traders actually work.
          </h2>
          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-border pt-12 sm:grid-cols-2 lg:grid-cols-5">
            {principles.map((p, i) => (
              <div key={p.title}>
                <span className="font-mono text-[11px] text-signal-soft">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* agent loop */}
        <section className="border-y border-border bg-surface/30">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
            <div className="max-w-3xl">
              <h2 className="text-balance text-4xl font-bold sm:text-5xl lg:text-[3.4rem]">
                Where agents meet the tape.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Research, read and review in a single loop, with an agent working the parts that do
                not need your judgment.
              </p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {loopCards.map((c) => (
                <div key={c.title} className="panel rounded-2xl p-7">
                  <h3 className="text-xl font-semibold">{c.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* mid CTA */}
        <section className="mx-auto w-full max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
          <h2 className="max-w-2xl text-balance text-4xl font-bold sm:text-5xl">
            Stop guessing at levels.
          </h2>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Every module is live today. Pick a tier and start reading structure this session.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {[
              {
                badge: "Available now",
                title: "Volara Terminal",
                body: "The full workspace: Meridian charting with positioning and institutional flow built in, and the analyst agent reading alongside you.",
                cta: "See pricing",
                href: "#pricing",
              },
              {
                badge: "Available now",
                title: "Horizon Map",
                body: "Our proprietary exposure module — the one that finds reversal zones by locating where hedging stops being a choice.",
                cta: "Explore the map",
                href: "#platform",
              },
            ].map((c) => (
              <div key={c.title} className="panel flex flex-col rounded-2xl p-8">
                <span className="eyebrow">{c.badge}</span>
                <h3 className="mt-4 text-2xl font-semibold">{c.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                <PrimaryButton href={c.href} className="mt-7 self-start">
                  {c.cta}
                </PrimaryButton>
              </div>
            ))}
          </div>
        </section>

        {/* proof */}
        <section id="proof" className="border-y border-border bg-surface/30 py-24 lg:py-32">
          <div className="mx-auto w-full max-w-[1400px] px-5 text-center lg:px-10">
            <p className="eyebrow">Member wall</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-bold sm:text-5xl lg:text-[3.4rem]">
              Don't take our word for it. Take theirs.
            </h2>
          </div>

          <div className="mt-14 space-y-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            {[testimonials, [...testimonials].reverse()].map((row, ri) => (
              <div key={ri} className="flex w-max gap-4 marquee-track-slow">
                {[...row, ...row].map((t, i) => (
                  <figure
                    key={`${ri}-${i}`}
                    className="panel w-[340px] shrink-0 rounded-2xl p-6 text-left"
                  >
                    <p className="text-sm leading-relaxed text-foreground/90">{t}</p>
                    <figcaption className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Verified member
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-2xl px-5 text-center text-xs leading-relaxed text-muted-foreground">
            Paraphrased reviews from verified members. Individual results vary and are not typical.
            Nothing here is a performance guarantee or financial advice.
          </p>
        </section>

        {/* pricing */}
        <section id="pricing" className="mx-auto w-full max-w-[1400px] px-5 py-24 text-center lg:px-10 lg:py-32">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-4 text-balance text-4xl font-bold sm:text-5xl lg:text-[3.4rem]">
            Choose your edge.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            Every plan includes the member floor and the core structure tools. Upgrade for the full
            terminal.
          </p>
          <PriceToggle annual={annual} setAnnual={setAnnual} />

          <div className="mt-14 grid gap-4 text-left lg:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  t.featured
                    ? "border-signal/50 bg-surface shadow-[0_40px_120px_-60px_var(--signal)]"
                    : "panel"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-8 rounded-full bg-signal px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-background">
                    Most chosen
                  </span>
                )}
                <h3 className="text-2xl font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">
                    ${annual ? t.annual : t.monthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </p>
                {annual && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mint">
                    Billed annually
                  </p>
                )}
                <a
                  href="#pricing"
                  className={`mt-7 rounded-full px-6 py-3 text-center text-sm font-semibold transition ${
                    t.featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-input bg-surface-2/60 text-foreground hover:bg-surface-2"
                  }`}
                >
                  {t.cta}
                </a>
                <ul className="mt-8 space-y-3 border-t border-border pt-7">
                  {t.features.map(([label, val]) => (
                    <li key={label} className="flex items-start gap-3 text-sm">
                      {val ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-mint" />
                      ) : (
                        <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={val ? "text-foreground/90" : "text-muted-foreground/60"}>
                        {label}
                        {typeof val === "string" && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {val}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="border-t border-border bg-surface/30">
          <div className="mx-auto w-full max-w-[1400px] px-5 py-24 lg:px-10 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">FAQ</p>
              <h2 className="mt-4 text-balance text-4xl font-bold sm:text-5xl">
                Questions, answered plainly.
              </h2>
            </div>
            <Faq />
            <div className="mt-12 text-center">
              <GhostButton href="#pricing">Still deciding? Talk to us</GhostButton>
            </div>
          </div>
        </section>

        {/* final CTA */}
        <section className="relative overflow-hidden border-t border-border">
          <div className="pointer-events-none absolute inset-0 halo opacity-70" aria-hidden />
          <div className="relative mx-auto w-full max-w-[1400px] px-5 py-28 text-center lg:px-10 lg:py-36">
            <h2 className="mx-auto max-w-3xl text-balance text-4xl font-bold sm:text-5xl lg:text-[3.8rem]">
              The level is already there. Be early to it.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
              Start reading dealer positioning today. Cancel any time, no desk required.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <PrimaryButton>Get access</PrimaryButton>
              <GhostButton href="#platform">Tour the terminal</GhostButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-16 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
            <div>
              <Wordmark />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                A market structure terminal for self-directed traders. Positioning, flow and an
                analyst agent in one workspace.
              </p>
            </div>
            {footerCols.map((col) => (
              <div key={col.title}>
                <p className="eyebrow">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#top" className="text-sm text-muted-foreground hover:text-foreground">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t border-border pt-8">
            <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground/80">
              Volara is a data and analytics product. Nothing on this site is investment advice, a
              recommendation, or an offer to buy or sell any security. Trading involves substantial
              risk of loss. Simulated performance does not represent actual results.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} Volara Systems. All rights reserved.</span>
              <span className="font-mono uppercase tracking-widest">Built for the tape</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
