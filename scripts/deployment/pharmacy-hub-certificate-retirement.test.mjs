import test from 'node:test';
import assert from 'node:assert/strict';
import {certificatePlan,retireCertificates} from './pharmacy-hub-certificate-retirement.mjs';
import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const prefix='projects/117791934476/locations/global/';
function fixture() {
  return {certificates:[{name:prefix+'certificates/cm-cert-pharmacyhub',managed:{domains:['pharmacyhub.co.kr','www.pharmacyhub.co.kr'],dnsAuthorizations:[prefix+'dnsAuthorizations/dns-auth-pharmacyhub-root',prefix+'dnsAuthorizations/dns-auth-pharmacyhub-www']}}],
    maps:[{name:prefix+'certificateMaps/o4o-main-cert-map'}],proxies:[{name:'shared-proxy'}],
    entries:['root','www'].map((suffix,i)=>({name:prefix+'certificateMaps/o4o-main-cert-map/certificateMapEntries/cm-entry-pharmacyhub-'+suffix,hostname:i?'www.pharmacyhub.co.kr':'pharmacyhub.co.kr',certificates:[prefix+'certificates/cm-cert-pharmacyhub']})),
    authorizations:['root','www'].map((suffix,i)=>({name:prefix+'dnsAuthorizations/dns-auth-pharmacyhub-'+suffix,domain:i?'www.pharmacyhub.co.kr':'pharmacyhub.co.kr'}))};
}
test('fixed PH resources are planned in dependency order, without write',async()=>{
  const result=await retireCertificates({mode:'plan',read:async()=>fixture(),beforeWrite:()=>{throw new Error('unexpected gate');},remove:()=>{throw new Error('unexpected write');}});
  assert.deepEqual(result.targets.map(t=>t.kind),['entry','entry','certificate','authorization','authorization']);
  assert.equal(result.applied,false);
});
test('shared SAN, foreign map entry and shared DNS authorization block deletion',()=>{
  const san=fixture();san.certificates[0].managed.domains.push('neture.co.kr');assert.throws(()=>certificatePlan(san),/SHARED_DOMAINS/);
  const entry=fixture();entry.entries.push({...entry.entries[0],name:prefix+'certificateMaps/foreign/certificateMapEntries/foreign'});assert.throws(()=>certificatePlan(entry),/FOREIGN_ENTRY/);
  const auth=fixture();auth.certificates.push({name:prefix+'certificates/foreign',managed:{dnsAuthorizations:auth.certificates[0].managed.dnsAuthorizations}});assert.throws(()=>certificatePlan(auth),/SHARED_AUTHORIZATION/);
});
test('direct proxy use, malformed inventory and changed target hostname block',()=>{
  const direct=fixture();direct.proxies[0].certificateManagerCertificates=[prefix+'certificates/cm-cert-pharmacyhub'];assert.throws(()=>certificatePlan(direct),/DIRECT_PROXY/);
  assert.throws(()=>certificatePlan({...fixture(),certificates:null}),/INVENTORY_INCOMPLETE/);
  const drift=fixture();drift.entries[0].hostname='neture.co.kr';assert.throws(()=>certificatePlan(drift),/ENTRY_DRIFT/);
});
test('each delete is gated, final inventory proves removal and preserves shared resources',async()=>{
  const s=fixture();s.entries.push({name:prefix+'certificateMaps/o4o-main-cert-map/certificateMapEntries/neture-entry',hostname:'neture.co.kr',certificates:[prefix+'certificates/shared']});
  let gates=0;
  const result=await retireCertificates({mode:'apply',read:async()=>structuredClone(s),beforeWrite:async()=>{gates++;},remove:async target=>{
    const key=target.kind==='entry'?'entries':target.kind==='certificate'?'certificates':'authorizations';
    s[key]=s[key].filter(x=>!x.name.endsWith('/'+target.name));
  }});
  assert.equal(gates,5);assert.equal(result.applied,true);assert.equal(s.maps.length,1);assert.equal(s.proxies.length,1);assert.equal(s.entries[0].hostname,'neture.co.kr');
});
test('shared routing drift and unconfirmed deletion never report success',async()=>{
  let reads=0;
  await assert.rejects(retireCertificates({mode:'apply',read:async()=>{const s=fixture();if(reads++)s.proxies[0].name='changed';return s;},beforeWrite:async()=>{},remove:()=>{throw new Error('unexpected delete');}}),/SHARED_RESOURCE_DRIFT/);
  await assert.rejects(retireCertificates({mode:'apply',read:async()=>fixture(),beforeWrite:async()=>{},remove:async()=>{}}),/FINAL_VERIFICATION/);
});
test('actual workflow accepts standalone certificate plan and rejects mixed/frozen/foreign executions before auth',()=>{
  const yaml=createRequire(import.meta.url)('yaml');
  const workflow=yaml.parse(readFileSync(new URL('../../.github/workflows/pharmacyhub-qr-cutover.yml',import.meta.url),'utf8'));
  const dir=mkdtempSync(join(tmpdir(),'ph-cert-gate-'));
  const env={PATH:process.env.PATH,GITHUB_ENV:join(dir,'env'),RUNNER_TEMP:dir,GITHUB_REF:'refs/heads/main',WORKFLOW_ACTOR:'owner',REPOSITORY_OWNER:'owner',
    CERTIFICATE_RETIREMENT:'true',PH_ADMIN_PURGE:'false',CUTOVER_MODE:'plan',DEPLOY_FREEZE:'false',QR_PROBE_PATHS:'',RETIREMENT_INVENTORY:'false',RESOURCE_RETIREMENT:'false',
    RETIRE_PH_HOST:'false',DEMO_CENSUS_FLAG:'false',DEMO_ACCOUNTS_FLAG:'false',DEMO_RELINK_FLAG:'false',DEMO_CLEANUP_FLAG:'false',COPY_CLEANUP_FLAG:'false'};
  try {
    const script=workflow.jobs.cutover.steps[0].run;
    assert.equal(spawnSync('bash',['-c',script],{env}).status,0);
    for(const update of [{PH_ADMIN_PURGE:'true'},{RESOURCE_RETIREMENT:'true'},{RETIREMENT_INVENTORY:'true'},
      {DEMO_ACCOUNTS_FLAG:'true'},{WORKFLOW_ACTOR:'other'},{CUTOVER_MODE:'invalid'},{CUTOVER_MODE:'apply',DEPLOY_FREEZE:'true'}])
      assert.notEqual(spawnSync('bash',['-c',script],{env:{...env,...update}}).status,0);
    assert.ok(workflow.jobs.cutover.steps.find(s=>s.name?.startsWith('Start authenticated')).if.includes('inputs.certificate_retirement != true'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
