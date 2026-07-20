/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1 — read-only probe (에이전트 다)
 *
 * 목적: 번들 4그룹(트리메부틴200 / 메코발라민500 / 덱스판테놀100 / 폴산1mg)의
 *   ① target master 재현(감사 SSOT target_master_ids 대조)
 *   ② easy STORE ko canonical 정확히 1 / authored canonical 충돌
 *   ③ out-of-target(동일 source_ref) live en canonical 지문(md5·건수·본문)
 *   ④ ko draft 존재
 * DB write 0. 산출: src/scripts/data/otc-batch8-da-probe.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'src/scripts/data/otc-batch8-da-probe.json');
const retRows = <T = any>(res: unknown): T[] =>
  (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

const GROUPS = [
  { slug: 'trimebutine-200mg-jeong', key: '트리메부틴말레산염|200밀리그램|정', ref: '0175e433-a171-44ec-b601-ad65a805171d', T: 13 },
  { slug: 'mecobalamin-500ug-capsule', key: '메코발라민|500마이크로그램|캡슐', ref: '0908968f-30c8-4c9b-95ed-5631212adbc9', T: 10 },
  { slug: 'dexpanthenol-100mg-jeong', key: '덱스판테놀|100밀리그램|정', ref: '0d2b2ef8-cce5-4771-9ed7-159fd10c1715', T: 9 },
  { slug: 'folic-acid-1mg-jeong', key: '폴산|1밀리그램|정', ref: '068e2176-ee92-4e94-a47d-2dc632bacf53', T: 9 },
];

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 },
  });
  await ds.initialize();
  const out: any = { wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1', readOnly: true, dbWrite: 0, groups: {} };
  try {
    for (const g of GROUPS) {
      const draft = retRows(await ds.query(
        `SELECT candidate_id::text, title FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid AND deleted_at IS NULL`, [g.ref]));
      const refKo = retRows(await ds.query(
        `SELECT md5(content) h, count(*)::int n FROM shared_product_descriptions
         WHERE source_ref_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [g.ref]));
      const refEn = retRows(await ds.query(
        `SELECT md5(content) h, count(*)::int n, min(summary) summary, min(length(content))::int len, min(content) content
         FROM shared_product_descriptions
         WHERE source_ref_id=$1::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [g.ref]));
      out.groups[g.slug] = {
        groupKey: g.key, source_ref_id: g.ref, expectedT: g.T,
        draftCount: draft.length, draftTitle: draft[0]?.title ?? null,
        refKoCanonical: refKo.map((r: any) => ({ md5: r.h, n: r.n })),
        refEnCanonical: refEn.map((r: any) => ({ md5: r.h, n: r.n, summary: r.summary, len: r.len })),
        refEnHtml: refEn.length === 1 ? refEn[0].content : null,
      };
      console.log(`${g.slug}: draft=${draft.length} refKo=${JSON.stringify(refKo.map((r: any) => [r.h, r.n]))} refEn=${JSON.stringify(refEn.map((r: any) => [r.h, r.n, r.len]))}`);
    }
  } finally { await ds.destroy(); }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('written', OUT);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
