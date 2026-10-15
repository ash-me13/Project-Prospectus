"use client";

import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { CalendarEventType } from "../../types/database";
import { AlertCircle, HelpCircle } from "lucide-react";

export interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string;
  campusId?: string | null;
  onSaveEvent: (data: {
    semester_id: string;
    campus_id?: string | null;
    title: string;
    event_type: CalendarEventType;
    start_date: string;
    end_date: string;
    is_instructional: boolean;
    description?: string | null;
    change_reason?: string | null;
  }) => void;
}

export function AddEventModal({
  isOpen,
  onClose,
  semesterId,
  campusId,
  onSaveEvent,
}: AddEventModalProps) {
  const [title, setTitle] = useState<string>("");
  const [eventType, setEventType] = useState<CalendarEventType>("HOLIDAY");
  const [startDate, setStartDate] = useState<string>("2026-10-20");
  const [endDate, setEndDate] = useState<string>("2026-10-20");
  const [isInstructional, setIsInstructional] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [changeReason, setChangeReason] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleEventTypeChange = (newType: CalendarEventType) => {
    setEventType(newType);
    if (newType === "SPECIAL_WORKING_DAY" || newType === "ACADEMIC_EVENT") {
      setIsInstructional(true);
    } else {
      setIsInstructional(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError("Event title is required");
      return;
    }
    if (startDate > endDate) {
      setValidationError("Start date must be on or before end date");
      return;
    }
    if (!changeReason.trim()) {
      setValidationError("An audit change reason is required for tracking calendar adjustments.");
      return;
    }

    setValidationError(null);
    onSaveEvent({
      semester_id: semesterId,
      campus_id: campusId || null,
      title: title.trim(),
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      is_instructional: isInstructional,
      description: description.trim() || null,
      change_reason: changeReason.trim(),
    });

    // Reset fields & close
    setTitle("");
    setDescription("");
    setChangeReason("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Academic Calendar Event"
      description="Record institutional holidays, academic symposiums, cancelled teaching days, or special working days."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save & Recalculate Calendar
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="flex items-center gap-2 p-3 text-xs text-[#C84B58] bg-[#C84B58]/10 rounded-lg border border-[#C84B58]/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <Input
          label="Event Title"
          placeholder="e.g. Dussehra Holiday / Tech Symposium"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Event Type"
            value={eventType}
            onChange={(e) => handleEventTypeChange(e.target.value as CalendarEventType)}
            options={[
              { value: "HOLIDAY", label: "Holiday (Classes Cancelled)" },
              { value: "ACADEMIC_EVENT", label: "Academic Event / Workshop" },
              { value: "SPECIAL_WORKING_DAY", label: "Special Working Day (Compensatory)" },
              { value: "EXAM_PERIOD", label: "Exam Period Window" },
              { value: "CANCELLED_DAY", label: "Cancelled Teaching Date" },
              { value: "BLACKOUT", label: "Institutional Blackout Day" },
            ]}
          />

          <div className="flex items-center justify-between p-3 rounded-lg border border-[#E6EAF2] bg-[#F7F8FC] mt-5">
            <div>
              <span className="text-xs font-bold text-[#172033]">Instructional Day</span>
              <p className="text-[10px] text-[#64748B]">Allows teaching sessions</p>
            </div>
            <input
              type="checkbox"
              checked={isInstructional}
              onChange={(e) => setIsInstructional(e.target.checked)}
              className="h-4 w-4 rounded border-[#E6EAF2] text-[#4965E8] focus:ring-[#4965E8]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Description / Scope"
          placeholder="Additional administrative notes or department scope"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Mandatory Consequential Change Reason */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#172033]">
              Audit Change Reason <span className="text-[#C84B58]">*</span>
            </label>
            <span className="text-[10px] text-[#64748B]">Mandatory for audit trail</span>
          </div>
          <Input
            placeholder="e.g. State government declared holiday; shifted lab occurrences"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            required
          />
          <p className="text-[10px] text-[#64748B] flex items-center gap-1">
            <HelpCircle className="h-3 w-3 shrink-0 text-[#4965E8]" />
            Any holiday or calendar change will safely recompute dependent scheduled sessions without deleting historical logs.
          </p>
        </div>
      </form>
    </Modal>
  );
}
