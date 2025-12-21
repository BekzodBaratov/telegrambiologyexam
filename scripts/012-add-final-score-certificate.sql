-- Add final_score and certificate_level columns to student_attempts
-- DO NOT modify any existing columns or tables

ALTER TABLE student_attempts
ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS certificate_level VARCHAR(10);
