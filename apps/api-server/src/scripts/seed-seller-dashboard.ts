/**
 * Seed Seller Dashboard Test Data
 *
 * 개발 환경 전용 - Seller Dashboard UI 검증용
 * KPI 상태 3종 재현: 정상/주의/위험
 *
 * 테이블:
 * - cosmetics_seller_consultation_logs
 * - cosmetics_seller_displays
 * - cosmetics_display_layouts (isVerified 포함)
 * - cosmetics_sample_inventory
 * - cosmetics_sample_usage_logs
 */

import 'reflect-metadata';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'o4o_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false,
});

// ========================================
// 상수 정의
// ========================================

const TEST_SELLER_ID = 'test-seller-001';
const TEST_STORE_ID = uuidv4();

// 테스트용 제품 ID (가상)
const PRODUCT_IDS = [
  uuidv4(),
  uuidv4(),
  uuidv4(),
  uuidv4(),
  uuidv4(),
];

const PRODUCT_NAMES = [
  '프리미엄 에센스 30ml',
  '수분 크림 50ml',
  '클렌징 폼 150ml',
  '선크림 SPF50+ 50ml',
  '아이크림 15ml',
];

// ========================================
// 헬퍼 함수
// ========================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const now = new Date();
  return new Date(now.getTime() - randomInt(0, daysAgo) * 24 * 60 * 60 * 1000);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ========================================
// Seed 함수들
// ========================================

/**
 * 상담 로그 생성
 * - 정상: 전환율 18% 이상
 * - 주의: 전환율 10~15%
 * - 위험: 전환율 10% 미만
 */
async function seedConsultationLogs() {
  console.log('\n=== Seeding Consultation Logs ===');

  // 기존 데이터 삭제
  await pool.query(
    `DELETE FROM cosmetics_seller_consultation_logs WHERE "sellerId" = $1`,
    [TEST_SELLER_ID]
  );

  const statuses: Array<{
    status: string;
    weight: number;
    hasPurchase: boolean;
  }> = [
    { status: 'completed', weight: 4, hasPurchase: true },
    { status: 'completed', weight: 2, hasPurchase: false },
    { status: 'no_purchase', weight: 2, hasPurchase: false },
    { status: 'pending', weight: 1, hasPurchase: false },
    { status: 'cancelled', weight: 1, hasPurchase: false },
  ];

  let insertedCount = 0;

  // 최근 30일간 상담 데이터 생성 (20~30건)
  const totalConsultations = randomInt(20, 30);

  for (let i = 0; i < totalConsultations; i++) {
    const statusEntry = randomElement(statuses);
    const productCount = randomInt(1, 3);

    const recommendedProducts = [];
    const purchasedProducts = [];

    for (let j = 0; j < productCount; j++) {
      const productIdx = randomInt(0, PRODUCT_IDS.length - 1);
      recommendedProducts.push({
        productId: PRODUCT_IDS[productIdx],
        productName: PRODUCT_NAMES[productIdx],
        reason: '피부 타입에 적합',
        wasAccepted: statusEntry.hasPurchase && Math.random() > 0.3,
      });

      if (statusEntry.hasPurchase && Math.random() > 0.4) {
        purchasedProducts.push({
          productId: PRODUCT_IDS[productIdx],
          productName: PRODUCT_NAMES[productIdx],
          quantity: randomInt(1, 2),
          price: randomInt(30000, 80000),
        });
      }
    }

    const createdAt = randomDate(30);

    await pool.query(
      `INSERT INTO cosmetics_seller_consultation_logs (
        id, "sellerId", "resultStatus", "recommendedProducts", "purchasedProducts",
        "consultationDurationMinutes", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [
        uuidv4(),
        TEST_SELLER_ID,
        statusEntry.status,
        JSON.stringify(recommendedProducts),
        JSON.stringify(purchasedProducts),
        randomInt(5, 30),
        createdAt,
      ]
    );

    insertedCount++;
  }

  console.log(`  Created ${insertedCount} consultation logs`);
}

/**
 * Seller Display 생성 (cosmetics_seller_displays)
 */
async function seedSellerDisplays() {
  console.log('\n=== Seeding Seller Displays ===');

  await pool.query(
    `DELETE FROM cosmetics_seller_displays WHERE "sellerId" = $1`,
    [TEST_SELLER_ID]
  );

  const locations = ['entrance', 'counter', 'shelf_a', 'shelf_b', 'window'];
  const qualities = ['excellent', 'good', 'average', 'poor'];

  let insertedCount = 0;

  for (let i = 0; i < PRODUCT_IDS.length; i++) {
    await pool.query(
      `INSERT INTO cosmetics_seller_displays (
        id, "sellerId", "productId", location, "faceCount", "facingQuality",
        "isActive", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        uuidv4(),
        TEST_SELLER_ID,
        PRODUCT_IDS[i],
        locations[i % locations.length],
        randomInt(1, 4),
        randomElement(qualities),
        true,
      ]
    );

    insertedCount++;
  }

  console.log(`  Created ${insertedCount} seller displays`);
}

/**
 * Display Layout 생성 (cosmetics_display_layouts)
 * - isVerified 필드 포함
 */
async function seedDisplayLayouts() {
  console.log('\n=== Seeding Display Layouts ===');

  await pool.query(
    `DELETE FROM cosmetics_display_layouts WHERE "storeId" = $1`,
    [TEST_STORE_ID]
  );

  const positions = ['eye_level', 'top_shelf', 'middle_shelf', 'bottom_shelf', 'counter'];
  const statuses = ['active', 'active', 'active', 'needs_refill', 'inactive'];

  let insertedCount = 0;
  let verifiedCount = 0;

  for (let i = 0; i < PRODUCT_IDS.length; i++) {
    // 70% 인증 완료
    const isVerified = Math.random() < 0.7;
    if (isVerified) verifiedCount++;

    await pool.query(
      `INSERT INTO cosmetics_display_layouts (
        id, "storeId", "productId", "productName", "shelfPosition",
        "facingCount", status, "isVerified", "verifiedAt",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        uuidv4(),
        TEST_STORE_ID,
        PRODUCT_IDS[i],
        PRODUCT_NAMES[i],
        positions[i % positions.length],
        randomInt(1, 4),
        randomElement(statuses),
        isVerified,
        isVerified ? randomDate(14) : null,
      ]
    );

    insertedCount++;
  }

  console.log(`  Created ${insertedCount} display layouts (${verifiedCount} verified)`);
}

/**
 * Sample Inventory 생성
 * - 재고 상태 분포: in_stock, low_stock, out_of_stock
 */
async function seedSampleInventory() {
  console.log('\n=== Seeding Sample Inventory ===');

  await pool.query(
    `DELETE FROM cosmetics_sample_inventory WHERE "storeId" = $1`,
    [TEST_STORE_ID]
  );

  const inventoryConfigs = [
    { quantityRemaining: 15, status: 'in_stock' },
    { quantityRemaining: 12, status: 'in_stock' },
    { quantityRemaining: 3, status: 'low_stock' },
    { quantityRemaining: 2, status: 'low_stock' },
    { quantityRemaining: 0, status: 'out_of_stock' },
  ];

  let insertedCount = 0;

  for (let i = 0; i < PRODUCT_IDS.length; i++) {
    const config = inventoryConfigs[i];
    const quantityReceived = randomInt(20, 50);
    const quantityUsed = quantityReceived - config.quantityRemaining;

    await pool.query(
      `INSERT INTO cosmetics_sample_inventory (
        id, "storeId", "productId", "productName", "sampleType",
        "quantityReceived", "quantityUsed", "quantityRemaining",
        "minimumStock", status, "unitCost",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [
        uuidv4(),
        TEST_STORE_ID,
        PRODUCT_IDS[i],
        PRODUCT_NAMES[i],
        'trial',
        quantityReceived,
        quantityUsed,
        config.quantityRemaining,
        5,
        config.status,
        randomInt(1000, 5000),
      ]
    );

    insertedCount++;
  }

  console.log(`  Created ${insertedCount} sample inventory records`);
}

/**
 * Sample Usage Log 생성
 * - 일별 사용량 / 구매 전환
 */
async function seedSampleUsageLogs() {
  console.log('\n=== Seeding Sample Usage Logs ===');

  await pool.query(
    `DELETE FROM cosmetics_sample_usage_logs WHERE "storeId" = $1`,
    [TEST_STORE_ID]
  );

  let insertedCount = 0;

  // 최근 30일간 사용 로그 생성
  for (let day = 0; day < 30; day++) {
    const usageDate = new Date();
    usageDate.setDate(usageDate.getDate() - day);
    usageDate.setHours(randomInt(9, 18), randomInt(0, 59), 0, 0);

    // 하루 1~5건 사용
    const dailyUsages = randomInt(1, 5);

    for (let u = 0; u < dailyUsages; u++) {
      const productIdx = randomInt(0, PRODUCT_IDS.length - 1);
      // 구매 전환율 약 20%
      const resultedInPurchase = Math.random() < 0.2;

      await pool.query(
        `INSERT INTO cosmetics_sample_usage_logs (
          id, "storeId", "productId", "productName",
          "quantityUsed", "usedAt", "resultedInPurchase",
          "purchaseAmount", "customerReaction",
          "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $6)`,
        [
          uuidv4(),
          TEST_STORE_ID,
          PRODUCT_IDS[productIdx],
          PRODUCT_NAMES[productIdx],
          1,
          usageDate,
          resultedInPurchase,
          resultedInPurchase ? randomInt(30000, 80000) : null,
          resultedInPurchase
            ? 'purchased'
            : randomElement(['positive', 'neutral', 'negative', 'no_feedback']),
        ]
      );

      insertedCount++;
    }
  }

  console.log(`  Created ${insertedCount} sample usage logs`);
}

/**
 * Seller Inventory 생성 (cosmetics_seller_inventory - 있는 경우)
 */
async function seedSellerInventory() {
  console.log('\n=== Seeding Seller Inventory ===');

  // 테이블 존재 여부 확인
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'cosmetics_seller_inventory'
    )
  `);

  if (!tableCheck.rows[0].exists) {
    console.log('  Table cosmetics_seller_inventory does not exist, skipping...');
    return;
  }

  await pool.query(
    `DELETE FROM cosmetics_seller_inventory WHERE "sellerId" = $1`,
    [TEST_SELLER_ID]
  );

  let insertedCount = 0;

  for (let i = 0; i < PRODUCT_IDS.length; i++) {
    const quantity = randomInt(0, 20);
    const lowStockThreshold = 5;

    await pool.query(
      `INSERT INTO cosmetics_seller_inventory (
        id, "sellerId", "productId", quantity, "lowStockThreshold",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [uuidv4(), TEST_SELLER_ID, PRODUCT_IDS[i], quantity, lowStockThreshold]
    );

    insertedCount++;
  }

  console.log(`  Created ${insertedCount} seller inventory records`);
}

// ========================================
// 검증 및 통계
// ========================================

async function verifyAndPrintStats() {
  console.log('\n=== Verification & Statistics ===');

  // 상담 통계
  const consultationStats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "resultStatus" = 'completed') as completed,
      COUNT(*) FILTER (WHERE "purchasedProducts"::text != '[]') as with_purchase
    FROM cosmetics_seller_consultation_logs
    WHERE "sellerId" = $1
  `, [TEST_SELLER_ID]);

  const cs = consultationStats.rows[0];
  const conversionRate = cs.total > 0 ? ((cs.with_purchase / cs.total) * 100).toFixed(1) : 0;

  console.log('\n📊 Consultation Stats:');
  console.log(`  Total: ${cs.total}`);
  console.log(`  Completed: ${cs.completed}`);
  console.log(`  With Purchase: ${cs.with_purchase}`);
  console.log(`  Conversion Rate: ${conversionRate}%`);

  // 진열 통계
  const displayStats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "isActive" = true) as active,
      SUM("faceCount") as total_faces
    FROM cosmetics_seller_displays
    WHERE "sellerId" = $1
  `, [TEST_SELLER_ID]);

  const ds = displayStats.rows[0];
  console.log('\n📊 Seller Display Stats:');
  console.log(`  Total Displays: ${ds.total}`);
  console.log(`  Active: ${ds.active}`);
  console.log(`  Total Face Count: ${ds.total_faces}`);

  // Display Layout 통계
  const layoutStats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE "isVerified" = true) as verified,
      COUNT(*) FILTER (WHERE status = 'needs_refill') as needs_refill
    FROM cosmetics_display_layouts
    WHERE "storeId" = $1
  `, [TEST_STORE_ID]);

  const ls = layoutStats.rows[0];
  const healthScore = ls.total > 0 ? ((ls.verified / ls.total) * 100).toFixed(0) : 0;

  console.log('\n📊 Display Layout Stats:');
  console.log(`  Total: ${ls.total}`);
  console.log(`  Active: ${ls.active}`);
  console.log(`  Verified: ${ls.verified}`);
  console.log(`  Needs Refill: ${ls.needs_refill}`);
  console.log(`  Health Score: ${healthScore}%`);

  // 샘플 재고 통계
  const inventoryStats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'in_stock') as in_stock,
      COUNT(*) FILTER (WHERE status = 'low_stock') as low_stock,
      COUNT(*) FILTER (WHERE status = 'out_of_stock') as out_of_stock
    FROM cosmetics_sample_inventory
    WHERE "storeId" = $1
  `, [TEST_STORE_ID]);

  const is = inventoryStats.rows[0];
  console.log('\n📊 Sample Inventory Stats:');
  console.log(`  Total Products: ${is.total}`);
  console.log(`  In Stock: ${is.in_stock}`);
  console.log(`  Low Stock: ${is.low_stock}`);
  console.log(`  Out of Stock: ${is.out_of_stock}`);

  // 샘플 사용 통계
  const usageStats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "resultedInPurchase" = true) as purchases,
      SUM("quantityUsed") as total_used
    FROM cosmetics_sample_usage_logs
    WHERE "storeId" = $1
  `, [TEST_STORE_ID]);

  const us = usageStats.rows[0];
  const sampleConversionRate = us.total > 0 ? ((us.purchases / us.total) * 100).toFixed(1) : 0;

  console.log('\n📊 Sample Usage Stats:');
  console.log(`  Total Usage Logs: ${us.total}`);
  console.log(`  Resulted in Purchase: ${us.purchases}`);
  console.log(`  Sample Conversion Rate: ${sampleConversionRate}%`);

  // Test IDs 출력
  console.log('\n🔑 Test IDs for API Calls:');
  console.log(`  Seller ID: ${TEST_SELLER_ID}`);
  console.log(`  Store ID: ${TEST_STORE_ID}`);

  // colorMode 예상값
  console.log('\n🎨 Expected colorMode Values:');
  const convRate = parseFloat(conversionRate as string);
  console.log(`  Conversion Rate (${convRate}%): ${convRate >= 15 ? 'positive' : convRate >= 10 ? 'neutral' : 'negative'}`);
  const health = parseFloat(healthScore as string);
  console.log(`  Health Score (${health}%): ${health >= 80 ? 'positive' : health >= 50 ? 'neutral' : 'negative'}`);
  console.log(`  Low Stock Count (${is.low_stock}): ${is.low_stock >= 3 ? 'negative' : 'neutral'}`);
}

// ========================================
// 메인 실행
// ========================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      Seller Dashboard Test Data Seed (Dev Only)          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ This script cannot run in production environment!');
    process.exit(1);
  }

  try {
    // 테이블 존재 여부 확인
    const tablesCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'cosmetics_%'
    `);

    console.log('\n📋 Available Cosmetics Tables:');
    tablesCheck.rows.forEach((row) => console.log(`  - ${row.table_name}`));

    // Seed 실행
    await seedConsultationLogs();
    await seedSellerDisplays();
    await seedDisplayLayouts();
    await seedSampleInventory();
    await seedSampleUsageLogs();
    await seedSellerInventory();

    // 검증
    await verifyAndPrintStats();

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 API Endpoints to Test:');
    console.log(`  GET /api/v1/cosmetics-seller/consultation/seller/${TEST_SELLER_ID}/stats`);
    console.log(`  GET /api/v1/cosmetics-seller/display/seller/${TEST_SELLER_ID}/stats`);
    console.log(`  GET /api/v1/cosmetics-sample/inventory/${TEST_STORE_ID}/stats`);
    console.log(`  GET /api/v1/cosmetics-sample/display/${TEST_STORE_ID}/summary`);
    console.log(`  GET /api/v1/cosmetics-sample/usage/${TEST_STORE_ID}/daily?days=7`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
