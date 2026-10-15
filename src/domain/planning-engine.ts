/**
 * Prospectus Academic SaaS - Reusable Planning Engine
 * 
 * Features:
 * - Timetable slot conflict detection (batch and faculty conflicts) with authorized overrides.
 * - Exact duration calculation (e.g. 50-minute session = 0.8333 hrs, never 1 hr).
 * - Conversion of weekly timetable slots to dated teaching occurrences.
 * - Accurate instructional day filtering (Gregorian 2nd/4th Saturdays, holidays, overrides).
 * - Chronological topic instructional hour allocation.
 * - Dynamic topic expected completion date calculation and recalculation.
 */

import {
  SaturdayRuleType,
  DbCalendarEvent,
  DbTimetableSlot,
  DbSyllabusTopic,
  DbTopicExamScope,
  ExamTypeEnum,
} from "../types/database";
import { isDateInstructional, parseDateParts, formatDateToIso } from "./calendar-engine";

export interface SlotConflict {
  type: "BATCH_OVERLAP" | "FACULTY_CONFLICT";
  message: string;
  conflictingSlot: DbTimetableSlot;
}

export interface TimetableValidationResult {
  isValid: boolean;
  hasOverride: boolean;
  conflicts: SlotConflict[];
}

export interface PlannedOccurrence {
  occurrenceId: string;
  slotId: string;
  batchSubjectId: string;
  facultyId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 1=Mon, ..., 6=Sat
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationHours: number;
}

export interface TopicContributingSession {
  date: string;
  startTime: string;
  endTime: string;
  hoursContributed: number;
}

export interface TopicPlanSchedule {
  topicId: string;
  unitId: string;
  sequenceOrder: number;
  title: string;
  plannedHours: number;
  startDate?: string;
  expectedCompletionDate?: string;
  sessionCount: number;
  allocatedHours: number;
  isFullyScheduled: boolean;
  examScopes: ExamTypeEnum[];
  contributingSessions: TopicContributingSession[];
}

/**
 * Calculates slot duration in decimal hours from start and end times (HH:MM or HH:MM:SS).
 * A 50-minute session yields 50/60 = 0.8333 hours; never rounded to 1 hour.
 */
export function calculateSlotDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    return 0;
  }

  const durationMinutes = endMinutes - startMinutes;
  // Return precise hours rounded to 4 decimals for high-fidelity calculations
  return Math.round((durationMinutes / 60) * 10000) / 10000;
}

/**
 * Checks whether two time intervals [startA, endA) and [startB, endB) overlap.
 */
export function doTimesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Checks whether two effective date ranges [startA, endA] and [startB, endB] overlap.
 * Unspecified (null/undefined) bounds mean the slot applies indefinitely.
 */
export function doDateRangesOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null
): boolean {
  const effectiveEndA = endA || "9999-12-31";
  const effectiveStartA = startA || "0000-01-01";
  const effectiveEndB = endB || "9999-12-31";
  const effectiveStartB = startB || "0000-01-01";

  return effectiveStartA <= effectiveEndB && effectiveStartB <= effectiveEndA;
}

/**
 * Validates a candidate timetable slot against existing slots for:
 * 1. Batch overlap on the same day and overlapping effective range.
 * 2. Faculty conflict on the same day and overlapping effective range.
 * 
 * If conflicts exist, permits explicit authorized overrides if is_override is true
 * with an audit trail reason of at least 5 characters.
 */
export function validateTimetableSlotConflicts(
  candidateSlot: {
    id?: string;
    batch_subject_id: string;
    faculty_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    effective_start_date?: string | null;
    effective_end_date?: string | null;
    is_override?: boolean;
    override_reason?: string | null;
  },
  existingSlots: DbTimetableSlot[],
  batchMapping?: Map<string, string> // batch_subject_id -> batch_id
): TimetableValidationResult {
  const conflicts: SlotConflict[] = [];

  for (const existing of existingSlots) {
    // Skip comparing against self when updating
    if (candidateSlot.id && existing.id === candidateSlot.id) {
      continue;
    }

    // Must be on the same day of week
    if (existing.day_of_week !== candidateSlot.day_of_week) {
      continue;
    }

    // Must overlap in time
    if (!doTimesOverlap(candidateSlot.start_time, candidateSlot.end_time, existing.start_time, existing.end_time)) {
      continue;
    }

    // Must overlap in effective date range
    if (!doDateRangesOverlap(
      candidateSlot.effective_start_date,
      candidateSlot.effective_end_date,
      existing.effective_start_date,
      existing.effective_end_date
    )) {
      continue;
    }

    // 1. Batch Overlap Check
    const candidateBatchId = batchMapping ? batchMapping.get(candidateSlot.batch_subject_id) : candidateSlot.batch_subject_id;
    const existingBatchId = batchMapping ? batchMapping.get(existing.batch_subject_id) : existing.batch_subject_id;

    if (candidateBatchId && existingBatchId && candidateBatchId === existingBatchId) {
      conflicts.push({
        type: "BATCH_OVERLAP",
        message: `Batch is already scheduled for another subject on Day ${existing.day_of_week} between ${existing.start_time} and ${existing.end_time}.`,
        conflictingSlot: existing,
      });
    }

    // 2. Faculty Conflict Check
    if (existing.faculty_id === candidateSlot.faculty_id) {
      conflicts.push({
        type: "FACULTY_CONFLICT",
        message: `Faculty is already booked for another session on Day ${existing.day_of_week} between ${existing.start_time} and ${existing.end_time}.`,
        conflictingSlot: existing,
      });
    }
  }

  const hasOverride = Boolean(
    candidateSlot.is_override &&
    candidateSlot.override_reason &&
    candidateSlot.override_reason.trim().length >= 5
  );

  return {
    isValid: conflicts.length === 0 || hasOverride,
    hasOverride,
    conflicts,
  };
}

/**
 * Generates chronologically sorted teaching occurrences by walking the semester calendar
 * and expanding active timetable slots.
 * 
 * Rules:
 * - Excludes dates outside [semester.start_date, semester.end_date].
 * - Excludes holidays, blackout periods, and non-instructional Saturdays.
 * - Honors special working days and timetable overrides.
 * - Never silently double-counts overlapping slots on the same date/time.
 */
export function generateDatedOccurrences(
  semester: {
    startDate: string;
    endDate: string;
    saturdayRule: SaturdayRuleType;
  },
  timetableSlots: DbTimetableSlot[],
  calendarEvents: DbCalendarEvent[] = []
): PlannedOccurrence[] {
  const occurrences: PlannedOccurrence[] = [];

  const { year: sy, month: sm, day: sd } = parseDateParts(semester.startDate);
  const { year: ey, month: em, day: ed } = parseDateParts(semester.endDate);

  const startUtc = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const endUtc = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  const curr = new Date(startUtc);

  while (curr.getTime() <= endUtc.getTime()) {
    const dateStr = formatDateToIso(curr);
    const dayStatus = isDateInstructional(dateStr, semester.saturdayRule, calendarEvents);

    if (dayStatus.isInstructional) {
      // Find matching slots for this day of week (1=Monday, ..., 6=Saturday)
      // JS getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat
      const calendarDayOfWeek = curr.getUTCDay();

      // Collect matching slots
      const matchingSlots = timetableSlots.filter((slot) => {
        if (slot.day_of_week !== calendarDayOfWeek) return false;
        // Check effective date range
        if (slot.effective_start_date && dateStr < slot.effective_start_date) return false;
        if (slot.effective_end_date && dateStr > slot.effective_end_date) return false;
        return true;
      });

      // Sort slots by start_time
      matchingSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Avoid double-counting overlapping slots
      const scheduledIntervals: Array<{ start: string; end: string }> = [];

      for (const slot of matchingSlots) {
        const overlapsExisting = scheduledIntervals.some((interval) =>
          doTimesOverlap(slot.start_time, slot.end_time, interval.start, interval.end)
        );

        if (!overlapsExisting) {
          scheduledIntervals.push({ start: slot.start_time, end: slot.end_time });

          const durationHours = slot.duration_hours > 0
            ? slot.duration_hours
            : calculateSlotDurationHours(slot.start_time, slot.end_time);

          occurrences.push({
            occurrenceId: `occ-${dateStr}-${slot.id}`,
            slotId: slot.id,
            batchSubjectId: slot.batch_subject_id,
            facultyId: slot.faculty_id,
            date: dateStr,
            dayOfWeek: calendarDayOfWeek,
            startTime: slot.start_time,
            endTime: slot.end_time,
            durationHours,
          });
        }
      }
    }

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  // Sort occurrences chronologically
  occurrences.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.startTime.localeCompare(b.startTime);
  });

  return occurrences;
}

/**
 * Allocates planned instructional hours chronologically across ordered syllabus topics.
 * Computes:
 * - Each topic's start date
 * - Each topic's expected completion date (when cumulative scheduled hours cover planned hours)
 * - Number of sessions required
 * - Multi-session topics and multi-week spans
 * - Associated exam scopes
 */
export function allocateTopicCompletionDates(
  topics: DbSyllabusTopic[],
  occurrences: PlannedOccurrence[],
  examScopes: DbTopicExamScope[] = []
): TopicPlanSchedule[] {
  // Sort topics strictly by sequence_order
  const sortedTopics = [...topics].sort((a, b) => a.sequence_order - b.sequence_order);

  // Index exam scopes by topic_id
  const scopeMap = new Map<string, ExamTypeEnum[]>();
  for (const scope of examScopes) {
    const list = scopeMap.get(scope.topic_id) || [];
    if (!list.includes(scope.exam_type)) {
      list.push(scope.exam_type);
    }
    scopeMap.set(scope.topic_id, list);
  }

  const result: TopicPlanSchedule[] = [];

  let occurrenceIndex = 0;
  let occurrenceRemainingHours = occurrences.length > 0 ? occurrences[0].durationHours : 0;

  for (const topic of sortedTopics) {
    const topicFlexible = topic as unknown as { planned_hours?: number; plannedHours?: number };
    const plannedHours = topicFlexible.planned_hours ?? topicFlexible.plannedHours ?? 0;
    let hoursNeeded = plannedHours;
    let startDate: string | undefined = undefined;
    let completionDate: string | undefined = undefined;
    let allocatedHours = 0;
    const contributingSessions: TopicContributingSession[] = [];

    // Walk through occurrences until topic planned hours are satisfied
    while (hoursNeeded > 0.0001 && occurrenceIndex < occurrences.length) {
      const currentOcc = occurrences[occurrenceIndex];

      if (!startDate) {
        startDate = currentOcc.date;
      }

      const hoursToTake = Math.min(hoursNeeded, occurrenceRemainingHours);
      const roundedHoursTaken = Math.round(hoursToTake * 10000) / 10000;

      contributingSessions.push({
        date: currentOcc.date,
        startTime: currentOcc.startTime,
        endTime: currentOcc.endTime,
        hoursContributed: roundedHoursTaken,
      });

      hoursNeeded -= hoursToTake;
      allocatedHours += hoursToTake;
      occurrenceRemainingHours -= hoursToTake;

      // Check if topic is fulfilled
      if (hoursNeeded <= 0.0001) {
        completionDate = currentOcc.date;
      }

      // Check if current occurrence is exhausted
      if (occurrenceRemainingHours <= 0.0001) {
        occurrenceIndex++;
        if (occurrenceIndex < occurrences.length) {
          occurrenceRemainingHours = occurrences[occurrenceIndex].durationHours;
        }
      }
    }

    result.push({
      topicId: topic.id,
      unitId: topic.unit_id,
      sequenceOrder: topic.sequence_order,
      title: topic.title,
      plannedHours,
      startDate,
      expectedCompletionDate: completionDate,
      sessionCount: contributingSessions.length,
      allocatedHours: Math.round(allocatedHours * 100) / 100,
      isFullyScheduled: hoursNeeded <= 0.0001,
      examScopes: scopeMap.get(topic.id) || [],
      contributingSessions,
    });
  }

  return result;
}

/**
 * Reusable full pipeline: Converts timetable slots + calendar into dates and allocates topics.
 * Returns an updated map of topic ID -> expected completion date (YYYY-MM-DD).
 */
export function planSyllabusTopicDates(
  semester: {
    startDate: string;
    endDate: string;
    saturdayRule: SaturdayRuleType;
  },
  timetableSlots: DbTimetableSlot[],
  topics: DbSyllabusTopic[],
  calendarEvents: DbCalendarEvent[] = [],
  examScopes: DbTopicExamScope[] = []
): {
  occurrences: PlannedOccurrence[];
  schedules: TopicPlanSchedule[];
  topicPlannedDates: Map<string, string | null>;
} {
  const occurrences = generateDatedOccurrences(semester, timetableSlots, calendarEvents);
  const schedules = allocateTopicCompletionDates(topics, occurrences, examScopes);

  const topicPlannedDates = new Map<string, string | null>();
  schedules.forEach((s) => {
    topicPlannedDates.set(s.topicId, s.expectedCompletionDate || null);
  });

  return {
    occurrences,
    schedules,
    topicPlannedDates,
  };
}
