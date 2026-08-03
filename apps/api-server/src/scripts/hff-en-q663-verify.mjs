/**
 * WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1  §9-3 / §9-4
 *
 * 독립 검증 (read-only). apply 러너의 산출을 믿지 않고 DB 를 다시 읽어 검증한다.
 *   - KO hash drift 0 (모집단 663 전량)
 *   - EN structure drift 0 (KO 대비 태그 수 패리티)
 *   - EN canonical 중복 0
 *   - 대상 밖 write 0 (삽입 행이 전부 대상 master 이며 created_at 이 apply 시각 이후)
 *   - 전역 카운트 정합 · 번역 슬롯 한국어 0
 *   - 최종 잔여 큐 분류 (중복 0 · 사유 표준화)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { SLOT_RE, norm } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-q663-population-v1.json`, 'utf8'));
const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-en-q663-safe-targets-v1.json`, 'utf8')).targets;
const BLOCKED = JSON.parse(fs.readFileSync(`${D}/hff-en-q663-blocked-v1.json`, 'utf8')).rows;
const APPLIED = JSON.parse(fs.readFileSync(`${D}/hff-en-q663-apply-result-v1.json`, 'utf8'));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const mIds = POP.rows.map((r) => r.productMasterId);
const ko = new Map(), en = new Map(); const enDup = [];
for (let i = 0; i < mIds.length; i += 500) {
  const q = await c.query(`
    SELECT master_id, id, content, created_at, coalesce(language,'ko') lang
      FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND deleted_at IS NULL
       AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`,
  [mIds.slice(i, i + 500)]);
  for (const r of q.rows) {
    const m = r.lang === 'en' ? en : ko;
    if (m.has(r.master_id)) enDup.push({ master: r.master_id, lang: r.lang });
    else m.set(r.master_id, r);
  }
}

const cnt = (h, re) => (h.match(re) ?? []).length;
const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];

const issues = { koHashDrift: 0, enStructureDrift: 0, canonicalDup: enDup.length, enMissing: 0, contentMismatch: 0, hangulSlot: 0 };
const detail = [];

for (const row of POP.rows) {
  const k = ko.get(row.productMasterId);
  if (row.koHash && (!k || sha(k.content) !== row.koHash)) { issues.koHashDrift++; detail.push({ m: row.productMasterId, why: 'KO_HASH_DRIFT' }); }
}
for (const t of TARGETS) {
  const e = en.get(t.productMasterId), k = ko.get(t.productMasterId);
  if (!e) { issues.enMissing++; detail.push({ m: t.productMasterId, why: 'EN_MISSING' }); continue; }
  if (sha(e.content) !== t.newContentHash) { issues.contentMismatch++; detail.push({ m: t.productMasterId, why: 'CONTENT_MISMATCH' }); }
  for (const [re, name] of PARITY) if (cnt(k.content, re) !== cnt(e.content, re)) { issues.enStructureDrift++; detail.push({ m: t.productMasterId, why: `PARITY:${name}` }); }
  for (const { re } of SLOT_RE) for (const m of e.content.matchAll(re)) if (HANGUL.test(norm(m[2]))) { issues.hangulSlot++; detail.push({ m: t.productMasterId, why: 'HANGUL_SLOT' }); }
}

/* 대상 밖 write 검사 — apply 시각 이후 생성된 HFF EN canonical 이 전부 대상 master 인가. */
const since = APPLIED.appliedAt;
const outside = await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE source_type='o4o_hff_generated' AND created_at >= $1::timestamptz - interval '30 minutes'
     AND NOT (master_id = ANY($2))`, [since, TARGETS.map((t) => t.productMasterId)]);
const koTouched = await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
     AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
     AND updated_at >= $1::timestamptz - interval '30 minutes'`, [since]);

const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];
await c.end();

/* ── 663 최종 분류 ────────────────────────────────────────────── */
const HOLD_REASON = {
  HANGUL_REMAINS: 'FINAL_HOLD_TRANSLATION_AMBIGUOUS',
  UNRESOLVED: 'FINAL_HOLD_KO_SOURCE_DAMAGED',
  NUMBER_DRIFT: 'FINAL_HOLD_NUMBER_STRUCTURE_AMBIGUOUS',
  EN_ALREADY_EXISTS: 'RESOLVED_NO_CHANGE',
  KO_MISSING: 'FINAL_HOLD_KO_SOURCE_DAMAGED',
  KO_DRIFT_SINCE_POPULATION: 'FAILED_SYSTEM',
};
const final = new Map();
for (const t of TARGETS) final.set(t.productMasterId, { productMasterId: t.productMasterId, productName: t.productNameKo, issueType: t.issueType, finalState: en.has(t.productMasterId) ? 'RESOLVED_UPDATED' : 'FAILED_SYSTEM', reason: 'EN canonical 신규 생성' });
for (const b of BLOCKED) {
  final.set(b.productMasterId, {
    productMasterId: b.productMasterId, productName: b.productName, issueType: b.issueType,
    finalState: HOLD_REASON[b.finalWhy] ?? 'FAILED_SYSTEM',
    reason: b.finalWhy === 'EN_ALREADY_EXISTS' ? '이미 EN canonical 존재 — 재작업 불필요'
      : b.finalWhy === 'KO_MISSING' ? 'KO canonical 부재 — EN 생성 근거 없음'
        : b.finalWhy === 'HANGUL_REMAINS' ? '번역 슬롯에 한국어 잔존 — 공식 영문 근거 부족'
          : 'KO 원문 손상(잘린 라벨·마커 잔재 등) — 사람 판단 없이 내용 보정 불가',
    blockingPhrases: (b.misses ?? []).map((m) => m.text).slice(0, 5),
    retryCondition: b.finalWhy === 'HANGUL_REMAINS' ? '공식 영문 기능성 문구 또는 승인된 EN 번역 자산이 확보되면 재시도'
      : 'KO 원문(MFDS 원천) 재수집으로 손상 슬롯이 복구되면 재시도',
  });
}
const tally = {};
for (const v of final.values()) tally[v.finalState] = (tally[v.finalState] ?? 0) + 1;

const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0) + outside.rows[0].n + koTouched.rows[0].n;
const out = {
  wo: 'WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1',
  verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  queueTotal: POP.rows.length, finalClassified: final.size, dedupOk: final.size === POP.rows.length,
  issues, outsideScopeWrites: outside.rows[0].n, koRowsTouched: koTouched.rows[0].n,
  globals: g, koUnchangedVsBaseline: g.ko_canon === 40918, enExpected: 40255 + APPLIED.inserted, enActual: g.en_canon,
  tally, verdict: totalIssues === 0 && final.size === POP.rows.length && g.en_canon === 40255 + APPLIED.inserted ? 'PASS' : 'FAIL',
  detail: detail.slice(0, 20),
};
fs.writeFileSync(`${D}/hff-en-q663-verify-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-en-q663-final-hold-queue-v1.json`, JSON.stringify({
  wo: out.wo, generatedAt: out.verifiedAt,
  count: [...final.values()].filter((v) => v.finalState.startsWith('FINAL_HOLD')).length,
  rows: [...final.values()].filter((v) => v.finalState.startsWith('FINAL_HOLD')),
}, null, 1));
console.log(JSON.stringify(out, null, 2));
