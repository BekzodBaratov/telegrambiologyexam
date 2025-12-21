-- =======================================
-- ADD RASCH STATISTICS COLUMNS TO QUESTIONS
-- =======================================

-- Add new columns to questions table for Rasch statistics
ALTER TABLE questions ADD COLUMN IF NOT EXISTS total_attempts INT DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_attempts INT DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS rasch_ball INT DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS rasch_updated_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_rasch_ball ON questions(rasch_ball);
