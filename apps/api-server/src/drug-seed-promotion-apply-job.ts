/**
 * drug-seed-promotion-apply-job.ts — Cloud Run Job entry: ProductCandidate → ProductMaster/Identifier 승격
 * ================================================================================================
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1 / 게이트 B.
 * 배치 승격(runCandidatePromotion apply)을 운영 DB 에 실행한다.
 *
 * 생성 대상 = product_masters + product_identifiers 뿐. candidate 마킹(approved_new_master) 포함.
 *   RepresentativeProduct / SharedProductDescription / ProductDrugExtension / ProductImage /
 *   SupplierProductOffer / OrganizationProductListing / StoreLocalProduct 미생성.
 *
 * 안전:
 *   - APPLY 이중 가드: DRUG_PROMOTE_APPLY='true' AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND' 둘 다여야 write.
 *     하나라도 없으면 dry-run(write 0).
 *   - HTTP 서버 미기동. raw ds.query 만 사용(entities 불필요).
 *
 * Env: DB_* / DRUG_PROMOTE_BASE_DATE / DRUG_PROMOTE_SOURCE_LABEL / DRUG_PROMOTE_APPLY / DRUG_IMPORT_ALLOW_APPLY
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { runCandidatePromotion } from './modules/neture/drug-import/drug-master-promotion-apply.db.js';

const log = {
  info: (m: string) => console.log(`[DRUG-PROMOTE] ${new Date().toISOString()} INFO: ${m}`),
  warn: (m: string) => console.warn(`[DRUG-PROMOTE] ${new Date().toISOString()} WARN: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[DRUG-PROMOTE] ${new Date().toISOString()} ERROR: ${m}`);
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
    entities: [], // 배치 승격 경로는 raw ds.query 만 사용
    synchronize: false,
    logging: ['error'],
  });
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Drug Seed Promotion Apply Job — Starting');
  log.info('='.repeat(60));

  const baseDate = process.env.DRUG_PROMOTE_BASE_DATE;
  const sourceLabelLike = process.env.DRUG_PROMOTE_SOURCE_LABEL ?? baseDate;
  if (!baseDate) throw new Error('DRUG_PROMOTE_BASE_DATE 필수 (예: 2025-10-31).');

  const wantApply = process.env.DRUG_PROMOTE_APPLY === 'true';
  const guardOk = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = wantApply && guardOk;
  if (wantApply && !guardOk) {
    throw new Error('APPLY_BLOCKED: DRUG_PROMOTE_APPLY=true 이나 DRUG_IMPORT_ALLOW_APPLY!=I_UNDERSTAND. write 차단.');
  }
  const importBatchId = `promotion-${baseDate}-${apply ? 'apply' : 'dryrun'}`;
  log.info(`mode = ${apply ? 'APPLY (DB write: Master+Identifier)' : 'dry-run (read-only)'} | baseDate=${baseDate} batch=${importBatchId}`);

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const start = Date.now();
    const report = await runCandidatePromotion({
      dataSource: ds,
      apply,
      importBatchId,
      sourceBaseDate: baseDate,
      sourceLabel: `HIRA_DRUG_MASTER_${baseDate}`,
      candidateSourceLabelLike: sourceLabelLike,
    });
    const sec = Math.round((Date.now() - start) / 1000);

    log.info('─'.repeat(50));
    log.info(`mode=${report.mode} batch=${report.importBatchId} (${sec}s)`);
    log.info(`total=${report.totalCandidates} eligible=${report.eligibleCandidates}`);
    log.info(`createdMaster=${report.createdMaster} linkedExistingMaster=${report.linkedExistingMaster} wouldCreateMaster=${report.wouldCreateMaster}`);
    log.info(`createdIdentifiers=${report.createdIdentifiers} wouldCreateIdentifiers=${report.wouldCreateIdentifiers} skippedExistingIdentifiers=${report.wouldSkipExistingIdentifiers}`);
    log.info(`conflicts: barcode=${report.conflictBarcode} mfdsProductId=${report.conflictMfdsProductId} idOtherMaster=${report.conflictIdentifierBelongsToOtherMaster}`);
    log.info(`skipped: cancelled=${report.skippedCancelled} checkDigit=${report.skippedInvalidStandardCodeCheckDigit} format=${report.skippedInvalidStandardCodeFormat} missing=${report.skippedMissingStandardCode} required=${report.skippedMissingRequired}`);
    log.info(`drugCategory: rx=${report.rxCount} otc=${report.otcCount} unspecified=${report.drugUnspecifiedCount}`);
    log.info(`groups: multiPackage=${report.multiPackageMfdsCodeCount} multiManufacturer=${report.multiManufacturerMfdsCodeCount}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Drug Seed Promotion Apply Job — DONE (${report.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
