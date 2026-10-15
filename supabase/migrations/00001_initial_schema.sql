-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00001_initial_schema.sql
-- Problem 1: Course Progression Challenge for MSOT
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Profiles & RBAC
CREATE TYPE user_role AS ENUM ('admin', 'campus_manager', 'faculty', 'student');

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    campus_id UUID, -- NULL for global Admin
    batch_id UUID,  -- Set for Students
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Campuses
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g. "HI-Tech", "Ratnam", "RGIB", "JUJ"
    code TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Semesters (per campus)
CREATE TYPE saturday_rule_type AS ENUM ('ALL', 'NONE', 'SECOND_FOURTH');

CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL, -- e.g. '2026-2027'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    saturday_rule saturday_rule_type NOT NULL DEFAULT 'SECOND_FOURTH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_semester_dates CHECK (start_date < end_date)
);

-- 4. Calendar Holidays & Non-instructional Events
CREATE TABLE IF NOT EXISTS public.calendar_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    name TEXT NOT NULL,
    is_instructional BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(semester_id, holiday_date)
);

-- 5. Exam Windows
CREATE TYPE exam_type_enum AS ENUM ('SESSIONAL', 'MID_TERM', 'PUT', 'END_TERM');

CREATE TABLE IF NOT EXISTS public.exam_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exam_type exam_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_exam_dates CHECK (start_date <= end_date)
);

-- 6. Batches
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "CSE 2026 Sec B"
    track TEXT NOT NULL, -- e.g. "Mirai Track" or "University Track"
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    faculty_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    target_finish_date DATE NOT NULL,
    total_planned_hours NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Weekly Timetable Slots
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Mon, 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Syllabus Topics & Planned Scope
CREATE TYPE topic_status_enum AS ENUM ('COMPLETED', 'IN_PROGRESS', 'SKIPPED', 'MERGED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    unit_title TEXT NOT NULL,
    sequence_order INT NOT NULL,
    title TEXT NOT NULL,
    planned_hours NUMERIC(4,2) NOT NULL CHECK (planned_hours > 0),
    in_scope_for_exams exam_type_enum[] NOT NULL DEFAULT ARRAY['MID_TERM', 'END_TERM']::exam_type_enum[],
    status topic_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
    percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (percent_complete BETWEEN 0 AND 100),
    planned_date DATE,
    actual_completed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Actual Teaching Sessions Logged by Faculty
CREATE TYPE work_status_enum AS ENUM ('NONE', 'ASSIGNED', 'COLLECTED', 'REVIEWED');

CREATE TABLE IF NOT EXISTS public.teaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    timetable_slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    planned_hours NUMERIC(4,2) NOT NULL,
    actual_duration_minutes INT NOT NULL,
    status topic_status_enum NOT NULL,
    percent_complete NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    topics_covered UUID[] NOT NULL DEFAULT '{}',
    topics_left_over TEXT,
    carry_forward_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    classwork_status work_status_enum NOT NULL DEFAULT 'NONE',
    homework_status work_status_enum NOT NULL DEFAULT 'NONE',
    notes TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Missed Session Alerts & Escalations
CREATE TYPE alert_status_enum AS ENUM ('PENDING_FACULTY', 'ESCALATED_CM', 'RESOLVED');

CREATE TABLE IF NOT EXISTS public.missed_log_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    campus_manager_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    hours_delayed INT NOT NULL DEFAULT 0,
    escalated_to_campus_manager BOOLEAN NOT NULL DEFAULT false,
    status alert_status_enum NOT NULL DEFAULT 'PENDING_FACULTY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_semesters_campus ON public.semesters(campus_id);
CREATE INDEX IF NOT EXISTS idx_batches_campus_semester ON public.batches(campus_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_subjects_batch ON public.subjects(batch_id);
CREATE INDEX IF NOT EXISTS idx_subjects_faculty ON public.subjects(faculty_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_seq ON public.topics(subject_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_subject_date ON public.teaching_sessions(subject_id, session_date);
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_faculty ON public.teaching_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_missed_alerts_status ON public.missed_log_alerts(status);
