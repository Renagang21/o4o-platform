/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — V3 재현·준비 (에이전트 가, READ-ONLY)
 *
 * 목적(WO §8 tasks 4-9):
 *   1) V3 unit ledger 의 ophthalmic-unit-1(253 master / 26 content fp) 을 DB 에서 재현한다.
 *   2) master/fp missing·dup 0, fp 내부 6섹션 byte-identical(대표=전원), sourceRef(V3) 일치를 검증한다.
 *   3) 기존 authored STORE ko/en canonical 0, easy ko canonical anchor 전건 존재를 확인한다.
 *   4) V3 sourceRef LIVE 충돌 0.
 *   5) fp별 공식 6섹션 원문을 EN 저작 grounding 소스로 덤프한다(신규 의료사실 0 — 원문 보존용).
 *
 * DB write 0. 저작·번역·apply 없음. 접속: 127.0.0.1:5455(기본) · o4o_api · o4o_platform.
 * Usage(apps/api-server): DB_PORT=5455 ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-ophthalmic-253-v3-reproduce.ga.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadOphthalmicUnit,
  connect,
  fetchMasterState,
  liveSourceRefConflict,
  sections,
  normalize,
  resolveRoute,
  sectionHashVector,
  contentFingerprint,
  contentFpToUuid,
  sixSectionsRaw,
  CONTENT_SECTIONS,
  MANDATORY_SECTIONS,
  BLOCKED_MASTER_IDS,
  OPHTHALMIC_ROUTE,
  DATA_DIR,
} from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';

const OUT_SOURCE = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-official-source-v1.json');
const OUT_CHECK = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-reproduce-check-v1.json');

async function main(): Promise<void> {
  const unit = loadOphthalmicUnit();
  const ids = unit.allMasterIds;
  const ledgerFpByMid = new Map<string, string>();
  const ledgerRefByFp = new Map<string, string>();
  const ledgerGencodeByFp = new Map<string, string>();
  const ledgerSizeByFp = new Map<string, number>();
  for (const f of unit.fingerprints) {
    ledgerRefByFp.set(f.fp, f.sourceRef);
    ledgerGencodeByFp.set(f.fp, f.gencode);
    ledgerSizeByFp.set(f.fp, f.size);
    for (const mid of f.masterIds) ledgerFpByMid.set(mid, f.fp);
  }

  const ds = await connect();
  const st = await fetchMasterState(ds, ids);

  // ── per-master 재현 ──────────────────────────────────────────────────────────────
  interface Derived { mid: string; gencode: string; route: string; hv: Record<string, string>; fp: string; sec: Record<string, string> }
  const derived: Derived[] = [];
  const anomalies: string[] = [];
  for (const mid of ids) {
    if (BLOCKED_MASTER_IDS.has(mid)) { anomalies.push(`BLOCKED master in unit: ${mid}`); continue; }
    const gc = st.gencodeByMid.get(mid) ?? null;
    const content = st.contentByMid.get(mid) || '';
    if (!gc) { anomalies.push(`gencode 연결 실패 ${mid}`); continue; }
    if (!content) { anomalies.push(`easy ko 원문 부재 ${mid}`); continue; }
    const rr = resolveRoute(gc);
    if (!rr.ok) { anomalies.push(`route 해석 불가 ${mid}: ${rr.reason}`); continue; }
    if (rr.route !== OPHTHALMIC_ROUTE) { anomalies.push(`route 불일치 ${mid}: ${rr.route}`); continue; }
    const sec = sections(content);
    const miss = MANDATORY_SECTIONS.filter((k) => !normalize(sec[k] || ''));
    if (miss.length) { anomalies.push(`필수 섹션 공란 ${mid}: ${miss.join(',')}`); continue; }
    const hv = sectionHashVector(sec);
    const fp = contentFingerprint(gc, rr.route, hv);
    derived.push({ mid, gencode: gc, route: rr.route, hv, fp, sec });
  }

  // ── fp 그룹화 + ledger 대조 ────────────────────────────────────────────────────────
  const fpGroups = new Map<string, Derived[]>();
  for (const d of derived) (fpGroups.get(d.fp) || fpGroups.set(d.fp, []).get(d.fp)!).push(d);

  // master 재현: unit 원장의 fp 배정과 정확히 일치해야 한다
  let fpAssignmentMismatch = 0;
  for (const d of derived) {
    const expectFp = ledgerFpByMid.get(d.mid);
    if (expectFp !== d.fp) { fpAssignmentMismatch++; anomalies.push(`fp 배정 불일치 ${d.mid}: derived ${d.fp} != ledger ${expectFp}`); }
  }

  // master missing / dup
  const derivedIds = new Set(derived.map((d) => d.mid));
  const missingMasters = ids.filter((id) => !derivedIds.has(id));
  const dupMasters = derived.length - derivedIds.size;

  // fp count / size
  const fpCountMatch = fpGroups.size === unit.fpCount;
  let fpSizeMismatch = 0;
  for (const [fp, g] of fpGroups) {
    const expect = ledgerSizeByFp.get(fp);
    if (expect !== g.length) { fpSizeMismatch++; anomalies.push(`fp size 불일치 ${fp}: derived ${g.length} != ledger ${expect}`); }
  }
  const fpNotInLedger = [...fpGroups.keys()].filter((fp) => !ledgerRefByFp.has(fp));
  const ledgerFpNotDerived = [...ledgerRefByFp.keys()].filter((fp) => !fpGroups.has(fp));
  if (fpNotInLedger.length) anomalies.push(`ledger 밖 fp: ${fpNotInLedger.join(',')}`);
  if (ledgerFpNotDerived.length) anomalies.push(`재현 안된 ledger fp: ${ledgerFpNotDerived.join(',')}`);

  // intra-fp 6섹션 byte-identical (대표=전원)
  let intraFpMismatch = 0;
  for (const [fp, g] of fpGroups) {
    const rep = g[0];
    for (const x of g) {
      for (const k of CONTENT_SECTIONS) {
        if (x.hv[k] !== rep.hv[k]) { intraFpMismatch++; anomalies.push(`intra-fp 섹션 불일치 ${fp} @ ${x.mid} [${k}]`); break; }
      }
    }
  }

  // gencode 단일 / route 단일 (union merge 0)
  let multiGencodeFp = 0, multiRouteFp = 0;
  for (const [, g] of fpGroups) {
    if (new Set(g.map((x) => x.gencode)).size > 1) multiGencodeFp++;
    if (new Set(g.map((x) => x.route)).size > 1) multiRouteFp++;
  }

  // sourceRef: contentFpToUuid(fp) == ledger sourceRef, dup 0, cross-fp uniqueness
  let refMismatch = 0;
  const refByFp = new Map<string, string>();
  for (const fp of fpGroups.keys()) {
    const computed = contentFpToUuid(fp);
    refByFp.set(fp, computed);
    if (computed !== ledgerRefByFp.get(fp)) { refMismatch++; anomalies.push(`sourceRef 불일치 ${fp}: computed ${computed} != ledger ${ledgerRefByFp.get(fp)}`); }
  }
  const refValues = [...refByFp.values()];
  const refDup = refValues.length - new Set(refValues).size;
  const refToFps = new Map<string, Set<string>>();
  for (const [fp, ref] of refByFp) (refToFps.get(ref) || refToFps.set(ref, new Set()).get(ref)!).add(fp);
  const refSharedAcrossFp = [...refToFps.values()].filter((s) => s.size > 1).length;

  // 슬롯: 기존 authored ko/en canonical 0, easy anchor 전건 존재
  let existingAuthoredKoCanon = 0, existingEnCanon = 0, easyAnchorMissing = 0, existingAuthoredKoAny = 0;
  for (const d of derived) {
    const s = st.slotByMid.get(d.mid);
    if (!s) { easyAnchorMissing++; continue; }
    existingAuthoredKoCanon += s.authoredKoCanon;
    existingEnCanon += s.enCanon;
    existingAuthoredKoAny += s.authoredKoAny;
    if (s.easy < 1) easyAnchorMissing++;
  }

  const liveRefConflict = await liveSourceRefConflict(ds, refValues);
  await ds.destroy();

  // ── fp별 공식 6섹션 원문 덤프 (EN 저작 grounding) ─────────────────────────────────
  const sourceDump = [...fpGroups.entries()]
    .map(([fp, g]) => {
      const rep = g[0];
      const raw = sixSectionsRaw(st.contentByMid.get(rep.mid)!);
      const presence: Record<string, 0 | 1> = {} as any;
      const normalized: Record<string, string> = {};
      for (const k of CONTENT_SECTIONS) { presence[k] = normalize(raw[k]) ? 1 : 0; normalized[k] = normalize(raw[k]); }
      return {
        fp, gencode: rep.gencode, route: rep.route, size: g.length,
        sourceRef: refByFp.get(fp),
        representativeMasterId: rep.mid,
        masterIds: g.map((x) => x.mid).sort(),
        sectionPresence: presence,
        officialSectionsRaw: raw,
        officialSectionsNormalized: normalized,
      };
    })
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

  const gates: Record<string, boolean> = {
    reproduce_253_masters: derived.length === 253 && missingMasters.length === 0 && dupMasters === 0,
    reproduce_26_fp: fpCountMatch && fpNotInLedger.length === 0 && ledgerFpNotDerived.length === 0,
    fp_assignment_match: fpAssignmentMismatch === 0,
    fp_size_match: fpSizeMismatch === 0,
    intra_fp_6section_byte_identical: intraFpMismatch === 0,
    union_merge_0: multiGencodeFp === 0 && multiRouteFp === 0,
    sourceref_match_ledger: refMismatch === 0,
    sourceref_dup_0: refDup === 0,
    sourceref_cross_fp_unique: refSharedAcrossFp === 0,
    sourceref_live_conflict_0: liveRefConflict === 0,
    existing_authored_ko_canonical_0: existingAuthoredKoCanon === 0,
    existing_authored_ko_any_0: existingAuthoredKoAny === 0,
    existing_en_canonical_0: existingEnCanon === 0,
    easy_anchor_all_present: easyAnchorMissing === 0,
    no_anomaly: anomalies.length === 0,
  };
  const gatePass = Object.values(gates).every(Boolean);

  const check = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1',
    agent: 'ga', unit: unit.unit, mode: 'READ-ONLY reproduce', liveDbWrite: 0,
    ledger: { fpCount: unit.fpCount, masterCount: unit.masterCount },
    numbers: {
      derivedMasters: derived.length, missingMasters: missingMasters.length, dupMasters,
      fpGroups: fpGroups.size, fpAssignmentMismatch, fpSizeMismatch,
      fpNotInLedger: fpNotInLedger.length, ledgerFpNotDerived: ledgerFpNotDerived.length,
      intraFpMismatch, multiGencodeFp, multiRouteFp,
      refMismatch, refDup, refSharedAcrossFp, liveRefConflict,
      existingAuthoredKoCanon, existingAuthoredKoAny, existingEnCanon, easyAnchorMissing,
    },
    safetyPresence: {
      withWarn: sourceDump.filter((f) => f.sectionPresence['경고']).length,
      withPrecaution: sourceDump.filter((f) => f.sectionPresence['사용상 주의사항']).length,
      withAdverse: sourceDump.filter((f) => f.sectionPresence['이상반응']).length,
      withInteraction: sourceDump.filter((f) => f.sectionPresence['상호작용']).length,
    },
    anomalies: anomalies.slice(0, 50),
    anomalyCount: anomalies.length,
    gates, gatePass,
    artifacts: [path.basename(OUT_SOURCE), path.basename(OUT_CHECK)],
  };

  fs.writeFileSync(OUT_SOURCE, JSON.stringify({
    wo: check.wo, agent: 'ga', unit: unit.unit, liveDbWrite: 0,
    note: '공식 e약은요 원문 6섹션 grounding 소스. EN 저작은 이 원문만 근거로 하며 신규 의료사실을 만들지 않는다.',
    fpCount: sourceDump.length, masterCount: derived.length,
    fingerprints: sourceDump,
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_CHECK, JSON.stringify(check, null, 2) + '\n', 'utf8');

  console.log('=== V3 ophthalmic-unit-1 reproduce (READ-ONLY, dbWrite 0) ===');
  console.log(`derived masters ${derived.length}/253 · missing ${missingMasters.length} · dup ${dupMasters}`);
  console.log(`fp groups ${fpGroups.size}/26 · assignmentMismatch ${fpAssignmentMismatch} · sizeMismatch ${fpSizeMismatch}`);
  console.log(`intraFpMismatch ${intraFpMismatch} · multiGencodeFp ${multiGencodeFp} · multiRouteFp ${multiRouteFp}`);
  console.log(`sourceRef mismatch ${refMismatch} · dup ${refDup} · sharedAcrossFp ${refSharedAcrossFp} · liveConflict ${liveRefConflict}`);
  console.log(`existingAuthoredKoCanon ${existingAuthoredKoCanon} · authoredKoAny ${existingAuthoredKoAny} · enCanon ${existingEnCanon} · easyAnchorMissing ${easyAnchorMissing}`);
  console.log(`safety: warn ${check.safetyPresence.withWarn} · precaution ${check.safetyPresence.withPrecaution} · adverse ${check.safetyPresence.withAdverse} · interaction ${check.safetyPresence.withInteraction}`);
  console.log(`anomalies ${anomalies.length}`);
  console.log(`GATES ${Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'ALL PASS'} → gatePass=${gatePass}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
