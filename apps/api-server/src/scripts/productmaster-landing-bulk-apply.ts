/**
 * ProductMaster Landing Bulk Apply — 전 ProductMaster 에 제품 Landing 발급
 *
 * WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 3
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT
 *
 * 기본은 **dry-run(write 0)**. 실제 발급은 `--apply --batch-id <id>` 를 명시해야 실행된다.
 *   - dry-run: total / 이미 발급 / 발급 대상(toCreate) / 샘플. SELECT only.
 *   - apply  : Landing 미보유 master 에 Landing 1개씩 batch INSERT(idempotent·재개 가능).
 *              public_key 충돌 시 DO NOTHING → 다음 루프 재시도. metadata.batchId 기록(rollback 식별).
 *
 * 안전: QR 이미지 비저장(Landing 신원만 저장). ProductMaster 무변경. master 당 Landing 1개(UNIQUE).
 *       rollback = metadata->>'batchId' 기준 soft delete.
 *
 * WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1
 *   본 스크립트는 일회성 seed 도구가 아니라 **재실행 가능한 reconcile 도구**다.
 *   - 런타임 생성 경로는 `ensureProductLandingForMaster()`(product-landing.service.ts)로 on-create 보장한다.
 *   - 개발용 대량 생성 스크립트(hff-* / cosmetics-* / medical-device-* 등)는 landing 발급 코드를 복사하지 않는다.
 *     **대량 생성 작업 종료 후 본 스크립트를 재실행**하면 coverage 가 100% 로 복구된다.
 *   - 누락이 0 이면 dry-run toCreate=0, apply 해도 write 0 (멱등).
 *
 * 실행(읽기 전용 dry-run):
 *   DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *     npx tsx src/scripts/productmaster-landing-bulk-apply.ts [--limit N] [--out r.json]
 * 실제 발급(승인 후):
 *   ... npx tsx src/scripts/productmaster-landing-bulk-apply.ts --apply --batch-id landing-seed-YYYYMMDD [--batch-size 1000]
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { randomBytes } from 'crypto';

const KEY_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const KEY_LENGTH = 12;

function get(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : undefined;
}
function has(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`) || argv.some((a) => a.startsWith(`--${name}=`));
}
function genKey(): string {
  const b = randomBytes(KEY_LENGTH);
  let out = '';
  for (let i = 0; i < KEY_LENGTH; i++) out += KEY_ALPHABET[b[i] % KEY_ALPHABET.length];
  return out;
}
function makeDataSource(): DataSource {
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  if (!DB_USERNAME || !DB_PASSWORD) throw new Error('DB_USERNAME / DB_PASSWORD env 필수.');
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '15432', 10),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [],
    synchronize: false,
    logging: ['error'],
  });
}
const n = (v: unknown) => Number((v as any) ?? 0);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = has(argv, 'apply');
  const batchId = get(argv, 'batch-id');
  const batchSize = Math.min(Math.max(parseInt(get(argv, 'batch-size') || '1000', 10) || 1000, 1), 5000);
  const limit = get(argv, 'limit') ? parseInt(get(argv, 'limit')!, 10) : null;
  const out = get(argv, 'out') ?? null;

  if (apply && !batchId) throw new Error('--apply 시 --batch-id 필수 (rollback 식별용).');

  const ds = makeDataSource();
  await ds.initialize();
  try {
    const totalMasters = n((await ds.query(`SELECT count(*)::int AS c FROM product_masters`))[0]?.c);
    const alreadyHasLanding = n(
      (await ds.query(`SELECT count(*)::int AS c FROM product_landings WHERE deleted_at IS NULL`))[0]?.c,
    );
    const toCreateAll = n(
      (await ds.query(
        `SELECT count(*)::int AS c FROM product_masters pm
         WHERE NOT EXISTS (SELECT 1 FROM product_landings l WHERE l.product_master_id = pm.id AND l.deleted_at IS NULL)`,
      ))[0]?.c,
    );
    const sample = await ds.query(
      `SELECT pm.id, pm.name FROM product_masters pm
       WHERE NOT EXISTS (SELECT 1 FROM product_landings l WHERE l.product_master_id = pm.id AND l.deleted_at IS NULL)
       ORDER BY pm.name LIMIT 5`,
    );

    if (!apply) {
      const report = {
        mode: 'dry-run',
        writeCount: 0,
        totalMasters,
        alreadyHasLanding,
        toCreate: limit != null ? Math.min(limit, toCreateAll) : toCreateAll,
        toCreateAll,
        limitApplied: limit,
        sample,
        applyHint: '--apply --batch-id landing-seed-YYYYMMDD [--batch-size 1000] 로 실제 발급',
      };
      const json = JSON.stringify(report, null, 2);
      if (out) fs.writeFileSync(out, json, 'utf8');
      process.stdout.write(json + '\n');
      return;
    }

    // ── APPLY ──────────────────────────────────────────────────────────────
    console.error(`[apply] batchId=${batchId} batchSize=${batchSize} limit=${limit ?? '∞'} toCreateAll=${toCreateAll}`);
    let created = 0;
    let loops = 0;
    let lastProgress = -1;
    while (true) {
      if (limit != null && created >= limit) break;
      const pageSize = limit != null ? Math.min(batchSize, limit - created) : batchSize;
      const masters: { id: string }[] = await ds.query(
        `SELECT pm.id FROM product_masters pm
         WHERE NOT EXISTS (SELECT 1 FROM product_landings l WHERE l.product_master_id = pm.id AND l.deleted_at IS NULL)
         LIMIT ${pageSize}`,
      );
      if (masters.length === 0) break;

      // multi-row INSERT, public_key 충돌 시 DO NOTHING(다음 루프 재시도)
      const values: string[] = [];
      const params: unknown[] = [];
      masters.forEach((m, idx) => {
        const base = idx * 3;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        params.push(m.id, genKey(), JSON.stringify({ batchId, source: 'productmaster_landing_bulk_apply' }));
      });
      const res = await ds.query(
        `INSERT INTO product_landings (product_master_id, public_key, metadata)
         VALUES ${values.join(', ')}
         ON CONFLICT (public_key) DO NOTHING
         RETURNING id`,
        params,
      );
      created += Array.isArray(res) ? res.length : 0;
      loops++;
      if (loops % 10 === 0 || created === lastProgress) console.error(`[apply] created=${created} loops=${loops}`);
      // 진행 정체(전부 키 충돌 등) 방지: 같은 진행값 2회 연속이면 중단
      if (created === lastProgress && masters.length > 0) {
        console.error('[apply] 진행 정체 감지 — 중단(재실행 시 이어서 발급).');
        break;
      }
      lastProgress = created;
    }

    const finalHasLanding = n(
      (await ds.query(`SELECT count(*)::int AS c FROM product_landings WHERE deleted_at IS NULL`))[0]?.c,
    );
    const byBatch = n(
      (await ds.query(`SELECT count(*)::int AS c FROM product_landings WHERE metadata->>'batchId' = $1`, [batchId]))[0]?.c,
    );
    const report = {
      mode: 'apply',
      batchId,
      createdThisRun: created,
      totalLandingsNow: finalHasLanding,
      landingsInThisBatch: byBatch,
      totalMasters,
      rollbackHint: `soft delete: UPDATE product_landings SET deleted_at=now() WHERE metadata->>'batchId' = '${batchId}' AND deleted_at IS NULL`,
    };
    const json = JSON.stringify(report, null, 2);
    if (out) fs.writeFileSync(out, json, 'utf8');
    process.stdout.write(json + '\n');
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('[productmaster-landing-bulk-apply] 실패:', err);
  process.exit(1);
});
