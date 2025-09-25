import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/User';
import * as bcrypt from 'bcryptjs';
import logger from '../utils/logger';

async function createTestUser() {
  try {
    // Create direct database connection
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'o4o_user',
      password: process.env.DB_PASSWORD || 'o4o_password123',
      database: process.env.DB_NAME || 'o4o_platform',
      entities: [User],
      synchronize: false,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    await dataSource.initialize();
    logger.info('Database connected');

    const userRepository = dataSource.getRepository(User);

    // Check if test user already exists
    const existingUser = await userRepository.findOne({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      logger.info('Test user already exists');
      logger.info(`User ID: ${existingUser.id}`);
      process.exit(0);
    }

    // Create new test user
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);
    
    const testUser = new User();
    testUser.email = 'test@example.com';
    testUser.password = hashedPassword;
    testUser.name = 'Test User';
    testUser.status = UserStatus.ACTIVE;
    testUser.isActive = true;
    testUser.role = UserRole.ADMIN;
    testUser.permissions = ['create_posts', 'edit_posts', 'delete_posts', 'manage_users'];

    const savedUser = await userRepository.save(testUser);
    
    logger.info('Test user created successfully');
    logger.info(`Email: ${savedUser.email}`);
    logger.info('Password: Test123!@#');
    logger.info(`User ID: ${savedUser.id}`);
    logger.info(`Role: ${savedUser.role}`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();