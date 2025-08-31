import 'reflect-metadata';
import { AppDataSource } from './connection';

async function runMigration() {
  try {
    await AppDataSource.initialize();
    // Data source initialized successfully
    
    await AppDataSource.runMigrations();
    // Migrations executed successfully
    
    await AppDataSource.destroy();
    // Data source closed successfully
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

runMigration();