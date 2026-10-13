import { DataSource } from 'typeorm';
import { runCanonicalBootstrap } from '../database/bootstrap/bootstrap-runner.js';
import { classifyDatabaseState } from '../database/bootstrap/database-state.js';
import { INCREMENTAL_MIGRATIONS } from '../database/incremental/manifest.js';
import { computeSchemaFingerprint } from '../database/bootstrap/schema-fingerprint.js';
import { EXPECTED_SCHEMA_STATES } from '../database/incremental/expected-schema-states.js';
jest.setTimeout(30_000); // Full canonical bootstrap + 26 incremental migrations + classification.
const fixture = process.env.O4O_AI_QUOTA_TEST_PORT === '55447' ? describe : describe.skip;
fixture('AI quota migration through isolated canonical bootstrap and TypeORM incremental runner',()=>{
  let admin:DataSource,db:DataSource;
  const name=`o4o_aiquota_migrate_${process.pid}`;
  beforeAll(async()=>{
    const config={type:'postgres' as const,host:'127.0.0.1',port:55447,username:'o4o_quota_fixture',database:'postgres'};
    admin=new DataSource(config);await admin.initialize();await admin.query(`CREATE DATABASE ${name}`);
    db=new DataSource({...config,database:name,migrations:[...INCREMENTAL_MIGRATIONS],migrationsTableName:'typeorm_migrations'});await db.initialize();
  });
  afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){await admin.query(`DROP DATABASE ${name}`);await admin.destroy();}});
  it('converges to the registered schema and reruns without applying migrations twice',async()=>{
    const runner=db.createQueryRunner();await runner.startTransaction();
    expect((await classifyDatabaseState(runner)).state).toBe('FRESH_EMPTY');
    await runCanonicalBootstrap(runner,{info:()=>{},warn:()=>{},error:()=>{}});await runner.commitTransaction();
    const applied=await db.runMigrations({transaction:'each'});expect(applied).toHaveLength(INCREMENTAL_MIGRATIONS.length);
    expect(await db.runMigrations({transaction:'each'})).toEqual([]);
    await runner.startTransaction();
    expect((await classifyDatabaseState(runner)).state).toBe('BOOTSTRAPPED');
    const fp=await computeSchemaFingerprint(runner);await runner.commitTransaction();
    const expected=EXPECTED_SCHEMA_STATES.at(-1)!;
    expect(fp.hash).toBe(expected.fingerprint);expect(fp.lineCount).toBe(expected.fingerprintLineCount);
    await runner.release();
    const precision=await db.query("SELECT numeric_precision,numeric_scale FROM information_schema.columns WHERE table_name='ai_usage_aggregate' AND column_name='current_value'");
    expect(precision[0]).toEqual({numeric_precision:20,numeric_scale:8});
  });
});
