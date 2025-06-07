import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

// API 서버의 .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../services/api-server/.env') });

// Database connection
import { initializeDatabase } from '../services/api-server/src/database/connection';
import { getUserRepository, UserRole, UserStatus, BusinessType } from '../services/api-server/src/models/User';

const createAdminUser = async () => {
  try {
    // Database 연결
    await initializeDatabase();
    console.log('✅ Database connected');

    const userRepository = getUserRepository();

    // 기존 관리자 확인
    const existingAdmin = await userRepository.findOne({ where: { role: UserRole.ADMIN } });
    if (existingAdmin) {
      console.log('❌ Admin user already exists:', existingAdmin.email);
      process.exit(1);
    }

    // 관리자 생성
    const adminUser = userRepository.create({
      email: 'admin@neture.co.kr',
      password: 'Admin123!',
      name: '시스템 관리자',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      businessInfo: {
        businessName: 'Neture 관리팀',
        businessType: BusinessType.OTHER,
        address: '서울특별시 강남구',
        phone: '02-1234-5678'
      },
      approvedAt: new Date()
    });

    await userRepository.save(adminUser);
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@neture.co.kr');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  Please change the password after first login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
};

createAdminUser();
