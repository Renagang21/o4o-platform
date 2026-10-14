import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('the actual production gate accepts standalone owner Demo and rejects concurrent operations, foreign actor/ref and frozen writes',()=>{
  const require=createRequire(import.meta.url);
  const workflow=require('yaml').parse(readFileSync(new URL('../../.github/workflows/pharmacyhub-qr-cutover.yml',import.meta.url),'utf8'));
  const dir=mkdtempSync(join(tmpdir(),'demo-account-gate-'));
  const env={PATH:process.env.PATH,GITHUB_ENV:join(dir,'env'),RUNNER_TEMP:dir,
    GITHUB_REF:'refs/heads/main',WORKFLOW_ACTOR:'owner',REPOSITORY_OWNER:'owner',
    PH_ADMIN_PURGE:'false',CUTOVER_MODE:'plan',DEPLOY_FREEZE:'false',QR_PROBE_PATHS:'',
    RETIREMENT_INVENTORY:'false',RESOURCE_RETIREMENT:'false',RETIRE_PH_HOST:'false',
    DEMO_CENSUS_FLAG:'false',DEMO_RELINK_FLAG:'false',DEMO_CLEANUP_FLAG:'false',COPY_CLEANUP_FLAG:'false',DEMO_ACCOUNTS_FLAG:'true'};
  const run=update=>spawnSync('bash',['-c',workflow.jobs.cutover.steps[0].run],{env:{...env,...update}}).status;
  try {
    assert.equal(run({}),0);
    assert.equal(run({CUTOVER_MODE:'apply'}),0);
    for(const update of [{PH_ADMIN_PURGE:'true'},{WORKFLOW_ACTOR:'other'},{GITHUB_REF:'refs/tags/deploy/other'},
      {CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'},{RETIREMENT_INVENTORY:'true'},{RESOURCE_RETIREMENT:'true'},
      {RETIRE_PH_HOST:'true'},{DEMO_CENSUS_FLAG:'true'},{DEMO_RELINK_FLAG:'true'},
      {DEMO_CLEANUP_FLAG:'true'},{COPY_CLEANUP_FLAG:'true'}])assert.notEqual(run(update),0);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
