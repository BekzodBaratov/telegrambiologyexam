-- Create exam_sections junction table for linking exams to sections
CREATE TABLE IF NOT EXISTS exam_sections (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
    section_id INT REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE(exam_id, section_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_sections_exam ON exam_sections(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sections_section ON exam_sections(section_id);

-- Insert default subject if not exists
INSERT INTO subjects (name) 
VALUES ('Biologiya')
ON CONFLICT DO NOTHING;

-- Insert default sections for Biology if they don't exist
INSERT INTO sections (subject_id, title, task_count)
SELECT 
    (SELECT id FROM subjects WHERE name = 'Biologiya' LIMIT 1),
    title,
    task_count
FROM (VALUES
    ('Hujayraning tuzilishi', 10),
    ('Genetika asoslari', 10),
    ('Evolyutsiya nazariyasi', 10),
    ('Ekologiya', 10),
    ('Yozma ish', 3)
) AS v(title, task_count)
WHERE NOT EXISTS (
    SELECT 1 FROM sections WHERE title = v.title
);
