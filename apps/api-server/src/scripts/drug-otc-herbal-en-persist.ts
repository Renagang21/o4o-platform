/**
 * WO-O4O-OTC-HERBAL-EN-TRANSLATION-PERSIST-299-V1
 *
 * 은행엽·포도엽 영문 번역(그룹당 1건)을 ko canonical 이 있는 299 master 에 en needs_review 로 전개.
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_HERBAL_EN_CONFIRM=YES).
 *
 * 원칙:
 *   - 번역 = otc-en-translations-herbal-v1.json (그룹당 1건, GUIDE/GLOSSARY 적용).
 *   - master 집합 = 각 그룹 ko canonical(source_type=mfds_drug_otc, ko, source_ref_id=candidate) → ko↔en 정합.
 *   - content = buildDrugOtcEnConsumerHtml(구조화 필드만, bodyMarkdown 미사용, translatorNote 본문 미삽입).
 *   - 저장: description_type=STORE · language=en · status=needs_review · source_type=mfds_drug_otc · source_ref_id=candidate.
 *   - INSERT only. WHERE NOT EXISTS(en STORE) → 충돌 0 + 멱등(재실행 0). 단일 TX.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const EN_PATH = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-herbal-v1.json');
const SOURCE_TYPE = 'mfds_drug_otc';
const GROUPS: Array<{ key: string; expect: number }> = [
  { key: '은행엽건조엑스|80밀리그램|정', expect: 203 },
  { key: '포도엽건조엑스|180밀리그램|캡슐', expect: 96 },
];
const EXPECTED_TOTAL = 299;

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_HERBAL_EN_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const enFile = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  const byGk = new Map(enFile.translations.map((t) => [t.groupKey, t]));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, groups: [], anomalies: [] as string[], totalKoMasters: 0, totalNewInsert: 0, inserted: 0, samples: {} as Record<string, string> };
  try {
    const perGroup: Array<{ key: string; candidateId: string; content: string; masterIds: string[] }> = [];
    const seen = new Set<string>();
    for (const g of GROUPS) {
      const tr = byGk.get(g.key);
      if (!tr) { report.anomalies.push(`${g.key}: 번역 없음`); continue; }
      if (enFile.translations.filter((t) => t.groupKey === g.key).length !== 1) { report.anomalies.push(`${g.key}: 번역 그룹당 1건 아님`); continue; }
      // 그룹 candidate + ko canonical master 집합
      const drow: Array<{ candidate_id: string }> = await ds.query(
        `SELECT candidate_id::text FROM product_candidate_description_drafts WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [g.key]);
      if (!drow.length) { report.anomalies.push(`${g.key}: draft 없음`); continue; }
      const candidateId = drow[0].candidate_id;
      const ko: Array<{ master_id: string }> = await ds.query(
        `SELECT master_id::text FROM shared_product_descriptions
          WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND source_ref_id=$2::uuid`,
        [SOURCE_TYPE, candidateId]);
      const masterIds = ko.map((r) => r.master_id);
      if (masterIds.length !== g.expect) report.anomalies.push(`${g.key}: ko canonical ${masterIds.length} !== ${g.expect}`);
      for (const m of masterIds) { if (seen.has(m)) report.anomalies.push(`${g.key}: master 중복 ${m.slice(0, 8)}`); seen.add(m); }
      // build en
      const built = buildDrugOtcEnConsumerHtml(tr);
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (!built.html) report.anomalies.push(`${g.key}: 빈 html`);
      if (/[가-힣]/.test(built.html)) report.anomalies.push(`${g.key}: 한글 포함`);
      if (built.html.includes('<table')) report.anomalies.push(`${g.key}: <table>`);
      if (built.html.includes('<!--')) report.anomalies.push(`${g.key}: 주석`);
      if (!built.html.includes('sd-warn')) report.anomalies.push(`${g.key}: sd-warn 없음`);
      // newInsert (en STORE 없는 master만)
      const ni: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
          WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
                            WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL
                              AND s.status IN ('needs_review','canonical'))`, [masterIds]);
      const newInsert = parseInt(ni[0].n, 10);
      report.groups.push({ key: g.key, koMasters: masterIds.length, newInsert });
      report.totalKoMasters += masterIds.length; report.totalNewInsert += newInsert;
      report.samples[g.key] = built.html.match(/<ul class="sd-warn">[\s\S]*?<\/ul>/)?.[0].replace(/\n\s*/g, ' ').slice(0, 300) ?? '';
      perGroup.push({ key: g.key, candidateId, content: built.html, masterIds });
    }

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);
    if (report.totalKoMasters !== EXPECTED_TOTAL) throw new Error(`ko master 합 ${report.totalKoMasters} !== ${EXPECTED_TOTAL} → ABORT`);

    if (apply && report.totalNewInsert > 0) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        for (const p of perGroup) {
          const res = await qr.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $3, NULL, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s
                               WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL
                                 AND s.status IN ('needs_review','canonical'))
             RETURNING id`,
            [p.masterIds, SOURCE_TYPE, p.content, p.candidateId]);
          report.inserted += Array.isArray(res) ? res.length : 0;
        }
        // post: ko canonical 불변 확인은 read-only(INSERT en만) / master당 en STORE 중복 0
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (
             SELECT master_id FROM shared_product_descriptions
              WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical')
              GROUP BY master_id HAVING count(*)>1) t`, [[...seen]]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`en STORE 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.totalNewInsert) throw new Error(`inserted ${report.inserted} !== ${report.totalNewInsert} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify({ ...report, samples: undefined }, null, 2));
  for (const [k, v] of Object.entries(report.samples)) console.log(`\n${k} sd-warn: ${v}`);
  console.log(`\n[${mode}] ko master ${report.totalKoMasters} · newInsert ${report.totalNewInsert} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_HERBAL_EN_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
