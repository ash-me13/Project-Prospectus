"use client";

import React, { useState } from "react";
import { AdminExecutiveDashboardData } from "@/domain/analytics-service";
import { StatusLabel } from "@/components/ui/status-label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Layers,
  BookOpen,
  Users,
  AlertTriangle,
  Clock,
  Award,
  Building2,
  Filter,
  ArrowRight,
  Info,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface AdminExecutiveDashboardProps {
  data: AdminExecutiveDashboardData;
  onFilterChange: (filters: {
    campusId: string;
    trackId: string;
    status: string;
  }) => void;
  onSelectSubject: (subjectId: string, batchId?: string) => void;
  onOpenQuickLog?: () => void;
}

export function AdminExecutiveDashboard({
  data,
  onFilterChange,
  onSelectSubject,
}: AdminExecutiveDashboardProps) {
  const [selectedCampus, setSelectedCampus] = useState<string>(data.filters.campusId);
  const [selectedTrack, setSelectedTrack] = useState<string>(data.filters.trackId);
  const [selectedStatus, setSelectedStatus] = useState<string>(data.filters.status);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleApplyFilter = (campus: string, track: string, status: string) => {
    setSelectedCampus(campus);
    setSelectedTrack(track);
    setSelectedStatus(status);
    onFilterChange({ campusId: campus, trackId: track, status });
  };

  return (
    <div className="space-y-6">
      {/* Contextual Filter Bar (Usable on Mobile) */}
      <div className="card-quiet p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#4965E8]" />
          <span className="text-xs font-bold text-[#172033] uppercase tracking-wider">
            Executive Analytics Scope
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16836B]/10 text-[#16836B] font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {data.queryExecutionMs}ms latency (Target: &lt;2000ms)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
          {/* Campus Selector */}
          <select
            value={selectedCampus}
            onChange={(e) => {
              const val = e.target.value;
              handleApplyFilter(val, selectedTrack, selectedStatus);
            }}
            className="text-xs bg-[#F7F8FC] border border-[#E6EAF2] rounded-md px-2.5 py-1.5 font-medium text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#4965E8]"
          >
            <option value="ALL">All Campuses</option>
            {data.campusComparisons.map((c) => (
              <option key={c.campusId} value={c.campusId}>
                {c.campusName} ({c.campusCode})
              </option>
            ))}
          </select>

          {/* Track Selector */}
          <select
            value={selectedTrack}
            onChange={(e) => {
              const val = e.target.value;
              handleApplyFilter(selectedCampus, val, selectedStatus);
            }}
            className="text-xs bg-[#F7F8FC] border border-[#E6EAF2] rounded-md px-2.5 py-1.5 font-medium text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#4965E8]"
          >
            <option value="ALL">All Academic Tracks</option>
            {data.trackComparisons.map((t) => (
              <option key={t.trackId} value={t.trackId}>
                {t.trackName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              const val = e.target.value;
              handleApplyFilter(selectedCampus, selectedTrack, val);
            }}
            className="text-xs bg-[#F7F8FC] border border-[#E6EAF2] rounded-md px-2.5 py-1.5 font-medium text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#4965E8]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ON_TRACK">ON TRACK (Buffer ≥1.15)</option>
            <option value="TIGHT">TIGHT (Buffer 1.00 - 1.14)</option>
            <option value="DANGER">DANGER (Buffer &lt;1.00)</option>
            <option value="COMPLETE">COMPLETE (100% Done)</option>
          </select>
        </div>
      </div>

      {/* High-Level Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Worst Campus Status (Worst Status Principle) */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Overall Status
            </span>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip("worst_status")}
                onMouseLeave={() => setShowTooltip(null)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {showTooltip === "worst_status" && (
                <div className="absolute right-0 top-5 z-20 w-56 p-2 text-[11px] bg-[#172033] text-white rounded shadow-lg pointer-events-none">
                  Reflects the worst applicable subject status without averaging. If any subject is in Danger, the rollup is Danger.
                </div>
              )}
            </div>
          </div>
          <div className="pt-1">
            <StatusLabel status={data.kpis.worstCampusStatus} size="md" />
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            Worst Status Rollup Rule
          </p>
        </div>

        {/* KPI 2: Total Subjects */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total Subjects
            </span>
            <BookOpen className="h-4 w-4 text-[#4965E8]" />
          </div>
          <div className="text-3xl font-extrabold text-[#172033] tracking-tight">
            {data.kpis.totalSubjects}
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            Across {data.kpis.totalBatches} cohorts
          </p>
        </div>

        {/* KPI 3: Cohort Batches & Enrolled Students */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Enrolled Students
            </span>
            <Users className="h-4 w-4 text-[#8878F5]" />
          </div>
          <div className="text-3xl font-extrabold text-[#172033] tracking-tight">
            {data.kpis.totalStudents}
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            {data.kpis.totalBatches} active cohort batches
          </p>
        </div>

        {/* KPI 4: Curriculum Delivery Hours */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Covered Hours
            </span>
            <Clock className="h-4 w-4 text-[#16836B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
              {data.kpis.coveredHoursTotal}h
            </span>
            <span className="text-xs text-[#64748B]">/ {data.kpis.hoursInScopeTotal}h</span>
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            {data.kpis.averageCoveragePercentage}% mean completion
          </p>
        </div>

        {/* KPI 5: Pending & Escalated Logs */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Missing Logs
            </span>
            <AlertTriangle className="h-4 w-4 text-[#C84B58]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#C84B58] tracking-tight">
              {data.missingLogs.escalatedCmCount + data.missingLogs.pendingFacultyCount}
            </span>
            <span className="text-xs text-[#64748B]">
              ({data.missingLogs.escalatedCmCount} Escalated)
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            {data.missingLogs.pendingFacultyCount} pending faculty &lt;48h
          </p>
        </div>
      </div>

      {/* Progression Status Breakdown Bar */}
      <div className="card-quiet p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#4965E8]" />
            <span>Curriculum Progression Health Distribution</span>
          </h4>
          <span className="text-xs text-[#64748B]">
            {data.kpis.totalSubjects} total subjects categorized by buffer ratio
          </span>
        </div>

        {/* Distribution Progress Bar */}
        <div className="w-full h-3 rounded-full bg-[#E6EAF2] flex overflow-hidden">
          {data.kpis.totalSubjects > 0 && (
            <>
              <div
                style={{ width: `${(data.statusCounts.ON_TRACK / data.kpis.totalSubjects) * 100}%` }}
                className="bg-[#16836B] transition-all duration-300"
                title={`On Track: ${data.statusCounts.ON_TRACK}`}
              />
              <div
                style={{ width: `${(data.statusCounts.TIGHT / data.kpis.totalSubjects) * 100}%` }}
                className="bg-[#B87918] transition-all duration-300"
                title={`Tight: ${data.statusCounts.TIGHT}`}
              />
              <div
                style={{ width: `${(data.statusCounts.DANGER / data.kpis.totalSubjects) * 100}%` }}
                className="bg-[#C84B58] transition-all duration-300"
                title={`Danger: ${data.statusCounts.DANGER}`}
              />
              <div
                style={{ width: `${(data.statusCounts.COMPLETE / data.kpis.totalSubjects) * 100}%` }}
                className="bg-[#4965E8] transition-all duration-300"
                title={`Complete: ${data.statusCounts.COMPLETE}`}
              />
            </>
          )}
        </div>

        {/* Status Category Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-[#16836B]/5 border border-[#16836B]/20">
            <span className="flex items-center gap-1.5 font-medium text-[#16836B]">
              <span className="h-2 w-2 rounded-full bg-[#16836B]" /> ON TRACK (≥1.15)
            </span>
            <span className="font-bold text-[#172033]">{data.statusCounts.ON_TRACK}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#B87918]/5 border border-[#B87918]/20">
            <span className="flex items-center gap-1.5 font-medium text-[#B87918]">
              <span className="h-2 w-2 rounded-full bg-[#B87918]" /> TIGHT (1.00-1.14)
            </span>
            <span className="font-bold text-[#172033]">{data.statusCounts.TIGHT}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#C84B58]/5 border border-[#C84B58]/20">
            <span className="flex items-center gap-1.5 font-medium text-[#C84B58]">
              <span className="h-2 w-2 rounded-full bg-[#C84B58]" /> DANGER (&lt;1.00)
            </span>
            <span className="font-bold text-[#172033]">{data.statusCounts.DANGER}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#4965E8]/5 border border-[#4965E8]/20">
            <span className="flex items-center gap-1.5 font-medium text-[#4965E8]">
              <span className="h-2 w-2 rounded-full bg-[#4965E8]" /> COMPLETE
            </span>
            <span className="font-bold text-[#172033]">{data.statusCounts.COMPLETE}</span>
          </div>
        </div>
      </div>

      {/* Campus-Wise & Track-Wise Comparisons (Worst Status Principle) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campus Comparisons */}
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#4965E8]" />
              <span>Campus Comparative Analytics</span>
            </h4>
            <span className="text-[11px] text-[#64748B]">Worst Status Principle</span>
          </div>

          <div className="divide-y divide-[#E6EAF2]">
            {data.campusComparisons.map((c) => (
              <div key={c.campusId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172033]">{c.campusName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E6EAF2] text-[#64748B]">
                      {c.campusCode}
                    </span>
                  </div>
                  {c.hasActiveBatches ? (
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {c.totalSubjects} subjects &bull; {c.averageCoveragePercentage}% mean coverage
                    </p>
                  ) : (
                    <p className="text-xs text-[#B87918] italic mt-0.5">
                      No cohort batches initialized yet (Empty State)
                    </p>
                  )}
                </div>

                <div className="text-right flex items-center gap-3">
                  {c.hasActiveBatches ? (
                    <StatusLabel status={c.worstStatus} size="sm" />
                  ) : (
                    <span className="text-xs font-medium text-[#64748B]">UNCONFIGURED</span>
                  )}
                  <button
                    onClick={() => handleApplyFilter(c.campusId, selectedTrack, selectedStatus)}
                    className="text-xs text-[#4965E8] hover:underline font-semibold"
                  >
                    Filter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Track Comparisons */}
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#8878F5]" />
              <span>Academic Track Rollups</span>
            </h4>
            <span className="text-[11px] text-[#64748B]">Mirai vs University</span>
          </div>

          <div className="space-y-4">
            {data.trackComparisons.map((tr) => (
              <div key={tr.trackId} className="p-4 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-[#172033]">{tr.trackName}</span>
                  <StatusLabel status={tr.worstStatus} size="sm" />
                </div>
                <div className="flex justify-between text-xs text-[#64748B]">
                  <span>{tr.totalSubjects} Subjects Enrolled</span>
                  <span>{tr.averageCoveragePercentage}% Average Coverage</span>
                </div>
                <Progress value={tr.averageCoveragePercentage} size="sm" variant="brand" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subjects at Immediate Risk Feed */}
      <div className="card-quiet p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C84B58]" />
              <span>Subjects Requiring Immediate Executive Intervention</span>
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              Subjects with buffer ratio &lt;1.15, negative pace against plan, or overdue topics.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#C84B58]/10 text-[#C84B58]">
            {data.immediateRisks.length} at risk
          </span>
        </div>

        {data.immediateRisks.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#16836B] bg-[#16836B]/5 border border-[#16836B]/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
            All subjects across selected scope are operating on or ahead of instructional schedule!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code &amp; Subject</TableHead>
                  <TableHead>Cohort / Campus</TableHead>
                  <TableHead>Buffer Ratio</TableHead>
                  <TableHead>Pace vs Plan</TableHead>
                  <TableHead>Overdue Topics</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.immediateRisks.map((risk) => (
                  <TableRow key={`${risk.subjectId}-${risk.batchId}`}>
                    <TableCell>
                      <div>
                        <span className="font-mono font-bold text-[#4965E8]">{risk.subjectCode}</span>
                        <p className="font-semibold text-xs text-[#172033]">{risk.subjectName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-[#172033]">{risk.batchName}</span>
                      <p className="text-[11px] text-[#64748B]">{risk.campusName}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs">{risk.bufferRatio}x</span>
                      <p className="text-[10px] text-[#64748B]">
                        {risk.availableHours}h avail / {risk.remainingHours}h need
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono font-bold text-xs ${
                          risk.paceVsPlanHours < 0 ? "text-[#C84B58]" : "text-[#16836B]"
                        }`}
                      >
                        {risk.paceVsPlanHours > 0 ? `+${risk.paceVsPlanHours}` : risk.paceVsPlanHours}h
                      </span>
                    </TableCell>
                    <TableCell>
                      {risk.overdueTopicsCount > 0 ? (
                        <span className="text-xs font-bold text-[#C84B58] bg-[#C84B58]/10 px-2 py-0.5 rounded">
                          {risk.overdueTopicsCount} Overdue
                        </span>
                      ) : (
                        <span className="text-xs text-[#64748B]">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusLabel status={risk.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectSubject(risk.subjectId, risk.batchId)}
                      >
                        Inspect
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Upcoming Exam Readiness & Capacity */}
      <div className="card-quiet p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <Award className="h-4 w-4 text-[#8878F5]" />
            <span>Upcoming Exam Windows &amp; Capacity Feasibility</span>
          </h4>
          <span className="text-xs text-[#64748B]">Independent scope per milestone</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.upcomingExams.map((exam) => (
            <div key={exam.examId} className="p-4 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2] space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-[#8878F5] uppercase bg-[#8878F5]/10 px-1.5 py-0.5 rounded">
                  {exam.examType}
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">{exam.startDate}</span>
              </div>
              <h5 className="font-bold text-sm text-[#172033] line-clamp-1">{exam.name}</h5>
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
              <div className="flex justify-between text-[11px] text-[#64748B] pt-1">
                <span>Hours needed: {exam.remainingHoursNeeded}h</span>
                <span
                  className={`font-semibold ${
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
          ))}
        </div>
      </div>

      {/* Recent Activity & Missing Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Session Logs */}
        <div className="card-quiet p-5 space-y-3">
          <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#4965E8]" />
            <span>Recent Class-Log Activity</span>
          </h4>

          <div className="divide-y divide-[#E6EAF2] max-h-80 overflow-y-auto">
            {data.recentActivity.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">No session logs recorded yet.</p>
            ) : (
              data.recentActivity.map((act) => (
                <div key={act.logId} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#172033]">
                      {act.subjectCode} &bull; {act.batchName}
                    </span>
                    <span className="font-mono text-[#64748B]">{act.sessionDate}</span>
                  </div>
                  <p className="text-xs text-[#64748B] line-clamp-1">
                    {act.coveredSummary || "Delivered planned curriculum syllabus sequence."}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                    <span>By {act.facultyName}</span>
                    <span>&bull;</span>
                    <span>{act.durationMinutes} mins</span>
                    <span>&bull;</span>
                    <span className="font-semibold text-[#16836B]">{act.deliveryStatus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Missing Session Logs & Escalation Tracker */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C84B58]" />
              <span>Missing Session Logs Escalations</span>
            </h4>
            <span className="text-[11px] text-[#64748B]">24h / 48h SLA</span>
          </div>

          <div className="divide-y divide-[#E6EAF2] max-h-80 overflow-y-auto">
            {data.missingLogs.alerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#16836B]">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-[#16836B]" />
                100% logging compliance. Zero sessions awaiting logs.
              </div>
            ) : (
              data.missingLogs.alerts.map((al) => (
                <div key={al.sessionId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#172033]">{al.subjectName}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          al.escalatedToCampusManager
                            ? "bg-[#C84B58]/10 text-[#C84B58]"
                            : "bg-[#B87918]/10 text-[#B87918]"
                        }`}
                      >
                        {al.escalatedToCampusManager ? "ESCALATED TO CM" : "FACULTY REMINDER"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Faculty: {al.facultyName} &bull; Scheduled {al.scheduledDateIso}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#C84B58]">
                    +{al.hoursOverdue}h delay
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
