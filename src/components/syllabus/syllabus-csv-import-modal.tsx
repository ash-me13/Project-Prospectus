"use client";

import React, { useState, useId } from "react";
import {
  X,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  previewSyllabusImport,
  ImportPreviewResult,
  ParsedSyllabusRowData,
  ImportExecutionReport,
} from "@/lib/import/csv-importer";
import {
  SYLLABUS_LESSON_PLAN_TEMPLATE,
  generateCsvTemplate,
} from "@/lib/import/templates";
import { isolatedDataStore } from "@/lib/database/service";
import { AuthenticatedUser } from "@/auth/authorization";

interface SyllabusCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  currentUser: AuthenticatedUser;
  onImportComplete?: (report: ImportExecutionReport) => void;
}

export function SyllabusCsvImportModal({
  isOpen,
  onClose,
  subjectId,
  currentUser,
  onImportComplete,
}: SyllabusCsvImportModalProps) {
  const [csvContent, setCsvContent] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreviewResult<ParsedSyllabusRowData> | null>(null);
  const [executionReport, setExecutionReport] = useState<ImportExecutionReport | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [step, setStep] = useState<"upload" | "preview" | "report">("upload");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputId = useId();

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const csvString = generateCsvTemplate(SYLLABUS_LESSON_PLAN_TEMPLATE);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", SYLLABUS_LESSON_PLAN_TEMPLATE.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      processPreview(text);
    };
    reader.readAsText(file);
  };

  const processPreview = (text: string) => {
    setErrorMessage(null);
    try {
      const existingTopics = isolatedDataStore.getTopics(subjectId);
      const result = previewSyllabusImport(text, subjectId, existingTopics);
      setPreview(result);
      setStep("preview");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to parse CSV file");
    }
  };

  const handleCommit = () => {
    if (!preview || !preview.canCommit) return;
    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const eligibleRows = preview.rows
        .filter((r) => r.isValid && !r.isDuplicate && r.data)
        .map((r) => r.data!);

      const report = isolatedDataStore.importSyllabusBatch(subjectId, eligibleRows, currentUser);
      setExecutionReport(report);
      setStep("report");
      if (onImportComplete) {
        onImportComplete(report);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Batch import transaction failed");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-[#E6EAF2] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF2] flex items-center justify-between bg-[#F7F8FC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#4965E8]/10 text-[#4965E8]">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172033]">Import Syllabus & Lesson Plan</h3>
              <p className="text-xs text-[#64748B]">
                Upload CSV with units, topic sequence, planned hours, and multi-exam scopes
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-[#C84B58]/10 border border-[#C84B58]/30 rounded-lg flex items-start gap-2.5 text-xs text-[#C84B58]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-4">
              {/* Template Download Card */}
              <div className="p-4 rounded-xl border border-[#E6EAF2] bg-[#F7F8FC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-[#E6EAF2] text-[#4965E8]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#172033]">Standard Syllabus Template</h4>
                    <p className="text-[11px] text-[#64748B]">
                      Includes unit numbers, topic sequences, exact decimal hours, and exam tags.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 text-xs font-semibold text-[#4965E8] bg-white border border-[#4965E8]/30 hover:bg-[#4965E8]/5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-[#E6EAF2] hover:border-[#4965E8]/50 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white transition-colors">
                <Upload className="h-10 w-10 text-[#64748B] mb-2" />
                <h4 className="text-xs font-bold text-[#172033]">Upload Lesson Plan CSV</h4>
                <p className="text-[11px] text-[#64748B] max-w-sm mt-1">
                  Drag and drop your formatted CSV file here, or browse your files.
                </p>
                <label htmlFor={fileInputId} className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#4965E8] hover:bg-[#4965E8]/90 rounded-lg cursor-pointer transition-colors shadow-xs">
                  Browse File
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Direct Paste Fallback */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-[#172033]">Or Paste Raw CSV Data:</label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="unit_number,unit_title,topic_sequence,topic_title,planned_hours,description,learning_objectives,exam_scopes&#10;1,Database Foundations,1,Relational Algebra,2.0,Set operations,Understand relational projections,SESSIONAL;MID_TERM"
                  rows={4}
                  className="w-full p-2.5 text-xs font-mono rounded-lg border border-[#E6EAF2] bg-[#F7F8FC] focus:outline-hidden focus:border-[#4965E8]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!csvContent.trim()}
                    onClick={() => processPreview(csvContent)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4965E8] rounded-lg disabled:opacity-50"
                  >
                    Preview Records
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg border border-[#E6EAF2] bg-[#F7F8FC] text-center">
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">Total Topics</span>
                  <p className="text-base font-bold text-[#172033]">{preview.totalRows}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-[#16836B]/20 bg-[#16836B]/5 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#16836B]">Valid Rows</span>
                  <p className="text-base font-bold text-[#16836B]">{preview.validRowCount}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-[#C84B58]/20 bg-[#C84B58]/5 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#C84B58]">Invalid Rows</span>
                  <p className="text-base font-bold text-[#C84B58]">{preview.invalidRowCount}</p>
                </div>
                <div className="p-2.5 rounded-lg border border-[#B87918]/20 bg-[#B87918]/5 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#B87918]">Duplicates</span>
                  <p className="text-base font-bold text-[#B87918]">{preview.duplicateRowCount}</p>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-[#E6EAF2] rounded-lg overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8FC] border-b border-[#E6EAF2] text-[#64748B]">
                    <tr>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-2">Seq</th>
                      <th className="py-2 px-2">Unit</th>
                      <th className="py-2 px-3">Topic Title</th>
                      <th className="py-2 px-2">Hours</th>
                      <th className="py-2 px-3">Exam Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAF2]">
                    {preview.rows.map((r, i) => (
                      <tr
                        key={i}
                        className={
                          !r.isValid
                            ? "bg-[#C84B58]/5"
                            : r.isDuplicate
                            ? "bg-[#B87918]/5"
                            : "hover:bg-[#F7F8FC]"
                        }
                      >
                        <td className="py-2 px-3">
                          {r.isValid && !r.isDuplicate ? (
                            <span className="text-[10px] font-bold text-[#16836B] flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#C84B58] flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Error
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono text-[#172033]">
                          #{r.data?.topic_sequence || r.raw["topic_sequence"]}
                        </td>
                        <td className="py-2 px-2 text-[#64748B]">
                          Unit {r.data?.unit_number || r.raw["unit_number"]}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#172033]">
                          {r.data?.topic_title || r.raw["topic_title"]}
                        </td>
                        <td className="py-2 px-2 font-mono text-[#4965E8]">
                          {r.data?.planned_hours ?? r.raw["planned_hours"]}h
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {r.data?.exam_scopes.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#8878F5]/10 text-[#8878F5]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-3.5 py-2 text-xs font-medium text-[#64748B] hover:text-[#172033]"
                >
                  ← Back to Upload
                </button>
                <button
                  type="button"
                  disabled={!preview.canCommit || isCommitting}
                  onClick={handleCommit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4965E8] hover:bg-[#4965E8]/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isCommitting ? "Importing & Recalculating..." : `Commit ${preview.validRowCount} Topics`}
                </button>
              </div>
            </div>
          )}

          {step === "report" && executionReport && (
            <div className="space-y-4 py-3 text-center">
              <div className="inline-flex p-3 rounded-full bg-[#16836B]/10 text-[#16836B] mb-1">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-[#172033]">Syllabus Successfully Imported!</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                {executionReport.importedCount} topics imported. The planning engine has immediately recalculated
                expected completion dates based on current timetable slots.
              </p>

              <div className="p-3 bg-[#F7F8FC] border border-[#E6EAF2] rounded-lg text-left text-xs font-mono max-h-40 overflow-y-auto space-y-1">
                {executionReport.details.map((d, idx) => (
                  <p key={idx} className="text-[#172033]">
                    ✓ {d}
                  </p>
                ))}
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#4965E8] rounded-lg hover:bg-[#4965E8]/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
