-- Add image_url column to questions table for optional question images
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;
