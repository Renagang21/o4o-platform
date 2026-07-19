/**
 * WO-O4O-OTC-FAMOTIDINE-10MG-PILOT-DRYRUN-GA-V1 (펙소페나딘 전환) — STEP 2 (en 번역 persist)
 *
 * 펙소페나딘 en 번역 1건을 ko canonical 이 있는 master 에 en needs_review 전개 (INSERT only).
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_FEXO_EN_CONFIRM=YES).
 * 대상 = STEP 1 ko canonical(source_type=mfds_drug_otc, source_ref_id=candidate 049c2a1c). EXPECTED=14.
 * 안전: buildDrugOtcEnConsumerHtml(구조화 번역만)·한글/빈/<table>/주석/이중escape/sd-warn ABORT · summary NULL ·
 *   INSERT WHERE NOT EXISTS(en STORE needs_review|canonical) → 충돌0+멱등 · 단일 TX · 사후 중복0 ROLLBACK.
 * Usage(apps/api-server): NODE_ENV= ../../node_modules/.bin/tsx src/scripts/drug-otc-fexofenadine-en-persist.ts [--apply]
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const EN_PATH = path.resolve(process.cwd(), 'src/scripts/data/otc-en-translations-fexofenadine-v1.json');
const SOURCE_TYPE = 'mfds_drug_otc';
const GROUP_KEY = '펙소페나딘염산염|60밀리그램|정';
const EXPECTED_KO = 14;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_FEXO_EN_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const enFile = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  if (enFile.translations.length !== 1) throw new Error(`번역 ${enFile.translations.length} !== 1`);
  const tr = enFile.translations[0];
  if (tr.groupKey !== GROUP_KEY) throw new Error(`groupKey ${tr.groupKey} !== ${GROUP_KEY}`);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
  });
  await ds.initialize();

  const report: any = { mode, group: GROUP_KEY, anomalies: [] as string[], koCanonical: 0, newInsert: 0, inserted: 0 };
  try {
    const dr: Array<{ candidate_id: string }> = await ds.query(
      `SELECT candidate_id::text FROM product_candidate_description_drafts WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [GROUP_KEY]);
    if (!dr.length) throw new Error('draft 없음 → ABORT');
    const candidateId = dr[0].candidate_id;
    report.candidate = candidateId.slice(0, 8);

    const ko: Array<{ master_id: string }> = await ds.query(
      `SELECT master_id::text FROM shared_product_descriptions
        WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND source_ref_id=$2::uuid`,
      [SOURCE_TYPE, candidateId]);
    const masterIds = ko.map((r) => r.master_id);
    report.koCanonical = masterIds.length;
    if (masterIds.length !== EXPECTED_KO) report.anomalies.push(`ko canonical ${masterIds.length} !== EXPECTED ${EXPECTED_KO} (STEP 1 선행/재열거 불일치)`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('ko master 중복');

    const built = buildDrugOtcEnConsumerHtml(tr);
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (/[가-힣]/.test(built.html)) report.anomalies.push('한글 포함');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.htmlLen = built.html.length;

    const ni: Array<{ n: string }> = masterIds.length ? await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
        WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))`, [masterIds]) : [{ n: '0' }];
    report.newInsert = parseInt(ni[0].n, 10);

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`);

    if (apply && report.newInsert > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `INSERT INTO shared_product_descriptions
             (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $3, NULL, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
           RETURNING id`,
          [masterIds, SOURCE_TYPE, built.html, candidateId]);
        report.inserted = Array.isArray(res) ? res.length : 0;
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical') GROUP BY master_id HAVING count(*)>1) t`, [masterIds]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`en STORE 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.newInsert) throw new Error(`inserted ${report.inserted} !== ${report.newInsert} → ROLLBACK`);
        const link: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM shared_product_descriptions e
            WHERE e.source_type=$1 AND e.description_type='STORE' AND e.language='en' AND e.deleted_at IS NULL AND e.source_ref_id=$2::uuid
              AND EXISTS(SELECT 1 FROM shared_product_descriptions k WHERE k.master_id=e.master_id AND k.source_ref_id=e.source_ref_id AND k.language='ko' AND k.status='canonical' AND k.source_type=$1 AND k.deleted_at IS NULL)`,
          [SOURCE_TYPE, candidateId]);
        report.koEnLinkAfter = parseInt(link[0].n, 10);
        if (report.koEnLinkAfter !== EXPECTED_KO) throw new Error(`ko↔en 정합(after) ${report.koEnLinkAfter} !== ${EXPECTED_KO} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] ko ${report.koCanonical} · newInsert ${report.newInsert} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted} · ko↔en ${report.koEnLinkAfter ?? '-'}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_FEXO_EN_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
