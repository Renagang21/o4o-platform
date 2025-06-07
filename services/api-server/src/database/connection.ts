import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'o4o_platform',
  entities: [User],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development'
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ PostgreSQL connected successfully');
    
    if (process.env.NODE_ENV === 'development') {
      await AppDataSource.runMigrations();
      console.log('✅ Migrations completed');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};
