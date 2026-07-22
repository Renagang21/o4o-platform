// READ-ONLY: fetch official easy_drug source + member names for selected candidate fp-groups.
import { readFileSync, writeFileSync } from 'node:fs';
const RES = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/atc-combo-audit-result.json';
const OUT = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/pilot-source.json';
const pw = readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const N = parseInt(process.env.FETCH_N || '10', 10);
const cand = JSON.parse(readFileSync(RES,'utf8')).candidates.slice(0, N);
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:parseInt(process.env.AUDIT_DB_PORT||'5434',10), username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:120000 } });
await ds.initialize();
const groups = [];
try {
  for (const c of cand) {
    const members = await ds.query(`SELECT pm.id::text id, pm.name, pm.specification spec, e.atc_code, e.active_ingredients, e.ingredient_summary
      FROM product_masters pm LEFT JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.deleted_at IS NULL
      WHERE pm.id = ANY($1::uuid[]) ORDER BY pm.name`, [c.target_ids]);
    const src = await ds.query(`SELECT content FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1`, [c.target_ids[0]]);
    groups.push({ fp:c.fp, atc:c.atc, strength:c.strength, form:c.form, size:c.size, sample:c.sample,
      members: members.map(m=>({ id:m.id, name:m.name, spec:m.spec, atc:m.atc_code, ai:m.active_ingredients, isum:m.ingredient_summary })),
      source_html: src[0]?.content || '(NO SOURCE)' });
  }
} finally { await ds.destroy(); }
writeFileSync(OUT, JSON.stringify(groups, null, 1), 'utf8');
console.log('fetched groups:', groups.length, '→', OUT);
for (const g of groups) console.log(`fp=${g.fp} atc=${g.atc} ${g.strength}|${g.form} size=${g.size} srcLen=${g.source_html.length} | ${g.members.map(m=>m.name).join(', ')}`);
