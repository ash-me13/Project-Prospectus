"use client";

import React, { useState, useId } from "react";
import {
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Building,
  BookOpen,
} from "lucide-react";
import { DbTimetableSlot } from "@/types/database";
import { isolatedDataStore } from "@/lib/database/service";
import { AuthenticatedUser } from "@/auth/authorization";
import { calculateSlotDurationHours } from "@/domain/planning-engine";

interface TimetableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthenticatedUser;
  onSlotSaved?: (slot: DbTimetableSlot) => void;
  initialBatchSubjectId?: string;
}

export function TimetableEditorModal({
  isOpen,
  onClose,
  currentUser,
  onSlotSaved,
  initialBatchSubjectId,
}: TimetableEditorModalProps) {
  const batchSubjects = isolatedDataStore.getBatchSubjects();
  const subjects = isolatedDataStore.getSubjects();
  const batches = isolatedDataStore.getBatches();
  const existingSlots = isolatedDataStore.getTimetableSlots();

  const [batchSubjectId, setBatchSubjectId] = useState<string>(
    initialBatchSubjectId || batchSubjects[0]?.id || ""
  );
  const [facultyId, setFacultyId] = useState<string>(
    "cccccccc-cccc-cccc-cccc-cccccccccccc"
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("09:50");
  const [room, setRoom] = useState<string>("Lecture Hall 101");
  const [effectiveStartDate, setEffectiveStartDate] = useState<string>("");
  const [effectiveEndDate, setEffectiveEndDate] = useState<string>("");
  const [isOverride, setIsOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form IDs for accessibility
  const batchSubjectSelectId = useId();
  const dayOfWeekSelectId = useId();
  const startTimeInputId = useId();
  const endTimeInputId = useId();
  const roomInputId = useId();
  const effectiveStartInputId = useId();
  const effectiveEndInputId = useId();
  const overrideCheckboxId = useId();
  const overrideReasonInputId = useId();

  if (!isOpen) return null;

  // Real-time slot duration calculation
  const calculatedDuration = calculateSlotDurationHours(startTime, endTime);
  const calculatedMinutes = Math.round(calculatedDuration * 60);

  // Real-time conflict preview
  const checkConflicts = () => {
    const selectedBs = batchSubjects.find((bs) => bs.id === batchSubjectId);
    if (!selectedBs) return null;

    // 1. Same batch collision
    const batchConflict = existingSlots.find((s) => {
      const otherBs = batchSubjects.find((bs) => bs.id === s.batch_subject_id);
      if (!otherBs || otherBs.batch_id !== selectedBs.batch_id) return false;
      if (s.day_of_week !== dayOfWeek) return false;
      return startTime < s.end_time && s.start_time < endTime;
    });

    if (batchConflict) {
      return `Batch Conflict: Batch already has a class on this day from ${batchConflict.start_time} to ${batchConflict.end_time} (${batchConflict.room || "No room"}).`;
    }

    // 2. Faculty collision
    const facultyConflict = existingSlots.find((s) => {
      if (s.faculty_id !== facultyId) return false;
      if (s.day_of_week !== dayOfWeek) return false;
      return startTime < s.end_time && s.start_time < endTime;
    });

    if (facultyConflict) {
      return `Faculty Conflict: Assigned faculty is already booked on this day from ${facultyConflict.start_time} to ${facultyConflict.end_time}.`;
    }

    return null;
  };

  const currentConflict = checkConflicts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (currentConflict && !isOverride) {
        throw new Error(currentConflict + " Enable 'Authorized Conflict Override' with reason to proceed.");
      }

      if (isOverride && (!overrideReason || overrideReason.trim().length < 5)) {
        throw new Error("Audit override reason must be at least 5 characters long.");
      }

      const slot = isolatedDataStore.createTimetableSlot(
        {
          batch_subject_id: batchSubjectId,
          faculty_id: facultyId,
          day_of_week: Number(dayOfWeek),
          start_time: startTime,
          end_time: endTime,
          room: room.trim() || null,
          effective_start_date: effectiveStartDate || null,
          effective_end_date: effectiveEndDate || null,
          is_override: isOverride,
          override_reason: isOverride ? overrideReason.trim() : null,
        },
        currentUser
      );

      if (onSlotSaved) {
        onSlotSaved(slot);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create timetable slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF2] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF2] flex items-center justify-between bg-[#F7F8FC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#4965E8]/10 text-[#4965E8]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Configure Weekly Timetable Slot</h3>
              <p className="text-xs text-[#64748B]">
                Define schedule timings, assigned faculty, and conflict overrides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#172033] p-1.5 rounded-md hover:bg-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#C84B58]/10 border border-[#C84B58]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#C84B58]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Conflict Live Warning */}
          {currentConflict && (
            <div className="p-3 bg-[#B87918]/10 border border-[#B87918]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#B87918]">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Schedule Conflict Detected</p>
                <p className="mt-0.5">{currentConflict}</p>
              </div>
            </div>
          )}

          {/* Batch & Subject Selection */}
          <div className="space-y-1.5">
            <label htmlFor={batchSubjectSelectId} className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#64748B]" />
              Batch & Subject Offering
            </label>
            <select
              id={batchSubjectSelectId}
              value={batchSubjectId}
              onChange={(e) => setBatchSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
            >
              {batchSubjects.map((bs) => {
                const sub = subjects.find((s) => s.id === bs.subject_id);
                const bat = batches.find((b) => b.id === bs.batch_id);
                return (
                  <option key={bs.id} value={bs.id}>
                    {bat?.name || "Batch"} — {sub?.code} ({sub?.name})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Day of Week & Faculty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor={dayOfWeekSelectId} className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
                Day of Week
              </label>
              <select
                id={dayOfWeekSelectId}
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday (Conditional)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={roomInputId} className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-[#64748B]" />
                Room / Facility
              </label>
              <input
                id={roomInputId}
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Lab 401, LH-A"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
              />
            </div>
          </div>

          {/* Assigned Faculty */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#172033]">
              Assigned Faculty Member
            </label>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
            >
              <option value="cccccccc-cccc-cccc-cccc-cccccccccccc">Dr. Neha Sharma (Primary Professor)</option>
              <option value="dddddddd-dddd-dddd-dddd-dddddddddddd">Prof. Rahul Verma (Associate Professor)</option>
            </select>
          </div>

          {/* Timings & Duration */}
          <div className="p-3.5 rounded-lg border border-[#E6EAF2] bg-[#F7F8FC]/70 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor={startTimeInputId} className="text-[11px] font-semibold text-[#64748B]">Start Time</label>
                <input
                  id={startTimeInputId}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={endTimeInputId} className="text-[11px] font-semibold text-[#64748B]">End Time</label>
                <input
                  id={endTimeInputId}
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                  required
                />
              </div>
            </div>

            {/* Teaching Hours Precision Indicator */}
            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-white rounded-md border border-[#E6EAF2]">
              <span className="text-[#64748B] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#4965E8]" />
                Derived Teaching Hours:
              </span>
              <span className="font-mono font-bold text-[#172033]">
                {calculatedMinutes} mins ={" "}
                <span className="text-[#4965E8]">{calculatedDuration.toFixed(2)} hrs</span>
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] italic">
              Exact duration calculation applied. A 50-minute session yields 0.83 hours and is not rounded up to 1 hour.
            </p>
          </div>

          {/* Effective Date Range (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={effectiveStartInputId} className="text-[11px] font-semibold text-[#64748B]">Effective Start Date</label>
              <input
                id={effectiveStartInputId}
                type="date"
                value={effectiveStartDate}
                onChange={(e) => setEffectiveStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={effectiveEndInputId} className="text-[11px] font-semibold text-[#64748B]">Effective End Date</label>
              <input
                id={effectiveEndInputId}
                type="date"
                value={effectiveEndDate}
                onChange={(e) => setEffectiveEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
              />
            </div>
          </div>

          {/* Authorized Override Option */}
          <div className="pt-2 border-t border-[#E6EAF2] space-y-2">
            <div className="flex items-center gap-2">
              <input
                id={overrideCheckboxId}
                type="checkbox"
                checked={isOverride}
                onChange={(e) => setIsOverride(e.target.checked)}
                className="rounded border-[#E6EAF2] text-[#4965E8] focus:ring-[#4965E8]"
              />
              <label htmlFor={overrideCheckboxId} className="text-xs font-semibold text-[#172033] cursor-pointer">
                Authorized Timetable Override
              </label>
            </div>

            {isOverride && (
              <div className="space-y-1 animate-in fade-in duration-100">
                <label htmlFor={overrideReasonInputId} className="text-[11px] font-semibold text-[#172033]">
                  Audit Override Reason (Required)
                </label>
                <input
                  id={overrideReasonInputId}
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Special lab split approved by Campus Director"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#B87918]/50 bg-[#B87918]/5 text-[#172033] focus:outline-hidden focus:border-[#B87918]"
                  required
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E6EAF2] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#172033] rounded-lg hover:bg-[#F7F8FC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4965E8] hover:bg-[#4965E8]/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Timetable Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
