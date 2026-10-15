-- ==============================================================================
-- Prospectus Academic SaaS - Production-Oriented Seed Dataset: seed.sql
-- Covers all 20 normalized tables for MSOT across 4 Campuses & 2 Tracks
-- ==============================================================================

-- 1. CAMPUSES
INSERT INTO public.campuses (id, name, code, location, timezone, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'HI-Tech Institute', 'HITECH', 'Ghaziabad, NCR', 'Asia/Kolkata', true),
('22222222-2222-2222-2222-222222222222', 'Ratnam Institute', 'RATNAM', 'Bhopal, MP', 'Asia/Kolkata', true),
('33333333-3333-3333-3333-333333333333', 'RGIB', 'RGIB', 'Indore, MP', 'Asia/Kolkata', true),
('44444444-4444-4444-4444-444444444444', 'JUJ Campus', 'JUJ', 'Jaipur, Rajasthan', 'Asia/Kolkata', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 2. ACADEMIC_TRACKS
INSERT INTO public.academic_tracks (id, name, code, description, color_hex) VALUES
('aaaaaaaa-1111-1111-1111-111111111111', 'Mirai Track', 'MIRAI', 'Accelerated industry immersion curriculum', '#4965E8'),
('aaaaaaaa-2222-2222-2222-222222222222', 'University Track', 'UNIV', 'Standard state university curriculum scheme', '#8878F5')
ON CONFLICT (code) DO NOTHING;

-- 3. SEMESTERS
INSERT INTO public.semesters (id, campus_id, name, academic_year, start_date, end_date, saturday_rule, is_current) VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Fall Semester 2026', '2026-2027', '2026-08-01', '2026-12-15', 'SECOND_FOURTH', true)
ON CONFLICT (id) DO NOTHING;

-- 4. BATCHES
INSERT INTO public.batches (id, campus_id, track_id, semester_id, name, section, intake_year, student_count) VALUES
('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'CSE 2026 Sec B', 'B', 2026, 64),
('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'CSE 2026 Sec A', 'A', 2026, 60)
ON CONFLICT (id) DO NOTHING;

-- 5. PROFILES (Mock or Initial Auth Users)
-- In Supabase, auth.users records should be present or created via auth.admin.createUser
-- For standalone SQL seeding, we insert into profiles (or auth.users if available)
INSERT INTO public.profiles (id, email, full_name, role, is_visiting_faculty, campus_id, batch_id, department) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@msot.org', 'Dr. Rajesh Academic Admin', 'admin', false, NULL, NULL, 'Academic Directorate'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cm.hitech@msot.org', 'Prof. Arvind Kumar', 'campus_manager', false, '11111111-1111-1111-1111-111111111111', NULL, 'Campus Management'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sharma.faculty@msot.org', 'Dr. Neha Sharma', 'faculty', false, '11111111-1111-1111-1111-111111111111', NULL, 'CSE'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'verma.faculty@msot.org', 'Prof. Rahul Verma', 'faculty', true, '11111111-1111-1111-1111-111111111111', NULL, 'CSE'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'student.aryan@msot.org', 'Aryan Gupta', 'student', false, '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771', 'CSE')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 6. SUBJECTS
INSERT INTO public.subjects (id, code, name, department, credit_hours, total_planned_hours, syllabus_version) VALUES
('88888888-8888-8888-8888-888888888881', 'CS201', 'Data Structures & Algorithms', 'CSE', 4, 48.00, 'v1.0'),
('88888888-8888-8888-8888-888888888882', 'CS202', 'Operating Systems', 'CSE', 4, 42.00, 'v1.0'),
('88888888-8888-8888-8888-888888888883', 'CS203', 'Computer Organization & Architecture', 'CSE', 3, 36.00, 'v1.0'),
('88888888-8888-8888-8888-888888888884', 'MA201', 'Discrete Mathematics', 'Mathematics', 4, 45.00, 'v1.0')
ON CONFLICT (code) DO NOTHING;

-- 7. BATCH_SUBJECTS
INSERT INTO public.batch_subjects (id, batch_id, subject_id, target_finish_date, is_active) VALUES
('99999999-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', '2026-12-05', true),
('99999999-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888882', '2026-12-08', true)
ON CONFLICT (id) DO NOTHING;

-- 8. FACULTY_ASSIGNMENTS
INSERT INTO public.faculty_assignments (faculty_id, batch_subject_id, is_primary, is_visiting) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-1111-1111-1111-111111111111', true, false),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-2222-2222-2222-222222222222', true, true)
ON CONFLICT (faculty_id, batch_subject_id) DO NOTHING;

-- 9. CALENDAR_EVENTS
INSERT INTO public.calendar_events (semester_id, campus_id, title, event_type, start_date, end_date, is_instructional, description) VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Independence Day', 'HOLIDAY', '2026-08-15', '2026-08-15', false, 'National Holiday'),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Gandhi Jayanti', 'HOLIDAY', '2026-10-02', '2026-10-02', false, 'National Holiday'),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Dussehra Holiday', 'HOLIDAY', '2026-10-20', '2026-10-20', false, 'Institutional Holiday'),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Diwali Recess', 'HOLIDAY', '2026-11-08', '2026-11-11', false, 'Festival Break')
ON CONFLICT DO NOTHING;

-- 10. EXAM_WINDOWS
INSERT INTO public.exam_windows (id, semester_id, name, exam_type, start_date, end_date, weightage_percent) VALUES
('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555555', 'Sessional Exam 1', 'SESSIONAL', '2026-09-21', '2026-09-26', 15.0),
('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555555', 'Mid-Term Examination', 'MID_TERM', '2026-10-21', '2026-10-28', 25.0),
('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555555', 'Pre-University Test (PUT)', 'PUT', '2026-11-23', '2026-11-28', 20.0),
('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555555', 'End-Term Examination', 'END_TERM', '2026-12-16', '2026-12-30', 40.0)
ON CONFLICT (id) DO NOTHING;

-- 11. TIMETABLE_SLOTS
INSERT INTO public.timetable_slots (id, batch_subject_id, faculty_id, day_of_week, start_time, end_time, room) VALUES
('c0000001-1111-1111-1111-111111111111', '99999999-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, '10:00:00', '11:30:00', 'Lab 3'),
('c0000001-1111-1111-1111-111111111112', '99999999-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 3, '10:00:00', '11:30:00', 'Lab 3'),
('c0000001-1111-1111-1111-111111111113', '99999999-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, '10:00:00', '11:30:00', 'Lab 3'),
('c0000001-1111-1111-1111-111111111114', '99999999-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, '09:00:00', '10:30:00', 'Room 204'),
('c0000001-1111-1111-1111-111111111115', '99999999-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 4, '09:00:00', '10:30:00', 'Room 204')
ON CONFLICT (id) DO NOTHING;

-- 12. SYLLABUS_UNITS (CS201)
INSERT INTO public.syllabus_units (id, subject_id, unit_number, title, planned_hours) VALUES
('a0000001-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888881', 1, 'Introduction to Data Structures & Analysis', 9.00),
('a0000001-1111-1111-1111-111111111112', '88888888-8888-8888-8888-888888888881', 2, 'Stacks, Queues and Linear Lists', 9.00),
('a0000001-1111-1111-1111-111111111113', '88888888-8888-8888-8888-888888888881', 3, 'Non-linear Data Structures: Trees & BSTs', 10.00),
('a0000001-1111-1111-1111-111111111114', '88888888-8888-8888-8888-888888888881', 4, 'Graphs & Shortest Path Algorithms', 10.00),
('a0000001-1111-1111-1111-111111111115', '88888888-8888-8888-8888-888888888881', 5, 'Sorting, Searching and Dynamic Programming', 10.00)
ON CONFLICT (id) DO NOTHING;

-- 13. SYLLABUS_TOPICS (CS201)
INSERT INTO public.syllabus_topics (id, unit_id, subject_id, sequence_order, title, planned_hours, status, percent_complete, planned_date, actual_completed_date) VALUES
('b0000001-1111-1111-1111-111111111101', 'a0000001-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888881', 1, 'Asymptotic Notation, Big-O Analysis & Recurrence', 1.50, 'COMPLETED', 100.00, '2026-08-03', '2026-08-03'),
('b0000001-1111-1111-1111-111111111102', 'a0000001-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888881', 2, 'Dynamic Arrays, Memory Representation & Pointer Arithmetic', 1.50, 'COMPLETED', 100.00, '2026-08-05', '2026-08-05'),
('b0000001-1111-1111-1111-111111111103', 'a0000001-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888881', 3, 'Singly, Doubly and Circular Linked Lists', 1.50, 'IN_PROGRESS', 60.00, '2026-08-07', NULL),
('b0000001-1111-1111-1111-111111111104', 'a0000001-1111-1111-1111-111111111112', '88888888-8888-8888-8888-888888888881', 4, 'Stack Implementations & Expression Evaluation', 1.50, 'NOT_STARTED', 0.00, '2026-08-10', NULL),
('b0000001-1111-1111-1111-111111111105', 'a0000001-1111-1111-1111-111111111112', '88888888-8888-8888-8888-888888888881', 5, 'Queue Architectures: Linear, Circular & Deque', 1.50, 'NOT_STARTED', 0.00, '2026-08-12', NULL)
ON CONFLICT (id) DO NOTHING;

-- 14. TOPIC_EXAM_SCOPES
INSERT INTO public.topic_exam_scopes (topic_id, exam_window_id, exam_type) VALUES
('b0000001-1111-1111-1111-111111111101', '66666666-6666-6666-6666-666666666661', 'SESSIONAL'),
('b0000001-1111-1111-1111-111111111101', '66666666-6666-6666-6666-666666666662', 'MID_TERM'),
('b0000001-1111-1111-1111-111111111102', '66666666-6666-6666-6666-666666666661', 'SESSIONAL'),
('b0000001-1111-1111-1111-111111111102', '66666666-6666-6666-6666-666666666662', 'MID_TERM'),
('b0000001-1111-1111-1111-111111111103', '66666666-6666-6666-6666-666666666661', 'SESSIONAL'),
('b0000001-1111-1111-1111-111111111103', '66666666-6666-6666-6666-666666666662', 'MID_TERM'),
('b0000001-1111-1111-1111-111111111104', '66666666-6666-6666-6666-666666666662', 'MID_TERM'),
('b0000001-1111-1111-1111-111111111105', '66666666-6666-6666-6666-666666666662', 'MID_TERM')
ON CONFLICT (topic_id, exam_type) DO NOTHING;

-- 15. SCHEDULED_SESSIONS
INSERT INTO public.scheduled_sessions (id, batch_subject_id, timetable_slot_id, faculty_id, session_date, start_time, end_time, occurrence_status) VALUES
('d0000001-1111-1111-1111-111111111101', '99999999-1111-1111-1111-111111111111', 'c0000001-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-08-03', '10:00:00', '11:30:00', 'COMPLETED'),
('d0000001-1111-1111-1111-111111111102', '99999999-1111-1111-1111-111111111111', 'c0000001-1111-1111-1111-111111111112', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-08-05', '10:00:00', '11:30:00', 'COMPLETED'),
('d0000001-1111-1111-1111-111111111103', '99999999-1111-1111-1111-111111111111', 'c0000001-1111-1111-1111-111111111113', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-08-07', '10:00:00', '11:30:00', 'SCHEDULED')
ON CONFLICT (id) DO NOTHING;

-- 16. SESSION_LOGS (Enforcing at most one canonical log per scheduled occurrence)
INSERT INTO public.session_logs (id, scheduled_session_id, batch_subject_id, faculty_id, session_date, actual_start_time, actual_end_time, delivery_status, covered_summary, classwork_status, homework_status, is_verified) VALUES
('e0000001-1111-1111-1111-111111111101', 'd0000001-1111-1111-1111-111111111101', '99999999-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-08-03', '10:00:00', '11:30:00', 'COMPLETED', 'Covered Big-O complexity and master theorem proofs', 'ASSIGNED', 'ASSIGNED', true),
('e0000001-1111-1111-1111-111111111102', 'd0000001-1111-1111-1111-111111111102', '99999999-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-08-05', '10:00:00', '11:30:00', 'COMPLETED', 'Dynamic array memory expansion and 2D arrays row-major indexing', 'COLLECTED', 'REVIEWED', true)
ON CONFLICT (scheduled_session_id) DO NOTHING;

-- 17. SESSION_LOG_TOPICS (Traceable per-topic progress)
INSERT INTO public.session_log_topics (session_log_id, topic_id, percent_complete_after, topic_status_after, notes) VALUES
('e0000001-1111-1111-1111-111111111101', 'b0000001-1111-1111-1111-111111111101', 100.00, 'COMPLETED', 'Fully completed asymptotic analysis theory and practice problems'),
('e0000001-1111-1111-1111-111111111102', 'b0000001-1111-1111-1111-111111111102', 100.00, 'COMPLETED', 'Completed array pointers and memory mapping exercises')
ON CONFLICT (session_log_id, topic_id) DO NOTHING;

-- 18. NOTIFICATION_EVENTS
INSERT INTO public.notification_events (id, recipient_id, event_type, scheduled_session_id, title, message, payload, is_read) VALUES
('f0000001-1111-1111-1111-111111111101', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'MISSED_LOG_REMINDER', 'd0000001-1111-1111-1111-111111111103', 'Session Confirmation Pending', 'Please confirm your teaching session for Data Structures & Algorithms held today.', '{"subjectCode": "CS201", "hoursDelayed": 2}'::jsonb, false)
ON CONFLICT (id) DO NOTHING;

-- 19. APP_SETTINGS
INSERT INTO public.app_settings (campus_id, setting_key, setting_value, description) VALUES
('11111111-1111-1111-1111-111111111111', 'pace_thresholds', '{"onTrackMin": 1.15, "tightMin": 1.00}'::jsonb, 'Buffer ratio thresholds for ON TRACK, TIGHT, and DANGER statuses'),
('11111111-1111-1111-1111-111111111111', 'saturday_policy', '{"rule": "SECOND_FOURTH", "workingIndex": [2, 4]}'::jsonb, 'Campus policy on instructional Saturdays')
ON CONFLICT (campus_id, setting_key) DO NOTHING;

-- 20. AUDIT_LOGS
INSERT INTO public.audit_logs (table_name, record_id, action, changed_by, new_values) VALUES
('session_logs', 'e0000001-1111-1111-1111-111111111101', 'INSERT', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"delivery_status": "COMPLETED", "duration_minutes": 90}'::jsonb)
ON CONFLICT (id) DO NOTHING;
