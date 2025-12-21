-- =======================================
-- Y2 GROUPED QUESTIONS SUPPORT
-- =======================================

-- 1. New table: question_groups (for Y2 composite questions)
CREATE TABLE IF NOT EXISTS question_groups (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL DEFAULT 'Y2' CHECK (type IN ('Y2')),
    stem TEXT NOT NULL,
    options JSONB NOT NULL, -- Shared options A-F
    section_id INT REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Extend questions table with group support
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS group_id INT REFERENCES question_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_in_group INT;

-- 3. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_id);

-- Note: 
-- - Y1 questions: group_id = NULL (standard questions, existing behavior)
-- - Y2 sub-questions: group_id = question_groups.id (grouped questions)
-- - Each Y2 sub-question has its own correct_answer and Rasch difficulty
-- - Student answers remain stored per question_id (NO CHANGES to student_answers)
