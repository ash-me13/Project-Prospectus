/**
 * Prospectus Authoritative Academic Calculation Engine
 * 
 * Pure, reusable TypeScript domain module implementing the Course Progression Challenge specification.
 * Zero UI dependencies; identical logic for server-side evaluation and client-side visualization.
 * 
 * All internal arithmetic preserves full floating-point precision, with display values rounded
 * deterministically to two decimal places. Every calculation is traceable to canonical source entities.
 */

import {
  TopicProgressInput,
  CourseProgressionMetrics,
  ProgressStatus,
  SaturdayRule,
  ExamReadinessMetrics,
  ExamType,
  RolledUpTrackProgress,
  RolledUpCampusProgress,
} from "../types/academic";
import {
  DbSubject,
  DbBatch,
  DbSyllabusTopic,
  DbScheduledSession,
  DbCalendarEvent,
  DbExamWindow,
} from "../types/database";

export interface ThresholdConfig {
  onTrackBufferMin: number; // default: 1.15
  tightBufferMin: number;   // default: 1.00
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  onTrackBufferMin: 1.15,
  tightBufferMin: 1.00,
};

// ============================================================================
// 1. HOURS IN SCOPE
// ============================================================================
/**
 * Sums the planned hours of all syllabus topics, excluding topics explicitly marked Skipped.
 * Formula: Sum(planned_hours) for all topics where status != 'SKIPPED'
 */
export function calculateHoursInScope(
  topics: Array<{ plannedHours: number; status?: string }>
): number {
  if (!topics || topics.length === 0) return 0;
  const rawSum = topics
    .filter((t) => t.status !== "SKIPPED")
    .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
  return roundToTwoDecimals(rawSum);
}

// ============================================================================
// 2. COVERED HOURS
// ============================================================================
/**
 * Calculates covered instructional hours based on canonical topic progress.
 * Completed topics contribute: planned_hours * 1.0
 * In-Progress topics contribute: planned_hours * (completion_percentage / 100)
 * Not-Started topics contribute: 0.0
 * Skipped topics contribute: 0.0 (excluded from scope)
 * Historical session logs serve as the audit trail and are not double-counted.
 */
export function calculateCoveredHours(
  topics: Array<{ plannedHours: number; status?: string; percentComplete?: number }>
): number {
  if (!topics || topics.length === 0) return 0;
  const rawSum = topics.reduce((sum, t) => {
    if (t.status === "SKIPPED") return sum;
    if (t.status === "COMPLETED") return sum + (t.plannedHours || 0);
    if (t.status === "IN_PROGRESS") {
      const pct = Math.max(0, Math.min(100, t.percentComplete ?? 0));
      return sum + ((t.plannedHours || 0) * pct) / 100;
    }
    return sum;
  }, 0);
  return roundToTwoDecimals(rawSum);
}

// ============================================================================
// 3. COVERAGE PERCENTAGE
// ============================================================================
/**
 * Calculates coverage percentage: covered_hours / hours_in_scope * 100.
 * Safely handles zero-hour scope without NaN or division by zero.
 */
export function calculateCoveragePercentage(
  coveredHours: number,
  hoursInScope: number
): number {
  if (hoursInScope <= 0.0001) return 0;
  const pct = (coveredHours / hoursInScope) * 100;
  return roundToTwoDecimals(Math.min(100, Math.max(0, pct)));
}

// ============================================================================
// 4. REMAINING HOURS
// ============================================================================
/**
 * Calculates remaining instructional hours: hours_in_scope - covered_hours.
 * Strictly protected against negative numbers caused by floating-point inaccuracies.
 */
export function calculateRemainingHours(
  hoursInScope: number,
  coveredHours: number
): number {
  return roundToTwoDecimals(Math.max(0, hoursInScope - coveredHours));
}

// ============================================================================
// 5. AVAILABLE TEACHING HOURS (CALENDAR ENGINE)
// ============================================================================
/**
 * Date Boundary Convention:
 * Teaching capacity is calculated for all instructional occurrences on or after
 * startDateIso up to and including endDateIso (inclusive boundary).
 *
 * Excludes Sundays, non-working Saturdays (under All, None, or 2nd/4th Saturday rules),
 * and official calendar holidays / non-instructional events.
 */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateYMD(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  // Construct using local noon to avoid midnight UTC boundary drift
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

/**
 * Validates whether a Saturday is working under Gregorian calendar rules.
 * 2nd and 4th Saturday rule uses actual calendar dates (days 8-14 and 22-28).
 */
export function isSaturdayWorking(date: Date, rule: SaturdayRule): boolean {
  if (rule === "ALL") return true;
  if (rule === "NONE") return false;

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
  if (dayOfWeek === 0) return false; // Sunday is non-working

  const dateIso = formatDateToYMD(date);
  if (holidayDatesSet.has(dateIso)) return false; // Holiday / blackout

  if (dayOfWeek === 6) {
    return isSaturdayWorking(date, saturdayRule);
  }

  return true; // Monday - Friday
}

export interface TimetableWeeklySchedule {
  [dayOfWeek: number]: number; // dayOfWeek (0-6) -> teaching hours per day
}

/**
 * Calculates remaining available hours from weekly timetable slots + calendar rules.
 */
export function calculateAvailableTeachingHours(
  startDateIso: string,
  endDateIso: string,
  weeklySchedule: TimetableWeeklySchedule,
  saturdayRule: SaturdayRule,
  holidayDates: string[]
): number {
  if (startDateIso > endDateIso) return 0;

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
 * Calculates remaining available teaching hours directly from scheduled session records.
 * Sums duration_hours of sessions where session_date >= currentDateIso and <= targetDateIso,
 * excluding cancelled and skipped sessions.
 */
export function calculateAvailableHoursFromScheduledSessions(
  scheduledSessions: Array<{
    session_date: string;
    duration_hours: number;
    occurrence_status: string;
  }>,
  currentDateIso: string,
  targetDateIso: string
): number {
  const total = scheduledSessions
    .filter(
      (s) =>
        s.session_date >= currentDateIso &&
        s.session_date <= targetDateIso &&
        s.occurrence_status !== "CANCELLED" &&
        s.occurrence_status !== "SKIPPED"
    )
    .reduce((acc, s) => acc + (s.duration_hours || 0), 0);

  return roundToTwoDecimals(total);
}

// ============================================================================
// 6. BUFFER RATIO & STATUS CLASSIFICATION
// ============================================================================
/**
 * Calculates buffer ratio: available_hours / remaining_hours.
 * Handles edge cases safely without Infinity or NaN:
 * - remaining_hours <= 0 -> 999.99 (finite sentinel, COMPLETE)
 * - available_hours <= 0 -> 0.00 (DANGER)
 */
export function calculateBufferRatio(
  availableHours: number,
  remainingHours: number
): number {
  if (remainingHours <= 0.0001) {
    return 999.99;
  }
  if (!availableHours || availableHours <= 0 || isNaN(availableHours)) {
    return 0.0;
  }
  return roundToTwoDecimals(availableHours / remainingHours);
}

/**
 * Classifies a subject's progression status:
 * - COMPLETE: when remaining_hours <= 0
 * - ON TRACK: buffer_ratio >= 1.15
 * - TIGHT: buffer_ratio >= 1.00 and < 1.15
 * - DANGER: buffer_ratio < 1.00
 */
export function determineStatus(
  bufferRatio: number,
  remainingHours: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): ProgressStatus {
  if (remainingHours <= 0.0001) {
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

// ============================================================================
// 7. PACE VERSUS PLAN
// ============================================================================
/**
 * Calculates pace vs plan: covered_hours - hours_that_should_have_been_covered_by_today.
 * Negative values indicate the subject is behind plan.
 */
export function calculatePaceVsPlan(
  coveredHours: number,
  topics: Array<{ plannedHours: number; status?: string; plannedDate?: string }>,
  currentDateIso: string
): number {
  const targetDate = parseDateYMD(currentDateIso);
  targetDate.setHours(23, 59, 59, 999);

  const plannedHoursByToday = topics
    .filter((t) => {
      if (t.status === "SKIPPED" || !t.plannedDate) return false;
      const pDate = parseDateYMD(t.plannedDate);
      return pDate.getTime() <= targetDate.getTime();
    })
    .reduce((sum, t) => sum + (t.plannedHours || 0), 0);

  return roundToTwoDecimals(coveredHours - plannedHoursByToday);
}

// ============================================================================
// 8. OVERDUE TOPICS
// ============================================================================
/**
 * A topic is overdue when its planned completion date has passed and it is not fully covered.
 * A fully covered topic (100% or COMPLETED) is not overdue. Skipped topics are excluded.
 */
export function getOverdueTopics(
  topics: Array<{
    id: string;
    plannedHours: number;
    status?: string;
    percentComplete?: number;
    plannedDate?: string;
  }>,
  currentDateIso: string
): {
  count: number;
  overdueTopicIds: string[];
} {
  const today = parseDateYMD(currentDateIso);

  const overdueList = topics.filter((t) => {
    if (t.status === "SKIPPED" || t.status === "COMPLETED") return false;
    if ((t.percentComplete ?? 0) >= 100) return false;
    if (!t.plannedDate) return false;

    const pDate = parseDateYMD(t.plannedDate);
    return pDate.getTime() < today.getTime();
  });

  return {
    count: overdueList.length,
    overdueTopicIds: overdueList.map((t) => t.id),
  };
}

export function countOverdueTopics(
  topics: Array<{
    id: string;
    plannedHours: number;
    status?: string;
    percentComplete?: number;
    plannedDate?: string;
  }>,
  currentDateIso: string
): number {
  return getOverdueTopics(topics, currentDateIso).count;
}

// ============================================================================
// 9. TRACK & CAMPUS ROLLUP (WORST-STATUS PRINCIPLE)
// ============================================================================
/**
 * Rolled-up track status reflects the worst applicable subject status, not an average.
 * Priority hierarchy: DANGER > TIGHT > ON_TRACK > COMPLETE
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

  let worstStatus: ProgressStatus = "COMPLETE";
  if (dangerCount > 0) {
    worstStatus = "DANGER";
  } else if (tightCount > 0) {
    worstStatus = "TIGHT";
  } else if (onTrackCount > 0 || subjectMetrics.some((m) => m.status === "ON_TRACK")) {
    worstStatus = "ON_TRACK";
  }

  return {
    trackName,
    totalSubjects: subjectMetrics.length,
    worstStatus,
    averageCoveragePercentage: roundToTwoDecimals(totalCoverage / subjectMetrics.length),
    dangerSubjectsCount: dangerCount,
    tightSubjectsCount: tightCount,
    onTrackSubjectsCount: onTrackCount,
  };
}

/**
 * Rolled-up campus status reflects the worst track status across all academic tracks.
 */
export function rollUpCampusProgress(
  campusName: string,
  trackSummaries: RolledUpTrackProgress[]
): RolledUpCampusProgress {
  if (trackSummaries.length === 0) {
    return {
      campusName,
      totalTracks: 0,
      totalSubjects: 0,
      worstStatus: "ON_TRACK",
      trackSummaries: [],
    };
  }

  let totalSubjects = 0;
  let hasDanger = false;
  let hasTight = false;
  let hasOnTrack = false;

  for (const track of trackSummaries) {
    totalSubjects += track.totalSubjects;
    if (track.worstStatus === "DANGER") hasDanger = true;
    else if (track.worstStatus === "TIGHT") hasTight = true;
    else if (track.worstStatus === "ON_TRACK") hasOnTrack = true;
  }

  let worstStatus: ProgressStatus = "COMPLETE";
  if (hasDanger) worstStatus = "DANGER";
  else if (hasTight) worstStatus = "TIGHT";
  else if (hasOnTrack || trackSummaries.some((t) => t.worstStatus === "ON_TRACK")) worstStatus = "ON_TRACK";

  return {
    campusName,
    totalTracks: trackSummaries.length,
    totalSubjects,
    worstStatus,
    trackSummaries,
  };
}

// ============================================================================
// 10. EXAM READINESS ENGINE
// ============================================================================
/**
 * Evaluates readiness for an upcoming exam milestone:
 * - In-scope planned hours
 * - Hours covered within exam scope
 * - Remaining hours needed
 * - Weighted coverage percentage
 * - Planned teaching capacity available before the exam
 * - Readiness indicator: READY, ON_TRACK (fits into capacity), AT_RISK (capacity deficit)
 */
export function calculateExamReadiness(
  examType: ExamType,
  examName: string,
  examDateIso: string,
  topics: Array<{
    id: string;
    plannedHours: number;
    status: string;
    percentComplete?: number;
    inScopeForExams?: ExamType[];
  }>,
  availableHoursBeforeExam?: number
): ExamReadinessMetrics {
  const inScopeTopics = topics.filter(
    (t) =>
      t.status !== "SKIPPED" &&
      Array.isArray(t.inScopeForExams) &&
      t.inScopeForExams.includes(examType)
  );

  const totalInScopeHours = roundToTwoDecimals(
    inScopeTopics.reduce((sum, t) => sum + (t.plannedHours || 0), 0)
  );

  const coveredInScopeHours = roundToTwoDecimals(
    inScopeTopics.reduce((sum, t) => {
      if (t.status === "COMPLETED") return sum + (t.plannedHours || 0);
      if (t.status === "IN_PROGRESS") {
        const pct = Math.max(0, Math.min(100, t.percentComplete ?? 0));
        return sum + ((t.plannedHours || 0) * pct) / 100;
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

  const isReady = remainingHoursNeeded <= 0.0001;

  let readinessStatus: "READY" | "ON_TRACK" | "AT_RISK" = "AT_RISK";
  if (isReady) {
    readinessStatus = "READY";
  } else if (
    availableHoursBeforeExam !== undefined &&
    remainingHoursNeeded <= availableHoursBeforeExam
  ) {
    readinessStatus = "ON_TRACK";
  } else if (availableHoursBeforeExam === undefined && readinessPercentage >= 80) {
    readinessStatus = "ON_TRACK";
  }

  return {
    examType,
    examName,
    examDate: examDateIso,
    totalInScopeHours,
    coveredInScopeHours,
    readinessPercentage,
    remainingHoursNeeded,
    availableHoursBeforeExam,
    readinessStatus,
    isReady,
  };
}

// ============================================================================
// MASTER PROGRESSION ENGINE (Pure Function)
// ============================================================================
export function calculateCourseProgression(
  topics: TopicProgressInput[],
  availableTeachingHoursTillDeadline: number,
  currentDateIso: string,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): CourseProgressionMetrics {
  const totalHoursInScope = calculateHoursInScope(topics);
  const coveredHours = calculateCoveredHours(topics);
  const coveragePercentage = calculateCoveragePercentage(coveredHours, totalHoursInScope);
  const remainingHours = calculateRemainingHours(totalHoursInScope, coveredHours);
  const bufferRatio = calculateBufferRatio(availableTeachingHoursTillDeadline, remainingHours);
  const status = determineStatus(bufferRatio, remainingHours, thresholds);
  const paceVsPlanHours = calculatePaceVsPlan(coveredHours, topics, currentDateIso);
  const overdueTopicsCount = countOverdueTopics(topics, currentDateIso);

  return {
    totalHoursInScope,
    coveredHours,
    coveragePercentage,
    remainingHours,
    availableHoursTillDeadline: roundToTwoDecimals(availableTeachingHoursTillDeadline || 0),
    bufferRatio,
    status,
    paceVsPlanHours,
    overdueTopicsCount,
  };
}

// ============================================================================
// DYNAMIC TOPIC DATE PLANNING ENGINE
// ============================================================================
/**
 * Automatically recomputes expected topic completion dates by walking the calendar
 * and consuming daily timetable instructional hours.
 * Automatically shifts subsequent dates when holidays or cancellations occur.
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
          // Partial coverage, carries over to next instructional occurrence
          topicRemainingHours -= dayCapacity;
          dayCapacity = 0;
        }
      }
      accumulatedHoursCurrentDaySpent = 0;
    }
    current.setDate(current.getDate() + 1);
  }

  // If semester ends before all topics finish, assign semester end date as ceiling
  while (topicIndex < validTopics.length) {
    result.set(validTopics[topicIndex].id, semesterEndDateIso);
    topicIndex++;
  }

  return result;
}

// ============================================================================
// SERVER-SIDE DATA RETRIEVAL & PROGRESSION CALCULATION
// ============================================================================
export interface ServerSubjectProgressionResult {
  subject: DbSubject;
  batch: DbBatch;
  metrics: CourseProgressionMetrics;
  examReadiness: ExamReadinessMetrics[];
  traceability: {
    totalTopics: number;
    inScopeTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    skippedTopics: number;
    remainingHours: number;
    availableScheduledOccurrences: number;
    overdueTopicTitles: string[];
  };
}

export interface ProgressionDataStore {
  getSubjects(): DbSubject[];
  getBatches(): DbBatch[];
  getBatchSubjects(): Array<{ id: string; batch_id: string; subject_id: string; target_finish_date: string }>;
  getTopics(subjectId: string): DbSyllabusTopic[];
  getScheduledSessions(batchSubjectId: string): DbScheduledSession[];
  getExamWindows(semesterId: string): DbExamWindow[];
  getCalendarEvents(semesterId: string): DbCalendarEvent[];
  getTopicExamScopes(subjectId: string): Array<{ topic_id: string; exam_type: string }>;
}

/**
 * Server-side evaluation method: queries canonical database store and runs authoritative pure calculations.
 */
export function calculateSubjectProgressionServer(
  subjectId: string,
  batchId: string,
  currentDateIso: string,
  dataStore: ProgressionDataStore,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): ServerSubjectProgressionResult {
  const subjects = dataStore.getSubjects();
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) throw new Error(`Subject with ID ${subjectId} not found.`);

  const batches = dataStore.getBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch with ID ${batchId} not found.`);

  const batchSubjects = dataStore.getBatchSubjects();
  const batchSubj = batchSubjects.find(
    (bs) => bs.subject_id === subjectId && bs.batch_id === batchId
  );
  const targetDateIso = batchSubj?.target_finish_date || "2026-12-15";

  // 1. Fetch canonical topics
  const topics = dataStore.getTopics(subjectId);
  const topicScopes = dataStore.getTopicExamScopes(subjectId);

  // Group scopes by topic
  const scopesByTopic = new Map<string, ExamType[]>();
  for (const sc of topicScopes) {
    const list = scopesByTopic.get(sc.topic_id) || [];
    list.push(sc.exam_type as ExamType);
    scopesByTopic.set(sc.topic_id, list);
  }

  const topicInputs: TopicProgressInput[] = topics.map((t) => ({
    id: t.id,
    plannedHours: t.planned_hours,
    status:
      t.status === "COMPLETED"
        ? "COMPLETED"
        : t.status === "SKIPPED"
        ? "SKIPPED"
        : t.percent_complete > 0
        ? "IN_PROGRESS"
        : "IN_PROGRESS",
    percentComplete: t.percent_complete,
    plannedDate: t.planned_date || undefined,
    inScopeForExams: scopesByTopic.get(t.id) || ["MID_TERM", "END_TERM"],
  }));

  // 2. Fetch scheduled sessions
  const scheduledSessions = batchSubj
    ? dataStore.getScheduledSessions(batchSubj.id)
    : [];

  const availableHours = calculateAvailableHoursFromScheduledSessions(
    scheduledSessions,
    currentDateIso,
    targetDateIso
  );

  // 3. Compute progression metrics
  const metrics = calculateCourseProgression(
    topicInputs,
    availableHours,
    currentDateIso,
    thresholds
  );

  // 4. Compute exam readiness for each exam window
  const examWindows = dataStore.getExamWindows(batch.semester_id);
  const examReadiness = examWindows.map((ew) => {
    // Capacity available before this exam date
    const capacityBeforeExam = calculateAvailableHoursFromScheduledSessions(
      scheduledSessions,
      currentDateIso,
      ew.start_date
    );

    return calculateExamReadiness(
      ew.exam_type as ExamType,
      ew.name,
      ew.start_date,
      topicInputs,
      capacityBeforeExam
    );
  });

  // 5. Traceability Breakdown
  const overdueInfo = getOverdueTopics(topicInputs, currentDateIso);
  const overdueTitles = topics
    .filter((t) => overdueInfo.overdueTopicIds.includes(t.id))
    .map((t) => t.title);

  return {
    subject,
    batch,
    metrics,
    examReadiness,
    traceability: {
      totalTopics: topics.length,
      inScopeTopics: topics.filter((t) => t.status !== "SKIPPED").length,
      completedTopics: topics.filter((t) => t.status === "COMPLETED").length,
      inProgressTopics: topics.filter(
        (t) => t.status !== "COMPLETED" && t.status !== "SKIPPED" && t.percent_complete > 0
      ).length,
      skippedTopics: topics.filter((t) => t.status === "SKIPPED").length,
      remainingHours: metrics.remainingHours,
      availableScheduledOccurrences: scheduledSessions.filter(
        (s) =>
          s.session_date >= currentDateIso &&
          s.session_date <= targetDateIso &&
          s.occurrence_status !== "CANCELLED" &&
          s.occurrence_status !== "SKIPPED"
      ).length,
      overdueTopicTitles: overdueTitles,
    },
  };
}

export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
