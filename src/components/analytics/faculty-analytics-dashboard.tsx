"use client";

import React from "react";
import { FacultyAnalyticsData } from "@/domain/analytics-service";
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
  Clock,
  BookOpen,
  AlertTriangle,
  Award,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Zap,
} from "lucide-react";

interface FacultyAnalyticsDashboardProps {
  data: FacultyAnalyticsData;
  onOpenQuickLog: (sessionId?: string) => void;
  onSelectSubject: (subjectId: string, batchId?: string) => void;
}

export function FacultyAnalyticsDashboard({
  data,
  onOpenQuickLog,
  onSelectSubject,
}: FacultyAnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Faculty Greeting & Schedule Context */}
      <div className="card-quiet p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#4965E8]/10 text-[#4965E8] flex items-center justify-center font-bold">
            {data.facultyProfile.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#172033]">
                Welcome back, {data.facultyProfile.name}
              </h3>
            </div>
            <p className="text-xs text-[#64748B]">
              Teaching Portfolio &bull; {data.subjectProgress.length} Assigned Subjects &bull; {data.todaySchedule.length} Sessions Scheduled Today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16836B]/10 text-[#16836B] font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {data.queryExecutionMs}ms latency
          </span>

          <Button variant="primary" size="sm" onClick={() => onOpenQuickLog()}>
            <Clock className="h-4 w-4 mr-1.5" />
            Log Session (&lt;60s)
          </Button>
        </div>
      </div>

      {/* Today's Schedule & Outstanding Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#4965E8]" />
              <span>Today&apos;s Teaching Schedule</span>
            </h4>
            <span className="text-xs text-[#64748B]">
              {data.todaySchedule.length} session(s)
            </span>
          </div>

          <div className="space-y-3">
            {data.todaySchedule.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">
                No teaching sessions scheduled for today.
              </p>
            ) : (
              data.todaySchedule.map((s) => (
                <div
                  key={s.sessionId}
                  className="p-3.5 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#4965E8]">
                        {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
                      </span>
                      <span className="text-xs font-bold text-[#172033]">
                        {s.subjectCode} ({s.batchName})
                      </span>
                      <span className="text-[10px] text-[#64748B] bg-[#E6EAF2] px-1.5 py-0.2 rounded font-mono">
                        {s.room}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                      {s.nextTopicTitle
                        ? `Target: ${s.nextTopicTitle}`
                        : "Syllabus sequence on track"}
                    </p>
                  </div>

                  <div>
                    {s.isLogged ? (
                      <span className="text-xs font-semibold text-[#16836B] flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Logged
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenQuickLog(s.sessionId)}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Log (&lt;60s)
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outstanding Logs Requiring Attention */}
        <div className="card-quiet p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C84B58]" />
              <span>Outstanding Logs Awaiting Confirmation</span>
            </h4>
            <span className="text-xs text-[#64748B]">
              {data.outstandingLogs.length} unconfirmed
            </span>
          </div>

          <div className="space-y-3">
            {data.outstandingLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#16836B] bg-[#16836B]/5 border border-[#16836B]/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-[#16836B]" />
                All past delivered sessions are confirmed and logged!
              </div>
            ) : (
              data.outstandingLogs.map((ol) => (
                <div
                  key={ol.sessionId}
                  className="p-3.5 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#172033]">
                        {ol.subjectCode} &bull; {ol.batchName}
                      </span>
                      {ol.isEscalated ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#C84B58]/10 text-[#C84B58]">
                          ESCALATED TO CM
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#B87918]/10 text-[#B87918]">
                          AWAITING LOG
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Date: {ol.sessionDate} &bull; +{ol.hoursOverdue}h delay
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenQuickLog(ol.sessionId)}
                  >
                    Confirm Now
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coverage Against Plan (Assigned Subjects) */}
      <div className="card-quiet p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#4965E8]" />
              <span>Assigned Subjects Progression &amp; Pace</span>
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live curriculum metrics computed from canonical lesson plans and verified logs.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#4965E8]/10 text-[#4965E8]">
            {data.subjectProgress.length} subjects
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code &amp; Subject</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Curriculum Coverage</TableHead>
                <TableHead>Buffer Ratio</TableHead>
                <TableHead>Pace vs Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subjectProgress.map((sp) => (
                <TableRow key={`${sp.subjectId}-${sp.batchId}`}>
                  <TableCell>
                    <span className="font-mono font-bold text-[#4965E8]">{sp.code}</span>
                    <p className="font-semibold text-xs text-[#172033]">{sp.name}</p>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-[#172033]">{sp.batchName}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono font-bold">{sp.coveragePercentage}%</span>
                        <span className="text-[11px] text-[#64748B]">
                          {sp.coveredHours}h / {sp.totalHoursInScope}h
                        </span>
                      </div>
                      <Progress value={sp.coveragePercentage} size="sm" variant="brand" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-xs">{sp.bufferRatio}x</span>
                    <p className="text-[10px] text-[#64748B]">
                      {sp.availableHours}h avail / {sp.remainingHours}h need
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono font-bold text-xs ${
                        sp.paceVsPlanHours < 0 ? "text-[#C84B58]" : "text-[#16836B]"
                      }`}
                    >
                      {sp.paceVsPlanHours > 0 ? `+${sp.paceVsPlanHours}` : sp.paceVsPlanHours}h
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusLabel status={sp.status} size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectSubject(sp.subjectId, sp.batchId)}
                    >
                      Detail
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Overdue Topics & Next Planned Topics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Topics */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C84B58]" />
              <span>Overdue Topics in Your Subjects</span>
            </h4>
            <span className="text-xs text-[#64748B]">{data.overdueTopics.length} overdue</span>
          </div>

          <div className="divide-y divide-[#E6EAF2]">
            {data.overdueTopics.length === 0 ? (
              <p className="text-xs text-[#16836B] py-4 text-center">
                All syllabus topics are delivered on or ahead of planned dates.
              </p>
            ) : (
              data.overdueTopics.map((ot) => (
                <div key={ot.topicId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#172033]">{ot.topicTitle}</span>
                    <p className="text-[11px] text-[#64748B]">
                      {ot.subjectCode} &bull; Target completion date: {ot.plannedDate} &bull; {ot.plannedHours}h
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#C84B58] bg-[#C84B58]/10 px-2 py-0.5 rounded">
                    {ot.percentComplete}% Done
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Next Planned Topics */}
        <div className="card-quiet p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Award className="h-4 w-4 text-[#8878F5]" />
              <span>Upcoming Exam Readiness</span>
            </h4>
            <span className="text-xs text-[#64748B]">Your Subjects</span>
          </div>

          <div className="divide-y divide-[#E6EAF2]">
            {data.examReadiness.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">No upcoming exam windows mapped.</p>
            ) : (
              data.examReadiness.map((er, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#172033]">
                      {er.examName} ({er.subjectCode})
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      Exam Date: {er.examDate} &bull; Hours needed: {er.remainingHoursNeeded}h
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#172033]">
                      {er.readinessPercentage}%
                    </span>
                    <p
                      className={`text-[10px] font-bold ${
                        er.readinessStatus === "AT_RISK"
                          ? "text-[#C84B58]"
                          : er.readinessStatus === "READY"
                          ? "text-[#16836B]"
                          : "text-[#4965E8]"
                      }`}
                    >
                      {er.readinessStatus}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
