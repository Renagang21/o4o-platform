import { validateTossPaymentsConfig } from './config/toss-payments';
import AppDataSource from './database/data-source';
import { validateDatabaseConnection } from './config/database-validation';
import logger from './utils/logger';

/**
 * Run all startup validations
 */
export async function runStartupValidations(): Promise<void> {
  logger.info('🚀 Running startup validations...');
  
  // 1. Environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
  ];
  
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    // Warning log removed
  }
  
  // 2. Database connection
  const dbValid = await validateDatabaseConnection(AppDataSource);
  if (!dbValid) {
    // Warning log removed
  }
  
  // 3. TossPayments configuration
  validateTossPaymentsConfig();
  
  // 4. Check for shipments table
  try {
    await AppDataSource.query('SELECT 1 FROM shipments LIMIT 1');
    logger.info('✅ Shipments table exists');
  } catch (error) {
    // Warning log removed
  }
  
  logger.info('\n✅ Startup validations complete\n');
}