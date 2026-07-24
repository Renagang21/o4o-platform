// READ-ONLY production screen (GA-V5): allowlist safe oral multi-ingredient combo ATC classes,
// verify source completeness, exclude NA safety-subgroup claimed masters. DB write 0.
import { readFileSync, writeFileSync } from 'node:fs';
const SP = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad';
const IN = `${SP}/atc-combo-candidates-bysize.sohae.json`;
const OUT = `${SP}/prodscreen.sohae.json`;
import { existsSync } from 'node:fs'; const NA = new Set(existsSync(`${SP}/na-safety-masters.json`)?JSON.parse(readFileSync(`${SP}/na-safety-masters.json`,'utf8')):[]);
const pw = readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
// safe classes: multivitamin/mineral/tonic/iron-combo/hepato-bile/antacid-digestive combos
const ALLOW = /^(A11|A12|A13A|B03AE|A05AA|A05BA|A02AD|A02AH|A02AX|A09AA|A16A|A11JB|A11JC)/;
const RESERVED = new Set(['A06AB52','A06AC51','M03BB53','M09AB52','A02BA53','M01AE51']);
const N = parseInt(process.env.N||'999',10);
const all = JSON.parse(readFileSync(IN,'utf8')).candidates.filter(c => ALLOW.test(c.atc||'') && !RESERVED.has(c.atc));
const cand = all.slice(0, N);
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:parseInt(process.env.AUDIT_DB_PORT||'5456',10), username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:120000 } });
await ds.initialize();
const rows=[];
try { for (const c of cand) {
  const src = await ds.query(`SELECT content FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1`, [c.target_ids[0]]);
  const auth = await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug'`, [c.target_ids]);
  const html = src[0]?.content||''; const has = re=>re.test(html);
  const nm = await ds.query(`SELECT pm.name FROM product_masters pm WHERE pm.id=$1::uuid`, [c.target_ids[0]]);
  const name = nm[0]?.name||c.sample;
  const cold = /감기|코감기|콧물|재채기|비염/.test(html);
  const naHit = c.target_ids.filter(id=>NA.has(id)).length;
  const pick = !cold && naHit===0 && has(/효능|효과/) && has(/용법|용량/) && has(/주의|경고|금기/) && html.length>=500 && auth[0].n===0;
  rows.push({ fp:c.fp, atc:c.atc, strength:c.strength, form:c.form, size:c.size, name, srcLen:html.length, cold, naHit, authored:auth[0].n, pick, target_ids:c.target_ids });
}} finally { await ds.destroy(); }
writeFileSync(OUT, JSON.stringify(rows, null, 1), 'utf8');
const picks = rows.filter(r=>r.pick);
console.log(`allow-matched ${all.length}, screened ${rows.length}, pickable ${picks.length}, pending ${picks.reduce((s,r)=>s+r.size,0)}, naHitGroups ${rows.filter(r=>r.naHit>0).length}`);
for (const r of picks.slice(0,60)) console.log(`${String(r.size).padStart(3)} | ${(r.atc||'-').padEnd(9)} | ${String(r.strength).padEnd(14)} | ${r.form.padEnd(6)} | src=${r.srcLen} | ${r.name}`);
