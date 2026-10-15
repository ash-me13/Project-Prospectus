-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00001_production_schema.sql
-- Complete 20-Table Normalized Schema for Course Progression Challenge (MSOT)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- ENUMS
-- ==============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'campus_manager', 'faculty', 'student');
CREATE TYPE saturday_rule_type AS ENUM ('ALL', 'NONE', 'SECOND_FOURTH');
CREATE TYPE calendar_event_type AS ENUM ('HOLIDAY', 'INSTITUTIONAL_EVENT', 'EXAM_PERIOD', 'BLACKOUT');
CREATE TYPE exam_type_enum AS ENUM ('SESSIONAL', 'MID_TERM', 'PUT', 'END_TERM');
CREATE TYPE topic_progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
CREATE TYPE scheduled_occurrence_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
CREATE TYPE session_delivery_status AS ENUM ('COMPLETED', 'IN_PROGRESS', 'SKIPPED', 'MERGED', 'CANCELLED');
CREATE TYPE work_status_enum AS ENUM ('NONE', 'ASSIGNED', 'COLLECTED', 'REVIEWED');
CREATE TYPE notification_event_type AS ENUM ('MISSED_LOG_REMINDER', 'MISSED_LOG_ESCALATION', 'SCHEDULE_SHIFT', 'EXAM_ALERT');

-- ==============================================================================
-- 1. CAMPUSES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g. "HI-Tech", "Ratnam", "RGIB", "JUJ"
    code TEXT NOT NULL UNIQUE, -- e.g. "HITECH", "RATNAM", "RGIB", "JUJ"
    location TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 2. ACADEMIC_TRACKS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.academic_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g. "Mirai Track", "University Track"
    code TEXT NOT NULL UNIQUE, -- e.g. "MIRAI", "UNIV"
    description TEXT,
    color_hex TEXT DEFAULT '#4965E8',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 3. PROFILES (Linked to Supabase Auth users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_visiting_faculty BOOLEAN NOT NULL DEFAULT false,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
    batch_id UUID, -- Foreign key added after batches table is created
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 4. SEMESTERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Fall Semester 2026"
    academic_year TEXT NOT NULL, -- e.g. "2026-2027"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    saturday_rule saturday_rule_type NOT NULL DEFAULT 'SECOND_FOURTH',
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_semester_dates CHECK (start_date < end_date)
);

-- ==============================================================================
-- 5. BATCHES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.academic_tracks(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "CSE 2026 Sec B"
    section TEXT NOT NULL,
    intake_year INT NOT NULL,
    student_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(campus_id, semester_id, name)
);

-- Add batch_id foreign key constraint on profiles now that batches table exists
ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_batch
    FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;

-- ==============================================================================
-- 6. SUBJECTS (Master Subject Catalog)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. "CS201"
    name TEXT NOT NULL, -- e.g. "Data Structures & Algorithms"
    department TEXT NOT NULL DEFAULT 'CSE',
    credit_hours INT NOT NULL DEFAULT 4,
    total_planned_hours NUMERIC(5,2) NOT NULL CHECK (total_planned_hours > 0),
    syllabus_version TEXT NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 7. BATCH_SUBJECTS (Subject Delivery for a specific Batch)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.batch_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    target_finish_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(batch_id, subject_id)
);

-- ==============================================================================
-- 8. CALENDAR_EVENTS (Holidays, Blackouts, Events)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type calendar_event_type NOT NULL DEFAULT 'HOLIDAY',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_instructional BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_calendar_event_dates CHECK (start_date <= end_date)
);

-- ==============================================================================
-- 9. EXAM_WINDOWS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exam_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Mid-Term Examination"
    exam_type exam_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weightage_percent NUMERIC(4,1) DEFAULT 25.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_exam_dates CHECK (start_date <= end_date)
);

-- ==============================================================================
-- 10. FACULTY_ASSIGNMENTS (Authorized Faculty per Batch Subject)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    batch_subject_id UUID NOT NULL REFERENCES public.batch_subjects(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    is_visiting BOOLEAN NOT NULL DEFAULT false,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(faculty_id, batch_subject_id)
);

-- ==============================================================================
-- 11. TIMETABLE_SLOTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_subject_id UUID NOT NULL REFERENCES public.batch_subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Monday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4,2) GENERATED ALWAYS AS (ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0, 2)) STORED,
    room TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_slot_time CHECK (start_time < end_time)
);

-- ==============================================================================
-- 12. SYLLABUS_UNITS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.syllabus_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    planned_hours NUMERIC(5,2) NOT NULL CHECK (planned_hours > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(subject_id, unit_number)
);

-- ==============================================================================
-- 13. SYLLABUS_TOPICS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.syllabus_units(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    planned_hours NUMERIC(4,2) NOT NULL CHECK (planned_hours > 0),
    status topic_progress_status NOT NULL DEFAULT 'NOT_STARTED',
    percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (percent_complete BETWEEN 0 AND 100),
    planned_date DATE,
    actual_completed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(subject_id, sequence_order)
);

-- ==============================================================================
-- 14. TOPIC_EXAM_SCOPES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.topic_exam_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
    exam_window_id UUID REFERENCES public.exam_windows(id) ON DELETE CASCADE,
    exam_type exam_type_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(topic_id, exam_type)
);

-- ==============================================================================
-- 15. SCHEDULED_SESSIONS (Specific Scheduled Class Occurrences)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_subject_id UUID NOT NULL REFERENCES public.batch_subjects(id) ON DELETE CASCADE,
    timetable_slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4,2) GENERATED ALWAYS AS (ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0, 2)) STORED,
    occurrence_status scheduled_occurrence_status NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_session_time CHECK (start_time < end_time),
    UNIQUE(batch_subject_id, session_date, start_time)
);

-- ==============================================================================
-- 16. SESSION_LOGS (Actual Logged Teaching Sessions)
-- Enforces at most one canonical log per scheduled occurrence via UNIQUE constraint
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_session_id UUID UNIQUE NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE RESTRICT,
    batch_subject_id UUID NOT NULL REFERENCES public.batch_subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL,
    actual_start_time TIME NOT NULL,
    actual_end_time TIME NOT NULL,
    duration_minutes INT GENERATED ALWAYS AS (ROUND(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60.0)) STORED,
    delivery_status session_delivery_status NOT NULL,
    covered_summary TEXT,
    leftover_summary TEXT,
    carry_forward_topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    classwork_status work_status_enum NOT NULL DEFAULT 'NONE',
    homework_status work_status_enum NOT NULL DEFAULT 'NONE',
    notes TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT valid_actual_time CHECK (actual_start_time < actual_end_time)
);

-- ==============================================================================
-- 17. SESSION_LOG_TOPICS (Multi-topic Progress Traceability)
-- Prevents counting a topic's progress multiple times; keeps auditable history
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.session_log_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_log_id UUID NOT NULL REFERENCES public.session_logs(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
    percent_complete_after NUMERIC(5,2) NOT NULL CHECK (percent_complete_after BETWEEN 0 AND 100),
    topic_status_after topic_progress_status NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(session_log_id, topic_id)
);

-- ==============================================================================
-- 18. NOTIFICATION_EVENTS (Alerts & Escalations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type notification_event_type NOT NULL,
    scheduled_session_id UUID REFERENCES public.scheduled_sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 19. APP_SETTINGS (Campus-level & Global Settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(campus_id, setting_key)
);

-- ==============================================================================
-- 20. AUDIT_LOGS (Traceable Data Corrections)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    client_ip TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
