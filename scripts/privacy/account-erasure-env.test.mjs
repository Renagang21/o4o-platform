import {readFileSync} from 'node:fs';
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

test('activation uses the existing WIF-allowed API workflow and shares its deployment lock',()=>{
 const wrapper=readFileSync(new URL('../../.github/workflows/account-erasure-activation.yml',import.meta.url),'utf8');
 const api=readFileSync(new URL('../../.github/workflows/deploy-api.yml',import.meta.url),'utf8');
 assert.match(wrapper,/uses: \.\/\.github\/workflows\/deploy-api\.yml/);
 assert.doesNotMatch(wrapper,/google-github-actions\/auth|runs-on:|schedule:/);
 assert.match(api,/concurrency:[\s\S]*?group: deploy-api-production/);
 const job=api.slice(api.indexOf('  erasure-operations:'));
 for(const guard of ["inputs.erasure_operation != ''","github.ref == 'refs/heads/main'","github.actor == github.repository_owner","github.triggering_actor == github.repository_owner","vars.DEPLOY_FREEZE == 'false'"])assert.ok(job.includes(guard));
 assert.match(job,/environment: production/);assert.match(job,/ci-gate\.mjs --target "\$TARGET" --wait-seconds 1800 --enforce/);
 assert.match(api,/detect:\n    if: inputs.erasure_operation == ''/);
});
