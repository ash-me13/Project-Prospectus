import { describe, it, expect } from "vitest";
import {
  calculateHoursInScope,
  calculateCoveredHours,
  calculateCoveragePercentage,
  calculateBufferRatio,
  determineStatus,
  calculateCourseProgression,
  isSaturdayWorking,
  isInstructionalWorkingDay,
  calculateAvailableTeachingHours,
  schedulePlannedDatesForTopics,
  calculateExamReadiness,
  rollUpTrackProgress,
} from "../../src/domain/calculation-engine";
import {
  TopicProgressInput,
  CourseProgressionMetrics,
  ExamType,
  MissedLogAlert,
} from "../../src/types/academic";
import {
  evaluateMissedSessions,
  AlertNotificationPayload,
} from "../../src/notifications/alerts";

describe("Academic Calculation Engine - Core Metrics", () => {
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
    const metrics = calculateCourseProgression(topics, 3.5, "2026-09-10");

    expect(metrics.totalHoursInScope).toBe(8.0);
    expect(metrics.coveredHours).toBe(5.2);
    expect(metrics.coveragePercentage).toBe(65.0);
    expect(metrics.remainingHours).toBe(2.8);
    expect(metrics.bufferRatio).toBe(1.25);
    expect(metrics.status).toBe("ON_TRACK");
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
    const metrics = calculateCourseProgression(topics, 5.78, "2026-09-10");

    expect(metrics.totalHoursInScope).toBe(10.0);
    expect(metrics.coveredHours).toBe(4.5);
    expect(metrics.coveragePercentage).toBe(45.0);
    expect(metrics.remainingHours).toBe(5.5);
    expect(metrics.bufferRatio).toBe(1.05);
    expect(metrics.status).toBe("TIGHT");
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
    const metrics = calculateCourseProgression(topics, 6.0, "2026-09-10");

    expect(metrics.totalHoursInScope).toBe(10.0);
    expect(metrics.coveredHours).toBe(2.4);
    expect(metrics.coveragePercentage).toBe(24.0);
    expect(metrics.remainingHours).toBe(7.6);
    expect(metrics.bufferRatio).toBe(0.79);
    expect(metrics.status).toBe("DANGER");
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

describe("Exam Readiness and Track Rollup", () => {
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
      topics
    );

    // In-scope for mid term: t1 (2.0) + t2 (3.0) = 5.0 hours
    // Covered: 2.0 + (3.0 * 0.5 = 1.5) = 3.5 hours
    // Remaining hours needed: 5.0 - 3.5 = 1.5 hours
    // Readiness: (3.5 / 5.0) * 100 = 70.0%
    expect(midTermReadiness.totalInScopeHours).toBe(5.0);
    expect(midTermReadiness.coveredInScopeHours).toBe(3.5);
    expect(midTermReadiness.remainingHoursNeeded).toBe(1.5);
    expect(midTermReadiness.readinessPercentage).toBe(70.0);
    expect(midTermReadiness.isReady).toBe(false);
  });

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
