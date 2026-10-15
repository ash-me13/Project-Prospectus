"use client";

import React from "react";
import {
  Clock,
  Milestone,
  ArrowRight,
} from "lucide-react";
import { isolatedDataStore } from "@/lib/database/service";
import { planSyllabusTopicDates } from "@/domain/planning-engine";

interface PlanTimelinePreviewProps {
  subjectId: string;
  batchId?: string;
}

export function PlanTimelinePreview({ subjectId, batchId }: PlanTimelinePreviewProps) {
  const subjects = isolatedDataStore.getSubjects();
  const subject = subjects.find((s) => s.id === subjectId) || subjects[0];
  const batches = isolatedDataStore.getBatches();
  const selectedBatch = batchId ? batches.find((b) => b.id === batchId) : batches[0];

  const batchSubjects = isolatedDataStore.getBatchSubjects();
  const currentBs = batchSubjects.find(
    (bs) => bs.subject_id === subject.id && (!selectedBatch || bs.batch_id === selectedBatch.id)
  );

  const semesters = isolatedDataStore.getSemesters();
  const semester = selectedBatch
    ? semesters.find((s) => s.id === selectedBatch.semester_id) || semesters[0]
    : semesters[0];

  const calendarEvents = isolatedDataStore.getCalendarEvents(semester?.id);
  const slots = isolatedDataStore.getTimetableSlots(currentBs?.id);
  const topics = isolatedDataStore.getTopics(subject.id);
  const examScopes = isolatedDataStore.getTopicExamScopes();

  // Run Planning Engine
  const { occurrences, schedules } = planSyllabusTopicDates(
    {
      startDate: semester?.start_date || "2026-08-01",
      endDate: semester?.end_date || "2026-12-15",
      saturdayRule: semester?.saturday_rule || "SECOND_FOURTH",
    },
    slots,
    topics,
    calendarEvents,
    examScopes
  );

  const totalPlannedHours = topics.reduce((sum, t) => sum + t.planned_hours, 0);
  const scheduledHours = occurrences.reduce((sum, o) => sum + o.durationHours, 0);

  return (
    <div className="card-quiet p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6EAF2] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#4965E8]/10 text-[#4965E8]">
            <Milestone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
              Lesson Plan Chronological Timeline & Exam Alignment
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Deterministic sequence allocation derived from timetable slots and calendar rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#172033] bg-[#F7F8FC] px-2.5 py-1 rounded-md border border-[#E6EAF2]">
            {schedules.filter((s) => s.isFullyScheduled).length} / {topics.length} Topics Scheduled
          </span>
          <span className="text-xs font-mono font-bold text-[#4965E8] bg-[#4965E8]/10 px-2.5 py-1 rounded-md">
            {scheduledHours.toFixed(1)} / {totalPlannedHours.toFixed(1)} hrs allocated
          </span>
        </div>
      </div>

      {/* Progress Rail & Timeline Items */}
      <div className="space-y-3 pt-1">
        {schedules.map((schedule, index) => {
          const isComplete = schedule.isFullyScheduled;
          const examTags = schedule.examScopes;

          return (
            <div
              key={schedule.topicId}
              className="relative flex items-start gap-3.5 group"
            >
              {/* Rail Line */}
              {index < schedules.length - 1 && (
                <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-[#E6EAF2] group-hover:bg-[#4965E8]/30 transition-colors" />
              )}

              {/* Node Indicator */}
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 border z-10 transition-colors ${
                  isComplete
                    ? "bg-[#16836B]/10 text-[#16836B] border-[#16836B]/30"
                    : "bg-[#F7F8FC] text-[#64748B] border-[#E6EAF2]"
                }`}
              >
                #{schedule.sequenceOrder}
              </div>

              {/* Topic Timeline Card */}
              <div className="flex-1 rounded-lg border border-[#E6EAF2] bg-white p-3 shadow-2xs hover:border-[#4965E8]/40 transition-colors space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-[#172033]">{schedule.title}</h3>
                    <span className="text-[10px] font-mono text-[#64748B] bg-[#F7F8FC] px-1.5 py-0.5 rounded">
                      {schedule.plannedHours} hrs
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {schedule.startDate && (
                      <span className="text-[#64748B]">
                        Starts {schedule.startDate}
                      </span>
                    )}
                    {schedule.expectedCompletionDate && (
                      <>
                        <ArrowRight className="h-3 w-3 text-[#64748B]" />
                        <span className="text-[#16836B] font-semibold bg-[#16836B]/10 px-2 py-0.5 rounded">
                          Target: {schedule.expectedCompletionDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Session Breakdown & Exam Tags */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#64748B] pt-1 border-t border-[#F7F8FC]">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-[#64748B]" />
                      {schedule.sessionCount} session{schedule.sessionCount !== 1 ? "s" : ""} (
                      {schedule.allocatedHours} hrs)
                    </span>
                  </div>

                  {/* Exam Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {examTags.map((scope) => (
                      <span
                        key={scope}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#8878F5]/10 text-[#8878F5]"
                      >
                        {scope.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
