-- ==============================================================================
-- Prospectus Academic SaaS - Seed Data: seed.sql
-- Separate from production data. Covers 4 MSOT campuses, 2 tracks, full semester.
-- ==============================================================================

-- 1. Campuses
INSERT INTO public.campuses (id, name, code, location) VALUES
('11111111-1111-1111-1111-111111111111', 'HI-Tech Institute', 'HITECH', 'Ghaziabad, NCR'),
('22222222-2222-2222-2222-222222222222', 'Ratnam Institute', 'RATNAM', 'Bhopal, MP'),
('33333333-3333-3333-3333-333333333333', 'RGIB', 'RGIB', 'Indore, MP'),
('44444444-4444-4444-4444-444444444444', 'JUJ Campus', 'JUJ', 'Jaipur, Rajasthan')
ON CONFLICT (name) DO NOTHING;

-- 2. User Profiles (Mock Auth Users)
INSERT INTO public.user_profiles (id, email, full_name, role, campus_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@msot.org', 'Dr. Rajesh Academic Admin', 'admin', NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cm.hitech@msot.org', 'Prof. Arvind Kumar (CM)', 'campus_manager', '11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sharma.faculty@msot.org', 'Dr. Neha Sharma', 'faculty', '11111111-1111-1111-1111-111111111111'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'verma.faculty@msot.org', 'Prof. Rahul Verma', 'faculty', '11111111-1111-1111-1111-111111111111'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'student.aryan@msot.org', 'Aryan Gupta', 'student', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (email) DO NOTHING;

-- 3. Semesters
INSERT INTO public.semesters (id, campus_id, name, academic_year, start_date, end_date, saturday_rule) VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Fall Semester 2026', '2026-2027', '2026-08-01', '2026-12-15', 'SECOND_FOURTH')
ON CONFLICT DO NOTHING;

-- 4. Calendar Holidays
INSERT INTO public.calendar_holidays (semester_id, holiday_date, name, is_instructional) VALUES
('55555555-5555-5555-5555-555555555555', '2026-08-15', 'Independence Day', false),
('55555555-5555-5555-5555-555555555555', '2026-10-02', 'Gandhi Jayanti', false),
('55555555-5555-5555-5555-555555555555', '2026-10-20', 'Dussehra', false),
('55555555-5555-5555-5555-555555555555', '2026-11-08', 'Diwali Break Day 1', false),
('55555555-5555-5555-5555-555555555555', '2026-11-09', 'Diwali Break Day 2', false)
ON CONFLICT DO NOTHING;

-- 5. Exam Windows
INSERT INTO public.exam_windows (id, semester_id, name, exam_type, start_date, end_date) VALUES
('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555555', 'Sessional Exam 1', 'SESSIONAL', '2026-09-21', '2026-09-26'),
('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555555', 'Mid-Term Examination', 'MID_TERM', '2026-10-21', '2026-10-28'),
('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555555', 'Pre-University Test (PUT)', 'PUT', '2026-11-23', '2026-11-28'),
('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555555', 'End-Term Examination', 'END_TERM', '2026-12-16', '2026-12-30')
ON CONFLICT DO NOTHING;

-- 6. Batches
INSERT INTO public.batches (id, campus_id, semester_id, name, track) VALUES
('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'CSE 2026 Sec B', 'Mirai Track'),
('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'CSE 2026 Sec A', 'University Track')
ON CONFLICT DO NOTHING;

-- Link student to batch
UPDATE public.user_profiles SET batch_id = '77777777-7777-7777-7777-777777777771' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- 7. Subjects
INSERT INTO public.subjects (id, batch_id, code, name, faculty_id, target_finish_date, total_planned_hours) VALUES
('88888888-8888-8888-8888-888888888881', '77777777-7777-7777-7777-777777777771', 'CS201', 'Data Structures & Algorithms', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-12-05', 48.00),
('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777771', 'CS202', 'Operating Systems', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-12-08', 42.00)
ON CONFLICT DO NOTHING;

-- 8. Timetable Slots (Mon, Wed, Fri 10:00-11:30 = 1.5h each for CS201)
INSERT INTO public.timetable_slots (batch_id, subject_id, faculty_id, day_of_week, start_time, end_time, duration_hours) VALUES
('77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, '10:00', '11:30', 1.50),
('77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 3, '10:00', '11:30', 1.50),
('77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888881', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, '10:00', '11:30', 1.50),
('77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888882', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, '09:00', '10:30', 1.50),
('77777777-7777-7777-7777-777777777771', '88888888-8888-8888-8888-888888888882', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 4, '09:00', '10:30', 1.50)
ON CONFLICT DO NOTHING;

-- 9. Sample Syllabus Topics for CS201
INSERT INTO public.topics (id, subject_id, unit_number, unit_title, sequence_order, title, planned_hours, in_scope_for_exams, status, percent_complete, planned_date) VALUES
('99999999-9999-9999-9999-999999999901', '88888888-8888-8888-8888-888888888881', 1, 'Unit 1: Introduction to DSA', 1, 'Time & Space Complexity Big-O', 1.50, ARRAY['SESSIONAL', 'MID_TERM', 'PUT', 'END_TERM']::exam_type_enum[], 'COMPLETED', 100.00, '2026-08-03'),
('99999999-9999-9999-9999-999999999902', '88888888-8888-8888-8888-888888888881', 1, 'Unit 1: Introduction to DSA', 2, 'Arrays & Multi-dimensional Memory Representation', 1.50, ARRAY['SESSIONAL', 'MID_TERM', 'PUT', 'END_TERM']::exam_type_enum[], 'COMPLETED', 100.00, '2026-08-05'),
('99999999-9999-9999-9999-999999999903', '88888888-8888-8888-8888-888888888881', 1, 'Unit 1: Introduction to DSA', 3, 'Singly & Doubly Linked Lists', 1.50, ARRAY['SESSIONAL', 'MID_TERM', 'PUT', 'END_TERM']::exam_type_enum[], 'IN_PROGRESS', 75.00, '2026-08-07'),
('99999999-9999-9999-9999-999999999904', '88888888-8888-8888-8888-888888888881', 2, 'Unit 2: Stacks & Queues', 4, 'Stack Applications & Infix to Postfix', 1.50, ARRAY['MID_TERM', 'PUT', 'END_TERM']::exam_type_enum[], 'IN_PROGRESS', 0.00, '2026-08-10')
ON CONFLICT DO NOTHING;
