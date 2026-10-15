/**
 * Prospectus Production Database TypeScript Definitions
 * Directly reflects the 20-table PostgreSQL schema in Supabase
 */

export type UserRole = "admin" | "campus_manager" | "faculty" | "student";
export type SaturdayRuleType = "ALL" | "NONE" | "SECOND_FOURTH";
export type ExamTypeEnum = "SESSIONAL" | "MID_TERM" | "PUT" | "END_TERM";
export type CalendarEventType =
  | "HOLIDAY"
  | "ACADEMIC_EVENT"
  | "INSTITUTIONAL_EVENT"
  | "SPECIAL_WORKING_DAY"
  | "EXAM_PERIOD"
  | "CANCELLED_DAY"
  | "TIMETABLE_OVERRIDE"
  | "BLACKOUT";
export type TopicProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
export type ScheduledOccurrenceStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "SKIPPED" | "MERGED";
export type SessionDeliveryStatus = "COMPLETED" | "IN_PROGRESS" | "SKIPPED" | "MERGED" | "CANCELLED";
export type WorkStatusEnum = "NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED";
export type NotificationEventType = "MISSED_LOG_REMINDER" | "MISSED_LOG_ESCALATION" | "SCHEDULE_SHIFT" | "EXAM_ALERT";

// 1. campuses
export interface DbCampus {
  id: string;
  name: string;
  code: string;
  location: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 2. academic_tracks
export interface DbAcademicTrack {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  color_hex?: string | null;
  created_at: string;
}

// 3. profiles
export interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_visiting_faculty: boolean;
  campus_id?: string | null;
  batch_id?: string | null;
  department?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

// 4. semesters
export interface DbSemester {
  id: string;
  campus_id: string;
  name: string;
  academic_year: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  saturday_rule: SaturdayRuleType;
  is_current: boolean;
  is_published?: boolean;
  published_at?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
}

// 5. batches
export interface DbBatch {
  id: string;
  campus_id: string;
  track_id: string;
  semester_id: string;
  name: string;
  section: string;
  intake_year: number;
  student_count: number;
  created_at: string;
}

// 6. subjects
export interface DbSubject {
  id: string;
  code: string;
  name: string;
  department: string;
  credit_hours: number;
  total_planned_hours: number;
  syllabus_version: string;
  created_at: string;
}

// 7. batch_subjects
export interface DbBatchSubject {
  id: string;
  batch_id: string;
  subject_id: string;
  target_finish_date: string;
  is_active: boolean;
  created_at: string;
}

// 8. calendar_events
export interface DbCalendarEvent {
  id: string;
  semester_id: string;
  campus_id?: string | null;
  title: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  is_instructional: boolean;
  description?: string | null;
  change_reason?: string | null;
  is_recurring?: boolean;
  recurring_pattern?: string | null;
  created_at: string;
  updated_at?: string;
}

// 9. exam_windows
export interface DbExamWindow {
  id: string;
  semester_id: string;
  name: string;
  exam_type: ExamTypeEnum;
  start_date: string;
  end_date: string;
  weightage_percent: number;
  campus_id?: string | null;
  track_id?: string | null;
  batch_id?: string | null;
  subject_id?: string | null;
  created_at: string;
  updated_at?: string;
}

// 10. faculty_assignments
export interface DbFacultyAssignment {
  id: string;
  faculty_id: string;
  batch_subject_id: string;
  is_primary: boolean;
  is_visiting: boolean;
  assigned_at: string;
}

// 11. timetable_slots
export interface DbTimetableSlot {
  id: string;
  batch_subject_id: string;
  faculty_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  room?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  is_override?: boolean;
  override_reason?: string | null;
  created_at: string;
}

// 12. syllabus_units
export interface DbSyllabusUnit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string | null;
  planned_hours: number;
  created_at: string;
}

// 13. syllabus_topics
export interface DbSyllabusTopic {
  id: string;
  unit_id: string;
  subject_id: string;
  sequence_order: number;
  title: string;
  description?: string | null;
  learning_objectives?: string | null;
  planned_hours: number;
  status: TopicProgressStatus;
  percent_complete: number;
  planned_date?: string | null;
  actual_completed_date?: string | null;
  created_at: string;
  updated_at: string;
}

// 14. topic_exam_scopes
export interface DbTopicExamScope {
  id: string;
  topic_id: string;
  exam_window_id?: string | null;
  exam_type: ExamTypeEnum;
  created_at: string;
}

// 15. scheduled_sessions
export interface DbScheduledSession {
  id: string;
  batch_subject_id: string;
  timetable_slot_id?: string | null;
  faculty_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  occurrence_status: ScheduledOccurrenceStatus;
  created_at: string;
}

// 16. session_logs
export interface DbSessionLog {
  id: string;
  scheduled_session_id: string;
  batch_subject_id: string;
  faculty_id: string;
  session_date: string;
  actual_start_time: string;
  actual_end_time: string;
  duration_minutes: number;
  delivery_status: SessionDeliveryStatus;
  status_reason?: string | null;
  merged_session_ids?: string[] | null;
  idempotency_key?: string | null;
  covered_summary?: string | null;
  leftover_summary?: string | null;
  carry_forward_topic_id?: string | null;
  classwork_status: WorkStatusEnum;
  homework_status: WorkStatusEnum;
  notes?: string | null;
  is_verified: boolean;
  verified_by?: string | null;
  logged_at: string;
  updated_at: string;
}

// 17. session_log_topics
export interface DbSessionLogTopic {
  id: string;
  session_log_id: string;
  topic_id: string;
  percent_complete_after: number;
  topic_status_after: TopicProgressStatus;
  notes?: string | null;
  recorded_at: string;
}

// 18. notification_events
export interface DbNotificationEvent {
  id: string;
  recipient_id: string;
  event_type: NotificationEventType;
  scheduled_session_id?: string | null;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  sent_at: string;
}

// 19. app_settings
export interface DbAppSetting {
  id: string;
  campus_id?: string | null;
  setting_key: string;
  setting_value: Record<string, unknown>;
  description?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

// 20. audit_logs
export interface DbAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  client_ip?: string | null;
  timestamp: string;
}

// Faculty Dashboard Summary Aggregate
export interface FacultyDashboardData {
  todaySessions: Array<
    DbScheduledSession & {
      subject_name: string;
      subject_code: string;
      batch_name: string;
      room?: string;
      is_logged: boolean;
    }
  >;
  loggedSessions: Array<
    DbSessionLog & {
      subject_name: string;
      subject_code: string;
      batch_name: string;
      topic_titles?: string[];
    }
  >;
  awaitingLogSessions: Array<
    DbScheduledSession & {
      subject_name: string;
      subject_code: string;
      batch_name: string;
      room?: string;
    }
  >;
  overdueTopics: Array<
    DbSyllabusTopic & {
      subject_name: string;
      subject_code: string;
      days_overdue: number;
    }
  >;
  subjectsRequiringAttention: Array<{
    subject_id: string;
    subject_code: string;
    subject_name: string;
    batch_name: string;
    planned_hours: number;
    delivered_hours: number;
    completion_percentage: number;
    pace_status: "ON_TRACK" | "BEHIND" | "AT_RISK";
    overdue_topic_count: number;
    unlogged_session_count: number;
  }>;
}
