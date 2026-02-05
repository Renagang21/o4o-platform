-- P0-T2: Add serviceKey column and backfill data
-- Run this BEFORE deploying application code

-- Step 1: Add serviceKey column (nullable for migration)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS service_key VARCHAR(100) NULL;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_service_key ON users(service_key);

-- Step 3: Backfill existing kpa-society users
-- (Based on email patterns or manual identification)
UPDATE users
SET service_key = 'kpa-society'
WHERE service_key IS NULL
  AND (
    email LIKE '%@kpa-%'
    OR email LIKE '%kpa-test%'
    OR email IN (
      -- Add specific kpa-society user emails here
      'district-admin@kpa-test.kr',
      'branch-admin@kpa-test.kr',
      'pharmacist@kpa-test.kr'
    )
  );

-- Step 4: Set default 'platform' for remaining NULL values
UPDATE users
SET service_key = 'platform'
WHERE service_key IS NULL;

-- Step 5: Verification queries
-- Check serviceKey distribution
SELECT service_key, COUNT(*) as count
FROM users
GROUP BY service_key
ORDER BY count DESC;

-- Check for any NULL values (should be 0)
SELECT COUNT(*) as null_count
FROM users
WHERE service_key IS NULL;

-- Display all kpa-society users
SELECT id, email, name, service_key, status, created_at
FROM users
WHERE service_key = 'kpa-society'
ORDER BY created_at DESC;
