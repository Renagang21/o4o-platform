import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
const arg=(n:string)=>{const i=process.argv.indexOf(`--${n}`);return i>=0?process.argv[i+1]:'';};
const creds=JSON.parse(fs.readFileSync(arg('creds'),'utf8'));
const aIds:string[]=JSON.parse(fs.readFileSync(arg('aids'),'utf8'));
const cIds:string[]=JSON.parse(fs.readFileSync(arg('cids'),'utf8'));
async function main(){const ds=new DataSource({type:'postgres',host:'127.0.0.1',port:parseInt(process.env.PROXY_PORT??'5455',10),username:creds.DB_USERNAME,password:creds.DB_PASSWORD,database:creds.DB_NAME,entities:[],synchronize:false,logging:['error'],ssl:false,extra:{max:2,statement_timeout:180000}});await ds.initialize();try{
const cardExpr=`(length(s.content)-length(replace(s.content,'</b><ul class="sd-why">','')))/length('</b><ul class="sd-why">')`;
const aCards=(await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions s WHERE s.master_id=ANY($1) AND s.language='ko' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND ${cardExpr}>=2`,[aIds]))[0].c;
const cCards=(await ds.query(`SELECT count(*)::int c FROM shared_product_descriptions s WHERE s.master_id=ANY($1) AND s.language='ko' AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND ${cardExpr}>=2`,[cIds]))[0].c;
// 전역 canonicalDup (전체 HFF STORE canonical)
const globalDup=(await ds.query(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND status='canonical' AND description_type='STORE' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`))[0].c;
console.log(JSON.stringify({agentA_in_cards_ge2:aCards,agentC_in_cards_ge2:cCards,globalHffStoreCanonicalDup:globalDup},null,1));
}finally{await ds.destroy();}}
main().catch(e=>{console.error('FAIL:',e instanceof Error?e.message:e);process.exit(1);});
