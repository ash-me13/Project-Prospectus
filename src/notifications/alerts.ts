import { MissedLogAlert } from "../types/academic";

export interface ScheduledSessionCheck {
  timetableSlotId: string;
  subjectId: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  campusManagerId: string;
  campusManagerEmail: string;
  scheduledDateIso: string; // YYYY-MM-DD
  isLogged: boolean;
}

export interface AlertNotificationPayload {
  recipientEmail: string;
  recipientRole: "faculty" | "campus_manager";
  subject: string;
  body: string;
  hoursDelayed: number;
  escalated: boolean;
}

/**
 * Evaluates scheduled sessions against the current check time.
 * If not logged by end of day (24h) -> Faculty reminder.
 * If still missing after 48h -> Campus Manager escalation.
 */
export function evaluateMissedSessions(
  scheduledSessions: ScheduledSessionCheck[],
  currentTimeIso: string
): {
  alerts: MissedLogAlert[];
  notificationsToSend: AlertNotificationPayload[];
} {
  const checkTime = new Date(currentTimeIso).getTime();
  const alerts: MissedLogAlert[] = [];
  const notificationsToSend: AlertNotificationPayload[] = [];

  for (const session of scheduledSessions) {
    if (session.isLogged) continue;

    // Session date midnight
    const sessionTime = new Date(`${session.scheduledDateIso}T23:59:59`).getTime();
    if (checkTime <= sessionTime) {
      // Session date has not ended yet
      continue;
    }

    const elapsedMs = checkTime - sessionTime;
    const hoursDelayed = Math.floor(elapsedMs / (1000 * 60 * 60));

    const isEscalated = hoursDelayed >= 48;
    const alertId = `alert-${session.subjectId}-${session.scheduledDateIso}`;

    alerts.push({
      id: alertId,
      subjectId: session.subjectId,
      facultyId: session.facultyId,
      campusManagerId: session.campusManagerId,
      sessionDate: session.scheduledDateIso,
      hoursDelayed,
      escalatedToCampusManager: isEscalated,
      status: isEscalated ? "ESCALATED_CM" : "PENDING_FACULTY",
      createdAt: new Date(sessionTime).toISOString(),
    });

    if (isEscalated) {
      // Escalation notification to Campus Manager
      notificationsToSend.push({
        recipientEmail: session.campusManagerEmail,
        recipientRole: "campus_manager",
        subject: `[ESCALATION] Missed Session Log: ${session.subjectName} (${hoursDelayed}h overdue)`,
        body: `Attention Campus Manager: Faculty ${session.facultyName} has not logged the teaching session scheduled on ${session.scheduledDateIso} for subject ${session.subjectName}. It is now ${hoursDelayed} hours overdue.`,
        hoursDelayed,
        escalated: true,
      });
    } else {
      // Reminder notification to Faculty
      notificationsToSend.push({
        recipientEmail: session.facultyEmail,
        recipientRole: "faculty",
        subject: `[REMINDER] Please log session for ${session.subjectName}`,
        body: `Hi ${session.facultyName}, please log your teaching session for ${session.subjectName} scheduled on ${session.scheduledDateIso}. Logging takes under 60 seconds on Prospectus.`,
        hoursDelayed,
        escalated: false,
      });
    }
  }

  return { alerts, notificationsToSend };
}
