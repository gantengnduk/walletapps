import React, { useRef, useId } from "react";

export type AmountFieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  value: string; // unformatted clean value (e.g. "1000.50")
  onChange: (cleanValue: string) => void;
  currency?: string;
  suffix?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  containerClassName?: string;
};

export function formatAmountWithCommas(raw: string): string {
  if (!raw) return "";

  // Keep only digits and decimal points
  const clean = raw.replace(/[^\d.]/g, "");
  const dotIndex = clean.indexOf(".");
  let intPart = "";
  let decPart: string | null = null;

  if (dotIndex !== -1) {
    intPart = clean.slice(0, dotIndex);
    decPart = clean.slice(dotIndex + 1).replace(/\./g, "").slice(0, 4);
  } else {
    intPart = clean;
  }

  // Format integer part with thousands commas
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (dotIndex !== -1) {
    return `${formattedInt}.${decPart}`;
  }
  return formattedInt;
}

export const AmountField: React.FC<AmountFieldProps> = ({
  label = "Amount",
  hint,
  error,
  value,
  onChange,
  currency,
  suffix,
  placeholder = "0.00",
  disabled,
  required,
  autoFocus,
  id,
  className = "",
  containerClassName = "",
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive the formatted display value from prop value
  const displayValue = formatAmountWithCommas(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawInput = input.value;
    const selStart = input.selectionStart || 0;

    // Count non-comma characters before the cursor in user's typed input
    const nonCommasBefore = rawInput.slice(0, selStart).replace(/,/g, "").length;

    const formatted = formatAmountWithCommas(rawInput);
    const clean = formatted.replace(/,/g, "");

    onChange(clean);

    // Maintain natural cursor position after comma insertion
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newPos = 0;
      let counted = 0;
      while (newPos < formatted.length && counted < nonCommasBefore) {
        if (formatted[newPos] !== ",") {
          counted++;
        }
        newPos++;
      }
      inputRef.current.setSelectionRange(newPos, newPos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (e.key === "Backspace" && input.selectionStart === input.selectionEnd) {
      const pos = input.selectionStart || 0;
      // If cursor is right after a comma (e.g., "1,|000"), delete the digit before the comma
      if (pos > 1 && input.value[pos - 1] === ",") {
        e.preventDefault();
        const before = input.value.slice(0, pos - 2);
        const after = input.value.slice(pos);
        const newRaw = before + after;
        const formatted = formatAmountWithCommas(newRaw);
        const clean = formatted.replace(/,/g, "");
        onChange(clean);

        requestAnimationFrame(() => {
          if (!inputRef.current) return;
          const nonCommasBefore = before.replace(/,/g, "").length;
          let newPos = 0;
          let counted = 0;
          while (newPos < formatted.length && counted < nonCommasBefore) {
            if (formatted[newPos] !== ",") {
              counted++;
            }
            newPos++;
          }
          inputRef.current.setSelectionRange(newPos, newPos);
        });
      }
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={fieldId} className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
          {hint && <span className="text-xs text-slate-500">{hint}</span>}
        </div>
      )}

      <div
        className={`flex items-center rounded-xl border bg-white px-3.5 py-2.5 min-h-[44px] text-sm shadow-xs transition-colors focus-within:ring-2 focus-within:ring-offset-1 ${
          error
            ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-400"
            : "border-slate-300 focus-within:border-blue-600 focus-within:ring-blue-400"
        } ${disabled ? "bg-slate-50 opacity-60 cursor-not-allowed" : ""}`}
      >
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed font-mono font-medium text-base sm:text-sm ${className}`}
        />

        {suffix ? (
          <div className="ml-2.5 shrink-0 select-none">{suffix}</div>
        ) : currency ? (
          <div className="ml-2.5 text-slate-500 shrink-0 select-none text-xs font-bold tracking-wider rounded-md bg-slate-100 px-2 py-0.5 border border-slate-200/80">
            {currency}
          </div>
        ) : null}
      </div>

      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  );
};
