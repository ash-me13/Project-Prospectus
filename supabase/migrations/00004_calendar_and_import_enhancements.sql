-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00004_calendar_and_import_enhancements.sql
-- Calendar event types, consequential change tracking, and exam window scoping
-- ==============================================================================

-- 1. Extend calendar_event_type ENUM
ALTER TYPE calendar_event_type ADD VALUE IF NOT EXISTS 'ACADEMIC_EVENT';
ALTER TYPE calendar_event_type ADD VALUE IF NOT EXISTS 'SPECIAL_WORKING_DAY';
ALTER TYPE calendar_event_type ADD VALUE IF NOT EXISTS 'CANCELLED_DAY';
ALTER TYPE calendar_event_type ADD VALUE IF NOT EXISTS 'TIMETABLE_OVERRIDE';

-- 2. Add consequential change tracking & recurring fields to calendar_events
ALTER TABLE public.calendar_events
    ADD COLUMN IF NOT EXISTS change_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS recurring_pattern TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- 3. Extend exam_windows with multi-level academic scoping
ALTER TABLE public.exam_windows
    ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES public.academic_tracks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- 4. Compound index for exam scoping queries
CREATE INDEX IF NOT EXISTS idx_exam_windows_scoping 
    ON public.exam_windows(semester_id, campus_id, track_id, batch_id);

-- 5. Add published status to semesters
ALTER TABLE public.semesters
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.profiles(id);
