import { test as nodeTest, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assembleRelease } from '../release/build-release.mjs';
import { setupDownload } from '../release/setup-download.mjs';
import { zip, member } from '../release/zip.mjs';
import { installPackage, verifyPackage, installedSlot, acquireInstallLock } from '../release/install-core.mjs';
import { bootstrapLocalDb, closeLocalDb, applyImport, LocalDatasetRepository } from '../src/local-db.mjs';
// Emit bounded diagnostics through GitHub check annotations as well as job logs.
// This suite uses only synthetic data; no environment or credentials are logged.
function test(name, options, run) {
 if(typeof options==='function'){run=options;options={};}
 return nodeTest(name,options,async(t)=>{
  try{return await run(t);}catch(error){
   if(process.env.GITHUB_ACTIONS==='true'){
    const message=(String(error.stack||error)+'\n'+String(error.stderr||'')+'\n'+String(error.stdout||'')).slice(0,5000).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
    console.log('::error title=PC installer test::'+name+': '+message);
   }
   throw error;
  }
 });
}
let root;
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'o4o-release-'));});
afterEach(()=>{closeLocalDb();fs.rmSync(root,{recursive:true,force:true});});
const sourceSha='a'.repeat(40);
function fixture(tag='one',sha=sourceSha){
 const files=['index.mjs','local-db.mjs'].map(n=>['src/'+n,Buffer.from('// fixture '+tag)]);
 for(const name of ['launch.mjs','install-core.mjs','install.mjs','Install.cmd'])files.push([name,Buffer.from('// fixture')]);
 return assembleRelease({sourceSha:sha,files,runtime:Buffer.from('MZ-fixture'),runtimeLicense:Buffer.from('fixture license')});
}
function writePackage(result,name='source'){
 const source=path.join(root,name);fs.mkdirSync(source);
 for(const file of ['release.json',...Object.keys(JSON.parse(member(result.archive,'release.json')).files)]){
  const target=path.join(source,...file.split('/'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,member(result.archive,file));
 }
 return source;
}
const target=()=>({home:path.join(root,'program'),dataHome:path.join(root,'data'),allowNewData:true,probe:async()=>false,preflight:()=>{}});
test('portable ZIP roundtrip, CRC corruption and unsafe paths',()=>{
 const data=Buffer.from('한글 fixture');const packed=zip([['src/file.mjs',data]]);assert.deepEqual(member(packed,'src/file.mjs'),data);
 const corrupt=Buffer.from(packed);corrupt[44]^=1;assert.throws(()=>member(corrupt,'src/file.mjs'));
 assert.throws(()=>zip([['../local.db',data]]));assert.throws(()=>member(packed,'not-found'));
});
test('release identity follows code, not unrelated main/documentation source SHA',()=>{
 const a=fixture(),b=fixture('one','b'.repeat(40)),c=fixture('two');
 assert.equal(a.manifest.releaseId,b.manifest.releaseId);assert.notEqual(a.manifest.filename,b.manifest.filename);assert.notEqual(a.manifest.sha256,b.manifest.sha256);assert.notEqual(a.manifest.releaseId,c.manifest.releaseId);
 assert.equal(verifyPackage(writePackage(a)).releaseId,a.manifest.releaseId);
});
test('installer rejects corrupt files, credential paths and symlinked package files',async()=>{
 const source=writePackage(fixture());fs.writeFileSync(path.join(source,'src/index.mjs'),'corrupted');await assert.rejects(installPackage({source,...target()}),/INTEGRITY/);
 const source2=writePackage(fixture(),'other');const manifest=JSON.parse(fs.readFileSync(path.join(source2,'release.json')));manifest.files['../credentials.json']='0'.repeat(64);fs.writeFileSync(path.join(source2,'release.json'),JSON.stringify(manifest));assert.throws(()=>verifyPackage(source2),/INVALID_RELEASE_FILE/);
 const source3=writePackage(fixture(),'linked');const directory=path.join(source3,'src');const original=path.join(source3,'original');fs.renameSync(directory,original);fs.symlinkSync(original,directory,'junction');assert.throws(()=>verifyPackage(source3),/UNSAFE_INSTALL_PATH/);
});
test('fresh install requires explicit confirmation and creates versioned code only',async()=>{
 const source=writePackage(fixture()),options=target();await assert.rejects(installPackage({source,...options,allowNewData:false}),/NEW_INSTALL_CONFIRMATION/);
 const result=await installPackage({source,...options});assert.equal(result.started,false);assert.equal(result.activated,true);assert.equal(verifyPackage(installedSlot(options.home)).releaseId,result.releaseId);assert.equal(fs.existsSync(options.dataHome),false);
});
test('running or unknown PC state stops before changing installed code or data',async()=>{
 const source=writePackage(fixture()),options=target();await assert.rejects(installPackage({source,...options,probe:async()=>true}),/CLOSE_PC_PROGRAM/);
 await assert.rejects(installPackage({source,...options,probe:async()=>{throw Error('PC_STATE_UNKNOWN');}}),/PC_STATE_UNKNOWN/);assert.equal(fs.existsSync(options.home),false);
});
test('failed preflight leaves previous pointer/launcher active and preserves credential bytes',async()=>{
 const options=target(),one=writePackage(fixture()),two=writePackage(fixture('two'),'source2');await installPackage({source:one,...options});
 fs.mkdirSync(options.dataHome);const credential=randomBytes(64);fs.writeFileSync(path.join(options.dataHome,'credentials.json'),credential);
 const before=fs.readFileSync(path.join(options.home,'current.json')),launcher=fs.readFileSync(path.join(options.home,'Start.cmd'));
 await assert.rejects(installPackage({source:two,...options,preflight:()=>{throw Error('BACKUP_FAILED');}}),/BACKUP_FAILED/);
 assert.deepEqual(fs.readFileSync(path.join(options.home,'current.json')),before);assert.deepEqual(fs.readFileSync(path.join(options.home,'Start.cmd')),launcher);assert.deepEqual(fs.readFileSync(path.join(options.dataHome,'credentials.json')),credential);
});
test('data relocation, path overlap and concurrent installer are rejected',async()=>{
 const source=writePackage(fixture()),options=target();await installPackage({source,...options});
 await assert.rejects(installPackage({source,...options,dataHome:options.home}),/UNSAFE_INSTALL_LOCATION/);
 await assert.rejects(installPackage({source,...options,dataHome:path.join(root,'different')}),/DATA_LOCATION_CHANGED/);
 const unlock=await acquireInstallLock(options.home);try{await assert.rejects(installPackage({source,...options}),/ANOTHER_INSTALL/);}finally{await unlock();}
});
test('failed activation preparation retains previous installation and new version does not delete old code',async()=>{
 const options=target(),one=writePackage(fixture()),two=writePackage(fixture('two'),'second');await installPackage({source:one,...options});
 const previous=installedSlot(options.home);await assert.rejects(installPackage({source:two,...options,beforeActivate:()=>{throw Error('ACTIVATION_FAILED');}}),/ACTIVATION_FAILED/);assert.equal(installedSlot(options.home),previous);
 await installPackage({source:two,...options});assert.notEqual(installedSlot(options.home),previous);assert.equal(fs.existsSync(previous),true);
});
test('real agent backup/bootstrap on existing v8 preserves datasets and credentials (Windows-compatible path)',async()=>{
 const options=target();fs.mkdirSync(options.dataHome);process.env.O4O_AGENT_HOME=options.dataHome;
 assert.equal(bootstrapLocalDb().ready,true);applyImport({csvText:'code,name\n0001,합성 상품',dataset:'fixture_products',columnMapping:{code:'code',name:'name'},keyField:'code'});closeLocalDb();
 const credential=randomBytes(64);fs.writeFileSync(path.join(options.dataHome,'credentials.json'),credential);
 const source=writePackage(fixture());const entry=fileURLToPath(new URL('../src/index.mjs',import.meta.url));
 await installPackage({source,...options,preflight:(_slot,dataHome)=>{const run=(...args)=>execFileSync(process.execPath,[entry,'data',...args],{env:{...process.env,O4O_AGENT_HOME:dataHome},encoding:'utf8'});run('backup');assert.equal(JSON.parse(run('status')).ready,true);}});
 bootstrapLocalDb();assert.equal(LocalDatasetRepository.rows('fixture_products')[0].code,'0001');assert.deepEqual(fs.readFileSync(path.join(options.dataHome,'credentials.json')),credential);assert.ok(fs.readdirSync(path.join(options.dataHome,'backups')).length>0);
});
test('Windows packaged runtime starts and health proves its release and data readiness', {skip:process.platform!=='win32',timeout:120000}, async()=>{
 const { spawn }=await import('node:child_process');const { runningAgent }=await import('../release/install-core.mjs');
 assert.equal(await runningAgent(),false);
 const src=fileURLToPath(new URL('../src/',import.meta.url));const release=fileURLToPath(new URL('../release/',import.meta.url));
 const files=fs.readdirSync(src).filter(n=>/\.(mjs|ps1|mts)$/.test(n)).map(n=>['src/'+n,fs.readFileSync(path.join(src,n))]);
 for(const n of ['install.mjs','install-core.mjs','launch.mjs','Install.cmd'])files.push([n,execFileSync('git',['show',`HEAD:tools/o4o-local-agent/release/${n}`])]);
 const packaged=assembleRelease({sourceSha,files,runtime:fs.readFileSync(process.execPath),runtimeLicense:fs.readFileSync(path.join(path.dirname(process.execPath),'LICENSE'))}),source=writePackage(packaged,'windows package'),options=target();
 options.home+='-한글 경로';options.dataHome+='-한글 데이터';
 delete options.preflight;
 const result=await installPackage({source,...options});const slot=installedSlot(options.home);
 const system=process.env.SystemRoot;
 execFileSync(path.join(system,'System32','cmd.exe'),['/d','/s','/c',`""${path.join(source,'Install.cmd')}""`],{
   env:{...process.env,PATH:path.join(system,'System32'),O4O_PC_INSTALL_HOME:options.home,O4O_AGENT_HOME:options.dataHome,APPDATA:path.join(root,'roaming')},
   windowsVerbatimArguments:true,stdio:['ignore','pipe','pipe'],timeout:60000,
 });
 assert.ok(fs.existsSync(path.join(root,'roaming','Microsoft','Windows','Start Menu','Programs','O4O PC 연결.cmd')));
 const child=spawn(path.join(system,'System32','cmd.exe'),['/d','/s','/c',`""${path.join(options.home,'Start.cmd')}""`],{cwd:slot,env:{...process.env,PATH:path.join(system,'System32')},windowsVerbatimArguments:true,stdio:'ignore'});
 try{
  let health;for(let n=0;n<40;n++){
   try{const response=await fetch('http://127.0.0.1:47821/health',{headers:{Origin:'https://neture.co.kr'},signal:AbortSignal.timeout(500)});if(response.ok){health=await response.json();break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(health,'installed runtime must serve health');assert.equal(health.releaseId,result.releaseId);assert.equal(health.agentVersion,'0.4.0');assert.equal(health.localData.ready,true);assert.equal(health.localData.schemaVersion,8);
  assert.equal(health.connected,false);assert.equal('credentials'in health,false);
 }finally{const exited=new Promise(resolve=>child.once('exit',resolve));execFileSync(path.join(system,'System32','taskkill.exe'),['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});await exited;}
 const freshHome=options.home+'-fresh',freshData=options.dataHome+'-fresh';
 execFileSync(path.join(system,'System32','cmd.exe'),['/d','/s','/c',`""${path.join(source,'Install.cmd')}""`],{
   env:{...process.env,PATH:path.join(system,'System32'),O4O_PC_INSTALL_HOME:freshHome,O4O_AGENT_HOME:freshData,APPDATA:path.join(root,'roaming-fresh')},
   windowsVerbatimArguments:true,input:'Y\r\n',stdio:['pipe','pipe','pipe'],timeout:60000,
 });
 assert.ok(fs.existsSync(path.join(freshData,'local.db')));assert.equal(verifyPackage(installedSlot(freshHome)).releaseId,result.releaseId);
 // Window mode on an existing installation needs no terminal input and starts
 // the installed runtime automatically. First-install GUI consent is not bypassed.
 const freshSlot=installedSlot(freshHome),runtime=path.join(freshSlot,'runtime','node.exe');
 try {
  const installOutput=execFileSync(path.join(source,'runtime','node.exe'),[path.join(source,'install.mjs'),'--window'],{
   env:{...process.env,PATH:path.join(system,'System32'),O4O_PC_INSTALL_HOME:freshHome,O4O_AGENT_HOME:freshData,APPDATA:path.join(root,'roaming-fresh')},stdio:'pipe',timeout:60000,
  });
  assert.match(installOutput.toString('utf8'),/설치와 프로그램 실행을 확인했습니다/);
  let health;
  for(let n=0;n<40;n++) {
   try{const response=await fetch('http://127.0.0.1:47821/health',{headers:{Origin:'https://neture.co.kr'},signal:AbortSignal.timeout(500)});if(response.ok){health=await response.json();break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.equal(health?.releaseId,result.releaseId);assert.equal(health?.localData?.ready,true);
 } finally {
  execFileSync(path.join(system,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-Command',"Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $env:O4O_TEST_RUNTIME } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"],{env:{...process.env,O4O_TEST_RUNTIME:runtime},stdio:'pipe'});
 }

 // A child which spawns but immediately fails must never be reported ready.
 const brokenFiles=files.map(([name,bytes])=>[name,name==='src/index.mjs'?Buffer.concat([Buffer.from("if (process.argv[2] === 'run') process.exit(23);\n"),bytes]):bytes]);
 const broken=assembleRelease({sourceSha,files:brokenFiles,runtime:fs.readFileSync(process.execPath),runtimeLicense:Buffer.from('fixture license')});
 const brokenSource=writePackage(broken,'startup failure');
 assert.throws(()=>execFileSync(path.join(brokenSource,'runtime','node.exe'),[path.join(brokenSource,'install.mjs'),'--window'],{
   env:{...process.env,PATH:path.join(system,'System32'),O4O_PC_INSTALL_HOME:freshHome,O4O_AGENT_HOME:freshData,APPDATA:path.join(root,'roaming-fresh')},stdio:'pipe',timeout:60000,
 }),error=>{
   assert.equal(error.status,1);assert.doesNotMatch(error.stdout.toString('utf8'),/설치와 프로그램 실행을 확인했습니다/);
   assert.match(error.stderr.toString('utf8'),/설치는 끝났지만 실행하지 못했습니다/);return true;
 });
 assert.equal(await runningAgent(),false);

});

test('verified packages repair missing/corrupt installed code while preserving data and failed-repair pointer',async()=>{
 const options=target(),one=writePackage(fixture()),two=writePackage(fixture('two'),'second');await installPackage({source:one,...options});
 fs.mkdirSync(options.dataHome);const credential=randomBytes(32);fs.writeFileSync(path.join(options.dataHome,'credentials.json'),credential);
 const slot=installedSlot(options.home),index=path.join(slot,'src/index.mjs');fs.writeFileSync(index,'broken');
 const pointer=fs.readFileSync(path.join(options.home,'current.json'));
 await assert.rejects(installPackage({source:one,...options,preflight:()=>{throw Error('BACKUP_FAILED');}}),/BACKUP_FAILED/);
 assert.equal(fs.readFileSync(index,'utf8'),'broken');assert.deepEqual(fs.readFileSync(path.join(options.home,'current.json')),pointer);
 await installPackage({source:one,...options});assert.equal(verifyPackage(installedSlot(options.home)).releaseId,fixture().manifest.releaseId);
 assert.ok(fs.readdirSync(path.join(options.home,'versions')).some(n=>n.startsWith('.damaged-')));
 fs.unlinkSync(index);await installPackage({source:two,...options});assert.equal(verifyPackage(installedSlot(options.home)).releaseId,fixture('two').manifest.releaseId);
 fs.rmSync(installedSlot(options.home),{recursive:true});await installPackage({source:two,...options});assert.equal(verifyPackage(installedSlot(options.home)).version,'0.4.0');
 assert.deepEqual(fs.readFileSync(path.join(options.dataHome,'credentials.json')),credential);
});

test('terminated installer releases OS mutex and preserves real concurrent exclusion',async()=>{
 const home=path.join(root,'mutex');fs.mkdirSync(home);
 const module=new URL('../release/install-core.mjs',import.meta.url).href;
 const child=spawn(process.execPath,['--input-type=module','-e',`import {acquireInstallLock} from ${JSON.stringify(module)};await acquireInstallLock(${JSON.stringify(home)});console.log('locked');`],{stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(Error('mutex child exited early')));});
  await assert.rejects(acquireInstallLock(home),/ANOTHER_INSTALL/);
 }finally{const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;}
 const unlock=await acquireInstallLock(home);await unlock();
});

test('oversized non-streaming download cannot be published even with maximum ZIP compression',()=>{
 assert.throws(()=>assembleRelease({sourceSha,files:[],runtime:randomBytes(32*1024*1024),runtimeLicense:Buffer.from('fixture license')}),/32 MiB HTTP download limit/);
 const payload=Buffer.alloc(32*1024*1024-1024);
 assert.throws(()=>setupDownload({...fixture().manifest,bytes:payload.length,sha256:createHash('sha256').update(payload).digest('hex')},payload),/32 MiB HTTP download limit/);
});

test('offline installer embeds its exact hash-pinned ZIP without relying on a later deployment',()=>{
 const result=fixture();
 assert.equal(result.manifest.setup.filename,result.manifest.filename.replace('.zip','-setup.cmd'));
 const footer=result.setup.subarray(-16);assert.equal(footer.subarray(0,8).toString(),'O4OPKG1!');
 const offset=Number(footer.readBigInt64LE(8));
 const embedded=result.setup.subarray(offset,-16);assert.deepEqual(embedded,result.archive);
 assert.equal(result.manifest.setup.bytes,result.setup.length);
 assert.equal(createHash('sha256').update(result.setup).digest('hex'),result.manifest.setup.sha256);
 const header=result.setup.subarray(0,offset).toString('utf8');
 assert.ok(header.includes(result.manifest.sha256));
 assert.ok(!/https?:|HttpClient|ExecutionPolicy|EncodedCommand|RunAs|127\.0\.0\.1/.test(header));
 assert.equal(verifyPackage(writePackage({...result,archive:embedded})).releaseId,result.manifest.releaseId);
});

test('Windows offline installer handles Korean paths and rejects corrupt/truncated embedded packages', {skip:process.platform!=='win32',timeout:120000},()=>{
 const result=assembleRelease({sourceSha,files:[['install.mjs',Buffer.from("import fs from 'node:fs';if(!process.argv.includes('--window'))process.exit(1);fs.writeFileSync(process.env.O4O_SETUP_TEST_MARKER,'started');")]],runtime:fs.readFileSync(process.execPath),runtimeLicense:Buffer.from('fixture license')});
 const launcher=path.join(root,'설치 파일.cmd'),marker=path.join(root,'marker');
 // Execute exactly the generated bytes. No external archive, transport stub or
 // web deployment is available to this installer; all executable content is embedded.
 fs.writeFileSync(launcher,result.setup);
 const system=process.env.SystemRoot;
 const run=()=>execFileSync(path.join(system,'System32','cmd.exe'),['/d','/s','/c',`""${launcher}""`],{
  env:{...process.env,O4O_SETUP_TEST_MARKER:marker,PATH:path.join(system,'System32')},windowsVerbatimArguments:true,input:'\r\n',timeout:60000,
 });
 run();assert.equal(fs.readFileSync(marker,'utf8'),'started');fs.unlinkSync(marker);
 const corrupt=Buffer.from(result.setup);const offset=Number(corrupt.readBigInt64LE(corrupt.length-8));corrupt[offset+40]^=1;fs.writeFileSync(launcher,corrupt);
 assert.throws(run);assert.equal(fs.existsSync(marker),false);
 fs.writeFileSync(launcher,result.setup.subarray(0,result.setup.length-1));
 assert.throws(run);assert.equal(fs.existsSync(marker),false);
});
