import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDomainDetachment,detachDomain,domainMapClient,domainOperationArguments} from './pharmacy-hub-domain-detachment.mjs';
import {prepareHostRetirement} from './pharmacy-hub-qr-redirect.mjs';
test('remote names cannot select URLs or SDK flags; update UUID is generated locally and bound to saved evidence',async()=>{
  const calls=[];
  const client=domainMapClient({token:'',fetcher:async(url,options)=>{
    calls.push({url:new URL(url),options});return {ok:true,json:async()=>({name:'operation-123'})};
  }});
  await client.read();await client.validate({name:'https://example.invalid'});
  let saved;
  const result=await client.submit({name:'https://example.invalid'},'before',async id=>{saved=id;});
  for(const c of calls)assert.equal(c.url.origin,'https://compute.googleapis.com');
  assert.deepEqual(calls.map(c=>c.options.method),['GET','POST','PUT']);
  assert.equal(calls[0].url.pathname,'/compute/v1/projects/netureyoutube/global/urlMaps/o4o-global-lb');
  assert.equal(calls[1].url.pathname,calls[0].url.pathname+'/validate');
  assert.equal(calls[2].url.pathname,calls[0].url.pathname);
  assert.equal(calls[2].url.searchParams.get('requestId'),saved);assert.equal(result.requestId,saved);
  assert.equal(JSON.parse(calls[2].options.body).fingerprint,'before');
  assert.deepEqual(domainOperationArguments('operation-123'),['compute','operations','describe','operation-123','--global','--project=netureyoutube','--format=json']);
  for(const name of ['../urlMaps/another-map','https://example.invalid','operation-123?x=bad','operation/other','--project=another','',
    'operation-123;whoami','operation-123 --project=another','operation-123'+String.fromCharCode(10),null,{}])
    assert.throws(()=>domainOperationArguments(name));
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
