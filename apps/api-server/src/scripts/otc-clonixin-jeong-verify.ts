/**
 * read-only VERIFY + EN scope (WO-O4O-OTC-CLONIXIN-125MG-TABLET-KO-EN-COMPLETE-GA-V1, Agent 가). DB write 0.
 *   ① ko 승격 독립검증(target 26) ② 제외 25 미접촉 ③ audit ④ source_ref 공유 EN scope ⑤ target 26 기존 EN 상태.
 * 조사·독립검증 도구(재현용 커밋).
 */
import { readFileSync } from 'node:fs';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const CAND = '01994863-920a-45ea-97d1-f493416cafa7';
const run = JSON.parse(readFileSync('C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-grounded-upgrade-clonixin-125mg-jeong.run.json', 'utf8'));
const TARGET: string[] = run.target_master_ids;

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    // ① target ko canonical state
    const koState = (await ds.query(`
      SELECT
        count(*) FILTER (WHERE canoncnt=1)::int canon1,
        count(*) FILTER (WHERE authored)::int authored,
        count(*) FILTER (WHERE dep_easy)::int dep_easy,
        count(*) FILTER (WHERE canoncnt>1)::int dup,
        count(*) FILTER (WHERE right_ref)::int right_ref
      FROM (
        SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL) authored,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.source_ref_id=$2::uuid AND s.deleted_at IS NULL) right_ref,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
        FROM unnest($1::uuid[]) mid
      ) t`, [TARGET, CAND]))[0];

    // ③ audit rows for target
    const audit = (await ds.query(
      `SELECT count(*)::int n FROM shared_product_description_audit_logs
       WHERE master_id = ANY($1::uuid[]) AND event_type='canonical_replaced' AND description_type='STORE' AND language='ko'
         AND metadata->>'source_ref_id'=$2`, [TARGET, CAND]))[0];

    // ② exclude(비대상) — 같은 coarse 의 fp 84b185d4 + 4374e598 는 여전히 easy canonical 이어야
    const excludeState = (await ds.query(`
      SELECT
        count(*)::int coarse_total,
        count(*) FILTER (WHERE ko_src='mfds_easy_drug')::int still_easy,
        count(*) FILTER (WHERE ko_src='mfds_drug_otc')::int authored
      FROM (
        SELECT pm.id,
          (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_src
        FROM product_masters pm
        WHERE pm.name LIKE '%(클로닉신리시네이트)' AND split_part(pm.specification,' / ',1)='125밀리그램' AND pm.name LIKE '%정%'
          AND pm.id <> ALL($1::uuid[])
      ) t WHERE ko_src IS NOT NULL`, [TARGET]))[0];

    // ④ source_ref 01994863 공유 ko canonical scope (target 26 + out?)
    const refScope = (await ds.query(`
      SELECT count(DISTINCT master_id)::int masters
      FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND source_type='mfds_drug_otc' AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [CAND]))[0];
    const refOut = (await ds.query(`
      SELECT master_id::text FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND source_type='mfds_drug_otc' AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
        AND master_id <> ALL($2::uuid[])`, [CAND, TARGET]));

    // ⑤ target 26 기존 EN 상태
    const enState = (await ds.query(`
      SELECT count(DISTINCT master_id)::int masters_with_en,
             count(*) FILTER (WHERE status='canonical')::int en_canon,
             count(*) FILTER (WHERE status='needs_review')::int en_nr
      FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [TARGET]))[0];

    // ⑥ 동일약물 다른 그룹(softcap out 등) EN canonical 존재? (재사용 금지 확인용, 참조만)
    const otherEn = (await ds.query(`
      SELECT s.source_ref_id::text, count(*)::int n, min(md5(s.content)) sample_md5
      FROM shared_product_descriptions s
      JOIN product_masters pm ON pm.id=s.master_id
      WHERE pm.name LIKE '%(클로닉신리시네이트)' AND s.description_type='STORE' AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL
      GROUP BY s.source_ref_id`));

    console.log('JSON_BEGIN');
    console.log(JSON.stringify({
      target_n: TARGET.length,
      koState, audit_n: audit.n, excludeState, refScope, refOut: refOut.map((r: any) => r.master_id), enState, otherEn,
    }, null, 2));
    console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
