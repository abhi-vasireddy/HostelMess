/**
 * TimePicker — Smart masked time input
 *
 * Free-form time entry with auto-formatting, validation,
 * and optional quick-pick suggestions. No fixed dropdown.
 *
 * Examples:
 *   3      → 3:00 AM
 *   342    → 3:42 AM
 *   342pm  → 3:42 PM
 *   13:00  → 1:00 PM
 *   11:17  → 11:17 AM
 *   905pm  → 9:05 PM
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Clock } from 'lucide-react';

// ─── Props ──────────────────────────────────────────────────────────────────

interface TimePickerProps {
  value: string;           // "HH:mm"
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
  required?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTime(raw: string): { h: number; m: number; isPM: boolean } | null {
  let cleaned = raw.replace(/[^0-9apmAPM:]/g, '').trim().toLowerCase();
  if (!cleaned) return null;

  let isPM = cleaned.includes('pm');
  let isAM = cleaned.includes('am');
  cleaned = cleaned.replace(/[apm]/g, '').trim();

  // Split by colon or infer hours/minutes from digit length
  let h: number, m = 0;
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else {
    // Digit-only: last 2 digits are minutes, rest are hours
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length <= 2) {
      h = parseInt(digits, 10);
      m = 0;
    } else {
      h = parseInt(digits.slice(0, -2), 10);
      m = parseInt(digits.slice(-2), 10);
    }
  }

  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;

  return { h, m, isPM: isPM || (!isAM && h >= 12) };
}

function validate(h: number, m: number): string | null {
  if (h < 1 || h > 12) return 'Hour must be 1–12';
  if (m < 0 || m > 59) return 'Minutes must be 0–59';
  return null;
}

function toHHMM(h: number, m: number, isPM: boolean): string {
  let h24 = h === 12 ? (isPM ? 12 : 0) : isPM ? h + 12 : h;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDisplay(h: number, m: number, isPM: boolean): string {
  return `${h}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

function fromHHMM(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// Quick suggestions
const SUGGESTIONS = ['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '2:00 PM', '5:00 PM', '7:00 PM', '9:00 PM'];

// ─── Component ──────────────────────────────────────────────────────────────

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Enter time',
  disabled = false,
  required = false,
}) => {
  const [input, setInput] = useState(value ? fromHHMM(value) : '');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track external value changes
  React.useEffect(() => {
    if (!focused) setInput(value ? fromHHMM(value) : '');
  }, [value, focused]);

  const commitValue = useCallback((displayStr: string) => {
    const parsed = parseTime(displayStr);
    if (!parsed) {
      if (required) setError('Enter a valid time');
      return;
    }
    const err = validate(parsed.h, parsed.m);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setInput(formatDisplay(parsed.h, parsed.m, parsed.isPM));
    onChange(toHHMM(parsed.h, parsed.m, parsed.isPM));
  }, [onChange, required]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInput(raw);
    setError(null);

    // Auto-parse when user types digits + optional am/pm
    const digits = raw.replace(/[^0-9apmAPM:]/g, '');
    if (digits.length >= 2) {
      const parsed = parseTime(digits);
      if (parsed && !validate(parsed.h, parsed.m)) {
        setInput(formatDisplay(parsed.h, parsed.m, parsed.isPM));
        onChange(toHHMM(parsed.h, parsed.m, parsed.isPM));
        setError(null);
      }
    }
  };

  const handleBlur = () => {
    setFocused(false);
    setShowSuggestions(false);
    if (input.trim()) {
      commitValue(input);
    } else if (required) {
      setError('Time is required');
    }
  };

  const handleFocus = () => {
    setFocused(true);
    setShowSuggestions(!value);
    inputRef.current?.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(input);
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const pickSuggestion = (s: string) => {
    setInput(s);
    setShowSuggestions(false);
    const parsed = parseTime(s);
    if (parsed && !validate(parsed.h, parsed.m)) {
      onChange(toHHMM(parsed.h, parsed.m, parsed.isPM));
      setError(null);
    }
    inputRef.current?.focus();
  };

  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div ref={ref} className="relative select-none">
      {label && (
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">
          {label}
        </p>
      )}

      {/* ── Input ── */}
      <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
        focused
          ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/20 dark:ring-sky-400/15'
          : error
          ? 'border-red-300 dark:border-red-700 ring-2 ring-red-500/15'
          : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-900/50'}`}>
        <Clock size={15} className={`absolute left-3.5 shrink-0 ${value && !error ? 'text-sky-500' : 'text-slate-400'}`} />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={input}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-transparent pl-9 pr-3 py-3 text-sm font-medium outline-none transition-colors ${
            error ? 'text-red-600 dark:text-red-400' : value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        />
        {/* AM/PM Toggle */}
        {value && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {['AM', 'PM'].map((m) => {
              const isActive = input.toUpperCase().includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    // Replace AM/PM in the display string
                    const newDisplay = input.replace(/\s*(AM|PM)/i, '') + ' ' + m;
                    setInput(newDisplay);
                    const parsed = parseTime(newDisplay);
                    if (parsed && !validate(parsed.h, parsed.m)) {
                      onChange(toHHMM(parsed.h, parsed.m, parsed.isPM));
                      setError(null);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                    isActive
                      ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              );
            })}
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); setInput(''); onChange(''); setError(null); inputRef.current?.focus(); }}
              className="ml-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1 ml-1">{error}</p>
      )}

      {/* ── Suggestion pills ── */}
      {showSuggestions && !value && !error && (
        <div className={`absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl border p-2 shadow-lg ${
          dark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 pb-1.5">Quick picks</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  value === s.split(' ')[0].replace(':', ':')
                    ? 'bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
