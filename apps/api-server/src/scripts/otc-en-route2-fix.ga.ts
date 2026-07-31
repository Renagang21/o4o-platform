/** ROUTE 잔여 2건 최소 교정 — 제품 목적어 take → use (검증된 diff guard 재사용) */
import 'dotenv/config';
import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto'; import { Pool } from 'pg';
const D=path.resolve(process.cwd(),'src/scripts/data');
const md5=(s:string)=>createHash('md5').update(s,'utf8').digest('hex');
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const APPLY=process.argv.includes('--apply')&&process.env.OTC_EN_ROUTE2_FIX==='CONFIRM';
const SUBS=new Map([['take','use'],['Take','Use'],['taking','using'],['takes','uses']]);
function guard(a:string,b:string){const x=a.split(/(\s+)/),y=b.split(/(\s+)/);if(x.length!==y.length)return false;let ch=0;
  for(let i=0;i<x.length;i++){if(x[i]===y[i])continue;if(SUBS.get(x[i])!==y[i])return false;ch++;}return ch>0;}
(async()=>{
  const rows=(JSON.parse(fs.readFileSync(path.join(D,'otc-en-route130-adjudication.ga.json'),'utf8')).rows as any[])
    .filter(r=>r.hitSentences.some((s:string)=>/take it together with/i.test(s)));
  const pool=new Pool({host:'127.0.0.1',port:parseInt(process.env.PROXY_PORT||"5578",10),database:'o4o_platform',max:2,user:process.env.DB_USERNAME||'o4o_api',password:process.env.DB_PASSWORD});
  const plans:any[]=[],skips:any[]=[];
  for(const r of rows){
    const cur=(await pool.query('SELECT content,md5(content) h FROM shared_product_descriptions WHERE id=$1::uuid AND language=$2',[r.enDescriptionId,'en'])).rows[0];
    if(!cur||cur.h!==r.enHash){skips.push({id:r.enDescriptionId,code:'CONCURRENT_CHANGE_DETECTED'});continue;}
    let next=String(cur.content),edits=0;
    for(const s of r.hitSentences.filter((x:string)=>/take it together with/i.test(x))){
      const ns=s.replace(/\btake it together with\b/gi,(m)=>m.replace(/take/i,(t)=>t[0]==='T'?'Use':'use'));
      if(!guard(s,ns)){skips.push({id:r.enDescriptionId,code:'DIFF_GUARD_FAILED'});continue;}
      const f=esc(s); if(next.split(f).length-1!==1){skips.push({id:r.enDescriptionId,code:'NOT_UNIQUE'});continue;}
      next=next.replace(f,esc(ns)); edits++;
    }
    if(!edits){continue;}
    let back=next; for(const s of r.hitSentences.filter((x:string)=>/take it together with/i.test(x))){
      const ns=s.replace(/\btake it together with\b/gi,(m)=>m.replace(/take/i,(t)=>t[0]==='T'?'Use':'use'));
      back=back.replace(esc(ns),esc(s)); }
    if(back!==String(cur.content)){skips.push({id:r.enDescriptionId,code:'REVERSE_PATCH_MISMATCH'});continue;}
    plans.push({enId:r.enDescriptionId,master:r.masterId,oldHash:cur.h,newHash:md5(next),newContent:next,edits});
  }
  const results:any[]=[];
  if(APPLY) for(const p of plans){
    const q=await pool.query(`UPDATE shared_product_descriptions SET content=$2,updated_at=now()
      WHERE id=$1::uuid AND language='en' AND status='canonical' AND description_type='STORE' AND deleted_at IS NULL AND md5(content)=$3 RETURNING id`,[p.enId,p.newContent,p.oldHash]);
    results.push({enId:p.enId,status:q.rowCount===1?'GREEN':'CONCURRENT_CHANGE_DETECTED'});
  }
  await pool.end();
  const s={mode:APPLY?'APPLY':'dry-run',planned:plans.length,skipped:skips.length,skipCodes:skips,green:results.filter(r=>r.status==='GREEN').length};
  fs.writeFileSync(path.join(D,`otc-en-route2-fix-${APPLY?'apply':'dryrun'}.ga.json`),JSON.stringify({summary:s,plans:plans.map(({newContent,...p})=>p),results},null,1)+'\n','utf8');
  console.log(JSON.stringify(s,null,1));
})();
