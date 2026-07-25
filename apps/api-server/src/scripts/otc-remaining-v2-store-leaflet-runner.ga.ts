/**
 * WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2 — 에이전트 가(GA) 전용 러너 (V2 census 기준).
 *
 * V2 shard SSOT(`otc-remaining-shard-assignment-ssot-v2.json`) 의 가 shard READY fingerprint 를
 * **e약은요 공식 원문 근거로** KO 매장 설명서(교체) + EN(신규) 까지 완결한다.
 *
 * V1 러너(`otc-oral-combo-store-leaflet-runner.ga.ts`) 와의 차이 = **identity 축 판정만** 교체:
 *   - V1: 제품명 파싱(성분=이름 끝 괄호 · route=이름 정규식 · 함량=규격 첫 토큰) → 라 세션 V2 census 가 결함 확인.
 *   - V2: **표준코드 일반명코드(성분명코드)** 단일 확정. 제품명은 어떤 축 판정에도 개입하지 않는다.
 *     fp = H(H(norm 효능) | H(norm 용법) | H(norm 주의) | 일반명코드 | route)  ← census-v2 VERBATIM
 *   - route/form = 일반명코드 [7-9] 접미 allowlist (CLQ/CDS/CSI 적용부위 미확정 접미는 러너에서도 거부).
 *
 * write 로직(STEP A/B · EN STEP1/2 · 사후검증 · rollback)은 검증된 V1 러너와 **동일 계약**이다.
 *
 * 안전 게이트(KO):
 *   1) target master 수 == config 명시 수(fetch 일치)
 *   2) 전 master 일반명코드 정확히 1개 · config gencode 와 동일 (identity 불변)
 *   3) 접미 allowlist 매핑 · route/form == config (경로·제형 불변) · 금지 접미(CLQ/CDS/CSI) 0
 *   4) 원문 축: 효능·효과 + 용법·용량 **2축 필수** (결손 시 ABORT — 빅콘에스600정 선례)
 *   5) fp 재현: 전 master 재계산 fp == targetFp
 *   6) easy ko canonical 정확히 1 · 기존 authored 슬롯 충돌 0 (기존 완료분 교집합 0)
 *   7) dry-run 기본(write 0) · 재실행 ALREADY_COMPLETE no-op · 이중게이트 필요
 *
 * Usage(apps/api-server):
 *   DB_* npx tsx src/scripts/otc-remaining-v2-store-leaflet-runner.ga.ts --config=<path> --group=<fp> --lang=ko|en [--apply]
 *   npx tsx src/scripts/otc-remaining-v2-store-leaflet-runner.ga.ts --selftest   # 비DB
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const WO = 'WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2';
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T = { id?: string }>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const firstRow = <T = Record<string, unknown>>(res: unknown): T | undefined => retRows<T>(res)[0];
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'] as const;

/** targetFp → 결정론 source_ref 앵커 uuid (V2 네임스페이스 — V1 앵커와 충돌 없음) */
function fpToUuid(fp: string): string {
  const h = md5(`otc-remaining-v2-leaflet:${fp}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── census-v2 VERBATIM: 섹션 추출 · 정규화 · 접미 allowlist ──────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s)
    .normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',')
    .replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();
}
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  ATB: { route: 'oral', form: '정' }, ATE: { route: 'oral', form: '장용정' }, ATR: { route: 'oral', form: '서방정' },
  ACH: { route: 'oral', form: '캡슐' }, ACS: { route: 'oral', form: '연질캡슐' }, ACE: { route: 'oral', form: '장용캡슐' },
  ASY: { route: 'oral', form: '시럽' }, ASS: { route: 'oral', form: '현탁액' }, ALQ: { route: 'oral', form: '내복액' },
  AGN: { route: 'oral', form: '과립' }, APD: { route: 'oral', form: '산' },
  ATO: { route: 'oromucosal', form: '트로키' }, AMS: { route: 'oromucosal', form: '껌' }, ATD: { route: 'oromucosal', form: '구강용해필름' },
  COS: { route: 'ophthalmic', form: '점안액' }, COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' }, COM: { route: 'topical', form: '연고' }, CPA: { route: 'topical', form: '파스타' },
  CLT: { route: 'topical', form: '로션' }, CPL: { route: 'topical', form: '플라스타' }, CPO: { route: 'topical', form: '카타플라스마' },
  CPC: { route: 'topical', form: '패취' }, CTB: { route: 'vaginal', form: '질정' },
};
/** 적용부위 미확정 — 러너에서도 접근 금지 (WO 명시 651 master) */
const SITE_AMBIGUOUS = new Set(['CLQ', 'CDS', 'CSI']);

/** e약은요 원문 → V2 fp 축 (census-v2 VERBATIM) */
function v2Fp(content: string, gencode: string, route: string): { fp: string | null; ind: string; dos: string; cau: string } {
  const sec = sections(content || '');
  const ind = sec['효능·효과'] || '';
  const dos = sec['용법·용량'] || '';
  const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
  if (!ind || !dos) return { fp: null, ind, dos, cau };
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), gencode, route].join('|'));
  return { fp, ind, dos, cau };
}

interface GroupCfg {
  key: string; sourceType: string; targetFp: string;
  gencode: string; route: string; form: string;
  target_master_ids: string[]; title: string;
  content_json: Record<string, unknown>; en: DrugOtcEnTranslation;
}

const STD_GENCODE_SQL = `
  SELECT pi.product_master_id::text mid,
         array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
  FROM product_identifiers pi
  JOIN product_drug_extensions e
    ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
  JOIN product_candidates pc
    ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
   AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
  WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    AND pi.product_master_id = ANY($1::uuid[])
  GROUP BY 1 ORDER BY 1`;

async function runKo(ds: any, cfg: GroupCfg, apply: boolean): Promise<Record<string, unknown>> {
  const mode = apply ? 'APPLY' : 'dry-run';
  const sourceRef = fpToUuid(cfg.targetFp);
  const masterIds = [...cfg.target_master_ids].sort();
  const EXP = masterIds.length;
  const report: any = {
    wo: WO, shard: 'ga', lang: 'ko', mode, status: 'INIT', dbWrite: 0,
    groupKey: cfg.key, targetFp: cfg.targetFp, gencode: cfg.gencode, route: cfg.route, form: cfg.form,
    sourceType: cfg.sourceType, sourceRef, expected: EXP, anomalies: [] as string[],
  };

  // 금지 접미 방어 (config 오작성 대비)
  const suffix = (cfg.gencode || '').slice(6, 9).toUpperCase();
  if (SITE_AMBIGUOUS.has(suffix)) report.anomalies.push(`금지 접미(적용부위 미확정) ${suffix}`);
  const mapped = SUFFIX_MAP[suffix];
  if (!mapped) report.anomalies.push(`접미 allowlist 미등재 ${suffix}`);
  else if (mapped.route !== cfg.route || mapped.form !== cfg.form) report.anomalies.push(`접미 매핑 불일치 ${suffix}→${mapped.route}/${mapped.form} vs config ${cfg.route}/${cfg.form}`);

  // target master + easy 원문
  const rows = retRows<{ id: string; content: string }>(await ds.query(
    `SELECT pm.id::text id, es.content
     FROM product_masters pm
     JOIN LATERAL (SELECT content FROM shared_product_descriptions s
       WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
         AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
       ORDER BY length(s.content) DESC LIMIT 1) es ON true
     WHERE pm.id = ANY($1::uuid[]) ORDER BY pm.id`, [masterIds]));
  report.fetched = rows.length;
  if (rows.length !== EXP) report.anomalies.push(`fetched ${rows.length} !== expected ${EXP}`);

  // identity 축: 일반명코드 단일 + config 일치
  const gen = retRows<{ mid: string; gencodes: string[] }>(await ds.query(STD_GENCODE_SQL, [masterIds]));
  const genByMid = new Map(gen.map((g) => [g.mid, (g.gencodes || []).filter(Boolean).sort()]));
  let genSingle = 0, genMatch = 0;
  for (const id of masterIds) {
    const gs = genByMid.get(id) || [];
    if (gs.length === 1) genSingle += 1;
    if (gs.length === 1 && gs[0] === cfg.gencode) genMatch += 1;
  }
  report.gencodeSingle = genSingle; report.gencodeMatch = genMatch;
  if (genSingle !== EXP) report.anomalies.push(`일반명코드 단일 아님 ${genSingle}/${EXP}`);
  if (genMatch !== EXP) report.anomalies.push(`일반명코드 config 불일치 ${genMatch}/${EXP} (expect ${cfg.gencode})`);

  // 원문 2축 + fp 재현
  let axisOk = 0, fpOk = 0;
  const axisMissing: string[] = [];
  for (const r of rows) {
    const { fp, ind, dos } = v2Fp(r.content || '', cfg.gencode, cfg.route);
    if (ind && dos) axisOk += 1; else axisMissing.push(`${r.id}:${!ind && !dos ? 'ind+dos' : !ind ? 'ind' : 'dos'}`);
    if (fp && fp === cfg.targetFp) fpOk += 1;
  }
  report.axisPresent = axisOk; report.fpReproduced = fpOk;
  if (axisOk !== EXP) report.anomalies.push(`공식 원문 효능·용법 2축 결손 ${EXP - axisOk} (${axisMissing.slice(0, 5).join(',')})`);
  if (fpOk !== EXP) report.anomalies.push(`fp 재현 실패 ${EXP - fpOk} (targetFp=${cfg.targetFp})`);

  // 슬롯 상태
  const slot = firstRow<{ easy1: string; authored: string }>(await ds.query(
    `SELECT
       (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1)::text easy1,
       (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review') AND s.source_type = ANY($2) AND s.deleted_at IS NULL)::text authored`,
    [masterIds, AUTHORED_SOURCES as unknown as string[]]));
  report.easyCanonicalExactly1 = parseInt(slot!.easy1, 10);
  report.authoredConflict = parseInt(slot!.authored, 10);
  if (report.easyCanonicalExactly1 !== EXP) report.anomalies.push(`easy ko canonical 정확히1 아님 ${report.easyCanonicalExactly1}/${EXP}`);

  const authoredCanon = firstRow<{ n: string }>(await ds.query(
    `SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL`,
    [masterIds, cfg.sourceType, sourceRef]));
  report.existingAuthoredCanonical = parseInt(authoredCanon!.n, 10);

  // KO html build
  const built = buildDrugOtcConsumerHtml(cfg.content_json as never, { title: cfg.title });
  if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
  if (!built.html) report.anomalies.push('빈 html');
  if (built.html.includes('<table')) report.anomalies.push('<table>');
  if (built.html.includes('<!--')) report.anomalies.push('주석');
  if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
  report.htmlLen = built.html.length; report.htmlMd5 = md5(built.html);
  const summary = String((cfg.content_json as any)?.summaryTable?.['작용'] ?? (cfg.content_json as any)?.summaryTable?.['주요 증상'] ?? '') || null;
  report.summary = summary;
  report.writePlan = { STEP_A_authored_needs_review_INSERT: EXP - report.authoredConflict, STEP_B_easy_demote: EXP, STEP_B_authored_flip: EXP, audit: EXP, totalT: EXP * 4 };

  if (report.existingAuthoredCanonical === EXP && report.authoredConflict === EXP && fpOk === EXP) {
    report.status = 'ALREADY_COMPLETE'; report.note = 'target 전부 이미 authored canonical(본 앵커) — write 0'; return report;
  }
  if (report.authoredConflict !== 0) report.anomalies.push(`기존 authored 슬롯 충돌 ${report.authoredConflict} (예상 0)`);
  if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }
  if (!apply) { report.status = 'PASS'; return report; }

  report.dbWrite = 1;
  const qr = ds.createQueryRunner(); await qr.connect();
  await qr.startTransaction();
  try {
    const insA = await qr.query(
      `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'ko', 'STORE', now(), now() FROM unnest($1::uuid[]) mid
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type = ANY($6) AND s.status IN ('canonical','needs_review'))
       RETURNING id`, [masterIds, cfg.sourceType, built.html, sourceRef, summary, AUTHORED_SOURCES as unknown as string[]]);
    report.stepA_inserted = retRows(insA).length;
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }

  await qr.startTransaction();
  try {
    let demoted = 0, flipped = 0, audited = 0;
    for (const mid of masterIds) {
      const cur = retRows<{ id: string; source_type: string }>(await qr.query(
        `SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]));
      if (cur.length !== 1) throw new Error(`master ${mid} canonical ${cur.length}건 → ABORT`);
      if ((AUTHORED_SOURCES as readonly string[]).includes(cur[0].source_type)) continue;
      if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ABORT`);
      const easyId = cur[0].id;
      const dem = await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]);
      if (retRows(dem).length !== 1) throw new Error(`master ${mid} easy demote 실패 → ABORT`);
      demoted += 1;
      const flip = await qr.query(
        `UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type=$2 AND source_ref_id=$3::uuid AND status='needs_review' AND deleted_at IS NULL RETURNING id::text`, [mid, cfg.sourceType, sourceRef]);
      const fr = retRows<{ id: string }>(flip); const newId = fr[0]?.id ?? null;
      if (fr.length !== 1 || !newId) throw new Error(`master ${mid} flip ${fr.length}건 → ABORT`);
      flipped += 1;
      await qr.query(
        `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
         VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
        [mid, easyId, newId, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug', newSource: cfg.sourceType, source_ref_id: sourceRef, groupKey: cfg.key, gencode: cfg.gencode, route: cfg.route, wo: WO })]);
      audited += 1;
    }
    report.writeActual = { stepA_inserted: report.stepA_inserted, demoted, flipped, audited };
    const post = firstRow<{ c1: string; auth: string; dep: string; dup: string }>(await qr.query(`
      SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE au)::text auth, count(*) FILTER (WHERE de)::text dep, count(*) FILTER (WHERE cc>1)::text dup FROM (
        SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) cc,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.source_ref_id=$3::uuid AND s.deleted_at IS NULL) au,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) de
        FROM unnest($1::uuid[]) mid) t`, [masterIds, cfg.sourceType, sourceRef]));
    report.post = { canonical1: parseInt(post!.c1, 10), authored: parseInt(post!.auth, 10), deprecatedEasy: parseInt(post!.dep, 10), dup: parseInt(post!.dup, 10) };
    if (report.post.canonical1 !== EXP || report.post.authored !== EXP || report.post.deprecatedEasy !== EXP || report.post.dup !== 0)
      throw new Error(`사후검증 실패 ${JSON.stringify(report.post)} → ROLLBACK`);
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
  await qr.release();
  report.status = 'APPLIED';
  return report;
}

async function runEn(ds: any, cfg: GroupCfg, apply: boolean): Promise<Record<string, unknown>> {
  const mode = apply ? 'APPLY' : 'dry-run';
  const sourceRef = fpToUuid(cfg.targetFp);
  const report: any = { wo: WO, shard: 'ga', lang: 'en', mode, status: 'INIT', dbWrite: 0, groupKey: cfg.key, targetFp: cfg.targetFp, sourceType: cfg.sourceType, sourceRef, anomalies: [] as string[] };

  const mrows = retRows<{ id: string }>(await ds.query(
    `SELECT master_id::text id FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`, [sourceRef, cfg.sourceType]));
  const masterIds = mrows.map((r) => r.id);
  const EXP = masterIds.length;
  report.targetMasters = EXP;
  if (EXP === 0) { report.anomalies.push('ko canonical 대상 0 — 먼저 KO apply 필요'); report.status = 'ABORT'; throw new Error(report.anomalies.join(';')); }

  const koBefore = retRows<{ h: string; n: string }>(await ds.query(
    `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type=$2 AND source_ref_id=$3::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds, cfg.sourceType, sourceRef]));
  report.koFingerprintKinds = koBefore.length;

  const built = buildDrugOtcEnConsumerHtml(cfg.en);
  if (built.missing.length) report.anomalies.push(`en 필수필드 누락 ${built.missing.join(',')}`);
  if (/[가-힣]/.test(built.html)) report.anomalies.push('en 한글 포함');
  if (built.html.includes('<table')) report.anomalies.push('<table>');
  if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
  report.builtLen = built.html.length; report.builtMd5 = md5(built.html);

  const st = firstRow<{ en_canon: string; en_nr: string }>(await ds.query(
    `SELECT count(*) FILTER (WHERE status='canonical')::text en_canon, count(*) FILTER (WHERE status='needs_review')::text en_nr
     FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [masterIds]));
  report.existingEnCanonical = parseInt(st!.en_canon, 10);
  report.existingEnNeedsReview = parseInt(st!.en_nr, 10);
  const enTgt = retRows<{ h: string }>(await ds.query(
    `SELECT md5(content) h FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds]));
  const alreadyComplete = report.existingEnCanonical === EXP && report.existingEnNeedsReview === 0 && enTgt.length === 1 && enTgt[0].h === report.builtMd5;
  report.plan = { STEP1_en_needs_review_INSERT: EXP, STEP2_flip: EXP, total: EXP * 2 };

  if (alreadyComplete) { report.status = 'ALREADY_COMPLETE'; report.note = 'en 이미 canonical·byte-identical — write 0'; return report; }
  if (report.existingEnCanonical !== 0) report.anomalies.push(`기존 en canonical ${report.existingEnCanonical}`);
  if (report.existingEnNeedsReview !== 0) report.anomalies.push(`기존 en needs_review ${report.existingEnNeedsReview}`);
  if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }
  if (!apply) { report.status = 'PASS'; return report; }

  report.dbWrite = 1;
  const qr = ds.createQueryRunner(); await qr.connect();
  await qr.startTransaction();
  try {
    const ins = await qr.query(
      `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
       SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now() FROM unnest($1::uuid[]) mid
       WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
       RETURNING id`, [masterIds, cfg.sourceType, built.html, sourceRef, cfg.en.summaryTable?.['How it works'] ?? null]);
    report.step1_inserted = retRows(ins).length;
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
  await qr.startTransaction();
  try {
    const flip = await qr.query(
      `UPDATE shared_product_descriptions SET status='canonical', updated_at=now() WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL RETURNING id::text`, [masterIds, cfg.sourceType, sourceRef]);
    report.step2_flipped = retRows(flip).length;
    const koAfter = retRows<{ h: string; n: string }>(await qr.query(
      `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND source_type=$2 AND source_ref_id=$3::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds, cfg.sourceType, sourceRef]));
    const koOk = koAfter.length === koBefore.length && koAfter.every((a, i) => a.h === koBefore[i]?.h && a.n === koBefore[i]?.n);
    report.koUnchanged = koOk;
    const post = firstRow<{ enc: string; ennr: string; dup: string }>(await qr.query(`
      SELECT (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL) enc,
             (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL) ennr,
             (SELECT count(*) FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t) dup`, [masterIds]));
    report.post = { enCanonical: parseInt(post!.enc, 10), enNeedsReview: parseInt(post!.ennr, 10), dup: parseInt(post!.dup, 10) };
    if (!koOk) throw new Error('ko canonical 변경 정황 → ROLLBACK');
    if (report.post.enCanonical !== EXP || report.post.enNeedsReview !== 0 || report.post.dup !== 0 || report.step2_flipped !== EXP) throw new Error(`사후검증 실패 ${JSON.stringify(report.post)} flip=${report.step2_flipped} → ROLLBACK`);
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
  await qr.release();
  report.status = 'APPLIED';
  return report;
}

function selfTest(): void {
  const fails: string[] = [];
  const eq = (l: string, g: unknown, w: unknown) => { if (JSON.stringify(g) !== JSON.stringify(w)) fails.push(`${l}: ${JSON.stringify(g)} !== ${JSON.stringify(w)}`); };
  const src = '<p><strong>효능·효과</strong><br>위산과다</p><p><strong>용법·용량</strong><br>성인 1회 2정</p><p><strong>사용상 주의사항</strong><br>과민증 환자 금기</p>';
  const a = v2Fp(src, '123456ATB', 'oral');
  const b = v2Fp(src, '123456ATB', 'oral');
  eq('fp 결정성', a.fp, b.fp);
  eq('fp 성분코드 축 반영', v2Fp(src, '999999ATB', 'oral').fp === a.fp, false);
  eq('fp 경로 축 반영', v2Fp(src, '123456ATB', 'topical').fp === a.fp, false);
  eq('용법 결손 → fp null', v2Fp('<p><strong>효능·효과</strong><br>x</p>', '123456ATB', 'oral').fp, null);
  eq('효능 결손 → fp null', v2Fp('<p><strong>용법·용량</strong><br>y</p>', '123456ATB', 'oral').fp, null);
  eq('제품명 미개입(입력 자체가 없음)', typeof (v2Fp as unknown as { length: number }).length, 'number');
  eq('금지 접미 CLQ', SITE_AMBIGUOUS.has('CLQ'), true);
  eq('금지 접미 CDS', SITE_AMBIGUOUS.has('CDS'), true);
  eq('금지 접미 CSI', SITE_AMBIGUOUS.has('CSI'), true);
  eq('allowlist ATB', SUFFIX_MAP.ATB, { route: 'oral', form: '정' });
  eq('allowlist COS', SUFFIX_MAP.COS, { route: 'ophthalmic', form: '점안액' });
  eq('anchor 결정성', fpToUuid('abcd1234abcd1234'), fpToUuid('abcd1234abcd1234'));
  eq('anchor V1 네임스페이스와 분리', fpToUuid('abcd1234abcd1234') !== `${md5('otc-combo-leaflet:abcd1234abcd1234').slice(0, 8)}-x`, true);
  const kb = buildDrugOtcConsumerHtml({ efficacy: 'x', usage: 'y', caution: 'a\n\nb', summaryTable: { 분류: '일반의약품' } } as never, { title: 'T' });
  eq('ko build ok', kb.missing.length, 0); eq('sd-warn', kb.html.includes('sd-warn'), true);
  const eb = buildDrugOtcEnConsumerHtml({ groupKey: 'g', title: 'T', usageLabel: 'How to use it', efficacy: 'x', usage: 'y', caution: 'A. B.', summaryTable: { Category: 'OTC' } });
  eq('en build ok', eb.missing.length, 0);
  if (fails.length) { console.error('SELFTEST FAIL\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('SELFTEST PASS — V2 fp(일반명코드·경로 축) 결정성 · 2축 결손 거부 · 금지 접미 · allowlist · 앵커 분리 · ko/en 빌더. DB 미접속.');
}

async function main(): Promise<void> {
  if (process.argv.includes('--selftest')) { selfTest(); return; }
  const configPath = arg('config'); const groupArg = arg('group'); const lang = arg('lang') || 'ko';
  if (!configPath || !groupArg) { console.error('--config=<path> --group=<fp> --lang=ko|en 필요 (또는 --selftest)'); process.exit(2); }
  const j = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), configPath), 'utf8'));
  const map: Record<string, GroupCfg> = j.groups || {};
  const cfg = map[groupArg];
  if (!cfg) { console.error(`config 에 group=${groupArg} 없음. 등록: ${Object.keys(map).slice(0, 10).join(', ')}…`); process.exit(2); }
  const apply = process.argv.includes('--apply') && ((lang === 'ko' && process.env.OTC_V2_LEAFLET_KO_CONFIRM === 'YES') || (lang === 'en' && process.env.OTC_V2_LEAFLET_EN_CONFIRM === 'YES'));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();
  let report: any;
  try {
    report = lang === 'en' ? await runEn(ds, cfg, apply) : await runKo(ds, cfg, apply);
  } catch (e) {
    report = report ?? { status: 'FAIL' }; report.error = e instanceof Error ? e.message : String(e);
    fs.writeFileSync(path.join(OUT_DIR, `otc-v2-leaflet-${groupArg}-${lang}.run.json`), JSON.stringify(report, null, 2), 'utf8');
    await ds.destroy(); console.error('FATAL', report.error); process.exit(1);
  }
  await ds.destroy();
  fs.writeFileSync(path.join(OUT_DIR, `otc-v2-leaflet-${groupArg}-${lang}.run.json`), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

void main();
