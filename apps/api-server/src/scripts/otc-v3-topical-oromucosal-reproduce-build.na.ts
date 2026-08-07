/**
 * WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1 — 나 READ-ONLY 재현+KO 생성
 *
 * 목적: V3 content-fingerprint unit ledger(commit 00851d237)를 입력으로,
 *   topical-unit-1(55fp/327m) · oromucosal-unit-1(2fp/14m) 를 read-only 재현하고 KO 설명서를 생성한다.
 *   - fp 재계산(라 census VERBATIM 산식) → ledger 배정과 일치
 *   - fp 내부 6섹션 byte-identity(대표=전원 동일 → 정보손실 0)
 *   - route 교집합 0(topical ∩ oromucosal masterIds)
 *   - sourceRef = contentFpToUuid(fp) → ledger 일치 · dup 0 · LIVE 충돌 0
 *   - 기존 authored STORE ko/en canonical 0 · easy ko canonical anchor 존재
 *   - composeKoV3 로 6섹션 KO 생성 · anomalies 0 · 6섹션 coverage 기록
 *   산출: 유닛별 build 아티팩트(fp별 공식 6섹션 + KO html/source) + reproduce CHECK.
 *
 * DB write 0. LIVE apply 없음. 접속: 127.0.0.1:<port>(기본 5470, 나 전용 read-only proxy) · o4o_api · o4o_platform.
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-v3-topical-oromucosal-reproduce-build.na.ts [--port 5470]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalize, resolveRoute, BLOCKED_MASTER_IDS, BLOCKED_FPS, AUTHORED_SOURCES,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  md5, sections, sectionHashVector, contentFingerprint, contentFpToUuid,
  CONTENT_SECTIONS, MANDATORY_SECTIONS, SAFETY_SECTIONS, composeKoV3, buildKoV3Html,
} from './otc-v3-content-leaflet-composer.na.js';

const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_DIR = path.join(DATA_DIR, 'otc-ready-na-v3');
const V3_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const UNITS = ['topical-unit-1', 'oromucosal-unit-1'] as const;
const argPort = (() => { const i = process.argv.indexOf('--port'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : 5470; })();

const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: argPort,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  return ds;
}

interface FpRec { fp: string; route: string; gencode: string; size: number; sourceRef: string; masterIds: string[] }

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ledger = JSON.parse(fs.readFileSync(V3_LEDGER, 'utf8'));
  const unitByName: Record<string, any> = Object.fromEntries(ledger.units.map((u: any) => [u.unit, u]));
  const fpDetailByFp: Record<string, FpRec> = Object.fromEntries(ledger.fingerprints.map((f: FpRec) => [f.fp, f]));
  for (const u of UNITS) if (!unitByName[u]) throw new Error(`ledger에 ${u} 없음`);

  // 유닛별 선언 값
  const declared = UNITS.map((u) => {
    const un = unitByName[u];
    return { unit: u, route: un.route, fpCount: un.fpCount, masterCount: un.masterCount,
      fingerprints: un.fingerprints as string[], sourceRefs: un.sourceRefs as string[], masterIds: un.masterIds as string[] };
  });
  const allIds = [...new Set(declared.flatMap((d) => d.masterIds))];
  const declRouteByMid = new Map<string, string>();
  const declUnitByMid = new Map<string, string>();
  for (const d of declared) for (const mid of d.masterIds) { declRouteByMid.set(mid, d.route); declUnitByMid.set(mid, d.unit); }

  const ds = await connect();
  // gencode — census VERBATIM
  const stdRows = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1`, [allIds]));
  const genByMid = new Map(stdRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));

  // easy ko canonical content — census VERBATIM tie-break
  const contentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));

  // slot state — census VERBATIM
  const slotRows = retRows<{ mid: string; authored: string; encanon: string; easy: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text easy
    FROM unnest($1::uuid[]) m(mid)`, [allIds, AUTHORED_SOURCES as unknown as string[]]));
  const slotBy = new Map(slotRows.map((r) => [r.mid, r]));

  // sourceRef LIVE conflict — 전 유닛 sourceRefs
  const allRefs = [...new Set(declared.flatMap((d) => d.sourceRefs))];
  const liveRefRows = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [allRefs]));
  const liveRefConflict = parseInt(liveRefRows[0]?.n || '0', 10);

  await ds.destroy();

  // ── 재현 + 검증 ─────────────────────────────────────────────────────────────────
  const anomalies: string[] = [];
  const unitReports: any[] = [];
  const perUnitMasterSets: Record<string, Set<string>> = {};

  for (const d of declared) {
    // 유닛 마스터별 재계산
    interface P { mid: string; gencode: string; route: string; form: string; sec: Record<string, string>; hv: Record<string, string>; fp: string }
    const producible: P[] = [];
    const holds: Array<{ mid: string; reason: string }> = [];
    for (const mid of d.masterIds) {
      if (BLOCKED_MASTER_IDS.has(mid)) { holds.push({ mid, reason: 'BLOCKED_MASTER_IDS' }); continue; }
      const content = contentByMid.get(mid) || '';
      if (!content) { holds.push({ mid, reason: 'easy ko canonical 원문 없음' }); continue; }
      const sec = sections(content);
      const missMand = MANDATORY_SECTIONS.filter((k) => !normalize(sec[k] || ''));
      if (missMand.length) { holds.push({ mid, reason: `필수 섹션 공란: ${missMand.join(',')}` }); continue; }
      const gencodes = genByMid.get(mid) || [];
      if (gencodes.length !== 1) { holds.push({ mid, reason: `gencode ${gencodes.length}개` }); continue; }
      const gencode = gencodes[0];
      const rr = resolveRoute(gencode);
      if (!rr.ok) { holds.push({ mid, reason: `route 해석 불가 ${gencode}: ${rr.reason}` }); continue; }
      if (rr.route !== d.route) { holds.push({ mid, reason: `route 불일치 derived=${rr.route} declared=${d.route}` }); continue; }
      const hv = sectionHashVector(sec);
      const fp = contentFingerprint(gencode, rr.route, hv);
      if (BLOCKED_FPS.has(fp)) { holds.push({ mid, reason: `BLOCKED_FPS ${fp}` }); continue; }
      producible.push({ mid, gencode, route: rr.route, form: rr.form, sec, hv, fp });
    }
    perUnitMasterSets[d.unit] = new Set(producible.map((p) => p.mid));

    // HOLD 발생 시 중지 조건(모집단 재현 실패)
    if (holds.length) anomalies.push(`[${d.unit}] HOLD ${holds.length}건(모집단 재현 실패): ${holds.slice(0, 3).map((h) => `${h.mid.slice(0, 8)}=${h.reason}`).join(' | ')}`);

    // fp grouping
    const fpGroups = new Map<string, P[]>();
    for (const p of producible) (fpGroups.get(p.fp) || fpGroups.set(p.fp, []).get(p.fp)!).push(p);

    // G: master/fp count
    if (producible.length !== d.masterCount) anomalies.push(`[${d.unit}] producible master ${producible.length} != ledger ${d.masterCount}`);
    if (fpGroups.size !== d.fpCount) anomalies.push(`[${d.unit}] fp ${fpGroups.size} != ledger ${d.fpCount}`);

    // G: fp 집합 = ledger 집합
    const ledgerFps = new Set(d.fingerprints);
    const gotFps = new Set(fpGroups.keys());
    const missingFp = [...ledgerFps].filter((f) => !gotFps.has(f));
    const extraFp = [...gotFps].filter((f) => !ledgerFps.has(f));
    if (missingFp.length) anomalies.push(`[${d.unit}] ledger fp 미재현 ${missingFp.length}: ${missingFp.slice(0, 3).join(',')}`);
    if (extraFp.length) anomalies.push(`[${d.unit}] 예상 밖 fp ${extraFp.length}: ${extraFp.slice(0, 3).join(',')}`);

    // G: fp별 masterId 배정 = ledger
    let midAssignMismatch = 0;
    for (const [fp, ids] of fpGroups) {
      const led = fpDetailByFp[fp];
      if (!led) { anomalies.push(`[${d.unit}] fp ${fp} ledger fingerprints 부재`); continue; }
      const got = new Set(ids.map((x) => x.mid));
      const exp = new Set(led.masterIds);
      if (got.size !== exp.size || [...got].some((m) => !exp.has(m))) midAssignMismatch++;
    }
    if (midAssignMismatch) anomalies.push(`[${d.unit}] fp별 masterId 배정 불일치 ${midAssignMismatch}`);

    // G: intra-fp 6섹션 byte-identity(대표=전원)
    let intraFpMismatch = 0;
    for (const [, ids] of fpGroups) {
      const rep = ids[0];
      for (const x of ids) for (const k of CONTENT_SECTIONS) if (x.hv[k] !== rep.hv[k]) { intraFpMismatch++; break; }
    }
    if (intraFpMismatch) anomalies.push(`[${d.unit}] intra-fp 6섹션 불일치 ${intraFpMismatch}(정보손실 위험)`);

    // G: sourceRef = contentFpToUuid(fp) = ledger, dup 0, sharedAcrossFp 0
    const refByFp = new Map([...fpGroups.keys()].map((fp) => [fp, contentFpToUuid(fp)]));
    let refLedgerMismatch = 0;
    for (const [fp, ref] of refByFp) { const led = fpDetailByFp[fp]; if (led && led.sourceRef !== ref) refLedgerMismatch++; }
    if (refLedgerMismatch) anomalies.push(`[${d.unit}] sourceRef ledger 불일치 ${refLedgerMismatch}`);
    const refVals = [...refByFp.values()];
    const refDup = refVals.length - new Set(refVals).size;
    if (refDup) anomalies.push(`[${d.unit}] sourceRef dup ${refDup}`);

    // G: 기존 authored ko / en canonical 0, easy anchor 존재
    let existingAuthoredKo = 0, existingEnCanonical = 0, easyNot1 = 0;
    for (const p of producible) {
      const s = slotBy.get(p.mid);
      if (s) { existingAuthoredKo += +s.authored; existingEnCanonical += +s.encanon; if (+s.easy !== 1) easyNot1++; }
      else easyNot1++;
    }
    if (existingAuthoredKo) anomalies.push(`[${d.unit}] 기존 authored ko canonical ${existingAuthoredKo}`);
    if (existingEnCanonical) anomalies.push(`[${d.unit}] 기존 en canonical ${existingEnCanonical}`);
    if (easyNot1) anomalies.push(`[${d.unit}] easy ko canonical anchor != 1 인 master ${easyNot1}`);

    // ── KO 생성(fp 대표 기준) ────────────────────────────────────────────────────
    const fpArtifacts: any[] = [];
    let koAnomalyFps = 0;
    const cov = { warn: 0, precaution: 0, adverse: 0, interaction: 0 };
    for (const [fp, ids] of fpGroups) {
      const rep = ids[0];
      const title = `${rep.form} (${rep.gencode})`;
      const ko = composeKoV3(rep.sec, rep.route, rep.form, rep.gencode);
      const built = buildKoV3Html(ko.source, { title });
      const allAnom = [...ko.anomalies, ...built.missing.map((m) => `KO 필수 누락 ${m}`)];
      if (allAnom.length) { koAnomalyFps++; anomalies.push(`[${d.unit}] fp ${fp} KO anomaly: ${allAnom.slice(0, 3).join(' | ')}`); }
      const present = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, normalize(rep.sec[k] || '') ? 1 : 0]));
      if (present['경고']) cov.warn++;
      if (present['사용상 주의사항']) cov.precaution++;
      if (present['이상반응']) cov.adverse++;
      if (present['상호작용']) cov.interaction++;
      fpArtifacts.push({
        fp, route: rep.route, gencode: rep.gencode, form: rep.form, size: ids.length,
        sourceRef: refByFp.get(fp), title, masterIds: ids.map((x) => x.mid).sort(),
        sectionPresence: present,
        officialSections: Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, rep.sec[k] || ''])),
        koSource: ko.source, koHtml: built.html,
        koAnomalies: allAnom,
      });
    }
    fpArtifacts.sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

    // 유닛 build 아티팩트
    const buildFile = path.join(OUT_DIR, `build-${d.unit}.json`);
    const buildPayload = {
      wo: 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1',
      agent: 'na', unit: d.unit, route: d.route,
      ledgerCommit: '00851d237', dbWrite: 0, generatedLang: 'ko',
      fpCount: fpGroups.size, masterCount: producible.length,
      expectedWrite: { ko: producible.length * 4, en: producible.length * 2, total: producible.length * 6 },
      safetyCoverage: cov,
      fingerprints: fpArtifacts,
    };
    fs.writeFileSync(buildFile, JSON.stringify(buildPayload, null, 2) + '\n', 'utf8');

    unitReports.push({
      unit: d.unit, route: d.route,
      declared: { fpCount: d.fpCount, masterCount: d.masterCount },
      reproduced: { fpCount: fpGroups.size, masterCount: producible.length, holds: holds.length },
      midAssignMismatch, intraFpMismatch, refLedgerMismatch, refDup,
      existingAuthoredKo, existingEnCanonical, easyNot1,
      koAnomalyFps, safetyCoverage: cov,
      buildFile: path.relative(process.cwd(), buildFile).replace(/\\/g, '/'),
      buildFileMd5: md5(fs.readFileSync(buildFile, 'utf8')),
    });
  }

  // route 교집합 0
  const routeIntersection = [...perUnitMasterSets['topical-unit-1']].filter((m) => perUnitMasterSets['oromucosal-unit-1'].has(m));
  if (routeIntersection.length) anomalies.push(`route 교집합 ${routeIntersection.length}(topical ∩ oromucosal)`);
  if (liveRefConflict) anomalies.push(`sourceRef LIVE 충돌 ${liveRefConflict}`);

  const pass = anomalies.length === 0;
  const check = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1',
    agent: 'na', mode: 'READ-ONLY reproduce + KO generate', ledgerCommit: '00851d237',
    dbWrite: 0, port: argPort,
    units: unitReports,
    routeIntersection: routeIntersection.length, liveRefConflict,
    anomalies, pass,
    contentSections: CONTENT_SECTIONS, mandatorySections: MANDATORY_SECTIONS, safetySections: SAFETY_SECTIONS,
  };
  const checkFile = path.join(OUT_DIR, 'reproduce-check-v1.json');
  fs.writeFileSync(checkFile, JSON.stringify(check, null, 2) + '\n', 'utf8');

  console.log('=== V3 topical/oromucosal reproduce + KO (READ-ONLY, dbWrite 0) ===');
  for (const r of unitReports) {
    console.log(`[${r.unit}] declared ${r.declared.fpCount}fp/${r.declared.masterCount}m · reproduced ${r.reproduced.fpCount}fp/${r.reproduced.masterCount}m (HOLD ${r.reproduced.holds})`);
    console.log(`   midAssignMismatch ${r.midAssignMismatch} · intraFpMismatch ${r.intraFpMismatch} · refLedgerMismatch ${r.refLedgerMismatch} · refDup ${r.refDup}`);
    console.log(`   existingAuthoredKo ${r.existingAuthoredKo} · existingEnCanonical ${r.existingEnCanonical} · easyNot1 ${r.easyNot1} · koAnomalyFps ${r.koAnomalyFps}`);
    console.log(`   safetyCoverage 경고 ${r.safetyCoverage.warn} · 주의 ${r.safetyCoverage.precaution} · 이상반응 ${r.safetyCoverage.adverse} · 상호작용 ${r.safetyCoverage.interaction}`);
    console.log(`   build ${r.buildFile} md5 ${r.buildFileMd5}`);
  }
  console.log(`routeIntersection ${routeIntersection.length} · liveRefConflict ${liveRefConflict}`);
  console.log(anomalies.length ? `ANOMALIES(${anomalies.length}):\n - ${anomalies.join('\n - ')}` : 'ANOMALIES: none');
  console.log(`PASS=${pass}`);
  if (!pass) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
