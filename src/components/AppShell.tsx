import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useEffect, type ReactNode } from "react";

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
  const { activeWorkspace, user, signOut } = useStore();
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
        <div className="mono-tag text-muted-foreground mb-1">Workspace</div>
        <div className="text-sm font-medium truncate">
          {activeWorkspace?.name ?? "No brand yet"}
        </div>
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
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
            className="mono-tag text-muted-foreground hover:text-foreground"
          >
            Exit
          </button>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  const { activeWorkspace } = useStore();
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2 text-xs">
        <span className="mono-tag text-muted-foreground">{activeWorkspace?.name ?? "Workspace"}</span>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}

export function AppShell() {
  const { user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) {
      // delay to allow hydration
      const t = setTimeout(() => {
        if (!user) navigate({ to: "/auth" });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [user, navigate]);

  if (!user) {
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
    </div>
  );
}
