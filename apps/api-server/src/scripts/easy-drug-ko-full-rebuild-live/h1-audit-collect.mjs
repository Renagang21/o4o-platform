/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1 / 전수 h1 감사 — 1단계 수집 (read-only, DB write 0)
 *
 * 신규 KO canonical 19,363건의 공개 랜딩 대상 전량을 모은다.
 *   masterId · publicKey · 기대 제품명 · 랜딩 상태 · 제품명 위험 프로파일
 *
 * 제품명 위험 프로파일은 이번 결함(제목 h1 가로 넘침)의 원인 축을 그대로 따른다:
 *   공백 없는 최장 토큰 / 수출명 포함 / 영문·숫자 연속열 / 한글·영문 혼합 / `&`·`/`·`-` 밀도
 *
 * 산출: results/h1-population.jsonl (본문 없음 — 추적)
 * 사용: PGPASSWORD=... PGUSER=o4o_api node h1-audit-collect.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

/** 제목 줄바꿈이 실패하는 조건을 문자열 자체에서 뽑는다. 판정이 아니라 계층화 재료다. */
export function nameRisk(name) {
  const n = name || '';
  const tokens = n.split(/\s+/).filter(Boolean);
  const longestToken = tokens.reduce((m, t) => (t.length > m.length ? t : m), '');
  return {
    len: n.length,
    spaceCount: tokens.length - 1,
    longestToken: longestToken.length,
    hasExportName: /수출명|수출용/.test(n),
    latinRun: (n.match(/[A-Za-z0-9]{8,}/g) || []).reduce((m, s) => Math.max(m, s.length), 0),
    mixedScript: /[가-힣]/.test(n) && /[A-Za-z]/.test(n),
    symbolCount: (n.match(/[&/\-·,.()%]/g) || []).length,
    hasFullWidth: /[０-９Ａ-Ｚａ-ｚ％（）]/.test(n),
  };
}

async function main() {
  // 모집단은 **실제 LIVE 적용된 19,363** 이다. plan 에는 HOLD_NO_REPLACEMENT 144 가 섞여 있어
  // 그대로 쓰면 KO 가 없는 HOLD 건이 "결함"처럼 보인다.
  const applied = readJsonl(path.join(RESULTS, 'apply-result-live.jsonl')).filter((r) => r.status === 'APPLIED');
  const ids = [...new Set(applied.map((r) => r.masterId))];

  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT, database: 'o4o_platform',
    user: process.env.PGUSER, password: process.env.PGPASSWORD, max: 4,
  });
  const client = await pool.connect();
  await client.query('SET default_transaction_read_only = on');

  // 랜딩 + 제품명 + 실제 활성 KO canonical 여부를 한 번에 확인한다.
  const { rows } = await client.query(`
    SELECT pm.id::text                              AS master_id,
           pm.name                                  AS product_name,
           pl.public_key                            AS public_key,
           pl.status                                AS landing_status,
           pl.exposure_state                        AS exposure_state,
           (SELECT count(*) FROM shared_product_descriptions d
             WHERE d.master_id = pm.id AND d.description_type = 'STORE'
               AND d.status = 'canonical' AND d.deleted_at IS NULL
               AND COALESCE(d.language, 'ko') = 'ko')::int AS ko_canonical,
           (SELECT count(*) FROM shared_product_descriptions d
             WHERE d.master_id = pm.id AND d.description_type = 'STORE'
               AND d.status = 'canonical' AND d.deleted_at IS NULL
               AND COALESCE(d.language, 'ko') <> 'ko')::int AS non_ko_canonical
      FROM product_masters pm
      LEFT JOIN product_landings pl
        ON pl.product_master_id = pm.id AND pl.deleted_at IS NULL
     WHERE pm.id = ANY($1::uuid[])`, [ids]);
  client.release();
  await pool.end();

  const out = rows.map((r) => ({
    masterId: r.master_id,
    publicKey: r.public_key,
    productName: r.product_name,
    landingStatus: r.landing_status,
    exposureState: r.exposure_state,
    koCanonical: r.ko_canonical,
    nonKoCanonical: r.non_ko_canonical,
    risk: nameRisk(r.product_name),
  }));
  out.sort((a, b) => a.masterId.localeCompare(b.masterId));
  fs.writeFileSync(path.join(RESULTS, 'h1-population.jsonl'), out.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
    step: 'h1-audit-collect',
    appliedMasters: ids.length,
    resolved: out.length,
    missingPublicKey: out.filter((r) => !r.publicKey).length,
    landingNotActive: out.filter((r) => r.landingStatus !== 'active' || r.exposureState !== 'ok').length,
    koCanonicalMissing: out.filter((r) => r.koCanonical !== 1).length,
    nonKoCanonicalExposed: out.filter((r) => r.nonKoCanonical > 0).length,
    nameLength: {
      max: Math.max(...out.map((r) => r.risk.len)),
      p99: out.map((r) => r.risk.len).sort((a, b) => a - b)[Math.floor(out.length * 0.99)],
      median: out.map((r) => r.risk.len).sort((a, b) => a - b)[Math.floor(out.length * 0.5)],
    },
    longestTokenMax: Math.max(...out.map((r) => r.risk.longestToken)),
    noSpaceNames: out.filter((r) => r.risk.spaceCount === 0).length,
    exportNames: out.filter((r) => r.risk.hasExportName).length,
    mixedScript: out.filter((r) => r.risk.mixedScript).length,
    latinRun12plus: out.filter((r) => r.risk.latinRun >= 12).length,
    dbWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, 'h1-population-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
