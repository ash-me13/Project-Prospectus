"use client";

import React, { useState } from "react";
import { CampusManagerDashboardData } from "@/domain/analytics-service";
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
  Building2,
  AlertTriangle,
  Clock,
  Award,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileCheck,
  ArrowRight,
  Zap,
} from "lucide-react";

interface CampusManagerDashboardProps {
  data: CampusManagerDashboardData;
  onFilterChange: (filters: { status?: string }) => void;
  onSelectSubject: (subjectId: string, batchId?: string) => void;
}

export function CampusManagerDashboard({
  data,
  onFilterChange,
  onSelectSubject,
}: CampusManagerDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    onFilterChange({ status });
  };

  // Explicit empty state if campus has no initialized data
  if (data.campusKpis.totalBatches === 0 && data.campusKpis.totalSubjects === 0) {
    return (
      <div className="card-quiet p-12 text-center space-y-4">
        <Building2 className="h-12 w-12 text-[#64748B] mx-auto opacity-50" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#172033]">
            {data.campus.name} ({data.campus.code}) &mdash; No Data Initialized
          </h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            This campus does not yet have active academic semesters, cohorts or syllabus lesson plans configured.
            An administrator can initialize terms and batches in Settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campus Context Header */}
      <div className="card-quiet p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#4965E8]/10 text-[#4965E8] flex items-center justify-center font-bold font-mono">
            {data.campus.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#172033]">{data.campus.name}</h3>
              <StatusLabel status={data.campusKpis.worstStatus} size="sm" />
            </div>
            <p className="text-xs text-[#64748B]">
              Campus Operations &bull; {data.campus.location} &bull; {data.campusKpis.totalBatches} Cohort Batches &bull; {data.campusKpis.totalSubjects} Subjects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16836B]/10 text-[#16836B] font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {data.queryExecutionMs}ms latency
          </span>

          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs bg-[#F7F8FC] border border-[#E6EAF2] rounded-md px-2.5 py-1.5 font-medium text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#4965E8]"
          >
            <option value="ALL">All Progression States</option>
            <option value="ON_TRACK">On Track</option>
            <option value="TIGHT">Tight</option>
            <option value="DANGER">Danger</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Faculty Logging Compliance
            </span>
            <FileCheck className="h-4 w-4 text-[#16836B]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#172033] tracking-tight">
              {data.facultyCompliance.compliancePercentage}%
            </span>
            <span className="text-xs text-[#64748B]">
              ({data.facultyCompliance.loggedCount}/{data.facultyCompliance.totalScheduledOccurred})
            </span>
          </div>
          <Progress value={data.facultyCompliance.compliancePercentage} size="sm" variant="success" />
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            {data.facultyCompliance.onTimePercentage}% submitted &lt;24h
          </p>
        </div>

        {/* Subjects Falling Behind */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Falling Behind
            </span>
            <AlertTriangle className="h-4 w-4 text-[#C84B58]" />
          </div>
          <div className="text-3xl font-extrabold text-[#C84B58] tracking-tight">
            {data.fallingBehindSubjects.length}
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            {data.campusKpis.dangerCount} Danger &bull; {data.campusKpis.tightCount} Tight
          </p>
        </div>

        {/* Overdue Syllabus Topics */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Overdue Topics
            </span>
            <Clock className="h-4 w-4 text-[#B87918]" />
          </div>
          <div className="text-3xl font-extrabold text-[#B87918] tracking-tight">
            {data.overdueTopics.length}
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            Target completion dates elapsed
          </p>
        </div>

        {/* Escalated Unlogged Sessions */}
        <div className="card-quiet p-5 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Escalated to You
            </span>
            <AlertCircle className="h-4 w-4 text-[#C84B58]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#C84B58] tracking-tight">
              {data.unloggedSessions.escalatedCm.length}
            </span>
            <span className="text-xs text-[#64748B]">
              (+{data.unloggedSessions.pendingFaculty.length} pending)
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E6EAF2]">
            &gt;48h unlogged session threshold
          </p>
        </div>
      </div>

      {/* Subjects Falling Behind Table */}
      <div className="card-quiet p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C84B58]" />
              <span>Campus Subjects Falling Behind Plan</span>
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              Subjects with buffer ratio &lt;1.15 or negative instructional pace.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#C84B58]/10 text-[#C84B58]">
            {data.fallingBehindSubjects.length} subjects
          </span>
        </div>

        {data.fallingBehindSubjects.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#16836B] bg-[#16836B]/5 border border-[#16836B]/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-[#16836B]" />
            No subjects currently falling behind plan in {data.campus.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Buffer Ratio</TableHead>
                  <TableHead>Pace vs Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.fallingBehindSubjects.map((s) => (
                  <TableRow key={`${s.subjectId}-${s.batchId}`}>
                    <TableCell>
                      <span className="font-mono font-bold text-[#4965E8]">{s.code}</span>
                      <p className="font-semibold text-xs text-[#172033]">{s.name}</p>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-[#172033]">{s.batchName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold">{s.coveragePercentage}%</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs">{s.bufferRatio}x</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono font-bold text-xs ${
                          s.paceVsPlanHours < 0 ? "text-[#C84B58]" : "text-[#16836B]"
                        }`}
                      >
                        {s.paceVsPlanHours > 0 ? `+${s.paceVsPlanHours}` : s.paceVsPlanHours}h
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusLabel status={s.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectSubject(s.subjectId, s.batchId)}
                      >
                        Drill Down
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

      {/* Overdue Topics & Escalated Unlogged Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Topics List */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#B87918]" />
              <span>Campus Overdue Syllabus Topics</span>
            </h4>
            <span className="text-xs text-[#64748B]">{data.overdueTopics.length} overdue</span>
          </div>

          <div className="divide-y divide-[#E6EAF2] max-h-80 overflow-y-auto">
            {data.overdueTopics.length === 0 ? (
              <p className="text-xs text-[#16836B] py-4 text-center">Zero overdue topics.</p>
            ) : (
              data.overdueTopics.map((top) => (
                <div key={top.topicId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#172033]">{top.topicTitle}</span>
                    <p className="text-[11px] text-[#64748B]">
                      {top.subjectCode} &bull; Target was {top.plannedDate} &bull; {top.plannedHours}h
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#C84B58] bg-[#C84B58]/10 px-2 py-0.5 rounded">
                    {top.percentComplete}% Done
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unlogged Sessions & Escalations */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#C84B58]" />
              <span>Unlogged Sessions &amp; Escalation State</span>
            </h4>
            <span className="text-xs text-[#64748B]">48h SLA</span>
          </div>

          <div className="divide-y divide-[#E6EAF2] max-h-80 overflow-y-auto">
            {data.unloggedSessions.escalatedCm.length === 0 &&
            data.unloggedSessions.pendingFaculty.length === 0 ? (
              <p className="text-xs text-[#16836B] py-4 text-center">
                All scheduled occurrences logged on schedule.
              </p>
            ) : (
              <>
                {/* Escalated to CM */}
                {data.unloggedSessions.escalatedCm.map((esc) => (
                  <div key={esc.sessionId} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#172033]">{esc.subjectName}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#C84B58]/10 text-[#C84B58]">
                          ESCALATED TO CM
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Faculty: {esc.facultyName} ({esc.facultyEmail}) &bull; Scheduled {esc.sessionDate}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#C84B58]">
                      +{esc.hoursOverdue}h overdue
                    </span>
                  </div>
                ))}

                {/* Pending Faculty */}
                {data.unloggedSessions.pendingFaculty.map((pen) => (
                  <div key={pen.sessionId} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#172033]">{pen.subjectName}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#B87918]/10 text-[#B87918]">
                          FACULTY REMINDER (&lt;48h)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Faculty: {pen.facultyName} &bull; Scheduled {pen.sessionDate}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#B87918]">
                      +{pen.hoursOverdue}h
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Exam Readiness Risks & Calendar Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exam Risks */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Award className="h-4 w-4 text-[#8878F5]" />
              <span>Exam Readiness Risks</span>
            </h4>
            <span className="text-xs text-[#64748B]">Capacity Feasibility</span>
          </div>

          <div className="divide-y divide-[#E6EAF2]">
            {data.examRisks.length === 0 ? (
              <p className="text-xs text-[#16836B] py-4 text-center">
                All upcoming exam scopes fit within planned teaching capacity.
              </p>
            ) : (
              data.examRisks.map((er, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#172033]">
                      {er.examName} &bull; {er.subjectCode}
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      Exam Date: {er.examDate} &bull; Remaining needed: {er.remainingNeeded}h &bull; Capacity: {er.capacityBeforeExam}h
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#C84B58] bg-[#C84B58]/10 px-2 py-0.5 rounded">
                    AT RISK ({er.readinessPercentage}%)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timetable / Calendar Conflicts */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#4965E8]" />
              <span>Timetable &amp; Calendar Exceptions</span>
            </h4>
            <span className="text-xs text-[#64748B]">Holidays &amp; Cancellations</span>
          </div>

          <div className="divide-y divide-[#E6EAF2]">
            {data.conflictsAndOverrides.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">No calendar exceptions.</p>
            ) : (
              data.conflictsAndOverrides.map((co, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#172033]">{co.title}</span>
                    <p className="text-[11px] text-[#64748B]">
                      {co.date} &bull; {co.details}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6EAF2] text-[#64748B]">
                    {co.type}
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
