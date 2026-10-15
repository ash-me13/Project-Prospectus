# Supabase PostgreSQL & Auth Production Database Setup Guide

This guide details the setup, migration, Row Level Security (RLS) architecture, and verification procedure for the **Prospectus** academic SaaS platform.

---

## 1. Architectural Overview

Prospectus uses a normalized PostgreSQL schema designed for high relational integrity, temporal consistency, strict role isolation, and audit traceability across multiple campuses and academic tracks.

### The 20 Normalized Tables

| # | Table Name | Purpose | Key Constraints & Policies |
|---|---|---|---|
| 1 | `campuses` | Physical institutions (HI-Tech, Ratnam, RGIB, JUJ) | Unique code & name |
| 2 | `academic_tracks` | Curriculum streams (e.g., Mirai, University Track) | Unique code, hex color token |
| 3 | `profiles` | User profiles linked to `auth.users(id)` | Anti-privilege escalation trigger prevents self-role changes |
| 4 | `semesters` | Campus academic periods (Fall/Spring) | `start_date < end_date`, Saturday working rule |
| 5 | `batches` | Student cohorts (e.g., CSE 2026 Sec B) | Scoped to campus, track, and semester |
| 6 | `subjects` | Master course catalog (CS201, CS202, etc.) | Unique code, total planned hours |
| 7 | `batch_subjects` | Campus cohort subject enrollment | Junction between `batches` and `subjects` |
| 8 | `calendar_events` | Holidays, institutional events, blackouts | Temporal range check, instructional flag |
| 9 | `exam_windows` | Sessional 1, Mid-Term, PUT, End-Term | `start_date <= end_date`, weightage check |
| 10 | `faculty_assignments` | Primary & visiting faculty assignments | Composite PK `(faculty_id, batch_subject_id)` |
| 11 | `timetable_slots` | Recurring weekly scheduled slots | `day_of_week` (1-6), `start_time < end_time` |
| 12 | `syllabus_units` | High-level curriculum chapters | Ordered sequence per subject |
| 13 | `syllabus_topics` | Granular lecture topics | Status, progress %, planned hours, position |
| 14 | `topic_exam_scopes` | Exam coverage mapping | Links syllabus topic to exam window |
| 15 | `scheduled_sessions` | Expected timetable class occurrences | Generated duration, occurrence status |
| 16 | `session_logs` | Actual class delivery record | **Canonical log constraint**: `scheduled_session_id UNIQUE` |
| 17 | `session_log_topics` | Topic progress updates from a session | Progress after session, auditable |
| 18 | `notification_events` | Missed log reminders & schedule alerts | Read receipts, JSONB payload |
| 19 | `app_settings` | Campus-level configuration & thresholds | JSONB setting values |
| 20 | `audit_logs` | Immutable audit trail for corrections | Trigger-populated on modifications |

---

## 2. Security & Row Level Security (RLS)

All 20 tables have `ROW LEVEL SECURITY` enabled. Access is governed by database-level security policies and PostgreSQL helper functions:

1. **Anti-Privilege Escalation (`trg_protect_profile_privilege_escalation`)**:
   - Ordinary users can update their own display name or avatar, but an attempt by a non-admin to modify their own `role`, `campus_id`, or `batch_id` is blocked with an exception.
2. **Platform Admins**:
   - Unrestricted read/write access platform-wide.
3. **Campus Managers**:
   - Scoped strictly to their assigned `campus_id`. Cannot inspect or alter data belonging to other campuses.
4. **Faculty**:
   - Can read campus subjects and timetable.
   - Can record session logs and update topic progress **only for subjects to which they are assigned** in `faculty_assignments`.
5. **Students**:
   - Strictly read-only access limited to their own enrolled batch (`batch_id`).
   - Blocked from reading audit logs, platform app settings, and modifying sessions or syllabi.

---

## 3. Migration Sequence

The database migrations are located in `supabase/migrations/`:

```
supabase/migrations/
├── 00001_production_schema.sql         # Table DDL, UUIDs, Checks, Foreign Keys, Generated Columns
├── 00002_row_level_security.sql         # RLS Policies, RBAC Helpers, Anti-Escalation Triggers
└── 00003_indexes_and_optimizations.sql  # High-performance indexes & Audit log triggers
```

And the seed dataset:
```
supabase/seed/
└── seed.sql                             # Comprehensive MSOT seed covering all 20 tables
```

### Option A: Using the Supabase CLI (Recommended)

1. **Install and log in to Supabase CLI**:
   ```bash
   npx supabase login
   ```

2. **Link to your remote project**:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

3. **Push all migrations**:
   ```bash
   npx supabase db push
   ```

4. **Apply seed data**:
   ```bash
   npx supabase db reset   # Or execute seed.sql directly
   ```

### Option B: Using the Supabase Web Dashboard SQL Editor

If executing migrations manually in the Supabase Dashboard:

1. Open your project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** > **New Query**.
3. Execute the migration scripts in the exact numerical order:
   1. Paste and run `supabase/migrations/00001_production_schema.sql`
   2. Paste and run `supabase/migrations/00002_row_level_security.sql`
   3. Paste and run `supabase/migrations/00003_indexes_and_optimizations.sql`
4. Paste and run `supabase/seed/seed.sql` to populate the initial MSOT dataset.

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Populate the required credentials from your Supabase Dashboard (**Project Settings** > **API**):

```ini
# Supabase PostgreSQL & Auth Credentials
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...<your-anon-key>

# Server-Side Only Service Role Key (NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...<your-service-role-key>

# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Honest Connection Verification

In accordance with product principles, **Prospectus never shows fake connection badges or misleading status indicators**.

- When `NEXT_PUBLIC_SUPABASE_URL` is unconfigured or credentials are placeholder values, the platform explicitly reports:
  - `Provider`: `isolated_development_fallback`
  - `Status`: `Unlinked` with an onboarding checklist.
- When valid credentials are provided, `verifyDatabaseConnection()` performs an actual live read query (`SELECT id FROM campuses LIMIT 1`) against PostgreSQL before declaring the database connected.
- All unit and security tests run against isolated mock stores with identical schema validation constraints (`src/validation/database.ts`).

---

## 6. Running Security & Constraint Tests

Run the complete Vitest test suite to verify schema constraints, role isolation, and canonical logging rules:

```bash
npm test
```

Expected output:
```
✓ tests/unit/calculation-engine.test.ts (16 tests)
✓ tests/unit/database-security.test.ts (11 tests)
Test Files  2 passed (2)
Tests  27 passed (27)
```
