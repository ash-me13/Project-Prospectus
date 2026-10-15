import { z } from "zod";

export const SaturdayRuleEnum = z.enum(["ALL", "NONE", "SECOND_FOURTH"]);
export const SessionStatusEnum = z.enum([
  "COMPLETED",
  "IN_PROGRESS",
  "SKIPPED",
  "MERGED",
  "CANCELLED",
]);
export const ProgressStatusEnum = z.enum([
  "ON_TRACK",
  "TIGHT",
  "DANGER",
  "COMPLETE",
]);
export const ExamTypeEnum = z.enum([
  "SESSIONAL",
  "MID_TERM",
  "PUT",
  "END_TERM",
]);
export const WorkStatusEnum = z.enum([
  "NONE",
  "ASSIGNED",
  "COLLECTED",
  "REVIEWED",
]);
export const UserRoleEnum = z.enum([
  "admin",
  "campus_manager",
  "faculty",
  "student",
]);

// Campus schema
export const CampusSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Campus name must be at least 2 characters"),
  code: z.string().min(2, "Campus code must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
});

// Semester schema
export const SemesterSchema = z.object({
  id: z.string().uuid().optional(),
  campusId: z.string().uuid("Invalid campus ID"),
  name: z.string().min(2, "Semester name is required"),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, "Academic year must be YYYY-YYYY"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  saturdayRule: SaturdayRuleEnum.default("SECOND_FOURTH"),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: "Start date must be before end date", path: ["endDate"] }
);

// Timetable Slot schema
export const TimetableSlotSchema = z.object({
  id: z.string().uuid().optional(),
  batchId: z.string().uuid("Invalid batch ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
  facultyId: z.string().uuid("Invalid faculty ID"),
  dayOfWeek: z.number().int().min(1).max(6), // Mon-Sat
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  durationHours: z.number().positive("Duration must be positive"),
});

// Topic / Lesson Plan schema
export const TopicSchema = z.object({
  id: z.string().uuid().optional(),
  subjectId: z.string().uuid("Invalid subject ID"),
  unitNumber: z.number().int().positive("Unit number must be positive"),
  unitTitle: z.string().min(1, "Unit title is required"),
  sequenceOrder: z.number().int().positive("Sequence order must be positive"),
  title: z.string().min(2, "Topic title is required"),
  plannedHours: z
    .number()
    .min(0.5, "Minimum planned hours is 0.5")
    .max(8, "Maximum planned hours per session topic is 8"),
  inScopeForExams: z.array(ExamTypeEnum).default(["MID_TERM", "END_TERM"]),
  status: SessionStatusEnum.default("IN_PROGRESS"),
  percentComplete: z.number().min(0).max(100).default(0),
});

// Rapid Session Logging schema (Faculty 60-second mobile logging flow)
export const LogSessionSchema = z.object({
  subjectId: z.string().uuid("Subject ID is required"),
  facultyId: z.string().uuid("Faculty ID is required"),
  timetableSlotId: z.string().uuid().optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
  plannedHours: z.number().positive(),
  actualDurationMinutes: z.number().int().min(15).max(300),
  status: SessionStatusEnum,
  percentComplete: z.number().min(0).max(100),
  topicsCovered: z.array(z.string().uuid()).min(1, "At least one topic must be selected"),
  topicsLeftOver: z.string().optional(),
  carryForwardTopicId: z.string().uuid().optional(),
  classworkStatus: WorkStatusEnum.default("NONE"),
  homeworkStatus: WorkStatusEnum.default("NONE"),
  notes: z.string().max(1000).optional(),
});

export type LogSessionInput = z.infer<typeof LogSessionSchema>;
export type SemesterInput = z.infer<typeof SemesterSchema>;
export type TimetableSlotInput = z.infer<typeof TimetableSlotSchema>;
export type TopicInput = z.infer<typeof TopicSchema>;
