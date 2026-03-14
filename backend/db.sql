-- PostgreSQL schema aligned with backend/models.py
-- Create the database in Supabase separately; do not run CREATE DATABASE/USE here.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_enum') THEN
        CREATE TYPE day_enum AS ENUM ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'classroom_type_enum') THEN
        CREATE TYPE classroom_type_enum AS ENUM (
            'lecture_hall',
            'laboratory',
            'seminar_room',
            'auditorium'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    pass_word VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    department_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classrooms (
    classroom_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    room_code VARCHAR(20) NOT NULL,
    classroom_type classroom_type_enum DEFAULT 'lecture_hall'
);

CREATE TABLE IF NOT EXISTS batches (
    batch_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE CASCADE,
    batch_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    subject_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE SET NULL,
    department_id INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    subject_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    room_type VARCHAR(100),
    classes_per_week INTEGER NOT NULL,
    duration INTEGER DEFAULT 1,
    max_lectures_per_day INTEGER DEFAULT 2,
    credits INTEGER DEFAULT 3,
    semester INTEGER,
    is_elective BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS teachers (
    teacher_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    teacher_name VARCHAR(255),
    availability_time_slots JSONB
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id INTEGER NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS batch_subjects (
    batch_id INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    classes_per_week INTEGER NOT NULL,
    PRIMARY KEY (batch_id, subject_id)
);

CREATE TABLE IF NOT EXISTS fixed_groups (
    group_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    group_size INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fixed_group_batches (
    group_id INTEGER NOT NULL REFERENCES fixed_groups(group_id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, batch_id)
);

CREATE TABLE IF NOT EXISTS timeslots (
    timeslot_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    day_of_week day_enum NOT NULL,
    slot_number INTEGER NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS timetables (
    timetable_id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP,
    data JSONB NOT NULL
);
