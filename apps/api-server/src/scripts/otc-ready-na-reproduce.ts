/**
 * WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-327-OROMUCOSAL-14-FINAL-READINESS-V1 — 에이전트 나.
 * READ-ONLY 재현 + PRE_APPLY 사전상태 게이트. DB write 0 (SELECT 전용, 단일 REPEATABLE READ READ ONLY TX).
 *
 * 입력(수정 금지):
 *   - 승인 SSOT: otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json (status=APPROVED_FOR_PRODUCTION)
 *   - unit 원장:  otc-easy-drug-ready-1134-unit-ledger-v1.json (topical-unit-1 · oromucosal-unit-1)
 * fingerprint 정의: 표준 일반명코드(gencode). READY=master당 유일.
 *
 * 게이트(WO 필수):
 *   1) route별 fp/master 수 = SSOT 일치
 *   2) route 간 master/fp 교집합 0
 *   3) fingerprint 분할 0 (한 gencode 가 한 unit 안에만)
 *   4) route = resolveRoute(gencode) 일치 (suffix 분류), 전문용/타경로 혼입 0
 *   5) 공식 원문 결손 0 (효능·용법·주의 3축 존재)
 *   6) fp 내부 안전지문 mismatch 0 (같은 gencode ⇒ officialAxes md5 균일)
 *   7) 기존 authored STORE canonical ko/en = 0
 *   8) sourceRef(mfds_easy_drug canonical ko) 정확히 1 (누락 0 · 충돌 0)
 *   9) canonicalDup 0
 *
 * 산출물: src/scripts/data/otc-ready-na/pre-apply-<route>-unit1.json (route별 분리)
 * 사용: npx tsx src/scripts/otc-ready-na-reproduce.ts [--port 5470] [--route topical|oromucosal|both]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';
import { resolveRoute, officialAxes, fingerprintV2, AUTHORED_SOURCES, normalize } from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_DIR = path.resolve(DATA_DIR, 'otc-ready-na');
const SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json');
const LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD .env 부재');
  return m[1].trim();
};
const port = (): number => parseInt(arg('port', '5470'), 10);

interface UnitLedger { unit: string; route: string; status: string; fpCount: number; masterCount: number; expectedWrite: number; koTuples: number; enTuples: number; fingerprints: string[]; masterIds: string[] }

const UNITS: Record<string, string> = { topical: 'topical-unit-1', oromucosal: 'oromucosal-unit-1' };

async function main(): Promise<void> {
  const routeSel = arg('route', 'both');
  const routes = routeSel === 'both' ? ['topical', 'oromucosal'] : [routeSel];

  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  if (ssot.status !== 'APPROVED_FOR_PRODUCTION') { console.error(`STOP: 승인 SSOT status=${ssot.status} != APPROVED_FOR_PRODUCTION`); process.exit(2); }
  const ledgerAll: UnitLedger[] = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).units;

  const units = routes.map((r) => {
    const u = ledgerAll.find((x) => x.unit === UNITS[r]);
    if (!u) throw new Error(`unit 원장에 ${UNITS[r]} 없음`);
    const sr = ssot.routeApproval.find((x: { route: string }) => x.route === r);
    if (!sr) throw new Error(`SSOT routeApproval 에 ${r} 없음`);
    // 게이트1: SSOT fp/master 수 == 원장
    if (u.fpCount !== sr.fingerprints || u.masterCount !== sr.masters) {
      throw new Error(`STOP: ${r} SSOT(${sr.fingerprints}fp/${sr.masters}m) != ledger(${u.fpCount}fp/${u.masterCount}m)`);
    }
    return { route: r, u };
  });

  // 게이트2: route 간 master/fp 교집합 0
  if (units.length === 2) {
    const [a, b] = units;
    const mi = a.u.masterIds.filter((x) => new Set(b.u.masterIds).has(x));
    const fi = a.u.fingerprints.filter((x) => new Set(b.u.fingerprints).has(x));
    if (mi.length || fi.length) { console.error(`STOP: route 혼합 — master∩=${mi.length} fp∩=${fi.length}`); process.exit(2); }
  }

  const allIds = [...new Set(units.flatMap((x) => x.u.masterIds))];

  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

    // (A) gencode per master — la VERBATIM std 축
    const stdRows: Array<{ mid: string; gencodes: string[] | null }> = await ds.query(`
      SELECT pi.product_master_id::text mid,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
      FROM product_identifiers pi
      JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
      JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
        AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
      GROUP BY 1`, [allIds]);
    const gencodeByMid = new Map<string, string | null>();
    for (const r of stdRows) { const g = (r.gencodes || []).filter(Boolean).sort(); gencodeByMid.set(r.mid, g.length === 1 ? g[0] : null); }

    // (B) master name + official source content (mfds_easy_drug canonical ko, 최장) — la VERBATIM
    const nameRows: Array<{ id: string; name: string; spec: string }> = await ds.query(
      `SELECT id::text id, name, COALESCE(specification,'') spec FROM product_masters WHERE id = ANY($1::uuid[])`, [allIds]);
    const nameByMid = new Map(nameRows.map((r) => [r.id, r.name]));
    const contentRows: Array<{ id: string; content: string; ncanon: number }> = await ds.query(`
      SELECT mid id,
        (SELECT content FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug'
           AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
           ORDER BY length(s.content) DESC LIMIT 1) content,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug'
           AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) ncanon
      FROM unnest($1::uuid[]) mid`, [allIds]);
    const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));
    const easyCanonCount = new Map(contentRows.map((r) => [r.id, Number(r.ncanon)]));

    // (C) 기존 authored STORE canonical ko/en (AUTHORED_SOURCES) per master — 기대 0
    const authRows: Array<{ id: string; ako: number; aen: number }> = await ds.query(`
      SELECT mid id,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
           AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type = ANY($2::text[]) AND s.deleted_at IS NULL) ako,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
           AND s.description_type='STORE' AND s.language='en' AND s.source_type = ANY($2::text[]) AND s.deleted_at IS NULL) aen
      FROM unnest($1::uuid[]) mid`, [allIds, [...AUTHORED_SOURCES]]);
    const authByMid = new Map(authRows.map((r) => [r.id, { ako: Number(r.ako), aen: Number(r.aen) }]));

    // (D) canonicalDup — (master,lang) STORE canonical >1
    const dupRows: Array<{ id: string; kod: number; end: number }> = await ds.query(`
      SELECT mid id,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
           AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) kod,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
           AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) end
      FROM unnest($1::uuid[]) mid`, [allIds]);
    const dupByMid = new Map(dupRows.map((r) => [r.id, { ko: Number(r.kod), en: Number(r.end) }]));

    await ds.query('COMMIT');

    fs.mkdirSync(OUT_DIR, { recursive: true });
    let anyStop = false;
    const summary: Record<string, unknown> = {};

    for (const { route, u } of units) {
      const stop: string[] = [];
      const fpMap = new Map<string, string[]>(); // gencode -> masterIds
      const perMaster: Array<Record<string, unknown>> = [];

      for (const id of u.masterIds) {
        const gc = gencodeByMid.get(id) ?? null;
        const rr = resolveRoute(gc);
        const content = contentByMid.get(id) || '';
        const ax = officialAxes(content);
        const auth = authByMid.get(id) || { ako: 0, aen: 0 };
        const dup = dupByMid.get(id) || { ko: 0, en: 0 };
        const easyN = easyCanonCount.get(id) ?? 0;
        const axMd5 = md5([normalize(ax.ind), normalize(ax.dos), normalize(ax.cau)].join('|'));
        const fp = gc && rr.ok ? fingerprintV2(ax, gc, rr.route) : null;

        // 게이트4: gencode ∈ unit fp 리스트, route 일치
        if (!gc) stop.push(`${id} gencode 부재/모호`);
        else if (!u.fingerprints.includes(gc)) stop.push(`${id} gencode ${gc} ∉ unit fp 리스트`);
        if (!rr.ok) stop.push(`${id} route 차단 ${rr.reason}`);
        else if (rr.route !== route) stop.push(`${id} route ${rr.route} != ${route}`);
        // 게이트5: 공식 원문 3축 결손 0
        if (!content) stop.push(`${id} 공식 원문 부재`);
        else { if (!ax.ind.trim()) stop.push(`${id} 효능 결손`); if (!ax.dos.trim()) stop.push(`${id} 용법 결손`); if (!ax.cau.trim()) stop.push(`${id} 주의 결손`); }
        // 게이트7: 기존 authored canonical 0
        if (auth.ako) stop.push(`${id} 기존 authored ko canonical ${auth.ako}`);
        if (auth.aen) stop.push(`${id} 기존 authored en canonical ${auth.aen}`);
        // 게이트8: sourceRef 정확히 1
        if (easyN === 0) stop.push(`${id} sourceRef 누락(easy ko canonical 0)`);
        if (easyN > 1) stop.push(`${id} sourceRef 충돌(easy ko canonical ${easyN})`);

        if (gc) { if (!fpMap.has(gc)) fpMap.set(gc, []); fpMap.get(gc)!.push(id); }
        perMaster.push({ id, name: nameByMid.get(id), gencode: gc, route: rr.route, form: rr.form, fp, axMd5, easyCanon: easyN, authKo: auth.ako, authEn: auth.aen, dupKo: dup.ko, dupEn: dup.en });
      }

      // 게이트1(재확인): fp/master 수
      if (fpMap.size !== u.fpCount) stop.push(`fp 수 ${fpMap.size} != ${u.fpCount}`);
      if (perMaster.length !== u.masterCount) stop.push(`master 수 ${perMaster.length} != ${u.masterCount}`);
      // 게이트3: fingerprint 분할 0 — 원장 fp 리스트와 실측 gencode 집합 동일
      const seen = new Set(fpMap.keys());
      for (const g of u.fingerprints) if (!seen.has(g)) stop.push(`원장 fp ${g} 실측 부재`);
      for (const g of seen) if (!u.fingerprints.includes(g)) stop.push(`실측 fp ${g} 원장 부재`);
      // 게이트6: fp 내부 안전지문 균일 — 같은 gencode 의 axMd5 유일
      const fpAx: Record<string, { size: number; axMd5Set: number; fp: string }> = {};
      for (const [gc, ids] of fpMap) {
        const set = new Set(ids.map((id) => (perMaster.find((m) => m.id === id)!.axMd5 as string)));
        const fpSet = new Set(ids.map((id) => (perMaster.find((m) => m.id === id)!.fp as string)));
        if (set.size !== 1) stop.push(`fp ${gc} 안전지문 mismatch (axMd5 ${set.size}종)`);
        if (fpSet.size !== 1) stop.push(`fp ${gc} fingerprintV2 불균일 (${fpSet.size}종)`);
        fpAx[gc] = { size: ids.length, axMd5Set: set.size, fp: [...fpSet][0] };
      }
      // 게이트9: canonicalDup 0
      const dupKo = perMaster.filter((m) => (m.dupKo as number) > 1).length;
      const dupEn = perMaster.filter((m) => (m.dupEn as number) > 1).length;
      if (dupKo) stop.push(`canonicalDup ko ${dupKo}`);
      if (dupEn) stop.push(`canonicalDup en ${dupEn}`);

      const expectedWrite = u.masterCount * 6;
      const preApply = {
        wo: 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-327-OROMUCOSAL-14-FINAL-READINESS-V1',
        agent: 'na', artifact: 'pre-apply-reproduce', route, unit: u.unit,
        approvedSsotStatus: ssot.status, baseCommit: ssot.baseCommit,
        proxyPort: port(), readOnly: true, dbWrite: 0,
        counts: { fp: fpMap.size, master: perMaster.length, expectedWriteKo: u.masterCount * 4, expectedWriteEn: u.masterCount * 2, expectedWriteTotal: expectedWrite },
        gates: {
          g1_fpMasterMatchSsot: fpMap.size === u.fpCount && perMaster.length === u.masterCount,
          g3_fingerprintSplit0: [...seen].every((g) => u.fingerprints.includes(g)) && u.fingerprints.every((g) => seen.has(g)),
          g4_routeAllMatch: perMaster.every((m) => m.route === route),
          g5_officialSourceMissing0: perMaster.every((m) => m.easyCanon && (m.fp !== null)),
          g6_safetyFpMismatch0: Object.values(fpAx).every((x) => x.axMd5Set === 1),
          g7_authoredCanonicalHeld0: perMaster.every((m) => !m.authKo && !m.authEn),
          g8_sourceRefExactly1: perMaster.every((m) => m.easyCanon === 1),
          g9_canonicalDup0: dupKo === 0 && dupEn === 0,
        },
        stop, allGreen: stop.length === 0,
        fpGroups: Object.entries(fpAx).map(([gencode, x]) => ({ gencode, fp: x.fp, size: x.size, masterIds: fpMap.get(gencode)!.sort() })).sort((a, b) => b.size - a.size || (a.gencode < b.gencode ? -1 : 1)),
      };
      const outFile = path.join(OUT_DIR, `pre-apply-${route}-unit1.json`);
      fs.writeFileSync(outFile, JSON.stringify(preApply, null, 2));
      summary[route] = { fp: fpMap.size, master: perMaster.length, expectedWrite, allGreen: preApply.allGreen, stopCount: stop.length, out: path.relative(process.cwd(), outFile) };
      if (stop.length) { anyStop = true; console.log(`\n[${route}] STOP ${stop.length}건:`); stop.slice(0, 20).forEach((s) => console.log('  -', s)); }
      else console.log(`\n[${route}] PRE_APPLY GREEN — ${fpMap.size} fp / ${perMaster.length} master / expWrite ${expectedWrite} (KO ${u.masterCount * 4} + EN ${u.masterCount * 2})`);
    }

    console.log('\n=== REPRODUCE SUMMARY ===\n' + JSON.stringify(summary, null, 2));
    process.exit(anyStop ? 1 : 0);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}
main().catch((e) => { console.error('FATAL', e?.message ?? e); process.exit(1); });
