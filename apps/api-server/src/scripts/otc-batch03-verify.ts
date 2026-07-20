/**
 * read-only FINAL VERIFY (WO-O4O-OTC-NIZATIDINE-LEVOCARNITINE-SOBREROL-KO-EN-COMPLETE-GA-V1, Agent 가). DB write 0.
 * 3그룹 ko/en 독립검증 + 제외 미접촉.
 */
import { readFileSync } from 'node:fs';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\';
const GROUPS = [
  { key: 'nizatidine-75mg-jeong', cand: '048ba86f-f85e-42f8-97fd-7bc4e46cc092', ing: '니자티딘', dose: '75밀리그램', form: '정', T: 18, X: 3 },
  { key: 'levocarnitine-330mg-jeong', cand: '035efa8f-cc53-4e64-a111-c4528689f457', ing: '엘카르니틴', dose: '330밀리그램', form: '정', T: 16, X: 26 },
  { key: 'sobrerol-200mg-capsule', cand: '0ff909f4-20dc-49d1-b8c5-91794ab62df6', ing: '소브레롤', dose: '200밀리그램', form: '캡슐', T: 15, X: 0 },
];

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const results: any[] = [];
  try {
    for (const g of GROUPS) {
      const target: string[] = JSON.parse(readFileSync(DATA + `otc-grounded-upgrade-${g.key}.run.json`, 'utf8')).rollback_master_ids;
      const ko = (await ds.query(`
        SELECT count(*) FILTER (WHERE canoncnt=1)::int canon1, count(*) FILTER (WHERE authored)::int authored,
               count(*) FILTER (WHERE dep_easy)::int dep_easy, count(*) FILTER (WHERE canoncnt>1)::int dup,
               count(*) FILTER (WHERE right_ref)::int right_ref
        FROM (SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL) authored,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.source_ref_id=$2::uuid AND s.deleted_at IS NULL) right_ref,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
          FROM unnest($1::uuid[]) mid) t`, [target, g.cand]))[0];
      const audit = (await ds.query(`SELECT count(*)::int n FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND description_type='STORE' AND language='ko' AND metadata->>'source_ref_id'=$2`, [target, g.cand]))[0];
      const en = (await ds.query(`SELECT count(DISTINCT master_id)::int m, count(*) FILTER (WHERE status='canonical')::int c, count(*) FILTER (WHERE status='needs_review')::int nr, count(DISTINCT md5(content))::int uniq FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [target]))[0];
      const excl = (await ds.query(`
        SELECT count(*) FILTER (WHERE ko_src='mfds_easy_drug')::int still_easy, count(*) FILTER (WHERE ko_src='mfds_drug_otc')::int authored, count(*)::int total
        FROM (SELECT pm.id, (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_src
          FROM product_masters pm WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%' AND pm.id <> ALL($4::uuid[])) t WHERE ko_src IS NOT NULL`, [g.ing, g.dose, g.form, target]))[0];
      results.push({
        key: g.key, T: g.T, X: g.X, targetN: target.length,
        ko, audit_n: audit.n, en,
        koPASS: ko.canon1 === g.T && ko.authored === g.T && ko.dep_easy === g.T && ko.right_ref === g.T && ko.dup === 0 && audit.n === g.T,
        enPASS: en.c === g.T && en.nr === 0 && en.uniq === 1 && en.m === g.T,
        excludeUntouched: excl,
      });
    }
    console.log('JSON_BEGIN'); console.log(JSON.stringify(results, null, 2)); console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
