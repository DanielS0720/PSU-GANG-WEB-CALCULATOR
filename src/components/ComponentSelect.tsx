export interface SelectOption {
  value: string;
  label: string;
}

interface ComponentSelectProps {
  /** Optional field label. Omitted for rows that share a section heading. */
  label?: string;
  placeholder: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}

// Reusable controlled selector (CPU, GPU, motherboard, fans).
export function ComponentSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: ComponentSelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-2">
          {label}
        </span>
      )}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        disabled={options.length === 0}
        className="w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
