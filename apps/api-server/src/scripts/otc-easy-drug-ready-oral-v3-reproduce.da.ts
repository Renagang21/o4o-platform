/**
 * WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 — agent-da V3 reproduce/gate probe (READ-ONLY)
 *
 * 목적: 재승인 commit 00851d237 의 content-fingerprint V3 SSOT/unit 원장을 **독립 재현**하여, oral-unit-1/2 를
 *   PRE_APPLY READY 로 진행하기 전 모든 fail-fast 게이트를 검증한다. DB write 0. 저작/번역/dry-run/apply 없음.
 *
 * 검증 게이트(하나라도 실패 → 즉시 STOP 보고):
 *   G1  oral 540 master 재현 (unit1∪unit2)
 *   G2  oral 131 content fp 재현
 *   G3  oral-unit-1 = 65fp/270m, oral-unit-2 = 66fp/270m (V3 원장과 정확히 일치)
 *   G4  unit 간 master 교집합 0
 *   G5  unit 간 fp 교집합 0 (fp split across units 0)
 *   G6  fp 내부 6섹션(효능·효과/용법·용량/경고/사용상 주의사항/이상반응/상호작용) byte-identical mismatch 0  ← V3 핵심
 *   G7  파생 sourceRef == V3 원장 sourceRef (fp 단위 정확 일치)
 *   G8  V3 sourceRef ≠ V2 sourceRef (namespace otc-v3-content-leaflet: 이 gencode 기반 fpToUuidV2 와 다름)
 *   G9  기존 authored ko canonical 0 · 기존 en canonical 0
 *   G10 easy ko canonical anchor 존재 (master당 ≥1)
 *   G11 canonicalDup 0 (master×lang STORE canonical 중복 0)
 *   G12 신규 sourceRef LIVE 충돌 0 · dup 0 · cross-fp 공유 0
 *   G13 fp별 gencode 단일 · route 단일 (union merge 0)
 *
 * 접속: 127.0.0.1:5442 · o4o_api · o4o_platform. .env DB_PASSWORD (출력 금지).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-oral-v3-reproduce.da.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  normalize, resolveRoute, BLOCKED_MASTER_IDS, AUTHORED_SOURCES, officialAxes, fingerprintV2, fpToUuidV2,
} from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const V3_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
const V3_SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-reapproval-ssot-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};

// ── census.la VERBATIM content-fp 정의 ───────────────────────────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
const MANDATORY_SECTIONS = ['효능·효과', '용법·용량'] as const;
function sectionHashVector(sec: Record<string, string>): Record<string, string> {
  const v: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) v[k] = H(normalize(sec[k] || ''));
  return v;
}
function contentFingerprint(gencode: string, route: string, hv: Record<string, string>): string {
  return H([gencode, route, ...CONTENT_SECTIONS.map((k) => hv[k])].join('|'));
}
function contentFpToUuid(fp: string): string {
  const h = md5('otc-v3-content-leaflet:' + fp);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: 5442,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  return ds;
}

const eq = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

async function main(): Promise<void> {
  const fails: string[] = [];
  const fail = (g: string, msg: string): void => { fails.push(`${g}: ${msg}`); };

  const ledger = JSON.parse(fs.readFileSync(V3_LEDGER, 'utf8'));
  const ssot = JSON.parse(fs.readFileSync(V3_SSOT, 'utf8'));
  if (ssot.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`V3 SSOT status ${ssot.status} != APPROVED_FOR_PRODUCTION`);

  const oralUnits: any[] = ledger.units.filter((u: any) => u.route === 'oral');
  if (oralUnits.length !== 2) throw new Error(`oral units ${oralUnits.length} != 2`);
  const u1 = oralUnits.find((u) => u.unit === 'oral-unit-1');
  const u2 = oralUnits.find((u) => u.unit === 'oral-unit-2');
  if (!u1 || !u2) throw new Error('oral-unit-1/2 not found in V3 ledger');

  // ledger-declared boundaries
  const u1Ids: string[] = [...u1.masterIds].sort();
  const u2Ids: string[] = [...u2.masterIds].sort();
  const allOralIds = [...new Set([...u1Ids, ...u2Ids])].sort();
  const u1Fps = new Set<string>(u1.fingerprints);
  const u2Fps = new Set<string>(u2.fingerprints);
  // fp -> declared sourceRef, from ledger.fingerprints detail
  const fpDetail = new Map<string, any>(ledger.fingerprints.map((f: any) => [f.fp, f]));

  // G3 declared counts
  if (u1.fpCount !== 65 || u1.masterCount !== 270) fail('G3', `oral-unit-1 declared ${u1.fpCount}fp/${u1.masterCount}m != 65/270`);
  if (u2.fpCount !== 66 || u2.masterCount !== 270) fail('G3', `oral-unit-2 declared ${u2.fpCount}fp/${u2.masterCount}m != 66/270`);
  if (u1Ids.length !== 270) fail('G3', `oral-unit-1 masterIds ${u1Ids.length} != 270`);
  if (u2Ids.length !== 270) fail('G3', `oral-unit-2 masterIds ${u2Ids.length} != 270`);
  if (u1Fps.size !== 65) fail('G3', `oral-unit-1 fingerprints ${u1Fps.size} != 65`);
  if (u2Fps.size !== 66) fail('G3', `oral-unit-2 fingerprints ${u2Fps.size} != 66`);

  // G1 / G2 declared totals
  if (allOralIds.length !== 540) fail('G1', `oral master union ${allOralIds.length} != 540`);
  const declaredFpUnion = new Set<string>([...u1Fps, ...u2Fps]);
  if (declaredFpUnion.size !== 131) fail('G2', `oral fp union ${declaredFpUnion.size} != 131`);

  // G4 master intersection 0
  const midInter = u1Ids.filter((x) => new Set(u2Ids).has(x));
  if (midInter.length !== 0) fail('G4', `unit master intersection ${midInter.length}`);
  // G5 fp intersection 0
  const fpInter = [...u1Fps].filter((x) => u2Fps.has(x));
  if (fpInter.length !== 0) fail('G5', `unit fp intersection ${fpInter.length}`);

  // ── DB derivation ────────────────────────────────────────────────────────────
  const ds = await connect();
  const stdRows = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1`, [allOralIds]));
  const genByMid = new Map(stdRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));

  const contentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [allOralIds]));
  const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));

  const slotRows = retRows<{ mid: string; authored: string; encanon: string; easy: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text easy
    FROM unnest($1::uuid[]) m(mid)`, [allOralIds, AUTHORED_SOURCES as unknown as string[]]));
  const slotBy = new Map(slotRows.map((r) => [r.mid, r]));

  const dupRows = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allOralIds]));
  const canonicalDup = parseInt(dupRows[0]?.n || '0', 10);

  // ── derive fp per master ──────────────────────────────────────────────────────
  interface P { mid: string; declaredUnit: string; gencode: string; route: string; sec: Record<string, string>; hv: Record<string, string>; fp: string; }
  const declaredUnitByMid = new Map<string, string>();
  for (const mid of u1Ids) declaredUnitByMid.set(mid, 'oral-unit-1');
  for (const mid of u2Ids) declaredUnitByMid.set(mid, 'oral-unit-2');

  const producible: P[] = [];
  for (const mid of allOralIds) {
    if (BLOCKED_MASTER_IDS.has(mid)) { fail('G10', `master ${mid} is BLOCKED but present in V3 oral ledger`); continue; }
    const content = contentByMid.get(mid) || '';
    if (!content) { fail('G10', `master ${mid} easy ko canonical anchor 없음`); continue; }
    const sec = sections(content);
    const missMand = MANDATORY_SECTIONS.filter((k) => !normalize(sec[k] || ''));
    if (missMand.length) { fail('G10', `master ${mid} 필수 섹션 공란 ${missMand.join(',')}`); continue; }
    const gencodes = genByMid.get(mid) || [];
    if (gencodes.length !== 1) { fail('G13', `master ${mid} gencode ${gencodes.length}개`); continue; }
    const gencode = gencodes[0];
    const rr = resolveRoute(gencode);
    if (!rr.ok) { fail('G13', `master ${mid} route 해석 불가 ${gencode}`); continue; }
    if (rr.route !== 'oral') { fail('G13', `master ${mid} route=${rr.route} != oral`); continue; }
    const hv = sectionHashVector(sec);
    producible.push({ mid, declaredUnit: declaredUnitByMid.get(mid)!, gencode, route: rr.route, sec, hv, fp: contentFingerprint(gencode, rr.route, hv) });
  }
  await ds.destroy();

  // G1 producible == 540
  if (producible.length !== 540) fail('G1', `producible oral masters ${producible.length} != 540`);
  const easyMissing = producible.filter((p) => (+ (slotBy.get(p.mid)?.easy || '0')) < 1).length;
  if (easyMissing) fail('G10', `easy ko canonical <1 count ${easyMissing}`);

  // ── fp grouping ────────────────────────────────────────────────────────────────
  const fpGroups = new Map<string, P[]>();
  for (const p of producible) (fpGroups.get(p.fp) || fpGroups.set(p.fp, []).get(p.fp)!).push(p);

  // G2 derived fp count == 131
  if (fpGroups.size !== 131) fail('G2', `derived oral fp ${fpGroups.size} != 131`);

  // derived fp set must equal declared fp union
  for (const fp of fpGroups.keys()) if (!declaredFpUnion.has(fp)) fail('G2', `derived fp ${fp} not in V3 ledger`);
  for (const fp of declaredFpUnion) if (!fpGroups.has(fp)) fail('G2', `V3 ledger fp ${fp} not derived`);

  // G6 intra-fp 6-section byte-identical (THE V3 critical gate)
  let intraMismatch = 0;
  const intraExamples: string[] = [];
  for (const [fp, ids] of fpGroups) {
    const rep = ids[0];
    for (const x of ids) for (const k of CONTENT_SECTIONS) if (x.hv[k] !== rep.hv[k]) {
      intraMismatch++; if (intraExamples.length < 8) intraExamples.push(`${fp} mid=${x.mid} sec=${k}`); break;
    }
  }
  if (intraMismatch) fail('G6', `intra-fp 6-section mismatch ${intraMismatch} — ${intraExamples.join(' | ')}`);

  // G13 fp별 gencode/route 단일
  let multiGencodeFp = 0, multiRouteFp = 0;
  for (const [, ids] of fpGroups) {
    if (new Set(ids.map((x) => x.gencode)).size > 1) multiGencodeFp++;
    if (new Set(ids.map((x) => x.route)).size > 1) multiRouteFp++;
  }
  if (multiGencodeFp) fail('G13', `multiGencodeFp ${multiGencodeFp}`);
  if (multiRouteFp) fail('G13', `multiRouteFp ${multiRouteFp}`);

  // one master in >=2 fps
  const midFpCount = new Map<string, number>();
  for (const p of producible) midFpCount.set(p.mid, (midFpCount.get(p.mid) || 0) + 1);
  const masterInMultiFp = [...midFpCount.values()].filter((c) => c > 1).length;
  if (masterInMultiFp) fail('G5', `masterInMultiFp ${masterInMultiFp}`);

  // ── per-unit reproduction: derived fp→unit assignment must match declared ───────
  // Assign each derived fp to the unit whose declared fingerprints contains it.
  const derivedU1Fps = new Set<string>(), derivedU2Fps = new Set<string>();
  const derivedU1Ids: string[] = [], derivedU2Ids: string[] = [];
  for (const [fp, ids] of fpGroups) {
    const inU1 = u1Fps.has(fp), inU2 = u2Fps.has(fp);
    if (inU1 && inU2) { fail('G5', `fp ${fp} declared in BOTH units`); continue; }
    if (!inU1 && !inU2) { fail('G3', `derived fp ${fp} in neither declared unit`); continue; }
    if (inU1) { derivedU1Fps.add(fp); for (const p of ids) derivedU1Ids.push(p.mid); }
    else { derivedU2Fps.add(fp); for (const p of ids) derivedU2Ids.push(p.mid); }
    // members must match the fp's declared masterIds
    const decl = fpDetail.get(fp);
    if (decl) {
      const got = ids.map((p) => p.mid).sort();
      const want = [...decl.masterIds].sort();
      if (!eq(got, want)) fail('G3', `fp ${fp} member mismatch: derived ${got.length} vs declared ${want.length}`);
    } else fail('G3', `fp ${fp} missing from ledger.fingerprints detail`);
  }
  derivedU1Ids.sort(); derivedU2Ids.sort();
  if (derivedU1Fps.size !== 65) fail('G3', `derived oral-unit-1 fp ${derivedU1Fps.size} != 65`);
  if (derivedU2Fps.size !== 66) fail('G3', `derived oral-unit-2 fp ${derivedU2Fps.size} != 66`);
  if (derivedU1Ids.length !== 270) fail('G3', `derived oral-unit-1 masters ${derivedU1Ids.length} != 270`);
  if (derivedU2Ids.length !== 270) fail('G3', `derived oral-unit-2 masters ${derivedU2Ids.length} != 270`);
  if (!eq(derivedU1Ids, u1Ids)) fail('G3', `oral-unit-1 masterIds derived != declared`);
  if (!eq(derivedU2Ids, u2Ids)) fail('G3', `oral-unit-2 masterIds derived != declared`);

  // G7 sourceRef == V3 ledger + G8 distinct from V2 + G12 dup/cross-fp/uniqueness
  const refByFp = new Map<string, string>();
  let refMatchFail = 0, v3EqV2 = 0;
  for (const [fp] of fpGroups) {
    const ref = contentFpToUuid(fp);
    refByFp.set(fp, ref);
    const decl = fpDetail.get(fp);
    if (decl && decl.sourceRef !== ref) { refMatchFail++; if (refMatchFail <= 5) fail('G7', `fp ${fp} sourceRef derived ${ref} != ledger ${decl.sourceRef}`); }
    // V3 vs V2: recompute V2 fp+ref for this fp's representative (official 3-axis, gencode, route)
    const rep = fpGroups.get(fp)![0];
    const repContent = contentByMid.get(rep.mid) || '';
    const v2fp = fingerprintV2(officialAxes(repContent), rep.gencode, rep.route);
    const v2ref = fpToUuidV2(v2fp);
    if (v2ref === ref) { v3EqV2++; if (v3EqV2 <= 5) fail('G8', `fp ${fp} V3 sourceRef == V2 sourceRef ${ref}`); }
  }
  const refValues = [...refByFp.values()];
  const refDup = refValues.length - new Set(refValues).size;
  if (refDup) fail('G12', `sourceRef dup ${refDup}`);
  const refToFps = new Map<string, Set<string>>();
  for (const [fp, ref] of refByFp) (refToFps.get(ref) || refToFps.set(ref, new Set()).get(ref)!).add(fp);
  const refSharedAcrossFp = [...refToFps.values()].filter((s) => s.size > 1).length;
  if (refSharedAcrossFp) fail('G12', `sourceRef sharedAcrossFp ${refSharedAcrossFp}`);

  // LIVE sourceRef conflict (re-open DB briefly)
  const ds2 = await connect();
  const liveRefRows = retRows<{ n: string }>(await ds2.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refValues]));
  const liveRefConflict = parseInt(liveRefRows[0]?.n || '0', 10);
  await ds2.destroy();
  if (liveRefConflict) fail('G12', `LIVE sourceRef conflict ${liveRefConflict}`);

  // G9 existing authored ko / en canonical
  let existingAuthoredKo = 0, existingEnCanonical = 0;
  for (const p of producible) { const s = slotBy.get(p.mid); if (s) { existingAuthoredKo += +s.authored; existingEnCanonical += +s.encanon; } }
  if (existingAuthoredKo) fail('G9', `existing authored ko canonical ${existingAuthoredKo}`);
  if (existingEnCanonical) fail('G9', `existing en canonical ${existingEnCanonical}`);

  // G11 canonicalDup
  if (canonicalDup) fail('G11', `canonicalDup ${canonicalDup}`);

  // expected write
  const expectedWrite = { masters: 540, ko: 540 * 4, en: 540 * 2, total: 540 * 6 };

  // ── report ──────────────────────────────────────────────────────────────────
  const pass = fails.length === 0;
  console.log('=== oral V3 reproduce/gate probe (READ-ONLY, dbWrite 0) ===');
  console.log(`oral masters ${producible.length} · fp ${fpGroups.size}`);
  console.log(`oral-unit-1 derived ${derivedU1Fps.size}fp/${derivedU1Ids.length}m (declared 65/270)`);
  console.log(`oral-unit-2 derived ${derivedU2Fps.size}fp/${derivedU2Ids.length}m (declared 66/270)`);
  console.log(`unit master∩ ${midInter.length} · unit fp∩ ${fpInter.length} · masterInMultiFp ${masterInMultiFp}`);
  console.log(`intra-fp 6-section mismatch ${intraMismatch} · multiGencodeFp ${multiGencodeFp} · multiRouteFp ${multiRouteFp}`);
  console.log(`sourceRef match-fail ${refMatchFail} · V3==V2 ${v3EqV2} · dup ${refDup} · sharedAcrossFp ${refSharedAcrossFp} · liveConflict ${liveRefConflict}`);
  console.log(`existingAuthoredKo ${existingAuthoredKo} · existingEnCanonical ${existingEnCanonical} · canonicalDup ${canonicalDup} · easyMissing ${easyMissing}`);
  console.log(`expectedWrite masters ${expectedWrite.masters} ko ${expectedWrite.ko} en ${expectedWrite.en} total ${expectedWrite.total}`);
  if (pass) console.log('GATES: ALL PASS → PRE_APPLY reproduce GREEN');
  else { console.log(`GATES FAIL (${fails.length}):`); for (const f of fails) console.log('  ✗ ' + f); }
  process.exit(pass ? 0 : 2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
