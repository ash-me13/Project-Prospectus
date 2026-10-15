import { describe, it, expect } from "vitest";
import { isolatedDataStore } from "../../src/lib/database/service";
import { AuthenticatedUser } from "../../src/auth/authorization";
import { previewCalendarEventsImport } from "../../src/lib/import/csv-importer";
import { CALENDAR_EVENTS_TEMPLATE, generateCsvTemplate } from "../../src/lib/import/templates";

describe("Integration Workflow: Semester Setup through Calendar Import & Recalculation", () => {
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

  it("demonstrates complete lifecycle: Semester Creation -> Batch Setup -> CSV Import -> Recalculation -> Publishing", () => {
    // 1. Create a new semester for HI-Tech campus under Mirai Track with 2nd & 4th Saturday rule
    const newSemester = isolatedDataStore.createSemester(
      {
        campus_id: "11111111-1111-1111-1111-111111111111",
        name: "Spring Semester 2027",
        academic_year: "2026-2027",
        start_date: "2027-01-04",
        end_date: "2027-05-28",
        saturday_rule: "SECOND_FOURTH",
        is_current: false,
      },
      adminUser
    );

    expect(newSemester.id).toBeDefined();
    expect(newSemester.saturday_rule).toBe("SECOND_FOURTH");
    expect(newSemester.is_published).toBe(false);

    // 2. Create student batch cohort linked to the semester
    const newBatch = isolatedDataStore.createBatch(
      {
        campus_id: newSemester.campus_id,
        track_id: "aaaaaaaa-1111-1111-1111-111111111111",
        semester_id: newSemester.id,
        name: "CSE 2027 Sec A",
        section: "A",
        intake_year: 2027,
        student_count: 64,
      },
      adminUser
    );

    expect(newBatch.name).toBe("CSE 2027 Sec A");
    expect(newBatch.semester_id).toBe(newSemester.id);

    // 3. Verify downloadable CSV template generation and preview a calendar import CSV
    const template = generateCsvTemplate(CALENDAR_EVENTS_TEMPLATE);
    expect(template).toContain("title,event_type,start_date,end_date,is_instructional,description");

    const csvContent = `title,event_type,start_date,end_date,is_instructional,description
Republic Day,HOLIDAY,2027-01-26,2027-01-26,false,National Holiday
Spring Coding Immersion,ACADEMIC_EVENT,2027-02-15,2027-02-16,true,Hands-on Industry Workshop
Maha Shivratri,HOLIDAY,2027-03-08,2027-03-08,false,Institutional Holiday
Holi Festival Recess,HOLIDAY,2027-03-24,2027-03-25,false,Festival Break`;

    const preview = previewCalendarEventsImport(
      csvContent,
      newSemester.id,
      newSemester.campus_id
    );

    expect(preview.canCommit).toBe(true);
    expect(preview.validRowCount).toBe(4);
    expect(preview.invalidRowCount).toBe(0);

    // 4. Safely commit batch import as Campus Manager
    const importReport = isolatedDataStore.importCalendarEventsBatch(
      newSemester.id,
      preview.rows,
      cmHiTech,
      true
    );

    expect(importReport.success).toBe(true);
    expect(importReport.importedCount).toBe(4);

    const events = isolatedDataStore.getCalendarEvents(newSemester.id);
    expect(events.length).toBe(4);
    expect(events.some((e) => e.title === "Republic Day")).toBe(true);
    expect(events.some((e) => e.title === "Spring Coding Immersion")).toBe(true);

    // 5. Add milestone exam windows with academic scope
    const midTermExam = isolatedDataStore.createExamWindow(
      {
        semester_id: newSemester.id,
        name: "Spring Mid-Term Exam",
        exam_type: "MID_TERM",
        start_date: "2027-03-15",
        end_date: "2027-03-20",
        weightage_percent: 25.0,
        campus_id: newSemester.campus_id,
        track_id: "aaaaaaaa-1111-1111-1111-111111111111",
      },
      cmHiTech
    );

    expect(midTermExam.name).toBe("Spring Mid-Term Exam");
    expect(midTermExam.weightage_percent).toBe(25.0);

    // 6. Add a consequential calendar change with audit reason
    const { event: compensatoryDay, shifts } = isolatedDataStore.createCalendarEvent(
      {
        semester_id: newSemester.id,
        campus_id: newSemester.campus_id,
        title: "Compensatory Sunday Classwork",
        event_type: "SPECIAL_WORKING_DAY",
        start_date: "2027-02-21", // Sunday
        end_date: "2027-02-21",
        is_instructional: true,
        description: "Special lab session",
        change_reason: "Compensating for Holi Festival break",
      },
      cmHiTech
    );

    expect(compensatoryDay.is_instructional).toBe(true);
    expect(shifts).toBeDefined();

    // 7. Publish semester to make visible to faculty and students
    const published = isolatedDataStore.publishSemester(newSemester.id, adminUser);
    expect(published.is_published).toBe(true);
    expect(published.published_at).toBeDefined();

    // 8. Verify audit logs record the complete chain of actions
    const auditLogs = isolatedDataStore.getAuditLogs();
    const semesterAudits = auditLogs.filter(
      (a) => a.table_name === "semesters" && a.record_id === newSemester.id
    );
    expect(semesterAudits.length).toBeGreaterThanOrEqual(2); // INSERT + UPDATE (publish)
  });
});
