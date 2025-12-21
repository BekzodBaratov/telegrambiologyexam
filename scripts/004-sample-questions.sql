-- Insert sample questions for testing

-- Y1 questions (1-32) - Multiple choice
INSERT INTO questions (section_id, question_number, question_type_id, text, options, correct_answer, max_score) VALUES
(1, 1, 1, 'Hujayra membranasining asosiy tarkibiy qismi qaysi?', '{"A": "Oqsillar", "B": "Lipidlar", "C": "Uglevodlar", "D": "Nuklein kislotalar"}', 'B', 1),
(1, 2, 1, 'Mitoxondriyaning asosiy vazifasi nima?', '{"A": "Oqsil sintezi", "B": "ATF ishlab chiqarish", "C": "Yog'' sintezi", "D": "DNK replikatsiyasi"}', 'B', 1),
(1, 3, 1, 'Xloroplast qaysi hujayralar uchun xos?', '{"A": "Hayvon hujayralari", "B": "O''simlik hujayralari", "C": "Bakteriyalar", "D": "Viruslar"}', 'B', 1),
(2, 4, 1, 'DNK molekulasining asosiy tuzilish birligi qaysi?', '{"A": "Aminokislota", "B": "Nukleotid", "C": "Monosaxarid", "D": "Yog'' kislotasi"}', 'B', 1),
(2, 5, 1, 'Mendel qonunlari nechta?', '{"A": "2", "B": "3", "C": "4", "D": "5"}', 'B', 1);

-- Y2 questions (33-35) - Matching
INSERT INTO questions (section_id, question_number, question_type_id, text, options, correct_answer, max_score) VALUES
(3, 33, 2, 'Organoidlarni ularning vazifalariga moslang', '{"left": ["Yadro", "Mitoxondriya", "Ribosoma", "Lizosoma"], "right": ["Genetik ma''lumot saqlash", "Energiya ishlab chiqarish", "Oqsil sintezi", "Hazm qilish"]}', '{"Yadro": "Genetik ma''lumot saqlash", "Mitoxondriya": "Energiya ishlab chiqarish", "Ribosoma": "Oqsil sintezi", "Lizosoma": "Hazm qilish"}', 2),
(3, 34, 2, 'Vitaminlarni ularning nomlari bilan moslang', '{"left": ["A", "C", "D", "K"], "right": ["Retinol", "Askorbin kislota", "Kalsiferol", "Filloxinon"]}', '{"A": "Retinol", "C": "Askorbin kislota", "D": "Kalsiferol", "K": "Filloxinon"}', 2);

-- O1 questions (36-40) - Short answer
INSERT INTO questions (section_id, question_number, question_type_id, text, correct_answer, max_score) VALUES
(4, 36, 3, 'Fotosintez jarayoni qaysi organoidda sodir bo''ladi?', 'Xloroplast', 2),
(4, 37, 3, 'Hujayraning energiya ishlab chiqaruvchi organoidi nomi nima?', 'Mitoxondriya', 2),
(4, 38, 3, 'DNK ning to''liq nomi nima?', 'Dezoksiribonuklein kislota', 2);

-- O2 questions (41-43) - Extended response with image
INSERT INTO questions (section_id, question_number, question_type_id, text, max_score) VALUES
(5, 41, 4, 'Hujayra bo''linishining mitoz fazalarini chizib, har bir fazani tushuntiring.', 25),
(5, 42, 4, 'Fotosintez jarayonini sxema ko''rinishida tasvirlab, uning bosqichlarini izohlang.', 25),
(5, 43, 4, 'Odam yuragining tuzilishini chizib, qon aylanish doiralarini tushuntiring.', 25);

-- Link questions to exam
INSERT INTO exam_questions (exam_id, question_id, position)
SELECT 1, id, question_number FROM questions;

-- Create some test codes
INSERT INTO test_codes (code, exam_id, max_attempts) VALUES
('1234', 1, 100),
('5678', 1, 100),
('8080', 1, 100);
