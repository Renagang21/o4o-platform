/**
 * Health Functional Food Official Text Parser — read-only DRY-RUN
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1 §6.3
 *
 * 건강기능식품 후보의 공식 텍스트를 파서로 구조화한 뒤 aggregate 메트릭만 출력한다.
 * **read-only.** DB write / migration / AI / 후보 status 변경 없음.
 *
 * 입력 소스 (둘 중 하나, 둘 다 read-only):
 *   A) --use-db  : product_candidates 에서 source_label 후보를 SELECT (raw_payload.source 파싱)
 *   B) --file <jsonl> : repo 밖 raw JSONL 을 직접 파싱 (rawPayload.source 와 동일 item)
 *                       — 프로덕션 DB 방화벽/병렬세션 clobber 회피용 오프라인 경로.
 *
 * Usage:
 *   # 오프라인(raw JSONL) — 권장(방화벽 무관)
 *   npx tsx src/scripts/health-functional-food-official-text-parser-dryrun.ts \
 *     --file "G:\\내 드라이브\\자료실\\public-data-api-samples\\mfds-health-functional-food-info-raw.jsonl"
 *   # DB read-only
 *   npx tsx src/scripts/health-functional-food-official-text-parser-dryrun.ts --use-db --limit 1000
 *
 * 옵션: --limit N --offset N --source-label MFDS_HEALTH_FUNCTIONAL_FOOD
 *       --sample-out <gitignore 경로>(선택, 기본 미출력) --no-sample-out(기본)
 */

import '../env-loader.js';

import * as fs from 'fs';
import * as path from 'path';
import { parseHealthFunctionalFoodJsonl } from '../modules/neture/drug-import/health-functional-food-jsonl.parser.js';
import type { HealthFunctionalFoodItem } from '../modules/neture/drug-import/health-functional-food-jsonl.parser.js';
import {
  parseHealthFunctionalFoodOfficialText,
  classifyHealthFunctionalFoodDescriptionSuitability,
  HFF_OFFICIAL_TEXT_FLAGS,
  type HealthFunctionalFoodDescriptionSuitability,
} from '../modules/neture/drug-import/health-functional-food-official-text.parser.js';

const DEFAULT_SOURCE_LABEL = 'MFDS_HEALTH_FUNCTIONAL_FOOD';

interface CliArgs {
  file: string | null;
  useDb: boolean;
  limit: number | null;
  offset: number;
  sourceLabel: string;
  sampleOut: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const has = (name: string): boolean => argv.includes(`--${name}`);

  const file = get('file') ?? null;
  const useDb = has('use-db');
  if (!file && !useDb) throw new Error('--file <jsonl> 또는 --use-db 중 하나는 필수');

  const limitRaw = get('limit');
  const offsetRaw = get('offset');
  const sampleOut = has('no-sample-out') ? null : get('sample-out') ?? null;

  return {
    file,
    useDb,
    limit: limitRaw != null ? parseInt(limitRaw, 10) : null,
    offset: offsetRaw != null ? parseInt(offsetRaw, 10) : 0,
    sourceLabel: get('source-label') ?? DEFAULT_SOURCE_LABEL,
    sampleOut,
  };
}

/** 후보 item 목록 로드 (read-only). file 우선. */
async function loadItems(args: CliArgs): Promise<{ items: (HealthFunctionalFoodItem | null)[]; source: string; rawPayloadMissing: number }> {
  if (args.file) {
    const abs = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(abs)) throw new Error(`파일 없음: ${abs}`);
    const text = fs.readFileSync(abs, 'utf-8');
    const parsed = parseHealthFunctionalFoodJsonl(text);
    let rows = parsed.rows.map((r) => r.item);
    if (args.offset > 0) rows = rows.slice(args.offset);
    if (args.limit != null) rows = rows.slice(0, args.limit);
    return { items: rows, source: `file:${path.basename(abs)}`, rawPayloadMissing: 0 };
  }

  // --use-db: 최소 DataSource(entities:[]) + raw SELECT (읽기 전용)
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
    const limitSql = args.limit != null ? `LIMIT ${Number(args.limit)}` : '';
    const rows: { raw_payload: Record<string, unknown> | null }[] = await ds.query(
      `SELECT raw_payload FROM product_candidates
       WHERE source_label = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC OFFSET ${Number(args.offset)} ${limitSql}`,
      [args.sourceLabel],
    );
    let rawPayloadMissing = 0;
    const items = rows.map((r) => {
      const rp = r.raw_payload;
      if (rp == null) {
        rawPayloadMissing += 1;
        return null;
      }
      // Gate A mapper 구조: raw_payload.source = 원본 HFF item
      const src = (rp as Record<string, unknown>).source;
      return (src ?? null) as HealthFunctionalFoodItem | null;
    });
    return { items, source: `db:product_candidates(source_label=${args.sourceLabel})`, rawPayloadMissing };
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { items, source, rawPayloadMissing } = await loadItems(args);

  const total = items.length;
  const fieldPresence = { mainFunction: 0, intake: 0, caution: 0, baseStandard: 0, appearance: 0, storage: 0, shelfLife: 0 };
  const flagCounts: Record<string, number> = Object.fromEntries(HFF_OFFICIAL_TEXT_FLAGS.map((f) => [f, 0]));
  const suitabilityCounts: Record<HealthFunctionalFoodDescriptionSuitability, number> = {
    READY_FOR_GUIDELINE: 0,
    PARTIAL_TEXT_ONLY: 0,
    REVIEW_RISK_CLAIM: 0,
    INSUFFICIENT_TEXT: 0,
    RAW_PAYLOAD_MISSING: 0,
  };
  let sttemntNoPresent = 0;
  let productNamePresent = 0;
  let manufacturerPresent = 0;
  let parseSuccess = 0; // parsedSectionCount > 0
  const textLengths: number[] = [];
  const sampleLines: string[] = [];

  for (const item of items) {
    const r = parseHealthFunctionalFoodOfficialText(item);
    if (r.sttemntNo) sttemntNoPresent += 1;
    if (r.productName) productNamePresent += 1;
    if (r.manufacturerName) manufacturerPresent += 1;
    if (r.sections.mainFunction) fieldPresence.mainFunction += 1;
    if (r.sections.intake) fieldPresence.intake += 1;
    if (r.sections.caution) fieldPresence.caution += 1;
    if (r.sections.baseStandard) fieldPresence.baseStandard += 1;
    if (r.sections.appearance) fieldPresence.appearance += 1;
    if (r.sections.storage) fieldPresence.storage += 1;
    if (r.sections.shelfLife) fieldPresence.shelfLife += 1;
    for (const f of r.flags) flagCounts[f] = (flagCounts[f] ?? 0) + 1;
    if (r.metrics.parsedSectionCount > 0) parseSuccess += 1;
    textLengths.push(r.metrics.textLength);
    suitabilityCounts[classifyHealthFunctionalFoodDescriptionSuitability(r)] += 1;

    if (args.sampleOut && sampleLines.length < 50) sampleLines.push(JSON.stringify(r));
  }

  const pct = (n: number): string => (total ? `${((n / total) * 100).toFixed(2)}%` : '0%');
  const textLenSum = textLengths.reduce((a, b) => a + b, 0);

  const report = {
    wo: 'WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1',
    mode: 'read-only-dry-run',
    source,
    sourceLabel: args.sourceLabel,
    total,
    rawPayloadMissing,
    parseSuccess,
    parseSuccessRate: pct(parseSuccess),
    identifierPresence: {
      sttemntNo: sttemntNoPresent,
      productName: productNamePresent,
      manufacturer: manufacturerPresent,
    },
    fieldPresence,
    fieldPresenceRate: Object.fromEntries(Object.entries(fieldPresence).map(([k, v]) => [k, pct(v)])),
    flagCounts,
    suitabilityCounts,
    textLength: {
      avg: total ? Math.round(textLenSum / total) : 0,
      median: median(textLengths),
      max: textLengths.length ? Math.max(...textLengths) : 0,
    },
  };

  console.log('───────────────────────────────────────────────');
  console.log('건강기능식품 공식 텍스트 파서 dry-run (read-only)');
  console.log('───────────────────────────────────────────────');
  console.log(`source              : ${source}`);
  console.log(`total               : ${total}`);
  console.log(`rawPayloadMissing   : ${rawPayloadMissing}`);
  console.log(`parseSuccess        : ${parseSuccess} (${report.parseSuccessRate})`);
  console.log(`identifierPresence  : ${JSON.stringify(report.identifierPresence)}`);
  console.log(`fieldPresenceRate   : ${JSON.stringify(report.fieldPresenceRate)}`);
  console.log(`flagCounts          : ${JSON.stringify(flagCounts)}`);
  console.log(`suitabilityCounts   : ${JSON.stringify(suitabilityCounts)}`);
  console.log(`textLength          : ${JSON.stringify(report.textLength)}`);

  if (args.sampleOut && sampleLines.length) {
    const abs = path.isAbsolute(args.sampleOut) ? args.sampleOut : path.resolve(process.cwd(), args.sampleOut);
    fs.writeFileSync(abs, sampleLines.join('\n'), 'utf-8');
    console.log(`sampleOut(${sampleLines.length})       : ${abs} (⚠️ gitignore 경로만 사용)`);
  }

  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify(report));
  console.log('JSON_REPORT_END');
}

main().catch((e) => {
  console.error('[hff-official-text-parser-dryrun] FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
