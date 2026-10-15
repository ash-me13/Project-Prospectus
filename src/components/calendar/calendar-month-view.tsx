"use client";

import React, { useState } from "react";
import {
  CalendarEventType,
  DbCalendarEvent,
  SaturdayRuleType,
} from "../../types/database";
import {
  isDateInstructional,
  isSecondOrFourthSaturday,
  getSaturdaysInMonth,
} from "../../domain/calendar-engine";
import { Button } from "../ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  Award,
} from "lucide-react";

export interface CalendarMonthViewProps {
  currentSemesterId: string;
  campusId: string;
  saturdayRule: SaturdayRuleType;
  events: DbCalendarEvent[];
  onAddEvent: () => void;
  onOpenImport: () => void;
  onOpenExamWindows: () => void;
  onDeleteEvent: (eventId: string) => void;
  canManage: boolean;
}

export function CalendarMonthView({
  saturdayRule,
  events,
  onAddEvent,
  onOpenImport,
  onOpenExamWindows,
  onDeleteEvent,
  canManage,
}: CalendarMonthViewProps) {
  // Calendar navigation state (defaults to October 2026 for MSOT curriculum semester)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 10 = October (1-indexed)
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days for the current month
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  // First day of month's day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfWeek = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).getUTCDay();

  // Filtered events
  const filteredEvents = events.filter((ev) => {
    if (eventTypeFilter === "ALL") return true;
    return ev.event_type === eventTypeFilter;
  });

  // Calculate Saturdays for this month to highlight 2nd and 4th
  const monthSaturdays = getSaturdaysInMonth(currentYear, currentMonth);

  const getEventBadgeStyle = (type: CalendarEventType) => {
    switch (type) {
      case "HOLIDAY":
        return "bg-[#C84B58]/10 text-[#C84B58] border-[#C84B58]/20";
      case "SPECIAL_WORKING_DAY":
        return "bg-[#16836B]/10 text-[#16836B] border-[#16836B]/20";
      case "ACADEMIC_EVENT":
        return "bg-[#8878F5]/10 text-[#8878F5] border-[#8878F5]/20";
      case "EXAM_PERIOD":
        return "bg-[#B87918]/10 text-[#B87918] border-[#B87918]/20";
      case "CANCELLED_DAY":
        return "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20";
      default:
        return "bg-[#4965E8]/10 text-[#4965E8] border-[#4965E8]/20";
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#E6EAF2] shadow-xs">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-[#E6EAF2] hover:bg-[#F7F8FC] text-[#64748B] hover:text-[#172033] transition-subtle"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-[#E6EAF2] hover:bg-[#F7F8FC] text-[#64748B] hover:text-[#172033] transition-subtle"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-base font-bold text-[#172033] tracking-tight">
            {monthNames[currentMonth - 1]} {currentYear}
          </h3>
          <span className="text-[11px] font-medium text-[#4965E8] bg-[#4965E8]/10 px-2 py-0.5 rounded-full">
            {saturdayRule === "SECOND_FOURTH" ? "2nd & 4th Sat Working" : saturdayRule === "ALL" ? "All Sat Working" : "No Sat Working"}
          </span>
        </div>

        {/* View Mode & Management Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month / Week Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-[#E6EAF2] bg-[#F7F8FC]">
            <button
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-subtle ${
                viewMode === "month"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#64748B] hover:text-[#172033]"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-subtle ${
                viewMode === "week"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#64748B] hover:text-[#172033]"
              }`}
            >
              Week
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={onOpenExamWindows}>
            <Award className="h-3.5 w-3.5 text-[#B87918]" />
            Exam Windows
          </Button>

          {canManage && (
            <>
              <Button variant="secondary" size="sm" onClick={onOpenImport}>
                <Upload className="h-3.5 w-3.5 text-[#4965E8]" />
                Import CSV
              </Button>
              <Button variant="primary" size="sm" onClick={onAddEvent}>
                <Plus className="h-3.5 w-3.5" />
                Add Event
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#64748B] font-medium shrink-0">Filter:</span>
        {[
          { id: "ALL", label: "All Events" },
          { id: "HOLIDAY", label: "Holidays (#C84B58)" },
          { id: "ACADEMIC_EVENT", label: "Academic Events (#8878F5)" },
          { id: "SPECIAL_WORKING_DAY", label: "Special Working (#16836B)" },
          { id: "EXAM_PERIOD", label: "Exam Periods (#B87918)" },
          { id: "CANCELLED_DAY", label: "Cancelled Teaching (#64748B)" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setEventTypeFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 transition-subtle ${
              eventTypeFilter === f.id
                ? "bg-[#172033] text-white border-[#172033]"
                : "bg-white text-[#64748B] border-[#E6EAF2] hover:bg-[#F7F8FC]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Monthly Grid View */}
      <div className="rounded-xl border border-[#E6EAF2] bg-white overflow-hidden shadow-xs">
        {/* Day-of-Week Headers */}
        <div className="grid grid-cols-7 border-b border-[#E6EAF2] bg-[#F7F8FC] text-center text-xs font-semibold text-[#64748B] py-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E6EAF2]">
          {/* Empty cells for offset before the 1st day of month */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[110px] bg-[#F7F8FC]/40 p-2" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayOfWeek = (firstDayOfWeek + i) % 7;

            // Compute instructional status via pure calendar engine
            const dayStatus = isDateInstructional(dateStr, saturdayRule, events);

            // Matching events for this specific date
            const dayEvents = filteredEvents.filter(
              (ev) => ev.start_date <= dateStr && dateStr <= ev.end_date
            );

            // Check if this is a Saturday
            const isSaturday = dayOfWeek === 6;
            const is2ndOr4thSat = isSaturday && isSecondOrFourthSaturday(currentYear, currentMonth, dayNum);
            const satIndex = isSaturday ? monthSaturdays.indexOf(dayNum) + 1 : 0;

            const isToday = dateStr === "2026-10-16"; // Sample local date in mock

            return (
              <div
                key={dateStr}
                className={`min-h-[90px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                  !dayStatus.isInstructional ? "bg-[#F7F8FC]/50" : "bg-white hover:bg-[#F7F8FC]/30"
                } ${isToday ? "ring-2 ring-[#4965E8] ring-inset" : ""}`}
              >
                {/* Date header with day number and badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? "h-5 w-5 rounded-full bg-[#4965E8] text-white flex items-center justify-center"
                        : dayStatus.isInstructional
                        ? "text-[#172033]"
                        : "text-[#64748B]"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Saturday Working / Off Badge */}
                  {isSaturday && saturdayRule === "SECOND_FOURTH" && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        is2ndOr4thSat
                          ? "bg-[#16836B]/10 text-[#16836B]"
                          : "bg-[#64748B]/10 text-[#64748B]"
                      }`}
                      title={is2ndOr4thSat ? "Working 2nd/4th Saturday" : "Off Saturday"}
                    >
                      {satIndex}th Sat ({is2ndOr4thSat ? "Work" : "Off"})
                    </span>
                  )}
                </div>

                {/* Event Chips for this day */}
                <div className="mt-1 space-y-1 flex-1">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate flex items-center justify-between group ${getEventBadgeStyle(
                        ev.event_type
                      )}`}
                      title={`${ev.title} (${ev.event_type}) - ${ev.description || "No description"}`}
                    >
                      <span className="truncate">{ev.title}</span>
                      {canManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEvent(ev.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#C84B58] hover:bg-white rounded transition-opacity"
                          title="Delete Event"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Day status indicator footer */}
                <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#E6EAF2]/60 truncate">
                  {dayStatus.reason}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
