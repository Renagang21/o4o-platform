import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';
const creds=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--creds')+1],'utf8'));
const stmts=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--stmts')+1],'utf8'));
async function main(){const ds=new DataSource({type:'postgres',host:'127.0.0.1',port:parseInt(process.env.PROXY_PORT??'5457',10),username:creds.DB_USERNAME,password:creds.DB_PASSWORD,database:creds.DB_NAME,entities:[],synchronize:false,logging:['error'],ssl:false,extra:{max:2,statement_timeout:120000}});await ds.initialize();try{
const rows=await ds.query(`SELECT t AS tag, count(*)::int c FROM product_masters m, jsonb_array_elements_text(m.tags::jsonb) t WHERE m.mfds_permit_number=ANY($1) AND t LIKE 'batch:%' GROUP BY t ORDER BY c DESC`,[stmts]);
console.log(JSON.stringify(rows));
const when=await ds.query(`SELECT min(created_at) mn, max(created_at) mx FROM product_masters WHERE mfds_permit_number=ANY($1)`,[stmts]);
console.log('created range:',JSON.stringify(when[0]));
}finally{await ds.destroy();}}
main().catch(e=>{console.error('FAIL:',e instanceof Error?e.message:e);process.exit(1);});
