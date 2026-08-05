/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §8 독립검증
 *
 * apply 산출물을 신뢰하지 않고 **DB 현재 상태만** 읽어 재계산한다. read-only.
 *   - 최종 잔여 상태 합계 10,000
 *   - KO canonical hash drift 0 / ProductMaster 변경 0
 *   - ZH canonical 증가량 일치 / canonicalDup 0
 *   - 번역 슬롯 한글 0 (h1 제품명 제외) / 기능성·수치·단위 drift 0
 *   - Batch 밖 write 0 / 문제 큐 누락·중복 0
 */
import fs from 'node:fs';
import pg from 'pg';
import { lostNums, KEEP_PROPER } from './hff-zh-b01-translate.mjs';
import { build } from './hff-zh-b01-build.mjs';

const D = 'apps/api-server/src/scripts/data';
const RENDER = JSON.parse(fs.readFileSync(`${D}/hff-zh-final-render-audit-v1.json`, 'utf8'));
const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-zh-final-safe-targets-v1.json`, 'utf8')).targets;
const APPLIED = JSON.parse(fs.readFileSync(`${D}/hff-zh-final-apply-result-v1.json`, 'utf8'));
const QUEUE = fs.readFileSync(`${D}/hff-zh-deferred-issue-queue-through-final-v1.jsonl`, 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const ids = APPLIED.insertedIds ?? [];
const byMaster = new Map(TARGETS.map((t) => [t.productMasterId, t]));

/* 1. 삽입된 ZH 행을 DB 에서 다시 읽는다. */
const rows = (await c.query(`
  SELECT id, master_id, language, status, description_type, source_type, content
    FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids])).rows;

const contract = rows.filter((r) => !(r.language === 'zh' && r.status === 'canonical'
  && r.description_type === 'STORE' && r.source_type === 'o4o_hff_generated')).length;

/* 2. 저장된 본문 == 렌더 검증을 통과한 본문 (byte 동일) · 슬롯 한글 0 · 수치 보존. */
let contentMismatch = 0, hangulDoc = 0, numDrift = 0, notInBatch = 0;
const samples = [];
for (const r of rows) {
  const t = byMaster.get(r.master_id);
  if (!t) { notInBatch++; continue; }
  if (r.content !== t.newContent) { contentMismatch++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'CONTENT_MISMATCH' }); continue; }
  /* `<h1>` 제품명과 제조사 법인명은 원문 표기 유지 계약이다(EN 트랙 동일).
     제목 안 `<small>` 부제(원료 열거)는 번역 대상이므로 면제하지 않는다. */
  const rest = r.content.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ');
  if (HANGUL.test(rest)) { hangulDoc++; if (samples.length < 5) samples.push({ m: r.master_id, why: 'HANGUL', txt: (rest.match(/[^\s]*[가-힣][^\s]*/) ?? [''])[0].slice(0, 40) }); }
}

/* 3. KO canonical hash drift · ProductMaster 불변 · ZH 중복. */
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
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];

const dup = (await c.query(`
  SELECT count(*)::int n FROM (
    SELECT master_id FROM shared_product_descriptions
     WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
       AND language='zh' AND source_type='o4o_hff_generated'
     GROUP BY master_id HAVING count(*) > 1) x`)).rows[0].n;

/* 4. 수치·단위 drift — KO 원문 토큰이 ZH 본문에 모두 남아 있는지 문서 단위로 재확인. */
const koMap = new Map((await c.query(`
  SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
[TARGETS.map((t) => t.koCanonicalId)])).rows.map((r) => [r.id, r.content]));
for (const r of rows) {
  const t = byMaster.get(r.master_id); if (!t) continue;
  const ko = koMap.get(t.koCanonicalId); if (!ko) continue;
  /* KO 토큰화기를 중국어 본문에 그대로 쓰면 每日/次/袋 같은 중국어 단위를 못 읽어 전부 유실로 잡힌다.
     생산 단계와 동일한 KO↔ZH 단위 대응 비교기를 쓴다(§7 수치·단위 drift). */
  /* 태그를 공백으로 지우면 블록 경계를 넘어 `350-450` + 다음 항목의 `L-이소로이신` 이 `450L` 로 붙어
     실제로는 없는 단위 토큰이 생긴다. 경계는 단위로 읽히지 않는 구분자로 바꾼다. */
  const flat = (h) => h.replace(/<[^>]+>/g, ' | ');
  const lost = lostNums(flat(ko), flat(r.content));
  if (lost.length) { numDrift++; if (samples.length < 10) samples.push({ m: r.master_id, why: 'NUM_DRIFT', lost: lost.slice(0, 5) }); }
}

/* 5. Batch 밖 write 0 — 이 작업 시각 이후 생성/수정된 HFF STORE 행이 Batch 집합과 일치하는가. */
const outside = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE source_type='o4o_hff_generated' AND description_type='STORE'
     AND updated_at >= $1::timestamptz AND NOT (id = ANY($2::uuid[]))`,
[APPLIED.startedAt ?? APPLIED.appliedAt, ids])).rows[0].n;

/* 6. 정상 생산 가능 잔여 0 (§7) — ZH 가 없는 HFF KO canonical 을 남김없이 다시 build() 로 돌려,
   문제 큐 사유 없이 생산 가능한 문서가 하나도 남지 않았음을 DB 현재 상태에서 재계산한다. */
const residual = (await c.query(`
  SELECT k.master_id, k.content FROM shared_product_descriptions k
   WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
     AND coalesce(k.language,'ko')='ko' AND k.source_type='o4o_hff_generated'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions z
                      WHERE z.deleted_at IS NULL AND z.master_id=k.master_id AND z.description_type='STORE'
                        AND z.status='canonical' AND z.language='zh' AND z.source_type='o4o_hff_generated')`)).rows;
let residualProducible = 0;
const residualSamples = [];
for (const r of residual) {
  if (!r.content || !/<h2|<li/.test(r.content)) continue;   // KO_SOURCE_DAMAGED — 생산 대상이 아니다.
  const b = build(r.content);
  if (!b.misses.length && !b.hangul) { residualProducible++; if (residualSamples.length < 5) residualSamples.push(r.master_id); }
}

const qKeys = QUEUE.map((x) => `${x.productMasterId}|${x.issueType}`);
const out = {
  wo: RENDER.wo, verifiedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  /* 고정 10,000 게이트는 폐기됐다(WO §1) — 모집단은 렌더 감사가 확정한 정상 잔여 전량이다. */
  batchTotal: rows.length + APPLIED.skipped, expectedBatchTotal: TARGETS.length,
  batchTotalMatchesPopulation: (rows.length + APPLIED.skipped) === TARGETS.length,
  insertedRowsFound: rows.length, contractViolations: contract,
  contentMismatch, hangulInSlots: hangulDoc, numberDrift: numDrift, rowsNotInBatch: notInBatch,
  koHashDrift: koDrift, koUnchanged: g.ko_canon === APPLIED.before.ko_canon,
  enUnchanged: g.en_canon === APPLIED.before.en_canon,
  pmUnchanged: g.pm_hff === APPLIED.before.pm_hff,
  zhCanonNow: g.zh_canon, zhDelta: g.zh_canon - APPLIED.before.zh_canon,
  zhDeltaMatchesInserted: (g.zh_canon - APPLIED.before.zh_canon) === rows.length,
  canonicalDup: dup, writesOutsideBatch: outside,
  residualWithoutZh: residual.length, residualProducible, residualSamples,
  issueQueue: QUEUE.length, issueQueueDup: qKeys.length - new Set(qKeys).size,
  issueQueueMissingField: QUEUE.filter((x) => !x.batch || !x.productMasterId || !x.issueType || !x.requiredNextAction || !x.retryCondition).length,
  samples,
};
out.verdict = (out.batchTotalMatchesPopulation && !contract && !contentMismatch && !hangulDoc && !numDrift && !notInBatch
  && !koDrift && out.koUnchanged && out.enUnchanged && out.pmUnchanged && out.zhDeltaMatchesInserted
  && !dup && !outside && !out.issueQueueDup && !out.issueQueueMissingField && !residualProducible) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-zh-final-verify-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
