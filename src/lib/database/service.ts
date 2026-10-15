import { isSupabaseConfigured } from "../supabase/config";
import { createClient } from "../supabase/client";
import {
  DbCampus,
  DbSemester,
  DbBatch,
  DbSubject,
  DbSyllabusTopic,
  DbSyllabusUnit,
  DbTopicExamScope,
  DbScheduledSession,
  DbSessionLog,
  DbAuditLog,
  DbCalendarEvent,
  DbExamWindow,
  DbTimetableSlot,
  DbBatchSubject,
  DbFacultyAssignment,
  ExamTypeEnum,
  FacultyDashboardData,
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
  TimetableSlotCreateSchema,
  SyllabusUnitCreateSchema,
  SyllabusTopicCreateSchema,
} from "../../validation/database";
import {
  AuthenticatedUser,
  canLogSession,
  canManageSemester,
  canManageCalendar,
  canManageExams,
  canManageTimetable,
  canEditLessonPlan,
  assertAuthorized,
  AuthorizationError,
} from "../../auth/authorization";
import {
  recalculatePlannedSessions,
  SessionShiftRecord,
} from "../../domain/calendar-engine";
import {
  calculateSlotDurationHours,
  validateTimetableSlotConflicts,
  planSyllabusTopicDates,
} from "../../domain/planning-engine";
import {
  ParsedImportRow,
  ImportExecutionReport,
  ParsedSyllabusRowData,
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
      campus_id: "11111111-1111-1111-1111-111111111111", // HITECH
      track_id: "aaaaaaaa-1111-1111-1111-111111111111", // Mirai
      semester_id: "55555555-5555-5555-5555-555555555555",
      name: "CSE 2026 Sec B",
      section: "B",
      intake_year: 2026,
      student_count: 64,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "77777777-7777-7777-7777-777777777772",
      campus_id: "11111111-1111-1111-1111-111111111111", // HITECH
      track_id: "aaaaaaaa-2222-2222-2222-222222222222", // University Track
      semester_id: "55555555-5555-5555-5555-555555555555",
      name: "CSE 2026 Sec A",
      section: "A",
      intake_year: 2026,
      student_count: 60,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "77777777-7777-7777-7777-777777777773",
      campus_id: "22222222-2222-2222-2222-222222222222", // RATNAM
      track_id: "aaaaaaaa-2222-2222-2222-222222222222", // University Track
      semester_id: "55555555-5555-5555-5555-555555555555",
      name: "ECE 2026 Sec R",
      section: "R",
      intake_year: 2026,
      student_count: 58,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "77777777-7777-7777-7777-777777777774",
      campus_id: "33333333-3333-3333-3333-333333333333", // RGIB
      track_id: "aaaaaaaa-1111-1111-1111-111111111111", // Mirai Track
      semester_id: "55555555-5555-5555-5555-555555555555",
      name: "AIML 2026 Sec G",
      section: "G",
      intake_year: 2026,
      student_count: 62,
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
    {
      id: "88888888-8888-8888-8888-888888888883",
      code: "CS301",
      name: "Computer Networks",
      department: "CSE",
      credit_hours: 4,
      total_planned_hours: 40.0,
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
      planned_date: "2026-10-14",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-10-14T11:30:00Z",
    },
    {
      id: "b0000001-1111-1111-1111-111111111104",
      unit_id: "a0000001-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888881",
      sequence_order: 4,
      title: "Stacks, Queues, and Priority Queue Deques",
      planned_hours: 1.5,
      status: "NOT_STARTED",
      percent_complete: 0,
      planned_date: "2026-10-16",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "b0000001-1111-1111-1111-111111111105",
      unit_id: "a0000001-1111-1111-1111-111111111112",
      subject_id: "88888888-8888-8888-8888-888888888881",
      sequence_order: 5,
      title: "Binary Search Trees & AVL Height Balancing",
      planned_hours: 2.0,
      status: "NOT_STARTED",
      percent_complete: 0,
      planned_date: "2026-10-19",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
    // CS202: Operating Systems (Tight Status)
    {
      id: "b0000002-1111-1111-1111-111111111101",
      unit_id: "a0000002-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888882",
      sequence_order: 1,
      title: "OS Structures & Process Architecture",
      planned_hours: 3.0,
      status: "COMPLETED",
      percent_complete: 100,
      planned_date: "2026-08-10",
      actual_completed_date: "2026-08-10",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-10T11:30:00Z",
    },
    {
      id: "b0000002-1111-1111-1111-111111111102",
      unit_id: "a0000002-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888882",
      sequence_order: 2,
      title: "Thread Concurrency & Critical Section Problem",
      planned_hours: 3.0,
      status: "IN_PROGRESS",
      percent_complete: 50,
      planned_date: "2026-10-08", // Overdue topic
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-10-08T11:30:00Z",
    },
    {
      id: "b0000002-1111-1111-1111-111111111103",
      unit_id: "a0000002-1111-1111-1111-111111111112",
      subject_id: "88888888-8888-8888-8888-888888888882",
      sequence_order: 3,
      title: "Deadlock Avoidance & Banker's Algorithm",
      planned_hours: 4.0,
      status: "NOT_STARTED",
      percent_complete: 0,
      planned_date: "2026-10-22",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
    // CS301: Computer Networks (Danger Status)
    {
      id: "b0000003-1111-1111-1111-111111111101",
      unit_id: "a0000003-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888883",
      sequence_order: 1,
      title: "Layered Network Architectures & Physical Layer",
      planned_hours: 2.0,
      status: "COMPLETED",
      percent_complete: 100,
      planned_date: "2026-08-12",
      actual_completed_date: "2026-08-12",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-12T11:30:00Z",
    },
    {
      id: "b0000003-1111-1111-1111-111111111102",
      unit_id: "a0000003-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888883",
      sequence_order: 2,
      title: "Data Link Layer Framing & Error Detection",
      planned_hours: 2.0,
      status: "IN_PROGRESS",
      percent_complete: 20,
      planned_date: "2026-10-05", // Overdue topic
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-10-05T11:30:00Z",
    },
    {
      id: "b0000003-1111-1111-1111-111111111103",
      unit_id: "a0000003-1111-1111-1111-111111111112",
      subject_id: "88888888-8888-8888-8888-888888888883",
      sequence_order: 3,
      title: "IP Addressing, Subnetting & CIDR",
      planned_hours: 6.0,
      status: "NOT_STARTED",
      percent_complete: 0,
      planned_date: "2026-10-24",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    },
  ];

  private scheduledSessions: DbScheduledSession[] = [
    {
      id: "d0000001-1111-1111-1111-111111111101",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111111",
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
      timetable_slot_id: "c0000001-1111-1111-1111-111111111112",
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
      timetable_slot_id: "c0000001-1111-1111-1111-111111111113",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-08-07",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111104",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111112",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-14",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111105",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111113",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-16",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111106",
      batch_subject_id: "99999999-1111-1111-1111-111111111112",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-16",
      start_time: "14:00:00",
      end_time: "15:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111107",
      batch_subject_id: "99999999-1111-1111-1111-111111111113",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111112",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-20",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111108",
      batch_subject_id: "99999999-1111-1111-1111-111111111114",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-21",
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      occurrence_status: "SCHEDULED",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "d0000001-1111-1111-1111-111111111109",
      batch_subject_id: "99999999-1111-1111-1111-111111111115",
      timetable_slot_id: "c0000001-1111-1111-1111-111111111113",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      session_date: "2026-10-22",
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

  private batchSubjects: DbBatchSubject[] = [
    {
      id: "99999999-1111-1111-1111-111111111111",
      batch_id: "77777777-7777-7777-7777-777777777771", // HITECH Sec B (Mirai)
      subject_id: "88888888-8888-8888-8888-888888888881", // CS201 DSA (On Track)
      target_finish_date: "2026-12-15",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "99999999-1111-1111-1111-111111111112",
      batch_id: "77777777-7777-7777-7777-777777777771", // HITECH Sec B (Mirai)
      subject_id: "88888888-8888-8888-8888-888888888882", // CS202 OS (Tight)
      target_finish_date: "2026-12-15",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "99999999-1111-1111-1111-111111111113",
      batch_id: "77777777-7777-7777-7777-777777777772", // HITECH Sec A (Univ)
      subject_id: "88888888-8888-8888-8888-888888888883", // CS301 CN (Danger)
      target_finish_date: "2026-12-15",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "99999999-1111-1111-1111-111111111114",
      batch_id: "77777777-7777-7777-7777-777777777773", // RATNAM Sec R (Univ)
      subject_id: "88888888-8888-8888-8888-888888888882", // CS202 OS (Tight)
      target_finish_date: "2026-12-15",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "99999999-1111-1111-1111-111111111115",
      batch_id: "77777777-7777-7777-7777-777777777774", // RGIB Sec G (Mirai)
      subject_id: "88888888-8888-8888-8888-888888888881", // CS201 DSA (On Track)
      target_finish_date: "2026-12-15",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private facultyAssignments: DbFacultyAssignment[] = [
    {
      id: "e0000001-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      is_primary: true,
      is_visiting: false,
      assigned_at: "2026-08-01T00:00:00Z",
    },
  ];

  private syllabusUnits: DbSyllabusUnit[] = [
    {
      id: "a0000001-1111-1111-1111-111111111111",
      subject_id: "88888888-8888-8888-8888-888888888881",
      unit_number: 1,
      title: "Algorithmic Foundations & Linear Data Structures",
      description: "Core asymptotic bounds, dynamic arrays, linked structures",
      planned_hours: 12.0,
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "a0000001-1111-1111-1111-111111111112",
      subject_id: "88888888-8888-8888-8888-888888888881",
      unit_number: 2,
      title: "Trees, Heaps & Balanced Search Trees",
      description: "BST, AVL, Red-Black Trees, Priority Queues",
      planned_hours: 14.0,
      created_at: "2026-08-01T00:00:00Z",
    },
  ];

  private topicExamScopes: DbTopicExamScope[] = [
    {
      id: "scope-1",
      topic_id: "b0000001-1111-1111-1111-111111111101",
      exam_type: "SESSIONAL",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "scope-2",
      topic_id: "b0000001-1111-1111-1111-111111111101",
      exam_type: "MID_TERM",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "scope-3",
      topic_id: "b0000001-1111-1111-1111-111111111102",
      exam_type: "SESSIONAL",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "scope-4",
      topic_id: "b0000001-1111-1111-1111-111111111102",
      exam_type: "MID_TERM",
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: "scope-5",
      topic_id: "b0000001-1111-1111-1111-111111111103",
      exam_type: "MID_TERM",
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

    // 3. Idempotency Check: if request contains an idempotency_key that was already processed, return existing record
    if (parsed.idempotency_key) {
      const existingByIdempotency = this.sessionLogs.find(
        (l) => l.idempotency_key === parsed.idempotency_key
      );
      if (existingByIdempotency) {
        return { log: existingByIdempotency, updatedTopics: [] };
      }
    }

    // 4. Uniqueness Enforcement: At most one canonical log per scheduled occurrence
    const existingLog = this.sessionLogs.find(
      (l) => l.scheduled_session_id === parsed.scheduled_session_id
    );
    if (existingLog) {
      throw new Error(
        `Constraint Violation: A canonical session log (ID: ${existingLog.id}) already exists for scheduled session ${parsed.scheduled_session_id}. Multiple canonical logs are forbidden.`
      );
    }

    // 5. Create canonical log
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
      status_reason: parsed.status_reason || null,
      merged_session_ids: parsed.merged_session_ids || [],
      idempotency_key: parsed.idempotency_key || null,
      covered_summary: parsed.covered_summary || null,
      leftover_summary: parsed.leftover_summary || null,
      carry_forward_topic_id: parsed.carry_forward_topic_id || null,
      classwork_status: parsed.classwork_status,
      homework_status: parsed.homework_status,
      notes: parsed.notes || null,
      is_verified: true,
      logged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.sessionLogs.push(canonicalLog);

    // 6. Update scheduled session status
    const scheduled = this.scheduledSessions.find((s) => s.id === parsed.scheduled_session_id);
    if (scheduled) {
      if (parsed.delivery_status === "SKIPPED") {
        scheduled.occurrence_status = "SKIPPED";
      } else if (parsed.delivery_status === "CANCELLED") {
        scheduled.occurrence_status = "CANCELLED";
      } else {
        scheduled.occurrence_status = "COMPLETED";
      }
    }

    // For merged sessions: mark referenced scheduled sessions as MERGED
    // Planned and actual hours are not counted twice because only this single canonical log records actual minutes.
    if (parsed.delivery_status === "MERGED" && parsed.merged_session_ids && parsed.merged_session_ids.length > 0) {
      for (const mergedId of parsed.merged_session_ids) {
        const mergedSession = this.scheduledSessions.find((s) => s.id === mergedId);
        if (mergedSession) {
          mergedSession.occurrence_status = "MERGED";
        }
      }
    }

    // 7. Update topic progress state (traceable, no duplicate progress counting)
    // CRITICAL REQUIREMENT: Do not mark an entire topic as skipped just because one class session was skipped.
    const updatedTopics: DbSyllabusTopic[] = [];
    if (parsed.delivery_status !== "SKIPPED" && parsed.delivery_status !== "CANCELLED") {
      for (const affected of parsed.affected_topics) {
        const topicIndex = this.topics.findIndex((t) => t.id === affected.topic_id);
        if (topicIndex >= 0) {
          this.topics[topicIndex] = {
            ...this.topics[topicIndex],
            percent_complete: affected.percent_complete_after,
            status: affected.topic_status_after,
            actual_completed_date:
              affected.percent_complete_after >= 100
                ? parsed.session_date
                : this.topics[topicIndex].actual_completed_date,
            updated_at: new Date().toISOString(),
          };
          updatedTopics.push(this.topics[topicIndex]);
        }
      }
    }

    // 8. Append to Audit Log
    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "session_logs",
      record_id: newLogId,
      action: "INSERT",
      changed_by: user.id,
      new_values: {
        scheduled_session_id: parsed.scheduled_session_id,
        delivery_status: parsed.delivery_status,
        status_reason: parsed.status_reason,
        merged_session_ids: parsed.merged_session_ids,
        duration_minutes: durationMinutes,
        affected_topics_count: updatedTopics.length,
      },
      timestamp: new Date().toISOString(),
    });

    // 9. Recalculate Subject Planning
    const batchSubj = this.batchSubjects.find((bs) => bs.id === parsed.batch_subject_id);
    if (batchSubj) {
      this.recalculateSubjectPlanning(batchSubj.subject_id, batchSubj.id);
    }

    return { log: canonicalLog, updatedTopics };
  }

  public getAllScheduledSessions(): DbScheduledSession[] {
    return this.scheduledSessions;
  }

  public getAllSessionLogs(): DbSessionLog[] {
    return this.sessionLogs;
  }

  /**
   * Aggregates real-time faculty dashboard data:
   * - Today's scheduled sessions (with logged indicator)
   * - Sessions already logged
   * - Sessions awaiting a log
   * - Overdue syllabus topics
   * - Subjects requiring immediate attention
   */
  public getFacultyDashboardData(
    facultyId: string,
    todayDate: string = "2026-10-16"
  ): FacultyDashboardData {
    // 1. All subjects assigned to this faculty
    const assignments = this.facultyAssignments.filter((a) => a.faculty_id === facultyId);
    const assignedBatchSubjectIds = new Set(assignments.map((a) => a.batch_subject_id));

    // Batch subjects map
    const batchSubjectsMap = new Map(this.batchSubjects.map((bs) => [bs.id, bs]));
    const subjectsMap = new Map(this.subjects.map((s) => [s.id, s]));
    const batchesMap = new Map(this.batches.map((b) => [b.id, b]));
    const slotsMap = new Map(this.timetableSlots.map((ts) => [ts.id, ts]));

    // Helper to get subject details
    const getSubjectDetails = (batchSubjectId: string) => {
      const bs = batchSubjectsMap.get(batchSubjectId);
      const subject = bs ? subjectsMap.get(bs.subject_id) : undefined;
      const batch = bs ? batchesMap.get(bs.batch_id) : undefined;
      return {
        subject_name: subject?.name || "Data Structures & Algorithms",
        subject_code: subject?.code || "CS201",
        batch_name: batch?.name || "CSE 2026 Sec B",
        subject_id: subject?.id || "88888888-8888-8888-8888-888888888881",
        total_planned_hours: subject?.total_planned_hours || 48.0,
      };
    };

    // 2. Today's scheduled sessions
    const facultySessions = this.scheduledSessions.filter((s) => s.faculty_id === facultyId);
    const loggedSessionMap = new Map(this.sessionLogs.map((l) => [l.scheduled_session_id, l]));

    const todaySessions = facultySessions
      .filter((s) => s.session_date === todayDate)
      .map((s) => {
        const details = getSubjectDetails(s.batch_subject_id);
        const slot = s.timetable_slot_id ? slotsMap.get(s.timetable_slot_id) : undefined;
        const isLogged =
          loggedSessionMap.has(s.id) ||
          s.occurrence_status === "COMPLETED" ||
          s.occurrence_status === "SKIPPED" ||
          s.occurrence_status === "CANCELLED" ||
          s.occurrence_status === "MERGED";
        return {
          ...s,
          subject_name: details.subject_name,
          subject_code: details.subject_code,
          batch_name: details.batch_name,
          room: slot?.room || "Lab 3",
          is_logged: isLogged,
        };
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    // 3. Sessions already logged
    const loggedSessions = this.sessionLogs
      .filter((l) => l.faculty_id === facultyId)
      .map((l) => {
        const details = getSubjectDetails(l.batch_subject_id);
        const logTopics = this.topics.filter((t) => t.subject_id === details.subject_id);
        return {
          ...l,
          subject_name: details.subject_name,
          subject_code: details.subject_code,
          batch_name: details.batch_name,
          topic_titles: logTopics.map((t) => t.title),
        };
      })
      .sort(
        (a, b) =>
          b.session_date.localeCompare(a.session_date) ||
          b.actual_start_time.localeCompare(a.actual_start_time)
      );

    // 4. Sessions awaiting a log: scheduled <= todayDate and no session_log
    const awaitingLogSessions = facultySessions
      .filter((s) => {
        const isPastOrToday = s.session_date <= todayDate;
        const hasLog = loggedSessionMap.has(s.id);
        const isClosed =
          s.occurrence_status === "COMPLETED" ||
          s.occurrence_status === "CANCELLED" ||
          s.occurrence_status === "MERGED" ||
          s.occurrence_status === "SKIPPED";
        return isPastOrToday && !hasLog && !isClosed;
      })
      .map((s) => {
        const details = getSubjectDetails(s.batch_subject_id);
        const slot = s.timetable_slot_id ? slotsMap.get(s.timetable_slot_id) : undefined;
        return {
          ...s,
          subject_name: details.subject_name,
          subject_code: details.subject_code,
          batch_name: details.batch_name,
          room: slot?.room || "Lab 3",
        };
      })
      .sort(
        (a, b) =>
          a.session_date.localeCompare(b.session_date) ||
          a.start_time.localeCompare(b.start_time)
      );

    // 5. Overdue topics: planned_date < todayDate and percent_complete < 100 and status !== 'COMPLETED'
    const overdueTopics: Array<
      DbSyllabusTopic & { subject_name: string; subject_code: string; days_overdue: number }
    > = [];
    const relevantSubjectIds = new Set<string>();
    for (const batchSubjId of Array.from(assignedBatchSubjectIds)) {
      const bs = batchSubjectsMap.get(batchSubjId);
      if (bs) relevantSubjectIds.add(bs.subject_id);
    }
    // Fallback if no explicit assignments are loaded
    if (relevantSubjectIds.size === 0) {
      relevantSubjectIds.add("88888888-8888-8888-8888-888888888881");
    }

    for (const subjId of Array.from(relevantSubjectIds)) {
      const subj = subjectsMap.get(subjId);
      if (!subj) continue;
      const subjTopics = this.topics.filter((t) => t.subject_id === subj.id);
      for (const topic of subjTopics) {
        if (
          topic.planned_date &&
          topic.planned_date < todayDate &&
          topic.percent_complete < 100 &&
          topic.status !== "COMPLETED"
        ) {
          const plannedMs = new Date(topic.planned_date).getTime();
          const todayMs = new Date(todayDate).getTime();
          const daysOverdue = Math.max(1, Math.round((todayMs - plannedMs) / (1000 * 60 * 60 * 24)));
          overdueTopics.push({
            ...topic,
            subject_name: subj.name,
            subject_code: subj.code,
            days_overdue: daysOverdue,
          });
        }
      }
    }

    // 6. Subjects requiring attention
    const subjectsRequiringAttention: FacultyDashboardData["subjectsRequiringAttention"] = [];
    for (const subjId of Array.from(relevantSubjectIds)) {
      const subj = subjectsMap.get(subjId);
      if (!subj) continue;
      const bs = this.batchSubjects.find((b) => b.subject_id === subj.id);
      const batch = bs ? batchesMap.get(bs.batch_id) : this.batches[0];

      const subjTopics = this.topics.filter((t) => t.subject_id === subj.id);
      const totalPlanned = subj.total_planned_hours || 48;
      const deliveredHours = subjTopics.reduce(
        (acc, t) => acc + t.planned_hours * (t.percent_complete / 100),
        0
      );
      const completionPercentage = Math.round((deliveredHours / Math.max(1, totalPlanned)) * 100);

      const subjOverdue = overdueTopics.filter((t) => t.subject_id === subj.id);
      const subjUnlogged = awaitingLogSessions.filter(
        (s) => !bs || s.batch_subject_id === bs.id
      );

      let paceStatus: "ON_TRACK" | "BEHIND" | "AT_RISK" = "ON_TRACK";
      if (subjOverdue.length >= 2 || subjUnlogged.length >= 2) {
        paceStatus = "AT_RISK";
      } else if (subjOverdue.length > 0 || subjUnlogged.length > 0) {
        paceStatus = "BEHIND";
      }

      if (paceStatus !== "ON_TRACK" || subjOverdue.length > 0 || subjUnlogged.length > 0) {
        subjectsRequiringAttention.push({
          subject_id: subj.id,
          subject_code: subj.code,
          subject_name: subj.name,
          batch_name: batch?.name || "CSE 2026 Sec B",
          planned_hours: totalPlanned,
          delivered_hours: Math.round(deliveredHours * 10) / 10,
          completion_percentage: completionPercentage,
          pace_status: paceStatus,
          overdue_topic_count: subjOverdue.length,
          unlogged_session_count: subjUnlogged.length,
        });
      }
    }

    return {
      todaySessions,
      loggedSessions,
      awaitingLogSessions,
      overdueTopics,
      subjectsRequiringAttention,
    };
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

  // ============================================================================
  // TIMETABLE & FACULTY ASSIGNMENTS
  // ============================================================================

  public getBatchSubjects(): DbBatchSubject[] {
    return this.batchSubjects;
  }

  public getFacultyAssignments(): DbFacultyAssignment[] {
    return this.facultyAssignments;
  }

  public getTimetableSlots(batchSubjectId?: string, facultyId?: string): DbTimetableSlot[] {
    let result = [...this.timetableSlots];
    if (batchSubjectId) {
      result = result.filter((s) => s.batch_subject_id === batchSubjectId);
    }
    if (facultyId) {
      result = result.filter((s) => s.faculty_id === facultyId);
    }
    return result;
  }

  public createTimetableSlot(rawInput: unknown, user: AuthenticatedUser): DbTimetableSlot {
    const parsed = TimetableSlotCreateSchema.parse(rawInput);

    // 1. Authorization check
    const batchSubject = this.batchSubjects.find((bs) => bs.id === parsed.batch_subject_id);
    if (!batchSubject) {
      throw new Error(`Batch subject ID ${parsed.batch_subject_id} not found.`);
    }

    const batch = this.batches.find((b) => b.id === batchSubject.batch_id);
    assertAuthorized(
      canManageTimetable(user, batch?.campus_id),
      "Unauthorized: Only authorized Campus Managers or Admins can configure timetable slots."
    );

    // 2. Conflict validation with batch mapping
    const batchMap = new Map<string, string>();
    this.batchSubjects.forEach((bs) => batchMap.set(bs.id, bs.batch_id));

    const validation = validateTimetableSlotConflicts(parsed, this.timetableSlots, batchMap);
    if (!validation.isValid) {
      throw new Error(
        `Timetable conflict detected: ${validation.conflicts.map((c) => c.message).join(" | ")}`
      );
    }

    // 3. Derive exact teaching hours from slot duration (50 min = 0.8333 hrs, never 1 hr)
    const durationHours = calculateSlotDurationHours(parsed.start_time, parsed.end_time);

    const newSlot: DbTimetableSlot = {
      id: `c0000001-${Date.now().toString(16).padStart(4, "0").slice(-4)}-1111-1111-111111111111`,
      batch_subject_id: parsed.batch_subject_id,
      faculty_id: parsed.faculty_id,
      day_of_week: parsed.day_of_week,
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      duration_hours: durationHours,
      room: parsed.room || null,
      effective_start_date: parsed.effective_start_date || null,
      effective_end_date: parsed.effective_end_date || null,
      is_override: validation.hasOverride,
      override_reason: validation.hasOverride ? parsed.override_reason || null : null,
      created_at: new Date().toISOString(),
    };

    this.timetableSlots.push(newSlot);

    // 4. Audit Log
    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "timetable_slots",
      record_id: newSlot.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: {
        ...newSlot,
        hasOverride: validation.hasOverride,
        override_reason: newSlot.override_reason,
      },
      timestamp: new Date().toISOString(),
    });

    // 5. Trigger topic date recalculation for the subject
    this.recalculateSubjectPlanning(batchSubject.subject_id, batchSubject.id);

    return newSlot;
  }

  public deleteTimetableSlot(
    slotId: string,
    user: AuthenticatedUser,
    reason: string = "Timetable slot deleted"
  ): { success: boolean; slotId: string } {
    const slotIndex = this.timetableSlots.findIndex((s) => s.id === slotId);
    if (slotIndex < 0) {
      throw new Error(`Timetable slot ${slotId} not found.`);
    }

    const slot = this.timetableSlots[slotIndex];
    const batchSubject = this.batchSubjects.find((bs) => bs.id === slot.batch_subject_id);
    const batch = batchSubject ? this.batches.find((b) => b.id === batchSubject.batch_id) : undefined;

    assertAuthorized(
      canManageTimetable(user, batch?.campus_id),
      "Unauthorized: Only authorized Campus Managers or Admins can delete timetable slots."
    );

    this.timetableSlots.splice(slotIndex, 1);

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "timetable_slots",
      record_id: slotId,
      action: "DELETE",
      changed_by: user.id,
      old_values: { ...slot },
      new_values: { reason },
      timestamp: new Date().toISOString(),
    });

    if (batchSubject) {
      this.recalculateSubjectPlanning(batchSubject.subject_id, batchSubject.id);
    }

    return { success: true, slotId };
  }

  // ============================================================================
  // SYLLABUS, LESSON PLANS & TOPIC-TO-EXAM MAPPING
  // ============================================================================

  public getSyllabusUnits(subjectId: string): DbSyllabusUnit[] {
    return this.syllabusUnits
      .filter((u) => u.subject_id === subjectId)
      .sort((a, b) => a.unit_number - b.unit_number);
  }

  public createSyllabusUnit(rawInput: unknown, user: AuthenticatedUser): DbSyllabusUnit {
    const parsed = SyllabusUnitCreateSchema.parse(rawInput);

    const assignments = this.facultyAssignments.filter((fa) => {
      const bs = this.batchSubjects.find((b) => b.id === fa.batch_subject_id);
      return bs?.subject_id === parsed.subject_id;
    });
    const primaryFacultyId = assignments.find((a) => a.is_primary)?.faculty_id || assignments[0]?.faculty_id || "";

    assertAuthorized(
      canEditLessonPlan(user, primaryFacultyId),
      "Unauthorized: Only assigned faculty or academic admin can create syllabus units."
    );

    const duplicate = this.syllabusUnits.find(
      (u) => u.subject_id === parsed.subject_id && u.unit_number === parsed.unit_number
    );
    if (duplicate) {
      throw new Error(`Unit number ${parsed.unit_number} already exists for this subject.`);
    }

    const newUnit: DbSyllabusUnit = {
      id: `a0000001-${Date.now().toString(16).padStart(4, "0").slice(-4)}-1111-1111-111111111111`,
      subject_id: parsed.subject_id,
      unit_number: parsed.unit_number,
      title: parsed.title,
      description: parsed.description || null,
      planned_hours: parsed.planned_hours,
      created_at: new Date().toISOString(),
    };

    this.syllabusUnits.push(newUnit);

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "syllabus_units",
      record_id: newUnit.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: { ...newUnit },
      timestamp: new Date().toISOString(),
    });

    return newUnit;
  }

  public getTopicsWithExamScopes(
    subjectId: string
  ): Array<DbSyllabusTopic & { examScopes: ExamTypeEnum[] }> {
    const topics = this.topics
      .filter((t) => t.subject_id === subjectId)
      .sort((a, b) => a.sequence_order - b.sequence_order);

    return topics.map((t) => {
      const scopes = this.topicExamScopes
        .filter((tes) => tes.topic_id === t.id)
        .map((tes) => tes.exam_type);
      return {
        ...t,
        examScopes: scopes,
      };
    });
  }

  public createSyllabusTopic(rawInput: unknown, user: AuthenticatedUser): DbSyllabusTopic {
    const parsed = SyllabusTopicCreateSchema.parse(rawInput);

    const assignments = this.facultyAssignments.filter((fa) => {
      const bs = this.batchSubjects.find((b) => b.id === fa.batch_subject_id);
      return bs?.subject_id === parsed.subject_id;
    });
    const primaryFacultyId = assignments.find((a) => a.is_primary)?.faculty_id || assignments[0]?.faculty_id || "";

    assertAuthorized(
      canEditLessonPlan(user, primaryFacultyId),
      "Unauthorized: Only assigned faculty or academic admin can manage lesson plans."
    );

    const duplicate = this.topics.find(
      (t) => t.subject_id === parsed.subject_id && t.sequence_order === parsed.sequence_order
    );
    if (duplicate) {
      throw new Error(`Topic sequence order ${parsed.sequence_order} already exists for this subject.`);
    }

    const newTopic: DbSyllabusTopic = {
      id: `b0000001-${Date.now().toString(16).padStart(4, "0").slice(-4)}-1111-1111-111111111111`,
      unit_id: parsed.unit_id,
      subject_id: parsed.subject_id,
      sequence_order: parsed.sequence_order,
      title: parsed.title,
      description: parsed.description || null,
      learning_objectives: parsed.learning_objectives || null,
      planned_hours: parsed.planned_hours,
      status: parsed.status,
      percent_complete: parsed.percent_complete,
      planned_date: parsed.planned_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.topics.push(newTopic);

    // Save exam scopes
    if (parsed.exam_scopes && parsed.exam_scopes.length > 0) {
      parsed.exam_scopes.forEach((scope) => {
        this.topicExamScopes.push({
          id: `scope-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          topic_id: newTopic.id,
          exam_type: scope,
          created_at: new Date().toISOString(),
        });
      });
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "syllabus_topics",
      record_id: newTopic.id,
      action: "INSERT",
      changed_by: user.id,
      new_values: { ...newTopic },
      timestamp: new Date().toISOString(),
    });

    this.recalculateSubjectPlanning(parsed.subject_id);

    return newTopic;
  }

  public getTopicExamScopes(subjectIdOrTopicId?: string): DbTopicExamScope[] {
    if (!subjectIdOrTopicId) {
      return this.topicExamScopes;
    }
    // Check if ID matches a subject
    const subjectTopics = this.topics.filter((t) => t.subject_id === subjectIdOrTopicId);
    if (subjectTopics.length > 0) {
      const topicIds = new Set(subjectTopics.map((t) => t.id));
      return this.topicExamScopes.filter((s) => topicIds.has(s.topic_id));
    }
    // Otherwise filter by topic_id
    return this.topicExamScopes.filter((s) => s.topic_id === subjectIdOrTopicId);
  }

  public setTopicExamScopes(
    topicId: string,
    examTypes: ExamTypeEnum[],
    user: AuthenticatedUser
  ): DbTopicExamScope[] {
    const topic = this.topics.find((t) => t.id === topicId);
    if (!topic) throw new Error(`Topic ${topicId} not found.`);

    const assignments = this.facultyAssignments.filter((fa) => {
      const bs = this.batchSubjects.find((b) => b.id === fa.batch_subject_id);
      return bs?.subject_id === topic.subject_id;
    });
    const primaryFacultyId = assignments.find((a) => a.is_primary)?.faculty_id || assignments[0]?.faculty_id || "";

    assertAuthorized(
      canEditLessonPlan(user, primaryFacultyId),
      "Unauthorized: Only assigned faculty or academic admin can update topic exam mappings."
    );

    // Clear existing scopes for this topic
    this.topicExamScopes = this.topicExamScopes.filter((s) => s.topic_id !== topicId);

    const newScopes: DbTopicExamScope[] = [];
    for (const examType of examTypes) {
      const scope: DbTopicExamScope = {
        id: `scope-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        topic_id: topicId,
        exam_type: examType,
        created_at: new Date().toISOString(),
      };
      this.topicExamScopes.push(scope);
      newScopes.push(scope);
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "topic_exam_scopes",
      record_id: topicId,
      action: "UPDATE",
      changed_by: user.id,
      new_values: { examTypes },
      timestamp: new Date().toISOString(),
    });

    return newScopes;
  }

  /**
   * Batch imports a structured syllabus lesson plan, preserving original sequence order.
   * Auto-creates or attaches units, creates topics, and links multi-exam mappings.
   * Immediately recalculates topic planned dates with the planning engine.
   */
  public importSyllabusBatch(
    subjectId: string,
    rows: ParsedSyllabusRowData[],
    user: AuthenticatedUser
  ): ImportExecutionReport {
    const assignments = this.facultyAssignments.filter((fa) => {
      const bs = this.batchSubjects.find((b) => b.id === fa.batch_subject_id);
      return bs?.subject_id === subjectId;
    });
    const primaryFacultyId = assignments.find((a) => a.is_primary)?.faculty_id || assignments[0]?.faculty_id || "";

    assertAuthorized(
      canEditLessonPlan(user, primaryFacultyId),
      "Unauthorized: Only assigned faculty or academic admin can import syllabus lesson plans."
    );

    const details: string[] = [];
    let importedTopicsCount = 0;

    // Sort rows by topic sequence to strictly preserve original syllabus order
    const sortedRows = [...rows].sort((a, b) => a.topic_sequence - b.topic_sequence);

    for (const row of sortedRows) {
      // 1. Find or create Unit
      let unit = this.syllabusUnits.find(
        (u) => u.subject_id === subjectId && u.unit_number === row.unit_number
      );

      if (!unit) {
        unit = {
          id: `a0000001-${Date.now().toString(16).padStart(4, "0").slice(-4)}-${row.unit_number.toString().padStart(4, "0")}-111111111111`,
          subject_id: subjectId,
          unit_number: row.unit_number,
          title: row.unit_title,
          description: null,
          planned_hours: row.planned_hours,
          created_at: new Date().toISOString(),
        };
        this.syllabusUnits.push(unit);
      }

      // 2. Find or create Topic
      let topic = this.topics.find(
        (t) => t.subject_id === subjectId && t.sequence_order === row.topic_sequence
      );

      if (topic) {
        topic.title = row.topic_title;
        topic.planned_hours = row.planned_hours;
        topic.description = row.description || null;
        topic.learning_objectives = row.learning_objectives || null;
        topic.unit_id = unit.id;
        topic.updated_at = new Date().toISOString();
      } else {
        topic = {
          id: `b0000001-${Date.now().toString(16).padStart(4, "0").slice(-4)}-${row.topic_sequence.toString().padStart(4, "0")}-111111111111`,
          unit_id: unit.id,
          subject_id: subjectId,
          sequence_order: row.topic_sequence,
          title: row.topic_title,
          description: row.description || null,
          learning_objectives: row.learning_objectives || null,
          planned_hours: row.planned_hours,
          status: "NOT_STARTED",
          percent_complete: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.topics.push(topic);
      }

      importedTopicsCount++;

      // 3. Update exam scopes
      this.topicExamScopes = this.topicExamScopes.filter((s) => s.topic_id !== topic!.id);
      for (const examScope of row.exam_scopes) {
        this.topicExamScopes.push({
          id: `scope-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          topic_id: topic.id,
          exam_type: examScope,
          created_at: new Date().toISOString(),
        });
      }

      details.push(
        `Imported topic #${row.topic_sequence}: "${row.topic_title}" (${row.planned_hours} hrs, Unit ${row.unit_number})`
      );
    }

    // 4. Trigger planning calculation
    const planning = this.recalculateSubjectPlanning(subjectId);

    // 5. Audit Log
    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      table_name: "syllabus_topics",
      record_id: `batch-syllabus-${subjectId}`,
      action: "INSERT",
      changed_by: user.id,
      new_values: {
        subjectId,
        importedTopicsCount,
        recalculatedTopicsCount: planning.updatedTopicsCount,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      importedCount: importedTopicsCount,
      failedCount: 0,
      skippedDuplicatesCount: 0,
      recalculatedSessionsCount: planning.updatedTopicsCount,
      details,
    };
  }

  /**
   * Automatically derives planned dates for all topics of a subject based on
   * weekly timetable slots, calendar events, holidays, and 2nd/4th Saturday rules.
   */
  public recalculateSubjectPlanning(
    subjectId: string,
    batchSubjectId?: string
  ): {
    updatedTopicsCount: number;
    occurrencesCount: number;
    topicPlannedDates: Map<string, string | null>;
  } {
    // 1. Locate batch subject
    let bs = batchSubjectId ? this.batchSubjects.find((b) => b.id === batchSubjectId) : undefined;
    if (!bs) {
      bs = this.batchSubjects.find((b) => b.subject_id === subjectId);
    }

    if (!bs) {
      return { updatedTopicsCount: 0, occurrencesCount: 0, topicPlannedDates: new Map() };
    }

    // 2. Locate batch and semester
    const batch = this.batches.find((b) => b.id === bs!.batch_id);
    const semester = batch ? this.semesters.find((s) => s.id === batch.semester_id) : undefined;

    if (!semester) {
      return { updatedTopicsCount: 0, occurrencesCount: 0, topicPlannedDates: new Map() };
    }

    // 3. Gather semester calendar events
    const events = this.calendarEvents.filter(
      (e) => e.semester_id === semester.id || (!e.campus_id || e.campus_id === semester.campus_id)
    );

    // 4. Gather active timetable slots for this batch_subject
    const slots = this.timetableSlots.filter((s) => s.batch_subject_id === bs!.id);

    // 5. Gather topics and exam scopes
    const subjectTopics = this.topics
      .filter((t) => t.subject_id === subjectId)
      .sort((a, b) => a.sequence_order - b.sequence_order);

    const topicIds = new Set(subjectTopics.map((t) => t.id));
    const scopes = this.topicExamScopes.filter((s) => topicIds.has(s.topic_id));

    // 6. Run Planning Engine
    const planResult = planSyllabusTopicDates(
      {
        startDate: semester.start_date,
        endDate: semester.end_date,
        saturdayRule: semester.saturday_rule,
      },
      slots,
      subjectTopics,
      events,
      scopes
    );

    // 7. Update topic planned dates in memory
    for (const [topicId, plannedDate] of planResult.topicPlannedDates) {
      const topicIndex = this.topics.findIndex((t) => t.id === topicId);
      if (topicIndex >= 0) {
        this.topics[topicIndex] = {
          ...this.topics[topicIndex],
          planned_date: plannedDate,
          updated_at: new Date().toISOString(),
        };
      }
    }

    return {
      updatedTopicsCount: planResult.schedules.length,
      occurrencesCount: planResult.occurrences.length,
      topicPlannedDates: planResult.topicPlannedDates,
    };
  }
}

export const isolatedDataStore = new IsolatedDataStore();
