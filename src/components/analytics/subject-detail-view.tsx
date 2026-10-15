"use client";

import React, { useState } from "react";
import { SubjectDetailAnalyticsData } from "@/domain/analytics-service";
import { StatusLabel } from "@/components/ui/status-label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PaceIndicator } from "@/components/progression/pace-indicator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  Layers,
  Award,
  Info,
  AlertTriangle,
  Zap,
} from "lucide-react";

interface SubjectDetailViewProps {
  data: SubjectDetailAnalyticsData;
  onBack: () => void;
  onOpenQuickLog?: () => void;
}

export function SubjectDetailView({
  data,
  onBack,
  onOpenQuickLog,
}: SubjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "logs" | "exams">("timeline");
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Back button & Page Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[#4965E8] bg-[#4965E8]/10 px-2 py-0.5 rounded">
                {data.subject.code}
              </span>
              <h2 className="text-xl font-extrabold text-[#172033] tracking-tight">
                {data.subject.name}
              </h2>
              <StatusLabel status={data.metrics.status} size="sm" />
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Cohort: {data.batch.name} &bull; Department: {data.subject.department} &bull; Target Finish: {data.metricsTraceability.targetFinishDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16836B]/10 text-[#16836B] font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {data.queryExecutionMs}ms latency
          </span>

          {onOpenQuickLog && (
            <Button variant="primary" size="sm" onClick={onOpenQuickLog}>
              <Clock className="h-4 w-4 mr-1.5" />
              Log Session (&lt;60s)
            </Button>
          )}
        </div>
      </div>

      {/* 4 Core Metric Cards with Metric Explanation Tooltips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Syllabus Coverage */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Syllabus Coverage
            </span>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip("coverage")}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {activeTooltip === "coverage" && (
                <div className="absolute right-0 top-5 z-20 w-64 p-2 text-[11px] bg-[#172033] text-white rounded shadow-lg pointer-events-none">
                  Covered Hours / Hours in Scope × 100. Completed topics contribute 100%, in-progress topics contribute weighted by completion percentage.
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
                {data.metrics.coveragePercentage}%
              </span>
              <span className="text-xs text-[#64748B]">
                ({data.metrics.coveredHours} / {data.metrics.totalHoursInScope}h)
              </span>
            </div>
          </div>
          <Progress value={data.metrics.coveragePercentage} size="sm" variant="brand" />
          <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            <span>In Scope: {data.metrics.totalHoursInScope}h</span>
            <span>Remaining: {data.metrics.remainingHours}h</span>
          </div>
        </div>

        {/* Card 2: Buffer Ratio */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Buffer Ratio
            </span>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip("buffer")}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {activeTooltip === "buffer" && (
                <div className="absolute right-0 top-5 z-20 w-64 p-2 text-[11px] bg-[#172033] text-white rounded shadow-lg pointer-events-none">
                  Available teaching hours / Remaining hours needed. ≥1.15 is On Track, 1.00-1.14 is Tight, &lt;1.00 is Danger.
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
                {data.metrics.bufferRatio}x
              </span>
              <StatusLabel status={data.metrics.status} size="sm" showDot={false} />
            </div>
          </div>
          <Progress
            value={Math.min(100, (data.metrics.bufferRatio / 1.5) * 100)}
            size="sm"
            variant={
              data.metrics.status === "DANGER"
                ? "danger"
                : data.metrics.status === "TIGHT"
                ? "warning"
                : "success"
            }
          />
          <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            <span>Available: {data.metrics.availableHoursTillDeadline}h</span>
            <span>Needed: {data.metrics.remainingHours}h</span>
          </div>
        </div>

        {/* Card 3: Pace vs Plan */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Pace vs Plan
            </span>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip("pace")}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {activeTooltip === "pace" && (
                <div className="absolute right-0 top-5 z-20 w-64 p-2 text-[11px] bg-[#172033] text-white rounded shadow-lg pointer-events-none">
                  Covered hours − Planned hours that should have been covered by today. Negative indicates the subject is behind instructional calendar schedule.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                data.metrics.paceVsPlanHours < 0
                  ? "text-[#C84B58]"
                  : data.metrics.paceVsPlanHours > 0
                  ? "text-[#16836B]"
                  : "text-[#172033]"
              }`}
            >
              {data.metrics.paceVsPlanHours > 0
                ? `+${data.metrics.paceVsPlanHours}`
                : data.metrics.paceVsPlanHours}
              h
            </span>
            <span className="text-xs text-[#64748B]">
              {data.metrics.paceVsPlanHours < 0
                ? "Behind schedule"
                : data.metrics.paceVsPlanHours > 0
                ? "Ahead of plan"
                : "On exact plan"}
            </span>
          </div>
          <Progress
            value={Math.min(
              100,
              Math.max(
                0,
                50 + (data.metrics.paceVsPlanHours / data.metrics.totalHoursInScope) * 100
              )
            )}
            size="sm"
            variant={data.metrics.paceVsPlanHours < 0 ? "danger" : "brand"}
          />
          <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            <span>Expected by today:</span>
            <span className="font-semibold text-[#172033]">
              {data.expectedPace.expectedHoursByToday}h
            </span>
          </div>
        </div>

        {/* Card 4: Overdue Topics & Scope */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Topic Health
            </span>
            <Clock className="h-4 w-4 text-[#8878F5]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                data.metricsTraceability.overdueTopics.length > 0
                  ? "text-[#C84B58]"
                  : "text-[#16836B]"
              }`}
            >
              {data.metricsTraceability.overdueTopics.length}
            </span>
            <span className="text-xs text-[#64748B]">overdue topics</span>
          </div>
          <div className="text-xs text-[#64748B] space-y-1">
            <div className="flex justify-between">
              <span>Completed topics:</span>
              <span className="font-semibold text-[#172033]">
                {data.metricsTraceability.completedTopics} / {data.metricsTraceability.inScopeTopics}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Skipped (out of scope):</span>
              <span className="font-semibold text-[#64748B]">
                {data.metricsTraceability.skippedTopics}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            <span>Available occurrences:</span>
            <span className="font-semibold text-[#172033]">
              {data.metricsTraceability.availableOccurrencesCount} sessions
            </span>
          </div>
        </div>
      </div>

      {/* Signature Visual Element: Polished Expected vs Actual Pace Indicator */}
      <PaceIndicator
        coveredHours={data.expectedPace.coveredHours}
        expectedHoursByToday={data.expectedPace.expectedHoursByToday}
        totalPlannedHours={data.expectedPace.totalPlannedHours}
        status={data.expectedPace.status}
        targetFinishDate={data.metricsTraceability.targetFinishDate}
      />

      {/* Navigation Tabs for Deep Inspection */}
      <div className="border-b border-[#E6EAF2] flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-2.5 px-1 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "timeline"
              ? "border-[#4965E8] text-[#4965E8]"
              : "border-transparent text-[#64748B] hover:text-[#172033]"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Topic-by-Topic Progression Timeline ({data.topicTimeline.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-2.5 px-1 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "logs"
              ? "border-[#4965E8] text-[#4965E8]"
              : "border-transparent text-[#64748B] hover:text-[#172033]"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Recent Verified Session Logs ({data.recentSessionLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("exams")}
          className={`pb-2.5 px-1 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === "exams"
              ? "border-[#4965E8] text-[#4965E8]"
              : "border-transparent text-[#64748B] hover:text-[#172033]"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Exam Scopes &amp; Feasibility ({data.examReadiness.length})</span>
        </button>
      </div>

      {/* TAB 1: Topic-by-Topic Timeline */}
      {activeTab === "timeline" && (
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[#172033]">
                Syllabus Topics Chronological Sequence
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                Every percentage is weighted by planned hours. Expected dates recalculate dynamically when holidays are added.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seq</TableHead>
                  <TableHead>Topic Title</TableHead>
                  <TableHead>Planned Hrs</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Exam Scope</TableHead>
                  <TableHead>Status &amp; Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topicTimeline.map((t) => (
                  <TableRow key={t.id} className={t.isOverdue ? "bg-[#C84B58]/5" : ""}>
                    <TableCell className="font-mono font-bold text-[#64748B]">
                      #{t.sequenceOrder}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#172033]">{t.title}</span>
                        {t.isOverdue && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#C84B58]/10 text-[#C84B58] flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" /> OVERDUE
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{t.plannedHours}h</TableCell>
                    <TableCell className="font-mono text-[#64748B] text-xs">
                      {t.plannedDate || "Dynamic"}
                    </TableCell>
                    <TableCell className="font-mono text-[#16836B] text-xs">
                      {t.actualCompletedDate || "&mdash;"}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-[#8878F5] bg-[#8878F5]/10 px-1.5 py-0.5 rounded">
                        {t.examScopes.join(", ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-16">
                          {t.status === "COMPLETED"
                            ? "100%"
                            : t.status === "SKIPPED"
                            ? "Skipped"
                            : `${t.percentComplete}%`}
                        </span>
                        <Progress
                          value={
                            t.status === "COMPLETED"
                              ? 100
                              : t.status === "SKIPPED"
                              ? 0
                              : t.percentComplete
                          }
                          size="sm"
                          variant={
                            t.status === "COMPLETED"
                              ? "success"
                              : t.isOverdue
                              ? "danger"
                              : "brand"
                          }
                          className="w-20 hidden sm:block"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 2: Recent Session Logs */}
      {activeTab === "logs" && (
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[#172033]">
                Teaching Audit Trail &amp; Class Logs
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                Verified delivery records logged by teaching faculty with duration, notes, and homework status.
              </p>
            </div>
          </div>

          {data.recentSessionLogs.length === 0 ? (
            <p className="text-xs text-[#64748B] py-6 text-center">
              No session logs recorded yet for this subject.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time &amp; Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Covered Topics / Summary</TableHead>
                    <TableHead>Work Assigned</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSessionLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono font-bold text-xs">
                        {log.sessionDate}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.actualStartTime.slice(0, 5)} - {log.actualEndTime.slice(0, 5)} (
                        {log.durationMinutes}m)
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#16836B]/10 text-[#16836B]">
                          {log.deliveryStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#172033] max-w-xs">
                        {log.coveredSummary || "Syllabus topics delivered as planned."}
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        Classwork: {log.classworkStatus} &bull; HW: {log.homeworkStatus}
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B] max-w-xs italic">
                        {log.notes || "&mdash;"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Exam Readiness */}
      {activeTab === "exams" && (
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-[#172033]">
                Milestone Exam Feasibility &amp; Scopes
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                Topics are evaluated independently within each exam milestone scope.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.examReadiness.map((exam) => (
              <div
                key={exam.examType}
                className="p-4 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2] space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-[#8878F5] uppercase bg-[#8878F5]/10 px-1.5 py-0.5 rounded">
                    {exam.examType}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B]">{exam.examDate}</span>
                </div>
                <h5 className="font-bold text-sm text-[#172033] line-clamp-1">{exam.examName}</h5>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-2xl font-extrabold text-[#172033]">
                    {exam.readinessPercentage}%
                  </span>
                  <span className="text-[#64748B]">
                    {exam.coveredInScopeHours}/{exam.totalInScopeHours}h
                  </span>
                </div>
                <Progress
                  value={exam.readinessPercentage}
                  size="sm"
                  variant={
                    exam.readinessStatus === "READY"
                      ? "success"
                      : exam.readinessStatus === "ON_TRACK"
                      ? "brand"
                      : "danger"
                  }
                />
                <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2] space-y-1">
                  <div className="flex justify-between">
                    <span>Remaining needed:</span>
                    <span className="font-semibold text-[#172033]">
                      {exam.remainingHoursNeeded}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity before exam:</span>
                    <span className="font-semibold text-[#172033]">
                      {exam.availableHoursBeforeExam ?? "&mdash;"}h
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Readiness state:</span>
                    <span
                      className={`font-bold ${
                        exam.readinessStatus === "AT_RISK"
                          ? "text-[#C84B58]"
                          : exam.readinessStatus === "READY"
                          ? "text-[#16836B]"
                          : "text-[#4965E8]"
                      }`}
                    >
                      {exam.readinessStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
