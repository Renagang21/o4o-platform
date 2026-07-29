/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1
 *   — pilot 100 제품별 사전조회 · 공식 원문 재검증 · route 확정 (에이전트 가, READ-ONLY)
 *
 * WO §5 1~5단계 구현:
 *   savepoint 이전 단계 = 현재 canonical/sourceRef/audit 재조회 → 공식 원문 6섹션 재조회 및
 *   hash 대조(불일치=SYS-01 중지) → identity snapshot → route 확정.
 *
 * ⚠️ DB write 0. 원장 파일 수정 0. 산출물은 신규 파일만 생성한다.
 *
 * 실행:
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-pilot-100-prep.ga.ts --port 5493
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  WO, QUEUE_WO, BATCH_ID, DATA_DIR, PILOT_LEDGER, md5, sixSectionsRaw,
  CONTENT_SECTIONS, MANDATORY_SECTIONS, masterRefV4, resolveRouteForMaster,
  loadPilot, connect, fetchMasterLive, normalize, AUTHORED_SOURCES,
} from './otc-v4-master-leaflet-contract.ga.js';

const OUT_PREP = path.join(DATA_DIR, 'otc-v4-pilot-100-prep.ga.json');
const OUT_SOURCE = path.join(DATA_DIR, 'otc-v4-pilot-100-source.ga.json');

interface PrepRow {
  masterId: string;
  productName: string | null;
  ledgerProductName: string;
  permitCode: string | null;
  permitCodeCount: number;
  stratum: string;
  sourceHoldClass: string;
  officialSourceHash: string | null;
  ledgerOfficialSourceHash: string | null;
  hashMatch: boolean;
  officialSectionPresence: Record<string, 0 | 1>;
  officialSectionCount: number;
  ledgerSectionCount: number;
  sectionCountMatch: boolean;
  gencode: string | null;
  gencodeCount: number;
  route: string | null;
  routeSource: string | null;
  routeFamilies: string[];
  classKinds: string[];
  professionalSuspect: boolean;
  slot: { easyKoCanon: number; authoredKoCanon: number; authoredKoAny: number; enCanon: number };
  plannedSourceRef: string;
  sourceRefLiveOccupancy: number;
  auditRows: number;
  preExceptionCode: string | null;
  preExceptionDetail: string | null;
  expectedStatus: string;
  expectedExceptionCode: string | null;
  producible: boolean;
}

async function main() {
  const pilot = loadPilot();
  const ids = pilot.map((p) => p.masterId);
  const db = await connect();
  const stop: string[] = [];
  try {
    const live = await fetchMasterLive(db, ids);

    // sourceRef LIVE 점유 (계획 sourceRef 가 이미 쓰이고 있는지)
    const refs = pilot.map((p) => p.plannedSourceRef);
    const refRows = await db.query(
      `SELECT source_ref_id::text ref, count(*)::int n
         FROM shared_product_descriptions
        WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL
        GROUP BY 1`, [refs]);
    const refBy = new Map(refRows.map((r: any) => [r.ref, r.n]));

    // 기존 audit row (본 WO namespace 로 이미 기록된 것이 있는지)
    const auditRows = await db.query(
      `SELECT master_id::text mid, count(*)::int n
         FROM shared_product_description_audit_logs
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE'
          AND metadata->>'sourceRefId' = ANY($2::text[])
        GROUP BY 1`, [ids, refs]);
    const auditBy = new Map(auditRows.map((r: any) => [r.mid, r.n]));

    const rows: PrepRow[] = [];
    const srcDump: Record<string, Record<string, string>> = {};

    for (const p of pilot) {
      const lv = live.get(p.masterId);
      const content = lv?.easyContent ?? null;
      const hash = content ? md5(content) : null;
      const sec = content ? sixSectionsRaw(content) : Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, '']));
      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0])) as Record<string, 0 | 1>;
      const secCount = Object.values(presence).filter((v) => v === 1).length;
      const hashMatch = hash === p.officialSourceHash;
      if (!hashMatch) stop.push(`SYS-01 ${p.masterId} officialSourceHash 불일치 (원장 ${p.officialSourceHash} / 실측 ${hash})`);

      const gencode = lv && lv.gencodes.length === 1 ? lv.gencodes[0] : p.gencode;
      const gencodeCount = lv ? lv.gencodes.length : p.gencodeCount;
      const rr = resolveRouteForMaster(gencode, gencodeCount, sec['용법·용량'] || '');

      // ── 제품별 사전 예외 판정 (우선순위 고정) ────────────────────────────────
      let code: string | null = null;
      let detail: string | null = null;
      const classKinds = lv?.classKinds ?? p.classKinds ?? [];
      const professional = p.professionalSuspect || classKinds.some((k) => normalize(k).includes('전문'));
      const refOcc = (refBy.get(p.plannedSourceRef) as number) || 0;
      const slot = lv?.slot ?? { easyKoCanon: 0, authoredKoCanon: 0, authoredKoAny: 0, enCanon: 0 };

      if (!content) { code = 'SOURCE_EFFICACY_MISSING'; detail = 'e약은요 ko canonical 원문 부재'; }
      else if (professional) { code = 'PROFESSIONAL_USE'; detail = p.professionalSuspectReason || `전문일반구분: ${classKinds.join('/')}`; }
      else if (!p.permitCode) { code = 'IDENTITY_MISSING'; detail = '품목기준코드 부재'; }
      else if (p.permitCodeCount > 1) { code = 'IDENTITY_CONFLICT'; detail = `품목기준코드 ${p.permitCodeCount}건 다중 연결`; }
      else if (!sec[MANDATORY_SECTIONS[0]]) { code = 'SOURCE_EFFICACY_MISSING'; detail = '공식 원문 효능·효과 섹션 부재'; }
      else if (!sec[MANDATORY_SECTIONS[1]]) { code = 'SOURCE_DOSAGE_MISSING'; detail = '공식 원문 용법·용량 섹션 부재'; }
      else if (rr.exceptionCode) { code = rr.exceptionCode; detail = rr.detail; }
      else if (slot.authoredKoCanon > 0 || slot.enCanon > 0 || slot.authoredKoAny > 0) {
        code = 'EXISTING_CANONICAL_CONFLICT';
        detail = `기존 authored ko canonical ${slot.authoredKoCanon} / any ${slot.authoredKoAny} / en canonical ${slot.enCanon}`;
      } else if (slot.easyKoCanon !== 1) {
        code = 'EXISTING_CANONICAL_CONFLICT'; detail = `easy ko canonical ${slot.easyKoCanon}건 (기대 1)`;
      } else if (refOcc > 0) { code = 'SOURCE_REF_CONFLICT'; detail = `plannedSourceRef LIVE 점유 ${refOcc}건`; }

      rows.push({
        masterId: p.masterId,
        productName: lv?.productName ?? null,
        ledgerProductName: p.productName,
        permitCode: p.permitCode,
        permitCodeCount: p.permitCodeCount,
        stratum: p.stratum,
        sourceHoldClass: p.sourceHoldClass,
        officialSourceHash: hash,
        ledgerOfficialSourceHash: p.officialSourceHash,
        hashMatch,
        officialSectionPresence: presence,
        officialSectionCount: secCount,
        ledgerSectionCount: p.officialSectionCount,
        sectionCountMatch: secCount === p.officialSectionCount,
        gencode, gencodeCount,
        route: rr.route, routeSource: rr.source, routeFamilies: rr.families,
        classKinds,
        professionalSuspect: professional,
        slot,
        plannedSourceRef: p.plannedSourceRef,
        sourceRefLiveOccupancy: refOcc,
        auditRows: (auditBy.get(p.masterId) as number) || 0,
        preExceptionCode: code,
        preExceptionDetail: detail,
        expectedStatus: p.expectedStatus,
        expectedExceptionCode: p.expectedExceptionCode,
        producible: code === null,
      });
      if (content) srcDump[p.masterId] = sec;
    }

    // sourceRef 유일성 (pilot 내부)
    const refSet = new Set(rows.map((r) => r.plannedSourceRef));
    if (refSet.size !== rows.length) stop.push(`SYS-04 sourceRef pilot 내 중복 — unique ${refSet.size}/${rows.length}`);
    if (rows.filter((r) => r.preExceptionCode === 'SOURCE_REF_CONFLICT').length >= 2) stop.push('SYS-04 SOURCE_REF_CONFLICT 누적 ≥ 2');
    for (const r of rows) if (r.plannedSourceRef !== masterRefV4(r.masterId)) stop.push(`SYS-04 ${r.masterId} sourceRef 산식 불일치`);

    const byCode: Record<string, number> = {};
    for (const r of rows) { const k = r.preExceptionCode || 'PRODUCIBLE'; byCode[k] = (byCode[k] || 0) + 1; }
    const byRoute: Record<string, number> = {};
    for (const r of rows.filter((x) => x.producible)) { const k = r.route || 'null'; byRoute[k] = (byRoute[k] || 0) + 1; }
    const byStratum: Record<string, { total: number; producible: number }> = {};
    for (const r of rows) {
      byStratum[r.stratum] = byStratum[r.stratum] || { total: 0, producible: 0 };
      byStratum[r.stratum].total++;
      if (r.producible) byStratum[r.stratum].producible++;
    }

    const summary = {
      wo: WO, queueWo: QUEUE_WO, batchId: BATCH_ID,
      mode: 'READ-ONLY prep', liveDbWrite: 0,
      total: rows.length,
      producible: rows.filter((r) => r.producible).length,
      preException: rows.filter((r) => !r.producible).length,
      hashMismatch: rows.filter((r) => !r.hashMatch).length,
      sectionCountMismatch: rows.filter((r) => !r.sectionCountMatch).length,
      byPreExceptionCode: byCode,
      byRouteProducible: byRoute,
      byStratum,
      ledgerExpectedVsActual: {
        ledgerProduceExpected: rows.filter((r) => r.expectedStatus === 'PRODUCE_EXPECTED').length,
        actualProducible: rows.filter((r) => r.producible).length,
        expectedProduceButBlocked: rows.filter((r) => r.expectedStatus === 'PRODUCE_EXPECTED' && !r.producible)
          .map((r) => ({ masterId: r.masterId, code: r.preExceptionCode, detail: r.preExceptionDetail })),
        expectedExceptionButProducible: rows.filter((r) => r.expectedStatus !== 'PRODUCE_EXPECTED' && r.producible)
          .map((r) => ({ masterId: r.masterId, ledgerExpected: r.expectedExceptionCode, route: r.route })),
      },
      systemStop: stop,
    };

    fs.writeFileSync(OUT_PREP, JSON.stringify({ ...summary, rows }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_SOURCE, JSON.stringify(srcDump, null, 2) + '\n', 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally {
    await db.destroy();
  }
}
void AUTHORED_SOURCES;
main().catch((e) => { console.error(e); process.exit(1); });
