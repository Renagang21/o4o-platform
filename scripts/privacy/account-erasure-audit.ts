/** Bundled for a dedicated job using the serving API image and runtime identity.
 * DB is strictly read-only. Only our random, generation-pinned GCS probes are written.
 * Never logs identifiers, object paths, account rows, connection values or raw errors.
 */
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AccountErasureService } from '../../apps/api-server/src/services/privacy/account-erasure.service.js';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import { ACCOUNT_ERASURE_SCHEMA_READY_SQL } from '../../apps/api-server/src/services/privacy/account-erasure-schema.js';
import { ERASURE_WRITER_GAPS_SQL } from '../../apps/api-server/src/services/privacy/erasure-writer-manifest.js';
import { CLOSED_STORE_WRITER_GAPS_SQL } from '../../apps/api-server/src/services/store/store-closure-inventory.js';

let auditStage='starting';
export async function auditStorage(bucket:any) {
  const permissions=['storage.objects.list','storage.objects.get','storage.objects.create','storage.objects.delete'];
  const [granted]=await bucket.iam.testPermissions(permissions);
  if(permissions.some(name=>granted[name]!==true))throw new Error('STORAGE_PERMISSIONS_REQUIRED');
  let pageToken:string|undefined;let objects=0,taggedPersonal=0,unmarked=0;
  do {
    const [files,next]=await bucket.getFiles({maxResults:100,autoPaginate:false,pageToken});
    for(const file of files){
      objects++;
      const m=file.metadata?.metadata??{};
      if(m.o4o_asset_purpose==='personal'&&typeof m.o4o_owner_user_id==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(m.o4o_owner_user_id))taggedPersonal++;
      else unmarked++;
    }
    if(objects>50000)throw new Error('STORAGE_INVENTORY_LIMIT');
    pageToken=next?.pageToken;
  }while(pageToken);
  const file=bucket.file('account-erasure-readiness/'+randomUUID()+'.txt');
  let generation:string|undefined,metageneration:string|undefined,created=false;
  async function cleanupProbe(){
    const [m]=await file.getMetadata();
    if(m.metadata?.o4o_asset_purpose!=='readiness_probe')throw new Error('PROBE_OWNERSHIP_CHANGED');
    await bucket.file(file.name,{preconditionOpts:{ifGenerationMatch:generation??m.generation,ifMetagenerationMatch:metageneration??m.metageneration}}).delete();
    const [exists]=await file.exists();if(exists)throw new Error('PROBE_CLEANUP_FAILED');
  }
  try{
    await file.save('O4O erasure readiness probe; no personal data',{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{metadata:{o4o_asset_purpose:'readiness_probe'}}});created=true;
    const [metadata]=await file.getMetadata();generation=metadata.generation;metageneration=metadata.metageneration;
    if(!generation||!metageneration)throw new Error('PROBE_GENERATION_MISSING');
    await bucket.file(file.name,{preconditionOpts:{ifGenerationMatch:generation,ifMetagenerationMatch:metageneration}}).delete();created=false;
    const [exists]=await file.exists();if(exists)throw new Error('PROBE_REMAINS');
    return {objects,taggedPersonal,unmarked,permissionsVerified:true,probeRemaining:0};
  } finally { if(created)await cleanupProbe(); }

}
export async function runAudit() {
  if(process.env.O4O_ERASURE_AUDIT!=='readiness')throw new Error('AUDIT_MODE_REQUIRED');
  const db=new Client({connectionTimeoutMillis:15000,host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  auditStage='database-connect';await db.connect();
  try{
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await db.query("SET LOCAL statement_timeout='30s'");
    if((await db.query("SELECT current_setting('transaction_read_only') AS value")).rows[0].value!=='on')throw new Error('READ_ONLY_REQUIRED');
    auditStage='schema-and-data-inventory';
    const schema=(await db.query(ACCOUNT_ERASURE_SCHEMA_READY_SQL)).rows[0]?.ready===true;
    const writerGaps=(await db.query(ERASURE_WRITER_GAPS_SQL)).rowCount;
    const closureGaps=(await db.query(CLOSED_STORE_WRITER_GAPS_SQL)).rowCount;
    const accounts=Number((await db.query('SELECT count(*) AS n FROM users')).rows[0].n);
    const roots=Number((await db.query(`SELECT count(*) AS n FROM role_assignments r JOIN users u ON u.id=r.user_id WHERE r.role='platform:super_admin' AND r.is_active AND u."isActive" AND r.valid_from<=statement_timestamp() AND (r.valid_until IS NULL OR r.valid_until>=statement_timestamp())`)).rows[0].n);
    const documents=(await db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text))::int AS business_referenced FROM kyc_documents d`)).rows[0];
    await db.query('ROLLBACK');
    const storage=new Storage(),buckets=[...new Set([process.env.GCS_MEDIA_LIBRARY_BUCKET||'o4o-media-library',process.env.GCS_PRIVATE_DOCUMENT_BUCKET||'o4o-private-documents'])];
    auditStage='storage-inventory-and-probe';
    const files=[];for(const [index,bucket] of buckets.entries()){auditStage='storage-'+index;files.push(await auditStorage(storage.bucket(bucket)));}
    const mode=process.env.ACCOUNT_ERASURE_MODE==='apply';
    const inventory=process.env.ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW==='confirmed';
    const years=Number(process.env.ACCOUNT_ERASURE_SYSTEM_YEARS);
    const policy=!!process.env.ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS?.match(/^[a-zA-Z0-9:_-]{1,100}$/);
    const result={schema,writerGaps,closureGaps,accounts,activeAdminCount:roots,documents,files,configured:{mode,inventory,years:[1,2].includes(years)?years:null,policyBasisValid:policy},enabled:schema&&mode&&inventory&&[1,2].includes(years)&&policy,readOnlyDatabase:true};
    console.log('O4O_ERASURE_AUDIT '+JSON.stringify(result));
    if(!schema||writerGaps||closureGaps||!roots)throw new Error('AUDIT_REVIEW_REQUIRED');
    if(process.env.O4O_ERASURE_EXPECT_ENABLED==='true'&&!result.enabled)throw new Error('ACTIVATION_NOT_READY');
  }finally{await db.end();}
}
export async function runMaintenance(){
  const db=new DataSource({type:'postgres',host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),username:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,entities:[],synchronize:false,logging:false});
  await db.initialize();
  try{
    const years=Number(process.env.ACCOUNT_ERASURE_SYSTEM_YEARS);
    const core=new AccountErasureService(db,{enabled:process.env.ACCOUNT_ERASURE_MODE==='apply',inventoryReviewed:process.env.ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW==='confirmed',systemYears:years===1||years===2?years:undefined,systemBasis:process.env.ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS,personalBuckets:[]});
    // Existing expiry/hold implementation only: never request/resume account erasure here.
    const report=await core.retentionReport(new Date(),true);
    console.log('O4O_ERASURE_AUDIT '+JSON.stringify({maintenance:true,...report}));
  }finally{await db.destroy();}
}
const operation=process.env.O4O_ERASURE_AUDIT;
if(operation==='readiness'||operation==='maintenance'){
  const task=operation==='maintenance'?runMaintenance:runAudit;
  task().catch(error=>{const code=String(error?.code??'');console.error('O4O_ERASURE_AUDIT_FAILED '+JSON.stringify({stage:auditStage,providerCode:/^(400|401|403|404|409|412|429|500|503|28P01|42501|42P01|57014)$/.test(code)?code:null,reason:/^[A-Z_]{1,80}$/.test(error?.message??'')?error.message:null}));process.exitCode=1;});
}
