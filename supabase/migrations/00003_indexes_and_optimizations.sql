-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00003_indexes_and_optimizations.sql
-- High-Performance Indexes and Audit Triggers Supporting Fast Queries
-- ==============================================================================

-- 1. Campus, Semester and Track Indexes
CREATE INDEX IF NOT EXISTS idx_semesters_campus_current ON public.semesters(campus_id, is_current);
CREATE INDEX IF NOT EXISTS idx_batches_campus_semester ON public.batches(campus_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_batches_track ON public.batches(track_id);

-- 2. Subject & Batch Subject Indexes
CREATE INDEX IF NOT EXISTS idx_batch_subjects_batch ON public.batch_subjects(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_subjects_subject ON public.batch_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_faculty_assignments_faculty ON public.faculty_assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_assignments_batch_subject ON public.faculty_assignments(batch_subject_id);

-- 3. Calendar & Exam Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_semester_date ON public.calendar_events(semester_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_campus ON public.calendar_events(campus_id);
CREATE INDEX IF NOT EXISTS idx_exam_windows_semester ON public.exam_windows(semester_id, exam_type);

-- 4. Timetable & Syllabus Indexes
CREATE INDEX IF NOT EXISTS idx_timetable_slots_batch_day ON public.timetable_slots(batch_subject_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_faculty ON public.timetable_slots(faculty_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_subject_seq ON public.syllabus_topics(subject_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_unit ON public.syllabus_topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_topic_exam_scopes_topic ON public.topic_exam_scopes(topic_id, exam_type);

-- 5. Scheduled Sessions & Session Logs Indexes (Key for fast end-of-day logging & dashboards)
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_batch_date ON public.scheduled_sessions(batch_subject_id, session_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_faculty_date ON public.scheduled_sessions(faculty_id, session_date);
CREATE INDEX IF NOT EXISTS idx_session_logs_scheduled_session ON public.session_logs(scheduled_session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_batch_subject_date ON public.session_logs(batch_subject_id, session_date);
CREATE INDEX IF NOT EXISTS idx_session_logs_faculty_date ON public.session_logs(faculty_id, session_date);
CREATE INDEX IF NOT EXISTS idx_session_log_topics_topic ON public.session_log_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_session_log_topics_log ON public.session_log_topics(session_log_id);

-- 6. Notifications & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notification_events(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ==============================================================================
-- AUTOMATIC AUDIT LOGGING TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_audit_log_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        changed_by,
        old_values,
        new_values,
        timestamp
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        timezone('utc', now())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger to session_logs to guarantee 100% auditability of teaching logs
DROP TRIGGER IF EXISTS trg_audit_session_logs ON public.session_logs;
CREATE TRIGGER trg_audit_session_logs
    AFTER INSERT OR UPDATE OR DELETE ON public.session_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_log_change();
