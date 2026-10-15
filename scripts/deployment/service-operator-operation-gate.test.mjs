import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workflow = createRequire(import.meta.url)('yaml').parse(readFileSync(new URL('../../.github/workflows/pharmacyhub-qr-cutover.yml', import.meta.url), 'utf8'));
const flags = ['PH_MEDIA_PURGE','PH_DEVELOPMENT_PURGE','PH_ADMIN_PURGE','CERTIFICATE_RETIREMENT','DOMAIN_DETACHMENT','RETIREMENT_INVENTORY','RESOURCE_RETIREMENT','RETIRE_PH_HOST','DEMO_CENSUS_FLAG','DEMO_RELINK_FLAG','DEMO_CLEANUP_FLAG','COPY_CLEANUP_FLAG','DEMO_ACCOUNTS_FLAG'];

test('actual workflow gate allows only owner/main/standalone read-only operator census, including during a deployment freeze', () => {
  const dir = mkdtempSync(join(tmpdir(), 'operator-census-gate-'));
  const env = { PATH: process.env.PATH, GITHUB_ENV: join(dir,'env'), RUNNER_TEMP: dir,
    GITHUB_REF:'refs/heads/main', WORKFLOW_ACTOR:'owner', REPOSITORY_OWNER:'owner',
    CUTOVER_MODE:'operator-census', DEPLOY_FREEZE:'true', QR_PROBE_PATHS:'a'.repeat(64), OPERATOR_CENSUS_FLAG:'true',
    OPERATOR_IDENTITY_SHA256:'a'.repeat(64), ...Object.fromEntries(flags.map(flag => [flag,'false'])) };
  const run = change => spawnSync('bash', ['-c', workflow.jobs.cutover.steps[0].run], { env: {...env,...change} }).status;
  try {
    assert.equal(run({}),0);
    for (const change of [{WORKFLOW_ACTOR:'other'},{GITHUB_REF:'refs/heads/deploy/test'},
      {CUTOVER_MODE:'apply'},{CUTOVER_MODE:'plan'},{CUTOVER_MODE:'unexpected'},{QR_PROBE_PATHS:'/qr/synthetic'},
      {OPERATOR_IDENTITY_SHA256:''},{OPERATOR_IDENTITY_SHA256:'not-a-fingerprint'},
      {OPERATOR_CENSUS_FLAG:'false'}, ...flags.map(flag => ({[flag]:'true'}))]) {
      assert.notEqual(run(change),0);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('operator census activates the proxy and census steps while suppressing every unrelated production operation', () => {
  const inputs = Object.fromEntries(Object.entries(workflow.on.workflow_dispatch.inputs).map(([key,value]) => [key,value.default ?? (value.type === 'boolean' ? false : '')]));
  Object.assign(inputs,{probe_paths:'a'.repeat(64),mode:'operator-census'});
  const enabled = step => !step.if || Function('inputs','always',`return (${step.if})`)(inputs,()=>true);
  const selected = workflow.jobs.cutover.steps.filter(enabled).map(step => step.name).filter(Boolean);
  assert.ok(selected.includes('Start authenticated Cloud SQL proxy for read-only inventory'));
  assert.ok(selected.includes('Read-only service operator assignment census'));
  for (const name of ['Collect existing active public paths without database writes','Inventory, validate, optionally apply and verify',
    'Save backup and verification evidence', ...workflow.jobs.cutover.steps.filter(step => /Plan or apply/.test(step.name ?? '')).map(step => step.name)]) {
    assert.ok(!selected.includes(name),name);
  }
  assert.ok(Object.keys(workflow.on.workflow_dispatch.inputs).length <= 25);
  assert.equal(selected.filter(name => /census/i.test(name)).length,2); // existing mapper build + read-only query
});
