import { readFileSync, writeFileSync } from 'node:fs';
const pw = readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const screen = JSON.parse(readFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/screen.json','utf8'));
const FPS = ['0c9f8cf9cd9f4d24','10c78d7cf8373260','0a6f44cbfe69f3d6','10b3d08d29374834'];
const sel = screen.filter(r=>FPS.includes(r.fp));
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:5455, username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'] });
await ds.initialize();
const out=[];
try { for (const c of sel) {
  const m = await ds.query(`SELECT pm.id::text id, pm.name, pm.specification spec FROM product_masters pm WHERE pm.id=ANY($1::uuid[]) ORDER BY pm.name`,[c.target_ids]);
  const s = await ds.query(`SELECT content FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1`,[c.target_ids[0]]);
  out.push({ fp:c.fp, atc:c.atc, strength:c.strength, form:c.form, sample:c.sample, target_ids:c.target_ids, names:m.map(x=>x.name+' | '+x.spec), source_html:s[0]?.content||'' });
}} finally { await ds.destroy(); }
writeFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/batch2-source.json', JSON.stringify(out,null,1),'utf8');
console.log('fetched', out.length);
