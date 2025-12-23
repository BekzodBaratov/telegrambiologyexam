-- Add admin_sessions table for secure session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Add randomization_seed column to student_attempts for secure randomization
ALTER TABLE student_attempts 
ADD COLUMN IF NOT EXISTS randomization_seed BIGINT;

-- Clean up expired sessions (can be run periodically)
-- DELETE FROM admin_sessions WHERE expires_at < NOW();
