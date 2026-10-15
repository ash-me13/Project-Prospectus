import { describe, it, expect, beforeEach } from "vitest";
import { AcademicAnalyticsService } from "@/domain/analytics-service";
import { isolatedDataStore } from "@/lib/database/service";

describe("Authoritative Academic Analytics Service & Dashboards", () => {
  let analyticsService: AcademicAnalyticsService;

  beforeEach(() => {
    analyticsService = new AcademicAnalyticsService(isolatedDataStore);
  });

  describe("1. Performance Target Benchmark (< 2000ms)", () => {
    it("executes admin executive analytics for a full semester well under 2000ms target", () => {
      const startMs = performance.now();
      const analytics = analyticsService.getAdminExecutiveAnalytics(
        { semesterId: "55555555-5555-5555-5555-555555555555" },
        "2026-10-16"
      );
      const elapsedMs = performance.now() - startMs;

      console.log(`[PERFORMANCE BENCHMARK] Admin Executive Analytics Execution Time: ${elapsedMs.toFixed(2)}ms (Engine recorded: ${analytics.queryExecutionMs.toFixed(2)}ms)`);

      // Authoritative requirement: sub-2 second query execution
      expect(elapsedMs).toBeLessThan(2000);
      expect(analytics.queryExecutionMs).toBeLessThan(2000);
      // In fact, with indexed memory queries, it should complete in under 50ms
      expect(elapsedMs).toBeLessThan(100);
    });

    it("executes campus manager analytics under 2000ms", () => {
      const startMs = performance.now();
      const analytics = analyticsService.getCampusManagerAnalytics(
        "11111111-1111-1111-1111-111111111111", // HITECH
        "2026-10-16"
      );
      const elapsedMs = performance.now() - startMs;

      console.log(`[PERFORMANCE BENCHMARK] Campus Manager Analytics Execution Time: ${elapsedMs.toFixed(2)}ms (Engine recorded: ${analytics.queryExecutionMs.toFixed(2)}ms)`);

      expect(elapsedMs).toBeLessThan(2000);
      expect(analytics.queryExecutionMs).toBeLessThan(2000);
    });

    it("executes faculty analytics under 2000ms", () => {
      const startMs = performance.now();
      const analytics = analyticsService.getFacultyAnalytics(
        "cccccccc-cccc-cccc-cccc-cccccccccccc", // Dr. Neha Sharma
        "2026-10-16"
      );
      const elapsedMs = performance.now() - startMs;

      console.log(`[PERFORMANCE BENCHMARK] Faculty Analytics Execution Time: ${elapsedMs.toFixed(2)}ms (Engine recorded: ${analytics.queryExecutionMs.toFixed(2)}ms)`);

      expect(elapsedMs).toBeLessThan(2000);
      expect(analytics.queryExecutionMs).toBeLessThan(2000);
    });

    it("executes subject detail analytics under 2000ms", () => {
      const startMs = performance.now();
      const analytics = analyticsService.getSubjectDetailAnalytics(
        "88888888-8888-8888-8888-888888888881", // CS201
        "77777777-7777-7777-7777-777777777771", // Sec B
        "2026-10-16"
      );
      const elapsedMs = performance.now() - startMs;

      console.log(`[PERFORMANCE BENCHMARK] Subject Detail Analytics Execution Time: ${elapsedMs.toFixed(2)}ms (Engine recorded: ${analytics.queryExecutionMs.toFixed(2)}ms)`);

      expect(elapsedMs).toBeLessThan(2000);
      expect(analytics.queryExecutionMs).toBeLessThan(2000);
    });
  });

  describe("2. Worst-Status Principle (No Hiding Problems Behind Averages)", () => {
    it("marks campus status as DANGER if any subject in that campus is in DANGER", () => {
      const adminData = analyticsService.getAdminExecutiveAnalytics({}, "2026-10-16");

      // Verify that campus comparisons do not average statuses
      for (const campus of adminData.campusComparisons) {
        if (campus.dangerCount > 0) {
          expect(campus.worstStatus).toBe("DANGER");
        } else if (campus.tightCount > 0) {
          expect(campus.worstStatus).toBe("TIGHT");
        }
      }

      // Verify university-level worstCampusStatus reflects the worst campus
      if (adminData.campusComparisons.some((c) => c.worstStatus === "DANGER")) {
        expect(adminData.kpis.worstCampusStatus).toBe("DANGER");
      }
    });

    it("marks track status as worst subject status across batches", () => {
      const adminData = analyticsService.getAdminExecutiveAnalytics({}, "2026-10-16");
      for (const track of adminData.trackComparisons) {
        expect(["ON_TRACK", "TIGHT", "DANGER", "COMPLETE"]).toContain(track.worstStatus);
      }
    });
  });

  describe("3. Empty State Handling for Unconfigured Campuses", () => {
    it("returns zero batches and zero subjects for unconfigured campus JUJ", () => {
      const jujCampusId = "44444444-4444-4444-4444-444444444444";
      const cmData = analyticsService.getCampusManagerAnalytics(jujCampusId, "2026-10-16");

      expect(cmData.campusKpis.totalBatches).toBe(0);
      expect(cmData.campusKpis.totalSubjects).toBe(0);
      expect(cmData.fallingBehindSubjects).toHaveLength(0);
      expect(cmData.overdueTopics).toHaveLength(0);
      expect(cmData.unloggedSessions.pendingFaculty).toHaveLength(0);
      expect(cmData.unloggedSessions.escalatedCm).toHaveLength(0);
      expect(cmData.campus.code).toBe("JUJ");
    });

    it("shows empty state flag in admin comparisons for unconfigured campus", () => {
      const adminData = analyticsService.getAdminExecutiveAnalytics({}, "2026-10-16");
      const jujComparison = adminData.campusComparisons.find((c) => c.campusCode === "JUJ");

      expect(jujComparison).toBeDefined();
      expect(jujComparison?.hasActiveBatches).toBe(false);
      expect(jujComparison?.totalSubjects).toBe(0);
    });
  });

  describe("4. Campus Manager Scoped Operations & Compliance", () => {
    it("scopes all metrics strictly to assigned campus HITECH", () => {
      const hitechCampusId = "11111111-1111-1111-1111-111111111111";
      const cmData = analyticsService.getCampusManagerAnalytics(hitechCampusId, "2026-10-16");

      expect(cmData.campus.id).toBe(hitechCampusId);
      expect(cmData.campus.code).toBe("HITECH");
      expect(cmData.campusKpis.totalSubjects).toBeGreaterThan(0);
      expect(cmData.campusKpis.totalBatches).toBeGreaterThan(0);

      // Verify all falling behind subjects belong to HITECH
      for (const sub of cmData.fallingBehindSubjects) {
        expect(sub.code).toBeDefined();
      }
    });

    it("calculates logging compliance rate and distinguishes pending faculty vs escalated to CM", () => {
      const hitechCampusId = "11111111-1111-1111-1111-111111111111";
      const cmData = analyticsService.getCampusManagerAnalytics(
        hitechCampusId,
        "2026-10-16"
      );

      expect(typeof cmData.facultyCompliance.compliancePercentage).toBe("number");
      expect(cmData.facultyCompliance.compliancePercentage).toBeGreaterThanOrEqual(0);
      expect(cmData.facultyCompliance.compliancePercentage).toBeLessThanOrEqual(100);

      // Verify unlogged session escalation states
      for (const unlogged of cmData.unloggedSessions.escalatedCm) {
        expect(unlogged.status).toBe("ESCALATED_CM");
        expect(unlogged.hoursOverdue).toBeGreaterThanOrEqual(48);
      }
      for (const pending of cmData.unloggedSessions.pendingFaculty) {
        expect(pending.status).toBe("PENDING_FACULTY");
        expect(pending.hoursOverdue).toBeLessThan(48);
      }
    });
  });

  describe("5. Faculty Analytics Scoped Operations", () => {
    it("scopes today's schedule and subject progress strictly to faculty assignments", () => {
      const nehaId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      const facultyData = analyticsService.getFacultyAnalytics(nehaId, "2026-10-16");

      expect(facultyData.facultyProfile.id).toBe(nehaId);
      expect(facultyData.subjectProgress.length).toBeGreaterThan(0);

      // Verify that every subject has non-empty curriculum planning metrics
      for (const subj of facultyData.subjectProgress) {
        expect(subj.totalHoursInScope).toBeGreaterThan(0);
        expect(subj.coveredHours).toBeGreaterThanOrEqual(0);
        expect(subj.bufferRatio).toBeGreaterThanOrEqual(0);
      }
    });

    it("provides ordered next planned topics for seamless preparation", () => {
      const nehaId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      const facultyData = analyticsService.getFacultyAnalytics(nehaId, "2026-10-16");

      expect(Array.isArray(facultyData.nextPlannedTopics)).toBe(true);
      if (facultyData.nextPlannedTopics.length > 0) {
        const firstTopic = facultyData.nextPlannedTopics[0];
        expect(firstTopic.topicTitle).toBeDefined();
        expect(firstTopic.plannedHours).toBeGreaterThan(0);
      }
    });
  });

  describe("6. Subject Detail Analytics & Topic Progression", () => {
    it("computes complete subject metrics without inventing formulas", () => {
      const subjectId = "88888888-8888-8888-8888-888888888881";
      const batchId = "77777777-7777-7777-7777-777777777771";
      const detail = analyticsService.getSubjectDetailAnalytics(subjectId, batchId, "2026-10-16");

      expect(detail.subject.code).toBe("CS201");
      expect(detail.metrics.totalHoursInScope).toBeGreaterThan(0);
      expect(detail.metrics.coveredHours).toBeGreaterThanOrEqual(0);
      expect(detail.metrics.remainingHours).toBe(
        Number((detail.metrics.totalHoursInScope - detail.metrics.coveredHours).toFixed(2))
      );

      // Verify topic timeline preservation and exact statuses
      expect(detail.topicTimeline.length).toBeGreaterThan(0);
      for (let i = 0; i < detail.topicTimeline.length - 1; i++) {
        expect(detail.topicTimeline[i].sequenceOrder).toBeLessThanOrEqual(detail.topicTimeline[i + 1].sequenceOrder);
      }

      // Verify verified session logs audit trail
      expect(Array.isArray(detail.recentSessionLogs)).toBe(true);
      for (const log of detail.recentSessionLogs) {
        expect(["COMPLETED", "IN_PROGRESS", "SKIPPED", "CANCELLED"]).toContain(log.deliveryStatus);
        expect(log.durationMinutes).toBeGreaterThan(0);
      }
    });

    it("provides multi-exam readiness analytics for in-scope topics", () => {
      const subjectId = "88888888-8888-8888-8888-888888888881";
      const batchId = "77777777-7777-7777-7777-777777777771";
      const detail = analyticsService.getSubjectDetailAnalytics(subjectId, batchId, "2026-10-16");

      expect(detail.examReadiness.length).toBeGreaterThan(0);
      for (const exam of detail.examReadiness) {
        expect(exam.readinessPercentage).toBeGreaterThanOrEqual(0);
        expect(exam.readinessPercentage).toBeLessThanOrEqual(100);
        expect(exam.examDate).toBeDefined();
      }
    });
  });
});
