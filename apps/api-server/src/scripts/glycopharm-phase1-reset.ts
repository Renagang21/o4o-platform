/**
 * GlycoPharm Phase 1 - 데이터 리셋 스크립트
 *
 * Phase 1 – Step 2: "삭제 = 디버깅 시작"
 *
 * 목적:
 * - GlycoPharm 6개 테이블 데이터를 FK 순서대로 리셋 (0건)
 * - 스키마는 유지, 데이터만 삭제
 * - 삭제 과정에서 숨은 의존성 발견 = 버그 후보
 *
 * 삭제 순서 (FK 의존성 순서):
 * 1. glycopharm_order_items
 * 2. glycopharm_orders
 * 3. glycopharm_product_logs
 * 4. glycopharm_products
 * 5. glycopharm_applications
 * 6. glycopharm_pharmacies
 *
 * 사용법:
 * npx tsx src/scripts/glycopharm-phase1-reset.ts
 *
 * 옵션:
 * --dry-run : 실제 삭제 없이 현재 데이터 개수만 확인
 * --force   : 확인 없이 즉시 실행
 */

import pg from 'pg';
const { Client } = pg;

// 자격증명은 환경변수로만 주입한다. fallback 리터럴을 두지 않는다 (CLAUDE.md §15).
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

for (const key of ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'] as const) {
  if (!process.env[key]) {
    console.error(`❌ ${key} 환경변수가 필요합니다.`);
    process.exit(1);
  }
}

// 삭제 순서 (FK 의존성 기반)
const TABLES_TO_RESET = [
  'glycopharm_order_items',
  'glycopharm_orders',
  'glycopharm_product_logs',
  'glycopharm_products',
  'glycopharm_applications',
  'glycopharm_pharmacies',
];

interface TableCount {
  table: string;
  count: number;
  exists: boolean;
}

async function getTableCounts(client: pg.Client): Promise<TableCount[]> {
  const results: TableCount[] = [];

  for (const table of TABLES_TO_RESET) {
    try {
      const checkResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists
      `, [table]);

      const exists = checkResult.rows[0]?.exists || false;

      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        results.push({
          table,
          count: parseInt(countResult.rows[0]?.count || '0', 10),
          exists: true,
        });
      } else {
        results.push({
          table,
          count: 0,
          exists: false,
        });
      }
    } catch (error: any) {
      console.error(`[ERROR] 테이블 ${table} 확인 실패:`, error.message);
      results.push({
        table,
        count: -1,
        exists: false,
      });
    }
  }

  return results;
}

async function deleteTableData(client: pg.Client, table: string): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    // 삭제 전 개수 확인
    const beforeResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
    const beforeCount = parseInt(beforeResult.rows[0]?.count || '0', 10);

    // 데이터 삭제
    await client.query(`DELETE FROM ${table}`);

    // 삭제 후 개수 확인
    const afterResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
    const afterCount = parseInt(afterResult.rows[0]?.count || '0', 10);

    return {
      success: afterCount === 0,
      deleted: beforeCount - afterCount,
    };
  } catch (error: any) {
    return {
      success: false,
      deleted: 0,
      error: error.message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');

  console.log('='.repeat(60));
  console.log('GlycoPharm Phase 1 - 데이터 리셋 스크립트');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (삭제 없음)' : 'EXECUTE (실제 삭제)'}`);
  console.log(`Database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log('='.repeat(60));

  const client = new Client(DB_CONFIG);

  try {
    console.log('\n[1/3] 데이터베이스 연결 중...');
    await client.connect();
    console.log('✅ 연결 성공');

    // 현재 데이터 상태 확인
    console.log('\n[2/3] 현재 데이터 상태 확인...');
    const tableCounts = await getTableCounts(client);

    console.log('\n📊 GlycoPharm 테이블 현황:');
    console.log('-'.repeat(50));

    let totalRows = 0;
    let missingTables: string[] = [];

    for (const tc of tableCounts) {
      if (!tc.exists) {
        console.log(`  ❌ ${tc.table}: 테이블 없음`);
        missingTables.push(tc.table);
      } else if (tc.count === -1) {
        console.log(`  ⚠️ ${tc.table}: 확인 실패`);
      } else {
        console.log(`  ✅ ${tc.table}: ${tc.count}건`);
        totalRows += tc.count;
      }
    }

    console.log('-'.repeat(50));
    console.log(`  📈 총 데이터: ${totalRows}건`);

    if (missingTables.length > 0) {
      console.log(`\n⚠️ 경고: ${missingTables.length}개 테이블이 DB에 존재하지 않음`);
      console.log(`  → ${missingTables.join(', ')}`);
      console.log('  → 이 테이블들은 아직 마이그레이션되지 않았을 수 있습니다.');
    }

    if (isDryRun) {
      console.log('\n🔍 DRY RUN 완료 - 삭제 없이 상태만 확인했습니다.');
      await client.end();
      return;
    }

    if (totalRows === 0) {
      console.log('\n✅ 모든 테이블이 이미 비어 있습니다. 삭제 필요 없음.');
      await client.end();
      return;
    }

    // 삭제 실행
    console.log('\n[3/3] 데이터 삭제 실행...');
    console.log('⚠️ FK 순서대로 삭제합니다.\n');

    const deleteResults: { table: string; result: { success: boolean; deleted: number; error?: string } }[] = [];

    for (const table of TABLES_TO_RESET) {
      const tc = tableCounts.find(t => t.table === table);

      if (!tc?.exists) {
        console.log(`  ⏭️ ${table}: 건너뜀 (테이블 없음)`);
        continue;
      }

      if (tc.count === 0) {
        console.log(`  ⏭️ ${table}: 건너뜀 (이미 0건)`);
        continue;
      }

      process.stdout.write(`  🗑️ ${table}: ${tc.count}건 삭제 중...`);
      const result = await deleteTableData(client, table);
      deleteResults.push({ table, result });

      if (result.success) {
        console.log(` ✅ ${result.deleted}건 삭제 완료`);
      } else {
        console.log(` ❌ 실패: ${result.error}`);
      }
    }

    // 최종 확인
    console.log('\n📋 삭제 후 최종 상태 확인...');
    const finalCounts = await getTableCounts(client);

    console.log('\n📊 최종 결과:');
    console.log('-'.repeat(50));

    let allEmpty = true;
    for (const tc of finalCounts) {
      if (tc.exists && tc.count > 0) {
        console.log(`  ⚠️ ${tc.table}: ${tc.count}건 (삭제 실패)`);
        allEmpty = false;
      } else if (tc.exists) {
        console.log(`  ✅ ${tc.table}: 0건`);
      }
    }

    console.log('-'.repeat(50));

    if (allEmpty) {
      console.log('\n✅ Phase 1 데이터 리셋 완료!');
      console.log('   모든 GlycoPharm 테이블이 0건 상태입니다.');
      console.log('\n👉 다음 단계: GlycoPharm FE/API에서 빈 상태 로딩 확인');
    } else {
      console.log('\n⚠️ 일부 테이블에 데이터가 남아 있습니다.');
      console.log('   → FK 제약 또는 숨은 의존성 확인 필요');
    }

    // 오류 요약
    const errors = deleteResults.filter(r => !r.result.success);
    if (errors.length > 0) {
      console.log('\n❌ 삭제 실패 목록 (디버깅 이슈):');
      for (const e of errors) {
        console.log(`  - ${e.table}: ${e.result.error}`);
      }
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
