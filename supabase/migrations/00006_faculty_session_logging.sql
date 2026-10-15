-- ==============================================================================
-- 00006_faculty_session_logging.sql
-- Migration: Add status reason, merged sessions tracking, and idempotency key
-- Prospectus Academic Progression Engine
-- ==============================================================================

-- 1. Add status reason and merged session IDs to session_logs
ALTER TABLE public.session_logs
    ADD COLUMN IF NOT EXISTS status_reason TEXT,
    ADD COLUMN IF NOT EXISTS merged_session_ids UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Add idempotency index to prevent accidental double-submits
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_logs_idempotency
    ON public.session_logs(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 3. Constraint: Enforce status reason for skipped, cancelled, or merged sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_session_log_status_reason'
    ) THEN
        ALTER TABLE public.session_logs
            ADD CONSTRAINT chk_session_log_status_reason
            CHECK (
                (delivery_status NOT IN ('SKIPPED', 'CANCELLED', 'MERGED'))
                OR
                (status_reason IS NOT NULL AND length(trim(status_reason)) > 0)
            );
    END IF;
END $$;

-- 4. Extend scheduled occurrence status enum if needed
DO $$
BEGIN
    ALTER TYPE scheduled_occurrence_status ADD VALUE IF NOT EXISTS 'SKIPPED';
    ALTER TYPE scheduled_occurrence_status ADD VALUE IF NOT EXISTS 'MERGED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON COLUMN public.session_logs.status_reason IS 'Mandatory audit reason when a session is skipped, cancelled, or merged';
COMMENT ON COLUMN public.session_logs.merged_session_ids IS 'Array of scheduled session IDs that were merged into this single canonical log';
COMMENT ON COLUMN public.session_logs.idempotency_key IS 'Client-generated UUID to guarantee exactly-once processing across retries';
