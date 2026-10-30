-- Dedicated PostgreSQL instance only; never mount a production dump or volume.
-- Database metadata adds no schema objects and preserves canonical empty-DB detection.
COMMENT ON DATABASE o4o_chatgpt_review_demo IS 'chatgpt-review-synthetic-only-v1';
