/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §17
 *
 * 독립 검증 (read-only). apply 스크립트 보고를 신뢰하지 않고 현재 DB 만으로 재측정한다.
 * 기준선: 직전 WO 독립검증(hff-wo-independent-verification-v1.json) 의 확정 수치.
 *
 * 산출: data/hff-ko-nontranslation-independent-verification-v1.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-nontranslation-independent-verification-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

const rbRows = JSON.parse(fs.readFileSync(`${D}/hff-ko-nontranslation-rollback-v1.json`, 'utf8')).rows;
const targets = JSON.parse(fs.readFileSync(`${D}/hff-ko-nontranslation-safe-targets-v1.json`, 'utf8')).targets;
const a9 = JSON.parse(fs.readFileSync(`${D}/hff-agent9-hold-reconciliation-v1.json`, 'utf8')).rows;
const queue = fs.readFileSync(`${D}/hff-ko-nontranslation-final-hold-v1.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const prior = JSON.parse(fs.readFileSync(`${D}/hff-wo-independent-verification-v1.json`, 'utf8')).countChecks;

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const one = async (sql, p) => (await c.query(sql, p)).rows[0];

/* 1) row 수 — 이번 WO 는 INSERT 0 이므로 전부 불변이어야 한다 */
const counts = await one(`
  SELECT (SELECT count(*) FROM shared_product_descriptions) spd_all,
         (SELECT count(*) FROM shared_product_descriptions
           WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
             AND deleted_at IS NULL AND coalesce(language,'ko')='ko') ko_total,
         (SELECT count(*) FROM shared_product_descriptions
           WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
             AND deleted_at IS NULL AND language='en') en_total,
         (SELECT count(*) FROM shared_product_descriptions
           WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
             AND deleted_at IS NULL) hff_total`);
/* 기준선(직전 WO 독립검증 05:42Z) 이후 새로 생긴 spd 행의 출처 — 이번 WO 밖(타 세션) 유입을 분리한다 */
const newRowsBySource = (await c.query(`
  SELECT source_type, count(*) n FROM shared_product_descriptions
   WHERE created_at >= $1 GROUP BY 1 ORDER BY 2 DESC`, ['2026-07-31T05:42:26.926Z'])).rows;
const koNoEnPair = Number((await one(`
  SELECT count(*) n FROM shared_product_descriptions k
   WHERE k.source_type='o4o_hff_generated' AND k.description_type='STORE' AND k.status='canonical'
     AND k.deleted_at IS NULL AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions e
                      WHERE e.master_id = k.master_id AND e.language='en'
                        AND e.source_type='o4o_hff_generated' AND e.description_type='STORE'
                        AND e.status='canonical' AND e.deleted_at IS NULL)`)).n);

/* 2) 대상 26건 현재 상태 */
const cur = new Map((await c.query(
  `SELECT id, content, encode(sha256(convert_to(content,'UTF8')),'hex') h, updated_at
     FROM shared_product_descriptions WHERE id = ANY($1)`, [targets.map((t) => t.canonicalId)])).rows.map((r) => [r.id, r]));
const targetCheck = targets.map((t) => {
  const r = cur.get(t.canonicalId);
  return { canonicalId: t.canonicalId, exists: !!r, matchesAfter: r?.h === t.afterHash, stillBefore: r?.h === t.beforeHash, updatedAt: r?.updated_at ?? null };
});

/* 3) 창(window) 내 비대상 drift — KO·EN 모두 포함해 manifest 밖 write 를 잡는다 */
const stamps = targetCheck.map((t) => t.updatedAt).filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
const drift = stamps.length ? (await c.query(`
  SELECT id, coalesce(language,'ko') lang, updated_at FROM shared_product_descriptions
   WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
     AND updated_at >= $1 AND updated_at <= $2 AND NOT (id = ANY($3))`,
  [stamps[0], stamps[stamps.length - 1], targets.map((t) => t.canonicalId)])).rows : [];
const enDrift = drift.filter((r) => r.lang === 'en').length;

/* 4) canonical 유일성 (HFF · master × type × language) */
const dup = Number((await one(`
  SELECT count(*) n FROM (
    SELECT master_id, description_type, coalesce(language,'ko') lang
      FROM shared_product_descriptions
     WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
     GROUP BY 1,2,3 HAVING count(*) > 1) x`)).n);

/* 5) Agent 9 348건 — 여전히 KO canonical 부재여야 한다 (Track B INSERT 0) */
const a9Ids = a9.map((r) => r.candidateId);
const a9Live = [];
for (let i = 0; i < a9Ids.length; i += 200) {
  a9Live.push(...(await c.query(`
    SELECT pc.id, pc.matched_product_master_id mid,
           (SELECT count(*) FROM shared_product_descriptions s
             WHERE s.master_id = pc.matched_product_master_id AND s.source_type='o4o_hff_generated'
               AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
               AND coalesce(s.language,'ko')='ko') ko_cnt,
           coalesce(btrim(pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN', E' \\t\\r\\n'),'') = '' no_fn,
           coalesce(btrim(pc.raw_payload::jsonb->'source'->>'SRV_USE', E' \\t\\r\\n'),'') = '' no_srv
      FROM product_candidates pc WHERE pc.id = ANY($1)`, [a9Ids.slice(i, i + 200)])).rows);
}
const a9Map = new Map(a9Live.map((r) => [r.id, r]));
const a9Recheck = a9.map((r) => { const l = a9Map.get(r.candidateId);
  const expect = r.holdReason;
  /* §11 사유 우선순위를 그대로 재현한다: 원천 충돌 → 기능성 없음 → 섭취방법 없음 → master 미연결 */
  const observed = !l ? 'SOURCE_CONFLICT' : l.no_fn ? 'NO_FUNCTIONAL_DATA' : l.no_srv ? 'NO_INTAKE_DATA' : !l.mid ? 'PRODUCTMASTER_UNCLEAR' : 'NONE';
  return { candidateId: r.candidateId, expect, observed, koCnt: Number(l?.ko_cnt ?? 0),
    masterLinked: !!l?.mid, reasonMatch: observed === expect };
});

/* 6) 최종 큐 DB 정합 */
const qKo = queue.filter((r) => r.source === 'KO_REVIEW_RESIDUAL');
const qKoExists = [];
for (let i = 0; i < qKo.length; i += 200) {
  qKoExists.push(...(await c.query(`
    SELECT id FROM shared_product_descriptions
     WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'
       AND deleted_at IS NULL AND coalesce(language,'ko')='ko' AND id = ANY($1)`,
    [qKo.slice(i, i + 200).map((r) => r.canonicalId)])).rows);
}
await c.end();

/* 7) 비기능성 drift — 삽입 구간 밖은 바이트 동일해야 한다 */
const preLen = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const sufLen = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++; return i; };
const structure = targets.map((t) => {
  const now = cur.get(t.canonicalId)?.content ?? '';
  const rb = rbRows.find((x) => x.canonicalId === t.canonicalId);
  const ops = [...t.ops].sort((a, b) => a.pos - b.pos);
  const cp = preLen(t.beforeContent, now), cs = sufLen(t.beforeContent, now);
  return { canonicalId: t.canonicalId,
    currentEqualsAfter: sha(now) === t.afterHash,
    rollbackRestoresBefore: rb ? sha(rb.restoreContent) === t.beforeHash : false,
    /* 첫 삽입 지점 앞 · 마지막 삽입 지점 뒤가 원본과 동일 */
    prefixIntact: cp >= ops[0].pos,
    suffixIntact: cs >= t.beforeContent.length - ops[ops.length - 1].pos,
    fullyExplainedByInsertion: cp + cs >= t.beforeContent.length,
    growth: now.length - t.beforeContent.length };
});

/* 8) 기능성 절 삭제 0 */
const liKeys = (h) => [...h.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, '')).filter(Boolean);
const clauseKeep = targets.map((t) => {
  const nowKey = (cur.get(t.canonicalId)?.content ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  const before = liKeys(t.beforeContent);
  return { canonicalId: t.canonicalId, beforeClauses: before.length, missing: before.filter((x) => !nowKey.includes(x)).length };
});

const checks = {
  /* 이번 WO 의 신규 KO canonical 은 0 이므로 HFF 전체 row 는 불변이어야 한다.
     spd 전체는 타 세션(비-HFF source_type)이 함께 쓰므로 증분을 출처로 분리해 확인한다. */
  hffCanonicalRowsUnchanged: { expected: prior.ko_total.expected + prior.en_total.expected, actual: Number(counts.hff_total), ok: Number(counts.hff_total) === prior.ko_total.expected + prior.en_total.expected },
  spdAllDeltaFromOtherSources: { expected: 0, actual: newRowsBySource.filter((r) => r.source_type === 'o4o_hff_generated').reduce((s, r) => s + Number(r.n), 0),
    ok: !newRowsBySource.some((r) => r.source_type === 'o4o_hff_generated'),
    spdAllNow: Number(counts.spd_all), spdAllBaseline: prior.spd_all.expected, newRowsBySource },
  hffKoCanonicalUnchanged: { expected: prior.ko_total.expected, actual: Number(counts.ko_total), ok: Number(counts.ko_total) === prior.ko_total.expected },
  hffEnCanonicalUnchanged: { expected: prior.en_total.expected, actual: Number(counts.en_total), ok: Number(counts.en_total) === prior.en_total.expected },
  koWithoutEnPairUnchanged: { expected: prior.ko_total.expected - prior.en_total.expected, actual: koNoEnPair, ok: koNoEnPair === prior.ko_total.expected - prior.en_total.expected },
  existingCanonicalUpdateCount: { expected: targets.length, actual: targetCheck.filter((t) => t.matchesAfter).length, ok: targetCheck.every((t) => t.exists && t.matchesAfter && !t.stillBefore) },
  newKoCanonicalCount: { expected: 0, actual: Number(counts.ko_total) - prior.ko_total.expected, ok: Number(counts.ko_total) === prior.ko_total.expected },
  trackBCanonicalCreated: { expected: 0, actual: a9Recheck.filter((r) => r.koCnt > 0).length, ok: a9Recheck.every((r) => r.koCnt === 0) },
  agent9ReasonMatch: { expected: a9.length, actual: a9Recheck.filter((r) => r.reasonMatch).length, ok: a9Recheck.every((r) => r.reasonMatch) },
  writesOutsideManifestZero: { expected: 0, actual: drift.length, ok: drift.length === 0, rows: drift.slice(0, 20) },
  enCanonicalChangeZero: { expected: 0, actual: enDrift, ok: enDrift === 0 },
  canonicalDuplicatesZero: { expected: 0, actual: dup, ok: dup === 0 },
  nonFunctionalDriftZero: { expected: 0, actual: structure.filter((s) => !(s.currentEqualsAfter && s.rollbackRestoresBefore && s.prefixIntact && s.suffixIntact)).length,
    ok: structure.every((s) => s.currentEqualsAfter && s.rollbackRestoresBefore && s.prefixIntact && s.suffixIntact) },
  functionalClauseDeletionZero: { expected: 0, actual: clauseKeep.reduce((s, x) => s + x.missing, 0), ok: clauseKeep.every((x) => x.missing === 0) },
  finalQueueDuplicateZero: { expected: 0, actual: queue.length - new Set(queue.map((r) => `${r.candidateId}|${r.statementNo}`)).size, ok: queue.length === new Set(queue.map((r) => `${r.candidateId}|${r.statementNo}`)).size },
  finalQueueKoRowsExistInDb: { expected: qKo.length, actual: qKoExists.length, ok: qKoExists.length === qKo.length },
  finalQueueAgent9RowsHaveNoCanonical: { expected: queue.filter((r) => r.source === 'AGENT9_HOLD').length, actual: a9Recheck.filter((r) => r.koCnt === 0).length, ok: a9Recheck.every((r) => r.koCnt === 0) },
};
const verdict = Object.values(checks).every((v) => v.ok) ? 'PASS' : 'FAIL';
const out = { ranAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  readOnly: true, dbWrites: 0, independentOfApplyScript: true, baselineFrom: 'hff-wo-independent-verification-v1.json',
  checks, verdict, detail: { targetCheck, structure, clauseKeep } };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, verdict,
  checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, { expected: v.expected, actual: v.actual, ok: v.ok }])),
  structureSummary: { fullyExplainedByInsertion: structure.filter((s) => s.fullyExplainedByInsertion).length, of: structure.length } }, null, 2));
