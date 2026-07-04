import { createFileRoute } from "@tanstack/react-router";
import type { GeneratedImagePreview, ImageMode, ProjectCategory } from "@/types";

interface Body {
  projectId?: string;
  projectName: string;
  conceptName: string;
  category?: ProjectCategory;
  items: {
    sectionId: string;
    imagePrompt: string;
    imageStyle?: string;
    imageMode?: ImageMode;
    negativePrompt?: string;
    seedNonce?: string;
  }[];
}

const GEMINI_IMAGE_MODEL = "google/gemini-3.1-flash-image";
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

function inferMode(prompt: string): ImageMode {
  const m = prompt.match(/^\[([a-z_]+)\]/i);
  if (m) return m[1] as ImageMode;
  return "abstract_brand_texture";
}

function buildInstruction(imagePrompt: string, negativePrompt: string | undefined, hasRefs: boolean): string {
  const neg = (negativePrompt ?? "").trim();
  const avoid = neg ? ` Avoid: ${neg}.` : "";
  if (hasRefs) {
    return `Use the reference image(s) to preserve the exact product's shape, color, and branding. Place it in this new scene/context: ${imagePrompt}.${avoid}`;
  }
  return `${imagePrompt}.${avoid}`;
}

/** Extract the first base64 image payload from a Gemini image chat completion response.
 *  The Gateway normalizes upstream shapes; images may appear on the message as an
 *  `images` array of data URLs, or as a text-content-block data URL, or embedded in
 *  the string content. We try each in order. */
function extractBase64Png(data: unknown): { b64: string; mime: string } | null {
  const root = data as {
    choices?: Array<{
      message?: {
        images?: Array<{ image_url?: { url?: string } | string; url?: string; type?: string }>;
        content?:
          | string
          | Array<{ type?: string; image_url?: { url?: string } | string; url?: string; text?: string }>;
      };
    }>;
  };
  const msg = root.choices?.[0]?.message;
  if (!msg) return null;

  const parseDataUrl = (u: string | undefined): { b64: string; mime: string } | null => {
    if (!u) return null;
    const m = u.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    return { mime: m[1], b64: m[2] };
  };

  // Shape A: message.images: [{ image_url: { url: "data:image/png;base64,..." } }]
  if (Array.isArray(msg.images)) {
    for (const it of msg.images) {
      const url =
        typeof it?.image_url === "string"
          ? it.image_url
          : it?.image_url?.url ?? it?.url;
      const parsed = parseDataUrl(url);
      if (parsed) return parsed;
    }
  }

  // Shape B: message.content is array of blocks including image_url blocks
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      const url =
        typeof block?.image_url === "string"
          ? block.image_url
          : block?.image_url?.url ?? block?.url;
      const parsed = parseDataUrl(url);
      if (parsed) return parsed;
    }
    // Shape B2: text block that contains a data URL
    for (const block of msg.content) {
      if (block?.type === "text" && typeof block.text === "string") {
        const m = block.text.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
        if (m) return { mime: m[1], b64: m[2] };
      }
    }
  }

  // Shape C: message.content is a string containing a data URL
  if (typeof msg.content === "string") {
    const m = msg.content.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
    if (m) return { mime: m[1], b64: m[2] };
  }

  return null;
}

async function loadReferenceImages(projectId: string | undefined): Promise<string[]> {
  if (!projectId) return [];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("product_visual_profiles")
      .select("source_image_urls")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error || !data?.source_image_urls) return [];
    const arr = data.source_image_urls as unknown as Array<{ dataUrl?: string }>;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => r?.dataUrl)
      .filter((u): u is string => typeof u === "string" && u.startsWith("data:"))
      .slice(0, 3);
  } catch (err) {
    console.warn("[generate-images] loadReferenceImages failed:", (err as Error).message);
    return [];
  }
}

async function generateOne(args: {
  apiKey: string;
  item: Body["items"][number];
  refImages: string[];
  projectId: string | undefined;
  category?: ProjectCategory;
}): Promise<GeneratedImagePreview> {
  const { apiKey, item, refImages, projectId, category } = args;
  const mode: ImageMode = item.imageMode ?? inferMode(item.imagePrompt);
  const instruction = buildInstruction(item.imagePrompt, item.negativePrompt, refImages.length > 0);

  const contentBlocks: Array<Record<string, unknown>> = [{ type: "text", text: instruction }];
  for (const dataUrl of refImages) {
    contentBlocks.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  const failed = (label: string): GeneratedImagePreview => {
    console.warn(`[generate-images] section=${item.sectionId} failed: ${label}`);
    return {
      sectionId: item.sectionId,
      imagePrompt: item.imagePrompt,
      imageStyle: item.imageStyle ?? "",
      previewUrl: "",
      status: "failed",
      imageMode: mode,
      category,
    };
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(LOVABLE_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GEMINI_IMAGE_MODEL,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: contentBlocks }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return failed(`gateway ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    const img = extractBase64Png(data);
    if (!img) return failed("no image payload in response");

    // Upload to Lovable Cloud storage (service role bypasses RLS)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.includes("webp") ? "webp" : "png";
    const path = `generated/${projectId ?? "unknown"}/${item.sectionId}-${Date.now()}.${ext}`;
    const bytes = Uint8Array.from(atob(img.b64), (c) => c.charCodeAt(0));
    const { error: upErr } = await supabaseAdmin.storage
      .from("generated-images")
      .upload(path, bytes, { contentType: img.mime, upsert: true });
    if (upErr) return failed(`upload: ${upErr.message}`);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("generated-images")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) return failed(`sign url: ${signErr?.message ?? "no url"}`);

    return {
      sectionId: item.sectionId,
      imagePrompt: item.imagePrompt,
      imageStyle: item.imageStyle ?? "",
      previewUrl: signed.signedUrl,
      status: "generated",
      imageMode: mode,
      category,
    };
  } catch (err) {
    return failed((err as Error).message || "unknown error");
  } finally {
    clearTimeout(timer);
  }
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

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          console.warn("[generate-images] LOVABLE_API_KEY missing");
          const previews: GeneratedImagePreview[] = (body.items ?? []).map((item) => ({
            sectionId: item.sectionId,
            imagePrompt: item.imagePrompt,
            imageStyle: item.imageStyle ?? "",
            previewUrl: "",
            status: "failed",
            imageMode: item.imageMode ?? inferMode(item.imagePrompt),
            category: body.category,
          }));
          return Response.json({ previews });
        }

        const refImages = await loadReferenceImages(body.projectId);

        const previews = await Promise.all(
          (body.items ?? []).map((item) =>
            generateOne({ apiKey, item, refImages, projectId: body.projectId, category: body.category }),
          ),
        );
        return Response.json({ previews });
      },
    },
  },
});
