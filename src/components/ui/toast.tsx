import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastProps {
  id: string;
  type?: "success" | "error" | "info";
  title: string;
  message?: string;
  onDismiss: (id: string) => void;
}

export function Toast({
  id,
  type = "success",
  title,
  message,
  onDismiss,
}: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-[#16836B]" />,
    error: <AlertCircle className="h-4 w-4 text-[#C84B58]" />,
    info: <Info className="h-4 w-4 text-[#4965E8]" />,
  };

  const borders = {
    success: "border-l-4 border-l-[#16836B]",
    error: "border-l-4 border-l-[#C84B58]",
    info: "border-l-4 border-l-[#4965E8]",
  };

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg bg-white p-3.5 shadow-md border border-[#E6EAF2] ${borders[type]} min-w-[280px] max-w-sm transition-all duration-200`}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-left">
        <p className="text-xs font-semibold text-[#172033]">{title}</p>
        {message && <p className="text-[11px] text-[#64748B] mt-0.5">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-[#64748B] hover:text-[#172033] transition-subtle p-0.5"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
