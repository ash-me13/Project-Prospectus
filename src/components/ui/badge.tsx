import React from "react";
import { ProgressStatus } from "@/types/academic";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "neutral";
  status?: ProgressStatus;
}

export function Badge({
  children,
  variant = "default",
  status,
  className = "",
  ...props
}: BadgeProps) {
  let colorClasses = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";

  if (status) {
    switch (status) {
      case "ON_TRACK":
        colorClasses =
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
        break;
      case "TIGHT":
        colorClasses =
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
        break;
      case "DANGER":
        colorClasses =
          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
        break;
      case "COMPLETE":
        colorClasses =
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800";
        break;
    }
  } else {
    switch (variant) {
      case "success":
        colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
        break;
      case "warning":
        colorClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
        break;
      case "danger":
        colorClasses = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
        break;
      case "neutral":
        colorClasses = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
        break;
    }
  }

  return (
    <div
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${colorClasses} ${className}`}
      {...props}
    >
      {status ? status.replace("_", " ") : children}
    </div>
  );
}
