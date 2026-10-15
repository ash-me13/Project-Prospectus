import { UserRole } from "../types/academic";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  campusId?: string; // Assigned campus for Campus Manager
  batchId?: string; // Assigned batch for Student
}

export class AuthorizationError extends Error {
  constructor(message: string = "Unauthorized action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Checks if a user is permitted to log a session for a given subject.
 * MSOT Rule: "Faculty log sessions for their own subjects only. Faculty cannot edit another faculty's subject. Students cannot edit anything."
 */
export function canLogSession(
  user: AuthenticatedUser,
  subjectFacultyId: string
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "faculty" && user.id === subjectFacultyId) return true;
  return false;
}

/**
 * Checks if a user can manage timetable or faculty for a given campus.
 */
export function canManageCampus(
  user: AuthenticatedUser,
  targetCampusId: string
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "campus_manager" && user.campusId === targetCampusId) return true;
  return false;
}

/**
 * Checks if a user can view a batch's course progression dashboard.
 * MSOT Rule: "Students have read-only access to their own batch's academic information."
 */
export function canViewBatch(
  user: AuthenticatedUser,
  targetCampusId: string,
  targetBatchId: string
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "campus_manager" && user.campusId === targetCampusId) return true;
  if (user.role === "faculty") return true; // Faculty can view batch progress
  if (user.role === "student" && user.batchId === targetBatchId) return true;
  return false;
}

/**
 * Checks if a user can upload or modify syllabus/lesson plan units.
 */
export function canEditLessonPlan(
  user: AuthenticatedUser,
  subjectFacultyId: string
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "faculty" && user.id === subjectFacultyId) return true;
  return false;
}

/**
 * Server-side authorization guard assertion.
 */
export function assertAuthorized(
  condition: boolean,
  errorMessage: string = "Access denied: insufficient permissions"
): void {
  if (!condition) {
    throw new AuthorizationError(errorMessage);
  }
}
