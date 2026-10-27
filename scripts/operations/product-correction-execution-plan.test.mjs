import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { executionPlan } from './product-correction-execution-plan.mjs';
const fixture = () => ({ project: 'example-project', region: 'asia-northeast3', job: 'product-inspection',
 image: `asia-northeast3-docker.pkg.dev/example-project/example/api@sha256:${'a'.repeat(64)}`,
 workerAccount: 'example-worker@example-project.iam.gserviceaccount.com', invokerAccount: 'example-invoker@example-project.iam.gserviceaccount.com',
 cloudSqlInstance: 'example-project:asia-northeast3:example-db', database: 'example_db', username: 'example_user', passwordSecret: { name: 'example-secret', version: '1' },
 intervalMinutes: 5, maxSeconds: 240, maxTicks: 100, timeoutSeconds: 600 });
test('produces a non-applied plan for isolated execution and authenticated scheduling', () => {
 const plan = executionPlan(fixture());
 assert.equal(plan.applied, false); assert.equal(plan.mode, 'PLAN_ONLY');
 const task = plan.job.template.template;
 assert.equal(task.maxRetries, 0); assert.equal(plan.job.template.parallelism, 1);
 assert.deepEqual(task.containers[0].args, ['dist/product-correction-worker.js','--run','--max-ticks','100','--max-seconds','240']);
 assert.equal(task.containers[0].env.find(v => v.name === 'DB_PASSWORD').value, undefined);
 assert.equal(plan.scheduler.httpTarget.oauthToken.serviceAccountEmail, fixture().invokerAccount);
 assert.equal(plan.requiredAccess[0].resource, plan.job.name);
 assert.equal(plan.scheduler.schedule, '*/5 * * * *');
 assert.equal(plan.scheduler.httpTarget.body, 'e30=');
});
for (const patch of [ {image:'api:latest'}, {image:'evil.invalid/api@sha256:'+'a'.repeat(64)}, {workerAccount:fixture().invokerAccount},
 {password:'secret'}, {passwordSecret:{name:'example',version:'latest'}}, {passwordSecret:{name:'example',version:'1',value:'secret'}},
 {maxSeconds:601}, {maxTicks:1001}, {timeoutSeconds:250}, {intervalMinutes:1}, {cloudSqlInstance:'other-project:asia-northeast3:db'}, {job:'bad;command'}, {database:'db\nother'} ]) {
 test(`rejects unsafe plan: ${Object.keys(patch).join(',')}`, () => assert.throws(() => executionPlan({...fixture(),...patch}), /INVALID_PLAN/));
}
test('hourly cron and help do not require cloud credentials', () => {
 assert.equal(executionPlan({...fixture(),intervalMinutes:60}).scheduler.schedule,'0 * * * *');
 const result = spawnSync(process.execPath,['scripts/operations/product-correction-execution-plan.mjs','--help'],{encoding:'utf8',env:{PATH:process.env.PATH}});
 assert.equal(result.status,0); assert.match(result.stdout,/PLAN_ONLY/);
});
test('unknown execution flags fail closed without echoing user input', () => {
 const result=spawnSync(process.execPath,['scripts/operations/product-correction-execution-plan.mjs','--apply','sensitive-input'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.doesNotMatch(result.stderr,/sensitive-input/);
});
test('stdin creates a plan without opening a caller-selected file', () => {
 const result=spawnSync(process.execPath,['scripts/operations/product-correction-execution-plan.mjs','--stdin'],{encoding:'utf8',input:JSON.stringify(fixture())});
 assert.equal(result.status,0); assert.equal(JSON.parse(result.stdout).mode,'PLAN_ONLY');
});
test('oversized or malformed input is rejected without echoing content', () => {
 for (const input of ['sensitive-input', 'x'.repeat(65537)]) {
  const result=spawnSync(process.execPath,['scripts/operations/product-correction-execution-plan.mjs','--stdin'],{encoding:'utf8',input});
  assert.equal(result.status,1);assert.doesNotMatch(result.stderr,/sensitive-input|xxxxx/);
 }
});
