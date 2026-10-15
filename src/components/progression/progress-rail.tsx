import React from "react";
import { Check, Calendar, AlertTriangle } from "lucide-react";

export interface Milestone {
  id: string;
  title: string;
  category: "semester_start" | "topic_milestone" | "exam" | "semester_end";
  date: string;
  isCompleted: boolean;
  isCurrent?: boolean;
  statusBadge?: string;
  note?: string;
}

export interface ProgressRailProps {
  milestones: Milestone[];
  currentDateIso?: string;
}

export function ProgressRail({ milestones }: ProgressRailProps) {
  return (
    <div className="card-quiet p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
            Academic Progress Rail
          </h2>
          <p className="text-[11px] text-[#64748B]">
            Synchronized sequence of topic completion, sessional reviews, and university exams
          </p>
        </div>
        <span className="text-xs font-medium text-[#4965E8] bg-[#4965E8]/8 px-2.5 py-0.5 rounded-full border border-[#4965E8]/20">
          Semester Milestones
        </span>
      </div>

      <div className="relative pt-2 pb-1 overflow-x-auto">
        <div className="min-w-[680px] flex items-start justify-between relative">
          {/* Background Rail Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#E6EAF2] -z-0" />

          {milestones.map((m) => {
            const isExam = m.category === "exam";

            return (
              <div
                key={m.id}
                className="relative z-10 flex flex-col items-center text-center max-w-[120px] group cursor-default"
              >
                {/* Node icon */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                    m.isCompleted
                      ? "bg-[#16836B] border-[#16836B] text-white shadow-xs"
                      : m.isCurrent
                      ? "bg-white border-[#4965E8] text-[#4965E8] ring-4 ring-[#4965E8]/15"
                      : isExam
                      ? "bg-white border-[#B87918] text-[#B87918]"
                      : "bg-[#F7F8FC] border-[#E6EAF2] text-[#64748B]"
                  }`}
                >
                  {m.isCompleted ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : isExam ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : m.isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-[#4965E8] animate-pulse" />
                  ) : (
                    <Calendar className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Milestone details */}
                <div className="mt-2.5 space-y-0.5">
                  <p
                    className={`text-xs font-semibold leading-tight ${
                      m.isCurrent
                        ? "text-[#4965E8]"
                        : m.isCompleted
                        ? "text-[#172033]"
                        : "text-[#64748B]"
                    }`}
                  >
                    {m.title}
                  </p>
                  <p className="text-[11px] font-mono text-[#64748B]">{m.date}</p>
                  {m.note && (
                    <p className="text-[10px] text-[#64748B]/80 font-medium">
                      {m.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
