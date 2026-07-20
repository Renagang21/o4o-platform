/**
 * WO-O4O-OTC-TRIMEBUTINE-100MG-EN-COMPLETE-DA-V1
 *
 * 트리메부틴말레산염 100mg 정 66 target 의 영어 STORE 설명서를 en needs_review 전개 → canonical 완결.
 *
 * 배경(중요 — 스코프):
 *   - candidate/source_ref_id `003beef8…` 는 **104 ko canonical 에 공유**(66 target[fp 7a4aab0b] + 38 out66).
 *     out66 38 은 이미 en canonical LIVE(byte-uniform). → source_ref_id 로 master 를 잡으면 104 를 잡아
 *     기존 en canonical 38 과 충돌. 따라서 **대상은 grounded-upgrade runner 산출 66 master_id 리스트로만 스코프**한다.
 *   - 66 ko canonical == 38 ko canonical (byte-identical, md5 4076161888…) = 동일 약물.
 *     번역 = out66 38 의 검토완료 en 을 재구성(otc-en-translations-trimebutine-100mg-v1.json).
 *     **일관성 게이트**: build(en) 가 live out66 en 과 byte-identical 이어야 진행(새 medical fact 0 증명).
 *
 * 정책: BULK-TRANSLATION-EXECUTION-GUIDE §3~§6 · 0-B(grounded ko canonical 충실 번역=허용).
 *   INSERT/상태전환만. 단일 TX. 이중게이트. dry-run 우선. ko canonical UPDATE 0.
 *
 * dry-run 기본. apply 이중게이트: --apply + DRUG_OTC_TRIMEBUTINE_EN_CONFIRM=YES.
 *   apply = STEP1 en needs_review INSERT(TX1) → STEP2 canonical flip(TX2, 지문 불변 증명).
 *
 * Usage(apps/api-server): npx tsx src/scripts/drug-otc-trimebutine-100mg-en.ts [--apply]
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_FILE = 'otc-trimebutine-100mg-en-complete.run.json';
const KO_RUN = path.join(OUT_DIR, 'otc-grounded-upgrade-trimebutine-100mg-jeong.run.json');
const EN_TRANSLATION = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-trimebutine-100mg-v1.json');

const GROUP_KEY = '트리메부틴말레산염|100밀리그램|정';
const CANDIDATE = '003beef8-82c4-4897-a176-d0ea8a695699';
const SOURCE_TYPE = 'mfds_drug_otc';
const EXPECTED = 66;

// TypeORM query() RETURNING 정규화(guide Gotcha #3): [rows, affected] | rows | [].
const retRows = <T = { id?: string }>(res: unknown): T[] =>
  (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_TRIMEBUTINE_EN_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  // 66 target master (grounded-upgrade runner 산출 — 권위 스코프)
  const masterIds: string[] = JSON.parse(fs.readFileSync(KO_RUN, 'utf8')).rollback_master_ids;
  // 번역(그룹당 1건)
  const enFile = JSON.parse(fs.readFileSync(EN_TRANSLATION, 'utf8')) as { translations: DrugOtcEnTranslation[]; summary?: string };
  const trs = enFile.translations.filter((t) => t.groupKey === GROUP_KEY);
  const summaryField = enFile.summary ?? null;

  const report: any = {
    wo: 'WO-O4O-OTC-TRIMEBUTINE-100MG-EN-COMPLETE-DA-V1', mode, status: 'INIT', dbWrite: 0,
    groupKey: GROUP_KEY, writeOwner: { kind: 'authored_source_ref_id', value: CANDIDATE, sourceType: SOURCE_TYPE },
    expected: EXPECTED, targetMasters: masterIds.length, anomalies: [] as string[],
  };

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  try {
    if (masterIds.length !== EXPECTED) report.anomalies.push(`target master ${masterIds.length} !== ${EXPECTED}`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('target master 중복');
    if (trs.length !== 1) report.anomalies.push(`번역 그룹당 1건 아님 (${trs.length})`);

    // 66 상태: ko canonical(mfds_drug_otc) / en STORE
    const st = retRows<{ ko_canon: string; en_any: string; en_canon: string; en_nr: string }>(await ds.query(`
      SELECT
        count(*) FILTER (WHERE lang='ko' AND status='canonical' AND source_type=$2)::text ko_canon,
        count(*) FILTER (WHERE lang='en')::text en_any,
        count(*) FILTER (WHERE lang='en' AND status='canonical')::text en_canon,
        count(*) FILTER (WHERE lang='en' AND status='needs_review')::text en_nr
      FROM (SELECT s.master_id, COALESCE(s.language,'ko') lang, s.status, s.source_type
            FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL) x`,
      [masterIds, SOURCE_TYPE]))[0];
    report.koCanonical = parseInt(st.ko_canon, 10);
    report.existingEnAny = parseInt(st.en_any, 10);
    report.existingEnCanonical = parseInt(st.en_canon, 10);
    report.existingEnNeedsReview = parseInt(st.en_nr, 10);
    if (report.koCanonical !== EXPECTED) report.anomalies.push(`66 ko canonical ${report.koCanonical} !== ${EXPECTED}`);

    // 일관성 참조: 동일 약물 out66(source_ref_id 공유, 66 밖) en canonical 지문
    const ref = retRows<{ h: string; n: string }>(await ds.query(`
      SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1`, [CANDIDATE, masterIds]));
    report.referenceEn = ref.map((r) => ({ md5: r.h, n: parseInt(r.n, 10) }));

    // build en
    const tr = trs[0];
    const built = trs.length === 1 ? buildDrugOtcEnConsumerHtml(tr) : { html: '', missing: ['no-translation'] };
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (/[가-힣]/.test(built.html)) report.anomalies.push('한글 포함');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.builtLen = built.html.length; report.builtMd5 = md5(built.html);

    // 일관성 게이트: build == live out66 en (동일 약물 → byte-identical 이어야, 새 fact 0 증명)
    if (ref.length === 1) {
      report.consistencyMatch = report.builtMd5 === ref[0].h;
      if (!report.consistencyMatch) report.anomalies.push(`일관성 불일치: build md5 ${report.builtMd5} !== live out66 en ${ref[0].h}`);
    } else if (ref.length > 1) {
      report.anomalies.push(`out66 en canonical 지문 비균일 (${ref.length}종) — 재사용 기준 모호`);
    } else {
      report.consistencyMatch = null; // 참조 없음(신규 약물) — 이 WO 는 참조 존재가 전제
      report.anomalies.push('out66 en canonical 참조 없음 (본 WO 는 동일 약물 en 재사용 전제)');
    }

    report.summaryField = summaryField;
    report.plan = { STEP1_en_needs_review_INSERT: EXPECTED, STEP2_en_canonical_flip: EXPECTED, en_write_total: EXPECTED * 2 };

    // 완결 감지(재실행 no-op): 66 이미 en canonical · 내용 build byte-identical → 정상 종료(ABORT 아님, write 0)
    const en66 = retRows<{ h: string; n: string }>(await ds.query(
      `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds]));
    report.en66Md5 = en66.length === 1 ? en66[0].h : (en66.length ? 'non-uniform' : null);
    const alreadyComplete = report.existingEnCanonical === EXPECTED && report.existingEnNeedsReview === 0
      && report.koCanonical === EXPECTED && report.consistencyMatch === true && report.en66Md5 === report.builtMd5;
    if (alreadyComplete) {
      report.status = 'ALREADY_COMPLETE';
      report.note = `66 en 이미 canonical · 내용 build byte-identical(${report.builtMd5}) — write 0, 정상 종료`;
    } else {
    // 부분/충돌만 이상으로
    if (report.existingEnCanonical !== 0) report.anomalies.push(`66 내 기존 en canonical ${report.existingEnCanonical} (부분/충돌)`);
    if (report.existingEnNeedsReview !== 0) report.anomalies.push(`66 내 기존 en needs_review ${report.existingEnNeedsReview}`);

    if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }

    if (apply) {
      report.dbWrite = 1;
      const qr = ds.createQueryRunner(); await qr.connect();
      // STEP1: en needs_review INSERT (66, 멱등 WHERE NOT EXISTS)
      await qr.startTransaction();
      try {
        const ins = await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
           RETURNING id`, [masterIds, SOURCE_TYPE, built.html, CANDIDATE, summaryField]);
        report.step1_inserted = retRows(ins).length;
        // en STORE(66) 중복 방지 확인
        const dup1 = retRows<{ n: string }>(await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical') GROUP BY master_id HAVING count(*)>1) t`, [masterIds]))[0];
        if (parseInt(dup1.n, 10) > 0) throw new Error(`en STORE 중복 ${dup1.n} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }

      // STEP2: needs_review → canonical flip (66, 지문 불변)
      await qr.startTransaction();
      try {
        const before = retRows<{ id: string; content: string; summary: string | null }>(await qr.query(
          `SELECT id::text id, content, summary FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL`,
          [masterIds, SOURCE_TYPE, CANDIDATE]));
        const fpBefore = new Map(before.map((r) => [r.id, `${r.content.length}:${md5(r.content)}:${r.summary ?? ''}`]));
        const flip = await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
           WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL
           RETURNING id::text`, [masterIds, SOURCE_TYPE, CANDIDATE]);
        report.step2_flipped = retRows(flip).length;
        const after = retRows<{ id: string; content: string; summary: string | null }>(await qr.query(
          `SELECT id::text id, content, summary FROM shared_product_descriptions WHERE id=ANY($1::uuid[])`, [[...fpBefore.keys()]]));
        let fpOk = 0;
        for (const a of after) if (fpBefore.get(a.id) === `${a.content.length}:${md5(a.content)}:${a.summary ?? ''}`) fpOk += 1;
        report.fingerprintOk = fpOk;
        // 사후검증: en canonical(66)=66 · nr 0 · dup 0 · ko canonical(66)=66 불변
        const post = retRows<{ en_canon: string; en_nr: string; dup: string; ko_canon: string }>(await qr.query(`
          SELECT
            (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL) en_canon,
            (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL) en_nr,
            (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t) dup,
            (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL) ko_canon`,
          [masterIds, SOURCE_TYPE]))[0];
        report.post = { enCanonical: parseInt(post.en_canon, 10), enNeedsReview: parseInt(post.en_nr, 10), dup: parseInt(post.dup, 10), koCanonical: parseInt(post.ko_canon, 10) };
        if (report.fingerprintOk !== before.length) throw new Error(`지문 불일치 ${report.fingerprintOk}/${before.length} → ROLLBACK`);
        if (report.post.enCanonical !== EXPECTED || report.post.enNeedsReview !== 0 || report.post.dup !== 0 || report.post.koCanonical !== EXPECTED)
          throw new Error(`사후검증 실패 enCanon=${report.post.enCanonical} nr=${report.post.enNeedsReview} dup=${report.post.dup} koCanon=${report.post.koCanonical} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      await qr.release();
      report.status = 'APPLIED';
    } else {
      report.status = 'PASS';
    }
    } // end else (not alreadyComplete)
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    if (report.status === 'INIT') report.status = 'FAIL';
  } finally {
    await ds.destroy();
  }
  finish(report);
  if (report.error) process.exit(1);
}

function finish(report: Record<string, unknown>): void {
  fs.writeFileSync(path.join(OUT_DIR, OUT_FILE), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${report.mode}] group=${GROUP_KEY} status=${report.status} · 66 en → ${(report as any).post?.enCanonical ?? '-'} canonical · 이상 ${(report as any).anomalies?.length ?? 0}`);
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
