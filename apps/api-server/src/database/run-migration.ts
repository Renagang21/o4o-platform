import 'reflect-metadata';
import { AppDataSource } from './connection.js';

async function runMigration() {
  try {
    console.log('📦 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Data source initialized successfully');

    console.log('🔄 Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    console.log(`✅ ${migrations.length} migration(s) executed successfully`);

    await AppDataSource.destroy();
    console.log('✅ Data source closed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigration();