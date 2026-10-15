import http from "k6/http";
import { check, sleep } from "k6";

/**
 * Prospectus k6 Load Test
 * MSOT Scalability Requirement:
 * - End-of-day spike: 50, 100, 200 concurrent users logging sessions
 * - Target: p95 latency under 1000ms, error rate < 1%
 */

export const options = {
  stages: [
    { duration: "30s", target: 50 },  // Ramp-up to 50 concurrent faculty
    { duration: "1m", target: 100 },  // Sustained load at 100 concurrent
    { duration: "30s", target: 200 }, // Peak end-of-day spike at 200 concurrent
    { duration: "30s", target: 0 },   // Cool-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests must complete below 1s
    http_req_failed: ["rate<0.01"],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function runLoadTest() {
  // 1. Load course progression dashboard (Read requirement: < 2s)
  const dashboardRes = http.get(`${BASE_URL}/api/progression?subjectId=88888888-8888-8888-8888-888888888881`);
  check(dashboardRes, {
    "dashboard status is 200": (r) => r.status === 200,
    "dashboard loads under 2s": (r) => r.timings.duration < 2000,
  });

  sleep(1);

  // 2. Submit Rapid Session Log (Faculty end-of-day write requirement: < 1s)
  const payload = JSON.stringify({
    subjectId: "88888888-8888-8888-8888-888888888881",
    facultyId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    sessionDate: "2026-10-15",
    plannedHours: 1.5,
    actualDurationMinutes: 90,
    status: "COMPLETED",
    percentComplete: 100,
    topicsCovered: ["99999999-9999-9999-9999-999999999903"],
    classworkStatus: "ASSIGNED",
    homeworkStatus: "ASSIGNED",
    notes: "Session logged via k6 simulated end-of-day concurrency test.",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const logRes = http.post(`${BASE_URL}/api/sessions/log`, payload, params);
  check(logRes, {
    "session log accepted": (r) => r.status === 200 || r.status === 201,
    "log latency under 1s": (r) => r.timings.duration < 1000,
  });

  sleep(2);
}
