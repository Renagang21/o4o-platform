/**
 * WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1  §14 최종 HOLD 큐 v3
 *
 * v2 4,544 중 이번 WO 에서 해결된 행(재현 불가 + 안전 적용)을 제외하고, **해결 불가능한 것만** 남긴다.
 * holdReason 은 §14 정규화 enum 으로만 기록한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

/** 공식 원문 대괄호 손상 판정 — build 스크립트와 동일 계약(모듈이 실행형이라 인라인 유지). */
function sourceDamage(src) {
  const s = String(src ?? '');
  let depth = 0;
  for (const ch of s) {
    if (ch === '[') { if (depth > 0) return 'NESTED_OPEN_BRACKET'; depth++; }
    else if (ch === ']') { if (depth === 0) return 'CLOSE_WITHOUT_OPEN'; depth--; }
  }
  return depth !== 0 ? 'UNCLOSED_LABEL_BRACKET' : null;
}

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const cls = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-classification-v1.json`, 'utf8'));
const v2 = new Map(readJsonl(`${D}/hff-final-review-queue-v2.jsonl`).map((r) => [r.canonicalId, r]));
const applied = new Map(JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, 'utf8')).targetsIndex.map((t) => [t.canonicalId, t]));
const rejected = new Map(JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, 'utf8')).rejectedSamples.map((x) => [x.canonicalId, x]));
void rejected;

const HOLD_ENUM = new Set(['SOURCE_REPAIR_REQUIRED', 'AMBIGUOUS_FUNCTION_BOUNDARY', 'AMBIGUOUS_INGREDIENT_OWNERSHIP',
  'UNSUPPORTED_RENDERER_STRUCTURE', 'NO_OFFICIAL_EN_GROUNDING', 'PARTIAL_EN_GROUNDING', 'CANONICAL_STRUCTURE_UNSAFE']);

const OWNERSHIP = /INGREDIENT|LABEL|ATTRIBUTION|FLAT_LIST/;
const STRUCTURE = /NO_FUNCTIONAL_SECTION|MULTIPLE_FUNCTIONAL_SECTIONS|UNBALANCED|NO_LIST/;

/** 손상 판정은 **DB 실측 전문**으로만 한다 — 분류 산출물의 evidence 는 400자로 잘려 있어 오탐이 난다. */
function normalizeHold(item, fullFn) {
  if (item.language === 'en') {
    return /PARTIAL/.test(item.statusReason ?? '') ? 'PARTIAL_EN_GROUNDING' : 'NO_OFFICIAL_EN_GROUNDING';
  }
  if (!fullFn) return 'SOURCE_REPAIR_REQUIRED';
  const damage = sourceDamage(fullFn);
  if (damage) return 'SOURCE_REPAIR_REQUIRED';
  const r = item.statusReason ?? '';
  /* 기능성 섹션 부재·중복은 renderer family 문제가 아니라 canonical 구조 문제다 — 먼저 판정한다 */
  if (STRUCTURE.test(r)) return 'CANONICAL_STRUCTURE_UNSAFE';
  if (item.status === 'HOLD_RENDERER') return 'UNSUPPORTED_RENDERER_STRUCTURE';
  if (OWNERSHIP.test(r)) return 'AMBIGUOUS_INGREDIENT_OWNERSHIP';
  return 'AMBIGUOUS_FUNCTION_BOUNDARY';
}

const NEXT_ACTION = {
  SOURCE_REPAIR_REQUIRED: '공식 원문(MAIN_FNCTN) 대괄호 손상 복구 후 재판정 — 원문 보정 없이는 원료 라벨이 추정이 된다',
  AMBIGUOUS_FUNCTION_BOUNDARY: '공식 원문의 기능성 절 경계를 사람이 확정 — 결합 세그먼트를 임의 분할하면 원문에 없는 문장이 생긴다',
  AMBIGUOUS_INGREDIENT_OWNERSHIP: '무라벨 다원료 목록의 원료 귀속을 사람이 확정 — 귀속 표기 없이 삽입하면 원료 간 혼입이 된다',
  UNSUPPORTED_RENDERER_STRUCTURE: '현행 삽입 전용 patch 계약으로 표현 불가한 renderer 구조 — 구조 어댑터 설계 후 재판정',
  CANONICAL_STRUCTURE_UNSAFE: 'canonical 기능성 섹션 자체가 부재/중복 — 재생성 여부를 정책으로 판정',
  NO_OFFICIAL_EN_GROUNDING: '공식 EN 원문 확보 후 재판정 — 확보 전 EN 기능성 생성 금지(KO 기계 번역 금지)',
  PARTIAL_EN_GROUNDING: '일부 원료만 영문 표기 — 전 원료 커버 EN 원문 확보 후 재판정(부분 게시는 기능성 축소 표기)',
};

const hold = cls.items.filter((x) => x.status !== 'ALREADY_RESOLVED' && !applied.has(x.canonicalId));

/* DB 실측으로 행 존재·연결 확인 */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const live = new Map();
const ids = hold.map((x) => x.canonicalId);
for (let i = 0; i < ids.length; i += 500) {
  for (const r of (await c.query(`
    SELECT spd.id, spd.master_id, spd.language, spd.content, pc.id candidate_id,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
      FROM shared_product_descriptions spd
      LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
        AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
     WHERE spd.id = ANY($1) AND spd.deleted_at IS NULL`, [ids.slice(i, i + 500)])).rows) live.set(r.id, r);
}
await c.end();

const rows = [], missing = [];
for (const it of hold) {
  const l = live.get(it.canonicalId);
  if (!l) { missing.push(it.canonicalId); continue; }
  const holdReason = normalizeHold(it, l.fn);
  if (!HOLD_ENUM.has(holdReason)) throw new Error(`HOLD_REASON_NOT_NORMALIZED ${holdReason}`);
  const src = v2.get(it.canonicalId);
  rows.push({
    canonicalId: it.canonicalId,
    productMasterId: l.master_id,
    candidateId: l.candidate_id ?? null,
    statementNo: l.stmt ?? it.statementNo ?? null,
    language: it.language,
    rendererFamily: it.rendererFamily,
    finalStatus: it.status,
    holdReason,
    officialSourceEvidence: l.fn ? [String(l.fn).replace(/\s+/g, ' ').slice(0, 1500)] : [],
    currentProblem: it.statusReason,
    requiredNextAction: NEXT_ACTION[holdReason],
    previousQueueSources: src?.sources ?? [],
    alsoModifiedInThisWo: applied.has(it.canonicalId),
    canonicalContentHash: sha(l.content),
  });
}

const tally = (f) => rows.reduce((m, r) => { m[f(r)] = (m[f(r)] ?? 0) + 1; return m; }, {});
fs.writeFileSync(`${D}/hff-final-review-queue-v3.jsonl`, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const summary = {
  builtAt: new Date().toISOString(), wo: 'WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1',
  previousQueue: { file: 'hff-final-review-queue-v2.jsonl', rows: v2.size },
  resolvedThisWo: { notReproducible: cls.statusTally.ALREADY_RESOLVED, safeApplied: applied.size,
    total: cls.statusTally.ALREADY_RESOLVED + applied.size },
  rows: rows.length, uniqueCanonicalId: new Set(rows.map((r) => r.canonicalId)).size,
  missingInDb: missing.length,
  byLanguage: tally((r) => r.language), byHoldReason: tally((r) => r.holdReason),
  byFinalStatus: tally((r) => r.finalStatus), byRendererFamily: tally((r) => r.rendererFamily),
  reconciliation: { v2: v2.size, resolved: cls.statusTally.ALREADY_RESOLVED + applied.size, v3: rows.length,
    balanced: v2.size === cls.statusTally.ALREADY_RESOLVED + applied.size + rows.length + missing.length },
};
fs.writeFileSync(`${D}/hff-final-review-queue-v3-summary.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 2));
