-- Migration: Add part-based scoring fields to student_attempts
-- This is a SAFE, additive migration - no existing columns are modified or removed

-- Add part1_score (score for Y1, Y2, O1 questions)
ALTER TABLE student_attempts
ADD COLUMN IF NOT EXISTS part1_score NUMERIC NULL;

-- Add part2_score (score for O2 questions, manual grading)
ALTER TABLE student_attempts
ADD COLUMN IF NOT EXISTS part2_score NUMERIC NULL;

-- Add final_score (combined score: (part1_score + part2_score) / 2)
-- Note: Do NOT confuse with existing total_score - that remains for backward compatibility
ALTER TABLE student_attempts
ADD COLUMN IF NOT EXISTS final_score NUMERIC NULL;

-- Add percentage (derived from final_score)
ALTER TABLE student_attempts
ADD COLUMN IF NOT EXISTS percentage NUMERIC NULL;

-- Add certificate_level (C, B, B+, A, A+)
-- Must remain NULL until all grading is completed
ALTER TABLE student_attempts
ADD COLUMN IF NOT EXISTS certificate_level VARCHAR(5) NULL;

-- Clean up any existing invalid certificate_level values before adding constraint
UPDATE student_attempts
SET certificate_level = NULL
WHERE certificate_level IS NOT NULL 
  AND certificate_level NOT IN ('C', 'B', 'B+', 'A', 'A+');

-- Drop existing constraint if it exists (for safe re-runs)
ALTER TABLE student_attempts
DROP CONSTRAINT IF EXISTS valid_certificate_level;

-- Add constraint to validate certificate_level values
ALTER TABLE student_attempts
ADD CONSTRAINT valid_certificate_level
CHECK (certificate_level IS NULL OR certificate_level IN ('C', 'B', 'B+', 'A', 'A+'));

-- Add comments for documentation
COMMENT ON COLUMN student_attempts.part1_score IS 'Score for Part 1 (Y1, Y2, O1 questions 1-40)';
COMMENT ON COLUMN student_attempts.part2_score IS 'Score for Part 2 (O2 questions 41-43, manual grading)';
COMMENT ON COLUMN student_attempts.final_score IS 'Final combined score: (part1_score + part2_score) / 2';
COMMENT ON COLUMN student_attempts.percentage IS 'Percentage derived from final_score';
COMMENT ON COLUMN student_attempts.certificate_level IS 'Certificate level: C, B, B+, A, A+ - NULL until grading complete';

-- Note: total_score column is PRESERVED for backward compatibility
-- Do NOT remove or repurpose total_score
