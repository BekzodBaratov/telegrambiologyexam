-- =======================================
-- QUESTION STATISTICS FOR RASCH MODEL
-- =======================================
-- This migration adds a separate table for question-level statistics
-- Required for Rasch-based difficulty scoring
-- Only applies to Y1, Y2, O1 questions (NOT O2)

-- Create question_statistics table
-- Safer approach: separate table instead of modifying questions
CREATE TABLE IF NOT EXISTS question_statistics (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Attempt tracking
    total_attempts INT NOT NULL DEFAULT 0,
    correct_attempts INT NOT NULL DEFAULT 0,
    
    -- Calculated percentage (nullable - calculated later)
    correct_percent NUMERIC(5,2),
    
    -- Rasch difficulty ball: -4 to +4 (nullable - calculated later)
    rasch_ball INT CHECK (rasch_ball IS NULL OR (rasch_ball >= -4 AND rasch_ball <= 4)),
    
    -- Metadata
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one stats record per question
    UNIQUE(question_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_question_statistics_question_id 
ON question_statistics(question_id);

-- Create index for finding questions that need recalculation
CREATE INDEX IF NOT EXISTS idx_question_statistics_last_calculated 
ON question_statistics(last_calculated_at);

-- Add comment explaining the table purpose
COMMENT ON TABLE question_statistics IS 
'Stores Rasch model statistics for questions. Only applicable to Y1, Y2, O1 types (not O2).';

COMMENT ON COLUMN question_statistics.total_attempts IS 
'Total number of times this question has been attempted by students';

COMMENT ON COLUMN question_statistics.correct_attempts IS 
'Number of times this question was answered correctly';

COMMENT ON COLUMN question_statistics.correct_percent IS 
'Percentage of correct attempts: (correct_attempts / total_attempts) * 100. Calculated by Rasch process.';

COMMENT ON COLUMN question_statistics.rasch_ball IS 
'Question difficulty score from -4 (easiest) to +4 (hardest). Derived from correct_percent by Rasch process.';
