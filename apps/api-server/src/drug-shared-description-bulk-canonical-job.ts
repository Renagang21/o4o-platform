/**
 * drug-shared-description-bulk-canonical-job.ts — Cloud Run Job entry:
 *   e약은요 SharedProductDescription 안전 후보 → canonical 일괄 승격
 * ================================================================================================
 *
 * WO-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1
 * 런북: CHECK-O4O-DRUG-SHARED-DESCRIPTION-BULK-CANONICAL-APPLY-V1 (선행: CANONICAL-CURATION-V1)
 *
 * 안전:
 *   - 변경 대상 = shared_product_descriptions.status/curated_at/curated_by/updated_* 뿐.
 *     (content 무변경, 다른 테이블 미변경)
 *   - APPLY 이중 가드: DRUG_SHARED_DESC_BULK_CANONICAL_APPLY='I_UNDERSTAND'
 *     AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND'. 하나라도 없으면 dry-run(write 0).
 *   - eligibility = bulkCanonicalDryRun 과 **동일 판정식**(단일 소스). 멱등(canonical 은 재실행 제외).
 *   - HTTP 서버 미기동. entities:[SharedProductDescription] (service repository 는 raw query 만 사용).
 *
 * Env:
 *   DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME
 *   DRUG_SHARED_DESC_BULK_CANONICAL_APPLY  ('I_UNDERSTAND' 이어야 apply)
 *   DRUG_IMPORT_ALLOW_APPLY                ('I_UNDERSTAND' 이어야 apply)
 *   DRUG_SHARED_DESC_SOURCE_TYPE           (optional, 기본 mfds_easy_drug)
 *
 * Exit: 0 성공 / 1 실패.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  bulkCanonicalDryRunQuery,
  bulkCanonicalApplyQuery,
} from './modules/neture/services/shared-product-description.service.js';

const log = {
  info: (m: string) => console.log(`[DRUG-SPD-CANON] ${new Date().toISOString()} INFO: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[DRUG-SPD-CANON] ${new Date().toISOString()} ERROR: ${m}`);
    if (e) console.error(e);
  },
};

function createDataSource(): DataSource {
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME;
  if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Missing DB env (DB_HOST/DB_USERNAME/DB_PASSWORD/DB_NAME).');
  }
  const isSocket = DB_HOST.startsWith('/cloudsql/');
  return new DataSource({
    type: 'postgres',
    host: DB_HOST,
    ...(isSocket ? {} : { port: DB_PORT }),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [], // service 는 raw ds.query 만 사용 (bulkCanonical* 경로)
    synchronize: false,
    logging: ['error'],
  });
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Drug Shared Description Bulk Canonical Job — Starting');
  log.info('='.repeat(60));

  const g1 = process.env.DRUG_SHARED_DESC_BULK_CANONICAL_APPLY === 'I_UNDERSTAND';
  const g2 = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = g1 && g2;
  const sourceType = process.env.DRUG_SHARED_DESC_SOURCE_TYPE ?? 'mfds_easy_drug';
  log.info(`mode = ${apply ? 'APPLY (status→canonical)' : 'dry-run (read-only)'} | sourceType=${sourceType}`);

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const start = Date.now();
    const dry = await bulkCanonicalDryRunQuery(ds, sourceType);
    const applied = apply ? await bulkCanonicalApplyQuery(ds, sourceType, null) : 0;
    const result = { mode: apply ? 'apply' : 'dry-run', eligible: dry.eligibleForBulkCanonical, applied };
    const sec = Math.round((Date.now() - start) / 1000);

    log.info('─'.repeat(50));
    log.info(`mode=${result.mode} sourceType=${sourceType} (${sec}s)`);
    log.info(`totalNeedsReview=${dry.totalNeedsReview} eligible=${result.eligible} applied=${result.applied}`);
    log.info(`excluded: multiManuf=${dry.excludedMultiManufacturer} existingCanonical=${dry.excludedExistingCanonical} emptyContent=${dry.excludedEmptyContent} ambiguous=${dry.excludedAmbiguous}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify({ ...result, sourceType, dryRun: dry }));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Drug Shared Description Bulk Canonical Job — DONE (${result.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
