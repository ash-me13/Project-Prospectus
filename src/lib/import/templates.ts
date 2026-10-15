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
