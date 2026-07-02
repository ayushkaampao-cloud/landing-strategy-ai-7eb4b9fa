import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Landing Page AI" },
      { name: "description", content: "Sign in to Landing Page AI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const {
    signIn,
    workspaces,
    createWorkspace,
    createProduct,
    createProject,
    saveConcepts,
  } = useStore();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    signIn(email, name || undefined);
    // After auth: if no workspaces, go to brand creation. Else dashboard.
    setTimeout(() => {
      if (workspaces.length === 0) navigate({ to: "/app/brand/new" });
      else navigate({ to: "/app" });
    }, 30);
  };

  const loadDemo = async () => {
    signIn("demo@northlight.co", "Demo Operator");
    const { generateConceptsForProject } = await import("@/lib/generator");

    // --- Brand 1: Coffee subscription (all 5 concepts generated) ---
    const ws1 = createWorkspace({
      name: "Northlight Coffee",
      brandDescription:
        "Small-batch specialty coffee subscription for home espresso obsessives. Direct-trade beans, roasted weekly, shipped fresh.",
      brandVoice: ["Confident", "Warm", "Craft"],
      primaryAudience:
        "Home baristas 28-45 who own a prosumer espresso machine and care about origin, freshness, and roast date.",
    });
    const p1 = createProduct({
      workspaceId: ws1.id,
      name: "The Daily Espresso Subscription",
      shortDescription:
        "A rotating 12oz bag of single-origin espresso, roasted the day it ships. Delivered weekly, biweekly, or monthly.",
      keyFeatures:
        "Roasted-to-order · Single-origin rotation · Flavor-notes card · Grind-on-demand · Skip or pause anytime",
      keyBenefits:
        "Always-fresh coffee · Discover new origins · No more stale supermarket bags · Dial-in guidance included · Cafe-quality at home",
      priceInfo: "From $22/bag · Free shipping over $40 · Cancel anytime",
      productUrl: "https://northlight.example/espresso",
      siteUrl: "https://northlight.example",
    });
    const proj1 = createProject({
      workspaceId: ws1.id,
      productId: p1.id,
      projectName: "Q3 Paid Social Launch",
      goal: "Sell product",
    });
    saveConcepts(proj1.id, generateConceptsForProject(ws1, p1, proj1));

    // --- Brand 2: Skincare (all 5 concepts generated) ---
    const ws2 = createWorkspace({
      name: "Fjord Skin Studio",
      brandDescription:
        "Clinical-grade skincare made in Copenhagen. Short ingredient lists, third-party tested, no fragrance games.",
      brandVoice: ["Honest", "Clinical", "Understated"],
      primaryAudience:
        "Women 30-50 with reactive or sensitised skin who have already tried the DTC leaders and are tired of overpromised routines.",
    });
    const p2 = createProduct({
      workspaceId: ws2.id,
      name: "The Barrier Repair Serum",
      shortDescription:
        "A daily ceramide + peptide serum designed to restore compromised skin barriers in 28 days — without a 12-step routine.",
      keyFeatures:
        "5-ingredient formula · Independently tested · Fragrance-free · Airless pump · Refill program · Made in Denmark",
      keyBenefits:
        "Calmer skin in 2 weeks · Fewer flare-ups · Less product waste · No more routine anxiety · Backed by dermatologists",
      priceInfo: "$68 · Refills $48 · Subscribe & save 20%",
    });
    const proj2 = createProject({
      workspaceId: ws2.id,
      productId: p2.id,
      projectName: "Barrier Serum — Fall Launch",
      goal: "Sell product",
    });
    saveConcepts(proj2.id, generateConceptsForProject(ws2, p2, proj2));

    // Second project for brand 2 (not generated, to demo empty state)
    const p2b = createProduct({
      workspaceId: ws2.id,
      name: "Overnight Ceramide Mask",
      shortDescription:
        "A leave-on ceramide mask for the two nights a week your skin needs more than a serum.",
      keyFeatures: "Leave-on formula · Fragrance-free · 8-week supply · Refillable jar",
      keyBenefits: "Deeper repair · Wake up calmer · Zero routine friction",
      priceInfo: "$52 · Refills $34",
    });
    createProject({
      workspaceId: ws2.id,
      productId: p2b.id,
      projectName: "Overnight Mask — Concept Test",
      goal: "Collect leads",
    });

    // --- Brand 3: B2B software (all 5 concepts generated) ---
    const ws3 = createWorkspace({
      name: "Ledgerloop",
      brandDescription:
        "Reconciliation software for finance teams at Series B–D startups. Replaces the spreadsheet + Slack pile-up at month-end close.",
      brandVoice: ["Sharp", "Direct", "Operator"],
      primaryAudience:
        "Controllers and heads of finance at 50–500 person startups closing the books in NetSuite or QuickBooks.",
    });
    const p3 = createProduct({
      workspaceId: ws3.id,
      name: "Ledgerloop Close",
      shortDescription:
        "Auto-reconciles bank, Stripe, and Ramp data against your GL so your close takes 2 days instead of 9.",
      keyFeatures:
        "Auto-reconciliation · Native NetSuite + QBO sync · Audit trail · Slack alerts · Role-based access · SOC 2 Type II",
      keyBenefits:
        "Close 5x faster · Zero month-end all-nighters · Audit-ready trail · Free up your senior accountants · Sleep in December",
      priceInfo: "From $1,200/mo · 14-day pilot · Concierge onboarding",
    });
    const proj3 = createProject({
      workspaceId: ws3.id,
      productId: p3.id,
      projectName: "Finance Leader Outbound",
      goal: "Book calls",
    });
    saveConcepts(proj3.id, generateConceptsForProject(ws3, p3, proj3));

    setTimeout(() => navigate({ to: "/app/projects" }), 30);
  };


  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between p-12 bg-surface-muted border-r border-border">
        <div className="flex items-center gap-2">
          <div className="size-6 bg-ink rounded flex items-center justify-center">
            <div className="size-2 bg-background rotate-45" />
          </div>
          <span className="font-semibold tracking-tight">Landing Page AI</span>
          <span className="mono-tag text-muted-foreground ml-1">1.0</span>
        </div>
        <div className="max-w-sm">
          <div className="mono-tag text-accent mb-4">Five frameworks. One brief.</div>
          <h2 className="font-display text-3xl font-semibold tracking-tight leading-tight mb-3">
            Strategy-first landing pages for D2C teams.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Submit your product. Get five fully structured directions — each
            built around a different conversion framework.
          </p>
        </div>
        <div className="mono-tag text-muted-foreground">v1.0 · private beta</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setMode("signup")}
              className={`mono-tag px-3 py-1.5 rounded-md ${mode === "signup" ? "bg-ink text-background" : "text-muted-foreground"}`}
            >
              Create account
            </button>
            <button
              onClick={() => setMode("signin")}
              className={`mono-tag px-3 py-1.5 rounded-md ${mode === "signin" ? "bg-ink text-background" : "text-muted-foreground"}`}
            >
              Sign in
            </button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signup"
              ? "We'll create a workspace for your brand next."
              : "Pick up where you left off."}
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Alex Founder"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@brand.com"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />
            <button
              type="submit"
              className="w-full h-10 mt-2 bg-ink text-background font-medium rounded-md text-sm hover:opacity-90"
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="mono-tag bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDemo}
            className="w-full h-10 rounded-md border border-border bg-surface text-sm font-medium hover:bg-surface-muted flex items-center justify-center gap-2"
          >
            <span>Try the demo account</span>
            <span className="mono-tag text-accent">preloaded</span>
          </button>
          <p className="mono-tag text-muted-foreground mt-3 text-center leading-relaxed">
            Signs you in as Northlight Coffee with 1 product,<br />
            1 project, and 5 generated concepts ready to explore.
          </p>

          <p className="mono-tag text-muted-foreground mt-6 text-center">
            Local-only demo · no real auth yet
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mono-tag text-muted-foreground mb-1.5 block">{label}</span>
      <input
        value={value}
        type={type}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
      />
    </label>
  );
}
