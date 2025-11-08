import 'reflect-metadata';
import { AppDataSource } from './connection.js';
import logger from '../utils/logger.js';

async function revertMigration() {
  try {
    logger.info('📦 Initializing database connection...');
    await AppDataSource.initialize();
    logger.info('✅ Data source initialized successfully');

    logger.info('🔄 Reverting last migration...');
    await AppDataSource.undoLastMigration();
    logger.info('✅ Migration reverted successfully');

    await AppDataSource.destroy();
    logger.info('✅ Data source closed successfully');
  } catch (error) {
    logger.error('❌ Migration revert error:', error);
    process.exit(1);
  }
}

revertMigration();
