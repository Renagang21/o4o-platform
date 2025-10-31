import 'reflect-metadata';
import { AppDataSource } from './connection.js';
import logger from '../utils/logger.js';

async function runMigration() {
  try {
    logger.info('📦 Initializing database connection...');
    await AppDataSource.initialize();
    logger.info('✅ Data source initialized successfully');

    logger.info('🔄 Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    logger.info(`✅ ${migrations.length} migration(s) executed successfully`);

    await AppDataSource.destroy();
    logger.info('✅ Data source closed successfully');
  } catch (error) {
    logger.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigration();