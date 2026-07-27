/**
 * WO-...-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — ophthalmic-unit-1 V3 실행기 (에이전트 가)
 *
 * 4 모드. 기본은 DB write 0. LIVE apply 는 이중 게이트로 잠겨 있으며 본 WO 에서는 실행하지 않는다.
 *
 *   --dry-run     (기본) : unit ledger + 공식 원문(official-source-v1) → KO/EN 합성 → **결정론적 write 계획 manifest** 방출.
 *                          DB 미접속. 두 번 실행 시 byte-identical (타임스탬프 없음 · 정렬 고정 · html 해시).
 *   --preflight          : read-only DB 게이트 검증(253/26 재현, gencode 일치, 슬롯 pre-KO, V3 sourceRef 충돌 0,
 *                          canonical dup 0, V3 sourceRef ≠ V2 namespace). write 0. 게이트 리포트 방출.
 *   --rollback-test      : 실제 트랜잭션으로 KO 4T + EN 2T 를 수행한 뒤 **강제 ROLLBACK** → net DB write 0 실증.
 *                          트랜잭션 전후 행 수 대조(shared_product_descriptions + audit). 커밋 없음.
 *   --apply              : LIVE. 이중 게이트(V3_APPLY_GATE1=OPHTHALMIC-UNIT-1-CONTENT-FP-V3 ·
 *                          V3_APPLY_GATE2=I-UNDERSTAND-LIVE-WRITE) 둘 다 + preflight blockers=0 필요. 본 WO 미실행.
 *
 * write 계약(master 당 6T) — shared runner 와 동일 SQL 형태이되 **sourceRef = contentFpToUuid(fp)** (V3 namespace).
 *   KO 4T : easy_drug ko canonical → deprecated / authored ko INSERT(needs_review) / canonical 전환 / audit
 *   EN 2T : authored en INSERT(needs_review) / canonical 전환
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadOphthalmicUnit, contentFpToUuid, fetchMasterState, liveSourceRefConflict,
  sixSectionsRaw, connect, DATA_DIR, H, AUTHORED_SOURCES,
} from './otc-easy-drug-ready-ophthalmic-253-v3-contract.ga.js';
import { fpToUuidV2 } from './otc-v2-store-leaflet-runner.shared.js';
import { composeKoV3, renderEnV3 } from './otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.js';
import { EN_CONFIG } from './otc-easy-drug-ready-ophthalmic-253-v3-en-config.ga.js';

const FORM = '점안액';
const AUTHORED_SOURCE_V3 = 'mfds_drug_otc'; // STORE authored source_type (shared runner 와 동일)
const WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1';
const OFFICIAL_SRC = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-official-source-v1.json');
const GATE1 = 'OPHTHALMIC-UNIT-1-CONTENT-FP-V3';
const GATE2 = 'I-UNDERSTAND-LIVE-WRITE';

type OfficialFp = { fp: string; gencode: string; officialSectionsRaw: Record<string, string> };

interface PlanFp {
  fp: string;
  gencode: string;
  route: string;
  size: number;
  sourceRef: string;
  masterIds: string[];
  koHtmlHash: string;
  enHtmlHash: string;
  presentSafety: string[];
  ko_4T: number;
  en_2T: number;
}

/** unit ledger + 공식 원문 → fp 별 합성 결과(html + 계획). anomalies 있으면 throw(STOP). */
function buildPlan(): { plan: PlanFp[]; htmlByFp: Map<string, { ko: string; en: string }> } {
  const unit = loadOphthalmicUnit();
  const official = JSON.parse(fs.readFileSync(OFFICIAL_SRC, 'utf8')) as { fingerprints: OfficialFp[] };
  const officialByFp = new Map(official.fingerprints.map((f) => [f.fp, f]));

  const plan: PlanFp[] = [];
  const htmlByFp = new Map<string, { ko: string; en: string }>();

  for (const f of unit.fingerprints) {
    const off = officialByFp.get(f.fp);
    if (!off) throw new Error(`STOP: fp ${f.fp} 공식 원문 없음`);
    const sixRaw = off.officialSectionsRaw;

    // sourceRef 정합 — ledger sourceRef == contentFpToUuid(fp), 그리고 V2 namespace 와 충돌 없음
    const ref = contentFpToUuid(f.fp);
    if (ref !== f.sourceRef) throw new Error(`STOP: fp ${f.fp} sourceRef 불일치 ledger=${f.sourceRef} calc=${ref}`);
    if (ref === fpToUuidV2(f.fp)) throw new Error(`STOP: fp ${f.fp} V3 sourceRef 가 V2 namespace 와 충돌`);

    const ko = composeKoV3(sixRaw, FORM, f.gencode);
    if (ko.anomalies.length) throw new Error(`STOP: KO ${f.fp} anomalies: ${ko.anomalies.join(' | ')}`);

    const cfg = EN_CONFIG[f.fp];
    if (!cfg) throw new Error(`STOP: fp ${f.fp} EN config 없음`);
    const en = renderEnV3(cfg, sixRaw);
    if (en.anomalies.length) throw new Error(`STOP: EN ${f.fp} anomalies: ${en.anomalies.join(' | ')}`);

    // present 안전섹션 == config.safety 키 1:1 (렌더러도 게이트하지만 계획 단계에서 이중확인)
    const wantSafety = ['경고', '사용상 주의사항', '이상반응', '상호작용'].filter((s) => (sixRaw[s] || '').trim());
    const gotSafety = Object.keys(cfg.safety).sort();
    if (JSON.stringify(gotSafety) !== JSON.stringify([...wantSafety].sort())) {
      throw new Error(`STOP: fp ${f.fp} safety 1:1 위반 config=[${gotSafety}] present=[${wantSafety}]`);
    }

    plan.push({
      fp: f.fp, gencode: f.gencode, route: f.route, size: f.size, sourceRef: ref,
      masterIds: [...f.masterIds].sort(),
      koHtmlHash: H(ko.html), enHtmlHash: H(en.html),
      presentSafety: ko.presentSafety, ko_4T: f.size * 4, en_2T: f.size * 2,
    });
    htmlByFp.set(f.fp, { ko: ko.html, en: en.html });
  }
  plan.sort((a, b) => a.fp.localeCompare(b.fp));
  return { plan, htmlByFp };
}

function writeManifest(plan: PlanFp[]): string {
  const masters = plan.reduce((s, p) => s + p.size, 0);
  const ko = plan.reduce((s, p) => s + p.ko_4T, 0);
  const en = plan.reduce((s, p) => s + p.en_2T, 0);
  const manifest = {
    wo: WO, unit: 'ophthalmic-unit-1', route: 'ophthalmic', model: 'content-fingerprint-v3',
    authoredSource: AUTHORED_SOURCE_V3, sourceRefNamespace: 'otc-v3-content-leaflet',
    liveDbWrite: false,
    processed: { fingerprints: plan.length, masters },
    writePlan: { ko_4T: ko, en_2T: en, total: ko + en, perMaster: 6 },
    fingerprints: plan,
  };
  const out = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-dryrun-manifest.ga.json');
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
  return out;
}

// ── preflight (read-only) ────────────────────────────────────────────────────────
async function preflight(): Promise<{ blockers: string[]; report: Record<string, unknown> }> {
  const { plan } = buildPlan();
  const unit = loadOphthalmicUnit();
  const db = await connect();
  try {
    const ms = await fetchMasterState(db, unit.allMasterIds);
    const gencodeByFp = new Map(plan.map((p) => [p.fp, p.gencode]));

    let gencodeMismatch = 0, easyNot1 = 0, authoredConflict = 0, enExists = 0;
    for (const p of plan) {
      for (const mid of p.masterIds) {
        if (ms.gencodeByMid.get(mid) !== gencodeByFp.get(p.fp)) gencodeMismatch++;
        const slot = ms.slotByMid.get(mid);
        if (!slot || slot.easy !== 1) easyNot1++;
        if (slot && slot.authoredKoAny > 0) authoredConflict++;
        if (slot && slot.enCanon > 0) enExists++;
      }
    }

    const refs = plan.map((p) => p.sourceRef);
    const refConflict = await liveSourceRefConflict(db, refs);
    const v2Collide = plan.filter((p) => p.sourceRef === fpToUuidV2(p.fp)).length;

    // canonical dup (ko/en) — 대상 master 전체
    const dup = (await db.query(`
      SELECT count(*)::text n FROM (
        SELECT master_id, COALESCE(language,'ko') lang, count(*) c FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1,2 HAVING count(*) > 1) d`, [unit.allMasterIds])) as { n: string }[];
    const canonicalDup = parseInt(dup[0]?.n || '0', 10);

    const gates: Record<string, boolean> = {
      '253/26 재현': unit.fpCount === 26 && unit.masterCount === 253 && plan.length === 26,
      'gencode 일치': gencodeMismatch === 0,
      '기존 easy ko canonical 정확히 1': easyNot1 === 0,
      '기존 authored ko 슬롯 충돌 0': authoredConflict === 0,
      '기존 en canonical 0': enExists === 0,
      'V3 sourceRef LIVE 충돌 0': refConflict === 0,
      'V3 sourceRef ≠ V2 namespace': v2Collide === 0,
      'canonical dup 0': canonicalDup === 0,
    };
    const blockers = Object.entries(gates).filter(([, ok]) => !ok).map(([k]) => k);
    return {
      blockers,
      report: {
        fp: plan.length, masters: unit.masterCount,
        gencodeMismatch, easyNot1, authoredConflict, enExists, refConflict, v2Collide, canonicalDup,
        gates, blockers,
        writePlan: { ko_4T: unit.masterCount * 4, en_2T: unit.masterCount * 2, total: unit.masterCount * 6 },
      },
    };
  } finally {
    await db.destroy();
  }
}

// ── rollback-test (트랜잭션 → 강제 ROLLBACK, net 0) ────────────────────────────────
async function rollbackTest(): Promise<void> {
  const { plan, htmlByFp } = buildPlan();
  const unit = loadOphthalmicUnit();
  const db = await connect();
  const client = await db.pool.connect();
  try {
    const countBefore = await snapshotCounts(client, unit.allMasterIds);

    await client.query('BEGIN');
    let koT = 0, enT = 0;
    for (const p of plan) {
      const html = htmlByFp.get(p.fp)!;
      koT += await applyKoTx(client, p, html.ko);
      enT += await applyEnTx(client, p, html.en);
    }
    const koExp = unit.masterCount * 4;
    const enExp = unit.masterCount * 2;
    if (koT !== koExp) throw new Error(`KO write ${koT} != ${koExp}`);
    if (enT !== enExp) throw new Error(`EN write ${enT} != ${enExp}`);

    // 트랜잭션 내부 사후상태 — authored ko/en canonical 이 정확히 master 수
    const inTx = await snapshotCounts(client, unit.allMasterIds);

    await client.query('ROLLBACK'); // ★ 강제 롤백 — 커밋 없음

    const countAfter = await snapshotCounts(client, unit.allMasterIds);
    const netZero = JSON.stringify(countBefore) === JSON.stringify(countAfter);

    const report = {
      wo: WO, mode: 'rollback-test', liveDbWrite: false,
      koWriteInTx: koT, enWriteInTx: enT, expected: { ko: koExp, en: enExp, total: koExp + enExp },
      before: countBefore, inTx, after: countAfter, netZero,
    };
    fs.writeFileSync(
      path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-rollback-test.ga.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(JSON.stringify(report, null, 2));
    if (!netZero) throw new Error('STOP: rollback 후 net DB write 0 아님');
    if (koT !== koExp || enT !== enExp) throw new Error('STOP: 트랜잭션 내 write 계획 불일치');
    console.log('\n=== ROLLBACK TEST GREEN — net DB write 0, KO+EN 계약 확인 ===');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
    throw e;
  } finally {
    client.release();
    await db.destroy();
  }
}

async function snapshotCounts(client: any, ids: string[]): Promise<Record<string, number>> {
  const r = (await client.query(`
    SELECT
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL)::int spd_all,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
         AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL)::int ko_canon,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
         AND status='canonical' AND language='en' AND deleted_at IS NULL)::int en_canon,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]))::int audit
  `, [ids])).rows[0];
  return { spd_all: r.spd_all, ko_canon: r.ko_canon, en_canon: r.en_canon, audit: r.audit };
}

/** KO 4T (pg client 트랜잭션 버전) — shared runner applyKoGroup 과 동일 계약, sourceRef=V3. */
async function applyKoTx(client: any, p: PlanFp, html: string): Promise<number> {
  const sourceRef = p.sourceRef;
  const summary = null;
  let t = 0;
  for (const mid of p.masterIds) {
    const cur = (await client.query(
      `SELECT id::text id, source_type FROM shared_product_descriptions
       WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko'
         AND status='canonical' AND deleted_at IS NULL`, [mid])).rows;
    if (cur.length !== 1) throw new Error(`master ${mid} ko canonical ${cur.length}건 → ROLLBACK`);
    if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ROLLBACK`);
    const easyId = cur[0].id;
    const dem = (await client.query(
      `UPDATE shared_product_descriptions SET status='deprecated', updated_at=now()
       WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId])).rows;
    if (dem.length !== 1) throw new Error(`master ${mid} easy demote 실패 → ROLLBACK`);
    t++;
    const ins = (await client.query(
      `INSERT INTO shared_product_descriptions
         (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5::uuid, 'needs_review', 'ko', 'STORE', now(), now())
       RETURNING id::text`, [mid, html, summary, AUTHORED_SOURCE_V3, sourceRef])).rows;
    if (ins.length !== 1) throw new Error(`master ${mid} authored INSERT 실패 → ROLLBACK`);
    const newId = ins[0].id;
    t++;
    const flip = (await client.query(
      `UPDATE shared_product_descriptions SET status='canonical', curated_at=now()
       WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [newId])).rows;
    if (flip.length !== 1) throw new Error(`master ${mid} canonical 전환 실패 → ROLLBACK`);
    t++;
    await client.query(
      `INSERT INTO shared_product_description_audit_logs
         (event_type, description_type, master_id, language, previous_description_id, new_description_id,
          previous_status, new_status, metadata, performed_at)
       VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
      [mid, easyId, newId, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug',
        newSource: AUTHORED_SOURCE_V3, source_ref_id: sourceRef, fp: p.fp, gencode: p.gencode, route: p.route, wo: WO })]);
    t++;
  }
  return t;
}

/** EN 2T (pg client 트랜잭션 버전). 대상 = 방금 INSERT 된 V3 authored ko canonical master. */
async function applyEnTx(client: any, p: PlanFp, html: string): Promise<number> {
  const sourceRef = p.sourceRef;
  const mrows = (await client.query(
    `SELECT master_id::text id FROM shared_product_descriptions
     WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE'
       AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`,
    [sourceRef, AUTHORED_SOURCE_V3])).rows;
  const masterIds = mrows.map((r: { id: string }) => r.id);
  if (masterIds.length === 0) throw new Error(`fp ${p.fp} ko canonical 대상 0 — KO 선행 필요`);
  let t = 0;
  for (const mid of masterIds) {
    const dupEn = (await client.query(
      `SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=$1::uuid
         AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [mid])).rows;
    if (dupEn[0].n !== 0) throw new Error(`master ${mid} en canonical 이미 존재 → ROLLBACK`);
    const ins = (await client.query(
      `INSERT INTO shared_product_descriptions
         (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()) RETURNING id::text`,
      [mid, html, AUTHORED_SOURCE_V3, sourceRef])).rows;
    if (ins.length !== 1) throw new Error(`master ${mid} en INSERT 실패 → ROLLBACK`);
    t++;
    const flip = (await client.query(
      `UPDATE shared_product_descriptions SET status='canonical', curated_at=now()
       WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [ins[0].id])).rows;
    if (flip.length !== 1) throw new Error(`master ${mid} en canonical 전환 실패 → ROLLBACK`);
    t++;
  }
  return t;
}

// ── LIVE apply (이중 게이트 · 본 WO 미실행) ─────────────────────────────────────────
async function apply(): Promise<void> {
  if (process.env.V3_APPLY_GATE1 !== GATE1 || process.env.V3_APPLY_GATE2 !== GATE2) {
    throw new Error('LOCKED: --apply 는 이중 게이트(V3_APPLY_GATE1 · V3_APPLY_GATE2) 필요. 본 WO 는 PRE_APPLY READY 까지만.');
  }
  const { blockers } = await preflight();
  if (blockers.length) throw new Error(`LOCKED: preflight blockers 존재 → ${blockers.join(', ')}`);
  throw new Error('LOCKED: LIVE apply 는 본 WO 범위 밖. 별도 승인 WO 에서만 실행.');
}

// ── main ──────────────────────────────────────────────────────────────────────────
(async () => {
  const mode = process.argv.find((a) => a.startsWith('--'))?.slice(2) || 'dry-run';
  if (mode === 'dry-run') {
    const { plan } = buildPlan();
    const out = writeManifest(plan);
    const masters = plan.reduce((s, p) => s + p.size, 0);
    console.log(`DRY-RUN GREEN fp=${plan.length} masters=${masters} ko_4T=${masters * 4} en_2T=${masters * 2} total=${masters * 6}`);
    console.log(`manifest → ${out}`);
  } else if (mode === 'preflight') {
    const { blockers, report } = await preflight();
    fs.writeFileSync(
      path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-v3-preflight.ga.json'),
      JSON.stringify({ wo: WO, ...report }, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (blockers.length) { console.log(`\n=== PREFLIGHT BLOCKED: ${blockers.join(', ')} ===`); process.exit(1); }
    console.log('\n=== PREFLIGHT GREEN — 모든 게이트 통과, write 0 ===');
  } else if (mode === 'rollback-test') {
    await rollbackTest();
  } else if (mode === 'apply') {
    await apply();
  } else {
    throw new Error(`unknown mode --${mode}`);
  }
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
