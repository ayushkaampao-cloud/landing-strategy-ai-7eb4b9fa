import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Supabase's OAuth authorization namespace is beta — narrow local typing.
type OAuthClient = { name?: string; client_uri?: string };
type AuthDetails = {
  client?: OAuthClient;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthNS = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthDetails | null; error: Error | null }>;
};
const oauth = () =>
  (supabase.auth as unknown as { oauth: OAuthNS }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-sm text-muted-foreground">
        Could not load this authorization request:{" "}
        {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md border border-border rounded-lg p-6 bg-surface">
        <div className="mono-tag text-muted-foreground mb-2">Authorize connection</div>
        <h1 className="text-xl font-semibold tracking-tight mb-3">
          Connect {clientName} to your account
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          This lets <strong>{clientName}</strong> access your Landing Page AI
          data (brands, projects, and concepts) as you. You can revoke access
          at any time.
        </p>
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 h-10 bg-ink text-background font-medium rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 h-10 border border-border rounded-md text-sm hover:bg-surface-muted disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
