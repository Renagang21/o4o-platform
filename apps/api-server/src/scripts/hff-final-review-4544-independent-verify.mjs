/**
 * WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1  §15 독립 검증 (read-only)
 *
 * 적용 스크립트의 내부 상태를 신뢰하지 않고 DB 를 다시 측정한다.
 * 검사: row 수 불변 / 대상 new hash 일치 / old hash 잔존 0 / **대상 밖 canonical drift 0**
 *      / 기능성 외 drift 0 / Agent 9 HOLD 348 불변 / EN 짝 없는 KO 25,415 불변
 *      / manifest 밖 write 0 / v3 큐 DB 미존재 0 / v3 canonicalId 중복 0
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { findFunctionalSections, cmpText } from './hff-ko-function-family-preserving-patch.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const idx = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, 'utf8'));
const rb = new Map(JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-rollback-v1.json`, 'utf8')).targets.map((x) => [x.canonicalId, x]));
const cls = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-classification-v1.json`, 'utf8'));
const v2 = readJsonl(`${D}/hff-final-review-queue-v2.jsonl`);
const v3 = readJsonl(`${D}/hff-final-review-queue-v3.jsonl`);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const HFF = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`;
const counts = (await c.query(`SELECT
  (SELECT count(*) FROM shared_product_descriptions) spd_all,
  (SELECT count(*) FROM shared_product_descriptions WHERE ${HFF} AND coalesce(language,'ko')='ko') ko_total,
  (SELECT count(*) FROM shared_product_descriptions WHERE ${HFF} AND language='en') en_total,
  (SELECT count(*) FROM shared_product_descriptions k
     WHERE k.source_type='o4o_hff_generated' AND k.description_type='STORE' AND k.status='canonical'
       AND k.deleted_at IS NULL AND coalesce(k.language,'ko')='ko'
       AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions e WHERE e.master_id=k.master_id
         AND e.source_type='o4o_hff_generated' AND e.description_type='STORE' AND e.status='canonical'
         AND e.deleted_at IS NULL AND e.language='en')) ko_pairless`)).rows[0];

const checks = [];
const add = (name, expected, actual) => checks.push({ name, expected: String(expected), actual: String(actual), pass: String(expected) === String(actual) });

/* 1. 모집단·불변량 */
add('ko_total_unchanged', 40913, counts.ko_total);
add('en_total_unchanged', 15498, counts.en_total);
add('ko_pairless_unchanged', 25415, counts.ko_pairless);

/* 2. 대상 65 — new hash 일치 / old hash 잔존 0 / 기능성 외 drift 0 */
const ids = idx.targetsIndex.map((t) => t.canonicalId);
let newHashMatch = 0, oldHashRemains = 0, nonFnDrift = 0, fnClauseLoss = 0, updatedAtStale = 0;
const drifted = [];
for (let i = 0; i < ids.length; i += 500) {
  const rows = (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [ids.slice(i, i + 500)])).rows;
  for (const r of rows) {
    const t = idx.targetsIndex.find((x) => x.canonicalId === r.id);
    const h = sha(r.content);
    if (h === t.newContentHash) newHashMatch++; else drifted.push({ id: r.id, got: h.slice(0, 12) });
    if (h === t.oldContentHash) oldHashRemains++;
    /* 기능성 외 drift 0 — 삽입분을 제거하면 적용 전 원문과 byte 단위로 같아야 한다 */
    const before = rb.get(r.id).oldContent;
    const at = (() => { let k = 0; while (k < before.length && before[k] === r.content[k]) k++; return k; })();
    const tail = r.content.length - before.length;
    if (r.content.slice(0, at) + r.content.slice(at + tail) !== before) nonFnDrift++;
    /* 공식 기능성 삭제 0 — 적용 전 절이 전부 남아 있어야 한다 */
    const secText = (html) => findFunctionalSections(html).flatMap((s) => s.items.map((x) => cmpText(x)));
    const bSet = new Set(secText(before)), aSet = new Set(secText(r.content));
    for (const x of bSet) if (!aSet.has(x)) fnClauseLoss++;
  }
}
add('target_new_hash_match', ids.length, newHashMatch);
add('target_old_hash_remains', 0, oldHashRemains);
/* updated_at 은 `timestamp without time zone` 이라 클라이언트 Date 파싱이 로컬 오프셋만큼 어긋난다 → 서버측에서 비교한다 */
updatedAtStale = Number((await c.query(
  `SELECT count(*) n FROM shared_product_descriptions WHERE id = ANY($1) AND updated_at < $2`,
  [ids, new Date(Date.parse(idx.builtAt) - 60_000).toISOString()])).rows[0].n);
add('target_updated_at_stale', 0, updatedAtStale);
add('non_function_byte_drift', 0, nonFnDrift);
add('official_clause_loss', 0, fnClauseLoss);

/* 3. 대상 밖 canonical drift 0 — v2 4,544 중 미대상 행의 해시가 분류 시점과 동일한가 */
const outIds = cls.items.filter((x) => !ids.includes(x.canonicalId) && x.contentHash).map((x) => x.canonicalId);
let outChecked = 0, outDrift = 0;
const wantOut = new Map(cls.items.filter((x) => x.contentHash).map((x) => [x.canonicalId, x.contentHash]));
for (let i = 0; i < outIds.length; i += 500) {
  const rows = (await c.query(`SELECT id, encode(sha256(convert_to(content,'UTF8')),'hex') h FROM shared_product_descriptions WHERE id = ANY($1)`, [outIds.slice(i, i + 500)])).rows;
  for (const r of rows) { outChecked++; if (r.h !== wantOut.get(r.id)) outDrift++; }
}
add('non_target_canonical_checked', outIds.length, outChecked);
add('non_target_canonical_drift', 0, outDrift);

/* 4. manifest 밖 write 0 — 이번 WO 실행 구간에 updated_at 이 움직인 HFF canonical 이 대상뿐인가 */
const since = new Date(Date.parse(idx.builtAt) - 60_000).toISOString();
const touched = (await c.query(`SELECT id FROM shared_product_descriptions WHERE ${HFF} AND updated_at >= $1`, [since])).rows.map((r) => r.id);
add('touched_rows_in_window', ids.length, touched.length);
add('touched_outside_manifest', 0, touched.filter((x) => !ids.includes(x)).length);

/* 5. Agent 9 HOLD 348 불변 */
add('agent9_hold_unchanged', 348, readJsonl(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`).length);

/* 6. v3 큐 정합 */
add('v3_unique_canonical', v3.length, new Set(v3.map((r) => r.canonicalId)).size);
add('v3_reconciles_v2', v2.length, cls.statusTally.ALREADY_RESOLVED + ids.length + v3.length);
let v3Missing = 0;
const v3Ids = v3.map((r) => r.canonicalId);
for (let i = 0; i < v3Ids.length; i += 500) {
  const rows = (await c.query(`SELECT id FROM shared_product_descriptions WHERE id = ANY($1) AND deleted_at IS NULL`, [v3Ids.slice(i, i + 500)])).rows;
  v3Missing += v3Ids.slice(i, i + 500).length - rows.length;
}
add('v3_rows_missing_in_db', 0, v3Missing);
add('v3_overlaps_applied_targets', 0, v3Ids.filter((x) => ids.includes(x)).length);
const ENUM = new Set(['SOURCE_REPAIR_REQUIRED', 'AMBIGUOUS_FUNCTION_BOUNDARY', 'AMBIGUOUS_INGREDIENT_OWNERSHIP',
  'UNSUPPORTED_RENDERER_STRUCTURE', 'NO_OFFICIAL_EN_GROUNDING', 'PARTIAL_EN_GROUNDING', 'CANONICAL_STRUCTURE_UNSAFE']);
add('v3_holdreason_normalized', 0, v3.filter((r) => !ENUM.has(r.holdReason)).length);
add('v3_required_fields_missing', 0, v3.filter((r) => !r.canonicalId || !r.productMasterId || !r.language || !r.finalStatus || !r.holdReason || !r.requiredNextAction).length);

/* 7. EN 기계 번역 0 — 이번 WO 의 EN write 자체가 0 */
add('en_targets_in_this_wo', 0, idx.targetsIndex.filter((t) => t.language !== 'ko').length);

await c.end();
const out = { ranAt: new Date().toISOString(), wo: 'WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1',
  independent: true, dbWrites: 0, observedCounts: counts,
  note: 'spd_all 은 타 도메인 write 로 변동하므로 불변식에서 제외하고 관측값으로만 기록한다',
  checks, failures: checks.filter((x) => !x.pass), driftedTargets: drifted.slice(0, 20),
  verdict: checks.every((x) => x.pass) ? 'PASS' : 'FAIL' };
fs.writeFileSync(`${D}/hff-final-review-4544-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
