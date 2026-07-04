/**
 * drug-representative-grouping-job.ts — Cloud Run Job entry:
 *   품목기준코드(MFDS_CODE) 기준 representative_products 생성 + product_masters 연결
 * ================================================================================================
 *
 * WO-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-V1 / Gate A(dry-run)·B(apply)
 * 런북: CHECK-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-DRYRUN-V1
 *
 * 안전:
 *   - 생성/변경 대상 = representative_products(INSERT) + product_masters.representative_product_id(UPDATE) 뿐.
 *   - APPLY 이중 가드: DRUG_REP_APPLY='true' AND DRUG_IMPORT_ALLOW_APPLY='I_UNDERSTAND'.
 *     하나라도 없으면 dry-run(write 0, 생성/링크 예정 수만 산출).
 *   - 멱등: metadata mfdsCode 기존 존재 → skip. link 는 representative_product_id NULL 만 채움.
 *   - HTTP 서버 미기동. raw ds.query 만 사용(entities:[]).
 *
 * Env:
 *   DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME
 *   DRUG_REP_APPLY          ('true' 면 apply, 그 외 dry-run)
 *   DRUG_IMPORT_ALLOW_APPLY ('I_UNDERSTAND' 이어야 apply 허용)
 *   DRUG_REP_LIMIT          (optional, 그룹 처리 제한)
 *
 * Exit: 0 성공 / 1 실패.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { DrugMasterRepresentativeGroupingService } from './modules/neture/drug-import/drug-master-representative-grouping.service.js';

const log = {
  info: (m: string) => console.log(`[DRUG-REP] ${new Date().toISOString()} INFO: ${m}`),
  warn: (m: string) => console.warn(`[DRUG-REP] ${new Date().toISOString()} WARN: ${m}`),
  error: (m: string, e?: unknown) => {
    console.error(`[DRUG-REP] ${new Date().toISOString()} ERROR: ${m}`);
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
    entities: [], // raw ds.query 만 사용
    synchronize: false,
    logging: ['error'],
  });
}

async function main(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Drug Representative Grouping Job — Starting');
  log.info('='.repeat(60));

  const wantApply = process.env.DRUG_REP_APPLY === 'true';
  const guardOk = process.env.DRUG_IMPORT_ALLOW_APPLY === 'I_UNDERSTAND';
  const apply = wantApply && guardOk;
  if (wantApply && !guardOk) {
    throw new Error('APPLY_BLOCKED: DRUG_REP_APPLY=true 이나 DRUG_IMPORT_ALLOW_APPLY!=I_UNDERSTAND. write 차단.');
  }
  const limitRaw = process.env.DRUG_REP_LIMIT;
  const limit = limitRaw != null && limitRaw !== '' ? parseInt(limitRaw, 10) : null;
  log.info(`mode = ${apply ? 'APPLY (DB write: representative_products + link)' : 'dry-run (read-only)'} | limit=${limit ?? 'none'}`);

  const ds = createDataSource();
  await ds.initialize();
  log.info('DataSource 초기화 완료.');

  try {
    const start = Date.now();
    const service = new DrugMasterRepresentativeGroupingService(ds);
    const report = await service.run({ apply, limit });
    const sec = Math.round((Date.now() - start) / 1000);

    log.info('─'.repeat(50));
    log.info(`mode=${report.mode} (${sec}s)`);
    log.info(`groups: total=${report.totalGroups} existing=${report.existingGroups} new=${report.newGroups}`);
    log.info(`breakdown: single=${report.singleMasterGroups} multi=${report.multiMasterGroups} multiManuf=${report.multiManufacturerGroups} multiName=${report.multiNameGroups} dupName=${report.duplicateDisplayNameGroups}`);
    log.info(`manufacturerFilled=${report.manufacturerFilledGroups} masterLinksExpected=${report.masterLinksExpected}`);
    log.info(`written: createdReps=${report.createdRepresentatives} linkedMasters=${report.linkedMasters} errored=${report.errored}`);
    if (report.errors.length) log.warn(`errors: ${JSON.stringify(report.errors.slice(0, 5))}`);
    log.info('JSON_REPORT_BEGIN');
    console.log(JSON.stringify(report));
    log.info('JSON_REPORT_END');
    log.info('='.repeat(60));
    log.info(`Drug Representative Grouping Job — DONE (${report.mode})`);
    log.info('='.repeat(60));
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  log.error('FAILED', e);
  process.exit(1);
});
