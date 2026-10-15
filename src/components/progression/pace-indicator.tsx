import React from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { StatusLabel } from "../ui/status-label";
import { ProgressStatus } from "@/types/academic";

export interface PaceIndicatorProps {
  coveredHours: number;
  expectedHoursByToday: number;
  totalPlannedHours: number;
  status: ProgressStatus;
  targetFinishDate: string;
}

export function PaceIndicator({
  coveredHours,
  expectedHoursByToday,
  totalPlannedHours,
  status,
  targetFinishDate,
}: PaceIndicatorProps) {
  const actualPercent = Math.min(
    100,
    Math.max(0, (coveredHours / totalPlannedHours) * 100)
  );
  const expectedPercent = Math.min(
    100,
    Math.max(0, (expectedHoursByToday / totalPlannedHours) * 100)
  );
  const deltaHours = Math.round((coveredHours - expectedHoursByToday) * 100) / 100;
  const isAheadOrOnTrack = deltaHours >= 0;

  return (
    <div className="card-quiet p-5 space-y-4">
      {/* Header with Title and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6EAF2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
              Pace Against Academic Schedule
            </h2>
            <StatusLabel status={status} size="sm" />
          </div>
          <p className="text-[11px] text-[#64748B]">
            Comparison between scheduled curriculum progress and verified session hours
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
              isAheadOrOnTrack
                ? "bg-[#16836B]/10 text-[#16836B]"
                : "bg-[#C84B58]/10 text-[#C84B58]"
            }`}
          >
            {isAheadOrOnTrack ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {isAheadOrOnTrack ? `+${deltaHours}` : deltaHours} hrs {isAheadOrOnTrack ? "pace" : "delay"}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Dual Progress Track */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#172033] font-medium flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#4965E8]" />
            Actual Delivery: <strong className="font-semibold">{coveredHours} hrs</strong>
          </span>
          <span className="text-[#64748B] text-[11px] flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#8878F5]/40 border border-[#8878F5]/50" />
            Expected to Date: <strong className="font-semibold text-[#172033]">{expectedHoursByToday} hrs</strong>
          </span>
        </div>

        {/* The Track */}
        <div className="relative h-4 w-full rounded-md bg-[#E6EAF2] overflow-hidden p-0.5">
          {/* Expected marker band */}
          <div
            className="absolute top-0 bottom-0 bg-[#8878F5]/25 border-r border-[#8878F5]/80 transition-all duration-300"
            style={{ width: `${expectedPercent}%` }}
          />

          {/* Actual delivery progress bar */}
          <div
            className={`h-full rounded-sm transition-all duration-300 ease-out ${
              status === "DANGER"
                ? "bg-[#C84B58]"
                : status === "TIGHT"
                ? "bg-[#B87918]"
                : "bg-[#4965E8]"
            }`}
            style={{ width: `${actualPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-[#64748B] pt-1">
          <span>0 hrs (Start)</span>
          <span className="flex items-center gap-1 font-mono">
            Target Finish: {targetFinishDate}
            <ArrowRight className="h-3 w-3 inline text-[#64748B]" />
          </span>
          <span className="font-semibold text-[#172033]">{totalPlannedHours} hrs scope</span>
        </div>
      </div>
    </div>
  );
}
