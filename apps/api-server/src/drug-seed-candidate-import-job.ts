/**
 * drug-seed-candidate-import-job.ts — Cloud Run Job entry: 약가마스터 CSV → ProductCandidate 적재
 * ================================================================================================
 *
 * WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1 / 런북 CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1
 *
 * 왜 별도 entry 인가:
 *   - `src/scripts/**` 는 tsconfig.build.json 에서 제외되어 프로덕션 이미지(dist)에 포함되지 않는다.
 *   - 약가마스터 CSV(54MB)는 이미지에 없다 → GCS 에서 내려받아 처리한다.
 *   - 따라서 migrate.ts 처럼 src 루트의 전용 entry 를 두어 dist/drug-seed-candidate-import-job.js 로 빌드한다.
 *
 * 안전:
 *   - 생성 대상 = product_candidates 뿐(ProductMaster/Identifier 미생성 — 파이프라인 계약).
 *   - APPLY 이중 가드: DRUG_SEED_APPLY='true' AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND' 둘 다여야 write.
 *     하나라도 없으면 dry-run(DB 읽기만, dedup 예측).
 *   - HTTP 서버/Express 미기동. main.ts 와 코드 경로 공유 안 함.
 *
 * Env:
 *   DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME  (migrations job 과 동일)
 *   DRUG_SEED_GCS_BUCKET   (예: o4o-media-library)
 *   DRUG_SEED_GCS_OBJECT   (예: data-seed/mfds-drug-master-standard-code.csv)
 *   DRUG_SEED_BASE_DATE    (예: 2025-10-31)
 *   DRUG_SEED_ENCODING     (cp949|utf-8|auto, default cp949)
 *   DRUG_SEED_SERVICE_KEY  (optional)
 *   DRUG_SEED_APPLY        ('true' 면 apply, 그 외 dry-run)
 *   DRUG_IMPORT_ALLOW_APPLY ('I_UNDERSTAND' 이어야 apply 허용)
 *
 * Exit: 0 성공 / 1 실패.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Storage } from '@google-cloud/storage';
import { DrugCandidateImportService } from './modules/neture/drug-import/drug-candidate-import.service.js';
import type { DrugCsvEncoding } from './modules/neture/drug-import/drug-master-csv.parser.js';

const log = {
  info: (m: string) => console.log(`[DRUG-SEED] ${new Date().toISOString()} INFO: ${m}`),
  warn: (m: string) => console.warn(`[DRUG-SEED] ${new Date().toISOString()} WARN: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[DRUG-SEED] ${new Date().toISOString()} ERROR: ${m}`);
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

async function downloadCsv(bucket: string, object: string): Promise<Buffer> {
  log.info(`GCS 다운로드: gs://${bucket}/${object}`);
  const storage = new Storage();
  const [buf] = await storage.bucket(bucket).file(object).download();
  log.info(`다운로드 완료: ${buf.length} bytes`);
  return buf;
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Drug Seed Candidate Import Job — Starting');
  log.info('='.repeat(60));

  const bucket = process.env.DRUG_SEED_GCS_BUCKET;
  const object = process.env.DRUG_SEED_GCS_OBJECT;
  const baseDate = process.env.DRUG_SEED_BASE_DATE;
  if (!bucket || !object) throw new Error('DRUG_SEED_GCS_BUCKET / DRUG_SEED_GCS_OBJECT 필수.');
  if (!baseDate) throw new Error('DRUG_SEED_BASE_DATE 필수 (예: 2025-10-31).');

  const encoding = (process.env.DRUG_SEED_ENCODING ?? 'cp949') as DrugCsvEncoding;
  const serviceKey = process.env.DRUG_SEED_SERVICE_KEY ?? null;

  // APPLY 이중 가드
  const wantApply = process.env.DRUG_SEED_APPLY === 'true';
  const guardOk = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = wantApply && guardOk;
  if (wantApply && !guardOk) {
    throw new Error('APPLY_BLOCKED: DRUG_SEED_APPLY=true 이나 DRUG_IMPORT_ALLOW_APPLY!=I_UNDERSTAND. write 차단.');
  }
  log.info(`mode = ${apply ? 'APPLY (DB write)' : 'dry-run (read-only)'} | baseDate=${baseDate} encoding=${encoding}`);

  const buffer = await downloadCsv(bucket, object);
  const sourceFileName = object.split('/').pop() || 'mfds-drug-master.csv';

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const service = new DrugCandidateImportService();
    const report = await service.run({
      buffer,
      sourceFileName,
      sourceBaseDate: baseDate,
      encoding,
      serviceKey,
      apply,
      dataSource: ds,
    });

    log.info('─'.repeat(50));
    log.info(`mode=${report.mode} file=${report.sourceFileName} sourceLabel=${report.sourceLabel}`);
    log.info(`totalRows=${report.totalRows} processed=${report.processedRows}`);
    log.info(`counts: created=${report.counts.created} updated=${report.counts.updated} skipped=${report.counts.skipped} errored=${report.counts.errored}`);
    log.info(`classification: active=${report.classification.active} cancelled=${report.classification.cancelled}`);
    log.info(`multiManufacturer: groups=${report.multiManufacturer.detectedGroups}`);
    if (report.notes.length) log.info(`notes: ${report.notes.join(' | ')}`);
    if (report.errors.length) log.warn(`errors(${report.errors.length}): ${JSON.stringify(report.errors.slice(0, 5))}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Drug Seed Candidate Import Job — DONE (${report.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
