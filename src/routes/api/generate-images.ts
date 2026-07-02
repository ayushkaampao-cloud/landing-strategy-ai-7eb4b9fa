import { createFileRoute } from "@tanstack/react-router";
import type { GeneratedImagePreview } from "@/types";

interface Body {
  projectName: string;
  conceptName: string;
  items: {
    sectionId: string;
    imagePrompt: string;
    imageStyle?: string;
  }[];
}

function hashSeed(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return `${Math.abs(h)}`;
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
          const seed = hashSeed(
            `${body.projectName}|${body.conceptName}|${item.sectionId}|${item.imagePrompt}`,
          );
          return {
            sectionId: item.sectionId,
            imagePrompt: item.imagePrompt,
            imageStyle: item.imageStyle ?? "",
            previewUrl: `https://picsum.photos/seed/${seed}/1200/800`,
            status: "simulated",
          };
        });
        return Response.json({ previews });
      },
    },
  },
});
