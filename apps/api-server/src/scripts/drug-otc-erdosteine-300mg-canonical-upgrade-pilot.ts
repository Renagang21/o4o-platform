/**
 * WO-O4O-OTC-ERDOSTEINE-300MG-CANONICAL-UPGRADE-PILOT-DRYRUN-DA-V1
 *
 * 첫 Track A(e약은요 → authored canonical 교체) 파일럿: 에르도스테인 300mg 정.
 *   대상 = bridge SSOT `authored그대로확장` fp=4b4e162690065e8e 의 26 master (정본 90342ce7d).
 *   제외 = fp=d68b3eec1cb56646 `안전지문불일치` 4 master (coarse 30 = 26 + 4).
 *   authored source_ref_id = 03e0af9d-5236-460a-86d4-1af8b0c00c61.
 *
 * 정책: OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1 (커밋 89379627d) Option A.
 *   STEP A: authored ko needs_review 준비·검증(demote 이전). STEP B 단일 TX: demote easy→deprecated → flip
 *   authored needs_review→canonical → 사후검증(canonical 1·authored·deprecated easy 1·dup 0) → audit → COMMIT.
 *
 * dry-run 기본(read-only·DB write 0). apply 이중게이트: --apply + DRUG_OTC_ERDO_UPGRADE_CONFIRM=YES.
 * ⚠️ audit 수 정책 불일치 플래그: 엔티티 SharedProductDescriptionAuditLog 는 canonical_replaced **1행/교체**
 *   (previous+new 동시 기록) → 26. 정책 §2-A "audit 2/master=52" 와 다름 → 실제 apply 전 정합 필요(보고).
 *
 * Usage(apps/api-server): npx tsx src/scripts/drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts [--apply]
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
// TypeORM query() 의 UPDATE/INSERT ... RETURNING 결과는 드라이버에 따라 `[rows, affected]` 또는 `rows` 로 온다.
// (guide Gotcha #3) rows 만 정규화 반환. SELECT(res[0]=행 객체)는 그대로.
const retRows = (res: unknown): Array<{ id?: string }> => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as Array<{ id?: string }>;

const GROUP = { key: '에르도스테인|300밀리그램|정', ingredient: '에르도스테인', dose: '300밀리그램', formKeyword: '정' };
const CANDIDATE = '03e0af9d-5236-460a-86d4-1af8b0c00c61';
const TARGET_FP = '4b4e162690065e8e';   // bridge SSOT authored그대로확장 (26)
const EXCLUDE_FP = 'd68b3eec1cb56646';  // bridge SSOT 안전지문불일치 (4)
const EXPECTED = 26;
const AUTHORED_SOURCE = 'mfds_drug_otc';

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
// ── fingerprint = bridge 정본(f2c819451 / drug-otc-full-corpus-authored-bridge-integration.ts) 함수 VERBATIM 채용 ──
//    (bridge 산식 변경 아님 — 동치 재현. 이전 커스텀 sections/cau(상호작용 포함) 오차가 fp 미재현의 원인이었음.)
function easySections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out;
}
function freeSections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) { const title = m[2].replace(/[:：]\s*$/, '').trim(); const body = m[3].trim(); if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body; }
  return out;
}
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string; itx: string } {
  let ind = '', dos = '', cau = '', itx = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/상호\s*작용|병용/.test(t)) itx += (itx ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau, itx };
}
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
/** bridge groupKeyOf VERBATIM: H([norm_ind, norm_dos, norm_cau, H(성분|함량), H(제형), route]) — cau 는 bucketSections(상호작용 제외) */
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; ingredient: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form, ingredient };
}

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_ERDO_UPGRADE_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();

  const report: any = { wo: 'WO-O4O-OTC-ERDOSTEINE-300MG-CANONICAL-UPGRADE-PILOT-DRYRUN-DA-V1', mode, dbWrite: 0, group: GROUP.key, candidate: CANDIDATE, policy: '89379627d Option A', anomalies: [] as string[] };
  try {
    // draft
    const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
      `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid AND deleted_at IS NULL LIMIT 1`, [CANDIDATE]);
    if (draft.length !== 1) throw new Error(`draft(candidate ${CANDIDATE}) ${draft.length} !== 1 → ABORT`);
    const d = draft[0];
    report.draftTitle = d.title;

    // coarse 재열거 + fingerprint 재고정
    const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [GROUP.ingredient, GROUP.dose, GROUP.formKeyword]);
    const withFp = coarse.map((r) => { const f = fingerprintOf(r.name, r.spec, r.content); return { ...r, ...f }; });
    const target = withFp.filter((r) => r.fp === TARGET_FP);
    const excluded = withFp.filter((r) => r.fp === EXCLUDE_FP);
    const other = withFp.filter((r) => r.fp !== TARGET_FP && r.fp !== EXCLUDE_FP);
    const masterIds = target.map((r) => r.id).sort();
    const excludeIds = new Set(excluded.map((r) => r.id));
    report.coarseTotal = coarse.length;
    report.target26 = target.length; report.excluded4 = excluded.length; report.otherFp = other.length;
    report.excludedDetail = excluded.map((r) => ({ id: r.id, name: r.name, reason: '안전지문불일치(fp d68b3eec1cb56646, bridge SSOT)' }));
    report.target_master_ids = masterIds; report.rollback_master_ids = masterIds;
    report.targetExcludeIntersection = masterIds.filter((id) => excludeIds.has(id)).length; // 교집합 0 이어야
    report.fpDistribution = Object.entries(withFp.reduce((a: Record<string, number>, r) => { a[r.fp] = (a[r.fp] || 0) + 1; return a; }, {})).map(([fp, n]) => ({ fp, n, ssot: fp === TARGET_FP ? '그대로확장' : fp === EXCLUDE_FP ? '안전지문불일치' : '미분류' }));
    report.nonOralNames = target.filter((r) => r.route !== 'oral').map((r) => r.name);

    if (target.length !== EXPECTED) report.anomalies.push(`target ${target.length} !== EXPECTED ${EXPECTED} (bridge SSOT 그대로확장 재고정 불일치)`);
    if (excluded.length !== 4) report.anomalies.push(`excluded ${excluded.length} !== 4 (안전지문불일치 SSOT 재고정 불일치)`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('target master 중복');
    if (report.targetExcludeIntersection !== 0) report.anomalies.push(`target∩exclude ${report.targetExcludeIntersection} !== 0`);
    if (other.length !== 0) report.anomalies.push(`SSOT 미분류 fingerprint ${other.length} (coarse 30=26+4 외)`);
    if (report.nonOralNames.length) report.anomalies.push(`비경구 혼입 ${report.nonOralNames.length}`);
    // 진단 JSON: ABORT 전에도 남긴다(WO §6). 성공 시 아래에서 최종본으로 덮어씀.
    fs.writeFileSync(path.join(OUT_DIR, 'otc-erdosteine-300mg-upgrade-dryrun-v1.json'), JSON.stringify({ ...report, stage: 'pre-gate 진단' }, null, 2), 'utf8');

    // 슬롯 상태: e약은요 STORE ko canonical 정확히 1 · authored canonical/needs_review 충돌
    const slot: Array<{ easy: string; authored_canon: string; authored_nr: string; anyc: string }> = masterIds.length ? await ds.query(`
      SELECT
        count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::text easy,
        count(*) FILTER (WHERE src IN ('mfds_drug_otc','nutrition_combo') AND st='canonical')::text authored_canon,
        count(*) FILTER (WHERE src IN ('mfds_drug_otc','nutrition_combo') AND st='needs_review')::text authored_nr,
        count(DISTINCT mid) FILTER (WHERE st='canonical')::text anyc
      FROM (
        SELECT s.master_id mid, s.source_type src, s.status st
        FROM shared_product_descriptions s
        WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ) t`, [masterIds]) : [{ easy: '0', authored_canon: '0', authored_nr: '0', anyc: '0' }];
    // e약은요 정확 1건/ master
    const easyPer: Array<{ n: string }> = masterIds.length ? await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]) : [{ n: '0' }];
    report.easyCanonicalExactly1 = parseInt(easyPer[0].n, 10);
    report.authoredCanonicalConflict = parseInt(slot[0].authored_canon, 10);
    report.existingAuthoredNeedsReview = parseInt(slot[0].authored_nr, 10);
    report.easyCanonicalTotal = parseInt(slot[0].easy, 10);

    if (report.easyCanonicalExactly1 !== EXPECTED) report.anomalies.push(`e약은요 STORE ko canonical 정확히1 아닌 master (${report.easyCanonicalExactly1}/${EXPECTED})`);
    if (report.authoredCanonicalConflict !== 0) report.anomalies.push(`기존 authored canonical 충돌 ${report.authoredCanonicalConflict}`);

    // draft HTML 빌드·검증
    const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.htmlLen = built.html.length; report.contentHash = md5(built.html);
    report.summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;

    // 예상 write (정책 §2-A) — dry-run 산정
    const authoredNrInsert = EXPECTED - report.existingAuthoredNeedsReview; // 신규 needs_review INSERT
    report.예상write = {
      STEP_A_authored_needs_review_INSERT: authoredNrInsert,
      STEP_B_easy_canonical_demote: EXPECTED,
      STEP_B_authored_canonical_flip: EXPECTED,
      audit_log_canonical_replaced: EXPECTED, // 엔티티 모델: 1행/교체(previous+new)
      SPD_write_total: authoredNrInsert + EXPECTED + EXPECTED,
      audit_write_total: EXPECTED,
      grand_total: authoredNrInsert + EXPECTED + EXPECTED + EXPECTED,
    };
    report.auditCountFlag = {
      entity_model: `SharedProductDescriptionAuditLog canonical_replaced = 1행/교체(previous_description_id+new_description_id 동시) → ${EXPECTED}`,
      policy_2A: 'audit 2/master = 52 (demote 1 + flip 1)',
      status: '불일치 — 실제 apply 전 정합 필요(엔티티는 1행/교체 설계). dry-run 은 엔티티 기준 26으로 산정.',
    };

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`);

    // === APPLY (이중게이트 통과 시만) — 정책 §2 STEP A + STEP B ===
    if (apply) {
      report.dbWrite = 1;
      const qr = ds.createQueryRunner(); await qr.connect();
      // STEP A: authored ko needs_review 준비 (멱등)
      await qr.startTransaction();
      try {
        const insA = await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'ko', 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
           RETURNING id`, [masterIds, AUTHORED_SOURCE, built.html, CANDIDATE, report.summary]);
        report.stepA_inserted = retRows(insA).length; // 재실행 시 기존 26 needs_review → 0 (no-op)
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      // STEP B: 단일 TX 슬롯 교체 (master 루프 — 각 master 슬롯 원자성은 TX 전체로 보장)
      await qr.startTransaction();
      try {
        let demoted = 0, flipped = 0, audited = 0;
        for (const mid of masterIds) {
          const cur: Array<{ id: string; source_type: string }> = await qr.query(
            `SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]);
          if (cur.length === 0) throw new Error(`master ${mid} canonical 0건 → ABORT`);
          if (cur.length > 1) throw new Error(`master ${mid} canonical ${cur.length}건 → ABORT`);
          if (['mfds_drug_otc', 'nutrition_combo'].includes(cur[0].source_type)) continue; // 이미 authored → no-op
          if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ABORT`);
          const easyId = cur[0].id;
          const demote = await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]);
          if (retRows(demote).length !== 1) throw new Error(`master ${mid} easy demote ${retRows(demote).length}건 !== 1 → ABORT`);
          demoted += 1;
          const flip = await qr.query(
            `UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid]);
          const flipRows = retRows(flip);
          const newId = flipRows[0]?.id ?? null;
          if (flipRows.length !== 1 || !newId) throw new Error(`master ${mid} authored needs_review flip ${flipRows.length}건 → ABORT`);
          flipped += 1;
          await qr.query(
            `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
             VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
            [mid, easyId, newId, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug', newSource: AUTHORED_SOURCE, source_ref_id: CANDIDATE, wo: report.wo })]);
          audited += 1;
        }
        report.stepB_demoted = demoted; report.stepB_flipped = flipped; report.stepB_audited = audited;
        // 사후검증
        const post: Array<{ canon1: string; authored: string; dep: string; dup: string }> = await qr.query(`
          SELECT
            count(*) FILTER (WHERE canoncnt=1)::text canon1,
            count(*) FILTER (WHERE authored_canon)::text authored,
            count(*) FILTER (WHERE dep_easy)::text dep,
            count(*) FILTER (WHERE canoncnt>1)::text dup
          FROM (
            SELECT mid,
              (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
              EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon,
              EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
            FROM unnest($1::uuid[]) mid
          ) t`, [masterIds]);
        const postRow = (retRows(post)[0] as unknown as { canon1: string; authored: string; dep: string; dup: string }); // SELECT 은 그대로, 방어적 정규화
        report.post = { canonical1: parseInt(postRow.canon1, 10), authored: parseInt(postRow.authored, 10), deprecatedEasy: parseInt(postRow.dep, 10), dup: parseInt(postRow.dup, 10) };
        if (report.post.canonical1 !== EXPECTED || report.post.authored !== EXPECTED || report.post.deprecatedEasy !== EXPECTED || report.post.dup !== 0)
          throw new Error(`사후검증 실패 canon1=${report.post.canonical1} authored=${report.post.authored} dep=${report.post.deprecatedEasy} dup=${report.post.dup} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      await qr.release();
    }
  } finally { await ds.destroy(); }

  fs.writeFileSync(path.join(OUT_DIR, 'otc-erdosteine-300mg-upgrade-dryrun-v1.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] target ${report.target26}/${EXPECTED} · 제외 ${report.excluded4} · authored충돌 ${report.authoredCanonicalConflict} · 기존nr ${report.existingAuthoredNeedsReview} · 이상 ${report.anomalies.length}`);
  if (!apply) console.log('  (dry-run — write 0. apply: --apply + DRUG_OTC_ERDO_UPGRADE_CONFIRM=YES, 별도 승인)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
