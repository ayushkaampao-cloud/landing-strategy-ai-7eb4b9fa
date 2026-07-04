import { Editable } from "./Editable";

interface EditableBulletsProps {
  bullets: string[];
  onChange: (next: string[]) => void;
  edited?: boolean;
  saveError?: string;
  className?: string;
  itemClassName?: string;
  placeholder?: string;
}

/**
 * Editable list of short bullets. Each bullet is an inline `Editable`;
 * users can add a new bullet or remove any row. All mutations flow through
 * `onChange(nextArray)` so the caller can persist to the DB.
 */
export function EditableBullets({
  bullets,
  onChange,
  edited,
  saveError,
  className,
  itemClassName,
  placeholder = "Add bullet",
}: EditableBulletsProps) {
  const update = (idx: number, value: string) => {
    const next = bullets.slice();
    next[idx] = value;
    onChange(next);
  };
  const remove = (idx: number) => {
    const next = bullets.slice();
    next.splice(idx, 1);
    onChange(next);
  };
  const add = () => {
    onChange([...bullets, ""]);
  };

  return (
    <div className={className}>
      <ul className="space-y-1">
        {bullets.map((b, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 group ${itemClassName ?? ""}`}
          >
            <span className="mt-1.5 size-1.5 rounded-full bg-accent shrink-0" />
            <span className="flex-1 min-w-0">
              <Editable
                value={b}
                placeholder={placeholder}
                onSave={(v) => update(i, v)}
              />
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove bullet"
              title="Remove bullet"
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground text-xs px-1"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={add}
          className="mono-tag text-[10px] px-2 py-0.5 rounded border border-border hover:bg-surface-muted"
        >
          + Add bullet
        </button>
        {edited && !saveError && (
          <span
            title="Edited by you"
            className="inline-block size-1.5 rounded-full bg-emerald-500"
          />
        )}
        {saveError && (
          <span className="text-[10px] text-red-600">{saveError} — retry</span>
        )}
      </div>
    </div>
  );
}
