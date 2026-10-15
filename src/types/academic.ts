export type UserRole = "admin" | "campus_manager" | "faculty" | "student";

export type SaturdayRule = "ALL" | "NONE" | "SECOND_FOURTH";

export type SessionStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "SKIPPED"
  | "MERGED"
  | "CANCELLED";

export type ProgressStatus = "ON_TRACK" | "TIGHT" | "DANGER" | "COMPLETE";

export type ExamType = "SESSIONAL" | "MID_TERM" | "PUT" | "END_TERM";

export interface Campus {
  id: string;
  name: string; // e.g. "HI-Tech", "Ratnam", "RGIB", "JUJ"
  code: string;
  location: string;
  createdAt: string;
}

export interface Semester {
  id: string;
  campusId: string;
  name: string; // e.g. "Fall 2026", "Sem 1"
  academicYear: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  saturdayRule: SaturdayRule;
  createdAt: string;
}

export interface CalendarHoliday {
  id: string;
  semesterId: string;
  date: string; // ISO date YYYY-MM-DD
  name: string;
  isInstructional: boolean; // false = no teaching
}

export interface ExamWindow {
  id: string;
  semesterId: string;
  name: string;
  examType: ExamType;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;
}

export interface Batch {
  id: string;
  campusId: string;
  semesterId: string;
  name: string; // e.g. "CSE 2026 Sec B"
  track: "Mirai" | "University";
}

export interface Subject {
  id: string;
  batchId: string;
  code: string; // e.g. "CS101"
  name: string; // e.g. "Data Structures & Algorithms"
  facultyId: string;
  targetFinishDate: string; // ISO date YYYY-MM-DD
  totalPlannedHours: number;
}

export interface TimetableSlot {
  id: string;
  batchId: string;
  subjectId: string;
  facultyId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  durationHours: number; // e.g. 1.5
}

export interface Topic {
  id: string;
  subjectId: string;
  unitNumber: number;
  unitTitle: string;
  sequenceOrder: number;
  title: string;
  plannedHours: number; // Weighted hours (MSOT rule: sessions run 50m to 2h)
  inScopeForExams: ExamType[]; // e.g. ['MID_TERM', 'END_TERM']
  status: SessionStatus;
  percentComplete: number; // 0 to 100
  plannedDate?: string; // computed by calendar engine
  actualCompletedDate?: string;
}

export interface TeachingSession {
  id: string;
  subjectId: string;
  facultyId: string;
  timetableSlotId?: string;
  sessionDate: string; // YYYY-MM-DD
  plannedHours: number;
  actualDurationMinutes: number;
  status: SessionStatus;
  percentComplete: number;
  topicsCovered: string[]; // topic IDs
  topicsLeftOver?: string;
  carryForwardTopicId?: string;
  classworkStatus: "NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED";
  homeworkStatus: "NONE" | "ASSIGNED" | "COLLECTED" | "REVIEWED";
  notes?: string;
  loggedAt: string;
}

export interface MissedLogAlert {
  id: string;
  subjectId: string;
  facultyId: string;
  campusManagerId: string;
  sessionDate: string;
  hoursDelayed: number;
  escalatedToCampusManager: boolean;
  status: "PENDING_FACULTY" | "ESCALATED_CM" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
}

/**
 * MSOT Academic Calculation Engine Models
 */
export interface TopicProgressInput {
  id: string;
  plannedHours: number;
  status: SessionStatus;
  percentComplete: number;
  plannedDate?: string;
  inScopeForExams?: ExamType[];
}

export interface CourseProgressionMetrics {
  totalHoursInScope: number;
  coveredHours: number;
  coveragePercentage: number;
  remainingHours: number;
  availableHoursTillDeadline: number;
  bufferRatio: number;
  status: ProgressStatus;
  paceVsPlanHours: number; // negative = behind, positive = ahead
  overdueTopicsCount: number;
}

export interface ExamReadinessMetrics {
  examType: ExamType;
  examName: string;
  examDate: string;
  totalInScopeHours: number;
  coveredInScopeHours: number;
  readinessPercentage: number;
  remainingHoursNeeded: number;
  isReady: boolean;
}

export interface RolledUpTrackProgress {
  trackName: string;
  totalSubjects: number;
  worstStatus: ProgressStatus;
  averageCoveragePercentage: number;
  dangerSubjectsCount: number;
  tightSubjectsCount: number;
  onTrackSubjectsCount: number;
}
