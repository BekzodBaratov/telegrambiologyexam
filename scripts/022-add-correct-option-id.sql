-- =======================================
-- SAFE SCHEMA EXTENSION: Add correct_option_id for randomization-safe answer tracking
-- This is a NON-DESTRUCTIVE change - does not delete or rename existing columns
-- =======================================

-- 1. Add correct_option_id column to questions table (nullable for backward compatibility)
-- This will be the new source of truth for correct answers
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_option_id VARCHAR(50);

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_correct_option_id ON questions(correct_option_id);

-- 3. Add selected_option_id to student_answers table to store which option was selected by ID
-- This makes answer validation randomization-safe
ALTER TABLE student_answers ADD COLUMN IF NOT EXISTS selected_option_id VARCHAR(50);

-- NOTE: The existing correct_answer column is KEPT for backward compatibility
-- Legacy questions (correct_option_id IS NULL) will continue to use correct_answer
-- New questions will use correct_option_id

-- Migration of existing data will be handled in backend code:
-- For legacy questions: map correct_answer (A/B/C/D) to option ID on first access
-- For new questions: save correct_option_id directly when creating question
