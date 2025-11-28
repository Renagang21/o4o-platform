/**
 * Cleanup vendor_manager role from database
 * This is a simple JavaScript file that can be run with node (no TypeScript)
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function cleanup() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔧 Starting vendor_manager role cleanup...');
    console.log(`📊 Connecting to database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);

    await client.connect();
    console.log('✅ Database connected');

    // Step 1: Find users with vendor_manager
    console.log('\n📋 Step 1: Finding users with vendor_manager role...');
    // Note: roles column is simple-array (comma-separated string), not PostgreSQL array
    const findQuery = `
      SELECT id, email, role, roles
      FROM users
      WHERE roles LIKE '%vendor_manager%' OR role = 'vendor_manager'
    `;
    const usersResult = await client.query(findQuery);

    console.log(`Found ${usersResult.rows.length} users with vendor_manager role:`);
    usersResult.rows.forEach(user => {
      const rolesArray = user.roles ? user.roles.split(',') : [];
      console.log(`  - ${user.email}: role=${user.role}, roles=[${rolesArray.join(', ')}]`);
    });

    if (usersResult.rows.length === 0) {
      console.log('✨ No cleanup needed!');
      await client.end();
      return;
    }

    // Step 2: Remove vendor_manager from roles string (simple-array)
    console.log('\n🔧 Step 2: Removing vendor_manager from roles strings...');
    // Simple-array format: "role1,role2,role3"
    // Need to handle: ",vendor_manager", "vendor_manager,", and standalone "vendor_manager"
    const removeFromArrayQuery = `
      UPDATE users
      SET roles = CASE
        -- Remove vendor_manager and clean up commas
        WHEN roles = 'vendor_manager' THEN 'customer'
        WHEN roles LIKE 'vendor_manager,%' THEN REPLACE(roles, 'vendor_manager,', '')
        WHEN roles LIKE '%,vendor_manager' THEN REPLACE(roles, ',vendor_manager', '')
        WHEN roles LIKE '%,vendor_manager,%' THEN REPLACE(roles, ',vendor_manager,', ',')
        ELSE roles
      END
      WHERE roles LIKE '%vendor_manager%'
    `;
    const result1 = await client.query(removeFromArrayQuery);
    console.log(`✅ Updated ${result1.rowCount} users' roles strings`);

    // Step 3: Update primary role if it was vendor_manager
    console.log('\n🔧 Step 3: Updating primary role for vendor_manager users...');
    const updatePrimaryRoleQuery = `
      UPDATE users
      SET role = CASE
        -- Extract first role from simple-array string
        WHEN roles LIKE '%,%' THEN SPLIT_PART(roles, ',', 1)
        WHEN roles IS NOT NULL AND roles != '' THEN roles
        ELSE 'customer'
      END
      WHERE role = 'vendor_manager'
    `;
    const result2 = await client.query(updatePrimaryRoleQuery);
    console.log(`✅ Updated ${result2.rowCount} users' primary role`);

    // Step 4: Fix empty roles strings
    console.log('\n🔧 Step 4: Fixing empty roles strings...');
    const fixEmptyArraysQuery = `
      UPDATE users
      SET roles = 'customer'
      WHERE roles IS NULL OR roles = '' OR roles = ','
    `;
    const result3 = await client.query(fixEmptyArraysQuery);
    console.log(`✅ Fixed ${result3.rowCount} users with empty roles strings`);

    // Step 5: Verify cleanup
    console.log('\n✅ Step 5: Verifying cleanup...');
    const verifyQuery = `
      SELECT id, email, role, roles
      FROM users
      WHERE id = ANY($1)
    `;
    const userIds = usersResult.rows.map(u => u.id);
    const verifyResult = await client.query(verifyQuery, [userIds]);

    console.log('After cleanup:');
    verifyResult.rows.forEach(user => {
      const rolesArray = user.roles ? user.roles.split(',') : [];
      console.log(`  - ${user.email}: role=${user.role}, roles=[${rolesArray.join(', ')}]`);
    });

    console.log('\n🎉 Cleanup completed successfully!');
    await client.end();

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    try {
      await client.end();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

cleanup();
