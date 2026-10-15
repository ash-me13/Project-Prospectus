import { isSupabaseConfigured } from "../supabase/config";
import { createClient } from "../supabase/client";
import {
  DbCampus,
  DbSemester,
  DbBatch,
  DbSubject,
  DbSyllabusTopic,
  DbScheduledSession,
  DbSessionLog,
  DbAuditLog,
} from "../../types/database";
import { SessionLogCreateSchema } from "../../validation/database";
import { AuthenticatedUser, canLogSession, AuthorizationError } from "../../auth/authorization";

export interface DatabaseConnectionStatus {
  isConnected: boolean;
  provider: "supabase_postgresql" | "isolated_development_fallback";
  message: string;
  setupChecklist?: string[];
}

/**
 * Honest connection verification: checks if Supabase credentials are valid
 * and performs an actual test query if configured.
 */
export async function verifyDatabaseConnection(): Promise<DatabaseConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return {
      isConnected: false,
      provider: "isolated_development_fallback",
      message:
        "Supabase credentials not configured in environment. Operating in isolated development fallback mode.",
      setupChecklist: [
        "Create a Supabase project at https://database.new",
        "Run migrations in `supabase/migrations/` using Supabase CLI or SQL Editor",
        "Run `supabase/seed/seed.sql` to populate initial campuses and tracks",
        "Copy `.env.example` to `.env.local` and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "Set SUPABASE_SERVICE_ROLE_KEY for server-side administrative workflows",
      ],
    };
  }

  try {
    const supabase = createClient();
    if (!supabase) throw new Error("Could not initialize Supabase client");

    // Perform real read query
    const { error } = await supabase.from("campuses").select("id").limit(1);
    if (error) throw error;

    return {
      isConnected: true,
      provider: "supabase_postgresql",
      message: "Successfully connected to live Supabase PostgreSQL database.",
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      isConnected: false,
      provider: "isolated_development_fallback",
      message: `Supabase connection failed: ${errorMessage}. Falling back to isolated development data store.`,
    };
  }
}

// ==============================================================================
// IN-MEMORY ISOLATED DEVELOPMENT FALLBACK STORE
// Mirroring the 20 normalized tables when external database credentials are not yet linked
// ==============================================================================

class IsolatedDataStore {
  private campuses: DbCampus[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "HI-Tech Institute",
      code: "HITECH",
      location: "Ghaziabad, NCR",
      timezone: "Asia/Kolkata",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Ratnam Institute",
      code: "RATNAM",
      location: "Bhopal, MP",
      timezone: "Asia/Kolkata",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      name: "RGIB",
      code: "RGIB",
      location: "Indore, MP",
      timezone: "Asia/Kolkata",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      name: "JUJ Campus",
      code: "JUJ",
      location: "Jaipur, Rajasthan",
      timezone: "Asia/Kolkata",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
  ];

  private semesters: DbSemester[] = [
    {
      id: "55555555-5555-5555-5555-555555555555",
      campus_id: "11111111-1111-1111-1111-111111111111",
      name: "Fall Semester 2026",
      academic_year: "2026-2027",
      start_date: "2026-08-01",
      end_date: "2026-12-15",
      saturday_rule: "SECOND_FOURTH",
      is_current: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
  ];

  private batches: DbBatch[] = [
    {
      id: "77777777-7777-7777-7777-777777777771",
      campus_id: "11111111-1111-1111-1111-111111111111",
      track_id: "aaaaaaaa-1111-1111-1111-111111111111",
      semester_id: "55555555-5555-5555-5555-555555555555",
      name: "CSE 2026 Sec B",
      section: "B",
      intake_year: 2026,
      student_count: 64,
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private subjects: DbSubject[] = [
    {
      id: "88888888-8888-8888-8888-888888888881",
      code: "CS201",
      name: "Data Structures & Algorithms",
      department: "CSE",
      credit_hours: 4,
      total_planned_hours: 48.0,
      syllabus_version: "v1.0",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "88888888-8888-8888-8888-888888888882",
      code: "CS202",
      name: "Operating Systems",
      department: "CSE",
      credit_hours: 4,
      total_planned_hours: 42.0,
      syllabus_version: "v1.0",
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private topics: DbSyllabusTopic[] = [
    {
      id: "b0000001-1111-1111-1111-111111111101",
      unit_id: "a0000001-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888881",
      sequence_order: 1,
      title: "Asymptotic Notation, Big-O Analysis & Recurrence",
      planned_hours: 1.5,
      status: "COMPLETED",
      percent_complete: 100,
      planned_date: "2026-08-03",
      actual_completed_date: "2026-08-03",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-03T11:30:00Z",
    },
    {
      id: "b0000001-1111-1111-1111-111111111102",
      unit_id: "a0000001-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888881",
      sequence_order: 2,
      title: "Dynamic Arrays, Memory Representation & Pointer Arithmetic",
      planned_hours: 1.5,
      status: "COMPLETED",
      percent_complete: 100,
      planned_date: "2026-08-05",
      actual_completed_date: "2026-08-05",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-05T11:30:00Z",
    },
    {
      id: "b0000001-1111-1111-1111-111111111103",
      unit_id: "a0000001-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888881",
      sequence_order: 3,
      title: "Singly, Doubly and Circular Linked Lists",
      planned_hours: 1.5,
      status: "IN_PROGRESS",
      percent_complete: 60,
      planned_date: "2026-08-07",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-05T11:30:00Z",
    },
  ];

  private scheduledSessions: DbScheduledSession[] = [
    {
      id: "d0000001-1111-1111-1111-111111111101",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-08-03",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "COMPLETED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111102",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-08-05",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "COMPLETED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111103",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-08-07",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private sessionLogs: DbSessionLog[] = [
    {
      id: "e0000001-1111-1111-1111-111111111101",
      scheduled_session_id: "d0000001-1111-1111-1111-111111111101",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-08-03",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      duration_minutes: 90,
      delivery_status: "COMPLETED",
      covered_summary: "Covered Big-O complexity",
      classwork_status: "ASSIGNED",
      homework_status: "ASSIGNED",
      is_verified: true,
      logged_at: "2026-08-03T11:35:00Z",
      updated_at: "2026-08-03T11:35:00Z",
    },
    {
      id: "e0000001-1111-1111-1111-111111111102",
      scheduled_session_id: "d0000001-1111-1111-1111-111111111102",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-08-05",
      actual_start_time: "10:00:00",
      actual_end_time: "11:30:00",
      duration_minutes: 90,
      delivery_status: "COMPLETED",
      covered_summary: "Dynamic array pointers",
      classwork_status: "COLLECTED",
      homework_status: "REVIEWED",
      is_verified: true,
      logged_at: "2026-08-05T11:35:00Z",
      updated_at: "2026-08-05T11:35:00Z",
    },
  ];

  private auditLogs: DbAuditLog[] = [];

  public getCampuses(): DbCampus[] {
    return this.campuses;
  }

  public getSemesters(campusId: string): DbSemester[] {
    return this.semesters.filter((s) => s.campus_id === campusId);
  }

  public getBatches(campusId: string): DbBatch[] {
    return this.batches.filter((b) => b.campus_id === campusId);
  }

  public getSubjects(): DbSubject[] {
    return this.subjects;
  }

  public getTopics(subjectId: string): DbSyllabusTopic[] {
    return this.topics.filter((t) => t.subject_id === subjectId);
  }

  public getScheduledSessions(batchSubjectId: string): DbScheduledSession[] {
    return this.scheduledSessions.filter((s) => s.batch_subject_id === batchSubjectId);
  }

  public getSessionLogs(batchSubjectId: string): DbSessionLog[] {
    return this.sessionLogs.filter((l) => l.batch_subject_id === batchSubjectId);
  }

  public getAuditLogs(): DbAuditLog[] {
    return this.auditLogs;
  }

  /**
   * Records a canonical teaching session log with atomic constraint checks:
   * 1. Validates input schema with Zod
   * 2. Enforces authorization: only assigned faculty or admin can record
   * 3. Enforces UNIQUE scheduled_session_id (at most one canonical log per occurrence)
   * 4. Updates current topic progress without duplicate counting
   * 5. Appends to audit log
   */
  public recordCanonicalSessionLog(
    rawInput: unknown,
    user: AuthenticatedUser,
    subjectFacultyId: string
  ): { log: DbSessionLog; updatedTopics: DbSyllabusTopic[] } {
    // 1. Zod Validation
    const parsed = SessionLogCreateSchema.parse(rawInput);

    // 2. Server-side Authorization Check
    if (!canLogSession(user, subjectFacultyId)) {
      throw new AuthorizationError(
        `User ${user.email} (${user.role}) is unauthorized to log sessions for subject assigned to ${subjectFacultyId}.`
      );
    }

    // 3. Uniqueness Enforcement: At most one canonical log per scheduled occurrence
    const existingLog = this.sessionLogs.find(
      (l) => l.scheduled_session_id === parsed.scheduled_session_id
    );
    if (existingLog) {
      throw new Error(
        `Constraint Violation: A canonical session log (ID: ${existingLog.id}) already exists for scheduled session ${parsed.scheduled_session_id}. Multiple canonical logs are forbidden.`
      );
    }

    // 4. Create canonical log
    const newLogId = `log-${Date.now()}`;
    const startParts = parsed.actual_start_time.split(":").map(Number);
    const endParts = parsed.actual_end_time.split(":").map(Number);
    const durationMinutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);

    const canonicalLog: DbSessionLog = {
      id: newLogId,
      scheduled_session_id: parsed.scheduled_session_id,
      batch_subject_id: parsed.batch_subject_id,
      faculty_id: parsed.faculty_id,
      session_date: parsed.session_date,
      actual_start_time: parsed.actual_start_time,
      actual_end_time: parsed.actual_end_time,
      duration_minutes: durationMinutes,
      delivery_status: parsed.delivery_status,
      covered_summary: parsed.covered_summary,
      leftover_summary: parsed.leftover_summary,
      carry_forward_topic_id: parsed.carry_forward_topic_id,
      classwork_status: parsed.classwork_status,
      homework_status: parsed.homework_status,
      notes: parsed.notes,
      is_verified: true,
      logged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.sessionLogs.push(canonicalLog);

    // Update scheduled session status
    const scheduled = this.scheduledSessions.find((s) => s.id === parsed.scheduled_session_id);
    if (scheduled) {
      scheduled.occurrence_status = "COMPLETED";
    }

    // 5. Update topic progress state (traceable, no duplicate progress counting)
    const updatedTopics: DbSyllabusTopic[] = [];
    for (const affected of parsed.affected_topics) {
      const topicIndex = this.topics.findIndex((t) => t.id === affected.topic_id);
      if (topicIndex >= 0) {
        this.topics[topicIndex] = {
          ...this.topics[topicIndex],
          percent_complete: affected.percent_complete_after,
          status: affected.topic_status_after,
          actual_completed_date:
            affected.percent_complete_after >= 100 ? parsed.session_date : this.topics[topicIndex].actual_completed_date,
          updated_at: new Date().toISOString(),
        };
        updatedTopics.push(this.topics[topicIndex]);
      }
    }

    // 6. Append to Audit Log
    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "session_logs",
      record_id: newLogId,
      action: "INSERT",
      changed_by: user.id,
      new_values: {
        scheduled_session_id: parsed.scheduled_session_id,
        delivery_status: parsed.delivery_status,
        duration_minutes: durationMinutes,
      },
      timestamp: new Date().toISOString(),
    });

    return { log: canonicalLog, updatedTopics };
  }
}

export const isolatedDataStore = new IsolatedDataStore();
