/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 단계 5 독립검증
 *
 * **저작기(composeKoV4 / otc-v2-store-leaflet-runner.shared) 를 import 하지 않는다.**
 * 판정기(`prohibition-contract.mjs`) 도 쓰지 않는다. 파손 판정은 전부 **Postgres 정규식**으로
 * 다시 쓴다 — 계획 단계와 같은 코드로 검증하면 같은 버그를 함께 통과시킨다.
 *
 * 검증 항목
 *   V1 활성 KO canonical 전체에서 경구 금지 파손 서명 0 (대상 밖 포함 전수)
 *   V2 계획 REPLACE 는 ko canonical 1건 + 본문 md5 = newMd5
 *   V3 계획 HOLD 는 ko canonical 0건 (비노출)
 *   V4 audit 원장 건수 = 계획 건수, event_type 분포 일치
 *   V5 EN·ZH 본문 무변경 (원장 스냅샷 md5 와 전건 일치)
 *   V6 대상 밖 update 0 (ko canonical / deprecated 총량 델타가 계획과 정확히 일치)
 *
 * 사용:
 *   node verify-independent.mjs --snapshot   # 적용 전
 *   node verify-independent.mjs --verify     # 적용 후
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PLAN = path.join(RESULTS, 'rebuild-plan.json');
const LEDGER = path.join(RESULTS, 'derived-translation-ledger.json');
const SNAP = path.join(RESULTS, 'verify-snapshot.json');
const OUT = path.join(RESULTS, 'verify-independent.json');

/**
 * 파손 서명 — 계획 단계 JS 판정기와 **독립으로** 다시 쓴 것.
 *   (a) 같은 동사가 3자 이내로 반복되는 자기모순  (b) 재표현 잔재 어형
 * 역참조(\1)는 Postgres POSIX 정규식에서 지원된다.
 */
const DAMAGE_RE = '(사용|적용|도포|점안|바르)(하고|하며|하거나)[, ]{0,3}\\1(하)?지 *(마|않|하)|내사용|사용용|사용약|경구사용|사용하지 *하십시오';

const argv = process.argv.slice(2);
const MODE = argv.includes('--verify') ? 'verify' : 'snapshot';
const PORT = parseInt(process.env.PROXY_PORT || '15441', 10);

const q = async (c, sql, params) => (await c.query(sql, params)).rows;

async function globals(c) {
  const [g] = await q(c, `
    SELECT count(*) FILTER (WHERE status='canonical')::int ko_canonical,
           count(*) FILTER (WHERE status='deprecated')::int ko_deprecated,
           count(*) FILTER (WHERE status='canonical' AND content ~ $1)::int ko_damaged
      FROM shared_product_descriptions
     WHERE deleted_at IS NULL AND description_type='STORE' AND COALESCE(language,'ko')='ko'`, [DAMAGE_RE]);
  const [a] = await q(c, `
    SELECT count(*)::int total,
           count(*) FILTER (WHERE metadata->>'wo'=$1)::int this_wo
      FROM shared_product_description_audit_logs`, ['WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1']);
  return { ...g, auditTotal: a.total, auditThisWo: a.this_wo };
}

async function main() {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8')).rows;
  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 1800000, max: 2,
  });
  const c = await pool.connect();
  await c.query('SET default_transaction_read_only = on');

  const g = await globals(c);

  if (MODE === 'snapshot') {
    fs.mkdirSync(RESULTS, { recursive: true });
    fs.writeFileSync(SNAP, JSON.stringify({ takenFor: 'pre-apply', globals: g }, null, 2) + '\n', 'utf8');
    process.stdout.write(JSON.stringify({ mode: 'snapshot', globals: g }, null, 2) + '\n');
    c.release(); await pool.end(); return;
  }

  const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8')).globals;
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).ledger;
  const masterIds = [...new Set(plan.map((r) => r.masterId))];
  const failures = [];
  const fail = (v, msg) => failures.push({ check: v, detail: msg });

  // ── V2/V3 master 별 최종 상태 ──────────────────────────────────────────────
  const live = await q(c, `
    SELECT master_id::text mid,
           count(*) FILTER (WHERE status='canonical')::int n_canon,
           array_remove(array_agg(md5(content)) FILTER (WHERE status='canonical'), NULL) canon_md5
      FROM shared_product_descriptions
     WHERE deleted_at IS NULL AND description_type='STORE' AND COALESCE(language,'ko')='ko'
       AND master_id = ANY($1::uuid[])
     GROUP BY 1`, [masterIds]);
  const byMaster = new Map(live.map((r) => [r.mid, r]));

  let okReplace = 0; let okHold = 0;
  for (const p of plan) {
    const l = byMaster.get(p.masterId) || { n_canon: 0, canon_md5: [] };
    if (p.action === 'REPLACE') {
      if (l.n_canon !== 1) fail('V2', `${p.masterId} ko canonical ${l.n_canon}건`);
      else if (l.canon_md5[0] !== p.newMd5) fail('V2', `${p.masterId} 본문 md5 불일치`);
      else okReplace += 1;
    } else {
      if (l.n_canon !== 0) fail('V3', `${p.masterId} HOLD 인데 ko canonical ${l.n_canon}건 잔존`);
      else okHold += 1;
    }
  }

  // ── V1 전수 파손 0 ────────────────────────────────────────────────────────
  if (g.ko_damaged !== 0) fail('V1', `활성 KO canonical 파손 서명 ${g.ko_damaged}건 잔존`);

  // ── V4 audit 원장 ─────────────────────────────────────────────────────────
  const evt = await q(c, `
    SELECT event_type, count(*)::int n
      FROM shared_product_description_audit_logs
     WHERE metadata->>'wo'=$1 GROUP BY 1`, ['WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1']);
  const evtMap = Object.fromEntries(evt.map((e) => [e.event_type, e.n]));
  const wantReplace = plan.filter((r) => r.action === 'REPLACE').length;
  const wantHold = plan.filter((r) => r.action === 'HOLD').length;
  if ((evtMap.canonical_replaced || 0) !== wantReplace) fail('V4', `canonical_replaced ${evtMap.canonical_replaced || 0} != ${wantReplace}`);
  if ((evtMap.canonical_withdrawn || 0) !== wantHold) fail('V4', `canonical_withdrawn ${evtMap.canonical_withdrawn || 0} != ${wantHold}`);

  // ── V5 EN·ZH 본문 무변경 ──────────────────────────────────────────────────
  const trIds = ledger.map((t) => t.descId);
  const trLive = await q(c, `
    SELECT id::text id, md5(content) m, status FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [trIds]);
  const trMap = new Map(trLive.map((t) => [t.id, t]));
  let trChanged = 0;
  for (const t of ledger) {
    const cur = trMap.get(t.descId);
    if (!cur) { trChanged += 1; fail('V5', `번역 행 소실 ${t.descId}`); continue; }
    if (cur.m !== t.contentMd5) { trChanged += 1; fail('V5', `번역 본문 변경 ${t.descId}`); }
    if (cur.status !== t.status) fail('V5', `번역 상태 변경 ${t.descId} ${t.status}→${cur.status}`);
  }

  // ── V6 대상 밖 update 0 ───────────────────────────────────────────────────
  const dCanon = g.ko_canonical - snap.ko_canonical;
  const dDeprecated = g.ko_deprecated - snap.ko_deprecated;
  if (dCanon !== -wantHold) fail('V6', `ko canonical 델타 ${dCanon} != ${-wantHold}`);
  if (dDeprecated !== wantReplace + wantHold) fail('V6', `ko deprecated 델타 ${dDeprecated} != ${wantReplace + wantHold}`);
  if (g.auditTotal - snap.auditTotal !== wantReplace + wantHold) {
    fail('V6', `audit 총량 델타 ${g.auditTotal - snap.auditTotal} != ${wantReplace + wantHold}`);
  }

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1',
    mode: 'INDEPENDENT VERIFY (저작기·판정기 미import · SQL 정규식 재작성)',
    verdict: failures.length === 0 ? 'PASS' : 'FAIL',
    checks: {
      V1_liveDamagedKoCanonical: g.ko_damaged,
      V2_replaceOk: `${okReplace}/${wantReplace}`,
      V3_holdWithdrawnOk: `${okHold}/${wantHold}`,
      V4_auditEvents: evtMap,
      V5_translationBodiesChanged: trChanged,
      V6_delta: { koCanonical: dCanon, koDeprecated: dDeprecated, audit: g.auditTotal - snap.auditTotal },
    },
    snapshot: snap, current: g,
    failures: failures.slice(0, 40),
    failureCount: failures.length,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  if (failures.length) process.exitCode = 2;

  c.release(); await pool.end();
}
main();
