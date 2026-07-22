/**
 * OTC Batch 02 후보 9그룹 내용·route·grounding·master 교집합 read-only PROBE (Agent 나). DB write 0.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const OTC = 'MFDS_DRUG_OTC';
const CAND = [
  '나프록센|250밀리그램|연질캡슐', '클로트리마졸|100밀리그램|정', '알파칼시돌|1마이크로그램|연질캡슐',
  '아르기닌티디아시케이트|200밀리그램|연질캡슐', '이부프로펜|400밀리그램|연질캡슐',
  '클로닉신리시네이트|125밀리그램|연질캡슐', '플루벤다졸|500밀리그램|정',
  '이부프로펜아르기닌|368.9밀리그램|정', 'L-시스틴|500밀리그램|연질캡슐',
];
const BATCH01 = [
  '나프록센나트륨|275밀리그램|정', '클로닉신리시네이트|125밀리그램|정', '이부프로펜|200밀리그램|정',
  '아스피린|100밀리그램|정', '알파칼시돌|0.5마이크로그램|연질캡슐', '디펜히드라민염산염|50밀리그램|연질캡슐',
  '독시라민숙신산염|25밀리그램|정', '메코발라민|500마이크로그램|캡슐', '결정글루코사민황산염|250밀리그램|캡슐',
  '이부프로펜|200밀리그램|연질캡슐',
];
function readPw() { return readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim(); }

async function main() {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  try {
    // 후보별 draft 원문 필드 + guard_result 상세
    const drafts = await ds.query(
      `SELECT source_identifier_value gk,
         seed_json->>'ingredient' ing, seed_json->>'strengthToken' str, seed_json->>'doseForm' form,
         seed_json->'groupScope' scope, guard_result,
         content_json->>'efficacy' efficacy, content_json->>'usage' usage,
         content_json->>'caution' caution, content_json->'summaryTable' summary_table,
         content_json->>'route' route_field
       FROM product_candidate_description_drafts
       WHERE source_label=$1 AND deleted_at IS NULL AND source_identifier_value = ANY($2)`,
      [OTC, CAND],
    );

    // route 파생 신호: 제품명에 질정/좌제/외용 등 비경구 키워드 존재하는 master 비율
    const routeSignal = await ds.query(
      `WITH d AS (
        SELECT source_identifier_value gk, seed_json->>'ingredient' ing, seed_json->>'strengthToken' str, seed_json->>'doseForm' form
        FROM product_candidate_description_drafts WHERE source_label=$1 AND deleted_at IS NULL AND source_identifier_value = ANY($2))
      SELECT d.gk,
        count(*) enum_masters,
        count(*) FILTER (WHERE pm.name ~ '(질정|질좌제|좌제|좌약|외용|점안|점비|스프레이|첩부|패취|패치|겔|크림|연고)') AS nonoral_name,
        count(*) FILTER (WHERE pm.name LIKE '%질정%') AS vaginal_name
      FROM d JOIN product_masters pm ON pm.regulatory_type='DRUG' AND pm.drug_category='otc'
        AND substring(pm.name from '\\(([^()]+)\\)\\s*$')=d.ing
        AND split_part(pm.specification,' / ',1)=d.str
        AND (CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END)=d.form
      GROUP BY d.gk`,
      [OTC, CAND],
    );

    // master 교집합: 후보 9그룹의 전개 master 집합 vs Batch01 10그룹의 전개 master 집합
    const overlapCte = (gks) => `
      WITH d AS (
        SELECT source_identifier_value gk, seed_json->>'ingredient' ing, seed_json->>'strengthToken' str, seed_json->>'doseForm' form
        FROM product_candidate_description_drafts WHERE source_label='${OTC}' AND deleted_at IS NULL AND source_identifier_value = ANY($1))
      SELECT DISTINCT pm.id
      FROM d JOIN product_masters pm ON pm.regulatory_type='DRUG' AND pm.drug_category='otc'
        AND substring(pm.name from '\\(([^()]+)\\)\\s*$')=d.ing
        AND split_part(pm.specification,' / ',1)=d.str
        AND (CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END)=d.form`;
    const candMasters = await ds.query(overlapCte('cand') , [CAND]);
    const b01Masters = await ds.query(overlapCte('b01'), [BATCH01]);
    const candSet = new Set(candMasters.map((r) => r.id));
    const b01Set = new Set(b01Masters.map((r) => r.id));
    let inter = 0; for (const id of candSet) if (b01Set.has(id)) inter++;

    // 후보 내부 master 중복(그룹 간): 후보 master가 2개 이상 그룹에 매핑되는지
    const candDup = await ds.query(
      `WITH d AS (
        SELECT source_identifier_value gk, seed_json->>'ingredient' ing, seed_json->>'strengthToken' str, seed_json->>'doseForm' form
        FROM product_candidate_description_drafts WHERE source_label=$1 AND deleted_at IS NULL AND source_identifier_value = ANY($2)),
      mm AS (SELECT pm.id, count(DISTINCT d.gk) g
        FROM d JOIN product_masters pm ON pm.regulatory_type='DRUG' AND pm.drug_category='otc'
          AND substring(pm.name from '\\(([^()]+)\\)\\s*$')=d.ing
          AND split_part(pm.specification,' / ',1)=d.str
          AND (CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END)=d.form
        GROUP BY pm.id)
      SELECT count(*) FILTER (WHERE g>1) dup_masters, count(*) total FROM mm`,
      [OTC, CAND],
    );

    writeFileSync('C:\\tmp\\otc-b02-content.json', JSON.stringify({
      drafts, routeSignal,
      overlap: { candMasterCount: candSet.size, b01MasterCount: b01Set.size, intersection: inter },
      candInternalDup: candDup[0],
    }, null, 2), 'utf8');
    console.log('written drafts', drafts.length, 'overlap', inter, 'candMasters', candSet.size);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
