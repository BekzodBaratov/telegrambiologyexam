-- Seed initial data for testing

-- Insert a subject
INSERT INTO subjects (name) VALUES ('Biologiya') ON CONFLICT DO NOTHING;

-- Insert sections
INSERT INTO sections (subject_id, title, task_count) VALUES
  (1, 'Hujayraning tuzilishi', 10),
  (1, 'Genetika asoslari', 10),
  (1, 'Evolyutsiya nazariyasi', 10),
  (1, 'Ekologiya', 10),
  (1, 'Yozma ish', 3)
ON CONFLICT DO NOTHING;

-- Insert an exam
INSERT INTO exams (subject_id, name, test_duration, written_duration) VALUES
  (1, 'Biologiya yakuniy imtihon 2024', 100, 80)
ON CONFLICT DO NOTHING;

-- Create a test admin user (password: admin123)
INSERT INTO admin_users (email, password_hash, name) VALUES
  ('admin@example.com', '$2a$10$rQ7Fj3kkH5gT5s1J5q5Z5O9X5Y5Z5O9X5Y5Z5O9X5Y5Z5O9X5Y5', 'Administrator')
ON CONFLICT (email) DO NOTHING;
