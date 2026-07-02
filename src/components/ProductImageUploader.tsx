import { useRef, useState, type ChangeEvent } from "react";
import type { ProductImageRef } from "@/types";
import { X } from "lucide-react";

const MAX_IMAGES = 10;
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.82;

async function downscale(file: File): Promise<ProductImageRef> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Could not load image"));
      i.src = bitmapUrl;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return {
      id: crypto.randomUUID(),
      dataUrl,
      width: w,
      height: h,
      addedAt: new Date().toISOString(),
      order: 0,
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

interface Props {
  images: ProductImageRef[];
  onChange: (imgs: ProductImageRef[]) => void;
  optional?: boolean;
}

export function ProductImageUploader({ images, onChange, optional }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    try {
      const slots = Math.max(0, MAX_IMAGES - images.length);
      const picked = files.slice(0, slots);
      const processed = await Promise.all(picked.map(downscale));
      const next = [...images, ...processed].map((img, i) => ({ ...img, order: i }));
      onChange(next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    onChange(images.filter((i) => i.id !== id).map((img, i) => ({ ...img, order: i })));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="mono-tag text-muted-foreground">
          Product images {optional ? "(optional)" : ""} · {images.length}/{MAX_IMAGES}
        </span>
        <button
          type="button"
          disabled={busy || images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
          className="mono-tag px-2 py-1 rounded-md bg-surface border border-border hover:border-foreground/30 disabled:opacity-50"
        >
          {busy ? "Processing…" : "+ Add images"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {images.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer p-6 border border-dashed border-border rounded-lg text-center bg-surface-muted/40 hover:bg-surface-muted"
        >
          <p className="text-sm font-medium mb-1">Upload up to 10 product images</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WEBP. Used to ground AI copy and image generation in the real product.
            {optional && " Optional for software/service projects."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-md overflow-hidden ring-soft bg-surface-muted"
            >
              <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(img.id)}
                className="absolute top-1 right-1 size-6 rounded-full bg-background/90 border border-border grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
