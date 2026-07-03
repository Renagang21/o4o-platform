/**
 * Drug Master Promotion Apply CLI — ProductCandidate → ProductMaster 승격
 *
 * WO-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-APPLY-V1
 * 선행: CHECK-O4O-DRUG-MASTER-CANDIDATE-PROMOTION-DRYRUN-V1
 *
 * Usage:
 *   # dry-run (기본, write 0) — DB 연결 필요(기존 Master link/conflict 예측)
 *   pnpm --filter @o4o/api-server drug-master:promotion:apply -- [--source-label 2025-10-31] [--limit N]
 *
 *   # apply (실 write) — 반드시 --apply --i-understand-apply 동시 지정.
 *   #   운영 DB 는 사용자 승인 없이는 실행 금지(가드).
 *   pnpm --filter @o4o/api-server drug-master:promotion:apply -- --apply --i-understand-apply
 *
 * 안전 가드:
 *   - --apply 없으면 write 0 (dry-run).
 *   - --apply 는 --i-understand-apply 동반 필수. 없으면 거부.
 *   - NODE_ENV=production 에서 --apply 는 --confirm-production 없으면 거부.
 *   - 대상 = ProductCandidate(약가마스터 KOREA_DRUG_CODE csv_import) 뿐. 생성 = Master + Identifier 뿐.
 */

import 'reflect-metadata';
import AppDataSource from '../database/data-source.js';
import { runCandidatePromotion } from '../modules/neture/drug-import/drug-master-promotion-apply.db.js';

interface CliArgs {
  apply: boolean;
  understand: boolean;
  confirmProduction: boolean;
  sourceLabel: string;
  sourceBaseDate: string;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);
  const limitRaw = get('limit');
  return {
    apply: has('apply'),
    understand: has('i-understand-apply'),
    confirmProduction: has('confirm-production'),
    sourceBaseDate: get('source-base-date') ?? '2025-10-31',
    sourceLabel: get('source-label') ?? '2025-10-31',
    limit: limitRaw != null ? Number(limitRaw) : null,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.apply) {
    if (!args.understand) {
      throw new Error('--apply 는 --i-understand-apply 동반 필수 (실 DB write 안전 가드).');
    }
    if (process.env.NODE_ENV === 'production' && !args.confirmProduction) {
      throw new Error('운영 DB(--NODE_ENV=production) apply 는 --confirm-production 필수 + 사용자 승인 절차 필요.');
    }
  }

  console.error(`[1/3] DataSource 초기화 (mode=${args.apply ? 'APPLY' : 'dry-run'})...`);
  await AppDataSource.initialize();

  try {
    const importBatchId = `promotion-${args.sourceBaseDate}-${args.apply ? 'apply' : 'dryrun'}`;
    console.error('[2/3] ProductCandidate 승격 판정...');
    const report = await runCandidatePromotion({
      dataSource: AppDataSource,
      apply: args.apply,
      importBatchId,
      sourceBaseDate: args.sourceBaseDate,
      sourceLabel: `HIRA_DRUG_MASTER_${args.sourceBaseDate}`,
      candidateSourceLabelLike: args.sourceLabel,
      limit: args.limit,
    });

    console.log(JSON.stringify(report, null, 2));
    console.error(
      `\n[3/3] ${report.mode}: total=${report.totalCandidates} eligible=${report.eligibleCandidates} ` +
        `${report.mode === 'apply' ? `created=${report.createdMaster} linked=${report.linkedExistingMaster}` : `wouldCreate=${report.wouldCreateMaster} wouldLink=${report.wouldLinkExistingMaster}`} ` +
        `conflicts=${report.conflictBarcode + report.conflictMfdsProductId + report.conflictIdentifierBelongsToOtherMaster}`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error(`[ERROR] ${(e as Error).message}`);
  process.exit(1);
});
