/**
 * GlycoPharm Phase 2 - Step 2-3 데이터 생성 스크립트
 *
 * 목적: Phase 0 E2E 흐름을 시작할 수 있는 최소 데이터 생성
 *
 * 생성 순서:
 * 1. 약국 1개 (P0-TEST-001)
 * 2. 상품 1개 (P0-CGM-001, pharmacy_id=null, status=draft)
 * 3. 약국-상품 연결 + status=active
 *
 * 사용법:
 * npx tsx src/scripts/glycopharm-phase2-seed.ts
 *
 * 옵션:
 * --step=1  : Step 2-3-1만 실행 (약국 생성)
 * --step=2  : Step 2-3-2만 실행 (상품 생성, 미연결)
 * --step=3  : Step 2-3-3만 실행 (연결 + active)
 * --all     : 전체 실행 (기본값)
 */

import pg from 'pg';
const { Client } = pg;

const DB_CONFIG = {
  host: process.env.DB_HOST || '34.64.96.252',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD || 'seoChuran1!',
  database: process.env.DB_NAME || 'o4o_platform',
};

// Phase 0 테스트 데이터 정의
const PHARMACY_DATA = {
  name: 'Phase0 테스트약국',
  code: 'P0-TEST-001',
  address: '서울시 강남구 테스트로 123',
  phone: '02-1234-5678',
  status: 'active',
};

const PRODUCT_DATA = {
  name: '테스트 CGM',
  sku: 'P0-CGM-001',
  category: 'cgm_device',
  description: 'Phase 0 E2E 테스트용 CGM 기기',
  price: 150000,
  stock_quantity: 100,
  manufacturer: '테스트제조사',
  status: 'draft', // 초기 상태
};

interface StepResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

async function step1_createPharmacy(client: pg.Client): Promise<StepResult> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2-3-1: 약국 생성');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 기존 데이터 확인
    const existingCheck = await client.query(
      'SELECT id, name, code FROM glycopharm_pharmacies WHERE code = $1',
      [PHARMACY_DATA.code]
    );

    if (existingCheck.rows.length > 0) {
      console.log(`⚠️ 이미 존재: ${PHARMACY_DATA.code}`);
      console.log(`   ID: ${existingCheck.rows[0].id}`);
      return {
        step: '2-3-1',
        success: true,
        data: existingCheck.rows[0],
      };
    }

    // 약국 생성
    const result = await client.query(`
      INSERT INTO glycopharm_pharmacies (name, code, address, phone, status, sort_order, enabled_services)
      VALUES ($1, $2, $3, $4, $5, 0, '[]')
      RETURNING id, name, code, status, created_at
    `, [PHARMACY_DATA.name, PHARMACY_DATA.code, PHARMACY_DATA.address, PHARMACY_DATA.phone, PHARMACY_DATA.status]);

    const pharmacy = result.rows[0];
    console.log('✅ 약국 생성 성공');
    console.log(`   ID: ${pharmacy.id}`);
    console.log(`   Name: ${pharmacy.name}`);
    console.log(`   Code: ${pharmacy.code}`);
    console.log(`   Status: ${pharmacy.status}`);

    return {
      step: '2-3-1',
      success: true,
      data: pharmacy,
    };
  } catch (error: any) {
    console.log('❌ 약국 생성 실패');
    console.log(`   Error: ${error.message}`);
    return {
      step: '2-3-1',
      success: false,
      error: error.message,
    };
  }
}

async function step2_createProduct(client: pg.Client): Promise<StepResult> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2-3-2: 상품 생성 (pharmacy_id=null, status=draft)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 기존 데이터 확인
    const existingCheck = await client.query(
      'SELECT id, name, sku, pharmacy_id, status FROM glycopharm_products WHERE sku = $1',
      [PRODUCT_DATA.sku]
    );

    if (existingCheck.rows.length > 0) {
      console.log(`⚠️ 이미 존재: ${PRODUCT_DATA.sku}`);
      console.log(`   ID: ${existingCheck.rows[0].id}`);
      console.log(`   pharmacy_id: ${existingCheck.rows[0].pharmacy_id || 'null'}`);
      console.log(`   status: ${existingCheck.rows[0].status}`);
      return {
        step: '2-3-2',
        success: true,
        data: existingCheck.rows[0],
      };
    }

    // 상품 생성 (pharmacy_id = null)
    const result = await client.query(`
      INSERT INTO glycopharm_products
        (name, sku, category, description, price, stock_quantity, manufacturer, status, is_featured, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 0)
      RETURNING id, name, sku, pharmacy_id, status, price, created_at
    `, [
      PRODUCT_DATA.name,
      PRODUCT_DATA.sku,
      PRODUCT_DATA.category,
      PRODUCT_DATA.description,
      PRODUCT_DATA.price,
      PRODUCT_DATA.stock_quantity,
      PRODUCT_DATA.manufacturer,
      PRODUCT_DATA.status,
    ]);

    const product = result.rows[0];
    console.log('✅ 상품 생성 성공 (플랫폼 레벨, 미취급 상태)');
    console.log(`   ID: ${product.id}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   pharmacy_id: ${product.pharmacy_id || 'null'}`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Price: ${product.price}`);

    return {
      step: '2-3-2',
      success: true,
      data: product,
    };
  } catch (error: any) {
    console.log('❌ 상품 생성 실패');
    console.log(`   Error: ${error.message}`);
    return {
      step: '2-3-2',
      success: false,
      error: error.message,
    };
  }
}

async function step3_linkAndActivate(client: pg.Client): Promise<StepResult> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2-3-3: 약국-상품 연결 + status=active');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 약국 ID 조회
    const pharmacyResult = await client.query(
      'SELECT id FROM glycopharm_pharmacies WHERE code = $1',
      [PHARMACY_DATA.code]
    );

    if (pharmacyResult.rows.length === 0) {
      throw new Error(`약국을 찾을 수 없음: ${PHARMACY_DATA.code}`);
    }

    const pharmacyId = pharmacyResult.rows[0].id;

    // 상품 조회
    const productResult = await client.query(
      'SELECT id, pharmacy_id, status FROM glycopharm_products WHERE sku = $1',
      [PRODUCT_DATA.sku]
    );

    if (productResult.rows.length === 0) {
      throw new Error(`상품을 찾을 수 없음: ${PRODUCT_DATA.sku}`);
    }

    const product = productResult.rows[0];

    // 이미 연결되어 있고 active인지 확인
    if (product.pharmacy_id === pharmacyId && product.status === 'active') {
      console.log('⚠️ 이미 연결되어 있고 active 상태');
      return {
        step: '2-3-3',
        success: true,
        data: { pharmacy_id: pharmacyId, status: 'active' },
      };
    }

    // 연결 + 상태 변경
    const updateResult = await client.query(`
      UPDATE glycopharm_products
      SET pharmacy_id = $1, status = 'active', updated_at = NOW()
      WHERE sku = $2
      RETURNING id, name, sku, pharmacy_id, status
    `, [pharmacyId, PRODUCT_DATA.sku]);

    const updatedProduct = updateResult.rows[0];
    console.log('✅ 약국-상품 연결 + 진열(active) 성공');
    console.log(`   Product ID: ${updatedProduct.id}`);
    console.log(`   pharmacy_id: ${updatedProduct.pharmacy_id}`);
    console.log(`   Status: ${updatedProduct.status}`);
    console.log(`   → "약국이 이 상품을 취급/진열한다" 상태 성립`);

    return {
      step: '2-3-3',
      success: true,
      data: updatedProduct,
    };
  } catch (error: any) {
    console.log('❌ 연결/활성화 실패');
    console.log(`   Error: ${error.message}`);
    return {
      step: '2-3-3',
      success: false,
      error: error.message,
    };
  }
}

async function verifyResult(client: pg.Client): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('검증: 최종 상태 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 약국 확인
  const pharmacyResult = await client.query(`
    SELECT id, name, code, status
    FROM glycopharm_pharmacies
    WHERE code = $1
  `, [PHARMACY_DATA.code]);

  if (pharmacyResult.rows.length > 0) {
    console.log('\n📦 약국 상태:');
    console.log(`   ${JSON.stringify(pharmacyResult.rows[0], null, 2)}`);
  }

  // 상품 확인 (약국 조인)
  const productResult = await client.query(`
    SELECT
      p.id, p.name, p.sku, p.status, p.price, p.pharmacy_id,
      ph.name as pharmacy_name, ph.code as pharmacy_code
    FROM glycopharm_products p
    LEFT JOIN glycopharm_pharmacies ph ON p.pharmacy_id = ph.id
    WHERE p.sku = $1
  `, [PRODUCT_DATA.sku]);

  if (productResult.rows.length > 0) {
    console.log('\n📦 상품 상태:');
    console.log(`   ${JSON.stringify(productResult.rows[0], null, 2)}`);
  }

  // 약국별 상품 조회 (E2E 관점)
  const pharmacyProductsResult = await client.query(`
    SELECT
      p.id, p.name, p.sku, p.price, p.status
    FROM glycopharm_products p
    JOIN glycopharm_pharmacies ph ON p.pharmacy_id = ph.id
    WHERE ph.code = $1 AND p.status = 'active'
  `, [PHARMACY_DATA.code]);

  console.log('\n📋 약국 취급 상품 (active):');
  if (pharmacyProductsResult.rows.length > 0) {
    console.log(`   ${pharmacyProductsResult.rows.length}개 상품`);
    for (const row of pharmacyProductsResult.rows) {
      console.log(`   - ${row.name} (${row.sku}): ₩${row.price}`);
    }
  } else {
    console.log('   0개 (빈 목록)');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const stepArg = args.find(a => a.startsWith('--step='));
  const step = stepArg ? parseInt(stepArg.split('=')[1], 10) : 0;
  const runAll = args.includes('--all') || step === 0;

  console.log('═'.repeat(60));
  console.log('GlycoPharm Phase 2 - Step 2-3 데이터 생성');
  console.log('═'.repeat(60));
  console.log(`Database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log(`Mode: ${runAll ? '전체 실행' : `Step ${step}만 실행`}`);

  const client = new Client(DB_CONFIG);
  const results: StepResult[] = [];

  try {
    await client.connect();
    console.log('✅ DB 연결 성공');

    // Step 실행
    if (runAll || step === 1) {
      results.push(await step1_createPharmacy(client));
    }

    if (runAll || step === 2) {
      results.push(await step2_createProduct(client));
    }

    if (runAll || step === 3) {
      results.push(await step3_linkAndActivate(client));
    }

    // 검증
    if (runAll) {
      await verifyResult(client);
    }

    // 결과 요약
    console.log('\n═'.repeat(60));
    console.log('실행 결과 요약');
    console.log('═'.repeat(60));

    let allSuccess = true;
    for (const r of results) {
      const icon = r.success ? '✅' : '❌';
      console.log(`${icon} Step ${r.step}: ${r.success ? '성공' : '실패'}`);
      if (r.error) {
        console.log(`   └─ Error: ${r.error}`);
        allSuccess = false;
      }
    }

    if (allSuccess && runAll) {
      console.log('\n🎉 Phase 2 - Step 2-3 완료!');
      console.log('   → "구매 직전 단계" 조건 충족');
      console.log('   → Phase 3 (소비자 구매 시도) 진행 가능');
    }

  } catch (error: any) {
    console.error('\n❌ 스크립트 실행 오류:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n연결 종료.');
  }
}

main();
