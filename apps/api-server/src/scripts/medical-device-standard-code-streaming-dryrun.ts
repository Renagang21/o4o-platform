/**
 * Medical Device Standard-Code Streaming Dry-Run CLI
 * — 전량 2.66M / 2.56GB raw JSONL 을 readline streaming 으로 Gate A dry-run 집계
 *
 * WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1
 *
 * Usage:
 *   node --max-old-space-size=8192 --import tsx \
 *     src/scripts/medical-device-standard-code-streaming-dryrun.ts \
 *     --file "G:\\...\\full-fetch\\medical-device\\md-full-...\\raw.jsonl" [--service-key neture]
 *
 * 경계:
 *   - **dry-run 전용**. --apply 미지원(명시 시 즉시 종료). DB 연결/write 없음.
 *   - raw 파일은 repo 밖. 절대 repo 로 복사/커밋하지 않는다.
 *   - 파일 전체를 문자열로 올리지 않는다(readFileSync 금지) → Node 문자열 한계 회피.
 */

import '../env-loader.js';

import * as fs from 'fs';
import * as path from 'path';
import { MedicalDeviceStandardCodeStreamingDryRunService } from '../modules/neture/drug-import/medical-device-standard-code-streaming-dryrun.service.js';

interface CliArgs {
  file: string;
  serviceKey: string | null;
  progressEvery: number;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);

  // 🚨 streaming 경로는 dry-run 전용 — apply 는 미지원.
  if (has('apply')) {
    throw new Error(
      'APPLY_UNSUPPORTED: streaming dry-run 은 집계 전용이다. apply 는 ' +
        'medical-device-standard-code-candidate-import(비streaming) 경로 + env gate 로만 수행한다.',
    );
  }

  const file = get('file');
  if (!file) throw new Error('--file 필수 (의료기기 표준코드 raw JSONL 경로)');
  const pe = get('progress-every');

  return {
    file,
    serviceKey: get('service-key') ?? null,
    progressEvery: pe != null ? Math.max(1, parseInt(pe, 10)) : 100_000,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const abs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(abs)) throw new Error(`파일 없음: ${abs}`);

  const sourceFileName = path.basename(abs);
  const startedAt = Date.now();

  const service = new MedicalDeviceStandardCodeStreamingDryRunService();
  const report = await service.runFromFile(abs, {
    sourceFileName,
    serviceKey: args.serviceKey,
    progressEvery: args.progressEvery,
    // 진행 로그는 stderr 로 (stdout 의 JSON_REPORT 오염 방지)
    onProgress: (processed) => {
      const mem = process.memoryUsage();
      console.error(
        `processed=${processed} heapUsed=${Math.round(mem.heapUsed / 1024 / 1024)}MB rss=${Math.round(mem.rss / 1024 / 1024)}MB`,
      );
    },
  });

  const elapsedMs = Date.now() - startedAt;

  console.log('───────────────────────────────────────────────');
  console.log('의료기기 표준코드 streaming dry-run 결과');
  console.log('───────────────────────────────────────────────');
  console.log(`mode                : ${report.mode} (streaming)`);
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
  console.log(`distinctPermitCount : ${report.distinctPermitCount}`);
  console.log(
    `dupConflict         : keyCount=${report.dupConflictKeyCount} rowCount=${report.dupConflictRowCount}`,
  );
  console.log(`multiUdiPermitCount : ${report.multiUdiPermitCount}`);
  console.log(`reviewFlags         : ${JSON.stringify(report.reviewFlagCounts)}`);
  console.log(`elapsedMs           : ${elapsedMs}`);
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
  console.log(JSON.stringify({ ...summary, elapsedMs }));
  console.log('JSON_REPORT_END');
}

main().catch((e) => {
  console.error('[medical-device-streaming-dryrun] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
