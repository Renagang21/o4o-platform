import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTargets,quoteIdentifier,rowKey,deletionOrder,runStoreCleanup} from './demo-store-cleanup.mjs';
const keep='1'.repeat(64),target='2'.repeat(64);
test('apply requires exact nonempty targets; retained store cannot be a target',()=>{
  assert.throws(()=>validateTargets(keep,[],true));assert.throws(()=>validateTargets(keep,[keep],true));
  assert.throws(()=>validateTargets(keep,[target,target],false));assert.throws(()=>validateTargets('unsafe',[target],false));
  validateTargets(keep,[target],true);
});
test('metadata identifiers never become arbitrary SQL',()=>{
  assert.equal(quoteIdentifier('createdAt'),'"createdAt"');assert.throws(()=>quoteIdentifier('users; DROP TABLE users'));
});
test('compound primary keys identify rows without exposing identifiers in summary',()=>{
  assert.equal(rowKey('members',{a:1,b:'x'},['a','b']),'members:[1,"x"]');assert.throws(()=>rowKey('unknown',{},[]));
});
test('foreign-key dependency deletion is child first, not alphabetical',()=>{
  assert.deepEqual(deletionOrder(['organizations','assets','items'],[{parent:'organizations',child:'assets'},{parent:'assets',child:'items'}]),['items','assets','organizations']);
  assert.throws(()=>deletionOrder(['a','b'],[{parent:'a',child:'b'},{parent:'b',child:'a'}]));
});
test('invalid apply request is rejected before opening a transaction',async()=>{
  let calls=0;await assert.rejects(runStoreCleanup({query:async()=>{calls++;}},{apply:true,keep}));assert.equal(calls,0);
});
