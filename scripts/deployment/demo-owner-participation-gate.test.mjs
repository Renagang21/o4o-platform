import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const workflow=require('yaml').parse(readFileSync(new URL('../../.github/workflows/pharmacyhub-qr-cutover.yml',import.meta.url),'utf8'));
const gate=workflow.jobs.cutover.steps[0].run;

test('existing production gate accepts only standalone owner participation, preserving original freeze/ref restrictions',()=>{
  const dir=mkdtempSync(join(tmpdir(),'owner-participation-gate-'));
  const env={PATH:process.env.PATH,GITHUB_ENV:join(dir,'env'),RUNNER_TEMP:dir,
    GITHUB_REF:'refs/heads/main',WORKFLOW_ACTOR:'owner',REPOSITORY_OWNER:'owner',
    DEPLOY_FREEZE:'false',CUTOVER_MODE:'plan',DEMO_ACCOUNTS_FLAG:'true',DEMO_PARTICIPATION_FLAG:'true',DEMO_PARTICIPATION_DIGEST:'a'.repeat(64),QR_PROBE_PATHS:'',
    PH_ADMIN_PURGE:'false',PH_DEVELOPMENT_PURGE:'false',PH_MEDIA_PURGE:'false',CERTIFICATE_RETIREMENT:'false',
    DOMAIN_DETACHMENT:'false',RETIREMENT_INVENTORY:'false',RESOURCE_RETIREMENT:'false',RETIRE_PH_HOST:'false',
    DEMO_CENSUS_FLAG:'false',DEMO_RELINK_FLAG:'false',DEMO_CLEANUP_FLAG:'false',COPY_CLEANUP_FLAG:'false'};
  const run=update=>spawnSync('bash',['-c',gate],{env:{...env,...update}}).status;
  try {
    assert.equal(run({}),0);
    assert.equal(run({CUTOVER_MODE:'apply'}),0);
    assert.equal(run({DEPLOY_FREEZE:'true'}),0); // read-only inventory stays available
    for(const update of [{WORKFLOW_ACTOR:'other'},{GITHUB_REF:'refs/heads/unsafe'},{CUTOVER_MODE:'delete'},
      {DEMO_ACCOUNTS_FLAG:'false'},{CUTOVER_MODE:'apply',DEMO_PARTICIPATION_DIGEST:''},{CUTOVER_MODE:'apply',DEMO_PARTICIPATION_DIGEST:'invalid'},{QR_PROBE_PATHS:'/qr'},{CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'},
      {DEMO_RELINK_FLAG:'true'},{PH_ADMIN_PURGE:'true'},{RETIREMENT_INVENTORY:'true'},
      {RESOURCE_RETIREMENT:'true'},{RETIRE_PH_HOST:'true'}]) assert.notEqual(run(update),0);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('dispatch remains within input limit and selects the fixed operation without changing IAM identity',()=>{
  const inputs=workflow.on.workflow_dispatch.inputs;
  assert.ok(Object.keys(inputs).length<=25);
  assert.ok(inputs.mode.options.includes('demo-participation-plan'));
  assert.ok(inputs.mode.options.includes('demo-participation-apply'));
  const step=workflow.jobs.cutover.steps.find(step=>step.name==='Plan or apply canonical Demo account reconciliation');
  assert.equal(step.env.DEMO_ACCOUNTS_PARTICIPATION,'${{ env.DEMO_PARTICIPATION_FLAG }}');
  assert.equal(step.env.DEMO_ACCOUNTS_MODE,'${{ env.CUTOVER_MODE }}');
  const auth=workflow.jobs.cutover.steps.find(step=>step.uses?.startsWith('google-github-actions/auth@'));
  assert.equal(auth.with.service_account,'github-actions@netureyoutube.iam.gserviceaccount.com');
  assert.match(auth.uses,/@[a-f0-9]{40}$/);
  const ci=workflow.jobs.cutover.steps.find(step=>step.name==='Require successful main CI for participation writes');
  assert.match(ci.if,/env.CUTOVER_MODE == 'apply'/);
  assert.match(ci.run,/CI Gate/);
});
