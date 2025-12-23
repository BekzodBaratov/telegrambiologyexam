-- Add database indexes for performance optimization

-- Index for attempts queries (most common admin query)
CREATE INDEX IF NOT EXISTS idx_student_attempts_student_id ON student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_exam_id ON student_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_status ON student_attempts(status);
CREATE INDEX IF NOT EXISTS idx_student_attempts_started_at ON student_attempts(started_at DESC);

-- Index for answers queries
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt_id ON student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_id ON student_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt_question ON student_answers(attempt_id, question_id);

-- Index for questions queries
CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_type_id ON questions(question_type_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_number ON questions(question_number);

-- Index for exam_questions junction table
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id ON exam_questions(question_id);

-- Index for test_codes lookups
CREATE INDEX IF NOT EXISTS idx_test_codes_code ON test_codes(code);
CREATE INDEX IF NOT EXISTS idx_test_codes_exam_id ON test_codes(exam_id);

-- Index for students lookup by telegram_id
CREATE INDEX IF NOT EXISTS idx_students_telegram_id ON students(telegram_id);

-- Index for question_groups
CREATE INDEX IF NOT EXISTS idx_question_groups_section_id ON question_groups(section_id);

-- Index for sections lookup
CREATE INDEX IF NOT EXISTS idx_sections_subject_id ON sections(subject_id);
