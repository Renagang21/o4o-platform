/**
 * WO-O4O-OTC-EASY-DRUG-V4-REMAINING-NORMAL-ALL-FINAL-PRODUCTION-V1
 *   — 정상 생산 가능 잔여 **전량** 선정 + LIVE preflight (에이전트 가, READ-ONLY)
 *
 * next2000 선정기와 다른 점:
 *   1) 목표 수량 상한이 없다 — **정상 생산 가능 master 전량**을 선정한다.
 *   2) oral 편중 상한을 적용하지 않는다(전량 생산이므로 표본 균형 개념이 없다).
 *   3) 사전 예외 master 로 빈자리를 채우지 않는다 — route 확정 불가·원문 결손은 선정에서 제외하고
 *      누적 예외 원장(agent-na) 쪽으로 남긴다.
 *   4) 선정 원장을 **run 별 불변 파일**로 함께 동결한다.
 *
 * 모집단: agent-la 확립 분류 원장 재사용(재도출 금지)
 *   ga-ready 2,496 ∪ na-exception 1,047
 *   − pilot100 100 − pilot500 500 − next2000 2,000 − exclude 266 − 누적 예외 원장 142
 *
 * ⚠️ DB write 0. la 원장·선행 배치 원장 수정 0. 2회 실행 byte-identical.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-finalall-select.ga.ts --port 5504
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR, md5, sixSectionsRaw, CONTENT_SECTIONS, MANDATORY_SECTIONS,
  masterRefV4, resolveRouteForMaster, connect, fetchMasterLive, normalize,
} from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500, BATCH_ID_500 } from './otc-v4-finalall-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const OUT_PREP = P('otc-v4-finalall-prep.ga.json');
const OUT_SOURCE = P('otc-v4-finalall-source.ga.json');
const OUT_LEDGER = P('otc-v4-finalall-selection-ledger.ga.json');

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
/** 상한 없음이 기본. 진단용으로만 --limit 을 준다. */
const LIMIT = arg('--limit') ? parseInt(arg('--limit')!, 10) : Infinity;
/** 선정 원장 동결 시각 — run 별 불변 파일명에 쓰며, 재현성을 위해 인자로 고정할 수 있다. */
const RUN_TAG = arg('--run-tag') || new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');

interface PoolRow { mid: string; name: string; baselineHold: string; queue: 'ga' | 'na' }

function loadPool(): PoolRow[] {
  const ga = J('otc-easy-drug-remaining-3809-agent-ga-ready-queue-v1.json').masters as any[];
  const na = J('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json').masters as any[];
  const rows: PoolRow[] = [
    ...ga.map((m) => ({ mid: m.mid, name: m.name, baselineHold: m.baselineHold, queue: 'ga' as const })),
    ...na.map((m) => ({ mid: m.mid, name: m.name, baselineHold: m.baselineHold, queue: 'na' as const })),
  ];
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.mid) ? false : (seen.add(r.mid), true)))
    .sort((a, b) => (a.mid < b.mid ? -1 : a.mid > b.mid ? 1 : 0));
}

async function main(): Promise<void> {
  const pool0 = loadPool();
  const prior = new Set<string>([
    ...J('otc-easy-drug-remaining-pilot-100-ledger-v1.json').masters.map((m: any) => m.masterId),
    ...J('otc-easy-drug-remaining-pilot-500-ledger-v1.json').masters.map((m: any) => m.masterId),
    ...J('otc-v4-next2000-selection-ledger.ga.json').masters.map((m: any) => m.masterId),
  ]);
  const excl = new Set<string>(J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid));
  const consolidatedExc = new Set<string>(J('otc-v4-exception-consolidated-na.ga.json').rows.map((r: any) => r.masterId));

  const candidates = pool0.filter((r) => !prior.has(r.mid) && !excl.has(r.mid) && !consolidatedExc.has(r.mid));

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
    const excluded: Array<{ masterId: string; productName: string; reason: string; detail: string | null }> = [];
    const drop = (k: string, c: PoolRow, detail: string | null = null) => {
      dropped[k] = (dropped[k] || 0) + 1;
      excluded.push({ masterId: c.mid, productName: c.name, reason: k, detail });
    };

    for (const c of candidates) {
      const lv = live.get(c.mid);
      const content = lv?.easyContent ?? null;
      const slot = lv?.slot ?? { easyKoCanon: 0, authoredKoCanon: 0, authoredKoAny: 0, enCanon: 0 };
      const ref = masterRefV4(c.mid);
      const refOcc = (refBy.get(ref) as number) || 0;
      const classKinds = lv?.classKinds ?? [];
      const professional = classKinds.some((k) => normalize(k).includes('전문'));

      // ── 선정 제외 (WO 제외 목록) ────────────────────────────────────────────────
      if (slot.authoredKoCanon > 0 || slot.authoredKoAny > 0 || slot.enCanon > 0) { drop('ALREADY_COMPLETED_OR_OCCUPIED', c); continue; }
      if (slot.easyKoCanon !== 1) { drop('EASY_CANONICAL_NOT_1', c, `easyKoCanon=${slot.easyKoCanon}`); continue; }
      if (refOcc > 0) { drop('SOURCEREF_OCCUPIED', c, `${refOcc}행`); continue; }
      if (professional) { drop('PROFESSIONAL_USE', c, classKinds.join('/')); continue; }
      if (!content) { drop('NO_OFFICIAL_SOURCE', c); continue; }

      const sec = sixSectionsRaw(content);
      const permitCodes = (permitBy.get(c.mid) as string[]) ?? [];
      const srcHashCount = (hashCountBy.get(c.mid) as number) || 1;
      const gencode = lv && lv.gencodes.length === 1 ? lv.gencodes[0] : null;
      const gencodeCount = lv ? lv.gencodes.length : 0;
      const rr = resolveRouteForMaster(gencode, gencodeCount, sec['용법·용량'] || '');

      if (permitCodes.length === 0) { drop('IDENTITY_MISSING', c); continue; }
      if (permitCodes.length > 1) { drop('IDENTITY_CONFLICT', c, `품목기준코드 ${permitCodes.length}건`); continue; }
      if (srcHashCount > 1) { drop('IDENTITY_CONFLICT', c, `공식 원문 hash ${srcHashCount}종`); continue; }
      if (!sec[MANDATORY_SECTIONS[0]]) { drop('SOURCE_EFFICACY_MISSING', c); continue; }
      if (!sec[MANDATORY_SECTIONS[1]]) { drop('SOURCE_DOSAGE_MISSING', c); continue; }
      if (rr.exceptionCode) { drop(rr.exceptionCode, c, rr.detail); continue; }

      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0])) as Record<string, 0 | 1>;
      rows.push({
        masterId: c.mid,
        productName: lv?.productName ?? c.name,
        ledgerProductName: c.name,
        permitCode: permitCodes[0], permitCodeCount: permitCodes.length,
        stratum: 'A_NORMAL',
        sourceHoldClass: c.baselineHold,
        laQueue: c.queue,
        officialSourceHash: md5(content),
        officialSourceHashCount: srcHashCount,
        officialSectionPresence: presence,
        officialSectionCount: Object.values(presence).filter((v) => v === 1).length,
        gencode, gencodeCount,
        route: rr.route, routeSource: rr.source, routeFamilies: rr.families,
        classKinds, professionalSuspect: false,
        slot, plannedSourceRef: ref, sourceRefLiveOccupancy: refOcc, auditRows: 0,
        preExceptionCode: null, preExceptionDetail: null,
        expectedStatus: 'PRODUCE_EXPECTED', expectedExceptionCode: null,
        producible: true,
      });
      srcDump[c.mid] = sec;
    }

    const byMid = (a: any, b: any) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0);
    const selected = rows.slice().sort(byMid).slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);
    const selIds = selected.map((r) => r.masterId);

    if (new Set(selIds).size !== selIds.length) stop.push('선정 master 중복');
    for (const r of selected) if (r.plannedSourceRef !== masterRefV4(r.masterId)) stop.push(`${r.masterId} sourceRef 산식 불일치`);
    if (selIds.some((id) => prior.has(id))) stop.push('선행 배치 교집합');
    if (selIds.some((id) => excl.has(id))) stop.push('EXCLUDE 교집합');
    if (selIds.some((id) => consolidatedExc.has(id))) stop.push('누적 예외 원장 교집합');
    if (new Set(selected.map((r) => r.plannedSourceRef)).size !== selected.length) stop.push('sourceRef 내부 중복');

    const byRoute: Record<string, number> = {};
    for (const r of selected) byRoute[r.route] = (byRoute[r.route] || 0) + 1;

    const summary = {
      wo: WO_500, agent: 'ga', batchId: BATCH_ID_500, mode: 'READ-ONLY selection + preflight', liveDbWrite: 0,
      identityCriteria: 'V2 (permitCodeCount>=2 또는 공식 원문 hash 다중. gencodeCount 단독 제외)',
      populationBasis: 'agent-la 분류 원장 재사용 − pilot100 − pilot500 − next2000 − exclude266 − 누적예외142',
      poolAfterLedgerExclusion: candidates.length,
      selectionPolicy: '정상 생산 가능 전량. 수량 상한 없음 · oral 상한 없음 · 사전 예외 채움 없음.',
      liveDropped: dropped,
      selected: selected.length,
      byRoute,
      runTag: RUN_TAG,
      systemStop: stop,
    };

    fs.writeFileSync(OUT_PREP, JSON.stringify({ ...summary, rows: selected }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_SOURCE, JSON.stringify(Object.fromEntries(selIds.map((id) => [id, srcDump[id]])), null, 2) + '\n', 'utf8');
    const ledger = JSON.stringify({
      ...summary,
      excludedDetail: excluded.sort((a, b) => (a.reason === b.reason ? (a.masterId < b.masterId ? -1 : 1) : (a.reason < b.reason ? -1 : 1))),
      masters: selected.map((r) => ({
        masterId: r.masterId, permitCode: r.permitCode, permitCodeCount: r.permitCodeCount,
        productName: r.productName, stratum: r.stratum, sourceHoldClass: r.sourceHoldClass,
        laQueue: r.laQueue, gencode: r.gencode, gencodeCount: r.gencodeCount,
        candidateRoute: r.route, candidateRouteSource: r.routeSource,
        officialSourceHash: r.officialSourceHash, officialSectionPresence: r.officialSectionPresence,
        officialSectionCount: r.officialSectionCount,
        plannedSourceRef: r.plannedSourceRef, sourceRef: r.plannedSourceRef, sourceRefOccupied: r.sourceRefLiveOccupancy,
        expectedStatus: r.expectedStatus, expectedExceptionCode: null,
        dosageForm: null, specification: null, atcCode: null,
        professionalSuspect: false, professionalSuspectReason: null,
        classKinds: r.classKinds, strength: null, numericProfile: null, composerFeasibility: 'OK',
        existingAuthoredKoCanonical: r.slot.authoredKoCanon, existingEnCanonical: r.slot.enCanon,
        sourceRefLiveConflict: r.sourceRefLiveOccupancy, officialSourceLink: '', queue: 'agent-ga',
      })),
    }, null, 2) + '\n';
    fs.writeFileSync(OUT_LEDGER, ledger, 'utf8');
    // run 별 불변 사본 — 기존 run 파일은 덮어쓰지 않는다.
    const immutable = OUT_LEDGER.replace(/\.ga\.json$/, `.run-${RUN_TAG}.ga.json`);
    if (!fs.existsSync(immutable)) fs.writeFileSync(immutable, ledger, 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
