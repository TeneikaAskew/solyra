import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Compass,
  Gauge,
  Layers,
  MessageSquareText,
  Radar,
  Sparkles,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halyard — AI campaign operations for lean revenue teams" },
      {
        name: "description",
        content:
          "Halyard turns raw signals into launched campaigns: research, drafting, approvals and measurement in one AI operating layer for marketing teams.",
      },
      { property: "og:title", content: "Halyard — AI campaign operations for lean revenue teams" },
      {
        property: "og:description",
        content:
          "Research, draft, approve and measure every campaign in one AI operating layer. Built for marketing teams that ship weekly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const logos = [
  "Northmoor",
  "Vantage Foundry",
  "Palegrove",
  "Cobalt & Rye",
  "Fieldnote",
  "Aster Labs",
  "Rundell",
  "Quiet Harbor",
];

const features = [
  {
    icon: Radar,
    title: "Signal intake",
    body: "Halyard watches your CRM notes, support threads, review sites and competitor pages, then surfaces the three angles actually worth a campaign this week.",
  },
  {
    icon: MessageSquareText,
    title: "Voice-locked drafting",
    body: "Train once on your best-performing assets. Every draft comes back in your cadence, your claims policy, your product vocabulary — not generic model English.",
  },
  {
    icon: Layers,
    title: "One brief, every surface",
    body: "A single approved brief fans out into landing copy, lifecycle emails, paid variants and sales one-pagers, all versioned against the same source of truth.",
  },
  {
    icon: Gauge,
    title: "Attribution that closes the loop",
    body: "Each generated asset carries a tracking fingerprint, so performance flows back into the model and next week's suggestions are sharper than this week's.",
  },
];

const steps = [
  {
    n: "01",
    title: "Connect your stack",
    body: "Point Halyard at the tools you already run — warehouse, CRM, ad accounts, docs. Read-only by default, scoped per workspace.",
  },
  {
    n: "02",
    title: "Set the guardrails",
    body: "Upload brand voice, banned claims, legal review rules and approval chains. Halyard treats them as hard constraints, not suggestions.",
  },
  {
    n: "03",
    title: "Review the weekly slate",
    body: "Monday morning you get a ranked slate of campaign concepts with reasoning, expected lift and the evidence behind each one.",
  },
  {
    n: "04",
    title: "Ship and learn",
    body: "Approve with one click, push to your channels, and watch results feed straight back into the next slate.",
  },
];

const tiers = [
  {
    name: "Crew",
    price: "$89",
    cadence: "per seat / month",
    blurb: "For a founding marketer or a two-person team finding the motion.",
    features: [
      "3 connected sources",
      "Weekly campaign slate",
      "Voice training on 20 assets",
      "Email + landing generation",
    ],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Fleet",
    price: "$340",
    cadence: "per workspace / month",
    blurb: "For growth teams running several channels on a weekly ship cycle.",
    features: [
      "Unlimited sources",
      "Approval chains & legal rules",
      "Multi-surface fan-out",
      "Closed-loop attribution",
      "Shared asset library",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Harbor",
    price: "Custom",
    cadence: "annual agreement",
    blurb: "For regulated or multi-brand organisations with strict review needs.",
    features: [
      "Private model routing",
      "SSO, SCIM, audit export",
      "Per-brand guardrail sets",
      "Named solutions engineer",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

const faqs = [
  {
    q: "Does Halyard replace my marketing team?",
    a: "No. It replaces the two days a week your team spends assembling context, reformatting the same message for four channels and chasing approvals. Judgement, positioning and taste stay with the humans.",
  },
  {
    q: "How does it learn our voice?",
    a: "You upload the assets you are proud of. Halyard extracts cadence, sentence shape, claim style and vocabulary into an editable voice profile you can review line by line — and override any time.",
  },
  {
    q: "What happens to our data?",
    a: "Workspace data is isolated, encrypted at rest, and never used to train shared models. Connections are read-only unless you explicitly grant write access for publishing.",
  },
  {
    q: "How long is implementation?",
    a: "Most teams connect their first three sources and get a usable slate within an afternoon. Guardrails and approval chains typically take another day of tuning.",
  },
  {
    q: "Can we export everything?",
    a: "Yes. Briefs, assets, voice profiles and performance history export as Markdown and CSV whenever you want. No lock-in clauses, monthly plans cancel in-app.",
  },
];

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-citrine text-primary-foreground">
            <Compass className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Halyard</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a className="transition-colors hover:text-foreground" href="#features">
            Platform
          </a>
          <a className="transition-colors hover:text-foreground" href="#workflow">
            How it works
          </a>
          <a className="transition-colors hover:text-foreground" href="#pricing">
            Pricing
          </a>
          <a className="transition-colors hover:text-foreground" href="#faq">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#pricing"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Sign in
          </a>
          <a
            href="#cta"
            className="rounded-sm bg-citrine px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Book a walkthrough
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--citrine), transparent 65%)" }}
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 md:pb-28 md:pt-28">
        <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-citrine" />
              Now routing to your own private models
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.95] md:text-7xl">
              Your campaign
              <br />
              operations,
              <br />
              <span className="text-citrine">run on evidence.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Halyard reads the signals your team never has time to read, proposes the campaigns
              worth running, drafts them in your voice, and measures what actually moved. One
              operating layer between raw data and shipped work.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#cta"
                className="group inline-flex items-center gap-2 rounded-sm bg-citrine px-6 py-3.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Start a 14-day trial
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#workflow"
                className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3.5 font-semibold text-foreground transition-colors hover:bg-surface"
              >
                See the workflow
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No card required · Setup in an afternoon · Cancel in-app
            </p>
          </div>

          <div className="glow-citrine rounded-md border border-border bg-surface p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-display text-sm font-semibold">Weekly slate</span>
              <span className="text-xs text-muted-foreground">Mon · 08:00</span>
            </div>
            <ul className="mt-4 space-y-3">
              {[
                { t: "Reframe onboarding around time-to-first-report", s: "+18% est. lift", c: "94" },
                { t: "Win-back sequence for churned Fleet accounts", s: "+11% est. lift", c: "87" },
                { t: "Comparison page vs. spreadsheet workflows", s: "+7% est. lift", c: "72" },
              ].map((row) => (
                <li key={row.t} className="rounded-sm bg-surface-2 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium leading-snug">{row.t}</p>
                    <span className="shrink-0 rounded-sm bg-citrine/15 px-2 py-0.5 text-xs font-semibold text-citrine">
                      {row.c}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.s} · evidence from 6 sources
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Workflow className="h-3.5 w-3.5 text-citrine" />
              Drafts ready for review in 4 surfaces
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-b border-border bg-surface/40 py-8">
      <p className="mx-auto max-w-6xl px-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        Trusted by teams shipping weekly
      </p>
      <div className="relative mt-6 overflow-hidden">
        <div className="marquee-track flex w-max gap-14 px-5">
          {[...logos, ...logos].map((l, i) => (
            <span
              key={`${l}-${i}`}
              className="font-display text-lg font-medium text-muted-foreground/70 whitespace-nowrap"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 grid max-w-6xl gap-6 px-5 sm:grid-cols-3">
        {[
          ["2.4×", "more campaigns shipped per quarter"],
          ["11 hrs", "returned to each marketer weekly"],
          ["96%", "of drafts approved without a rewrite"],
        ].map(([stat, label]) => (
          <div key={stat} className="border-l border-citrine/60 pl-4">
            <p className="font-display text-3xl font-semibold">{stat}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-citrine">The platform</p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">
            Four jobs, handled end to end
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Most AI tools stop at a blank-page assistant. Halyard covers the unglamorous middle —
            the research, the reformatting, the review trail — so the work reaches the market.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
          {features.map((f) => (
            <article key={f.title} className="group bg-background p-8 transition-colors hover:bg-surface">
              <f.icon className="h-6 w-6 text-citrine" strokeWidth={1.8} />
              <h3 className="mt-6 text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflows() {
  return (
    <section id="workflow" className="border-b border-border bg-surface/30 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-citrine">How it works</p>
            <h2 className="mt-4 text-4xl font-semibold md:text-5xl">From signal to shipped</h2>
          </div>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 text-sm font-semibold text-citrine hover:underline"
          >
            Watch a 6-minute walkthrough <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="relative border-t border-border pt-6">
              <span className="font-display text-sm font-semibold text-citrine">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        <figure className="mt-16 rounded-md border border-border bg-background p-8 md:p-12">
          <blockquote className="max-w-3xl font-display text-2xl leading-snug md:text-3xl">
            “We went from one big campaign a quarter to something meaningful every week — and the
            legal review queue got shorter, not longer.”
          </blockquote>
          <figcaption className="mt-6 text-sm text-muted-foreground">
            Ines Calder · VP Marketing, Vantage Foundry
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-citrine">Pricing</p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">Priced per shipped work</h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Every plan includes the full slate engine. You scale on sources, surfaces and review
            depth — not on how many words you generate.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-md border p-8 ${
                t.featured
                  ? "border-citrine/60 bg-surface glow-citrine"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                {t.featured && (
                  <span className="rounded-sm bg-citrine px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most teams
                  </span>
                )}
              </div>
              <p className="mt-6 font-display text-4xl font-semibold">{t.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.cadence}</p>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{t.blurb}</p>
              <ul className="mt-7 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-citrine" strokeWidth={2.4} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`mt-8 rounded-sm px-5 py-3 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                  t.featured
                    ? "bg-citrine text-primary-foreground"
                    : "border border-border text-foreground hover:bg-surface"
                }`}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-b border-border bg-surface/30 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-citrine">FAQ</p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">Straight answers</h2>
          <p className="mt-5 text-muted-foreground">
            Still unsure? Send a note to hello@halyard.example and a human answers within a day.
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="font-display text-lg font-medium">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-citrine transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-6 pr-10 text-[15px] leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="cta" className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-30" />
      <div className="relative mx-auto max-w-4xl px-5 text-center">
        <h2 className="text-4xl font-semibold md:text-6xl">
          Ship the campaign you keep <span className="text-citrine">postponing.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Connect one source, get your first slate this afternoon. Fourteen days free, everything
          exportable, no procurement gauntlet.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a
            href="#top"
            className="inline-flex items-center gap-2 rounded-sm bg-citrine px-6 py-3.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Start a 14-day trial <ArrowUpRight className="h-4 w-4" />
          </a>
          <a
            href="#pricing"
            className="rounded-sm border border-border px-6 py-3.5 font-semibold transition-colors hover:bg-surface"
          >
            Compare plans
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-citrine text-primary-foreground">
            <Compass className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
          <span className="font-display font-semibold text-foreground">Halyard</span>
        </div>
        <p>© {new Date().getFullYear()} Halyard Systems. Campaign operations, run on evidence.</p>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main>
      <Nav />
      <Hero />
      <TrustStrip />
      <Features />
      <Workflows />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
