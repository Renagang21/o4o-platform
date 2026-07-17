/**
 * WO-O4O-OTC-BULK-BATCH-01-EN-TRANSLATION-PERSIST-162-V1
 *
 * Batch 01 8그룹 en 번역(그룹당 1건)을 ko canonical 이 있는 162 master 에 en needs_review 전개.
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_BATCH01_EN_CONFIRM=YES).
 *
 * 원칙(지침서 §3~§4): 번역=배치 전용 JSON, master=ko canonical(source_ref_id=candidate)→ko↔en 정합,
 *   content=buildDrugOtcEnConsumerHtml(구조화 필드만·GMP 빌더상수·bodyMarkdown/translatorNote 미삽입),
 *   저장=STORE·en·needs_review·mfds_drug_otc, INSERT WHERE NOT EXISTS(en STORE)→충돌0+멱등, 단일 TX.
 *   Batch 02 groupKey 열거 ∩ 대상 162 = 0 게이트(읽기 전용 교차확인).
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const EN_PATH = path.resolve(process.cwd(), 'src/scripts/data/otc-en-translations-batch-01-v1.json');
const SOURCE_TYPE = 'mfds_drug_otc';
const GROUPS: Array<{ key: string; expect: number }> = [
  { key: '나프록센나트륨|275밀리그램|정', expect: 40 },
  { key: '클로닉신리시네이트|125밀리그램|정', expect: 29 },
  { key: '이부프로펜|200밀리그램|정', expect: 24 },
  { key: '아스피린|100밀리그램|정', expect: 23 },
  { key: '디펜히드라민염산염|50밀리그램|연질캡슐', expect: 16 },
  { key: '독시라민숙신산염|25밀리그램|정', expect: 13 },
  { key: '메코발라민|500마이크로그램|캡슐', expect: 10 },
  { key: '이부프로펜|200밀리그램|연질캡슐', expect: 7 },
];
const EXPECTED_TOTAL = 162;
// Batch 02(agent 나) 8 groupKey — 교집합 0 교차확인용(읽기 전용 상수, 미수정)
const BATCH02_GROUPS = ['나프록센|250밀리그램|연질캡슐', '알파칼시돌|1마이크로그램|연질캡슐', '아르기닌티디아시케이트|200밀리그램|연질캡슐', '이부프로펜|400밀리그램|연질캡슐', '클로닉신리시네이트|125밀리그램|연질캡슐', '플루벤다졸|500밀리그램|정', '이부프로펜아르기닌|368.9밀리그램|정', 'L-시스틴|500밀리그램|연질캡슐'];

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH01_EN_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const enFile = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as { translations: DrugOtcEnTranslation[] };
  const byGk = new Map(enFile.translations.map((t) => [t.groupKey, t]));
  if (enFile.translations.length !== GROUPS.length) throw new Error(`번역 ${enFile.translations.length} !== ${GROUPS.length}`);
  const gkSet = new Set(enFile.translations.map((t) => t.groupKey));
  if (gkSet.size !== GROUPS.length) throw new Error('번역 groupKey 중복');

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, groups: [], anomalies: [] as string[], totalKo: 0, totalNewInsert: 0, batch02Intersect: -1, inserted: 0 };
  try {
    const perGroup: Array<{ key: string; candidateId: string; content: string; masterIds: string[] }> = [];
    const seen = new Set<string>();
    for (const g of GROUPS) {
      const tr = byGk.get(g.key);
      if (!tr) { report.anomalies.push(`${g.key}: 번역 없음`); continue; }
      const dr: Array<{ candidate_id: string }> = await ds.query(
        `SELECT candidate_id::text FROM product_candidate_description_drafts WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL LIMIT 1`, [g.key]);
      if (!dr.length) { report.anomalies.push(`${g.key}: draft 없음`); continue; }
      const candidateId = dr[0].candidate_id;
      const ko: Array<{ master_id: string }> = await ds.query(
        `SELECT master_id::text FROM shared_product_descriptions
          WHERE source_type=$1 AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL AND source_ref_id=$2::uuid`,
        [SOURCE_TYPE, candidateId]);
      const masterIds = ko.map((r) => r.master_id);
      if (masterIds.length !== g.expect) report.anomalies.push(`${g.key}: ko canonical ${masterIds.length} !== ${g.expect}`);
      for (const m of masterIds) { if (seen.has(m)) report.anomalies.push(`${g.key}: master 중복 ${m.slice(0, 8)}`); seen.add(m); }
      const built = buildDrugOtcEnConsumerHtml(tr);
      if (built.missing.length) report.anomalies.push(`${g.key}: 필수필드 누락 ${built.missing.join(',')}`);
      if (!built.html) report.anomalies.push(`${g.key}: 빈 html`);
      if (/[가-힣]/.test(built.html)) report.anomalies.push(`${g.key}: 한글 포함`);
      if (built.html.includes('<table')) report.anomalies.push(`${g.key}: <table>`);
      if (built.html.includes('<!--')) report.anomalies.push(`${g.key}: 주석`);
      if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push(`${g.key}: 이중 escape`);
      if (!built.html.includes('sd-warn')) report.anomalies.push(`${g.key}: sd-warn 없음`);
      const ni: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
          WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))`, [masterIds]);
      const newInsert = parseInt(ni[0].n, 10);
      report.groups.push({ key: g.key, ko: masterIds.length, newInsert });
      report.totalKo += masterIds.length; report.totalNewInsert += newInsert;
      perGroup.push({ key: g.key, candidateId, content: built.html, masterIds });
    }

    // Batch 02 교집합 0 (B02 groupKey 열거 ∩ 대상 162)
    const b02: Array<{ id: string }> = await ds.query(
      `SELECT DISTINCT pm.id::text FROM product_masters pm, unnest($1::text[]) gk
        WHERE pm.name LIKE '%('||split_part(gk,'|',1)||')' AND split_part(pm.specification,' / ',1)=split_part(gk,'|',2) AND pm.name LIKE '%'||split_part(gk,'|',3)||'%'`,
      [BATCH02_GROUPS]);
    const b02Set = new Set(b02.map((r) => r.id));
    report.batch02Intersect = [...seen].filter((m) => b02Set.has(m)).length;
    if (report.batch02Intersect !== 0) report.anomalies.push(`Batch 02 master 교집합 ${report.batch02Intersect} !== 0`);

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.slice(0, 12).join('\n  ')}`);
    if (report.totalKo !== EXPECTED_TOTAL) throw new Error(`ko canonical 합 ${report.totalKo} !== ${EXPECTED_TOTAL} → ABORT`);

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
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
             RETURNING id`,
            [p.masterIds, SOURCE_TYPE, p.content, p.candidateId]);
          report.inserted += Array.isArray(res) ? res.length : 0;
        }
        const dup: Array<{ n: string }> = await qr.query(
          `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical') GROUP BY master_id HAVING count(*)>1) t`, [[...seen]]);
        if (parseInt(dup[0].n, 10) > 0) throw new Error(`en STORE 중복 ${dup[0].n} → ROLLBACK`);
        if (report.inserted !== report.totalNewInsert) throw new Error(`inserted ${report.inserted} !== ${report.totalNewInsert} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] ko ${report.totalKo} · newInsert ${report.totalNewInsert} · Batch02교집합 ${report.batch02Intersect} · 이상 ${report.anomalies.length}`);
  if (apply) console.log(`  INSERT ${report.inserted}`);
  else console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH01_EN_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
