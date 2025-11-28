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
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔧 Starting vendor_manager role cleanup...');
    console.log(`📊 Connecting to database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);

    await client.connect();
    console.log('✅ Database connected');

    // Step 1: Find users with vendor_manager
    console.log('\n📋 Step 1: Finding users with vendor_manager role...');
    const findQuery = `
      SELECT id, email, role, roles
      FROM users
      WHERE 'vendor_manager' = ANY(roles) OR role = 'vendor_manager'
    `;
    const usersResult = await client.query(findQuery);

    console.log(`Found ${usersResult.rows.length} users with vendor_manager role:`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email}: role=${user.role}, roles=[${user.roles.join(', ')}]`);
    });

    if (usersResult.rows.length === 0) {
      console.log('✨ No cleanup needed!');
      await client.end();
      return;
    }

    // Step 2: Remove vendor_manager from roles array
    console.log('\n🔧 Step 2: Removing vendor_manager from roles arrays...');
    const removeFromArrayQuery = `
      UPDATE users
      SET roles = array_remove(roles, 'vendor_manager')
      WHERE 'vendor_manager' = ANY(roles)
    `;
    const result1 = await client.query(removeFromArrayQuery);
    console.log(`✅ Updated ${result1.rowCount} users' roles arrays`);

    // Step 3: Update primary role if it was vendor_manager
    console.log('\n🔧 Step 3: Updating primary role for vendor_manager users...');
    const updatePrimaryRoleQuery = `
      UPDATE users
      SET role = CASE
        WHEN array_length(roles, 1) > 0 THEN roles[1]
        ELSE 'customer'
      END
      WHERE role = 'vendor_manager'
    `;
    const result2 = await client.query(updatePrimaryRoleQuery);
    console.log(`✅ Updated ${result2.rowCount} users' primary role`);

    // Step 4: Fix empty roles arrays
    console.log('\n🔧 Step 4: Fixing empty roles arrays...');
    const fixEmptyArraysQuery = `
      UPDATE users
      SET roles = ARRAY['customer']::text[]
      WHERE array_length(roles, 1) IS NULL OR array_length(roles, 1) = 0
    `;
    const result3 = await client.query(fixEmptyArraysQuery);
    console.log(`✅ Fixed ${result3.rowCount} users with empty roles arrays`);

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
      console.log(`  - ${user.email}: role=${user.role}, roles=[${user.roles.join(', ')}]`);
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
