import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { signUp, signInWithPassword, user, workspaces, loaded } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && loaded) {
      if (workspaces.length === 0) navigate({ to: "/app/brand/new" });
      else navigate({ to: "/app" });
    }
  }, [user, workspaces.length, loaded, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, name || undefined);
      } else {
        await signInWithPassword(email, password);
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
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
              <Field label="Name" value={name} onChange={setName} placeholder="Alex Founder" />
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
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 mt-2 bg-ink text-background font-medium rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mono-tag text-muted-foreground mt-6 text-center">
            Secured by Lovable Cloud
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
