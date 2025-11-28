import { AppDataSource } from '../src/database/connection.js';
import { User } from '../src/entities/User.js';

/**
 * Cleanup script to remove 'moderator' role from all users
 * Run this after removing MODERATOR from UserRole enum
 */
async function cleanupModeratorRole() {
  try {
    console.log('🔧 Starting moderator role cleanup...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected');
    }

    const userRepository = AppDataSource.getRepository(User);

    // Find all users with moderator in their roles array
    const query = `
      SELECT id, email, role, roles
      FROM users
      WHERE 'moderator' = ANY(roles)
    `;

    const usersWithModerator = await AppDataSource.query(query);

    console.log(`📊 Found ${usersWithModerator.length} users with moderator role`);

    if (usersWithModerator.length === 0) {
      console.log('✨ No users need cleanup');
      await AppDataSource.destroy();
      return;
    }

    // Update each user to remove moderator
    let updatedCount = 0;
    for (const userData of usersWithModerator) {
      console.log(`\n👤 User: ${userData.email} (${userData.id})`);
      console.log(`   Current roles: [${userData.roles.join(', ')}]`);
      console.log(`   Current primary role: ${userData.role}`);

      // Remove moderator from roles array
      const newRoles = userData.roles.filter((r: string) => r !== 'moderator');

      // If roles array is now empty, add 'user' as default
      if (newRoles.length === 0) {
        newRoles.push('user');
        console.log(`   ⚠️  Roles array was empty after cleanup, adding 'user'`);
      }

      // If primary role is moderator, change it to the first role in array
      let newPrimaryRole = userData.role;
      if (userData.role === 'moderator') {
        newPrimaryRole = newRoles[0];
        console.log(`   ⚠️  Primary role was moderator, changing to '${newPrimaryRole}'`);
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
cleanupModeratorRole().then(() => {
  console.log('\n✨ Script finished');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
