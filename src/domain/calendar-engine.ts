/**
 * Prospectus Academic SaaS - Calendar Calculation Engine
 * 
 * Implements precise Gregorian calendar math for academic semesters,
 * instructional day determination, and 2nd/4th Saturday rules.
 */

import { SaturdayRuleType, DbCalendarEvent, DbScheduledSession, DbTimetableSlot } from "../types/database";

export interface DayInstructionalStatus {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isInstructional: boolean;
  reason: string;
  matchedEvent?: DbCalendarEvent;
}

export interface SemesterCalendarBreakdown {
  totalCalendarDays: number;
  totalInstructionalDays: number;
  holidaysCount: number;
  workingSaturdaysCount: number;
  offSaturdaysCount: number;
  specialWorkingDaysCount: number;
  examDaysCount: number;
  days: DayInstructionalStatus[];
}

export interface SessionShiftRecord {
  sessionId: string;
  originalDate: string;
  newDate: string;
  reason: string;
}

/**
 * Returns an array of day numbers (1..31) corresponding to all Saturdays in a given month.
 * @param year e.g. 2026
 * @param month 1-indexed (1 = January, ..., 12 = December)
 */
export function getSaturdaysInMonth(year: number, month: number): number[] {
  const saturdays: number[] = [];
  // Number of days in the month
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (d.getUTCDay() === 6) {
      saturdays.push(day);
    }
  }

  return saturdays;
}

/**
 * Checks whether a specific Saturday date is an instructional working Saturday under SECOND_FOURTH rule.
 * 2nd Saturday is index 1, 4th Saturday is index 3 in the month's Saturday list.
 */
export function isSecondOrFourthSaturday(year: number, month: number, day: number): boolean {
  const saturdays = getSaturdaysInMonth(year, month);
  const saturdayIndex = saturdays.indexOf(day);
  // Index 1 = 2nd Saturday, Index 3 = 4th Saturday
  return saturdayIndex === 1 || saturdayIndex === 3;
}

/**
 * Parses YYYY-MM-DD into UTC year, month (1-indexed), day
 */
export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split("-").map(Number);
  return {
    year: parts[0],
    month: parts[1],
    day: parts[2],
  };
}

/**
 * Formats a Date object to YYYY-MM-DD in UTC
 */
export function formatDateToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Determines whether a single calendar date is instructional based on:
 * 1. Overriding Calendar Events (SPECIAL_WORKING_DAY, HOLIDAY, CANCELLED_DAY, BLACKOUT, EXAM_PERIOD)
 * 2. Day of Week (Sunday is off by default)
 * 3. Saturday Working Rule (ALL, NONE, SECOND_FOURTH)
 */
export function isDateInstructional(
  dateStr: string,
  saturdayRule: SaturdayRuleType,
  calendarEvents: DbCalendarEvent[] = []
): DayInstructionalStatus {
  const { year, month, day } = parseDateParts(dateStr);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay();

  // 1. Check for overriding calendar events covering this date
  const matchedEvents = calendarEvents.filter(
    (ev) => ev.start_date <= dateStr && dateStr <= ev.end_date
  );

  // Special working days take highest precedence for enabling teaching
  const specialWorkingDay = matchedEvents.find((e) => e.event_type === "SPECIAL_WORKING_DAY");
  if (specialWorkingDay) {
    return {
      date: dateStr,
      dayOfWeek,
      isInstructional: true,
      reason: `Special Working Day: ${specialWorkingDay.title}`,
      matchedEvent: specialWorkingDay,
    };
  }

  // Explicit holidays or cancelled dates take precedence for disabling teaching
  const holiday = matchedEvents.find(
    (e) => e.event_type === "HOLIDAY" || e.event_type === "CANCELLED_DAY" || e.event_type === "BLACKOUT"
  );
  if (holiday) {
    return {
      date: dateStr,
      dayOfWeek,
      isInstructional: false,
      reason: `${holiday.event_type === "HOLIDAY" ? "Holiday" : "Cancelled"}: ${holiday.title}`,
      matchedEvent: holiday,
    };
  }

  // Non-instructional exam periods
  const nonInstructionalExam = matchedEvents.find(
    (e) => e.event_type === "EXAM_PERIOD" && !e.is_instructional
  );
  if (nonInstructionalExam) {
    return {
      date: dateStr,
      dayOfWeek,
      isInstructional: false,
      reason: `Exam Period (No Regular Classes): ${nonInstructionalExam.title}`,
      matchedEvent: nonInstructionalExam,
    };
  }

  // Academic / Institutional events that explicitly declare instruction status
  const explicitEvent = matchedEvents.find((e) => e.is_instructional !== undefined);
  if (explicitEvent && !explicitEvent.is_instructional) {
    return {
      date: dateStr,
      dayOfWeek,
      isInstructional: false,
      reason: `Event: ${explicitEvent.title}`,
      matchedEvent: explicitEvent,
    };
  }

  // 2. Sundays are non-instructional by default
  if (dayOfWeek === 0) {
    return {
      date: dateStr,
      dayOfWeek,
      isInstructional: false,
      reason: "Sunday (Off)",
    };
  }

  // 3. Saturday rules
  if (dayOfWeek === 6) {
    if (saturdayRule === "ALL") {
      return {
        date: dateStr,
        dayOfWeek,
        isInstructional: true,
        reason: "Working Saturday (All Saturdays working rule)",
      };
    }

    if (saturdayRule === "NONE") {
      return {
        date: dateStr,
        dayOfWeek,
        isInstructional: false,
        reason: "Off Saturday (No Saturdays working rule)",
      };
    }

    if (saturdayRule === "SECOND_FOURTH") {
      const isWorking = isSecondOrFourthSaturday(year, month, day);
      return {
        date: dateStr,
        dayOfWeek,
        isInstructional: isWorking,
        reason: isWorking
          ? "Working Saturday (2nd or 4th Saturday of the month)"
          : "Off Saturday (1st, 3rd, or 5th Saturday of the month)",
      };
    }
  }

  // 4. Standard weekdays (Monday through Friday)
  return {
    date: dateStr,
    dayOfWeek,
    isInstructional: true,
    reason: "Standard Instructional Weekday",
  };
}

/**
 * Calculates day-by-day calendar breakdown for an entire semester date range
 */
export function calculateSemesterCalendar(
  startDateStr: string,
  endDateStr: string,
  saturdayRule: SaturdayRuleType,
  calendarEvents: DbCalendarEvent[] = []
): SemesterCalendarBreakdown {
  const { year: sy, month: sm, day: sd } = parseDateParts(startDateStr);
  const { year: ey, month: em, day: ed } = parseDateParts(endDateStr);

  const startUtc = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const endUtc = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  const days: DayInstructionalStatus[] = [];
  let holidaysCount = 0;
  let workingSaturdaysCount = 0;
  let offSaturdaysCount = 0;
  let specialWorkingDaysCount = 0;
  let examDaysCount = 0;

  const current = new Date(startUtc);
  while (current <= endUtc) {
    const dateStr = formatDateToIso(current);
    const status = isDateInstructional(dateStr, saturdayRule, calendarEvents);
    days.push(status);

    if (status.matchedEvent?.event_type === "HOLIDAY" || status.matchedEvent?.event_type === "CANCELLED_DAY") {
      holidaysCount++;
    } else if (status.matchedEvent?.event_type === "SPECIAL_WORKING_DAY") {
      specialWorkingDaysCount++;
    } else if (status.matchedEvent?.event_type === "EXAM_PERIOD") {
      examDaysCount++;
    }

    if (status.dayOfWeek === 6) {
      if (status.isInstructional) {
        workingSaturdaysCount++;
      } else {
        offSaturdaysCount++;
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const totalInstructionalDays = days.filter((d) => d.isInstructional).length;

  return {
    totalCalendarDays: days.length,
    totalInstructionalDays,
    holidaysCount,
    workingSaturdaysCount,
    offSaturdaysCount,
    specialWorkingDaysCount,
    examDaysCount,
    days,
  };
}

/**
 * Recalculates dependent scheduled class occurrence dates when a holiday is added,
 * a Saturday rule changes, or a calendar event is modified.
 * 
 * CRITICAL CORRECTNESS PRINCIPLE:
 * - Completed sessions (occurrence_status === 'COMPLETED') are NEVER modified or deleted.
 * - Only pending/future sessions (occurrence_status === 'SCHEDULED') are evaluated.
 * - If a scheduled session's date has become non-instructional, it is shifted to the
 *   next available instructional occurrence for that batch/subject slot.
 */
export function recalculatePlannedSessions(
  sessions: DbScheduledSession[],
  timetableSlots: DbTimetableSlot[],
  startDateStr: string,
  endDateStr: string,
  saturdayRule: SaturdayRuleType,
  calendarEvents: DbCalendarEvent[]
): {
  updatedSessions: DbScheduledSession[];
  shifts: SessionShiftRecord[];
} {
  const shifts: SessionShiftRecord[] = [];
  const updatedSessions: DbScheduledSession[] = [];

  // Index timetable slots by ID
  const slotMap = new Map<string, DbTimetableSlot>();
  timetableSlots.forEach((slot) => slotMap.set(slot.id, slot));

  for (const session of sessions) {
    // 1. Never alter completed sessions
    if (session.occurrence_status === "COMPLETED") {
      updatedSessions.push(session);
      continue;
    }

    // 2. Evaluate scheduled occurrences
    const status = isDateInstructional(session.session_date, saturdayRule, calendarEvents);

    if (status.isInstructional) {
      // Date remains instructional; no shift needed
      updatedSessions.push(session);
    } else {
      // Date is now non-instructional (e.g. newly added holiday, or changed to off-Saturday)
      // Find the next available instructional date for this session
      const { year: y, month: m, day: d } = parseDateParts(session.session_date);
      const curr = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

      let shiftedDateStr = session.session_date;
      let found = false;

      // Look up to 60 days ahead for the next matching instructional timetable slot or weekday
      for (let offset = 1; offset <= 60; offset++) {
        curr.setUTCDate(curr.getUTCDate() + 1);
        const testDateStr = formatDateToIso(curr);

        if (testDateStr > endDateStr) {
          break; // Do not shift past semester end date
        }

        const candidateStatus = isDateInstructional(testDateStr, saturdayRule, calendarEvents);
        if (candidateStatus.isInstructional) {
          // If timetable slot defines specific day of week, prefer matching day of week
          const slot = session.timetable_slot_id ? slotMap.get(session.timetable_slot_id) : null;
          if (slot && slot.day_of_week === candidateStatus.dayOfWeek) {
            shiftedDateStr = testDateStr;
            found = true;
            break;
          } else if (!slot) {
            shiftedDateStr = testDateStr;
            found = true;
            break;
          }
        }
      }

      // If slot matching day wasn't found within 14 days, fallback to any next instructional day
      if (!found) {
        const fallbackCurr = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        for (let offset = 1; offset <= 60; offset++) {
          fallbackCurr.setUTCDate(fallbackCurr.getUTCDate() + 1);
          const testDateStr = formatDateToIso(fallbackCurr);
          if (testDateStr > endDateStr) break;

          const candidateStatus = isDateInstructional(testDateStr, saturdayRule, calendarEvents);
          if (candidateStatus.isInstructional) {
            shiftedDateStr = testDateStr;
            found = true;
            break;
          }
        }
      }

      if (found && shiftedDateStr !== session.session_date) {
        shifts.push({
          sessionId: session.id,
          originalDate: session.session_date,
          newDate: shiftedDateStr,
          reason: `Date became non-instructional (${status.reason}). Shifted to next available instructional date.`,
        });

        updatedSessions.push({
          ...session,
          session_date: shiftedDateStr,
        });
      } else {
        // Kept as-is if no alternative found within semester
        updatedSessions.push(session);
      }
    }
  }

  return {
    updatedSessions,
    shifts,
  };
}
