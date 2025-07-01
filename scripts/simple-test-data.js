#!/usr/bin/env node

/**
 * O4O Platform v0.1.0 간단한 테스트 데이터 생성 스크립트
 * SQL을 직접 사용하여 테스트 사용자 계정만 생성
 */

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

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

async function createTestUsers(client) {
  console.log('👥 Creating test users...');
  
  const createdUsers = [];

  for (const userData of TEST_USERS) {
    try {
      // 기존 사용자 확인
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser.rows[0]);
        continue;
      }

      // 패스워드 해싱
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      
      // UUID 생성
      const uuid = require('crypto').randomUUID();

      // 사용자 삽입
      const result = await client.query(`
        INSERT INTO users (
          id, email, password, name, role, status, 
          "businessInfo", "approvedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *
      `, [
        uuid,
        userData.email,
        hashedPassword,
        userData.name,
        userData.role,
        'approved',
        userData.businessInfo ? JSON.stringify(userData.businessInfo) : null,
        new Date(),
        new Date(),
        new Date()
      ]);

      console.log(`   ✅ Created user: ${userData.email} (${userData.role})`);
      createdUsers.push(result.rows[0]);
      
    } catch (error) {
      console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  return createdUsers;
}

async function createUsersTable(client) {
  console.log('📋 Ensuring users table exists...');
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        name VARCHAR(100),
        provider VARCHAR(20),
        provider_id VARCHAR(100),
        role VARCHAR(20) DEFAULT 'customer',
        status VARCHAR(20) DEFAULT 'approved',
        "businessInfo" JSONB,
        "lastLoginAt" TIMESTAMP,
        "approvedAt" TIMESTAMP,
        "approvedBy" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('   ✅ Users table ready');
  } catch (error) {
    console.log('   ⚠️  Table might already exist:', error.message);
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
      const businessInfo = typeof user.businessInfo === 'string' 
        ? JSON.parse(user.businessInfo) 
        : user.businessInfo;
      console.log(`   사업장: ${businessInfo.businessName} (${businessInfo.businessType})`);
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
  
  console.log('\\n💡 사용 방법:');
  console.log('   1. API 서버 시작: npm run dev:api');
  console.log('   2. 웹 서버 시작: npm run dev:web');
  console.log('   3. 브라우저에서 http://localhost:3011 접속');
  console.log('   4. 위의 테스트 계정으로 로그인');
  
  console.log('\\n' + '='.repeat(60));
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'o4o_platform'
  });

  try {
    console.log('🚀 O4O Platform v0.1.0 테스트 사용자 생성 시작');
    console.log('='.repeat(60));

    // 데이터베이스 연결
    console.log('🔌 Connecting to PostgreSQL...');
    console.log(`   Host: ${client.host}:${client.port}`);
    console.log(`   Database: ${client.database}`);
    console.log(`   User: ${client.user}`);
    
    await client.connect();
    console.log('✅ Database connected successfully');

    // 테이블 생성
    await createUsersTable(client);

    // 테스트 사용자 생성
    const users = await createTestUsers(client);

    // 결과 출력
    console.log('\\n✅ 테스트 데이터 생성 완료!');
    console.log(`   사용자: ${users.length}명`);

    // 테스트 계정 정보 출력
    await printTestAccountInfo(users);

    console.log('\\n🎉 테스트 사용자 계정이 성공적으로 생성되었습니다!');
    console.log('\\n📌 다음 단계:');
    console.log('   1. npm run dev:api (API 서버 시작)');
    console.log('   2. npm run dev:web (웹 서버 시작)');
    console.log('   3. 브라우저에서 테스트 진행');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\\n🔧 PostgreSQL 연결 실패. 해결 방법:');
      console.log('   1. PostgreSQL이 실행 중인지 확인하세요');
      console.log('   2. 환경변수를 확인하세요:');
      console.log(`      DB_HOST=${process.env.DB_HOST || 'localhost'}`);
      console.log(`      DB_PORT=${process.env.DB_PORT || '5432'}`);
      console.log(`      DB_USERNAME=${process.env.DB_USERNAME || 'postgres'}`);
      console.log(`      DB_NAME=${process.env.DB_NAME || 'o4o_platform'}`);
    } else if (error.code === '3D000') {
      console.log('\\n🔧 데이터베이스가 존재하지 않습니다. 해결 방법:');
      console.log(`   1. PostgreSQL에 연결하여 '${client.database}' 데이터베이스를 생성하세요`);
      console.log(`   2. 또는 기존 데이터베이스 이름으로 DB_NAME 환경변수를 설정하세요`);
    }
    
    process.exit(1);
  } finally {
    // 데이터베이스 연결 종료
    await client.end();
    console.log('👋 Database connection closed');
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { main };