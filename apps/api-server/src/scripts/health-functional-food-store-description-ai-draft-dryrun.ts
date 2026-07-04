/**
 * Health Functional Food Store Description — AI DRAFT DRY-RUN (read-only 입력, 소량)
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1 §5
 *
 * 소량(기본 30, 최대 100) 계층 샘플의 seed + 렌더 프롬프트를 만든다.
 * **DB write / SharedProductDescription / status 변경 없음.** raw 는 repo 밖.
 *
 * 생성(AI) 모드:
 *   - 기본 = render-only: seed + 프롬프트만 산출(--sample-out 로 gitignore 경로에 저장).
 *     실제 초안 생성/품질평가는 외부 모델(파일럿)에서 수행 — 본 dry-run 은 seed·프롬프트 검증.
 *   - --live: @o4o/ai-core execute() 실경로. **in-app config resolver(DB scope)+provider 키 필요** →
 *     standalone 로컬에서는 config 미해결로 미지원. 실호출은 in-app 서비스 경로에서 별도 수행.
 *
 * Usage:
 *   npx tsx src/scripts/health-functional-food-store-description-ai-draft-dryrun.ts \
 *     --file "G:\\...\\mfds-health-functional-food-info-raw.jsonl" --limit 30 \
 *     --sample-out "<scratchpad>/hff-desc-sample.jsonl" --with-prompt
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
  type HealthFunctionalFoodDescriptionSeed,
} from '../modules/neture/drug-import/health-functional-food-store-description.prompt.js';

const DEFAULT_SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';
const MAX_SAMPLE = 100;

interface CliArgs {
  file: string | null;
  useDb: boolean;
  limit: number;
  sourceLabel: string;
  sampleOut: string | null;
  withPrompt: boolean;
  live: boolean;
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
  const limit = Math.min(limitRaw ? parseInt(limitRaw, 10) : 30, MAX_SAMPLE);
  return {
    file,
    useDb,
    limit,
    sourceLabel: get('source-label') ?? DEFAULT_SOURCE_LABEL,
    sampleOut: get('sample-out') ?? null,
    withPrompt: has('with-prompt'),
    live: has('live'),
  };
}

async function loadItems(args: CliArgs): Promise<{ items: HealthFunctionalFoodItem[]; source: string }> {
  if (args.file) {
    const abs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(abs)) throw new Error(`파일 없음: ${abs}`);
    const parsed = parseHealthFunctionalFoodJsonl(fs.readFileSync(abs, 'utf-8'));
    return { items: parsed.rows.map((r) => r.item), source: `file:${path.basename(abs)}` };
  }
  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  const ds = new DataSource({
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: ['error'],
    ...(host && !host.startsWith('/cloudsql/') ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await ds.initialize();
  try {
    const rows: { raw_payload: Record<string, unknown> | null }[] = await ds.query(
      `SELECT raw_payload FROM product_candidates WHERE source_label = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 20000`,
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

interface Featured {
  seed: HealthFunctionalFoodDescriptionSeed;
  mainLen: number;
  claimCount: number;
  intakeLen: number;
  hasCaution: boolean;
  baseLen: number;
  textLen: number;
}

/** 계층(strata) 다양성 + 업체 편중 방지 샘플러. */
function stratifiedSample(all: Featured[], n: number): { picked: Featured[]; strataHit: Record<string, number> } {
  const strata: { key: string; rank: (f: Featured) => number; filter?: (f: Featured) => boolean }[] = [
    { key: 'shortMain', rank: (f) => f.mainLen, filter: (f) => f.mainLen > 0 }, // 오름차순(짧은)
    { key: 'longMain', rank: (f) => -f.mainLen },
    { key: 'multiClaim', rank: (f) => -f.claimCount, filter: (f) => f.claimCount >= 3 },
    { key: 'longIntake', rank: (f) => -f.intakeLen },
    { key: 'hasCaution', rank: (f) => -(f.hasCaution ? 1 : 0), filter: (f) => f.hasCaution },
    { key: 'longBase', rank: (f) => -f.baseLen },
    { key: 'missingMain', rank: (f) => f.mainLen, filter: (f) => f.mainLen === 0 },
    { key: 'topLength', rank: (f) => -f.textLen },
    { key: 'avgLength', rank: (f) => Math.abs(f.textLen - 728) }, // 전량 avg≈728
  ];
  const picked: Featured[] = [];
  const seen = new Set<string>();
  const mfrCount = new Map<string, number>();
  const strataHit: Record<string, number> = {};
  const key = (f: Featured) => f.seed.sttemntNo ?? f.seed.productName;

  let idx = 0;
  while (picked.length < n) {
    const st = strata[idx % strata.length];
    idx += 1;
    const pool = (st.filter ? all.filter(st.filter) : all)
      .filter((f) => !seen.has(key(f)))
      .filter((f) => (mfrCount.get(f.seed.manufacturerName ?? '') ?? 0) < 2) // 업체 최대 2건
      .sort((a, b) => st.rank(a) - st.rank(b));
    const pick = pool[0];
    if (pick) {
      picked.push(pick);
      seen.add(key(pick));
      mfrCount.set(pick.seed.manufacturerName ?? '', (mfrCount.get(pick.seed.manufacturerName ?? '') ?? 0) + 1);
      strataHit[st.key] = (strataHit[st.key] ?? 0) + 1;
    }
    if (idx > strata.length * n * 4) break; // 안전 브레이크
  }
  return { picked, strataHit };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.live) {
    console.log(
      '[live] --live 는 @o4o/ai-core execute() config resolver(DB scope)+provider 키가 필요해 standalone 로컬에서 미지원. render-only 로 진행합니다. 실호출은 in-app 서비스 경로에서 수행하세요.',
    );
  }
  const { items, source } = await loadItems(args);

  const featured: Featured[] = items.map((item) => {
    const seed = buildHealthFunctionalFoodDescriptionSeed(item);
    return {
      seed,
      mainLen: seed.mainFunction?.length ?? 0,
      claimCount: seed.functionalClaims.length,
      intakeLen: seed.intake?.length ?? 0,
      hasCaution: !!seed.caution,
      baseLen: seed.baseStandard?.length ?? 0,
      textLen: (seed.mainFunction?.length ?? 0) + (seed.intake?.length ?? 0) + (seed.caution?.length ?? 0) + (seed.baseStandard?.length ?? 0),
    };
  });

  const { picked, strataHit } = stratifiedSample(featured, args.limit);

  const seedFieldPresence = { mainFunction: 0, intake: 0, caution: 0, baseStandard: 0 };
  const promptSizes: number[] = [];
  const sampleLines: string[] = [];
  const mfrs = new Set<string>();
  for (const f of picked) {
    const seed = f.seed;
    if (seed.mainFunction) seedFieldPresence.mainFunction += 1;
    if (seed.intake) seedFieldPresence.intake += 1;
    if (seed.caution) seedFieldPresence.caution += 1;
    if (seed.baseStandard) seedFieldPresence.baseStandard += 1;
    mfrs.add(seed.manufacturerName ?? '');
    const userPrompt = buildHealthFunctionalFoodStoreDescriptionUserPrompt(seed);
    promptSizes.push(userPrompt.length);
    if (args.sampleOut) {
      sampleLines.push(JSON.stringify(args.withPrompt ? { seed, userPrompt } : { seed }));
    }
  }

  const report = {
    wo: 'WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1',
    mode: args.live ? 'render-only(live-unsupported-standalone)' : 'render-only',
    source,
    totalCandidates: items.length,
    sampleSize: picked.length,
    strataHit,
    manufacturerDiversity: mfrs.size,
    seedFieldPresence,
    systemPromptChars: HFF_STORE_DESCRIPTION_SYSTEM_PROMPT.length,
    userPromptChars: {
      avg: promptSizes.length ? Math.round(promptSizes.reduce((a, b) => a + b, 0) / promptSizes.length) : 0,
      max: promptSizes.length ? Math.max(...promptSizes) : 0,
    },
  };

  console.log('───────────────────────────────────────────────');
  console.log('건강기능식품 매장 설명 AI draft dry-run (render-only)');
  console.log('───────────────────────────────────────────────');
  console.log(`source              : ${source}`);
  console.log(`totalCandidates     : ${items.length}`);
  console.log(`sampleSize          : ${picked.length} (limit ${args.limit})`);
  console.log(`strataHit           : ${JSON.stringify(strataHit)}`);
  console.log(`manufacturerDiversity: ${mfrs.size}`);
  console.log(`seedFieldPresence   : ${JSON.stringify(seedFieldPresence)}`);
  console.log(`systemPromptChars   : ${report.systemPromptChars}`);
  console.log(`userPromptChars     : ${JSON.stringify(report.userPromptChars)}`);

  if (args.sampleOut && sampleLines.length) {
    const abs = path.isAbsolute(args.sampleOut) ? args.sampleOut : path.resolve(process.cwd(), args.sampleOut);
    fs.writeFileSync(abs, sampleLines.join('\n'), 'utf-8');
    console.log(`sampleOut(${sampleLines.length})       : ${abs} (⚠️ gitignore/scratchpad 경로만)`);
  }

  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify(report));
  console.log('JSON_REPORT_END');
}

main().catch((e) => {
  console.error('[hff-store-description-ai-draft-dryrun] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
