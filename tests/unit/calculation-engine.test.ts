import { describe, it, expect } from "vitest";
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateRemainingHours,
  calculateBufferRatio,
  determineStatus,
  calculatePaceVsPlan,
  getOverdueTopics,
  countOverdueTopics,
  calculateCourseProgression,
  isSaturdayWorking,
  isInstructionalWorkingDay,
  calculateAvailableTeachingHours,
  calculateAvailableHoursFromScheduledSessions,
  schedulePlannedDatesForTopics,
  calculateExamReadiness,
  rollUpTrackProgress,
  rollUpCampusProgress,
  calculateSubjectProgressionServer,
  ProgressionDataStore,
  roundToTwoDecimals,
} from "../../src/domain/calculation-engine";
import {
  TopicProgressInput,
  CourseProgressionMetrics,
  ExamType,
  MissedLogAlert,
} from "../../src/types/academic";
import {
  DbSubject,
  DbBatch,
  DbSyllabusTopic,
  DbScheduledSession,
  DbExamWindow,
} from "../../src/types/database";
import {
  evaluateMissedSessions,
  AlertNotificationPayload,
} from "../../src/notifications/alerts";

describe("Academic Calculation Engine - Core Metrics & Precision", () => {
  it("rounds deterministically to two decimal places", () => {
    expect(roundToTwoDecimals(1.2345)).toBe(1.23);
    expect(roundToTwoDecimals(1.2355)).toBe(1.24);
    expect(roundToTwoDecimals(10)).toBe(10);
  });

  it("calculates pace versus plan directly with negative values when behind", () => {
    const topics = [
      { id: "t1", plannedHours: 2.0, status: "COMPLETED", plannedDate: "2026-10-01" },
      { id: "t2", plannedHours: 3.0, status: "IN_PROGRESS", plannedDate: "2026-10-05" },
      { id: "t3", plannedHours: 4.0, status: "IN_PROGRESS", plannedDate: "2026-10-20" },
    ];
    // By 2026-10-10, t1 and t2 should have been completed (5.0 hrs)
    // If only 3.5 hrs were covered:
    const pace = calculatePaceVsPlan(3.5, topics, "2026-10-10");
    expect(pace).toBe(-1.5);
  });

  it("calculates hours in scope excluding skipped topics", () => {
    const topics: TopicProgressInput[] = [
      { id: "t1", plannedHours: 1.5, status: "COMPLETED", percentComplete: 100 },
      { id: "t2", plannedHours: 2.0, status: "IN_PROGRESS", percentComplete: 50 },
      { id: "t3", plannedHours: 1.0, status: "SKIPPED", percentComplete: 0 },
      { id: "t4", plannedHours: 1.5, status: "IN_PROGRESS", percentComplete: 0 },
    ];

    const hoursInScope = calculateHoursInScope(topics);
    // 1.5 + 2.0 + 1.5 = 5.0 (t3 is skipped)
    expect(hoursInScope).toBe(5.0);
  });

  it("calculates covered hours weighting by planned hours", () => {
    const topics: TopicProgressInput[] = [
      { id: "t1", plannedHours: 2.0, status: "COMPLETED", percentComplete: 100 },
      { id: "t2", plannedHours: 1.5, status: "IN_PROGRESS", percentComplete: 60 }, // 1.5 * 0.6 = 0.9
      { id: "t3", plannedHours: 3.0, status: "SKIPPED", percentComplete: 100 }, // skipped = 0
      { id: "t4", plannedHours: 1.0, status: "IN_PROGRESS", percentComplete: 0 },
    ];

    const coveredHours = calculateCoveredHours(topics);
    // 2.0 + 0.9 = 2.9
    expect(coveredHours).toBe(2.9);
  });

  it("calculates coverage percentage correctly to 2 decimal places", () => {
    const coverage = calculateCoveragePercentage(2.9, 5.0);
    expect(coverage).toBe(58.0);

    const coverageEdge = calculateCoveragePercentage(1, 3);
    expect(coverageEdge).toBe(33.33);
  });

  it("safely handles remaining hours with floating point underflow protection", () => {
    expect(calculateRemainingHours(10, 4.25)).toBe(5.75);
    // Underflow protection: when covered hours exceed or equal planned hours due to float imprecision
    expect(calculateRemainingHours(5.0, 5.0000001)).toBe(0.0);
    expect(calculateRemainingHours(0, 0)).toBe(0.0);
  });

  it("safely handles zero scope without NaN or division by zero", () => {
    expect(calculateHoursInScope([])).toBe(0);
    expect(calculateCoveredHours([])).toBe(0);
    expect(calculateCoveragePercentage(0, 0)).toBe(0);
    expect(calculateRemainingHours(0, 0)).toBe(0);

    const progression = calculateCourseProgression([], 10, "2026-10-15");
    expect(progression.totalHoursInScope).toBe(0);
    expect(progression.coveredHours).toBe(0);
    expect(progression.coveragePercentage).toBe(0);
    expect(progression.remainingHours).toBe(0);
    expect(progression.bufferRatio).toBe(999.99);
    expect(progression.status).toBe("COMPLETE");
  });

  it("safely handles zero remaining hours without Infinity or NaN", () => {
    const ratio = calculateBufferRatio(10, 0);
    expect(ratio).toBe(999.99);
    expect(isFinite(ratio)).toBe(true);
    expect(determineStatus(ratio, 0)).toBe("COMPLETE");
  });

  it("safely handles zero available hours or missing target dates", () => {
    // 0 available hours with 5 remaining hours -> 0.00 buffer ratio and DANGER
    const ratio = calculateBufferRatio(0, 5);
    expect(ratio).toBe(0.0);
    expect(determineStatus(ratio, 5)).toBe("DANGER");

    // NaN / undefined safe guard
    const ratioNaN = calculateBufferRatio(NaN, 5);
    expect(ratioNaN).toBe(0.0);
    expect(determineStatus(ratioNaN, 5)).toBe("DANGER");
  });

  it("determines status from buffer ratio according to MSOT thresholds", () => {
    // >= 1.15 ON TRACK
    expect(determineStatus(1.15, 10)).toBe("ON_TRACK");
    expect(determineStatus(1.3, 10)).toBe("ON_TRACK");

    // 1.00 - 1.149 TIGHT
    expect(determineStatus(1.14, 10)).toBe("TIGHT");
    expect(determineStatus(1.0, 10)).toBe("TIGHT");

    // < 1.00 DANGER
    expect(determineStatus(0.99, 10)).toBe("DANGER");
    expect(determineStatus(0.5, 10)).toBe("DANGER");

    // 0 remaining hours = COMPLETE
    expect(determineStatus(0.5, 0)).toBe("COMPLETE");
  });

  it("calculates buffer ratio accurately", () => {
    expect(calculateBufferRatio(15, 10)).toBe(1.5);
    expect(calculateBufferRatio(10, 10)).toBe(1.0);
    expect(calculateBufferRatio(8, 10)).toBe(0.8);
  });
});

describe("Hand-calculated Spreadsheet Verification (3 Subjects Benchmark)", () => {
  // Subject 1: Data Structures (On Track)
  it("matches benchmark for Subject 1 - Data Structures (On Track)", () => {
    const topics: TopicProgressInput[] = [
      { id: "ds-1", plannedHours: 2.0, status: "COMPLETED", percentComplete: 100, plannedDate: "2026-09-01" },
      { id: "ds-2", plannedHours: 2.0, status: "COMPLETED", percentComplete: 100, plannedDate: "2026-09-03" },
      { id: "ds-3", plannedHours: 1.5, status: "IN_PROGRESS", percentComplete: 80, plannedDate: "2026-09-08" },
      { id: "ds-4", plannedHours: 2.5, status: "IN_PROGRESS", percentComplete: 0, plannedDate: "2026-09-15" },
    ];
    // Scope: 2 + 2 + 1.5 + 2.5 = 8.0 hrs
    // Covered: 2 + 2 + (1.5 * 0.8 = 1.2) = 5.2 hrs
    // Remaining: 8.0 - 5.2 = 2.8 hrs
    // Available: 3.5 hrs
    // Buffer ratio: 3.5 / 2.8 = 1.25 (>= 1.15 -> ON_TRACK)
    // Planned by today (2026-09-10): ds-1 (2.0) + ds-2 (2.0) + ds-3 (1.5) = 5.5 hrs
    // Pace vs plan: 5.2 - 5.5 = -0.30 hrs (behind by 0.3 hrs)
    const metrics = calculateCourseProgression(topics, 3.5, "2026-09-10");

    expect(metrics.totalHoursInScope).toBe(8.0);
    expect(metrics.coveredHours).toBe(5.2);
    expect(metrics.coveragePercentage).toBe(65.0);
    expect(metrics.remainingHours).toBe(2.8);
    expect(metrics.bufferRatio).toBe(1.25);
    expect(metrics.status).toBe("ON_TRACK");
    expect(metrics.paceVsPlanHours).toBe(-0.3);
    expect(metrics.overdueTopicsCount).toBe(1); // ds-3 was planned for Sep 8, only 80% complete
  });

  // Subject 2: Computer Networks (Tight)
  it("matches benchmark for Subject 2 - Computer Networks (Tight)", () => {
    const topics: TopicProgressInput[] = [
      { id: "cn-1", plannedHours: 3.0, status: "COMPLETED", percentComplete: 100, plannedDate: "2026-09-02" },
      { id: "cn-2", plannedHours: 3.0, status: "IN_PROGRESS", percentComplete: 50, plannedDate: "2026-09-09" },
      { id: "cn-3", plannedHours: 4.0, status: "IN_PROGRESS", percentComplete: 0, plannedDate: "2026-09-16" },
    ];
    // Scope: 3 + 3 + 4 = 10.0 hrs
    // Covered: 3 + 1.5 = 4.5 hrs
    // Remaining: 10.0 - 4.5 = 5.5 hrs
    // Available: 5.78 hrs
    // Buffer ratio: 5.78 / 5.5 = 1.05 -> TIGHT
    // Planned by today (2026-09-10): cn-1 (3.0) + cn-2 (3.0) = 6.0 hrs
    // Pace vs plan: 4.5 - 6.0 = -1.50 hrs
    const metrics = calculateCourseProgression(topics, 5.78, "2026-09-10");

    expect(metrics.totalHoursInScope).toBe(10.0);
    expect(metrics.coveredHours).toBe(4.5);
    expect(metrics.coveragePercentage).toBe(45.0);
    expect(metrics.remainingHours).toBe(5.5);
    expect(metrics.bufferRatio).toBe(1.05);
    expect(metrics.status).toBe("TIGHT");
    expect(metrics.paceVsPlanHours).toBe(-1.5);
    expect(metrics.overdueTopicsCount).toBe(1); // cn-2 planned for Sep 9, only 50% complete
  });

  // Subject 3: Operating Systems (Danger)
  it("matches benchmark for Subject 3 - Operating Systems (Danger)", () => {
    const topics: TopicProgressInput[] = [
      { id: "os-1", plannedHours: 2.0, status: "COMPLETED", percentComplete: 100, plannedDate: "2026-09-01" },
      { id: "os-2", plannedHours: 2.0, status: "IN_PROGRESS", percentComplete: 20, plannedDate: "2026-09-05" },
      { id: "os-3", plannedHours: 6.0, status: "IN_PROGRESS", percentComplete: 0, plannedDate: "2026-09-12" },
    ];
    // Scope: 10.0 hrs
    // Covered: 2 + 0.4 = 2.4 hrs
    // Remaining: 7.6 hrs
    // Available: 6.0 hrs
    // Buffer ratio: 6.0 / 7.6 = 0.79 -> DANGER
    // Planned by today (2026-09-10): os-1 (2.0) + os-2 (2.0) = 4.0 hrs
    // Pace vs plan: 2.4 - 4.0 = -1.60 hrs
    const metrics = calculateCourseProgression(topics, 6.0, "2026-09-10");

    expect(metrics.totalHoursInScope).toBe(10.0);
    expect(metrics.coveredHours).toBe(2.4);
    expect(metrics.coveragePercentage).toBe(24.0);
    expect(metrics.remainingHours).toBe(7.6);
    expect(metrics.bufferRatio).toBe(0.79);
    expect(metrics.status).toBe("DANGER");
    expect(metrics.paceVsPlanHours).toBe(-1.6);
    expect(metrics.overdueTopicsCount).toBe(1); // os-2 planned for Sep 5, only 20% complete
  });
});

describe("Overdue Topics Engine", () => {
  it("identifies overdue topics correctly and ignores completed and skipped topics", () => {
    const topics = [
      // Past date, 100% complete -> NOT overdue
      { id: "t1", plannedHours: 2, status: "COMPLETED", percentComplete: 100, plannedDate: "2026-10-01" },
      // Past date, percentComplete 100 but status IN_PROGRESS -> NOT overdue
      { id: "t2", plannedHours: 2, status: "IN_PROGRESS", percentComplete: 100, plannedDate: "2026-10-05" },
      // Past date, 50% complete -> OVERDUE
      { id: "t3", plannedHours: 2, status: "IN_PROGRESS", percentComplete: 50, plannedDate: "2026-10-10" },
      // Past date, SKIPPED -> NOT overdue (excluded)
      { id: "t4", plannedHours: 2, status: "SKIPPED", percentComplete: 0, plannedDate: "2026-10-08" },
      // Future date, 0% complete -> NOT overdue
      { id: "t5", plannedHours: 2, status: "IN_PROGRESS", percentComplete: 0, plannedDate: "2026-10-25" },
    ];

    const today = "2026-10-15";
    const result = getOverdueTopics(topics, today);
    expect(result.count).toBe(1);
    expect(result.overdueTopicIds).toEqual(["t3"]);
    expect(countOverdueTopics(topics, today)).toBe(1);
  });
});

describe("Calendar Working Rules & 2nd/4th Saturday Logic", () => {
  it("correctly identifies 2nd and 4th Saturdays across 3 calendar months (Oct, Nov, Dec 2026)", () => {
    // October 2026:
    // Oct 1 is Thursday
    // 1st Saturday: Oct 3 (day 3 -> ceil(3/7) = 1) -> Non-working
    // 2nd Saturday: Oct 10 (day 10 -> ceil(10/7) = 2) -> Working!
    // 3rd Saturday: Oct 17 (day 17 -> ceil(17/7) = 3) -> Non-working
    // 4th Saturday: Oct 24 (day 24 -> ceil(24/7) = 4) -> Working!
    // 5th Saturday: Oct 31 (day 31 -> ceil(31/7) = 5) -> Non-working
    expect(isSaturdayWorking(new Date("2026-10-03"), "SECOND_FOURTH")).toBe(false);
    expect(isSaturdayWorking(new Date("2026-10-10"), "SECOND_FOURTH")).toBe(true);
    expect(isSaturdayWorking(new Date("2026-10-17"), "SECOND_FOURTH")).toBe(false);
    expect(isSaturdayWorking(new Date("2026-10-24"), "SECOND_FOURTH")).toBe(true);
    expect(isSaturdayWorking(new Date("2026-10-31"), "SECOND_FOURTH")).toBe(false);

    // November 2026:
    // Nov 1 is Sunday
    // 1st Saturday: Nov 7 -> Non-working
    // 2nd Saturday: Nov 14 -> Working!
    // 3rd Saturday: Nov 21 -> Non-working
    // 4th Saturday: Nov 28 -> Working!
    expect(isSaturdayWorking(new Date("2026-11-07"), "SECOND_FOURTH")).toBe(false);
    expect(isSaturdayWorking(new Date("2026-11-14"), "SECOND_FOURTH")).toBe(true);
    expect(isSaturdayWorking(new Date("2026-11-21"), "SECOND_FOURTH")).toBe(false);
    expect(isSaturdayWorking(new Date("2026-11-28"), "SECOND_FOURTH")).toBe(true);

    // December 2026:
    // Dec 1 is Tuesday
    // 1st Saturday: Dec 5 -> Non-working
    // 2nd Saturday: Dec 12 -> Working!
    // 3rd Saturday: Dec 19 -> Non-working
    // 4th Saturday: Dec 26 -> Working!
    expect(isSaturdayWorking(new Date("2026-12-05"), "SECOND_FOURTH")).toBe(false);
    expect(isSaturdayWorking(new Date("2026-12-12"), "SECOND_FOURTH")).toBe(true);
    expect(isSaturdayWorking(new Date("2026-12-19"), "SECOND_FOURTH")).toBe(false);
    expect(isSaturdayWorking(new Date("2026-12-26"), "SECOND_FOURTH")).toBe(true);
  });

  it("respects SaturdayRule.ALL and SaturdayRule.NONE", () => {
    const testSat = new Date("2026-10-03");
    expect(isSaturdayWorking(testSat, "ALL")).toBe(true);
    expect(isSaturdayWorking(testSat, "NONE")).toBe(false);
  });

  it("correctly identifies instructional days skipping Sundays and holidays", () => {
    const holidays = new Set(["2026-10-02"]); // Gandhi Jayanti
    expect(isInstructionalWorkingDay(new Date("2026-10-02"), "NONE", holidays)).toBe(false); // Holiday
    expect(isInstructionalWorkingDay(new Date("2026-10-04"), "NONE", holidays)).toBe(false); // Sunday
    expect(isInstructionalWorkingDay(new Date("2026-10-05"), "NONE", holidays)).toBe(true); // Monday
  });

  it("calculates available teaching hours across weeks based on timetable schedule", () => {
    // Schedule: Monday (1) = 2 hrs, Wednesday (3) = 2 hrs, Friday (5) = 2 hrs
    const schedule = { 1: 2, 3: 2, 5: 2 };
    // Week of Oct 5 (Mon) to Oct 9 (Fri) = 6 hours
    const hours = calculateAvailableTeachingHours(
      "2026-10-05",
      "2026-10-09",
      schedule,
      "NONE",
      []
    );
    expect(hours).toBe(6.0);
  });

  it("calculates available hours directly from scheduled sessions filtering cancelled/skipped", () => {
    const sessions = [
      { session_date: "2026-10-10", duration_hours: 1.5, occurrence_status: "SCHEDULED" },
      { session_date: "2026-10-12", duration_hours: 1.5, occurrence_status: "CANCELLED" }, // Cancelled
      { session_date: "2026-10-14", duration_hours: 1.5, occurrence_status: "SKIPPED" },   // Skipped
      { session_date: "2026-10-16", duration_hours: 2.0, occurrence_status: "SCHEDULED" },
      { session_date: "2026-10-25", duration_hours: 2.0, occurrence_status: "SCHEDULED" }, // Outside range (target is 2026-10-20)
    ];

    const available = calculateAvailableHoursFromScheduledSessions(
      sessions,
      "2026-10-10",
      "2026-10-20"
    );

    // Only 2026-10-10 (1.5) and 2026-10-16 (2.0) are valid
    expect(available).toBe(3.5);
  });

  it("shifts later planned dates when a holiday is inserted", () => {
    const topics = [
      { id: "t1", plannedHours: 2.0 },
      { id: "t2", plannedHours: 2.0 },
      { id: "t3", plannedHours: 2.0 },
    ];
    // Schedule: 2 hours every weekday (Mon-Fri)
    const schedule = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 };

    // Baseline without holiday (Starts Monday 2026-10-05)
    // t1 -> Mon 2026-10-05
    // t2 -> Tue 2026-10-06
    // t3 -> Wed 2026-10-07
    const datesWithoutHoliday = schedulePlannedDatesForTopics(
      topics,
      "2026-10-05",
      "2026-10-20",
      schedule,
      "NONE",
      []
    );
    expect(datesWithoutHoliday.get("t1")).toBe("2026-10-05");
    expect(datesWithoutHoliday.get("t2")).toBe("2026-10-06");
    expect(datesWithoutHoliday.get("t3")).toBe("2026-10-07");

    // Adding holiday on Tuesday 2026-10-06:
    // t1 remains Mon 2026-10-05
    // t2 shifts to Wed 2026-10-07
    // t3 shifts to Thu 2026-10-08
    const datesWithHoliday = schedulePlannedDatesForTopics(
      topics,
      "2026-10-05",
      "2026-10-20",
      schedule,
      "NONE",
      ["2026-10-06"]
    );
    expect(datesWithHoliday.get("t1")).toBe("2026-10-05");
    expect(datesWithHoliday.get("t2")).toBe("2026-10-07");
    expect(datesWithHoliday.get("t3")).toBe("2026-10-08");
  });
});

describe("Exam Readiness and Multi-Exam Independence", () => {
  it("computes exam readiness % and hours still needed for mid-term scope", () => {
    const midTermScope: ExamType[] = ["MID_TERM", "END_TERM"];
    const endTermScope: ExamType[] = ["END_TERM"];

    const topics = [
      { id: "t1", plannedHours: 2.0, status: "COMPLETED", percentComplete: 100, inScopeForExams: midTermScope },
      { id: "t2", plannedHours: 3.0, status: "IN_PROGRESS", percentComplete: 50, inScopeForExams: midTermScope },
      { id: "t3", plannedHours: 4.0, status: "IN_PROGRESS", percentComplete: 0, inScopeForExams: endTermScope },
    ];

    const midTermReadiness = calculateExamReadiness(
      "MID_TERM",
      "Mid-Term Examination",
      "2026-10-25",
      topics,
      2.0 // 2.0 hours capacity available before mid-term
    );

    // In-scope for mid term: t1 (2.0) + t2 (3.0) = 5.0 hours
    // Covered: 2.0 + (3.0 * 0.5 = 1.5) = 3.5 hours
    // Remaining hours needed: 5.0 - 3.5 = 1.5 hours
    // Readiness: (3.5 / 5.0) * 100 = 70.0%
    // Capacity before exam: 2.0 >= 1.5 needed -> ON_TRACK
    expect(midTermReadiness.totalInScopeHours).toBe(5.0);
    expect(midTermReadiness.coveredInScopeHours).toBe(3.5);
    expect(midTermReadiness.remainingHoursNeeded).toBe(1.5);
    expect(midTermReadiness.readinessPercentage).toBe(70.0);
    expect(midTermReadiness.availableHoursBeforeExam).toBe(2.0);
    expect(midTermReadiness.readinessStatus).toBe("ON_TRACK");
    expect(midTermReadiness.isReady).toBe(false);

    // Now evaluate END_TERM independently
    const endTermReadiness = calculateExamReadiness(
      "END_TERM",
      "End-Term Examination",
      "2026-12-15",
      topics,
      6.0
    );
    // In-scope for end term: t1 (2.0) + t2 (3.0) + t3 (4.0) = 9.0 hours
    // Covered: 3.5 hours
    // Remaining needed: 5.5 hours
    // Readiness: (3.5 / 9.0) * 100 = 38.89%
    expect(endTermReadiness.totalInScopeHours).toBe(9.0);
    expect(endTermReadiness.coveredInScopeHours).toBe(3.5);
    expect(endTermReadiness.remainingHoursNeeded).toBe(5.5);
    expect(endTermReadiness.readinessPercentage).toBe(38.89);
    expect(endTermReadiness.readinessStatus).toBe("ON_TRACK"); // 6.0 >= 5.5
  });

  it("classifies exam as AT_RISK when remaining hours exceed available capacity before exam deadline", () => {
    const topics = [
      { id: "t1", plannedHours: 4.0, status: "IN_PROGRESS", percentComplete: 25, inScopeForExams: ["MID_TERM" as ExamType] },
    ];
    // In scope: 4.0, Covered: 1.0, Remaining needed: 3.0
    // Capacity before exam is only 1.5 hours (< 3.0 needed) -> AT_RISK
    const readiness = calculateExamReadiness(
      "MID_TERM",
      "Mid-Term Exam",
      "2026-10-20",
      topics,
      1.5
    );
    expect(readiness.remainingHoursNeeded).toBe(3.0);
    expect(readiness.readinessStatus).toBe("AT_RISK");

    // Changing exam deadline: if exam date is extended and capacity becomes 4.0 hours:
    const extendedReadiness = calculateExamReadiness(
      "MID_TERM",
      "Mid-Term Exam (Extended)",
      "2026-10-30",
      topics,
      4.0
    );
    expect(extendedReadiness.readinessStatus).toBe("ON_TRACK");
  });

  it("classifies exam as READY when all in-scope topics are 100% complete", () => {
    const topics = [
      { id: "t1", plannedHours: 4.0, status: "COMPLETED", percentComplete: 100, inScopeForExams: ["MID_TERM" as ExamType] },
    ];
    const readiness = calculateExamReadiness(
      "MID_TERM",
      "Mid-Term Exam",
      "2026-10-20",
      topics,
      0
    );
    expect(readiness.remainingHoursNeeded).toBe(0);
    expect(readiness.readinessPercentage).toBe(100);
    expect(readiness.readinessStatus).toBe("READY");
    expect(readiness.isReady).toBe(true);
  });
});

describe("Track & Campus Status Rollup (Worst-Status Principle)", () => {
  it("rolls up track status showing the worst subject rather than an average", () => {
    const subjectMetrics: CourseProgressionMetrics[] = [
      {
        totalHoursInScope: 10,
        coveredHours: 8,
        coveragePercentage: 80,
        remainingHours: 2,
        availableHoursTillDeadline: 5,
        bufferRatio: 2.5,
        status: "ON_TRACK",
        paceVsPlanHours: 0,
        overdueTopicsCount: 0,
      },
      {
        totalHoursInScope: 10,
        coveredHours: 6.5,
        coveragePercentage: 65,
        remainingHours: 3.5,
        availableHoursTillDeadline: 3.8,
        bufferRatio: 1.08,
        status: "TIGHT",
        paceVsPlanHours: -1,
        overdueTopicsCount: 0,
      },
      {
        totalHoursInScope: 10,
        coveredHours: 3,
        coveragePercentage: 30,
        remainingHours: 7,
        availableHoursTillDeadline: 4,
        bufferRatio: 0.57,
        status: "DANGER",
        paceVsPlanHours: -3,
        overdueTopicsCount: 1,
      },
    ];

    const rollup = rollUpTrackProgress("Mirai Track", subjectMetrics);
    expect(rollup.worstStatus).toBe("DANGER");
    expect(rollup.dangerSubjectsCount).toBe(1);
    expect(rollup.tightSubjectsCount).toBe(1);
    expect(rollup.onTrackSubjectsCount).toBe(1);
    expect(rollup.averageCoveragePercentage).toBe(58.33); // (80 + 65 + 30) / 3
  });

  it("rolls up campus status showing the worst track status without averaging", () => {
    const track1 = rollUpTrackProgress("Track Alpha (All On Track)", [
      {
        totalHoursInScope: 10,
        coveredHours: 9,
        coveragePercentage: 90,
        remainingHours: 1,
        availableHoursTillDeadline: 3,
        bufferRatio: 3.0,
        status: "ON_TRACK",
        paceVsPlanHours: 1,
        overdueTopicsCount: 0,
      },
    ]);
    expect(track1.worstStatus).toBe("ON_TRACK");

    const track2 = rollUpTrackProgress("Track Beta (One Tight)", [
      {
        totalHoursInScope: 10,
        coveredHours: 5,
        coveragePercentage: 50,
        remainingHours: 5,
        availableHoursTillDeadline: 5.2,
        bufferRatio: 1.04,
        status: "TIGHT",
        paceVsPlanHours: 0,
        overdueTopicsCount: 0,
      },
    ]);
    expect(track2.worstStatus).toBe("TIGHT");

    // Campus with Alpha and Beta -> worst is TIGHT
    const campusSummaryTight = rollUpCampusProgress("Bangalore Campus", [track1, track2]);
    expect(campusSummaryTight.worstStatus).toBe("TIGHT");

    const track3 = rollUpTrackProgress("Track Gamma (One Danger)", [
      {
        totalHoursInScope: 10,
        coveredHours: 2,
        coveragePercentage: 20,
        remainingHours: 8,
        availableHoursTillDeadline: 4,
        bufferRatio: 0.5,
        status: "DANGER",
        paceVsPlanHours: -2,
        overdueTopicsCount: 1,
      },
    ]);

    // Campus with Alpha, Beta and Gamma -> worst is DANGER
    const campusSummaryDanger = rollUpCampusProgress("Bangalore Campus", [track1, track2, track3]);
    expect(campusSummaryDanger.worstStatus).toBe("DANGER");
    expect(campusSummaryDanger.totalTracks).toBe(3);
    expect(campusSummaryDanger.totalSubjects).toBe(3);
  });
});

describe("Server-Side Data Retrieval & Progression Calculation", () => {
  it("queries mock database store and produces complete traceable metrics", () => {
    const mockStore: ProgressionDataStore = {
      getSubjects: (): DbSubject[] => [
        {
          id: "sub-101",
          code: "CS201",
          name: "Algorithms & Problem Solving",
          department: "Computer Science",
          credit_hours: 4,
          total_planned_hours: 11.0,
          syllabus_version: "2026.1",
          created_at: "2026-08-01T00:00:00Z",
        },
      ],
      getBatches: (): DbBatch[] => [
        {
          id: "batch-201",
          campus_id: "camp-1",
          track_id: "track-1",
          semester_id: "sem-1",
          name: "Alpha 2026",
          section: "A",
          intake_year: 2026,
          student_count: 45,
          created_at: "2026-08-01T00:00:00Z",
        },
      ],
      getBatchSubjects: () => [
        {
          id: "bs-301",
          batch_id: "batch-201",
          subject_id: "sub-101",
          target_finish_date: "2026-11-30",
        },
      ],
      getTopics: (subjectId: string): DbSyllabusTopic[] => {
        expect(subjectId).toBe("sub-101");
        return [
          {
            id: "top-1",
            unit_id: "u-1",
            subject_id: "sub-101",
            sequence_order: 1,
            title: "Divide & Conquer",
            planned_hours: 3.0,
            planned_date: "2026-09-10",
            status: "COMPLETED",
            percent_complete: 100,
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          },
          {
            id: "top-2",
            unit_id: "u-1",
            subject_id: "sub-101",
            sequence_order: 2,
            title: "Dynamic Programming",
            planned_hours: 4.0,
            planned_date: "2026-10-10",
            status: "IN_PROGRESS",
            percent_complete: 50, // 2.0 hrs covered
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          },
          {
            id: "top-3",
            unit_id: "u-1",
            subject_id: "sub-101",
            sequence_order: 3,
            title: "Greedy Algorithms",
            planned_hours: 2.0,
            planned_date: "2026-11-15",
            status: "IN_PROGRESS",
            percent_complete: 0,
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          },
          {
            id: "top-4",
            unit_id: "u-1",
            subject_id: "sub-101",
            sequence_order: 4,
            title: "Optional Advanced Heuristics",
            planned_hours: 2.0,
            planned_date: "2026-11-25",
            status: "SKIPPED", // Excluded from scope
            percent_complete: 0,
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
          },
        ];
      },
      getScheduledSessions: (batchSubjectId: string): DbScheduledSession[] => [
        // Before currentDate (already occurred)
        {
          id: "sess-1",
          batch_subject_id: batchSubjectId,
          faculty_id: "fac-1",
          session_date: "2026-10-01",
          start_time: "09:00",
          end_time: "11:00",
          duration_hours: 2.0,
          occurrence_status: "COMPLETED",
          created_at: "2026-08-01T00:00:00Z",
        },
        // Remaining future sessions
        {
          id: "sess-2",
          batch_subject_id: batchSubjectId,
          faculty_id: "fac-1",
          session_date: "2026-10-20",
          start_time: "09:00",
          end_time: "11:00",
          duration_hours: 2.0,
          occurrence_status: "SCHEDULED",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "sess-3",
          batch_subject_id: batchSubjectId,
          faculty_id: "fac-1",
          session_date: "2026-10-25",
          start_time: "09:00",
          end_time: "11:00",
          duration_hours: 2.0,
          occurrence_status: "SCHEDULED",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "sess-4",
          batch_subject_id: batchSubjectId,
          faculty_id: "fac-1",
          session_date: "2026-11-05",
          start_time: "09:00",
          end_time: "11:00",
          duration_hours: 2.0,
          occurrence_status: "CANCELLED", // Cancelled session
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "sess-5",
          batch_subject_id: batchSubjectId,
          faculty_id: "fac-1",
          session_date: "2026-11-10",
          start_time: "09:00",
          end_time: "10:30",
          duration_hours: 1.5,
          occurrence_status: "SCHEDULED",
          created_at: "2026-08-01T00:00:00Z",
        },
      ],
      getExamWindows: (semesterId: string): DbExamWindow[] => [
        {
          id: "ew-1",
          semester_id: semesterId,
          name: "Mid-Term Examination",
          exam_type: "MID_TERM",
          start_date: "2026-10-31",
          end_date: "2026-11-05",
          weightage_percent: 30,
          created_at: "2026-08-01T00:00:00Z",
        },
      ],
      getCalendarEvents: () => [],
      getTopicExamScopes: (subjectId: string) => {
        expect(subjectId).toBe("sub-101");
        return [
          { topic_id: "top-1", exam_type: "MID_TERM" },
          { topic_id: "top-2", exam_type: "MID_TERM" },
          { topic_id: "top-3", exam_type: "END_TERM" },
        ];
      },
    };

    const result = calculateSubjectProgressionServer(
      "sub-101",
      "batch-201",
      "2026-10-15",
      mockStore
    );

    // In-scope: top-1 (3.0) + top-2 (4.0) + top-3 (2.0) = 9.0 hrs (top-4 is skipped)
    expect(result.metrics.totalHoursInScope).toBe(9.0);
    // Covered: top-1 (3.0) + top-2 (4.0 * 0.5 = 2.0) = 5.0 hrs
    expect(result.metrics.coveredHours).toBe(5.0);
    // Remaining: 9.0 - 5.0 = 4.0 hrs
    expect(result.metrics.remainingHours).toBe(4.0);
    // Coverage: 5.0 / 9.0 = 55.56%
    expect(result.metrics.coveragePercentage).toBe(55.56);

    // Available hours between 2026-10-15 and 2026-11-30:
    // sess-2 (2.0) + sess-3 (2.0) + sess-5 (1.5) = 5.5 hrs (sess-4 cancelled)
    expect(result.metrics.availableHoursTillDeadline).toBe(5.5);
    // Buffer ratio: 5.5 / 4.0 = 1.38 (>= 1.15 -> ON_TRACK)
    expect(result.metrics.bufferRatio).toBe(1.38);
    expect(result.metrics.status).toBe("ON_TRACK");

    // Overdue topics: top-2 was planned for 2026-10-10, only 50% complete today (2026-10-15)
    expect(result.metrics.overdueTopicsCount).toBe(1);
    expect(result.traceability.overdueTopicTitles).toEqual(["Dynamic Programming"]);

    // Traceability checks
    expect(result.traceability.totalTopics).toBe(4);
    expect(result.traceability.inScopeTopics).toBe(3);
    expect(result.traceability.completedTopics).toBe(1);
    expect(result.traceability.inProgressTopics).toBe(1);
    expect(result.traceability.skippedTopics).toBe(1);
    expect(result.traceability.availableScheduledOccurrences).toBe(3); // sess-2, sess-3, sess-5

    // Exam readiness for Mid-Term:
    // In-scope: top-1 (3.0) + top-2 (4.0) = 7.0 hrs
    // Covered: 3.0 + 2.0 = 5.0 hrs
    // Remaining needed: 2.0 hrs
    // Capacity before mid-term (2026-10-31): sess-2 (2.0) + sess-3 (2.0) = 4.0 hrs
    // Capacity (4.0) >= remaining (2.0) -> ON_TRACK
    expect(result.examReadiness.length).toBe(1);
    expect(result.examReadiness[0].totalInScopeHours).toBe(7.0);
    expect(result.examReadiness[0].coveredInScopeHours).toBe(5.0);
    expect(result.examReadiness[0].remainingHoursNeeded).toBe(2.0);
    expect(result.examReadiness[0].availableHoursBeforeExam).toBe(4.0);
    expect(result.examReadiness[0].readinessStatus).toBe("ON_TRACK");
  });
});

describe("Missed-Log Alerts & Escalation Engine", () => {
  it("triggers faculty reminder at 24h and escalates to Campus Manager after 48h", () => {
    const sessions = [
      {
        timetableSlotId: "slot-1",
        subjectId: "sub-1",
        subjectName: "Data Structures",
        facultyId: "fac-1",
        facultyName: "Prof. Sharma",
        facultyEmail: "sharma@msot.org",
        campusManagerId: "cm-1",
        campusManagerEmail: "cm.hitech@msot.org",
        scheduledDateIso: "2026-10-10",
        isLogged: false,
      },
      {
        timetableSlotId: "slot-2",
        subjectId: "sub-2",
        subjectName: "Operating Systems",
        facultyId: "fac-2",
        facultyName: "Prof. Verma",
        facultyEmail: "verma@msot.org",
        campusManagerId: "cm-1",
        campusManagerEmail: "cm.hitech@msot.org",
        scheduledDateIso: "2026-10-12",
        isLogged: false,
      },
      {
        timetableSlotId: "slot-3",
        subjectId: "sub-3",
        subjectName: "Computer Networks",
        facultyId: "fac-1",
        facultyName: "Prof. Sharma",
        facultyEmail: "sharma@msot.org",
        campusManagerId: "cm-1",
        campusManagerEmail: "cm.hitech@msot.org",
        scheduledDateIso: "2026-10-12",
        isLogged: true, // Already logged
      },
    ];

    // Current time: 2026-10-13 12:00:00 (Oct 10 session is ~60h delayed -> Escalated; Oct 12 session is ~12h after day end -> Faculty Reminder)
    const { alerts, notificationsToSend } = evaluateMissedSessions(
      sessions,
      "2026-10-13T12:00:00Z"
    );

    // sub-3 is logged, so only 2 alerts
    expect(alerts.length).toBe(2);

    const alertOct10 = alerts.find((a: MissedLogAlert) => a.subjectId === "sub-1");
    expect(alertOct10?.escalatedToCampusManager).toBe(true);
    expect(alertOct10?.status).toBe("ESCALATED_CM");

    const alertOct12 = alerts.find((a: MissedLogAlert) => a.subjectId === "sub-2");
    expect(alertOct12?.escalatedToCampusManager).toBe(false);
    expect(alertOct12?.status).toBe("PENDING_FACULTY");

    // Notifications check:
    const cmNotif = notificationsToSend.find(
      (n: AlertNotificationPayload) => n.recipientRole === "campus_manager"
    );
    expect(cmNotif?.recipientEmail).toBe("cm.hitech@msot.org");
    expect(cmNotif?.escalated).toBe(true);

    const facNotif = notificationsToSend.find(
      (n: AlertNotificationPayload) => n.recipientRole === "faculty"
    );
    expect(facNotif?.recipientEmail).toBe("verma@msot.org");
    expect(facNotif?.escalated).toBe(false);
  });
});

