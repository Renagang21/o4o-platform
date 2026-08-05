/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 12 LIVE 적용 후 독립검증
 *
 * **파일 산출물을 믿지 않는다.** DB 를 직접 다시 읽어 그 바이트를 검증기에 넣는다.
 * 검증기는 단계 6 과 같은 것(`verifyOne`)이며 생산기를 import 하지 않는다.
 *
 * 확인 (WO §12):
 *   성공 대상 전건 존재 / generated hash 일치 / officialSourceHash 일치(원장 대조) /
 *   활성 KO canonical master 당 1개 / 이전 오류 canonical 활성 0 / HOLD 신규 게시 0 /
 *   16축 위반 0 / EN·ZH·JA 본문 변경 0 / 대상 밖 update 0
 *
 * 산출: results/post-verify-live.json (추적) · results/post-verify-failures.jsonl (추적)
 * 사용: PGPASSWORD=... node post-verify-live.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { verifyOne } from './verify-independent.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

async function main() {
  const pop = new Map(readJsonl(path.join(RESULTS, 'population.jsonl')).map((p) => [p.masterId, p]));
  const ledger = new Map(readJsonl(path.join(RESULTS, 'production-ledger.jsonl')).map((r) => [r.masterId, r]));
  const frozen = new Map(readJsonl(path.join(RESULTS, 'frozen-source.jsonl')).map((r) => [r.itemSeq, r]));
  const applied = readJsonl(path.join(RESULTS, 'apply-result-live.jsonl')).filter((r) => r.status === 'APPLIED');
  const appliedById = new Map(applied.map((r) => [r.masterId, r]));

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 900000, max: 2,
  });
  const q = async (t, p) => {
    const c = await pool.connect();
    try { await c.query('SET default_transaction_read_only = on'); return (await c.query(t, p)).rows; }
    finally { c.release(); }
  };

  // ── 활성 KO canonical 을 master 단위로 재조회 ────────────────────────────
  const ids = [...pop.keys()].sort();
  const live = new Map();
  const dupMasters = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const rows = await q(`
      SELECT master_id::text "masterId", id::text "descId", content, source_type "sourceType",
             COALESCE(source_ref_id::text,'') "sourceRefId"
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE'
        AND COALESCE(language,'ko')='ko' AND status='canonical'
        AND master_id = ANY($1::uuid[])`, [chunk]);
    for (const r of rows) {
      if (live.has(r.masterId)) dupMasters.push(r.masterId);
      else live.set(r.masterId, r);
    }
  }

  const axisCount = {}; const failures = [];
  const missingInDb = []; const hashMismatch = []; const wrongSourceType = [];
  const add = (arr, id) => { if (arr.length < 50) arr.push(id); };

  for (const [masterId, r] of appliedById) {
    const row = live.get(masterId);
    if (!row) { add(missingInDb, masterId); continue; }
    const led = ledger.get(masterId);
    const p = pop.get(masterId);
    const src = frozen.get(p.itemSeq);
    if (sha256(row.content) !== led.generatedContentHash) add(hashMismatch, masterId);
    if (row.sourceType !== 'mfds_easy_drug') add(wrongSourceType, masterId);
    // DB 바이트 자체를 16축에 넣는다 (파일이 아니라).
    const bad = verifyOne(p, { html: row.content, officialSourceHash: led.officialSourceHash }, src, led, false);
    if (Object.keys(bad).length) {
      failures.push({ masterId, itemSeq: p.itemSeq, axes: Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, v.slice(0, 5)])) });
      for (const k of Object.keys(bad)) axisCount[k] = (axisCount[k] ?? 0) + 1;
    }
  }

  // ── HOLD 제품에 **이번 run 이** 새 문서를 게시했는가 ───────────────────────
  // source_type 만 보면 안 된다. 이전 단계(1차 재조립)에서 만들어진 `mfds_easy_drug` 행이
  // 이미 활성인 HOLD master 가 있어서, 그것까지 "이번 신규 게시"로 잡히는 오탐이 난다.
  // 판정 기준은 **모집단 산출 시점의 descId 와 달라졌는가** + 이번 run 결과에 들어있는가 이다.
  const holdMasters = [...pop.values()].filter((p) => p.state !== 'PRODUCTION_READY');
  const holdNewlyPublished = holdMasters.filter((p) => {
    const row = live.get(p.masterId);
    if (!row) return false;
    return appliedById.has(p.masterId) || (p.koDescId ? row.descId !== p.koDescId : true);
  }).map((p) => p.masterId);
  const holdWithPreexistingEasyDrugKo = holdMasters
    .filter((p) => live.get(p.masterId)?.sourceType === 'mfds_easy_drug').length;

  // ── 이전 오류 canonical 이 아직 활성인가 (교체 대상 descId 기준) ───────────
  const beforeIds = readJsonl(path.join(RESULTS, 'plan-run2.jsonl'))
    .filter((r) => r.action === 'REPLACE_EXISTING_KO' && r.beforeDescId).map((r) => r.beforeDescId);
  let staleActive = 0;
  for (let i = 0; i < beforeIds.length; i += 1000) {
    const chunk = beforeIds.slice(i, i + 1000);
    staleActive += (await q(`
      SELECT count(*)::int n FROM shared_product_descriptions
      WHERE id = ANY($1::uuid[]) AND status='canonical' AND deleted_at IS NULL`, [chunk]))[0].n;
  }

  // ── 대상 밖 변화 · 다른 언어 본문 변화 ───────────────────────────────────
  const before = JSON.parse(fs.readFileSync(path.join(RESULTS, 'db-state-before-rollback.json'), 'utf8'));
  const otherLangNow = await q(`
    SELECT COALESCE(language,'ko') lang, count(*)::int n, md5(string_agg(md5(content), '' ORDER BY id)) "contentDigest"
    FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND description_type='STORE' AND COALESCE(language,'ko') <> 'ko'
    GROUP BY 1 ORDER BY 1`);
  const otherLangUnchanged = JSON.stringify(otherLangNow) === JSON.stringify(before.otherLanguage);
  const masterCountsNow = (await q(`
    SELECT (SELECT count(*)::int FROM product_masters) "productMasters",
           (SELECT count(*)::int FROM product_identifiers WHERE deleted_at IS NULL) "productIdentifiers"`))[0];
  const masterCountsUnchanged = JSON.stringify(masterCountsNow) === JSON.stringify(before.masterCounts);

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '12-post-verify-live',
    verifiedFromDb: true,
    appliedTargets: applied.length,
    presentInDb: applied.length - missingInDb.length,
    missingInDb: missingInDb.length,
    generatedHashMismatch: hashMismatch.length,
    sourceTypeMismatch: wrongSourceType.length,
    canonicalDuplicatePerMaster: dupMasters.length,
    staleErrorCanonicalActive: staleActive,
    holdNewlyPublished: holdNewlyPublished.length,
    holdWithPreexistingEasyDrugKo,
    axisViolationMasters: axisCount,
    axisFailedTotal: failures.length,
    otherLanguageUnchanged: otherLangUnchanged,
    otherLanguageNow: otherLangNow,
    masterCountsUnchanged,
    samples: failures.slice(0, 5),
    dbWrites: 0,
    result: (missingInDb.length + hashMismatch.length + wrongSourceType.length + dupMasters.length
      + staleActive + holdNewlyPublished.length + failures.length === 0
      && otherLangUnchanged && masterCountsUnchanged) ? 'PASS' : 'FAIL',
  };
  fs.writeFileSync(path.join(RESULTS, 'post-verify-failures.jsonl'),
    failures.map((r) => JSON.stringify(r)).join('\n') + (failures.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'post-verify-live.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
