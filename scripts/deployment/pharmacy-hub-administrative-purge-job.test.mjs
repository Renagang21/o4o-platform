import test from 'node:test';
import assert from 'node:assert/strict';
import {jobArguments,restrictedWifCondition,assertRestrictedWif} from './pharmacy-hub-administrative-purge-job.mjs';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const input={image:`asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server@sha256:${'a'.repeat(64)}`,
  source:'export class PharmacyHubAdministrativePurge {}',mode:'plan',runId:'12345',attempt:'1',username:'fixture_user',database:'fixture_db'};
test('apply requires exact temporary WIF policy, excluding other workflows, stale SHA and OR bypass',()=>{
  const sha='a'.repeat(40),condition=restrictedWifCondition(sha);
  assert.doesNotThrow(()=>assertRestrictedWif(condition,sha));
  for(const bad of [condition+' || true',condition.replace('workflow_dispatch','workflow_run'),
    condition.replaceAll(sha,'b'.repeat(40)),condition.replaceAll('pharmacyhub-qr-cutover','deploy-api')])
    assert.throws(()=>assertRestrictedWif(bad,sha),/RESTRICTION_REQUIRED/);
});
test('a Cloud Run job uses immutable serving image, singleton/no-retry execution and fixed runtime identity',()=>{
  const {name,args}=jobArguments(input);
  assert.equal(name,'ph-admin-12345-1');
  assert.ok(args.includes('--tasks=1'));assert.ok(args.includes('--max-retries=0'));
  assert.ok(args.includes('--service-account=o4o-runtime@netureyoutube.iam.gserviceaccount.com'));
  assert.ok(args.includes('--set-secrets=DB_PASSWORD=o4o-db-password:latest'));
  const boot=args.find(a=>a.startsWith('--args='));
  const source=Buffer.from(boot.match(/base64,([^']+)/)[1],'base64').toString();
  assert.ok(source.includes('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'));
  assert.ok(source.includes('ROLLBACK'));
  assert.ok(source.includes("createRequire('/app/package.json')"));
  assert.ok(!source.includes(input.username));
});
test('apply runs serializable transaction and commits only after guarded deletion',()=>{
  const {args}=jobArguments({...input,mode:'apply'});
  const source=Buffer.from(args.find(a=>a.startsWith('--args=')).match(/base64,([^']+)/)[1],'base64').toString();
  assert.ok(source.includes('BEGIN ISOLATION LEVEL SERIALIZABLE'));
  assert.ok(source.indexOf('.up(')<source.indexOf('COMMIT'));
});
test('mutable images, arbitrary run identities, mode and SDK delimiter injection are rejected',()=>{
  for(const update of [{image:input.image.split('@')[0]+':latest'},{runId:'other'},{mode:'delete'},{username:'fixture::OTHER=x'},{database:'fixture\nOTHER=x'}])
    assert.throws(()=>jobArguments({...input,...update}),/PH_JOB_/);
});
test('the actual workflow rejects mixed flags, wrong owner/ref, invalid mode and frozen apply before authentication',()=>{
  const require=createRequire(import.meta.url);
  const workflow=require('yaml').parse(readFileSync(new URL('../../.github/workflows/pharmacyhub-qr-cutover.yml',import.meta.url),'utf8'));
  const gate=workflow.jobs.cutover.steps[0].run;
  const dir=mkdtempSync(join(tmpdir(),'ph-admin-gate-'));
  const env={PATH:process.env.PATH,GITHUB_ENV:join(dir,'env'),RUNNER_TEMP:dir,
    GITHUB_REF:'refs/heads/main',WORKFLOW_ACTOR:'owner',REPOSITORY_OWNER:'owner',
    PH_ADMIN_PURGE:'true',CUTOVER_MODE:'plan',DEPLOY_FREEZE:'false',QR_PROBE_PATHS:'',
    RETIREMENT_INVENTORY:'false',RESOURCE_RETIREMENT:'false',RETIRE_PH_HOST:'false',
    DEMO_CENSUS_FLAG:'false',DEMO_RELINK_FLAG:'false',DEMO_CLEANUP_FLAG:'false',COPY_CLEANUP_FLAG:'false'};
  try {
    assert.equal(spawnSync('bash',['-c',gate],{env}).status,0);
    for(const update of [{WORKFLOW_ACTOR:'other'},{GITHUB_REF:'refs/tags/deploy/old'},{CUTOVER_MODE:'invalid'},
      {CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'},{RETIREMENT_INVENTORY:'true'},
      {RESOURCE_RETIREMENT:'true'},{RETIRE_PH_HOST:'true'},{DEMO_CENSUS_FLAG:'true'},
      {DEMO_RELINK_FLAG:'true'},{DEMO_CLEANUP_FLAG:'true'},{COPY_CLEANUP_FLAG:'true'},
      {QR_PROBE_PATHS:'/qr/fixture'}])assert.notEqual(spawnSync('bash',['-c',gate],{env:{...env,...update}}).status,0);
    const proxy=workflow.jobs.cutover.steps.find(s=>s.name?.startsWith('Start authenticated'));
    assert.ok(proxy.if.startsWith('inputs.ph_admin_purge != true'));
  } finally {rmSync(dir,{recursive:true,force:true});}
});
