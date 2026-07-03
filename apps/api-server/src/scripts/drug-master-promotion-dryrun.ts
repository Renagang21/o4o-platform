/**
 * Drug Master Promotion Dry-run CLI (DB 무관, read-only)
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1
 * 선행: CHECK-O4O-DRUG-MASTER-CANDIDATE-TO-PRODUCTMASTER-PROMOTION-DESIGN-V1
 *
 * Usage:
 *   pnpm --filter @o4o/api-server drug-master:promotion:dry-run -- \
 *     --file "C:\\Users\\home\\coding\\o4o-public-data-samples\\mfds-drug-master-standard-code.csv" \
 *     [--base-date 2025-10-31] \
 *     [--out "C:\\Users\\home\\coding\\o4o-public-data-samples\\drug-master-promotion-dryrun-report.json"] \
 *     [--encoding cp949|utf-8|auto] [--limit N]
 *
 * 안전 경계:
 *   - DB 연결 없음(순수 파일 기반). ProductMaster/ProductIdentifier/Candidate 미생성·미변경.
 *   - raw CSV(54MB)·리포트 JSON 은 repo 밖에 둔다. 절대 repo 로 복사/커밋하지 않는다.
 *   - env-loader / reflect-metadata / DB connection 을 import 하지 않는다(순수 오프라인).
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseDrugMasterCsv, type DrugCsvEncoding } from '../modules/neture/drug-import/drug-master-csv.parser.js';
import {
  runPromotionDryRun,
  promotionSourceLabel,
} from '../modules/neture/drug-import/drug-master-promotion-dryrun.service.js';

interface CliArgs {
  file: string;
  baseDate: string;
  out: string | null;
  encoding: DrugCsvEncoding;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const file = get('file');
  if (!file) throw new Error('--file 필수 (약가마스터 CSV 경로)');
  const limitRaw = get('limit');
  return {
    file,
    baseDate: get('base-date') ?? '2025-10-31',
    out: get('out') ?? null,
    encoding: (get('encoding') ?? 'cp949') as DrugCsvEncoding,
    limit: limitRaw != null ? Number(limitRaw) : null,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const fileAbs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(fileAbs)) throw new Error(`약가마스터 파일 없음: ${fileAbs}`);

  const sourceFileName = path.basename(fileAbs);
  const sourceLabel = promotionSourceLabel(sourceFileName, args.baseDate);
  const importBatchId = `dryrun-${sourceLabel}`;

  console.error(`[1/3] 약가마스터 CSV 로드: ${fileAbs}`);
  const buf = fs.readFileSync(fileAbs);
  const parsed = parseDrugMasterCsv(buf, args.encoding);
  console.error(
    `      encoding=${parsed.encodingUsed} headerMatches=${parsed.headerMatches} rows=${parsed.rows.length} parseErrors=${parsed.errors.length}`,
  );

  const rows = args.limit != null ? parsed.rows.slice(0, args.limit) : parsed.rows;

  console.error('[2/3] 승격 dry-run 판정 (DB write 0)...');
  const report = runPromotionDryRun(rows, {
    sourceFileName,
    sourceBaseDate: args.baseDate,
    importBatchId,
  });

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    const outAbs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
    fs.writeFileSync(outAbs, json, 'utf-8');
    console.error(`[3/3] 리포트 저장: ${outAbs}`);
  }

  // 요약 (stdout — 파이프 가능)
  console.log(
    JSON.stringify(
      {
        totalRows: report.totalRows,
        activeRows: report.activeRows,
        cancelledRows: report.cancelledRows,
        missingStandardCode: report.missingStandardCode,
        invalidStandardCodeFormat: report.invalidStandardCodeFormat,
        invalidStandardCodeCheckDigit: report.invalidStandardCodeCheckDigit,
        missingRequired: report.missingRequired,
        eligibleRows: report.eligibleRows,
        wouldCreateProductMaster: report.wouldCreateProductMaster,
        wouldCreateIdentifiers: {
          KOREA_DRUG_CODE: report.wouldCreatePrimaryKoreaDrugCodeIdentifier,
          MFDS_CODE: report.wouldCreateMfdsCodeIdentifier,
          KOREA_INSURANCE_CODE: report.wouldCreateKoreaInsuranceCodeIdentifier,
          ATC_CODE: report.wouldCreateAtcCodeIdentifier,
        },
        drugCategory: { rx: report.rxCount, otc: report.otcCount, drug_unspecified: report.drugUnspecifiedCount },
        package: {
          packageFormMissingCount: report.packageFormMissingCount,
          specificationFallbackUsedCount: report.specificationFallbackUsedCount,
          specificationEmptyCount: report.specificationEmptyCount,
        },
        groups: {
          distinctStandardCode: report.distinctStandardCode,
          distinctMfdsCode: report.distinctMfdsCode,
          multiPackageMfdsCodeCount: report.multiPackageMfdsCodeCount,
          multiManufacturerMfdsCodeCount: report.multiManufacturerMfdsCodeCount,
          maxStandardCodesPerMfdsCode: report.maxStandardCodesPerMfdsCode,
        },
        conflicts: {
          duplicateStandardCodeInFile: report.duplicateStandardCodeInFile,
          duplicateMfdsProductIdPreview: report.duplicateMfdsProductIdPreview,
          standardCodeToMultipleRows: report.standardCodeToMultipleRows,
        },
      },
      null,
      2,
    ),
  );
  console.error(
    `\n요약: eligible=${report.eligibleRows}/${report.totalRows} ` +
      `(active=${report.activeRows} cancelled=${report.cancelledRows}) ` +
      `checkDigitFail=${report.invalidStandardCodeCheckDigit}`,
  );
}

try {
  main();
} catch (e) {
  console.error(`[ERROR] ${(e as Error).message}`);
  process.exit(1);
}
