/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal 14 + rectal 12 선정 + 입력 게이트 + LIVE preflight (에이전트 가, READ-ONLY)
 *
 * route535 선정기와 다른 점.
 *   1) 모집단이 carry-over 원장의 classification='REQUIRES_ROUTE_PROFILE' 26 으로 고정된다.
 *   2) route 를 재판정하지 않는다 — carry-over 의 resolvedRoute 승계(원판정 45b2f1add).
 *   3) COMPOSER_ROUTES 대신 **본 배치 전용 NR_ROUTES(nasal|rectal)** 로 검사한다.
 *      (이 26 은 정의상 COMPOSER_ROUTES 밖이며, 그것이 이월된 이유다.)
 *   4) unit 2개(nasal-unit-1 · rectal-unit-1)로 분리 산출한다.
 *   5) 인체 미적용(기구 멸균·소독) 탐지를 선정 단계에 넣는다 — route535 §4 후속 권고 반영.
 *
 * ⚠️ DB write 0. 673 판정·reconciliation·선행 GREEN 원장 수정 0. 2회 실행 byte-identical(runTag 고정 시).
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-nr26-select.ga.ts --port 5495 --run-tag NR26
 */
import fs from 'node:fs';
import {
  DATA_DIR, md5, sixSectionsRaw, CONTENT_SECTIONS, MANDATORY_SECTIONS,
  masterRefV4, connect, fetchMasterLive, normalize,
} from './otc-v4-master-leaflet-contract.ga.js';
import {
  WO_NR, BATCH_ID_NR, UNITS, CARRYOVER_LEDGER, TARGET_CLASSIFICATION,
  REENTRY_QUEUE_535, EXCLUDE_LEDGER, SOURCE_TERMINAL_LEDGER, WITHDRAW_NONHUMAN_LEDGER, P,
} from './otc-v4-nr26-contract.ga.js';
import { NR_ROUTE_PROFILE, FAMILY } from './otc-v4-nr26-profile.ga.js';

const J = (p: string): any => JSON.parse(fs.readFileSync(p, 'utf8'));
const OUT_PREP = P('otc-v4-nr26-prep.ga.json');
const OUT_SOURCE = P('otc-v4-nr26-source.ga.json');
const OUT_LEDGER = P('otc-v4-nr26-selection-ledger.ga.json');

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const RUN_TAG = arg('--run-tag') || 'NR26';

const NR_ROUTES = new Set(Object.keys(NR_ROUTE_PROFILE));

/** 인체 미적용 기구 멸균/소독제 탐지 — route535 에서 생산 이후에야 잡힌 유형. */
const NONHUMAN_RE = /멸균기|멸균\s*공정|산화에틸렌|에틸렌옥사이드|카트리지|기구\s*(소독|멸균)|의료기기\s*(소독|멸균)|기기에\s*장착/;

async function main(): Promise<void> {
  // ── 모집단: carry-over 원장에서 REQUIRES_ROUTE_PROFILE 만. 재도출·재판정 금지. ──────────
  const carry = J(CARRYOVER_LEDGER);
  const carryRows = (carry.masters || carry.rows) as any[];
  const candidates = carryRows
    .filter((r) => r.classification === TARGET_CLASSIFICATION)
    .slice().sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0));

  // ── 오염 대조군 ────────────────────────────────────────────────────────────────────
  const excl = new Set<string>(J(EXCLUDE_LEDGER).masters.map((m: any) => m.mid));
  const srcTerminal = new Set<string>(J(SOURCE_TERMINAL_LEDGER).masters
    .filter((m: any) => m.code === 'SOURCE_EFFICACY_MISSING').map((m: any) => m.mid));
  const reentry535 = new Set<string>((J(REENTRY_QUEUE_535).masters as any[]).map((m) => m.masterId));
  const withdrawn = new Set<string>(fs.existsSync(WITHDRAW_NONHUMAN_LEDGER)
    ? (J(WITHDRAW_NONHUMAN_LEDGER).rows as any[]).map((r) => r.masterId) : []);
  const priorGreen = new Set<string>();
  for (const f of fs.readdirSync(DATA_DIR).filter((f) => /^otc-v4-.*green-ledger.*\.json$/.test(f)))
    for (const r of (J(P(f)).rows || [])) priorGreen.add(r.masterId);
  const priorGreenEffective = new Set([...priorGreen].filter((id) => !withdrawn.has(id)));

  const db = await connect();
  const stop: string[] = [];
  try {
    const ids = candidates.map((c) => c.masterId);
    const live = await fetchMasterLive(db, ids);
    const refs = ids.map(masterRefV4);
    const refRows = await db.query(
      `SELECT source_ref_id::text ref, count(*)::int n FROM shared_product_descriptions
        WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL GROUP BY 1`, [refs]);
    const refBy = new Map(refRows.map((r: any) => [r.ref, r.n]));
    const hashRows = await db.query(
      `SELECT master_id::text mid, count(DISTINCT md5(content))::int n FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
          AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL GROUP BY 1`, [ids]);
    const hashCountBy = new Map(hashRows.map((r: any) => [r.mid, r.n]));
    const permitRows = await db.query(
      `SELECT product_master_id::text mid,
              array_remove(array_agg(DISTINCT NULLIF(identifier_value,'')), NULL) codes
         FROM product_identifiers
        WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL AND product_master_id = ANY($1::uuid[])
        GROUP BY 1`, [ids]);
    const permitBy = new Map(permitRows.map((r: any) => [r.mid, (r.codes || []).filter(Boolean).slice().sort()]));
    // canonicalDup — 대상 master 의 STORE canonical 중복 여부(언어별 1 을 넘는가).
    const dupRows = await db.query(
      `SELECT master_id::text mid, COALESCE(language,'ko') lang, count(*)::int n
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1,2 HAVING count(*) > 1`, [ids]);

    const rows: any[] = [];
    const srcDump: Record<string, Record<string, string>> = {};
    const dropped: Record<string, number> = {};
    const excluded: Array<{ masterId: string; productName: string; reason: string; detail: string | null }> = [];
    const drop = (k: string, c: any, detail: string | null = null) => {
      dropped[k] = (dropped[k] || 0) + 1;
      excluded.push({ masterId: c.masterId, productName: c.productName, reason: k, detail });
    };

    for (const c of candidates) {
      const lv = live.get(c.masterId);
      const content = lv?.easyContent ?? null;
      const slot = lv?.slot ?? { easyKoCanon: 0, authoredKoCanon: 0, authoredKoAny: 0, enCanon: 0 };
      const ref = masterRefV4(c.masterId);
      const refOcc = (refBy.get(ref) as number) || 0;
      const classKinds = lv?.classKinds ?? [];
      const professional = classKinds.some((k) => normalize(k).includes('전문'));

      if (excl.has(c.masterId)) { drop('CONTAMINATION_EXCLUDE', c); continue; }
      if (srcTerminal.has(c.masterId)) { drop('CONTAMINATION_SOURCE_TERMINAL', c); continue; }
      if (priorGreenEffective.has(c.masterId)) { drop('CONTAMINATION_PRIOR_GREEN', c); continue; }
      if (reentry535.has(c.masterId)) { drop('CONTAMINATION_REENTRY_535', c); continue; }
      if (withdrawn.has(c.masterId)) { drop('CONTAMINATION_WITHDRAWN_NONHUMAN', c); continue; }

      if (slot.authoredKoCanon > 0 || slot.authoredKoAny > 0 || slot.enCanon > 0) { drop('ALREADY_COMPLETED_OR_OCCUPIED', c); continue; }
      if (slot.easyKoCanon !== 1) { drop('EASY_CANONICAL_NOT_1', c, `easyKoCanon=${slot.easyKoCanon}`); continue; }
      if (refOcc > 0) { drop('SOURCEREF_OCCUPIED', c, `${refOcc}행`); continue; }
      if (professional) { drop('PROFESSIONAL_USE', c, classKinds.join('/')); continue; }
      if (!content) { drop('NO_OFFICIAL_SOURCE', c); continue; }

      const sec = sixSectionsRaw(content);
      const permitCodes = (permitBy.get(c.masterId) as string[]) ?? [];
      const srcHashCount = (hashCountBy.get(c.masterId) as number) || 1;
      const gencode = lv && lv.gencodes.length === 1 ? lv.gencodes[0] : null;
      const gencodeCount = lv ? lv.gencodes.length : 0;

      if (permitCodes.length === 0) { drop('IDENTITY_MISSING', c); continue; }
      if (permitCodes.length > 1) { drop('IDENTITY_CONFLICT', c, `품목기준코드 ${permitCodes.length}건`); continue; }
      if (srcHashCount > 1) { drop('IDENTITY_CONFLICT', c, `공식 원문 hash ${srcHashCount}종`); continue; }
      if (!sec[MANDATORY_SECTIONS[0]]) { drop('SOURCE_EFFICACY_MISSING', c); continue; }
      if (!sec[MANDATORY_SECTIONS[1]]) { drop('SOURCE_DOSAGE_MISSING', c); continue; }
      if (NONHUMAN_RE.test(sec[MANDATORY_SECTIONS[1]]) || NONHUMAN_RE.test(sec[MANDATORY_SECTIONS[0]])) {
        drop('NON_HUMAN_DEVICE_STERILANT', c, '용법/효능에 기구 멸균·소독 표현');
        stop.push(`${c.masterId} 비인체 적용 제품 의심 — §15 중지 조건`);
        continue;
      }
      // route 는 재판정하지 않는다. 본 배치 지원 범위인지만 확인한다.
      if (!NR_ROUTES.has(c.resolvedRoute)) { drop('ROUTE_OUT_OF_BATCH_SCOPE', c, c.resolvedRoute); continue; }

      // 공식 원문 자기 경로 마커 — 없으면 창작 금지 대상이므로 선정에서 뺀다.
      // 대조 범위는 6섹션 전체다. 공식 원문은 경로 표현을 용법에만 두지 않는다
      // (나자린플러스: 용법 "…뿌립니다" · 비강 표현은 효능·주의 섹션).
      const allText = CONTENT_SECTIONS.map((k) => sec[k]).join('\n');
      const ownRe = c.resolvedRoute === 'nasal' ? FAMILY.nasal.ko : /직장|항문|좌제|좌약|관장/;
      const ownInUsage = ownRe.test(sec[MANDATORY_SECTIONS[1]]);
      if (!ownRe.test(allText)) { drop('ROUTE_MARKER_ABSENT_IN_SOURCE', c, '공식 원문 전체에 자기 경로 표현 없음'); continue; }

      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0])) as Record<string, 0 | 1>;
      rows.push({
        masterId: c.masterId,
        unit: UNITS[c.resolvedRoute as 'nasal' | 'rectal'].unit,
        productName: lv?.productName ?? c.productName,
        ledgerProductName: c.productName,
        permitCode: permitCodes[0], permitCodeCount: permitCodes.length,
        stratum: 'E_ROUTE_PROFILE_NEW',
        sourceHoldClass: 'HOLD_ROUTE',
        laQueue: 'na',
        officialSourceHash: md5(content),
        officialSourceHashCount: srcHashCount,
        officialSectionPresence: presence,
        officialSectionCount: Object.values(presence).filter((v) => v === 1).length,
        officialSectionHash: Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? md5(sec[k]) : ''])),
        gencode, gencodeCount,
        route: c.resolvedRoute,
        routeMarkerInOfficialUsage: ownInUsage,
        routeSource: 'route-673-adjudication(45b2f1add) → carryover reconciliation(7bf0b580a)',
        carryClassification: c.classification,
        composerSupportedByShared: c.composerSupported === true,
        classKinds, professionalSuspect: false,
        slot, plannedSourceRef: ref, sourceRefLiveOccupancy: refOcc, auditRows: 0,
        expectedStatus: 'PRE_APPLY_EXPECTED', expectedExceptionCode: null,
        producible: true,
      });
      srcDump[c.masterId] = sec;
    }

    const byMid = (a: any, b: any) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0);
    const selected = rows.slice().sort(byMid);
    const selIds = selected.map((r) => r.masterId);
    const byRoute: Record<string, number> = {};
    for (const r of selected) byRoute[r.route] = (byRoute[r.route] || 0) + 1;

    // ── §4 입력 게이트 ─────────────────────────────────────────────────────────────
    const gates: Array<{ id: string; gate: string; expect: string; actual: string | number; pass: boolean }> = [];
    const G = (id: string, gate: string, expect: string, actual: string | number, pass: boolean) =>
      gates.push({ id, gate, expect, actual, pass });

    G('IG-01', '모집단 총 26', '26', candidates.length, candidates.length === 26);
    G('IG-02', 'nasal 14', '14', byRoute.nasal || 0, (byRoute.nasal || 0) === UNITS.nasal.expected);
    G('IG-03', 'rectal 12', '12', byRoute.rectal || 0, (byRoute.rectal || 0) === UNITS.rectal.expected);
    G('IG-04', 'master 중복 0', '0', selIds.length - new Set(selIds).size, new Set(selIds).size === selIds.length);
    G('IG-05', '기존 GREEN 교집합 0', '0', selIds.filter((id) => priorGreenEffective.has(id)).length, !selIds.some((id) => priorGreenEffective.has(id)));
    G('IG-06', 'source terminal 24 교집합 0', '0', selIds.filter((id) => srcTerminal.has(id)).length, !selIds.some((id) => srcTerminal.has(id)));
    G('IG-07', '기구 멸균제(회수 3) 교집합 0', '0', selIds.filter((id) => withdrawn.has(id)).length, !selIds.some((id) => withdrawn.has(id)));
    G('IG-08', 'exclude 266 교집합 0', '0', selIds.filter((id) => excl.has(id)).length, !selIds.some((id) => excl.has(id)));
    G('IG-09', '재투입 큐 535 교집합 0', '0', selIds.filter((id) => reentry535.has(id)).length, !selIds.some((id) => reentry535.has(id)));
    G('IG-10', '전문의약품 혼입 0', '0', dropped.PROFESSIONAL_USE || 0, !selected.some((r) => r.classKinds.some((k: string) => normalize(k).includes('전문'))));
    G('IG-11', '기존 authored KO·EN canonical 0', '0',
      selected.reduce((n, r) => n + r.slot.authoredKoCanon + r.slot.authoredKoAny + r.slot.enCanon, 0),
      selected.every((r) => r.slot.authoredKoCanon === 0 && r.slot.authoredKoAny === 0 && r.slot.enCanon === 0));
    G('IG-12', '기존 V4 sourceRef 점유 0', '0', selected.reduce((n, r) => n + r.sourceRefLiveOccupancy, 0), selected.every((r) => r.sourceRefLiveOccupancy === 0));
    G('IG-13', 'sourceRef 내부 중복 0', '0', selected.length - new Set(selected.map((r) => r.plannedSourceRef)).size,
      new Set(selected.map((r) => r.plannedSourceRef)).size === selected.length);
    const routeMap = new Map(candidates.map((c) => [c.masterId, c.resolvedRoute]));
    const routeMismatch = selected.filter((r) => routeMap.get(r.masterId) !== r.route).length;
    G('IG-14', 'resolvedRoute 승계 일치', '0 불일치', routeMismatch, routeMismatch === 0);
    G('IG-15', '공식 원문 hash 단일(다중 원문 0)', '0', selected.filter((r) => r.officialSourceHashCount !== 1).length,
      selected.every((r) => r.officialSourceHashCount === 1));
    G('IG-16', 'canonicalDup 0', '0', dupRows.length, dupRows.length === 0);
    G('IG-17', '공식 OTC 분모 밖 0 (easy canonical 1 아님)', '0', dropped.EASY_CANONICAL_NOT_1 || 0, !(dropped.EASY_CANONICAL_NOT_1 > 0));
    G('IG-18', '비인체 적용 제품 0', '0', dropped.NON_HUMAN_DEVICE_STERILANT || 0, !(dropped.NON_HUMAN_DEVICE_STERILANT > 0));
    G('IG-19', '선정 = 26 (드롭 0)', '26', selected.length, selected.length === 26);

    for (const g of gates) if (!g.pass) stop.push(`${g.id} FAIL — ${g.gate} (실측 ${g.actual})`);
    for (const r of selected) if (r.plannedSourceRef !== masterRefV4(r.masterId)) stop.push(`${r.masterId} sourceRef 산식 불일치`);

    const summary = {
      wo: WO_NR, agent: 'ga', batchId: BATCH_ID_NR, mode: 'READ-ONLY selection + input gate + LIVE preflight',
      liveDbWrite: 0,
      routePolicy: '재판정 금지 — carry-over 원장(7bf0b580a)의 resolvedRoute 승계(원판정 45b2f1add).',
      populationBasis: `carry-over 138 중 classification='${TARGET_CLASSIFICATION}' ${candidates.length}`,
      units: Object.values(UNITS),
      poolAfterLedgerExclusion: candidates.length,
      liveDropped: dropped,
      selected: selected.length,
      byRoute,
      byUnit: Object.fromEntries(Object.values(UNITS).map((u) => [u.unit, selected.filter((r) => r.unit === u.unit).length])),
      inputGates: gates,
      inputGatePass: gates.every((g) => g.pass),
      hashDriftPolicy: 'carry-over 원장에 공식 원문 hash 가 없다. 본 선정에서 master 별 officialSourceHash·섹션별 hash 를 고정하고, 저작·실행·독립검증이 이 값과 대조해 drift 0 을 판정한다.',
      runTag: RUN_TAG,
      systemStop: stop,
    };

    fs.writeFileSync(OUT_PREP, JSON.stringify({ ...summary, rows: selected }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_SOURCE, JSON.stringify(Object.fromEntries(selIds.map((id) => [id, srcDump[id]])), null, 2) + '\n', 'utf8');
    const ledger = JSON.stringify({
      ...summary,
      excludedDetail: excluded.sort((a, b) => (a.reason === b.reason ? (a.masterId < b.masterId ? -1 : 1) : (a.reason < b.reason ? -1 : 1))),
      masters: selected.map((r) => ({
        masterId: r.masterId, unit: r.unit, route: r.route, permitCode: r.permitCode,
        productName: r.productName, stratum: r.stratum, sourceHoldClass: r.sourceHoldClass,
        gencode: r.gencode, gencodeCount: r.gencodeCount,
        candidateRoute: r.route, candidateRouteSource: r.routeSource,
        officialSourceHash: r.officialSourceHash, officialSectionHash: r.officialSectionHash,
        officialSectionPresence: r.officialSectionPresence, officialSectionCount: r.officialSectionCount,
        plannedSourceRef: r.plannedSourceRef, sourceRef: r.plannedSourceRef, sourceRefOccupied: r.sourceRefLiveOccupancy,
        expectedStatus: r.expectedStatus, classKinds: r.classKinds,
        existingAuthoredKoCanonical: r.slot.authoredKoCanon, existingEnCanonical: r.slot.enCanon,
        queue: 'agent-ga',
      })),
    }, null, 2) + '\n';
    fs.writeFileSync(OUT_LEDGER, ledger, 'utf8');
    const immutable = OUT_LEDGER.replace(/\.ga\.json$/, `.run-${RUN_TAG}.ga.json`);
    if (!fs.existsSync(immutable)) fs.writeFileSync(immutable, ledger, 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
