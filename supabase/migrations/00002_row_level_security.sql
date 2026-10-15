-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00002_row_level_security.sql
-- Enforcing strict multi-tenant and role-based security at the PostgreSQL layer
-- ==============================================================================

-- Enable RLS on all domain tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_log_alerts ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get current user campus_id
CREATE OR REPLACE FUNCTION public.current_user_campus_id()
RETURNS UUID AS $$
    SELECT campus_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get current user batch_id
CREATE OR REPLACE FUNCTION public.current_user_batch_id()
RETURNS UUID AS $$
    SELECT batch_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Policies for user_profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id OR public.current_user_role() = 'admin');

CREATE POLICY "Admins can update user profiles"
    ON public.user_profiles FOR ALL
    USING (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies for campuses, semesters, calendar_holidays, exam_windows
-- -----------------------------------------------------------------------------
CREATE POLICY "Everyone authenticated can read campuses"
    ON public.campuses FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to campuses"
    ON public.campuses FOR ALL
    USING (public.current_user_role() = 'admin');

CREATE POLICY "Everyone authenticated can read semesters"
    ON public.semesters FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage semesters"
    ON public.semesters FOR ALL
    USING (public.current_user_role() = 'admin');

CREATE POLICY "Everyone authenticated can read holidays and exams"
    ON public.calendar_holidays FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage holidays"
    ON public.calendar_holidays FOR ALL
    USING (public.current_user_role() = 'admin');

CREATE POLICY "Everyone authenticated can read exam windows"
    ON public.exam_windows FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage exam windows"
    ON public.exam_windows FOR ALL
    USING (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Policies for batches and subjects
-- -----------------------------------------------------------------------------
CREATE POLICY "Read batches: admin, faculty, campus manager or enrolled student"
    ON public.batches FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
        OR (public.current_user_role() = 'student' AND id = public.current_user_batch_id())
    );

CREATE POLICY "Admins and Campus Managers can manage batches"
    ON public.batches FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND campus_id = public.current_user_campus_id())
    );

CREATE POLICY "Read subjects"
    ON public.subjects FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager')
        OR (public.current_user_role() = 'student' AND batch_id = public.current_user_batch_id())
    );

CREATE POLICY "Manage subjects: admin and campus managers"
    ON public.subjects FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager')
    );

-- -----------------------------------------------------------------------------
-- Policies for timetable_slots
-- -----------------------------------------------------------------------------
CREATE POLICY "Read timetable slots"
    ON public.timetable_slots FOR SELECT
    USING (
        public.current_user_role() IN ('admin', 'faculty')
        OR (public.current_user_role() = 'campus_manager')
        OR (public.current_user_role() = 'student' AND batch_id = public.current_user_batch_id())
    );

CREATE POLICY "Manage timetable: admin and campus manager"
    ON public.timetable_slots FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager')
    );

-- -----------------------------------------------------------------------------
-- Policies for topics (Lesson Plan)
-- -----------------------------------------------------------------------------
CREATE POLICY "Read topics: all enrolled students, assigned faculty, CM, admin"
    ON public.topics FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Faculty can only update topics for their own subjects"
    ON public.topics FOR ALL
    USING (
        public.current_user_role() = 'admin'
        OR (
            public.current_user_role() = 'faculty'
            AND EXISTS (
                SELECT 1 FROM public.subjects s
                WHERE s.id = topics.subject_id AND s.faculty_id = auth.uid()
            )
        )
    );

-- -----------------------------------------------------------------------------
-- Policies for teaching_sessions (Session Logging)
-- MSOT RULE: Faculty can only log/edit their own subject's sessions
-- Students have zero write permissions
-- -----------------------------------------------------------------------------
CREATE POLICY "Read teaching sessions"
    ON public.teaching_sessions FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Faculty can only insert sessions for their assigned subjects"
    ON public.teaching_sessions FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'admin'
        OR (
            public.current_user_role() = 'faculty'
            AND faculty_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.subjects s
                WHERE s.id = subject_id AND s.faculty_id = auth.uid()
            )
        )
    );

CREATE POLICY "Faculty can only update/delete their own sessions"
    ON public.teaching_sessions FOR UPDATE
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'faculty' AND faculty_id = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- Policies for missed_log_alerts
-- -----------------------------------------------------------------------------
CREATE POLICY "Read alerts: assigned faculty, campus manager, admin"
    ON public.missed_log_alerts FOR SELECT
    USING (
        public.current_user_role() = 'admin'
        OR (public.current_user_role() = 'campus_manager' AND campus_manager_id = auth.uid())
        OR (public.current_user_role() = 'faculty' AND faculty_id = auth.uid())
    );
