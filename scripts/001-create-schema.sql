-- =======================================
-- BIOLOGY EXAM SYSTEM DATABASE SCHEMA
-- =======================================

-- 1. SUBJECTS (Fanlar)
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. SECTIONS (Bo'limlar)
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    task_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. QUESTION TYPES (Y1, Y2, O1, O2)
CREATE TABLE IF NOT EXISTS question_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    description VARCHAR(255)
);

-- Insert default question types
INSERT INTO question_types (code, description) VALUES
    ('Y1', 'Multiple choice - single correct answer'),
    ('Y2', 'Matching type question'),
    ('O1', 'Short text answer'),
    ('O2', 'Extended response with image upload')
ON CONFLICT (code) DO NOTHING;

-- 4. QUESTIONS (Topshiriqlar)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    section_id INT REFERENCES sections(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_type_id INT REFERENCES question_types(id),
    text TEXT NOT NULL,
    options JSONB,
    correct_answer VARCHAR(500),
    max_score NUMERIC(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. EXAMS (Test sessiya)
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    test_duration INT DEFAULT 100,
    written_duration INT DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. EXAM QUESTION MAP
CREATE TABLE IF NOT EXISTS exam_questions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
    question_id INT REFERENCES questions(id) ON DELETE CASCADE,
    position INT NOT NULL
);

-- 7. STUDENTS (O'quvchilar)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(100),
    full_name VARCHAR(255) NOT NULL,
    grade_level INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. TEST CODES
CREATE TABLE IF NOT EXISTS test_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
    max_attempts INT DEFAULT 1,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. STUDENT EXAM ATTEMPTS
CREATE TABLE IF NOT EXISTS student_attempts (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
    code_used VARCHAR(20),
    status VARCHAR(20) DEFAULT 'in_progress',
    part1_started_at TIMESTAMP,
    part1_finished_at TIMESTAMP,
    part2_started_at TIMESTAMP,
    part2_finished_at TIMESTAMP,
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    total_score NUMERIC(10,2),
    rasch_score NUMERIC(10,6)
);

-- 10. STUDENT ANSWERS
CREATE TABLE IF NOT EXISTS student_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INT REFERENCES student_attempts(id) ON DELETE CASCADE,
    question_id INT REFERENCES questions(id) ON DELETE CASCADE,
    answer TEXT,
    image_urls JSONB,
    is_correct BOOLEAN,
    score NUMERIC(5,2),
    teacher_score NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- 11. RASCH PARAMETERS
CREATE TABLE IF NOT EXISTS rasch_item_difficulty (
    question_id INT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    beta NUMERIC(10,6) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rasch_student_ability (
    student_id INT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    theta NUMERIC(10,6) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_codes_code ON test_codes(code);
