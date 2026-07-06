import { createServerFn } from "@tanstack/react-start";
import type {
  GeneratedImagePreview,
  LandingPageConcept,
  LandingPageElements,
  ThemePalette,
} from "@/types";

export interface SharedConceptPayload {
  concept: LandingPageConcept;
  elements: LandingPageElements | null;
  images: GeneratedImagePreview[];
  themePalette: ThemePalette | null;
  category: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getSharedConcept = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    if (!input || typeof input.token !== "string" || !UUID_RE.test(input.token)) {
      return { token: "" };
    }
    return { token: input.token };
  })
  .handler(async ({ data }): Promise<SharedConceptPayload | null> => {
    if (!data.token) return null;
    // EXECUTE on get_shared_concept is restricted to service_role so that
    // anon/authenticated cannot invoke the SECURITY DEFINER function directly.
    // Load the admin client inside the handler to keep it out of the client bundle.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rpcData, error } = await supabaseAdmin.rpc(
      "get_shared_concept" as never,
      { _token: data.token } as never,
    );
    if (error || !rpcData) return null;


    const payload = rpcData as any;
    if (!payload?.concept) return null;

    const conceptData = payload.concept.concept_data as LandingPageConcept;
    const concept: LandingPageConcept = {
      ...conceptData,
      id: payload.concept.id,
      // Owner-only fields intentionally omitted from the public shape.
      projectId: "",
      createdAt: "",
      shareToken: null,
    };

    let elements: LandingPageElements | null = null;
    if (payload.elements?.body_copy) {
      try {
        elements = JSON.parse(payload.elements.body_copy) as LandingPageElements;
      } catch {
        elements = null;
      }
    }

    const images: GeneratedImagePreview[] = Array.isArray(payload.images)
      ? payload.images
          .map((row: any) => {
            const meta = row.metadata ?? {};
            return {
              sectionId: meta.sectionId ?? row.id,
              imagePrompt: meta.imagePrompt ?? "",
              imageStyle: meta.imageStyle ?? "",
              previewUrl: row.preview_url ?? meta.previewUrl ?? "",
              status: (row.status as GeneratedImagePreview["status"]) ?? "simulated",
              imageMode: meta.imageMode,
              category: meta.category,
              realUrl: meta.realUrl,
              placeholderLabel: meta.placeholderLabel,
            } as GeneratedImagePreview;
          })
      : [];

    return {
      concept,
      elements,
      images,
      themePalette: (payload.theme_palette as ThemePalette | null) ?? null,
      category: (payload.category as string | null) ?? null,
    };
  });
