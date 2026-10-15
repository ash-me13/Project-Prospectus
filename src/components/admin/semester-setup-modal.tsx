"use client";

import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { SaturdayRuleType, DbSemester } from "../../types/database";
import { Users, CheckCircle2, AlertCircle } from "lucide-react";

export interface SemesterSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSemester: (data: {
    campus_id: string;
    track_id: string;
    name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    saturday_rule: SaturdayRuleType;
    batch_name?: string;
    batch_section?: string;
    student_count?: number;
    is_published?: boolean;
  }) => void;
  existingSemester?: DbSemester | null;
}

export function SemesterSetupModal({
  isOpen,
  onClose,
  onSaveSemester,
  existingSemester,
}: SemesterSetupModalProps) {
  const [campusId, setCampusId] = useState<string>(
    existingSemester?.campus_id || "11111111-1111-1111-1111-111111111111"
  );
  const [trackId, setTrackId] = useState<string>("aaaaaaaa-1111-1111-1111-111111111111");
  const [name, setName] = useState<string>(existingSemester?.name || "Spring Semester 2027");
  const [academicYear, setAcademicYear] = useState<string>(existingSemester?.academic_year || "2026-2027");
  const [startDate, setStartDate] = useState<string>(existingSemester?.start_date || "2027-01-04");
  const [endDate, setEndDate] = useState<string>(existingSemester?.end_date || "2027-05-22");
  const [saturdayRule, setSaturdayRule] = useState<SaturdayRuleType>(
    existingSemester?.saturday_rule || "SECOND_FOURTH"
  );
  const [batchName, setBatchName] = useState<string>("CSE 2027 Sec A");
  const [batchSection, setBatchSection] = useState<string>("A");
  const [studentCount, setStudentCount] = useState<number>(64);
  const [isPublished, setIsPublished] = useState<boolean>(existingSemester?.is_published || false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("Semester name is required");
      return;
    }
    if (startDate >= endDate) {
      setValidationError("Start date must be strictly before end date");
      return;
    }
    setValidationError(null);

    onSaveSemester({
      campus_id: campusId,
      track_id: trackId,
      name,
      academic_year: academicYear,
      start_date: startDate,
      end_date: endDate,
      saturday_rule: saturdayRule,
      batch_name: batchName,
      batch_section: batchSection,
      student_count: studentCount,
      is_published: isPublished,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSemester ? "Edit Academic Semester" : "Create New Academic Semester"}
      description="Configure campus calendar boundaries, Saturday instructional rules, and enrolled batches."
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {existingSemester ? "Update Semester" : "Save & Initialize Calendar"}
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

        {/* Campus & Track Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Campus"
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            options={[
              { value: "11111111-1111-1111-1111-111111111111", label: "HI-Tech Institute (Ghaziabad)" },
              { value: "22222222-2222-2222-2222-222222222222", label: "Ratnam Institute (Bhopal)" },
              { value: "33333333-3333-3333-3333-333333333333", label: "RGIB (Indore)" },
              { value: "44444444-4444-4444-4444-444444444444", label: "JUJ Campus (Jaipur)" },
            ]}
          />

          <Select
            label="Curriculum Stream / Track"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            options={[
              { value: "aaaaaaaa-1111-1111-1111-111111111111", label: "Mirai Track (Industry Immersion)" },
              { value: "aaaaaaaa-2222-2222-2222-222222222222", label: "University Track (Standard Scheme)" },
            ]}
          />
        </div>

        {/* Semester Name & Academic Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Semester Name"
            placeholder="e.g. Fall Semester 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Academic Year"
            placeholder="YYYY-YYYY (e.g. 2026-2027)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            required
          />
        </div>

        {/* Date Boundaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Semester Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="Semester End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Working Saturday Policy */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#172033] tracking-tight">
            Instructional Saturday Rule
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "SECOND_FOURTH", label: "2nd & 4th Sat", desc: "Only 2nd & 4th Saturdays are working" },
              { id: "ALL", label: "All Saturdays", desc: "Every Saturday is a full instructional day" },
              { id: "NONE", label: "No Saturdays", desc: "5-day teaching week (all Saturdays off)" },
            ].map((rule) => {
              const isSelected = saturdayRule === rule.id;
              return (
                <button
                  type="button"
                  key={rule.id}
                  onClick={() => setSaturdayRule(rule.id as SaturdayRuleType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-[#4965E8] bg-[#4965E8]/5 shadow-xs"
                      : "border-[#E6EAF2] hover:bg-[#F7F8FC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172033]">{rule.label}</span>
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#4965E8]" />}
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B] leading-tight">{rule.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#64748B] pt-0.5">
            Note: The 2nd & 4th Saturday rule calculates exact Gregorian dates per calendar month, never an arbitrary 14-day interval.
          </p>
        </div>

        {/* Initial Cohort / Batch Details */}
        {!existingSemester && (
          <div className="p-3.5 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#172033]">
              <Users className="h-4 w-4 text-[#4965E8]" />
              <span>Initial Cohort Batch</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Batch Name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. CSE 2027 Sec A"
              />
              <Input
                label="Section"
                value={batchSection}
                onChange={(e) => setBatchSection(e.target.value)}
                placeholder="A"
              />
              <Input
                label="Student Count"
                type="number"
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                min={1}
                max={200}
              />
            </div>
          </div>
        )}

        {/* Publish Status Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-[#E6EAF2] bg-white">
          <div>
            <span className="text-xs font-bold text-[#172033]">Publish to Faculty & Students</span>
            <p className="text-[11px] text-[#64748B]">
              Published semesters immediately make timetable slots and lesson plan progression visible.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded border-[#E6EAF2] text-[#4965E8] focus:ring-[#4965E8]"
          />
        </div>
      </form>
    </Modal>
  );
}
