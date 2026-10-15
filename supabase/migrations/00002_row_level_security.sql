-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00002_row_level_security.sql
-- Strict Multi-Tenant and Role-Based Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all 20 tables
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_exam_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_log_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================

-- Helper: Get current authenticated user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get current authenticated user's assigned campus_id
CREATE OR REPLACE FUNCTION public.current_user_campus_id()
RETURNS UUID AS $$
    SELECT campus_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get current authenticated user's assigned batch_id
CREATE OR REPLACE FUNCTION public.current_user_batch_id()
RETURNS UUID AS $$
    SELECT batch_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Check if user is an authorized faculty for a given batch_subject
CREATE OR REPLACE FUNCTION public.is_authorized_faculty_for_batch_subject(target_batch_subject_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.faculty_assignments
        WHERE faculty_id = auth.uid()
          AND batch_subject_id = target_batch_subject_id
    ) OR public.current_user_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- ANTI-PRIVILEGE ESCALATION TRIGGER ON PROFILES
-- Ordinary users cannot promote themselves by updating their profile role, campus, or batch
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If role, campus_id, or batch_id is changed
    IF (OLD.role IS DISTINCT FROM NEW.role OR
        OLD.campus_id IS DISTINCT FROM NEW.campus_id OR
        OLD.batch_id IS DISTINCT FROM NEW.batch_id OR
        OLD.is_visiting_faculty IS DISTINCT FROM NEW.is_visiting_faculty) THEN
        
        -- Only Admin is allowed to modify role or institutional boundaries
        IF (public.current_user_role() != 'admin') THEN
            RAISE EXCEPTION 'Access denied: ordinary users cannot modify role, campus, or batch assignments.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_protect_profile_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_privilege_escalation();

-- ==============================================================================
-- 1. PROFILES POLICIES
-- ==============================================================================
CREATE POLICY "Users can read their own profile or institutional peers"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id
        OR public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
        OR (public.current_user_role() = 'faculty')
    );

CREATE POLICY "Users can update non-privileged fields on their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.current_user_role() = 'admin')
    WITH CHECK (auth.uid() = id OR public.current_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.current_user_role() = 'admin');

-- ==============================================================================
-- 2. CAMPUSES & ACADEMIC_TRACKS
-- ==============================================================================
CREATE POLICY "Authenticated users can read campuses"
    ON public.campuses FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage campuses"
    ON public.campuses FOR ALL
    USING (public.current_user_role() = 'admin');

CREATE POLICY "Authenticated users can read academic tracks"
    ON public.academic_tracks FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage academic tracks"
    ON public.academic_tracks FOR ALL
    USING (public.current_user_role() = 'admin');

-- ==============================================================================
-- 3. SEMESTERS
-- ==============================================================================
CREATE POLICY "Authenticated users can read semesters"
    ON public.semesters FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Campus Managers can manage semesters"
    ON public.semesters FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
    );

-- ==============================================================================
-- 4. BATCHES
-- ==============================================================================
CREATE POLICY "Read batches: role scoped"
    ON public.batches FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
        OR (public.current_user_role() = 'student' AND id = public.current_user_batch_id())
    );

CREATE POLICY "Manage batches: admin and campus manager"
    ON public.batches FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
    );

-- ==============================================================================
-- 5. SUBJECTS & BATCH_SUBJECTS
-- ==============================================================================
CREATE POLICY "Authenticated users can read subjects"
    ON public.subjects FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage subjects"
    ON public.subjects FOR ALL
    USING (public.current_user_role() = 'admin');

CREATE POLICY "Read batch subjects"
    ON public.batch_subjects FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager' AND EXISTS (
            SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.campus_id = public.current_user_campus_id()
        ))
        OR (public.current_user_role() = 'student' AND batch_id = public.current_user_batch_id())
    );

CREATE POLICY "Manage batch subjects: admin and campus manager"
    ON public.batch_subjects FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND EXISTS (
            SELECT 1 FROM public.batches b WHERE b.id = batch_id AND b.campus_id = public.current_user_campus_id()
        ))
    );

-- ==============================================================================
-- 6. CALENDAR_EVENTS & EXAM_WINDOWS
-- ==============================================================================
CREATE POLICY "Authenticated users can read calendar events"
    ON public.calendar_events FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Campus Managers can manage calendar events"
    ON public.calendar_events FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
    );

CREATE POLICY "Authenticated users can read exam windows"
    ON public.exam_windows FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and Campus Managers can manage exam windows"
    ON public.exam_windows FOR ALL
    USING (public.current_user_role() = 'admin');

-- ==============================================================================
-- 7. FACULTY_ASSIGNMENTS & TIMETABLE_SLOTS
-- ==============================================================================
CREATE POLICY "Read faculty assignments"
    ON public.faculty_assignments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Manage faculty assignments: admin and campus manager"
    ON public.faculty_assignments FOR ALL
    USING (public.current_user_role() IN ('admin', 'campus_manager'));

CREATE POLICY "Read timetable slots"
    ON public.timetable_slots FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager')
        OR (public.current_user_role() = 'student' AND EXISTS (
            SELECT 1 FROM public.batch_subjects bs
            WHERE bs.id = batch_subject_id AND bs.batch_id = public.current_user_batch_id()
        ))
    );

CREATE POLICY "Manage timetable: admin and campus manager"
    ON public.timetable_slots FOR ALL
    USING (public.current_user_role() IN ('admin', 'campus_manager'));

-- ==============================================================================
-- 8. SYLLABUS_UNITS & SYLLABUS_TOPICS & TOPIC_EXAM_SCOPES
-- ==============================================================================
CREATE POLICY "Authenticated users can read syllabus units"
    ON public.syllabus_units FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Manage syllabus units: admin and assigned faculty"
    ON public.syllabus_units FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'faculty')
    );

CREATE POLICY "Authenticated users can read syllabus topics"
    ON public.syllabus_topics FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Manage syllabus topics: admin and assigned faculty"
    ON public.syllabus_topics FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'faculty')
    );

CREATE POLICY "Authenticated users can read topic exam scopes"
    ON public.topic_exam_scopes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Manage topic exam scopes: admin and faculty"
    ON public.topic_exam_scopes FOR ALL
    USING (public.current_user_role() IN ('admin', 'faculty'));

-- ==============================================================================
-- 9. SCHEDULED_SESSIONS
-- ==============================================================================
CREATE POLICY "Read scheduled sessions"
    ON public.scheduled_sessions FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager')
        OR (public.current_user_role() = 'student' AND EXISTS (
            SELECT 1 FROM public.batch_subjects bs
            WHERE bs.id = batch_subject_id AND bs.batch_id = public.current_user_batch_id()
        ))
    );

CREATE POLICY "Manage scheduled sessions: admin and campus manager"
    ON public.scheduled_sessions FOR ALL
    USING (public.current_user_role() IN ('admin', 'campus_manager'));

-- ==============================================================================
-- 10. SESSION_LOGS & SESSION_LOG_TOPICS
-- MSOT RULE: Faculty can only log/edit their own authorized subjects
-- Students have zero write permissions
-- ==============================================================================
CREATE POLICY "Read session logs"
    ON public.session_logs FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty', 'campus_manager')
        OR (public.current_user_role() = 'student' AND EXISTS (
            SELECT 1 FROM public.batch_subjects bs
            WHERE bs.id = batch_subject_id AND bs.batch_id = public.current_user_batch_id()
        ))
    );

CREATE POLICY "Insert session logs: only authorized faculty or admin"
    ON public.session_logs FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'admin'
        OR (
            public.current_user_role() = 'faculty'
            AND faculty_id = auth.uid()
            AND public.is_authorized_faculty_for_batch_subject(batch_subject_id)
        )
    );

CREATE POLICY "Update session logs: only authorized faculty or admin"
    ON public.session_logs FOR UPDATE
    USING (
        public.current_user_role() = 'admin'
        OR (
            public.current_user_role() = 'faculty'
            AND faculty_id = auth.uid()
            AND public.is_authorized_faculty_for_batch_subject(batch_subject_id)
        )
    );

CREATE POLICY "Read session log topics"
    ON public.session_log_topics FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Insert session log topics: faculty or admin"
    ON public.session_log_topics FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.session_logs sl
            WHERE sl.id = session_log_id
              AND sl.faculty_id = auth.uid()
        )
    );

-- ==============================================================================
-- 11. NOTIFICATION_EVENTS, APP_SETTINGS, AUDIT_LOGS
-- ==============================================================================
CREATE POLICY "Read notification events: recipient only or admin"
    ON public.notification_events FOR SELECT
    USING (recipient_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "Insert notification events: system and admin"
    ON public.notification_events FOR INSERT
    WITH CHECK (public.current_user_role() IN ('admin', 'campus_manager'));

CREATE POLICY "Read app settings"
    ON public.app_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Manage app settings: admin only"
    ON public.app_settings FOR ALL
    USING (public.current_user_role() = 'admin');

CREATE POLICY "Read audit logs: admin and campus manager"
    ON public.audit_logs FOR SELECT
    USING (public.current_user_role() IN ('admin', 'campus_manager'));

CREATE POLICY "Insert audit logs: authenticated"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
