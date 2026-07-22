/**
 * WO-O4O-OTC-ORAL-MULTI-INGREDIENT-STORE-LEAFLET-PRODUCTION-GA-V2 — 에이전트 가(GA) 전용 러너.
 *
 * 경구 복합성분(oral multi-ingredient) 일반의약품 매장용 소비자 설명서를 **공식 easy_drug 원문 근거로
 * 신규 저작**하여 KO canonical(교체) + EN canonical(신규)까지 완결한다. 기존 authored 확장이 아니라
 * fingerprint 동일 subgroup(또는 제품별)로 새 설명서를 저작·적재하는 경로.
 *
 * 정책(사용자 확정 V2):
 *   - 공식 원문의 효능·용법·금기·주의사항을 소비자 친화적으로 재구성(질병명·증상명·허가 효능 명확 표현).
 *   - 신규 의료 사실 추가 0 · 효능/금기/주의 강도 약화 0 · 마케팅 표현 0 · 조성 창작 0.
 *   - 하단은 매장 내 약사 등 전문가 상담으로 연결(ingredientSelection).
 *
 * 안전 게이트:
 *   - target_master_ids 는 config 명시(감사 SSOT). 각 target: easy_drug STORE ko canonical 정확히 1 +
 *     재계산 fingerprint == targetFp(재현 게이트) + 기존 authored 충돌 0 + route oral + form/safety 균일.
 *   - KO 교체 = STEP A(authored needs_review INSERT, 멱등) → STEP B(단일 TX: easy demote→deprecated /
 *     authored flip→canonical / audit_log). 사후검증(canonical=1·authored=expected·deprecatedEasy=expected·dup=0).
 *   - EN = STEP1(en needs_review INSERT, 멱등) → STEP2(flip canonical) + ko 불변 사후검증.
 *   - 이중게이트: --apply + (KO: OTC_COMBO_LEAFLET_KO_CONFIRM=YES · EN: OTC_COMBO_LEAFLET_EN_CONFIRM=YES).
 *   - dry-run 기본(write 0). 재실행 = ALREADY_COMPLETE no-op.
 *   - source_ref_id = uuid(md5(targetFp)) 결정론 앵커(그룹 식별·rollback·멱등).
 *
 * Usage(apps/api-server):
 *   DB_*  npx tsx src/scripts/otc-oral-combo-store-leaflet-runner.ga.ts --config=<path> --group=<key> --lang=ko|en [--apply]
 *   npx tsx src/scripts/otc-oral-combo-store-leaflet-runner.ga.ts --selftest   # 비DB
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T = { id?: string }>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const firstRow = <T = Record<string, unknown>>(res: unknown): T | undefined => retRows<T>(res)[0];
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'] as const;

/** targetFp → 결정론 source_ref 앵커 uuid */
function fpToUuid(fp: string): string {
  const h = md5(`otc-combo-leaflet:${fp}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── fingerprint (bridge/audit VERBATIM) ──
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string { return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim(); }
function easySections(c: string): Record<string, string> { const o: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(c))) o[m[1].trim()] = m[2].trim(); return o; }
function freeSections(c: string): Record<string, string> { const o: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(c))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) o[t] = (o[t] ? o[t] + '\n' : '') + b; } return o; }
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } { let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }
const formOf = (n: string): string => /연질캡슐/.test(n) ? '연질캡슐' : /캡슐/.test(n) ? '캡슐' : /연고/.test(n) ? '연고' : /크림/.test(n) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(n) ? '첩부제' : /점안/.test(n) ? '점안액' : /시럽/.test(n) ? '시럽' : /과립|산\(/.test(n) ? '과립/산' : /정/.test(n) ? '정' : /액/.test(n) ? '액' : '기타';
function routeSig(n: string): string { if (/질정|질좌|질내정|질\s?삽입/.test(n)) return 'vaginal'; if (/좌약|좌제/.test(n)) return 'rectal'; if (/점안|안연고/.test(n)) return 'ophthalmic'; if (/점이액|귀에/.test(n)) return 'otic'; if (/점비|비강/.test(n)) return 'nasal'; if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(n)) return 'topical'; if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(n)) return 'oral'; return 'unknown'; }
const ingredientOf = (n: string): string => (n.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (s: string): string => (s || '').split(' / ')[0].trim();
function safetySig(dos: string, cau: string): string { const num = [...new Set((normalize(dos).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|정|캡슐|회|시간|일|주|개월|mL|㎖|IU|iu|%)/gi) || []).map((x) => x.replace(/\s+/g, '').toLowerCase()))].sort().join('|'); const age = [...new Set((normalize(dos + ' ' + cau).match(/(만\s?)?\d+\s*세\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인/g) || []).map((x) => x.replace(/\s+/g, '')))].sort().join('|'); return H(num) + ':' + H(age); }
function fpOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; safety: string } { let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || ''); const { ind, dos, cau } = bucketSections(sec); const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|')); return { fp, route: routeSig(name), form: formOf(name), safety: safetySig(dos, cau) }; }

interface GroupCfg { key: string; sourceType: string; targetFp: string; target_master_ids: string[]; title: string; content_json: Record<string, unknown>; en: DrugOtcEnTranslation; }

async function runKo(ds: any, cfg: GroupCfg, apply: boolean): Promise<Record<string, unknown>> {
  const mode = apply ? 'APPLY' : 'dry-run';
  const sourceRef = fpToUuid(cfg.targetFp);
  const masterIds = [...cfg.target_master_ids].sort();
  const EXP = masterIds.length;
  const report: any = { wo: 'WO-O4O-OTC-ORAL-MULTI-INGREDIENT-STORE-LEAFLET-PRODUCTION-GA-V2', lang: 'ko', mode, status: 'INIT', dbWrite: 0, groupKey: cfg.key, sourceType: cfg.sourceType, sourceRef, expected: EXP, anomalies: [] as string[] };

  // coarse: fetch target masters' name/spec + easy content
  const rows = retRows<{ id: string; name: string; spec: string; content: string; st: string }>(await ds.query(
    `SELECT pm.id::text id, pm.name, pm.specification spec, es.content, es.st
     FROM product_masters pm
     JOIN LATERAL (SELECT content, status st FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
     WHERE pm.id = ANY($1::uuid[]) ORDER BY pm.id`, [masterIds]));
  report.fetched = rows.length;
  if (rows.length !== EXP) report.anomalies.push(`fetched ${rows.length} !== expected ${EXP}`);
  // fingerprint 재현 게이트 + 균일성
  const fps = rows.map((r) => ({ id: r.id, ...fpOf(r.name, r.spec, r.content) }));
  const offFp = fps.filter((f) => f.fp !== cfg.targetFp);
  if (offFp.length) report.anomalies.push(`fp 재현 실패 ${offFp.length} (targetFp=${cfg.targetFp})`);
  if (new Set(fps.map((f) => f.route)).size > 1 || fps[0]?.route !== 'oral') report.anomalies.push('route 비oral/불균일');
  if (new Set(fps.map((f) => f.form)).size > 1) report.anomalies.push('form 불균일');
  if (new Set(fps.map((f) => f.safety)).size > 1) report.anomalies.push('safety 불균일');

  // 슬롯 상태: easy ko canonical 정확히 1 · authored 충돌 0
  const slot = firstRow<{ easy1: string; authored: string; anyc: string }>(await ds.query(
    `SELECT
       (SELECT count(*) FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1)::text easy1,
       (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review') AND s.source_type = ANY($2) AND s.deleted_at IS NULL)::text authored,
       (SELECT count(DISTINCT master_id) FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL)::text anyc`, [masterIds, AUTHORED_SOURCES as unknown as string[]]));
  report.easyCanonicalExactly1 = parseInt(slot!.easy1, 10);
  report.authoredConflict = parseInt(slot!.authored, 10);
  report.anyCanonical = parseInt(slot!.anyc, 10);
  if (report.easyCanonicalExactly1 !== EXP) report.anomalies.push(`easy ko canonical 정확히1 아님 ${report.easyCanonicalExactly1}/${EXP}`);

  // ALREADY_COMPLETE: authored canonical == EXP 이미
  const authoredCanon = firstRow<{ n: string }>(await ds.query(
    `SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL`, [masterIds, cfg.sourceType, sourceRef]));
  report.existingAuthoredCanonical = parseInt(authoredCanon!.n, 10);

  // build KO html
  const built = buildDrugOtcConsumerHtml(cfg.content_json as never, { title: cfg.title });
  if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
  if (!built.html) report.anomalies.push('빈 html');
  if (built.html.includes('<table')) report.anomalies.push('<table>');
  if (built.html.includes('<!--')) report.anomalies.push('주석');
  if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
  report.htmlLen = built.html.length; report.htmlMd5 = md5(built.html);
  const summary = String((cfg.content_json as any)?.summaryTable?.['작용'] ?? (cfg.content_json as any)?.summaryTable?.['주요 증상'] ?? '') || null;
  report.summary = summary;
  report.writePlan = { STEP_A_authored_needs_review_INSERT: EXP - report.authoredConflict, STEP_B_easy_demote: EXP, STEP_B_authored_flip: EXP, audit: EXP };

  if (report.existingAuthoredCanonical === EXP && report.authoredConflict === EXP && offFp.length === 0) {
    report.status = 'ALREADY_COMPLETE'; report.note = 'target 전부 이미 authored canonical(본 앵커) — write 0'; return report;
  }
  if (report.authoredConflict !== 0) report.anomalies.push(`기존 authored 슬롯 충돌 ${report.authoredConflict} (예상 0)`);
  if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }

  if (!apply) { report.status = 'PASS'; return report; }

  report.dbWrite = 1;
  const qr = ds.createQueryRunner(); await qr.connect();
  // STEP A
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
  // STEP B
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
        [mid, easyId, newId, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug', newSource: cfg.sourceType, source_ref_id: sourceRef, groupKey: cfg.key, wo: report.wo })]);
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
  const report: any = { wo: 'WO-O4O-OTC-ORAL-MULTI-INGREDIENT-STORE-LEAFLET-PRODUCTION-GA-V2', lang: 'en', mode, status: 'INIT', dbWrite: 0, groupKey: cfg.key, sourceType: cfg.sourceType, sourceRef, anomalies: [] as string[] };
  // 대상 = ko canonical(본 앵커)
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
  const f1 = fpOf('위엔스탈정', '100밀리그램 / 10 / 정 / PTP', '<p><strong>효능·효과</strong><br>위산과다</p><p><strong>용법·용량</strong><br>성인 1회 2정</p>');
  const f2 = fpOf('위엔스탈정', '100밀리그램 / 500 / 정 / 병', '<p><strong>효능·효과</strong><br>위산과다</p><p><strong>용법·용량</strong><br>성인 1회 2정</p>');
  eq('fp 결정성', f1.fp, f2.fp); eq('route oral', f1.route, 'oral'); eq('form 정', f1.form, '정');
  eq('uuid 결정성', fpToUuid('0273b8335509d44c'), fpToUuid('0273b8335509d44c'));
  const b = buildDrugOtcConsumerHtml({ efficacy: 'x', usage: 'y', caution: 'a\n\nb', summaryTable: { 분류: '일반의약품' } } as never, { title: 'T' });
  eq('ko build ok', b.missing.length, 0); eq('sd-warn', b.html.includes('sd-warn'), true);
  const e = buildDrugOtcEnConsumerHtml({ groupKey: 'g', title: 'T', usageLabel: 'How to take it', efficacy: 'x', usage: 'y', caution: 'A. B.', summaryTable: { Category: 'OTC' } });
  eq('en build ok', e.missing.length, 0);
  if (fails.length) { console.error('SELFTEST FAIL\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('SELFTEST PASS — fp 결정성/route/form · uuid 앵커 · ko/en 빌더. DB 미접속.');
}

async function main(): Promise<void> {
  if (process.argv.includes('--selftest')) { selfTest(); return; }
  const configPath = arg('config'); const groupArg = arg('group'); const lang = arg('lang') || 'ko';
  if (!configPath || !groupArg) { console.error('--config=<path> --group=<key> --lang=ko|en 필요 (또는 --selftest)'); process.exit(2); }
  const j = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), configPath), 'utf8'));
  const map: Record<string, GroupCfg> = j.groups || {};
  const cfg = map[groupArg];
  if (!cfg) { console.error(`config 에 group=${groupArg} 없음. 등록: ${Object.keys(map).join(', ')}`); process.exit(2); }
  const apply = process.argv.includes('--apply') && ((lang === 'ko' && process.env.OTC_COMBO_LEAFLET_KO_CONFIRM === 'YES') || (lang === 'en' && process.env.OTC_COMBO_LEAFLET_EN_CONFIRM === 'YES'));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5434', 10), username: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  let report: any;
  try {
    report = lang === 'en' ? await runEn(ds, cfg, apply) : await runKo(ds, cfg, apply);
  } catch (e) {
    report = report ?? { status: 'FAIL' }; report.error = e instanceof Error ? e.message : String(e);
    fs.writeFileSync(path.join(OUT_DIR, `otc-combo-leaflet-${groupArg}-${lang}.run.json`), JSON.stringify(report, null, 2), 'utf8');
    await ds.destroy(); console.error('FATAL', report.error); process.exit(1);
  }
  await ds.destroy();
  fs.writeFileSync(path.join(OUT_DIR, `otc-combo-leaflet-${groupArg}-${lang}.run.json`), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${report.mode}] group=${cfg.key} lang=${lang} status=${report.status} · 대상 ${report.expected ?? report.targetMasters} · 이상 ${(report.anomalies || []).length}`);
  if (report.status === 'ABORT' || report.status === 'FAIL') process.exit(1);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
