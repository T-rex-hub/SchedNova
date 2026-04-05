-- Sample seed data for SchedNova
-- Use this with the schema created by backend/models.py (the FastAPI app does this via create_all).
--
-- Before running:
-- 1. Replace PUT_YOUR_USER_ID_HERE with the user_id of the account you use in the app.
-- 2. Run this in PostgreSQL / Supabase SQL editor.
--
-- This inserts:
-- - 1 department
-- - 2 batches
-- - 3 subjects
-- - 3 teachers
-- - 2 rooms
-- - 15 timeslots (Mon-Fri, 3 slots each)
--
-- The dataset is intentionally small but feasible for timetable generation.

DO $$
DECLARE
    uid VARCHAR(36) := 'PUT_YOUR_USER_ID_HERE';

    dept_id INT;

    batch_a_id INT;
    batch_b_id INT;

    math_id INT;
    eng_id INT;
    lab_id INT;

    t_math_id INT;
    t_eng_id INT;
    t_lab_id INT;
BEGIN
    IF uid = 'PUT_YOUR_USER_ID_HERE' THEN
        RAISE EXCEPTION 'Replace PUT_YOUR_USER_ID_HERE with your real users.user_id before running this script.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE user_id = uid
    ) THEN
        RAISE EXCEPTION 'User % was not found in the users table.', uid;
    END IF;

    -- The current app reads from subject_room_types during solve.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'subject_room_types'
    ) THEN
        EXECUTE '
            CREATE TABLE subject_room_types (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
                room_type VARCHAR(100) NOT NULL,
                classes_per_week INTEGER NOT NULL
            )
        ';
    END IF;

    INSERT INTO departments (user_id, department_name)
    VALUES (uid, 'Demo CSE')
    RETURNING department_id INTO dept_id;

    INSERT INTO classrooms (user_id, room_code, classroom_type)
    VALUES
        (uid, 'LH-101', 'lecture_hall'),
        (uid, 'LAB-201', 'laboratory');

    INSERT INTO batches (user_id, department_id, batch_name)
    VALUES (uid, dept_id, 'CSE-A')
    RETURNING batch_id INTO batch_a_id;

    INSERT INTO batches (user_id, department_id, batch_name)
    VALUES (uid, dept_id, 'CSE-B')
    RETURNING batch_id INTO batch_b_id;

    INSERT INTO subjects (
        user_id,
        department_id,
        subject_name,
        course_code,
        duration,
        max_lectures_per_day,
        credits,
        semester,
        is_elective
    )
    VALUES (
        uid,
        dept_id,
        'Mathematics',
        'MATH101',
        1,
        1,
        4,
        1,
        FALSE
    )
    RETURNING subject_id INTO math_id;

    INSERT INTO subjects (
        user_id,
        department_id,
        subject_name,
        course_code,
        duration,
        max_lectures_per_day,
        credits,
        semester,
        is_elective
    )
    VALUES (
        uid,
        dept_id,
        'English',
        'ENG101',
        1,
        1,
        2,
        1,
        FALSE
    )
    RETURNING subject_id INTO eng_id;

    INSERT INTO subjects (
        user_id,
        department_id,
        subject_name,
        course_code,
        duration,
        max_lectures_per_day,
        credits,
        semester,
        is_elective
    )
    VALUES (
        uid,
        dept_id,
        'Programming Lab',
        'CSL101',
        1,
        1,
        2,
        1,
        FALSE
    )
    RETURNING subject_id INTO lab_id;

    INSERT INTO subject_room_types (subject_id, room_type, classes_per_week)
    VALUES
        (math_id, 'lecture_hall', 3),
        (eng_id, 'lecture_hall', 2),
        (lab_id, 'laboratory', 2);

    INSERT INTO teachers (user_id, teacher_name, availability_time_slots)
    VALUES (uid, 'Dr. Mehta', NULL)
    RETURNING teacher_id INTO t_math_id;

    INSERT INTO teachers (user_id, teacher_name, availability_time_slots)
    VALUES (uid, 'Prof. Rao', NULL)
    RETURNING teacher_id INTO t_eng_id;

    INSERT INTO teachers (user_id, teacher_name, availability_time_slots)
    VALUES (uid, 'Ms. Nair', NULL)
    RETURNING teacher_id INTO t_lab_id;

    INSERT INTO teacher_subjects (teacher_id, subject_id)
    VALUES
        (t_math_id, math_id),
        (t_eng_id, eng_id),
        (t_lab_id, lab_id);

    INSERT INTO batch_subjects (batch_id, subject_id, classes_per_week)
    VALUES
        (batch_a_id, math_id, 3),
        (batch_a_id, eng_id, 2),
        (batch_a_id, lab_id, 2),
        (batch_b_id, math_id, 3),
        (batch_b_id, eng_id, 2),
        (batch_b_id, lab_id, 2);

    -- Insert 5 days x 3 slots.
    -- This supports both enum variants found in the repo:
    -- models.py -> Monday/Tuesday/...
    -- db.sql     -> Mon/Tue/...
    IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'day_enum'
          AND e.enumlabel = 'Monday'
    ) THEN
        INSERT INTO timeslots (user_id, day_of_week, slot_number, start_time, end_time)
        VALUES
            (uid, 'Monday', 1, '09:00', '10:00'),
            (uid, 'Monday', 2, '10:00', '11:00'),
            (uid, 'Monday', 3, '11:15', '12:15'),
            (uid, 'Tuesday', 1, '09:00', '10:00'),
            (uid, 'Tuesday', 2, '10:00', '11:00'),
            (uid, 'Tuesday', 3, '11:15', '12:15'),
            (uid, 'Wednesday', 1, '09:00', '10:00'),
            (uid, 'Wednesday', 2, '10:00', '11:00'),
            (uid, 'Wednesday', 3, '11:15', '12:15'),
            (uid, 'Thursday', 1, '09:00', '10:00'),
            (uid, 'Thursday', 2, '10:00', '11:00'),
            (uid, 'Thursday', 3, '11:15', '12:15'),
            (uid, 'Friday', 1, '09:00', '10:00'),
            (uid, 'Friday', 2, '10:00', '11:00'),
            (uid, 'Friday', 3, '11:15', '12:15');
    ELSE
        INSERT INTO timeslots (user_id, day_of_week, slot_number, start_time, end_time)
        VALUES
            (uid, 'Mon', 1, '09:00', '10:00'),
            (uid, 'Mon', 2, '10:00', '11:00'),
            (uid, 'Mon', 3, '11:15', '12:15'),
            (uid, 'Tue', 1, '09:00', '10:00'),
            (uid, 'Tue', 2, '10:00', '11:00'),
            (uid, 'Tue', 3, '11:15', '12:15'),
            (uid, 'Wed', 1, '09:00', '10:00'),
            (uid, 'Wed', 2, '10:00', '11:00'),
            (uid, 'Wed', 3, '11:15', '12:15'),
            (uid, 'Thu', 1, '09:00', '10:00'),
            (uid, 'Thu', 2, '10:00', '11:00'),
            (uid, 'Thu', 3, '11:15', '12:15'),
            (uid, 'Fri', 1, '09:00', '10:00'),
            (uid, 'Fri', 2, '10:00', '11:00'),
            (uid, 'Fri', 3, '11:15', '12:15');
    END IF;
END $$;

-- Helpful check queries after seeding
SELECT user_id, username, email
FROM users
ORDER BY username;

SELECT department_id, department_name
FROM departments
WHERE user_id = 'PUT_YOUR_USER_ID_HERE';

SELECT batch_id, batch_name
FROM batches
WHERE user_id = 'PUT_YOUR_USER_ID_HERE'
ORDER BY batch_id;

SELECT teacher_id, teacher_name
FROM teachers
WHERE user_id = 'PUT_YOUR_USER_ID_HERE'
ORDER BY teacher_id;
