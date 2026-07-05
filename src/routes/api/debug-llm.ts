import { createFileRoute } from "@tanstack/react-router";
import { _debugCall } from "@/lib/ai/gateway";

type Provider = "gemini_direct" | "lovable_gateway" | "openrouter";

export const Route = createFileRoute("/api/debug-llm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const skipParam = url.searchParams.get("skip") ?? "";
        const skip = skipParam
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is Provider =>
            s === "gemini_direct" || s === "lovable_gateway" || s === "openrouter",
          );

        const configured = {
          gemini_direct: !!process.env.GEMINI_API_KEY,
          lovable_gateway: !!process.env.LOVABLE_API_KEY,
          openrouter: !!process.env.OPENROUTER_API_KEY,
        };

        try {
          const { provider, text } = await _debugCall(
            'Return exactly this JSON and nothing else: {"ok": true}',
            skip,
          );
          let parsed: unknown = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text.slice(0, 200);
          }
          return Response.json({ ok: true, provider, configured, skip, result: parsed });
        } catch (err) {
          console.error("[debug-llm] error:", err);
          return Response.json(
            { ok: false, configured, skip, error: (err as Error).message },
          );
        }
      },
    },
  },
});
