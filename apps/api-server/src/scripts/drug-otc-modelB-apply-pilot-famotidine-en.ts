/**
 * WO-O4O-OTC-FAMOTIDINE-10MG-EN-COMPLETE-V1 — 파모티딘 10mg 정 en STORE canonical 완결
 *
 * ko canonical 24(source_ref 0057f50c) 를 번역 기준본으로, en 번역 1건을 24 master 에 전개:
 *   STEP1 en needs_review INSERT 24 → STEP2 en needs_review→canonical flip 24. 각 단일 TX.
 *   ko↔en master_id·source_ref_id 정합(둘 다 0057f50c 공유). 기존 ko canonical UPDATE 0.
 *
 * dry-run 기본(read-only·write 0). apply 이중게이트: --apply + DRUG_OTC_PILOT_FAMO_EN_CONFIRM=YES.
 * 안전: buildDrugOtcEnConsumerHtml(구조화 번역만) · 한글/빈/<table>/주석/이중escape/sd-warn ABORT ·
 *   summary NULL(en) · INSERT WHERE NOT EXISTS(en STORE needs_review|canonical) → 충돌0+멱등 · 사후 dup0/count24 ROLLBACK.
 *
 * Usage(apps/api-server): npx tsx src/scripts/drug-otc-modelB-apply-pilot-famotidine-en.ts [--apply]
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const EN_PATH = path.join(OUT_DIR, 'otc-en-translations-famotidine-10mg-v1.json');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const GROUP_KEY = '파모티딘|10밀리그램|정';
const SOURCE_TYPE = 'mfds_drug_otc';
const CANDIDATE = '0057f50c-e693-4385-b5d8-4f57178db590';
const EXPECTED = 24;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_PILOT_FAMO_EN_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const enFile = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  if (enFile.translations.length !== 1) throw new Error(`번역 ${enFile.translations.length} !== 1`);
  const tr = enFile.translations[0];
  if (tr.groupKey !== GROUP_KEY) throw new Error(`groupKey ${tr.groupKey} !== ${GROUP_KEY}`);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();

  const report: any = { wo: 'WO-O4O-OTC-FAMOTIDINE-10MG-EN-COMPLETE-V1', mode, dbWrite: 0, group: GROUP_KEY, candidate: CANDIDATE, anomalies: [] as string[] };
  try {
    // ko canonical 대상 재열거 (source_ref 0057f50c) — en 전개 대상·번역 기준본
    const ko: Array<{ master_id: string }> = await ds.query(
      `SELECT master_id::text FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND source_ref_id=$2::uuid ORDER BY master_id`,
      [SOURCE_TYPE, CANDIDATE]);
    const masterIds = ko.map((r) => r.master_id);
    report.koCanonical = masterIds.length; report.rollback_master_ids = masterIds;
    if (masterIds.length !== EXPECTED) report.anomalies.push(`ko canonical ${masterIds.length} !== EXPECTED ${EXPECTED}`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('ko master 중복');

    // 기존 en 충돌
    const enConf: Array<{ n: string }> = masterIds.length ? await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))`, [masterIds]) : [{ n: '0' }];
    report.enConflict = parseInt(enConf[0].n, 10);
    if (report.enConflict !== 0) report.anomalies.push(`en canonical/needs_review 충돌 ${report.enConflict}`);

    // en HTML 빌드·검증
    const built = buildDrugOtcEnConsumerHtml(tr);
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (/[가-힣]/.test(built.html)) report.anomalies.push('한글 포함');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.htmlLen = built.html.length; report.contentHash = md5(built.html); report.sourceRefId = CANDIDATE;
    report.예상 = { en_needs_review_INSERT: masterIds.length, en_canonical_flip: masterIds.length, 기존_ko_canonical_UPDATE: 0 };

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`);

    if (apply) {
      report.dbWrite = 1;
      const qr = ds.createQueryRunner(); await qr.connect();
      // STEP1: en needs_review INSERT
      await qr.startTransaction();
      try {
        const ins = await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $3, NULL, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
           RETURNING id`, [masterIds, SOURCE_TYPE, built.html, CANDIDATE]);
        report.needsReviewInserted = Array.isArray(ins) ? ins.length : 0;
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      // STEP2: en needs_review → canonical flip
      await qr.startTransaction();
      try {
        const flip = await qr.query(
          `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
            WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL
              AND master_id = ANY($3::uuid[]) RETURNING id`, [CANDIDATE, SOURCE_TYPE, masterIds]);
        report.canonicalFlipped = Array.isArray(flip) ? flip.length : 0;
        const dup: Array<{ n: string }> = await qr.query(`SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND status='canonical' AND description_type='STORE' AND language='en' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t`, [masterIds]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`en canonical 중복 ${dup[0].n} → ROLLBACK`);
        const enc: Array<{ n: string }> = await qr.query(`SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [CANDIDATE, SOURCE_TYPE]);
        report.enCanonicalAfter = parseInt(enc[0].n, 10);
        if (report.enCanonicalAfter !== EXPECTED) throw new Error(`en canonical(after) ${report.enCanonicalAfter} !== ${EXPECTED} → ROLLBACK`);
        // ko↔en 정합(같은 master·source_ref)
        const link: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM shared_product_descriptions e
            WHERE e.source_type=$1 AND e.description_type='STORE' AND e.language='en' AND e.status='canonical' AND e.deleted_at IS NULL AND e.source_ref_id=$2::uuid
              AND EXISTS(SELECT 1 FROM shared_product_descriptions k WHERE k.master_id=e.master_id AND k.source_ref_id=e.source_ref_id AND k.language='ko' AND k.status='canonical' AND k.source_type=$1 AND k.deleted_at IS NULL)`, [SOURCE_TYPE, CANDIDATE]);
        report.koEnLinkAfter = parseInt(link[0].n, 10);
        if (report.koEnLinkAfter !== EXPECTED) throw new Error(`ko↔en 정합(after) ${report.koEnLinkAfter} !== ${EXPECTED} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      await qr.release();
    }
  } finally { await ds.destroy(); }

  fs.writeFileSync(path.join(OUT_DIR, 'otc-modelB-apply-pilot-famotidine-en-dryrun-v1.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] ko ${report.koCanonical} · en충돌 ${report.enConflict} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.needsReviewInserted} · flip ${report.canonicalFlipped} · enCanonicalAfter ${report.enCanonicalAfter} · ko↔en ${report.koEnLinkAfter}`);
  else console.log('  (dry-run — write 0. apply: --apply + DRUG_OTC_PILOT_FAMO_EN_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
