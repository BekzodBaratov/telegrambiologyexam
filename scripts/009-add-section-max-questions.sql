-- Add max_questions_per_exam to sections table
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS max_questions_per_exam INT DEFAULT 10;

-- Update existing sections to have a default value based on task_count
UPDATE sections 
SET max_questions_per_exam = task_count 
WHERE max_questions_per_exam IS NULL;
