/**
 * Drug Candidate Import CLI — 약가마스터 CSV → ProductCandidate 후보 적재 (1차 파이프라인)
 *
 * WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1
 *
 * Usage:
 *   pnpm --filter @o4o/api-server drug:candidate-import -- \
 *     --file docs/checks/artifacts/DRUG-STANDARD-CODE-CSV-SAMPLE-300.csv \
 *     --base-date 2025-10-31 [--encoding cp949|utf-8|auto] [--service-key neture] \
 *     [--limit 300] [--dry-run | --apply]
 *
 * 안전 경계 (이 WO 고유):
 *   - dry-run 이 기본. --apply 명시 시에만 DB write.
 *   - dry-run 은 DB 없이 동작(offline): 파싱+매핑+예상건수 리포트.
 *   - --apply 는 이 WO 에서 프로덕션에 실행하지 않는다(코드만 둠).
 *   - DB dedup 예측을 정확히 보려면 dry-run 에 --use-db 를 줄 수 있다(읽기 전용).
 */

// reflect-metadata / env 는 DB(connection.ts) import 전에 필요 — apply/use-db 경로 보호.
import '../env-loader.js';
import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import { DrugCandidateImportService } from '../modules/neture/drug-import/drug-candidate-import.service.js';
import type { DrugCsvEncoding } from '../modules/neture/drug-import/drug-master-csv.parser.js';

interface CliArgs {
  file: string;
  baseDate: string;
  encoding: DrugCsvEncoding;
  serviceKey: string | null;
  limit: number | null;
  apply: boolean;
  useDb: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);

  const file = get('file');
  const baseDate = get('base-date');
  if (!file) throw new Error('--file 필수');
  if (!baseDate) throw new Error('--base-date 필수 (예: 2025-10-31)');

  const encoding = (get('encoding') ?? 'cp949') as DrugCsvEncoding;
  if (!['cp949', 'utf-8', 'auto'].includes(encoding)) {
    throw new Error(`--encoding 은 cp949|utf-8|auto (got ${encoding})`);
  }

  const limitRaw = get('limit');
  const apply = has('apply');
  const dryRun = has('dry-run');
  if (apply && dryRun) throw new Error('--apply 와 --dry-run 동시 지정 불가');

  return {
    file,
    baseDate,
    encoding,
    serviceKey: get('service-key') ?? null,
    limit: limitRaw != null ? parseInt(limitRaw, 10) : null,
    apply, // 미지정 시 false = dry-run 기본
    useDb: has('use-db'),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const abs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(abs)) throw new Error(`파일 없음: ${abs}`);

  const buffer = fs.readFileSync(abs);
  const sourceFileName = path.basename(abs);

  // 🚨 안전 경계: 이 WO 에서 --apply 는 프로덕션에 실행하지 않는다. (DB import 이전에 차단)
  if (args.apply && process.env.DRUG_IMPORT_ALLOW_APPLY !== 'I_UNDERSTAND') {
    throw new Error(
      'APPLY_BLOCKED: --apply 는 WO-O4O-DRUG-CANDIDATE-IMPORT-PIPELINE-V1 안전 경계에 의해 차단됨. ' +
        '데이터 변경은 사용자 승인 + 전체 CSV 확보 후 별도 진행. (해제: DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND)',
    );
  }

  const needDb = args.apply || args.useDb;
  let dataSource = null;
  if (needDb) {
    // DB 가 필요할 때만 connection.ts 를 import (import 즉시 초기화 시도하므로 dry-run offline 보호)
    const mod = await import('../database/connection.js');
    dataSource = mod.AppDataSource;
    if (!dataSource.isInitialized) await dataSource.initialize();
  }

  const service = new DrugCandidateImportService();
  const report = await service.run({
    buffer,
    sourceFileName,
    sourceBaseDate: args.baseDate,
    encoding: args.encoding,
    serviceKey: args.serviceKey,
    apply: args.apply,
    dataSource,
    limit: args.limit,
  });

  // 사람이 읽는 요약 + 기계 판독용 JSON
  console.log('───────────────────────────────────────────────');
  console.log('약가마스터 candidate import 결과');
  console.log('───────────────────────────────────────────────');
  console.log(`mode             : ${report.mode}`);
  console.log(`file             : ${report.sourceFileName}`);
  console.log(`baseDate         : ${report.sourceBaseDate}`);
  console.log(`sourceLabel      : ${report.sourceLabel}`);
  console.log(`encodingUsed     : ${report.encodingUsed}`);
  console.log(`headerMatches    : ${report.headerMatches}`);
  console.log(`totalRows        : ${report.totalRows}`);
  console.log(`processedRows    : ${report.processedRows}`);
  console.log(`counts           : created=${report.counts.created} updated=${report.counts.updated} skipped=${report.counts.skipped} errored=${report.counts.errored}`);
  console.log(`classification   : active=${report.classification.active} cancelled=${report.classification.cancelled}`);
  console.log(`reviewFlags      : ${JSON.stringify(report.reviewFlagCounts)}`);
  console.log(`multiManufacturer: groups=${report.multiManufacturer.detectedGroups} rows=${report.multiManufacturer.rowsInMultiManufacturerGroups}`);
  console.log(`dedupChecked(DB) : ${report.dedupChecked}`);
  if (report.notes.length) console.log(`notes            : ${report.notes.join(' | ')}`);
  if (report.errors.length) {
    console.log(`errors(${report.errors.length})       : ${JSON.stringify(report.errors.slice(0, 10))}${report.errors.length > 10 ? ' …' : ''}`);
  }
  console.log('───────────────────────────────────────────────');
  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify(report));
  console.log('JSON_REPORT_END');

  if (dataSource && dataSource.isInitialized) await dataSource.destroy();
}

main().catch((e) => {
  console.error('[drug-candidate-import] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
