import {
  TopicProgressInput,
  CourseProgressionMetrics,
  ProgressStatus,
  SaturdayRule,
  ExamReadinessMetrics,
  ExamType,
  RolledUpTrackProgress,
} from "../types/academic";

export interface ThresholdConfig {
  onTrackBufferMin: number; // default 1.15
  tightBufferMin: number; // default 1.00
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  onTrackBufferMin: 1.15,
  tightBufferMin: 1.00,
};

/**
 * Calculates hours in scope.
 * Definition: Sum of planned hours of all topics, excluding those marked Skipped.
 */
export function calculateHoursInScope(topics: TopicProgressInput[]): number {
  return roundToTwoDecimals(
    topics
      .filter((t) => t.status !== "SKIPPED")
      .reduce((sum, t) => sum + t.plannedHours, 0)
  );
}

/**
 * Calculates covered hours.
 * Definition: Completed topics count fully; In Progress topics count planned hours * (% complete / 100).
 */
export function calculateCoveredHours(topics: TopicProgressInput[]): number {
  return roundToTwoDecimals(
    topics.reduce((sum, t) => {
      if (t.status === "SKIPPED") return sum;
      if (t.status === "COMPLETED") return sum + t.plannedHours;
      if (t.status === "IN_PROGRESS") {
        const pct = Math.max(0, Math.min(100, t.percentComplete || 0));
        return sum + (t.plannedHours * pct) / 100;
      }
      return sum;
    }, 0)
  );
}

/**
 * Calculates coverage percentage.
 * Definition: Covered hours / hours in scope.
 */
export function calculateCoveragePercentage(
  coveredHours: number,
  hoursInScope: number
): number {
  if (hoursInScope <= 0) return 0;
  const pct = (coveredHours / hoursInScope) * 100;
  return roundToTwoDecimals(Math.min(100, Math.max(0, pct)));
}

/**
 * Determines status from buffer ratio.
 * >= 1.15 ON TRACK
 * 1.00 - 1.15 TIGHT
 * < 1.00 DANGER
 */
export function determineStatus(
  bufferRatio: number,
  remainingHours: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): ProgressStatus {
  if (remainingHours <= 0.001) {
    return "COMPLETE";
  }
  if (bufferRatio >= thresholds.onTrackBufferMin) {
    return "ON_TRACK";
  }
  if (bufferRatio >= thresholds.tightBufferMin) {
    return "TIGHT";
  }
  return "DANGER";
}

/**
 * Calculates the buffer ratio.
 * Definition: Available hours / remaining hours.
 */
export function calculateBufferRatio(
  availableHours: number,
  remainingHours: number
): number {
  if (remainingHours <= 0) {
    return 999.99; // Completed; infinite buffer
  }
  return roundToTwoDecimals(availableHours / remainingHours);
}

/**
 * Calculates pace vs plan.
 * Definition: Covered hours - hours that should have been covered by today.
 * Negative = behind.
 */
export function calculatePaceVsPlan(
  coveredHours: number,
  topics: TopicProgressInput[],
  currentDateIso: string
): number {
  const targetDate = new Date(currentDateIso);
  targetDate.setHours(23, 59, 59, 999);

  const plannedHoursByToday = topics
    .filter((t) => {
      if (t.status === "SKIPPED") return false;
      if (!t.plannedDate) return false;
      const pDate = new Date(t.plannedDate);
      return pDate.getTime() <= targetDate.getTime();
    })
    .reduce((sum, t) => sum + t.plannedHours, 0);

  return roundToTwoDecimals(coveredHours - plannedHoursByToday);
}

/**
 * Checks for overdue topics.
 * Definition: A topic whose planned date has passed and is not fully covered.
 */
export function countOverdueTopics(
  topics: TopicProgressInput[],
  currentDateIso: string
): number {
  const targetDate = new Date(currentDateIso);
  targetDate.setHours(23, 59, 59, 999);

  return topics.filter((t) => {
    if (t.status === "SKIPPED" || t.status === "COMPLETED") return false;
    if (!t.plannedDate) return false;
    const pDate = new Date(t.plannedDate);
    return pDate.getTime() < targetDate.getTime();
  }).length;
}

/**
 * Master calculation function for Course Progression.
 */
export function calculateCourseProgression(
  topics: TopicProgressInput[],
  availableTeachingHoursTillDeadline: number,
  currentDateIso: string,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): CourseProgressionMetrics {
  const totalHoursInScope = calculateHoursInScope(topics);
  const coveredHours = calculateCoveredHours(topics);
  const coveragePercentage = calculateCoveragePercentage(
    coveredHours,
    totalHoursInScope
  );
  const remainingHours = roundToTwoDecimals(
    Math.max(0, totalHoursInScope - coveredHours)
  );
  const bufferRatio = calculateBufferRatio(
    availableTeachingHoursTillDeadline,
    remainingHours
  );
  const status = determineStatus(bufferRatio, remainingHours, thresholds);
  const paceVsPlanHours = calculatePaceVsPlan(
    coveredHours,
    topics,
    currentDateIso
  );
  const overdueTopicsCount = countOverdueTopics(topics, currentDateIso);

  return {
    totalHoursInScope,
    coveredHours,
    coveragePercentage,
    remainingHours,
    availableHoursTillDeadline: roundToTwoDecimals(
      availableTeachingHoursTillDeadline
    ),
    bufferRatio,
    status,
    paceVsPlanHours,
    overdueTopicsCount,
  };
}

export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateYMD(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  // Construct using local noon to avoid any midnight timezone shifts
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

/**
 * Calendar Working Day Rules
 */
export function isSaturdayWorking(
  date: Date,
  rule: SaturdayRule
): boolean {
  if (rule === "ALL") return true;
  if (rule === "NONE") return false;

  // SECOND_FOURTH: 2nd and 4th Saturdays of the month are working days
  const dayOfMonth = date.getDate();
  const saturdayIndex = Math.ceil(dayOfMonth / 7);
  return saturdayIndex === 2 || saturdayIndex === 4;
}

export function isInstructionalWorkingDay(
  date: Date,
  saturdayRule: SaturdayRule,
  holidayDatesSet: Set<string>
): boolean {
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0) {
    return false; // Sunday is non-working
  }

  const dateIso = formatDateToYMD(date);
  if (holidayDatesSet.has(dateIso)) {
    return false; // Official holiday / event
  }

  if (dayOfWeek === 6) {
    return isSaturdayWorking(date, saturdayRule);
  }

  return true; // Monday through Friday are working days
}

export interface TimetableWeeklySchedule {
  [dayOfWeek: number]: number; // dayOfWeek (0-6) -> hours taught that day
}

/**
 * Computes available teaching hours between two dates for a subject's timetable schedule.
 */
export function calculateAvailableTeachingHours(
  startDateIso: string,
  endDateIso: string,
  weeklySchedule: TimetableWeeklySchedule,
  saturdayRule: SaturdayRule,
  holidayDates: string[]
): number {
  const holidaysSet = new Set(holidayDates);
  const current = parseDateYMD(startDateIso);
  const end = parseDateYMD(endDateIso);
  let totalHours = 0;

  while (current.getTime() <= end.getTime()) {
    if (isInstructionalWorkingDay(current, saturdayRule, holidaysSet)) {
      const dayOfWeek = current.getDay();
      const hoursForDay = weeklySchedule[dayOfWeek] || 0;
      totalHours += hoursForDay;
    }
    current.setDate(current.getDate() + 1);
  }

  return roundToTwoDecimals(totalHours);
}

/**
 * Automatic Planned Dates Engine:
 * For every topic, compute the date it should be taught by walking the calendar
 * and spending each weekday's teaching hours.
 * Holidays and cancelled classes shift every later date automatically.
 */
export function schedulePlannedDatesForTopics(
  topics: Array<{ id: string; plannedHours: number; status?: string }>,
  semesterStartDateIso: string,
  semesterEndDateIso: string,
  weeklySchedule: TimetableWeeklySchedule,
  saturdayRule: SaturdayRule,
  holidayDates: string[]
): Map<string, string> {
  const result = new Map<string, string>();
  const holidaysSet = new Set(holidayDates);
  const current = parseDateYMD(semesterStartDateIso);
  const end = parseDateYMD(semesterEndDateIso);

  let topicIndex = 0;
  let accumulatedHoursCurrentDaySpent = 0;

  const validTopics = topics.filter((t) => t.status !== "SKIPPED");
  if (validTopics.length === 0) return result;

  let currentTopic = validTopics[topicIndex];
  let topicRemainingHours = currentTopic.plannedHours;

  while (current.getTime() <= end.getTime() && topicIndex < validTopics.length) {
    if (isInstructionalWorkingDay(current, saturdayRule, holidaysSet)) {
      const dayOfWeek = current.getDay();
      let dayCapacity = weeklySchedule[dayOfWeek] || 0;
      dayCapacity -= accumulatedHoursCurrentDaySpent;

      while (dayCapacity > 0 && topicIndex < validTopics.length) {
        if (dayCapacity >= topicRemainingHours) {
          // Topic completed on this date
          const dateStr = formatDateToYMD(current);
          result.set(currentTopic.id, dateStr);
          dayCapacity -= topicRemainingHours;
          topicIndex++;
          if (topicIndex < validTopics.length) {
            currentTopic = validTopics[topicIndex];
            topicRemainingHours = currentTopic.plannedHours;
          }
        } else {
          // Partial coverage, carries over to next instructional slot
          topicRemainingHours -= dayCapacity;
          dayCapacity = 0;
        }
      }
      accumulatedHoursCurrentDaySpent = 0;
    }
    current.setDate(current.getDate() + 1);
  }

  // If semester ends before all topics are scheduled, assign the semester end date to remaining
  while (topicIndex < validTopics.length) {
    result.set(validTopics[topicIndex].id, semesterEndDateIso);
    topicIndex++;
  }

  return result;
}

/**
 * Calculates Exam Readiness.
 * Shows in-scope coverage % and hours still needed before the exam date.
 */
export function calculateExamReadiness(
  examType: ExamType,
  examName: string,
  examDateIso: string,
  topics: Array<{
    id: string;
    plannedHours: number;
    status: string;
    percentComplete: number;
    inScopeForExams?: ExamType[];
  }>
): ExamReadinessMetrics {
  const inScopeTopics = topics.filter(
    (t) =>
      t.status !== "SKIPPED" &&
      Array.isArray(t.inScopeForExams) &&
      t.inScopeForExams.includes(examType)
  );

  const totalInScopeHours = roundToTwoDecimals(
    inScopeTopics.reduce((sum, t) => sum + t.plannedHours, 0)
  );

  const coveredInScopeHours = roundToTwoDecimals(
    inScopeTopics.reduce((sum, t) => {
      if (t.status === "COMPLETED") return sum + t.plannedHours;
      if (t.status === "IN_PROGRESS") {
        const pct = Math.max(0, Math.min(100, t.percentComplete || 0));
        return sum + (t.plannedHours * pct) / 100;
      }
      return sum;
    }, 0)
  );

  const readinessPercentage =
    totalInScopeHours > 0
      ? roundToTwoDecimals((coveredInScopeHours / totalInScopeHours) * 100)
      : 100;

  const remainingHoursNeeded = roundToTwoDecimals(
    Math.max(0, totalInScopeHours - coveredInScopeHours)
  );

  return {
    examType,
    examName,
    examDate: examDateIso,
    totalInScopeHours,
    coveredInScopeHours,
    readinessPercentage,
    remainingHoursNeeded,
    isReady: remainingHoursNeeded <= 0.001,
  };
}

/**
 * Track Rollup Calculation:
 * "Rolled-up track status shows the worst subject, not an average."
 */
export function rollUpTrackProgress(
  trackName: string,
  subjectMetrics: CourseProgressionMetrics[]
): RolledUpTrackProgress {
  if (subjectMetrics.length === 0) {
    return {
      trackName,
      totalSubjects: 0,
      worstStatus: "ON_TRACK",
      averageCoveragePercentage: 0,
      dangerSubjectsCount: 0,
      tightSubjectsCount: 0,
      onTrackSubjectsCount: 0,
    };
  }

  let dangerCount = 0;
  let tightCount = 0;
  let onTrackCount = 0;
  let totalCoverage = 0;

  for (const m of subjectMetrics) {
    totalCoverage += m.coveragePercentage;
    if (m.status === "DANGER") dangerCount++;
    else if (m.status === "TIGHT") tightCount++;
    else onTrackCount++;
  }

  // Priority order of worst status: DANGER > TIGHT > ON_TRACK > COMPLETE
  let worstStatus: ProgressStatus = "COMPLETE";
  if (dangerCount > 0) {
    worstStatus = "DANGER";
  } else if (tightCount > 0) {
    worstStatus = "TIGHT";
  } else if (
    subjectMetrics.some((m) => m.status === "ON_TRACK") ||
    onTrackCount > 0
  ) {
    worstStatus = "ON_TRACK";
  }

  return {
    trackName,
    totalSubjects: subjectMetrics.length,
    worstStatus,
    averageCoveragePercentage: roundToTwoDecimals(
      totalCoverage / subjectMetrics.length
    ),
    dangerSubjectsCount: dangerCount,
    tightSubjectsCount: tightCount,
    onTrackSubjectsCount: onTrackCount,
  };
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
