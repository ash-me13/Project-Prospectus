import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  id,
  className = "",
  disabled,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#172033] tracking-tight"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        className={`w-full rounded-lg bg-white px-3.5 py-2 text-sm text-[#172033] placeholder:text-[#64748B]/60 border transition-subtle focus:outline-none focus:ring-2 focus:ring-[#4965E8]/20 focus:border-[#4965E8] disabled:bg-[#F7F8FC] disabled:text-[#64748B] disabled:cursor-not-allowed ${
          error ? "border-[#C84B58] focus:ring-[#C84B58]/20 focus:border-[#C84B58]" : "border-[#E6EAF2]"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] font-medium text-[#C84B58]">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[#64748B]">{helperText}</p>
      ) : null}
    </div>
  );
}
