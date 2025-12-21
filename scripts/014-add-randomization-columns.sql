-- Migration: Add columns for storing question/option randomization per attempt
-- This enables deterministic randomization that persists across page refreshes

-- Store the randomized question order for this attempt
-- Format: Array of question IDs in display order
ALTER TABLE student_attempts 
ADD COLUMN IF NOT EXISTS question_order JSONB;

-- Store the randomized option order for each question
-- Format: { "questionId": ["C", "A", "D", "B"], ... }
ALTER TABLE student_attempts 
ADD COLUMN IF NOT EXISTS option_orders JSONB;

-- Index for faster lookups when resuming attempts
CREATE INDEX IF NOT EXISTS idx_student_attempts_question_order 
ON student_attempts USING GIN (question_order);
