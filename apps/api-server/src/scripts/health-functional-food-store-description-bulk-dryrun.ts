/**
 * Health Functional Food Store Description — BULK DRY-RUN (read-only 입력, 대량)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1 §5
 *
 * 대량(1,000~전량) render-only: seed 빌드 → 사전 filter/flag 분포 → 생성 대상 산정 →
 * 토큰/비용 파라메트릭 예측. **DB write / SharedProductDescription / status 변경 없음.**
 *
 * live provider(gemini-2.5-flash):
 *   - `@o4o/ai-core` execute() 는 config resolver(DB scope) + GEMINI_API_KEY 필요.
 *   - --live 지정 시 GEMINI_API_KEY 없으면 실호출 없이 안내 후 render-only 진행(실측은 in-app 경로).
 *
 * Usage:
 *   npx tsx src/scripts/health-functional-food-store-description-bulk-dryrun.ts \
 *     --file "G:\\...\\mfds-health-functional-food-info-raw.jsonl" --limit 1000 \
 *     [--exclude-raw-material] [--exclude-export] [--out "<gitignore>/report.json"]
 */

import '../env-loader.js';

import * as fs from 'fs';
import * as path from 'path';
import { parseHealthFunctionalFoodJsonl } from '../modules/neture/drug-import/health-functional-food-jsonl.parser.js';
import type { HealthFunctionalFoodItem } from '../modules/neture/drug-import/health-functional-food-jsonl.parser.js';
import {
  buildHealthFunctionalFoodDescriptionSeed,
  buildHealthFunctionalFoodStoreDescriptionUserPrompt,
  HFF_STORE_DESCRIPTION_SYSTEM_PROMPT,
} from '../modules/neture/drug-import/health-functional-food-store-description.prompt.js';
import {
  computePreFilterFlags,
  isGenerationEligible,
  classifyPreGeneration,
  HFF_DESCRIPTION_PRE_FLAGS,
  type HffBulkPreVerdict,
} from '../modules/neture/drug-import/health-functional-food-description-guards.js';

const DEFAULT_SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';

// ── 비용 추정 상수 (실측 아님 — gemini-2.5-flash 공개가 가정, 실행 시 검증 필요) ──
const TOKEN_PER_CHAR = 0.5; // 한글 혼합 보수적 추정(gemini SentencePiece 대략)
const OUTPUT_TOKENS_EST = 450; // 초안 JSON 평균 출력 토큰 추정
const PRICE_INPUT_PER_1M = 0.3; // USD, 가정
const PRICE_OUTPUT_PER_1M = 2.5; // USD, 가정
const TOTAL_CANDIDATES = 44885;

interface CliArgs {
  file: string | null;
  useDb: boolean;
  limit: number | null;
  offset: number;
  sourceLabel: string;
  excludeRaw: boolean;
  excludeExport: boolean;
  live: boolean;
  out: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (n: string): string | undefined => {
    const i = argv.indexOf(`--${n}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (n: string): boolean => argv.includes(`--${n}`);
  const file = get('file') ?? null;
  const useDb = has('use-db');
  if (!file && !useDb) throw new Error('--file <jsonl> 또는 --use-db 필수');
  const limitRaw = get('limit');
  const offsetRaw = get('offset');
  return {
    file,
    useDb,
    limit: limitRaw != null ? parseInt(limitRaw, 10) : null,
    offset: offsetRaw != null ? parseInt(offsetRaw, 10) : 0,
    sourceLabel: get('source-label') ?? DEFAULT_SOURCE_LABEL,
    excludeRaw: has('exclude-raw-material'),
    excludeExport: has('exclude-export'),
    live: has('live'),
    out: get('out') ?? null,
  };
}

async function loadItems(args: CliArgs): Promise<{ items: HealthFunctionalFoodItem[]; source: string }> {
  if (args.file) {
    const abs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(abs)) throw new Error(`파일 없음: ${abs}`);
    const parsed = parseHealthFunctionalFoodJsonl(fs.readFileSync(abs, 'utf-8'));
    let rows = parsed.rows.map((r) => r.item);
    if (args.offset > 0) rows = rows.slice(args.offset);
    if (args.limit != null) rows = rows.slice(0, args.limit);
    return { items: rows, source: `file:${path.basename(abs)}` };
  }
  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();
  try {
    const limitSql = args.limit != null ? `LIMIT ${Number(args.limit)}` : '';
    const rows: { raw_payload: Record<string, unknown> | null }[] = await ds.query(
      `SELECT raw_payload FROM product_candidates WHERE source_label = $1 AND deleted_at IS NULL ORDER BY created_at ASC OFFSET ${Number(args.offset)} ${limitSql}`,
      [args.sourceLabel],
    );
    const items = rows
      .map((r) => (r.raw_payload ? ((r.raw_payload as Record<string, unknown>).source as HealthFunctionalFoodItem | null) : null))
      .filter((x): x is HealthFunctionalFoodItem => x != null);
    return { items, source: `db:product_candidates(${args.sourceLabel})` };
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.live && !process.env.GEMINI_API_KEY) {
    console.log('[live] GEMINI_API_KEY 미설정 + config resolver(DB scope) 필요 → 실호출 없이 render-only 진행. live 실측은 in-app execute() 경로에서 수행.');
  }
  const { items, source } = await loadItems(args);

  const flagCounts: Record<string, number> = Object.fromEntries(HFF_DESCRIPTION_PRE_FLAGS.map((f) => [f, 0]));
  const preVerdict: Record<HffBulkPreVerdict, number> = {
    HOLD_RAW_MATERIAL_OR_OEM: 0, HOLD_EXPORT_ONLY: 0, HOLD_MISSING_MAIN_FUNCTION: 0,
    HOLD_TERSE_CLAIM_NEEDS_REVIEW: 0, ELIGIBLE_FOR_GENERATION: 0,
  };
  let eligibleForGen = 0;
  let inputCharsEligible = 0;

  for (const item of items) {
    const seed = buildHealthFunctionalFoodDescriptionSeed(item);
    const flags = computePreFilterFlags(seed);
    for (const f of flags) flagCounts[f] += 1;
    preVerdict[classifyPreGeneration(flags)] += 1;
    if (isGenerationEligible(flags, { excludeRawMaterial: args.excludeRaw, excludeExport: args.excludeExport })) {
      eligibleForGen += 1;
      inputCharsEligible += HFF_STORE_DESCRIPTION_SYSTEM_PROMPT.length + buildHealthFunctionalFoodStoreDescriptionUserPrompt(seed).length;
    }
  }

  const total = items.length;
  // 토큰/비용 추정 (eligible 대상, render-only — 실호출 아님)
  const inputTokensEst = Math.round(inputCharsEligible * TOKEN_PER_CHAR);
  const outputTokensEst = eligibleForGen * OUTPUT_TOKENS_EST;
  const costSampleUsd = (inputTokensEst / 1e6) * PRICE_INPUT_PER_1M + (outputTokensEst / 1e6) * PRICE_OUTPUT_PER_1M;
  const perEligibleUsd = eligibleForGen ? costSampleUsd / eligibleForGen : 0;
  // full-run 예측: 표본의 eligible 비율을 전체 44,885 에 투영
  const eligibleRate = total ? eligibleForGen / total : 0;
  const fullEligible = Math.round(TOTAL_CANDIDATES * eligibleRate);
  const fullCostUsd = perEligibleUsd * fullEligible;

  const report = {
    wo: 'WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1',
    mode: 'render-only',
    source,
    total,
    excludeRawMaterial: args.excludeRaw,
    excludeExport: args.excludeExport,
    flagCounts,
    flagRate: Object.fromEntries(Object.entries(flagCounts).map(([k, v]) => [k, total ? `${((v / total) * 100).toFixed(2)}%` : '0%'])),
    preGenerationVerdict: preVerdict,
    eligibleForGen,
    eligibleRate: `${(eligibleRate * 100).toFixed(2)}%`,
    costEstimate: {
      note: 'render-only 추정. gemini-2.5-flash 가정가(input $0.30/1M, output $2.50/1M), TOKEN_PER_CHAR=0.5, OUTPUT_TOKENS_EST=450 — 실측 아님',
      model: 'gemini-2.5-flash(assumed)',
      inputTokensEst, outputTokensEst,
      costSampleUsd: Number(costSampleUsd.toFixed(4)),
      perEligibleUsd: Number(perEligibleUsd.toFixed(6)),
      fullRunEligible: fullEligible,
      fullRunCostUsdEst: Number(fullCostUsd.toFixed(2)),
    },
  };

  console.log('───────────────────────────────────────────────');
  console.log('건강기능식품 매장 설명 BULK dry-run (render-only)');
  console.log('───────────────────────────────────────────────');
  console.log(`source            : ${source}`);
  console.log(`total             : ${total}`);
  console.log(`flagRate          : ${JSON.stringify(report.flagRate)}`);
  console.log(`preGenVerdict     : ${JSON.stringify(preVerdict)}`);
  console.log(`eligibleForGen    : ${eligibleForGen} (${report.eligibleRate})  [excludeRaw=${args.excludeRaw} excludeExport=${args.excludeExport}]`);
  console.log(`costEstimate      : ${JSON.stringify(report.costEstimate)}`);

  if (args.out) {
    const abs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
    fs.writeFileSync(abs, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`out               : ${abs} (⚠️ gitignore 경로만)`);
  }

  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify(report));
  console.log('JSON_REPORT_END');
}

main().catch((e) => {
  console.error('[hff-store-description-bulk-dryrun] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
