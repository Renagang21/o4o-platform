/**
 * WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-C-V1 — Agent C 독립검증(READ-ONLY, DB write 0).
 * 생산 파이프라인과 **별도 커넥션·별도 쿼리**로, 롤백 매니페스트의 master ID 만을 근거로 적재 상태를 재확인한다.
 *   PROXY_PORT=5462 npx tsx src/scripts/hff-nb-c-verify.ts --manifest <rollback-manifest.json>
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const MANIFEST = arg('manifest'); if (!MANIFEST) throw new Error('--manifest 필요');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5462', 10);

async function main(): Promise<void> {
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as { tag: string; createdMasters: string[]; createdSpd: string[]; candIds: string[] };
  const ids = m.createdMasters; const expect = ids.length;
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const one = async (sql: string, p: unknown[] = [ids]): Promise<number> => Number((await ds.query(sql, p))[0].c);
    const masters = await one(`SELECT count(*) c FROM product_masters WHERE id = ANY($1)`);
    const withPermit = await one(`SELECT count(*) c FROM product_masters WHERE id = ANY($1) AND mfds_permit_number IS NOT NULL`);
    const spdKo = await one(`SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND coalesce(language,'ko')='ko'`);
    const spdEn = await one(`SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='en'`);
    const nonCanonical = await one(`SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND deleted_at IS NULL AND status <> 'canonical'`);
    const badSourceType = await one(`SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND deleted_at IS NULL AND source_type <> 'o4o_hff_generated'`);
    const noSourceRef = await one(`SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND deleted_at IS NULL AND source_ref_id IS NULL`);
    const emptyBody = await one(`SELECT count(*) c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND deleted_at IS NULL AND coalesce(btrim(content),'')=''`);
    const candLinked = await one(`SELECT count(*) c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND deleted_at IS NULL`);
    // canonical 유일성 — (master_id, description_type, COALESCE(language,'ko')) 중복 0 이어야 한다.
    const canonicalDup = await one(
      `SELECT count(*) c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions
        WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL
        GROUP BY 1,2,3 HAVING count(*) > 1) d`);
    // 신고번호 중복 master(내 배치 신고번호가 다른 master 에도 존재) 0 이어야 한다.
    const stmtDupMasters = await one(
      `SELECT count(*) c FROM product_masters p WHERE p.mfds_permit_number IN
        (SELECT mfds_permit_number FROM product_masters WHERE id = ANY($1)) AND NOT (p.id = ANY($1))`);
    const pass = masters === expect && withPermit === expect && spdKo === expect && spdEn === expect
      && nonCanonical === 0 && badSourceType === 0 && noSourceRef === 0 && emptyBody === 0
      && candLinked === expect && canonicalDup === 0 && stmtDupMasters === 0;
    const out = { tag: m.tag, expect, masters, withPermit, spdKo, spdEn, nonCanonical, badSourceType, noSourceRef, emptyBody, candLinked, canonicalDup, stmtDupMasters, independentVerifyPass: pass };
    console.log('JSON_NB_C_VERIFY_BEGIN');
    console.log(JSON.stringify(out, null, 2));
    console.log('JSON_NB_C_VERIFY_END');
    if (!pass) process.exitCode = 2;
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
