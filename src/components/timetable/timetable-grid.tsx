import React from "react";
import { Clock, User } from "lucide-react";

export interface TimetableSlotView {
  id: string;
  dayOfWeek: number; // 1 = Mon, ..., 6 = Sat
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

export interface TimetableGridProps {
  slots: TimetableSlotView[];
  saturdayRuleLabel?: string;
}

export function TimetableGrid({
  slots,
  saturdayRuleLabel = "2nd & 4th Working",
}: TimetableGridProps) {
  const days = [
    { day: 1, label: "Monday", type: "instructional" },
    { day: 2, label: "Tuesday", type: "instructional" },
    { day: 3, label: "Wednesday", type: "instructional" },
    { day: 4, label: "Thursday", type: "instructional" },
    { day: 5, label: "Friday", type: "instructional" },
    { day: 6, label: "Saturday", type: "conditional", note: saturdayRuleLabel },
  ];

  return (
    <div className="card-quiet p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6EAF2] pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
            Weekly Academic Timetable
          </h2>
          <p className="text-[11px] text-[#64748B]">
            Automated calendar allocation with working day enforcement
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-[#172033]">
            <span className="h-2 w-2 rounded-full bg-[#16836B]" />
            Instructional
          </span>
          <span className="flex items-center gap-1.5 text-[#64748B]">
            <span className="h-2 w-2 rounded-full bg-[#8878F5]" />
            {saturdayRuleLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {days.map((d) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === d.day);

          return (
            <div
              key={d.day}
              className="flex flex-col rounded-lg border border-[#E6EAF2] bg-[#F7F8FC]/60 overflow-hidden"
            >
              {/* Day Column Header */}
              <div className="bg-white p-2.5 border-b border-[#E6EAF2] flex items-center justify-between">
                <span className="text-xs font-bold text-[#172033]">{d.label}</span>
                {d.note && (
                  <span className="text-[9px] font-semibold text-[#8878F5] bg-[#8878F5]/10 px-1.5 py-0.5 rounded">
                    {d.note}
                  </span>
                )}
              </div>

              {/* Slot Cards */}
              <div className="p-2 space-y-2 flex-1">
                {daySlots.length > 0 ? (
                  daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-md border border-[#E6EAF2] bg-white p-2.5 shadow-xs space-y-1.5 hover:border-[#4965E8]/40 transition-subtle"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4965E8]">
                          {slot.subjectCode}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B] bg-[#F7F8FC] px-1 py-0.5 rounded">
                          {slot.durationHours}h
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#172033] line-clamp-1">
                        {slot.subjectName}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 border-t border-[#F0F2F7]">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-[#64748B]" />
                          {slot.startTime}–{slot.endTime}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[70px]">
                          <User className="h-3 w-3 text-[#64748B]" />
                          {slot.facultyName.split(" ").slice(-1)[0]}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-24 flex items-center justify-center text-[11px] text-[#64748B]/60 italic">
                    No classes scheduled
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
