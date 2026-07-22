import { readFileSync, writeFileSync } from 'node:fs';
const ENV = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const DATA = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-batch-02-ko-final-v1.json';
const pw = readFileSync(ENV, 'utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const data = JSON.parse(readFileSync(DATA, 'utf8'));
const FORM = `CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐' WHEN pm.name LIKE '%캡슐%' THEN '캡슐' WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END`;
const gb = `pm.regulatory_type='DRUG' AND pm.drug_category='otc' AND pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND (${FORM})=$3`;
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: pw, database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
await ds.initialize();
const out = { groups: [], totals: {} };
let totNew = 0, totSdwarn = 0, totTable = 0, totComment = 0, totDup = 0;
for (const g of data.groups) {
  // 이 그룹 master 중 새로 만든 mfds_drug_otc ko STORE canonical
  const r = await ds.query(
    `SELECT count(*)::int newcanon,
       count(*) FILTER (WHERE s.content LIKE '%sd-warn%')::int sdwarn,
       count(*) FILTER (WHERE s.content LIKE '%<table%')::int tbl,
       count(*) FILTER (WHERE s.content LIKE '%<!--%')::int cmt
     FROM product_masters pm
     JOIN shared_product_descriptions s ON s.master_id=pm.id AND s.deleted_at IS NULL
       AND s.status='canonical' AND s.language='ko' AND s.description_type='STORE'
       AND s.source_type='mfds_drug_otc' AND s.source_ref_id=$4::uuid
     WHERE ${gb}`,
    [g.ingredient, g.dose, g.formKeyword, g.candidateId]);
  // master당 canonical 중복(전 소스)
  const d = await ds.query(
    `SELECT count(*)::int dup FROM (SELECT pm.id FROM product_masters pm
       JOIN shared_product_descriptions s ON s.master_id=pm.id AND s.deleted_at IS NULL AND s.status='canonical'
       WHERE ${gb} GROUP BY pm.id HAVING count(*)>1) t`,
    [g.ingredient, g.dose, g.formKeyword]);
  const row = { key: g.key, expected: g.newInsert, newCanon: r[0].newcanon, sdwarn: r[0].sdwarn, table: r[0].tbl, comment: r[0].cmt, dupMaster: d[0].dup };
  out.groups.push(row);
  totNew += r[0].newcanon; totSdwarn += r[0].sdwarn; totTable += r[0].tbl; totComment += r[0].cmt; totDup += d[0].dup;
}
out.totals = { newCanon: totNew, sdwarn: totSdwarn, table: totTable, comment: totComment, dupMaster: totDup, expected: 66 };
// 아르기닌 포함 확인
const arg = out.groups.find((x) => x.key.startsWith('아르기닌'));
out.arginineIncluded = arg ? arg.newCanon : 0;
await ds.destroy();
writeFileSync('C:\\tmp\\otc-b02-postverify.json', JSON.stringify(out, null, 2), 'utf8');
console.log(`newCanon ${totNew}/66 · sdwarn ${totSdwarn} · table ${totTable} · comment ${totComment} · dupMaster ${totDup} · arginine ${out.arginineIncluded}`);
