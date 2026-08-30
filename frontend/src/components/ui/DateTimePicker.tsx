"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO, setHours, setMinutes, isValid } from "date-fns";
import { cn } from "@/lib/cn";
import { FormField } from "@/components/ui/Form";

const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;
const QUICK_TIMES = [
  { label: "9 AM", hour: 9, minute: 0 },
  { label: "12 PM", hour: 12, minute: 0 },
  { label: "5 PM", hour: 17, minute: 0 },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function to24Hour(hour12: number, period: "AM" | "PM") {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function from24Hour(hours: number) {
  const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return { hour12, period };
}

function toDateTimeLocal(date: Date, hours: number, minutes: number) {
  const next = setMinutes(setHours(date, hours), minutes);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

function parseValue(value: string) {
  if (!value) {
    return { date: undefined as Date | undefined, hour12: 9, minute: "00" as const, period: "AM" as const };
  }
  const parsed = value.includes("T") ? parseISO(value) : new Date(value);
  if (!isValid(parsed)) {
    return { date: undefined, hour12: 9, minute: "00" as const, period: "AM" as const };
  }
  const { hour12, period } = from24Hour(parsed.getHours());
  const minute = pad(parsed.getMinutes()) as (typeof MINUTE_OPTIONS)[number];
  const snapped = MINUTE_OPTIONS.includes(minute) ? minute : "00";
  return { date: parsed, hour12, minute: snapped, period };
}

function formatDisplay(value: string) {
  if (!value) return "";
  const parsed = parseValue(value);
  if (!parsed.date) return "";
  const hours = to24Hour(parsed.hour12, parsed.period);
  const withTime = setMinutes(setHours(parsed.date, hours), Number(parsed.minute));
  return format(withTime, "MMM d, yyyy · h:mm a");
}

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  required?: boolean;
}

export function DateTimePicker({ label, value, onChange, min, placeholder = "Pick date & time" }: DateTimePickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);
  const [date, setDate] = useState<Date | undefined>(parsed.date);
  const [hour12, setHour12] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  const minDate = min ? parseValue(min).date : undefined;

  useEffect(() => {
    const next = parseValue(value);
    setDate(next.date);
    setHour12(next.hour12);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value]);

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

  function commit(nextDate: Date | undefined, h12: number, min: string, p: "AM" | "PM") {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(toDateTimeLocal(nextDate, to24Hour(h12, p), Number(min)));
  }

  function updateTime(h12: number, min: string, p: "AM" | "PM", close = false) {
    setHour12(h12);
    setMinute(min as (typeof MINUTE_OPTIONS)[number]);
    setPeriod(p);
    if (date) {
      commit(date, h12, min, p);
      if (close) setOpen(false);
    }
  }

  function handleDateSelect(selected: Date | undefined) {
    setDate(selected);
    if (selected) {
      commit(selected, hour12, minute, period);
      setOpen(false);
    }
  }

  function applyQuickTime(hour: number, min: number) {
    const { hour12: h, period: p } = from24Hour(hour);
    const m = pad(min) as (typeof MINUTE_OPTIONS)[number];
    updateTime(h, MINUTE_OPTIONS.includes(m) ? m : "00", p);
  }

  return (
    <FormField label={label} htmlFor={id}>
      <div ref={rootRef} className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn("flame-datetime-trigger", !value && "flame-datetime-trigger-empty")}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <CalendarIcon />
          <span className="truncate">{value ? formatDisplay(value) : placeholder}</span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <div className="flame-datetime-popover" role="dialog" aria-label={label}>
            <div className="flame-datetime-time-panel">
              <p className="flame-datetime-time-heading">Time</p>
              <div className="flame-datetime-quick-times">
                {QUICK_TIMES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    className="flame-datetime-quick-btn"
                    onClick={() => applyQuickTime(t.hour, t.minute)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flame-datetime-time-selects">
                <select
                  className="flame-datetime-select"
                  value={hour12}
                  onChange={(e) => updateTime(Number(e.target.value), minute, period)}
                  aria-label="Hour"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="flame-datetime-colon">:</span>
                <select
                  className="flame-datetime-select"
                  value={minute}
                  onChange={(e) => updateTime(hour12, e.target.value, period)}
                  aria-label="Minute"
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="flame-datetime-period">
                  {(["AM", "PM"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={cn("flame-datetime-period-btn", period === p && "active")}
                      onClick={() => updateTime(hour12, minute, p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flame-datepicker">
              <DayPicker
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={minDate ? { before: minDate } : undefined}
                defaultMonth={date ?? minDate}
                showOutsideDays
                navLayout="around"
              />
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}

function CalendarIcon() {
  return (
    <svg className="flame-datetime-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("flame-datetime-chevron", open && "flame-datetime-chevron-open")}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
