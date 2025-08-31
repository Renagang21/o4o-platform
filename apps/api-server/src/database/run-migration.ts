import 'reflect-metadata';
import { AppDataSource } from './connection';

async function runMigration() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Data source initialized');
    
    await AppDataSource.runMigrations();
    console.log('✅ Migrations executed successfully');
    
    await AppDataSource.destroy();
    console.log('✅ Data source closed');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

runMigration();