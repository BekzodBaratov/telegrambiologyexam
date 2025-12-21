-- Add time window columns to test_codes table
ALTER TABLE test_codes 
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_test_codes_time ON test_codes(starts_at, ends_at);
