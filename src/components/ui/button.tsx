import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-subtle focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#4965E8]/30 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985] cursor-pointer";

  const sizes = {
    sm: "px-3 py-1.5 text-xs h-8 gap-1.5",
    md: "px-4 py-2 text-sm h-9.5 gap-2",
    lg: "px-5 py-2.5 text-base h-11 gap-2.5",
  };

  const variants = {
    primary:
      "bg-[#4965E8] text-white hover:bg-[#3b53c7] shadow-sm shadow-[#4965E8]/15 border border-transparent",
    secondary:
      "bg-white text-[#172033] hover:bg-[#F7F8FC] border border-[#E6EAF2] shadow-xs",
    outline:
      "bg-transparent text-[#172033] hover:bg-white border border-[#E6EAF2]",
    danger:
      "bg-[#C84B58] text-white hover:bg-[#b33d49] shadow-sm shadow-[#C84B58]/15 border border-transparent",
    ghost:
      "bg-transparent text-[#64748B] hover:text-[#172033] hover:bg-slate-100/60",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
      {children}
    </button>
  );
}
