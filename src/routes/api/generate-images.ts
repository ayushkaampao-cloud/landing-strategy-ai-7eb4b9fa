import { createFileRoute } from "@tanstack/react-router";
import { previewUrlFor } from "@/lib/ai/prompts";
import type { GeneratedImagePreview, ImageMode, ProjectCategory } from "@/types";

interface Body {
  projectName: string;
  conceptName: string;
  category?: ProjectCategory;
  items: {
    sectionId: string;
    imagePrompt: string;
    imageStyle?: string;
    imageMode?: ImageMode;
  }[];
}

// Fallback inference: pull the imageMode out of the "[mode] ..." prefix the
// elements route embeds into every prompt. This keeps previews correct even
// when older clients don't forward imageMode explicitly.
function inferMode(prompt: string): ImageMode {
  const m = prompt.match(/^\[([a-z_]+)\]/i);
  if (m) {
    const candidate = m[1] as ImageMode;
    return candidate;
  }
  return "abstract_brand_texture";
}

export const Route = createFileRoute("/api/generate-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const previews: GeneratedImagePreview[] = (body.items ?? []).map((item) => {
          const mode: ImageMode = item.imageMode ?? inferMode(item.imagePrompt);
          const seedKey = `${body.projectName}|${body.conceptName}|${item.sectionId}|${mode}|${item.imagePrompt}`;
          return {
            sectionId: item.sectionId,
            imagePrompt: item.imagePrompt,
            imageStyle: item.imageStyle ?? "",
            previewUrl: previewUrlFor(mode, seedKey),
            status: "simulated",
            imageMode: mode,
            category: body.category,
          };
        });
        return Response.json({ previews });
      },
    },
  },
});
