/** READ-ONLY 독립 사후검증(새 DB 연결) — D+E 24 apply 결과 + 복합형 baseline 발견. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const TAG = 'batch:single-nutrient-vd-ve';
const OMEGA3_EXCLUDED = ['200400200142058', '20120019007573', '20120019007579'];
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const q = (sql: string, p: unknown[] = []) => ds.query(sql, p);
    const tagJson = JSON.stringify([TAG]);
    const ids: string[] = (await q(`SELECT id FROM product_masters WHERE tags::jsonb @> $1::jsonb`, [tagJson])).map((r: { id: string }) => r.id);
    const masters = ids.length;
    const spdKo = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]))[0].c : 0;
    const spdEn = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]))[0].c : 0;
    const canonicalDup = ids.length ? (await q(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c : 0;
    const candidateLinks = ids.length ? (await q(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c : 0;
    const spdRefLinks = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions s JOIN product_candidates pc ON pc.id=s.source_ref_id WHERE s.master_id = ANY($1) AND s.description_type='STORE' AND s.status='canonical'`, [ids]))[0].c : 0;
    // 카드=2(D+E) · 오메가3 누출 0 검증 (SPD content)
    const badCards = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND (content LIKE '%EPA%' OR content LIKE '%DHA%' OR content LIKE '%오메가%' OR content ILIKE '%omega%')`, [ids]))[0].c : 0;
    // 오메가3 3건: 이 배치로 master 생성 안됨(혼입 0) — stmt 로 이 tag master 존재 확인
    const omega3Contam = ids.length ? (await q(`SELECT count(*)::int c FROM product_masters WHERE tags::jsonb @> $1::jsonb AND mfds_permit_number = ANY($2)`, [tagJson, OMEGA3_EXCLUDED]))[0].c : 0;
    const regType = ids.length ? await q(`SELECT DISTINCT regulatory_type, status FROM product_masters WHERE id = ANY($1)`, [ids]) : [];
    // 전체 복합형 baseline 발견: 모든 batch tag 별 master 수(단일영양소/복합형 구분 없이 전부 나열)
    const allBatchTags: Array<{ tag: string; c: number }> = await q(
      `SELECT t AS tag, count(*)::int c FROM product_masters m, jsonb_array_elements_text(m.tags::jsonb) t
       WHERE m.tags::jsonb @> '["import:mfds-hff"]'::jsonb AND t LIKE 'batch:single-nutrient-%' GROUP BY t ORDER BY t`);
    const pass = masters === 24 && spdKo === 24 && spdEn === 24 && canonicalDup === 0 && candidateLinks === 24 && spdRefLinks === 48 && badCards === 0 && omega3Contam === 0;
    console.log('JSON_VERIFY_BEGIN');
    console.log(JSON.stringify({ tag: TAG, masters, spdKo, spdEn, canonicalDup, candidateLinks, spdRefLinks, badCards, omega3Contam, regType, independentVerifyPass: pass, allBatchTags }, null, 2));
    console.log('JSON_VERIFY_END');
    if (!pass) process.exit(2);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
