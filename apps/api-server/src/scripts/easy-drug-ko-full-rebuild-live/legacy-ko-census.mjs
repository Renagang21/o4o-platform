/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 14 기존 오류본 최종 정리 전수 조사
 *
 * read-only. 삭제하지 않는다. 무엇이 남아 있고 무엇이 안전한지 분류만 한다(WO §14).
 *
 * 조사 대상 (e약은요 연결 master 범위):
 *   활성 오류 KO / 비canonical 오류 KO / 중복 KO / 잘못된 source lineage /
 *   참조되지 않는 임시 설명서 / 기존 오류 KO 에서 파생된 활성 번역
 *
 * 분류: ARCHIVE_KEEP_FOR_AUDIT / SAFE_TO_DELETE / REFERENCE_EXISTS /
 *       TRANSLATION_DEPENDENCY / MANUAL_REVIEW
 *
 * 산출: results/legacy-ko-census.json (추적)
 * 사용: PGPASSWORD=... node legacy-ko-census.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

async function main() {
  const pop = new Map(readJsonl(path.join(RESULTS, 'population.jsonl')).map((p) => [p.masterId, p]));
  const demoted = new Set(readJsonl(path.join(RESULTS, 'plan-run2.jsonl'))
    .filter((r) => r.action === 'REPLACE_EXISTING_KO' && r.beforeDescId).map((r) => r.beforeDescId));

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

  const ids = [...pop.keys()].sort();
  const all = [];
  for (let i = 0; i < ids.length; i += 500) {
    all.push(...await q(`
      SELECT master_id::text "masterId", id::text "descId", COALESCE(language,'ko') lang,
             status, source_type "sourceType", COALESCE(source_ref_id::text,'') "sourceRefId"
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE' AND master_id = ANY($1::uuid[])`,
    [ids.slice(i, i + 500)]));
  }

  const ko = all.filter((r) => r.lang === 'ko');
  const activeKo = ko.filter((r) => r.status === 'canonical');
  const byMasterActive = new Map();
  for (const r of activeKo) byMasterActive.set(r.masterId, (byMasterActive.get(r.masterId) ?? 0) + 1);

  // 사본 참조: kpa_store_contents 에는 FK 컬럼이 없고 lineage 가 source_metadata JSON 에 들어있다
  // (`copiedFrom='o4o_b2c_product_description'`, `sourceRefId=<spd.id>`). 사본은 원본 status 를
  // 재확인하지 않으므로, 참조가 있으면 물리 삭제 후보에서 뺀다.
  const referenced = new Set((await q(`
    SELECT DISTINCT source_metadata->>'sourceRefId' id FROM kpa_store_contents
    WHERE source_metadata->>'sourceRefId' IS NOT NULL`)).map((r) => r.id));

  const translationDeps = new Set(all.filter((r) => r.lang !== 'ko' && r.status === 'canonical').map((r) => r.masterId));

  const classify = (r) => {
    if (r.lang !== 'ko') return null;
    if (r.status === 'canonical') {
      const p = pop.get(r.masterId);
      if (p.state === 'PRODUCTION_READY') return 'ACTIVE_CURRENT_KO';       // 이번에 만든 정상본
      return 'MANUAL_REVIEW';                                               // HOLD 인데 활성 KO 가 남아있다
    }
    if (referenced.has(r.descId)) return 'REFERENCE_EXISTS';
    if (demoted.has(r.descId)) return 'ARCHIVE_KEEP_FOR_AUDIT';             // 이번 run 이 강등한 옛 정본
    if (translationDeps.has(r.masterId)) return 'TRANSLATION_DEPENDENCY';
    if (r.status === 'deprecated' || r.status === 'hidden') return 'SAFE_TO_DELETE';
    return 'MANUAL_REVIEW';
  };

  const classes = {}; const samples = {};
  for (const r of ko) {
    const c = classify(r);
    classes[c] = (classes[c] ?? 0) + 1;
    if (!samples[c]) samples[c] = { masterId: r.masterId, descId: r.descId, status: r.status, sourceType: r.sourceType };
  }

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '14-legacy-census',
    scopedMasters: ids.length,
    koRowsAlive: ko.length,
    activeKoRows: activeKo.length,
    mastersWithDuplicateActiveKo: [...byMasterActive.values()].filter((n) => n > 1).length,
    mastersWithoutActiveKo: ids.length - byMasterActive.size,
    activeKoOnHoldMasters: activeKo.filter((r) => pop.get(r.masterId).state !== 'PRODUCTION_READY').length,
    classes, samples,
    referencedByStoreCopies: ko.filter((r) => referenced.has(r.descId)).length,
    physicalDeletePerformed: false,
    dbWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, 'legacy-ko-census.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
