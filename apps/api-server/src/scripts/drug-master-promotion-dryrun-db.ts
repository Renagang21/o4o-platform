/**
 * Drug Master Promotion Dry-run (DB, 배치) — 운영 ProductCandidate → 승격 예측 (write 0)
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1 (게이트 B 전 dry-run)
 *
 * 운영 DB 의 ProductCandidate 를 읽어 create/link/conflict/skip 수치를 산출한다.
 * **write 0** — ProductMaster/ProductIdentifier 생성 없음. 기존 catalog 선적재 + candidate 페이지 스캔(배치).
 *
 * 로컬 실행(읽기 전용): cloud-sql-proxy(127.0.0.1:15432) 기동 후
 *   DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *   npx tsx src/scripts/drug-master-promotion-dryrun-db.ts --source-label 2025-10-31 [--out report.json] [--limit N]
 *
 * 안전: SELECT 만 수행. --apply 개념 없음(존재 자체가 dry-run).
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { runCandidatePromotionDryRun } from '../modules/neture/drug-import/drug-master-promotion-apply.db.js';

function get(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : undefined;
}

function makeDataSource(): DataSource {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = parseInt(process.env.DB_PORT || '15432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME || 'o4o_platform';
  if (!DB_USERNAME || !DB_PASSWORD) throw new Error('DB_USERNAME / DB_PASSWORD env 필수.');
  return new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [], // raw ds.query 만 사용
    synchronize: false,
    logging: ['error'],
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const sourceBaseDate = get(argv, 'source-base-date') ?? '2025-10-31';
  const sourceLabelLike = get(argv, 'source-label') ?? '2025-10-31';
  const limitRaw = get(argv, 'limit');
  const out = get(argv, 'out') ?? null;

  console.error(`[1/3] DataSource 연결 (host=${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '15432'})...`);
  const ds = makeDataSource();
  await ds.initialize();

  try {
    console.error('[2/3] 배치 dry-run (기존 catalog 선적재 + candidate 페이지 스캔, write 0)...');
    const result = await runCandidatePromotionDryRun({
      dataSource: ds,
      sourceBaseDate,
      sourceLabel: `HIRA_DRUG_MASTER_${sourceBaseDate}`,
      candidateSourceLabelLike: sourceLabelLike,
      limit: limitRaw != null ? Number(limitRaw) : null,
    });

    const r = result.report;
    const summary = {
      executionMs: result.executionMs,
      executionSec: Math.round(result.executionMs / 1000),
      scannedCandidates: result.scannedCandidates,
      existingMasterCount: result.existingMasterCount,
      existingIdentifierCount: result.existingIdentifierCount,
      totalCandidates: r.totalCandidates,
      eligibleCandidates: r.eligibleCandidates,
      wouldCreateProductMaster: r.wouldCreateMaster,
      wouldLinkExistingMaster: r.wouldLinkExistingMaster,
      conflicts: {
        barcode: r.conflictBarcode,
        mfdsProductId: r.conflictMfdsProductId,
        identifierBelongsToOtherMaster: r.conflictIdentifierBelongsToOtherMaster,
      },
      skipped: {
        cancelled: r.skippedCancelled,
        missingStandardCode: r.skippedMissingStandardCode,
        invalidStandardCodeFormat: r.skippedInvalidStandardCodeFormat,
        invalidStandardCodeCheckDigit: r.skippedInvalidStandardCodeCheckDigit,
        missingRequired: r.skippedMissingRequired,
      },
      drugCategory: { rx: r.rxCount, otc: r.otcCount, drug_unspecified: r.drugUnspecifiedCount },
      wouldCreateIdentifiers: r.wouldCreateIdentifiers,
      groups: {
        multiPackageMfdsCodeCount: r.multiPackageMfdsCodeCount,
        multiManufacturerMfdsCodeCount: r.multiManufacturerMfdsCodeCount,
      },
      dbWrites: 0,
    };
    console.log(JSON.stringify(summary, null, 2));

    if (out) {
      const outAbs = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out);
      fs.writeFileSync(outAbs, JSON.stringify({ summary, report: r }, null, 2), 'utf-8');
      console.error(`[3/3] 리포트 저장: ${outAbs}`);
    }
    console.error(
      `\n요약: scanned=${result.scannedCandidates} eligible=${r.eligibleCandidates} ` +
        `wouldCreate=${r.wouldCreateMaster} wouldLink=${r.wouldLinkExistingMaster} ` +
        `conflicts=${r.conflictBarcode + r.conflictMfdsProductId + r.conflictIdentifierBelongsToOtherMaster} ` +
        `(${Math.round(result.executionMs / 1000)}s, DB write 0)`,
    );
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main().catch((e) => {
  console.error(`[ERROR] ${(e as Error).message}`);
  process.exit(1);
});
