-- ==============================================================================
-- Prospectus Academic SaaS - Database Schema Migration: 00005_timetable_and_syllabus_enhancements.sql
-- Timetable effective date ranges, conflict override tracking, and syllabus learning objectives
-- ==============================================================================

-- 1. Extend timetable_slots with effective date ranges and explicit override tracking
ALTER TABLE public.timetable_slots
    ADD COLUMN IF NOT EXISTS effective_start_date DATE,
    ADD COLUMN IF NOT EXISTS effective_end_date DATE,
    ADD COLUMN IF NOT EXISTS is_override BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS override_reason TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- 2. Add learning objectives to syllabus topics
ALTER TABLE public.syllabus_topics
    ADD COLUMN IF NOT EXISTS learning_objectives TEXT;

-- 3. Composite indexes for high-performance conflict detection and planning engine queries
CREATE INDEX IF NOT EXISTS idx_timetable_slots_faculty_conflict 
    ON public.timetable_slots(faculty_id, day_of_week, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_batch_conflict 
    ON public.timetable_slots(batch_subject_id, day_of_week, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_topic_exam_scopes_lookup 
    ON public.topic_exam_scopes(topic_id, exam_type);
