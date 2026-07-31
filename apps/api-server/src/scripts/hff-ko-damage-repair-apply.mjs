/** KO 손상 수정 Apply (이중 게이트 · shard 200 · row hash lock). */
import fs from 'node:fs'; import pg from 'pg';
const D='apps/api-server/src/scripts/data';
const P=JSON.parse(fs.readFileSync(`${D}/hff-ko-damage-repair-plan-v1.json`,'utf8'));
const R=JSON.parse(fs.readFileSync(`${D}/hff-ko-damage-repair-render-audit-v1.json`,'utf8'));
if(R.verdict!=='PASS'){console.error('RENDER_NOT_PASS');process.exit(1);}
const APPLY=process.argv.includes('--apply')&&process.env.HFF_KO_REPAIR_CONFIRM==='YES';
const c=new pg.Client({host:'127.0.0.1',port:parseInt(process.env.PROXY_PORT??'5543',10),user:process.env.PGUSER,password:process.env.PGPW,database:'o4o_platform',ssl:false});
await c.connect();
const g=async()=>(await c.query(`SELECT
 (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
 (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
 (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
 (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm`)).rows[0];
const before=await g();
if(!APPLY){console.log(JSON.stringify({mode:'DRY_RUN',targets:P.plan.length,before,render:R.verdict},null,1));await c.end();process.exit(0);}
const SH=200; const shards=[]; let upd=0; const skipped=[];
for(let i=0;i<P.plan.length;i+=SH){
  const part=P.plan.slice(i,i+SH); let u=0, rolled=false;
  try{
    await c.query('BEGIN');
    for(const t of part){
      const r=await c.query(`UPDATE shared_product_descriptions SET content=$1, updated_at=now()
        WHERE id=$2 AND master_id=$3 AND description_type='STORE' AND status='canonical'
          AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated' AND deleted_at IS NULL
          AND encode(sha256(convert_to(content,'UTF8')),'hex')=$4`,
        [t.newContent,t.canonicalId,t.productMasterId,t.oldContentHash]);
      if(r.rowCount===1) u++; else skipped.push({id:t.canonicalId,why:'HASH_DRIFT_OR_GUARD'});
    }
    const mid=await g();
    if(mid.ko_canon!==before.ko_canon||mid.en_canon!==before.en_canon||mid.spd_all!==before.spd_all||mid.pm!==before.pm) throw new Error('COUNT_CHANGED');
    await c.query('COMMIT'); upd+=u;
  }catch(e){await c.query('ROLLBACK');rolled=true;console.error('SHARD_ROLLBACK',i,e.message);}
  shards.push({from:i,size:part.length,updated:u,rolledBack:rolled});
}
const after=await g(); await c.end();
const out={appliedAt:new Date().toISOString(),mode:'APPLY',shardSize:SH,shards:shards.length,
 expectedUpdate:P.plan.length,actualUpdate:upd,skipped,rolledBackShards:shards.filter(s=>s.rolledBack).length,
 before,after,countsUnchanged:JSON.stringify(before)===JSON.stringify(after)};
fs.writeFileSync(`${D}/hff-ko-damage-repair-apply-results-v1.json`,JSON.stringify(out,null,1));
console.log(JSON.stringify({...out,skipped:skipped.length},null,1));
