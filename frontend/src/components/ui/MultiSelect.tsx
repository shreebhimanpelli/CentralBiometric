"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function parseOptions(children: ReactNode): SelectOption[] {
  const parsed: SelectOption[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== "option") continue;
    const el = child as ReactElement<{
      value?: string;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (!el.props.value) continue;
    parsed.push({
      value: String(el.props.value),
      label: el.props.children,
      disabled: el.props.disabled,
    });
  }
  return parsed;
}

interface MultiSelectProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

export function MultiSelect({
  id,
  value,
  onChange,
  children,
  disabled,
  required,
  className,
  placeholder = "Select…",
  "aria-label": ariaLabel,
}: MultiSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const options = parseOptions(children);
  const selectableValues = options.filter((opt) => !opt.disabled).map((opt) => opt.value);
  const isEmpty = value.length === 0;
  const allSelected = selectableValues.length > 0 && selectableValues.every((id) => value.includes(id));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((id) => id !== optionValue));
      return;
    }
    onChange([...value, optionValue]);
  }

  function remove(optionValue: string) {
    onChange(value.filter((id) => id !== optionValue));
  }

  function selectAll() {
    onChange([...selectableValues]);
  }

  function clearAll() {
    onChange([]);
  }

  const selectedChips = options.filter((opt) => value.includes(opt.value));

  return (
    <div
      ref={rootRef}
      className={cn("flame-multi-select-wrap", open && "is-open", className)}
    >
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          value={value.join(",")}
          required
          onChange={() => {}}
          className="sr-only"
        />
      )}

      <div
        id={selectId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn("flame-multi-select-control", disabled && "is-disabled")}
        onClick={() => !disabled && setOpen(true)}
      >
        <div className="flame-multi-select-chips">
          {selectedChips.length > 0 ? (
            selectedChips.map((opt) => (
              <span key={opt.value} className="flame-multi-select-chip">
                <span className="flame-multi-select-chip-label">{opt.label}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="flame-multi-select-chip-remove"
                    aria-label={`Remove ${opt.value}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(opt.value);
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="flame-multi-select-placeholder">{placeholder}</span>
          )}
        </div>

        <button
          type="button"
          className="flame-multi-select-toggle"
          disabled={disabled}
          aria-label={open ? "Close device list" : "Open device list"}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen((o) => !o);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && !disabled && (
        <div className="flame-multi-select-menu">
          <div className="flame-multi-select-toolbar">
            <span className="flame-multi-select-count">
              {value.length} selected
            </span>
            <div className="flame-multi-select-actions">
              <button
                type="button"
                className="flame-multi-select-action"
                disabled={allSelected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={selectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="flame-multi-select-action"
                disabled={isEmpty}
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearAll}
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="flame-multi-select-list" role="listbox" aria-labelledby={selectId} aria-multiselectable>
            {options.map((opt) => {
              const selected = value.includes(opt.value);
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={opt.disabled}
                    className={cn(
                      "flame-select-option flame-multi-select-option",
                      selected && "is-selected"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(opt.value)}
                  >
                    <span className={cn("flame-multi-select-check", selected && "is-checked")} aria-hidden>
                      {selected ? "✓" : ""}
                    </span>
                    <span className="flame-multi-select-label">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
