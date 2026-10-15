/**
 * Prospectus Academic SaaS - Reusable CSV Import Engine
 * 
 * Provides robust CSV parsing, row-level schema validation, duplicate detection,
 * interactive previewing, and safe transactional batch importing.
 */

import {
  CalendarEventCreateSchema,
  CalendarEventCreateInput,
} from "../../validation/database";
import { DbCalendarEvent } from "../../types/database";

export interface RowValidationError {
  rowNumber: number; // 1-indexed line in file (accounting for header)
  column: string;
  value: string;
  message: string;
}

export interface RowValidationWarning {
  rowNumber: number;
  column: string;
  message: string;
}

export interface ParsedImportRow<T> {
  rowNumber: number;
  raw: Record<string, string>;
  data?: T;
  isValid: boolean;
  isDuplicate: boolean;
  errors: RowValidationError[];
  warnings: RowValidationWarning[];
}

export interface ImportPreviewResult<T> {
  templateType: string;
  totalRows: number;
  validRowCount: number;
  invalidRowCount: number;
  duplicateRowCount: number;
  canCommit: boolean;
  rows: ParsedImportRow<T>[];
  missingHeaders: string[];
}

export interface ImportExecutionReport {
  success: boolean;
  importedCount: number;
  failedCount: number;
  skippedDuplicatesCount: number;
  details: string[];
  recalculatedSessionsCount?: number;
}

/**
 * Standard CSV line parser supporting quoted values with commas
 */
export function parseCsvText(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Helper to split a CSV line respecting quotes
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, index) => {
      rowObj[h] = values[index] !== undefined ? values[index] : "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Validates and previews a batch of Calendar Events before committing.
 * Performs duplicate detection against both existing events and intra-batch rows.
 */
export function previewCalendarEventsImport(
  csvContent: string,
  semesterId: string,
  campusId?: string | null,
  existingEvents: DbCalendarEvent[] = []
): ImportPreviewResult<CalendarEventCreateInput> {
  const { headers, rows } = parseCsvText(csvContent);

  const requiredHeaders = ["title", "start_date", "end_date"];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return {
      templateType: "calendar_events",
      totalRows: rows.length,
      validRowCount: 0,
      invalidRowCount: rows.length,
      duplicateRowCount: 0,
      canCommit: false,
      rows: [],
      missingHeaders,
    };
  }

  const parsedRows: ParsedImportRow<CalendarEventCreateInput>[] = [];
  const seenEventKeys = new Set<string>();

  rows.forEach((rawRow, idx) => {
    const rowNumber = idx + 2; // Line 1 is header, so row 0 is Line 2
    const errors: RowValidationError[] = [];
    const warnings: RowValidationWarning[] = [];

    // Parse booleans
    const isInstructionalRaw = (rawRow["is_instructional"] || "false").toLowerCase().trim();
    const isInstructional = isInstructionalRaw === "true" || isInstructionalRaw === "1" || isInstructionalRaw === "yes";

    const candidate: Record<string, string | boolean | null> = {
      semester_id: semesterId,
      campus_id: campusId || null,
      title: rawRow["title"] || "",
      event_type: (rawRow["event_type"] || "HOLIDAY").toUpperCase().trim(),
      start_date: rawRow["start_date"] || "",
      end_date: rawRow["end_date"] || rawRow["start_date"] || "",
      is_instructional: isInstructional,
      description: rawRow["description"] || null,
      change_reason: rawRow["change_reason"] || "Imported via Calendar CSV Batch",
    };

    // Zod validation
    const result = CalendarEventCreateSchema.safeParse(candidate);

    if (!result.success) {
      result.error.issues.forEach((err) => {
        const colName = err.path.join(".") || "row";
        errors.push({
          rowNumber,
          column: colName,
          value: String(candidate[colName] ?? ""),
          message: err.message,
        });
      });
    }

    // Duplicate detection
    const titleStr = String(candidate.title || "").toLowerCase();
    const startDateStr = String(candidate.start_date || "");
    const endDateStr = String(candidate.end_date || "");
    const eventKey = `${titleStr}_${startDateStr}_${endDateStr}`;
    let isDuplicate = false;

    // 1. Intra-batch duplicate check
    if (seenEventKeys.has(eventKey)) {
      isDuplicate = true;
      warnings.push({
        rowNumber,
        column: "title",
        message: "Duplicate row detected inside the same import file.",
      });
    } else {
      seenEventKeys.add(eventKey);
    }

    // 2. Existing database duplicate check
    const matchesExisting = existingEvents.some(
      (ev) =>
        ev.semester_id === semesterId &&
        ev.title.toLowerCase() === titleStr &&
        ev.start_date === startDateStr
    );

    if (matchesExisting) {
      isDuplicate = true;
      warnings.push({
        rowNumber,
        column: "title",
        message: `An event titled "${titleStr}" on ${startDateStr} already exists in this semester.`,
      });
    }

    parsedRows.push({
      rowNumber,
      raw: rawRow,
      data: result.success ? result.data : undefined,
      isValid: result.success && errors.length === 0,
      isDuplicate,
      errors,
      warnings,
    });
  });

  const validRowCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const invalidRowCount = parsedRows.filter((r) => !r.isValid).length;
  const duplicateRowCount = parsedRows.filter((r) => r.isDuplicate).length;

  return {
    templateType: "calendar_events",
    totalRows: parsedRows.length,
    validRowCount,
    invalidRowCount,
    duplicateRowCount,
    // Can commit if there is at least one valid row and no fatal missing headers
    canCommit: validRowCount > 0,
    rows: parsedRows,
    missingHeaders: [],
  };
}
