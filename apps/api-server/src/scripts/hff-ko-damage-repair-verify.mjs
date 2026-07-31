/** KO 손상 수정 독립검증 (별도 read-only 세션). */
import fs from 'node:fs'; import crypto from 'node:crypto'; import pg from 'pg';
const D='apps/api-server/src/scripts/data';
const P=JSON.parse(fs.readFileSync(`${D}/hff-ko-damage-repair-plan-v1.json`,'utf8'));
const RB=JSON.parse(fs.readFileSync(`${D}/hff-ko-damage-repair-rollback-v1.json`,'utf8'));
const sha=s=>crypto.createHash('sha256').update(s??'').digest('hex');
const norm=s=>(s??'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const leaf=h=>[...(h??'').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)].map(x=>norm(x[1])).filter(Boolean);
const c=new pg.Client({host:'127.0.0.1',port:parseInt(process.env.PROXY_PORT??'5543',10),user:process.env.PGUSER,password:process.env.PGPW,database:'o4o_platform',ssl:false});
await c.connect(); await c.query('SET default_transaction_read_only = on');
const now=new Map(); const ids=P.plan.map(p=>p.canonicalId);
for(let i=0;i<ids.length;i+=800) for(const r of (await c.query('SELECT id,content,status,language,description_type,source_type,master_id FROM shared_product_descriptions WHERE id=ANY($1)',[ids.slice(i,i+800)])).rows) now.set(r.id,r);
const g=(await c.query(`SELECT
 (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
 (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
 (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
 (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm,
 (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' GROUP BY master_id HAVING count(*)>1) x) ko_dup`)).rows[0];
// 전체 KO 재스캔 — 남은 손상
const all=(await c.query(`SELECT id,content FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated'`)).rows;
await c.end();
const fail=[]; let hashOk=0,oldLeft=0,fieldDrift=0,rbOk=0,clauseLoss=0;
for(const p of P.plan){
  const row=now.get(p.canonicalId);
  if(!row){fail.push(`MISSING:${p.canonicalId}`);continue;}
  if(sha(row.content)===p.newContentHash) hashOk++; else fail.push(`HASH:${p.canonicalId}`);
  if(sha(row.content)===p.oldContentHash) oldLeft++;
  if(row.status!=='canonical'||(row.language??'ko')!=='ko'||row.description_type!=='STORE'||row.source_type!=='o4o_hff_generated'||row.master_id!==p.productMasterId) fieldDrift++;
  // 공식 절 손실: 제거 대상(마커·영문) 외의 절이 사라졌는가
  const removed=p.ops.filter(o=>o.op==='REMOVE_LI').length;
  const oldLi=(p.newContent.match(/<li>/g)??[]).length;
  if(leaf(row.content).length===0) clauseLoss++;
  const rb=RB.rollback.find(r=>r.canonicalId===p.canonicalId);
  if(rb&&rb.oldContentHash===p.oldContentHash&&rb.newContentHash===p.newContentHash) rbOk++;
}
let residue={openParen:0,markerOnly:0,english:0};
for(const r of all) for(const t of leaf(r.content)){
  if(/\s*\($/.test(t)) residue.openParen++;
  if(/^\(국문\)$|^\(영문\)$|^일일섭취량$/.test(t)) residue.markerOnly++;
  if(/^[A-Za-z][A-Za-z ,.'()\/-]{12,}$/.test(t)) residue.english++;
}
const out={verifiedAt:new Date().toISOString(),readOnly:true,separateSession:true,
 targets:P.plan.length,newHashMatch:hashOk,oldHashRemains:oldLeft,fieldDrift,rollbackManifestOk:rbOk,emptyClauseDocs:clauseLoss,
 globals:g,expected:{ko_canon:40918,en_canon:17642,spd_all:122267,pm:40948,ko_dup:0},
 residueAfterRepairWholeCorpus:residue,failedChecks:fail.slice(0,10)};
out.globalsOk=g.ko_canon===40918&&g.en_canon===17642&&g.spd_all===122267&&g.pm===40948&&g.ko_dup===0;
out.verdict=(fail.length===0&&hashOk===P.plan.length&&oldLeft===0&&fieldDrift===0&&clauseLoss===0&&out.globalsOk)?'PASS':'FAIL';
fs.writeFileSync(`${D}/hff-ko-damage-repair-independent-verification-v1.json`,JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
