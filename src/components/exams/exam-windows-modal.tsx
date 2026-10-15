"use client";

import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { DbExamWindow, ExamTypeEnum } from "../../types/database";
import { Award, Plus, Trash2, Layers } from "lucide-react";

export interface ExamWindowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string;
  campusId?: string | null;
  examWindows: DbExamWindow[];
  onAddExamWindow: (data: {
    semester_id: string;
    name: string;
    exam_type: ExamTypeEnum;
    start_date: string;
    end_date: string;
    weightage_percent: number;
    campus_id?: string | null;
    track_id?: string | null;
    batch_id?: string | null;
    subject_id?: string | null;
  }) => void;
  onDeleteExamWindow: (examId: string) => void;
  canManage: boolean;
}

export function ExamWindowsModal({
  isOpen,
  onClose,
  semesterId,
  campusId,
  examWindows,
  onAddExamWindow,
  onDeleteExamWindow,
  canManage,
}: ExamWindowsModalProps) {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [examType, setExamType] = useState<ExamTypeEnum>("SESSIONAL");
  const [startDate, setStartDate] = useState<string>("2026-09-21");
  const [endDate, setEndDate] = useState<string>("2026-09-26");
  const [weightage, setWeightage] = useState<number>(15.0);
  const [trackScope, setTrackScope] = useState<string>("all");
  const [batchScope, setBatchScope] = useState<string>("all");
  const [subjectScope, setSubjectScope] = useState<string>("all");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddExamWindow({
      semester_id: semesterId,
      name: name.trim(),
      exam_type: examType,
      start_date: startDate,
      end_date: endDate,
      weightage_percent: weightage,
      campus_id: campusId || null,
      track_id: trackScope !== "all" ? trackScope : null,
      batch_id: batchScope !== "all" ? batchScope : null,
      subject_id: subjectScope !== "all" ? subjectScope : null,
    });

    setName("");
    setIsAdding(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Exam Windows & Readiness Scopes"
      description="Manage milestone assessments, weightages, and course scopes for sessionals, mid-terms, and finals."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-[#64748B]">
            Total Windows: {examWindows.length} &bull; Combined Weightage:{" "}
            {examWindows.reduce((sum, e) => sum + Number(e.weightage_percent || 0), 0)}%
          </span>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Exam Windows List */}
        <div className="space-y-2">
          {examWindows.map((exam) => (
            <div
              key={exam.id}
              className="p-3.5 rounded-lg border border-[#E6EAF2] bg-white flex items-center justify-between gap-3 hover:border-[#4965E8]/30 transition-subtle"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#B87918]/10 text-[#B87918] flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172033]">{exam.name}</span>
                    <span className="text-[10px] font-semibold text-[#B87918] bg-[#B87918]/10 px-2 py-0.5 rounded">
                      {exam.exam_type}
                    </span>
                    <span className="text-[10px] font-bold text-[#16836B] bg-[#16836B]/10 px-1.5 py-0.5 rounded">
                      {exam.weightage_percent}% Weight
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                    {exam.start_date} → {exam.end_date}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-[#4965E8]" />
                      {exam.track_id ? "Track-Scoped" : "All Tracks"}
                    </span>
                    <span>&bull;</span>
                    <span>{exam.batch_id ? "Cohort-Specific" : "Campus-Wide"}</span>
                  </div>
                </div>
              </div>

              {canManage && (
                <button
                  onClick={() => onDeleteExamWindow(exam.id)}
                  className="p-1.5 text-[#64748B] hover:text-[#C84B58] hover:bg-[#C84B58]/10 rounded-lg transition-subtle"
                  title="Delete Exam Window"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Exam Window Button or Form */}
        {canManage && (
          <div>
            {!isAdding ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Milestone Assessment Window
              </Button>
            ) : (
              <form
                onSubmit={handleAddSubmit}
                className="p-4 rounded-xl border border-[#4965E8]/30 bg-[#F7F8FC] space-y-3"
              >
                <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                  New Exam Window Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Exam Window Name"
                    placeholder="e.g. Sessional 2 / Mid-Term"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <Select
                    label="Exam Category"
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as ExamTypeEnum)}
                    options={[
                      { value: "SESSIONAL", label: "Sessional Exam" },
                      { value: "MID_TERM", label: "Mid-Term Examination" },
                      { value: "PUT", label: "Pre-University Test (PUT)" },
                      { value: "END_TERM", label: "End-Term Finals" },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
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
                  <Input
                    label="Weightage %"
                    type="number"
                    value={weightage}
                    onChange={(e) => setWeightage(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.5}
                    required
                  />
                </div>

                {/* Scopes */}
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    label="Track Scope"
                    value={trackScope}
                    onChange={(e) => setTrackScope(e.target.value)}
                    options={[
                      { value: "all", label: "All Tracks" },
                      { value: "aaaaaaaa-1111-1111-1111-111111111111", label: "Mirai Track" },
                      { value: "aaaaaaaa-2222-2222-2222-222222222222", label: "University Track" },
                    ]}
                  />

                  <Select
                    label="Batch Scope"
                    value={batchScope}
                    onChange={(e) => setBatchScope(e.target.value)}
                    options={[
                      { value: "all", label: "All Cohorts" },
                      { value: "77777777-7777-7777-7777-777777777771", label: "CSE 2026 Sec B" },
                      { value: "77777777-7777-7777-7777-777777777772", label: "CSE 2026 Sec A" },
                    ]}
                  />

                  <Select
                    label="Subject Scope"
                    value={subjectScope}
                    onChange={(e) => setSubjectScope(e.target.value)}
                    options={[
                      { value: "all", label: "All Subjects" },
                      { value: "88888888-8888-8888-8888-888888888881", label: "CS201 (DSA)" },
                      { value: "88888888-8888-8888-8888-888888888882", label: "CS202 (OS)" },
                    ]}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleAddSubmit}>
                    Save Window
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
