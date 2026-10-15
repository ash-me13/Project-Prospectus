"use client";

import React, { useState, useId } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DbScheduledSession,
  DbSyllabusTopic,
  SessionDeliveryStatus,
  WorkStatusEnum,
  TopicProgressStatus,
} from "@/types/database";
import {
  Check,
  AlertCircle,
  Clock,
  Calendar,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";

export interface FacultySessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledSession: (DbScheduledSession & {
    subject_name?: string;
    subject_code?: string;
    batch_name?: string;
    room?: string;
  }) | null;
  syllabusTopics: DbSyllabusTopic[];
  otherScheduledSessions?: DbScheduledSession[];
  onSaveSession: (payload: {
    scheduled_session_id: string;
    batch_subject_id: string;
    faculty_id: string;
    session_date: string;
    actual_start_time: string;
    actual_end_time: string;
    delivery_status: SessionDeliveryStatus;
    status_reason?: string | null;
    merged_session_ids?: string[] | null;
    idempotency_key?: string | null;
    covered_summary?: string | null;
    leftover_summary?: string | null;
    carry_forward_topic_id?: string | null;
    classwork_status: WorkStatusEnum;
    homework_status: WorkStatusEnum;
    notes?: string | null;
    affected_topics: Array<{
      topic_id: string;
      percent_complete_after: number;
      topic_status_after: TopicProgressStatus;
      notes?: string;
    }>;
  }) => Promise<void> | void;
}

interface InnerFormProps {
  scheduledSession: NonNullable<FacultySessionLogModalProps["scheduledSession"]>;
  syllabusTopics: DbSyllabusTopic[];
  otherScheduledSessions: DbScheduledSession[];
  onClose: () => void;
  onSaveSession: FacultySessionLogModalProps["onSaveSession"];
}

function InnerSessionLogForm({
  scheduledSession,
  syllabusTopics,
  otherScheduledSessions,
  onClose,
  onSaveSession,
}: InnerFormProps) {
  // Determine default topic
  const defaultTopic =
    syllabusTopics.find((t) => t.status === "IN_PROGRESS") ||
    syllabusTopics.find((t) => t.status === "NOT_STARTED") ||
    syllabusTopics[0];

  // 1. Status & Timing State
  const [deliveryStatus, setDeliveryStatus] = useState<SessionDeliveryStatus>("COMPLETED");
  const [actualStartTime] = useState<string>(
    scheduledSession.start_time.slice(0, 5) || "10:00"
  );
  const [actualEndTime] = useState<string>(
    scheduledSession.end_time.slice(0, 5) || "11:30"
  );
  const [statusReason, setStatusReason] = useState<string>("");
  const [mergedSessionIds, setMergedSessionIds] = useState<string[]>([]);
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // 2. Topics Selection State (Map topicId -> percent)
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    defaultTopic ? [defaultTopic.id] : []
  );
  const [topicPercentages, setTopicPercentages] = useState<Record<string, number>>(
    defaultTopic ? { [defaultTopic.id]: 100 } : {}
  );

  // 3. Instructional Deliverables State
  const [coveredSummary, setCoveredSummary] = useState<string>(
    defaultTopic ? `Delivered ${defaultTopic.title}` : ""
  );
  const [leftoverSummary, setLeftoverSummary] = useState<string>("");
  const [carryForwardTopicId, setCarryForwardTopicId] = useState<string>("");
  const [classworkStatus, setClassworkStatus] = useState<WorkStatusEnum>("ASSIGNED");
  const [homeworkStatus, setHomeworkStatus] = useState<WorkStatusEnum>("ASSIGNED");
  const [notes, setNotes] = useState<string>("");

  // 4. Submission & Form Lifecycle State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);

  // Accessibility unique IDs
  const reasonInputId = useId();
  const coveredInputId = useId();
  const leftoverInputId = useId();
  const carryForwardSelectId = useId();
  const notesInputId = useId();

  // Actual minutes calculation
  const getDurationMinutes = (): number => {
    const sParts = actualStartTime.split(":").map(Number);
    const eParts = actualEndTime.split(":").map(Number);
    if (sParts.length >= 2 && eParts.length >= 2) {
      const startMin = sParts[0] * 60 + sParts[1];
      const endMin = eParts[0] * 60 + eParts[1];
      return Math.max(0, endMin - startMin);
    }
    return Math.round(scheduledSession.duration_hours * 60);
  };

  const durationMin = getDurationMinutes();
  const teachingHours = (durationMin / 60).toFixed(2);

  // Topic selection helpers
  const toggleTopicSelection = (topicId: string) => {
    if (selectedTopicIds.includes(topicId)) {
      if (selectedTopicIds.length > 1) {
        setSelectedTopicIds(selectedTopicIds.filter((id) => id !== topicId));
        const copy = { ...topicPercentages };
        delete copy[topicId];
        setTopicPercentages(copy);
      }
    } else {
      setSelectedTopicIds([...selectedTopicIds, topicId]);
      setTopicPercentages((prev) => ({
        ...prev,
        [topicId]: 100,
      }));
    }
  };

  const updateTopicPercentage = (topicId: string, percent: number) => {
    setTopicPercentages((prev) => ({
      ...prev,
      [topicId]: Math.min(100, Math.max(0, percent)),
    }));
  };

  const toggleMergedSession = (sessionId: string) => {
    if (mergedSessionIds.includes(sessionId)) {
      setMergedSessionIds(mergedSessionIds.filter((id) => id !== sessionId));
    } else {
      setMergedSessionIds([...mergedSessionIds, sessionId]);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    if (
      (deliveryStatus === "SKIPPED" || deliveryStatus === "CANCELLED" || deliveryStatus === "MERGED") &&
      !statusReason.trim()
    ) {
      setErrorMessage(`Please provide a reason for marking this session as ${deliveryStatus.toLowerCase()}.`);
      return;
    }

    if (
      (deliveryStatus === "COMPLETED" || deliveryStatus === "IN_PROGRESS") &&
      selectedTopicIds.length === 0
    ) {
      setErrorMessage("Please select at least one syllabus topic covered during this session.");
      return;
    }

    if (durationMin <= 0 && deliveryStatus !== "CANCELLED" && deliveryStatus !== "SKIPPED") {
      setErrorMessage("Actual session end time must be after start time.");
      return;
    }

    // Network error simulation check
    if (isSimulatingOffline) {
      setErrorMessage("Network error: Unable to reach Supabase database. Please retry.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build affected topics payload
      const affectedTopics = selectedTopicIds.map((topicId) => {
        const percent = topicPercentages[topicId] ?? 100;
        let topicStatus: TopicProgressStatus = "IN_PROGRESS";
        if (percent >= 100) {
          topicStatus = "COMPLETED";
        } else if (percent === 0) {
          topicStatus = "NOT_STARTED";
        }
        return {
          topic_id: topicId,
          percent_complete_after: percent,
          topic_status_after: topicStatus,
        };
      });

      // Format times as HH:MM:SS
      const formattedStart = actualStartTime.includes(":") && actualStartTime.split(":").length === 2
        ? `${actualStartTime}:00`
        : actualStartTime;
      const formattedEnd = actualEndTime.includes(":") && actualEndTime.split(":").length === 2
        ? `${actualEndTime}:00`
        : actualEndTime;

      await onSaveSession({
        scheduled_session_id: scheduledSession.id,
        batch_subject_id: scheduledSession.batch_subject_id,
        faculty_id: scheduledSession.faculty_id,
        session_date: scheduledSession.session_date,
        actual_start_time: formattedStart,
        actual_end_time: formattedEnd,
        delivery_status: deliveryStatus,
        status_reason: statusReason.trim() || null,
        merged_session_ids: deliveryStatus === "MERGED" ? mergedSessionIds : null,
        idempotency_key: idempotencyKey,
        covered_summary: coveredSummary.trim() || null,
        leftover_summary: leftoverSummary.trim() || null,
        carry_forward_topic_id: carryForwardTopicId || null,
        classwork_status: classworkStatus,
        homework_status: homeworkStatus,
        notes: notes.trim() || null,
        affected_topics: affectedTopics,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const statusOptions: Array<{
    status: SessionDeliveryStatus;
    label: string;
    desc: string;
    color: string;
  }> = [
    {
      status: "COMPLETED",
      label: "Completed",
      desc: "Delivered as scheduled",
      color: "border-[#16836B] bg-[#16836B]/5 text-[#16836B]",
    },
    {
      status: "IN_PROGRESS",
      label: "In Progress",
      desc: "Partial topic coverage",
      color: "border-[#4965E8] bg-[#4965E8]/5 text-[#4965E8]",
    },
    {
      status: "MERGED",
      label: "Merged",
      desc: "Combined with other slot",
      color: "border-[#8878F5] bg-[#8878F5]/5 text-[#8878F5]",
    },
    {
      status: "SKIPPED",
      label: "Skipped",
      desc: "Slot skipped; topic preserved",
      color: "border-[#B87918] bg-[#B87918]/5 text-[#B87918]",
    },
    {
      status: "CANCELLED",
      label: "Cancelled",
      desc: "Holiday / campus closure",
      color: "border-[#C84B58] bg-[#C84B58]/5 text-[#C84B58]",
    },
  ];

  const quickReasonPresets: Record<string, string[]> = {
    SKIPPED: [
      "Faculty Medical Leave",
      "Special Department Review",
      "Campus Guest Lecture",
      "Lab Power / Infrastructure Failure",
    ],
    CANCELLED: [
      "Declared Public Holiday",
      "Campus Weather Emergency",
      "Institutional Exam Center Duty",
      "Academic Suspension Day",
    ],
    MERGED: [
      "Combined with slot 2 for 3h intensive laboratory",
      "Extended hands-on coding sprint",
      "Pre-exam comprehensive review block",
    ],
  };

  const workStatusList: WorkStatusEnum[] = ["NONE", "ASSIGNED", "COLLECTED", "REVIEWED"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error / Offline Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-[#C84B58]/30 bg-[#C84B58]/10 text-xs text-[#C84B58] flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Submission Constraint Warning</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSimulatingOffline(false);
              setErrorMessage(null);
            }}
            className="text-[11px] underline font-medium hover:text-[#172033]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Prefilled Context Ribbon (Read-only timetable details) */}
      <div className="p-3 bg-[#F7F8FC] rounded-lg border border-[#E6EAF2] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#172033] font-medium">
            <Calendar className="h-3.5 w-3.5 text-[#4965E8]" />
            <span>{scheduledSession.session_date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <Clock className="h-3.5 w-3.5 text-[#64748B]" />
            <span>
              {scheduledSession.start_time.slice(0, 5)} - {scheduledSession.end_time.slice(0, 5)}
            </span>
          </div>
          <div className="text-[#64748B]">
            Room: <span className="text-[#172033] font-medium">{scheduledSession.room || "Lab 3"}</span>
          </div>
        </div>
        <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16836B]" />
          Timetable Pre-filled
        </div>
      </div>

      {/* Step 1: Session Delivery Status (Progressive Switcher) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#172033] uppercase tracking-wider block">
          1. Confirm Delivery Status
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {statusOptions.map((opt) => {
            const isSelected = deliveryStatus === opt.status;
            return (
              <button
                key={opt.status}
                type="button"
                onClick={() => setDeliveryStatus(opt.status)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? `${opt.color} ring-2 ring-offset-1 ring-[#4965E8]/30 shadow-xs font-semibold`
                    : "border-[#E6EAF2] bg-white text-[#64748B] hover:border-[#64748B]/40"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </div>
                <span className="text-[10px] text-[#64748B] line-clamp-1 mt-1 font-normal">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Progressive Branching: Delivery Reason for Skipped, Cancelled, or Merged */}
      {(deliveryStatus === "SKIPPED" || deliveryStatus === "CANCELLED" || deliveryStatus === "MERGED") && (
        <div className="space-y-3 p-4 rounded-lg border border-[#B87918]/30 bg-[#B87918]/5">
          <div className="flex items-start gap-2 text-xs text-[#172033]">
            <Info className="h-4 w-4 text-[#B87918] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">
                Mandatory Audit Reason for {deliveryStatus}
              </span>
              <span className="text-[#64748B] text-[11px]">
                {deliveryStatus === "SKIPPED" &&
                  "Topics are not marked as skipped. Syllabus progression is preserved and will be rescheduled."}
                {deliveryStatus === "CANCELLED" &&
                  "Classroom session cancellation recorded in audit trail. Topic expected dates will automatically adjust."}
                {deliveryStatus === "MERGED" &&
                  "Select other scheduled slots combined into this block. Planned/actual hours will not be double-counted."}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={reasonInputId} className="text-xs font-medium text-[#172033]">
              Explanatory Reason <span className="text-[#C84B58]">*</span>
            </label>
            <Input
              id={reasonInputId}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder={`Reason for ${deliveryStatus.toLowerCase()} session...`}
              className="text-xs bg-white"
              required
            />
          </div>

          {/* Quick Reason Chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-[#64748B] mr-1">Quick Select:</span>
            {(quickReasonPresets[deliveryStatus] || []).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStatusReason(preset)}
                className="px-2 py-0.5 text-[10px] bg-white border border-[#E6EAF2] rounded-full hover:border-[#4965E8] text-[#172033]"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Merged Sessions Checklist */}
          {deliveryStatus === "MERGED" && (
            <div className="space-y-2 pt-2 border-t border-[#E6EAF2]">
              <label className="text-xs font-semibold text-[#172033] block">
                Select Associated Scheduled Slots to Merge:
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {otherScheduledSessions.filter((s) => s.id !== scheduledSession.id).length === 0 ? (
                  <div className="text-[11px] text-[#64748B] italic p-2 bg-white rounded border border-[#E6EAF2]">
                    No other slots scheduled for this batch today. You may still confirm merged delivery.
                  </div>
                ) : (
                  otherScheduledSessions
                    .filter((s) => s.id !== scheduledSession.id)
                    .map((slot) => {
                      const isChecked = mergedSessionIds.includes(slot.id);
                      return (
                        <label
                          key={slot.id}
                          className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${
                            isChecked
                              ? "border-[#8878F5] bg-[#8878F5]/10 font-medium"
                              : "border-[#E6EAF2] bg-white hover:bg-[#F7F8FC]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMergedSession(slot.id)}
                            className="rounded text-[#4965E8] focus:ring-[#4965E8]"
                          />
                          <span>
                            {slot.session_date} • {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)} ({slot.duration_hours}h)
                          </span>
                        </label>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Progressive Branching: Topic Coverage (Hidden for Skipped/Cancelled) */}
      {deliveryStatus !== "SKIPPED" && deliveryStatus !== "CANCELLED" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
              2. Select Syllabus Topics Covered
            </label>
            <span className="text-[11px] text-[#64748B]">
              {selectedTopicIds.length} topic(s) selected
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {syllabusTopics.map((topic) => {
              const isSelected = selectedTopicIds.includes(topic.id);
              const percent = topicPercentages[topic.id] ?? (isSelected ? 100 : 0);

              return (
                <div
                  key={topic.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? "border-[#4965E8] bg-[#4965E8]/5 shadow-2xs"
                      : "border-[#E6EAF2] bg-white hover:border-[#64748B]/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTopicSelection(topic.id)}
                        className="mt-0.5 rounded text-[#4965E8] focus:ring-[#4965E8]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-[#64748B]">
                            #{topic.sequence_order}
                          </span>
                          <span className="text-xs font-medium text-[#172033]">
                            {topic.title}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          Planned: {topic.planned_hours}h • Status: {topic.status} (current: {topic.percent_complete}%)
                        </div>
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            percent >= 100
                              ? "bg-[#16836B]/15 text-[#16836B]"
                              : percent > 0
                              ? "bg-[#4965E8]/15 text-[#4965E8]"
                              : "bg-[#64748B]/15 text-[#64748B]"
                          }`}
                        >
                          {percent >= 100 ? "COMPLETED" : "IN_PROGRESS"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick percentage adjustment if selected */}
                  {isSelected && (
                    <div className="mt-2.5 pt-2 border-t border-[#E6EAF2] flex items-center justify-between gap-3">
                      <span className="text-[11px] text-[#64748B]">New Completion:</span>
                      <div className="flex items-center gap-1.5">
                        {[25, 50, 75, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => updateTopicPercentage(topic.id, preset)}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                              percent === preset
                                ? "bg-[#4965E8] text-white font-bold"
                                : "bg-[#E6EAF2] text-[#172033] hover:bg-[#E6EAF2]/80"
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={percent}
                          onChange={(e) =>
                            updateTopicPercentage(topic.id, Number(e.target.value) || 0)
                          }
                          className="w-12 px-1.5 py-0.5 text-xs text-right font-mono border border-[#E6EAF2] rounded bg-white"
                        />
                        <span className="text-[11px] text-[#64748B] font-mono">%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Instructional Deliverables & Classwork/Homework */}
      {deliveryStatus !== "SKIPPED" && deliveryStatus !== "CANCELLED" && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={coveredInputId} className="text-xs font-medium text-[#172033]">
                Covered Material Summary
              </label>
              <Input
                id={coveredInputId}
                value={coveredSummary}
                onChange={(e) => setCoveredSummary(e.target.value)}
                placeholder="Key concepts, proofs or exercises completed..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={leftoverInputId} className="text-xs font-medium text-[#172033]">
                Leftover Material (Optional)
              </label>
              <Input
                id={leftoverInputId}
                value={leftoverSummary}
                onChange={(e) => setLeftoverSummary(e.target.value)}
                placeholder="Topics remaining for next session..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Carry-forward topic selector if leftover material exists */}
          {leftoverSummary.trim().length > 0 && (
            <div className="space-y-1 p-2.5 rounded bg-[#F7F8FC] border border-[#E6EAF2]">
              <label
                htmlFor={carryForwardSelectId}
                className="text-[11px] font-medium text-[#172033] block"
              >
                Select Carry-Forward Topic:
              </label>
              <select
                id={carryForwardSelectId}
                value={carryForwardTopicId}
                onChange={(e) => setCarryForwardTopicId(e.target.value)}
                className="w-full text-xs p-1.5 rounded border border-[#E6EAF2] bg-white focus:border-[#4965E8]"
              >
                <option value="">-- No specific carry-forward topic --</option>
                {syllabusTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.sequence_order}: {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fast Classwork & Homework Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#172033] block">Classwork Status</span>
              <div className="flex rounded-lg border border-[#E6EAF2] p-0.5 bg-[#F7F8FC]">
                {workStatusList.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setClassworkStatus(st)}
                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                      classworkStatus === st
                        ? "bg-white text-[#172033] shadow-xs font-bold"
                        : "text-[#64748B] hover:text-[#172033]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[#172033] block">Homework Status</span>
              <div className="flex rounded-lg border border-[#E6EAF2] p-0.5 bg-[#F7F8FC]">
                {workStatusList.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setHomeworkStatus(st)}
                    className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                      homeworkStatus === st
                        ? "bg-white text-[#172033] shadow-xs font-bold"
                        : "text-[#64748B] hover:text-[#172033]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1">
            <label htmlFor={notesInputId} className="text-xs font-medium text-[#172033]">
              Session Notes (Optional)
            </label>
            <textarea
              id={notesInputId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Student engagement observations, lab issues, or substitute notes..."
              rows={2}
              className="w-full p-2 text-xs rounded-lg border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
            />
          </div>
        </div>
      )}

      {/* Offline Simulation Toggle for Testing Reliability */}
      <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
        <span>Idempotency token: <code className="font-mono text-[10px]">{idempotencyKey.slice(0, 14)}...</code></span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isSimulatingOffline}
            onChange={(e) => setIsSimulatingOffline(e.target.checked)}
            className="rounded text-[#4965E8]"
          />
          <span>Simulate network failure</span>
        </label>
      </div>

      {/* Form Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 pt-3 border-t border-[#E6EAF2]">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <span className="font-mono bg-[#E6EAF2] px-2 py-0.5 rounded text-[11px] text-[#172033]">
            {durationMin} min ({teachingHours}h)
          </span>
          <span>Atomic DB Write • &lt;60s Mobile Flow</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || isSuccess}
            className="flex-1 sm:flex-none min-w-[140px] shadow-sm font-semibold"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Recording...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-white" />
                Session Logged!
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Confirm &amp; Save
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function FacultySessionLogModal({
  isOpen,
  onClose,
  scheduledSession,
  syllabusTopics,
  otherScheduledSessions = [],
  onSaveSession,
}: FacultySessionLogModalProps) {
  if (!isOpen || !scheduledSession) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Teaching Session"
      description={`${scheduledSession.subject_code || "CS201"} • ${scheduledSession.subject_name || "Data Structures"} (${scheduledSession.batch_name || "Batch B"})`}
      maxWidth="lg"
    >
      <InnerSessionLogForm
        key={scheduledSession.id}
        scheduledSession={scheduledSession}
        syllabusTopics={syllabusTopics}
        otherScheduledSessions={otherScheduledSessions}
        onClose={onClose}
        onSaveSession={onSaveSession}
      />
    </Modal>
  );
}
