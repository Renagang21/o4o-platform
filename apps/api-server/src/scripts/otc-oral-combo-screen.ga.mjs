// READ-ONLY screening: over candidate fp-groups, fetch source, classify completeness / reserved-family / cold, emit compact list.
import { readFileSync, writeFileSync } from 'node:fs';
const RES = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/atc-combo-audit-result.json';
const OUT = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/831fdb57-1dfa-46b3-b7a7-789d46db9f18/scratchpad/screen.json';
const pw = readFileSync('C:/Users/sohae/o4o-platform/apps/api-server/.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const RESERVED = new Set(['A06AB52','A06AC51','M03BB53','M09AB52','A02BA53','M01AE51']);
const OFF = parseInt(process.env.OFF||'12',10), N = parseInt(process.env.N||'50',10);
const cand = JSON.parse(readFileSync(RES,'utf8')).candidates.slice(OFF, OFF+N);
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type:'postgres', host:'127.0.0.1', port:parseInt(process.env.AUDIT_DB_PORT||'5455',10), username:'o4o_api', password:pw, database:'o4o_platform', entities:[], synchronize:false, logging:['error'], extra:{ statement_timeout:120000 } });
await ds.initialize();
const rows = [];
try {
  for (const c of cand) {
    // skip if any member has authored SPD already (guard)
    const src = await ds.query(`SELECT content FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1`, [c.target_ids[0]]);
    const auth = await ds.query(`SELECT count(*)::int n FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL AND s.source_type<>'mfds_easy_drug'`, [c.target_ids]);
    const html = src[0]?.content || '';
    const has = re => re.test(html);
    const cold = /감기|비염|코감기|콧물|재채기/.test(html);
    const reserved = RESERVED.has(c.atc);
    const hasEff = has(/효능|효과/), hasUse = has(/용법|용량/), hasCau = has(/주의|경고|금기/);
    rows.push({ fp:c.fp, atc:c.atc, strength:c.strength, form:c.form, size:c.size, sample:c.sample,
      srcLen:html.length, hasEff, hasUse, hasCau, cold, reserved, authored:auth[0].n, target_ids:c.target_ids,
      pick: (!reserved && !cold && hasEff && hasUse && hasCau && html.length>=500 && auth[0].n===0) });
  }
} finally { await ds.destroy(); }
writeFileSync(OUT, JSON.stringify(rows, null, 1), 'utf8');
const picks = rows.filter(r=>r.pick);
console.log(`screened ${rows.length}, pickable ${picks.length}`);
for (const r of picks.slice(0,25)) console.log(`${r.pick?'PICK':'    '} fp=${r.fp} atc=${(r.atc||'-').padEnd(9)} ${String(r.strength).padEnd(12)} ${r.form.padEnd(6)} size=${r.size} src=${r.srcLen} | ${r.sample}`);
