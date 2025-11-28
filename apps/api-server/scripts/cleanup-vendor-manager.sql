-- Cleanup vendor_manager role from users table
-- Run this script after removing VENDOR_MANAGER from UserRole enum

-- Show users with vendor_manager before cleanup
SELECT
  id,
  email,
  role AS current_primary_role,
  roles AS current_roles_array
FROM users
WHERE 'vendor_manager' = ANY(roles) OR role = 'vendor_manager';

-- Update roles array: remove 'vendor_manager' from roles array
UPDATE users
SET roles = array_remove(roles, 'vendor_manager')
WHERE 'vendor_manager' = ANY(roles);

-- Update primary role: if role is 'vendor_manager', change to first item in roles array or 'customer'
UPDATE users
SET role = CASE
  WHEN array_length(roles, 1) > 0 THEN roles[1]
  ELSE 'customer'
END
WHERE role = 'vendor_manager';

-- If any user has empty roles array after cleanup, set to ['customer']
UPDATE users
SET roles = ARRAY['customer']::text[]
WHERE array_length(roles, 1) IS NULL OR array_length(roles, 1) = 0;

-- Show results after cleanup
SELECT
  id,
  email,
  role AS updated_primary_role,
  roles AS updated_roles_array
FROM users
WHERE id IN (
  SELECT id FROM users
  WHERE 'vendor_manager' = ANY(roles) OR role = 'vendor_manager'
);

-- Count affected users
SELECT COUNT(*) AS total_users_cleaned
FROM users
WHERE role = 'customer' AND 'customer' = ANY(roles);
