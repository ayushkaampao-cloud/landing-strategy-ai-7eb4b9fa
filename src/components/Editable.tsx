import { useEffect, useRef, useState } from "react";

interface EditableProps {
  value?: string;
  placeholder: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  className?: string;
  isPlaceholder?: boolean;
}

/**
 * Click-to-edit text. If the current value looks like a placeholder
 * ("Add …", "Needs …", etc.) or `isPlaceholder` is true, we style it as
 * "fill-me-in". When the user types a real value, we surface a small
 * "User provided" tag. Clearing the field reverts to placeholder state.
 */
export function Editable({
  value,
  placeholder,
  onSave,
  multiline,
  className,
  isPlaceholder,
}: EditableProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select?.();
    }
  }, [editing]);

  const trimmed = (value ?? "").trim();
  const looksPlaceholder =
    isPlaceholder ||
    !trimmed ||
    /^(add |needs |placeholder|verify|\[.*\]$|tbd$|todo|insert |real customer|verified )/i.test(
      trimmed,
    );

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next === trimmed) return;
    onSave(next);
  };

  if (editing) {
    const cls = `w-full bg-background border border-ring/60 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring/40 ${className ?? ""}`;
    if (multiline) {
      return (
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          className={cls}
        />
      );
    }
    return (
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value ?? "");
            setEditing(false);
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        className={cls}
      />
    );
  }

  return (
    <span className="inline-flex items-baseline gap-2 max-w-full">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click to edit"
        className={`text-left inline-block max-w-full rounded px-1 -mx-1 hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-ring/40 ${
          looksPlaceholder
            ? "text-amber-700 dark:text-amber-400 underline decoration-dotted decoration-amber-500/60 underline-offset-4"
            : ""
        } ${className ?? ""}`}
      >
        {trimmed ? value : placeholder}
      </button>
      {!looksPlaceholder && trimmed && (
        <span className="mono-tag text-[9px] px-1 py-0 rounded bg-accent/15 text-accent align-middle whitespace-nowrap">
          User provided
        </span>
      )}
    </span>
  );
}
