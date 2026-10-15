import { describe, it, expect } from "vitest";
import {
  getSaturdaysInMonth,
  isSecondOrFourthSaturday,
  isDateInstructional,
  calculateSemesterCalendar,
  recalculatePlannedSessions,
} from "../../src/domain/calendar-engine";
import {
  previewCalendarEventsImport,
} from "../../src/lib/import/csv-importer";
import {
  CALENDAR_EVENTS_TEMPLATE,
  generateCsvTemplate,
} from "../../src/lib/import/templates";
import {
  isolatedDataStore,
} from "../../src/lib/database/service";
import { AuthenticatedUser } from "../../src/auth/authorization";
import { DbCalendarEvent, DbScheduledSession, DbTimetableSlot } from "../../src/types/database";

describe("Calendar Engine: 2nd & 4th Saturday Actual Gregorian Dates", () => {
  it("computes actual calendar dates for Saturdays in August 2026 (5 Saturdays)", () => {
    // August 2026 starts on Saturday (Aug 1)
    const saturdays = getSaturdaysInMonth(2026, 8);
    expect(saturdays).toEqual([1, 8, 15, 22, 29]);

    // 2nd Saturday = Aug 8 (day 8), 4th Saturday = Aug 22 (day 22)
    expect(isSecondOrFourthSaturday(2026, 8, 1)).toBe(false); // 1st Sat -> OFF
    expect(isSecondOrFourthSaturday(2026, 8, 8)).toBe(true);  // 2nd Sat -> WORKING
    expect(isSecondOrFourthSaturday(2026, 8, 15)).toBe(false); // 3rd Sat -> OFF
    expect(isSecondOrFourthSaturday(2026, 8, 22)).toBe(true); // 4th Sat -> WORKING
    expect(isSecondOrFourthSaturday(2026, 8, 29)).toBe(false); // 5th Sat -> OFF
  });

  it("computes actual calendar dates for Saturdays in September 2026 (4 Saturdays)", () => {
    // September 2026 starts on Tuesday (Sep 1)
    const saturdays = getSaturdaysInMonth(2026, 9);
    expect(saturdays).toEqual([5, 12, 19, 26]);

    // 2nd Saturday = Sep 12, 4th Saturday = Sep 26
    expect(isSecondOrFourthSaturday(2026, 9, 5)).toBe(false);  // 1st Sat -> OFF
    expect(isSecondOrFourthSaturday(2026, 9, 12)).toBe(true);  // 2nd Sat -> WORKING
    expect(isSecondOrFourthSaturday(2026, 9, 19)).toBe(false); // 3rd Sat -> OFF
    expect(isSecondOrFourthSaturday(2026, 9, 26)).toBe(true);  // 4th Sat -> WORKING
  });

  it("computes actual calendar dates for Saturdays in October 2026 (5 Saturdays)", () => {
    // October 2026 starts on Thursday (Oct 1)
    const saturdays = getSaturdaysInMonth(2026, 10);
    expect(saturdays).toEqual([3, 10, 17, 24, 31]);

    // 2nd Saturday = Oct 10, 4th Saturday = Oct 24
    expect(isSecondOrFourthSaturday(2026, 10, 3)).toBe(false);  // 1st Sat -> OFF
    expect(isSecondOrFourthSaturday(2026, 10, 10)).toBe(true); // 2nd Sat -> WORKING
    expect(isSecondOrFourthSaturday(2026, 10, 17)).toBe(false); // 3rd Sat -> OFF
    expect(isSecondOrFourthSaturday(2026, 10, 24)).toBe(true); // 4th Sat -> WORKING
    expect(isSecondOrFourthSaturday(2026, 10, 31)).toBe(false); // 5th Sat -> OFF
  });
});

describe("Calendar Engine: Multi-Month Saturday Rules & Date Boundaries", () => {
  it("evaluates ALL, NONE, and SECOND_FOURTH rules over 3 consecutive months (Aug-Oct 2026)", () => {
    // Test a known 2nd Saturday: Aug 8, 2026
    const aug8SecondSat = "2026-08-08";
    expect(isDateInstructional(aug8SecondSat, "ALL").isInstructional).toBe(true);
    expect(isDateInstructional(aug8SecondSat, "NONE").isInstructional).toBe(false);
    expect(isDateInstructional(aug8SecondSat, "SECOND_FOURTH").isInstructional).toBe(true);

    // Test a known 3rd Saturday: Aug 15, 2026
    const aug15ThirdSat = "2026-08-15";
    expect(isDateInstructional(aug15ThirdSat, "ALL").isInstructional).toBe(true);
    expect(isDateInstructional(aug15ThirdSat, "NONE").isInstructional).toBe(false);
    expect(isDateInstructional(aug15ThirdSat, "SECOND_FOURTH").isInstructional).toBe(false);

    // Test a known 5th Saturday: Aug 29, 2026
    const aug29FifthSat = "2026-08-29";
    expect(isDateInstructional(aug29FifthSat, "ALL").isInstructional).toBe(true);
    expect(isDateInstructional(aug29FifthSat, "NONE").isInstructional).toBe(false);
    expect(isDateInstructional(aug29FifthSat, "SECOND_FOURTH").isInstructional).toBe(false);
  });

  it("calculates aggregate semester calendar breakdown over 3 consecutive months", () => {
    const calendarEvents: DbCalendarEvent[] = [
      {
        id: "ev-1",
        semester_id: "55555555-5555-5555-5555-555555555555",
        title: "Independence Day",
        event_type: "HOLIDAY",
        start_date: "2026-08-15",
        end_date: "2026-08-15",
        is_instructional: false,
        created_at: "2026-08-01",
      },
      {
        id: "ev-2",
        semester_id: "55555555-5555-5555-5555-555555555555",
        title: "Gandhi Jayanti",
        event_type: "HOLIDAY",
        start_date: "2026-10-02",
        end_date: "2026-10-02",
        is_instructional: false,
        created_at: "2026-08-01",
      },
    ];

    // Aug 1 to Oct 31 = 31 + 30 + 31 = 92 calendar days
    const breakdown = calculateSemesterCalendar(
      "2026-08-01",
      "2026-10-31",
      "SECOND_FOURTH",
      calendarEvents
    );

    expect(breakdown.totalCalendarDays).toBe(92);
    // In Aug-Oct 2026 under SECOND_FOURTH:
    // Aug: 2 working Saturdays (Aug 8, Aug 22)
    // Sep: 2 working Saturdays (Sep 12, Sep 26)
    // Oct: 2 working Saturdays (Oct 10, Oct 24)
    // Total working Saturdays = 6
    expect(breakdown.workingSaturdaysCount).toBe(6);
    expect(breakdown.totalInstructionalDays).toBeGreaterThan(60);
  });
});

describe("Holidays, Special Working Days, and Overrides", () => {
  it("converts normally off days into instructional days when SPECIAL_WORKING_DAY event exists", () => {
    // Sep 6, 2026 is a Sunday (normally OFF)
    const sundayDate = "2026-09-06";
    expect(isDateInstructional(sundayDate, "SECOND_FOURTH").isInstructional).toBe(false);

    // Add Special Working Day compensation event
    const specialEvent: DbCalendarEvent = {
      id: "ev-special",
      semester_id: "55555555-5555-5555-5555-555555555555",
      title: "Sunday Compensation Classes",
      event_type: "SPECIAL_WORKING_DAY",
      start_date: sundayDate,
      end_date: sundayDate,
      is_instructional: true,
      created_at: "2026-08-01",
    };

    const statusWithSpecial = isDateInstructional(sundayDate, "SECOND_FOURTH", [specialEvent]);
    expect(statusWithSpecial.isInstructional).toBe(true);
    expect(statusWithSpecial.reason).toContain("Special Working Day");
  });

  it("converts standard weekdays into non-instructional days when HOLIDAY exists", () => {
    // Oct 2, 2026 is a Friday (normally instructional)
    const fridayDate = "2026-10-02";
    expect(isDateInstructional(fridayDate, "SECOND_FOURTH").isInstructional).toBe(true);

    const holidayEvent: DbCalendarEvent = {
      id: "ev-gj",
      semester_id: "55555555-5555-5555-5555-555555555555",
      title: "Gandhi Jayanti",
      event_type: "HOLIDAY",
      start_date: fridayDate,
      end_date: fridayDate,
      is_instructional: false,
      created_at: "2026-08-01",
    };

    const statusWithHoliday = isDateInstructional(fridayDate, "SECOND_FOURTH", [holidayEvent]);
    expect(statusWithHoliday.isInstructional).toBe(false);
    expect(statusWithHoliday.reason).toContain("Holiday: Gandhi Jayanti");
  });
});

describe("Consequential Invalidation & Safe Recalculation", () => {
  const timetableSlots: DbTimetableSlot[] = [
    {
      id: "c0000001-1111-1111-1111-111111111111",
      batch_subject_id: "99999999-1111-1111-1111-111111111111",
      faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      day_of_week: 5, // Friday
      start_time: "10:00:00",
      end_time: "11:30:00",
      duration_hours: 1.5,
      created_at: "2026-08-01",
    },
  ];

  it("never alters completed sessions when recalculating", () => {
    const sessions: DbScheduledSession[] = [
      {
        id: "d0000001-1111-1111-1111-111111111101",
        batch_subject_id: "99999999-1111-1111-1111-111111111111",
        timetable_slot_id: "c0000001-1111-1111-1111-111111111111",
        faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        session_date: "2026-08-03",
        start_time: "10:00:00",
        end_time: "11:30:00",
        duration_hours: 1.5,
        occurrence_status: "COMPLETED", // Completed session
        created_at: "2026-08-01",
      },
      {
        id: "d0000001-1111-1111-1111-111111111104",
        batch_subject_id: "99999999-1111-1111-1111-111111111111",
        timetable_slot_id: "c0000001-1111-1111-1111-111111111111",
        faculty_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        session_date: "2026-10-02", // Scheduled on Oct 2 (Gandhi Jayanti Friday)
        start_time: "10:00:00",
        end_time: "11:30:00",
        duration_hours: 1.5,
        occurrence_status: "SCHEDULED", // Future scheduled session
        created_at: "2026-08-01",
      },
    ];

    const holidayEvent: DbCalendarEvent = {
      id: "ev-gj",
      semester_id: "55555555-5555-5555-5555-555555555555",
      title: "Gandhi Jayanti",
      event_type: "HOLIDAY",
      start_date: "2026-10-02",
      end_date: "2026-10-02",
      is_instructional: false,
      created_at: "2026-08-01",
    };

    const result = recalculatePlannedSessions(
      sessions,
      timetableSlots,
      "2026-08-01",
      "2026-12-15",
      "SECOND_FOURTH",
      [holidayEvent]
    );

    // Completed session date must remain strictly unchanged
    const completedSession = result.updatedSessions.find((s) => s.id === "d0000001-1111-1111-1111-111111111101")!;
    expect(completedSession.session_date).toBe("2026-08-03");

    // Scheduled session falling on holiday must shift to next available instructional date
    const shiftedSession = result.updatedSessions.find((s) => s.id === "d0000001-1111-1111-1111-111111111104")!;
    expect(shiftedSession.session_date).not.toBe("2026-10-02");
    expect(shiftedSession.session_date > "2026-10-02").toBe(true);
    expect(result.shifts.length).toBe(1);
    expect(result.shifts[0].reason).toContain("Date became non-instructional");
  });
});

describe("CSV Import Workflow: Template, Validation & Batch Atomic Strategy", () => {
  it("generates downloadable RFC-compliant CSV template", () => {
    const csvContent = generateCsvTemplate(CALENDAR_EVENTS_TEMPLATE);
    expect(csvContent).toContain("title,event_type,start_date,end_date,is_instructional,description");
    expect(csvContent).toContain("Independence Day");
    expect(csvContent).toContain("HOLIDAY");
  });

  it("parses CSV content and detects row-level errors and duplicates", () => {
    const csvWithErrorsAndDupes = `title,event_type,start_date,end_date,is_instructional,description
Independence Day,HOLIDAY,2026-08-15,2026-08-15,false,National Holiday
Invalid Event,HOLIDAY,2026-10-15,2026-10-01,false,End date before start date
Independence Day,HOLIDAY,2026-08-15,2026-08-15,false,Duplicate Row`;

    const preview = previewCalendarEventsImport(
      csvWithErrorsAndDupes,
      "55555555-5555-5555-5555-555555555555",
      "11111111-1111-1111-1111-111111111111"
    );

    expect(preview.totalRows).toBe(3);
    // Row 2 is valid
    expect(preview.rows[0].isValid).toBe(true);

    // Row 3 has end_date before start_date
    expect(preview.rows[1].isValid).toBe(false);
    expect(preview.rows[1].errors.length).toBeGreaterThan(0);
    expect(preview.rows[1].errors[0].message).toContain("Start date must be on or before end date");

    // Row 4 is an in-file duplicate
    expect(preview.rows[2].isDuplicate).toBe(true);
    expect(preview.rows[2].warnings.length).toBeGreaterThan(0);
  });

  it("executes safe batch import transaction through IsolatedDataStore", () => {
    const adminUser: AuthenticatedUser = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "admin@msot.org",
      role: "admin",
    };

    const validCsv = `title,event_type,start_date,end_date,is_instructional,description
Diwali Institutional Break,HOLIDAY,2026-11-08,2026-11-11,false,Festival Break
Campus Tech Fest,ACADEMIC_EVENT,2026-11-16,2026-11-17,true,Annual Innovation Symposium`;

    const preview = previewCalendarEventsImport(
      validCsv,
      "55555555-5555-5555-5555-555555555555",
      "11111111-1111-1111-1111-111111111111"
    );

    expect(preview.canCommit).toBe(true);

    const report = isolatedDataStore.importCalendarEventsBatch(
      "55555555-5555-5555-5555-555555555555",
      preview.rows,
      adminUser,
      true
    );

    expect(report.success).toBe(true);
    expect(report.importedCount).toBe(2);
    expect(report.failedCount).toBe(0);

    // Check that imported events appear in store
    const events = isolatedDataStore.getCalendarEvents("55555555-5555-5555-5555-555555555555");
    const techFest = events.find((e) => e.title === "Campus Tech Fest");
    expect(techFest).toBeDefined();
    expect(techFest?.event_type).toBe("ACADEMIC_EVENT");
  });
});
