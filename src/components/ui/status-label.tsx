import React from "react";
import { ProgressStatus } from "@/types/academic";

export interface StatusLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: ProgressStatus;
  variant?: "success" | "warning" | "danger" | "neutral" | "brand";
  size?: "sm" | "md";
  showDot?: boolean;
}

export function StatusLabel({
  children,
  status,
  variant,
  size = "md",
  showDot = true,
  className = "",
  ...props
}: StatusLabelProps) {
  let resolvedVariant = variant || "neutral";
  let labelText = children;

  if (status) {
    switch (status) {
      case "ON_TRACK":
        resolvedVariant = "success";
        labelText = labelText || "On Track";
        break;
      case "TIGHT":
        resolvedVariant = "warning";
        labelText = labelText || "Tight Buffer";
        break;
      case "DANGER":
        resolvedVariant = "danger";
        labelText = labelText || "Behind Schedule";
        break;
      case "COMPLETE":
        resolvedVariant = "brand";
        labelText = labelText || "Completed";
        break;
    }
  }

  const styles = {
    success: {
      bg: "bg-[#16836B]/8 text-[#16836B] border-[#16836B]/20",
      dot: "bg-[#16836B]",
    },
    warning: {
      bg: "bg-[#B87918]/8 text-[#B87918] border-[#B87918]/20",
      dot: "bg-[#B87918]",
    },
    danger: {
      bg: "bg-[#C84B58]/8 text-[#C84B58] border-[#C84B58]/20",
      dot: "bg-[#C84B58]",
    },
    neutral: {
      bg: "bg-[#64748B]/8 text-[#64748B] border-[#64748B]/20",
      dot: "bg-[#64748B]",
    },
    brand: {
      bg: "bg-[#4965E8]/8 text-[#4965E8] border-[#4965E8]/20",
      dot: "bg-[#4965E8]",
    },
  };

  const currentStyle = styles[resolvedVariant];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${currentStyle.bg} ${sizeClasses} ${className}`}
      {...props}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${currentStyle.dot} transition-opacity duration-300`}
          aria-hidden="true"
        />
      )}
      <span>{labelText}</span>
    </span>
  );
}
