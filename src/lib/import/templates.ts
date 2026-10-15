/**
 * Prospectus Academic SaaS - Reusable Import Templates
 * Provides standardized CSV template generators for academic imports.
 */

export interface ImportTemplateDefinition {
  type: "calendar_events" | "semesters" | "timetable_slots" | "syllabus_topics";
  filename: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  description: string;
}

export const CALENDAR_EVENTS_TEMPLATE: ImportTemplateDefinition = {
  type: "calendar_events",
  filename: "prospectus_calendar_events_template.csv",
  headers: ["title", "event_type", "start_date", "end_date", "is_instructional", "description"],
  sampleRows: [
    {
      title: "Independence Day",
      event_type: "HOLIDAY",
      start_date: "2026-08-15",
      end_date: "2026-08-15",
      is_instructional: "false",
      description: "National Holiday",
    },
    {
      title: "Orientation Hackathon",
      event_type: "ACADEMIC_EVENT",
      start_date: "2026-08-20",
      end_date: "2026-08-21",
      is_instructional: "true",
      description: "Hands-on coding workshop for incoming batches",
    },
    {
      title: "Special Sunday Compensation Day",
      event_type: "SPECIAL_WORKING_DAY",
      start_date: "2026-09-06",
      end_date: "2026-09-06",
      is_instructional: "true",
      description: "Compensatory instructional day for holiday shift",
    },
    {
      title: "Gandhi Jayanti",
      event_type: "HOLIDAY",
      start_date: "2026-10-02",
      end_date: "2026-10-02",
      is_instructional: "false",
      description: "National Holiday",
    },
  ],
  description: "Upload academic events, national holidays, and special working days.",
};

export const SEMESTERS_TEMPLATE: ImportTemplateDefinition = {
  type: "semesters",
  filename: "prospectus_semesters_template.csv",
  headers: [
    "campus_code",
    "name",
    "academic_year",
    "start_date",
    "end_date",
    "saturday_rule",
  ],
  sampleRows: [
    {
      campus_code: "HITECH",
      name: "Fall Semester 2026",
      academic_year: "2026-2027",
      start_date: "2026-08-01",
      end_date: "2026-12-15",
      saturday_rule: "SECOND_FOURTH",
    },
    {
      campus_code: "RATNAM",
      name: "Fall Semester 2026",
      academic_year: "2026-2027",
      start_date: "2026-08-01",
      end_date: "2026-12-15",
      saturday_rule: "ALL",
    },
  ],
  description: "Define campus-specific academic terms and Saturday working policies.",
};

export const SYLLABUS_LESSON_PLAN_TEMPLATE: ImportTemplateDefinition = {
  type: "syllabus_topics",
  filename: "prospectus_syllabus_lesson_plan_template.csv",
  headers: [
    "unit_number",
    "unit_title",
    "topic_sequence",
    "topic_title",
    "planned_hours",
    "description",
    "learning_objectives",
    "exam_scopes",
  ],
  sampleRows: [
    {
      unit_number: "1",
      unit_title: "Database Architecture & Relational Design",
      topic_sequence: "1",
      topic_title: "Relational Modeling & Functional Dependencies",
      planned_hours: "2.0",
      description: "Entity relationship mapping, keys, and functional dependencies",
      learning_objectives: "Analyze dependencies and construct minimal covers",
      exam_scopes: "SESSIONAL;MID_TERM;END_TERM",
    },
    {
      unit_number: "1",
      unit_title: "Database Architecture & Relational Design",
      topic_sequence: "2",
      topic_title: "Normal Forms (1NF through BCNF)",
      planned_hours: "2.5",
      description: "Decomposition algorithms, lossless-join and dependency preservation",
      learning_objectives: "Identify decomposition anomalies and enforce BCNF",
      exam_scopes: "SESSIONAL;MID_TERM;END_TERM",
    },
    {
      unit_number: "2",
      unit_title: "Transaction Processing & Concurrency",
      topic_sequence: "3",
      topic_title: "ACID Properties & Serializability",
      planned_hours: "2.0",
      description: "Conflict and view serializability, precedence graphs",
      learning_objectives: "Evaluate transaction schedules for serializability",
      exam_scopes: "MID_TERM;END_TERM",
    },
    {
      unit_number: "2",
      unit_title: "Transaction Processing & Concurrency",
      topic_sequence: "4",
      topic_title: "Concurrency Control Protocols & Two-Phase Locking",
      planned_hours: "3.0",
      description: "Rigorous 2PL, lock escalation, deadlock detection and prevention",
      learning_objectives: "Implement deadlock-free locking strategies",
      exam_scopes: "PUT;END_TERM",
    },
  ],
  description: "Structured syllabus import with units, sequence, planned hours, and multi-exam mappings.",
};

export const TIMETABLE_SLOTS_TEMPLATE: ImportTemplateDefinition = {
  type: "timetable_slots",
  filename: "prospectus_timetable_template.csv",
  headers: [
    "day_of_week",
    "start_time",
    "end_time",
    "room",
    "effective_start_date",
    "effective_end_date",
    "is_override",
    "override_reason",
  ],
  sampleRows: [
    {
      day_of_week: "1",
      start_time: "09:00",
      end_time: "09:50",
      room: "Hall 301",
      effective_start_date: "2026-08-01",
      effective_end_date: "2026-12-15",
      is_override: "false",
      override_reason: "",
    },
    {
      day_of_week: "3",
      start_time: "10:00",
      end_time: "11:30",
      room: "Lab 2",
      effective_start_date: "2026-08-01",
      effective_end_date: "2026-12-15",
      is_override: "false",
      override_reason: "",
    },
  ],
  description: "Weekly timetable schedule with duration, rooms, effective dates, and conflict override flags.",
};

/**
 * Generates an RFC-compliant CSV string from a template definition
 */
export function generateCsvTemplate(template: ImportTemplateDefinition): string {
  const headerLine = template.headers.join(",");
  const rows = template.sampleRows.map((row) =>
    template.headers
      .map((h) => {
        const val = row[h] || "";
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      })
      .join(",")
  );

  return [headerLine, ...rows].join("\n");
}
