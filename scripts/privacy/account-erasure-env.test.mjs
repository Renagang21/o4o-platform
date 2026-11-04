import {test} from 'node:test';
import assert from 'node:assert/strict';
import {servingEnvironment,currentPlainEnv,planOptionalEnv} from '../ci/cloud-run-env.mjs';
test('failed apply candidate is never the source of preserved activation flags',()=>{
 const service={spec:{template:{spec:{containers:[{env:[{name:'ACCOUNT_ERASURE_MODE',value:'apply'}]}]}}},status:{traffic:[{revisionName:'old',percent:100},{revisionName:'failed',percent:0}]}};
 const revision={metadata:{name:'old'},spec:{containers:[{env:[{name:'ACCOUNT_ERASURE_MODE',value:'off'}]}]}};
 const actual=servingEnvironment(service,revision);assert.equal(currentPlainEnv(actual).ACCOUNT_ERASURE_MODE,'off');
 assert.equal(planOptionalEnv(['ACCOUNT_ERASURE_MODE'],{},actual)[0].value,'off');
});
test('split, unknown and mismatched serving revisions fail closed',()=>{
 for(const traffic of [[],[{revisionName:'a',percent:50},{revisionName:'b',percent:50}],[{revisionName:'a',percent:100}]])assert.throws(()=>servingEnvironment({status:{traffic}},{metadata:{name:'other'},spec:{containers:[{}]}}),/SERVING_ENV_UNKNOWN/);
});
