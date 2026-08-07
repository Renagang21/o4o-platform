/**
 * WO-O4O-HFF-JA-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1  §7 독립검증
 *
 * apply 산출물을 신뢰하지 않고 **DB 현재 상태만** 읽어 재계산한다. read-only.
 *   - Batch 02 상태 합계 = 배치 크기
 *   - KO canonical hash drift 0 / EN·ZH·ProductMaster 변경 0
 *   - JA canonical 증가량 일치 / canonicalDup 0
 *   - 번역 슬롯 한글 0 (h1 제품명 제외) / 간체자 0 / 수치·단위 drift 0
 *   - Batch 밖 write 0 / 문제 큐 누락·중복 0
 */
import fs from 'node:fs';
import pg from 'pg';
import { lostNums, KEEP_PROPER, SIMPLIFIED_ONLY } from './hff-ja-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const RENDER = JSON.parse(fs.readFileSync(`${D}/hff-ja-b02-render-audit-v1.json`, 'utf8'));
const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-ja-b02-safe-targets-v1.json`, 'utf8')).targets;
const APPLIED = JSON.parse(fs.readFileSync(`${D}/hff-ja-b02-apply-result-v1.json`, 'utf8'));
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const QUEUE = fs.existsSync(`${D}/hff-ja-deferred-issue-queue-v1.jsonl`)
  ? fs.readFileSync(`${D}/hff-ja-deferred-issue-queue-v1.jsonl`, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l))
  : [];

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const ids = APPLIED.insertedIds ?? [];
const byMaster = new Map(TARGETS.map((t) => [t.productMasterId, t]));

/* 1. 삽입된 JA 행을 DB 에서 다시 읽는다. */
const rows = (await c.query(`
  SELECT id, master_id, language, status, description_type, source_type, content
    FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids])).rows;

const contract = rows.filter((r) => !(r.language === 'ja' && r.status === 'canonical'
  && r.description_type === 'STORE' && r.source_type === 'o4o_hff_generated')).length;

/* 2. 저장된 본문 == 렌더 검증을 통과한 본문 (byte 동일) · 슬롯 한글 0 · 간체자 0. */
let contentMismatch = 0, hangulDoc = 0, simplifiedDoc = 0, numDrift = 0, notInBatch = 0;
const samples = [];
for (const r of rows) {
  const t = byMaster.get(r.master_id);
  if (!t) { notInBatch++; continue; }
  if (r.content !== t.newContent) { contentMismatch++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'CONTENT_MISMATCH' }); continue; }
  /* `<h1>` 제품명과 제조사 법인명은 원문 표기 유지 계약이다(EN·ZH 트랙 동일).
     제목 안 `<small>` 부제(원료 열거)는 번역 대상이므로 면제하지 않는다. */
  const rest = r.content.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ');
  if (HANGUL.test(rest)) { hangulDoc++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'HANGUL', txt: (rest.match(/[^\s]*[가-힣][^\s]*/) ?? [''])[0].slice(0, 40) }); }
  /* ZH 를 경유하지 않았다는 것을 산출물로 재확인한다 — 일본어 본문에 중국어 간체 전용 자형이 있으면 안 된다(§4). */
  const sm = rest.match(SIMPLIFIED_ONLY);
  if (sm) { simplifiedDoc++; if (samples.length < 10) samples.push({ m: r.master_id, why: 'SIMPLIFIED', txt: sm[0] }); }
}

/* 3. KO canonical hash drift · ProductMaster 불변 · JA 중복. */
const koDrift = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions k
   JOIN unnest($1::uuid[], $2::text[]) AS x(id, h) ON x.id = k.id
   WHERE k.deleted_at IS NULL AND encode(sha256(convert_to(k.content,'UTF8')),'hex') <> x.h`,
[TARGETS.map((t) => t.koCanonicalId), TARGETS.map((t) => t.koHash)])).rows[0].n;

const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
            AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];

const dup = (await c.query(`
  SELECT count(*)::int n FROM (
    SELECT master_id FROM shared_product_descriptions
     WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
       AND language='ja' AND source_type='o4o_hff_generated'
     GROUP BY master_id HAVING count(*) > 1) x`)).rows[0].n;

/* 4. 수치·단위 drift — KO 원문 토큰이 JA 본문에 모두 남아 있는지 문서 단위로 재확인. */
const koMap = new Map((await c.query(`
  SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
[TARGETS.map((t) => t.koCanonicalId)])).rows.map((r) => [r.id, r.content]));
for (const r of rows) {
  const t = byMaster.get(r.master_id); if (!t) continue;
  const ko = koMap.get(t.koCanonicalId); if (!ko) continue;
  /* KO 토큰화기를 일본어 본문에 그대로 쓰면 1日/回/包 같은 일본어 단위를 못 읽어 전부 유실로 잡힌다.
     생산 단계와 동일한 KO↔JA 단위 대응 비교기를 쓴다(§7 수치·단위 drift). */
  const lost = lostNums(ko.replace(/<[^>]+>/g, ' '), r.content.replace(/<[^>]+>/g, ' '));
  if (lost.length) { numDrift++; if (samples.length < 15) samples.push({ m: r.master_id, why: 'NUM_DRIFT', lost: lost.slice(0, 5) }); }
}

/* 5. Batch 밖 write 0 — 이 작업 시각 이후 생성/수정된 HFF STORE 행이 Batch 집합과 일치하는가. */
const outside = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE source_type='o4o_hff_generated' AND description_type='STORE'
     AND updated_at >= $1::timestamptz AND NOT (id = ANY($2::uuid[]))`,
[APPLIED.startedAt ?? APPLIED.appliedAt, ids])).rows[0].n;

const qKeys = QUEUE.map((x) => `${x.productMasterId}|${x.issueType}`);
/* 이번 배치로 생산된 제품이 큐에 남아 있으면 해결된 제품을 문제로 남긴 것이다(§6). */
const IN_BATCH = new Set(TARGETS.map((t) => t.productMasterId));
const ALLOWED_ISSUE = new Set(['KO_SOURCE_DAMAGED', 'NUMBER_STRUCTURE_AMBIGUOUS', 'INGREDIENT_OWNERSHIP_AMBIGUOUS',
  'TRANSLATION_AMBIGUOUS', 'CANONICAL_STRUCTURE_UNSAFE', 'RENDER_FAILURE', 'HASH_DRIFT']);
const expected = RENDER.batchSize;
const out = {
  wo: RENDER.wo, batch: RENDER.batch, verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  expectedBatchSize: expected,
  batchTotal: rows.length + APPLIED.skipped, batchTotalMatches: (rows.length + APPLIED.skipped) === expected,
  insertedRowsFound: rows.length, contractViolations: contract,
  contentMismatch, hangulInSlots: hangulDoc, simplifiedInSlots: simplifiedDoc, numberDrift: numDrift, rowsNotInBatch: notInBatch,
  koHashDrift: koDrift, koUnchanged: g.ko_canon === APPLIED.before.ko_canon,
  enUnchanged: g.en_canon === APPLIED.before.en_canon,
  zhUnchanged: g.zh_canon === APPLIED.before.zh_canon,
  pmUnchanged: g.pm_hff === APPLIED.before.pm_hff,
  jaCanonNow: g.ja_canon, jaDelta: g.ja_canon - APPLIED.before.ja_canon,
  jaDeltaMatchesInserted: (g.ja_canon - APPLIED.before.ja_canon) === rows.length,
  canonicalDup: dup, writesOutsideBatch: outside,
  issueQueue: QUEUE.length, issueQueueDup: qKeys.length - new Set(qKeys).size,
  issueQueueMissingField: QUEUE.filter((x) => !x.batch || !x.productMasterId || !x.issueType || !x.requiredNextAction || !x.retryCondition).length,
  issueQueueBadType: QUEUE.filter((x) => !ALLOWED_ISSUE.has(x.issueType)).length,
  issueQueueProducedLeftBehind: QUEUE.filter((x) => IN_BATCH.has(x.productMasterId)).length,
  samples,
};
out.verdict = (out.batchTotalMatches && !contract && !contentMismatch && !hangulDoc && !simplifiedDoc && !numDrift && !notInBatch
  && !koDrift && out.koUnchanged && out.enUnchanged && out.zhUnchanged && out.pmUnchanged && out.jaDeltaMatchesInserted
  && !dup && !outside && !out.issueQueueDup && !out.issueQueueMissingField && !out.issueQueueBadType
  && !out.issueQueueProducedLeftBehind) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-ja-b02-verify-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
