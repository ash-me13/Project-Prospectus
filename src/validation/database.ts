import { z } from "zod";

export const UserRoleEnum = z.enum(["admin", "campus_manager", "faculty", "student"]);
export const SaturdayRuleEnum = z.enum(["ALL", "NONE", "SECOND_FOURTH"]);
export const CalendarEventTypeEnum = z.enum([
  "HOLIDAY",
  "ACADEMIC_EVENT",
  "INSTITUTIONAL_EVENT",
  "SPECIAL_WORKING_DAY",
  "EXAM_PERIOD",
  "CANCELLED_DAY",
  "TIMETABLE_OVERRIDE",
  "BLACKOUT",
]);
export const ExamTypeEnum = z.enum(["SESSIONAL", "MID_TERM", "PUT", "END_TERM"]);
export const TopicProgressStatusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"]);
export const ScheduledOccurrenceStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]);
export const SessionDeliveryStatusEnum = z.enum(["COMPLETED", "IN_PROGRESS", "SKIPPED", "MERGED", "CANCELLED"]);
export const WorkStatusEnum = z.enum(["NONE", "ASSIGNED", "COLLECTED", "REVIEWED"]);
export const NotificationEventTypeEnum = z.enum([
  "MISSED_LOG_REMINDER",
  "MISSED_LOG_ESCALATION",
  "SCHEDULE_SHIFT",
  "EXAM_ALERT",
]);

// PostgreSQL compatible UUID format validator (8-4-4-4-12 hex characters)
export const uuidSchema = (message = "Invalid UUID") =>
  z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, message);

// 1. Campus Schema
export const CampusCreateSchema = z.object({
  name: z.string().min(2, "Campus name required"),
  code: z.string().min(2).max(10).toUpperCase(),
  location: z.string().min(2),
  timezone: z.string().default("Asia/Kolkata"),
  is_active: z.boolean().default(true),
});

// 2. Semester Schema
export const SemesterCreateSchema = z.object({
  campus_id: uuidSchema("Invalid campus UUID"),
  name: z.string().min(2),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/, "Must be YYYY-YYYY"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  saturday_rule: SaturdayRuleEnum.default("SECOND_FOURTH"),
  is_current: z.boolean().default(false),
}).refine(
  (data) => new Date(data.start_date) < new Date(data.end_date),
  { message: "Start date must be strictly before end date", path: ["end_date"] }
);

// 3. Subject Schema
export const SubjectCreateSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  department: z.string().default("CSE"),
  credit_hours: z.number().int().min(1).max(6).default(4),
  total_planned_hours: z.number().positive("Planned hours must be greater than zero"),
  syllabus_version: z.string().default("v1.0"),
});

// 4. Timetable Slot Schema
export const TimetableSlotCreateSchema = z.object({
  batch_subject_id: uuidSchema(),
  faculty_id: uuidSchema(),
  day_of_week: z.number().int().min(1).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS"),
  room: z.string().optional().nullable(),
  effective_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  effective_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_override: z.boolean().default(false),
  override_reason: z.string().optional().nullable(),
}).refine((data) => data.start_time < data.end_time, {
  message: "Start time must be before end time",
  path: ["end_time"],
}).refine((data) => {
  if (data.effective_start_date && data.effective_end_date) {
    return data.effective_start_date <= data.effective_end_date;
  }
  return true;
}, {
  message: "Effective start date must be on or before effective end date",
  path: ["effective_end_date"],
});

// 5. Syllabus Unit & Topic Schemas
export const SyllabusUnitCreateSchema = z.object({
  subject_id: uuidSchema(),
  unit_number: z.number().int().positive(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  planned_hours: z.number().positive(),
});

export const SyllabusTopicCreateSchema = z.object({
  unit_id: uuidSchema(),
  subject_id: uuidSchema(),
  sequence_order: z.number().int().positive(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  learning_objectives: z.string().optional().nullable(),
  planned_hours: z.number().positive(),
  status: TopicProgressStatusEnum.default("NOT_STARTED"),
  percent_complete: z.number().min(0).max(100).default(0),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  exam_scopes: z.array(ExamTypeEnum).optional(),
});

// 6. Scheduled Occurrence Schema
export const ScheduledSessionCreateSchema = z.object({
  batch_subject_id: uuidSchema(),
  timetable_slot_id: uuidSchema().optional(),
  faculty_id: uuidSchema(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  occurrence_status: ScheduledOccurrenceStatusEnum.default("SCHEDULED"),
}).refine((data) => data.start_time < data.end_time, {
  message: "Start time must be before end time",
  path: ["end_time"],
});

// 7. Canonical Session Log Schema
// Enforces at most one canonical log per scheduled occurrence
export const SessionLogCreateSchema = z.object({
  scheduled_session_id: uuidSchema("Scheduled session ID required"),
  batch_subject_id: uuidSchema("Batch subject ID required"),
  faculty_id: uuidSchema("Faculty ID required"),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  actual_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  actual_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  delivery_status: SessionDeliveryStatusEnum,
  covered_summary: z.string().max(2000).optional(),
  leftover_summary: z.string().max(2000).optional(),
  carry_forward_topic_id: uuidSchema().optional(),
  classwork_status: WorkStatusEnum.default("NONE"),
  homework_status: WorkStatusEnum.default("NONE"),
  notes: z.string().max(2000).optional(),
  affected_topics: z
    .array(
      z.object({
        topic_id: uuidSchema(),
        percent_complete_after: z.number().min(0).max(100),
        topic_status_after: TopicProgressStatusEnum,
        notes: z.string().optional(),
      })
    )
    .min(1, "At least one affected syllabus topic required"),
}).refine((data) => data.actual_start_time < data.actual_end_time, {
  message: "Actual start time must be before actual end time",
  path: ["actual_end_time"],
});

export type SessionLogCreateInput = z.infer<typeof SessionLogCreateSchema>;
export type TimetableSlotCreateInput = z.infer<typeof TimetableSlotCreateSchema>;
export type SyllabusUnitCreateInput = z.infer<typeof SyllabusUnitCreateSchema>;
export type SyllabusTopicCreateInput = z.infer<typeof SyllabusTopicCreateSchema>;
export type SemesterCreateInput = z.infer<typeof SemesterCreateSchema>;

// 8. Calendar Event Schema
export const CalendarEventCreateSchema = z.object({
  semester_id: uuidSchema("Semester ID required"),
  campus_id: uuidSchema().optional().nullable(),
  title: z.string().min(2, "Event title required"),
  event_type: CalendarEventTypeEnum.default("HOLIDAY"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  is_instructional: z.boolean().default(false),
  description: z.string().optional().nullable(),
  change_reason: z.string().optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurring_pattern: z.string().optional().nullable(),
}).refine((data) => data.start_date <= data.end_date, {
  message: "Start date must be on or before end date",
  path: ["end_date"],
});

export type CalendarEventCreateInput = z.infer<typeof CalendarEventCreateSchema>;

// 9. Exam Window Schema
export const ExamWindowCreateSchema = z.object({
  semester_id: uuidSchema("Semester ID required"),
  name: z.string().min(2, "Exam window name required"),
  exam_type: ExamTypeEnum,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  weightage_percent: z.number().min(0).max(100).default(25.0),
  campus_id: uuidSchema().optional().nullable(),
  track_id: uuidSchema().optional().nullable(),
  batch_id: uuidSchema().optional().nullable(),
  subject_id: uuidSchema().optional().nullable(),
}).refine((data) => data.start_date <= data.end_date, {
  message: "Exam start date must be on or before end date",
  path: ["end_date"],
});

export type ExamWindowCreateInput = z.infer<typeof ExamWindowCreateSchema>;

// 10. Batch Create Schema
export const BatchCreateSchema = z.object({
  campus_id: uuidSchema("Campus ID required"),
  track_id: uuidSchema("Track ID required"),
  semester_id: uuidSchema("Semester ID required"),
  name: z.string().min(2, "Batch name required"),
  section: z.string().min(1).max(5),
  intake_year: z.number().int().min(2020).max(2035),
  student_count: z.number().int().min(1).default(60),
});

export type BatchCreateInput = z.infer<typeof BatchCreateSchema>;

