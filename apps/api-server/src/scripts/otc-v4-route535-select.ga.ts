/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-RECOVERABLE-535-FINAL-PRODUCTION-V1
 *   — route 회수분 535 선정 + LIVE preflight (에이전트 가, READ-ONLY)
 *
 * finalall 선정기(otc-v4-finalall-select.ga.ts)와 다른 점은 두 가지뿐이다.
 *   1) 모집단이 재투입 큐 535 로 고정된다(모집단 재도출 금지).
 *   2) **route 를 재판정하지 않는다** — 큐의 resolvedRoute 를 그대로 승계한다.
 *      resolveRouteForMaster 는 호출하지 않는다(호출하면 이 집합은 정의상 다시 예외가 된다).
 * 나머지 LIVE preflight 게이트(점유·원문·동일성·필수섹션)는 finalall 과 동일하게 적용한다.
 *
 * ⚠️ DB write 0. 673 판정 원장·reconciliation 원장·선행 배치 원장 수정 0. 2회 실행 byte-identical.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-route535-select.ga.ts --port 5495
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR, md5, sixSectionsRaw, CONTENT_SECTIONS, MANDATORY_SECTIONS, COMPOSER_ROUTES,
  masterRefV4, connect, fetchMasterLive, normalize,
} from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500, BATCH_ID_500, REENTRY_QUEUE } from './otc-v4-route535-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const OUT_PREP = P('otc-v4-route535-prep.ga.json');
const OUT_SOURCE = P('otc-v4-route535-source.ga.json');
const OUT_LEDGER = P('otc-v4-route535-selection-ledger.ga.json');

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const LIMIT = arg('--limit') ? parseInt(arg('--limit')!, 10) : Infinity;
const RUN_TAG = arg('--run-tag') || new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');

async function main(): Promise<void> {
  const queue = JSON.parse(fs.readFileSync(REENTRY_QUEUE, 'utf8'));
  const candidates = (queue.masters as any[]).slice()
    .sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0));

  // 오염 방지 대조군 — 재투입 큐가 이미 0 임을 증명했으나 선정 단계에서 다시 확인한다.
  const excl = new Set<string>(J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid));
  const srcTerminal = new Set<string>(J('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json').masters
    .filter((m: any) => m.code === 'SOURCE_EFFICACY_MISSING').map((m: any) => m.mid));
  const priorGreen = new Set<string>();
  for (const f of fs.readdirSync(DATA_DIR).filter((f) => /^otc-v4-.*green-ledger.*\.json$/.test(f)))
    for (const r of (J(f).rows || [])) priorGreen.add(r.masterId);

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
      if (priorGreen.has(c.masterId)) { drop('CONTAMINATION_PRIOR_GREEN', c); continue; }

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
      // route 는 재판정하지 않는다. 큐 값이 composer 지원 범위인지만 확인한다.
      if (!COMPOSER_ROUTES.has(c.resolvedRoute)) { drop('ROUTE_COMPOSER_UNSUPPORTED', c, c.resolvedRoute); continue; }

      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0])) as Record<string, 0 | 1>;
      rows.push({
        masterId: c.masterId,
        productName: lv?.productName ?? c.productName,
        ledgerProductName: c.productName,
        permitCode: permitCodes[0], permitCodeCount: permitCodes.length,
        stratum: 'D_ROUTE_RECOVERED',
        sourceHoldClass: 'HOLD_ROUTE',
        laQueue: 'na',
        officialSourceHash: md5(content),
        officialSourceHashCount: srcHashCount,
        officialSectionPresence: presence,
        officialSectionCount: Object.values(presence).filter((v) => v === 1).length,
        gencode, gencodeCount,
        route: c.resolvedRoute, routeSource: 'route-673-adjudication(45b2f1add)', routeFamilies: null,
        originExceptionCode: c.originExceptionCode,
        classKinds, professionalSuspect: false,
        slot, plannedSourceRef: ref, sourceRefLiveOccupancy: refOcc, auditRows: 0,
        preExceptionCode: null, preExceptionDetail: null,
        expectedStatus: 'PRODUCE_EXPECTED', expectedExceptionCode: null,
        producible: true,
      });
      srcDump[c.masterId] = sec;
    }

    const byMid = (a: any, b: any) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0);
    const selected = rows.slice().sort(byMid).slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);
    const selIds = selected.map((r) => r.masterId);

    if (candidates.length !== 535) stop.push(`재투입 큐 크기 ${candidates.length} ≠ 535`);
    if (new Set(selIds).size !== selIds.length) stop.push('선정 master 중복');
    for (const r of selected) if (r.plannedSourceRef !== masterRefV4(r.masterId)) stop.push(`${r.masterId} sourceRef 산식 불일치`);
    if (selIds.some((id) => excl.has(id))) stop.push('EXCLUDE 교집합');
    if (selIds.some((id) => srcTerminal.has(id))) stop.push('source terminal 교집합');
    if (selIds.some((id) => priorGreen.has(id))) stop.push('기존 GREEN 교집합');
    if (new Set(selected.map((r) => r.plannedSourceRef)).size !== selected.length) stop.push('sourceRef 내부 중복');
    // route 승계 무결성 — 큐 값과 1:1 일치해야 한다.
    const qRoute = new Map(candidates.map((c) => [c.masterId, c.resolvedRoute]));
    for (const r of selected) if (qRoute.get(r.masterId) !== r.route) stop.push(`${r.masterId} route 승계 불일치`);

    const byRoute: Record<string, number> = {};
    for (const r of selected) byRoute[r.route] = (byRoute[r.route] || 0) + 1;

    const summary = {
      wo: WO_500, agent: 'ga', batchId: BATCH_ID_500, mode: 'READ-ONLY selection + preflight', liveDbWrite: 0,
      routePolicy: '재판정 금지 — otc-v4-route-673-final-reentry-queue.ga.json 의 resolvedRoute 승계(원판정 45b2f1add).',
      identityCriteria: 'V2 (permitCodeCount>=2 또는 공식 원문 hash 다중. gencodeCount 단독 제외)',
      populationBasis: 'route-673 reconciliation 확정 재투입 큐 535 (topical 496 · oromucosal 39)',
      poolAfterLedgerExclusion: candidates.length,
      selectionPolicy: '재투입 큐 전량. 수량 상한 없음 · 사전 예외 채움 없음.',
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
        candidateRoute: r.route, candidateRouteSource: r.routeSource, originExceptionCode: r.originExceptionCode,
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
    const immutable = OUT_LEDGER.replace(/\.ga\.json$/, `.run-${RUN_TAG}.ga.json`);
    if (!fs.existsSync(immutable)) fs.writeFileSync(immutable, ledger, 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
