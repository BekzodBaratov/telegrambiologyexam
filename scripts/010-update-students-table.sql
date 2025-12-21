-- Update students table for registration
-- Add new required fields for student registration

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add unique constraint on telegram_id (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'students_telegram_id_unique'
    ) THEN
        ALTER TABLE students ADD CONSTRAINT students_telegram_id_unique UNIQUE (telegram_id);
    END IF;
EXCEPTION WHEN others THEN
    NULL; -- Ignore if constraint already exists
END $$;

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_phone_number ON students(phone_number);

-- Create OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone_number);
