/**
 * Easy Drug Info Candidate Import CLI — e약은요 raw JSONL → ProductCandidate 후보 적재
 *
 * WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1
 *
 * Usage:
 *   pnpm --filter @o4o/api-server easy-drug-info:import -- \
 *     --file "C:\\Users\\home\\coding\\o4o-public-data-samples\\mfds-easy-drug-info-raw.jsonl" \
 *     [--service-key neture] [--limit 100] [--dry-run | --apply] [--use-db]
 *
 * 안전 경계 (이 WO 고유):
 *   - dry-run 이 기본. --apply 명시 시에만 DB write.
 *   - dry-run 은 DB 없이 동작(offline): 파싱+매핑+예상건수 리포트.
 *   - --apply 는 이 WO 에서 프로덕션에 실행하지 않는다(코드만 둠). 환경변수 가드로 차단.
 *   - DB dedup 예측을 정확히 보려면 dry-run 에 --use-db 를 줄 수 있다(읽기 전용).
 *   - raw 파일은 repo 밖. 절대 repo 로 복사/커밋하지 않는다.
 */

// reflect-metadata / env 는 DB(connection.ts) import 전에 필요 — apply/use-db 경로 보호.
import '../env-loader.js';
import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import { EasyDrugInfoCandidateImportService } from '../modules/neture/drug-import/easy-drug-info-candidate-import.service.js';

interface CliArgs {
  file: string;
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
  if (!file) throw new Error('--file 필수 (e약은요 raw JSONL 경로)');

  const limitRaw = get('limit');
  const apply = has('apply');
  const dryRun = has('dry-run');
  if (apply && dryRun) throw new Error('--apply 와 --dry-run 동시 지정 불가');

  return {
    file,
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

  const text = fs.readFileSync(abs, 'utf-8');
  const sourceFileName = path.basename(abs);

  // 🚨 안전 경계: 이 WO 에서 --apply 는 프로덕션에 실행하지 않는다. (DB import 이전에 차단)
  if (args.apply && process.env.EASY_DRUG_IMPORT_ALLOW_APPLY !== 'I_UNDERSTAND') {
    throw new Error(
      'APPLY_BLOCKED: --apply 는 WO-O4O-EASY-DRUG-INFO-PRODUCT-CANDIDATE-IMPORT-V1 안전 경계에 의해 차단됨. ' +
        '데이터 변경은 사용자 승인 후 별도 진행. (해제: EASY_DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND)',
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

  const service = new EasyDrugInfoCandidateImportService();
  const report = await service.run({
    text,
    sourceFileName,
    serviceKey: args.serviceKey,
    apply: args.apply,
    dataSource,
    limit: args.limit,
  });

  console.log('───────────────────────────────────────────────');
  console.log('e약은요(의약품개요정보) candidate import 결과');
  console.log('───────────────────────────────────────────────');
  console.log(`mode                : ${report.mode}`);
  console.log(`file                : ${report.sourceFileName}`);
  console.log(`sourceLabel         : ${report.sourceLabel}`);
  console.log(`totalRows           : ${report.totalRows}`);
  console.log(`processedRows       : ${report.processedRows}`);
  console.log(`blankLines          : ${report.blankLines}`);
  console.log(
    `counts              : createdExpected=${report.counts.createdExpected} updatedExpected=${report.counts.updatedExpected} skipped=${report.counts.skipped} errored=${report.counts.errored}`,
  );
  console.log(`image               : present=${report.imagePresentCount} missing=${report.imageMissingCount}`);
  console.log(
    `officialText        : present=${report.officialTextPresentCount} missing=${report.officialTextMissingCount}`,
  );
  console.log(`reviewFlags         : ${JSON.stringify(report.reviewFlagCounts)}`);
  console.log(`dedupChecked(DB)    : ${report.dedupChecked}`);
  if (report.notes.length) console.log(`notes               : ${report.notes.join(' | ')}`);
  if (report.errors.length) {
    console.log(
      `errors(${report.errors.length})          : ${JSON.stringify(report.errors.slice(0, 10))}${report.errors.length > 10 ? ' …' : ''}`,
    );
  }
  console.log('sampleMappedRows(3) :');
  console.log(JSON.stringify(report.sampleMappedRows, null, 2));
  console.log('───────────────────────────────────────────────');
  console.log('JSON_REPORT_BEGIN');
  // sampleMappedRows 는 위에서 출력 → JSON 요약에서는 제외해 로그 축소
  const { sampleMappedRows, ...summary } = report;
  console.log(JSON.stringify(summary));
  console.log('JSON_REPORT_END');

  if (dataSource && dataSource.isInitialized) await dataSource.destroy();
}

main().catch((e) => {
  console.error('[easy-drug-info-candidate-import] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
