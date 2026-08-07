/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §3 일본어 저장 계약 실측 (read-only)
 *
 * 언어 코드(ja / ja-JP …)를 추정하지 않는다. 현재 DB 가 실제로 무엇을 쓰고 있는지,
 * STORE canonical 계약·유일성 제약·기존 일본어 자산이 있는지 그대로 읽어 기록한다.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const q = async (sql, p) => (await c.query(sql, p)).rows;
const HFF = `deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`;

const out = {
  wo: 'WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1',
  probedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
};

/* 1. 전체 language 코드 분포 — 혼용 여부 판정의 근거 */
out.languageCodesAll = await q(`SELECT coalesce(language,'(null)') lang, count(*)::int n
   FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`);
out.languageCodesStoreCanonical = await q(`SELECT coalesce(language,'(null)') lang, count(*)::int n
   FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
   GROUP BY 1 ORDER BY 2 DESC`);

/* 2. 일본어로 보이는 코드 전수 (ja, ja-JP, jp, JA …) */
out.japaneseLike = await q(`SELECT language, description_type, status, source_type, count(*)::int n
   FROM shared_product_descriptions
  WHERE deleted_at IS NULL AND language IS NOT NULL AND lower(language) ~ '^(ja|jp)'
  GROUP BY 1,2,3,4 ORDER BY 5 DESC`);

/* 3. HFF STORE canonical 언어별 현황 */
out.hffCanonical = (await q(`SELECT
    count(*) FILTER (WHERE coalesce(language,'ko')='ko')::int ko,
    count(*) FILTER (WHERE language='en')::int en,
    count(*) FILTER (WHERE language='zh')::int zh,
    count(*) FILTER (WHERE language IS NOT NULL AND lower(language) ~ '^(ja|jp)')::int ja
   FROM shared_product_descriptions WHERE ${HFF}`))[0];

/* 4. source_type 분포 (STORE canonical) — 저장 계약 확인 */
out.sourceTypes = await q(`SELECT source_type, coalesce(language,'(null)') lang, count(*)::int n
   FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
   GROUP BY 1,2 ORDER BY 3 DESC LIMIT 40`);

/* 5. 유일성 제약·인덱스 정의 — canonical 중복 방지 계약 */
out.indexes = await q(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='shared_product_descriptions' ORDER BY indexname`);
out.constraints = await q(`SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint
   WHERE conrelid='shared_product_descriptions'::regclass ORDER BY conname`);
out.columns = await q(`SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns WHERE table_name='shared_product_descriptions' ORDER BY ordinal_position`);

/* 6. 동일 (master, description_type, language) 중복 여부 — 현재 데이터가 계약을 지키고 있는가 */
out.dupByMasterTypeLang = (await q(`SELECT count(*)::int n FROM (
   SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND status='canonical'
    GROUP BY 1,2,3 HAVING count(*) > 1) t`))[0].n;

/* 7. source_ref_id 사용 실태 (EN/ZH 가 KO 를 참조하는가) */
out.sourceRefUsage = await q(`SELECT coalesce(language,'ko') lang,
     count(*)::int n, count(source_ref_id)::int with_ref
   FROM shared_product_descriptions WHERE ${HFF} GROUP BY 1 ORDER BY 2 DESC`).catch(() => 'NO_COLUMN_source_ref_id');

fs.writeFileSync(`${D}/hff-ja-contract-probe-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, indexes: out.indexes, constraints: out.constraints, columns: out.columns.map((x) => x.column_name) }, null, 1));
await c.end();
