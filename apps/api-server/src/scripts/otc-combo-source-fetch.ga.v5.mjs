// READ-ONLY source fetch (GA-V5): dump easy_drug canonical content for claimed batch groups. DB write 0.
import { readFileSync, writeFileSync } from 'node:fs';
const SP = 'C:/Users/home/AppData/Local/Temp/claude/c--Users-home-coding-o4o-platform/988204c9-cd33-461a-806d-cd120b60847f/scratchpad';
const picks = JSON.parse(readFileSync(`${SP}/picks.v5.json`,'utf8'));
const OFF = parseInt(process.env.OFF||'0',10), N = parseInt(process.env.N||'10',10);
const batch = picks.slice(OFF, OFF+N);
const pw = readFileSync('C:/Users/home/coding/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:parseInt(process.env.AUDIT_DB_PORT||'5442',10), username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:120000 } });
await ds.initialize();
const out=[];
try { for (const c of batch) {
  const mem = await ds.query(`SELECT pm.id::text id, pm.name, pm.specification spec, es.content
    FROM product_masters pm JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
    WHERE pm.id=ANY($1::uuid[]) ORDER BY pm.name`, [c.target_ids]);
  const hashes=[...new Set(mem.map(m=>m.content))];
  out.push({ fp:c.fp, atc:c.atc, strength:c.strength, form:c.form, size:c.size,
    names: mem.map(m=>`${m.name} | ${m.spec}`), distinctContent: hashes.length, content: mem[0].content });
}} finally { await ds.destroy(); }
writeFileSync(`${SP}/sources.batch.json`, JSON.stringify(out, null, 1), 'utf8');
for (const o of out) console.log(`fp=${o.fp} size=${o.size} distinctContent=${o.distinctContent} len=${o.content.length} | ${o.names[0]}`);
