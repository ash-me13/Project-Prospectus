import { describe, it, expect } from "vitest";
import {
  calculateSlotDurationHours,
  doTimesOverlap,
  doDateRangesOverlap,
  validateTimetableSlotConflicts,
  generateDatedOccurrences,
  planSyllabusTopicDates,
} from "../../src/domain/planning-engine";
import {
  DbTimetableSlot,
  DbSyllabusTopic,
  DbCalendarEvent,
  DbTopicExamScope,
} from "../../src/types/database";
import { isolatedDataStore } from "../../src/lib/database/service";
import { AuthenticatedUser } from "../../src/auth/authorization";

describe("Planning Engine & Timetable Setup", () => {
  describe("Duration Calculation Precision", () => {
    it("derives exact hours from slot duration and never rounds 50 minutes to 1 hour", () => {
      // 50 minutes session: 09:00 to 09:50
      const duration50m = calculateSlotDurationHours("09:00", "09:50");
      expect(duration50m).toBe(0.8333);
      expect(duration50m).not.toBe(1.0);
      expect(duration50m).toBeCloseTo(50 / 60, 4);

      // 45 minutes session: 10:00 to 10:45
      const duration45m = calculateSlotDurationHours("10:00", "10:45");
      expect(duration45m).toBe(0.75);

      // 60 minutes session: 10:00 to 11:00
      const duration60m = calculateSlotDurationHours("10:00", "11:00");
      expect(duration60m).toBe(1.0);

      // 90 minutes session: 10:00 to 11:30
      const duration90m = calculateSlotDurationHours("10:00", "11:30");
      expect(duration90m).toBe(1.5);

      // 120 minutes lab: 14:00 to 16:00
      const duration120m = calculateSlotDurationHours("14:00", "16:00");
      expect(duration120m).toBe(2.0);
    });
  });

  describe("Time and Date Overlap Utilities", () => {
    it("detects overlapping and disjoint time ranges", () => {
      expect(doTimesOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
      expect(doTimesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false); // Back-to-back is allowed
      expect(doTimesOverlap("10:00", "11:00", "09:00", "10:00")).toBe(false);
      expect(doTimesOverlap("09:00", "11:00", "09:30", "10:30")).toBe(true);
    });

    it("evaluates effective date range overlaps accurately", () => {
      // Overlapping ranges
      expect(doDateRangesOverlap("2026-08-01", "2026-10-31", "2026-10-01", "2026-12-15")).toBe(true);
      // Disjoint ranges
      expect(doDateRangesOverlap("2026-08-01", "2026-09-30", "2026-10-01", "2026-12-15")).toBe(false);
      // Open-ended unbounded ranges
      expect(doDateRangesOverlap(null, null, "2026-10-01", "2026-12-15")).toBe(true);
    });
  });

  describe("Timetable Conflict Validation & Overrides", () => {
    const existingSlots: DbTimetableSlot[] = [
      {
        id: "slot-1",
        batch_subject_id: "bs-1", // Batch 1, Subject A
        faculty_id: "fac-1",
        day_of_week: 1, // Monday
        start_time: "09:00",
        end_time: "10:00",
        duration_hours: 1.0,
        effective_start_date: "2026-08-01",
        effective_end_date: "2026-12-15",
        created_at: "2026-08-01T00:00:00Z",
      },
    ];

    const batchMap = new Map<string, string>([
      ["bs-1", "batch-1"],
      ["bs-2", "batch-1"], // same batch, different subject
      ["bs-3", "batch-2"], // different batch
    ]);

    it("detects batch collision when the same batch has another slot at overlapping time", () => {
      const candidate = {
        batch_subject_id: "bs-2", // Same Batch 1!
        faculty_id: "fac-2", // Different faculty
        day_of_week: 1, // Monday
        start_time: "09:30",
        end_time: "10:30",
        effective_start_date: "2026-08-01",
        effective_end_date: "2026-12-15",
      };

      const result = validateTimetableSlotConflicts(candidate, existingSlots, batchMap);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe("BATCH_OVERLAP");
    });

    it("detects faculty collision when faculty is double-booked across different batches", () => {
      const candidate = {
        batch_subject_id: "bs-3", // Different Batch 2!
        faculty_id: "fac-1", // Same faculty!
        day_of_week: 1, // Monday
        start_time: "09:00",
        end_time: "10:00",
        effective_start_date: "2026-08-01",
        effective_end_date: "2026-12-15",
      };

      const result = validateTimetableSlotConflicts(candidate, existingSlots, batchMap);
      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe("FACULTY_CONFLICT");
    });

    it("permits explicit authorized overrides with recorded audit reason", () => {
      const candidateWithOverride = {
        batch_subject_id: "bs-3",
        faculty_id: "fac-1", // Same faculty conflict
        day_of_week: 1,
        start_time: "09:00",
        end_time: "10:00",
        effective_start_date: "2026-08-01",
        effective_end_date: "2026-12-15",
        is_override: true,
        override_reason: "Authorized team-teaching guest lecture block",
      };

      const result = validateTimetableSlotConflicts(candidateWithOverride, existingSlots, batchMap);
      expect(result.isValid).toBe(true);
      expect(result.hasOverride).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });

    it("allows non-overlapping slots on the same day", () => {
      const candidate = {
        batch_subject_id: "bs-1",
        faculty_id: "fac-1",
        day_of_week: 1,
        start_time: "10:00", // Starts when slot-1 ends
        end_time: "11:00",
        effective_start_date: "2026-08-01",
        effective_end_date: "2026-12-15",
      };

      const result = validateTimetableSlotConflicts(candidate, existingSlots, batchMap);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("Converting Weekly Slots to Dated Teaching Occurrences", () => {
    const slots: DbTimetableSlot[] = [
      {
        id: "slot-mon",
        batch_subject_id: "bs-1",
        faculty_id: "fac-1",
        day_of_week: 1, // Monday
        start_time: "10:00",
        end_time: "11:30",
        duration_hours: 1.5,
        created_at: "2026-08-01T00:00:00Z",
      },
      {
        id: "slot-sat",
        batch_subject_id: "bs-1",
        faculty_id: "fac-1",
        day_of_week: 6, // Saturday
        start_time: "10:00",
        end_time: "11:00",
        duration_hours: 1.0,
        created_at: "2026-08-01T00:00:00Z",
      },
    ];

    it("generates occurrences strictly within semester dates and excludes holidays", () => {
      // Semester: Aug 1 to Aug 17, 2026
      // Aug 2026 starts on Saturday Aug 1.
      // Under SECOND_FOURTH rule:
      // Aug 1 (1st Sat): OFF
      // Aug 3 (Mon): Working (Slot Mon)
      // Aug 8 (2nd Sat): Working (Slot Sat)
      // Aug 10 (Mon): Working (Slot Mon)
      // Aug 15 (3rd Sat, Independence Day Holiday): OFF
      // Aug 17 (Mon): Working (Slot Mon)
      const holidays: DbCalendarEvent[] = [
        {
          id: "hol-1",
          semester_id: "sem-1",
          title: "Independence Day",
          event_type: "HOLIDAY",
          start_date: "2026-08-15",
          end_date: "2026-08-15",
          is_instructional: false,
          created_at: "2026-08-01T00:00:00Z",
        },
      ];

      const occurrences = generateDatedOccurrences(
        {
          startDate: "2026-08-01",
          endDate: "2026-08-17",
          saturdayRule: "SECOND_FOURTH",
        },
        slots,
        holidays
      );

      const dates = occurrences.map((o) => o.date);
      expect(dates).toContain("2026-08-03"); // Monday
      expect(dates).toContain("2026-08-08"); // 2nd Saturday
      expect(dates).toContain("2026-08-10"); // Monday
      expect(dates).toContain("2026-08-17"); // Monday

      // Exclusions
      expect(dates).not.toContain("2026-08-01"); // 1st Saturday (Off under SECOND_FOURTH)
      expect(dates).not.toContain("2026-08-15"); // 3rd Saturday (Holiday)
      expect(dates).not.toContain("2026-08-24"); // Outside semester range
    });

    it("never double-counts overlapping slots on the same day", () => {
      const overlappingSlots: DbTimetableSlot[] = [
        {
          id: "slot-dup-1",
          batch_subject_id: "bs-1",
          faculty_id: "fac-1",
          day_of_week: 1, // Monday
          start_time: "10:00",
          end_time: "11:00",
          duration_hours: 1.0,
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "slot-dup-2",
          batch_subject_id: "bs-1",
          faculty_id: "fac-1",
          day_of_week: 1, // Monday overlapping time
          start_time: "10:30",
          end_time: "11:30",
          duration_hours: 1.0,
          created_at: "2026-08-01T00:00:00Z",
        },
      ];

      const occurrences = generateDatedOccurrences(
        {
          startDate: "2026-08-03",
          endDate: "2026-08-03",
          saturdayRule: "ALL",
        },
        overlappingSlots
      );

      // Only 1 occurrence should be created, no double counting
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].slotId).toBe("slot-dup-1");
    });
  });

  describe("Chronological Topic Date Allocation & Multi-Session Topics", () => {
    it("allocates hours across topics and computes completion dates including multi-session topics", () => {
      // 3 topics:
      // Topic 1: 1.5 hours (completes in 1 session)
      // Topic 2: 3.0 hours (requires 2 sessions of 1.5h each)
      // Topic 3: 4.5 hours (requires 3 sessions of 1.5h each, spanning across multiple weeks)
      const topics: DbSyllabusTopic[] = [
        {
          id: "top-1",
          unit_id: "unit-1",
          subject_id: "sub-1",
          sequence_order: 1,
          title: "Introduction to Algorithms",
          planned_hours: 1.5,
          status: "NOT_STARTED",
          percent_complete: 0,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "top-2",
          unit_id: "unit-1",
          subject_id: "sub-1",
          sequence_order: 2,
          title: "Divide and Conquer: Mergesort & Quicksort",
          planned_hours: 3.0,
          status: "NOT_STARTED",
          percent_complete: 0,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "top-3",
          unit_id: "unit-2",
          subject_id: "sub-1",
          sequence_order: 3,
          title: "Dynamic Programming Foundations",
          planned_hours: 4.5,
          status: "NOT_STARTED",
          percent_complete: 0,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        },
      ];

      // Weekly slot: Every Monday 10:00 - 11:30 (1.5 hours)
      // Sessions:
      // Week 1: Mon Aug 3 (1.5h) -> Topic 1 completes here
      // Week 2: Mon Aug 10 (1.5h) -> Topic 2 starts (1.5/3.0h)
      // Week 3: Mon Aug 17 (1.5h) -> Topic 2 completes here (3.0/3.0h)
      // Week 4: Mon Aug 24 (1.5h) -> Topic 3 starts (1.5/4.5h)
      // Week 5: Mon Aug 31 (1.5h) -> Topic 3 continues (3.0/4.5h)
      // Week 6: Mon Sep 7 (1.5h) -> Topic 3 completes here (4.5/4.5h)
      const slots: DbTimetableSlot[] = [
        {
          id: "slot-mon",
          batch_subject_id: "bs-1",
          faculty_id: "fac-1",
          day_of_week: 1, // Monday
          start_time: "10:00",
          end_time: "11:30",
          duration_hours: 1.5,
          created_at: "2026-08-01T00:00:00Z",
        },
      ];

      const examScopes: DbTopicExamScope[] = [
        {
          id: "scope-1",
          topic_id: "top-1",
          exam_type: "SESSIONAL",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "scope-2",
          topic_id: "top-2",
          exam_type: "SESSIONAL",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "scope-3",
          topic_id: "top-2",
          exam_type: "MID_TERM",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "scope-4",
          topic_id: "top-3",
          exam_type: "END_TERM",
          created_at: "2026-08-01T00:00:00Z",
        },
      ];

      const { schedules, topicPlannedDates } = planSyllabusTopicDates(
        {
          startDate: "2026-08-01",
          endDate: "2026-09-30",
          saturdayRule: "SECOND_FOURTH",
        },
        slots,
        topics,
        [],
        examScopes
      );

      // Verify Topic 1 (single-session topic)
      const t1 = schedules.find((s) => s.topicId === "top-1")!;
      expect(t1.startDate).toBe("2026-08-03");
      expect(t1.expectedCompletionDate).toBe("2026-08-03");
      expect(t1.sessionCount).toBe(1);
      expect(t1.isFullyScheduled).toBe(true);
      expect(t1.examScopes).toEqual(["SESSIONAL"]);
      expect(topicPlannedDates.get("top-1")).toBe("2026-08-03");

      // Verify Topic 2 (multi-session topic spanning 2 weeks)
      const t2 = schedules.find((s) => s.topicId === "top-2")!;
      expect(t2.startDate).toBe("2026-08-10");
      expect(t2.expectedCompletionDate).toBe("2026-08-17");
      expect(t2.sessionCount).toBe(2);
      expect(t2.isFullyScheduled).toBe(true);
      // Explicit many-to-many exam mapping: topic 2 is in both Sessional and Mid-Term
      expect(t2.examScopes).toContain("SESSIONAL");
      expect(t2.examScopes).toContain("MID_TERM");
      expect(topicPlannedDates.get("top-2")).toBe("2026-08-17");

      // Verify Topic 3 (multi-session topic spanning 3 weeks)
      const t3 = schedules.find((s) => s.topicId === "top-3")!;
      expect(t3.startDate).toBe("2026-08-24");
      expect(t3.expectedCompletionDate).toBe("2026-09-07");
      expect(t3.sessionCount).toBe(3);
      expect(t3.isFullyScheduled).toBe(true);
      expect(t3.examScopes).toEqual(["END_TERM"]);
      expect(topicPlannedDates.get("top-3")).toBe("2026-09-07");
    });

    it("recalculates subsequent topic completion dates when a holiday is inserted", () => {
      const topics: DbSyllabusTopic[] = [
        {
          id: "top-1",
          unit_id: "unit-1",
          subject_id: "sub-1",
          sequence_order: 1,
          title: "Topic 1",
          planned_hours: 1.5,
          status: "NOT_STARTED",
          percent_complete: 0,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        },
        {
          id: "top-2",
          unit_id: "unit-1",
          subject_id: "sub-1",
          sequence_order: 2,
          title: "Topic 2",
          planned_hours: 1.5,
          status: "NOT_STARTED",
          percent_complete: 0,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        },
      ];

      const slots: DbTimetableSlot[] = [
        {
          id: "slot-mon",
          batch_subject_id: "bs-1",
          faculty_id: "fac-1",
          day_of_week: 1, // Monday
          start_time: "10:00",
          end_time: "11:30",
          duration_hours: 1.5,
          created_at: "2026-08-01T00:00:00Z",
        },
      ];

      // Without holidays:
      // Mon Aug 3: Topic 1 completes
      // Mon Aug 10: Topic 2 completes
      const planBefore = planSyllabusTopicDates(
        { startDate: "2026-08-01", endDate: "2026-08-31", saturdayRule: "NONE" },
        slots,
        topics
      );
      expect(planBefore.topicPlannedDates.get("top-1")).toBe("2026-08-03");
      expect(planBefore.topicPlannedDates.get("top-2")).toBe("2026-08-10");

      // Now insert a holiday on Mon Aug 10:
      const holidayOnAug10: DbCalendarEvent[] = [
        {
          id: "hol-aug10",
          semester_id: "sem-1",
          title: "Campus Cultural Festival",
          event_type: "HOLIDAY",
          start_date: "2026-08-10",
          end_date: "2026-08-10",
          is_instructional: false,
          created_at: "2026-08-01T00:00:00Z",
        },
      ];

      const planAfter = planSyllabusTopicDates(
        { startDate: "2026-08-01", endDate: "2026-08-31", saturdayRule: "NONE" },
        slots,
        topics,
        holidayOnAug10
      );

      // Topic 1 is unchanged (Aug 3)
      expect(planAfter.topicPlannedDates.get("top-1")).toBe("2026-08-03");
      // Topic 2 is shifted automatically to next Monday (Aug 17)
      expect(planAfter.topicPlannedDates.get("top-2")).toBe("2026-08-17");
    });
  });

  describe("Service Layer Integration & Authorization", () => {
    const adminUser: AuthenticatedUser = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "admin@msot.org",
      role: "admin",
    };

    const assignedFaculty: AuthenticatedUser = {
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      email: "faculty@msot.org",
      role: "faculty",
    };

    const otherFaculty: AuthenticatedUser = {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      email: "stranger@msot.org",
      role: "faculty",
    };

    it("prevents unauthorized faculty from creating syllabus units or altering lesson plans", () => {
      const subjectId = "88888888-8888-8888-8888-888888888881";

      expect(() => {
        isolatedDataStore.createSyllabusUnit(
          {
            subject_id: subjectId,
            unit_number: 9,
            title: "Unauthorized Unit",
            planned_hours: 6.0,
          },
          otherFaculty // not assigned to this subject!
        );
      }).toThrow(/Unauthorized/);
    });

    it("allows assigned faculty to create syllabus units and topics", () => {
      const subjectId = "88888888-8888-8888-8888-888888888881";

      const unit = isolatedDataStore.createSyllabusUnit(
        {
          subject_id: subjectId,
          unit_number: 3,
          title: "Graph Algorithms & Shortest Paths",
          planned_hours: 10.0,
        },
        assignedFaculty
      );

      expect(unit.unit_number).toBe(3);
      expect(unit.title).toBe("Graph Algorithms & Shortest Paths");

      const topic = isolatedDataStore.createSyllabusTopic(
        {
          unit_id: unit.id,
          subject_id: subjectId,
          sequence_order: 10,
          title: "Dijkstra and Bellman-Ford Shortest Path",
          planned_hours: 2.5,
          learning_objectives: "Compute single-source shortest paths on weighted DAGs",
          exam_scopes: ["END_TERM"],
        },
        assignedFaculty
      );

      expect(topic.title).toBe("Dijkstra and Bellman-Ford Shortest Path");
      expect(topic.planned_hours).toBe(2.5);

      const scopes = isolatedDataStore.getTopicExamScopes(topic.id);
      expect(scopes.map((s) => s.exam_type)).toContain("END_TERM");
    });

    it("creates timetable slots with exact duration and audits overrides", () => {
      const batchSubjectId = "99999999-1111-1111-1111-111111111111";

      // 50-minute session slot on Tuesday
      const slot = isolatedDataStore.createTimetableSlot(
        {
          batch_subject_id: batchSubjectId,
          faculty_id: assignedFaculty.id,
          day_of_week: 2, // Tuesday
          start_time: "09:00",
          end_time: "09:50",
          room: "LH-101",
          effective_start_date: "2026-08-01",
          effective_end_date: "2026-12-15",
        },
        adminUser
      );

      expect(slot.duration_hours).toBe(0.8333);
      expect(slot.day_of_week).toBe(2);

      // Verify audit trail entry was generated
      const audit = isolatedDataStore.getAuditLogs().find((a) => a.record_id === slot.id);
      expect(audit).toBeDefined();
      expect(audit?.table_name).toBe("timetable_slots");
    });
  });
});
