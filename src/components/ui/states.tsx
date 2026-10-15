import React from "react";
import { AlertCircle, CheckCircle2, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "./button";

export function LoadingState({
  message = "Loading academic data...",
}: {
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
        {message}
      </p>
      <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden dark:bg-slate-800">
        <div className="h-full bg-indigo-600 rounded-full animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No records found",
  description = "No course sessions or topics have been recorded for this view.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 dark:bg-indigo-950/50 dark:text-indigo-400">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm dark:text-slate-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Failed to load data",
  error,
  onRetry,
}: {
  title?: string;
  error?: string | Error;
  onRetry?: () => void;
}) {
  const errorMessage =
    typeof error === "string" ? error : error?.message || "An unexpected error occurred.";

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-8 text-center border border-rose-200 rounded-xl bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20"
    >
      <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 dark:bg-rose-900/40 dark:text-rose-400">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">
        {title}
      </h3>
      <p className="mt-1 text-sm text-rose-700 max-w-md dark:text-rose-400">
        {errorMessage}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function SuccessState({
  title = "Changes saved successfully",
  description = "Source records have been updated and calculations recomputed.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-emerald-200 rounded-xl bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3 dark:bg-emerald-900/40 dark:text-emerald-400">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
        {title}
      </h3>
      <p className="mt-1 text-sm text-emerald-700 max-w-md dark:text-emerald-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
