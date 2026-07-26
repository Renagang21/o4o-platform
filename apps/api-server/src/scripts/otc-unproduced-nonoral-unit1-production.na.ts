/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT1-PRODUCTION-READINESS-AND-EN-V1 — 비경구 Unit 1 생산 실행기 (나)
 *
 * 대상: 승인 SSOT `otc-unproduced-nonoral-unit1-approved-ssot-v1.json` (`4f188953d`) 70 fp / 443 master.
 * 단일 DB write-owner. 전체 443 master 를 **하나의 승인 생산 단위**로 처리한다.
 *
 * write 계약(기존 external-site split 생산 계약과 동일 — 변경 0):
 *   master당 **KO 4T**(easy demote → authored INSERT → canonical 전환 → audit) + **EN 2T**(INSERT → 전환).
 *   INSERT-only · 기존 canonical 본문 UPDATE 재사용 없음 · 단일 트랜잭션 ·
 *   커밋 전 사후검증 → 실패 시 전량 ROLLBACK.
 *
 * ⚠️ 본 WO 범위: `--dump-source` · `--dry-run` · `--rollback-test` 까지. **LIVE apply 금지**.
 *   apply 경로는 write-owner 인계 후 별도 WO 에서 `--apply` 로 연다.
 *
 * Usage(apps/api-server):
 *   tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --dump-source
 *   tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --mode=dry-run
 *   tsx src/scripts/otc-unproduced-nonoral-unit1-production.na.ts --rollback-test
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  officialAxes, fingerprintV2, fpToUuidV2, buildGroupKo, fetchTargetState, renderEn,
  type V2Group, type TargetState,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  DATA_DIR, SSOT_PATH, EN_PATH, APPROVAL_COMMIT, WO_PROD, TRACK, AUTHORED_SOURCE,
  EXPECTED, EXPECTED_ROUTES, UNIT1_ROUTE_PROFILE, tenAxisFp, detectSites, SITE_TO_ROUTE,
  loadUnit1Ssot, loadEn, type Unit1SsotGroup, type Unit1SsotMaster,
} from './otc-unproduced-nonoral-unit1-adapter.na.js';

const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  return ds;
}

interface GState {
  g: V2Group; raw: Unit1SsotGroup; anomalies: string[];
  fpOk: number; bad: number; easy1: number; authoredKo: number; enCanon: number;
  koHtml: string; officialDosage: string; officialInd: string; officialCau: string;
  enHtml: string; enAnomalies: string[];
}

async function prepare(ds: any, stage: 'ko' | 'en'): Promise<{
  states: GState[]; allIds: string[]; canonicalDup: number; st: TargetState;
}> {
  const { groups, raw, byMaster } = loadUnit1Ssot();
  const en = loadEn();
  const allIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();
  const st = await fetchTargetState(ds, allIds);
  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') lang, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allIds]));

  const states: GState[] = groups.map((g) => {
    const rawG = raw.find((r) => r.fp === g.fp)!;
    const anomalies: string[] = [];
    if (!UNIT1_ROUTE_PROFILE[g.route]) anomalies.push(`미지원 route(${g.route})`);
    let fpOk = 0, bad = 0, easy1 = 0, authoredKo = 0, enCanon = 0;
    for (const mid of g.masterIds) {
      const m: Unit1SsotMaster | undefined = byMaster.get(mid);
      if (!m) { anomalies.push(`SSOT 밖 master ${mid}`); bad++; continue; }
      const gc = st.gencodeByMid.get(mid) ?? null;
      const content = st.contentByMid.get(mid);
      if (!gc || gc !== g.gencode) { anomalies.push(`gencode 상충 ${mid}`); bad++; continue; }
      if (!content) { anomalies.push(`원문 부재 ${mid}`); bad++; continue; }
      const ax = officialAxes(content);
      if (!ax.ind || !ax.dos || !ax.cau) { anomalies.push(`공식 축 부족 ${mid}`); bad++; continue; }
      // route 는 용법에서 도출하고 효능과 대조한다(제품명 미사용)
      const dosSites = detectSites(ax.dos);
      if (dosSites.length !== 1 || SITE_TO_ROUTE[dosSites[0]] !== g.route) {
        anomalies.push(`용법 부위 상충 ${mid}`); bad++; continue;
      }
      const indConflict = detectSites(ax.ind).filter((s) => SITE_TO_ROUTE[s] !== g.route);
      if (indConflict.length) { anomalies.push(`효능 부위 충돌 ${mid}(${indConflict.join(',')})`); bad++; continue; }
      if (tenAxisFp(ax.ind, ax.dos, ax.cau, gc, g.gencode.slice(6, 9), g.route) !== g.fp) {
        anomalies.push(`10축 fp 불일치 ${mid}`); bad++; continue;
      }
      fpOk++;
      const slot = st.slotByMid.get(mid);
      if (slot) {
        if (parseInt(slot.easy1, 10) === 1) easy1++;
        authoredKo += parseInt(slot.authored, 10);
        enCanon += parseInt(slot.encanon, 10);
      }
    }
    const ko = buildGroupKo(g, st, UNIT1_ROUTE_PROFILE);
    if (ko.source) anomalies.push(...ko.anomalies); else anomalies.push('대표 원문 없음');

    // 대표 원문 3축(EN 저작 grounding · 수치 보존 대조용)
    const repId = g.masterIds.find((id) => st.contentByMid.has(id));
    const rax = repId ? officialAxes(st.contentByMid.get(repId)!) : { ind: '', dos: '', cau: '' };

    // EN
    let enHtml = ''; const enAnomalies: string[] = [];
    const t = en.get(g.fp);
    if (!t) { enAnomalies.push('EN payload 없음'); } else {
      if (t.gencode !== g.gencode || t.route !== g.route) enAnomalies.push('EN payload 그룹 상충');
      const r = renderEn({ groupKey: g.fp, title: t.title, efficacy: t.efficacy, usage: t.usage,
        caution: t.caution, summaryTable: t.summaryTable } as never, g.route, rax.dos, UNIT1_ROUTE_PROFILE);
      enHtml = r.html; enAnomalies.push(...r.anomalies);
    }
    if (stage === 'en' && enAnomalies.length) anomalies.push(...enAnomalies.map((a) => `EN:${a}`));

    if (stage === 'ko') {
      if (easy1 !== g.size) anomalies.push(`easy ko canonical 정확히1 아님 ${easy1}/${g.size}`);
      if (authoredKo !== 0) anomalies.push(`기존 authored ko ${authoredKo} (예상 0)`);
      if (enCanon !== 0) anomalies.push(`기존 en canonical ${enCanon} (예상 0)`);
    } else {
      if (authoredKo !== g.size) anomalies.push(`authored ko ${authoredKo}/${g.size} — KO 선행 필요`);
      if (enCanon !== 0) anomalies.push(`en canonical 이미 ${enCanon} — 중복 차단`);
    }
    return { g, raw: rawG, anomalies, fpOk, bad, easy1, authoredKo, enCanon,
      koHtml: ko.html, officialDosage: rax.dos, officialInd: rax.ind, officialCau: rax.cau,
      enHtml, enAnomalies };
  });

  return { states, allIds, canonicalDup: parseInt(dup[0]?.n || '0', 10), st };
}

function gatesOf(states: GState[], allIds: string[], canonicalDup: number, stage: 'ko' | 'en'): Record<string, boolean> {
  const ssot = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  const fpOk = states.reduce((t, x) => t + x.fpOk, 0);
  const bad = states.reduce((t, x) => t + x.bad, 0);
  const elig = states.filter((x) => x.anomalies.length === 0);
  const eligM = elig.reduce((t, x) => t + x.g.size, 0);
  const routeTally: Record<string, number> = {};
  for (const s of states) routeTally[s.g.route] = (routeTally[s.g.route] || 0) + s.g.size;
  const enOk = states.filter((x) => x.enAnomalies.length === 0).length;
  return {
    'D1 승인 SSOT status·수량 일치': ssot.status === 'APPROVED_FOR_PRODUCTION'
      && states.length === EXPECTED.fp && allIds.length === EXPECTED.master,
    'D2 10축 fp 재현 100%': bad === 0 && fpOk === EXPECTED.master,
    'D3 route·효능·용법 대조 mismatch 0': !states.some((x) => x.anomalies.some((a) => /부위 상충|부위 충돌/.test(a))),
    'D4 KO 경구동사 0': !states.some((x) => x.anomalies.some((a) => /경구 동사/.test(a))),
    'D5 공식 수치·기간 누락 0': !states.some((x) => x.anomalies.some((a) => /수치 누락|수량 누락/.test(a))),
    'D6 HOLD·SSOT밖 혼입 0': !states.some((x) => x.anomalies.some((a) => /SSOT 밖/.test(a))),
    'D7 route별 수량 일치': Object.entries(EXPECTED_ROUTES).every(([r, n]) => routeTally[r] === n),
    'D8 authored canonical 상태 정합': stage === 'ko'
      ? states.every((x) => x.authoredKo === 0 && x.enCanon === 0)
      : states.every((x) => x.authoredKo === x.g.size && x.enCanon === 0),
    'D9 canonicalDup 0': canonicalDup === 0,
    'D10 예상 write 2,658T': eligM === EXPECTED.master && eligM * 4 === EXPECTED.ko && eligM * 2 === EXPECTED.en,
    'D11 이상 그룹 0': !states.some((x) => x.anomalies.length),
    'D12 EN 70/70 fp': enOk === EXPECTED.fp,
    'D13 EN 한글 0': !states.some((x) => x.enAnomalies.some((a) => /한글/.test(a))),
    'D14 EN 경구동사 0': !states.some((x) => x.enAnomalies.some((a) => /경구 동사/.test(a))),
  };
}

async function dumpSource(): Promise<void> {
  const out = arg('out') || path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-ko-source.na.json');
  const ds = await connect();
  const { groups } = loadUnit1Ssot();
  const allIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();
  const st = await fetchTargetState(ds, allIds);
  await ds.destroy();
  const items = groups.map((g) => {
    const repId = g.masterIds.find((id) => st.contentByMid.has(id));
    const ax = repId ? officialAxes(st.contentByMid.get(repId)!) : { ind: '', dos: '', cau: '' };
    const ko = buildGroupKo(g, st, UNIT1_ROUTE_PROFILE);
    return { fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size,
      official: { indication: ax.ind, dosage: ax.dos, caution: ax.cau },
      koSource: ko.source, anomalies: ko.anomalies };
  });
  fs.writeFileSync(out, `${JSON.stringify({ wo: WO_PROD, track: TRACK, approvalCommit: APPROVAL_COMMIT,
    dbWrite: 0, count: items.length, items }, null, 2)}\n`, 'utf8');
  console.log(`KO 원문 덤프 ${items.length} fp → ${out} (DB write 0)`);
}

async function dryRun(): Promise<void> {
  const out = arg('out') || path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-dryrun.na.json');
  const ds = await connect();
  const { states, allIds, canonicalDup } = await prepare(ds, 'ko');
  await ds.destroy();
  const gates = gatesOf(states, allIds, canonicalDup, 'ko');
  const elig = states.filter((x) => x.anomalies.length === 0);
  const eligM = elig.reduce((t, x) => t + x.g.size, 0);
  const routeTally: Record<string, number> = {};
  const routeFp: Record<string, number> = {};
  for (const s of states) {
    routeTally[s.g.route] = (routeTally[s.g.route] || 0) + s.g.size;
    routeFp[s.g.route] = (routeFp[s.g.route] || 0) + 1;
  }
  const manifest = {
    wo: WO_PROD, track: TRACK, producer: 'otc-unproduced-nonoral-unit1-production.na.ts',
    adapter: 'otc-unproduced-nonoral-unit1-adapter.na.ts',
    ssot: path.basename(SSOT_PATH), approvalCommit: APPROVAL_COMMIT,
    mode: 'dry-run', apply: false, dbWrite: 0,
    totals: { fingerprints: states.length, masters: allIds.length },
    routeTally, routeFingerprints: routeFp,
    eligible: { fingerprints: elig.length, masters: eligM },
    writePlan: { perMaster: { ko: 4, en: 2, total: 6 }, ko: eligM * 4, en: eligM * 2, total: eligM * 6 },
    canonicalDup,
    en: { authored: states.filter((x) => x.enAnomalies.length === 0).length, expected: EXPECTED.fp,
      anomalies: states.filter((x) => x.enAnomalies.length).map((x) => ({ fp: x.g.fp, a: x.enAnomalies })) },
    gates, allGatesPass: Object.values(gates).every(Boolean),
    anomalies: states.filter((x) => x.anomalies.length).map((x) => ({ fp: x.g.fp, route: x.g.route, a: x.anomalies })),
    groups: states.map((x) => ({ fp: x.g.fp, sourceRef: fpToUuidV2(x.g.fp), gencode: x.g.gencode,
      route: x.g.route, form: x.g.form, size: x.g.size, fpOk: x.fpOk, easy1: x.easy1,
      koLen: x.koHtml.length, enLen: x.enHtml.length,
      koWrite: x.g.size * 4, enWrite: x.g.size * 2 })),
  };
  fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : 'FAIL'}  ${k}`);
  console.log(`DRY-RUN ${TRACK} — fp ${states.length}/${EXPECTED.fp} · master ${allIds.length}/${EXPECTED.master}`);
  console.log(`  적격 ${elig.length} fp / ${eligM} master · writePlan KO ${eligM * 4} + EN ${eligM * 2} = ${eligM * 6}`);
  console.log(`  canonicalDup ${canonicalDup} · EN ${manifest.en.authored}/${EXPECTED.fp} · dbWrite 0`);
  console.log(`  allGatesPass=${manifest.allGatesPass} → ${out}`);
  if (manifest.anomalies.length) console.log('  이상:', JSON.stringify(manifest.anomalies.slice(0, 3)));
}

/**
 * rollback 시험 — 실제 write 계약을 트랜잭션 안에서 그대로 수행한 뒤 **무조건 ROLLBACK** 한다.
 * 커밋 경로를 타지 않으므로 DB 최종 상태는 불변(순write 0)이며, 사후검증 로직이
 * 실제로 동작하는지·write 수가 계약과 일치하는지를 실증한다.
 */
async function rollbackTest(): Promise<void> {
  const out = arg('out') || path.join(DATA_DIR, 'otc-unproduced-nonoral-unit1-rollback-test.na.json');
  const ds = await connect();
  const { states, allIds } = await prepare(ds, 'ko');
  const bad = states.filter((x) => x.anomalies.length);
  if (bad.length) { await ds.destroy(); throw new Error(`이상 그룹 ${bad.length} → rollback 시험 중단`); }

  const sample = states.slice(0, 3);
  const result: any = { wo: WO_PROD, track: TRACK, mode: 'rollback-test', dbWrite: 0, sampleFp: sample.map((s) => s.g.fp) };
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  let writes = 0;
  try {
    for (const s of sample) {
      const sourceRef = fpToUuidV2(s.g.fp);
      for (const mid of s.g.masterIds) {
        const cur = retRows<{ id: string; source_type: string }>(await qr.query(
          `SELECT id::text, source_type FROM shared_product_descriptions
           WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko'
             AND status='canonical' AND deleted_at IS NULL FOR UPDATE`, [mid]));
        if (cur.length !== 1) throw new Error(`master ${mid} ko canonical ${cur.length}건 → ROLLBACK`);
        if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} source ${cur[0].source_type} 예상밖 → ROLLBACK`);
        await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid`, [cur[0].id]);
        writes++;
        const ins = retRows<{ id: string }>(await qr.query(
          `INSERT INTO shared_product_descriptions
             (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           VALUES ($1::uuid,$2,$3,$4::uuid,'needs_review','ko','STORE',now(),now()) RETURNING id::text`,
          [mid, s.koHtml, AUTHORED_SOURCE, sourceRef]));
        writes++;
        await qr.query(`UPDATE shared_product_descriptions SET status='canonical', updated_at=now() WHERE id=$1::uuid`, [ins[0].id]);
        writes++;
        // audit 계약은 기존 생산 러너 VERBATIM — 테이블·컬럼·event_type 동일
        await qr.query(
          `INSERT INTO shared_product_description_audit_logs
             (event_type, description_type, master_id, language, previous_description_id, new_description_id,
              previous_status, new_status, metadata, performed_at)
           VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`,
          [mid, cur[0].id, ins[0].id, JSON.stringify({
            previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug', newSource: AUTHORED_SOURCE,
            source_ref_id: sourceRef, fp: s.g.fp, gencode: s.g.gencode, route: s.g.route, track: TRACK, wo: WO_PROD })]);
        writes++;
      }
      // 그룹 사후검증 — 실제 apply 와 동일 계약
      const t = 4 * s.g.size;
      const chk = retRows<{ n: string }>(await qr.query(
        `SELECT count(*)::text n FROM shared_product_descriptions
         WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
           AND status='canonical' AND source_type=$2 AND deleted_at IS NULL`, [s.g.masterIds, AUTHORED_SOURCE]));
      if (parseInt(chk[0].n, 10) !== s.g.size) throw new Error(`fp ${s.g.fp} authored canonical ${chk[0].n} != ${s.g.size} → ROLLBACK`);
      const dup = retRows<{ n: string }>(await qr.query(
        `SELECT count(*)::text n FROM (
           SELECT master_id FROM shared_product_descriptions
           WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
             AND status='canonical' AND deleted_at IS NULL GROUP BY 1 HAVING count(*)>1) d`, [s.g.masterIds]));
      if (parseInt(dup[0].n, 10) !== 0) throw new Error(`fp ${s.g.fp} canonicalDup → ROLLBACK`);
      result[`fp_${s.g.fp}`] = { masters: s.g.size, expectedT: t, postVerify: 'PASS' };
    }
    result.writesInsideTx = writes;
    result.expectedInsideTx = sample.reduce((t, s) => t + s.g.size * 4, 0);
    result.writeMatch = writes === result.expectedInsideTx;
    result.postVerify = 'PASS';
  } finally {
    await qr.rollbackTransaction();
    await qr.release();
  }

  // rollback 후 상태 불변 확인
  const after = retRows<{ easy: string; authored: string }>(await ds.query(`
    SELECT
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical'
        AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text authored`,
    [allIds, AUTHORED_SOURCE]));
  await ds.destroy();
  result.afterRollback = { easyCanonical: parseInt(after[0].easy, 10), authoredCanonical: parseInt(after[0].authored, 10) };
  result.stateUnchanged = result.afterRollback.easyCanonical === EXPECTED.master && result.afterRollback.authoredCanonical === 0;
  result.verdict = result.writeMatch && result.postVerify === 'PASS' && result.stateUnchanged ? 'PASS' : 'FAIL';
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`ROLLBACK 시험 ${result.verdict} — TX 내 write ${writes}/${result.expectedInsideTx} · 사후검증 ${result.postVerify}`);
  console.log(`  rollback 후: easy canonical ${result.afterRollback.easyCanonical}/${EXPECTED.master} · authored ${result.afterRollback.authoredCanonical}/0 · 순 DB write 0`);
  console.log(`  → ${out}`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--dump-source')) return dumpSource();
  if (process.argv.includes('--rollback-test')) return rollbackTest();
  if (arg('mode') === 'dry-run') return dryRun();
  if (process.argv.includes('--apply')) {
    throw new Error('본 WO 범위에서 LIVE apply 는 금지다. write-owner 인계 후 별도 WO 에서 연다.');
  }
  console.error('--dump-source | --mode=dry-run | --rollback-test');
  process.exit(2);
}
main().catch((e) => { console.error(e); process.exit(1); });
