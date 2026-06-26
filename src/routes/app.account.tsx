import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/account")({
  component: Account,
});

function Account() {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, signOut } = useStore();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <>
      <TopBar />
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Account</h1>
        <p className="text-sm text-muted-foreground mb-8">{user.email}</p>

        <div className="p-5 bg-surface border border-border rounded-lg mb-6">
          <div className="mono-tag text-muted-foreground mb-3">Workspaces</div>
          {workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <div className="space-y-2">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setActiveWorkspace(w.id)}
                  className={`w-full text-left p-3 rounded-md border text-sm flex items-center justify-between ${
                    w.id === activeWorkspace?.id
                      ? "border-ink bg-surface-muted"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <span className="font-medium">{w.name}</span>
                  {w.id === activeWorkspace?.id && (
                    <span className="mono-tag text-accent">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            signOut();
            navigate({ to: "/" });
          }}
          className="text-sm font-medium px-4 py-2 border border-border rounded-md hover:bg-surface"
        >
          Sign out
        </button>
      </div>
    </>
  );
}
