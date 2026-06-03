/**
 * WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1
 *
 * K-Cosmetics 판매자(=매장 경영자) 중 store context(cosmetics_stores/org)가 없는 기존 사용자에게
 * 내 매장 context 를 1회 backfill 한다. 검증된 provisioning 경로를 그대로 재사용한다
 * (CosmeticsStoreService.ensureStoreContextForOwner — slug registry/org reuse 정합 보장, 멱등).
 *
 * 보정 마이그레이션(20261031000000)이 role 을 cosmetics:store_owner 로 정규화한 *뒤* 실행한다.
 * (role 만 정규화하면 메뉴/가드는 통과하나 cockpit 이 no-store 가 되므로, store context backfill 이 필요.)
 *
 * Usage:
 *   npx tsx src/scripts/backfill-cosmetics-seller-stores.ts            # 전체 backfill 실행
 *   npx tsx src/scripts/backfill-cosmetics-seller-stores.ts --dry-run  # 대상만 출력 (변경 없음)
 *   npx tsx src/scripts/backfill-cosmetics-seller-stores.ts --email=renagang21@gmail.com  # 단일 대상
 *
 * 멱등: 이미 매장이 있으면 ALREADY_HAS_STORE 로 skip. businessNumber 없으면 NO_BUSINESS_NUMBER 로 skip(역할만 보강).
 */

// MUST be first: Load environment variables
import '../env-loader.js';
import 'reflect-metadata';

import { AppDataSource } from '../database/connection.js';
import { CosmeticsStoreService } from '../routes/cosmetics/services/cosmetics-store.service.js';
import logger from '../utils/logger.js';

interface Candidate {
  user_id: string;
  email: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1];

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    logger.info('[backfill-cosmetics-seller-stores] DB connection initialized');
  }

  // 대상: active cosmetics:store_owner 역할 보유 + 활성 매장 membership 없음 (선택적으로 email 필터)
  const params: any[] = [];
  let emailFilter = '';
  if (emailArg) {
    params.push(emailArg);
    emailFilter = `AND u.email = $1`;
  }
  const candidates: Candidate[] = await AppDataSource.query(
    `
    SELECT DISTINCT ra.user_id, u.email
    FROM role_assignments ra
    JOIN users u ON u.id = ra.user_id
    WHERE ra.is_active = true
      AND ra.role = 'cosmetics:store_owner'
      ${emailFilter}
      AND NOT EXISTS (
        SELECT 1 FROM cosmetics.cosmetics_store_members csm
        WHERE csm.user_id = ra.user_id AND csm.is_active = true
      )
    ORDER BY u.email
    `,
    params,
  );

  console.log(
    `[backfill-cosmetics-seller-stores] candidates (store_owner without store)=${candidates.length}${dryRun ? ' (DRY-RUN)' : ''}`,
  );
  candidates.forEach((c) => console.log(`  - ${c.email} (${c.user_id})`));

  if (dryRun || candidates.length === 0) {
    await AppDataSource.destroy();
    return;
  }

  const svc = new CosmeticsStoreService(AppDataSource);
  const tally: Record<string, number> = {};
  const errors: Array<{ email: string; error: string }> = [];

  for (const c of candidates) {
    try {
      const result = await svc.ensureStoreContextForOwner(c.user_id, null);
      tally[result.reason] = (tally[result.reason] ?? 0) + 1;
      console.log(`  ✓ ${c.email}: ${result.reason}${result.storeId ? ` (store=${result.storeId})` : ''}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ email: c.email, error: msg });
      console.error(`  ✗ ${c.email}: ${msg}`);
    }
  }

  console.log('[backfill-cosmetics-seller-stores] DONE —', JSON.stringify(tally), `errors=${errors.length}`);
  if (errors.length > 0) {
    console.error('[backfill-cosmetics-seller-stores] errors:', JSON.stringify(errors, null, 2));
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[backfill-cosmetics-seller-stores] FATAL', err);
  process.exit(1);
});
