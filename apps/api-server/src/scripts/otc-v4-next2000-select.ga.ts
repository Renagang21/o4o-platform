/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — 2단계: 다음 2,000 master 자동 선정 + LIVE preflight (에이전트 가, READ-ONLY)
 *
 * 별도 Queue WO 를 만들지 않는다. pilot 500 종료 시점의 LIVE DB 에서 결정론적으로 선정한다.
 *
 * 모집단: agent-la 확립 분류 원장을 재사용한다(재도출 금지 — 분모 정의 발산 방지).
 *   ga-ready 2,496 ∪ na-exception 1,047 = 3,543   (exclude-ledger 266 은 제외 집합)
 *   − pilot 100 전체 100 − pilot 500 전체 500 = 2,943 후보
 *
 * 그 위에 LIVE 실측 제외를 적용한다:
 *   완료 master(authored KO/EN canonical 보유) · easy ko canonical ≠ 1 · V4 sourceRef 점유 · 전문의약품
 *
 * identity 판정은 정정 기준 V2 를 쓴다(gencodeCount>=2 단독은 예외 아님).
 *
 * ⚠️ DB write 0. la 원장 수정 0. 2회 실행 byte-identical.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-next2000-select.ga.ts --port 5503 [--target 2000]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR, md5, sixSectionsRaw, CONTENT_SECTIONS, MANDATORY_SECTIONS,
  masterRefV4, resolveRouteForMaster, connect, fetchMasterLive, normalize,
} from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500 } from './otc-v4-pilot-500-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const OUT_PREP = P('otc-v4-next2000-prep.ga.json');
const OUT_SOURCE = P('otc-v4-next2000-source.ga.json');
const OUT_LEDGER = P('otc-v4-next2000-selection-ledger.ga.json');

const BATCH_ID = 'otc-v4-next2000';
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const TARGET = parseInt(arg('--target') || '2000', 10);
/** oral 편중 완화 — 선정 상한 50%. */
const ORAL_CAP_RATIO = 0.5;

interface PoolRow { mid: string; name: string; baselineHold: string; queue: 'ga' | 'na'; code?: string | null }

function loadPool(): PoolRow[] {
  const ga = J('otc-easy-drug-remaining-3809-agent-ga-ready-queue-v1.json').masters as any[];
  const na = J('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json').masters as any[];
  const rows: PoolRow[] = [
    ...ga.map((m) => ({ mid: m.mid, name: m.name, baselineHold: m.baselineHold, queue: 'ga' as const, code: null })),
    ...na.map((m) => ({ mid: m.mid, name: m.name, baselineHold: m.baselineHold, queue: 'na' as const, code: m.code ?? null })),
  ];
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.mid) ? false : (seen.add(r.mid), true)))
    .sort((a, b) => (a.mid < b.mid ? -1 : a.mid > b.mid ? 1 : 0));
}

async function main(): Promise<void> {
  const pool0 = loadPool();
  const p100 = new Set<string>(J('otc-easy-drug-remaining-pilot-100-ledger-v1.json').masters.map((m: any) => m.masterId));
  const p500 = new Set<string>(J('otc-easy-drug-remaining-pilot-500-ledger-v1.json').masters.map((m: any) => m.masterId));
  const excl = new Set<string>(J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid));

  const candidates = pool0.filter((r) => !p100.has(r.mid) && !p500.has(r.mid) && !excl.has(r.mid));
  const db = await connect();
  const stop: string[] = [];
  try {
    const ids = candidates.map((c) => c.mid);
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
    // 품목기준코드 — fetchMasterLive 는 반환하지 않으므로(동결 계약 미수정) 여기서 직접 조회한다.
    const permitRows = await db.query(
      `SELECT product_master_id::text mid,
              array_remove(array_agg(DISTINCT NULLIF(identifier_value,'')), NULL) codes
         FROM product_identifiers
        WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL AND product_master_id = ANY($1::uuid[])
        GROUP BY 1`, [ids]);
    const permitBy = new Map(permitRows.map((r: any) => [r.mid, (r.codes || []).filter(Boolean).slice().sort()]));

    const rows: any[] = [];
    const srcDump: Record<string, Record<string, string>> = {};
    const dropped: Record<string, number> = {};
    const drop = (k: string) => { dropped[k] = (dropped[k] || 0) + 1; };

    for (const c of candidates) {
      const lv = live.get(c.mid);
      const content = lv?.easyContent ?? null;
      const slot = lv?.slot ?? { easyKoCanon: 0, authoredKoCanon: 0, authoredKoAny: 0, enCanon: 0 };
      const ref = masterRefV4(c.mid);
      const refOcc = (refBy.get(ref) as number) || 0;
      const classKinds = lv?.classKinds ?? [];
      const professional = classKinds.some((k) => normalize(k).includes('전문'));

      // ── LIVE 실측 제외 (선정 대상에서 아예 뺀다) ────────────────────────────────
      if (slot.authoredKoCanon > 0 || slot.authoredKoAny > 0 || slot.enCanon > 0) { drop('ALREADY_COMPLETED_OR_OCCUPIED'); continue; }
      if (slot.easyKoCanon !== 1) { drop('EASY_CANONICAL_NOT_1'); continue; }
      if (refOcc > 0) { drop('SOURCEREF_OCCUPIED'); continue; }
      if (professional) { drop('PROFESSIONAL_USE'); continue; }
      if (!content) { drop('NO_OFFICIAL_SOURCE'); continue; }

      const sec = sixSectionsRaw(content);
      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0])) as Record<string, 0 | 1>;
      const gencode = lv && lv.gencodes.length === 1 ? lv.gencodes[0] : null;
      const gencodeCount = lv ? lv.gencodes.length : 0;
      const rr = resolveRouteForMaster(gencode, gencodeCount, sec['용법·용량'] || '');
      const srcHashCount = (hashCountBy.get(c.mid) as number) || 1;
      const permitCodes = (permitBy.get(c.mid) as string[]) ?? [];
      const permitCode = permitCodes.length === 1 ? permitCodes[0] : null;
      const permitCodeCount = permitCodes.length;

      // ── 제품별 사전 예외 (pilot 500 우선순위 고정 · identity 정정 기준 V2) ──────
      let code: string | null = null, detail: string | null = null;
      if (permitCodeCount === 0) { code = 'IDENTITY_MISSING'; detail = '품목기준코드 부재'; }
      else if (permitCodeCount > 1) { code = 'IDENTITY_CONFLICT'; detail = `품목기준코드 ${permitCodeCount}건 다중 연결`; }
      else if (srcHashCount > 1) { code = 'IDENTITY_CONFLICT'; detail = `공식 원문 hash ${srcHashCount}종 다중 연결`; }
      else if (!sec[MANDATORY_SECTIONS[0]]) { code = 'SOURCE_EFFICACY_MISSING'; detail = '공식 원문 효능·효과 섹션 부재'; }
      else if (!sec[MANDATORY_SECTIONS[1]]) { code = 'SOURCE_DOSAGE_MISSING'; detail = '공식 원문 용법·용량 섹션 부재'; }
      else if (rr.exceptionCode) { code = rr.exceptionCode; detail = rr.detail; }

      rows.push({
        masterId: c.mid,
        productName: lv?.productName ?? c.name,
        ledgerProductName: c.name,
        permitCode, permitCodeCount,
        stratum: code === null ? 'A_NORMAL' : (code.startsWith('SOURCE_') ? 'C_SOURCE_COMPOSER' : 'B_BOUNDARY'),
        sourceHoldClass: c.baselineHold,
        laQueue: c.queue, laExceptionCode: c.code ?? null,
        officialSourceHash: md5(content),
        officialSourceHashCount: srcHashCount,
        officialSectionPresence: presence,
        officialSectionCount: Object.values(presence).filter((v) => v === 1).length,
        gencode, gencodeCount,
        route: rr.route, routeSource: rr.source, routeFamilies: rr.families,
        classKinds, professionalSuspect: professional,
        slot, plannedSourceRef: ref, sourceRefLiveOccupancy: refOcc, auditRows: 0,
        preExceptionCode: code, preExceptionDetail: detail,
        expectedStatus: code === null ? 'PRODUCE_EXPECTED' : 'PRE_EXCEPTION_EXPECTED',
        expectedExceptionCode: code,
        producible: code === null,
      });
      srcDump[c.mid] = sec;
    }

    // ── 선정: 정상 생산 후보 우선 · oral 편중 완화 · masterId 결정 정렬 ──────────
    const byMid = (a: any, b: any) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0);
    const prod = rows.filter((r) => r.producible);
    const nonProd = rows.filter((r) => !r.producible);
    const oral = prod.filter((r) => r.route === 'oral').sort(byMid);
    const nonOral = prod.filter((r) => r.route !== 'oral').sort((a, b) => (a.route === b.route ? byMid(a, b) : (a.route < b.route ? -1 : 1)));
    const maxOral = Math.floor(TARGET * ORAL_CAP_RATIO);

    const selected: any[] = [];
    for (const r of nonOral) { if (selected.length >= TARGET) break; selected.push(r); }
    let oralTaken = 0;
    for (const r of oral) { if (selected.length >= TARGET || oralTaken >= maxOral) break; selected.push(r); oralTaken++; }
    // 목표 미달 시 예외 격리 시험 대상으로 비생산 후보를 결정론적으로 채운다(WO §4 허용).
    const fillFrom = nonProd.sort((a, b) => (a.expectedExceptionCode === b.expectedExceptionCode ? byMid(a, b) : (a.expectedExceptionCode < b.expectedExceptionCode ? -1 : 1)));
    let filled = 0;
    for (const r of fillFrom) { if (selected.length >= TARGET) break; selected.push(r); filled++; }
    // 그래도 미달이면 oral 상한을 해제해 잔여 전량을 채운다(가능한 최대).
    let oralOverflow = 0;
    if (selected.length < TARGET) {
      for (const r of oral.slice(oralTaken)) { if (selected.length >= TARGET) break; selected.push(r); oralOverflow++; }
    }
    selected.sort(byMid);

    // ── 게이트 ────────────────────────────────────────────────────────────────
    const selIds = selected.map((r) => r.masterId);
    if (new Set(selIds).size !== selIds.length) stop.push('선정 master 중복');
    for (const r of selected) if (r.plannedSourceRef !== masterRefV4(r.masterId)) stop.push(`${r.masterId} sourceRef 산식 불일치`);
    if (selIds.some((id) => p100.has(id))) stop.push('pilot 100 교집합');
    if (selIds.some((id) => p500.has(id))) stop.push('pilot 500 교집합');
    if (selIds.some((id) => excl.has(id))) stop.push('EXCLUDE 교집합');
    if (new Set(selected.map((r) => r.plannedSourceRef)).size !== selected.length) stop.push('sourceRef 내부 중복');

    const byRoute: Record<string, number> = {};
    for (const r of selected) byRoute[r.route || 'null'] = (byRoute[r.route || 'null'] || 0) + 1;
    const byStratum: Record<string, number> = {};
    for (const r of selected) byStratum[r.stratum] = (byStratum[r.stratum] || 0) + 1;
    const byExpected: Record<string, number> = {};
    for (const r of selected) { const k = r.expectedExceptionCode || 'PRODUCE'; byExpected[k] = (byExpected[k] || 0) + 1; }

    const summary = {
      wo: WO_500, agent: 'ga', batchId: BATCH_ID, mode: 'READ-ONLY selection + preflight', liveDbWrite: 0,
      identityCriteria: 'V2 (permitCodeCount>=2 또는 공식 원문 hash 다중. gencodeCount 단독 제외)',
      populationBasis: 'agent-la 분류 원장 재사용 (ga-ready 2496 ∪ na-exception 1047, exclude 266 제외)',
      poolAfterLedgerExclusion: candidates.length,
      liveDropped: dropped,
      eligible: rows.length,
      producible: prod.length, nonProducible: nonProd.length,
      target: TARGET, selected: selected.length,
      shortfall: TARGET - selected.length,
      shortfallReason: selected.length < TARGET ? '잔여 적격 모집단이 목표보다 작음 — 가능한 전량 선정' : null,
      oralCap: maxOral, oralTaken, oralOverflow, filledWithPreException: filled,
      byRoute, byStratum, byExpectedOutcome: byExpected,
      systemStop: stop,
    };

    fs.writeFileSync(OUT_PREP, JSON.stringify({ ...summary, rows: selected }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_SOURCE, JSON.stringify(Object.fromEntries(selIds.map((id) => [id, srcDump[id]])), null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_LEDGER, JSON.stringify({
      ...summary,
      masters: selected.map((r) => ({
        masterId: r.masterId, permitCode: r.permitCode, permitCodeCount: r.permitCodeCount,
        productName: r.productName, stratum: r.stratum, sourceHoldClass: r.sourceHoldClass,
        laQueue: r.laQueue, laExceptionCode: r.laExceptionCode,
        gencode: r.gencode, gencodeCount: r.gencodeCount,
        candidateRoute: r.route, candidateRouteSource: r.routeSource,
        officialSourceHash: r.officialSourceHash, officialSectionPresence: r.officialSectionPresence,
        officialSectionCount: r.officialSectionCount,
        plannedSourceRef: r.plannedSourceRef, sourceRef: r.plannedSourceRef, sourceRefOccupied: r.sourceRefLiveOccupancy,
        expectedStatus: r.expectedStatus, expectedExceptionCode: r.expectedExceptionCode,
        dosageForm: null, specification: null, atcCode: null,
        professionalSuspect: r.professionalSuspect, professionalSuspectReason: null,
        classKinds: r.classKinds, strength: null, numericProfile: null, composerFeasibility: r.producible ? 'OK' : 'BLOCKED',
        existingAuthoredKoCanonical: r.slot.authoredKoCanon, existingEnCanonical: r.slot.enCanon,
        sourceRefLiveConflict: r.sourceRefLiveOccupancy, officialSourceLink: '', queue: 'agent-ga',
      })),
    }, null, 2) + '\n', 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
