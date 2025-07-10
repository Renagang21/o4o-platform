#!/usr/bin/env node

/**
 * O4O Platform v0.1.0 테스트 데이터 생성 스크립트 (JavaScript 버전)
 */

const bcrypt = require('bcryptjs');
const { AppDataSource } = require('../services/api-server/dist/database/connection');
const { User, UserRole, UserStatus, BusinessType } = require('../services/api-server/dist/entities/User');

const SALT_ROUNDS = 10;

const TEST_USERS = [
  {
    email: 'test@customer.com',
    password: 'pw123',
    name: '테스트 고객',
    role: 'customer'
  },
  {
    email: 'test@business.com',
    password: 'pw123',
    name: '테스트 비즈니스',
    role: 'business',
    businessInfo: {
      businessName: '테스트 약국',
      businessType: 'pharmacy',
      businessNumber: '123-45-67890',
      address: '서울시 강남구 테스트로 123',
      phone: '02-1234-5678'
    }
  },
  {
    email: 'test@affiliate.com',
    password: 'pw123',
    name: '테스트 어필리에이트',
    role: 'affiliate'
  },
  {
    email: 'test@admin.com',
    password: 'pw123',
    name: '테스트 관리자',
    role: 'admin'
  }
];

async function createTestUsers() {
  console.log('👥 Creating test users...');
  
  try {
    const userRepository = AppDataSource.getRepository(User);
    const createdUsers = [];

    for (const userData of TEST_USERS) {
      // 기존 사용자 확인
      const existingUser = await userRepository.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
        continue;
      }

      // 패스워드 해싱
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

      // 사용자 생성
      const user = userRepository.create({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        status: 'approved',
        businessInfo: userData.businessInfo,
        approvedAt: new Date()
      });

      const savedUser = await userRepository.save(user);
      console.log(`   ✅ Created user: ${userData.email} (${userData.role})`);
      createdUsers.push(savedUser);
    }

    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    throw error;
  }
}

async function printTestAccountInfo(users) {
  console.log('\\n' + '='.repeat(60));
  console.log('🧪 O4O Platform v0.1.0 테스트 계정 정보');
  console.log('='.repeat(60));
  
  users.forEach(user => {
    console.log(`\\n👤 ${user.role.toUpperCase()}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   비밀번호: pw123`);
    console.log(`   이름: ${user.name}`);
    
    if (user.businessInfo) {
      console.log(`   사업장: ${user.businessInfo.businessName} (${user.businessInfo.businessType})`);
    }
  });

  console.log('\\n📍 테스트 URL:');
  console.log('   메인 사이트: http://localhost:3011');
  console.log('   로그인: http://localhost:3011/login');
  console.log('   드롭시핑: http://localhost:3011/dropshipping');
  console.log('   관리자: http://localhost:3011/admin');
  
  console.log('\\n🔗 API 엔드포인트:');
  console.log('   API 서버: http://localhost:4000');
  console.log('   로그인: POST /api/auth/login');
  console.log('   제품 목록: GET /api/ecommerce/products');
  
  console.log('\\n' + '='.repeat(60));
}

async function main() {
  try {
    console.log('🚀 O4O Platform v0.1.0 테스트 데이터 생성 시작');
    console.log('='.repeat(60));

    // 데이터베이스 연결
    console.log('🔌 Connecting to database...');
    
    // 환경변수 확인
    if (!process.env.DB_HOST) {
      console.log('⚠️  Environment variables not set, using defaults...');
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_USERNAME = 'postgres';
      process.env.DB_PASSWORD = 'password';
      process.env.DB_NAME = 'o4o_platform';
    }
    
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    // 테스트 사용자 생성
    const users = await createTestUsers();

    // 결과 출력
    console.log('\\n✅ 테스트 데이터 생성 완료!');
    console.log(`   사용자: ${users.length}명`);

    // 테스트 계정 정보 출력
    await printTestAccountInfo(users);

    console.log('\\n🎉 모든 테스트 데이터가 성공적으로 생성되었습니다!');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // 데이터베이스 연결 종료
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('👋 Database connection closed');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { main };