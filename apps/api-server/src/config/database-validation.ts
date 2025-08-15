import { DataSource } from 'typeorm';

/**
 * Validate database connection
 */
export async function validateDatabaseConnection(dataSource: DataSource): Promise<boolean> {
  try {
    if (!dataSource.isInitialized) {
      console.warn('⚠️  Database connection not initialized');
      return false;
    }
    
    // Test query
    await dataSource.query('SELECT 1');
    console.log('✅ Database connection validated');
    return true;
  } catch (error) {
    console.error('❌ Database connection validation failed:', error);
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
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      retries++;
      console.warn(`⚠️  Database connection attempt ${retries}/${maxRetries} failed`);
      
      if (retries < maxRetries) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ Failed to connect to database after maximum retries');
  return false;
}