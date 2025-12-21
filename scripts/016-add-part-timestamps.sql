-- Add part start/finish timestamps to student_attempts if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attempts' AND column_name = 'part1_started_at') THEN
        ALTER TABLE student_attempts ADD COLUMN part1_started_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attempts' AND column_name = 'part1_finished_at') THEN
        ALTER TABLE student_attempts ADD COLUMN part1_finished_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attempts' AND column_name = 'part2_started_at') THEN
        ALTER TABLE student_attempts ADD COLUMN part2_started_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attempts' AND column_name = 'part2_finished_at') THEN
        ALTER TABLE student_attempts ADD COLUMN part2_finished_at TIMESTAMP;
    END IF;
END $$;
