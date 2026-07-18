/**
 * HFF 복합형 재개 전 — 프로덕션 DB read-only 식별/사전점검 (DB write 0).
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-db-identify.ts
 *
 * WO-...-LARGE-FUNCTION-GROUPS PART B 재개 preflight. 승인문 §4:
 * current_database()/서버 식별, HFF candidate·o4o_hff_generated 수량, 기존 복합형 배치 태그.
 * 비밀값 미출력. SELECT 전용(INSERT/UPDATE/DDL 없음).
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';

const PORT = parseInt(process.env.PROXY_PORT ?? process.env.DB_PORT ?? '5442', 10);
const HOST = process.env.PROXY_HOST ?? '127.0.0.1';

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: HOST, port: PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, connectionTimeoutMillis: 15000, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const HFF = `'["import:mfds-hff"]'::jsonb`;
    const [db] = await ds.query('SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS srv, version() AS ver');
    const hffCand = (await ds.query(`SELECT count(*)::int c FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL`))[0].c;
    const hffMaster = (await ds.query(`SELECT count(*)::int c FROM product_masters WHERE tags::jsonb @> ${HFF}`))[0].c;
    const spd = (await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id=s.master_id WHERE m.tags::jsonb @> ${HFF} AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL`))[0].c;
    const comboTags = await ds.query(`SELECT t AS tag, count(*)::int c FROM product_masters m, jsonb_array_elements_text(m.tags::jsonb) t WHERE m.tags::jsonb @> ${HFF} AND t LIKE 'batch:single-nutrient-%' AND t ~ '(vd-zn|se-zn|mg-ca|vc-zn|mg-vd-ca|vd-ca|msm-vd|lut-va|fib-zn|omega3-ve|fe-fol)' GROUP BY t ORDER BY c DESC`);
    const report = {
      server: { database: db.db, user: db.usr, serverAddr: db.srv, pg: String(db.ver).split(' ').slice(0, 2).join(' ') },
      counts: { hffCandidates: hffCand, hffMasters: hffMaster, hffStoreCanonicalSpd: spd },
      existingComboBatchTags: comboTags,
      dbWrite: 0,
    };
    console.log('JSON_IDENTIFY_BEGIN');
    console.log(JSON.stringify(report, null, 2));
    console.log('JSON_IDENTIFY_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('[db-identify] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
