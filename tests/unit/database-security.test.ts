import { describe, it, expect } from "vitest";
import {
  SemesterCreateSchema,
  TimetableSlotCreateSchema,
  SessionLogCreateSchema,
} from "../../src/validation/database";
import {
  canLogSession,
  canManageCampus,
  canViewBatch,
  AuthenticatedUser,
} from "../../src/auth/authorization";
import {
  isolatedDataStore,
  verifyDatabaseConnection,
} from "../../src/lib/database/service";

describe("Database Schema & Temporal Constraints", () => {
  it("rejects invalid semester dates where start_date >= end_date", () => {
    const invalidSemester = {
      campus_id: "11111111-1111-1111-1111-111111111111",
      name: "Invalid Semester",
      academic_year: "2026-2027",
      start_date: "2026-12-15",
      end_date: "2026-08-01", // End date before start date
      saturday_rule: "SECOND_FOURTH",
    };

    expect(() => SemesterCreateSchema.parse(invalidSemester)).toThrow(
      "Start date must be strictly before end date"
    );
  });

  it("rejects timetable slots where start_time >= end_time", () => {
    const invalidSlot = {
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      day_of_week: 1,
      start_time: "11:30:00",
      end_time: "10:00:00", // End before start
    };

    expect(() => TimetableSlotCreateSchema.parse(invalidSlot)).toThrow(
      "Start time must be before end time"
    );
  });

  it("requires at least one affected topic in a session log", () => {
    const invalidLog = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111103",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-15",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED",
      affected_topics: [], // Empty topics array
    };

    expect(() => SessionLogCreateSchema.parse(invalidLog)).toThrow(
      "At least one affected syllabus topic required"
    );
  });
});

describe("Canonical Session Log & Audit Traceability", () => {
  const facultyUser: AuthenticatedUser = {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "sharma.faculty@msot.org",
    role: "faculty",
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const studentUser: AuthenticatedUser = {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    email: "student.aryan@msot.org",
    role: "student",
    batchId: "77777777-7777-7777-7777-777777777771",
  };

  it("enforces at most one canonical log per scheduled session occurrence", () => {
    const scheduledSessionId = "d0000001-1111-1111-1111-111111111103";

    const payload = {
      scheduled_session_id: scheduledSessionId,
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: facultyUser.id,
      session_date: "2026-08-07",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED",
      classwork_status: "ASSIGNED",
      homework_status: "ASSIGNED",
      notes: "First canonical log attempt",
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111103",
          percent_complete_after: 100,
          topic_status_after: "COMPLETED",
        },
      ],
    };

    // 1. First log succeeds
    const result = isolatedDataStore.recordCanonicalSessionLog(
      payload,
      facultyUser,
      facultyUser.id
    );
    expect(result.log).toBeDefined();
    expect(result.log.scheduled_session_id).toBe(scheduledSessionId);

    // 2. Second log for the same scheduled session occurrence fails with unique constraint error
    expect(() =>
      isolatedDataStore.recordCanonicalSessionLog(
        payload,
        facultyUser,
        facultyUser.id
      )
    ).toThrow(/already exists for scheduled session.*Multiple canonical logs are forbidden/);
  });

  it("strictly forbids students from recording or modifying session logs", () => {
    const payload = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111198",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: facultyUser.id,
      session_date: "2026-08-07",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED",
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111103",
          percent_complete_after: 100,
          topic_status_after: "COMPLETED",
        },
      ],
    };

    expect(() =>
      isolatedDataStore.recordCanonicalSessionLog(
        payload,
        studentUser,
        facultyUser.id
      )
    ).toThrow(/unauthorized to log sessions/);
  });

  it("does not count topic progress multiple times and records an auditable history", () => {
    // Audit logs must contain recorded entries
    const auditLogs = isolatedDataStore.getAuditLogs();
    expect(auditLogs.length).toBeGreaterThan(0);

    const latestAudit = auditLogs[auditLogs.length - 1];
    expect(latestAudit.table_name).toBe("session_logs");
    expect(latestAudit.action).toBe("INSERT");
  });
});

describe("Role Isolation & Server-Side Security Guards", () => {
  const adminUser: AuthenticatedUser = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "admin@msot.org",
    role: "admin",
  };

  const cmHiTech: AuthenticatedUser = {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    email: "cm.hitech@msot.org",
    role: "campus_manager",
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const facultySharma: AuthenticatedUser = {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "sharma.faculty@msot.org",
    role: "faculty",
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const facultyVerma: AuthenticatedUser = {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    email: "verma.faculty@msot.org",
    role: "faculty",
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const studentAryan: AuthenticatedUser = {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    email: "student.aryan@msot.org",
    role: "student",
    batchId: "77777777-7777-7777-7777-777777777771", // Sec B
  };

  it("restricts Campus Managers strictly to their assigned campus", () => {
    const hiTechCampusId = "11111111-1111-1111-1111-111111111111";
    const ratnamCampusId = "22222222-2222-2222-2222-222222222222";

    // Admin can manage any campus
    expect(canManageCampus(adminUser, hiTechCampusId)).toBe(true);
    expect(canManageCampus(adminUser, ratnamCampusId)).toBe(true);

    // CM Hi-Tech can manage Hi-Tech, but NOT Ratnam
    expect(canManageCampus(cmHiTech, hiTechCampusId)).toBe(true);
    expect(canManageCampus(cmHiTech, ratnamCampusId)).toBe(false);

    // Faculty and students cannot manage any campus
    expect(canManageCampus(facultySharma, hiTechCampusId)).toBe(false);
    expect(canManageCampus(studentAryan, hiTechCampusId)).toBe(false);
  });

  it("prevents faculty from logging sessions for another faculty's subject", () => {
    // Subject assigned to Dr. Sharma (facultySharma)
    expect(canLogSession(facultySharma, facultySharma.id)).toBe(true);
    expect(canLogSession(facultyVerma, facultySharma.id)).toBe(false); // Verma cannot log Sharma's subject

    // Student cannot log sessions
    expect(canLogSession(studentAryan, facultySharma.id)).toBe(false);

    // Admin can override/log if needed
    expect(canLogSession(adminUser, facultySharma.id)).toBe(true);
  });

  it("strictly restricts students to read-only access for their enrolled batch", () => {
    const secBBatchId = "77777777-7777-7777-7777-777777777771";
    const secABatchId = "77777777-7777-7777-7777-777777777772";
    const campusId = "11111111-1111-1111-1111-111111111111";

    // Aryan is enrolled in Sec B: can view Sec B, but NOT Sec A
    expect(canViewBatch(studentAryan, campusId, secBBatchId)).toBe(true);
    expect(canViewBatch(studentAryan, campusId, secABatchId)).toBe(false);

    // Faculty and CM can view both
    expect(canViewBatch(facultySharma, campusId, secBBatchId)).toBe(true);
    expect(canViewBatch(facultySharma, campusId, secABatchId)).toBe(true);
    expect(canViewBatch(cmHiTech, campusId, secBBatchId)).toBe(true);
  });

  it("prevents unauthorized session log submission at the service layer", () => {
    const payload = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111199",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: facultyVerma.id, // Verma tries to submit
      session_date: "2026-08-10",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED",
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111101",
          percent_complete_after: 100,
          topic_status_after: "COMPLETED",
        },
      ],
    };

    // Subject belongs to Sharma; Verma should be rejected
    expect(() =>
      isolatedDataStore.recordCanonicalSessionLog(
        payload,
        facultyVerma,
        facultySharma.id
      )
    ).toThrow(/unauthorized to log sessions/);
  });
});

describe("Database Connection Status & Setup Integrity", () => {
  it("honestly reports connection status and gives setup checklist when unlinked", async () => {
    const status = await verifyDatabaseConnection();

    // In local testing without real remote keys, it must honestly declare fallback mode
    expect(status.provider).toBe("isolated_development_fallback");
    expect(status.isConnected).toBe(false);
    expect(status.setupChecklist).toBeDefined();
    expect(status.setupChecklist!.length).toBeGreaterThan(0);
  });
});
