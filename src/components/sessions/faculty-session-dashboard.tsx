"use client";

import React, { useState } from "react";
import {
  FacultyDashboardData,
  DbScheduledSession,
} from "@/types/database";
import { Button } from "../ui/button";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingDown,
  RefreshCw,
} from "lucide-react";

export interface FacultySessionDashboardProps {
  dashboardData: FacultyDashboardData;
  onSelectSessionToLog: (
    session: DbScheduledSession & {
      subject_name?: string;
      subject_code?: string;
      batch_name?: string;
      room?: string;
    }
  ) => void;
  onRefreshData?: () => void;
}

export function FacultySessionDashboard({
  dashboardData,
  onSelectSessionToLog,
  onRefreshData,
}: FacultySessionDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "today" | "awaiting" | "logged" | "overdue" | "attention"
  >("today");

  const {
    todaySessions,
    loggedSessions,
    awaitingLogSessions,
    overdueTopics,
    subjectsRequiringAttention,
  } = dashboardData;

  return (
    <div className="space-y-6">
      {/* 5 Core Deterministic Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Today's Sessions */}
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === "today"
              ? "border-[#4965E8] bg-white ring-2 ring-[#4965E8]/20 shadow-xs"
              : "border-[#E6EAF2] bg-white hover:border-[#4965E8]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Today&apos;s Slots
            </span>
            <Calendar className="h-4 w-4 text-[#4965E8]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#172033]">
              {todaySessions.length}
            </span>
            <span className="text-[11px] text-[#64748B]">
              ({todaySessions.filter((s) => s.is_logged).length} logged)
            </span>
          </div>
        </button>

        {/* 2. Awaiting Log (Critical Alert) */}
        <button
          type="button"
          onClick={() => setActiveTab("awaiting")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === "awaiting"
              ? "border-[#B87918] bg-[#B87918]/5 ring-2 ring-[#B87918]/20 shadow-xs"
              : awaitingLogSessions.length > 0
              ? "border-[#B87918]/40 bg-white hover:border-[#B87918]"
              : "border-[#E6EAF2] bg-white hover:border-[#B87918]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#B87918] uppercase tracking-wider">
              Awaiting Log
            </span>
            <div className="relative">
              <Clock className="h-4 w-4 text-[#B87918]" />
              {awaitingLogSessions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#B87918] animate-ping" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#B87918]">
              {awaitingLogSessions.length}
            </span>
            <span className="text-[11px] text-[#64748B]">sessions</span>
          </div>
        </button>

        {/* 3. Logged Sessions */}
        <button
          type="button"
          onClick={() => setActiveTab("logged")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === "logged"
              ? "border-[#16836B] bg-white ring-2 ring-[#16836B]/20 shadow-xs"
              : "border-[#E6EAF2] bg-white hover:border-[#16836B]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Verified Logs
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#16836B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#16836B]">
              {loggedSessions.length}
            </span>
            <span className="text-[11px] text-[#64748B]">recorded</span>
          </div>
        </button>

        {/* 4. Overdue Topics */}
        <button
          type="button"
          onClick={() => setActiveTab("overdue")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === "overdue"
              ? "border-[#C84B58] bg-[#C84B58]/5 ring-2 ring-[#C84B58]/20 shadow-xs"
              : "border-[#E6EAF2] bg-white hover:border-[#C84B58]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Overdue Topics
            </span>
            <AlertCircle className="h-4 w-4 text-[#C84B58]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#C84B58]">
              {overdueTopics.length}
            </span>
            <span className="text-[11px] text-[#64748B]">behind date</span>
          </div>
        </button>

        {/* 5. Subjects Requiring Attention */}
        <button
          type="button"
          onClick={() => setActiveTab("attention")}
          className={`col-span-2 sm:col-span-1 p-3.5 rounded-xl border text-left transition-all ${
            activeTab === "attention"
              ? "border-[#8878F5] bg-white ring-2 ring-[#8878F5]/20 shadow-xs"
              : "border-[#E6EAF2] bg-white hover:border-[#8878F5]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Subject Health
            </span>
            <TrendingDown className="h-4 w-4 text-[#8878F5]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#8878F5]">
              {subjectsRequiringAttention.length}
            </span>
            <span className="text-[11px] text-[#64748B]">cohorts</span>
          </div>
        </button>
      </div>

      {/* Dynamic Tab Content Area */}
      <div className="card-quiet p-5 space-y-4">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "today"
                  ? "bg-[#4965E8] text-white"
                  : "text-[#64748B] hover:text-[#172033] hover:bg-[#F7F8FC]"
              }`}
            >
              Today&apos;s Schedule ({todaySessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("awaiting")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "awaiting"
                  ? "bg-[#B87918] text-white"
                  : "text-[#B87918] hover:bg-[#B87918]/10"
              }`}
            >
              <span>Awaiting Log</span>
              {awaitingLogSessions.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/20 font-mono">
                  {awaitingLogSessions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("logged")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "logged"
                  ? "bg-[#16836B] text-white"
                  : "text-[#64748B] hover:text-[#172033] hover:bg-[#F7F8FC]"
              }`}
            >
              Logged Sessions ({loggedSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overdue")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "overdue"
                  ? "bg-[#C84B58] text-white"
                  : "text-[#64748B] hover:text-[#172033] hover:bg-[#F7F8FC]"
              }`}
            >
              Overdue Topics ({overdueTopics.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("attention")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "attention"
                  ? "bg-[#8878F5] text-white"
                  : "text-[#64748B] hover:text-[#172033] hover:bg-[#F7F8FC]"
              }`}
            >
              Subjects Requiring Attention ({subjectsRequiringAttention.length})
            </button>
          </div>

          {onRefreshData && (
            <button
              type="button"
              onClick={onRefreshData}
              title="Refresh Dashboard"
              className="p-1.5 rounded-lg border border-[#E6EAF2] hover:bg-[#F7F8FC] text-[#64748B] shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* TAB 1: Today's Scheduled Sessions */}
        {activeTab === "today" && (
          <div className="space-y-3">
            {todaySessions.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs space-y-1">
                <Calendar className="h-6 w-6 mx-auto text-[#64748B]/60" />
                <p className="font-medium text-[#172033]">No teaching sessions scheduled for today.</p>
                <p>Check the timetable or calendar exceptions for holiday schedules.</p>
              </div>
            ) : (
              todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    session.is_logged
                      ? "bg-[#F7F8FC]/60 border-[#E6EAF2]"
                      : "bg-white border-[#4965E8]/40 shadow-xs"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#172033]">
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </span>
                      <span className="text-[11px] text-[#64748B]">({session.duration_hours}h)</span>
                      <span className="text-[10px] font-semibold bg-[#4965E8]/10 text-[#4965E8] px-2 py-0.5 rounded">
                        {session.subject_code}
                      </span>
                      <span className="text-xs text-[#64748B]">• {session.batch_name}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#172033]">
                      {session.subject_name}
                    </div>
                    <div className="text-xs text-[#64748B] flex items-center gap-2">
                      <span>Room: <strong className="text-[#172033] font-medium">{session.room || "Lab 3"}</strong></span>
                      <span>•</span>
                      <span>Status: <strong className="font-medium">{session.occurrence_status}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {session.is_logged ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#16836B] bg-[#16836B]/10 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="h-4 w-4" />
                        Log Verified
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectSessionToLog(session)}
                        className="w-full sm:w-auto font-semibold shadow-xs"
                      >
                        <Clock className="h-4 w-4 mr-1.5" />
                        Log Session (&lt;60s)
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Sessions Awaiting a Log (Attention Backlog) */}
        {activeTab === "awaiting" && (
          <div className="space-y-3">
            {awaitingLogSessions.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs space-y-1">
                <CheckCircle2 className="h-6 w-6 mx-auto text-[#16836B]" />
                <p className="font-medium text-[#172033]">All teaching sessions are logged and up to date!</p>
                <p>No missing confirmation records found across scheduled dates.</p>
              </div>
            ) : (
              awaitingLogSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl border border-[#B87918]/40 bg-white hover:border-[#B87918] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#B87918]">
                        {session.session_date}
                      </span>
                      <span className="text-xs font-mono text-[#172033]">
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </span>
                      <span className="text-[10px] font-semibold bg-[#4965E8]/10 text-[#4965E8] px-2 py-0.5 rounded">
                        {session.subject_code}
                      </span>
                      <span className="text-xs text-[#64748B]">• {session.batch_name}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#172033]">
                      {session.subject_name}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Room: <strong className="text-[#172033] font-medium">{session.room || "Lab 3"}</strong> ({session.duration_hours}h duration)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => onSelectSessionToLog(session)}
                      className="w-full sm:w-auto font-semibold bg-[#B87918] hover:bg-[#B87918]/90"
                    >
                      <Clock className="h-4 w-4 mr-1.5" />
                      Log Overdue Slot
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Sessions Already Logged (Audit Log History) */}
        {activeTab === "logged" && (
          <div className="space-y-3">
            {loggedSessions.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs">
                No session logs recorded yet.
              </div>
            ) : (
              loggedSessions.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-[#E6EAF2] bg-[#F7F8FC]/40 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#172033]">
                        {log.session_date}
                      </span>
                      <span className="text-xs font-mono text-[#64748B]">
                        {log.actual_start_time.slice(0, 5)} - {log.actual_end_time.slice(0, 5)}
                      </span>
                      <span className="text-[10px] font-semibold bg-[#4965E8]/10 text-[#4965E8] px-2 py-0.5 rounded">
                        {log.subject_code}
                      </span>
                      <span className="text-xs text-[#64748B]">• {log.batch_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.delivery_status === "COMPLETED"
                            ? "bg-[#16836B]/15 text-[#16836B]"
                            : log.delivery_status === "IN_PROGRESS"
                            ? "bg-[#4965E8]/15 text-[#4965E8]"
                            : log.delivery_status === "MERGED"
                            ? "bg-[#8878F5]/15 text-[#8878F5]"
                            : "bg-[#B87918]/15 text-[#B87918]"
                        }`}
                      >
                        {log.delivery_status}
                      </span>
                      <span className="text-[11px] font-mono bg-white border border-[#E6EAF2] px-2 py-0.5 rounded text-[#172033]">
                        {log.duration_minutes} min ({(log.duration_minutes / 60).toFixed(2)}h)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-[#172033]">
                    {log.covered_summary || "Session delivered according to syllabus schedule."}
                  </div>

                  {log.status_reason && (
                    <div className="text-xs p-2 rounded bg-[#B87918]/10 border border-[#B87918]/20 text-[#B87918]">
                      <strong>Status Reason:</strong> {log.status_reason}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748B] pt-1 border-t border-[#E6EAF2]/60">
                    <span>
                      Classwork: <strong className="text-[#172033] font-medium">{log.classwork_status}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Homework: <strong className="text-[#172033] font-medium">{log.homework_status}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Verified: <strong className="text-[#16836B] font-medium">True</strong>
                    </span>
                    <span className="ml-auto font-mono text-[10px]">
                      ID: {log.id.slice(0, 12)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Overdue Topics */}
        {activeTab === "overdue" && (
          <div className="space-y-3">
            {overdueTopics.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs space-y-1">
                <CheckCircle2 className="h-6 w-6 mx-auto text-[#16836B]" />
                <p className="font-medium text-[#172033]">No overdue syllabus topics!</p>
                <p>Every topic scheduled to finish by today is completed on pace.</p>
              </div>
            ) : (
              overdueTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 rounded-xl border border-[#C84B58]/30 bg-[#C84B58]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#C84B58]">
                        {topic.days_overdue} days overdue
                      </span>
                      <span className="text-[10px] font-semibold bg-[#4965E8]/10 text-[#4965E8] px-2 py-0.5 rounded">
                        {topic.subject_code}
                      </span>
                      <span className="text-xs text-[#64748B]">Planned Target: {topic.planned_date}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#172033]">
                      #{topic.sequence_order}: {topic.title}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Planned Hours: {topic.planned_hours}h • Current Status: <strong>{topic.status} ({topic.percent_complete}%)</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#C84B58] font-semibold">
                      Requires Next Class Delivery
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: Subjects Requiring Attention */}
        {activeTab === "attention" && (
          <div className="space-y-3">
            {subjectsRequiringAttention.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs space-y-1">
                <CheckCircle2 className="h-6 w-6 mx-auto text-[#16836B]" />
                <p className="font-medium text-[#172033]">All assigned subjects are healthy and on track!</p>
              </div>
            ) : (
              subjectsRequiringAttention.map((subj) => (
                <div
                  key={subj.subject_id}
                  className="p-4 rounded-xl border border-[#E6EAF2] bg-white space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#4965E8] font-mono">
                          {subj.subject_code}
                        </span>
                        <span className="text-xs text-[#64748B]">• {subj.batch_name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            subj.pace_status === "AT_RISK"
                              ? "bg-[#C84B58]/15 text-[#C84B58]"
                              : "bg-[#B87918]/15 text-[#B87918]"
                          }`}
                        >
                          {subj.pace_status === "AT_RISK" ? "CRITICAL RISK" : "BEHIND PACE"}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-[#172033] mt-0.5">
                        {subj.subject_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono text-[#172033]">
                        {subj.completion_percentage}%
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {subj.delivered_hours}h / {subj.planned_hours}h
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-[#E6EAF2] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        subj.pace_status === "AT_RISK" ? "bg-[#C84B58]" : "bg-[#B87918]"
                      }`}
                      style={{ width: `${Math.min(100, subj.completion_percentage)}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                    <span>
                      Overdue topics: <strong className="text-[#C84B58]">{subj.overdue_topic_count}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Unlogged slots: <strong className="text-[#B87918]">{subj.unlogged_session_count}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
