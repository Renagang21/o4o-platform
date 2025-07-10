#!/usr/bin/env node

/**
 * O4O Platform PostgreSQL 연결 테스트 스크립트
 * 데이터베이스 연결, 엔티티 동기화, 기본 CRUD 작업을 테스트합니다.
 */

import 'reflect-metadata';
import dotenv from 'dotenv';
import { AppDataSource } from '../services/api-server/src/database/connection.js';
import { User } from '../services/api-server/src/entities/User.js';
import { Product } from '../services/api-server/src/entities/Product.js';
import { Category } from '../services/api-server/src/entities/Category.js';

// 환경변수 로드
dotenv.config();

const testDatabaseConnection = async () => {
  console.log('🧪 O4O Platform PostgreSQL 연결 테스트 시작\n');

  try {
    // 1. 데이터베이스 연결 테스트
    console.log('1️⃣ 데이터베이스 연결 테스트...');
    await AppDataSource.initialize();
    console.log('✅ PostgreSQL 연결 성공!\n');

    // 2. 엔티티 등록 확인
    console.log('2️⃣ 등록된 엔티티 확인...');
    const entities = AppDataSource.entityMetadatas.map(entity => entity.name);
    console.log('📋 등록된 엔티티:', entities);
    console.log(`📊 총 ${entities.length}개 엔티티 등록됨\n`);

    // 3. 테이블 생성 확인
    console.log('3️⃣ 데이터베이스 테이블 상태 확인...');
    const queryRunner = AppDataSource.createQueryRunner();
    
    // 테이블 목록 조회
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('🗃️ 생성된 테이블:');
    tables.forEach((table: any, index: number) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    console.log(`📊 총 ${tables.length}개 테이블 생성됨\n`);

    // 4. 기본 CRUD 테스트 (카테고리)
    console.log('4️⃣ 기본 CRUD 작업 테스트...');
    const categoryRepo = AppDataSource.getRepository(Category);

    // 테스트 카테고리 생성
    const testCategory = categoryRepo.create({
      name: 'Test Category',
      description: 'Database connection test category',
      isActive: true
    });

    const savedCategory = await categoryRepo.save(testCategory);
    console.log('✅ 카테고리 생성 성공:', savedCategory.name);

    // 카테고리 조회
    const foundCategory = await categoryRepo.findOne({
      where: { id: savedCategory.id }
    });
    console.log('✅ 카테고리 조회 성공:', foundCategory?.name);

    // 카테고리 삭제 (테스트 데이터 정리)
    await categoryRepo.remove(savedCategory);
    console.log('✅ 테스트 카테고리 삭제 완료\n');

    // 5. 연결 풀 상태 확인
    console.log('5️⃣ 데이터베이스 연결 풀 상태...');
    const driver = AppDataSource.driver as any;
    if (driver.master) {
      console.log('🔗 연결 풀 정보:');
      console.log(`   - 총 연결 수: ${driver.master.totalCount || 'N/A'}`);
      console.log(`   - 유휴 연결 수: ${driver.master.idleCount || 'N/A'}`);
      console.log(`   - 대기 중인 요청: ${driver.master.waitingCount || 'N/A'}`);
    }

    await queryRunner.release();
    
    console.log('\n🎉 모든 데이터베이스 테스트 성공!');
    console.log('💡 이제 API 서버를 시작할 수 있습니다.');

  } catch (error) {
    console.error('\n❌ 데이터베이스 테스트 실패:');
    console.error(error);
    
    console.log('\n🔧 문제 해결 방법:');
    console.log('1. PostgreSQL이 실행 중인지 확인: docker-compose -f docker-compose.dev.yml up -d postgres');
    console.log('2. 환경변수가 올바른지 확인: .env 파일 설정');
    console.log('3. 네트워크 연결 확인: ping localhost 또는 Docker 네트워크');
    
    process.exit(1);
  } finally {
    // 연결 종료
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔒 데이터베이스 연결 종료');
    }
  }
};

// 스크립트 실행
if (require.main === module) {
  testDatabaseConnection();
}

export { testDatabaseConnection };
