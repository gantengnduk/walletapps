import React from "react";

export type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClassName?: string;
};

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  (
    {
      label,
      hint,
      error,
      prefix,
      suffix,
      id,
      className = "",
      containerClassName = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

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
          {prefix && <div className="mr-2.5 text-slate-400 shrink-0 select-none">{prefix}</div>}

          <input
            ref={ref}
            id={fieldId}
            disabled={disabled}
            className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed text-base sm:text-sm ${className}`}
            {...props}
          />

          {suffix && <div className="ml-2.5 text-slate-500 shrink-0 select-none text-xs font-medium">{suffix}</div>}
        </div>

        {error && <p className="text-xs font-medium text-red-600 animate-fadeIn">{error}</p>}
      </div>
    );
  },
);

Field.displayName = "Field";
