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
    const ws = createWorkspace({
      name: "Northlight Coffee",
      brandDescription:
        "Small-batch specialty coffee subscription for home espresso obsessives. Direct trade beans, roasted weekly, shipped fresh.",
      brandVoice: ["Confident", "Warm", "Craft"],
      primaryAudience:
        "Home baristas 28-45 who own a prosumer espresso machine and care about origin, freshness, and roast date.",
    });
    const product = createProduct({
      workspaceId: ws.id,
      name: "The Daily Espresso Subscription",
      shortDescription:
        "A rotating 12oz bag of single-origin espresso, roasted the day it ships. Delivered weekly, biweekly, or monthly.",
      keyFeatures:
        "Roasted-to-order · Single origin rotation · Flavor notes card · Grind-on-demand · Skip or pause anytime",
      keyBenefits:
        "Always fresh coffee, discover new origins, no more stale supermarket bags, dial-in guidance included.",
      priceInfo: "From $22/bag · Free shipping over $40 · Cancel anytime",
      productUrl: "https://northlight.example/espresso",
      siteUrl: "https://northlight.example",
    });
    const project = createProject({
      workspaceId: ws.id,
      productId: product.id,
      projectName: "Q3 Paid Social Launch",
      goal: "Sell product",
    });
    const { generateConceptsForProject } = await import("@/lib/generator");
    const concepts = generateConceptsForProject(ws, product, project);
    saveConcepts(project.id, concepts);
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
