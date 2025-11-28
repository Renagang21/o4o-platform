import { AppDataSource } from '../src/database/connection.js';
import { User } from '../src/entities/User.js';

/**
 * Cleanup script to remove 'affiliate' role from all users
 * AFFILIATE role is merged with PARTNER role
 */
async function cleanupAffiliateRole() {
  try {
    console.log('🔧 Starting affiliate role cleanup...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected');
    }

    const userRepository = AppDataSource.getRepository(User);

    // Find all users with affiliate in their roles array
    const query = `
      SELECT id, email, role, roles
      FROM users
      WHERE 'affiliate' = ANY(roles)
    `;

    const usersWithAffiliate = await AppDataSource.query(query);

    console.log(`📊 Found ${usersWithAffiliate.length} users with affiliate role`);

    if (usersWithAffiliate.length === 0) {
      console.log('✨ No users need cleanup');
      await AppDataSource.destroy();
      return;
    }

    // Update each user to replace affiliate with partner
    let updatedCount = 0;
    for (const userData of usersWithAffiliate) {
      console.log(`\n👤 User: ${userData.email} (${userData.id})`);
      console.log(`   Current roles: [${userData.roles.join(', ')}]`);
      console.log(`   Current primary role: ${userData.role}`);

      // Replace affiliate with partner in roles array
      const newRoles = userData.roles.map((r: string) =>
        r === 'affiliate' ? 'partner' : r
      );

      // Remove duplicates if partner already exists
      const uniqueRoles = [...new Set(newRoles)];

      // If primary role is affiliate, change it to partner
      let newPrimaryRole = userData.role;
      if (userData.role === 'affiliate') {
        newPrimaryRole = 'partner';
        console.log(`   ⚠️  Primary role was affiliate, changing to 'partner'`);
      }

      // Update the user
      const updateQuery = `
        UPDATE users
        SET roles = $1, role = $2
        WHERE id = $3
      `;

      await AppDataSource.query(updateQuery, [uniqueRoles, newPrimaryRole, userData.id]);

      console.log(`   ✅ Updated roles: [${uniqueRoles.join(', ')}]`);
      console.log(`   ✅ Updated primary role: ${newPrimaryRole}`);

      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users`);
    console.log('🎉 Cleanup completed successfully');
    console.log('ℹ️  All AFFILIATE roles have been converted to PARTNER');

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
cleanupAffiliateRole().then(() => {
  console.log('\n✨ Script finished');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
