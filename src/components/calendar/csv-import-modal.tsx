"use client";

import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import {
  CALENDAR_EVENTS_TEMPLATE,
  generateCsvTemplate,
} from "../../lib/import/templates";
import {
  previewCalendarEventsImport,
  ImportPreviewResult,
  ImportExecutionReport,
} from "../../lib/import/csv-importer";
import { CalendarEventCreateInput } from "../../validation/database";
import { DbCalendarEvent } from "../../types/database";
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

export interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string;
  campusId?: string | null;
  existingEvents: DbCalendarEvent[];
  onExecuteImport: (
    preview: ImportPreviewResult<CalendarEventCreateInput>,
    skipDuplicates: boolean
  ) => ImportExecutionReport;
}

export function CsvImportModal({
  isOpen,
  onClose,
  semesterId,
  campusId,
  existingEvents,
  onExecuteImport,
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreviewResult<CalendarEventCreateInput> | null>(null);
  const [filterView, setFilterView] = useState<"ALL" | "VALID" | "INVALID" | "DUPLICATES">("ALL");
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [executionReport, setExecutionReport] = useState<ImportExecutionReport | null>(null);

  // Template download handler
  const handleDownloadTemplate = () => {
    const content = generateCsvTemplate(CALENDAR_EVENTS_TEMPLATE);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", CALENDAR_EVENTS_TEMPLATE.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // File upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
        runPreview(text);
      }
    };
    reader.readAsText(file);
  };

  // Run preview validation
  const runPreview = (text: string) => {
    const result = previewCalendarEventsImport(
      text,
      semesterId,
      campusId,
      existingEvents
    );
    setPreview(result);
    setExecutionReport(null);
  };

  const handleCommit = () => {
    if (!preview || !preview.canCommit) return;
    const report = onExecuteImport(preview, skipDuplicates);
    setExecutionReport(report);
  };

  const handleReset = () => {
    setCsvText("");
    setPreview(null);
    setExecutionReport(null);
  };

  const displayedRows = preview?.rows.filter((r) => {
    if (filterView === "VALID") return r.isValid && !r.isDuplicate;
    if (filterView === "INVALID") return !r.isValid;
    if (filterView === "DUPLICATES") return r.isDuplicate;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Calendar CSV Import"
      description="Upload, validate, and atomically commit academic events and holidays with duplicate detection."
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            Download Sample CSV Template
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              {executionReport ? "Close" : "Cancel"}
            </Button>
            {!executionReport && preview && (
              <Button
                variant="primary"
                onClick={handleCommit}
                disabled={!preview.canCommit}
              >
                Commit Batch ({preview.validRowCount} Valid Events)
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Step 1: Upload or Paste if not previewed */}
        {!preview && (
          <div className="space-y-4">
            <div className="p-6 rounded-xl border-2 border-dashed border-[#E6EAF2] hover:border-[#4965E8] bg-[#F7F8FC] text-center transition-all">
              <Upload className="h-8 w-8 mx-auto text-[#4965E8] mb-2" />
              <p className="text-sm font-semibold text-[#172033]">
                Upload CSV or Excel-exported text file
              </p>
              <p className="text-xs text-[#64748B] mt-1 mb-3">
                Include columns: <code>title, event_type, start_date, end_date, is_instructional, description</code>
              </p>
              <label className="inline-block cursor-pointer">
                <span className="px-4 py-2 rounded-lg bg-[#4965E8] text-white text-xs font-semibold hover:bg-[#3D56D5] transition-subtle">
                  Browse File
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#172033]">
                Or Paste CSV Content Directly
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="title,event_type,start_date,end_date,is_instructional,description&#10;Diwali Break,HOLIDAY,2026-11-08,2026-11-11,false,Festival Break"
                rows={6}
                className="w-full p-3 font-mono text-xs rounded-lg border border-[#E6EAF2] focus:outline-none focus:border-[#4965E8] bg-white text-[#172033]"
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => runPreview(csvText)}
                  disabled={!csvText.trim()}
                >
                  Parse & Preview Records
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Execution Report View */}
        {executionReport && (
          <div className="p-4 rounded-xl bg-[#16836B]/5 border border-[#16836B]/20 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#16836B]" />
              <h4 className="text-sm font-bold text-[#172033]">
                Batch Import Completed Successfully
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white rounded-lg border border-[#E6EAF2]">
                <span className="text-lg font-extrabold text-[#16836B]">
                  {executionReport.importedCount}
                </span>
                <p className="text-[11px] text-[#64748B]">Events Imported</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E6EAF2]">
                <span className="text-lg font-extrabold text-[#B87918]">
                  {executionReport.skippedDuplicatesCount}
                </span>
                <p className="text-[11px] text-[#64748B]">Duplicates Skipped</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E6EAF2]">
                <span className="text-lg font-extrabold text-[#4965E8]">
                  {executionReport.recalculatedSessionsCount ?? 0}
                </span>
                <p className="text-[11px] text-[#64748B]">Sessions Realigned</p>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-[#64748B]">
              {executionReport.details.map((detail, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16836B]" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Interactive Preview Table */}
        {preview && !executionReport && (
          <div className="space-y-3">
            {/* Summary Statistics Cards */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFilterView("ALL")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    filterView === "ALL"
                      ? "bg-[#172033] text-white border-[#172033]"
                      : "bg-white text-[#64748B] border-[#E6EAF2]"
                  }`}
                >
                  All ({preview.totalRows})
                </button>
                <button
                  onClick={() => setFilterView("VALID")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    filterView === "VALID"
                      ? "bg-[#16836B] text-white border-[#16836B]"
                      : "bg-white text-[#16836B] border-[#16836B]/30"
                  }`}
                >
                  Valid ({preview.validRowCount})
                </button>
                {preview.invalidRowCount > 0 && (
                  <button
                    onClick={() => setFilterView("INVALID")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      filterView === "INVALID"
                        ? "bg-[#C84B58] text-white border-[#C84B58]"
                        : "bg-white text-[#C84B58] border-[#C84B58]/30"
                    }`}
                  >
                    Errors ({preview.invalidRowCount})
                  </button>
                )}
                {preview.duplicateRowCount > 0 && (
                  <button
                    onClick={() => setFilterView("DUPLICATES")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      filterView === "DUPLICATES"
                        ? "bg-[#B87918] text-white border-[#B87918]"
                        : "bg-white text-[#B87918] border-[#B87918]/30"
                    }`}
                  >
                    Duplicates ({preview.duplicateRowCount})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[#64748B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#E6EAF2] text-[#4965E8]"
                  />
                  <span>Skip existing duplicates</span>
                </label>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCw className="h-3 w-3" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Error alert if missing headers */}
            {preview.missingHeaders.length > 0 && (
              <div className="p-3 text-xs text-[#C84B58] bg-[#C84B58]/10 rounded-lg border border-[#C84B58]/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Missing required headers: <code>{preview.missingHeaders.join(", ")}</code>
                </span>
              </div>
            )}

            {/* Preview Table */}
            <div className="border border-[#E6EAF2] rounded-lg overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] border-b border-[#E6EAF2] text-[#64748B] sticky top-0">
                  <tr>
                    <th className="p-2 font-semibold">Row</th>
                    <th className="p-2 font-semibold">Status</th>
                    <th className="p-2 font-semibold">Title</th>
                    <th className="p-2 font-semibold">Type</th>
                    <th className="p-2 font-semibold">Dates</th>
                    <th className="p-2 font-semibold">Instructional</th>
                    <th className="p-2 font-semibold">Notes / Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF2]">
                  {displayedRows?.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={
                        !row.isValid
                          ? "bg-[#C84B58]/5"
                          : row.isDuplicate
                          ? "bg-[#B87918]/5"
                          : "hover:bg-[#F7F8FC]"
                      }
                    >
                      <td className="p-2 font-mono text-[#64748B]">#{row.rowNumber}</td>
                      <td className="p-2">
                        {!row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C84B58] bg-[#C84B58]/10 px-1.5 py-0.5 rounded">
                            <AlertCircle className="h-3 w-3" /> Error
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B87918] bg-[#B87918]/10 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" /> Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16836B] bg-[#16836B]/10 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Ready
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-semibold text-[#172033]">
                        {row.raw.title || "—"}
                      </td>
                      <td className="p-2 font-mono text-[11px]">
                        {row.raw.event_type || "HOLIDAY"}
                      </td>
                      <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                        {row.raw.start_date} → {row.raw.end_date || row.raw.start_date}
                      </td>
                      <td className="p-2 font-mono">
                        {row.raw.is_instructional === "true" ? "Yes" : "No"}
                      </td>
                      <td className="p-2 text-[11px]">
                        {row.errors.map((e, idx) => (
                          <div key={idx} className="text-[#C84B58] font-medium">
                            {e.column}: {e.message}
                          </div>
                        ))}
                        {row.warnings.map((w, idx) => (
                          <div key={idx} className="text-[#B87918]">
                            {w.message}
                          </div>
                        ))}
                        {row.isValid && !row.isDuplicate && (
                          <span className="text-[#64748B]">Valid record</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-[#64748B]">
              Transactional Guarantee: If any row fails validation, partial imports are safely blocked unless you choose to skip duplicates and invalid rows.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
