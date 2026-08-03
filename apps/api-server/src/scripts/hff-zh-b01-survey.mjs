/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §3
 * 중국어 canonical 현황 실측 + 모집단 후보 규모 (read-only).
 */
import pg from 'pg';
const c = new pg.Client({ host: '127.0.0.1', port: 5463, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const q = async (s, p) => (await c.query(s, p)).rows;
const out = {};
out.langMix = await q(`
  SELECT coalesce(language,'(null)') lang, source_type, count(*)::int n
    FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
   GROUP BY 1,2 ORDER BY n DESC LIMIT 25`);
out.zhAllVariants = await q(`
  SELECT coalesce(language,'(null)') lang, count(*)::int n FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND language ILIKE 'zh%' GROUP BY 1 ORDER BY n DESC`);
out.hffZh = (await q(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
     AND language='zh' AND source_type='o4o_hff_generated'`))[0].n;
out.candidatePool = (await q(`
  SELECT count(*)::int n FROM shared_product_descriptions ko
   WHERE ko.deleted_at IS NULL AND ko.description_type='STORE' AND ko.status='canonical'
     AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions zh
        WHERE zh.master_id=ko.master_id AND zh.deleted_at IS NULL AND zh.description_type='STORE'
          AND zh.status='canonical' AND zh.language='zh')`))[0].n;
out.dupKoMasters = (await q(`
  SELECT count(*)::int n FROM (
    SELECT master_id FROM shared_product_descriptions
     WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
       AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated'
     GROUP BY master_id HAVING count(*) > 1) x`))[0].n;
await c.end();
console.log(JSON.stringify(out, null, 1));
