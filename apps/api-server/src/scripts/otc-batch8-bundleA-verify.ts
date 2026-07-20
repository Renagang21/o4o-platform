/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1 (에이전트 가)
 *
 * 번들 A 4그룹 **독립검증** — read-only, DB write 0. (runner 사후검증과 별개 쿼리 패스)
 *   ① ko canonical == authored(mfds_drug_otc) + 올바른 source_ref_id + easy deprecated + canonical 정확히 1
 *   ② audit(canonical_replaced) 행 수 == T
 *   ③ 제외(비대상) 형제 master: 여전히 easy canonical · authored 0 (미접촉)
 *   ④ en canonical == T · en 중복 0 · en 지문 단일(대상 = out 재사용본)
 *   ⑤ canonicalDup(대상 master 당 ko/en canonical >1) == 0
 * 근거: otc-next-batch-8-audit-v1.json target_master_ids · fp-harvest excludeFps.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const OUT = path.join(DATA, 'otc-batch8-bundleA-verify.json');

interface G { groupKey: string; candidate: string; T: number; koRunBase: string; ingredient: string; dose: string; formKeyword: string; enMd5: string }
const GROUPS: G[] = [
  { groupKey: '락토바실루스아시도필루스균|300밀리그램|캡슐', candidate: '177466cf-a57b-4381-b1ff-44bc87c12673', T: 13, koRunBase: 'otc-grounded-upgrade-lactobacillus-acidophilus-300mg-capsule', ingredient: '락토바실루스아시도필루스균', dose: '300밀리그램', formKeyword: '캡슐', enMd5: '81c45380008e67058c2fd3fdcee1c5ee' },
  { groupKey: '알파칼시돌|0.5마이크로그램|연질캡슐', candidate: '0436f0d8-3dbe-4939-b511-de3bcd69593c', T: 12, koRunBase: 'otc-grounded-upgrade-alfacalcidol-0.5mcg-softcap', ingredient: '알파칼시돌', dose: '0.5마이크로그램', formKeyword: '연질캡슐', enMd5: 'd0e8523587e6cb11df9ddd423cc7366b' },
  { groupKey: '아세틸시스테인|100밀리그램|캡슐', candidate: '240871d7-3dce-43e9-a0d5-3b3bcbd7c5a4', T: 9, koRunBase: 'otc-grounded-upgrade-acetylcysteine-100mg-capsule', ingredient: '아세틸시스테인', dose: '100밀리그램', formKeyword: '캡슐', enMd5: 'c167e18fc0f042778b0935797b944508' },
  { groupKey: '나프록센나트륨|275밀리그램|정', candidate: '006f1a2b-f1f7-40a6-ac10-7f0093a150a1', T: 8, koRunBase: 'otc-grounded-upgrade-naproxen-sodium-275mg-jeong', ingredient: '나프록센나트륨', dose: '275밀리그램', formKeyword: '정', enMd5: '744aecaaac09a35b96e59b8c0d3bea3b' },
];

async function main(): Promise<void> {
  const audit = JSON.parse(fs.readFileSync(path.join(DATA, 'otc-next-batch-8-audit-v1.json'), 'utf8'));
  const auditIds = new Map<string, string[]>((audit.candidates_examined || []).map((c: any) => [c.groupKey, (c.target_master_ids || []).slice().sort()]));

  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const results: any[] = [];
  try {
    for (const g of GROUPS) {
      const TARGET: string[] = JSON.parse(fs.readFileSync(path.join(DATA, `${g.koRunBase}.run.json`), 'utf8')).rollback_master_ids;
      const idsMatchAudit = JSON.stringify(TARGET.slice().sort()) === JSON.stringify(auditIds.get(g.groupKey));

      const ko = (await ds.query(`
        SELECT
          count(*) FILTER (WHERE canoncnt=1)::int canon1,
          count(*) FILTER (WHERE canoncnt>1)::int dup,
          count(*) FILTER (WHERE authored)::int authored,
          count(*) FILTER (WHERE right_ref)::int right_ref,
          count(*) FILTER (WHERE dep_easy)::int dep_easy,
          count(*) FILTER (WHERE easy_canon)::int easy_still_canon
        FROM (
          SELECT mid,
            (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL) authored,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_drug_otc' AND s.source_ref_id=$2::uuid AND s.deleted_at IS NULL) right_ref,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) easy_canon
          FROM unnest($1::uuid[]) mid
        ) t`, [TARGET, g.candidate]))[0];

      const auditRows = (await ds.query(
        `SELECT count(*)::int n FROM shared_product_description_audit_logs
         WHERE master_id = ANY($1::uuid[]) AND event_type='canonical_replaced' AND description_type='STORE' AND language='ko'
           AND metadata->>'source_ref_id'=$2`, [TARGET, g.candidate]))[0];

      // 제외/형제(같은 coarse, 대상 밖) — 여전히 easy canonical 이어야
      const sib = (await ds.query(`
        SELECT count(*)::int coarse_out,
               count(*) FILTER (WHERE ko_src='mfds_easy_drug')::int still_easy,
               count(*) FILTER (WHERE ko_src='mfds_drug_otc')::int authored
        FROM (
          SELECT pm.id,
            (SELECT s.source_type FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL LIMIT 1) ko_src
          FROM product_masters pm
          WHERE pm.name LIKE '%('||$2||')' AND split_part(pm.specification,' / ',1)=$3 AND pm.name LIKE '%'||$4||'%'
            AND pm.id <> ALL($1::uuid[])
            AND EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL)
        ) t WHERE ko_src IS NOT NULL`, [TARGET, g.ingredient, g.dose, g.formKeyword]))[0];

      const en = (await ds.query(`
        SELECT count(*) FILTER (WHERE status='canonical')::int en_canon,
               count(*) FILTER (WHERE status='needs_review')::int en_nr,
               count(DISTINCT md5(content))::int distinct_md5,
               min(md5(content)) sample_md5
        FROM shared_product_descriptions
        WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [TARGET]))[0];
      const enDup = (await ds.query(
        `SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t`, [TARGET]))[0];

      const checks = {
        target_ids_match_audit: idsMatchAudit,
        ko_canonical_exactly_1: ko.canon1 === g.T,
        ko_canonicalDup_0: ko.dup === 0,
        ko_authored: ko.authored === g.T,
        ko_source_ref_correct: ko.right_ref === g.T,
        ko_easy_deprecated: ko.dep_easy === g.T,
        ko_no_easy_canonical_left: ko.easy_still_canon === 0,
        audit_rows_eq_T: auditRows.n === g.T,
        siblings_untouched_all_easy: sib.authored === 0 && sib.still_easy === sib.coarse_out,
        en_canonical_eq_T: en.en_canon === g.T,
        en_needs_review_0: en.en_nr === 0,
        en_single_md5_reused: en.distinct_md5 === 1 && en.sample_md5 === g.enMd5,
        en_canonicalDup_0: enDup.n === 0,
      };
      results.push({ groupKey: g.groupKey, T: g.T, ko, auditRows: auditRows.n, siblings: sib, en, enDup: enDup.n, checks, verdict: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL' });
    }
  } finally { await ds.destroy(); }

  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1', agent: '에이전트 가', readOnly: true, dbWrite: 0,
    groups: results, allPass: results.every((r) => r.verdict === 'PASS'),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(results.map((r) => ({ groupKey: r.groupKey, T: r.T, verdict: r.verdict, failed: Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k), siblings: r.siblings, auditRows: r.auditRows, en: r.en })), null, 2));
  console.log('\nALL_PASS =', out.allPass);
  if (!out.allPass) process.exit(1);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
