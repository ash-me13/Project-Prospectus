import React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "success" | "warning" | "danger";
  showLabel?: boolean;
}

export function Progress({
  value,
  max = 100,
  size = "md",
  variant = "brand",
  showLabel = false,
  className = "",
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const variants = {
    brand: "bg-[#4965E8]",
    success: "bg-[#16836B]",
    warning: "bg-[#B87918]",
    danger: "bg-[#C84B58]",
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-semibold text-[#172033]">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full bg-[#E6EAF2] rounded-full overflow-hidden ${sizeClasses[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${variants[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
