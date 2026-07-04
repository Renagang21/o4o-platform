/**
 * easy-drug-shared-description-derive-job.ts — Cloud Run Job entry:
 *   e약은요 ProductCandidate → 매칭 ProductMaster별 SharedProductDescription 파생
 * ================================================================================================
 *
 * WO-O4O-EASY-DRUG-INFO-CANDIDATE-APPLY-AND-SHARED-DESCRIPTION-DERIVATION-V1 / Gate C
 * 런북: CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1
 *
 * 안전:
 *   - 생성 대상 = shared_product_descriptions 뿐 (source_type='mfds_easy_drug', status='needs_review').
 *   - APPLY 이중 가드: EASY_DRUG_DERIVE_APPLY='true' AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND'.
 *     하나라도 없으면 dry-run(write 0, 매칭·파생 예정 수만 산출).
 *   - dedup: (master_id, 'mfds_easy_drug', candidate.id) → 재실행 멱등.
 *   - HTTP 서버 미기동. DataSource 는 SharedProductDescription 엔티티만 등록(createCandidate repo 용).
 *
 * Env:
 *   DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME
 *   EASY_DRUG_DERIVE_APPLY   ('true' 면 apply, 그 외 dry-run)
 *   DRUG_IMPORT_ALLOW_APPLY  ('I_UNDERSTAND' 이어야 apply 허용)
 *   EASY_DRUG_DERIVE_LIMIT   (optional, candidate 처리 제한)
 *
 * Exit: 0 성공 / 1 실패.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SharedProductDescription } from './modules/neture/entities/SharedProductDescription.entity.js';
import { EasyDrugSharedDescriptionDeriveService } from './modules/neture/drug-import/easy-drug-shared-description-derive.service.js';

const log = {
  info: (m: string) => console.log(`[EASY-DRUG-SPD] ${new Date().toISOString()} INFO: ${m}`),
  warn: (m: string) => console.warn(`[EASY-DRUG-SPD] ${new Date().toISOString()} WARN: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[EASY-DRUG-SPD] ${new Date().toISOString()} ERROR: ${m}`);
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
    entities: [SharedProductDescription], // createCandidate repo 용 — 그 외는 raw ds.query
    synchronize: false,
    logging: ['error'],
  });
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Easy Drug Shared Description Derive Job — Starting');
  log.info('='.repeat(60));

  const wantApply = process.env.EASY_DRUG_DERIVE_APPLY === 'true';
  const guardOk = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = wantApply && guardOk;
  if (wantApply && !guardOk) {
    throw new Error('APPLY_BLOCKED: EASY_DRUG_DERIVE_APPLY=true 이나 DRUG_IMPORT_ALLOW_APPLY!=I_UNDERSTAND. write 차단.');
  }
  const limitRaw = process.env.EASY_DRUG_DERIVE_LIMIT;
  const limit = limitRaw != null && limitRaw !== '' ? parseInt(limitRaw, 10) : null;
  log.info(`mode = ${apply ? 'APPLY (DB write: shared_product_descriptions)' : 'dry-run (read-only)'} | limit=${limit ?? 'none'}`);

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const start = Date.now();
    const service = new EasyDrugSharedDescriptionDeriveService(ds);
    const report = await service.run({ apply, limit });
    const sec = Math.round((Date.now() - start) / 1000);

    log.info('─'.repeat(50));
    log.info(`mode=${report.mode} sourceType=${report.sourceType} (${sec}s)`);
    log.info(`easyCandidates: total=${report.totalEasyCandidates} scanned=${report.scannedCandidates}`);
    log.info(`match: matched=${report.matchedCandidates} unmatched=${report.unmatchedCandidates} emptyContent=${report.emptyContentCandidates}`);
    log.info(`links: considered=${report.masterLinksConsidered} created=${report.created} skippedDup=${report.skippedDuplicate} skippedEmpty=${report.skippedEmpty} errored=${report.errored}`);
    if (report.errors.length) log.warn(`errors(${report.errored}): ${JSON.stringify(report.errors.slice(0, 5))}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Easy Drug Shared Description Derive Job — DONE (${report.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
