import '../env-loader.js';
import { DataSource } from 'typeorm';
const PORT = parseInt(process.env.PROXY_PORT ?? '5456', 10);
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
  await ds.initialize();
  try {
    const sf = (await ds.query("SELECT count(DISTINCT m.id)::int c FROM product_masters m WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:single-functional-%')"))[0].c;
    const allhff = (await ds.query("SELECT count(*)::int c FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND language='ko' AND deleted_at IS NULL"))[0].c;
    // 내 도메인 라벨별 taken 수 (기생산)
    const byTag = await ds.query(`SELECT t.tag, count(DISTINCT m.id)::int c FROM product_masters m, jsonb_array_elements_text(m.tags::jsonb) t(tag) WHERE t.tag LIKE 'batch:single-functional-%' GROUP BY t.tag ORDER BY c DESC LIMIT 40`);
    console.log('JSON_CENSUS_BEGIN');
    console.log(JSON.stringify({ singleFunctionalLiveTotal: sf, allHffStoreKoCanonical: allhff, byTag }, null, 1));
    console.log('JSON_CENSUS_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
