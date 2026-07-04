/**
 * Medical Device Standard-Code Candidate Import CLI
 * — 의료기기 표준코드별 제품정보 raw JSONL → ProductCandidate 후보 적재
 *
 * WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1
 *
 * Usage:
 *   pnpm --filter @o4o/api-server medical-device:candidate-import -- \
 *     --file "G:\\내 드라이브\\자료실\\public-data-api-samples\\mfds-medical-device-standard-code-raw.jsonl" \
 *     [--service-key neture] [--limit 100] [--dry-run | --apply] [--use-db]
 *
 * 안전 경계 (이 WO 고유):
 *   - dry-run 이 기본. --apply 명시 시에만 DB write.
 *   - dry-run 은 DB 없이 동작(offline): 파싱+매핑+예상건수 리포트.
 *   - --apply 는 이 WO 에서 프로덕션에 실행하지 않는다(코드만 둠). 환경변수 가드로 차단.
 *   - DB dedup 예측을 정확히 보려면 dry-run 에 --use-db 를 줄 수 있다(읽기 전용 SELECT).
 *   - raw 파일은 repo 밖. 절대 repo 로 복사/커밋하지 않는다.
 */

import '../env-loader.js';
import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import { MedicalDeviceStandardCodeCandidateImportService } from '../modules/neture/drug-import/medical-device-standard-code-candidate-import.service.js';

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
  if (!file) throw new Error('--file 필수 (의료기기 표준코드 raw JSONL 경로)');

  const limitRaw = get('limit');
  const apply = has('apply');
  const dryRun = has('dry-run');
  if (apply && dryRun) throw new Error('--apply 와 --dry-run 동시 지정 불가');

  return {
    file,
    serviceKey: get('service-key') ?? null,
    limit: limitRaw != null ? parseInt(limitRaw, 10) : null,
    apply,
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
  if (args.apply && process.env.MEDICAL_DEVICE_IMPORT_ALLOW_APPLY !== 'I_UNDERSTAND') {
    throw new Error(
      'APPLY_BLOCKED: --apply 는 WO-O4O-MEDICAL-DEVICE-PUBLIC-CANDIDATE-IMPORT-V1 안전 경계에 의해 차단됨. ' +
        '데이터 변경은 사용자 승인 후 별도 진행. (해제: MEDICAL_DEVICE_IMPORT_ALLOW_APPLY=I_UNDERSTAND)',
    );
  }

  const needDb = args.apply || args.useDb;
  let dataSource = null;
  if (needDb) {
    const { DataSource } = await import('typeorm');
    const host = process.env.DB_HOST;
    // SSL: Cloud SQL public IP(TCP) 는 SSL 필수. Unix socket(/cloudsql/) 은 이미 암호화.
    // 로컬 Cloud SQL Auth Proxy(127.0.0.1/localhost) 는 평문 리스너 → SSL 비활성(runbook 채널 a).
    const isLocalProxy = host === '127.0.0.1' || host === 'localhost';
    const useSsl = !!host && !host.startsWith('/cloudsql/') && !isLocalProxy;
    dataSource = new DataSource({
      type: 'postgres',
      host,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [],
      synchronize: false,
      logging: ['error'],
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    await dataSource.initialize();
  }

  const service = new MedicalDeviceStandardCodeCandidateImportService();
  const report = await service.run({
    text,
    sourceFileName,
    serviceKey: args.serviceKey,
    apply: args.apply,
    dataSource,
    limit: args.limit,
  });

  console.log('───────────────────────────────────────────────');
  console.log('의료기기 표준코드 candidate import 결과');
  console.log('───────────────────────────────────────────────');
  console.log(`mode                : ${report.mode}`);
  console.log(`file                : ${report.sourceFileName}`);
  console.log(`sourceLabel         : ${report.sourceLabel}`);
  console.log(`totalRows           : ${report.totalRows}`);
  console.log(`processedRows       : ${report.processedRows}`);
  console.log(`blankLines          : ${report.blankLines}`);
  console.log(`invalidJsonLines    : ${report.invalidJsonLines}`);
  console.log(`identifierTypeCounts: ${JSON.stringify(report.identifierTypeCounts)}`);
  console.log(`formatCounts        : ${JSON.stringify(report.formatCounts)}`);
  console.log(
    `counts              : createdExpected=${report.counts.createdExpected} updatedExpected=${report.counts.updatedExpected} skipped=${report.counts.skipped} errored=${report.counts.errored}`,
  );
  console.log(`nameTruncatedCount  : ${report.nameTruncatedCount}`);
  console.log(`candidateNameMissing: ${report.candidateNameMissing}`);
  console.log(`manufacturerMissing : ${report.manufacturerMissing}`);
  console.log(
    `dupConflict         : keyCount=${report.dupConflictKeyCount} rowCount=${report.dupConflictRowCount}`,
  );
  console.log(`multiUdiPermitCount : ${report.multiUdiPermitCount}`);
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
  const { sampleMappedRows, ...summary } = report;
  console.log(JSON.stringify(summary));
  console.log('JSON_REPORT_END');

  if (dataSource && dataSource.isInitialized) await dataSource.destroy();
}

main().catch((e) => {
  console.error('[medical-device-candidate-import] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
