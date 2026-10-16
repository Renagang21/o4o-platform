import test from 'node:test';
import assert from 'node:assert/strict';
import {jobArguments,restrictedWifCondition,assertRestrictedWif,loadPurgeSource,github,gate,runJob,runnerFailureMessage,diagnosticCause} from './pharmacy-hub-administrative-purge-job.mjs';
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
    PH_ADMIN_PURGE:'true',PH_DEVELOPMENT_PURGE:'false',PH_MEDIA_PURGE:'false',CERTIFICATE_RETIREMENT:'false',DOMAIN_DETACHMENT:'false',CUTOVER_MODE:'plan',DEPLOY_FREEZE:'false',QR_PROBE_PATHS:'',
    RETIREMENT_INVENTORY:'false',RESOURCE_RETIREMENT:'false',RETIRE_PH_HOST:'false',
    DEMO_CENSUS_FLAG:'false',DEMO_RELINK_FLAG:'false',DEMO_CLEANUP_FLAG:'false',COPY_CLEANUP_FLAG:'false'};
  try {
    assert.equal(spawnSync('bash',['-c',gate],{env}).status,0);
    for(const update of [{WORKFLOW_ACTOR:'other'},{GITHUB_REF:'refs/tags/deploy/old'},{CUTOVER_MODE:'invalid'},
      {CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'},{RETIREMENT_INVENTORY:'true'},
      {RESOURCE_RETIREMENT:'true'},{RETIRE_PH_HOST:'true'},{DEMO_CENSUS_FLAG:'true'},
      {DEMO_RELINK_FLAG:'true'},{DEMO_CLEANUP_FLAG:'true'},{COPY_CLEANUP_FLAG:'true'},
      {CERTIFICATE_RETIREMENT:'true'},{DOMAIN_DETACHMENT:'true'},{PH_DEVELOPMENT_PURGE:'true'},{PH_MEDIA_PURGE:'true'},
      {QR_PROBE_PATHS:'/qr/fixture'}])assert.notEqual(spawnSync('bash',['-c',gate],{env:{...env,...update}}).status,0);
    const domainEnv={...env,PH_ADMIN_PURGE:'false',DOMAIN_DETACHMENT:'true'};
    assert.equal(spawnSync('bash',['-c',gate],{env:domainEnv}).status,0);
    for(const update of [{PH_ADMIN_PURGE:'true'},{CERTIFICATE_RETIREMENT:'true'},
      {WORKFLOW_ACTOR:'other'},{CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'},
      {RESOURCE_RETIREMENT:'true'},{RETIREMENT_INVENTORY:'true'},{DEMO_CENSUS_FLAG:'true'},
      {DEMO_ACCOUNTS_FLAG:'true'},{QR_PROBE_PATHS:'/qr/fixture'}])
      assert.notEqual(spawnSync('bash',['-c',gate],{env:{...domainEnv,...update}}).status,0);
    const devEnv={...env,PH_ADMIN_PURGE:'false',PH_DEVELOPMENT_PURGE:'true'};
    assert.equal(spawnSync('bash',['-c',gate],{env:devEnv}).status,0);
    for(const update of [{PH_ADMIN_PURGE:'true'},{DOMAIN_DETACHMENT:'true'},{WORKFLOW_ACTOR:'other'},
      {CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'},{DEMO_ACCOUNTS_FLAG:'true'},{QR_PROBE_PATHS:'/qr/test'}])
      assert.notEqual(spawnSync('bash',['-c',gate],{env:{...devEnv,...update}}).status,0);
    const mediaEnv={...env,PH_ADMIN_PURGE:'false',PH_MEDIA_PURGE:'true'};
    assert.equal(spawnSync('bash',['-c',gate],{env:mediaEnv}).status,0);
    assert.notEqual(spawnSync('bash',['-c',gate],{env:{...mediaEnv,PH_DEVELOPMENT_PURGE:'true'}}).status,0);
    const proxy=workflow.jobs.cutover.steps.find(s=>s.name?.startsWith('Start authenticated'));
    assert.ok(proxy.if.includes('inputs.ph_admin_purge != true'));
    assert.ok(proxy.if.includes('inputs.ph_development_purge != true'));
    assert.ok(proxy.if.includes('inputs.ph_media_purge != true'));
    assert.ok(proxy.if.includes('inputs.domain_detachment != true'));
  } finally {rmSync(dir,{recursive:true,force:true});}
});

// Execute the generated worker, including its catch/rollback path, without a real DB.
test('worker diagnostics preserve failing SQL fingerprint and redact database payloads',async()=>{
  const {createHash}=await import('node:crypto');
  const sql='SELECT fixture';
  const {args}=jobArguments({...input,source:`export class PharmacyHubAdministrativePurge {
    async up(runner){ await runner.query('${sql}',['private parameter']); }
  }`});
  const payload=Buffer.from(args.find(a=>a.startsWith('--args=')).match(/base64,([^']+)/)[1],'base64').toString();
  const executable=payload.replace('export class','class').replace("import {createRequire} from 'node:module';",'')
    .replace("import {createHash as diagnosticHash} from 'node:crypto';",'')
    .replace("import {writeSync as diagnosticWrite} from 'node:fs';",'');
  for(const failure of ['connect','begin','purge','finish']) {
    const calls=[],errors=[];
    class Client {
      async connect(){if(failure==='connect')throw Object.assign(new Error('private host'),{code:'08006'});}
      async query(text){
        calls.push(text);
        if((failure==='begin'&&text.startsWith('BEGIN'))||(failure==='purge'&&text===sql)||
          (failure==='finish'&&text==='ROLLBACK'&&calls.filter(x=>x==='ROLLBACK').length===1))
          throw Object.assign(new Error('private SQL detail'),{code:'42703',detail:'private row'});
        return {rows:[]};
      }
      async end(){}
    }
    const fakeProcess={env:{},exitCode:0,once(){},removeListener(){}};
    const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction('createRequire','diagnosticHash','console','process','diagnosticWrite',executable)(
      ()=>()=>({Client}),createHash,{error:x=>errors.push(x),log:()=>{}},fakeProcess,(fd,message)=>{assert.equal(fd,2);errors.push(message.trimEnd());});
    assert.equal(fakeProcess.exitCode,1);
    assert.equal(errors.length,1);
    assert.match(errors[0],new RegExp('^PH_PURGE_FAILED stage='+failure+' code='));
    assert.ok(!errors[0].includes('private'));
    if(failure==='purge')assert.ok(errors[0].endsWith('query_sha256='+createHash('sha256').update(sql).digest('hex')));
    if(failure==='connect')assert.ok(errors[0].endsWith('query_sha256=none'));
    assert.ok(calls.includes('ROLLBACK'));
  }
});

for(const [purge,exportName] of [['development','countDevelopmentReferences'],['media','countMediaReferences']])
  test(`${purge}: actual worker source embeds and executes the shared scanner without checkout files`,async()=>{
    const source=await loadPurgeSource(purge);
    assert.doesNotMatch(source,/from ['"]\.\//);
    assert.match(source,/from 'data:text\/javascript;base64,/);
    const packed=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    let calls=0;
    assert.equal(await packed[exportName]({async query(sql,args){
      calls++;assert.equal(args[1],null);assert.match(sql,/reference_source/);
      return [{count:'0',scanned:'0',last_id:null}];
    }},{schema:'public',table:'notes',column:'metadata',type:'jsonb',scan_key:'id'}),0);
    assert.equal(calls,1);
    const {args}=jobArguments({...input,purge,source});
    const executable=Buffer.from(args.find(a=>a.startsWith('--args=')).match(/base64,([^']+)/)[1],'base64').toString();
    assert.ok(executable.startsWith(source));
  });


test('generated worker logs only stage and SQL hash on SIGTERM and exits unsuccessfully',async()=>{
  const {createHash}=await import('node:crypto');
  const sql='SELECT blocked';
  const {args}=jobArguments({...input,source:`export class PharmacyHubAdministrativePurge {
    async up(q){await q.query('${sql}',['private identifier']);}
  }`});
  const payload=Buffer.from(args.find(a=>a.startsWith('--args=')).match(/base64,([^']+)/)[1],'base64').toString();
  const executable=payload.replace('export class','class').replace("import {createRequire} from 'node:module';",'')
    .replace("import {createHash as diagnosticHash} from 'node:crypto';",'')
    .replace("import {writeSync as diagnosticWrite} from 'node:fs';",'');
  let handler,removed=false,exitStatus;
  const errors=[];
  const fakeProcess={env:{},once(signal,fn){assert.equal(signal,'SIGTERM');handler=fn;},
    removeListener(signal,fn){assert.equal(signal,'SIGTERM');assert.equal(fn,handler);removed=true;},
    exit(code){exitStatus=code;throw new Error('simulated process exit');}};
  class Client {
    async connect(){}
    async query(text){if(text===sql)handler();return {rows:[]};}
    async end(){}
  }
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await new AsyncFunction('createRequire','diagnosticHash','console','process','diagnosticWrite',executable)(
    ()=>()=>({Client}),createHash,{error:x=>errors.push(x),log:()=>{}},fakeProcess,(fd,message)=>{assert.equal(fd,2);errors.push(message.trimEnd());});
  assert.equal(exitStatus,1);assert.equal(removed,true);
  assert.equal(errors[0],'PH_PURGE_INTERRUPTED stage=purge signal=SIGTERM query_sha256='+createHash('sha256').update(sql).digest('hex'));
  assert.ok(errors.every(message=>!message.includes('private')&&!message.includes(sql)));
});

const withEnv=async(update,fn)=>{
  const saved=Object.fromEntries(Object.keys(update).map(k=>[k,process.env[k]]));
  Object.assign(process.env,update);
  try {return await fn();} finally {for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;}
};
const response=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
test('GitHub reads retry only transport failures and transient statuses, within a fixed bound',async()=>{
  await withEnv({PRODUCTION_GATE_TOKEN:'fixture-token'},async()=>{
    for(const first of [()=>{throw new TypeError('fetch failed');},()=>response(503,{}),()=>response(429,{}),
      ()=>{throw Object.assign(new Error('t'),{name:'TimeoutError'});}]) {
      const pauses=[];let calls=0;
      assert.deepEqual(await github('fixture',{fetchImpl:async()=>++calls===1?first():response(200,{ok:true}),pause:async ms=>pauses.push(ms)}),{ok:true});
      assert.equal(calls,2);assert.deepEqual(pauses,[1000]);
    }
    const pauses=[];let calls=0;
    await assert.rejects(github('fixture',{fetchImpl:async()=>{calls++;throw new TypeError('private network detail');},pause:async ms=>pauses.push(ms)}),
      e=>e.message==='PH_JOB_GITHUB_UNAVAILABLE');
    assert.equal(calls,3);assert.deepEqual(pauses,[1000,2000]);
    for(const status of [401,403,404,422]) {
      let count=0;
      await assert.rejects(github('fixture',{fetchImpl:async()=>{count++;return response(status,{});},pause:async()=>assert.fail('no retry')}),
        e=>e.message==='PH_JOB_GITHUB_GATE');
      assert.equal(count,1);
    }
    await assert.rejects(github('fixture',{fetchImpl:async()=>({status:200,ok:true,json:async()=>{throw new SyntaxError('x');}}),
      pause:async()=>assert.fail('no retry')}),e=>e.message==='PH_JOB_GITHUB_RESPONSE');
  });
  await withEnv({PRODUCTION_GATE_TOKEN:''},()=>assert.rejects(github('x',{fetchImpl:async()=>assert.fail()}),e=>e.message==='PH_JOB_GITHUB_AUTH'));
});
const gateEnv={GITHUB_REF:'refs/heads/main',WORKFLOW_ACTOR:'owner',REPOSITORY_OWNER:'owner',CUTOVER_MODE:'plan',GITHUB_RUN_ID:'77',GITHUB_SHA:'a'.repeat(40)};
const ciGate={check_runs:[{name:'CI Gate',app:{id:15368},head_sha:'a'.repeat(40),conclusion:'success'}]};
function gateAnswers(overrides={}) {
  const paths=[];
  return {paths,request:async path=>{
    paths.push(path);
    if(path==='git/ref/heads/main')return overrides.main??{object:{sha:'a'.repeat(40)}};
    if(path.startsWith('commits/'))return overrides.checks??ciGate;
    return overrides.runs?.(path)??{total_count:0,workflow_runs:[]};
  }};
}
test('gate decisions from successful responses block once: moved main, missing CI and busy production are not retried',async()=>{
  await withEnv(gateEnv,async()=>{
    let answers=gateAnswers();await gate(answers.request);assert.equal(answers.paths.length,7);
    answers=gateAnswers({main:{object:{sha:'b'.repeat(40)}}});
    await assert.rejects(gate(answers.request),e=>e.message==='PH_JOB_MAIN_MOVED');assert.equal(answers.paths.length,1);
    answers=gateAnswers({checks:{check_runs:[{...ciGate.check_runs[0],conclusion:'failure'}]}});
    await assert.rejects(gate(answers.request),e=>e.message==='PH_JOB_CI_REQUIRED');assert.equal(answers.paths.length,2);
    answers=gateAnswers({runs:path=>path.includes('status=in_progress')?
      {total_count:1,workflow_runs:[{id:88,status:'in_progress',path:'.github/workflows/deploy-api.yml'}]}:undefined});
    const error=await gate(answers.request).then(()=>assert.fail('blocked'),e=>e);
    assert.deepEqual(diagnosticCause(error),{cause:'PRODUCTION_BUSY',fields:'workflow=deploy-api.yml run=88'});
    assert.equal(answers.paths.filter(p=>p.includes('status=in_progress')).length,1);
  });
});
const runEnv={...gateEnv,GITHUB_RUN_ATTEMPT:'1',DB_USERNAME:'fixture_user',DB_NAME:'fixture_db'};
const servingImage=`asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server@sha256:${'c'.repeat(64)}`;
async function runStages({gateFailure,commandFailure}={}) {
  const logs=[],calls=[];let gates=0;
  const command=args=>{
    calls.push(args.slice(0,3).join(' '));
    const failure=commandFailure?.(args);
    if(failure)throw failure;
    if(args[1]==='services')return JSON.stringify({status:{traffic:[{percent:100,revisionName:'o4o-core-api-00001-abc'}]}});
    if(args[1]==='revisions')return servingImage;
    return '';
  };
  const gateCheck=async()=>{gates++;if(gateFailure?.[0]===gates)throw gateFailure[1];};
  const original=console.log;console.log=x=>logs.push(String(x));
  try {
    const error=await withEnv(runEnv,()=>runJob({development:true},{gateCheck,command}).then(()=>undefined,e=>e));
    return {error,logs,calls,gates};
  } finally {console.log=original;}
}
const busy=()=>new Error('Production write gate blocked: workflow=delivery.yml; run=99.');
test('runner names the failing stage and keeps execute, post-execute gate and cleanup distinguishable',async()=>{
  const ok=await runStages();
  assert.equal(ok.error,undefined);assert.equal(ok.gates,4);
  assert.deepEqual(ok.logs.filter(l=>l.startsWith('PH_JOB_TIMING ')).map(l=>l.split(' ')[1]),
    ['stage=preflight_gate','stage=prepare','stage=pre_create_gate','stage=create','stage=pre_execute_gate','stage=execute','stage=post_execute_gate','stage=cleanup']);
  for(const [at,stage] of [[1,'preflight_gate'],[2,'pre_create_gate'],[3,'pre_execute_gate'],[4,'post_execute_gate']]) {
    const {error,calls}=await runStages({gateFailure:[at,busy()]});
    const message=runnerFailureMessage(error);
    assert.match(message,new RegExp(`^PH_JOB_STAGE_FAILED stage=${stage} cause=PRODUCTION_BUSY workflow=delivery\\.yml run=99 `));
    assert.equal(calls.includes('run jobs delete'),false);
    assert.equal(calls.includes('run jobs execute'),at===4);
    if(at===4)assert.match(message,/ job=ph-dev-77-1 execution=succeeded elapsed_ms=\d+$/);
    else assert.doesNotMatch(message,/execution=/);
  }
  // Unknown failures expose only the error class, never the message text.
  const unknown=await runStages({gateFailure:[4,new TypeError('private token leaked')]});
  assert.match(runnerFailureMessage(unknown.error),
    /^PH_JOB_STAGE_FAILED stage=post_execute_gate cause=UNEXPECTED error=TypeError job=ph-dev-77-1 execution=succeeded elapsed_ms=\d+$/);
  const inventory=await runStages({gateFailure:[4,new Error('Production run inventory is incomplete: status=queued; page=1; expected=1; returned=0. Next deletion not submitted.')]});
  assert.match(runnerFailureMessage(inventory.error),/ cause=PRODUCTION_INVENTORY job=ph-dev-77-1 execution=succeeded /);
  const moved=await runStages({gateFailure:[3,new Error('PH_JOB_MAIN_MOVED')]});
  assert.match(runnerFailureMessage(moved.error),/^PH_JOB_STAGE_FAILED stage=pre_execute_gate cause=MAIN_MOVED job=ph-dev-77-1 elapsed_ms=\d+$/);
  const timeout=await runStages({commandFailure:args=>args[2]==='execute'&&new Error('PH_JOB_COMMAND_UNCONFIRMED permissions=unknown reason=timeout')});
  assert.match(runnerFailureMessage(timeout.error),
    /^PH_JOB_STAGE_FAILED stage=execute cause=COMMAND_UNCONFIRMED permissions=unknown reason=timeout job=ph-dev-77-1 elapsed_ms=\d+$/);
  assert.equal(timeout.gates,3);
  const cleanup=await runStages({commandFailure:args=>args[2]==='delete'&&new Error('PH_JOB_COMMAND_UNCONFIRMED permissions=run.jobs.delete reason=denied')});
  assert.match(runnerFailureMessage(cleanup.error),
    /^PH_JOB_STAGE_FAILED stage=cleanup cause=COMMAND_UNCONFIRMED permissions=run\.jobs\.delete reason=denied job=ph-dev-77-1 execution=succeeded elapsed_ms=\d+$/);
  assert.ok(cleanup.logs.some(l=>l.includes('"executionSucceeded":true')));
  const fallback='PH_JOB_NOT_CONFIRMED; inspect execution and rerun read-only census before retry';
  assert.equal(runnerFailureMessage(new Error('free text secret')),fallback);
  assert.equal(runnerFailureMessage(new Error('PH_JOB_X value=has space')),fallback);
  assert.equal(runnerFailureMessage(undefined),fallback);
});
test('generated worker reports per-phase timing with sanitized labels and no SQL or parameters',async()=>{
  const {createHash}=await import('node:crypto');
  const {args}=jobArguments({...input,source:`export class PharmacyHubAdministrativePurge {
    async up(q){q.phase('census');await q.query('SELECT census',['private']);q.phase('reference_group:public.notes');await q.query('SELECT refs');
      q.phase('bad label; DROP');await q.query('SELECT x');}
  }`});
  const payload=Buffer.from(args.find(a=>a.startsWith('--args=')).match(/base64,([^']+)/)[1],'base64').toString();
  const executable=payload.replace('export class','class').replace("import {createRequire} from 'node:module';",'')
    .replace("import {createHash as diagnosticHash} from 'node:crypto';",'')
    .replace("import {writeSync as diagnosticWrite} from 'node:fs';",'');
  const logs=[];
  class Client {async connect(){} async query(){return {rows:[]};} async end(){}}
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await new AsyncFunction('createRequire','diagnosticHash','console','process','diagnosticWrite',executable)(
    ()=>()=>({Client}),createHash,{error:x=>assert.fail(x),log:x=>logs.push(x)},{env:{},once(){},removeListener(){}},()=>assert.fail());
  const timing=JSON.parse(logs.find(l=>l.startsWith('PH_PURGE_TIMING ')).slice('PH_PURGE_TIMING '.length));
  const labels=timing.slowest.map(([label])=>label);
  for(const label of ['stage:connect','stage:begin','census','reference_group:public.notes','unlabeled','stage:finish'])assert.ok(labels.includes(label),label);
  assert.equal(timing.queries,5);assert.equal(timing.current,'stage:finish');
  assert.ok(logs.every(l=>!l.includes('private')&&!l.includes('DROP')&&!l.includes('SELECT')));
});
