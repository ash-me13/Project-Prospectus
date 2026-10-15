import React from "react";

export interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PageHeader({
  kicker,
  title,
  description,
  badge,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="space-y-3 pb-6 border-b border-[#E6EAF2]">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-[#64748B]">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[#64748B]/50">/</span>}
              {b.href ? (
                <a
                  href={b.href}
                  className="hover:text-[#172033] transition-subtle"
                >
                  {b.label}
                </a>
              ) : (
                <span className="text-[#172033] font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1 text-left">
          {kicker && (
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#8878F5]">
              {kicker}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172033]">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-[#64748B] max-w-2xl font-normal leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
