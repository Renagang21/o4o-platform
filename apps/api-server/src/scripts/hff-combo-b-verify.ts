/**
 * Agent B 소유 — combo-b 생산 독립검증 (별도 신규 연결, read-only).
 *   tag 네임스페이스 batch:combo-b-% 로 내 산출물만 식별. 무결성·중복·타 에이전트 교집합 0 검증.
 * 실행: PROXY_PORT=5442 DB_USERNAME=o4o_api DB_PASSWORD=... DB_NAME=o4o_platform \
 *         npx tsx src/scripts/hff-combo-b-verify.ts
 */
import { DataSource } from 'typeorm';

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
  await ds.initialize();
  const q = async (s: string, p: unknown[] = []): Promise<number> => (await ds.query(s, p))[0].c as number;
  try {
    const TAG = "EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:combo-b-%')";
    const v: Record<string, number> = {};
    v.myMasters = await q(`SELECT count(*)::int c FROM product_masters m WHERE ${TAG}`);
    v.myKo = await q(`SELECT count(*)::int c FROM product_masters m JOIN shared_product_descriptions sp ON sp.master_id=m.id WHERE ${TAG} AND sp.language='ko' AND sp.description_type='STORE' AND sp.status='canonical' AND sp.deleted_at IS NULL`);
    v.myEn = await q(`SELECT count(*)::int c FROM product_masters m JOIN shared_product_descriptions sp ON sp.master_id=m.id WHERE ${TAG} AND sp.language='en' AND sp.description_type='STORE' AND sp.status='canonical' AND sp.deleted_at IS NULL`);
    v.candidatesLinked = await q(`SELECT count(*)::int c FROM product_candidates pc WHERE pc.matched_product_master_id IN (SELECT m.id FROM product_masters m WHERE ${TAG}) AND pc.candidate_status='approved_new_master'`);
    v.canonicalDup = await q(`SELECT count(*)::int c FROM (SELECT sp.master_id, sp.description_type, coalesce(sp.language,'ko') l FROM shared_product_descriptions sp JOIN product_masters m ON m.id=sp.master_id WHERE ${TAG} AND sp.status='canonical' AND sp.deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`);
    v.permitDup = await q(`SELECT count(*)::int c FROM (SELECT mfds_permit_number FROM product_masters m WHERE ${TAG} AND mfds_permit_number IS NOT NULL GROUP BY 1 HAVING count(*)>1) x`);
    // 타 에이전트 교집합: 같은 permit 을 non-combo-b master 가 이미 보유?
    v.crossPermitWithOthers = await q(`SELECT count(*)::int c FROM product_masters m1 JOIN product_masters m2 ON m1.mfds_permit_number=m2.mfds_permit_number AND m1.id<>m2.id WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(m1.tags::jsonb) t WHERE t LIKE 'batch:combo-b-%') AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(m2.tags::jsonb) t WHERE t LIKE 'batch:combo-b-%')`);
    // barcode NULL 계약
    v.barcodeNonNull = await q(`SELECT count(*)::int c FROM product_masters m WHERE ${TAG} AND barcode IS NOT NULL`);
    v.wrongRegType = await q(`SELECT count(*)::int c FROM product_masters m WHERE ${TAG} AND regulatory_type<>'건강기능식품'`);
    v.wrongSourceType = await q(`SELECT count(*)::int c FROM shared_product_descriptions sp JOIN product_masters m ON m.id=sp.master_id WHERE ${TAG} AND sp.source_type<>'o4o_hff_generated'`);
    const pass = v.myMasters > 0 && v.myKo === v.myMasters && v.myEn === v.myMasters && v.candidatesLinked === v.myMasters && v.canonicalDup === 0 && v.permitDup === 0 && v.crossPermitWithOthers === 0 && v.barcodeNonNull === 0 && v.wrongRegType === 0 && v.wrongSourceType === 0;
    console.log('JSON_VERIFY_BEGIN');
    console.log(JSON.stringify({ ...v, PASS: pass }, null, 1));
    console.log('JSON_VERIFY_END');
    if (!pass) process.exit(2);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('VERIFY FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
