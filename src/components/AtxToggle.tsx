import type { AtxMode } from "@/types/components";

interface AtxToggleProps {
  mode: AtxMode;
  onChange: (mode: AtxMode) => void;
}

const OPTIONS: { value: AtxMode; label: string }[] = [
  { value: "atx-2", label: "ATX 2.52 o inferior" },
  { value: "atx-3", label: "ATX 3.x" },
];

// Segmented control for the ATX standard — drives the watt mode (peak vs TDP).
export function AtxToggle({ mode, onChange }: AtxToggleProps) {
  return (
    <div>
      <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-2">
        Estándar PSU
      </span>
      <div className="inline-flex rounded-md border border-[var(--color-surface)] overflow-hidden text-sm">
        {OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={
                active
                  ? "px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)]"
                  : "px-4 py-2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
