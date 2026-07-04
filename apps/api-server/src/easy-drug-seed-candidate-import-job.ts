/**
 * easy-drug-seed-candidate-import-job.ts — Cloud Run Job entry: e약은요 JSONL → ProductCandidate 적재
 * ================================================================================================
 *
 * WO-O4O-EASY-DRUG-INFO-CANDIDATE-APPLY-AND-SHARED-DESCRIPTION-DERIVATION-V1 / Gate A
 * 런북: CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1
 *
 * 왜 별도 entry 인가 (drug-seed-candidate-import-job 과 동일 사유):
 *   - `src/scripts/**` 는 tsconfig.build.json 에서 제외되어 프로덕션 이미지(dist)에 미포함.
 *   - e약은요 raw JSONL(13MB)은 이미지에 없다 → GCS 에서 내려받아 처리한다.
 *   - 따라서 src 루트 전용 entry 를 두어 dist/easy-drug-seed-candidate-import-job.js 로 빌드한다.
 *
 * 안전:
 *   - 생성 대상 = product_candidates 뿐(ProductMaster/Identifier/Extension/Image 미생성 — WO 계약).
 *   - APPLY 이중 가드: EASY_DRUG_APPLY='true' AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND' 둘 다여야 write.
 *     하나라도 없으면 dry-run(DB 읽기만, dedup 예측).
 *   - HTTP 서버/Express 미기동. main.ts 와 코드 경로 공유 안 함.
 *   - dedup: source_type='external_api' + identifier_type='MFDS_CODE' + normalized=itemSeq
 *     + raw_payload->>'sourceKind'='easy_drug_info' + deleted_at IS NULL → idempotent 재실행.
 *
 * Env:
 *   DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME  (migrations job 과 동일)
 *   EASY_DRUG_GCS_BUCKET    (예: o4o-media-library)
 *   EASY_DRUG_GCS_OBJECT    (예: data-seed/mfds-easy-drug-info-raw.jsonl)
 *   EASY_DRUG_SERVICE_KEY   (optional)
 *   EASY_DRUG_LIMIT         (optional, 처리 행 제한 — 샘플 실증용)
 *   EASY_DRUG_APPLY         ('true' 면 apply, 그 외 dry-run)
 *   DRUG_IMPORT_ALLOW_APPLY ('I_UNDERSTAND' 이어야 apply 허용)
 *
 * Exit: 0 성공 / 1 실패.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Storage } from '@google-cloud/storage';
import { EasyDrugInfoCandidateImportService } from './modules/neture/drug-import/easy-drug-info-candidate-import.service.js';

const log = {
  info: (m: string) => console.log(`[EASY-DRUG-SEED] ${new Date().toISOString()} INFO: ${m}`),
  warn: (m: string) => console.warn(`[EASY-DRUG-SEED] ${new Date().toISOString()} WARN: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[EASY-DRUG-SEED] ${new Date().toISOString()} ERROR: ${m}`);
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
    entities: [], // raw ds.query 만 사용 — 엔티티 불필요
    synchronize: false,
    logging: ['error'],
  });
}

async function downloadText(bucket: string, object: string): Promise<string> {
  log.info(`GCS 다운로드: gs://${bucket}/${object}`);
  const storage = new Storage();
  const [buf] = await storage.bucket(bucket).file(object).download();
  log.info(`다운로드 완료: ${buf.length} bytes`);
  return buf.toString('utf-8');
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Easy Drug Seed Candidate Import Job — Starting');
  log.info('='.repeat(60));

  const bucket = process.env.EASY_DRUG_GCS_BUCKET;
  const object = process.env.EASY_DRUG_GCS_OBJECT;
  if (!bucket || !object) throw new Error('EASY_DRUG_GCS_BUCKET / EASY_DRUG_GCS_OBJECT 필수.');

  const serviceKey = process.env.EASY_DRUG_SERVICE_KEY ?? null;
  const limitRaw = process.env.EASY_DRUG_LIMIT;
  const limit = limitRaw != null && limitRaw !== '' ? parseInt(limitRaw, 10) : null;

  // APPLY 이중 가드
  const wantApply = process.env.EASY_DRUG_APPLY === 'true';
  const guardOk = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = wantApply && guardOk;
  if (wantApply && !guardOk) {
    throw new Error('APPLY_BLOCKED: EASY_DRUG_APPLY=true 이나 DRUG_IMPORT_ALLOW_APPLY!=I_UNDERSTAND. write 차단.');
  }
  log.info(`mode = ${apply ? 'APPLY (DB write: product_candidates)' : 'dry-run (read-only)'} | limit=${limit ?? 'none'}`);

  const text = await downloadText(bucket, object);
  const sourceFileName = object.split('/').pop() || 'mfds-easy-drug-info-raw.jsonl';

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const service = new EasyDrugInfoCandidateImportService();
    const report = await service.run({
      text,
      sourceFileName,
      serviceKey,
      apply,
      dataSource: ds,
      limit,
    });

    log.info('─'.repeat(50));
    log.info(`mode=${report.mode} file=${report.sourceFileName} sourceLabel=${report.sourceLabel}`);
    log.info(`totalRows=${report.totalRows} processed=${report.processedRows} blankLines=${report.blankLines}`);
    log.info(`counts: created=${report.counts.createdExpected} updated=${report.counts.updatedExpected} skipped=${report.counts.skipped} errored=${report.counts.errored}`);
    log.info(`image: present=${report.imagePresentCount} missing=${report.imageMissingCount}`);
    log.info(`officialText: present=${report.officialTextPresentCount} missing=${report.officialTextMissingCount}`);
    log.info(`dedupChecked=${report.dedupChecked} reviewFlags=${JSON.stringify(report.reviewFlagCounts)}`);
    if (report.notes.length) log.info(`notes: ${report.notes.join(' | ')}`);
    if (report.errors.length) log.warn(`errors(${report.errors.length}): ${JSON.stringify(report.errors.slice(0, 5))}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Easy Drug Seed Candidate Import Job — DONE (${report.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
