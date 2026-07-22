// READ-ONLY production screen: allowlist genuine oral multi-ingredient combo ATC classes, verify source completeness.
import { readFileSync, writeFileSync } from 'node:fs';
const IN = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/atc-combo-candidates-bysize.json';
const OUT = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/prodscreen.json';
const pw = readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
// genuine multi-ingredient combo classes: multivitamin/mineral/tonic/iron-combo/hepato-bile/antacid-digestive combos
const ALLOW = /^(A11|A12|A13A|B03AE|A05AA|A05BA|A02AD|A02AH|A02AX|A09AA|A16A|A11JB|A11JC)/;
const RESERVED = new Set(['A06AB52','A06AC51','M03BB53','M09AB52','A02BA53','M01AE51']);
const DONE_FP = new Set(['0273b8335509d44c','01c0f11a99a2bee5','068a42c85de1d073','0a6f44cbfe69f3d6','0c9f8cf9cd9f4d24','10b3d08d29374834','10c78d7cf8373260']);
const OFF = parseInt(process.env.OFF||'0',10), N = parseInt(process.env.N||'60',10);
const all = JSON.parse(readFileSync(IN,'utf8')).candidates.filter(c => ALLOW.test(c.atc||'') && !RESERVED.has(c.atc) && !DONE_FP.has(c.fp));
const cand = all.slice(OFF, OFF+N);
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:parseInt(process.env.AUDIT_DB_PORT||'5455',10), username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:120000 } });
await ds.initialize();
const rows=[];
try { for (const c of cand) {
  const src = await ds.query(`SELECT content FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1`, [c.target_ids[0]]);
  const auth = await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug'`, [c.target_ids]);
  const html = src[0]?.content||''; const has = re=>re.test(html);
  const nm = await ds.query(`SELECT pm.name FROM product_masters pm WHERE pm.id=$1::uuid`, [c.target_ids[0]]);
  const name = nm[0]?.name||c.sample;
  const cold = /감기|코감기|콧물|재채기|비염/.test(html);
  const pick = !cold && has(/효능|효과/) && has(/용법|용량/) && has(/주의|경고|금기/) && html.length>=500 && auth[0].n===0;
  rows.push({ fp:c.fp, atc:c.atc, strength:c.strength, form:c.form, size:c.size, name, srcLen:html.length, cold, authored:auth[0].n, pick, target_ids:c.target_ids });
}} finally { await ds.destroy(); }
writeFileSync(OUT, JSON.stringify(rows, null, 1), 'utf8');
const picks = rows.filter(r=>r.pick);
console.log(`allow-matched ${all.length}, screened ${rows.length}, pickable ${picks.length}, pending ${picks.reduce((s,r)=>s+r.size,0)}`);
for (const r of picks.slice(0,40)) console.log(`${String(r.size).padStart(3)} | ${(r.atc||'-').padEnd(9)} | ${String(r.strength).padEnd(12)} | ${r.form.padEnd(8)} | src=${r.srcLen} | ${r.name}`);
