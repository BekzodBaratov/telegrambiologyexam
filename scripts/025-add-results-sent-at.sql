-- Add results_sent_at column to track when results were sent via Telegram
-- This enables idempotency (prevents duplicate sends)

ALTER TABLE student_attempts 
ADD COLUMN IF NOT EXISTS results_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_attempts_results_sent 
ON student_attempts(exam_id, results_sent_at) 
WHERE status = 'completed';
