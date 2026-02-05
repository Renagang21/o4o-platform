-- P0-T3: Check and fix user status before deployment
-- Run this to understand current data state

-- Step 1: Check user status distribution
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM users), 2) as percentage
FROM users
GROUP BY status
ORDER BY count DESC;

-- Step 2: List PENDING users (need approval)
SELECT
  id,
  email,
  name,
  status,
  created_at,
  CASE
    WHEN approved_at IS NOT NULL THEN 'Has approval date'
    ELSE 'No approval date'
  END as approval_status
FROM users
WHERE status = 'PENDING'
ORDER BY created_at DESC;

-- Step 3: Pre-approve test accounts
-- Run this to ensure test accounts work after deployment
UPDATE users
SET
  status = 'ACTIVE',
  approved_at = NOW(),
  approved_by = 'system-pre-deployment-20260205'
WHERE email IN (
  'district-admin@kpa-test.kr',
  'branch-admin@kpa-test.kr',
  'district-officer@kpa-test.kr',
  'branch-officer@kpa-test.kr',
  'pharmacist@kpa-test.kr'
)
AND status != 'ACTIVE';

-- Step 4: Approve all existing users (if needed)
-- CAUTION: Only run this if you want to activate all existing users
-- UPDATE users
-- SET
--   status = 'ACTIVE',
--   approved_at = NOW(),
--   approved_by = 'system-migration-20260205'
-- WHERE status = 'PENDING';

-- Step 5: Verification - show affected users
SELECT
  id,
  email,
  name,
  status,
  approved_at,
  approved_by
FROM users
WHERE approved_by LIKE '%system-%'
ORDER BY created_at DESC;
