const {readFileSync}=require('node:fs');const path=require('node:path');
const pw=readFileSync('.env','utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
(async()=>{const {DataSource}=await import('typeorm');
const ds=new DataSource({type:'postgres',host:'127.0.0.1',port:5471,username:'o4o_api',password:pw,database:'o4o_platform',entities:[],synchronize:false,logging:['error']});
await ds.initialize();
const c=await ds.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='product_masters' ORDER BY ordinal_position`);
console.log(c.map(x=>x.column_name+':'+x.data_type).join('\n'));
await ds.destroy();})().catch(e=>{console.error(e.message);process.exit(1)});
