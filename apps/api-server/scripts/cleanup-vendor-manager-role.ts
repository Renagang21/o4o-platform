import { AppDataSource } from '../src/database/connection.js';
import { User } from '../src/entities/User.js';

/**
 * Cleanup script to remove 'vendor_manager' role from all users
 * Run this after removing VENDOR_MANAGER from UserRole enum
 */
async function cleanupVendorManagerRole() {
  try {
    console.log('🔧 Starting vendor_manager role cleanup...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected');
    }

    const userRepository = AppDataSource.getRepository(User);

    // Find all users with vendor_manager in their roles array
    const query = `
      SELECT id, email, role, roles
      FROM users
      WHERE 'vendor_manager' = ANY(roles)
    `;

    const usersWithVendorManager = await AppDataSource.query(query);

    console.log(`📊 Found ${usersWithVendorManager.length} users with vendor_manager role`);

    if (usersWithVendorManager.length === 0) {
      console.log('✨ No users need cleanup');
      await AppDataSource.destroy();
      return;
    }

    // Update each user to remove vendor_manager
    let updatedCount = 0;
    for (const userData of usersWithVendorManager) {
      console.log(`\n👤 User: ${userData.email} (${userData.id})`);
      console.log(`   Current roles: [${userData.roles.join(', ')}]`);
      console.log(`   Current primary role: ${userData.role}`);

      // Remove vendor_manager from roles array
      const newRoles = userData.roles.filter((r: string) => r !== 'vendor_manager');

      // If roles array is now empty, add 'customer' as default
      if (newRoles.length === 0) {
        newRoles.push('customer');
        console.log(`   ⚠️  Roles array was empty after cleanup, adding 'customer'`);
      }

      // If primary role is vendor_manager, change it to the first role in array
      let newPrimaryRole = userData.role;
      if (userData.role === 'vendor_manager') {
        newPrimaryRole = newRoles[0];
        console.log(`   ⚠️  Primary role was vendor_manager, changing to '${newPrimaryRole}'`);
      }

      // Update the user
      const updateQuery = `
        UPDATE users
        SET roles = $1, role = $2
        WHERE id = $3
      `;

      await AppDataSource.query(updateQuery, [newRoles, newPrimaryRole, userData.id]);

      console.log(`   ✅ Updated roles: [${newRoles.join(', ')}]`);
      console.log(`   ✅ Updated primary role: ${newPrimaryRole}`);

      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users`);
    console.log('🎉 Cleanup completed successfully');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the cleanup
cleanupVendorManagerRole().then(() => {
  console.log('\n✨ Script finished');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
