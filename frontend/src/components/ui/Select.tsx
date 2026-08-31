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
  type SelectHTMLAttributes,
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
    parsed.push({
      value: String(el.props.value ?? ""),
      label: el.props.children,
      disabled: el.props.disabled,
    });
  }
  return parsed;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function Select({
  className,
  value = "",
  children,
  onChange,
  disabled,
  required,
  id,
  name,
  "aria-label": ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const options = parseOptions(children);
  const emptyOption = options.find((opt) => opt.value === "");
  const menuOptions = options.filter(
    (opt) => !(opt.value === "" && opt.disabled)
  );
  const selected = options.find((opt) => opt.value === value);
  const isPlaceholder = value === "" || value === undefined;

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

  function pick(nextValue: string) {
    onChange?.({
      target: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("flame-select-wrap", open && "is-open")}>
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          value={value}
          required
          onChange={() => {}}
          className="sr-only"
        />
      )}

      <button
        id={selectId}
        name={name}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flame-select",
          isPlaceholder && "flame-select-placeholder",
          className
        )}
      >
        <span className="flame-select-value truncate">
          {isPlaceholder ? emptyOption?.label ?? "Select…" : selected?.label}
        </span>
      </button>

      {open && !disabled && (
        <ul className="flame-select-menu" role="listbox" aria-labelledby={selectId}>
          {menuOptions.map((opt) => (
            <li key={opt.value || "__empty__"} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                className={cn(
                  "flame-select-option",
                  opt.value === value && "is-selected"
                )}
                onClick={() => pick(opt.value)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
