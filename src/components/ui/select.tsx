import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export function Select({
  label,
  options,
  error,
  helperText,
  id,
  className = "",
  disabled,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-[#172033] tracking-tight"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg bg-white pl-3.5 pr-9 py-2 text-sm text-[#172033] border transition-subtle focus:outline-none focus:ring-2 focus:ring-[#4965E8]/20 focus:border-[#4965E8] disabled:bg-[#F7F8FC] disabled:cursor-not-allowed ${
            error ? "border-[#C84B58] focus:ring-[#C84B58]/20 focus:border-[#C84B58]" : "border-[#E6EAF2]"
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-[#C84B58]">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
}
