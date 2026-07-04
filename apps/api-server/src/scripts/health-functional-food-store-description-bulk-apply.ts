/**
 * Health Functional Food Store Description — BULK APPLY (dry-run 기본, --apply env-gated)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1 §10
 *
 * 저장 대상: product_candidate_description_drafts (신규). review_status 기본 needs_review.
 * **dry-run 기본** = AI/ DB write 없음, 대상 산정만. **--apply** = 생성+저장(이중 게이트).
 *
 * 생성 능력(live AI):
 *   - `AiPolicyExecutorService.execute()` 는 live DataSource + ai_llm_policies scope
 *     (HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION 미정의) + GEMINI_API_KEY 필요 + AIUsageLog write.
 *   - standalone CLI 에는 이 경로가 없으므로 --apply 는 생성 능력 확인에서 **중단(halt)**한다(§6.4).
 *     실제 apply 는 in-app 실행(scope 정의 + 배포 환경)에서 이 CLI 구조를 재사용해 수행.
 *
 * Usage (dry-run):
 *   npx tsx src/scripts/health-functional-food-store-description-bulk-apply.ts \
 *     --file "G:\\...\\mfds-health-functional-food-info-raw.jsonl" --only-eligible
 */

import '../env-loader.js';

import * as fs from 'fs';
import * as path from 'path';
import { parseHealthFunctionalFoodJsonl } from '../modules/neture/drug-import/health-functional-food-jsonl.parser.js';
import type { HealthFunctionalFoodItem } from '../modules/neture/drug-import/health-functional-food-jsonl.parser.js';
import { buildHealthFunctionalFoodDescriptionSeed } from '../modules/neture/drug-import/health-functional-food-store-description.prompt.js';
import {
  computePreFilterFlags,
  isGenerationEligible,
  HFF_DESCRIPTION_PRE_FLAGS,
} from '../modules/neture/drug-import/health-functional-food-description-guards.js';

const DEFAULT_SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
export const HFF_STORE_DESCRIPTION_AI_SCOPE = 'HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION';
const TOKEN_PER_CHAR = 0.5, OUTPUT_TOKENS_EST = 450, PRICE_INPUT_1M = 0.3, PRICE_OUTPUT_1M = 2.5;

interface CliArgs {
  file: string | null; useDb: boolean; limit: number | null; offset: number; batchSize: number;
  sourceLabel: string; onlyEligible: boolean; excludeRaw: boolean; excludeExport: boolean;
  maxLive: number | null; apply: boolean; out: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (n: string) => {
    const i = argv.indexOf(`--${n}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (n: string) => argv.includes(`--${n}`);
  const file = get('file') ?? null;
  const useDb = has('use-db');
  if (!file && !useDb) throw new Error('--file <jsonl> 또는 --use-db 필수');
  const num = (v: string | undefined) => (v != null ? parseInt(v, 10) : null);
  return {
    file, useDb, limit: num(get('limit')), offset: num(get('offset')) ?? 0,
    batchSize: num(get('batch-size')) ?? 100, sourceLabel: get('source-label') ?? DEFAULT_SOURCE_LABEL,
    onlyEligible: has('only-eligible'), excludeRaw: has('exclude-raw-material'), excludeExport: has('exclude-export'),
    maxLive: num(get('max-live')), apply: has('apply'), out: get('out') ?? null,
  };
}

/**
 * live 생성 능력 확인.
 * scope(HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION)는 코드 union + ai_llm_policies seed 로 정의됨.
 * 그러나 standalone tsx 는 in-app AiPolicyExecutor(전체 app DataSource + ai_settings 키 + AIUsageLog write)
 * 를 구성할 수 없어 live 생성 불가 → **배포 환경(Cloud Run Job / in-app job)에서 실행**해야 한다.
 */
function resolveGenerationCapability(): { available: boolean; reason: string } {
  const reasons: string[] = [];
  if (!process.env.GEMINI_API_KEY) reasons.push('GEMINI_API_KEY env 미설정(운영 키는 ai_settings/Secret — standalone 미접근)');
  reasons.push('in-app AiPolicyExecutor(전체 app DataSource + AIUsageLog write) standalone 미구성 → 배포 환경(Cloud Run Job) 실행 필요');
  return { available: false, reason: reasons.join(' / ') };
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
      `SELECT raw_payload FROM product_candidates WHERE source_label=$1 AND deleted_at IS NULL ORDER BY created_at ASC OFFSET ${Number(args.offset)} ${limitSql}`,
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

  // ── apply 이중 게이트: env + live 생성 능력 (§6.4) ──
  if (args.apply) {
    if (process.env.HFF_DESCRIPTION_BULK_APPLY_CONFIRM !== 'YES') {
      throw new Error('APPLY_BLOCKED: --apply 는 HFF_DESCRIPTION_BULK_APPLY_CONFIRM=YES 필요');
    }
    const cap = resolveGenerationCapability();
    if (!cap.available) {
      throw new Error(
        `APPLY_HALTED (§6.4 live gate): 생성 능력 미확보 → bulk apply 중단, DB write 0. 사유: ${cap.reason}. ` +
          'in-app 실행(HFF scope 정의 + 배포 환경 + GEMINI_API_KEY)에서 수행하세요.',
      );
    }
    // NOTE: in-app 구현 시 여기서 배치 생성+guard+upsert. standalone 은 위에서 중단됨.
  }

  const { items, source } = await loadItems(args);
  const flagCounts: Record<string, number> = Object.fromEntries(HFF_DESCRIPTION_PRE_FLAGS.map((f) => [f, 0]));
  let scanned = 0, eligible = 0, excludedRaw = 0, excludedExport = 0, inputChars = 0;

  for (const item of items) {
    scanned += 1;
    const seed = buildHealthFunctionalFoodDescriptionSeed(item);
    const flags = computePreFilterFlags(seed);
    for (const f of flags) flagCounts[f] += 1;
    if (flags.includes('RAW_MATERIAL_OR_OEM')) excludedRaw += 1;
    if (flags.includes('EXPORT_ONLY')) excludedExport += 1;
    const gen = isGenerationEligible(flags, { excludeRawMaterial: args.excludeRaw, excludeExport: args.excludeExport });
    if (gen) {
      eligible += 1;
      inputChars += 1707 + JSON.stringify(seed).length; // systemPrompt + seed(근사)
    }
  }

  const inputTok = Math.round(inputChars * TOKEN_PER_CHAR);
  const outputTok = eligible * OUTPUT_TOKENS_EST;
  const costUsd = (inputTok / 1e6) * PRICE_INPUT_1M + (outputTok / 1e6) * PRICE_OUTPUT_1M;

  const report = {
    wo: 'WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1',
    mode: args.apply ? 'apply' : 'dry-run',
    source, sourceLabel: args.sourceLabel,
    candidatesScanned: scanned, eligible,
    excludedRawMaterial: excludedRaw, excludedExport: excludedExport,
    generated: 0, updated: 0, skipped: 0, failed: 0, guardFail: 0, // dry-run: 생성 0
    reviewFlagDistribution: flagCounts,
    costEstimate: { note: 'render-only 추정(실측 아님), gemini-2.5-flash 가정가', costUsd: Number(costUsd.toFixed(2)) },
    dbWrite: 0,
  };

  console.log('───────────────────────────────────────────────');
  console.log('건강기능식품 매장 설명 BULK APPLY (dry-run)');
  console.log('───────────────────────────────────────────────');
  console.log(`source              : ${source}`);
  console.log(`candidatesScanned   : ${scanned}`);
  console.log(`eligible            : ${eligible}`);
  console.log(`excludedRawMaterial : ${excludedRaw}`);
  console.log(`excludedExport      : ${excludedExport}`);
  console.log(`generated/updated/skipped/failed/guardFail : 0/0/0/0/0 (dry-run)`);
  console.log(`reviewFlagDistribution : ${JSON.stringify(flagCounts)}`);
  console.log(`costEstimate        : ${JSON.stringify(report.costEstimate)}`);
  console.log(`dbWrite             : 0`);

  if (args.out) {
    const abs = path.isAbsolute(args.out) ? args.out : path.resolve(process.cwd(), args.out);
    fs.writeFileSync(abs, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`out                 : ${abs} (⚠️ gitignore 경로만)`);
  }
  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify(report));
  console.log('JSON_REPORT_END');
}

main().catch((e) => {
  console.error('[hff-store-description-bulk-apply] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
