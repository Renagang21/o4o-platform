/**
 * easy-drug-image-copy-job.ts — Cloud Run Job entry:
 *   e약은요 외부 이미지 → GCS 사본 → ProductImage → 대표상품 thumbnail 연결
 * ================================================================================================
 *
 * WO-O4O-EASY-DRUG-INFO-IMAGE-COPY-TO-PRODUCTIMAGE-V1 / Gate A(dry-run)·B(apply)
 * 런북: CHECK-O4O-EASY-DRUG-INFO-IMAGE-COPY-DRYRUN-V1
 *
 * 안전:
 *   - 생성/변경 = product_images(INSERT) + representative_products(thumbnail_image_id/metadata UPDATE) + GCS object.
 *   - APPLY 이중 가드: EASY_DRUG_IMG_APPLY='true' AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND'.
 *   - 멱등: thumbnail_image_id 있으면 skip. 실패(404/timeout/비이미지) 1회 재시도 후 skip+errored, 배치 계속.
 *   - HTTP 서버 미기동. raw ds.query + ImageStorageService(GCS) 사용. entities:[].
 *
 * Env:
 *   DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME
 *   EASY_DRUG_IMG_APPLY      ('true' 면 apply, 그 외 dry-run)
 *   DRUG_IMPORT_ALLOW_APPLY  ('I_UNDERSTAND' 이어야 apply 허용)
 *   EASY_DRUG_IMG_LIMIT      (optional, 처리 제한)
 *   EASY_DRUG_IMG_CONCURRENCY(optional, 기본 16)
 *   GCS_PRODUCT_IMAGE_BUCKET (optional, 기본 o4o-media-library)
 *
 * Exit: 0 성공 / 1 실패.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { EasyDrugImageCopyService } from './modules/neture/drug-import/easy-drug-image-copy.service.js';

const log = {
  info: (m: string) => console.log(`[EASY-DRUG-IMG] ${new Date().toISOString()} INFO: ${m}`),
  warn: (m: string) => console.warn(`[EASY-DRUG-IMG] ${new Date().toISOString()} WARN: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[EASY-DRUG-IMG] ${new Date().toISOString()} ERROR: ${m}`);
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
    entities: [],
    synchronize: false,
    logging: ['error'],
  });
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Easy Drug Image Copy Job — Starting');
  log.info('='.repeat(60));

  const wantApply = process.env.EASY_DRUG_IMG_APPLY === 'true';
  const guardOk = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = wantApply && guardOk;
  if (wantApply && !guardOk) {
    throw new Error('APPLY_BLOCKED: EASY_DRUG_IMG_APPLY=true 이나 DRUG_IMPORT_ALLOW_APPLY!=I_UNDERSTAND. write 차단.');
  }
  const limitRaw = process.env.EASY_DRUG_IMG_LIMIT;
  const limit = limitRaw != null && limitRaw !== '' ? parseInt(limitRaw, 10) : null;
  const concRaw = process.env.EASY_DRUG_IMG_CONCURRENCY;
  const concurrency = concRaw != null && concRaw !== '' ? parseInt(concRaw, 10) : 16;
  log.info(`mode = ${apply ? 'APPLY (GCS copy + ProductImage + thumbnail)' : 'dry-run (read-only)'} | limit=${limit ?? 'none'} concurrency=${concurrency}`);

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const start = Date.now();
    const service = new EasyDrugImageCopyService(ds);
    const report = await service.run({ apply, limit, concurrency, nowIso: new Date().toISOString() });
    const sec = Math.round((Date.now() - start) / 1000);

    log.info('─'.repeat(50));
    log.info(`mode=${report.mode} (${sec}s)`);
    log.info(`candidatesWithImage=${report.totalCandidatesWithImage} workItems=${report.workItems} wouldCopy=${report.wouldCopy}`);
    log.info(`copied=${report.copied} skippedNoAnchor=${report.skippedNoAnchor} skippedFetchFailed=${report.skippedFetchFailed} skippedNotImage=${report.skippedNotImage} errored=${report.errored}`);
    if (report.errors.length) log.warn(`errors(${report.errors.length}): ${JSON.stringify(report.errors.slice(0, 8))}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Easy Drug Image Copy Job — DONE (${report.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
