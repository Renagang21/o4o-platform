import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, chmodSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const source=readFileSync(new URL('../../../.github/workflows/deploy-api.yml',import.meta.url),'utf8');
const start=source.indexOf('        KAKAO_ENV=(');const end=source.indexOf('        OPTIONAL_ENV=()',start);
assert.ok(start>0 && end>start);
const block=source.slice(start,end).replaceAll('${{ env.PROJECT_ID }}','synthetic-project');
function run(client='',resource='') {
 const directory=mkdtempSync(join(tmpdir(),'o4o-kakao-config-'));
 try {
  const shim=join(directory,'gcloud');writeFileSync(shim,'#!/usr/bin/env bash\n[[ "$1 $2" == "secrets describe" ]] || exit 99\n');chmodSync(shim,0o755);
  const result=spawnSync('bash',['-c',block+'\nprintf "%s\\0" "${KAKAO_ENV[@]}"'],{encoding:'utf8',env:{...process.env,PATH:directory+':'+process.env.PATH,KAKAO_REST_CLIENT_ID:client,KAKAO_SECRET_RESOURCE:resource}});
  return {status:result.status,args:result.stdout.split('\0').filter(Boolean)};
 } finally {rmSync(directory,{recursive:true,force:true});}
}
test('unset Kakao stays disabled and does not read a secret version',()=>{assert.deepEqual(run(),{status:0,args:['--set-env-vars=KAKAO_CLIENT_ID=']});});
test('partial configuration stops before deploy',()=>{assert.equal(run('synthetic-client','').status,1);assert.equal(run('','synthetic-resource').status,1);});
test('configured client fixes redirect and binds only a Secret Manager resource reference',()=>{
 const result=run('synthetic-client','synthetic-kakao-secret');assert.equal(result.status,0);
 assert.deepEqual(result.args,['--set-env-vars=KAKAO_CLIENT_ID=synthetic-client,KAKAO_REDIRECT_URI=https://api.neture.co.kr/api/v1/auth/social/kakao/callback','--update-secrets=KAKAO_CLIENT_SECRET=synthetic-kakao-secret:latest']);
});
test('resource and client input cannot introduce flags or shell commands',()=>{assert.equal(run('x,REDIRECT_URI=attacker','resource').status,1);assert.equal(run('client','$(touch /tmp/o4o-kakao-injected)').status,1);assert.equal(existsSync('/tmp/o4o-kakao-injected'),false);});
