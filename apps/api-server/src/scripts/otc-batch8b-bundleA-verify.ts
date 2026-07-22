/**
 * read-only VERIFY (WO-O4O-OTC-NEXT-BATCH-8B-BUNDLE-A · Agent 가). DB write 0.
 * 감사 b82d7e7ed 확정 target_master_ids 기준으로 담당 4그룹의 ko/en canonical LIVE 완결성 독립검증.
 *   ko canonical=T(mfds_drug_otc·source_ref) · easy deprecated=T · canonicalDup 0
 *   en canonical=T · en md5 uniform · sibling(out) EN byte-identical(target 밖 drift 0)
 * 조사·독립검증 도구(재현용 커밋).
 */
import { readFileSync } from 'node:fs';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const audit = JSON.parse(readFileSync('C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-next-batch-8b-audit-v1.json', 'utf8'));
const MINE = ['아르기닌티디아시케이트|200밀리그램|연질캡슐', '수산화마그네슘|500밀리그램|정', '이부프로펜|200밀리그램|연질캡슐', '덱시부프로펜|300밀리그램|정'];
const byGk: Record<string, any> = {};
for (const e of audit.candidates_examined) byGk[e.groupKey] = e;

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5436, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const results: any[] = [];
  try {
    for (const gk of MINE) {
      const a = byGk[gk];
      const T: number = a.target_master;
      const ids: string[] = a.target_master_ids;
      const cand: string = a.authored_source_ref_id;

      const ko = (await ds.query(`
        SELECT count(*) FILTER (WHERE canon1)::int canon1, count(*) FILTER (WHERE authored)::int authored,
               count(*) FILTER (WHERE right_ref)::int right_ref, count(*) FILTER (WHERE dep_easy)::int dep_easy,
               count(*) FILTER (WHERE dup)::int dup
        FROM (SELECT mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1 canon1,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)>1 dup,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL) authored,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.source_ref_id=$2::uuid AND s.deleted_at IS NULL) right_ref,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
          FROM unnest($1::uuid[]) mid) t`, [ids, cand]))[0];

      const enTgt = (await ds.query(`
        SELECT count(DISTINCT master_id)::int m, count(*) FILTER (WHERE status='canonical')::int c,
               count(*) FILTER (WHERE status='needs_review')::int nr, count(DISTINCT md5(content)) FILTER (WHERE status='canonical')::int uniq,
               min(md5(content)) FILTER (WHERE status='canonical') mmd5
        FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [ids]))[0];

      // sibling(out) EN — source_ref 공유, target 밖
      const sib = (await ds.query(`
        SELECT count(DISTINCT master_id)::int n, count(DISTINCT md5(content))::int uniq, min(md5(content)) mmd5
        FROM shared_product_descriptions
        WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [cand, ids]))[0];

      const koPASS = ko.canon1 === T && ko.authored === T && ko.right_ref === T && ko.dep_easy === T && ko.dup === 0;
      const enPASS = enTgt.c === T && enTgt.nr === 0 && enTgt.uniq === 1 && enTgt.m === T;
      const siblingByteIdentical = sib.uniq <= 1 && (sib.n === 0 || sib.mmd5 === enTgt.mmd5);
      results.push({ gk, T, koPASS, enPASS, siblingByteIdentical, ko, en: enTgt, sibling: sib, complete: koPASS && enPASS && siblingByteIdentical });
    }
    console.log('JSON_BEGIN'); console.log(JSON.stringify(results, null, 2)); console.log('JSON_END');
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
