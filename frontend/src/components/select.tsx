import React from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
};

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  containerClassName?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      children,
      id,
      className = "",
      containerClassName = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              {label}
            </label>
            {hint && <span className="text-xs text-slate-500">{hint}</span>}
          </div>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed ${
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-400"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label} {opt.sublabel ? `(${opt.sublabel})` : ""}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

