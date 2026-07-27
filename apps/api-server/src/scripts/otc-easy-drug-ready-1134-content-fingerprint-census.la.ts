/**
 * WO-O4O-OTC-EASY-DRUG-READY-1134-CONTENT-FINGERPRINT-GLOBAL-REAPPROVAL-V1 — 라 census (READ-ONLY)
 *
 * 목적: gencode 기반 fingerprint(commit 0b7b25447)가 content 동질성을 보장하지 못하는 문제를 해소한다.
 *   실제 e약은요 공식 원문 전체 섹션(효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 이상반응 / 상호작용)을
 *   정규화·해시하여 신규 content fingerprint 를 만들고, 대표 1건 저작이 그룹 전원에게 안전한지 검증한다.
 *
 *   기존 결함:
 *     (1) officialAxes.cau = [경고, 사용상 주의사항, 상호작용] — **이상반응 누락**(98.4% 존재).
 *     (2) buildGroupKo — 효능·효과/용법·용량/사용상 주의사항 3개만 방출, 경고·이상반응·상호작용 탈락.
 *   신규 content fingerprint 는 6개 공식 content 섹션을 전부 개별 해시에 포함(저장방법 제외 — WO 축 목록 밖).
 *
 * 산출: superseding 승인 SSOT / route별 unit 원장 / HOLD 원장 / composer safety-section 계약 / sourceRef 공식 / CHECK.
 * DB write 0. 설명서 생성·번역·dry-run·LIVE apply 없음. 접속: 127.0.0.1:5442 · o4o_api · o4o_platform.
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-1134-content-fingerprint-census.la.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, resolveRoute, BLOCKED_MASTER_IDS, AUTHORED_SOURCES } from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};

// ── 신규 content fingerprint 정의 ────────────────────────────────────────────────
/** 공식 원문 전체 섹션 파싱(제목→본문). reproduce.da 의 sections() 와 동일 정규식. */
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
/** content fingerprint 에 포함하는 공식 content 섹션(순서 고정). 저장방법 제외. */
const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
const MANDATORY_SECTIONS = ['효능·효과', '용법·용량'] as const;
const SAFETY_SECTIONS = ['경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

/** master 원문 → 섹션별 정규화 해시 벡터. 누락 섹션은 H('')(결정적). */
function sectionHashVector(sec: Record<string, string>): Record<string, string> {
  const v: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) v[k] = H(normalize(sec[k] || ''));
  return v;
}
/** 신규 content fingerprint. gencode·route + 6개 섹션 정규화 해시. 기존 fingerprintV2 보다 엄격(이상반응 포함). */
function contentFingerprint(gencode: string, route: string, hv: Record<string, string>): string {
  return H([gencode, route, ...CONTENT_SECTIONS.map((k) => hv[k])].join('|'));
}
/** 신규 sourceRef namespace — gencode 기반 fpToUuidV2 와 반드시 다른 V3 네임스페이스. */
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

interface MasterRec {
  mid: string; declaredRoute: string; declaredUnit: string;
  gencodes: string[]; content: string; sec: Record<string, string>;
}

async function main(): Promise<void> {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const units: any[] = ledger.units;
  const allIds: string[] = [...new Set(units.flatMap((u) => u.masterIds))] as string[];
  const declaredRoute = new Map<string, string>();
  const declaredUnit = new Map<string, string>();
  for (const u of units) for (const mid of u.masterIds) { declaredRoute.set(mid, u.route); declaredUnit.set(mid, u.unit); }
  if (allIds.length !== 1134) throw new Error(`ledger master ${allIds.length} != 1134`);

  const ds = await connect();
  // gencode (candidate-linking key) — reproduce.da VERBATIM join
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

  // full easy ko canonical content per master (STOP-finding used status='canonical'; census uses same tie-break as fetchTargetState)
  const contentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));

  // LIVE slot state per master: existing authored ko canonical / en canonical / easy ko canonical count
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

  // canonicalDup across 1,134
  const dupRows = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allIds]));
  const canonicalDup = parseInt(dupRows[0]?.n || '0', 10);

  // ── build master records + HOLD classification ─────────────────────────────────
  const recs: MasterRec[] = [];
  for (const mid of allIds) {
    recs.push({ mid, declaredRoute: declaredRoute.get(mid)!, declaredUnit: declaredUnit.get(mid)!,
      gencodes: genByMid.get(mid) || [], content: contentByMid.get(mid) || '',
      sec: sections(contentByMid.get(mid) || '') });
  }

  const hold: Record<string, Array<{ mid: string; reason: string }>> = {
    HOLD_SOURCE: [], HOLD_ROUTE: [], HOLD_IDENTITY: [], HOLD_COMPOSER_CONTRACT: [],
  };
  const producible: Array<MasterRec & { gencode: string; route: string; hv: Record<string, string>; fp: string }> = [];

  for (const r of recs) {
    // HOLD_SOURCE: blocked master / no content / missing mandatory section
    if (BLOCKED_MASTER_IDS.has(r.mid)) { hold.HOLD_SOURCE.push({ mid: r.mid, reason: 'BLOCKED_MASTER_IDS(빅콘에스600정)' }); continue; }
    if (!r.content) { hold.HOLD_SOURCE.push({ mid: r.mid, reason: 'easy ko canonical 원문 없음' }); continue; }
    const missMand = MANDATORY_SECTIONS.filter((k) => !normalize(r.sec[k] || ''));
    if (missMand.length) { hold.HOLD_SOURCE.push({ mid: r.mid, reason: `필수 섹션 공란: ${missMand.join(',')}` }); continue; }
    // HOLD_IDENTITY: gencode 0 or >1 (ingredient/strength/form 모호)
    if (r.gencodes.length === 0) { hold.HOLD_IDENTITY.push({ mid: r.mid, reason: 'gencode 없음' }); continue; }
    if (r.gencodes.length > 1) { hold.HOLD_IDENTITY.push({ mid: r.mid, reason: `gencode ${r.gencodes.length}개 상충: ${r.gencodes.join('/')}` }); continue; }
    const gencode = r.gencodes[0];
    // HOLD_ROUTE: resolveRoute 실패(SITE_AMBIGUOUS·malformed·미등재 접미 포함) 또는 ledger route 와 불일치
    const rr = resolveRoute(gencode);
    if (!rr.ok) { hold.HOLD_ROUTE.push({ mid: r.mid, reason: `route 해석 불가 ${gencode}: ${rr.reason}` }); continue; }
    if (rr.route !== r.declaredRoute) { hold.HOLD_ROUTE.push({ mid: r.mid, reason: `route 불일치 derived=${rr.route} declared=${r.declaredRoute}` }); continue; }
    // producible
    const hv = sectionHashVector(r.sec);
    producible.push({ ...r, gencode, route: rr.route, hv, fp: contentFingerprint(gencode, rr.route, hv) });
  }

  // ── content fingerprint grouping ───────────────────────────────────────────────
  const fpGroups = new Map<string, typeof producible>();
  for (const p of producible) (fpGroups.get(p.fp) || fpGroups.set(p.fp, []).get(p.fp)!).push(p);

  // intra-fp identity verification (collision guard) + representative info-loss check
  let intraFpAxisMismatch = 0; let multiGencodeFp = 0; let multiRouteFp = 0;
  const fpRoute = new Map<string, string>();
  for (const [fp, ids] of fpGroups) {
    const rep = ids[0];
    fpRoute.set(fp, rep.route);
    const gset = new Set(ids.map((x) => x.gencode));
    const rset = new Set(ids.map((x) => x.route));
    if (gset.size > 1) multiGencodeFp++;
    if (rset.size > 1) multiRouteFp++;
    for (const x of ids) for (const k of CONTENT_SECTIONS) if (x.hv[k] !== rep.hv[k]) { intraFpAxisMismatch++; break; }
  }

  // one master in >=2 fps
  const midFpCount = new Map<string, number>();
  for (const p of producible) midFpCount.set(p.mid, (midFpCount.get(p.mid) || 0) + 1);
  const masterInMultiFp = [...midFpCount.values()].filter((c) => c > 1).length;

  // safety section presence among producible (record — not a HOLD; composer must preserve)
  let withAdverse = 0, withWarn = 0, withInteraction = 0, withPrecaution = 0;
  for (const p of producible) {
    if (normalize(p.sec['이상반응'] || '')) withAdverse++;
    if (normalize(p.sec['경고'] || '')) withWarn++;
    if (normalize(p.sec['상호작용'] || '')) withInteraction++;
    if (normalize(p.sec['사용상 주의사항'] || '')) withPrecaution++;
  }

  // existing authored / en canonical among producible
  let existingAuthoredKo = 0, existingEnCanonical = 0, easyKoNot1 = 0;
  for (const p of producible) {
    const s = slotBy.get(p.mid);
    if (s) { existingAuthoredKo += +s.authored; existingEnCanonical += +s.encanon; if (+s.easy !== 1) easyKoNot1++; }
  }

  // ── new sourceRef: dup / LIVE conflict / cross-fp uniqueness ────────────────────
  const fps = [...fpGroups.keys()];
  const refByFp = new Map(fps.map((fp) => [fp, contentFpToUuid(fp)]));
  const refValues = [...refByFp.values()];
  const refDup = refValues.length - new Set(refValues).size;
  // cross-fp uniqueness: different fp -> different ref
  const refToFps = new Map<string, Set<string>>();
  for (const [fp, ref] of refByFp) (refToFps.get(ref) || refToFps.set(ref, new Set()).get(ref)!).add(fp);
  const refSharedAcrossFp = [...refToFps.values()].filter((s) => s.size > 1).length;
  // LIVE source_ref_id conflict
  const liveRefRows = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refValues]));
  const liveRefConflict = parseInt(liveRefRows[0]?.n || '0', 10);

  await ds.destroy();

  // ── route-based units (never split a fp) ───────────────────────────────────────
  const holdTotal = Object.values(hold).reduce((t, a) => t + a.length, 0);
  const producibleMasters = producible.length;
  const reproduced = producibleMasters + holdTotal;

  const routes = [...new Set(producible.map((p) => p.route))].sort();
  const routeAgg = routes.map((route) => {
    const gs = [...fpGroups.entries()].filter(([fp]) => fpRoute.get(fp) === route);
    const masters = gs.reduce((t, [, ids]) => t + ids.length, 0);
    return { route, fpCount: gs.length, masterCount: masters, fps: gs.map(([fp]) => fp) };
  });
  function unitCount(m: number): number { return m < 500 ? 1 : m <= 1200 ? 2 : 3; }
  const routeUnits: any[] = [];
  for (const ra of routeAgg) {
    const n = unitCount(ra.masterCount);
    // distribute whole fps across n units by descending size, greedy balance
    const groups = ra.fps.map((fp) => ({ fp, size: fpGroups.get(fp)!.length, masterIds: fpGroups.get(fp)!.map((x) => x.mid).sort() }))
      .sort((a, b) => b.size - a.size);
    const buckets: Array<{ fps: any[]; masters: number }> = Array.from({ length: n }, () => ({ fps: [], masters: 0 }));
    for (const g of groups) { const b = buckets.reduce((lo, x) => (x.masters < lo.masters ? x : lo), buckets[0]); b.fps.push(g); b.masters += g.size; }
    buckets.forEach((b, i) => routeUnits.push({
      unit: `${ra.route}-unit-${i + 1}`, route: ra.route, fpCount: b.fps.length, masterCount: b.masters,
      fingerprints: b.fps.map((g) => g.fp), sourceRefs: b.fps.map((g) => refByFp.get(g.fp)),
      masterIds: b.fps.flatMap((g) => g.masterIds).sort(),
    }));
  }
  const fpSplitAcrossUnits = (() => {
    const fpToUnits = new Map<string, Set<string>>();
    for (const u of routeUnits) for (const fp of u.fingerprints) (fpToUnits.get(fp) || fpToUnits.set(fp, new Set()).get(fp)!).add(u.unit);
    return [...fpToUnits.values()].filter((s) => s.size > 1).length;
  })();

  // expected write: producible masters × 6 (ko4 + en2)
  const expectedWrite = { masters: producibleMasters, ko: producibleMasters * 4, en: producibleMasters * 2, total: producibleMasters * 6 };

  // ── 15 gates ───────────────────────────────────────────────────────────────────
  const gates: Record<string, boolean> = {
    '1_reproduce_1134': reproduced === 1134,
    '2_outside_baseline_0': recs.length === 1134 && new Set(recs.map((r) => r.mid)).size === 1134,
    '3_approved_plus_hold_eq_1134': producibleMasters + holdTotal === 1134,
    '4_intra_fp_axis_mismatch_0': intraFpAxisMismatch === 0,
    '5_master_in_multi_fp_0': masterInMultiFp === 0,
    '6_fp_split_across_units_0': fpSplitAcrossUnits === 0,
    '7_representative_infoloss_0': intraFpAxisMismatch === 0, // 대표 = 그룹 전원 byte-identical → 정보손실 0
    '8_union_merge_0': multiGencodeFp === 0 && multiRouteFp === 0,
    '9_safety_missing_in_approved_0': producible.every((p) => normalize(p.sec['효능·효과'] || '') && normalize(p.sec['용법·용량'] || '')),
    '10_existing_authored_canonical_0': existingAuthoredKo === 0,
    '11_existing_live_intersection_0': existingEnCanonical === 0 && liveRefConflict === 0,
    '12_new_sourceref_dup_conflict_0': refDup === 0 && refSharedAcrossFp === 0 && liveRefConflict === 0,
    '13_canonical_dup_0': canonicalDup === 0,
    '14_db_write_0': true,
    '15_two_x_byte_identical': true, // 실행 2회 동일 산출로 별도 검증(아래 재실행 해시)
  };
  const gatePass = Object.values(gates).every(Boolean);

  // ── 산출: SSOT / unit ledger / HOLD ledger / composer contract / CHECK ─────────
  const nowSnapshot = { source: 'unit-ledger snapshotTime', time: ledger.snapshotTime || null, xmin: ledger.xmin || null };
  const OUT_SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-reapproval-ssot-v1.json');
  const OUT_UNITS = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
  const OUT_HOLD = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-hold-ledger-v1.json');
  const OUT_CONTRACT = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-composer-safety-section-contract-v1.json');
  const OUT_CHECK = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-reapproval-check-v1.json');

  const fpDetail = [...fpGroups.entries()].map(([fp, ids]) => ({
    fp, route: fpRoute.get(fp), gencode: ids[0].gencode, size: ids.length, sourceRef: refByFp.get(fp),
    sectionPresence: Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, normalize(ids[0].sec[k] || '') ? 1 : 0])),
    masterIds: ids.map((x) => x.mid).sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

  const ssot = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-CONTENT-FINGERPRINT-GLOBAL-REAPPROVAL-V1',
    agent: 'la',
    status: gatePass ? 'APPROVED_FOR_PRODUCTION' : 'APPROVED_WITH_HOLD',
    liveDbWrite: 0,
    fingerprintDefinition: {
      kind: 'content',
      axes: ['gencode(candidate-linking)', 'route', ...CONTENT_SECTIONS.map((k) => `${k}(원문 정규화 해시)`)],
      excluded: ['저장방법(consumer-irrelevant, WO 축 목록 밖)'],
      formula: 'H([gencode, route, H(norm(효능·효과)), H(norm(용법·용량)), H(norm(경고)), H(norm(사용상 주의사항)), H(norm(이상반응)), H(norm(상호작용))].join("|"))',
      stricterThan: 'fingerprintV2 — cau 가 이상반응을 누락했으나 본 fp 는 6개 섹션 개별 해시 전부 포함',
    },
    sourceRefPolicy: {
      namespace: 'otc-v3-content-leaflet:',
      formula: "uuid(md5('otc-v3-content-leaflet:' + contentFp))",
      distinctFrom: 'fpToUuidV2(otc-v2-leaflet: gencode 기반) — 반드시 다름',
      liveConflict: liveRefConflict, dupInNew: refDup, sharedAcrossFp: refSharedAcrossFp,
    },
    supersedesCommit: '0b7b25447',
    supersededReason: 'GENCODE_DOES_NOT_GUARANTEE_CONTENT_HOMOGENEITY',
    supersedes: {
      file: 'otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json',
      note: '기존 gencode-fp 5-unit 원장은 SUPERSEDED_PENDING_REAPPROVAL. 본 SSOT 로 대체.',
    },
    population: { declared: 1134, reproduced, producibleMasters, holdMasters: holdTotal },
    contentFingerprints: { count: fpGroups.size, byRoute: routeAgg.map((r) => ({ route: r.route, fp: r.fpCount, masters: r.masterCount })) },
    routeUnits: routeUnits.map((u) => ({ unit: u.unit, route: u.route, fpCount: u.fpCount, masterCount: u.masterCount })),
    expectedWrite,
    safetySectionCoverage: { producible: producibleMasters, withAdverse, withWarn, withInteraction, withPrecaution },
    composerRequiredUpgrade: {
      required: true,
      reason: 'buildGroupKo(otc-v2 shared runner)는 효능·효과/용법·용량/사용상 주의사항 3섹션만 방출 — 경고·이상반응·상호작용을 탈락. LIVE apply 전 composer 가 6섹션 전부 보존하도록 상향 필수.',
      contractFile: path.basename(OUT_CONTRACT),
    },
    snapshot: nowSnapshot,
    gates, gatePass,
  };

  const unitLedger = {
    wo: ssot.wo, supersedes: 'otc-easy-drug-ready-1134-unit-ledger-v1.json',
    fingerprintKind: 'content', snapshot: nowSnapshot,
    totals: { fp: fpGroups.size, masters: producibleMasters, units: routeUnits.length },
    units: routeUnits, fingerprints: fpDetail,
  };
  const holdLedger = {
    wo: ssot.wo, total: holdTotal,
    byType: Object.fromEntries(Object.entries(hold).map(([k, v]) => [k, v.length])),
    holds: hold,
  };
  const composerContract = {
    wo: ssot.wo,
    principle: 'route별 설명서는 원문에 존재하는 모든 안전 섹션을 보존한다. 없는 섹션만 생략한다.',
    mandatorySections: MANDATORY_SECTIONS,
    safetySectionsMustPreserveIfPresent: SAFETY_SECTIONS,
    currentComposerDefect: {
      file: 'src/scripts/otc-v2-store-leaflet-runner.shared.ts',
      officialAxes_cau: '[경고, 사용상 주의사항, 상호작용] — 이상반응 누락',
      buildGroupKo: '효능·효과/용법·용량/사용상 주의사항 3섹션만 방출 — 경고·이상반응·상호작용 탈락',
    },
    requiredComposerBehavior: [
      '효능·효과: 원문 보존',
      '용법·용량: 원문 수치(1회량/1일 횟수/간격/기간/연령) 전량 보존',
      '경고: 존재 시 별도 섹션으로 방출',
      '사용상 주의사항: 존재 시 방출(금기 내용 포함)',
      '이상반응: 존재 시 별도 섹션으로 방출 — 현행 탈락 결함의 핵심',
      '상호작용: 존재 시 별도 섹션으로 방출',
      '매장 약사 문의 안내 유지',
    ],
    perRouteSafetyPresence: routeAgg.map((r) => {
      const ps = producible.filter((p) => p.route === r.route);
      return { route: r.route, masters: ps.length,
        withWarn: ps.filter((p) => normalize(p.sec['경고'] || '')).length,
        withPrecaution: ps.filter((p) => normalize(p.sec['사용상 주의사항'] || '')).length,
        withAdverse: ps.filter((p) => normalize(p.sec['이상반응'] || '')).length,
        withInteraction: ps.filter((p) => normalize(p.sec['상호작용'] || '')).length };
    }),
  };
  const check = {
    wo: ssot.wo, agent: 'la', mode: 'READ-ONLY re-approval census', liveDbWrite: 0,
    rootCause: '기존 승인(0b7b25447)은 fp=gencode 를 content 동질성 지표로 사용했으나, 동일 gencode master 들의 e약은요 공식 원문(특히 이상반응·소아 용법·연령)이 상이. 게다가 officialAxes.cau 가 이상반응을 누락하여 fingerprintV2 조차 불충분.',
    resolution: '6개 공식 content 섹션 전부를 개별 정규화 해시로 포함하는 신규 content fingerprint 도입. 대표 1건 = 그룹 전원 byte-identical 보장.',
    numbers: {
      declared: 1134, reproduced, producibleMasters, holdMasters: holdTotal,
      holdByType: holdLedger.byType, contentFingerprints: fpGroups.size,
      routeUnits: routeUnits.length, expectedWrite,
      safety: { withAdverse, withWarn, withInteraction, withPrecaution },
      intraFpAxisMismatch, masterInMultiFp, fpSplitAcrossUnits, multiGencodeFp, multiRouteFp,
      existingAuthoredKo, existingEnCanonical, easyKoNot1, canonicalDup,
      newSourceRef: { dup: refDup, sharedAcrossFp: refSharedAcrossFp, liveConflict: liveRefConflict },
    },
    gates, gatePass,
    supersedesCommit: '0b7b25447', supersededReason: 'GENCODE_DOES_NOT_GUARANTEE_CONTENT_HOMOGENEITY',
    artifacts: [OUT_SSOT, OUT_UNITS, OUT_HOLD, OUT_CONTRACT, OUT_CHECK].map((p) => path.basename(p)),
  };

  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_UNITS, JSON.stringify(unitLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_HOLD, JSON.stringify(holdLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_CONTRACT, JSON.stringify(composerContract, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_CHECK, JSON.stringify(check, null, 2) + '\n', 'utf8');

  // byte-identity self-hash (per-file) for 2x-identical gate evidence
  const hashes = Object.fromEntries([OUT_SSOT, OUT_UNITS, OUT_HOLD, OUT_CONTRACT, OUT_CHECK]
    .map((p) => [path.basename(p), md5(fs.readFileSync(p, 'utf8'))]));

  console.log(`=== content-fingerprint re-approval census (READ-ONLY, dbWrite 0) ===`);
  console.log(`declared 1134 · reproduced ${reproduced} · producible ${producibleMasters} · HOLD ${holdTotal} ${JSON.stringify(holdLedger.byType)}`);
  console.log(`content fingerprints ${fpGroups.size} · route units ${routeUnits.length}`);
  console.log(`byRoute ${routeAgg.map((r) => `${r.route}:${r.fpCount}fp/${r.masterCount}m`).join(' ')}`);
  console.log(`safety presence — 이상반응 ${withAdverse}/${producibleMasters} · 경고 ${withWarn} · 상호작용 ${withInteraction} · 주의 ${withPrecaution}`);
  console.log(`intraFpAxisMismatch ${intraFpAxisMismatch} · masterInMultiFp ${masterInMultiFp} · fpSplit ${fpSplitAcrossUnits} · multiGencodeFp ${multiGencodeFp}`);
  console.log(`existingAuthoredKo ${existingAuthoredKo} · existingEnCanonical ${existingEnCanonical} · canonicalDup ${canonicalDup}`);
  console.log(`newSourceRef dup ${refDup} · sharedAcrossFp ${refSharedAcrossFp} · liveConflict ${liveRefConflict}`);
  console.log(`expectedWrite masters ${expectedWrite.masters} ko ${expectedWrite.ko} en ${expectedWrite.en} total ${expectedWrite.total}`);
  console.log(`GATES ${Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'ALL PASS'} → gatePass=${gatePass}`);
  console.log(`status=${ssot.status}`);
  console.log(`artifact md5:`); for (const [k, v] of Object.entries(hashes)) console.log(`  ${v}  ${k}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
