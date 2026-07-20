/** READ-ONLY 사후검증 — #11 칼슘 basis 단건 교정 COMMIT 결과. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
const STMT = '2020000997275';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 1, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const m = await ds.query(`SELECT id, name, manufacturer_name, mfds_permit_number, regulatory_type, status, tags FROM product_masters WHERE mfds_permit_number=$1`, [STMT]);
    const spd = await ds.query(`SELECT s.language, s.description_type, s.status, s.source_type, length(s.content) AS len, (s.content LIKE '%1,1500%' OR s.content LIKE '%11500%') AS has_typo, (s.content LIKE '%300mg/1500mg%' OR s.content LIKE '%300mg / 1500mg%') AS ca_basis_ok FROM shared_product_descriptions s JOIN product_masters m ON m.id=s.master_id WHERE m.mfds_permit_number=$1 AND s.deleted_at IS NULL ORDER BY s.language`, [STMT]);
    const cand = await ds.query(`SELECT candidate_status, matched_product_master_id IS NOT NULL AS matched FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND raw_payload->'source'->>'STTEMNT_NO'=$1`, [STMT]);
    // 복합형 LIVE 총계(STORE canonical + o4o_hff_generated + tag batch:single-nutrient-mg-vd-vk-zn-ca)
    const batch = await ds.query(`SELECT count(DISTINCT m.id)::int c FROM product_masters m WHERE m.tags @> '["batch:single-nutrient-mg-vd-vk-zn-ca"]'::jsonb`);
    console.log(JSON.stringify({ master: m, spd, candidate: cand, batchGroupMasters: batch[0].c }, null, 2));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
