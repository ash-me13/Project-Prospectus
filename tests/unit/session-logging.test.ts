import { describe, it, expect } from "vitest";
import { isolatedDataStore } from "../../src/lib/database/service";
import { SessionLogCreateSchema } from "../../src/validation/database";
import { AuthenticatedUser } from "../../src/auth/authorization";

describe("Faculty Session Logging Workflow & Data Integrity", () => {
  const authorizedFaculty: AuthenticatedUser = {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "sharma.faculty@msot.org",
    role: "faculty",
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const unauthorizedFaculty: AuthenticatedUser = {
    id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    email: "stranger.faculty@msot.org",
    role: "faculty",
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const studentUser: AuthenticatedUser = {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    email: "aryan.student@msot.org",
    role: "student",
    batchId: "77777777-7777-7777-7777-777777777771",
  };

  it("aggregates real-time faculty dashboard metrics including today's slots and overdue topics", () => {
    const data = isolatedDataStore.getFacultyDashboardData(authorizedFaculty.id, "2026-10-16");

    expect(data.todaySessions.length).toBeGreaterThanOrEqual(1);
    expect(data.awaitingLogSessions.length).toBeGreaterThanOrEqual(1);
    expect(data.loggedSessions.length).toBeGreaterThanOrEqual(1);

    // Overdue topics: Topic 3 was planned for 2026-10-14 and is not 100% complete
    const overdueTopic = data.overdueTopics.find(
      (t) => t.id === "b0000001-1111-1111-1111-111111111103"
    );
    expect(overdueTopic).toBeDefined();
    expect(overdueTopic?.days_overdue).toBeGreaterThanOrEqual(1);

    // Subjects requiring attention
    expect(data.subjectsRequiringAttention.length).toBeGreaterThanOrEqual(1);
    const attentionSubj = data.subjectsRequiringAttention.find(
      (s) => s.subject_id === "88888888-8888-8888-8888-888888888881"
    );
    expect(attentionSubj).toBeDefined();
    expect(attentionSubj?.overdue_topic_count).toBeGreaterThanOrEqual(1);
  });

  it("successfully records a canonical completed session log with exact duration and topic progress", () => {
    const scheduledSessionId = "d0000001-1111-1111-1111-111111111104";

    const payload = {
      scheduled_session_id: scheduledSessionId,
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-14",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED" as const,
      covered_summary: "Covered Singly and Doubly Linked Lists insertion and deletion",
      leftover_summary: "Circular linked lists edge cases",
      classwork_status: "ASSIGNED" as const,
      homework_status: "ASSIGNED" as const,
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111103",
          percent_complete_after: 100,
          topic_status_after: "COMPLETED" as const,
        },
      ],
    };

    const result = isolatedDataStore.recordCanonicalSessionLog(
      payload,
      authorizedFaculty,
      authorizedFaculty.id
    );

    expect(result.log.id).toBeDefined();
    expect(result.log.duration_minutes).toBe(90);
    expect(result.log.delivery_status).toBe("COMPLETED");
    expect(result.updatedTopics[0].percent_complete).toBe(100);
    expect(result.updatedTopics[0].status).toBe("COMPLETED");

    // Verify scheduled session status was updated
    const sessionOcc = isolatedDataStore
      .getAllScheduledSessions()
      .find((s) => s.id === scheduledSessionId);
    expect(sessionOcc?.occurrence_status).toBe("COMPLETED");

    // Verify audit log has entry
    const auditEntry = isolatedDataStore
      .getAuditLogs()
      .find((a) => a.record_id === result.log.id);
    expect(auditEntry).toBeDefined();
    expect(auditEntry?.action).toBe("INSERT");
    expect(auditEntry?.changed_by).toBe(authorizedFaculty.id);
  });

  it("prevents duplicate submissions on the same scheduled session occurrence", () => {
    // Attempting to log the already-logged session d0000001-1111-1111-1111-111111111104
    const duplicatePayload = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111104",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-14",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED" as const,
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111103",
          percent_complete_after: 100,
          topic_status_after: "COMPLETED" as const,
        },
      ],
    };

    expect(() =>
      isolatedDataStore.recordCanonicalSessionLog(
        duplicatePayload,
        authorizedFaculty,
        authorizedFaculty.id
      )
    ).toThrow(/Constraint Violation: A canonical session log.*already exists/);
  });

  it("handles network retries idempotently without duplicate records or errors", () => {
    const testIdempotencyKey = "uuid-test-idempotency-key-12345";
    const slotId = "d0000001-1111-1111-1111-111111111105";

    const payload = {
      scheduled_session_id: slotId,
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-16",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED" as const,
      idempotency_key: testIdempotencyKey,
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111104",
          percent_complete_after: 50,
          topic_status_after: "IN_PROGRESS" as const,
        },
      ],
    };

    // First call (successful write)
    const firstCall = isolatedDataStore.recordCanonicalSessionLog(
      payload,
      authorizedFaculty,
      authorizedFaculty.id
    );

    expect(firstCall.log.idempotency_key).toBe(testIdempotencyKey);

    // Second call with same idempotency key (network retry simulation)
    const secondCall = isolatedDataStore.recordCanonicalSessionLog(
      payload,
      authorizedFaculty,
      authorizedFaculty.id
    );

    // Returns identical log without error or duplicate insertion
    expect(secondCall.log.id).toBe(firstCall.log.id);
  });

  it("rejects unauthorized faculty from logging sessions for another faculty's subject", () => {
    const payload = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111106",
      batch_subject_id: "99999999-1111-1111-1111-111111111112",
      faculty_id: unauthorizedFaculty.id,
      session_date: "2026-10-16",
      actual_start_time: "14:00:00",
      actual_end_time: "15:30:00",
      delivery_status: "COMPLETED" as const,
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111104",
          percent_complete_after: 80,
          topic_status_after: "IN_PROGRESS" as const,
        },
      ],
    };

    expect(() =>
      isolatedDataStore.recordCanonicalSessionLog(
        payload,
        unauthorizedFaculty,
        authorizedFaculty.id // Assigned faculty is authorizedFaculty
      )
    ).toThrow(/unauthorized to log sessions/);
  });

  it("rejects students from attempting to log faculty sessions", () => {
    const payload = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111105",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: studentUser.id,
      session_date: "2026-10-16",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      delivery_status: "COMPLETED" as const,
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111104",
          percent_complete_after: 50,
          topic_status_after: "IN_PROGRESS" as const,
        },
      ],
    };

    expect(() =>
      isolatedDataStore.recordCanonicalSessionLog(
        payload,
        studentUser,
        authorizedFaculty.id
      )
    ).toThrow(/unauthorized to log sessions/);
  });

  it("requires an explanatory reason when session is skipped, and preserves topic progress", () => {
    // 1. Rejects skipped session if status_reason is missing
    const invalidSkipped = {
      scheduled_session_id: "d0000001-1111-1111-1111-111111111106",
      batch_subject_id: "99999999-1111-1111-1111-111111111112",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-16",
      actual_start_time: "14:00:00",
      actual_end_time: "15:30:00",
      delivery_status: "SKIPPED" as const,
      status_reason: "", // Empty reason
    };

    expect(() => SessionLogCreateSchema.parse(invalidSkipped)).toThrow(
      "An explanatory reason is required when a session is skipped, cancelled, or merged."
    );

    // 2. Records skipped session with valid reason
    const validSkipped = {
      ...invalidSkipped,
      status_reason: "Faculty on approved academic conference leave",
    };

    // Current topic progress before skip
    const topicBefore = isolatedDataStore
      .getTopics("88888888-8888-8888-8888-888888888881")
      .find((t) => t.id === "b0000001-1111-1111-1111-111111111104");
    const percentBefore = topicBefore?.percent_complete;

    const result = isolatedDataStore.recordCanonicalSessionLog(
      validSkipped,
      authorizedFaculty,
      authorizedFaculty.id
    );

    expect(result.log.delivery_status).toBe("SKIPPED");
    expect(result.log.status_reason).toBe("Faculty on approved academic conference leave");

    // Scheduled session is marked as SKIPPED
    const sessionOcc = isolatedDataStore
      .getAllScheduledSessions()
      .find((s) => s.id === "d0000001-1111-1111-1111-111111111106");
    expect(sessionOcc?.occurrence_status).toBe("SKIPPED");

    // CRITICAL: Topic is NOT marked as skipped!
    const topicAfter = isolatedDataStore
      .getTopics("88888888-8888-8888-8888-888888888881")
      .find((t) => t.id === "b0000001-1111-1111-1111-111111111104");
    expect(topicAfter?.status).not.toBe("SKIPPED");
    expect(topicAfter?.percent_complete).toBe(percentBefore);
  });

  it("records merged sessions referencing affected slots without double-counting hours", () => {
    // Add two extra slots to test merging
    const primarySlotId = "d0000001-1111-1111-1111-111111111107";
    const secondarySlotId = "d0000001-1111-1111-1111-111111111108";

    // Inject into data store for the test
    const allSlots = isolatedDataStore.getAllScheduledSessions();
    allSlots.push({
      id: primarySlotId,
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-21",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    });
    allSlots.push({
      id: secondarySlotId,
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-21",
      start_time: "11:30:00",
      end_time: "13:00:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    });

    const mergePayload = {
      scheduled_session_id: primarySlotId,
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: authorizedFaculty.id,
      session_date: "2026-10-21",
      actual_start_time: "10:00:00",
      actual_end_time: "13:00:00", // Combined 3-hour block
      delivery_status: "MERGED" as const,
      status_reason: "Combined with 11:30 slot for full 3-hour lab sprint",
      merged_session_ids: [secondarySlotId],
      affected_topics: [
        {
          topic_id: "b0000001-1111-1111-1111-111111111105",
          percent_complete_after: 80,
          topic_status_after: "IN_PROGRESS" as const,
        },
      ],
    };

    const result = isolatedDataStore.recordCanonicalSessionLog(
      mergePayload,
      authorizedFaculty,
      authorizedFaculty.id
    );

    expect(result.log.delivery_status).toBe("MERGED");
    expect(result.log.duration_minutes).toBe(180);
    expect(result.log.merged_session_ids).toContain(secondarySlotId);

    // Primary occurrence status is COMPLETED
    const primaryOcc = allSlots.find((s) => s.id === primarySlotId);
    expect(primaryOcc?.occurrence_status).toBe("COMPLETED");

    // Secondary occurrence status is MERGED (prevents double-counting and closes from awaiting-log)
    const secondaryOcc = allSlots.find((s) => s.id === secondarySlotId);
    expect(secondaryOcc?.occurrence_status).toBe("MERGED");

    // Only one canonical session log was created
    const logsForBatch = isolatedDataStore.getSessionLogs(
      "99999999-1111-1111-1111-111111111111"
    );
    const primaryLogs = logsForBatch.filter(
      (l) => l.scheduled_session_id === primarySlotId
    );
    const secondaryLogs = logsForBatch.filter(
      (l) => l.scheduled_session_id === secondarySlotId
    );

    expect(primaryLogs.length).toBe(1);
    expect(secondaryLogs.length).toBe(0); // Secondary slot has no duplicate log
  });
});
