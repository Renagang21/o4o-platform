import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const workflow=require('yaml').parse(readFileSync(new URL('../../.github/workflows/demo-owner-participation.yml',import.meta.url),'utf8'));
const gate=workflow.jobs.participation.steps[0].run;
const env={PATH:process.env.PATH,GITHUB_REF:'refs/heads/main',WORKFLOW_ACTOR:'owner',REPOSITORY_OWNER:'owner',
  DEPLOY_FREEZE:'false',DEMO_ACCOUNTS_MODE:'plan',DEMO_ACCOUNTS_DIGEST:''};
const run=update=>spawnSync('bash',['-c',gate],{env:{...env,...update}}).status;
test('actual workflow gate accepts read-only plan and exact-digest unfrozen owner apply',()=>{
  assert.equal(run({}),0);
  assert.equal(run({DEMO_ACCOUNTS_MODE:'apply',DEMO_ACCOUNTS_DIGEST:'a'.repeat(64)}),0);
  assert.equal(run({DEPLOY_FREEZE:'true'}),0);
});
test('actual gate rejects foreign actor/ref, missing/stale-format digest, freeze and unknown modes',()=>{
  for(const update of [{WORKFLOW_ACTOR:'other'},{GITHUB_REF:'refs/heads/unsafe'},{DEMO_ACCOUNTS_MODE:'delete'},
    {DEMO_ACCOUNTS_MODE:'apply'},{DEMO_ACCOUNTS_MODE:'apply',DEMO_ACCOUNTS_DIGEST:'unsafe'},
    {DEMO_ACCOUNTS_MODE:'apply',DEMO_ACCOUNTS_DIGEST:'a'.repeat(64),DEPLOY_FREEZE:'true'}]) assert.notEqual(run(update),0);
});

test('the dedicated workflow selects only owner participation, preserving the existing all-account default',()=>{
  const step=workflow.jobs.participation.steps.find(step=>step.name==='Plan or apply approved Store Owner participation');
  assert.equal(step.env.DEMO_ACCOUNTS_PARTICIPATION,'true');
  assert.match(step.run,/demo-account-reconcile\.ts$/);
});
