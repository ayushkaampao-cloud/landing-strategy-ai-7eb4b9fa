import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("lpai:theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("lpai:theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      className="inline-flex items-center justify-center size-8 rounded-md border border-border bg-surface hover:bg-surface-muted transition-colors"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function NavLink({
  to,
  label,
  exact,
}: {
  to: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`block px-2.5 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? "bg-surface ring-soft text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function Sidebar() {
  const { activeWorkspace, workspaces, setActiveWorkspace, user, signOut } = useStore();
  const navigate = useNavigate();
  return (
    <aside className="w-60 border-r border-border bg-surface-muted/40 flex flex-col p-4 shrink-0">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="size-6 bg-ink rounded flex items-center justify-center">
          <div className="size-2 bg-background rotate-45" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Landing Page AI</span>
        <span className="mono-tag text-muted-foreground ml-auto">v1.0</span>
      </div>

      <div className="mb-6 px-2">
        <div className="mono-tag text-muted-foreground mb-2">Workspace</div>
        {workspaces.length > 1 ? (
          <select
            value={activeWorkspace?.id ?? ""}
            onChange={(e) => setActiveWorkspace(e.target.value)}
            className="w-full text-sm font-medium bg-surface border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-sm font-medium truncate">
            {activeWorkspace?.name ?? "No brand yet"}
          </div>
        )}
        <Link
          to="/app/brand/new"
          className="mono-tag text-muted-foreground hover:text-foreground mt-2 inline-block"
        >
          + New brand
        </Link>
      </div>

      <nav className="space-y-1 flex-1">
        <div className="mono-tag text-muted-foreground mb-2 px-2">Studio</div>
        <NavLink to="/app" label="Dashboard" exact />
        <NavLink to="/app/projects" label="Projects" />
        <NavLink to="/app/new" label="New project" />
        <div className="mono-tag text-muted-foreground mt-6 mb-2 px-2">Account</div>
        <NavLink to="/app/account" label="Account" />
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-3 px-2">
          <div className="size-8 rounded-full bg-secondary ring-soft" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name ?? "Guest"}</p>
            <p className="mono-tag text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="mono-tag text-muted-foreground hover:text-foreground"
          >
            Exit
          </button>
        </div>
        <div className="px-2 pt-3">
          <p className="mono-tag text-[10px] text-muted-foreground/50 truncate" title={import.meta.env.VITE_SUPABASE_URL}>
            {import.meta.env.VITE_SUPABASE_URL ?? "No Supabase URL"}
          </p>
        </div>
      </div>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  const { activeWorkspace } = useStore();
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2 text-xs">
        <span className="mono-tag text-muted-foreground">{activeWorkspace?.name ?? "Workspace"}</span>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function AppShell() {
  const { user, loaded, legacyImportPending, importLegacyData, dismissLegacyImport } = useStore();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (loaded && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loaded, navigate]);

  if (!loaded || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
      {legacyImportPending && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold tracking-tight">Import your previous data?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              We found brands, projects and concepts stored locally in this browser
              from before you signed in. Import them into your account so they're
              available everywhere.
            </p>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={dismissLegacyImport}
                disabled={importing}
                className="mono-tag px-3 py-2 rounded-md text-muted-foreground hover:text-foreground"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  setImporting(true);
                  try {
                    await importLegacyData();
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={importing}
                className="px-4 py-2 rounded-md bg-ink text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import to my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
