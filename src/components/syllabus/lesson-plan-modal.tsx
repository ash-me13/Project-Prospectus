"use client";

import React, { useState, useId } from "react";
import {
  X,
  BookOpen,
  Plus,
  Upload,
  Calendar,
  AlertTriangle,
  Award,
  Sparkles,
} from "lucide-react";
import { ExamTypeEnum } from "@/types/database";
import { isolatedDataStore } from "@/lib/database/service";
import { AuthenticatedUser } from "@/auth/authorization";
import { SyllabusCsvImportModal } from "./syllabus-csv-import-modal";

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  currentUser: AuthenticatedUser;
  onPlanUpdated?: () => void;
}

export function LessonPlanModal({
  isOpen,
  onClose,
  subjectId,
  currentUser,
  onPlanUpdated,
}: LessonPlanModalProps) {
  const subjects = isolatedDataStore.getSubjects();
  const subject = subjects.find((s) => s.id === subjectId) || subjects[0];
  const units = isolatedDataStore.getSyllabusUnits(subject.id);
  const topicsWithScopes = isolatedDataStore.getTopicsWithExamScopes(subject.id);

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showCsvImport, setShowCsvImport] = useState<boolean>(false);

  // New Topic Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || "");
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [sequenceOrder, setSequenceOrder] = useState<number>(
    topicsWithScopes.length > 0
      ? Math.max(...topicsWithScopes.map((t) => t.sequence_order)) + 1
      : 1
  );
  const [plannedHours, setPlannedHours] = useState<number>(2.0);
  const [learningObjectives, setLearningObjectives] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedExams, setSelectedExams] = useState<ExamTypeEnum[]>([
    "SESSIONAL",
    "MID_TERM",
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form IDs for accessibility
  const unitSelectId = useId();
  const titleInputId = useId();
  const seqInputId = useId();
  const hoursInputId = useId();
  const descInputId = useId();
  const objInputId = useId();

  if (!isOpen) return null;

  const allExamTypes: Array<{ type: ExamTypeEnum; label: string; color: string }> = [
    { type: "SESSIONAL", label: "Sessional", color: "bg-[#4965E8]/10 text-[#4965E8]" },
    { type: "MID_TERM", label: "Mid-Term", color: "bg-[#16836B]/10 text-[#16836B]" },
    { type: "PUT", label: "PUT", color: "bg-[#B87918]/10 text-[#B87918]" },
    { type: "END_TERM", label: "End-Term", color: "bg-[#C84B58]/10 text-[#C84B58]" },
  ];

  const toggleExamScope = (type: ExamTypeEnum) => {
    if (selectedExams.includes(type)) {
      setSelectedExams(selectedExams.filter((e) => e !== type));
    } else {
      setSelectedExams([...selectedExams, type]);
    }
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      isolatedDataStore.createSyllabusTopic(
        {
          unit_id: selectedUnitId || units[0]?.id,
          subject_id: subject.id,
          sequence_order: Number(sequenceOrder),
          title: topicTitle.trim(),
          planned_hours: Number(plannedHours),
          description: description.trim() || undefined,
          learning_objectives: learningObjectives.trim() || undefined,
          exam_scopes: selectedExams,
        },
        currentUser
      );

      // Reset form
      setTopicTitle("");
      setSequenceOrder(sequenceOrder + 1);
      setLearningObjectives("");
      setDescription("");
      setShowAddForm(false);
      if (onPlanUpdated) onPlanUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add topic");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF2] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF2] flex items-center justify-between bg-[#F7F8FC]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#4965E8]/10 text-[#4965E8]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#4965E8] bg-[#4965E8]/10 px-1.5 py-0.5 rounded">
                  {subject.code}
                </span>
                <h3 className="text-sm font-bold text-[#172033]">{subject.name}</h3>
              </div>
              <p className="text-xs text-[#64748B]">
                Syllabus structure, topic sequences, and multi-exam milestones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsvImport(true)}
              className="px-3 py-1.5 text-xs font-semibold text-[#4965E8] bg-white border border-[#4965E8]/30 hover:bg-[#4965E8]/5 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4965E8] hover:bg-[#4965E8]/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Topic
            </button>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#172033] p-1.5 rounded-md hover:bg-white transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-[#C84B58]/10 border border-[#C84B58]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#C84B58]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add Topic Inline Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddTopic}
              className="p-4 rounded-xl border border-[#4965E8]/30 bg-[#F7F8FC] space-y-3 animate-in fade-in duration-100"
            >
              <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-2">
                <span className="text-xs font-bold text-[#172033] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#4965E8]" />
                  Add New Syllabus Topic
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-[#64748B] hover:text-[#172033]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor={unitSelectId} className="text-[11px] font-semibold text-[#64748B]">Syllabus Unit</label>
                  <select
                    id={unitSelectId}
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor={seqInputId} className="text-[11px] font-semibold text-[#64748B]">Sequence Order</label>
                  <input
                    id={seqInputId}
                    type="number"
                    min={1}
                    value={sequenceOrder}
                    onChange={(e) => setSequenceOrder(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={hoursInputId} className="text-[11px] font-semibold text-[#64748B]">Planned Hours</label>
                  <input
                    id={hoursInputId}
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={plannedHours}
                    onChange={(e) => setPlannedHours(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={titleInputId} className="text-[11px] font-semibold text-[#64748B]">Topic Title</label>
                <input
                  id={titleInputId}
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Asymptotic Bounds & Recurrence Relations"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor={descInputId} className="text-[11px] font-semibold text-[#64748B]">Description (Optional)</label>
                  <input
                    id={descInputId}
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief concept coverage summary"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={objInputId} className="text-[11px] font-semibold text-[#64748B]">Learning Objectives (Optional)</label>
                  <input
                    id={objInputId}
                    type="text"
                    value={learningObjectives}
                    onChange={(e) => setLearningObjectives(e.target.value)}
                    placeholder="Outcome expected upon completion"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E6EAF2] bg-white focus:outline-hidden focus:border-[#4965E8]"
                  />
                </div>
              </div>

              {/* Multi-Exam Scope Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-[#8878F5]" />
                  Applicable Exam Scope (Topic may be tested in multiple exams):
                </label>
                <div className="flex flex-wrap gap-2">
                  {allExamTypes.map((exam) => {
                    const isChecked = selectedExams.includes(exam.type);
                    return (
                      <button
                        key={exam.type}
                        type="button"
                        onClick={() => toggleExamScope(exam.type)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          isChecked
                            ? "bg-[#4965E8] text-white border-[#4965E8]"
                            : "bg-white text-[#64748B] border-[#E6EAF2] hover:border-[#4965E8]/40"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isChecked ? "bg-white" : "bg-[#64748B]"
                          }`}
                        />
                        {exam.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4965E8] rounded-lg hover:bg-[#4965E8]/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Save Topic"}
                </button>
              </div>
            </form>
          )}

          {/* Unit & Topic Sequence View */}
          <div className="space-y-4">
            {units.map((unit) => {
              const unitTopics = topicsWithScopes.filter((t) => t.unit_id === unit.id);

              return (
                <div
                  key={unit.id}
                  className="rounded-xl border border-[#E6EAF2] bg-white overflow-hidden shadow-2xs"
                >
                  {/* Unit Header */}
                  <div className="px-4 py-3 bg-[#F7F8FC] border-b border-[#E6EAF2] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#172033]/5 text-[#172033]">
                        Unit {unit.unit_number}
                      </span>
                      <h4 className="text-xs font-bold text-[#172033]">{unit.title}</h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {unitTopics.reduce((s, t) => s + t.planned_hours, 0).toFixed(1)} / {unit.planned_hours} hrs
                    </span>
                  </div>

                  {/* Topic Items */}
                  <div className="divide-y divide-[#E6EAF2]">
                    {unitTopics.length > 0 ? (
                      unitTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="p-3.5 hover:bg-[#F7F8FC]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-[#64748B] bg-[#F7F8FC] px-1.5 py-0.5 rounded border border-[#E6EAF2]">
                                #{topic.sequence_order}
                              </span>
                              <span className="text-xs font-semibold text-[#172033]">
                                {topic.title}
                              </span>
                            </div>

                            {topic.learning_objectives && (
                              <p className="text-[11px] text-[#64748B] pl-7 line-clamp-1">
                                <span className="font-medium text-[#172033]">Objective:</span>{" "}
                                {topic.learning_objectives}
                              </p>
                            )}

                            {/* Exam Scope Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 pl-7 pt-0.5">
                              {topic.examScopes.length > 0 ? (
                                topic.examScopes.map((scope) => (
                                  <span
                                    key={scope}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#8878F5]/10 text-[#8878F5]"
                                  >
                                    {scope.replace("_", " ")}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-[#64748B] italic">
                                  No exam scope tagged
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Planned Hours & Expected Date */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E6EAF2]">
                            <span className="text-xs font-mono font-bold text-[#4965E8]">
                              {topic.planned_hours.toFixed(1)} hrs
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-mono">
                              <Calendar className="h-3 w-3 text-[#16836B]" />
                              {topic.planned_date ? (
                                <span className="text-[#16836B] font-medium">
                                  Est. {topic.planned_date}
                                </span>
                              ) : (
                                <span className="text-[#64748B] italic">Unscheduled</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-[#64748B]">
                        No topics added to this unit yet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CSV Import Modal Child */}
      <SyllabusCsvImportModal
        isOpen={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        subjectId={subject.id}
        currentUser={currentUser}
        onImportComplete={() => {
          if (onPlanUpdated) onPlanUpdated();
        }}
      />
    </div>
  );
}
