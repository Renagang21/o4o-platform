/** Disposable local PostgreSQL harness. No .env, production connections, provider or account credentials. */
import { DataSource } from 'typeorm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runCanonicalBootstrap } from '../../apps/api-server/src/database/bootstrap/bootstrap-runner.js';
import { computeSchemaFingerprint } from '../../apps/api-server/src/database/bootstrap/schema-fingerprint.js';
import { INCREMENTAL_MIGRATIONS } from '../../apps/api-server/src/database/incremental/manifest.js';
import { EXPECTED_SCHEMA_STATES } from '../../apps/api-server/src/database/incremental/expected-schema-states.js';

const marker = 'o4o-auth-privacy-disposable-fixture-v1';
const mode = process.argv[2];
if (!['--prepare','--verify'].includes(mode) || process.argv.length!==3) throw new Error('Use --prepare on an empty dedicated database, then --verify');
const db = new DataSource({type:'postgres',host:'127.0.0.1',port:55469,username:'agent',database:'o4o_erasure_fixture',entities:[],synchronize:false,migrations:INCREMENTAL_MIGRATIONS,migrationsTableName:'typeorm_migrations'});
const quote = value => '"'+value.replaceAll('"','""')+'"';
async function fingerprint() {
 const q=db.createQueryRunner();await q.startTransaction();
 try{const fp=await computeSchemaFingerprint(q);await q.rollbackTransaction();return fp;}
 finally{await q.release();}
}
const expected=EXPECTED_SCHEMA_STATES.at(-1);
const assertCanonical=async()=>{
 const fp=await fingerprint();
 if(fp.hash!==expected.fingerprint || fp.lineCount!==expected.fingerprintLineCount)throw new Error('DISPOSABLE_SCHEMA_MISMATCH');
};
await db.initialize();
try{
 if(mode==='--prepare'){
  const [state]=await db.query(`SELECT count(*)::int AS tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'`);
  if(state.tables!==0)throw new Error('REFUSING_NONEMPTY_DATABASE');
  const q=db.createQueryRunner();await q.startTransaction();
  try{await runCanonicalBootstrap(q,{info:()=>{},error:()=>{}});await q.commitTransaction();}
  catch(error){await q.rollbackTransaction();throw error;}
  finally{await q.release();}
  await db.runMigrations({transaction:'each'});await assertCanonical();
  await db.query(`COMMENT ON DATABASE o4o_erasure_fixture IS '${marker}'`);
  process.stdout.write('Disposable canonical fixture prepared; no application data was imported.\n');
 }else{
  const [state]=await db.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  if(state.marker!==marker)throw new Error('DISPOSABLE_OWNERSHIP_MARKER_REQUIRED');
  await assertCanonical();
  const [rows]=await db.query('SELECT EXISTS(SELECT 1 FROM users) AS occupied');
  if(rows.occupied)throw new Error('REFUSING_POPULATED_FIXTURE');
  const gaps=await db.query(`SELECT n.nspname AS schema,c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics') AND c.relname NOT IN ('o4o_schema_baselines','typeorm_migrations')
   AND c.relname NOT LIKE 'account_erasure_%' AND NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND t.tgname='account_erasure_write_fence' AND t.tgenabled='O')`);
  const added=[];
  try{
   // Full Core regression assumes unchanged domains are fenced. These temporary fixture-only
   // triggers do not repair AI/other-domain source or establish operational readiness.
   for(const table of gaps){await db.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${quote(table.schema)}.${quote(table.name)} FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);added.push(table);}
   const root=fileURLToPath(new URL('../../',import.meta.url));
   const code=await new Promise((accept,reject)=>{
    const child=spawn(process.execPath,['node_modules/jest/bin/jest.js','--config','apps/api-server/jest.config.cjs','--runInBand','--testTimeout=15000','--runTestsByPath',
     'apps/api-server/src/middleware/__tests__/auth-rate-limit-postgres.test.ts',
     'apps/api-server/src/services/privacy/__tests__/erasure-readiness-postgres.test.ts',
     'apps/api-server/src/services/privacy/__tests__/account-erasure.integration.test.ts'],
     {cwd:root,env:{...process.env,O4O_ERASURE_TEST_PORT:'55469'},stdio:'inherit'});
    child.once('error',reject);child.once('exit',(status,signal)=>accept(signal ? 1 : status??1));
   });
   process.exitCode=code;
  }finally{
   for(const table of added)await db.query(`DROP TRIGGER account_erasure_write_fence ON ${quote(table.schema)}.${quote(table.name)}`);
   await assertCanonical();
  }
 }
}finally{await db.destroy();}
