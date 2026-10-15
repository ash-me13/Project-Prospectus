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
  SEED_TIMETABLE,
  SEED_HOLIDAYS,
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
import { QuickLogModal, LoggedSessionPayload } from "@/components/sessions/quick-log-modal";
import { Toast } from "@/components/ui/toast";
import { canLogSession } from "@/auth/authorization";
import { UserRole } from "@/types/academic";
import {
  BookOpen,
  Award,
  Clock,
  Layers,
  FileCheck,
  Calendar,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from "lucide-react";

export default function ProspectusApp() {
  // Navigation & Role State
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [currentRole, setCurrentRole] = useState<UserRole>("faculty");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState<boolean>(false);

  // Academic Context State
  const [currentCampus, setCurrentCampus] = useState<string>("HITECH");
  const [currentTrack, setCurrentTrack] = useState<string>("Mirai");
  const currentSemester = "Fall 2026 (Sem 1)";

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

  // Timetable Slots View
  const timetableSlots = SEED_TIMETABLE.map((slot) => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    subjectCode: "CS201",
    subjectName: "Data Structures & Algorithms",
    facultyName: "Dr. Neha Sharma",
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationHours: slot.durationHours,
  }));

  // Handle Fast Session Logging
  const handleSessionLogged = (data: LoggedSessionPayload) => {
    setLoggedSessionsCount((c) => c + 1);

    // Update topic completion if logged
    if (data.topicsCovered && data.topicsCovered.length > 0) {
      setTopics((prev) =>
        prev.map((t) =>
          data.topicsCovered.includes(t.id)
            ? { ...t, status: data.status, percentComplete: data.percentComplete }
            : t
        )
      );
    }

    // Add toast
    setToasts((prev) => [
      ...prev,
      {
        id: `toast-${Date.now()}`,
        type: "success",
        title: "Session Logged in <60 Seconds",
        message: `Successfully verified teaching session for ${data.plannedHours}h. Pacing recomputed instantly.`,
      },
    ]);
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
          onOpenQuickLog={() => setIsQuickLogOpen(true)}
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
                      onClick={() => setIsQuickLogOpen(true)}
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
                description="Visual schedule mapping Monday through Saturday with working Saturday rules and instructional holidays."
              />
              <TimetableGrid slots={timetableSlots} saturdayRuleLabel="2nd & 4th Sat Working" />
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
                    <Button variant="secondary" size="sm">
                      <FileCheck className="h-4 w-4 mr-1.5 text-[#4965E8]" />
                      Import Syllabus (CSV/Excel)
                    </Button>
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
              </div>
            </div>
          )}

          {/* SESSION LOGS SECTION */}
          {activeSection === "session_logs" && (
            <div className="space-y-6">
              <PageHeader
                kicker="TEACHING AUDIT // RAPID CONFIRMATION"
                title="Logged Teaching Sessions"
                description="Verified delivery sessions recorded by faculty. Every percentage is traceable to these source records."
                actions={
                  canUserLog && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsQuickLogOpen(true)}
                    >
                      <Clock className="h-4 w-4 mr-1.5" />
                      Log Session (&lt;60s)
                    </Button>
                  )
                }
              />

              <div className="card-quiet p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Topic Covered</TableHead>
                      <TableHead>Classwork</TableHead>
                      <TableHead>Homework</TableHead>
                      <TableHead>Verification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono font-semibold">2026-10-14</TableCell>
                      <TableCell className="font-medium">CS201: Data Structures</TableCell>
                      <TableCell className="font-mono">90 min (1.5h)</TableCell>
                      <TableCell className="text-xs">Singly &amp; Doubly Linked Lists</TableCell>
                      <TableCell>
                        <span className="text-[10px] font-semibold bg-[#16836B]/10 text-[#16836B] px-1.5 py-0.5 rounded">
                          ASSIGNED
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-semibold bg-[#4965E8]/10 text-[#4965E8] px-1.5 py-0.5 rounded">
                          ASSIGNED
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[#16836B] font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-semibold">2026-10-12</TableCell>
                      <TableCell className="font-medium">CS201: Data Structures</TableCell>
                      <TableCell className="font-mono">90 min (1.5h)</TableCell>
                      <TableCell className="text-xs">Dynamic Arrays Representation</TableCell>
                      <TableCell>
                        <span className="text-[10px] font-semibold bg-[#16836B]/10 text-[#16836B] px-1.5 py-0.5 rounded">
                          COLLECTED
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-semibold bg-[#16836B]/10 text-[#16836B] px-1.5 py-0.5 rounded">
                          REVIEWED
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[#16836B] font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
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
                description="Official calendar for Fall Semester 2026. Automatic date engine shifts later planned dates when holidays are added."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Working Rules Card */}
                <div className="card-quiet p-5 space-y-3">
                  <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#4965E8]" />
                    <span>Working Saturday Policy</span>
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Under the <strong>SECOND_FOURTH</strong> rule, the 2nd and 4th Saturdays of every month
                    are instructional working days, adding teaching hours to weekly allocation. Sundays and
                    other Saturdays are non-instructional.
                  </p>
                  <div className="p-3 bg-[#F7F8FC] rounded-lg border border-[#E6EAF2] text-xs font-mono space-y-1">
                    <p className="text-[#16836B] font-semibold">&bull; Oct 10 (2nd Sat): Instructional Day (Active)</p>
                    <p className="text-[#64748B]">&bull; Oct 17 (3rd Sat): Non-instructional</p>
                    <p className="text-[#16836B] font-semibold">&bull; Oct 24 (4th Sat): Instructional Day (Active)</p>
                  </div>
                </div>

                {/* Holiday Calendar List */}
                <div className="card-quiet p-5 space-y-3">
                  <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#B87918]" />
                    <span>Official Holidays &amp; Breaks</span>
                  </h4>
                  <div className="space-y-2">
                    {SEED_HOLIDAYS.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2 rounded-md bg-[#F7F8FC] border border-[#E6EAF2] text-xs"
                      >
                        <span className="font-semibold text-[#172033]">{h.name}</span>
                        <span className="font-mono text-[#64748B]">{h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

          {/* SETTINGS SECTION */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <PageHeader
                kicker="SYSTEM ARCHITECTURE // RESTRAINED DESIGN"
                title="Platform Architecture &amp; Role Settings"
                description="Technical configuration and active environment parameters for Prospectus."
              />
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
                    16 unit tests passing. Calculations are 100% pure and independent of React components.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Rapid Session Logging Modal (<60s Mobile Flow) */}
      <QuickLogModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        onSessionLogged={handleSessionLogged}
        subjectCode="CS201"
        subjectName="Data Structures & Algorithms"
        plannedHours={1.5}
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
