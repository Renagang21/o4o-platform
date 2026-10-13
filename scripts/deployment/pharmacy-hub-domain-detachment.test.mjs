import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDomainDetachment,detachDomain,domainComputeRequest} from './pharmacy-hub-domain-detachment.mjs';
import {prepareHostRetirement} from './pharmacy-hub-qr-redirect.mjs';
test('Compute destinations and methods are fixed; untrusted operation paths and request query injection are rejected',()=>{
  assert.equal(domainComputeRequest('read').method,'GET');
  assert.equal(domainComputeRequest('validate').method,'POST');
  const r=domainComputeRequest('replace',{requestId:'12345678-1234-4123-8123-123456789abc'});
  assert.equal(r.method,'PUT');assert.equal(new URL(r.url).hostname,'compute.googleapis.com');
  assert.match(domainComputeRequest('operation',{operationName:'operation-123'}).url,/global\/operations\/operation-123$/);
  for(const name of ['../urlMaps/another-map','https://example.invalid','op?requestId=bad','op/other',''])
    assert.throws(()=>domainComputeRequest('operation',{operationName:name}));
  assert.throws(()=>domainComputeRequest('replace',{requestId:'x&resource=another'}));
  assert.throws(()=>domainComputeRequest('https://example.invalid'));
});
function live() {
  return {...prepareHostRetirement({name:'o4o-global-lb',defaultService:'shared-backend',
    hostRules:[{hosts:['pharmacyhub.co.kr','www.pharmacyhub.co.kr'],pathMatcher:'path-matcher-pharmacy-hub'},
      {hosts:['neture.co.kr'],pathMatcher:'neture'}],
    pathMatchers:[{name:'path-matcher-pharmacy-hub',defaultService:'old-ph-backend'},
      {name:'neture',defaultService:'neture-backend'}],
    tests:[{host:'pharmacyhub.co.kr',path:'/qr/old'},{host:'neture.co.kr',path:'/'}]}),fingerprint:'before'};
}
test('detach both PH hosts, matcher and owned validation tests; preserve shared settings',()=>{
  const input=live(),before=structuredClone(input),p=prepareDomainDetachment(input);
  assert.deepEqual(input,before);
  assert.deepEqual(p.draft.hostRules,[input.hostRules[1]]);
  assert.deepEqual(p.draft.pathMatchers,[input.pathMatchers[1]]);
  assert.deepEqual(p.draft.tests,[input.tests[1]]);
  assert.equal(p.draft.defaultService,input.defaultService);assert.equal(p.removedTests,1);
});
test('shared, partial, unexpected routing or wrong map ownership must block',()=>{
  const mutations=[m=>m.hostRules[0].hosts.push('kpa.neture.co.kr'),m=>m.hostRules[0].hosts.pop(),
    m=>m.pathMatchers[0].defaultService='some-backend',m=>m.name='another-map',
    m=>m.hostRules[0].pathMatcher='neture',m=>m.pathMatchers.push(m.pathMatchers[0])];
  for(const mutate of mutations){const m=live();mutate(m);assert.throws(()=>prepareDomainDetachment(m));}
});
test('plan validates but never submits a write; apply checks fingerprint before gate',async()=>{
  const input=live();let validated=0;
  const options={read:async()=>input,validate:async()=>{validated++;},save:async()=>{},
    replace:async()=>assert.fail('write'),beforeWrite:async()=>assert.fail('gate')};
  assert.equal((await detachDomain({...options,mode:'plan'})).applied,false);assert.equal(validated,1);
  let reads=0;
  await assert.rejects(detachDomain({...options,mode:'apply',read:async()=>({...input,fingerprint:reads++?'changed':'before'})}),/CONCURRENT/);
});
test('apply preserves the full draft and confirms PH absence; repeated apply is a no-op',async()=>{
  let map=live(),writes=0,gates=0;
  const options={mode:'apply',read:async()=>map,save:async()=>{},validate:async()=>{},beforeWrite:async()=>{gates++;},
    replace:async(draft,fingerprint)=>{assert.equal(fingerprint,'before');writes++;map={...draft,fingerprint:'after'};}};
  assert.equal((await detachDomain(options)).sharedResourcesPreserved,true);
  assert.equal((await detachDomain(options)).alreadyAbsent,true);assert.equal(writes,1);assert.equal(gates,1);
});
test('gate failure or uncertain submission never triggers another write or rollback',async()=>{
  let writes=0;
  const options={mode:'apply',read:async()=>live(),save:async()=>{},validate:async()=>{},
    beforeWrite:async()=>{throw new Error('blocked');},replace:async()=>{writes++;throw new Error('lost response');}};
  await assert.rejects(detachDomain(options),/blocked/);assert.equal(writes,0);
  await assert.rejects(detachDomain({...options,beforeWrite:async()=>{}}),/lost response/);assert.equal(writes,1);
});
test('a concurrent shared-setting change after update is not overwritten',async()=>{
  let map=live();
  await assert.rejects(detachDomain({mode:'apply',read:async()=>map,save:async()=>{},validate:async()=>{},beforeWrite:async()=>{},
    replace:async draft=>{map={...draft,fingerprint:'after',defaultService:'external-change'};}}),/FINAL_VERIFICATION/);
});
