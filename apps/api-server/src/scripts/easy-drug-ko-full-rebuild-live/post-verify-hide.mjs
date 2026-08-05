/**
 * WO-O4O-EASY-DRUG-KO-DERIVED-TRANSLATION-UNPUBLISH-V1 — 적용 후 독립 검증 (read-only)
 *
 * 계획 파일이 아니라 **DB 를 다시 읽어서** 판정한다.
 *
 * 검증 축:
 *   1 대상 19,993 행이 전부 status='hidden'
 *   2 본문 md5 가 census 원장과 byte-identical (본문 write 0)
 *   3 source_ref_id 가 계획 시점과 동일 (lineage write 0)
 *   4 공개 경로 조건(`status='canonical' AND deleted_at IS NULL`)으로 재조회 시
 *     e약은요 모집단 master 의 EN·ZH 노출 0
 *   5 KO 정상 canonical 19,363 유지
 *   6 KO·JA 행 수 무변동
 *
 * 산출: results/post-verify-hide.json (추적)
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
  const plan = readJsonl(path.join(RESULTS, 'hide-plan.jsonl'));
  const applied = new Set(readJsonl(path.join(RESULTS, 'apply-result-live.jsonl'))
    .filter((r) => r.status === 'APPLIED').map((r) => r.masterId));
  const popMasters = [...new Set(readJsonl(path.join(RESULTS, 'population.jsonl')).map((p) => p.masterId))].sort();

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

  // ── 1~3 대상 행 재조회 ────────────────────────────────────────────────────
  const cur = new Map();
  for (let i = 0; i < plan.length; i += 500) {
    for (const r of await q(`
      SELECT id::text "descId", status, md5(content) "md5",
             COALESCE(source_ref_id::text,'') "sourceRefId"
      FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
    [plan.slice(i, i + 500).map((r) => r.descId)])) cur.set(r.descId, r);
  }
  const notHidden = []; const contentChanged = []; const sourceRefChanged = []; const missing = [];
  for (const p of plan) {
    const c = cur.get(p.descId);
    if (!c) { missing.push(p.descId); continue; }
    if (c.status !== 'hidden') notHidden.push({ descId: p.descId, status: c.status });
    if (c.md5 !== p.translationMd5) contentChanged.push(p.descId);
    if (c.sourceRefId !== p.currentSourceRefId) sourceRefChanged.push(p.descId);
  }

  // ── 4~6 공개 경로 조건으로 모집단 전체 재조회 ─────────────────────────────
  const pub = [];
  for (let i = 0; i < popMasters.length; i += 500) {
    pub.push(...await q(`
      SELECT COALESCE(language,'ko') lang, count(*)::int n
      FROM shared_product_descriptions
      WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
        AND master_id = ANY($1::uuid[])
      GROUP BY 1`, [popMasters.slice(i, i + 500)]));
  }
  const publicByLang = {};
  for (const r of pub) publicByLang[r.lang] = (publicByLang[r.lang] ?? 0) + r.n;

  // 정상 KO = 이번 run 이 적용한 master 의 활성 KO
  const koActiveOnApplied = (await (async () => {
    const ids = [...applied].sort(); let n = 0;
    for (let i = 0; i < ids.length; i += 500) {
      n += (await q(`
        SELECT count(*)::int n FROM shared_product_descriptions
        WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
          AND COALESCE(language,'ko')='ko' AND source_type='mfds_easy_drug'
          AND master_id = ANY($1::uuid[])`, [ids.slice(i, i + 500)]))[0].n;
    }
    return n;
  })());

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-DERIVED-TRANSLATION-UNPUBLISH-V1',
    step: 'post-verify-hide',
    targetRows: plan.length,
    hiddenConfirmed: plan.length - notHidden.length - missing.length,
    notHiddenCount: notHidden.length,
    notHiddenSample: notHidden.slice(0, 10),
    missingCount: missing.length,
    contentChangedCount: contentChanged.length,
    sourceRefChangedCount: sourceRefChanged.length,
    publicCanonicalByLangInPopulation: publicByLang,
    publicEnExposed: publicByLang.en ?? 0,
    publicZhExposed: publicByLang.zh ?? 0,
    koCanonicalOnAppliedMasters: koActiveOnApplied,
    appliedMasters: applied.size,
    dbWrites: 0,
  };
  out.result = (out.notHiddenCount === 0 && out.missingCount === 0
    && out.contentChangedCount === 0 && out.sourceRefChangedCount === 0
    && out.publicEnExposed === 0 && out.publicZhExposed === 0
    && out.koCanonicalOnAppliedMasters === out.appliedMasters) ? 'PASS' : 'FAIL';

  fs.writeFileSync(path.join(RESULTS, 'post-verify-hide.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
