import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { SessionStatus } from "@/types/academic";
import { Check, Sparkles } from "lucide-react";
import { isolatedDataStore } from "@/lib/database/service";

export interface LoggedSessionPayload {
  subjectId: string;
  sessionDate: string;
  plannedHours: number;
  actualDurationMinutes: number;
  status: SessionStatus;
  percentComplete: number;
  topicsCovered: string[];
  classworkStatus: "NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED";
  homeworkStatus: "NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED";
  notes?: string;
  loggedAt: string;
}

export interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionLogged: (data: LoggedSessionPayload) => void;
  subjectCode?: string;
  subjectName?: string;
  plannedHours?: number;
}

export function QuickLogModal({
  isOpen,
  onClose,
  onSessionLogged,
  subjectCode = "CS201",
  subjectName = "Data Structures & Algorithms",
  plannedHours = 1.5,
}: QuickLogModalProps) {
  // Pre-filled defaults (enables under 60-second completion)
  const [status, setStatus] = useState<SessionStatus>("COMPLETED");
  const [percentComplete, setPercentComplete] = useState<number>(100);
  const availableTopics = isolatedDataStore.getTopics("88888888-8888-8888-8888-888888888881");
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    availableTopics[0]?.id || ""
  );
  const [actualMinutes, setActualMinutes] = useState<number>(90);
  const [classworkStatus, setClassworkStatus] = useState<"NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED">("ASSIGNED");
  const [homeworkStatus, setHomeworkStatus] = useState<"NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED">("ASSIGNED");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const logEntry = {
      subjectId: "88888888-8888-8888-8888-888888888881",
      sessionDate: new Date().toISOString().split("T")[0],
      plannedHours,
      actualDurationMinutes: actualMinutes,
      status,
      percentComplete,
      topicsCovered: [selectedTopicId],
      classworkStatus,
      homeworkStatus,
      notes,
      loggedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onSessionLogged(logEntry);
      onClose();
    }, 200);
  };

  const statusOptions: Array<{ status: SessionStatus; label: string }> = [
    { status: "COMPLETED", label: "Completed" },
    { status: "IN_PROGRESS", label: "In Progress" },
    { status: "SKIPPED", label: "Skipped" },
    { status: "MERGED", label: "Merged" },
    { status: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid Session Log (<60s Flow)"
      description={`Confirm session delivery for ${subjectCode} • ${subjectName} (${plannedHours}h)`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>Confirm &amp; Log Session</span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Timetable Pre-fill Notice */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#4965E8]/8 border border-[#4965E8]/20 text-xs text-[#172033]">
          <Sparkles className="h-4 w-4 text-[#4965E8] shrink-0" />
          <span>
            Pre-filled from today&apos;s timetable schedule. Confirm or adjust in one tap.
          </span>
        </div>

        {/* 1. Status Selection Pills */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#172033]">
            Delivery Status
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.status}
                type="button"
                onClick={() => {
                  setStatus(opt.status);
                  if (opt.status === "COMPLETED") setPercentComplete(100);
                  if (opt.status === "SKIPPED" || opt.status === "CANCELLED") setPercentComplete(0);
                }}
                className={`py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-subtle cursor-pointer ${
                  status === opt.status
                    ? "bg-[#4965E8] text-white border-[#4965E8] shadow-xs"
                    : "bg-white text-[#64748B] border-[#E6EAF2] hover:text-[#172033] hover:bg-[#F7F8FC]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Topic Covered Selection */}
        <div className="space-y-1.5">
          <Select
            label="Topic Covered (from Unit 1 & 2 Syllabus)"
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            options={availableTopics.map((t) => ({
              value: t.id,
              label: `Seq ${t.sequence_order}: ${t.title} (${t.planned_hours}h)`,
            }))}
          />
        </div>

        {/* 3. Percent Complete Quick Selector (if In Progress) */}
        {status === "IN_PROGRESS" && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#172033]">Topic Completion</span>
              <span className="font-bold text-[#4965E8]">{percentComplete}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 90].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentComplete(pct)}
                  className={`py-1 rounded text-xs font-semibold border transition-subtle cursor-pointer ${
                    percentComplete === pct
                      ? "bg-[#4965E8] text-white border-[#4965E8]"
                      : "bg-white text-[#64748B] border-[#E6EAF2] hover:bg-[#F7F8FC]"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Classwork & Homework Status (Toggle pills) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#172033]">
              Classwork Deliverable
            </label>
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              {(["NONE", "ASSIGNED", "COLLECTED", "REVIEWED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setClassworkStatus(s)}
                  className={`py-1 rounded border text-center transition-subtle cursor-pointer ${
                    classworkStatus === s
                      ? "bg-[#172033] text-white border-[#172033]"
                      : "bg-white text-[#64748B] border-[#E6EAF2]"
                  }`}
                >
                  {s.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#172033]">
              Homework Assignment
            </label>
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              {(["NONE", "ASSIGNED", "COLLECTED", "REVIEWED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setHomeworkStatus(s)}
                  className={`py-1 rounded border text-center transition-subtle cursor-pointer ${
                    homeworkStatus === s
                      ? "bg-[#172033] text-white border-[#172033]"
                      : "bg-white text-[#64748B] border-[#E6EAF2]"
                  }`}
                >
                  {s.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Actual Duration & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Duration (Minutes)"
            type="number"
            min={15}
            max={240}
            value={actualMinutes}
            onChange={(e) => setActualMinutes(Number(e.target.value))}
          />
          <div className="sm:col-span-2">
            <Input
              label="Session Notes (Optional)"
              placeholder="e.g., Doubly linked lists deletion carry forward"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
