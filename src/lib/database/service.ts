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
  DbCalendarEvent,
  DbExamWindow,
  DbTimetableSlot,
} from "../../types/database";
import {
  SessionLogCreateSchema,
  SemesterCreateSchema,
  SemesterCreateInput,
  BatchCreateSchema,
  CalendarEventCreateSchema,
  CalendarEventCreateInput,
  ExamWindowCreateSchema,
  ExamWindowCreateInput,
} from "../../validation/database";
import {
  AuthenticatedUser,
  canLogSession,
  canManageSemester,
  canManageCalendar,
  canManageExams,
  assertAuthorized,
  AuthorizationError,
} from "../../auth/authorization";
import {
  recalculatePlannedSessions,
  SessionShiftRecord,
} from "../../domain/calendar-engine";
import {
  ParsedImportRow,
  ImportExecutionReport,
} from "../import/csv-importer";

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

  private timetableSlots: DbTimetableSlot[] = [
    {
      id: "c0000001-1111-1111-1111-111111111111",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      day_of_week: 1, // Monday
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      room: "Lab 3",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "c0000001-1111-1111-1111-111111111112",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      day_of_week: 3, // Wednesday
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      room: "Lab 3",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "c0000001-1111-1111-1111-111111111113",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      day_of_week: 5, // Friday
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      room: "Lab 3",
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private calendarEvents: DbCalendarEvent[] = [
    {
      id: "f1111111-1111-1111-1111-111111111101",
      semester_id: "55555555-5555-5555-5555-555555555555",
      campus_id: "11111111-1111-1111-1111-111111111111",
      title: "Independence Day",
      event_type: "HOLIDAY",
      start_date: "2026-08-15",
      end_date: "2026-08-15",
      is_instructional: false,
      description: "National Holiday",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "f1111111-1111-1111-1111-111111111102",
      semester_id: "55555555-5555-5555-5555-555555555555",
      campus_id: "11111111-1111-1111-1111-111111111111",
      title: "Gandhi Jayanti",
      event_type: "HOLIDAY",
      start_date: "2026-10-02",
      end_date: "2026-10-02",
      is_instructional: false,
      description: "National Holiday",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "f1111111-1111-1111-1111-111111111103",
      semester_id: "55555555-5555-5555-5555-555555555555",
      campus_id: "11111111-1111-1111-1111-111111111111",
      title: "Dussehra Holiday",
      event_type: "HOLIDAY",
      start_date: "2026-10-20",
      end_date: "2026-10-20",
      is_instructional: false,
      description: "Institutional Holiday",
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private examWindows: DbExamWindow[] = [
    {
      id: "66666666-6666-6666-6666-666666666661",
      semester_id: "55555555-5555-5555-5555-555555555555",
      campus_id: "11111111-1111-1111-1111-111111111111",
      name: "Sessional Exam 1",
      exam_type: "SESSIONAL",
      start_date: "2026-09-21",
      end_date: "2026-09-26",
      weightage_percent: 15.0,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "66666666-6666-6666-6666-666666666662",
      semester_id: "55555555-5555-5555-5555-555555555555",
      campus_id: "11111111-1111-1111-1111-111111111111",
      name: "Mid-Term Examination",
      exam_type: "MID_TERM",
      start_date: "2026-10-21",
      end_date: "2026-10-28",
      weightage_percent: 25.0,
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private auditLogs: DbAuditLog[] = [];

  public getCampuses(): DbCampus[] {
    return this.campuses;
  }

  public getSemesters(campusId?: string): DbSemester[] {
    if (!campusId) return this.semesters;
    return this.semesters.filter((s) => s.campus_id === campusId);
  }

  public getSemesterById(semesterId: string): DbSemester | undefined {
    return this.semesters.find((s) => s.id === semesterId);
  }

  public getBatches(campusId?: string, semesterId?: string): DbBatch[] {
    let result = this.batches;
    if (campusId) result = result.filter((b) => b.campus_id === campusId);
    if (semesterId) result = result.filter((b) => b.semester_id === semesterId);
    return result;
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

  // ============================================================================
  // SEMESTER SETUP & MANAGEMENT
  // ============================================================================

  public createSemester(rawInput: unknown, user: AuthenticatedUser): DbSemester {
    assertAuthorized(canManageSemester(user), "Only Academic Admins can create semesters");
    const parsed = SemesterCreateSchema.parse(rawInput);

    const newSemester: DbSemester = {
      id: `55555555-${Date.now().toString(16).padStart(4, "0").slice(-4)}-1111-1111-111111111111`,
      campus_id: parsed.campus_id,
      name: parsed.name,
      academic_year: parsed.academic_year,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      saturday_rule: parsed.saturday_rule,
      is_current: parsed.is_current,
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.semesters.push(newSemester);

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "semesters",
      record_id: newSemester.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: { ...newSemester },
      timestamp: new Date().toISOString(),
    });

    return newSemester;
  }

  public updateSemester(
    semesterId: string,
    updates: Partial<SemesterCreateInput>,
    user: AuthenticatedUser
  ): { semester: DbSemester; shifts: SessionShiftRecord[] } {
    assertAuthorized(canManageSemester(user), "Only Academic Admins can update semesters");

    const index = this.semesters.findIndex((s) => s.id === semesterId);
    if (index === -1) {
      throw new Error(`Semester ${semesterId} not found`);
    }

    const prev = this.semesters[index];
    const updated: DbSemester = {
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.semesters[index] = updated;

    // Invalidate and recalculate planned sessions if calendar boundary or Saturday rule changed
    let shifts: SessionShiftRecord[] = [];
    if (
      updates.saturday_rule !== undefined ||
      updates.start_date !== undefined ||
      updates.end_date !== undefined
    ) {
      const recalc = recalculatePlannedSessions(
        this.scheduledSessions,
        this.timetableSlots,
        updated.start_date,
        updated.end_date,
        updated.saturday_rule,
        this.calendarEvents.filter((e) => e.semester_id === semesterId)
      );
      this.scheduledSessions = recalc.updatedSessions;
      shifts = recalc.shifts;
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "semesters",
      record_id: semesterId,
      action: "UPDATE",
      changed_by: user.id,
      old_values: { saturday_rule: prev.saturday_rule, start_date: prev.start_date, end_date: prev.end_date },
      new_values: { saturday_rule: updated.saturday_rule, start_date: updated.start_date, end_date: updated.end_date, shiftsCount: shifts.length },
      timestamp: new Date().toISOString(),
    });

    return { semester: updated, shifts };
  }

  public publishSemester(semesterId: string, user: AuthenticatedUser): DbSemester {
    assertAuthorized(canManageSemester(user), "Only Academic Admins can publish academic calendars");

    const semester = this.semesters.find((s) => s.id === semesterId);
    if (!semester) throw new Error(`Semester ${semesterId} not found`);

    semester.is_published = true;
    semester.published_at = new Date().toISOString();
    semester.published_by = user.id;
    semester.updated_at = new Date().toISOString();

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "semesters",
      record_id: semesterId,
      action: "UPDATE",
      changed_by: user.id,
      new_values: { is_published: true, published_at: semester.published_at },
      timestamp: new Date().toISOString(),
    });

    return semester;
  }

  public createBatch(rawInput: unknown, user: AuthenticatedUser): DbBatch {
    assertAuthorized(canManageSemester(user), "Only Academic Admins can create student cohorts");
    const parsed = BatchCreateSchema.parse(rawInput);

    const newBatch: DbBatch = {
      id: `77777777-${Date.now().toString(16).padStart(4, "0").slice(-4)}-7777-7777-777777777777`,
      campus_id: parsed.campus_id,
      track_id: parsed.track_id,
      semester_id: parsed.semester_id,
      name: parsed.name,
      section: parsed.section,
      intake_year: parsed.intake_year,
      student_count: parsed.student_count,
      created_at: new Date().toISOString(),
    };

    this.batches.push(newBatch);

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "batches",
      record_id: newBatch.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: { ...newBatch },
      timestamp: new Date().toISOString(),
    });

    return newBatch;
  }

  // ============================================================================
  // CALENDAR MANAGEMENT & CONSEQUENTIAL RECALCULATION
  // ============================================================================

  public getCalendarEvents(semesterId?: string, campusId?: string): DbCalendarEvent[] {
    let events = this.calendarEvents;
    if (semesterId) events = events.filter((e) => e.semester_id === semesterId);
    if (campusId) events = events.filter((e) => !e.campus_id || e.campus_id === campusId);
    return events;
  }

  public createCalendarEvent(
    rawInput: unknown,
    user: AuthenticatedUser
  ): { event: DbCalendarEvent; shifts: SessionShiftRecord[] } {
    const parsed = CalendarEventCreateSchema.parse(rawInput);
    assertAuthorized(
      canManageCalendar(user, parsed.campus_id),
      "Unauthorized to manage calendar events for this campus"
    );

    const newEvent: DbCalendarEvent = {
      id: `f1111111-${Date.now().toString(16).padStart(4, "0").slice(-4)}-1111-1111-111111111111`,
      semester_id: parsed.semester_id,
      campus_id: parsed.campus_id || null,
      title: parsed.title,
      event_type: parsed.event_type,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      is_instructional: parsed.is_instructional,
      description: parsed.description || null,
      change_reason: parsed.change_reason || null,
      is_recurring: parsed.is_recurring,
      recurring_pattern: parsed.recurring_pattern || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.calendarEvents.push(newEvent);

    // Invalidate and recalculate dependent planned session dates
    const semester = this.semesters.find((s) => s.id === parsed.semester_id);
    let shifts: SessionShiftRecord[] = [];
    if (semester) {
      const recalc = recalculatePlannedSessions(
        this.scheduledSessions,
        this.timetableSlots,
        semester.start_date,
        semester.end_date,
        semester.saturday_rule,
        this.calendarEvents.filter((e) => e.semester_id === parsed.semester_id)
      );
      this.scheduledSessions = recalc.updatedSessions;
      shifts = recalc.shifts;
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "calendar_events",
      record_id: newEvent.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: { ...newEvent, sessionShiftsTriggered: shifts.length },
      timestamp: new Date().toISOString(),
    });

    return { event: newEvent, shifts };
  }

  public updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEventCreateInput>,
    user: AuthenticatedUser
  ): { event: DbCalendarEvent; shifts: SessionShiftRecord[] } {
    const index = this.calendarEvents.findIndex((e) => e.id === eventId);
    if (index === -1) throw new Error(`Calendar event ${eventId} not found`);

    const prev = this.calendarEvents[index];
    assertAuthorized(
      canManageCalendar(user, prev.campus_id),
      "Unauthorized to modify calendar event"
    );

    // Consequential change check: changing dates or instructional status requires an audit reason
    const isConsequential =
      (updates.start_date && updates.start_date !== prev.start_date) ||
      (updates.end_date && updates.end_date !== prev.end_date) ||
      (updates.event_type && updates.event_type !== prev.event_type) ||
      (updates.is_instructional !== undefined && updates.is_instructional !== prev.is_instructional);

    if (isConsequential && !updates.change_reason) {
      throw new Error("A change reason is mandatory when modifying teaching dates or holiday status.");
    }

    const updated: DbCalendarEvent = {
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.calendarEvents[index] = updated;

    // Recalculate planned sessions
    const semester = this.semesters.find((s) => s.id === updated.semester_id);
    let shifts: SessionShiftRecord[] = [];
    if (semester) {
      const recalc = recalculatePlannedSessions(
        this.scheduledSessions,
        this.timetableSlots,
        semester.start_date,
        semester.end_date,
        semester.saturday_rule,
        this.calendarEvents.filter((e) => e.semester_id === updated.semester_id)
      );
      this.scheduledSessions = recalc.updatedSessions;
      shifts = recalc.shifts;
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "calendar_events",
      record_id: eventId,
      action: "UPDATE",
      changed_by: user.id,
      old_values: { start_date: prev.start_date, end_date: prev.end_date, event_type: prev.event_type },
      new_values: { start_date: updated.start_date, end_date: updated.end_date, event_type: updated.event_type, change_reason: updates.change_reason },
      timestamp: new Date().toISOString(),
    });

    return { event: updated, shifts };
  }

  public deleteCalendarEvent(
    eventId: string,
    reason: string,
    user: AuthenticatedUser
  ): { deletedId: string; shifts: SessionShiftRecord[] } {
    const index = this.calendarEvents.findIndex((e) => e.id === eventId);
    if (index === -1) throw new Error(`Calendar event ${eventId} not found`);

    const event = this.calendarEvents[index];
    assertAuthorized(
      canManageCalendar(user, event.campus_id),
      "Unauthorized to delete calendar event"
    );

    if (!reason || reason.trim().length === 0) {
      throw new Error("A reason must be provided when deleting a calendar event.");
    }

    this.calendarEvents.splice(index, 1);

    // Recalculate planned sessions
    const semester = this.semesters.find((s) => s.id === event.semester_id);
    let shifts: SessionShiftRecord[] = [];
    if (semester) {
      const recalc = recalculatePlannedSessions(
        this.scheduledSessions,
        this.timetableSlots,
        semester.start_date,
        semester.end_date,
        semester.saturday_rule,
        this.calendarEvents.filter((e) => e.semester_id === event.semester_id)
      );
      this.scheduledSessions = recalc.updatedSessions;
      shifts = recalc.shifts;
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "calendar_events",
      record_id: eventId,
      action: "DELETE",
      changed_by: user.id,
      old_values: { ...event, deletion_reason: reason },
      timestamp: new Date().toISOString(),
    });

    return { deletedId: eventId, shifts };
  }

  // ============================================================================
  // EXAM WINDOWS
  // ============================================================================

  public getExamWindows(semesterId?: string): DbExamWindow[] {
    if (!semesterId) return this.examWindows;
    return this.examWindows.filter((e) => e.semester_id === semesterId);
  }

  public createExamWindow(rawInput: unknown, user: AuthenticatedUser): DbExamWindow {
    const parsed = ExamWindowCreateSchema.parse(rawInput);
    assertAuthorized(
      canManageExams(user, parsed.campus_id),
      "Unauthorized to manage exam windows for this campus"
    );

    const newExam: DbExamWindow = {
      id: `66666666-${Date.now().toString(16).padStart(4, "0").slice(-4)}-6666-6666-666666666666`,
      semester_id: parsed.semester_id,
      name: parsed.name,
      exam_type: parsed.exam_type,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      weightage_percent: parsed.weightage_percent,
      campus_id: parsed.campus_id || null,
      track_id: parsed.track_id || null,
      batch_id: parsed.batch_id || null,
      subject_id: parsed.subject_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.examWindows.push(newExam);

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "exam_windows",
      record_id: newExam.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: { ...newExam },
      timestamp: new Date().toISOString(),
    });

    return newExam;
  }

  public updateExamWindow(
    examId: string,
    updates: Partial<ExamWindowCreateInput>,
    user: AuthenticatedUser
  ): DbExamWindow {
    const index = this.examWindows.findIndex((e) => e.id === examId);
    if (index === -1) throw new Error(`Exam window ${examId} not found`);

    const prev = this.examWindows[index];
    assertAuthorized(
      canManageExams(user, prev.campus_id),
      "Unauthorized to modify exam window"
    );

    const updated: DbExamWindow = {
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.examWindows[index] = updated;

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "exam_windows",
      record_id: examId,
      action: "UPDATE",
      changed_by: user.id,
      old_values: { start_date: prev.start_date, end_date: prev.end_date },
      new_values: { start_date: updated.start_date, end_date: updated.end_date },
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  public deleteExamWindow(examId: string, user: AuthenticatedUser): string {
    const index = this.examWindows.findIndex((e) => e.id === examId);
    if (index === -1) throw new Error(`Exam window ${examId} not found`);

    const exam = this.examWindows[index];
    assertAuthorized(
      canManageExams(user, exam.campus_id),
      "Unauthorized to delete exam window"
    );

    this.examWindows.splice(index, 1);

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "exam_windows",
      record_id: examId,
      action: "DELETE",
      changed_by: user.id,
      old_values: { ...exam },
      timestamp: new Date().toISOString(),
    });

    return examId;
  }

  // ============================================================================
  // SAFE BATCH TRANSACTION IMPORT
  // ============================================================================

  public importCalendarEventsBatch(
    semesterId: string,
    parsedRows: ParsedImportRow<CalendarEventCreateInput>[],
    user: AuthenticatedUser,
    skipDuplicates: boolean = true
  ): ImportExecutionReport {
    assertAuthorized(
      canManageCalendar(user),
      "Unauthorized to import calendar events"
    );

    const invalidRows = parsedRows.filter((r) => !r.isValid);
    if (invalidRows.length > 0 && !skipDuplicates) {
      return {
        success: false,
        importedCount: 0,
        failedCount: invalidRows.length,
        skippedDuplicatesCount: 0,
        details: invalidRows.map(
          (r) => `Row ${r.rowNumber}: ${r.errors.map((e) => `${e.column}: ${e.message}`).join(", ")}`
        ),
      };
    }

    const eligibleRows = parsedRows.filter((r) => r.isValid && (!r.isDuplicate || !skipDuplicates));
    const duplicatesCount = parsedRows.filter((r) => r.isDuplicate).length;

    const newEvents: DbCalendarEvent[] = [];
    const details: string[] = [];

    for (const row of eligibleRows) {
      if (!row.data) continue;
      const newEvent: DbCalendarEvent = {
        id: `f1111111-${Date.now().toString(16).padStart(4, "0").slice(-4)}-${row.rowNumber.toString().padStart(4, "0")}-111111111111`,
        semester_id: semesterId,
        campus_id: row.data.campus_id || null,
        title: row.data.title,
        event_type: row.data.event_type,
        start_date: row.data.start_date,
        end_date: row.data.end_date,
        is_instructional: row.data.is_instructional,
        description: row.data.description || null,
        change_reason: "Imported via CSV Batch Transaction",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.calendarEvents.push(newEvent);
      newEvents.push(newEvent);
      details.push(`Imported "${newEvent.title}" (${newEvent.start_date} to ${newEvent.end_date})`);
    }

    // Trigger atomic recalculation for the entire batch
    const semester = this.semesters.find((s) => s.id === semesterId);
    let recalculatedCount = 0;
    if (semester && newEvents.length > 0) {
      const recalc = recalculatePlannedSessions(
        this.scheduledSessions,
        this.timetableSlots,
        semester.start_date,
        semester.end_date,
        semester.saturday_rule,
        this.calendarEvents.filter((e) => e.semester_id === semesterId)
      );
      this.scheduledSessions = recalc.updatedSessions;
      recalculatedCount = recalc.shifts.length;
    }

    // Append batch execution audit record
    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "calendar_events",
      record_id: `batch-${Date.now()}`,
      action: "INSERT",
      changed_by: user.id,
      new_values: {
        batchImport: true,
        importedCount: newEvents.length,
        skippedDuplicatesCount: duplicatesCount,
        recalculatedSessionsCount: recalculatedCount,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      importedCount: newEvents.length,
      failedCount: invalidRows.length,
      skippedDuplicatesCount: duplicatesCount,
      recalculatedSessionsCount: recalculatedCount,
      details,
    };
  }
}

export const isolatedDataStore = new IsolatedDataStore();
