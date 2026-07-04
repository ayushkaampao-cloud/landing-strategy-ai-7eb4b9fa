import { useEffect, useRef, useState } from "react";

interface EditableProps {
  value?: string;
  placeholder: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  className?: string;
  isPlaceholder?: boolean;
  edited?: boolean;
  saveError?: string;
  /** Milliseconds of idle time before autosaving mid-edit. 0 disables. */
  autosaveDelayMs?: number;
}

/**
 * Click-to-edit text. If the current value looks like a placeholder
 * ("Add …", "Needs …", etc.) or `isPlaceholder` is true, we style it as
 * "fill-me-in". When the user types a real value, we surface a small
 * "User provided" tag. Clearing the field reverts to placeholder state.
 *
 * Autosaves on blur, on Enter (single-line), and (optionally) after a short
 * idle window during typing so users don't lose text if they navigate away.
 */
export function Editable({
  value,
  placeholder,
  onSave,
  multiline,
  className,
  isPlaceholder,
  edited,
  saveError,
  autosaveDelayMs = 1500,
}: EditableProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
    lastSavedRef.current = value ?? "";
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select?.();
    }
  }, [editing]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const trimmed = (value ?? "").trim();
  const looksPlaceholder =
    isPlaceholder ||
    !trimmed ||
    /^(add |needs |placeholder|verify|\[.*\]$|tbd$|todo|insert |real customer|verified )/i.test(
      trimmed,
    );

  const commit = (nextRaw?: string) => {
    const next = (nextRaw ?? draft).trim();
    if (next === lastSavedRef.current.trim()) return;
    lastSavedRef.current = next;
    onSave(next);
  };

  const scheduleAutosave = (next: string) => {
    if (!autosaveDelayMs) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(next), autosaveDelayMs);
  };

  if (editing) {
    const cls = `w-full bg-background border ${saveError ? "border-red-500" : "border-ring/60"} rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring/40 ${className ?? ""}`;
    const handleBlur = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      commit();
      setEditing(false);
    };
    const inputEl = multiline ? (
      <textarea
        ref={(el) => {
          inputRef.current = el;
        }}
        rows={3}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          scheduleAutosave(e.target.value);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value ?? "");
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setEditing(false);
          }
        }}
        className={cls}
      />
    ) : (
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          scheduleAutosave(e.target.value);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value ?? "");
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setEditing(false);
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
          }
        }}
        className={cls}
      />
    );
    return (
      <span className="inline-block w-full">
        {inputEl}
        {saveError && (
          <span className="block text-[10px] text-red-600 mt-0.5">
            {saveError} — retry
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-2 max-w-full">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={saveError ? `Save failed: ${saveError}` : "Click to edit"}
        className={`text-left inline-block max-w-full rounded px-1 -mx-1 hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-ring/40 ${
          looksPlaceholder
            ? "text-amber-700 dark:text-amber-400 underline decoration-dotted decoration-amber-500/60 underline-offset-4"
            : ""
        } ${className ?? ""}`}
      >
        {trimmed ? value : placeholder}
      </button>
      {edited && !saveError && (
        <span
          title="Edited by you"
          className="inline-block size-1.5 rounded-full bg-emerald-500 align-middle"
        />
      )}
      {!looksPlaceholder && trimmed && !edited && !saveError && (
        <span className="mono-tag text-[9px] px-1 py-0 rounded bg-accent/15 text-accent align-middle whitespace-nowrap">
          User provided
        </span>
      )}
      {saveError && (
        <span
          className="mono-tag text-[9px] px-1 py-0 rounded bg-red-500/15 text-red-700 align-middle whitespace-nowrap"
          title={saveError}
        >
          save failed
        </span>
      )}
    </span>
  );
}
