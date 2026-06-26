import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Landing Page AI 1.0 — Five strategies for every product" },
      {
        name: "description",
        content:
          "Submit your brand and product brief. Get five distinct landing page strategies, each based on a proven conversion framework, previewed in real templates.",
      },
      { property: "og:title", content: "Landing Page AI 1.0" },
      {
        property: "og:description",
        content: "Five strategic landing page directions for your product, in minutes.",
      },
    ],
  }),
  component: Marketing,
});

const FRAMEWORKS = [
  {
    code: "P-01",
    name: "Performance Page",
    desc: "Short, direct-response page built for cold paid traffic.",
  },
  {
    code: "A-02",
    name: "A+ Product Story",
    desc: "Premium, modular product narrative that justifies the price.",
  },
  {
    code: "D-03",
    name: "Deep Conversion Page",
    desc: "Long-form persuasion built to dismantle objections.",
  },
  {
    code: "B-04",
    name: "Brand Story Page",
    desc: "Emotional, narrative-led page for warm and returning audiences.",
  },
  {
    code: "T-05",
    name: "Trust & Comparison Page",
    desc: "Proof-stacked comparison page for bottom-of-funnel shoppers.",
  },
];

function Marketing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-ink rounded flex items-center justify-center">
              <div className="size-2 bg-background rotate-45" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Landing Page AI</span>
            <span className="mono-tag text-muted-foreground ml-1">1.0</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm font-medium px-3 py-1.5">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 bg-ink text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full ring-soft bg-surface mono-tag text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            For D2C founders, performance marketers, and agencies
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-balance leading-[1.02] mb-6">
            Give us your brand and product. Get five landing page strategies, fully structured.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-9 text-pretty">
            Not five layout variants. Five distinct conversion frameworks — each previewed
            inside a real template you can read, copy, and ship.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/auth"
              className="h-11 inline-flex items-center px-6 bg-ink text-background font-medium rounded-md hover:opacity-90"
            >
              Start a project
            </Link>
            <a
              href="#frameworks"
              className="h-11 inline-flex items-center px-6 border border-border font-medium rounded-md hover:bg-surface-muted"
            >
              See the frameworks
            </a>
          </div>
        </div>
      </section>

      {/* Frameworks */}
      <section id="frameworks" className="px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 max-w-2xl">
            <div className="mono-tag text-muted-foreground mb-3">The five frameworks</div>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              Each framework solves a different conversion problem.
            </h2>
            <p className="text-muted-foreground">
              Pick the right page for the traffic you're sending. Or compare all five
              and ship the best one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FRAMEWORKS.map((f) => (
              <div
                key={f.code}
                className="p-6 bg-surface border border-border rounded-xl hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="mono-tag bg-ink text-background px-2 py-0.5 rounded">
                    {f.code}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-32 border-t border-border pt-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { n: "01", t: "Brief your brand", d: "Tell us about your brand voice and audience. Two minutes." },
            { n: "02", t: "Add your product", d: "Features, benefits, price. The raw inputs strategy needs." },
            { n: "03", t: "Get five concepts", d: "Five complete page schemas, previewed inside real templates." },
          ].map((s) => (
            <div key={s.n}>
              <div className="mono-tag text-accent mb-3">{s.n}</div>
              <h3 className="text-xl font-semibold mb-2">{s.t}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-32">
        <div className="max-w-3xl mx-auto text-center p-16 bg-surface border border-border rounded-2xl">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">
            Stop guessing which page to build.
          </h2>
          <p className="text-muted-foreground mb-8">
            See five strategic options before you commit a single line of copy.
          </p>
          <Link
            to="/auth"
            className="h-11 inline-flex items-center px-6 bg-ink text-background font-medium rounded-md hover:opacity-90"
          >
            Start your first project
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-xs text-muted-foreground">
          <span className="mono-tag">Landing Page AI · 1.0</span>
          <span>Built for operators.</span>
        </div>
      </footer>
    </div>
  );
}
