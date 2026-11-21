import React from 'react';
import { formatRupiahInput, parseRupiahInput } from '@/src/lib/money';

interface CurrencyInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: CurrencyInputProps) {
  const displayValue = value > 0 ? formatRupiahInput(value) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseRupiahInput(e.target.value);
    if (parsed <= 1_000_000_000_000) {
      onChange(parsed);
    }
  };

  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3.5 text-sm font-semibold text-slate-500">
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={`w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 tabular-nums placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
      />
    </div>
  );
}
