import pg from 'pg';
import fs from 'node:fs';
for (const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const SCR='C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-coding-o4o-platform/6f818eaf-6d54-4947-a544-31a66727cecb/scratchpad';
const pool=JSON.parse(fs.readFileSync(SCR+'/msm-vd-pool.json','utf8'));
const prom=JSON.parse(fs.readFileSync(SCR+'/msm-promoted-map.json','utf8'));
const stmts=[...new Set(pool.map(p=>String(p.statementNo).trim()))];
console.log('eligible pool:', pool.length, '| unique stmt:', stmts.length);
const promotedInMap=stmts.filter(s=>prom[s]===true).length;
console.log('promoted (per candidate map):', promotedInMap, '| NEW (not promoted):', stmts.length-promotedInMap);
const c=new pg.Client({host:process.env.DB_HOST,port:+process.env.DB_PORT,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,statement_timeout:120000});
await c.connect();
// authoritative: candidates matched + masters by permit
const cand=await c.query(`SELECT raw_payload->'source'->>'STTEMNT_NO' stmt, matched_product_master_id mid FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND raw_payload->'source'->>'STTEMNT_NO'=ANY($1)`,[stmts]);
const promotedDb=cand.rows.filter(r=>r.mid!=null).map(r=>r.stmt);
const m=await c.query(`SELECT count(DISTINCT mfds_permit_number)::int n FROM product_masters WHERE mfds_permit_number=ANY($1)`,[stmts]);
console.log('candidates found:', cand.rowCount, '| promoted(db):', promotedDb.length, '| masters(db):', m.rows[0].n);
const newT=stmts.filter(s=>!promotedDb.includes(s));
console.log('NEW apply targets (db-confirmed):', newT.length);
if(newT.length) { console.log('NEW statementNos:', newT.slice(0,15).join(',')); 
  // characterize new: forms, amount combos
  const np=pool.filter(p=>newT.includes(String(p.statementNo).trim()));
  const combos={}, forms={}; for(const p of np){ const msm=p.ingredients.find(i=>i.key==='MSM'), vd=p.ingredients.find(i=>i.key==='비타민D'); const ck=`MSM${msm?.declaredAmount?.value}${msm?.declaredAmount?.unit} + VD${vd?.declaredAmount?.value}${vd?.declaredAmount?.unit}`; combos[ck]=(combos[ck]||0)+1; const f=p.servingUnitType||p.serving?.unitType||'?'; forms[f]=(forms[f]||0)+1; }
  console.log('NEW amount combos:', Object.keys(combos).length, '| forms:', JSON.stringify(forms));
}
await c.end();
