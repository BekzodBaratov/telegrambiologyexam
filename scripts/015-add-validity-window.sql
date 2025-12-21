-- Add validity window columns to test_codes table
-- These are backward-compatible: NULL means no restriction

ALTER TABLE test_codes 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMP;

-- Migrate existing starts_at/ends_at data if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_codes' AND column_name = 'starts_at') THEN
    UPDATE test_codes SET valid_from = starts_at WHERE valid_from IS NULL AND starts_at IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_codes' AND column_name = 'ends_at') THEN
    UPDATE test_codes SET valid_to = ends_at WHERE valid_to IS NULL AND ends_at IS NOT NULL;
  END IF;
END $$;
