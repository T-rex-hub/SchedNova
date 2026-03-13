CREATE DATABASE IF NOT EXISTS mydatabase;
USE mydatabase;

/*
DROP TABLE IF EXISTS fixed_group_batches;
DROP TABLE IF EXISTS fixed_groups;
DROP TABLE IF EXISTS batch_subjects;
DROP TABLE IF EXISTS teacher_subjects;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS classrooms;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;
*/


CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    pass_word VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20)
);


CREATE TABLE departments (
  department_id INT PK,
  user_id VARCHAR(20) NULL,
  department_name VARCHAR(255),
  created_at TIMESTAMP,
  UNIQUE (user_id, department_name)
);


CREATE TABLE classrooms (
    classroom_code VARCHAR(20) PRIMARY KEY,
    classroom_type ENUM('lecture_hall', 'laboratory', 'seminar_room', 'auditorium') DEFAULT 'lecture_hall'
);


CREATE TABLE batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    batch_number VARCHAR(20) NOT NULL UNIQUE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);


CREATE TABLE subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36),
    department_id INT NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    room_type VARCHAR(100),
    classes_per_week INT NOT NULL,
    duration INT DEFAULT 1,
    max_lectures_per_day INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    UNIQUE (department_id, subject_name)
);

CREATE TABLE teachers (
    teacher_id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    availability_time_slots JSON,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE
);


CREATE TABLE teacher_subjects (
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    PRIMARY KEY (teacher_id, subject_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);


CREATE TABLE batch_subjects (
    batch_id INT NOT NULL,
    subject_id INT NOT NULL,
    classes_per_week INT NOT NULL,
    PRIMARY KEY (batch_id, subject_id),
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);


CREATE TABLE fixed_groups (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);

CREATE TABLE fixed_group_batches (
    group_id INT NOT NULL,
    batch_id INT NOT NULL,
    PRIMARY KEY (group_id, batch_id),
    FOREIGN KEY (group_id) REFERENCES fixed_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
);