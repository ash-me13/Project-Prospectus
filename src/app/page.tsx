"use client";

import React, { useState } from "react";
import {
  calculateCourseProgression,
  calculateExamReadiness,
  rollUpTrackProgress,
} from "@/domain/calculation-engine";
import {
  SEED_SUBJECTS,
  SEED_TOPICS_CS201,
  SEED_EXAMS,
} from "@/lib/mock-data";
import { Sidebar } from "@/components/layout/sidebar";
import { TopToolbar } from "@/components/layout/top-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusLabel } from "@/components/ui/status-label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ProgressRail, Milestone } from "@/components/progression/progress-rail";
import { PaceIndicator } from "@/components/progression/pace-indicator";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { FacultySessionDashboard } from "@/components/sessions/faculty-session-dashboard";
import { FacultySessionLogModal } from "@/components/sessions/faculty-session-log-modal";
import { Toast } from "@/components/ui/toast";
import {
  canLogSession,
  canManageSemester,
  canManageCalendar,
  canManageExams,
  AuthenticatedUser,
} from "@/auth/authorization";
import { UserRole } from "@/types/academic";
import {
  DbSemester,
  DbCalendarEvent,
  DbExamWindow,
  SaturdayRuleType,
  CalendarEventType,
  ExamTypeEnum,
  DbScheduledSession,
  SessionDeliveryStatus,
  WorkStatusEnum,
  TopicProgressStatus,
} from "@/types/database";
import { isolatedDataStore } from "@/lib/database/service";
import { SemesterSetupModal } from "@/components/admin/semester-setup-modal";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { AddEventModal } from "@/components/calendar/add-event-modal";
import { CsvImportModal } from "@/components/calendar/csv-import-modal";
import { ExamWindowsModal } from "@/components/exams/exam-windows-modal";
import { TimetableEditorModal } from "@/components/timetable/timetable-editor-modal";
import { LessonPlanModal } from "@/components/syllabus/lesson-plan-modal";
import { SyllabusCsvImportModal } from "@/components/syllabus/syllabus-csv-import-modal";
import { PlanTimelinePreview } from "@/components/syllabus/plan-timeline-preview";
import { ImportPreviewResult, ImportExecutionReport } from "@/lib/import/csv-importer";
import { CalendarEventCreateInput } from "@/validation/database";
import {
  BookOpen,
  Award,
  Clock,
  Layers,
  FileCheck,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Settings,
  Plus,
  Upload,
  Check,
} from "lucide-react";

export default function ProspectusApp() {
  // Navigation & Role State
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [currentRole, setCurrentRole] = useState<UserRole>("faculty");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [sessionLogsVersion, setSessionLogsVersion] = useState<number>(0);
  const [selectedSessionToLog, setSelectedSessionToLog] = useState<(DbScheduledSession & {
    subject_name?: string;
    subject_code?: string;
    batch_name?: string;
    room?: string;
  }) | null>(null);
  const [isFacultyLogModalOpen, setIsFacultyLogModalOpen] = useState<boolean>(false);

  // Academic Context State
  const [currentCampus, setCurrentCampus] = useState<string>("HITECH");
  const [currentTrack, setCurrentTrack] = useState<string>("Mirai");

  // Database Service State
  const [semesters, setSemesters] = useState<DbSemester[]>(() => isolatedDataStore.getSemesters());
  const activeSemester = semesters[0] || {
    id: "55555555-5555-5555-5555-555555555555",
    campus_id: "11111111-1111-1111-1111-111111111111",
    name: "Fall Semester 2026",
    academic_year: "2026-2027",
    start_date: "2026-08-01",
    end_date: "2026-12-15",
    saturday_rule: "SECOND_FOURTH" as SaturdayRuleType,
    is_current: true,
    is_published: true,
    created_at: "2026-08-01",
    updated_at: "2026-08-01",
  };

  const [calendarEvents, setCalendarEvents] = useState<DbCalendarEvent[]>(() =>
    isolatedDataStore.getCalendarEvents(activeSemester.id)
  );
  const [examWindows, setExamWindows] = useState<DbExamWindow[]>(() =>
    isolatedDataStore.getExamWindows(activeSemester.id)
  );

  // Workflow Modals State
  const [isSemesterSetupOpen, setIsSemesterSetupOpen] = useState<boolean>(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isExamWindowsOpen, setIsExamWindowsOpen] = useState<boolean>(false);
  const [isTimetableEditorOpen, setIsTimetableEditorOpen] = useState<boolean>(false);
  const [isLessonPlanOpen, setIsLessonPlanOpen] = useState<boolean>(false);
  const [isSyllabusImportOpen, setIsSyllabusImportOpen] = useState<boolean>(false);
  const [selectedSubjectId] = useState<string>("88888888-8888-8888-8888-888888888881");

  const currentSemester = activeSemester.name;

  // Active persona authenticated context
  const currentUser: AuthenticatedUser = {
    id:
      currentRole === "admin"
        ? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        : currentRole === "campus_manager"
        ? "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        : currentRole === "faculty"
        ? "cccccccc-cccc-cccc-cccc-cccccccccccc"
        : "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    email: `${currentRole}@msot.org`,
    role: currentRole,
    campusId: "11111111-1111-1111-1111-111111111111",
  };

  const canManageSem = canManageSemester(currentUser);
  const canManageCal = canManageCalendar(currentUser, activeSemester.campus_id);
  const canManageEx = canManageExams(currentUser, activeSemester.campus_id);

  // Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; type: "success" | "error" | "info"; title: string; message: string }>>([
    {
      id: "welcome",
      type: "info",
      title: "Quiet Precision Theme Active",
      message: "Viewing Prospectus Academic Analytics shell with MSOT calculation engine.",
    },
  ]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Semester Management Actions
  const handleSaveSemester = (data: {
    campus_id: string;
    track_id: string;
    name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    saturday_rule: SaturdayRuleType;
    batch_name?: string;
    batch_section?: string;
    student_count?: number;
    is_published?: boolean;
  }) => {
    try {
      const created = isolatedDataStore.createSemester(
        {
          campus_id: data.campus_id,
          name: data.name,
          academic_year: data.academic_year,
          start_date: data.start_date,
          end_date: data.end_date,
          saturday_rule: data.saturday_rule,
          is_current: true,
        },
        currentUser
      );

      if (data.batch_name) {
        isolatedDataStore.createBatch(
          {
            campus_id: data.campus_id,
            track_id: data.track_id,
            semester_id: created.id,
            name: data.batch_name,
            section: data.batch_section || "A",
            intake_year: Number(data.academic_year.split("-")[0]) || 2026,
            student_count: data.student_count || 60,
          },
          currentUser
        );
      }

      if (data.is_published) {
        isolatedDataStore.publishSemester(created.id, currentUser);
      }

      setSemesters(isolatedDataStore.getSemesters());
      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          type: "success",
          title: "Semester Initialized",
          message: `Created ${created.name} (${created.saturday_rule} Saturday rule) with connected batch cohort.`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Semester Setup Failed", message: msg },
      ]);
    }
  };

  const handlePublishActiveSemester = () => {
    try {
      const published = isolatedDataStore.publishSemester(activeSemester.id, currentUser);
      setSemesters(isolatedDataStore.getSemesters());
      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          type: "success",
          title: "Academic Calendar Published",
          message: `${published.name} is now published and visible to teaching faculty and students.`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Publish Failed", message: msg },
      ]);
    }
  };

  // Calendar Event Actions
  const handleSaveCalendarEvent = (data: {
    semester_id: string;
    campus_id?: string | null;
    title: string;
    event_type: CalendarEventType;
    start_date: string;
    end_date: string;
    is_instructional: boolean;
    description?: string | null;
    change_reason?: string | null;
  }) => {
    try {
      const result = isolatedDataStore.createCalendarEvent(data, currentUser);
      setCalendarEvents(isolatedDataStore.getCalendarEvents(activeSemester.id));
      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          type: "success",
          title: "Calendar Event Created",
          message: `Saved "${result.event.title}". ${result.shifts.length} dependent sessions realigned.`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Event Save Failed", message: msg },
      ]);
    }
  };

  const handleDeleteCalendarEvent = (eventId: string) => {
    const reason = window.prompt("Please provide an audit reason for deleting this calendar event:") || "Administrative calendar cleanup";
    try {
      const result = isolatedDataStore.deleteCalendarEvent(eventId, reason, currentUser);
      setCalendarEvents(isolatedDataStore.getCalendarEvents(activeSemester.id));
      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          type: "info",
          title: "Calendar Event Deleted",
          message: `Event removed with audit reason. ${result.shifts.length} session shifts evaluated.`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Delete Failed", message: msg },
      ]);
    }
  };

  // Exam Window Actions
  const handleAddExamWindow = (data: {
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
  }) => {
    try {
      const created = isolatedDataStore.createExamWindow(data, currentUser);
      setExamWindows(isolatedDataStore.getExamWindows(activeSemester.id));
      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          type: "success",
          title: "Exam Window Configured",
          message: `Saved ${created.name} (${created.weightage_percent}% weightage).`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Exam Window Failed", message: msg },
      ]);
    }
  };

  const handleDeleteExamWindow = (examId: string) => {
    try {
      isolatedDataStore.deleteExamWindow(examId, currentUser);
      setExamWindows(isolatedDataStore.getExamWindows(activeSemester.id));
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "info", title: "Exam Window Removed", message: "Successfully deleted exam window." },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Delete Failed", message: msg },
      ]);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    try {
      isolatedDataStore.deleteTimetableSlot(slotId, currentUser, "Removed via Timetable grid");
      setTimetableSlotsVersion((v) => v + 1);
      setToasts((prev) => [
        ...prev,
        {
          id: `del-slot-${Date.now()}`,
          type: "success",
          title: "Timetable Slot Removed",
          message: "Slot deleted and syllabus planned dates automatically recalculated.",
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        { id: `toast-${Date.now()}`, type: "error", title: "Slot Deletion Failed", message: msg },
      ]);
    }
  };

  // CSV Batch Import Execution
  const handleExecuteImport = (
    preview: ImportPreviewResult<CalendarEventCreateInput>,
    skipDuplicates: boolean
  ): ImportExecutionReport => {
    const report = isolatedDataStore.importCalendarEventsBatch(
      activeSemester.id,
      preview.rows,
      currentUser,
      skipDuplicates
    );
    setCalendarEvents(isolatedDataStore.getCalendarEvents(activeSemester.id));
    return report;
  };

  // Mock sessions state (starts with seed and updates on rapid log)
  const [topics, setTopics] = useState(SEED_TOPICS_CS201);
  const [loggedSessionsCount, setLoggedSessionsCount] = useState<number>(3);

  // Run the Academic Calculation Engine dynamically
  // Target deadline Dec 5, 2026; available teaching hours on calendar: 24.5 hrs
  const availableHours = 24.5;
  const progressionMetrics = calculateCourseProgression(
    topics,
    availableHours,
    "2026-10-16"
  );

  const midTermExam = SEED_EXAMS.find((e) => e.examType === "MID_TERM")!;
  const examReadiness = calculateExamReadiness(
    "MID_TERM",
    midTermExam.name,
    midTermExam.startDate,
    topics
  );

  const trackRollup = rollUpTrackProgress("Mirai Track", [progressionMetrics]);

  // Authorization check for current persona
  const canUserLog = canLogSession(
    {
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      email: "sharma.faculty@msot.org",
      role: currentRole,
    },
    "cccccccc-cccc-cccc-cccc-cccccccccccc"
  );

  // Academic Rail Milestones
  const railMilestones: Milestone[] = [
    {
      id: "m-1",
      title: "Semester Begins",
      category: "semester_start",
      date: "Aug 01",
      isCompleted: true,
      note: "Induction Complete",
    },
    {
      id: "m-2",
      title: "Unit 1: Fundamentals",
      category: "topic_milestone",
      date: "Aug 20",
      isCompleted: true,
      note: "100% Delivered",
    },
    {
      id: "m-3",
      title: "Sessional 1",
      category: "exam",
      date: "Sep 21",
      isCompleted: true,
      note: "Evaluation Done",
    },
    {
      id: "m-4",
      title: "Unit 2 & 3 Delivery",
      category: "topic_milestone",
      date: "Oct 15",
      isCompleted: false,
      isCurrent: true,
      note: "Pacing Active",
    },
    {
      id: "m-5",
      title: "Mid-Term Exam",
      category: "exam",
      date: "Oct 21",
      isCompleted: false,
      note: "Scope: Units 1–3",
    },
    {
      id: "m-6",
      title: "Pre-University Test",
      category: "exam",
      date: "Nov 23",
      isCompleted: false,
    },
    {
      id: "m-7",
      title: "End-Term Finals",
      category: "semester_end",
      date: "Dec 16",
      isCompleted: false,
    },
  ];

  // Dynamic Timetable Slots from Data Store
  const [timetableSlotsVersion, setTimetableSlotsVersion] = useState<number>(0);
  const dbSlots = isolatedDataStore.getTimetableSlots();
  const timetableSlots = dbSlots.map((slot) => {
    const bs = isolatedDataStore.getBatchSubjects().find((b) => b.id === slot.batch_subject_id);
    const sub = isolatedDataStore.getSubjects().find((subj) => subj.id === bs?.subject_id);
    return {
      id: slot.id,
      dayOfWeek: slot.day_of_week,
      subjectCode: sub?.code || "CS201",
      subjectName: sub?.name || "Data Structures & Algorithms",
      facultyName: "Dr. Neha Sharma",
      startTime: slot.start_time,
      endTime: slot.end_time,
      durationHours: slot.duration_hours,
    };
  });

  // Derived Faculty Dashboard Data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _forceRerender = sessionLogsVersion;
  const facultyDashboardData = isolatedDataStore.getFacultyDashboardData(
    currentUser.id,
    "2026-10-16"
  );

  const openLogForSession = (
    session?: DbScheduledSession & {
      subject_name?: string;
      subject_code?: string;
      batch_name?: string;
      room?: string;
    }
  ) => {
    if (session) {
      setSelectedSessionToLog(session);
    } else {
      const target =
        facultyDashboardData.awaitingLogSessions[0] ||
        facultyDashboardData.todaySessions[0] ||
        isolatedDataStore.getAllScheduledSessions()[0] ||
        null;
      setSelectedSessionToLog(target);
    }
    setIsFacultyLogModalOpen(true);
  };

  const handleSaveCanonicalSession = async (payload: {
    scheduled_session_id: string;
    batch_subject_id: string;
    faculty_id: string;
    session_date: string;
    actual_start_time: string;
    actual_end_time: string;
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
    affected_topics: Array<{
      topic_id: string;
      percent_complete_after: number;
      topic_status_after: TopicProgressStatus;
      notes?: string;
    }>;
  }) => {
    try {
      const result = isolatedDataStore.recordCanonicalSessionLog(
        payload,
        currentUser,
        payload.faculty_id
      );

      setSessionLogsVersion((v) => v + 1);
      setLoggedSessionsCount((c) => c + 1);

      if (result.updatedTopics.length > 0) {
        setTopics((prev) =>
          prev.map((t) => {
            const match = result.updatedTopics.find(
              (ut) => ut.id === t.id || ut.title.toLowerCase() === t.title.toLowerCase()
            );
            return match
              ? {
                  ...t,
                  status:
                    match.status === "COMPLETED"
                      ? "COMPLETED"
                      : "IN_PROGRESS",
                  percentComplete: match.percent_complete,
                }
              : t;
          })
        );
      }

      setToasts((prev) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          type: "success",
          title: `Session Recorded (${payload.delivery_status})`,
          message: `Saved ${result.log.duration_minutes}m teaching session to database. ${result.updatedTopics.length} topic(s) updated.`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToasts((prev) => [
        ...prev,
        {
          id: `toast-err-${Date.now()}`,
          type: "error",
          title: "Session Logging Failed",
          message: msg,
        },
      ]);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex text-[#172033] selection:bg-[#4965E8] selection:text-white antialiased">
      {/* Desktop Sidebar */}
      <Sidebar
        currentRole={currentRole}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        className="hidden lg:flex"
      />

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#172033]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <Sidebar
            currentRole={currentRole}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl"
          />
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Contextual Glass Toolbar */}
        <TopToolbar
          currentCampus={currentCampus}
          onCampusChange={setCurrentCampus}
          currentTrack={currentTrack}
          onTrackChange={setCurrentTrack}
          currentSemester={currentSemester}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenQuickLog={() => openLogForSession()}
          canLog={canUserLog}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* OVERVIEW SECTION */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <PageHeader
                kicker="ACADEMIC PROGRESSION // BATCH CSE-2026-B"
                title="Data Structures & Algorithms"
                description={`Tracking curriculum pace across 48 planned lecture hours for ${currentCampus} campus (${currentTrack} Track).`}
                badge={<StatusLabel status={progressionMetrics.status} size="md" />}
                actions={
                  canUserLog && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openLogForSession()}
                      className="shadow-xs"
                    >
                      <Clock className="h-4 w-4" />
                      <span>Log Session (&lt;60s)</span>
                    </Button>
                  )
                }
              />

              {/* Signature Visual Element 1: Academic Progress Rail */}
              <ProgressRail milestones={railMilestones} />

              {/* 4 Core Deterministic Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Syllabus Coverage */}
                <div className="card-quiet p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Syllabus Coverage
                    </span>
                    <BookOpen className="h-4 w-4 text-[#4965E8]" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
                        {progressionMetrics.coveragePercentage}%
                      </span>
                      <span className="text-xs text-[#64748B]">
                        ({progressionMetrics.coveredHours} / {progressionMetrics.totalHoursInScope}h)
                      </span>
                    </div>
                  </div>
                  <Progress value={progressionMetrics.coveragePercentage} size="sm" variant="brand" />
                  <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
                    <span>In Scope: {progressionMetrics.totalHoursInScope}h</span>
                    <span>Remaining: {progressionMetrics.remainingHours}h</span>
                  </div>
                </div>

                {/* 2. Buffer Ratio */}
                <div className="card-quiet p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Buffer Ratio
                    </span>
                    <StatusLabel status={progressionMetrics.status} size="sm" showDot={false} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
                        {progressionMetrics.bufferRatio}x
                      </span>
                      <span className="text-xs text-[#64748B]">
                        (&ge;1.15 On Track)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, (progressionMetrics.bufferRatio / 1.5) * 100)}
                    size="sm"
                    variant={
                      progressionMetrics.status === "DANGER"
                        ? "danger"
                        : progressionMetrics.status === "TIGHT"
                        ? "warning"
                        : "success"
                    }
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
                    <span>Available: {progressionMetrics.availableHoursTillDeadline}h</span>
                    <span>Deadline: Dec 05</span>
                  </div>
                </div>

                {/* 3. Pace Against Plan */}
                <div className="card-quiet p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Pace vs Plan
                    </span>
                    <Clock className="h-4 w-4 text-[#8878F5]" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-extrabold tracking-tight ${
                          progressionMetrics.paceVsPlanHours >= 0
                            ? "text-[#16836B]"
                            : "text-[#C84B58]"
                        }`}
                      >
                        {progressionMetrics.paceVsPlanHours >= 0 ? "+" : ""}
                        {progressionMetrics.paceVsPlanHours}h
                      </span>
                      <span className="text-xs text-[#64748B]">vs expected</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {progressionMetrics.overdueTopicsCount === 0 ? (
                      <span className="text-[#16836B] font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Zero overdue topics
                      </span>
                    ) : (
                      <span className="text-[#C84B58] font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {progressionMetrics.overdueTopicsCount} topic overdue
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
                    <span>Logged: {loggedSessionsCount} sessions</span>
                    <span>Pre-filled from slot</span>
                  </div>
                </div>

                {/* 4. Mid-Term Readiness */}
                <div className="card-quiet p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Mid-Term Readiness
                    </span>
                    <Award className="h-4 w-4 text-[#B87918]" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
                        {examReadiness.readinessPercentage}%
                      </span>
                      <span className="text-xs text-[#64748B]">Oct 21</span>
                    </div>
                  </div>
                  <Progress
                    value={examReadiness.readinessPercentage}
                    size="sm"
                    variant={examReadiness.isReady ? "success" : "warning"}
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
                    <span>In-scope needed:</span>
                    <span className="font-semibold text-[#172033]">
                      {examReadiness.remainingHoursNeeded}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Visual Element 2: Polished Horizontal Pace Indicator */}
              <PaceIndicator
                coveredHours={progressionMetrics.coveredHours}
                expectedHoursByToday={4.5}
                totalPlannedHours={progressionMetrics.totalHoursInScope}
                status={progressionMetrics.status}
                targetFinishDate="2026-12-05"
              />

              {/* Signature Visual Element 3: Weekly Timetable Grid */}
              <TimetableGrid
                key={timetableSlotsVersion}
                slots={timetableSlots}
                saturdayRuleLabel="2nd & 4th Sat Working"
              />
            </div>
          )}

          {/* COURSES SECTION */}
          {activeSection === "courses" && (
            <div className="space-y-6">
              <PageHeader
                kicker="ACADEMIC CURRICULUM // CAMPUS ROLLUP"
                title="Active Courses &amp; Progress Summary"
                description={`Rolled-up subject delivery status for ${currentCampus} campus. Track status reflects the worst subject.`}
                badge={<StatusLabel status={trackRollup.worstStatus} size="md" />}
              />

              <div className="card-quiet p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Subject Title</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Buffer</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SEED_SUBJECTS.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono font-bold text-[#4965E8]">
                          {s.code}
                        </TableCell>
                        <TableCell className="font-semibold">{s.name}</TableCell>
                        <TableCell className="text-[#64748B]">
                          {s.code === "CS201" ? "Dr. Neha Sharma" : "Prof. Rahul Verma"}
                        </TableCell>
                        <TableCell className="font-mono">{s.totalPlannedHours}h</TableCell>
                        <TableCell className="font-mono">
                          {s.code === "CS201" ? progressionMetrics.coveredHours : 18.0}h
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-10 font-mono font-semibold">
                              {s.code === "CS201" ? progressionMetrics.coveragePercentage : 42.8}%
                            </span>
                            <Progress
                              value={s.code === "CS201" ? progressionMetrics.coveragePercentage : 42.8}
                              size="sm"
                              className="w-16 hidden sm:block"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {s.code === "CS201" ? `${progressionMetrics.bufferRatio}x` : "1.08x"}
                        </TableCell>
                        <TableCell>
                          <StatusLabel
                            status={s.code === "CS201" ? progressionMetrics.status : "TIGHT"}
                            size="sm"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TIMETABLE SECTION */}
          {activeSection === "timetable" && (
            <div className="space-y-6">
              <PageHeader
                kicker="SCHEDULE ALLOCATION // WORKING CALENDAR"
                title="Campus Timetable &amp; Capacity Allocation"
                description="Visual schedule mapping Monday through Saturday with working Saturday rules, conflict validation, and exact duration calculations."
                actions={
                  (currentUser.role === "admin" || currentUser.role === "campus_manager") && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsTimetableEditorOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Configure Slot
                    </Button>
                  )
                }
              />
              <TimetableGrid
                key={`tt-${timetableSlotsVersion}`}
                slots={timetableSlots}
                saturdayRuleLabel="2nd & 4th Sat Working"
                canEdit={currentUser.role === "admin" || currentUser.role === "campus_manager"}
                onAddSlot={() => setIsTimetableEditorOpen(true)}
                onDeleteSlot={handleDeleteSlot}
              />
              <PlanTimelinePreview subjectId={selectedSubjectId} />
            </div>
          )}

          {/* LESSON PLANS SECTION */}
          {activeSection === "lesson_plans" && (
            <div className="space-y-6">
              <PageHeader
                kicker="SYLLABUS ARCHITECTURE // CS201"
                title="Lesson Plan Units &amp; Sequence Breakdown"
                description="Weight-based planned topics. Sessions run 50 minutes to 2 hours; every percentage is weighted by planned hours."
                actions={
                  canUserLog && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsSyllabusImportOpen(true)}
                      >
                        <FileCheck className="h-4 w-4 mr-1.5 text-[#4965E8]" />
                        Import Syllabus (CSV)
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsLessonPlanOpen(true)}
                      >
                        <BookOpen className="h-4 w-4 mr-1.5" />
                        Edit Lesson Plan &amp; Topics
                      </Button>
                    </div>
                  )
                }
              />

              <div className="space-y-4">
                <div className="card-quiet p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Seq</TableHead>
                        <TableHead>Topic Title</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Planned Hrs</TableHead>
                        <TableHead>Planned Date</TableHead>
                        <TableHead>Exam Scope</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topics.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono font-bold text-[#64748B]">
                            #{t.sequenceOrder}
                          </TableCell>
                          <TableCell className="font-medium text-[#172033]">
                            {t.title}
                          </TableCell>
                          <TableCell className="text-[#64748B] text-xs">
                            Unit {t.unitNumber}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {t.plannedHours}h
                          </TableCell>
                          <TableCell className="font-mono text-[#64748B]">
                            {t.plannedDate || "Automated"}
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-semibold text-[#8878F5] bg-[#8878F5]/10 px-1.5 py-0.5 rounded">
                              {t.inScopeForExams.join(", ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusLabel
                              variant={
                                t.status === "COMPLETED"
                                  ? "success"
                                  : t.status === "IN_PROGRESS"
                                  ? "brand"
                                  : "neutral"
                              }
                              size="sm"
                            >
                              {t.status === "COMPLETED"
                                ? "Done (100%)"
                                : t.status === "IN_PROGRESS"
                                ? `In Progress (${t.percentComplete}%)`
                                : t.status}
                            </StatusLabel>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <PlanTimelinePreview subjectId={selectedSubjectId} />
              </div>
            </div>
          )}

          {/* SESSION LOGS SECTION */}
          {activeSection === "session_logs" && (
            <div className="space-y-6">
              <PageHeader
                kicker="TEACHING AUDIT // RAPID CONFIRMATION"
                title="Faculty Session Command Center"
                description="Verified delivery sessions recorded by faculty. Designed for sub-60s mobile entry with atomic database persistence."
                actions={
                  canUserLog && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openLogForSession()}
                    >
                      <Clock className="h-4 w-4 mr-1.5" />
                      Log Session (&lt;60s)
                    </Button>
                  )
                }
              />

              <FacultySessionDashboard
                dashboardData={facultyDashboardData}
                onSelectSessionToLog={(session) => openLogForSession(session)}
                onRefreshData={() => setSessionLogsVersion((v) => v + 1)}
              />
            </div>
          )}

          {/* EXAM READINESS SECTION */}
          {activeSection === "exam_readiness" && (
            <div className="space-y-6">
              <PageHeader
                kicker="EXAM WINDOWS // SYLLABUS SCOPE"
                title="Exam Readiness Analytics"
                description="In-scope topic coverage and required instructional hours before each upcoming university milestone."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SEED_EXAMS.map((exam) => {
                  const readiness = calculateExamReadiness(
                    exam.examType,
                    exam.name,
                    exam.startDate,
                    topics
                  );

                  return (
                    <div key={exam.id} className="card-quiet p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-[#8878F5] uppercase tracking-wider bg-[#8878F5]/10 px-2 py-0.5 rounded">
                          {exam.examType}
                        </span>
                        <span className="text-xs font-mono text-[#64748B]">{exam.startDate}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#172033] line-clamp-1">
                        {exam.name}
                      </h4>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-[#172033]">
                          {readiness.readinessPercentage}%
                        </span>
                        <span className="text-xs text-[#64748B]">
                          {readiness.coveredInScopeHours}/{readiness.totalInScopeHours}h
                        </span>
                      </div>
                      <Progress
                        value={readiness.readinessPercentage}
                        size="sm"
                        variant={readiness.isReady ? "success" : "warning"}
                      />
                      <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2] flex justify-between">
                        <span>Hours needed:</span>
                        <span className="font-semibold text-[#172033]">
                          {readiness.remainingHoursNeeded}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CALENDAR SECTION */}
          {activeSection === "calendar" && (
            <div className="space-y-6">
              <PageHeader
                kicker="WORKING CALENDAR // 2ND & 4TH SATURDAY RULES"
                title="Academic Calendar &amp; Holidays"
                description={`Official calendar for ${activeSemester.name}. Automatic date engine shifts later planned dates when holidays are added.`}
                actions={
                  canManageCal && (
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
                        <Upload className="h-3.5 w-3.5" />
                        Import CSV
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => setIsAddEventOpen(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Add Event
                      </Button>
                    </div>
                  )
                }
              />

              {/* Interactive Calendar Month View */}
              <CalendarMonthView
                currentSemesterId={activeSemester.id}
                campusId={activeSemester.campus_id}
                saturdayRule={activeSemester.saturday_rule}
                events={calendarEvents}
                onAddEvent={() => setIsAddEventOpen(true)}
                onOpenImport={() => setIsImportOpen(true)}
                onOpenExamWindows={() => setIsExamWindowsOpen(true)}
                onDeleteEvent={handleDeleteCalendarEvent}
                canManage={canManageCal}
              />
            </div>
          )}

          {/* REPORTS SECTION */}
          {activeSection === "reports" && (
            <div className="space-y-6">
              <PageHeader
                kicker="INSTITUTIONAL METRICS // ACCREDITATION"
                title="Campus Progression Reports"
                description="Exportable pacing reports for academic leadership and department heads."
                actions={
                  <Button variant="secondary" size="sm">
                    <BarChart3 className="h-4 w-4 mr-1.5 text-[#4965E8]" />
                    Export Pacing Report (CSV)
                  </Button>
                }
              />
              <div className="card-quiet p-6 text-center space-y-2">
                <BarChart3 className="h-10 w-10 text-[#4965E8] mx-auto opacity-70" />
                <h4 className="text-sm font-bold text-[#172033]">
                  All 4 Campuses Pacing Metrics Loaded
                </h4>
                <p className="text-xs text-[#64748B] max-w-md mx-auto">
                  HI-Tech (On Track), Ratnam (Tight), RGIB (On Track), JUJ (On Track). Detailed semester exports ready.
                </p>
              </div>
            </div>
          )}

          {/* SETTINGS SECTION (Admin Semester Setup & System Parameters) */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <PageHeader
                kicker="SEMESTER SETUP // PROGRAM MANAGEMENT"
                title="Academic Term Configuration &amp; Settings"
                description="Manage campus semesters, Saturday instructional policies, cohort batches, and review/publish changes."
                actions={
                  canManageSem && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={activeSemester.is_published ? "secondary" : "primary"}
                        size="sm"
                        onClick={handlePublishActiveSemester}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {activeSemester.is_published ? "Calendar Published" : "Publish Calendar"}
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => setIsSemesterSetupOpen(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Configure Term
                      </Button>
                    </div>
                  )
                }
              />

              {/* Active Semester Overview Card */}
              <div className="card-quiet p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#172033]">{activeSemester.name}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#4965E8]/10 text-[#4965E8]">
                        {activeSemester.academic_year}
                      </span>
                      {activeSemester.is_published ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#16836B]/10 text-[#16836B] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Published
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#B87918]/10 text-[#B87918]">
                          Draft (Unpublished)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 font-mono">
                      Dates: {activeSemester.start_date} → {activeSemester.end_date} &bull; Saturday Rule:{" "}
                      <strong>{activeSemester.saturday_rule}</strong>
                    </p>
                  </div>

                  {canManageSem && (
                    <Button variant="secondary" size="sm" onClick={() => setIsSemesterSetupOpen(true)}>
                      <Settings className="h-3.5 w-3.5" />
                      Edit Boundaries
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2]">
                    <span className="text-[#64748B]">Enrolled Cohorts</span>
                    <p className="text-sm font-bold text-[#172033] mt-1">CSE 2026 Sec B (64 students)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2]">
                    <span className="text-[#64748B]">Calendar Events</span>
                    <p className="text-sm font-bold text-[#172033] mt-1">{calendarEvents.length} Holidays/Events</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2]">
                    <span className="text-[#64748B]">Milestone Exam Windows</span>
                    <p className="text-sm font-bold text-[#172033] mt-1">{examWindows.length} Windows Defined</p>
                  </div>
                </div>
              </div>

              {/* Architectural Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-quiet p-5 space-y-2 text-xs">
                  <h4 className="font-bold text-[#172033] flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-[#4965E8]" />
                    <span>Visual Identity: Quiet Precision</span>
                  </h4>
                  <p className="text-[#64748B]">
                    Built with calm slate backgrounds (#F7F8FC), pure white cards, crisp 1px borders (#E6EAF2),
                    and subtle non-disruptive feedback.
                  </p>
                </div>
                <div className="card-quiet p-5 space-y-2 text-xs">
                  <h4 className="font-bold text-[#172033] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#8878F5]" />
                    <span>Deterministic Academic Engine</span>
                  </h4>
                  <p className="text-[#64748B]">
                    38 unit tests passing. Calculations are 100% pure and independent of React components.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Canonical Faculty Session Log Modal */}
      <FacultySessionLogModal
        isOpen={isFacultyLogModalOpen}
        onClose={() => setIsFacultyLogModalOpen(false)}
        scheduledSession={selectedSessionToLog}
        syllabusTopics={isolatedDataStore.getTopics(selectedSubjectId)}
        otherScheduledSessions={isolatedDataStore.getAllScheduledSessions()}
        onSaveSession={handleSaveCanonicalSession}
      />

      {/* Admin Semester Setup Modal */}
      <SemesterSetupModal
        isOpen={isSemesterSetupOpen}
        onClose={() => setIsSemesterSetupOpen(false)}
        onSaveSemester={handleSaveSemester}
        existingSemester={activeSemester}
      />

      {/* Add Calendar Event Modal */}
      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        semesterId={activeSemester.id}
        campusId={activeSemester.campus_id}
        onSaveEvent={handleSaveCalendarEvent}
      />

      {/* Batch CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        semesterId={activeSemester.id}
        campusId={activeSemester.campus_id}
        existingEvents={calendarEvents}
        onExecuteImport={handleExecuteImport}
      />

      {/* Exam Windows Management Modal */}
      <ExamWindowsModal
        isOpen={isExamWindowsOpen}
        onClose={() => setIsExamWindowsOpen(false)}
        semesterId={activeSemester.id}
        campusId={activeSemester.campus_id}
        examWindows={examWindows}
        onAddExamWindow={handleAddExamWindow}
        onDeleteExamWindow={handleDeleteExamWindow}
        canManage={canManageEx}
      />

      {/* Timetable Editor Modal */}
      <TimetableEditorModal
        isOpen={isTimetableEditorOpen}
        onClose={() => setIsTimetableEditorOpen(false)}
        currentUser={currentUser}
        onSlotSaved={() => {
          setTimetableSlotsVersion((v) => v + 1);
          setToasts((prev) => [
            ...prev,
            {
              id: `slot-save-${Date.now()}`,
              type: "success",
              title: "Timetable Slot Configured",
              message: "Weekly slot saved with exact duration and dependent topic dates recalculated.",
            },
          ]);
        }}
      />

      {/* Lesson Plan & Topics Modal */}
      <LessonPlanModal
        isOpen={isLessonPlanOpen}
        onClose={() => setIsLessonPlanOpen(false)}
        subjectId={selectedSubjectId}
        currentUser={currentUser}
        onPlanUpdated={() => {
          setTimetableSlotsVersion((v) => v + 1);
          setToasts((prev) => [
            ...prev,
            {
              id: `plan-upd-${Date.now()}`,
              type: "success",
              title: "Lesson Plan Updated",
              message: "Topics and multi-exam mappings updated with chronological dates recalculated.",
            },
          ]);
        }}
      />

      {/* Syllabus CSV Import Modal */}
      <SyllabusCsvImportModal
        isOpen={isSyllabusImportOpen}
        onClose={() => setIsSyllabusImportOpen(false)}
        subjectId={selectedSubjectId}
        currentUser={currentUser}
        onImportComplete={(report) => {
          setTimetableSlotsVersion((v) => v + 1);
          setToasts((prev) => [
            ...prev,
            {
              id: `csv-imp-${Date.now()}`,
              type: "success",
              title: "Syllabus Imported",
              message: `Imported ${report.importedCount} topics preserving original syllabus order.`,
            },
          ]);
        }}
      />

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
