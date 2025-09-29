/**
 * 중복 및 잘못된 CPT 제거 스크립트
 * 복수형으로 잘못 생성된 CPT들을 제거합니다
 */

import dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/api-server/.env') });

async function removeDuplicateCPTs() {
  console.log('🔧 중복 CPT 제거 시작...\n');

  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'o4o_user',
    password: process.env.DB_PASSWORD || 'o4o_password',
    database: process.env.DB_NAME || 'o4o_platform',
    synchronize: false,
    logging: false
  });

  try {
    // 1. 현재 CPT 목록 확인
    console.log('📋 현재 드롭쉬핑 CPT 목록:');
    const currentCPTs = await connection.query(`
      SELECT slug, name, "createdAt" 
      FROM custom_post_types 
      WHERE slug LIKE 'ds_%'
      ORDER BY "createdAt"
    `);
    
    console.table(currentCPTs);

    // 2. 잘못된 CPT들 삭제
    console.log('\n🗑️ 잘못된 복수형 CPT 삭제 중...');
    
    const deleteResult = await connection.query(`
      DELETE FROM custom_post_types 
      WHERE slug IN ('ds_suppliers', 'ds_products', 'ds_orders')
      RETURNING slug, name
    `);

    if (deleteResult.length > 0) {
      console.log('✅ 삭제된 CPT:');
      console.table(deleteResult);
    } else {
      console.log('ℹ️ 삭제할 잘못된 CPT가 없습니다.');
    }

    // 3. 정리 후 CPT 목록 확인
    console.log('\n📋 정리 후 드롭쉬핑 CPT 목록:');
    const finalCPTs = await connection.query(`
      SELECT slug, name, icon, active, public
      FROM custom_post_types 
      WHERE slug LIKE 'ds_%'
      ORDER BY slug
    `);
    
    console.table(finalCPTs);

    // 4. 올바른 CPT 확인
    const expectedCPTs = ['ds_supplier', 'ds_partner', 'ds_product', 'ds_commission_policy', 'ds_order'];
    const actualCPTs = finalCPTs.map(cpt => cpt.slug);
    
    console.log('\n✅ 예상 CPT:', expectedCPTs);
    console.log('📌 실제 CPT:', actualCPTs);
    
    const missing = expectedCPTs.filter(slug => !actualCPTs.includes(slug));
    if (missing.length > 0) {
      console.log('\n⚠️ 누락된 CPT:', missing);
      console.log('💡 누락된 CPT는 fix-dropshipping-cpts.js 스크립트를 실행하여 추가할 수 있습니다.');
    }

    console.log('\n✨ 중복 CPT 제거 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await connection.close();
  }
}

// 실행
removeDuplicateCPTs().catch(console.error);