/**
 * WO-O4O-OTC-EXTERNAL-SITE-FINAL-APPLY-SUPPORT-AND-PRODUCTION-V1 — 최종 생산 실행기
 *
 * 단일 DB write-owner: **에이전트 다**. 다른 에이전트의 LIVE write 금지.
 *
 * ── 입력 계약 ────────────────────────────────────────────────────────────────────
 * 생산 입력은 **최종 승인 SSOT 하나뿐**이다.
 *   `otc-external-site-final-approved-ssot-v1.json` (승인 commit `51cea451a`, 42 fp / 199 master)
 * V1 승인 SSOT(47/278) 및 조정 proposal 은 생산 입력으로 쓰지 않는다(로더가 파일 자체를 안 읽는다).
 *
 * ── write 계약 (master당 6T) ────────────────────────────────────────────────────
 *   KO 4T: easy_drug ko canonical → deprecated / authored ko INSERT / canonical 전환 / audit
 *   EN 2T: authored en INSERT / canonical 전환
 *   INSERT-only — 기존 canonical 행의 본문을 UPDATE 로 재사용하지 않는다(상태만 강등).
 *
 * ── 안전장치 ────────────────────────────────────────────────────────────────────
 *   · shard 단위 트랜잭션 + 커밋 전 사후검증 → 실패 시 shard 전체 rollback
 *   · 이중 게이트: --apply + OTC_EXTSITE_{KO,EN}_CONFIRM=YES
 *   · 순서 원장(`otc-external-site-final-apply-order.json`)은 V2 READY·V1 회수 원장과 분리
 *   · 재실행 시 이미 생성된 canonical 을 감지해 중복 쓰기 차단(사전 게이트 G7)
 *   · fingerprintV2 / fpToUuidV2 계약 변경 없음 — 공용 러너 것을 그대로 호출한다
 *
 * Usage(apps/api-server):
 *   tsx src/scripts/otc-external-site-final-production.ts --shard=ga --mode=dry-run
 *   OTC_EXTSITE_KO_CONFIRM=YES tsx ... --shard=ga --mode=apply --lang=ko --apply
 *   OTC_EXTSITE_EN_CONFIRM=YES tsx ... --shard=ga --mode=apply --lang=en --apply
 *   tsx ... --shard=ga --verify           # 적용 후 독립검증(read-only)
 *   tsx ... --mark-verified=ga
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. 자격증명 값 열람·출력·수정 없음. 루트 .env 미사용.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  officialAxes, fingerprintV2, fpToUuidV2, buildGroupKo, fetchTargetState, renderEn,
  type V2Group, type TargetState,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  DATA_DIR, FINAL_SSOT_PATH, FINAL_APPROVAL_COMMIT, AUTHORED_SOURCE_V2, WO_PROD, FINAL_EXPECTED,
  RECOVERY_ROUTE_PROFILE, TRACK,
  loadFinalShard, admissionCheckFinal, finalLedger, finalOrderBlockers, writeFinalLedger,
  type FinalMaster,
} from './otc-v2-external-site-recovery-adapter.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const SHARD_ORDER = ['ga', 'na', 'da'] as const;

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

interface GroupState {
  g: V2Group; anomalies: string[];
  fpOk: number; fpBad: number; easy1: number; authoredKo: number; enCanon: number;
  koHtml: string; koSummary: string | null; officialDosage: string;
}

async function prepare(ds: any, shard: string, stage: 'ko' | 'en' = 'ko'): Promise<{
  groups: V2Group[]; byMaster: Map<string, FinalMaster>; states: GroupState[];
  allIds: string[]; canonicalDup: number; st: TargetState;
}> {
  const sh = loadFinalShard(shard);
  const allIds = [...new Set(sh.groups.flatMap((g) => g.masterIds))].sort();
  const st = await fetchTargetState(ds, allIds);

  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') lang, count(*) c FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*) > 1) d`, [allIds]));

  const states: GroupState[] = sh.groups.map((g) => {
    const anomalies = [...admissionCheckFinal(g, sh.byMaster)];
    let fpOk = 0, fpBad = 0, easy1 = 0, authoredKo = 0, enCanon = 0;
    for (const mid of g.masterIds) {
      const gc = st.gencodeByMid.get(mid) ?? null;
      const content = st.contentByMid.get(mid);
      if (!gc) { anomalies.push(`gencode 연결 실패 ${mid}`); fpBad++; continue; }
      if (gc !== g.gencode) { anomalies.push(`gencode 상충 ${mid}`); fpBad++; continue; }
      if (!content) { anomalies.push(`원문 부재 ${mid}`); fpBad++; continue; }
      const ax = officialAxes(content);
      if (!ax.ind || !ax.dos) { anomalies.push(`공식 축 부족 ${mid}`); fpBad++; continue; }
      if (fingerprintV2(ax, gc, g.route) !== g.fp) { anomalies.push(`fp 불일치 ${mid}`); fpBad++; continue; }
      fpOk++;
      const slot = st.slotByMid.get(mid);
      if (slot) {
        if (parseInt(slot.easy1, 10) === 1) easy1++;
        authoredKo += parseInt(slot.authored, 10);
        enCanon += parseInt(slot.encanon, 10);
      }
    }
    const ko = buildGroupKo(g, st, RECOVERY_ROUTE_PROFILE);
    if (ko.source) anomalies.push(...ko.anomalies); else anomalies.push('대표 원문 없음');
    // 단계별 기대 슬롯 상태 — 게이트를 건너뛰지 않고 기대값을 뒤집는다.
    if (stage === 'ko') {
      if (easy1 !== g.size) anomalies.push(`easy ko canonical 정확히1 아님 ${easy1}/${g.size}`);
      if (authoredKo !== 0) anomalies.push(`기존 authored ko ${authoredKo} (예상 0)`);
      if (enCanon !== 0) anomalies.push(`기존 en canonical ${enCanon} (예상 0)`);
    } else {
      if (easy1 !== 0) anomalies.push(`KO 적용 후 easy canonical 잔존 ${easy1}`);
      if (authoredKo !== g.size) anomalies.push(`authored ko canonical ${authoredKo}/${g.size} — KO 선행 필요`);
      if (enCanon !== 0) anomalies.push(`en canonical 이미 ${enCanon} — 중복 쓰기 차단`);
    }
    return { g, anomalies, fpOk, fpBad, easy1, authoredKo, enCanon,
      koHtml: ko.html, koSummary: (ko.source?.summaryTable?.['작용'] as string) ?? null, officialDosage: ko.officialDosage };
  });

  return { groups: sh.groups, byMaster: sh.byMaster, states, allIds, canonicalDup: parseInt(dup[0]?.n || '0', 10), st };
}

function gatesOf(shard: string, states: GroupState[], allIds: string[], canonicalDup: number, stage: 'ko' | 'en' = 'ko'): Record<string, boolean> {
  const exp = FINAL_EXPECTED.shards[shard as keyof typeof FINAL_EXPECTED.shards];
  const ssot = JSON.parse(fs.readFileSync(FINAL_SSOT_PATH, 'utf8'));
  const fpOk = states.reduce((t, x) => t + x.fpOk, 0);
  const fpBad = states.reduce((t, x) => t + x.fpBad, 0);
  const eligible = states.filter((x) => x.anomalies.length === 0);
  const eligM = eligible.reduce((t, x) => t + x.g.size, 0);
  const shardSet = new Set(allIds);
  return {
    'G1 최종 SSOT status·총계': ssot.status === 'APPROVED_FOR_PRODUCTION'
      && ssot.totals.fingerprints === FINAL_EXPECTED.total.fp && ssot.totals.masters === FINAL_EXPECTED.total.master,
    'G2 shard fp/master 수량 일치': states.length === exp.fp && allIds.length === exp.master,
    'G3 fp 재현 100%': fpBad === 0 && fpOk === exp.master,
    'G4 route·officialSite·evidence mismatch 0': !states.some((x) => x.anomalies.some((a) => /근거|officialSite|route 상충|불합치|suffix/.test(a))),
    'G5 professional-use 혼입 0': !states.some((x) => x.anomalies.some((a) => /전문용|PRODUCIBLE_STORE 아님/.test(a))),
    'G6 기존 LIVE 2,509 교집합 0': stage === 'ko'
      ? states.every((x) => x.authoredKo === 0)
      : states.every((x) => x.authoredKo === x.g.size),
    'G7 대상 authored canonical 상태 정합': stage === 'ko'
      ? states.every((x) => x.authoredKo === 0 && x.enCanon === 0)
      : states.every((x) => x.authoredKo === x.g.size && x.enCanon === 0),
    'G8 canonicalDup 0': canonicalDup === 0,
    'G9 예상 write 일치': stage === 'ko'
      ? (eligM === exp.master && eligM * 4 === exp.ko)
      : (eligM === exp.master && eligM * 2 === exp.en),
    'G10 shard 밖 master 0': states.flatMap((x) => x.g.masterIds).every((id) => shardSet.has(id)),
    'G11 이상 그룹 0': !states.some((x) => x.anomalies.length),
  };
}

async function dryRun(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const outPath = arg('out') || path.join(DATA_DIR, `otc-external-site-final-dryrun.${shard}.json`);
  const ds = await connect();
  const { states, allIds, canonicalDup } = await prepare(ds, shard);
  await ds.destroy();

  const gates = gatesOf(shard, states, allIds, canonicalDup);
  const exp = FINAL_EXPECTED.shards[shard as keyof typeof FINAL_EXPECTED.shards];
  const eligible = states.filter((x) => x.anomalies.length === 0);
  const eligM = eligible.reduce((t, x) => t + x.g.size, 0);

  const manifest = {
    wo: WO_PROD, track: TRACK, producer: 'otc-external-site-final-production.ts',
    finalSsot: 'otc-external-site-final-approved-ssot-v1.json', approvalCommit: FINAL_APPROVAL_COMMIT,
    writeOwner: 'agent-da (단일)', shard, mode: 'dry-run', dbWrite: 0, apply: false,
    declared: exp, processed: { fingerprints: states.length, masters: allIds.length },
    gates,
    metrics: {
      fpReproduced: states.reduce((t, x) => t + x.fpOk, 0), fpFailed: states.reduce((t, x) => t + x.fpBad, 0),
      eligibleGroups: eligible.length, eligibleMasters: eligM, canonicalDup,
      existingAuthoredKo: states.reduce((t, x) => t + x.authoredKo, 0),
      existingEnCanonical: states.reduce((t, x) => t + x.enCanon, 0),
      groupsWithAnomalies: states.filter((x) => x.anomalies.length).length,
    },
    writePlan: { ko_4T: eligM * 4, en_2T: eligM * 2, total: eligM * 6 },
    orderBlockers: finalOrderBlockers(shard),
    groups: states.map((x) => ({
      fp: x.g.fp, gencode: x.g.gencode, route: x.g.route, size: x.g.size, sourceRef: fpToUuidV2(x.g.fp),
      fpOk: x.fpOk, fpBad: x.fpBad, easyCanonical1: x.easy1,
      koHtmlMd5: md5(x.koHtml), koHtmlLen: x.koHtml.length, anomalies: x.anomalies,
    })),
    anomalies: states.filter((x) => x.anomalies.length).map((x) => `[${x.g.fp}] ${x.anomalies.join(' | ')}`),
  };
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8');

  console.log(`FINAL DRY-RUN ${shard} — fp ${states.length}/${exp.fp} · master ${allIds.length}/${exp.master}`);
  for (const [k, ok] of Object.entries(gates)) console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(`  적격 ${eligible.length}fp/${eligM}m · writePlan KO ${eligM * 4} + EN ${eligM * 2} = ${eligM * 6} (예상 ${exp.total}) · dbWrite 0`);
  console.log(`  manifest → ${outPath}`);
  if (Object.values(gates).some((v) => !v)) process.exitCode = 1;
}

async function applyKo(ds: any, states: GroupState[]): Promise<{ t: number; per: any[] }> {
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  const per: any[] = []; let total = 0;
  try {
    for (const s of states) {
      const sourceRef = fpToUuidV2(s.g.fp);
      let dep = 0, ins = 0, flip = 0, aud = 0;
      for (const mid of s.g.masterIds) {
        const cur = retRows<{ id: string; source_type: string }>(await qr.query(
          `SELECT id::text id, source_type FROM shared_product_descriptions
           WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko'
             AND status='canonical' AND deleted_at IS NULL`, [mid]));
        if (cur.length !== 1) throw new Error(`master ${mid} ko canonical ${cur.length}건 → ROLLBACK`);
        if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ROLLBACK`);
        const easyId = cur[0].id;
        if (retRows(await qr.query(
          `UPDATE shared_product_descriptions SET status='deprecated', updated_at=now()
           WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId])).length !== 1) {
          throw new Error(`master ${mid} easy demote 실패 → ROLLBACK`);
        }
        dep++;
        const row = retRows<{ id: string }>(await qr.query(
          `INSERT INTO shared_product_descriptions
             (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           VALUES ($1::uuid,$2,$3,$4,$5::uuid,'needs_review','ko','STORE',now(),now()) RETURNING id::text`,
          [mid, s.koHtml, s.koSummary, AUTHORED_SOURCE_V2, sourceRef]));
        if (row.length !== 1) throw new Error(`master ${mid} authored INSERT 실패 → ROLLBACK`);
        ins++;
        if (retRows(await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', curated_at=now()
           WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) {
          throw new Error(`master ${mid} canonical 전환 실패 → ROLLBACK`);
        }
        flip++;
        await qr.query(
          `INSERT INTO shared_product_description_audit_logs
             (event_type, description_type, master_id, language, previous_description_id, new_description_id,
              previous_status, new_status, metadata, performed_at)
           VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`,
          [mid, easyId, row[0].id, JSON.stringify({
            previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug', newSource: AUTHORED_SOURCE_V2,
            source_ref_id: sourceRef, fp: s.g.fp, gencode: s.g.gencode, route: s.g.route, track: TRACK, wo: WO_PROD })]);
        aud++;
      }
      const t = dep + ins + flip + aud;
      if (t !== s.g.size * 4) throw new Error(`fp ${s.g.fp} KO ${t} != ${s.g.size * 4} → ROLLBACK`);
      total += t;
      per.push({ fp: s.g.fp, size: s.g.size, deprecated: dep, inserted: ins, flipped: flip, audited: aud, t });
    }
    const ids = states.flatMap((s) => s.g.masterIds);
    const post = retRows<{ c1: string; auth: string; easyleft: string; dup: string }>(await qr.query(`
      SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE au)::text auth,
             count(*) FILTER (WHERE el)::text easyleft, count(*) FILTER (WHERE cc>1)::text dup FROM (
        SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
             AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) cc,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
             AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.deleted_at IS NULL) au,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical'
             AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL) el
        FROM unnest($1::uuid[]) mid) t`, [ids, AUTHORED_SOURCE_V2]));
    const p = { canonical1: +post[0].c1, authored: +post[0].auth, easyStillCanonical: +post[0].easyleft, dup: +post[0].dup };
    if (p.canonical1 !== ids.length || p.authored !== ids.length || p.easyStillCanonical !== 0 || p.dup !== 0) {
      throw new Error(`KO 사후검증 실패 ${JSON.stringify(p)} → ROLLBACK`);
    }
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
  await qr.release();
  return { t: total, per };
}

interface EnEntry { fp: string; title: string; efficacy: string; usage: string; caution: string; summaryTable: Record<string, string> }

async function applyEn(ds: any, states: GroupState[], enByFp: Map<string, EnEntry>): Promise<{ t: number; per: any[] }> {
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  const per: any[] = []; let total = 0;
  try {
    for (const s of states) {
      const e = enByFp.get(s.g.fp);
      if (!e) throw new Error(`fp ${s.g.fp} EN 저작 페이로드 부재 → 중지`);
      const en = renderEn({ groupKey: s.g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
        caution: e.caution, summaryTable: e.summaryTable }, s.g.route, s.officialDosage, RECOVERY_ROUTE_PROFILE);
      if (en.anomalies.length) throw new Error(`fp ${s.g.fp} EN 검증 실패: ${en.anomalies.join('; ')} → 중지`);
      const sourceRef = fpToUuidV2(s.g.fp);
      const mids = retRows<{ id: string }>(await qr.query(
        `SELECT master_id::text id FROM shared_product_descriptions
         WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE'
           AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`,
        [sourceRef, AUTHORED_SOURCE_V2])).map((r) => r.id);
      if (mids.length !== s.g.size) throw new Error(`fp ${s.g.fp} ko canonical ${mids.length} != ${s.g.size} → ROLLBACK`);
      let ins = 0, flip = 0;
      for (const mid of mids) {
        const d = retRows<{ n: string }>(await qr.query(
          `SELECT count(*)::text n FROM shared_product_descriptions WHERE master_id=$1::uuid
             AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [mid]));
        if (+d[0].n !== 0) throw new Error(`master ${mid} en canonical 이미 존재 → ROLLBACK`);
        const row = retRows<{ id: string }>(await qr.query(
          `INSERT INTO shared_product_descriptions
             (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           VALUES ($1::uuid,$2,$3,$4::uuid,'needs_review','en','STORE',now(),now()) RETURNING id::text`,
          [mid, en.html, AUTHORED_SOURCE_V2, sourceRef]));
        if (row.length !== 1) throw new Error(`master ${mid} en INSERT 실패 → ROLLBACK`);
        ins++;
        if (retRows(await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', curated_at=now()
           WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) {
          throw new Error(`master ${mid} en canonical 전환 실패 → ROLLBACK`);
        }
        flip++;
      }
      const t = ins + flip;
      if (t !== s.g.size * 2) throw new Error(`fp ${s.g.fp} EN ${t} != ${s.g.size * 2} → ROLLBACK`);
      total += t;
      per.push({ fp: s.g.fp, size: s.g.size, inserted: ins, flipped: flip, t, enHtmlMd5: md5(en.html) });
    }
    const ids = states.flatMap((s) => s.g.masterIds);
    const post = retRows<{ c1: string; dup: string }>(await qr.query(`
      SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE cc>1)::text dup FROM (
        SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid
          AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) cc
        FROM unnest($1::uuid[]) mid) t`, [ids]));
    if (+post[0].c1 !== ids.length || +post[0].dup !== 0) {
      throw new Error(`EN 사후검증 실패 c1=${post[0].c1} dup=${post[0].dup} → ROLLBACK`);
    }
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
  await qr.release();
  return { t: total, per };
}

async function runApply(): Promise<void> {
  const shard = arg('shard');
  const lang = arg('lang') || 'ko';
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  if (lang !== 'ko' && lang !== 'en') { console.error('--lang=ko|en 필요'); process.exit(2); }
  const confirmEnv = lang === 'ko' ? 'OTC_EXTSITE_KO_CONFIRM' : 'OTC_EXTSITE_EN_CONFIRM';
  const confirmed = process.env[confirmEnv] === 'YES';
  const exp = FINAL_EXPECTED.shards[shard as keyof typeof FINAL_EXPECTED.shards];

  const ds = await connect();
  const { states, allIds, canonicalDup } = await prepare(ds, shard, lang);
  const gates = gatesOf(shard, states, allIds, canonicalDup, lang);
  const order = finalOrderBlockers(shard);
  const blockers = Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).concat(order);

  console.log(`FINAL APPLY ${shard}/${lang} — 대상 ${states.length}fp/${allIds.length}m · write-owner agent-da`);
  for (const [k, ok] of Object.entries(gates)) console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  if (order.length) for (const b of order) console.log(`  순서 차단: ${b}`);
  if (blockers.length) { await ds.destroy(); throw new Error(`게이트 차단 ${blockers.length}건 → apply 중지: ${blockers.join(' / ')}`); }
  if (!process.argv.includes('--apply') || !confirmed) {
    await ds.destroy();
    console.log(`이중 게이트 미충족 — apply 하지 않았다. 필요: --apply 와 ${confirmEnv}=YES. dbWrite 0.`);
    return;
  }

  let res: { t: number; per: any[] };
  if (lang === 'ko') {
    res = await applyKo(ds, states);
    if (res.t !== exp.ko) { await ds.destroy(); throw new Error(`KO writeActual ${res.t} != 예상 ${exp.ko}`); }
  } else {
    const cfgPath = arg('en-config') || path.join(DATA_DIR, `otc-external-site-final-en.${shard}.json`);
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { groups: EnEntry[] };
    res = await applyEn(ds, states, new Map(cfg.groups.map((e) => [e.fp, e])));
    if (res.t !== exp.en) { await ds.destroy(); throw new Error(`EN writeActual ${res.t} != 예상 ${exp.en}`); }
  }
  await ds.destroy();

  const l = finalLedger();
  if (lang === 'ko') l.status[shard].koApplied = true; else l.status[shard].enApplied = true;
  writeFinalLedger(l);
  const runPath = path.join(DATA_DIR, `otc-external-site-final-apply-run.${shard}.${lang}.json`);
  fs.writeFileSync(runPath, JSON.stringify({
    wo: WO_PROD, shard, lang, writeOwner: 'agent-da', groups: res.per.length,
    writeActual: res.t, writeExpected: lang === 'ko' ? exp.ko : exp.en, match: true, per: res.per,
  }, null, 1) + '\n', 'utf8');
  console.log(`APPLIED ${shard}/${lang} — ${res.per.length}그룹 · writeActual ${res.t} / 예상 ${lang === 'ko' ? exp.ko : exp.en} MATCH · run → ${runPath}`);
}

/** 적용 후 독립검증 — read-only. 러너와 별개 쿼리로 사후 상태를 재확인한다. */
async function verify(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const sh = loadFinalShard(shard);
  const ids = [...new Set(sh.groups.flatMap((g) => g.masterIds))].sort();
  const exp = FINAL_EXPECTED.shards[shard as keyof typeof FINAL_EXPECTED.shards];
  const refs = sh.groups.map((g) => fpToUuidV2(g.fp));

  const ds = await connect();
  const r = retRows<Record<string, string>>(await ds.query(`
    SELECT
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type=$2 AND deleted_at IS NULL)::text ko_auth,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='canonical' AND language='en' AND source_type=$2 AND deleted_at IS NULL)::text en_canon,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='deprecated' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy_dep,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy_left,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND status='needs_review' AND deleted_at IS NULL)::text nr,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[])
        AND event_type='canonical_replaced' AND language='ko')::text audit,
      (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions
        WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1,2 HAVING count(*)>1) d)::text dup,
      (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($3::uuid[])
        AND NOT (master_id = ANY($1::uuid[])) AND deleted_at IS NULL)::text ref_leak,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
        AND description_type='STORE' AND language='en' AND status='canonical' AND content ~ '[가-힣]' AND deleted_at IS NULL)::text en_hangul
  `, [ids, AUTHORED_SOURCE_V2, refs]));
  await ds.destroy();

  const v = {
    targetMasters: ids.length, expected: exp.master,
    koAuthoredCanonical: +r[0].ko_auth, enCanonical: +r[0].en_canon,
    easyDeprecated: +r[0].easy_dep, easyStillCanonical: +r[0].easy_left,
    needsReviewLeft: +r[0].nr, auditKo: +r[0].audit, canonicalDup: +r[0].dup,
    sourceRefLeak: +r[0].ref_leak, enHangul: +r[0].en_hangul,
  };
  const checks: Record<string, boolean> = {
    'KO canonical == master 수': v.koAuthoredCanonical === exp.master,
    'EN canonical == master 수': v.enCanonical === exp.master,
    'easy_drug deprecated == master 수': v.easyDeprecated === exp.master,
    'easy_drug ko canonical 잔존 0': v.easyStillCanonical === 0,
    'needs_review 잔존 0': v.needsReviewLeft === 0,
    'audit == master 수': v.auditKo === exp.master,
    'canonicalDup 0': v.canonicalDup === 0,
    'sourceRef 충돌 0(대상 밖 유출)': v.sourceRefLeak === 0,
    'EN 한글 잔존 0': v.enHangul === 0,
  };
  console.log(`INDEPENDENT VERIFY ${shard} — ${JSON.stringify(v)}`);
  for (const [k, ok] of Object.entries(checks)) console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  const outPath = path.join(DATA_DIR, `otc-external-site-final-verify.${shard}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ wo: WO_PROD, shard, dbWrite: 0, metrics: v, checks,
    allPass: Object.values(checks).every(Boolean) }, null, 1) + '\n', 'utf8');
  console.log(`  → ${outPath}`);
  if (Object.values(checks).some((x) => !x)) process.exitCode = 1;
}

function markVerified(): void {
  const shard = arg('mark-verified');
  const l = finalLedger();
  if (!l.status[shard]) throw new Error(`shard '${shard}' 없음`);
  if (!l.status[shard].koApplied || !l.status[shard].enApplied) throw new Error(`shard '${shard}' KO/EN apply 완료 전 — 표기 불가`);
  l.status[shard].independentVerified = true;
  l.status[shard].note = arg('note') || undefined;
  writeFinalLedger(l);
  console.log(`독립검증 완료 표기: ${shard} · 다음 shard 해제`);
}

function status(): void {
  const l = finalLedger();
  console.log('FINAL PRODUCTION LEDGER — write-owner agent-da (단일)');
  for (const s of SHARD_ORDER) {
    const x = l.status[s];
    const e = FINAL_EXPECTED.shards[s];
    console.log(`  ${s}: ${e.fp}fp/${e.master}m/${e.total}T · KO ${x.koApplied ? 'DONE' : '-'} · EN ${x.enApplied ? 'DONE' : '-'} · 독립검증 ${x.independentVerified ? 'DONE' : '-'}`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--status')) { status(); return; }
  if (arg('mark-verified')) { markVerified(); return; }
  if (process.argv.includes('--verify')) { await verify(); return; }
  const mode = arg('mode') || 'dry-run';
  if (mode === 'apply') { await runApply(); return; }
  if (mode === 'dry-run') { await dryRun(); return; }
  console.error('--mode=dry-run|apply · --shard=ga|na|da · --lang=ko|en · --verify · --status · --mark-verified=<s>');
  process.exit(2);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
