import { DataSource } from 'typeorm';
import logger from '../utils/logger';

/**
 * Validate database connection
 */
export async function validateDatabaseConnection(dataSource: DataSource): Promise<boolean> {
  try {
    if (!dataSource.isInitialized) {
      // Warning log removed
      return false;
    }
    
    // Test query
    await dataSource.query('SELECT 1');
    logger.info('✅ Database connection validated');
    return true;
  } catch (error) {
    // Error log removed
    return false;
  }
}

/**
 * Retry database connection
 */
export async function retryDatabaseConnection(
  dataSource: DataSource, 
  maxRetries: number = 5,
  delay: number = 5000
): Promise<boolean> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      
      await dataSource.query('SELECT 1');
      logger.info('✅ Database connected successfully');
      return true;
    } catch (error) {
      retries++;
      // Warning log removed
      
      if (retries < maxRetries) {
        logger.info(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Error log removed
  return false;
}