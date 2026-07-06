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
const LOVABLE_IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
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

function fallbackPreview(item: Body["items"][number], category?: ProjectCategory): GeneratedImagePreview {
  const mode: ImageMode = item.imageMode ?? inferMode(item.imagePrompt);
  return {
    sectionId: item.sectionId,
    imagePrompt: item.imagePrompt,
    imageStyle: item.imageStyle ?? "Branded placeholder",
    previewUrl: makePlaceholderDataUrl(item.sectionId, mode),
    status: "placeholder",
    imageMode: mode,
    category,
    placeholderLabel: mode.replace(/_/g, " "),
  };
}

function makePlaceholderDataUrl(sectionId: string, mode: ImageMode): string {
  const label = `${sectionId}\n${mode.replace(/_/g, " ")}`
    .replace(/[&<>]/g, "")
    .slice(0, 80);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f1e8"/><stop offset="1" stop-color="#ead7ca"/></linearGradient></defs>
  <rect width="1280" height="900" fill="url(#g)"/>
  <rect x="92" y="92" width="1096" height="716" rx="42" fill="#fffaf4" fill-opacity=".72" stroke="#d6b9a6" stroke-opacity=".55"/>
  <circle cx="1018" cy="214" r="74" fill="#d26a3c" fill-opacity=".16"/>
  <circle cx="246" cy="706" r="104" fill="#1f1a17" fill-opacity=".06"/>
  <text x="640" y="430" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#7b4b35" font-weight="700">Visual placeholder</text>
  <text x="640" y="486" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#9a6a52">${label}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** Extract the first base64 image payload. The dedicated image endpoint
 *  normally returns OpenAI-style `data[0].b64_json`; legacy shapes are kept
 *  as a defensive fallback while older gateway responses drain out. */
function extractBase64Png(data: unknown): { b64: string; mime: string } | null {
  const imageRoot = data as { data?: Array<{ b64_json?: string; mime_type?: string }> };
  const first = imageRoot.data?.[0];
  if (first?.b64_json) {
    return { b64: first.b64_json, mime: first.mime_type ?? "image/png" };
  }

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
      .limit(1);
    const row = data?.[0];
    if (error || !row?.source_image_urls) return [];
    const arr = row.source_image_urls as unknown as Array<{ dataUrl?: string }>;
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
}): Promise<{ preview: GeneratedImagePreview; stopReason?: "credits" }> {
  const { apiKey, item, refImages, projectId, category } = args;
  const mode: ImageMode = item.imageMode ?? inferMode(item.imagePrompt);

  // Hero / product packshot: if the project uploaded product photos, use the
  // first one directly instead of calling the image model. Saves credits and
  // guarantees the hero shows the actual product.
  if (mode === "product_packshot" && refImages.length > 0) {
    return {
      preview: {
        sectionId: item.sectionId,
        imagePrompt: "Uploaded product photo",
        imageStyle: item.imageStyle ?? "uploaded",
        previewUrl: refImages[0],
        realUrl: refImages[0],
        status: "real" as const,
        imageMode: mode,
        category,
      },
    };
  }

  const instruction = buildInstruction(item.imagePrompt, item.negativePrompt, refImages.length > 0);

  const contentBlocks: Array<Record<string, unknown>> = [{ type: "text", text: instruction }];
  for (const dataUrl of refImages) {
    contentBlocks.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  const failed = (label: string): { preview: GeneratedImagePreview; stopReason?: "credits" } => {
    console.warn(`[generate-images] section=${item.sectionId} failed: ${label}`);
    return {
      preview: fallbackPreview(item, category),
      stopReason: /(^|\s)402\b|credit|billing/i.test(label) ? "credits" : undefined,
    };
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(LOVABLE_IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GEMINI_IMAGE_MODEL,
        messages: [{ role: "user", content: contentBlocks }],
        modalities: ["image", "text"],
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
      preview: {
        sectionId: item.sectionId,
        imagePrompt: item.imagePrompt,
        imageStyle: item.imageStyle ?? "",
        previewUrl: signed.signedUrl,
        status: "generated" as const,
        imageMode: mode,
        category,
      },
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
          ...fallbackPreview(item, body.category),
        }));
          return Response.json({ previews });
        }

        const refImages = await loadReferenceImages(body.projectId);

        const previews: GeneratedImagePreview[] = [];
        let stoppedForCredits = false;
        for (const item of body.items ?? []) {
          if (stoppedForCredits) {
            previews.push(fallbackPreview(item, body.category));
            continue;
          }
          const result = await generateOne({
            apiKey,
            item,
            refImages,
            projectId: body.projectId,
            category: body.category,
          });
          previews.push(result.preview);
          if (result.stopReason === "credits") stoppedForCredits = true;
        }
        return Response.json({
          previews,
          warning: stoppedForCredits
            ? "Image generation is unavailable because workspace AI credits are exhausted. Showing branded placeholders instead."
            : undefined,
        });
      },
    },
  },
});
