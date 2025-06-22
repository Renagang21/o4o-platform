import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Import all ecommerce entities
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { CustomPost } from '../entities/CustomPost';
import { CustomPostType } from '../entities/CustomPostType';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'o4o_platform',
  
  // Register all entities
  entities: [
    User,
    Product,
    Category,
    Cart,
    CartItem,
    Order,
    OrderItem,
    CustomPost,
    CustomPostType
  ],
  
  // Migration settings
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'o4o_migrations',
  
  // Development settings
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  
  // Connection pool settings
  extra: {
    max: 20,
    min: 5,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  }
});

export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing PostgreSQL connection...');
    
    await AppDataSource.initialize();
    console.log('✅ PostgreSQL connected successfully');
    console.log(`📊 Connected to database: ${process.env.DB_NAME || 'o4o_platform'}`);
    
    // Run migrations in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Running database migrations...');
      await AppDataSource.runMigrations();
      console.log('✅ Migrations completed successfully');
    }
    
    // Log registered entities
    console.log('📋 Registered entities:', AppDataSource.entityMetadatas.map(e => e.name));
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('🔍 Connection details:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'o4o_platform',
      username: process.env.DB_USERNAME || 'postgres'
    });
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Gracefully shutting down database connection...');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
});
