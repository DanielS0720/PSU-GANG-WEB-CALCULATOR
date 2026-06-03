"use client";

import { useEffect, useState } from "react";
import { useCombobox } from "downshift";
import { matches } from "@/lib/search";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Concatenated text the typed query is matched against. */
  searchText: string;
}

interface ComboboxProps {
  label?: string;
  placeholder: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

// Searchable single-select built on downshift's useCombobox.
// Filters options by contiguous-substring match on each option's searchText.
export function Combobox({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: ComboboxProps) {
  const selectedItem = options.find((o) => o.value === value) ?? null;
  const [inputValue, setInputValue] = useState(selectedItem?.label ?? "");

  // Sync the visible text when the parent changes/clears the value
  // (e.g. a brand filter invalidated the current model).
  useEffect(() => {
    setInputValue(options.find((o) => o.value === value)?.label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const items = options.filter((o) => matches(o.searchText, inputValue));

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    getLabelProps,
    highlightedIndex,
  } = useCombobox({
    items,
    selectedItem,
    inputValue,
    itemToString: (item) => item?.label ?? "",
    onInputValueChange: ({ inputValue: iv }) => {
      const next = iv ?? "";
      setInputValue(next);
      if (next === "" && value !== null) onChange(null);
    },
    onSelectedItemChange: ({ selectedItem: item }) => {
      onChange(item?.value ?? null);
    },
  });

  return (
    <div className="block">
      {label && (
        <label
          {...getLabelProps()}
          className="block text-xs uppercase tracking-widest text-[var(--color-muted)] mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...getInputProps()}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
        />
        <ul
          {...getMenuProps()}
          className={
            isOpen && items.length > 0
              ? "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] py-1 text-sm shadow-lg"
              : "hidden"
          }
        >
          {isOpen &&
            items.map((item, index) => (
              <li
                key={item.value}
                {...getItemProps({ item, index })}
                className={
                  highlightedIndex === index
                    ? "cursor-pointer px-3 py-2 bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : "cursor-pointer px-3 py-2 text-[var(--color-text)]"
                }
              >
                {item.label}
              </li>
            ))}
        </ul>
        {isOpen && items.length === 0 && inputValue !== "" && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-[var(--color-surface)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
            Sin coincidencias
          </div>
        )}
      </div>
    </div>
  );
}
