/**
 * WO-O4O-OTC-NO-CANONICAL-PILOT-WRITE-DESIGN-DA-V1 — 첫 Model B canonical write 파일럿 (파모티딘 10mg 정)
 *
 * e약은요-미보유(STORE canonical 無) OTC 첫 파일럿. curated draft 0057f50c(파모티딘 10mg 정)를
 *   promotable 24 master 에 ko STORE canonical 로 승격. source_ref_id=draft candidate_id 공유(정책 확정).
 *   ⚠️ grounded 무성분명(e약은요 보유)은 제외 대상 — 여기 24는 STORE canonical 슬롯이 비어 unique 제약 무충돌.
 *
 * dry-run 기본(read-only·DB write 0). apply 는 이중 게이트: --apply + DRUG_OTC_PILOT_FAMO_KO_CONFIRM=YES.
 *   승격은 needs_review INSERT → canonical flip 2-STEP(각 단일 TX). 불일치 시 ROLLBACK. 멱등(no-op 재실행).
 *
 * 안전 게이트: promotable 재열거 == EXPECTED(24) / rx 0 / 비경구(질정 등) 0 / 기존 ko·en canonical·needs_review 0 /
 *   draft 완성(efficacy·usage·caution·summaryTable) / HTML: missing·빈·<table>·주석·이중escape·sd-warn無 → ABORT.
 * source_ref_id=0057f50c 공유(F12: canonical 유일성=master_id+type+language, source_ref_id 非키). 기존 canonical UPDATE 0.
 *
 * 산출: otc-modelB-apply-pilot-famotidine-dryrun-v1.json
 * Usage(apps/api-server): npx tsx src/scripts/drug-otc-modelB-apply-pilot-famotidine.ts [--apply]
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

const GROUP = { key: '파모티딘|10밀리그램|정', ingredient: '파모티딘', dose: '10밀리그램', formKeyword: '정' };
const SOURCE_TYPE = 'mfds_drug_otc';
const LANGUAGE = 'ko';
const EXPECTED_PROMOTE = 24;
const NON_ORAL_RE = /질정|질좌|질내|좌제|좌약|점안|안연고|점이|점비|비강|외용|크림|연고|로션|겔|젤|패치|첩부|카타플|파스|스프레이|가글|트로키/;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_PILOT_FAMO_KO_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();

  const report: any = { wo: 'WO-O4O-OTC-NO-CANONICAL-PILOT-WRITE-DESIGN-DA-V1', mode, dbWrite: 0, group: GROUP.key, anomalies: [] as string[] };
  try {
    // draft
    const draft: Array<{ candidate_id: string; title: string; content_json: Record<string, unknown> }> = await ds.query(
      `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts
        WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [GROUP.key]);
    if (draft.length !== 1) throw new Error(`draft ${draft.length} !== 1 → ABORT`);
    const d = draft[0];
    report.candidate = d.candidate_id; report.title = d.title;

    const grpBase = `pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'`;
    const P = [GROUP.ingredient, GROUP.dose, GROUP.formKeyword];
    // promotable 재열거 = OTC · rx 아님 · STORE ko canonical 無 (실행 시점 재고정)
    const pt: Array<{ id: string; name: string }> = await ds.query(
      `SELECT pm.id::text id, pm.name FROM product_masters pm
        WHERE ${grpBase}
          AND EXISTS (SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='otc')
          AND NOT EXISTS (SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='rx')
          AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND COALESCE(s.language,'ko')='ko')
        ORDER BY pm.id`, P);
    const promotable = pt.map((r) => r.id);
    report.promotable = promotable.length; report.rollback_master_ids = promotable;

    // rx 혼입 / 비경구 / needs_review / en canonical 게이트
    const rx: Array<{ n: string }> = await ds.query(`SELECT count(DISTINCT pm.id)::text n FROM product_masters pm JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL AND e.drug_category='rx' WHERE ${grpBase}`, P);
    report.rxInGroup = parseInt(rx[0].n, 10); // 참고: 그룹 내 rx-only(승격 대상 아님). 파모티딘 10mg 은 rx·otc 공존.
    // 안전 게이트: promotable 24 중 rx 혼입 여부(0 이어야) — promotable 은 NOT EXISTS rx 로 이미 제외됨(방어적 재확인)
    const promRx: Array<{ n: string }> = await ds.query(`SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE EXISTS (SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id=mid AND e.deleted_at IS NULL AND e.drug_category='rx')`, [promotable]);
    report.promotableRx = parseInt(promRx[0].n, 10);
    report.nonOralNames = pt.filter((r) => NON_ORAL_RE.test(r.name)).map((r) => r.name);
    const koNR: Array<{ n: string }> = await ds.query(`SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='needs_review' AND s.description_type='STORE' AND s.deleted_at IS NULL AND COALESCE(s.language,'ko')='ko')`, [promotable]);
    report.koNeedsReviewConflict = parseInt(koNR[0].n, 10);
    const enC: Array<{ n: string }> = await ds.query(`SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.language='en')`, [promotable]);
    report.enCanonicalConflict = parseInt(enC[0].n, 10);

    // 게이트 판정
    if (promotable.length !== EXPECTED_PROMOTE) report.anomalies.push(`promotable ${promotable.length} !== EXPECTED ${EXPECTED_PROMOTE}`);
    if (new Set(promotable).size !== promotable.length) report.anomalies.push('promotable master 중복');
    if (report.promotableRx !== 0) report.anomalies.push(`promotable 내 rx 혼입 ${report.promotableRx}`);
    if (report.nonOralNames.length) report.anomalies.push(`비경구 혼입 ${report.nonOralNames.length}`);
    if (report.koNeedsReviewConflict !== 0) report.anomalies.push(`ko needs_review 충돌 ${report.koNeedsReviewConflict}`);
    if (report.enCanonicalConflict !== 0) report.anomalies.push(`en canonical 충돌 ${report.enCanonicalConflict}`);

    // HTML 빌드·검증 (bodyMarkdown 미사용)
    const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.htmlLen = built.html.length; report.contentHash = md5(built.html);
    report.summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;
    report.sourceRefId = d.candidate_id; // 공유 정책
    report.예상 = { ko_needs_review_INSERT: promotable.length, ko_canonical_flip: promotable.length, en_needs_review_INSERT_after_translation: promotable.length, en_canonical_flip_after_translation: promotable.length, 기존_canonical_UPDATE: 0 };

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`);

    // === APPLY (이중 게이트 통과 시만) — needs_review INSERT → canonical flip, 2-STEP 단일 TX ===
    if (apply) {
      report.dbWrite = 1;
      const qr = ds.createQueryRunner(); await qr.connect();
      // STEP1: needs_review INSERT (멱등: 기존 canonical/needs_review 없을 때만)
      await qr.startTransaction();
      try {
        const ins = await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $4, $5, $2, $3::uuid, 'needs_review', $6, 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.deleted_at IS NULL AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review'))
           RETURNING id`, [promotable, SOURCE_TYPE, d.candidate_id, built.html, report.summary, LANGUAGE]);
        report.needsReviewInserted = Array.isArray(ins) ? ins.length : 0;
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      // STEP2: needs_review → canonical flip
      await qr.startTransaction();
      try {
        const flip = await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
            WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE' AND language=$3 AND status='needs_review' AND deleted_at IS NULL
              AND master_id = ANY($4::uuid[]) RETURNING id`, [d.candidate_id, SOURCE_TYPE, LANGUAGE, promotable]);
        report.canonicalFlipped = Array.isArray(flip) ? flip.length : 0;
        // 사후: 중복 0 + canonical count == EXPECTED
        const dup: Array<{ n: string }> = await qr.query(`SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND deleted_at IS NULL AND COALESCE(language,'ko')='ko' GROUP BY master_id HAVING count(*)>1) t`, [promotable]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`canonical 중복 ${dup[0].n} → ROLLBACK`);
        const koc: Array<{ n: string }> = await qr.query(`SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE' AND language=$3 AND status='canonical' AND deleted_at IS NULL`, [d.candidate_id, SOURCE_TYPE, LANGUAGE]);
        report.koCanonicalAfter = parseInt(koc[0].n, 10);
        if (report.koCanonicalAfter !== EXPECTED_PROMOTE) throw new Error(`ko canonical(after) ${report.koCanonicalAfter} !== ${EXPECTED_PROMOTE} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      await qr.release();
    }
  } finally { await ds.destroy(); }

  fs.writeFileSync(path.join(OUT_DIR, 'otc-modelB-apply-pilot-famotidine-dryrun-v1.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] promotable ${report.promotable} · rx ${report.rxInGroup} · 비경구 ${report.nonOralNames?.length ?? '-'} · koNR충돌 ${report.koNeedsReviewConflict} · enCanon충돌 ${report.enCanonicalConflict} · 이상 ${report.anomalies.length}`);
  if (!apply) console.log('  (dry-run — write 0. apply: --apply + DRUG_OTC_PILOT_FAMO_KO_CONFIRM=YES, 별도 승인)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
