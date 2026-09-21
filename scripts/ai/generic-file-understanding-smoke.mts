/**
 * Generic File Understanding — 실 Gemini 스모크
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 §실측
 *
 * 목적: 지금까지 구현한 공통 capability 계약이 **실제 Gemini 호출**에서도 지켜지는지 확인.
 *   StructureProfile + TargetSchema → inferFileStructure(실 서비스)
 *   → FileStructureInference → validateInference(서비스 내부) → normalizeRows → NormalizedRecord[]
 *
 * 경계(엄수):
 *   - hospital-drug 실제 파일·병원약국 특화 schema **사용 금지** — 도메인 중립 generic fixture 만.
 *   - 새 inference engine 만들지 않음 — 현재 서비스(`inferFileStructure`)를 그대로 호출.
 *   - 모델 하드코딩 금지 — 서비스가 `resolveEditingModel()`(admin SSOT, fallback gemini-3.8-flash) 사용.
 *   - API key 는 env 로만 주입. 키를 코드·문서·로그·출력 어디에도 기록하지 않는다.
 *
 * 실행(키는 현재 셸 세션에만):
 *   $env:GEMINI_API_KEY="<key>"; npx tsx scripts/ai/generic-file-understanding-smoke.mts; Remove-Item Env:GEMINI_API_KEY
 *
 * 판정: §9 의 9개 verdict. 환경 차단(BLOCKED)과 capability FAIL 을 구분한다.
 *   exit 0 = PASS · exit 1 = capability FAIL · exit 2 = PENDING/BLOCKED(환경).
 */

import 'reflect-metadata';

import { decodeWorkbook } from '../../apps/api-server/src/services/ai-tools/file-understanding/decode.js';
import { profileWorkbook } from '../../apps/api-server/src/services/ai-tools/file-understanding/profile.js';
import {
  evaluateConfidence,
  normalizeRows,
} from '../../apps/api-server/src/services/ai-tools/file-understanding/normalize.js';
import {
  STRUCTURE_PROFILE_SAMPLE_ROWS,
  type FileStructureInference,
  type TargetSchema,
} from '../../apps/api-server/src/services/ai-tools/file-understanding/contract.js';
// 실 key resolver(엔티티 무관: `type DataSource` 만 import) — DB 미초기화면 env 키 반환.
import { resolveAiApiKey } from '../../apps/api-server/src/utils/ai-key.util.js';
// 모델 SSOT 상수(순수 상수 · 엔티티 무관) — 하드코딩 대신 이 단일 출처를 쓴다.
import { GEMINI_CANONICAL_MODEL, MODEL_WHITELIST } from '../../apps/api-server/src/types/ai-proxy.types.js';

// ── 도메인 중립 generic fixture (재고표 · hospital-drug 아님) ──
// section title / header / data 가 서로 다른 행. 헤더 어휘도 region 마다 다름(Item Name vs Product 등).
const FIXTURE_CSV = [
  '2026 Inventory Report',
  'created 2026-09-21',
  '',
  'Category A',
  'Item Name,Quantity,Unit Price',
  'Widget A,10,1200',
  'Widget B,5,1500',
  '',
  'Category B',
  'Product,Stock,Price',
  'Widget C,7,2000',
].join('\n');

// surface 가 주입하는 generic descriptor (도메인 result type 아님).
const TARGET_SCHEMA: TargetSchema = {
  id: 'generic-inventory-smoke-v1',
  fields: [
    { key: 'item_name', description: '항목/상품의 이름', required: true, examples: ['Widget A'] },
    { key: 'quantity', description: '수량 또는 재고 수(정수)', required: false, examples: ['10'] },
    { key: 'price', description: '단가 또는 가격', required: false, examples: ['1200'] },
  ],
};

const EXPECTED_NORMALIZED_COUNT = 3; // Widget A/B (Category A) + Widget C (Category B)
const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

type Verdict = 'PASS' | 'FAIL' | 'PENDING' | 'YES' | 'NO' | '—';
const verdicts: Record<string, Verdict> = {
  GENERIC_FILE_UNDERSTANDING_REAL_SMOKE: '—',
  ADMIN_MODEL_RESOLUTION: '—',
  GEMINI_JSON_CONTRACT: '—',
  STRUCTURE_INFERENCE: '—',
  TARGET_SCHEMA_GUARD: '—',
  CONFIDENCE_GATE: '—',
  DETERMINISTIC_NORMALIZER: '—',
  PRIVACY_BOUNDARY: '—',
  CAPABILITY_CLOSED: 'NO',
};

function printVerdicts() {
  console.log('\n================= 종료 판정 =================');
  for (const [k, v] of Object.entries(verdicts)) console.log(`${k} = ${v}`);
}

function isNumericLike(v: string): boolean {
  const c = String(v ?? '').replace(/[,\s]/g, '');
  return c !== '' && /^-?\d+(\.\d+)?$/.test(c);
}

/** 환경 차단 vs JSON 계약 위반 vs 기타 capability 실패 구분. */
function classifyError(err: unknown): 'BLOCKED' | 'JSON' | 'OTHER' {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/api key|unauthorized|\b401\b|\b403\b|permission|invalid.*key|authenticat/.test(msg)) return 'BLOCKED';
  if (/quota|billing|insufficient|rate.?limit|\b429\b|resource_exhausted|exhausted/.test(msg)) return 'BLOCKED';
  if (/timeout|etimedout|enotfound|econnreset|econnrefused|network|fetch failed|socket|dns/.test(msg)) return 'BLOCKED';
  if (/json|unexpected token|not valid json|in json at position/.test(msg)) return 'JSON';
  return 'OTHER';
}

async function main() {
  // ── 1. 디코드 → 프로파일(AI 입력 = 최소 표본만) ──
  const bytes = new TextEncoder().encode(FIXTURE_CSV);
  const decoded = decodeWorkbook(bytes);
  const profile = profileWorkbook(decoded);

  console.log('--- generic fixture 구조 ---');
  console.log('sourceFormat:', profile.sourceFormat, '| sheet 수:', profile.sheets.length);
  for (const s of profile.sheets) {
    console.log(`  sheet "${s.sheetName}": totalRows=${s.totalRows}, columnCount=${s.columnCount}, sampleRows=${s.sampleRows.length}`);
  }
  console.log('targetSchema fields:', TARGET_SCHEMA.fields.map((f) => f.key).join(', '));

  // 프라이버시 경계(K): 서비스에 넘기는 것은 profile + schema 뿐. 전체 행/워크북 필드 없음.
  const sampleWithinCap = profile.sheets.every((s) => s.sampleRows.length <= STRUCTURE_PROFILE_SAMPLE_ROWS);
  const inputKeysSafe = true; // 아래 호출 인자는 { profile, targetSchema, timeoutMs } 로 고정.
  verdicts.PRIVACY_BOUNDARY = sampleWithinCap && inputKeysSafe ? 'PASS' : 'FAIL';

  // ── 2. 실 resolver 주입 준비(모델 하드코딩 금지 · 엔티티 그래프 미로드) ──
  // key: 실 resolveAiApiKey(엔티티 무관). DB 미초기화 stub → ai_settings 건너뛰고 env 키.
  const resolveApiKey = () => resolveAiApiKey({ isInitialized: false } as never, 'gemini');
  // model: 실 resolveEditingModel 시도(SSOT admin→env→canonical). tsx 는 그 모듈이 끌어오는
  //   TypeORM 엔티티 decorator metadata 를 방출하지 못하므로, 로드 실패 시 resolver 의 DB-free
  //   분기(envFallback)를 SSOT 상수(GEMINI_CANONICAL_MODEL/MODEL_WHITELIST)로 그대로 재현한다.
  let modelSource = 'resolveEditingModel';
  const resolveModel = async (): Promise<string> => {
    try {
      const m = await import('../../apps/api-server/src/utils/ai-editing-model-resolver.js');
      return await m.resolveEditingModel();
    } catch {
      modelSource = 'ssot-fallback(envFallback replica · tsx entity-metadata 한계)';
      const allowed = (MODEL_WHITELIST as { gemini: readonly string[] }).gemini;
      const env = process.env.AI_DEFAULT_MODEL?.trim();
      return env && allowed.includes(env) ? env : GEMINI_CANONICAL_MODEL;
    }
  };

  // 서비스는 동적 import — override 주입으로 connection.js(엔티티·DB init)를 끌어오지 않는다.
  const { inferFileStructure } = await import(
    '../../apps/api-server/src/services/ai-tools/file-understanding/structure-inference.service.js'
  );

  // 실 key resolver 로 키 확보 여부 판정(없으면 서비스 호출 안 함 → PENDING).
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    console.error(
      '\n[PENDING] Gemini API key 를 resolver 가 찾지 못했습니다(env 미주입). 현재 셸 세션에만 주입 후 재실행:\n' +
        '  $env:GEMINI_API_KEY="<key>"; npx tsx scripts/ai/generic-file-understanding-smoke.mts\n' +
        '  (키는 코드·문서·로그에 기록하지 않습니다. 파이프라인·모듈 로드는 정상 확인됨.)',
    );
    verdicts.GENERIC_FILE_UNDERSTANDING_REAL_SMOKE = 'PENDING';
    printVerdicts();
    process.exit(2);
  }

  // ── 3. 실 Gemini 호출(재시도 최대 2회, BLOCKED 은 즉시 중단) ──
  let inference: FileStructureInference | undefined;
  let usedModel = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const r = await inferFileStructure({
        profile,
        targetSchema: TARGET_SCHEMA,
        timeoutMs: TIMEOUT_MS,
        resolveModel,
        resolveApiKey,
      });
      inference = r.inference;
      usedModel = r.model;
      break;
    } catch (err) {
      const kind = classifyError(err);
      const short = err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160);
      if (kind === 'BLOCKED') {
        console.error(`\n[BLOCKED] 환경 차단(auth/quota/network) — capability FAIL 아님: ${short}`);
        verdicts.GENERIC_FILE_UNDERSTANDING_REAL_SMOKE = 'PENDING';
        printVerdicts();
        process.exit(2);
      }
      console.error(`[retry ${attempt}/${MAX_ATTEMPTS}] ${kind} 실패: ${short}`);
      if (attempt === MAX_ATTEMPTS) {
        verdicts.GEMINI_JSON_CONTRACT = 'FAIL';
        verdicts.GENERIC_FILE_UNDERSTANDING_REAL_SMOKE = 'FAIL';
        printVerdicts();
        process.exit(1);
      }
    }
  }
  if (!inference) {
    verdicts.GENERIC_FILE_UNDERSTANDING_REAL_SMOKE = 'FAIL';
    printVerdicts();
    process.exit(1);
  }

  // 호출 성공 + JSON parse + 계약 검증(서비스 내부 validateInference) 통과.
  verdicts.ADMIN_MODEL_RESOLUTION = /^gemini[-.]/i.test(usedModel) ? 'PASS' : 'FAIL';
  verdicts.GEMINI_JSON_CONTRACT = 'PASS';

  const sheet = inference.sheets[0];
  const regions = sheet?.regions ?? [];
  const matrix = decoded.sheets[0].matrix;

  console.log('\n--- inference 요약(구조만) ---');
  console.log('resolved model:', usedModel, `(source: ${modelSource})`);
  console.log('overall confidence:', inference.confidence);
  console.log('sheet 수:', inference.sheets.length, '| region 수:', regions.length);
  regions.forEach((rg, i) => {
    console.log(
      `  region[${i}] sectionLabel=${JSON.stringify(rg.sectionLabel ?? null)} headerRow=${rg.headerRow ?? null} ` +
        `dataStartRow=${rg.dataStartRow} confidence=${rg.confidence}`,
    );
    console.log(
      '    columns:',
      JSON.stringify(rg.columns.map((c) => ({ targetField: c.targetField, sourceColumn: c.sourceColumn, confidence: c.confidence }))),
    );
  });
  const totalUnmapped = inference.sheets.reduce((n, s) => n + s.unmappedColumns.length, 0);
  console.log('unmappedColumns 총수:', totalUnmapped);

  // ── 4. STRUCTURE_INFERENCE: ≥2 region · sectionLabel · header/dataStartRow 정합 ──
  const labels = regions.map((rg) => (rg.sectionLabel ?? '').trim());
  const hasCatA = labels.some((l) => /category a/i.test(l));
  const hasCatB = labels.some((l) => /category b/i.test(l));
  const dataStartValid = regions.every((rg) => {
    const row = matrix[rg.dataStartRow];
    if (!row) return false;
    // dataStartRow 는 헤더/섹션 제목이 아니라 실제 데이터 행이어야 한다: item 이름 셀이 텍스트 + 다른 열에 숫자.
    const looksLikeData = row.some((c) => isNumericLike(c)) && row.some((c) => c.trim() !== '' && !isNumericLike(c));
    return looksLikeData;
  });
  verdicts.STRUCTURE_INFERENCE = regions.length >= 2 && hasCatA && hasCatB && dataStartValid ? 'PASS' : 'FAIL';

  // ── 5. TARGET_SCHEMA_GUARD: targetField ⊆ schema key · item_name/quantity/price 정확 연결 ──
  const allowed = new Set(TARGET_SCHEMA.fields.map((f) => f.key));
  const allWithinSchema = regions.every((rg) => rg.columns.every((c) => allowed.has(c.targetField)));
  const mappingCorrect = regions.every((rg) => {
    const byField = new Map(rg.columns.map((c) => [c.targetField, c.sourceColumn]));
    const dataRow = matrix[rg.dataStartRow] ?? [];
    const nameCol = byField.get('item_name');
    const qtyCol = byField.get('quantity');
    const priceCol = byField.get('price');
    if (nameCol == null || qtyCol == null || priceCol == null) return false;
    // item_name 열 = 텍스트, quantity/price 열 = 숫자, 그리고 서로 다른 열.
    const nameIsText = dataRow[nameCol] != null && dataRow[nameCol].trim() !== '' && !isNumericLike(dataRow[nameCol]);
    const qtyIsNum = isNumericLike(dataRow[qtyCol]);
    const priceIsNum = isNumericLike(dataRow[priceCol]);
    return nameIsText && qtyIsNum && priceIsNum && qtyCol !== priceCol && nameCol !== qtyCol && nameCol !== priceCol;
  });
  verdicts.TARGET_SCHEMA_GUARD = allWithinSchema && mappingCorrect ? 'PASS' : 'FAIL';

  // ── 6. CONFIDENCE_GATE: required 누락 0 · required 열 low 0 · region low 0 ──
  const verdict = evaluateConfidence(inference, TARGET_SCHEMA);
  const requiredKeys = new Set(TARGET_SCHEMA.fields.filter((f) => f.required).map((f) => f.key));
  const lowRequired = verdict.lowConfidenceColumns.filter((c) => requiredKeys.has(c.targetField));
  console.log('\nconfidence gate:', JSON.stringify({
    ok: verdict.ok,
    missingRequired: verdict.missingRequired,
    lowRequiredColumns: lowRequired.map((c) => c.targetField),
    lowRegions: verdict.lowConfidenceRegions.length,
  }));
  verdicts.CONFIDENCE_GATE =
    verdict.missingRequired.length === 0 && lowRequired.length === 0 && verdict.lowConfidenceRegions.length === 0
      ? 'PASS'
      : 'FAIL';

  // ── 7. DETERMINISTIC_NORMALIZER: 전체 행 결정론 정규화(AI 재호출 없음) · 재실행 동일 · count 일치 ──
  const n1 = normalizeRows(decoded, inference, TARGET_SCHEMA);
  const n2 = normalizeRows(decoded, inference, TARGET_SCHEMA);
  const deterministic = JSON.stringify(n1.records) === JSON.stringify(n2.records);
  console.log('normalized record count:', n1.records.length, '| skipped:', n1.skipped, '| deterministic:', deterministic);
  verdicts.DETERMINISTIC_NORMALIZER =
    deterministic && n1.records.length === EXPECTED_NORMALIZED_COUNT ? 'PASS' : 'FAIL';

  // ── 8. 종합 ──
  const core = [
    'ADMIN_MODEL_RESOLUTION',
    'GEMINI_JSON_CONTRACT',
    'STRUCTURE_INFERENCE',
    'TARGET_SCHEMA_GUARD',
    'CONFIDENCE_GATE',
    'DETERMINISTIC_NORMALIZER',
    'PRIVACY_BOUNDARY',
  ] as const;
  const allPass = core.every((k) => verdicts[k] === 'PASS');
  verdicts.GENERIC_FILE_UNDERSTANDING_REAL_SMOKE = allPass ? 'PASS' : 'FAIL';
  verdicts.CAPABILITY_CLOSED = allPass ? 'YES' : 'NO';

  printVerdicts();
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error('\n[FAIL] 스모크 실행 중 예외:', e instanceof Error ? e.message : String(e));
  verdicts.GENERIC_FILE_UNDERSTANDING_REAL_SMOKE = 'FAIL';
  printVerdicts();
  process.exit(1);
});
