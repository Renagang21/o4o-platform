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
    console.warn('⚠️  Missing required environment variables:', missingVars);
  }
  
  // 2. Database connection
  const dbValid = await validateDatabaseConnection(AppDataSource);
  if (!dbValid) {
    console.warn('⚠️  Database connection validation failed');
  }
  
  // 3. TossPayments configuration
  validateTossPaymentsConfig();
  
  // 4. Check for shipments table
  try {
    await AppDataSource.query('SELECT 1 FROM shipments LIMIT 1');
    logger.info('✅ Shipments table exists');
  } catch (error) {
    console.warn('⚠️  Shipments table not found. Run migrations: npm run migration:run');
  }
  
  logger.info('\n✅ Startup validations complete\n');
}