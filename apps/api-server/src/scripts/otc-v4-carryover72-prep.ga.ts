/**
 * WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1
 *   — carryover 72 preflight + 입력 게이트 (에이전트 가, READ-ONLY)
 *
 * ⚠️ 핵심: route 를 **재판정하지 않는다.** frozen `resolveRouteForMaster` 는 이 72건에서 이미
 *    실패했던 함수이므로 다시 호출하면 또 예외가 된다. carryover 112 최종 판정 원장의
 *    `resolvedRoute` / `routeSet` 을 **주입**해서 쓴다(WO §9-3).
 *
 * ⚠️ DB write 0. 원장 수정 0.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-carryover72-prep.ga.ts --port 5510 [--unit rectal|oromucosal|multi-nonoral]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR, md5, sixSectionsRaw, CONTENT_SECTIONS, MANDATORY_SECTIONS,
  masterRefV4, connect, fetchMasterLive, normalize,
} from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500, BATCH_ID_500, REENTRY_LEDGER, TERMINAL_LEDGER } from './otc-v4-carryover72-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(f, 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const UNIT = arg('--unit') || null;

const OUT_PREP = P('otc-v4-carryover72-prep.ga.json');
const OUT_SOURCE = P('otc-v4-carryover72-source.ga.json');
const OUT_LEDGER = P('otc-v4-carryover72-selection-ledger.ga.json');
const OUT_GATE = P('otc-v4-carryover72-input-gate.ga.json');

const UNIT_EXPECT: Record<string, number> = { rectal: 26, oromucosal: 16, 'multi-nonoral': 30 };

async function main(): Promise<void> {
  const re = J(REENTRY_LEDGER);
  const all: any[] = (re.masters || re.rows).slice().sort((a, b) => (a.masterId < b.masterId ? -1 : 1));
  const targets = UNIT ? all.filter((m) => m.composerProfile === UNIT) : all;
  const ids = targets.map((m) => m.masterId);

  // 혼입 금지 집합
  const term = J(TERMINAL_LEDGER);
  const termIds = new Set<string>((term.masters || term.rows || []).map((r: any) => r.masterId));
  const con = J(P('otc-v4-exception-consolidated-na.ga.json'));
  const srcTerminal = new Set<string>(con.rows.filter((r: any) => r.group === 'source').map((r: any) => r.masterId));
  const excl266 = new Set<string>(J(P('otc-easy-drug-remaining-3809-exclude-ledger-v1.json')).masters.map((m: any) => m.mid));
  const priorGreen = new Set<string>([
    ...J(P('otc-v4-pilot-100-green-ledger.ga.json')).rows.map((r: any) => r.masterId),
    ...J(P('otc-v4-pilot-500-green-ledger.apply-run1.ga.json')).rows.map((r: any) => r.masterId),
    ...J(P('otc-v4-next2000-green-ledger.run-20260729T154307.ga.json')).rows.map((r: any) => r.masterId),
    ...J(P('otc-v4-finalall-green-ledger.ga.json')).rows.map((r: any) => r.masterId),
  ]);

  const db = await connect();
  const stop: string[] = [];
  try {
    const live = await fetchMasterLive(db, ids);
    const refs = ids.map(masterRefV4);
    const refRows = await db.query(
      `SELECT source_ref_id::text ref, count(*)::int n FROM shared_product_descriptions
        WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL GROUP BY 1`, [refs]);
    const refBy = new Map(refRows.map((r: any) => [r.ref, r.n]));
    const permitRows = await db.query(
      `SELECT product_master_id::text mid,
              array_remove(array_agg(DISTINCT NULLIF(identifier_value,'')), NULL) codes
         FROM product_identifiers
        WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL AND product_master_id = ANY($1::uuid[])
        GROUP BY 1`, [ids]);
    const permitBy = new Map(permitRows.map((r: any) => [r.mid, (r.codes || []).filter(Boolean).slice().sort()]));

    /**
     * 제한적 deprecated fallback (멱등 재실행 전용).
     * 이번 생산으로 easy KO canonical 이 deprecated 로 강등되면 fetchMasterLive 가 원문을 못 집는다.
     * 아래 계약을 **전부** 만족할 때만 그 deprecated 행을 원문으로 인정한다:
     *   동일 masterId · easy source 계열 · 원장 officialSourceHash 와 hash 일치 ·
     *   authored V4 KO·EN canonical 이 이미 정상 존재 · 후보가 정확히 1개.
     * 복수 후보 / hash 불일치 는 시스템 중지. 최초 생산 대상 선정에는 쓰지 않는다.
     */
    const depRows = await db.query(
      `SELECT master_id::text mid, md5(content) h, content FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
          AND status='deprecated' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [ids]);
    const depBy = new Map<string, Array<{ h: string; content: string }>>();
    for (const r of depRows as any[]) {
      const a = depBy.get(r.mid) || []; a.push({ h: r.h, content: r.content }); depBy.set(r.mid, a);
    }
    const fallbackUsed: Array<{ masterId: string; hash: string }> = [];

    const rows: any[] = [];
    const srcDump: Record<string, Record<string, string>> = {};
    const gate: Record<string, unknown> = {};

    for (const m of targets) {
      const lv = live.get(m.masterId);
      let content = lv?.easyContent ?? null;
      let usedFallback = false;
      if (!content) {
        const cands = (depBy.get(m.masterId) || []).filter((d) => d.h === m.officialSourceHash);
        const slotNow = lv?.slot ?? { authoredKoCanon: 0, enCanon: 0 };
        if (cands.length === 1 && slotNow.authoredKoCanon === 1 && slotNow.enCanon === 1) {
          content = cands[0].content; usedFallback = true;
          fallbackUsed.push({ masterId: m.masterId, hash: cands[0].h });
        } else if (cands.length > 1) {
          stop.push(`SYS deprecated easy 후보 ${cands.length}건 — 임의 선택 금지 ${m.masterId}`);
        }
      }
      const slot = lv?.slot ?? { easyKoCanon: 0, authoredKoCanon: 0, authoredKoAny: 0, enCanon: 0 };
      const ref = masterRefV4(m.masterId);
      const refOcc = (refBy.get(ref) as number) || 0;
      const classKinds = lv?.classKinds ?? [];
      const permitCodes = (permitBy.get(m.masterId) as string[]) ?? [];
      const sec = content ? sixSectionsRaw(content) : Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, '']));
      const hash = content ? md5(content) : null;

      // ── 시스템 중지 조건 (§11) ────────────────────────────────────────────────
      if (!content) stop.push(`SYS 공식 원문 부재(fallback 불가) ${m.masterId}`);
      if (hash && m.officialSourceHash && hash !== m.officialSourceHash) stop.push(`SYS source hash drift ${m.masterId} (원장 ${m.officialSourceHash} / 실측 ${hash})`);
      if (ref !== m.sourceRef) stop.push(`SYS sourceRef 산식 불일치 ${m.masterId}`);
      if (priorGreen.has(m.masterId)) stop.push(`SYS 기존 GREEN 교집합 ${m.masterId}`);
      if (termIds.has(m.masterId)) stop.push(`SYS terminal 혼입 ${m.masterId}`);
      if (srcTerminal.has(m.masterId)) stop.push(`SYS source terminal 혼입 ${m.masterId}`);
      if (excl266.has(m.masterId)) stop.push(`SYS exclude266 혼입 ${m.masterId}`);
      // 이미 생산 완료된 master(=멱등 재실행)는 authored 존재·easy 0·sourceRef 점유가 정상 상태다.
      const alreadyProduced = slot.authoredKoCanon === 1 && slot.enCanon === 1;
      if (!alreadyProduced) {
        if (slot.authoredKoCanon > 0 || slot.authoredKoAny > 0 || slot.enCanon > 0) stop.push(`SYS 기존 authored canonical ${m.masterId}`);
        if (slot.easyKoCanon !== 1) stop.push(`SYS easy ko canonical ${slot.easyKoCanon} ${m.masterId}`);
        if (refOcc > 0) stop.push(`SYS sourceRef LIVE 점유 ${refOcc} ${m.masterId}`);
      }
      if (classKinds.some((k) => normalize(k).includes('전문'))) stop.push(`SYS 전문의약품 ${m.masterId}`);
      if (!sec[MANDATORY_SECTIONS[0]] || !sec[MANDATORY_SECTIONS[1]]) stop.push(`SYS 효능/용법 섹션 부재 ${m.masterId}`);
      // 원장 drift — 최종 분류·routeSet 이 인계 시점과 같아야 한다
      if (!m.productionEligible) stop.push(`SYS productionEligible=false ${m.masterId}`);

      const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0])) as Record<string, 0 | 1>;
      rows.push({
        masterId: m.masterId,
        productName: lv?.productName ?? m.productName,
        ledgerProductName: m.productName,
        permitCode: permitCodes.length === 1 ? permitCodes[0] : (m.productCode ?? null),
        permitCodeCount: permitCodes.length,
        stratum: 'A_NORMAL',
        sourceHoldClass: m.priorClassification,
        finalClassification: m.finalClassification,
        composerProfile: m.composerProfile,
        officialSourceHash: hash,
        officialSectionPresence: presence,
        officialSectionCount: Object.values(presence).filter((v) => v === 1).length,
        gencode: lv && lv.gencodes.length === 1 ? lv.gencodes[0] : null,
        gencodeCount: lv ? lv.gencodes.length : 0,
        // ★ route 주입 — 재판정 없음
        route: m.resolvedRoute ?? (m.routeSet || []).join('+'),
        routeSet: m.routeSet || (m.resolvedRoute ? [m.resolvedRoute] : []),
        routeSource: 'carryover112-final-resolution (injected)',
        routeFamilies: m.routeSet || [],
        classKinds,
        professionalSuspect: false,
        slot, plannedSourceRef: ref, sourceRefLiveOccupancy: refOcc, auditRows: 0,
        preExceptionCode: null, preExceptionDetail: null,
        expectedStatus: 'PRODUCE_EXPECTED', expectedExceptionCode: null,
        producible: true,
        dosageForm: null,
        usedDeprecatedFallback: usedFallback,
      });
      if (content) srcDump[m.masterId] = sec;
    }

    // ── 입력 게이트 (§3) ──────────────────────────────────────────────────────
    const byProfile: Record<string, number> = {};
    for (const r of rows) byProfile[r.composerProfile] = (byProfile[r.composerProfile] || 0) + 1;
    gate.inputTotal = rows.length;
    gate.expectedTotal = UNIT ? UNIT_EXPECT[UNIT] : 72;
    gate.duplicateMasterIds = ids.length - new Set(ids).size;
    gate.byComposerProfile = byProfile;
    gate.priorGreenIntersection = ids.filter((x) => priorGreen.has(x)).length;
    gate.terminalIntersection = ids.filter((x) => termIds.has(x)).length;
    gate.sourceTerminalIntersection = ids.filter((x) => srcTerminal.has(x)).length;
    gate.exclude266Intersection = ids.filter((x) => excl266.has(x)).length;
    gate.authoredKoCanonical = rows.filter((r) => r.slot.authoredKoCanon > 0).length;
    gate.authoredEnCanonical = rows.filter((r) => r.slot.enCanon > 0).length;
    gate.easyKoCanonical = rows.filter((r) => r.slot.easyKoCanon === 1).length;
    gate.sourceRefLiveOccupied = rows.filter((r) => r.sourceRefLiveOccupancy > 0).length;
    gate.sourceHashDrift = rows.filter((r) => r.officialSourceHash !== (targets.find((t) => t.masterId === r.masterId)?.officialSourceHash)).length;
    gate.sourceRefUnique = new Set(rows.map((r) => r.plannedSourceRef)).size === rows.length;
    gate.expectedWriteT = rows.length * 6;
    gate.deprecatedFallbackUsed = fallbackUsed.length;
    gate.alreadyProducedCount = rows.filter((r) => r.slot.authoredKoCanon === 1 && r.slot.enCanon === 1).length;
    if (rows.length !== gate.expectedTotal) stop.push(`입력 수 불일치 ${rows.length} != ${gate.expectedTotal}`);
    if (gate.duplicateMasterIds !== 0) stop.push('master 중복');
    if (!gate.sourceRefUnique) stop.push('sourceRef 내부 중복');

    const summary = {
      wo: WO_500, agent: 'ga', batchId: BATCH_ID_500, unit: UNIT, mode: 'READ-ONLY preflight', liveDbWrite: 0,
      routePolicy: 'carryover112 최종 판정의 resolvedRoute/routeSet 주입. frozen resolveRouteForMaster 재호출 금지.',
      inputGate: gate, systemStop: stop,
    };
    fs.writeFileSync(OUT_PREP, JSON.stringify({ ...summary, rows }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_SOURCE, JSON.stringify(srcDump, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_LEDGER, JSON.stringify({ ...summary, masters: rows.map((r) => ({ ...r, sourceRef: r.plannedSourceRef })) }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_GATE, JSON.stringify(summary, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
