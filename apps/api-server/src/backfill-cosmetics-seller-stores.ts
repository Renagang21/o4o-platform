/**
 * backfill-cosmetics-seller-stores.ts — Cloud Run Job Entry Point
 * ===============================================================
 *
 * WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1
 *
 * K-Cosmetics 판매자(=매장 경영자) 중 store/org context 가 없는 기존 사용자에게
 * 내 매장 context 를 1회 backfill 한다. 검증된 provisioning 경로를 그대로 재사용한다
 * (CosmeticsStoreService.ensureStoreContextForOwner — slug registry / org reuse 정합 보장, 멱등).
 *
 * 본 파일은 `migrate.ts` 처럼 **컴파일되는 전용 entry** 이다 (src/scripts/** 는 빌드 제외이므로 src 루트에 둔다).
 * 앱 AppDataSource(엔티티 포함)를 초기화하므로 Cloud Run Job 에서 `node dist/backfill-cosmetics-seller-stores.js`
 * 로 실행한다. (migrate.ts 의 entities:[] 경량 DataSource 와 달리, store provisioning 은 엔티티가 필요.)
 *
 * Args:
 *   --dry-run            대상만 출력 (변경 없음)
 *   --email=<addr>       단일 대상만 처리
 *
 * Exit: 0 성공 / 1 실패
 *
 * 멱등: 이미 매장 보유 시 ALREADY_HAS_STORE skip. businessNumber 부재 시 NO_BUSINESS_NUMBER (store 미생성, 역할만 보강).
 */

import './env-loader.js';
import 'reflect-metadata';

import { AppDataSource } from './database/connection.js';
import { CosmeticsStoreService } from './routes/cosmetics/services/cosmetics-store.service.js';

interface Candidate {
  user_id: string;
  email: string;
}

const log = {
  info: (m: string) => console.log(`[BACKFILL-KCOS-STORES] ${new Date().toISOString()} ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[BACKFILL-KCOS-STORES] ${new Date().toISOString()} ERROR: ${m}`);
    if (e) console.error(e);
  },
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1];

  log.info('='.repeat(60));
  log.info(`Cosmetics seller store backfill — start (dryRun=${dryRun}${emailArg ? `, email=${emailArg}` : ''})`);

  await AppDataSource.initialize();
  log.info('DB connection initialized');

  // 대상: active cosmetics:store_owner 역할 보유 + 활성 매장 membership 없음 (선택적 email 필터)
  const params: unknown[] = [];
  let emailFilter = '';
  if (emailArg) {
    params.push(emailArg);
    emailFilter = 'AND u.email = $1';
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

  log.info(`candidates (store_owner without store)=${candidates.length}${dryRun ? ' (DRY-RUN)' : ''}`);
  candidates.forEach((c) => log.info(`  - ${c.email} (${c.user_id})`));

  if (dryRun || candidates.length === 0) {
    await AppDataSource.destroy();
    log.info('DONE (dry-run / no candidates)');
    process.exit(0);
  }

  const svc = new CosmeticsStoreService(AppDataSource);
  const tally: Record<string, number> = {};
  const errors: Array<{ email: string; error: string }> = [];

  for (const c of candidates) {
    try {
      const result = await svc.ensureStoreContextForOwner(c.user_id, null);
      tally[result.reason] = (tally[result.reason] ?? 0) + 1;
      log.info(`  ✓ ${c.email}: ${result.reason}${result.storeId ? ` (store=${result.storeId})` : ''}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ email: c.email, error: msg });
      log.error(`  ✗ ${c.email}: ${msg}`);
    }
  }

  log.info(`DONE — ${JSON.stringify(tally)} errors=${errors.length}`);
  if (errors.length > 0) {
    log.error(`errors: ${JSON.stringify(errors, null, 2)}`);
  }

  await AppDataSource.destroy();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  log.error('FATAL', err);
  process.exit(1);
});
