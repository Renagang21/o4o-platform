import 'dotenv/config';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';
import bcrypt from 'bcryptjs';

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  businessInfo?: Record<string, unknown>;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'admin@o4o.com',
    password: 'password123',
    name: '시스템 관리자',
    role: UserRole.ADMIN,
    firstName: '시스템',
    lastName: '관리자',
  },
  {
    email: 'supplier1@abc.com',
    password: 'password123',
    name: '김철수',
    role: UserRole.SUPPLIER,
    firstName: '철수',
    lastName: '김',
    businessInfo: {
      companyName: 'ABC전자',
      businessType: 'supplier',
      taxId: '123-45-67890',
      address: {
        street: '테헤란로 123',
        city: '서울시',
        state: '강남구',
        zipCode: '06234',
        country: 'KR'
      },
      contactInfo: {
        phone: '010-2345-6789',
        website: 'www.abc-electronics.com'
      }
    }
  },
  {
    email: 'retailer1@xyz.com',
    password: 'password123',
    name: '이영희',
    role: UserRole.SELLER, // Note: Using SELLER for retailer role
    firstName: '영희',
    lastName: '이',
    businessInfo: {
      companyName: 'XYZ마트',
      businessType: 'retailer',
      taxId: '456-78-90123',
      address: {
        street: '센텀대로 456',
        city: '부산시',
        state: '해운대구',
        zipCode: '48059',
        country: 'KR'
      },
      contactInfo: {
        phone: '010-3456-7890',
        website: 'www.xyz-mart.com'
      }
    }
  },
  {
    email: 'customer1@gmail.com',
    password: 'password123',
    name: '김고객',
    role: UserRole.CUSTOMER,
    firstName: '고객',
    lastName: '김',
  }
];

async function createTestUsers() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);

    
    for (const testUser of TEST_USERS) {
      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: { email: testUser.email }
      });

      if (existingUser) {
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      // Create new user
      const user = userRepository.create({
        email: testUser.email,
        password: hashedPassword,
        name: testUser.name,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role,
        status: UserStatus.ACTIVE,
        isActive: true,
        isEmailVerified: true,
        businessInfo: testUser.businessInfo,
        permissions: [],
        loginAttempts: 0,
      });

      await userRepository.save(user);
    }

    TEST_USERS.forEach((user: any) => {
    });


  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the script
createTestUsers().catch(console.error);