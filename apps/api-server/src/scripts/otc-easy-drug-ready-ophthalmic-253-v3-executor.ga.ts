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

// ── LIVE apply 승인(production) WO — unit 화이트리스트 ────────────────────────────────
// audit metadata.wo 는 rollback-test 검증본 VERBATIM 유지(원장 대조축 불변). 실행 WO 는 productionWo 로 병기한다
// (na 형제 러너 규약과 동일). 승인 WO 가 등재된 unit 만 LIVE apply 가능하며, 그 외는 강제중지한다.
const PRODUCTION_WO_BY_UNIT: Record<string, string> = {
  'ophthalmic-unit-1': 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
};
const UNIT = 'ophthalmic-unit-1';
const PRODUCTION_WO = PRODUCTION_WO_BY_UNIT[UNIT];

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
        newSource: AUTHORED_SOURCE_V3, source_ref_id: sourceRef, fp: p.fp, gencode: p.gencode, route: p.route,
        wo: WO, productionWo: PRODUCTION_WO })]);
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

// ── TX 내 사후검증 (commit 전) ────────────────────────────────────────────────────
/** KO 사후검증 — authored ko canonical / easy deprecated / easy 잔존 / audit / EN 미변경 / sourceRef 격리 / dup. */
async function postVerifyKoTx(client: any, ids: string[], refs: string[]): Promise<{ report: Record<string, number>; fails: string[] }> {
  const T = ids.length;
  const r = (await client.query(`
    SELECT
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
           AND COALESCE(s.language,'ko')='ko' AND s.source_type=$3 AND s.deleted_at IS NULL))::int authored_ko,
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug'
           AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL))::int easy_deprecated,
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug'
           AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL))::int easy_left,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[])
         AND event_type='canonical_replaced' AND language='ko' AND metadata->>'productionWo'=$4)::int audit,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
         AND status='canonical' AND language='en' AND deleted_at IS NULL)::int en_canon,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[])
         AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL)::int ref_scope,
      (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[]) AND deleted_at IS NULL
         AND NOT master_id=ANY($1::uuid[]))::int ref_leak,
      (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') lang FROM shared_product_descriptions
         WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
         GROUP BY 1,2 HAVING count(*)>1) d)::int canonical_dup
  `, [ids, refs, AUTHORED_SOURCE_V3, PRODUCTION_WO])).rows[0];
  const fails: string[] = [];
  if (r.authored_ko !== T) fails.push(`authored KO canonical=${r.authored_ko}!=${T}`);
  if (r.easy_deprecated !== T) fails.push(`easy deprecated=${r.easy_deprecated}!=${T}`);
  if (r.easy_left !== 0) fails.push(`easy canonical 잔존=${r.easy_left}`);
  if (r.audit !== T) fails.push(`audit=${r.audit}!=${T}`);
  if (r.en_canon !== 0) fails.push(`EN canonical=${r.en_canon}!=0 (KO 단계에서 EN 변경 금지)`);
  if (r.ref_scope !== T) fails.push(`V3 sourceRef scope=${r.ref_scope}!=${T}`);
  if (r.ref_leak !== 0) fails.push(`sourceRef leak=${r.ref_leak}`);
  if (r.canonical_dup !== 0) fails.push(`canonicalDup=${r.canonical_dup}`);
  return { report: r, fails };
}

/** EN 사후검증 — en canonical / dup / sourceRef 격리. */
async function postVerifyEnTx(client: any, ids: string[], refs: string[]): Promise<{ report: Record<string, number>; fails: string[] }> {
  const T = ids.length;
  const r = (await client.query(`
    SELECT
      (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
         WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
           AND s.language='en' AND s.source_type=$3 AND s.deleted_at IS NULL))::int en_authored,
      (SELECT count(*) FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
         AND description_type='STORE' AND status='canonical' AND language='en' AND deleted_at IS NULL
         GROUP BY 1 HAVING count(*)>1) d)::int en_dup,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[])
         AND status='canonical' AND language='en' AND deleted_at IS NULL)::int ref_scope,
      (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[]) AND language='en'
         AND deleted_at IS NULL AND NOT master_id=ANY($1::uuid[]))::int ref_leak,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND language='en'
         AND status='canonical' AND source_type=$3 AND description_type='STORE' AND deleted_at IS NULL
         AND content ~ '[가-힣]')::int en_hangul
  `, [ids, refs, AUTHORED_SOURCE_V3])).rows[0];
  const fails: string[] = [];
  if (r.en_authored !== T) fails.push(`EN authored canonical=${r.en_authored}!=${T}`);
  if (r.en_dup !== 0) fails.push(`EN canonicalDup=${r.en_dup}`);
  if (r.ref_scope !== T) fails.push(`EN sourceRef scope=${r.ref_scope}!=${T}`);
  if (r.ref_leak !== 0) fails.push(`EN sourceRef leak=${r.ref_leak}`);
  if (r.en_hangul !== 0) fails.push(`EN 한글 잔존 행=${r.en_hangul}`);
  return { report: r, fails };
}

// ── LIVE apply (승인 WO 화이트리스트 + 이중 게이트 + per-lang confirm env) ─────────────
/**
 * 승인 WO = WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1.
 * 4중 게이트: --apply --lang ko|en + V3_APPLY_GATE1/GATE2 + per-lang confirm env
 *             (V3_APPLY_KO_OPHTHALMIC_UNIT_1 / V3_APPLY_EN_OPHTHALMIC_UNIT_1 = CONFIRM)
 *             + preflight blockers 0(KO 단계에 한함 — EN 은 KO 승격 후이므로 KO 슬롯 게이트가 반전된다).
 * write SQL 은 rollback-test 가 검증한 applyKoTx/applyEnTx 를 **동일 함수로 공유**(계약 이탈 0).
 * lang 단위 **단일 트랜잭션** — TX 내 사후검증 통과 시에만 COMMIT, 1건이라도 실패하면 전량 ROLLBACK.
 */
async function apply(): Promise<void> {
  const lang = (process.argv[process.argv.indexOf('--lang') + 1] || '') as 'ko' | 'en';
  if (!PRODUCTION_WO) throw new Error(`STOP: unit ${UNIT} 은 승인 WO 없음 — LIVE apply 금지`);
  if (lang !== 'ko' && lang !== 'en') throw new Error('STOP: LIVE apply 는 --lang ko|en 필수 (KO 선행 → EN)');
  if (process.env.V3_APPLY_GATE1 !== GATE1 || process.env.V3_APPLY_GATE2 !== GATE2) {
    throw new Error('LOCKED: --apply 는 이중 게이트(V3_APPLY_GATE1 · V3_APPLY_GATE2) 필요.');
  }
  const tok = `V3_APPLY_${lang.toUpperCase()}_${UNIT.replace(/-/g, '_').toUpperCase()}`;
  if (process.env[tok] !== 'CONFIRM') throw new Error(`LOCKED: per-lang confirm env(${tok}=CONFIRM) 미설정 — LIVE apply 금지`);

  if (lang === 'ko') {
    const { blockers } = await preflight();
    if (blockers.length) throw new Error(`LOCKED: preflight blockers 존재 → ${blockers.join(', ')}`);
  }

  const { plan, htmlByFp } = buildPlan();
  const unit = loadOphthalmicUnit();
  const ids = unit.allMasterIds;
  const refs = plan.map((p) => p.sourceRef);
  const T = unit.masterCount;
  const expected = lang === 'ko' ? T * 4 : T * 2;

  const db = await connect();
  const client = await db.pool.connect();
  const started = new Date().toISOString();
  let committed = false;
  let written = 0;
  let post: { report: Record<string, number>; fails: string[] } = { report: {}, fails: [] };
  try {
    if (lang === 'en') {
      // EN 선행조건: KO authored canonical 전건 성립 + V3 sourceRef 앵커 26/26 일치
      const pre = (await client.query(`
        SELECT
          (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s
             WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE'
               AND COALESCE(s.language,'ko')='ko' AND s.source_type=$3 AND s.deleted_at IS NULL))::int ko_canon,
          (SELECT count(DISTINCT source_ref_id) FROM shared_product_descriptions WHERE source_ref_id=ANY($2::uuid[])
             AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL)::int ref_anchor,
          (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
             AND status='canonical' AND language='en' AND deleted_at IS NULL)::int en_existing
      `, [ids, refs, AUTHORED_SOURCE_V3])).rows[0];
      if (pre.ko_canon !== T) throw new Error(`STOP: EN 선행조건 미충족 — KO authored canonical ${pre.ko_canon}!=${T}`);
      if (pre.ref_anchor !== refs.length) throw new Error(`STOP: V3 sourceRef 앵커 ${pre.ref_anchor}!=${refs.length}`);
      if (pre.en_existing !== 0) throw new Error(`STOP: 기존 EN canonical ${pre.en_existing}!=0`);
      console.log(`EN 선행조건 OK — koAuthoredCanonical=${pre.ko_canon} · sourceRef 앵커 ${pre.ref_anchor}/${refs.length} · 기존 EN canonical 0`);
    }

    await client.query('BEGIN');
    for (const p of plan) {
      const html = htmlByFp.get(p.fp)!;
      written += lang === 'ko' ? await applyKoTx(client, p, html.ko) : await applyEnTx(client, p, html.en);
    }
    if (written !== expected) throw new Error(`STOP: writeActual ${written} != 예상 ${expected}`);

    post = lang === 'ko' ? await postVerifyKoTx(client, ids, refs) : await postVerifyEnTx(client, ids, refs);
    if (post.fails.length) throw new Error(`STOP: ${lang.toUpperCase()} 사후검증 실패 → ${post.fails.join(' | ')}`);

    await client.query('COMMIT');
    committed = true;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
    client.release();
    await db.destroy();
    throw e;
  }
  client.release();
  await db.destroy();

  const report = {
    wo: WO, productionWo: PRODUCTION_WO, unit: UNIT, route: 'ophthalmic', mode: 'APPLY', lang,
    startedAt: started, fpCount: plan.length, masterCount: T,
    writeActual: written, writeExpected: expected, match: written === expected,
    postVerify: post.report, postVerifyFails: post.fails, committed, pass: committed && post.fails.length === 0,
  };
  fs.writeFileSync(
    path.join(DATA_DIR, `otc-easy-drug-ready-ophthalmic-253-v3-apply-${lang}.ga.json`),
    JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n=== ${UNIT} APPLY ${lang.toUpperCase()} COMMIT — fp ${plan.length} · master ${T} · write ${written}/${expected} · postVerify fails ${post.fails.length} ===`);
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
